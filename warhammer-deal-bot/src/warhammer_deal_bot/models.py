"""Shared normalized domain models used by every source adapter."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any


class Condition(StrEnum):
    NEW_ON_SPRUE = "New on sprue"
    NEW_IN_BOX = "New in box"
    NEW_WITHOUT_BOX = "New without box"
    ASSEMBLED_UNPAINTED = "Assembled unpainted"
    PRIMED = "Primed"
    PAINTED = "Painted"
    PARTIAL_BITS = "Partial / bits"
    UNKNOWN = "Unknown"


@dataclass(slots=True)
class Product:
    id: str
    name: str
    aliases: list[str]
    queries: list[str]
    quantity_wanted: int
    msrp: Decimal
    purchased_quantity: int = 0
    hard_threshold: Decimal | None = None
    percent_off_threshold: Decimal | None = None
    median_percent_off: Decimal | None = None
    minimum_savings: Decimal = Decimal("0")
    minimum_seller_rating: Decimal | None = None
    enabled_conditions: set[Condition] = field(default_factory=lambda: set(Condition))
    condition_discount_adjustments: dict[Condition, Decimal] = field(default_factory=dict)
    expected_models: int | None = None
    minimum_models: int | None = None
    required_terms: list[str] = field(default_factory=list)
    excluded_terms: list[str] = field(default_factory=list)
    item_percent_off_threshold: Decimal | None = None
    delivered_percent_off_floor: Decimal | None = None


@dataclass(slots=True)
class Listing:
    source: str
    source_listing_id: str
    title: str
    product_match: str
    url: str
    item_price: Decimal
    shipping_price: Decimal = Decimal("0")
    estimated_tax: Decimal | None = None
    currency: str = "USD"
    condition: Condition = Condition.UNKNOWN
    seller_name: str | None = None
    seller_rating: Decimal | None = None
    location: str | None = None
    quantity: int | None = None
    available: bool = True
    first_seen: datetime = field(default_factory=lambda: datetime.now(UTC))
    last_seen: datetime = field(default_factory=lambda: datetime.now(UTC))
    raw: dict[str, Any] = field(default_factory=dict)
    image_url: str | None = None
    ends_at: datetime | None = None

    @property
    def delivered_price(self) -> Decimal:
        return self.item_price + self.shipping_price


@dataclass(slots=True)
class Deal:
    listing: Listing
    product: Product
    reasons: list[str]
    discount_vs_msrp: Decimal | None
    rolling_median: Decimal | None = None
    similar_listing_count: int = 1

    @property
    def price_per_model(self) -> Decimal | None:
        if not self.listing.quantity:
            return None
        return self.listing.delivered_price / self.listing.quantity
