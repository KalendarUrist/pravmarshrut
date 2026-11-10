"""Медианные цвета областей + сканы границ (надёжно)."""
from PIL import Image
import statistics

SRC = "/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png"
img = Image.open(SRC).convert("RGB")
W, H = img.size

def median_region(x0, y0, x1, y1, label):
    rs, gs, bs = [], [], []
    for y in range(y0, y1, 2):
        for x in range(x0, x1, 2):
            r, g, b = img.getpixel((x, y))
            rs.append(r); gs.append(g); bs.append(b)
    print(f"{label}: rgb({int(statistics.median(rs))}, {int(statistics.median(gs))}, {int(statistics.median(bs))})  n={len(rs)}")

median_region(1100, 490, 1460, 530, "help card upper")
median_region(1100, 560, 1460, 590, "help card desc zone")
median_region(1100, 800, 1460, 830, "about card upper")
median_region(272, 535, 450, 585, "tile2 fill")
median_region(700, 460, 800, 472, "page bg gap")
median_region(400, 20, 900, 80, "header band")
median_region(300, 88, 900, 125, "nav band")
median_region(100, 150, 640, 420, "hero left zone")
median_region(1250, 95, 1380, 115, "nav search pill")

# Вертикальные границы навбара по колонке x=400 (там нет текста?)
def col_scan(x, y0, y1, label):
    print(f"col scan {label} x={x}")
    prev = None
    for y in range(y0, y1):
        r, g, b = img.getpixel((x, y))
        navy = b > r + 20 and r < 120
        if navy != prev:
            print("  y=", y, (r, g, b), "NAVY" if navy else "other")
            prev = navy

col_scan(430, 60, 140, "nav band vertical")

# Где заканчивается hero по вертикали (x=30, левый край, фон hero светлый vs белый)
def col_scan2(x, y0, y1):
    prev = None
    for y in range(y0, y1):
        r, g, b = img.getpixel((x, y))
        grayish = r < 250
        if grayish != prev:
            print("  y=", y, (r, g, b), "heroish" if grayish else "white")
            prev = grayish

col_scan2(20, 125, 500)

# Правый край hero-фото: скан строки y=300 от x=1400 до 1535
print("hero right edge scan y=300:")
for x in [1420, 1440, 1460, 1480, 1500, 1520, 1530, 1535]:
    print("  x=", x, img.getpixel((x, 300)))

# Левый край hero-фото (где заканчивается светлый фон и начинается фото) по y=300
print("photo left edge y=300:")
for x in [640, 660, 680, 700, 720, 740, 760]:
    print("  x=", x, img.getpixel((x, 300)))
