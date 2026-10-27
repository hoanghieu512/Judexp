"""Generate one image via OpenRouter (auth header is injected by the proxy)."""
import base64, json, subprocess, sys, pathlib

def gen(name, prompt, out_dir, model="google/gemini-3-pro-image", refs=()):
    content = prompt
    if refs:
        content = [{"type": "text", "text": prompt}]
        for ref in refs:
            b64 = base64.b64encode(pathlib.Path(ref).read_bytes()).decode()
            content.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}})
    body = {
        "model": model,
        "messages": [{"role": "user", "content": content}],
        "modalities": ["image", "text"],
        "image_config": {"aspect_ratio": "1:1"},
        "usage": {"include": True},
    }
    req = pathlib.Path(out_dir) / f".req-{name}.json"
    req.write_text(json.dumps(body))
    r = subprocess.run(
        ["curl", "-sS", "--max-time", "300", "https://openrouter.ai/api/v1/chat/completions",
         "-H", "Content-Type: application/json", "--data-binary", f"@{req}"],
        capture_output=True, text=True)
    req.unlink()
    try:
        d = json.loads(r.stdout)
    except Exception:
        print(name, "BAD RESPONSE", r.stdout[:300], r.stderr[:300]); return None
    if "error" in d:
        print(name, "ERROR", d["error"]); return None
    msg = d["choices"][0]["message"]
    imgs = msg.get("images") or []
    cost = (d.get("usage") or {}).get("cost")
    saved = []
    for i, im in enumerate(imgs):
        url = im["image_url"]["url"]
        b64 = url.split(",", 1)[1]
        p = pathlib.Path(out_dir) / (f"{name}.png" if i == 0 else f"{name}-{i}.png")
        p.write_bytes(base64.b64decode(b64)); saved.append(str(p))
    print(name, "cost", cost, "images", saved, "text:", (msg.get("content") or "")[:120].replace("\n", " "))
    return cost

if __name__ == "__main__":
    jobs = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    only = set(sys.argv[3:])
    total = 0
    for j in jobs:
        if only and j["name"] not in only: continue
        c = gen(j["name"], j["prompt"], out, j.get("model", "google/gemini-3-pro-image"), j.get("refs", ()))
        total += c or 0
    print("TOTAL", round(total, 4))
