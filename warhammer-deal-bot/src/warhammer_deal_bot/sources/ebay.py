"""Official eBay Browse API adapter."""

import base64
import logging
import os
import time
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation

import httpx
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from ..matching import classify_condition, infer_quantity, matches_product
from ..models import Listing, Product
from ..security import sanitize_raw_metadata, validate_https_url
from .base import SourceAdapter, retryable_http_error

LOGGER = logging.getLogger(__name__)


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
        self.request_delay = float(settings.get("request_delay_seconds", 0.25))

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception(retryable_http_error),
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
        retry=retry_if_exception(retryable_http_error),
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
        time.sleep(self.request_delay)
        return response.json()

    def query_local(self, query: str, postal_code: str, radius_miles: int) -> dict[str, object]:
        """Search seller-arranged local pickup inventory in an eBay-supported radius."""
        filters = ",".join(
            (
                "deliveryOptions:{SELLER_ARRANGED_LOCAL_PICKUP}",
                "pickupCountry:US",
                f"pickupPostalCode:{postal_code}",
                f"pickupRadius:{radius_miles}",
                "pickupRadiusUnit:mi",
            )
        )
        response = self.client.get(
            f"{self.api_base}/buy/browse/v1/item_summary/search",
            headers={
                "Authorization": f"Bearer {self._access_token()}",
                "X-EBAY-C-MARKETPLACE-ID": str(self.settings.get("marketplace", "EBAY_US")),
                "X-EBAY-C-ENDUSERCTX": f"contextualLocation=country=US,zip={postal_code}",
            },
            params={
                "q": query,
                "limit": int(self.settings.get("limit_per_query", 50)),
                "filter": filters,
                "sort": "distance",
            },
        )
        response.raise_for_status()
        return response.json()

    def parse_local_item(self, item: dict[str, object], category_id: str) -> Listing | None:
        """Normalize a local result without applying Warhammer product matching."""
        title = str(item.get("title", "")).strip()
        if not title:
            return None
        # Reuse the hardened price/URL parsing by supplying a permissive synthetic product.
        product = Product(
            id=category_id,
            name=title,
            aliases=[title],
            queries=[title],
            quantity_wanted=1,
            msrp=Decimal("1"),
        )
        listing = self.parse_item(item, product)
        if listing is None:
            return None
        distance = item.get("distanceFromPickupLocation")
        if isinstance(distance, dict):
            try:
                listing.distance_miles = Decimal(str(distance.get("value")))
            except (InvalidOperation, TypeError):
                listing.distance_miles = None
        delivery_options = item.get("deliveryOptions", [])
        listing.local_pickup = "SELLER_ARRANGED_LOCAL_PICKUP" in delivery_options
        if not listing.local_pickup:
            listing.local_pickup = True  # The API query itself requires this delivery option.
        location = item.get("itemLocation")
        if isinstance(location, dict):
            listing.location = (
                ", ".join(
                    str(location[key])
                    for key in ("city", "stateOrProvince", "postalCode")
                    if location.get(key)
                )
                or listing.location
            )
        return listing

    def search(self, product: Product) -> list[Listing]:
        return self.search_many([product])[product.id]

    def search_many(self, products: list[Product]) -> dict[str, list[Listing]]:
        """Issue duplicate watchlist queries once while retaining product-specific matching."""
        query_products: dict[str, list[Product]] = {}
        for product in products:
            for query in product.queries:
                query_products.setdefault(query, []).append(product)

        found: dict[str, dict[str, Listing]] = {product.id: {} for product in products}
        for query, query_matches in query_products.items():
            try:
                items = self._query(query).get("itemSummaries", [])
            except (httpx.HTTPError, ValueError) as error:
                self.complete = False
                LOGGER.warning("source=%s skipped query=%r error=%s", self.name, query, error)
                continue
            if not isinstance(items, list):
                continue
            for item in items:
                if not isinstance(item, dict):
                    continue
                for product in query_matches:
                    listing = self.parse_item(item, product)
                    if listing:
                        found[product.id][listing.source_listing_id] = listing
        return {product_id: list(values.values()) for product_id, values in found.items()}

    def parse_item(self, item: dict[str, object], product: Product) -> Listing | None:
        title = str(item.get("title", ""))
        if not matches_product(title, product, bool(self.settings.get("allow_3d_prints", False))):
            return None
        availability = str(item.get("estimatedAvailabilityStatus", "")).upper()
        estimates = item.get("estimatedAvailabilities", [])
        if availability == "OUT_OF_STOCK" or (
            isinstance(estimates, list)
            and any(
                isinstance(value, dict)
                and str(value.get("estimatedAvailabilityStatus", "")).upper() == "OUT_OF_STOCK"
                for value in estimates
            )
        ):
            return None
        ends_at = None
        if item.get("itemEndDate"):
            try:
                ends_at = datetime.fromisoformat(str(item["itemEndDate"]).replace("Z", "+00:00"))
            except ValueError:
                ends_at = None
            if ends_at is not None and ends_at <= datetime.now(UTC):
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
            if product.delivered_percent_off_floor is not None:
                # A mandatory shipped-price floor cannot treat unknown shipping as free.
                if (
                    not isinstance(shipping_options, list)
                    or not shipping_options
                    or not isinstance(shipping_options[0], dict)
                ):
                    return None
                quoted_shipping = shipping_options[0].get("shippingCost")
                if (
                    not isinstance(quoted_shipping, dict)
                    or "value" not in quoted_shipping
                    or quoted_shipping.get("currency") != currency
                ):
                    return None
            shipping = Decimal("0")
            if shipping_options:
                shipping_cost = shipping_options[0].get("shippingCost", {})  # type: ignore[index,union-attr]
                shipping = Decimal(str(shipping_cost.get("value", "0")))  # type: ignore[union-attr]
            if (
                not item_price.is_finite()
                or not shipping.is_finite()
                or item_price < 0
                or shipping < 0
            ):
                return None
        except (KeyError, InvalidOperation, TypeError):
            return None
        seller = item.get("seller", {})
        image = item.get("image", {})
        image_url = None
        if isinstance(image, dict) and image.get("imageUrl"):
            try:
                image_url = validate_https_url(str(image["imageUrl"]), {"ebayimg.com"})
            except ValueError:
                image_url = None
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
            seller_name=None,
            seller_rating=Decimal(str(rating)) if rating is not None else None,
            location=str(item.get("itemLocation", {}).get("country"))
            if isinstance(item.get("itemLocation"), dict)
            else None,
            quantity=infer_quantity(title),
            raw=sanitize_raw_metadata(item),
            image_url=image_url,
            ends_at=ends_at,
        )
