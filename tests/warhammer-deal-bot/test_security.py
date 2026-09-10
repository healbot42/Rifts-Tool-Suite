import json
from decimal import Decimal

import pytest
from warhammer_deal_bot.config import load_config
from warhammer_deal_bot.database import Database
from warhammer_deal_bot.models import Listing
from warhammer_deal_bot.security import (
    sanitize_raw_metadata,
    validate_https_url,
)


@pytest.mark.parametrize(
    "url",
    [
        "https://fake-ebay.com/itm/123",
        "https://ebay.com.attacker.example/itm/123",
        "https://user:password@ebay.com/itm/123",
        "https://ebay.com:444/itm/123",
        "javascript:alert(1)",
        "https://ebay.com/itm/123\nBcc: attacker@example.com",
    ],
)
def test_url_boundary_rejects_lookalikes_and_unsafe_components(url):
    with pytest.raises(ValueError):
        validate_https_url(url, {"ebay.com"})


def test_url_boundary_accepts_exact_domain_and_real_subdomains():
    assert validate_https_url("https://www.ebay.com/itm/123", {"ebay.com"})
    assert validate_https_url("https://ebay.com/itm/123", {"ebay.com"})


def test_raw_metadata_redacts_secrets_and_bounds_values():
    sanitized = sanitize_raw_metadata(
        {
            "access_token": "secret",
            "seller": {"email": "private"},
            "title": "x" * 5000,
        }
    )
    assert sanitized["access_token"] == "[redacted]"
    assert sanitized["seller"]["email"] == "[redacted]"
    assert len(sanitized["title"]) == 4096


def test_database_redacts_raw_metadata_at_persistence_boundary(tmp_path):
    database = Database(tmp_path / "deals.sqlite3")
    listing = Listing(
        source="ebay",
        source_listing_id="secure",
        title="Safe listing",
        product_match="product",
        url="https://www.ebay.com/itm/secure",
        item_price=Decimal("10"),
        raw={
            "authorization": "Bearer must-not-persist",
            "seller": {
                "username": "seller-must-not-persist",
                "feedbackPercentage": "100",
            },
        },
    )
    database.observe(listing)
    with database.connect() as connection:
        row = connection.execute("SELECT raw_json FROM listings").fetchone()
    raw = json.loads(row[0])
    assert raw["authorization"] == "[redacted]"
    assert raw["seller"]["username"] == "[redacted]"
    assert raw["seller"]["feedbackPercentage"] == "100"


@pytest.mark.parametrize(
    "database", ["../outside.sqlite3", "C:/outside.sqlite3"]
)
def test_config_rejects_database_paths_outside_config_directory(
    tmp_path, database
):
    config = tmp_path / "config.yaml"
    config.write_text(
        f"database: {database!r}\nproducts:\n  - id: x\n    name: X\n    msrp: 10\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError):
        load_config(config)
