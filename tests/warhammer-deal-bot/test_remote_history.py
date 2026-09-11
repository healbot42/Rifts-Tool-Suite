from datetime import UTC, datetime
from decimal import Decimal

import httpx
from warhammer_deal_bot.models import Listing
from warhammer_deal_bot.remote_history import RemoteHistory


def test_remote_history_reads_purchases_and_batches_observations(monkeypatch):
    requests = []

    def handler(request):
        requests.append(request)
        assert request.headers["authorization"] == "Bearer test-token"
        if request.url.path == "/v1/purchases":
            return httpx.Response(
                200,
                json={"purchases": [{"product_id": "squad", "quantity": 2}]},
            )
        if request.url.path == "/v1/history":
            return httpx.Response(
                200, json={"observations": [{"source": "ebay"}]}
            )
        return httpx.Response(200, json={"stored": 1})

    monkeypatch.setenv("DATA_API_TOKEN", "test-token")
    monkeypatch.setenv(
        "DATA_API_URL", "https://rifts-data-api.zhawkins42.workers.dev"
    )
    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        remote = RemoteHistory(client)
        assert remote.purchases() == {"squad": 2}
        assert remote.history("squad") == [{"source": "ebay"}]
        remote.store(
            [
                Listing(
                    source="ebay",
                    source_listing_id="1",
                    title="Squad",
                    product_match="squad",
                    url="https://www.ebay.com/itm/1",
                    item_price=Decimal("50"),
                    last_seen=datetime(2026, 1, 1, tzinfo=UTC),
                )
            ]
        )
    assert [request.url.path for request in requests] == [
        "/v1/purchases",
        "/v1/history",
        "/v1/observations",
    ]


def test_remote_history_stays_disabled_without_both_settings(monkeypatch):
    monkeypatch.delenv("DATA_API_TOKEN", raising=False)
    monkeypatch.setenv(
        "DATA_API_URL", "https://rifts-data-api.zhawkins42.workers.dev"
    )
    with httpx.Client() as client:
        assert not RemoteHistory(client).enabled
