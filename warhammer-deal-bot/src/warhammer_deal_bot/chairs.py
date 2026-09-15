"""Local eBay chair search, filtering, cross-query deduplication, and alerting."""

import logging
import random
import re
import time
from decimal import Decimal

import httpx

from .alerts import format_chair_digest, send_email
from .config import AppConfig, ChairConfig
from .database import Database
from .models import ChairDeal
from .sources.ebay import EbayAdapter

LOGGER = logging.getLogger(__name__)

EXCLUDED_CHAIR_TERMS = (
    "dollhouse",
    "miniature",
    "toy chair",
    "chair cover",
    "slipcover",
    "cushion only",
    "cushions only",
    "replacement cushion",
    "caster",
    "chair wheel",
    "gas cylinder",
    "armrest",
    "chair mat",
    "repair part",
    "hardware",
    "upholstery fabric",
    "headrest",
    "lumbar pillow",
    "footrest",
)


def qualifies(title: str) -> bool:
    normalized = re.sub(r"[^a-z0-9]+", " ", title.casefold()).strip()
    return bool(re.search(r"\b(?:chair|chairs|armchair|armchairs)\b", normalized)) and not any(
        excluded in normalized for excluded in EXCLUDED_CHAIR_TERMS
    )


def _apply_remote_settings(base: ChairConfig, remote: dict[str, object]) -> ChairConfig:
    if not remote:
        return base
    base.enabled = bool(remote.get("enabled", base.enabled))
    base.postal_code = str(remote.get("postal_code", base.postal_code)).strip()
    base.radius_miles = int(remote.get("radius_miles", base.radius_miles))
    recipients = remote.get("recipients")
    if isinstance(recipients, list):
        base.recipients = [str(value).strip() for value in recipients if str(value).strip()]
    prices = remote.get("max_prices", {})
    if isinstance(prices, dict):
        for category in base.categories:
            if category.id in prices:
                category.max_price = Decimal(str(prices[category.id]))
    return base


def run_chair_search(config: AppConfig) -> list[ChairDeal]:
    """Run after Warhammer processing; failures are handled by the caller."""
    settings = config.chairs
    with httpx.Client(timeout=httpx.Timeout(20), follow_redirects=False) as client:
        from .remote_history import RemoteHistory

        remote = RemoteHistory(client)
        if remote.enabled:
            try:
                settings = _apply_remote_settings(settings, remote.chair_settings())
            except (httpx.HTTPError, TypeError, ValueError):
                LOGGER.exception("chair settings hydration failed; using YAML configuration")
        if not settings.enabled:
            LOGGER.info("chair monitoring disabled")
            return []
        if not settings.postal_code:
            raise ValueError("Chair monitoring requires a ZIP/postal code")
        if not settings.recipients:
            raise ValueError("Chair monitoring requires at least one chair email recipient")
        ebay_settings = config.sources.get("ebay", {})
        if not ebay_settings.get("enabled", False):
            raise ValueError("Chair monitoring requires the configured eBay source")
        adapter = EbayAdapter(ebay_settings, client)
        database = Database(config.database)
        found: dict[str, ChairDeal] = {}
        listing_ids: dict[str, int] = {}
        for category in settings.categories:
            for term in category.terms:
                payload = adapter.query_local(term, settings.postal_code, settings.radius_miles)
                for item in payload.get("itemSummaries", []):
                    if not isinstance(item, dict):
                        continue
                    listing = adapter.parse_local_item(item, f"chair-{category.id}")
                    if (
                        not listing
                        or not qualifies(listing.title)
                        or listing.delivered_price > category.max_price
                    ):
                        continue
                    existing = found.get(listing.source_listing_id)
                    deal = ChairDeal(category.id, category.name, listing)
                    if (
                        existing is None
                        or listing.delivered_price < existing.listing.delivered_price
                    ):
                        found[listing.source_listing_id] = deal
                time.sleep(random.uniform(*config.request_delay_seconds))
        deals: list[ChairDeal] = []
        for source_id, deal in found.items():
            listing_id, _, _, was_unavailable = database.observe(deal.listing)
            listing_ids[source_id] = listing_id
            if database.should_alert(
                listing_id,
                deal.listing.delivered_price,
                config.price_drop_realert,
                was_unavailable,
                config.reappeared_realert,
            ):
                deals.append(deal)
        # A separate digest is useful even when a category is empty, but avoid an all-empty email.
        if deals and config.email.enabled:
            subject, text, html = format_chair_digest(deals)
            send_email(config.email, subject, text, html, settings.recipients)
            for deal in deals:
                database.record_alert(
                    listing_ids[deal.listing.source_listing_id],
                    deal.listing.delivered_price,
                    "local chair maximum price",
                )
        return deals
