"""Safe placeholder for sources without a verified automation interface."""

from ..models import Listing, Product
from .base import SourceAdapter


class DisabledSourceAdapter(SourceAdapter):
    reason = "No verified compliant automation interface is configured."

    def search(self, product: Product) -> list[Listing]:
        if bool(self.settings.get("enabled", False)):
            raise RuntimeError(f"{self.name}: {self.reason}")
        return []
