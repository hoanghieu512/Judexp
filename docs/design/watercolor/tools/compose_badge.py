"""Seat the whole round badge on a large faded cyclo, on a white tile."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

badge_path, cyclo_path, out_path = sys.argv[1:4]
bx, by, bd, s, dx, dy = (float(v) for v in sys.argv[4:10])
W = 1024

# Faded cyclo on white: paper to white, then the approved fade (42 percent, saturation 0.55, slight blur).
cy = Image.open(cyclo_path).convert("RGB")
cs = int(W * s)
c = np.asarray(cy.resize((cs, cs), Image.LANCZOS)).astype(np.float32)
cb = np.concatenate([c[:12].reshape(-1, 3), c[-12:].reshape(-1, 3), c[:, :12].reshape(-1, 3), c[:, -12:].reshape(-1, 3)])
c = np.clip(c / np.median(cb, axis=0), 0, 1)
gray = (0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2])[..., None]
c = gray + 0.55 * (c - gray)
f = 1 - 0.42 * (1 - c)
layer = np.ones((W, W, 3), np.float32)
ox, oy = int((W - cs) / 2 + dx * W), int((W - cs) / 2 + dy * W)
x0, y0, x1, y1 = max(ox, 0), max(oy, 0), min(ox + cs, W), min(oy + cs, W)
layer[y0:y1, x0:x1] = f[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
layer = np.asarray(Image.fromarray((layer * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32)

# Badge: everything not connected to the white border is the badge.
b = Image.open(badge_path).convert("RGB")
ba = np.asarray(b).astype(np.float32)
whiteish = np.sqrt(((ba - 255) ** 2).sum(axis=2)) < 16
m = Image.fromarray((whiteish * 255).astype(np.uint8), "L").copy()
bw, bh = b.size
for i in range(0, bw, 16):
    for xy in ((i, 0), (i, bh - 1), (0, min(i, bh - 1)), (bw - 1, min(i, bh - 1))):
        if m.getpixel(xy) == 255:
            ImageDraw.floodfill(m, xy, 128, thresh=0)
inside = (np.asarray(m) != 128)
ys, xs = np.where(inside)
box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
mask = Image.fromarray((inside * 255).astype(np.uint8)).crop(box)
crop = b.crop(box)
target = int(bd * W)
scale = target / max(crop.size)
size = (int(crop.size[0] * scale), int(crop.size[1] * scale))
crop = crop.resize(size, Image.LANCZOS)
mask = mask.resize(size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.5))

out = Image.fromarray(np.clip(layer, 0, 255).astype(np.uint8))
out.paste(crop, (int(bx * W - size[0] / 2), int(by * W - size[1] / 2)), mask)
out.save(out_path)
print("badge box", box, "->", size)
