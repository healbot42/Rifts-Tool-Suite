"""Fault-isolated source orchestration for one scheduled run."""

import logging
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import asdict
from decimal import Decimal

import httpx

from .alerts import format_digest, send_email
from .config import AppConfig, product_from_mapping
from .database import Database
from .models import Deal, Listing, Product
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


def _scan_source(
    name: str, settings: dict[str, object], products: list[Product]
) -> tuple[dict[str, list[Listing]], bool]:
    """Scan one source with an isolated client so sources can run concurrently."""
    with httpx.Client(timeout=httpx.Timeout(20), follow_redirects=False) as client:
        adapter = _adapter(name, settings, client)
        return adapter.search_many(products), adapter.complete


def _load_catalog(config: AppConfig, remote: RemoteHistory) -> tuple[list, bool]:
    """Load the authoritative remote catalog, falling back only on failure."""
    if not remote.enabled:
        return config.products, False
    try:
        catalog = [product_from_mapping(product) for product in remote.watchlist()]
        purchases = remote.purchases()
        for product in catalog:
            product.purchased_quantity = max(
                product.purchased_quantity, purchases.get(product.id, 0)
            )
        return catalog, True
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        LOGGER.exception("D1 watchlist hydration failed; using local configuration")
        return config.products, False


def run(
    config: AppConfig, source_filter: str | None = None, product_filter: str | None = None
) -> list[Deal]:
    database = Database(config.database)
    catalog = config.products
    remote_catalog_loaded = False
    with httpx.Client(timeout=httpx.Timeout(20), follow_redirects=False) as client:
        remote = RemoteHistory(client)
        catalog, remote_catalog_loaded = _load_catalog(config, remote)
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
        if remote_catalog_loaded and product_filter is None:
            LOGGER.info("remote watchlist is empty or has no enabled products")
            return []
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
    observations: list[Listing] = []
    remote_medians: dict[str, Decimal] = {}
    with httpx.Client(timeout=httpx.Timeout(20), follow_redirects=False) as client:
        remote_history = RemoteHistory(client)
        if remote_history.enabled:
            try:
                remote_medians = remote_history.medians([product.id for product in products])
            except (httpx.HTTPError, KeyError, TypeError, ValueError):
                LOGGER.exception("D1 median hydration failed; using local history")
        medians = {
            product.id: remote_medians.get(product.id) or database.rolling_median(product.id)
            for product in products
        }
        enabled_sources: list[tuple[str, dict[str, object]]] = []
        for name, settings in config.sources.items():
            if source_filter and name != source_filter:
                continue
            if not settings.get("enabled", False):
                LOGGER.info(
                    "source=%s disabled reason=%s", name, settings.get("reason", "configuration")
                )
                continue
            enabled_sources.append((name, settings))

        futures: dict[str, Future[tuple[dict[str, list[Listing]], bool]]] = {}
        run_ids: dict[str, int] = {}
        worker_count = min(4, len(enabled_sources))
        with ThreadPoolExecutor(max_workers=worker_count or 1) as executor:
            for name, settings in enabled_sources:
                run_ids[name] = database.start_source_run(name)
                futures[name] = executor.submit(_scan_source, name, settings, products)

            for name, _settings in enabled_sources:
                run_id = run_ids[name]
                returned = accepted = 0
                try:
                    listings_by_product, complete = futures[name].result()
                    source_rows = [
                        (product, listing)
                        for product in products
                        for listing in listings_by_product.get(product.id, [])
                    ]
                    source_listings = [listing for _, listing in source_rows]
                    observations.extend(source_listings)
                    returned = len(source_listings)
                    observed = database.observe_many(source_listings)
                    seen_ids = {listing.source_listing_id for listing in source_listings}
                    for (product, listing), (
                        listing_id,
                        _,
                        _,
                        was_unavailable,
                    ) in zip(source_rows, observed, strict=True):
                        deal = evaluate_deal(listing, product, medians[product.id])
                        if deal and database.should_alert(
                            listing_id,
                            listing.delivered_price,
                            config.price_drop_realert,
                            was_unavailable,
                            config.reappeared_realert,
                        ):
                            deals.append((listing_id, deal))
                            accepted += 1
                    if complete:
                        database.mark_missing_unavailable(name, seen_ids)
                    else:
                        LOGGER.warning(
                            "source=%s scan was partial; availability was not reconciled", name
                        )
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
        database.record_alerts(
            [
                (listing_id, deal.listing.delivered_price, "; ".join(deal.reasons))
                for listing_id, deal in deals
            ]
        )
    if observations:
        try:
            with httpx.Client(timeout=httpx.Timeout(10), follow_redirects=False) as client:
                remote_history = RemoteHistory(client)
                stored = remote_history.store(observations)
                if stored:
                    LOGGER.info("D1 history sync stored %d observations", stored)
        except (httpx.HTTPError, KeyError, TypeError, ValueError):
            LOGGER.exception("D1 history sync failed after scan completion")
    return deal_values
