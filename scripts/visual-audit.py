"""Скриншоты трёх страниц на 1440/768/390 + проверка ошибок консоли и mailto-ссылок."""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
OUT = "/tmp/render"
PAGES = [("/", "home"), ("/family/", "category"), ("/contacts/", "contacts")]
VIEWPORTS = [("desktop-1440", 1440, 1000), ("tablet-768", 768, 1024), ("mobile-390", 390, 844)]

with sync_playwright() as p:
    browser = p.chromium.launch()
    total_issues = []
    for path, name in PAGES:
        for vp_name, w, h in VIEWPORTS:
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            errors = []
            page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            page.goto(BASE + path, wait_until="networkidle", timeout=45000)
            page.wait_for_timeout(600)
            page.screenshot(path=f"{OUT}/{name}-{vp_name}.png", full_page=True)
            # mailto кликабельность
            mailtos = page.eval_on_selector_all('a[href^="mailto:"]', "els => els.map(e => e.getAttribute('href') + ' | ' + e.textContent.trim().slice(0,50))")
            # ошибки консоли
            status = "OK" if not errors else f"ОШИБКИ: {errors[:3]}"
            print(f"{name} {vp_name}: h={page.evaluate('document.body.scrollHeight')}px, mailto={len(mailtos)}, {status}")
            for m in mailtos[:2]:
                print(f"    {m}")
            total_issues += [(name, vp_name, e) for e in errors]
            page.close()
    browser.close()
    print("\nИТОГ:", "все скриншоты без ошибок консоли" if not total_issues else f"{len(total_issues)} проблем")
    for n in total_issues[:10]:
        print("  ", n)
