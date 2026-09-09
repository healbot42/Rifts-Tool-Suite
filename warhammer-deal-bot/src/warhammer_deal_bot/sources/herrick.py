from .shopify import ShopifySitemapAdapter


class HerrickAdapter(ShopifySitemapAdapter):
    name = "herrick"
    base_url = "https://herrickgames.com"
    allowed_hosts = {"herrickgames.com"}
