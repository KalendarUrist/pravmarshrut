"""Полный текст ошибки гидратации в админке."""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
with sync_playwright() as p:
    browser = p.chromium.launch()
    a = browser.new_page(viewport={"width": 1440, "height": 900})
    msgs = []
    a.on("console", lambda m: msgs.append((m.type, m.text)) if m.type in ("error", "warning") else None)
    a.on("pageerror", lambda e: msgs.append(("pageerror", str(e))))
    a.goto(BASE + "/admin/login/", wait_until="networkidle")
    a.locator('input[type="email"]').first.fill("admin@example.com")
    a.locator('input[type="password"]').first.fill("ChangeMe2026!")
    a.locator('button[type="submit"]').first.click()
    a.wait_for_url("**/admin/", timeout=15000)
    a.wait_for_timeout(1500)

    for path in ["/admin/articles/", "/admin/articles/new/", "/admin/settings/", "/admin/media/", "/admin/categories/"]:
        a.goto(BASE + path, wait_until="networkidle")
        a.wait_for_timeout(1200)
        for t, txt in msgs:
            if "hydrat" in txt.lower() or "mismatch" in txt.lower():
                print(f"=== {path} [{t}] ===")
                print(txt[:1200])
                break
        msgs.clear()
    browser.close()
