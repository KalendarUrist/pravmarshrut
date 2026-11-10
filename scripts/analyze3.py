"""Финальные измерения: края карточек, шапка, hero, статьи."""
from PIL import Image

SRC = "/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png"
img = Image.open(SRC).convert("RGB")
W, H = img.size

def row_scan(y, x0, x1, test, label):
    print(label, f"y={y}")
    prev = None
    for x in range(x0, x1):
        p = img.getpixel((x, y))
        v = test(p)
        if v != prev:
            print("  x=", x, p, v)
            prev = v

is_light_fill = lambda p: 228 <= p[0] <= 248 and 232 <= p[1] <= 250 and p[2] >= 240
is_navy = lambda p: p[2] > p[0] + 18 and p[0] < 110
is_photo = lambda p: abs(p[0]-p[1]) < 30 and (p[0] < 225 or p[2] < 235) and not (p[0] > 240 and p[1] > 240)

# Правый край help-карточки
row_scan(500, 1400, 1536, is_light_fill, "help card right edge")
# Левый край help-карточки
row_scan(500, 1030, 1100, is_light_fill, "help card left edge")
# CTA кнопка в шапке
row_scan(45, 1150, 1536, is_navy, "header CTA")
# Featured card: изображение тёмное
row_scan(850, 40, 1100, lambda p: sum(p) < 600, "featured/latest dark content")
# Featured card fill (текстовая часть) y=990
row_scan(990, 40, 600, is_light_fill, "featured card text zone")
# Hero photo left edge по y=200 и y=400
row_scan(200, 620, 800, is_photo, "photo edge y200")
# Низ hero-фото
def col_scan(x, y0, y1, test, label):
    print(label, f"x={x}")
    prev = None
    for y in range(y0, y1):
        p = img.getpixel((x, y))
        v = test(p)
        if v != prev:
            print("  y=", y, p, v)
            prev = v
col_scan(1450, 400, 480, lambda p: sum(p) < 700, "hero photo bottom right")
col_scan(760, 130, 470, lambda p: 200 < p[0] < 245 and p[2] > 225, "hero band left bottom")
