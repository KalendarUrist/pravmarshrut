"""Выборка цветов внутри плиток, карточек, шапки, hero."""
from PIL import Image

SRC = "/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png"
img = Image.open(SRC).convert("RGB")

pts = {
    "tile1 fill (y560 x150)": (150, 560),
    "tile1 fill (y575 x230)": (230, 575),
    "gap between tiles (267,560)": (267, 560),
    "page bg between sections (760,470)": (760, 470),
    "below tiles (760,710)": (760, 710),
    "help card fill (1300,600)": (1300, 600),
    "help btn (1300,650)": (1300, 650),
    "about card fill (1300,880)": (1300, 880),
    "header bg (900,30)": (900, 30),
    "nav bg (600,105)": (600, 105),
    "nav active pill (128,105)": (128, 105),
    "nav search (1330,105)": (1330, 105),
    "hero left bg (200,250)": (200, 250),
    "hero mid bg (740,180)": (740, 180),
    "hero H1 color (95,190)": (95, 190),
    "find btn (700,432)": (700, 432),
    "hero img top (1200,150)": (1200, 150),
    "featured card area (300,900)": (300, 900),
    "featured img (300,830)": (300, 830),
}
for k, v in pts.items():
    print(k, img.getpixel(v))

# Вертикальный скан левого края плиток (x=100), y от 500 до 720 — границы ряда
print("\nvertical scan x=100, y=500..720")
prev = None
for y in range(500, 720):
    p = img.getpixel((100, y))
    light = p[0] > 249 and p[1] > 249
    if light != prev:
        print(y, p, "LIGHT" if light else "fill")
        prev = light
