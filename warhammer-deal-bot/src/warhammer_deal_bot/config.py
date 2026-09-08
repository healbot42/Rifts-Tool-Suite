"""YAML and environment configuration loading with strict validation."""

from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path, PureWindowsPath
from typing import Any

import yaml

from .models import Condition, Product


@dataclass(slots=True)
class EmailConfig:
    enabled: bool = False
    digest: bool = True


@dataclass(slots=True)
class AppConfig:
    database: Path
    products: list[Product]
    sources: dict[str, dict[str, Any]]
    email: EmailConfig = field(default_factory=EmailConfig)
    price_drop_realert: Decimal = Decimal("5")
    reappeared_realert: bool = True
    request_delay_seconds: tuple[float, float] = (1.0, 3.0)


def _money(value: Any) -> Decimal | None:
    return None if value is None else Decimal(str(value))


def load_config(path: str | Path) -> AppConfig:
    config_path = Path(path).expanduser().resolve()
    data = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    if not isinstance(data.get("products"), list) or not data["products"]:
        raise ValueError("Configuration must contain at least one product")
    products: list[Product] = []
    for raw in data["products"]:
        product_id = str(raw.get("id", "")).strip()
        name = str(raw.get("name", "")).strip()
        if not product_id or not name or _money(raw.get("msrp")) is None:
            raise ValueError("Each product requires id, name, and msrp")
        conditions = raw.get("enabled_conditions", [condition.value for condition in Condition])
        products.append(
            Product(
                id=product_id,
                name=name,
                aliases=[str(value) for value in raw.get("aliases", [])],
                queries=[str(value) for value in raw.get("queries", [name])],
                quantity_wanted=int(raw.get("quantity_wanted", 1)),
                msrp=_money(raw["msrp"]),  # type: ignore[arg-type]
                hard_threshold=_money(raw.get("hard_threshold")),
                percent_off_threshold=_money(raw.get("percent_off_threshold")),
                median_percent_off=_money(raw.get("median_percent_off")),
                minimum_savings=_money(raw.get("minimum_savings")) or Decimal("0"),
                minimum_seller_rating=_money(raw.get("minimum_seller_rating")),
                enabled_conditions={Condition(value) for value in conditions},
                condition_discount_adjustments={
                    Condition(key): Decimal(str(value))
                    for key, value in raw.get("condition_discount_adjustments", {}).items()
                },
                expected_models=raw.get("expected_models"),
                required_terms=[str(value) for value in raw.get("required_terms", [])],
                excluded_terms=[str(value) for value in raw.get("excluded_terms", [])],
            )
        )
    email_data = data.get("email", {})
    unexpected_email_keys = set(email_data) - {"enabled", "digest"}
    if unexpected_email_keys:
        raise ValueError(
            "Email configuration only accepts enabled and digest; Gmail endpoint and "
            "credential names are fixed for security"
        )
    email = EmailConfig(**email_data)
    delay = data.get("request_delay_seconds", [1, 3])
    database_value = Path(str(data.get("database", "data/deals.sqlite3")))
    if database_value.is_absolute() or PureWindowsPath(str(database_value)).is_absolute():
        raise ValueError("Database path must be relative to the configuration directory")
    database_path = (config_path.parent / database_value).resolve()
    if not database_path.is_relative_to(config_path.parent):
        raise ValueError("Database path cannot escape the configuration directory")
    return AppConfig(
        database=database_path,
        products=products,
        sources=data.get("sources", {}),
        email=email,
        price_drop_realert=Decimal(str(data.get("price_drop_realert", 5))),
        reappeared_realert=bool(data.get("reappeared_realert", True)),
        request_delay_seconds=(float(delay[0]), float(delay[1])),
    )
