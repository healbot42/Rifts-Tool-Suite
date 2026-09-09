import base64
import json
import logging
from email.message import EmailMessage
from types import SimpleNamespace
from unittest.mock import Mock

import httpx
import pytest
from warhammer_deal_bot import gmail
from warhammer_deal_bot.alerts import send_email
from warhammer_deal_bot.cli import main
from warhammer_deal_bot.config import EmailConfig, load_config


@pytest.fixture
def grant():
    return SimpleNamespace(
        client_id="test.apps.googleusercontent.com",
        client_secret="fake-client-secret",
        refresh_token="fake-refresh-token",
        token="fake-access-token",
        scopes=[gmail.SCOPE],
        granted_scopes=[gmail.SCOPE],
        refresh=Mock(),
    )


@pytest.fixture
def vault(monkeypatch):
    vault = Mock()
    vault.get_password.return_value = None
    monkeypatch.setattr(gmail, "_vault", lambda: vault)
    return vault


@pytest.fixture
def client_file(tmp_path):
    path = tmp_path / "desktop.json"
    path.write_text(
        json.dumps(
            {
                "installed": {
                    "client_id": "test.apps.googleusercontent.com",
                    "client_secret": "fake-client-secret",
                    "auth_uri": gmail.AUTH_URI,
                    "token_uri": gmail.TOKEN_URI,
                }
            }
        )
    )
    return path


def test_authorization_requests_only_send_with_pkce_and_loopback(
    monkeypatch, grant, vault, client_file
):
    factory = Mock()
    factory.return_value.run_local_server.return_value = grant
    monkeypatch.setattr(gmail.InstalledAppFlow, "from_client_config", factory)
    gmail.authorize(client_file)
    assert factory.call_args.kwargs == {
        "scopes": [gmail.SCOPE],
        "autogenerate_code_verifier": True,
    }
    settings = factory.return_value.run_local_server.call_args.kwargs
    assert settings["host"] == settings["bind_addr"] == "127.0.0.1"
    assert settings["port"] == 0
    assert settings["access_type"] == "offline"
    assert "include_granted_scopes" not in settings
    assert settings["timeout_seconds"] == 180
    assert settings["authorization_prompt_message"] == (
        "Open this URL if the browser does not open: {url}"
    )
    stored = json.loads(vault.set_password.call_args.args[2])
    assert stored["refresh_token"] == grant.refresh_token
    assert "token" not in stored
    assert list(client_file.parent.iterdir()) == [client_file]


@pytest.mark.parametrize(
    "field,value",
    [
        ("token_uri", "https://attacker.example/token"),
        ("auth_uri", "https://accounts.google.com.attacker.example/auth"),
        ("client_id", ""),
    ],
)
def test_invalid_client_never_opens_browser(
    monkeypatch, vault, client_file, field, value
):
    data = json.loads(client_file.read_text())
    data["installed"][field] = value
    client_file.write_text(json.dumps(data))
    factory = Mock()
    monkeypatch.setattr(gmail.InstalledAppFlow, "from_client_config", factory)
    with pytest.raises(ValueError):
        gmail.authorize(client_file)
    factory.assert_not_called()
    vault.set_password.assert_not_called()


@pytest.mark.parametrize(
    "scope", [[], [gmail.SCOPE, "https://mail.google.com/"]]
)
def test_denied_or_excess_permissions_never_saved(grant, vault, scope):
    grant.granted_scopes = scope
    with pytest.raises(ValueError):
        gmail._save(grant, vault)
    vault.set_password.assert_not_called()


def test_missing_offline_grant_never_saved(grant, vault):
    grant.refresh_token = None
    with pytest.raises(ValueError):
        gmail._save(grant, vault)
    vault.set_password.assert_not_called()


def test_saved_grant_cannot_redirect_refresh_or_expand_permissions(
    grant, vault
):
    gmail._save(grant, vault)
    stored = json.loads(vault.set_password.call_args.args[2])
    stored["token_uri"] = "https://attacker.example/token"
    vault.get_password.return_value = json.dumps(stored)
    with pytest.raises(ValueError):
        gmail._load(vault)
    stored["token_uri"] = gmail.TOKEN_URI
    stored["scopes"].append("https://mail.google.com/")
    vault.get_password.return_value = json.dumps(stored)
    with pytest.raises(ValueError):
        gmail._load(vault)


def test_saved_grant_loads_without_access_token(grant, vault):
    gmail._save(grant, vault)
    vault.get_password.return_value = vault.set_password.call_args.args[2]
    loaded = gmail._load(vault)
    assert loaded.refresh_token == grant.refresh_token
    assert loaded.scopes == [gmail.SCOPE]
    assert not loaded.valid


def test_complete_environment_grant_supports_headless_runner(monkeypatch):
    monkeypatch.setenv(
        "GMAIL_OAUTH_CLIENT_ID", "test.apps.googleusercontent.com"
    )
    monkeypatch.setenv("GMAIL_OAUTH_CLIENT_SECRET", "fake-client-secret")
    monkeypatch.setenv("GMAIL_OAUTH_REFRESH_TOKEN", "fake-refresh-token")
    credentials = gmail._load_environment()
    assert credentials.client_id == "test.apps.googleusercontent.com"
    assert credentials.refresh_token == "fake-refresh-token"
    assert credentials.scopes == [gmail.SCOPE]


def test_partial_environment_grant_is_rejected(monkeypatch):
    monkeypatch.setenv(
        "GMAIL_OAUTH_CLIENT_ID", "test.apps.googleusercontent.com"
    )
    monkeypatch.delenv("GMAIL_OAUTH_CLIENT_SECRET", raising=False)
    monkeypatch.delenv("GMAIL_OAUTH_REFRESH_TOKEN", raising=False)
    with pytest.raises(ValueError, match="every GMAIL_OAUTH"):
        gmail._load_environment()


def test_send_refreshes_then_posts_mime_to_fixed_endpoint(
    monkeypatch, grant, vault
):
    monkeypatch.setattr(gmail, "_load", lambda _: grant)
    requests_seen = []

    def receive(request):
        requests_seen.append(request)
        assert request.url == gmail.SEND_URI
        assert request.headers["authorization"] == "Bearer fake-access-token"
        mime = base64.urlsafe_b64decode(json.loads(request.content)["raw"])
        assert b"To: recipient@example.com" in mime
        assert b"Subject: Test" in mime
        return httpx.Response(200, json={"id": "message-id"})

    client = httpx.Client(transport=httpx.MockTransport(receive))
    monkeypatch.setattr(gmail.httpx, "Client", lambda **_: client)
    message = EmailMessage()
    message["To"] = "recipient@example.com"
    message["Subject"] = "Test"
    message.set_content("Deal alert")
    gmail.send_message(message)
    grant.refresh.assert_called_once()
    assert len(requests_seen) == 1


def test_revoked_grant_fails_without_sending_or_logging_tokens(
    monkeypatch, grant, vault, caplog
):
    monkeypatch.setattr(gmail, "_load", lambda _: grant)

    def fail(_):
        logging.getLogger("google.auth").debug("fake-refresh-token")
        raise ValueError("fake-refresh-token provider-secret")

    grant.refresh.side_effect = fail
    client = Mock()
    monkeypatch.setattr(gmail.httpx, "Client", client)
    with caplog.at_level(logging.DEBUG), pytest.raises(ValueError) as failure:
        gmail.send_message(EmailMessage())
    assert "gmail-authorize" in str(failure.value)
    assert "fake-refresh-token" not in caplog.text + str(failure.value)
    assert "provider-secret" not in str(failure.value)
    client.assert_not_called()


@pytest.mark.parametrize("status", [302, 401, 403, 429, 500])
def test_send_errors_are_not_retried_or_followed(
    monkeypatch, grant, vault, status
):
    monkeypatch.setattr(gmail, "_load", lambda _: grant)
    seen = []

    def receive(request):
        seen.append(request)
        return httpx.Response(
            status, headers={"location": "https://attacker.example"}
        )

    client = httpx.Client(transport=httpx.MockTransport(receive))
    monkeypatch.setattr(gmail.httpx, "Client", lambda **_: client)
    with pytest.raises(ValueError, match="no automatic retry"):
        gmail.send_message(EmailMessage())
    assert len(seen) == 1


def test_refresh_transport_rejects_other_endpoints():
    with gmail._TokenSession() as session, pytest.raises(ValueError):
        session.request("POST", "https://attacker.example/token")


def test_token_exchange_enforces_timeout_over_library_defaults():
    request = Mock()
    gmail._bounded_token_request(
        request, "POST", gmail.TOKEN_URI, timeout=None, allow_redirects=True
    )
    assert request.call_args.kwargs == {"timeout": 30, "allow_redirects": False}


def test_status_and_forget_need_no_config_or_network(vault, capsys):
    assert main(["--config", "nonexistent.yaml", "gmail-status"]) == 0
    assert "not connected" in capsys.readouterr().out
    vault.get_password.return_value = "saved"
    assert main(["gmail-forget"]) == 0
    vault.delete_password.assert_called_once_with(
        gmail.VAULT_SERVICE, gmail.VAULT_ACCOUNT
    )


def test_non_windows_has_no_plaintext_fallback(monkeypatch):
    monkeypatch.setattr(gmail.sys, "platform", "linux")
    with pytest.raises(ValueError, match="Windows Credential Manager"):
        gmail._vault()


def test_gmail_delivery_does_not_require_smtp_password(monkeypatch):
    monkeypatch.setenv("DEAL_BOT_EMAIL_TO", "recipient@example.com")
    monkeypatch.setenv("DEAL_BOT_EMAIL_FROM", "sender@gmail.com")
    monkeypatch.delenv("SMTP_APP_PASSWORD", raising=False)
    monkeypatch.delenv("SMTP_USERNAME", raising=False)
    send = Mock()
    monkeypatch.setattr(gmail, "send_message", send)
    send_email(EmailConfig(provider="gmail"), "Test", "Plain", "<p>HTML</p>")
    message = send.call_args.args[0]
    assert message["To"] == "recipient@example.com"
    assert message["From"] == "sender@gmail.com"


def test_invalid_provider_rejected_at_config_boundary(tmp_path):
    config = tmp_path / "config.yaml"
    config.write_text(
        "products: [{id: x, name: X, msrp: 10}]\nemail: {provider: other}\n"
    )
    with pytest.raises(ValueError, match="provider"):
        load_config(config)
