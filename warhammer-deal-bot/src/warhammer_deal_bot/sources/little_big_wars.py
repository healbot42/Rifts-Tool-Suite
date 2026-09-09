from .shopify import ShopifySitemapAdapter


class LittleBigWarsAdapter(ShopifySitemapAdapter):
    name = "little_big_wars"
    base_url = "https://littlebigwars.com"
    allowed_hosts = {"littlebigwars.com"}
