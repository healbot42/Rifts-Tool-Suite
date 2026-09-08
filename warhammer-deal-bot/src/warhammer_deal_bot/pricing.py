"""Deal qualification and price calculations."""

from decimal import Decimal

from .models import Deal, Listing, Product


def discount_percent(price: Decimal, reference: Decimal | None) -> Decimal | None:
    if reference is None or reference <= 0:
        return None
    return ((reference - price) / reference * 100).quantize(Decimal("0.1"))


def evaluate_deal(
    listing: Listing, product: Product, rolling_median: Decimal | None = None
) -> Deal | None:
    if listing.currency != "USD" or listing.condition not in product.enabled_conditions:
        return None
    if product.minimum_seller_rating is not None and (
        listing.seller_rating is None or listing.seller_rating < product.minimum_seller_rating
    ):
        return None
    delivered = listing.delivered_price
    msrp_discount = discount_percent(delivered, product.msrp)
    savings = product.msrp - delivered
    condition_adjustment = product.condition_discount_adjustments.get(
        listing.condition, Decimal("0")
    )
    reasons: list[str] = []
    adjusted_hard_threshold = (
        product.hard_threshold * (Decimal("1") - condition_adjustment / Decimal("100"))
        if product.hard_threshold is not None
        else None
    )
    if adjusted_hard_threshold is not None and delivered <= adjusted_hard_threshold:
        reasons.append(f"delivered price is at or below ${adjusted_hard_threshold}")
    if product.percent_off_threshold is not None and (
        msrp_discount is not None
        and msrp_discount >= product.percent_off_threshold + condition_adjustment
    ):
        reasons.append(f"{msrp_discount}% below MSRP")
    median_discount = discount_percent(delivered, rolling_median)
    if product.median_percent_off is not None and (
        median_discount is not None
        and median_discount >= product.median_percent_off + condition_adjustment
    ):
        reasons.append(f"{median_discount}% below the rolling 30-day median")
    if not reasons or savings < product.minimum_savings:
        return None
    return Deal(listing, product, reasons, msrp_discount, rolling_median)
