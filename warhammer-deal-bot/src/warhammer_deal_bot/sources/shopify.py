"""Low-rate Shopify retailer integration using advertised public sitemaps."""

import time
import xml.etree.ElementTree as ET
from decimal import Decimal, InvalidOperation
from urllib.parse import urlsplit, urlunsplit

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from ..matching import matches_product
from ..models import Condition, Listing, Product
from ..security import sanitize_raw_metadata, validate_https_url
from .base import SourceAdapter

SITEMAP_NAMESPACE = {
    "sitemap": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "image": "http://www.google.com/schemas/sitemap-image/1.1",
}
MAX_SITEMAPS = 50
MAX_PRODUCTS = 100_000


class ShopifySitemapAdapter(SourceAdapter):
    """Read product URLs from a store sitemap and public ``.js`` product records."""

    base_url: str
    allowed_hosts: set[str]

    def __init__(self, settings: dict[str, object], client: httpx.Client):
        super().__init__(settings, client)
        self._catalog: list[tuple[str, str]] | None = None
        self.request_delay = float(settings.get("request_delay_seconds", 0.25))
        self.free_shipping_threshold = self._money_setting("free_shipping_threshold")
        self.flat_shipping = self._money_setting("flat_shipping")

    def _money_setting(self, key: str) -> Decimal | None:
        value = self.settings.get(key)
        if value is None:
            return None
        try:
            amount = Decimal(str(value))
        except InvalidOperation as error:
            raise ValueError(f"{self.name}: {key} must be a valid amount") from error
        if not amount.is_finite() or amount < 0:
            raise ValueError(f"{self.name}: {key} must be finite and non-negative")
        return amount

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(httpx.TransportError),
        reraise=True,
    )
    def _get_text(self, url: str) -> str:
        validate_https_url(url, self.allowed_hosts)
        response = self.client.get(url, headers={"User-Agent": "WarhammerDealBot/0.1"})
        response.raise_for_status()
        time.sleep(self.request_delay)
        return response.text

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(httpx.TransportError),
        reraise=True,
    )
    def _get_json(self, url: str) -> object:
        validate_https_url(url, self.allowed_hosts)
        response = self.client.get(url, headers={"User-Agent": "WarhammerDealBot/0.1"})
        response.raise_for_status()
        time.sleep(self.request_delay)
        return response.json()

    @staticmethod
    def _xml_root(text: str) -> ET.Element:
        try:
            return ET.fromstring(text)
        except ET.ParseError as error:
            raise RuntimeError("Retailer returned malformed sitemap XML") from error

    def _load_catalog(self) -> list[tuple[str, str]]:
        if self._catalog is not None:
            return self._catalog
        root = self._xml_root(self._get_text(f"{self.base_url}/sitemap.xml"))
        sitemap_urls = []
        for node in root.findall("sitemap:sitemap/sitemap:loc", SITEMAP_NAMESPACE):
            if not node.text:
                continue
            sitemap_url = node.text.strip()
            if urlsplit(sitemap_url).path.startswith("/sitemap_products_"):
                sitemap_urls.append(validate_https_url(sitemap_url, self.allowed_hosts))
        if not sitemap_urls or len(sitemap_urls) > MAX_SITEMAPS:
            raise RuntimeError(f"{self.name}: unexpected product sitemap count")

        catalog: list[tuple[str, str]] = []
        for sitemap_url in sitemap_urls:
            product_root = self._xml_root(self._get_text(sitemap_url))
            for node in product_root.findall("sitemap:url", SITEMAP_NAMESPACE):
                location = node.findtext("sitemap:loc", namespaces=SITEMAP_NAMESPACE)
                if not location or "/products/" not in location:
                    continue
                safe_url = validate_https_url(location.strip(), self.allowed_hosts)
                title = node.findtext("image:image/image:title", namespaces=SITEMAP_NAMESPACE) or ""
                catalog.append((safe_url, title))
                if len(catalog) > MAX_PRODUCTS:
                    raise RuntimeError(f"{self.name}: product sitemap exceeded safety limit")
        self._catalog = catalog
        return catalog

    def _shipping_price(self, item_price: Decimal) -> Decimal | None:
        if self.free_shipping_threshold is not None and item_price >= self.free_shipping_threshold:
            return Decimal("0")
        return self.flat_shipping

    def _parse_product(self, data: dict[str, object], url: str, product: Product) -> Listing | None:
        title = str(data.get("title", ""))
        if not matches_product(title, product):
            return None
        variants = data.get("variants")
        if not isinstance(variants, list):
            return None
        available = [
            variant
            for variant in variants
            if isinstance(variant, dict) and variant.get("available")
        ]
        try:
            chosen = min(available, key=lambda variant: Decimal(str(variant["price"])))
            cents = Decimal(str(chosen["price"]))
            item_price = cents / Decimal("100")
        except (KeyError, InvalidOperation, ValueError):
            return None
        if not item_price.is_finite() or item_price < 0:
            return None
        shipping = self._shipping_price(item_price)
        if shipping is None:
            return None
        identifier = chosen.get("id") or data.get("id")
        if not identifier:
            return None
        return Listing(
            source=self.name,
            source_listing_id=str(identifier),
            title=title,
            product_match=product.id,
            url=validate_https_url(url, self.allowed_hosts),
            item_price=item_price,
            shipping_price=shipping,
            condition=Condition.NEW_IN_BOX,
            seller_name=self.name,
            location="US",
            quantity=product.expected_models,
            raw=sanitize_raw_metadata(data),
        )

    def search(self, product: Product) -> list[Listing]:
        listings: list[Listing] = []
        for url, sitemap_title in self._load_catalog():
            handle = urlsplit(url).path.rsplit("/", 1)[-1].replace("-", " ")
            if not matches_product(sitemap_title or handle, product):
                continue
            parsed = urlsplit(url)
            json_url = urlunsplit((parsed.scheme, parsed.netloc, f"{parsed.path}.js", "", ""))
            data = self._get_json(json_url)
            if isinstance(data, dict) and (listing := self._parse_product(data, url, product)):
                listings.append(listing)
        return listings
