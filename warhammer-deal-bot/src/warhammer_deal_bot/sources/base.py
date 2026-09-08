"""Common resilient adapter contract."""

from abc import ABC, abstractmethod

import httpx

from ..models import Listing, Product


class SourceAdapter(ABC):
    name: str

    def __init__(self, settings: dict[str, object], client: httpx.Client):
        self.settings = settings
        self.client = client

    @abstractmethod
    def search(self, product: Product) -> list[Listing]:
        """Return normalized listings, raising on detectable source failure."""
