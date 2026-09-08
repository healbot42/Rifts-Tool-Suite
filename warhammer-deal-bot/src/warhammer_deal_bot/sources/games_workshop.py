from .disabled import DisabledSourceAdapter


class GamesWorkshopAdapter(DisabledSourceAdapter):
    name = "games_workshop"
    reason = (
        "Use configured MSRP values; no public product API was verified for automated US pricing."
    )
