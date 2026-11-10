"""Пиксельные измерения: макет vs текущая реализация."""
from PIL import Image
import sys

def analyze(path, label, scale_note=""):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    print(f"\n=== {label} ({W}x{H}) {scale_note} ===")
    px = im.load()

    # 1. Найти тёмно-синюю навигационную полосу (строки, где в центре много тёмных пикселей)
    def is_navy(c): r,g,b = c; return r<50 and g<60 and b<90 and b>40
    navy_rows = []
    for y in range(min(H, 900)):
        cnt = sum(1 for x in range(0, W, 8) if is_navy(px[x,y]))
        if cnt > (W//8)*0.5: navy_rows.append(y)
    if navy_rows:
        # первая непрерывная полоса
        bands = []
        start = navy_rows[0]; prev = navy_rows[0]
        for y in navy_rows[1:]:
            if y - prev > 3:
                bands.append((start, prev)); start = y
            prev = y
        bands.append((start, prev))
        print("navy bands (y0-y1, h):", [(a, b, b-a+1) for a,b in bands[:4]])

    # 2. Цвет фона hero (справа от центра, выше категорий)
    for y in [180, 260, 340]:
        if y < H:
            print(f"hero bg y={y}: x={int(W*0.55)} {px[int(W*0.55), y]}, x={int(W*0.35)} {px[int(W*0.35), y]}")

    # 3. Левый край контента (первый не-белый пиксель в строке заголовка категорий)
    # ищем строку с крупным тёмным текстом после hero
    # проверим отступы: для нескольких y найти min x, где пиксель темнее 150
    def left_edge(y):
        for x in range(0, W//3):
            r,g,b = px[x,y]
            if r<120 and g<120 and b<140: return x
        return None
    # ищем первые 8 строк с текстом после y=400 (или после hero band)
    hero_end = navy_rows[0] if navy_rows else 100
    return im

# Макет
analyze("/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png", "МАКЕТ (upload)")
# Текущий сайт
analyze("/tmp/render/before-desktop-full.png", "ТЕКУЩИЙ САЙТ desktop")
