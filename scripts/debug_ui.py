"""Отладка: мобильное меню → переход, логин в админку."""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
with sync_playwright() as p:
    browser = p.chromium.launch()

    # 1. Мобильное меню → категория
    m = browser.new_page(viewport={"width": 390, "height": 844})
    m.goto(BASE + "/", wait_until="networkidle")
    m.locator('button[aria-label="Открыть меню"]').click()
    m.wait_for_timeout(400)
    links = m.locator('dialog.site-drawer a[href="/family/"]')
    print("ссылок /family/ в меню:", links.count())
    href = links.first.get_attribute("href")
    print("href:", href, "| visible:", links.first.is_visible())
    links.first.click()
    m.wait_for_timeout(1500)
    print("URL после клика:", m.url)
    print("h1:", m.locator("h1").first.inner_text() if m.locator("h1").count() else "нет")
    m.close()

    # 2. Логин в админку
    a = browser.new_page(viewport={"width": 1440, "height": 900})
    reqs = []
    a.on("response", lambda r: reqs.append((r.url, r.status)) if "/api/auth" in r.url else None)
    a.goto(BASE + "/admin/login/", wait_until="networkidle")
    inputs = a.locator("input")
    print("\nполей ввода:", inputs.count())
    for i in range(inputs.count()):
        print("  input", i, inputs.nth(i).get_attribute("name"), inputs.nth(i).get_attribute("type"), inputs.nth(i).get_attribute("id"))
    buttons = a.locator("button")
    for i in range(buttons.count()):
        print("  button", i, repr(buttons.nth(i).inner_text())[:50])
    a.locator('input[type="email"], input[name="email"]').first.fill("admin@example.com")
    a.locator('input[type="password"]').first.fill("ChangeMe2026!")
    a.locator('button[type="submit"]').first.click()
    a.wait_for_timeout(3000)
    print("URL после логина:", a.url)
    print("auth responses:", reqs)
    a.close()
    browser.close()
