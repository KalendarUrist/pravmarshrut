from PIL import Image

im = Image.open("/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png").convert("RGB")
W,H = im.size; px = im.load()

def is_navy(c): r,g,b=c; return r<55 and g<65 and 40<b<100
def is_accent(c): r,g,b=c; return 232<=r<=246 and 238<=g<=250 and 243<=b<=255

# 1. Header кнопка: скан справа налево по y=40
for x in range(W-1, W-200, -1):
    if is_navy(px[x,40]):
        print(f"header button right edge: x={x} ({round(x/W*100)}%)")
        break
# левый край кнопки
xs = [x for x in range(1100, W) if is_navy(px[x,40])]
print(f"header button: x {xs[0]}-{xs[-1]} (w={xs[-1]-xs[0]+1})")

# 2. Сайдбар-карточка: края по нескольким строкам
for y in [520, 600, 700, 800, 900]:
    xs = [x for x in range(1000, W) if is_accent(px[x,y])]
    if xs: print(f"accent card y={y}: x {xs[0]}-{xs[-1]} (w={xs[-1]-xs[0]+1})")

# 3. Вторая карточка «О проекте» (bg secondary #f2f5f9?)
def is_secondary(c): r,g,b=c; return 238<=r<=250 and 242<=g<=252 and 246<=b<=255
for y in [850, 900, 950]:
    xs = [x for x in range(1000, W) if is_secondary(px[x,y])]
    if xs: print(f"secondary card y={y}: x {xs[0]}-{xs[-1]} (w={xs[-1]-xs[0]+1})")

# 4. Цвета плиток и hero
print("tile1 fill:", px[160,560], px[350,560], px[550,560])
print("hero bg left:", px[50,200], px[50,300], px[400,420])
print("hero bg mid:", px[600,160], px[700,300])
print("page bg:", px[30,500], px[800,470], px[30,1000])
print("navy nav:", px[700,105], px[1200,110])
print("footer? none in frame")

# 5. Популярные материалы: заголовок и большая карточка
def dark_in_row(y, x0, x1, thr=130):
    return [x for x in range(x0, x1, 2) if sum(px[x,y])/3 < thr]
for y in range(700, 790):
    xs = dark_in_row(y, 80, 500)
    if len(xs) > 5:
        print(f"«Популярные материалы» title: y={y}, x {xs[0]}-{xs[-1]}")
        break
# Большая карточка: белый фон с рамкой — ищем границы рамки (светло-серые)
def is_border(c): r,g,b=c; return 200<=r<=235 and 208<=g<=240 and 215<=b<=245
for y in [800, 850]:
    xs = [x for x in range(60, 620) if is_border(px[x,y])]
    if xs: print(f"featured card border y={y}: left {xs[0]}, right {xs[-1]}")

# 6. Последние публикации: миниатюры (фото) — позиции
for y in [790, 830]:
    xs = [x for x in range(600, 1050) if sum(px[x,y])/3 < 180 and abs(px[x,y][0]-px[x,y][2])>8]
    if xs: print(f"latest thumb colors y={y}: x {xs[0]}-{xs[-1]}")
