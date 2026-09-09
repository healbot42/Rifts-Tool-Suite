from .shopify import ShopifySitemapAdapter


class GamersGuildAdapter(ShopifySitemapAdapter):
    name = "gamersguild"
    base_url = "https://www.gamersguildusa.com"
    allowed_hosts = {"gamersguildusa.com"}
