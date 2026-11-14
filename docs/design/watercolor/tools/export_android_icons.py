"""Android launcher icons from the D1 cyclo (spec Watercolor §6.1, §7 step 3).

The 1024 source maps to the 108 dp adaptive icon frame. The cyclo is cut from
its cream paper, shrunk to 90 % and centred, then checked against the 66 dp
safe circle before anything is written: a launcher may mask away whatever
lies outside it. Writes the adaptive foreground for every density, and the
legacy square and round icons Android 7 and 7.1 use.

Run from the repo root: python3 docs/design/watercolor/tools/export_android_icons.py
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from cutout import cut

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / "master" / "icon-launcher-d1.webp"
RES = HERE.parents[3] / "android" / "app" / "src" / "main" / "res"
CREAM = (0xF7, 0xEE, 0xDB)
FRAME = 1024
DP = FRAME / 108
SAFE_RADIUS_DP = 33
SCALE = 0.9
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def foreground() -> Image.Image:
    """The cyclo on a transparent 1024 frame, shrunk and centred."""
    bike = cut(Image.open(SOURCE))
    bike = bike.resize((round(bike.width * SCALE), round(bike.height * SCALE)), Image.LANCZOS)
    canvas = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    canvas.alpha_composite(bike, ((FRAME - bike.width) // 2, (FRAME - bike.height) // 2))
    return canvas


def farthest_ink_dp(canvas: Image.Image) -> float:
    alpha = np.asarray(canvas)[:, :, 3]
    ys, xs = np.nonzero(alpha > 32)
    centre = (FRAME - 1) / 2
    return float(np.sqrt((xs - centre) ** 2 + (ys - centre) ** 2).max()) / DP


def round_mask(side: int) -> Image.Image:
    big = Image.new("L", (side * 4, side * 4), 0)
    ImageDraw.Draw(big).ellipse((0, 0, side * 4 - 1, side * 4 - 1), fill=255)
    return big.resize((side, side), Image.LANCZOS)


def main() -> None:
    canvas = foreground()
    radius = farthest_ink_dp(canvas)
    print(f"farthest ink {radius:.1f} dp from the centre (safe circle {SAFE_RADIUS_DP} dp)")
    if radius > SAFE_RADIUS_DP:
        sys.exit(1)

    # The visible part of an adaptive icon is the middle 72 of 108 dp.
    inset = round(FRAME * 18 / 108)
    legacy = Image.new("RGBA", (FRAME, FRAME), CREAM + (255,))
    legacy.alpha_composite(canvas)
    legacy = legacy.crop((inset, inset, FRAME - inset, FRAME - inset))

    for name, scale in DENSITIES.items():
        folder = RES / f"mipmap-{name}"
        fg = round(108 * scale)
        canvas.resize((fg, fg), Image.LANCZOS).save(folder / "ic_launcher_foreground.png", optimize=True)
        side = round(48 * scale)
        square = legacy.resize((side, side), Image.LANCZOS)
        square.convert("RGB").save(folder / "ic_launcher.png", optimize=True)
        rounded = square.copy()
        rounded.putalpha(round_mask(side))
        rounded.save(folder / "ic_launcher_round.png", optimize=True)
        print(f"mipmap-{name}: foreground {fg}px, legacy {side}px")


if __name__ == "__main__":
    main()
