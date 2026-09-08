from .flipside import FlipsideAdapter
from .gamersguild import GamersGuildAdapter
from .games_workshop import GamesWorkshopAdapter
from .herrick import HerrickAdapter
from .lazarus import LazarusAdapter
from .little_big_wars import LittleBigWarsAdapter
from .miniature_market import MiniatureMarketAdapter
from .reddit import RedditAdapter
from .troll_trader import TrollTraderAdapter
from .valhalla import ValhallaAdapter
from .warpfire import WarpfireAdapter

RETAILER_ADAPTERS = {
    adapter.name: adapter
    for adapter in (
        GamesWorkshopAdapter,
        WarpfireAdapter,
        GamersGuildAdapter,
        HerrickAdapter,
        MiniatureMarketAdapter,
        ValhallaAdapter,
        FlipsideAdapter,
        LazarusAdapter,
        LittleBigWarsAdapter,
        TrollTraderAdapter,
        RedditAdapter,
    )
}
