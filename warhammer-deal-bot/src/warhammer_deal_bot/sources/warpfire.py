from .catalog_pages import SitemapProductPageAdapter


class WarpfireAdapter(SitemapProductPageAdapter):
    name = "warpfire"
    sitemap_url = "https://warpfireminis.com/xmlsitemap.php?type=products&page=1"
    allowed_hosts = {"warpfireminis.com"}

    def is_product_url(self, url: str) -> bool:
        return url.rstrip("/") != "https://warpfireminis.com"
