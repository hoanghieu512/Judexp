"""Watercolour art for the app, scaled to about twice its largest display size
(spec Watercolor §7, step 5), so no 1024 px source ships in the APK.

Run from the repo root: python3 docs/design/watercolor/tools/export_art.py
"""
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ART = HERE.parent
OUT = HERE.parents[3] / "src" / "assets" / "watercolor"

# (source under docs/design/watercolor, file under src/assets/watercolor, width px, WebP quality)
JOBS = [
    # The not-met doodle shows 210px wide.
    ("empty-state-day.webp", "empty-day.webp", 420, 85),
    ("empty-state-night.webp", "empty-night.webp", 420, 85),
    # The cyclo of the logo lockup: 84% of a frame up to about 350px wide.
    ("master/logo-cyclo-d1-cutout.webp", "logo-cyclo.webp", 640, 88),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for source, target, width, quality in JOBS:
        im = Image.open(ART / source)
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        height = round(im.height * width / im.width)
        path = OUT / target
        im.resize((width, height), Image.LANCZOS).save(path, "WEBP", quality=quality, method=6)
        print(path.relative_to(OUT.parents[2]), f"{width}x{height}", path.stat().st_size)


if __name__ == "__main__":
    main()
