"""Safe HTML/plain-text deal digests with Gmail OAuth or legacy SMTP delivery."""

import html
import os
import smtplib
import ssl
from dataclasses import replace
from decimal import Decimal
from email.message import EmailMessage

from .config import EmailConfig
from .matching import normalize
from .models import Deal
from .security import validate_https_url

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465
SMTP_USERNAME_ENV = "SMTP_USERNAME"
SMTP_PASSWORD_ENV = "SMTP_APP_PASSWORD"
SMTP_RECIPIENT_ENV = "DEAL_BOT_EMAIL_TO"
EMAIL_LINK_HOSTS = {
    "ebay": {"ebay.com"},
    "warpfire": {"warpfireminis.com"},
    "gamersguild": {"gamersguildusa.com"},
    "herrick": {"herrickgames.com"},
    "miniature_market": {"miniaturemarket.com"},
    "valhalla": {"valhallahobby.com"},
    "flipside": {"flipsidegaming.com"},
    "lazarus": {"lazarus-games.com"},
    "little_big_wars": {"littlebigwars.com"},
}


def _safe_url(url: str, source: str) -> str:
    if source not in EMAIL_LINK_HOSTS:
        raise ValueError(f"Email links are not approved for source {source!r}")
    return validate_https_url(url, EMAIL_LINK_HOSTS[source])


def collapse_similar_deals(deals: list[Deal]) -> list[Deal]:
    grouped: dict[tuple[str, str, str, Decimal], Deal] = {}
    for deal in deals:
        key = (
            deal.product.id,
            deal.listing.source,
            normalize(deal.listing.title),
            deal.listing.delivered_price,
        )
        existing = grouped.get(key)
        grouped[key] = (
            replace(existing, similar_listing_count=existing.similar_listing_count + 1)
            if existing
            else deal
        )
    return list(grouped.values())


def _discount(deal: Deal) -> Decimal:
    return deal.discount_vs_msrp if deal.discount_vs_msrp is not None else Decimal("-1")


def _select_digest_deals(
    deals: list[Deal], max_per_product: int, suspicious_discount: Decimal
) -> tuple[list[Deal], list[Deal], int]:
    collapsed = collapse_similar_deals(deals)
    products: dict[str, list[Deal]] = {}
    for deal in collapsed:
        products.setdefault(deal.product.id, []).append(deal)
    selected: list[Deal] = []
    for product_deals in products.values():
        product_deals.sort(
            key=lambda deal: (
                deal.discount_vs_msrp is not None and deal.discount_vs_msrp >= suspicious_discount,
                -_discount(deal),
                deal.listing.delivered_price,
            )
        )
        selected.extend(product_deals[:max_per_product])
    selected.sort(key=lambda deal: (-_discount(deal), deal.product.name))
    trusted = [
        deal
        for deal in selected
        if deal.discount_vs_msrp is None or deal.discount_vs_msrp < suspicious_discount
    ]
    suspicious = [deal for deal in selected if deal not in trusted]
    return trusted, suspicious, len(collapsed) - len(selected)


def format_digest(
    deals: list[Deal],
    *,
    max_per_product: int = 3,
    suspicious_discount: Decimal = Decimal("60"),
) -> tuple[str, str, str]:
    if not deals:
        raise ValueError("Cannot format an empty deal digest")
    if max_per_product < 1:
        raise ValueError("Digest limit must be positive")
    trusted, suspicious, omitted = _select_digest_deals(deals, max_per_product, suspicious_discount)
    displayed = [*trusted, *suspicious]
    first = displayed[0]
    discount = (
        f" ({first.discount_vs_msrp}% below MSRP)" if first.discount_vs_msrp is not None else ""
    )
    subject = f"Deal found — {first.product.name} — ${first.listing.delivered_price} shipped"
    subject = (
        subject + discount if len(displayed) == 1 else f"Warhammer deals — {len(displayed)} shown"
    )
    text_parts = ["Warhammer deals"]
    html_parts = ["<html><body><h2>Warhammer deals</h2>"]
    for heading, section_deals in (
        ("Best matches", trusted),
        (f"Review carefully ({suspicious_discount}%+ below MSRP)", suspicious),
    ):
        if not section_deals:
            continue
        text_parts.append(heading)
        html_parts.append(f"<h2>{html.escape(heading)}</h2>")
        for deal in section_deals:
            listing = deal.listing
            url = _safe_url(listing.url, listing.source)
            median = (
                f"${deal.rolling_median}" if deal.rolling_median is not None else "not enough data"
            )
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
            ]
            if listing.quantity is not None:
                lines.append(f"Models stated: {listing.quantity}")
            if listing.ends_at is not None:
                lines.append(f"Listing ends: {listing.ends_at.isoformat()}")
            if deal.similar_listing_count > 1:
                lines.append(f"Similar listings grouped: {deal.similar_listing_count}")
            lines.append(url)
            text_parts.append("\n".join(lines))
            html_parts.append(
                "<section><h3>"
                + html.escape(deal.product.name)
                + "</h3>"
                + (
                    f'<img src="{html.escape(listing.image_url, quote=True)}" '
                    'alt="" width="180" loading="lazy">'
                    if listing.image_url
                    else ""
                )
                + "<p>"
                + "<br>".join(html.escape(line) for line in lines[1:-1])
                + f'</p><p><a href="{html.escape(url, quote=True)}">View listing</a></p></section>'
            )
    if omitted:
        summary = f"{omitted} lower-ranked listings omitted by digest limits."
        text_parts.append(summary)
        html_parts.append(f"<p>{html.escape(summary)}</p>")
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
