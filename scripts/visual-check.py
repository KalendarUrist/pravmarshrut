"""Визуальная проверка после доработок: 1440/768/390.
Скриншоты главной, каталога, страниц категорий и контактов + автопроверки:
- изображения категорий реально загрузились (naturalWidth > 0);
- нет горизонтальной прокрутки;
- email/«mailto:» нигде не видны в тексте страницы.
"""
import os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
OUT = "/home/z/my-project/download/visual-check"
os.makedirs(OUT, exist_ok=True)

EMAIL = "documentonline.direct@yandex.ru"
VIEWPORTS = [("desktop-1440", 1440, 900), ("tablet-768", 768, 1024), ("mobile-390", 390, 844)]
PAGES = [
    ("home", "/"),
    ("categories", "/categories/"),
    ("cat-family", "/family/"),
    ("cat-court", "/court/"),
    ("cat-realestate", "/real-estate/"),
    ("contacts", "/contacts/"),
]

results = []

def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("  ✓ " if cond else "  ✗ ") + name + (f" ({detail})" if detail and not cond else ""))

with sync_playwright() as p:
    browser = p.chromium.launch()
    for vname, w, h in VIEWPORTS:
        print(f"── {vname} ──")
        for pname, path in PAGES:
            page = browser.new_page(viewport={"width": w, "height": h})
            page.goto(BASE + path, wait_until="networkidle", timeout=45000)
            page.wait_for_timeout(400)

            # 1. Email не отображается
            body_text = page.inner_text("body")
            check(f"[{vname}] {path}: email не виден", EMAIL not in body_text)
            # 2. Нет mailto-ссылок
            mailtos = page.locator('a[href^="mailto:"]').count()
            check(f"[{vname}] {path}: нет mailto-ссылок", mailtos == 0, f"найдено {mailtos}")
            # 3. Нет горизонтальной прокрутки
            overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            check(f"[{vname}] {path}: без горизонт. прокрутки", overflow <= 1, f"перевес {overflow}px")
            # 4. Все картинки загрузились
            broken = page.evaluate("""
                [...document.querySelectorAll('img')].filter(i => i.src.includes('/media/') && (!i.complete || i.naturalWidth === 0)).length
            """)
            check(f"[{vname}] {path}: медиа-изображения загружены", broken == 0, f"сломано {broken}")

            ncat = page.evaluate("[...document.querySelectorAll('img[src*=\\'/media/\\'], img[srcset*=\\'/media/\\']')].length")
            print(f"      изображений /media/ на странице: {ncat}")

            page.screenshot(path=f"{OUT}/{pname}-{vname}.png", full_page=(pname in ("home", "contacts")))
            page.close()
    browser.close()

fails = [r for r in results if not r[1]]
print(f"\nИТОГО: {len(results) - len(fails)}/{len(results)} проверок пройдено")
if fails:
    for f in fails:
        print("  ✗", f[0], f[2])
