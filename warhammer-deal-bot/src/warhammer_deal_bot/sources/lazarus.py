from .shopify import ShopifySitemapAdapter


class LazarusAdapter(ShopifySitemapAdapter):
    name = "lazarus"
    base_url = "https://lazarus-games.com"
    allowed_hosts = {"lazarus-games.com"}
