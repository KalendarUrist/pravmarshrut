"""Сканирование границ плиток и контейнера в референсе."""
from PIL import Image

SRC = "/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png"
img = Image.open(SRC).convert("RGB")
W, H = img.size

def runs_in_row(y, thresh=246):
    """Найти горизонтальные отрезки, где пиксель темнее фона (бордеры/текст)."""
    segs, start = [], None
    for x in range(W):
        p = img.getpixel((x, y))
        dark = p[0] < thresh and p[2] < thresh + 8
        if dark and start is None:
            start = x
        elif not dark and start is not None:
            segs.append((start, x - 1))
            start = None
    if start is not None:
        segs.append((start, W - 1))
    return segs

# Ряд 1 плиток: y≈ центр первой плитки. Найдём его: плитки начинаются после заголовка.
# Заголовок "Юридические вопросы" около y=493 (по кропу 460..770 при 1.6x: title на ~33*1.6+460≈513)
for y in [530, 545, 560, 575, 590, 610, 630, 650, 670, 690]:
    segs = [s for s in runs_in_row(y) if s[1] - s[0] >= 3]
    print(y, segs[:14])
