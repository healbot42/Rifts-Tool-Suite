import threading
from decimal import Decimal
from types import SimpleNamespace

import httpx
from warhammer_deal_bot import service


class RemoteStub:
    enabled = True

    def __init__(self, products=None, error=None):
        self.products = products
        self.error = error

    def watchlist(self):
        if self.error:
            raise self.error
        return self.products

    def purchases(self):
        return {}


def test_empty_remote_watchlist_is_authoritative(monkeypatch):
    local_product = SimpleNamespace(id="local", purchased_quantity=0)
    config = SimpleNamespace(products=[local_product])
    monkeypatch.setattr(
        service,
        "product_from_mapping",
        lambda product: SimpleNamespace(**product, purchased_quantity=0),
    )

    catalog, authoritative = service._load_catalog(
        config, RemoteStub(products=[])
    )

    assert catalog == []
    assert authoritative is True


def test_remote_watchlist_failure_falls_back_to_yaml():
    local_product = SimpleNamespace(id="local", purchased_quantity=0)
    config = SimpleNamespace(products=[local_product])

    catalog, authoritative = service._load_catalog(
        config, RemoteStub(error=httpx.ConnectError("offline"))
    )

    assert catalog == [local_product]
    assert authoritative is False


def test_enabled_sources_scan_concurrently(monkeypatch, tmp_path, gal_vorbak):
    barrier = threading.Barrier(2)

    class DisabledRemote:
        enabled = False

        def __init__(self, _client):
            pass

    def scan_source(_name, _settings, products):
        barrier.wait(timeout=2)
        return {product.id: [] for product in products}, True

    monkeypatch.setattr(service, "RemoteHistory", DisabledRemote)
    monkeypatch.setattr(service, "_scan_source", scan_source)
    config = SimpleNamespace(
        database=tmp_path / "deals.sqlite3",
        products=[gal_vorbak],
        sources={"first": {"enabled": True}, "second": {"enabled": True}},
        email=SimpleNamespace(enabled=False),
        price_drop_realert=Decimal("5"),
        reappeared_realert=True,
    )

    assert service.run(config) == []
