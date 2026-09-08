"""Official eBay Browse API adapter."""

import base64
import os
from decimal import Decimal, InvalidOperation

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from ..matching import classify_condition, infer_quantity, matches_product
from ..models import Listing, Product
from ..security import sanitize_raw_metadata, validate_https_url
from .base import SourceAdapter


class EbayAdapter(SourceAdapter):
    name = "ebay"
    api_base = "https://api.ebay.com"

    def __init__(self, settings: dict[str, object], client: httpx.Client):
        super().__init__(settings, client)
        forbidden = {"client_id_env", "client_secret_env"}.intersection(settings)
        if forbidden:
            raise ValueError("eBay credential environment-variable names are fixed for security")
        self.client_id = os.environ.get("EBAY_CLIENT_ID")
        self.client_secret = os.environ.get("EBAY_CLIENT_SECRET")
        if not self.client_id or not self.client_secret:
            raise ValueError("eBay is enabled but EBAY_CLIENT_ID/EBAY_CLIENT_SECRET are missing")
        self._token: str | None = None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(httpx.TransportError),
        reraise=True,
    )
    def _access_token(self) -> str:
        if self._token:
            return self._token
        credentials = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        response = self.client.post(
            f"{self.api_base}/identity/v1/oauth2/token",
            headers={"Authorization": f"Basic {credentials}"},
            data={
                "grant_type": "client_credentials",
                "scope": "https://api.ebay.com/oauth/api_scope",
            },
        )
        response.raise_for_status()
        self._token = str(response.json()["access_token"])
        return self._token

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(httpx.TransportError),
        reraise=True,
    )
    def _query(self, query: str) -> dict[str, object]:
        response = self.client.get(
            f"{self.api_base}/buy/browse/v1/item_summary/search",
            headers={
                "Authorization": f"Bearer {self._access_token()}",
                "X-EBAY-C-MARKETPLACE-ID": str(self.settings.get("marketplace", "EBAY_US")),
            },
            params={"q": query, "limit": int(self.settings.get("limit_per_query", 50))},
        )
        response.raise_for_status()
        return response.json()

    def search(self, product: Product) -> list[Listing]:
        found: dict[str, Listing] = {}
        for query in product.queries:
            for item in self._query(query).get("itemSummaries", []):  # type: ignore[union-attr]
                listing = self.parse_item(item, product)
                if listing:
                    found[listing.source_listing_id] = listing
        return list(found.values())

    def parse_item(self, item: dict[str, object], product: Product) -> Listing | None:
        title = str(item.get("title", ""))
        if not matches_product(title, product, bool(self.settings.get("allow_3d_prints", False))):
            return None
        try:
            url = validate_https_url(str(item.get("itemWebUrl", "")), {"ebay.com"})
        except ValueError:
            return None
        try:
            price_data = item["price"]  # type: ignore[index]
            item_price = Decimal(str(price_data["value"]))  # type: ignore[index]
            currency = str(price_data["currency"])  # type: ignore[index]
            shipping_options = item.get("shippingOptions", [])
            shipping = Decimal("0")
            if shipping_options:
                shipping_cost = shipping_options[0].get("shippingCost", {})  # type: ignore[index,union-attr]
                shipping = Decimal(str(shipping_cost.get("value", "0")))  # type: ignore[union-attr]
            if item_price < 0 or shipping < 0:
                return None
        except (KeyError, InvalidOperation, TypeError):
            return None
        seller = item.get("seller", {})
        rating = seller.get("feedbackPercentage") if isinstance(seller, dict) else None
        return Listing(
            source=self.name,
            source_listing_id=str(item.get("itemId", "")),
            title=title,
            product_match=product.id,
            url=url,
            item_price=item_price,
            shipping_price=shipping,
            currency=currency,
            condition=classify_condition(title, str(item.get("condition", ""))),
            seller_name=str(seller.get("username"))
            if isinstance(seller, dict) and seller.get("username")
            else None,
            seller_rating=Decimal(str(rating)) if rating is not None else None,
            location=str(item.get("itemLocation", {}).get("country"))
            if isinstance(item.get("itemLocation"), dict)
            else None,
            quantity=infer_quantity(title),
            raw=sanitize_raw_metadata(item),
        )
