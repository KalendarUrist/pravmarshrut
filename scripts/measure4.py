from PIL import Image

im = Image.open("/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png").convert("RGB")
W,H = im.size; px = im.load()

# Сэмплируем строки y=520..640 в диапазоне x=50..700 с шагом, печатаем смену цветов
def classify(c):
    r,g,b = c
    if r>251 and g>251 and b>251: return "WHITE"
    if 235<=r<=250 and 240<=g<=252 and 244<=b<=255: return "TILE"
    if r<120 and g<120: return "DARK"
    return f"({r},{g},{b})"

for y in [470, 490, 510, 530, 550, 570, 590, 610, 620, 640, 660]:
    row = []
    prev = None; start = 0
    for x in range(40, 1000, 2):
        cl = classify(px[x,y])
        if cl != prev:
            if prev is not None and x-start > 8: row.append(f"{prev}:{start}-{x}")
            prev = cl; start = x
    if prev and 1000-start > 8: row.append(f"{prev}:{start}-1000")
    print(f"y={y}: ", " | ".join(row[:10]))
