"""Security boundaries for untrusted marketplace data and local configuration."""

import re
from collections.abc import Collection, Mapping
from typing import Any
from urllib.parse import urlsplit

SENSITIVE_KEY_PATTERN = re.compile(
    r"(^|_)(authorization|cookie|credential|eias|eias_token|eiastoken|email|password|phone|secret|token|user_id|userid|username)(_|$)",
    re.IGNORECASE,
)
MAX_RAW_STRING_LENGTH = 4096
MAX_RAW_COLLECTION_ITEMS = 200
MAX_RAW_DEPTH = 6


def validate_https_url(url: str, allowed_hosts: Collection[str]) -> str:
    """Return a defensively validated HTTPS URL limited to explicit host suffixes."""
    if not url or any(ord(character) < 32 for character in url):
        raise ValueError("URL is empty or contains control characters")
    parsed = urlsplit(url)
    try:
        port = parsed.port
    except ValueError as error:
        raise ValueError("URL contains an invalid port") from error
    hostname = parsed.hostname.casefold().rstrip(".") if parsed.hostname else ""
    allowed = {host.casefold().encode("idna").decode("ascii").rstrip(".") for host in allowed_hosts}
    try:
        ascii_hostname = hostname.encode("idna").decode("ascii")
    except UnicodeError as error:
        raise ValueError("URL hostname is invalid") from error
    host_allowed = any(
        ascii_hostname == domain or ascii_hostname.endswith(f".{domain}") for domain in allowed
    )
    if (
        parsed.scheme.casefold() != "https"
        or not host_allowed
        or parsed.username is not None
        or parsed.password is not None
        or port not in (None, 443)
    ):
        raise ValueError("URL is outside the approved HTTPS domain boundary")
    return url


def sanitize_raw_metadata(value: Any, depth: int = 0) -> Any:
    """Bound and redact source metadata before it is persisted for debugging."""
    if depth >= MAX_RAW_DEPTH:
        return "[maximum depth reached]"
    if isinstance(value, Mapping):
        sanitized: dict[str, Any] = {}
        for index, (key, child) in enumerate(value.items()):
            if index >= MAX_RAW_COLLECTION_ITEMS:
                sanitized["_truncated"] = True
                break
            key_text = str(key)[:200]
            sanitized[key_text] = (
                "[redacted]"
                if SENSITIVE_KEY_PATTERN.search(key_text)
                else sanitize_raw_metadata(child, depth + 1)
            )
        return sanitized
    if isinstance(value, (list, tuple)):
        return [
            sanitize_raw_metadata(child, depth + 1) for child in value[:MAX_RAW_COLLECTION_ITEMS]
        ]
    if isinstance(value, str):
        return value[:MAX_RAW_STRING_LENGTH]
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return str(value)[:MAX_RAW_STRING_LENGTH]
