"""Скриншоты внутренних страниц (production)."""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
SHOTS = [
    ("/family/", "page-category", 1440),
    ("/family/razvod-cherez-zags-i-sud/", "page-article", 1440),
    ("/contacts/", "page-contacts", 1440),
    ("/search/?q=алименты", "page-search", 1440),
]
with sync_playwright() as p:
    browser = p.chromium.launch()
    for path, name, w in SHOTS:
        page = browser.new_page(viewport={"width": w, "height": 900})
        page.goto(BASE + path, wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(500)
        page.screenshot(path=f"/tmp/render/{name}.png", full_page=False)
        page.close()
    browser.close()
print("done")
