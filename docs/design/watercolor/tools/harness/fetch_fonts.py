"""Download the Google Fonts the theme overrides use into public/, so headless Chromium needs no proxy."""
import pathlib, re, subprocess

HERE = pathlib.Path(__file__).resolve().parent
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
SETS = {
    "fonts": "family=Archivo+Black&family=Cormorant+Garamond:wght@500;600&family=Instrument+Serif:ital@0;1",
    "fonts2": "family=Be+Vietnam+Pro:wght@400;600;700&family=Fraunces:opsz,wght,SOFT@9..144,500..700,100&family=JetBrains+Mono:wght@500;700&family=Mali:wght@400;500&family=Nunito:wght@400;600;700;800&family=Playfair+Display:wght@500;600;700",
}
for folder, query in SETS.items():
    out = HERE / "public" / folder
    out.mkdir(parents=True, exist_ok=True)
    css = subprocess.run(["curl", "-sS", "-A", UA, f"https://fonts.googleapis.com/css2?{query}&display=block"], capture_output=True, text=True, check=True).stdout
    for i, url in enumerate(sorted(set(re.findall(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", css)))):
        name = f"f{i}.woff2"
        subprocess.run(["curl", "-sS", "-o", str(out / name), url], check=True)
        css = css.replace(url, f"/{folder}/{name}")
    (out / "fonts.css").write_text(css)
    print(folder, "ok")
