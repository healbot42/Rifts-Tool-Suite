from .catalog_pages import SitemapProductPageAdapter


class MiniatureMarketAdapter(SitemapProductPageAdapter):
    name = "miniature_market"
    sitemap_url = "https://www.miniaturemarket.com/sitemap.xml"
    allowed_hosts = {"miniaturemarket.com"}
