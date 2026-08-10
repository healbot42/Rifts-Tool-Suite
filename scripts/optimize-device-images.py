"""Create browser-sized WebP copies of generated TW device catalog images."""

from pathlib import Path

from PIL import Image

ASSET_DIR = (
    Path(__file__).resolve().parents[1] / "public" / "assets" / "tw-devices"
)
MAX_SIZE = (1280, 720)

converted = 0
for source in sorted(ASSET_DIR.glob("*.png")):
    with Image.open(source) as image:
        image.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
        image.save(source.with_suffix(".webp"), "WEBP", quality=78, method=6)
    converted += 1

print(f"Optimized {converted} device images as WebP.")
