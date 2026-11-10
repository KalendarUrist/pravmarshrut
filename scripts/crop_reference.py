"""Кропы референсного макета по блокам для детального сравнения."""
from PIL import Image
import os

SRC = "/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png"
OUT = "/tmp/render/ref"
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC)
W, H = img.size
print("size:", W, H)

# Полные пропорции страницы
regions = {
    "header": (0, 0, W, 135),
    "hero": (0, 120, W, 470),
    "categories_sidebar": (0, 460, W, 770),
    "articles_sidebar": (0, 720, W, H),
}
for name, box in regions.items():
    crop = img.crop(box)
    # Увеличим в 1.6x для читаемости
    crop = crop.resize((int(crop.width * 1.6), int(crop.height * 1.6)), Image.LANCZOS)
    crop.save(f"{OUT}/{name}.png")
    print(name, "->", crop.size)

# Измерительные кропы: цвета ключевых точек
px = img.convert("RGB")
def c(x, y, label):
    print(label, px.getpixel((x, y)))

c(30, 60, "header bg")
c(400, 105, "nav bg")
c(150, 105, "nav active bg")
c(1300, 105, "nav search bg")
c(100, 300, "hero bg left")
c(700, 200, "hero bg mid")
c(100, 500, "page bg")
c(200, 570, "tile bg")
c(1300, 540, "help card bg")
c(1300, 900, "about card bg")
c(300, 850, "article card bg")
