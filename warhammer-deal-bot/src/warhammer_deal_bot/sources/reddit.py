from .disabled import DisabledSourceAdapter


class RedditAdapter(DisabledSourceAdapter):
    name = "reddit_miniswap"
    reason = (
        "Disabled until Reddit OAuth API access is configured and approved; "
        "HTML search is not used."
    )
