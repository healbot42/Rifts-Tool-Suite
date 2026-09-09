"""Retail adapters backed by advertised sitemaps and public product metadata."""

import gzip
import html
import json
import re
import time
import xml.etree.ElementTree as ET
from decimal import Decimal, InvalidOperation
from urllib.parse import quote_plus, urljoin, urlsplit

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from ..matching import matches_product
from ..models import Condition, Listing, Product
from ..security import sanitize_raw_metadata, validate_https_url
from .base import SourceAdapter

XML_NAMESPACE = {"sitemap": "http://www.sitemaps.org/schemas/sitemap/0.9"}
MAX_SITEMAPS = 25
MAX_PRODUCTS = 100_000


class SitemapProductPageAdapter(SourceAdapter):
    """Match sitemap URL slugs, then read standard metadata from matching pages."""

    sitemap_url: str
    allowed_hosts: set[str]

    def __init__(self, settings: dict[str, object], client: httpx.Client):
        super().__init__(settings, client)
        self.request_delay = float(settings.get("request_delay_seconds", 0.5))
        self._catalog: list[str] | None = None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(httpx.TransportError),
        reraise=True,
    )
    def _get(self, url: str) -> httpx.Response:
        validate_https_url(url, self.allowed_hosts)
        response = self.client.get(url, headers={"User-Agent": "WarhammerDealBot/0.1"})
        response.raise_for_status()
        time.sleep(self.request_delay)
        return response

    @staticmethod
    def _root(content: bytes) -> ET.Element:
        if content.startswith(b"\x1f\x8b"):
            content = gzip.decompress(content)
        try:
            return ET.fromstring(content)
        except ET.ParseError as error:
            raise RuntimeError("Retailer returned malformed sitemap XML") from error

    def _load_catalog(self) -> list[str]:
        if self._catalog is not None:
            return self._catalog
        root = self._root(self._get(self.sitemap_url).content)
        nested = [
            node.text.strip()
            for node in root.findall("sitemap:sitemap/sitemap:loc", XML_NAMESPACE)
            if node.text
        ]
        if len(nested) > MAX_SITEMAPS:
            raise RuntimeError(f"{self.name}: sitemap count exceeded safety limit")
        roots = [self._root(self._get(url).content) for url in nested] if nested else [root]
        catalog: list[str] = []
        for product_root in roots:
            for node in product_root.findall("sitemap:url/sitemap:loc", XML_NAMESPACE):
                if not node.text:
                    continue
                url = validate_https_url(node.text.strip(), self.allowed_hosts)
                if self.is_product_url(url):
                    catalog.append(url)
                if len(catalog) > MAX_PRODUCTS:
                    raise RuntimeError(f"{self.name}: catalog exceeded safety limit")
        self._catalog = catalog
        return catalog

    def is_product_url(self, url: str) -> bool:
        return True

    @staticmethod
    def _meta(content: str, property_name: str) -> str | None:
        for tag in re.findall(r"<meta\b[^>]*>", content, re.IGNORECASE):
            attributes = dict(
                (name.casefold(), html.unescape(value))
                for name, _, value in re.findall(
                    r"([\w:-]+)\s*=\s*(['\"])(.*?)\2", tag, re.IGNORECASE | re.DOTALL
                )
            )
            if attributes.get("property", "").casefold() == property_name.casefold():
                return attributes.get("content")
        return None

    def page_available(self, content: str) -> bool:
        availability = self._meta(content, "product:availability")
        if availability:
            return availability.casefold() in {"in stock", "instock", "available"}
        if re.search(r"schema\.org(?:\\?/|/)InStock", content, re.IGNORECASE):
            return True
        if re.search(r"schema\.org(?:\\?/|/)OutOfStock", content, re.IGNORECASE):
            return False
        return "out of stock" not in content.casefold()

    def parse_page(self, content: str, url: str, product: Product) -> Listing | None:
        title = self._meta(content, "og:title") or ""
        if not matches_product(title, product) or not self.page_available(content):
            return None
        currency = self._meta(content, "product:price:currency") or "USD"
        if currency != "USD":
            return None
        try:
            item_price = Decimal(self._meta(content, "product:price:amount") or "")
        except InvalidOperation:
            return None
        if not item_price.is_finite() or item_price < 0:
            return None
        return Listing(
            source=self.name,
            source_listing_id=urlsplit(url).path.casefold(),
            title=title,
            product_match=product.id,
            url=validate_https_url(url, self.allowed_hosts),
            item_price=item_price,
            shipping_price=Decimal("0"),
            condition=Condition.NEW_IN_BOX,
            seller_name=self.name,
            location="US",
            quantity=product.expected_models,
            raw={"title": title, "price": str(item_price), "currency": currency},
        )

    def search(self, product: Product) -> list[Listing]:
        found: list[Listing] = []
        for url in self._load_catalog():
            slug = urlsplit(url).path.replace("-", " ")
            if not matches_product(slug, product):
                continue
            if listing := self.parse_page(self._get(url).text, url, product):
                found.append(listing)
        return found


class ValhallaCatalogAdapter(SourceAdapter):
    """Read Valhalla's public search results and embedded inventory records."""

    name = "valhalla"
    base_url = "https://www.valhallahobby.com"
    allowed_hosts = {"valhallahobby.com"}

    def _request(self, query: str) -> str:
        url = f"{self.base_url}/shop/?search={quote_plus(query)}"
        response = self.client.get(url, headers={"User-Agent": "WarhammerDealBot/0.1"})
        if response.is_redirect:
            location = validate_https_url(
                urljoin(url, str(response.headers.get("location", ""))), self.allowed_hosts
            )
            response = self.client.get(location, headers={"User-Agent": "WarhammerDealBot/0.1"})
        response.raise_for_status()
        time.sleep(float(self.settings.get("request_delay_seconds", 0.5)))
        return response.text

    def search(self, product: Product) -> list[Listing]:
        found: dict[str, Listing] = {}
        for query in product.queries:
            content = self._request(query)
            records = re.findall(
                r'<script[^>]+id="AddToCartButton_[^"]+_data"[^>]*>(.*?)</script>',
                content,
                re.IGNORECASE | re.DOTALL,
            )
            for record in records:
                try:
                    data = json.loads(html.unescape(record))
                    title = str(data["product"]["name"])
                    inventory = int(data.get("inventory", 0))
                    item_price = Decimal(str(data["price"]))
                    identifier = str(data["id"])
                    slug = str(data["product"]["slug"])
                except (KeyError, TypeError, ValueError, InvalidOperation, json.JSONDecodeError):
                    continue
                if inventory <= 0 or not matches_product(title, product):
                    continue
                url = validate_https_url(
                    f"{self.base_url}/shop/product/{slug}/", self.allowed_hosts
                )
                found[identifier] = Listing(
                    source=self.name,
                    source_listing_id=identifier,
                    title=title,
                    product_match=product.id,
                    url=url,
                    item_price=item_price,
                    shipping_price=Decimal("0"),
                    condition=Condition.NEW_IN_BOX,
                    seller_name=self.name,
                    location="US",
                    quantity=product.expected_models,
                    raw=sanitize_raw_metadata(data),
                )
        return list(found.values())
