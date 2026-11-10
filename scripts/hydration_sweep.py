"""Серия повторных загрузок ключевых маршрутов: поиск ошибок гидратации (#418/#423/#425).

Запуск: bun/scripts — python3 scripts/hydration_sweep.py
Админ: ADMIN_EMAIL / ADMIN_PASSWORD из окружения либо дефолт локальной разработки.
"""
import os
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@pravmarshal.test")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "LocalDev2026!")
ATTEMPTS = int(sys.argv[1]) if len(sys.argv) > 1 else 4

PUBLIC = ["/", "/articles/", "/family/", "/family/kak-vzyskat-alimenty-na-rebenka/",
          "/categories/", "/search/?q=алименты", "/about/", "/contacts/", "/privacy/", "/consent/", "/terms/"]
ADMIN = ["/admin/", "/admin/articles/", "/admin/articles/new/", "/admin/categories/",
         "/admin/media/", "/admin/settings/", "/admin/submissions/", "/admin/redirects/"]

issues = []

with sync_playwright() as p:
    browser = p.chromium.launch()

    # Логин в админку один раз — куки для последующих контекстов
    ctx0 = browser.new_context(viewport={"width": 1440, "height": 900})
    page0 = ctx0.new_page()
    page0.goto(BASE + "/admin/login/", wait_until="networkidle")
    page0.locator('input[type="email"]').first.fill(ADMIN_EMAIL)
    page0.locator('input[type="password"]').first.fill(ADMIN_PASSWORD)
    page0.locator('button[type="submit"]').first.click()
    try:
        page0.wait_for_url("**/admin/**", timeout=15000)
        print("admin login: ok")
    except Exception:
        print("admin login: FAILED — админ-маршруты проверяются без авторизации")
    cookies = ctx0.cookies()
    ctx0.close()

    def check(path, attempt, auth=False):
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        if auth:
            ctx.add_cookies(cookies)
        pg = ctx.new_page()
        errs = []
        pg.on("console", lambda m: errs.append(("console", m.text)) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errs.append(("pageerror", str(e))))
        try:
            pg.goto(BASE + path, wait_until="networkidle", timeout=30000)
            pg.wait_for_timeout(800)
        except Exception as e:
            errs.append(("goto", str(e)))
        ctx.close()
        errs = [e for e in errs if "Failed to load resource" not in e[1]]
        for kind, text in errs:
            low = text.lower()
            if "hydrat" in low or "mismatch" in low or "418" in low or "did not match" in low:
                issues.append((attempt, path, kind, text))
                print(f"[{attempt}] HYDRATION {path} [{kind}]: {text[:400]}")
        return len(errs)

    for attempt in range(1, ATTEMPTS + 1):
        total = 0
        for path in PUBLIC:
            total += check(path, attempt)
        for path in ADMIN:
            total += check(path, attempt, auth=True)
        print(f"attempt {attempt}: done, errors={total}")

    browser.close()

print(f"\nИТОГ: ошибок гидратации: {len(issues)}")
for a, path, kind, text in issues[:10]:
    print(f"  [{a}] {path} {kind}: {text[:300]}")
