"""Flipside's documented read-only agent catalog integration."""

import re
import time
from decimal import Decimal, InvalidOperation
from urllib.parse import quote_plus, urljoin, urlsplit

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from ..matching import matches_product
from ..models import Condition, Listing, Product
from ..security import sanitize_raw_metadata, validate_https_url
from .base import SourceAdapter


class FlipsideAdapter(SourceAdapter):
    name = "flipside"
    base_url = "https://flipsidegaming.com"
    allowed_hosts = {"flipsidegaming.com"}

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(httpx.TransportError),
        reraise=True,
    )
    def _get(self, url: str) -> httpx.Response:
        response = self.client.get(url, headers={"User-Agent": "WarhammerDealBot/0.1"})
        response.raise_for_status()
        time.sleep(float(self.settings.get("request_delay_seconds", 0.5)))
        return response

    def search(self, product: Product) -> list[Listing]:
        candidate_urls: set[str] = set()
        for query in product.queries:
            search_url = f"{self.base_url}/search?q={quote_plus(query)}&type=product"
            links = {
                urljoin(self.base_url, match)
                for match in re.findall(
                    r'href=["\']([^"\']*/products/[^"\'?#]+)',
                    self._get(search_url).text,
                    re.IGNORECASE,
                )
            }
            for url in links:
                safe_url = validate_https_url(url, self.allowed_hosts)
                slug = urlsplit(safe_url).path.replace("-", " ")
                if matches_product(slug, product):
                    candidate_urls.add(safe_url)

        found: dict[str, Listing] = {}
        for safe_url in list(candidate_urls)[:50]:
            payload = self._get(f"{safe_url}.json").json()
            data = payload.get("product") if isinstance(payload, dict) else None
            if not isinstance(data, dict):
                continue
            title = str(data.get("title", ""))
            variants = data.get("variants")
            if not matches_product(title, product) or not isinstance(variants, list):
                continue
            available = [
                variant
                for variant in variants
                if isinstance(variant, dict)
                and isinstance(variant.get("inventory_quantity"), int)
                and variant["inventory_quantity"] > 0
                and variant.get("price_currency") == "USD"
            ]
            try:
                chosen = min(available, key=lambda item: Decimal(str(item["price"])))
                price = Decimal(str(chosen["price"]))
            except (KeyError, InvalidOperation, ValueError):
                continue
            identifier = str(chosen.get("id", ""))
            if not identifier or not price.is_finite() or price < 0:
                continue
            found[identifier] = Listing(
                source=self.name,
                source_listing_id=identifier,
                title=title,
                product_match=product.id,
                url=safe_url,
                item_price=price,
                shipping_price=Decimal("0"),
                condition=Condition.NEW_IN_BOX,
                seller_name=self.name,
                location="US",
                quantity=product.expected_models,
                raw=sanitize_raw_metadata(data),
            )
        return list(found.values())
