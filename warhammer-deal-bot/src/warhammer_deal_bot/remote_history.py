"""Authenticated Cloudflare D1 history synchronization with local fallback."""

import os
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from .models import Listing
from .security import validate_https_url


class RemoteHistory:
    def __init__(self, client: httpx.Client):
        token = os.environ.get("DATA_API_TOKEN")
        url = os.environ.get("DATA_API_URL")
        self.enabled = bool(token and url)
        self.client = client
        self.token = token or ""
        self.url = (
            validate_https_url(url or "", {"zhawkins42.workers.dev"}).rstrip("/")
            if self.enabled
            else ""
        )

    @property
    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"}

    def history(self, product_id: str, days: int = 30) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        since = (datetime.now(UTC) - timedelta(days=days)).isoformat()
        response = self.client.get(
            f"{self.url}/v1/history",
            headers=self.headers,
            params={"product_id": product_id, "since": since},
        )
        response.raise_for_status()
        payload = response.json()
        return payload.get("observations", [])

    def purchases(self) -> dict[str, int]:
        if not self.enabled:
            return {}
        response = self.client.get(f"{self.url}/v1/purchases", headers=self.headers)
        response.raise_for_status()
        return {
            str(row["product_id"]): int(row["quantity"])
            for row in response.json().get("purchases", [])
        }

    def store(self, listings: list[Listing]) -> None:
        if not self.enabled:
            return
        rows = [
            {
                "source": listing.source,
                "source_listing_id": listing.source_listing_id,
                "product_id": listing.product_match,
                "observed_at": listing.last_seen.isoformat(),
                "delivered_price": str(listing.delivered_price),
                "title": listing.title,
                "url": listing.url,
                "image_url": listing.image_url,
                "ends_at": listing.ends_at.isoformat() if listing.ends_at else None,
                "available": listing.available,
            }
            for listing in listings
        ]
        for offset in range(0, len(rows), 100):
            response = self.client.post(
                f"{self.url}/v1/observations",
                headers=self.headers,
                json={"observations": rows[offset : offset + 100]},
            )
            response.raise_for_status()
