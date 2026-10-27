"""Cut a subject out of a plain paper background: paper connected to the border becomes transparent."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, out, thr = sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 30
im = Image.open(src).convert("RGB")
a = np.asarray(im).astype(np.float32)
h, w = a.shape[:2]
border = np.concatenate([a[:10].reshape(-1, 3), a[-10:].reshape(-1, 3), a[:, :10].reshape(-1, 3), a[:, -10:].reshape(-1, 3)])
paper = np.median(border, axis=0)
dist = np.sqrt(((a - paper) ** 2).sum(axis=2))
sat = a.max(axis=2) - a.min(axis=2)
m = Image.fromarray((((dist < thr) & (sat < 75)) * 255).astype(np.uint8), "L").copy()
for i in range(0, max(w, h), 12):
    for xy in ((min(i, w - 1), 0), (min(i, w - 1), h - 1), (0, min(i, h - 1)), (w - 1, min(i, h - 1))):
        if m.getpixel(xy) == 255:
            ImageDraw.floodfill(m, xy, 128, thresh=0)
fg = (np.asarray(m) != 128).astype(np.uint8) * 255
alpha = Image.fromarray(fg, "L").filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
rgba = im.copy()
rgba.putalpha(alpha)
box = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
rgba = rgba.crop(box)
rgba.save(out)
print(out, "box", box, "paper", paper.round())
