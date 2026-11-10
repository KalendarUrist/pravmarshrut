"""UI-проверки: страницы, мобильное меню, поиск, форма, админка, консоль.
Креды админа: ADMIN_EMAIL / ADMIN_PASSWORD (дефолт — локальная разработка)."""
import os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@pravmarshal.test")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "LocalDev2026!")
results = []

def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))

with sync_playwright() as p:
    browser = p.chromium.launch()

    # ── 1. Все публичные страницы: 200 + нет ошибок консоли ──────────────
    pages = ["/", "/articles/", "/categories/", "/about/", "/contacts/", "/search/",
             "/privacy/", "/consent/", "/terms/", "/family/",
             "/family/razvod-cherez-zags-i-sud/", "/nonexistent-page/"]
    for path in pages:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        resp = page.goto(BASE + path, wait_until="networkidle", timeout=45000)
        status = resp.status if resp else 0
        expected = 404 if path == "/nonexistent-page/" else 200
        check(f"{path} → {expected}", status == expected, f"получено {status}")
        if expected == 200:
            check(f"{path} без ошибок консоли", len(errors) == 0, "; ".join(errors[:3])[:200])
        else:
            real_errors = [e for e in errors if "404" not in e and "Failed to load resource" not in e]
            check(f"{path} без ошибок консоли (кроме самого 404)", len(real_errors) == 0, "; ".join(real_errors[:3])[:200])
        page.close()

    # ── 2. Мобильная навигация (390px) ───────────────────────────────────
    m = browser.new_page(viewport={"width": 390, "height": 844})
    m.goto(BASE + "/", wait_until="networkidle")
    burger = m.locator('button[aria-label="Открыть меню"]')
    check("Бургер виден на мобильном", burger.is_visible())
    burger.click()
    m.wait_for_timeout(400)
    drawer = m.locator("dialog.site-drawer")
    check("Меню открывается", drawer.is_visible())
    check("В меню есть категории", m.locator('dialog.site-drawer a[href="/family/"]').count() > 0)
    m.locator('dialog.site-drawer a[href="/family/"]').first.click()
    m.wait_for_url("**/family/**", timeout=15000)
    check("Ссылка категории из меню работает", "/family/" in m.url and m.locator("h1").first.is_visible())
    # мобильный поиск в шапке меню
    m.locator('button[aria-label="Открыть меню"]').click()
    m.locator("#mobile-search").fill("алименты")
    m.locator("#mobile-search").press("Enter")
    m.wait_for_load_state("networkidle")
    check("Мобильный поиск ведёт на /search/", "/search/" in m.url and "алименты" in m.content())
    m.close()

    # ── 3. Поиск с главной (десктоп) ─────────────────────────────────────
    d = browser.new_page(viewport={"width": 1440, "height": 900})
    d.goto(BASE + "/", wait_until="networkidle")
    d.locator("#home-search").fill("алименты")
    d.locator("#home-search").press("Enter")
    d.wait_for_load_state("networkidle")
    check("Поиск с главной работает", "/search/" in d.url)
    body = d.content()
    check("Результаты поиска показаны", "Найдено" in body)
    # поиск из навигации
    d.locator("#nav-search").fill("наследств")
    d.locator("#nav-search").press("Enter")
    d.wait_for_load_state("networkidle")
    check("Поиск из навигации работает", "/search/" in d.url and "наследств" in d.content())

    # ── 4. Выпадающее меню категорий в навигации ─────────────────────────
    d.goto(BASE + "/", wait_until="networkidle")
    d.locator('nav[aria-label="Основная навигация"] button:has-text("Юридические вопросы")').click()
    d.wait_for_timeout(300)
    check("Дропдаун категорий открывается", d.locator('a[href="/family/"]').count() > 1)

    # ── 5. Диалог «Задать вопрос» + форма обратной связи ─────────────────
    d.goto(BASE + "/", wait_until="networkidle")
    d.locator('button:has-text("Задать вопрос")').first.click()
    d.wait_for_timeout(400)
    modal = d.locator("dialog.site-modal[open]")
    check("Диалог обратной связи открывается", modal.is_visible())
    d.locator('dialog.site-modal[open] input[name="name"]').fill("Тест Юзеров")
    d.locator('dialog.site-modal[open] input[name="contact"]').fill("test@example.com")
    d.locator('dialog.site-modal[open] textarea[name="message"]').fill("Проверка формы после редизайна: прошу подсказать по алиментам.")
    d.locator('dialog.site-modal[open] button[type="submit"]').click()
    d.wait_for_timeout(2500)
    modal_text = modal.inner_text()
    check("Форма отправляется (успех/ошибка видно)", len(modal_text) > 0, modal_text[:120].replace("\n", " "))
    d.close()

    # ── 6. Админ-панель: логин, список статей, редактор, настройки ────────
    a = browser.new_page(viewport={"width": 1440, "height": 900})
    errs = []
    a.on("console", lambda msg: errs.append(msg.text) if msg.type == "error" else None)
    a.on("pageerror", lambda e: errs.append(str(e)))
    a.goto(BASE + "/admin/login/", wait_until="networkidle")
    a.locator('input[name="email"], input[type="email"], #email').first.fill("" + ADMIN_EMAIL + "")
    a.locator('input[type="password"]').first.fill("" + ADMIN_PASSWORD + "")
    a.locator('button[type="submit"]').first.click()
    a.wait_for_url("**/admin/", timeout=15000)
    check("Логин в админку", "/admin" in a.url and "/login" not in a.url, a.url)
    for admin_path in ["/admin/articles/", "/admin/articles/new/", "/admin/categories/", "/admin/media/", "/admin/settings/", "/admin/submissions/", "/admin/redirects/"]:
        a.goto(BASE + admin_path, wait_until="networkidle")
        h = a.locator("h1").first
        check(f"Админка {admin_path}", h.is_visible(), (h.inner_text() if h.count() else "нет h1")[:60])
    check("Админка без ошибок консоли", len(errs) == 0, "; ".join(errs[:3])[:200])
    a.close()

    browser.close()

print()
passed = sum(1 for _, ok, _ in results if ok)
for name, ok, detail in results:
    mark = "✓" if ok else "✗"
    line = f"{mark} {name}"
    if detail and not ok:
        line += f" — {detail}"
    print(line)
print(f"\nИТОГО: {passed}/{len(results)}")
