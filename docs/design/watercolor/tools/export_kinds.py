"""The four kind icons for the app, cut from the K1 sheet (spec Watercolor §7, step 1).

The sheet is a 2 x 2 grid: driver top left, restaurant top right, dish bottom
left, place bottom right. Each icon is cut from its paper, padded to a centred
transparent square and written at 2x and 3x of 22, 28 and 32 dp.

Run from the repo root: python3 docs/design/watercolor/tools/export_kinds.py
"""
from pathlib import Path

from PIL import Image

from cutout import cut

HERE = Path(__file__).resolve().parent
SHEET = HERE.parent / "master" / "kinds-k1.webp"
OUT = HERE.parents[3] / "src" / "assets" / "kinds"
KINDS = {"driver": (0, 0), "restaurant": (1, 0), "dish": (0, 1), "place": (1, 1)}
SIZES = sorted({dp * scale for dp in (22, 28, 32) for scale in (2, 3)})


def square(im: Image.Image) -> Image.Image:
    side = max(im.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    return canvas


def main() -> None:
    sheet = Image.open(SHEET).convert("RGB")
    half = sheet.width // 2
    OUT.mkdir(parents=True, exist_ok=True)
    for kind, (col, row) in KINDS.items():
        cell = sheet.crop((col * half, row * half, (col + 1) * half, (row + 1) * half))
        icon = square(cut(cell))
        for px in SIZES:
            path = OUT / f"{kind}-{px}.webp"
            icon.resize((px, px), Image.LANCZOS).save(path, "WEBP", quality=90, method=6)
            print(path.relative_to(OUT.parents[1]), path.stat().st_size)


if __name__ == "__main__":
    main()
