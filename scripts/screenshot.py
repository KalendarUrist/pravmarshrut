"""Скриншоты сайта: десктоп 1440 и мобильный 390."""
import sys
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000/"
prefix = sys.argv[2] if len(sys.argv) > 2 else "current"
outdir = "/tmp/render"

with sync_playwright() as p:
    browser = p.chromium.launch()
    for name, w, h in [("desktop", 1440, 1000), ("mobile", 390, 844)]:
        page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        errors = []
        page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.goto(url, wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(700)
        page.screenshot(path=f"{outdir}/{prefix}-{name}-full.png", full_page=True)
        page.screenshot(path=f"{outdir}/{prefix}-{name}-fold.png", full_page=False)
        print(f"{name}: full={page.evaluate('document.body.scrollHeight')}px, console issues: {len(errors)}")
        for e in errors[:8]:
            print("  ", e[:160])
        page.close()
    browser.close()
print("done")
