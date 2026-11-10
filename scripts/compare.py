"""Сравнение бок о бок: макет (1536→1440) против текущего сайта (1440)."""
from PIL import Image

mock = Image.open("/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png").convert("RGB")
mock = mock.resize((1440, int(mock.height * 1440 / mock.width)), Image.LANCZOS)  # 1536->1440

cur = Image.open("/tmp/render/v3-desktop-fold.png").convert("RGB") if __import__('os').path.exists("/tmp/render/v3-desktop-fold.png") else Image.open("/tmp/render/v2-desktop-fold.png").convert("RGB")

# Сопоставимые зоны: шапка+nav+hero (в макете ~455px при 1536 → 427 при 1440)
mh = mock.crop((0, 0, 1440, 427))
ch = cur.crop((0, 0, 1440, 427))

gap = 12
combo = Image.new("RGB", (1440, 427 * 2 + gap), (255, 0, 0))
combo.paste(mh, (0, 0))
combo.paste(ch, (0, 427 + gap))
combo.save("/tmp/render/compare-hero.png")
print("saved compare-hero.png")

# Зона категорий: макет y 430..700 (при 1440), текущая — ищем по скриншоту
mc = mock.crop((0, 427, 1440, 700))
cc = cur.crop((0, 380, 1440, 653))
combo2 = Image.new("RGB", (1440, 273 * 2 + gap), (255, 0, 0))
combo2.paste(mc, (0, 0))
combo2.paste(cc, (0, 273 + gap))
combo2.save("/tmp/render/compare-categories.png")
print("saved compare-categories.png")
