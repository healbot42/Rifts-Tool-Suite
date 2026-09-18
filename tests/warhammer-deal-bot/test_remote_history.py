import json
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
        if request.url.path == "/v1/price-medians":
            return httpx.Response(
                200,
                json={
                    "medians": [
                        {
                            "product_id": "squad",
                            "median": 42.5,
                            "observation_count": 9,
                        }
                    ]
                },
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
        assert remote.medians(["squad"]) == {"squad": Decimal("42.5")}
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
        remote.prune()
    assert [request.url.path for request in requests] == [
        "/v1/purchases",
        "/v1/history",
        "/v1/price-medians",
        "/v1/observations",
        "/v1/observations/prune",
    ]


def test_remote_history_batches_one_completed_scan(monkeypatch):
    batch_sizes = []

    def handler(request):
        payload = json.loads(request.content)
        batch_sizes.append(len(payload["observations"]))
        return httpx.Response(200, json={"stored": batch_sizes[-1]})

    monkeypatch.setenv("DATA_API_TOKEN", "test-token")
    monkeypatch.setenv(
        "DATA_API_URL", "https://rifts-data-api.zhawkins42.workers.dev"
    )
    listings = [
        Listing(
            source="ebay",
            source_listing_id=str(index),
            title=f"Squad {index}",
            product_match="squad",
            url=f"https://www.ebay.com/itm/{index}",
            item_price=Decimal("50"),
            last_seen=datetime(2026, 1, 1, tzinfo=UTC),
        )
        for index in range(205)
    ]

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        assert RemoteHistory(client).store(listings) == 205

    assert batch_sizes == [100, 100, 5]


def test_remote_history_stays_disabled_without_both_settings(monkeypatch):
    monkeypatch.delenv("DATA_API_TOKEN", raising=False)
    monkeypatch.setenv(
        "DATA_API_URL", "https://rifts-data-api.zhawkins42.workers.dev"
    )
    with httpx.Client() as client:
        remote = RemoteHistory(client)
        assert not remote.enabled
        remote.prune()


def test_remote_watchlist_uses_machine_authenticated_endpoint(monkeypatch):
    monkeypatch.setenv("DATA_API_TOKEN", "secret")
    monkeypatch.setenv(
        "DATA_API_URL", "https://rifts-data-api.zhawkins42.workers.dev"
    )

    def handler(request):
        assert request.headers["authorization"] == "Bearer secret"
        assert request.url.path == "/v1/bot/watchlist"
        return httpx.Response(200, json={"products": [{"id": "possessed"}]})

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        assert RemoteHistory(client).watchlist() == [{"id": "possessed"}]
