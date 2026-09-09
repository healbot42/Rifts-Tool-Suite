"""Safe HTML/plain-text deal digests with Gmail OAuth or legacy SMTP delivery."""

import html
import os
import smtplib
import ssl
from email.message import EmailMessage

from .config import EmailConfig
from .models import Deal
from .security import validate_https_url

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465
SMTP_USERNAME_ENV = "SMTP_USERNAME"
SMTP_PASSWORD_ENV = "SMTP_APP_PASSWORD"
SMTP_RECIPIENT_ENV = "DEAL_BOT_EMAIL_TO"


def _safe_url(url: str, source: str) -> str:
    allowed_hosts = {"ebay": {"ebay.com"}}
    if source not in allowed_hosts:
        raise ValueError(f"Email links are not approved for source {source!r}")
    return validate_https_url(url, allowed_hosts[source])


def format_digest(deals: list[Deal]) -> tuple[str, str, str]:
    if not deals:
        raise ValueError("Cannot format an empty deal digest")
    first = deals[0]
    suffix = "" if len(deals) == 1 else f" + {len(deals) - 1} more"
    discount = (
        f" ({first.discount_vs_msrp}% below MSRP)" if first.discount_vs_msrp is not None else ""
    )
    subject = (
        f"Deal found — {first.product.name} — ${first.listing.delivered_price} shipped"
        f"{discount}{suffix}"
    )
    text_parts: list[str] = []
    html_parts = ["<html><body><h2>Warhammer deals</h2>"]
    for deal in deals:
        listing = deal.listing
        url = _safe_url(listing.url, listing.source)
        median = f"${deal.rolling_median}" if deal.rolling_median is not None else "not enough data"
        rating = (
            str(listing.seller_rating) if listing.seller_rating is not None else "not available"
        )
        lines = [
            deal.product.name,
            listing.title,
            f"Source: {listing.source}",
            f"Condition: {listing.condition.value}",
            f"Item: ${listing.item_price}; shipping: ${listing.shipping_price}",
            f"Delivered: ${listing.delivered_price}; MSRP: ${deal.product.msrp}",
            f"Rolling 30-day median: {median}; seller rating: {rating}",
            f"Triggered because: {'; '.join(deal.reasons)}",
            url,
        ]
        text_parts.append("\n".join(lines))
        html_parts.append(
            "<section><h3>"
            + html.escape(deal.product.name)
            + "</h3><p>"
            + "<br>".join(html.escape(line) for line in lines[1:-1])
            + f'</p><p><a href="{html.escape(url, quote=True)}">View listing</a></p></section>'
        )
    html_parts.append("</body></html>")
    return subject, "\n\n".join(text_parts), "".join(html_parts)


def send_email(config: EmailConfig, subject: str, text: str, html_body: str) -> None:
    recipient = os.environ.get(SMTP_RECIPIENT_ENV)
    if not recipient:
        raise ValueError("Set DEAL_BOT_EMAIL_TO to the alert recipient")
    message = EmailMessage()
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(text)
    message.add_alternative(html_body, subtype="html")
    if config.provider == "gmail":
        from .gmail import send_message

        sender = os.environ.get("DEAL_BOT_EMAIL_FROM")
        if not sender:
            raise ValueError("Set DEAL_BOT_EMAIL_FROM to the Gmail account you authorized")
        message["From"] = sender
        send_message(message)
        return
    if config.provider != "smtp":
        raise ValueError("Email provider must be gmail or smtp")
    sender = os.environ.get(SMTP_USERNAME_ENV)
    password = os.environ.get(SMTP_PASSWORD_ENV)
    if not sender or not password:
        raise ValueError("SMTP sender or app password is missing")
    message["From"] = sender
    tls_context = ssl.create_default_context()
    tls_context.minimum_version = ssl.TLSVersion.TLSv1_2
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30, context=tls_context) as smtp:
        smtp.login(sender, password)
        smtp.send_message(message)
