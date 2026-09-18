"""Common resilient adapter contract."""

from abc import ABC, abstractmethod

import httpx

from ..models import Listing, Product

TRANSIENT_HTTP_STATUS_CODES = {429, 502, 503, 504}


def retryable_http_error(error: BaseException) -> bool:
    """Retry transport failures and conventional transient HTTP responses."""
    if isinstance(error, httpx.TransportError):
        return True
    return isinstance(error, httpx.HTTPStatusError) and (
        error.response.status_code in TRANSIENT_HTTP_STATUS_CODES
    )


class SourceAdapter(ABC):
    name: str

    def __init__(self, settings: dict[str, object], client: httpx.Client):
        self.settings = settings
        self.client = client
        self.complete = True

    @abstractmethod
    def search(self, product: Product) -> list[Listing]:
        """Return normalized listings, raising on detectable source failure."""

    def search_many(self, products: list[Product]) -> dict[str, list[Listing]]:
        """Search a watchlist, overridden by sources that can share catalog work."""
        return {product.id: self.search(product) for product in products}
