"""Систематический поиск страницы с ошибкой гидратации в production."""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

with sync_playwright() as p:
    browser = p.chromium.launch()
    # Логинимся один раз, сохраняем cookie
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(BASE + "/admin/login/", wait_until="networkidle")
    page.locator('input[type="email"]').first.fill("admin@example.com")
    page.locator('input[type="password"]').first.fill("ChangeMe2026!")
    page.locator('button[type="submit"]').first.click()
    page.wait_for_url("**/admin/", timeout=15000)
    cookies = ctx.cookies()

    targets = ["/", "/family/", "/family/razvod-cherez-zags-i-sud/", "/articles/",
               "/admin/", "/admin/articles/", "/admin/categories/", "/admin/media/",
               "/admin/settings/", "/admin/submissions/", "/admin/redirects/",
               "/admin/articles/new/", "/admin/login/", "/contacts/", "/about/", "/search/"]

    for attempt in range(2):
        for path in targets:
            ctx2 = browser.new_context(viewport={"width": 1440, "height": 900})
            ctx2.add_cookies(cookies)
            pg = ctx2.new_page()
            errs = []
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            pg.on("pageerror", lambda e: errs.append(str(e)))
            try:
                pg.goto(BASE + path, wait_until="networkidle", timeout=30000)
                pg.wait_for_timeout(900)
            except Exception as e:
                errs.append(f"goto failed: {e}")
            errs = [e for e in errs if "Failed to load resource" not in e]
            if errs:
                print(f"[{attempt}] {path}: {len(errs)} ошибок")
                for e in errs[:3]:
                    print("   ", e[:300])
            ctx2.close()
    browser.close()
print("done")
