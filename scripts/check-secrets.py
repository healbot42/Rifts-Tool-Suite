"""Fail when tracked or pending repository files contain high-confidence secrets."""

import re
import subprocess
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
SELF = Path(__file__).resolve()
PATTERNS = {
    "private key": re.compile(
        "-----BEGIN " + "(?:RSA |EC |OPENSSH )?PRIVATE KEY-----"
    ),
    "GitHub token": re.compile(r"gh[pousr]_[A-Za-z0-9]{36,}"),
    "Google OAuth client secret": re.compile(r"GOCSPX-[A-Za-z0-9_-]{20,}"),
    "Google OAuth refresh token": re.compile(r"1//[A-Za-z0-9_-]{30,}"),
    "eBay client secret": re.compile(
        r"EBAY_CLIENT_SECRET\s*[:=]\s*[\"']?(?!your-|$)[A-Za-z0-9._-]{12,}",
        re.I,
    ),
    "Gmail app password": re.compile(
        r"SMTP_APP_PASSWORD\s*[:=]\s*[\"']?(?!your-|$)[A-Za-z0-9 ]{16,}", re.I
    ),
}
TEXT_SUFFIXES = {
    ".css",
    ".env",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".toml",
    ".txt",
    ".vue",
    ".yaml",
    ".yml",
}


def repository_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=REPOSITORY_ROOT,
        check=True,
        capture_output=True,
    )
    return [
        REPOSITORY_ROOT / entry.decode("utf-8")
        for entry in result.stdout.split(b"\0")
        if entry
    ]


def main() -> int:
    findings: list[tuple[Path, str]] = []
    for path in repository_files():
        if (
            path.resolve() == SELF
            or path.suffix.casefold() not in TEXT_SUFFIXES
        ):
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for name, pattern in PATTERNS.items():
            if pattern.search(content):
                findings.append((path.relative_to(REPOSITORY_ROOT), name))
    if findings:
        for path, name in findings:
            print(f"Potential {name} detected in {path}")
        return 1
    print("No high-confidence secrets detected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
