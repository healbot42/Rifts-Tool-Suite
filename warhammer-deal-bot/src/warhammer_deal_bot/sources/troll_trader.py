from .disabled import DisabledSourceAdapter


class TrollTraderAdapter(DisabledSourceAdapter):
    name = "troll_trader"
    reason = (
        "No supported API was verified; cross-border shipping also needs destination-aware pricing."
    )
