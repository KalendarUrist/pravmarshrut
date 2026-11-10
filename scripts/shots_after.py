"""Скриншоты после изменений: главная (1440/768/390), каталог категорий, страница категории.
Полные страницы + сохранение в download/ для отчёта."""
import pathlib
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
OUT = pathlib.Path("/home/z/my-project/download")
OUT.mkdir(exist_ok=True)

SHOTS = [
    ("after-home-desktop-1440", "/", 1440, 900),
    ("after-home-tablet-768", "/", 768, 1024),
    ("after-home-mobile-390", "/", 390, 844),
    ("after-categories-desktop-1440", "/categories/", 1440, 900),
    ("after-categories-tablet-768", "/categories/", 768, 1024),
    ("after-categories-mobile-390", "/categories/", 390, 844),
    ("after-category-family-desktop-1440", "/family/", 1440, 900),
    ("after-contacts-mobile-390", "/contacts/", 390, 844),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    for name, path, w, h in SHOTS:
        page = browser.new_page(viewport={"width": w, "height": h})
        page.goto(BASE + path, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(800)
        page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
        print(f"✓ {name}.png")
        page.close()
    browser.close()
print("Готово.")
