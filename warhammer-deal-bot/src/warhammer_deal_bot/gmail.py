"""Send-only Gmail OAuth for a Windows user, with no plaintext token fallback.

Only gmail-authorize may open a browser. Scheduled delivery refreshes an existing
grant and fails with a reauthorization instruction if Google revokes it.
"""

import base64
import json
import logging
import sys
from email.message import EmailMessage
from functools import partial
from pathlib import Path

import httpx
import requests
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPE = "https://www.googleapis.com/auth/gmail.send"
AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
TOKEN_URI = "https://oauth2.googleapis.com/token"
SEND_URI = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
VAULT_SERVICE = "Warhammer Deal Bot Gmail OAuth"
VAULT_ACCOUNT = "send-only"


def _quiet_auth_logs() -> None:
    # OAuth libraries can log complete token responses at DEBUG, including under --verbose.
    for name in ("oauthlib", "requests_oauthlib", "google.auth", "google_auth_oauthlib"):
        logging.getLogger(name).setLevel(logging.WARNING)


def _vault():
    if sys.platform != "win32":
        raise ValueError("Gmail OAuth token storage currently requires Windows Credential Manager")
    from keyring.backends.Windows import WinVaultKeyring

    # Select the OS vault explicitly; user keyring configuration cannot select a plaintext backend.
    return WinVaultKeyring()


def _client_config(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    installed = data.get("installed") if isinstance(data, dict) else None
    if not isinstance(installed, dict) or "web" in data:
        raise ValueError("Download an OAuth client JSON of type Desktop app")
    if installed.get("auth_uri") != AUTH_URI or installed.get("token_uri") != TOKEN_URI:
        raise ValueError(
            "OAuth client must use Google's standard authorization and token endpoints"
        )
    for field in ("client_id", "client_secret"):
        if not isinstance(installed.get(field), str) or not installed[field].strip():
            raise ValueError("OAuth client JSON is missing its client ID or secret")
    # Do not pass optional endpoints or account metadata from the file to the auth library.
    return {
        "installed": {
            key: installed[key] for key in ("client_id", "client_secret", "auth_uri", "token_uri")
        }
    }


def _validate_grant(credentials: Credentials) -> None:
    granted = credentials.granted_scopes
    if set(credentials.scopes or []) != {SCOPE} or (
        granted is not None and set(granted) != {SCOPE}
    ):
        raise ValueError("Gmail authorization must grant only the send-email permission")
    if not credentials.refresh_token:
        raise ValueError("No offline Gmail authorization received; run gmail-authorize again")


def _save(credentials: Credentials, vault) -> None:
    _validate_grant(credentials)
    # Persist only fields needed to mint short-lived access tokens, never a token.json file.
    payload = {
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "refresh_token": credentials.refresh_token,
        "scopes": [SCOPE],
        "token_uri": TOKEN_URI,
    }
    vault.set_password(VAULT_SERVICE, VAULT_ACCOUNT, json.dumps(payload))


def _load(vault) -> Credentials:
    stored = vault.get_password(VAULT_SERVICE, VAULT_ACCOUNT)
    if not stored:
        raise ValueError("Gmail is not connected; run gmail-authorize first")
    data = json.loads(stored)
    if not isinstance(data, dict) or data.get("token_uri") != TOKEN_URI:
        raise ValueError("Invalid saved Gmail authorization; run gmail-authorize again")
    if data.get("scopes") != [SCOPE]:
        raise ValueError("Saved Gmail authorization is not send-only; authorize again")
    fields = ("client_id", "client_secret", "refresh_token")
    if any(not isinstance(data.get(key), str) or not data[key] for key in fields):
        raise ValueError("Incomplete saved Gmail authorization; run gmail-authorize again")
    credentials = Credentials.from_authorized_user_info(
        {key: data[key] for key in (*fields, "scopes", "token_uri")}
    )
    _validate_grant(credentials)
    return credentials


def authorize(client_secrets: Path) -> None:
    """Perform explicit browser consent with PKCE/state and a loopback-only callback."""
    _quiet_auth_logs()
    try:
        config = _client_config(client_secrets)
        vault = _vault()
        flow = InstalledAppFlow.from_client_config(
            config, scopes=[SCOPE], autogenerate_code_verifier=True
        )
        flow.oauth2session.request = partial(_bounded_token_request, flow.oauth2session.request)
        credentials = flow.run_local_server(
            host="127.0.0.1",
            bind_addr="127.0.0.1",
            port=0,
            timeout_seconds=180,
            authorization_prompt_message="",
            success_message="Google sign-in received. Return to the bot terminal for the result.",
            access_type="offline",
            prompt="consent",
            include_granted_scopes="false",
        )
        _save(credentials, vault)
    except Exception:
        # Never include provider exceptions: they may contain codes, tokens, or client secrets.
        raise ValueError(
            "Gmail authorization did not complete. Check the Desktop app JSON, Windows "
            "Credential Manager, and Google consent settings, then retry gmail-authorize."
        ) from None


def _bounded_token_request(request, method, url, **kwargs):
    if url != TOKEN_URI or method.upper() != "POST":
        raise ValueError("Unexpected OAuth token endpoint")
    # fetch_token passes timeout=None explicitly, so a partial's default is insufficient.
    kwargs["allow_redirects"] = False
    kwargs["timeout"] = 30
    return request(method, url, **kwargs)


class _TokenSession(requests.Session):
    """Constrain Google's refresh transport to the fixed token endpoint."""

    def request(self, method, url, **kwargs):
        return _bounded_token_request(super().request, method, url, **kwargs)


def send_message(message: EmailMessage) -> None:
    _quiet_auth_logs()
    try:
        vault = _vault()
        credentials = _load(vault)
        with _TokenSession() as session:
            credentials.refresh(Request(session=session))
        _save(credentials, vault)
    except Exception:
        raise ValueError(
            "Gmail authorization unavailable. Check connectivity and run gmail-authorize "
            "again if the grant expired or was revoked."
        ) from None
    # Never retry an ambiguous send: Google may have accepted it before a connection failed.
    try:
        with httpx.Client(timeout=30, follow_redirects=False) as client:
            response = client.post(
                SEND_URI,
                headers={"Authorization": f"Bearer {credentials.token}"},
                json={"raw": base64.urlsafe_b64encode(message.as_bytes()).decode("ascii")},
            )
        if response.status_code != 200:
            raise ValueError("Gmail rejected the message")
    except Exception:
        raise ValueError(
            "Gmail delivery was not confirmed. Check Gmail API access and your Sent folder "
            "before retrying; no automatic retry was attempted."
        ) from None


def authorization_status() -> str:
    """Inspect the local grant without refreshing it, opening a browser, or sending mail."""
    try:
        _load(_vault())
    except Exception:
        return "Gmail is not connected or the saved grant is invalid. Run gmail-authorize."
    return "Send-only Gmail grant saved in Windows Credential Manager; live access not checked."


def forget_authorization() -> None:
    """Remove this bot's local grant; Google account access is revoked separately by the user."""
    try:
        vault = _vault()
        if vault.get_password(VAULT_SERVICE, VAULT_ACCOUNT):
            vault.delete_password(VAULT_SERVICE, VAULT_ACCOUNT)
    except Exception:
        raise ValueError(
            "Could not remove Gmail authorization from Windows Credential Manager"
        ) from None
