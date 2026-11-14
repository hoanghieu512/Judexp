"""One-colour silhouettes of the D1 cyclo as Android VectorDrawables (spec
Watercolor §6.1, §6.2, §7 step 2): the monochrome layer of the launcher icon
and the notification icon. Android uses only their alpha.

Tracing the watercolour itself gives a blob: the paint, the spokes and the
paper inside the wheels all fight. So the silhouette is drawn by hand from
simple shapes measured on the source (master/icon-launcher-d1.webp, 1024 px):
canopy, struts, seat and body, footrest, three wheels as rings, the bicycle
frame and saddle. It is placed exactly like the coloured foreground
(export_android_icons.py), then potrace smooths it into curves.

Tuning is editing the shapes or the weights below and running again, from
the repo root:
  python3 docs/design/watercolor/tools/silhouette.py monochrome [--preview <dir>]
  python3 docs/design/watercolor/tools/silhouette.py notification [--preview <dir>]
--preview also writes the shapes over the source and potrace's own rendering.
"""
import argparse
import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

from export_android_icons import FRAME, SCALE, SOURCE

HERE = Path(__file__).resolve().parent
DRAWABLE = HERE.parents[3] / "android" / "app" / "src" / "main" / "res" / "drawable"

# Where cut() finds the cyclo in the source; the foreground is that box shrunk and centred.
BOX = (194, 244, 830, 820)

# Shapes in source pixels.
CANOPY = [(310, 292), (335, 270), (400, 254), (480, 249), (570, 253), (628, 276), (648, 312), (646, 402),
          (560, 400), (470, 330), (420, 322), (360, 338), (320, 345)]
BODY = [(345, 478), (440, 470), (450, 400), (630, 405), (640, 440), (655, 520), (660, 560), (600, 640),
        (560, 700), (500, 725), (450, 700), (360, 665), (345, 600), (345, 540)]
# At 24 dp the gap under the canopy is what says "cyclo", so the small icon
# gets a roof that stops short of the seat, held up by two thick struts.
ROOF = [(310, 292), (335, 270), (400, 254), (480, 249), (570, 253), (628, 276), (648, 312), (648, 345),
        (470, 338), (420, 326), (360, 340), (320, 345)]
ROOF_STRUTS = [((330, 335), (385, 478)), ((636, 340), (628, 420))]
FOOTREST = [(198, 628), (212, 622), (300, 640), (440, 690), (490, 700), (480, 728), (400, 725), (300, 705),
            (240, 690), (210, 660)]
STRUTS = [((335, 335), (390, 470)), ((378, 325), (410, 462))]
FRAME_BARS = [((655, 525), (705, 410)), ((705, 410), (755, 555)), ((640, 600), (755, 558)), ((660, 330), (665, 520))]
SADDLE = (668, 378, 752, 410)
# (centre x, centre y, radius x, radius y, rim, hub radius), back to front.
BACK_WHEEL = (322, 645, 40, 95, 12, 0)
NEAR_WHEEL = (590, 685, 90, 130, 16, 14)
BIKE_WHEEL = (755, 555, 65, 110, 12, 9)

TARGETS = {
    # 108 dp frame traced at 432 px, black: the system tints it.
    "monochrome": {"file": "ic_launcher_monochrome.xml", "dp": 108, "px": 432, "fill": "#FF000000",
                   "crop": False, "weight": 1.0, "small": False, "turd": 6},
    # 24 dp, cropped tight with 2 dp each side, traced at 96 px, white. Thicker
    # rims and bars, and the short roof: at 24 dp thin lines vanish.
    "notification": {"file": "ic_notification.xml", "dp": 24, "px": 96, "fill": "#FFFFFFFF",
                     "crop": True, "weight": 1.7, "small": True, "turd": 4},
}

SS = 4  # supersampling for smooth edges before tracing


def drawn(weight: float, small: bool) -> Image.Image:
    """The silhouette in source pixels: white is the cyclo."""
    big = Image.new("L", (FRAME * SS, FRAME * SS), 0)
    d = ImageDraw.Draw(big)

    def pts(points):
        return [(x * SS, y * SS) for x, y in points]

    def bar(a, b, width):
        w = width * weight * SS
        d.line(pts([a, b]), fill=255, width=round(w))
        for x, y in (a, b):
            d.ellipse((x * SS - w / 2, y * SS - w / 2, x * SS + w / 2, y * SS + w / 2), fill=255)

    def wheel(cx, cy, rx, ry, rim, hub):
        rim *= weight
        d.ellipse(((cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS), fill=255)
        d.ellipse(((cx - rx + rim) * SS, (cy - ry + rim) * SS, (cx + rx - rim) * SS, (cy + ry - rim) * SS), fill=0)
        if hub:
            h = hub * weight
            d.ellipse(((cx - h) * SS, (cy - h) * SS, (cx + h) * SS, (cy + h) * SS), fill=255)

    wheel(*BACK_WHEEL)
    d.polygon(pts(BODY), fill=255)
    d.polygon(pts(FOOTREST), fill=255)
    d.polygon(pts(ROOF if small else CANOPY), fill=255)
    for a, b in ROOF_STRUTS if small else STRUTS:
        bar(a, b, 9)
    # The near wheel is in front of the body, so its hole shows through it.
    wheel(*NEAR_WHEEL)
    wheel(*BIKE_WHEEL)
    for a, b in FRAME_BARS:
        bar(a, b, 9)
    d.ellipse(tuple(v * SS for v in SADDLE), fill=255)
    return big.resize((FRAME, FRAME), Image.LANCZOS)


def placed(mask: Image.Image) -> Image.Image:
    """The same shrink and centring as the coloured foreground."""
    part = mask.crop(BOX)
    part = part.resize((round(part.width * SCALE), round(part.height * SCALE)), Image.LANCZOS)
    canvas = Image.new("L", (FRAME, FRAME), 0)
    canvas.paste(part, ((FRAME - part.width) // 2, (FRAME - part.height) // 2))
    return canvas


def tight_square(mask: Image.Image, pad_share: float) -> Image.Image:
    left, top, right, bottom = mask.point(lambda v: 255 if v > 128 else 0).getbbox()
    side = round(max(right - left, bottom - top) / (1 - 2 * pad_share))
    cx, cy = (left + right) / 2, (top + bottom) / 2
    return mask.crop((round(cx - side / 2), round(cy - side / 2), round(cx + side / 2), round(cy + side / 2)))


def trace(mask: Image.Image, turd: int, preview: Path | None, name: str) -> tuple[str, str]:
    """potrace the mask (white is the cyclo); returns its path data and transform."""
    with tempfile.TemporaryDirectory() as tmp:
        pbm = Path(tmp) / "mask.pbm"
        # potrace traces black, so invert.
        Image.eval(mask, lambda v: 255 - v).point(lambda v: 255 if v > 128 else 0).convert("1").save(pbm)
        svg = Path(tmp) / "out.svg"
        args = ["potrace", str(pbm), "--flat", "-t", str(turd)]
        subprocess.run(args + ["-b", "svg", "-o", str(svg)], check=True)
        if preview:
            subprocess.run(args + ["-b", "pgm", "-x", "4", "-o", str(preview / f"{name}.pgm")], check=True)
        text = svg.read_text()
    transform = re.search(r'transform="([^"]+)"', text).group(1)
    data = " ".join(re.findall(r'<path d="([^"]+)"', text))
    return " ".join(data.split()), transform


def vector(target: dict, data: str, transform: str) -> str:
    tx, ty = map(float, re.search(r"translate\(([-\d.]+),([-\d.]+)\)", transform).groups())
    sx, sy = map(float, re.search(r"scale\(([-\d.]+),([-\d.]+)\)", transform).groups())
    px = target["px"]
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<!-- Generated by docs/design/watercolor/tools/silhouette.py: the D1 cyclo, drawn from simple shapes. -->\n"
        '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
        f'    android:width="{target["dp"]}dp"\n'
        f'    android:height="{target["dp"]}dp"\n'
        f'    android:viewportWidth="{px}"\n'
        f'    android:viewportHeight="{px}">\n'
        f'    <group android:translateX="{tx:g}" android:translateY="{ty:g}" android:scaleX="{sx:g}" android:scaleY="{sy:g}">\n'
        f'        <path android:fillColor="{target["fill"]}" android:pathData="{data}" />\n'
        "    </group>\n"
        "</vector>\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("target", choices=TARGETS)
    parser.add_argument("--preview", type=Path)
    opts = parser.parse_args()
    target = TARGETS[opts.target]

    shapes = drawn(target["weight"], target["small"])
    if opts.preview:
        opts.preview.mkdir(parents=True, exist_ok=True)
        over = Image.open(SOURCE).convert("RGBA")
        tint = Image.new("RGBA", over.size, (220, 0, 0, 0))
        tint.putalpha(shapes.point(lambda v: v * 110 // 255))
        over.alpha_composite(tint)
        over.crop(BOX).save(opts.preview / f"{opts.target}-over.png")

    mask = placed(shapes)
    if target["crop"]:
        mask = tight_square(mask, 2 / 24)
    mask = mask.resize((target["px"], target["px"]), Image.LANCZOS)
    data, transform = trace(mask, target["turd"], opts.preview, opts.target)
    out = DRAWABLE / target["file"]
    out.write_text(vector(target, data, transform))
    print(out.relative_to(DRAWABLE.parents[4]), len(data), "chars of path data")


if __name__ == "__main__":
    main()
