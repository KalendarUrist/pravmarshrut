"""Точный анализ макета: границы, цвета, ширины."""
from PIL import Image

SRC = "/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png"
img = Image.open(SRC).convert("RGB")
W, H = img.size

# Проверка краёв — есть ли тёмные поля
for pt in [(2,2),(W-3,2),(2,H-3),(W-3,H-3),(W//2,2),(W//2,H-3),(2,H//2),(W-3,H//2)]:
    print("edge", pt, img.getpixel(pt))

# Горизонтальный срез на уровне плиток категорий (y=585 примерно центр ряда 1)
def scan_row(y, x0=0, x1=None, step=1):
    x1 = x1 or W
    runs = []
    prev = None
    for x in range(x0, x1, step):
        p = img.getpixel((x, y))
        is_white = p[0] > 248 and p[1] > 248 and p[2] > 248
        is_border = 200 < p[0] < 245 and 200 < p[1] < 245
        kind = 'W' if is_white else ('B' if is_border else '?')
        if kind != prev:
            runs.append((x, kind, p))
            prev = kind
    return runs

# цвет фона страницы между секциями
print("bg samples:")
for y in [455, 460, 465, 760, 770]:
    print(y, img.getpixel((760, y)))
