"""Кропы статейных блоков и шапки в высоком увеличении."""
from PIL import Image
import os

SRC = "/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png"
OUT = "/tmp/render/ref"
os.makedirs(OUT, exist_ok=True)
img = Image.open(SRC)

crops = {
    "zoom_latest": (560, 750, 1030, 1024),      # Последные публикации
    "zoom_featured": (50, 730, 560, 1024),      # Популярные материалы
    "zoom_header_left": (60, 5, 560, 90),       # Лого
    "zoom_header_right": (900, 5, 1536, 90),    # Соцсети + кнопка
    "zoom_nav_left": (70, 82, 780, 136),        # Навигация
    "zoom_nav_right": (1150, 82, 1536, 136),    # Поиск в навигации
    "zoom_hero_search": (70, 380, 720, 460),    # Поиск в hero
    "zoom_help_btns": (1050, 590, 1510, 760),   # Кнопки help-карточки
    "zoom_about": (1050, 760, 1510, 960),       # О проекте
}
for name, box in crops.items():
    c = img.crop(box)
    scale = 2.2 if "zoom" in name else 1.6
    c = c.resize((int(c.width * scale), int(c.height * scale)), Image.LANCZOS)
    c.save(f"{OUT}/{name}.png")
    print(name, c.size)
