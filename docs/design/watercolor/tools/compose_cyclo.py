"""Put a faded front-view cyclo behind the G5 icon's sign, keeping every foreground stroke of G5."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

icon_path, cyclo_path, out_path = sys.argv[1:4]
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
dx = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0
dy = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0
W = 1024

icon = Image.open(icon_path).convert("RGB").resize((W, W), Image.LANCZOS)
a = np.asarray(icon).astype(np.float32)

# Background-like pixels: close to the paper colour sampled on the border, and not saturated.
border = np.concatenate([a[:16].reshape(-1, 3), a[-16:].reshape(-1, 3), a[:, :16].reshape(-1, 3), a[:, -16:].reshape(-1, 3)])
paper = np.median(border, axis=0)
dist = np.sqrt(((a - paper) ** 2).sum(axis=2))
sat = a.max(axis=2) - a.min(axis=2)
bg_like = (dist < 34) & (sat < 70)
m = Image.fromarray((bg_like * 255).astype(np.uint8), "L").copy()
# Background is whatever paper-like region touches the border; enclosed paper (a cream leg shield) stays foreground.
for i in range(0, W, 32):
    for xy in ((i, 0), (i, W - 1), (0, i), (W - 1, i)):
        if m.getpixel(xy) == 255:
            ImageDraw.floodfill(m, xy, 128, thresh=0)
fg = (np.asarray(m) != 128).astype(np.uint8) * 255
# Nothing of the icon lives in the top band (the cart roof starts lower): paper specks there are noise.
fg[: int(0.17 * W)] = 0
fgm = Image.fromarray(fg, "L").filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.6))
alpha = np.asarray(fgm).astype(np.float32)[..., None] / 255.0

# Cyclo: paper to white, then the fade approved on the moodboard (42 percent, saturation 0.55, slight blur).
cy = Image.open(cyclo_path).convert("RGB")
cs = int(W * scale)
cy = cy.resize((cs, cs), Image.LANCZOS)
c = np.asarray(cy).astype(np.float32)
cb = np.concatenate([c[:12].reshape(-1, 3), c[-12:].reshape(-1, 3), c[:, :12].reshape(-1, 3), c[:, -12:].reshape(-1, 3)])
cpaper = np.median(cb, axis=0)
c = np.clip(c / cpaper, 0, 1)
gray = (0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2])[..., None]
c = gray + 0.55 * (c - gray)
f = 1 - 0.42 * (1 - c)
layer = np.ones((W, W, 3), np.float32)
ox = int((W - cs) / 2 + dx * W)
oy = int((W - cs) / 2 + dy * W)
x0, y0 = max(ox, 0), max(oy, 0)
x1, y1 = min(ox + cs, W), min(oy + cs, W)
layer[y0:y1, x0:x1] = f[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
layer_img = Image.fromarray((layer * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
layer = np.asarray(layer_img).astype(np.float32) / 255.0

out = alpha * a + (1 - alpha) * (a * layer)
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(out_path)
Image.fromarray(fg).save(out_path.replace(".png", "-mask.png"))
print("paper", paper.round(), "fg share", round(fg.mean() / 255, 3))
