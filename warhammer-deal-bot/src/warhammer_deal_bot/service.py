"""Fault-isolated source orchestration for one scheduled run."""

import logging
import random
import time
from dataclasses import asdict

import httpx

from .alerts import format_digest, send_email
from .config import AppConfig, product_from_mapping
from .database import Database
from .models import Deal
from .pricing import evaluate_deal
from .remote_history import RemoteHistory
from .sources import RETAILER_ADAPTERS, EbayAdapter, SourceAdapter

LOGGER = logging.getLogger(__name__)


def _adapter(name: str, settings: dict[str, object], client: httpx.Client) -> SourceAdapter:
    if name == "ebay":
        return EbayAdapter(settings, client)
    try:
        return RETAILER_ADAPTERS[name](settings, client)
    except KeyError as error:
        raise ValueError(f"Unknown source: {name}") from error


def run(
    config: AppConfig, source_filter: str | None = None, product_filter: str | None = None
) -> list[Deal]:
    database = Database(config.database)
    catalog = config.products
    with httpx.Client(timeout=httpx.Timeout(20), follow_redirects=False) as client:
        remote = RemoteHistory(client)
        if remote.enabled:
            try:
                managed = remote.watchlist()
                if managed:
                    catalog = [product_from_mapping(product) for product in managed]
                purchases = remote.purchases()
                for product in catalog:
                    product.purchased_quantity = max(
                        product.purchased_quantity, purchases.get(product.id, 0)
                    )
            except (httpx.HTTPError, KeyError, TypeError, ValueError):
                LOGGER.exception("D1 watchlist hydration failed; using local configuration")
                catalog = config.products
    configured_products = [
        product
        for product in catalog
        if product.enabled
        and (
            product_filter is None
            or product_filter.casefold() in {product.id.casefold(), product.name.casefold()}
        )
    ]
    if not configured_products:
        raise ValueError(f"No configured product matched {product_filter!r}")
    products = [
        product
        for product in configured_products
        if product.purchased_quantity < product.quantity_wanted
    ]
    if not products:
        LOGGER.info("all selected product quantities have been purchased")
        return []
    for product in products:
        database.sync_product(product.id, product.name, asdict(product))
    deals: list[tuple[int, Deal]] = []
    with httpx.Client(timeout=httpx.Timeout(20), follow_redirects=False) as client:
        remote_history = RemoteHistory(client)
        if remote_history.enabled:
            for product in products:
                try:
                    database.import_observations(remote_history.history(product.id))
                except (httpx.HTTPError, KeyError, TypeError, ValueError):
                    LOGGER.exception("D1 history hydration failed for %s", product.id)
        for name, settings in config.sources.items():
            if source_filter and name != source_filter:
                continue
            if not settings.get("enabled", False):
                LOGGER.info(
                    "source=%s disabled reason=%s", name, settings.get("reason", "configuration")
                )
                continue
            run_id = database.start_source_run(name)
            returned = accepted = 0
            try:
                adapter = _adapter(name, settings, client)
                seen_ids: set[str] = set()
                for product in products:
                    listings = adapter.search(product)
                    try:
                        remote_history.store(listings)
                    except httpx.HTTPError:
                        LOGGER.exception("D1 history write failed for %s", product.id)
                    returned += len(listings)
                    median = database.rolling_median(product.id)
                    for listing in listings:
                        seen_ids.add(listing.source_listing_id)
                        listing_id, _, _, was_unavailable = database.observe(listing)
                        deal = evaluate_deal(listing, product, median)
                        if deal and database.should_alert(
                            listing_id,
                            listing.delivered_price,
                            config.price_drop_realert,
                            was_unavailable,
                            config.reappeared_realert,
                        ):
                            deals.append((listing_id, deal))
                            accepted += 1
                    time.sleep(random.uniform(*config.request_delay_seconds))
                database.mark_missing_unavailable(name, seen_ids)
                database.finish_source_run(run_id, returned, accepted)
                LOGGER.info("source=%s returned=%d alertable=%d", name, returned, accepted)
            except Exception as error:
                database.finish_source_run(run_id, returned, accepted, str(error))
                LOGGER.exception("source=%s failed; continuing with remaining sources", name)
    deal_values = [deal for _, deal in deals]
    if deal_values and config.email.enabled:
        subject, text_body, html_body = format_digest(
            deal_values,
            max_per_product=config.email.max_deals_per_product,
            suspicious_discount=config.email.suspicious_discount_percent,
        )
        send_email(config.email, subject, text_body, html_body)
        for listing_id, deal in deals:
            database.record_alert(listing_id, deal.listing.delivered_price, "; ".join(deal.reasons))
    return deal_values
