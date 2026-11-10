from PIL import Image

im = Image.open("/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png").convert("RGB")
W,H = im.size; px = im.load()

def dark_in_row(y, x0, x1, thr=130):
    return [x for x in range(x0, x1, 2) if sum(px[x,y])/3 < thr]

# 1. Первая строка с тёмным текстом после hero (y>456): заголовок «Юридические вопросы»
for y in range(456, 540):
    xs = dark_in_row(y, 80, 500)
    if len(xs) > 5:
        print(f"первая текстовая строка после hero: y={y}, x {xs[0]}-{xs[-1]}")
        # последняя строка заголовка
        y2 = y
        while True:
            xs2 = dark_in_row(y2+1, 80, 500)
            if len(xs2) > 5: y2 += 1
            else: break
        print(f"  заголовок: y {y}-{y2} (h={y2-y+1})")
        break

# 2. Сайдбар: карточка «Нужна юридическая помощь?» — светло-голубая заливка accent #edf2f9?
def is_accent(c): r,g,b = c; return 232<=r<=244 and 238<=g<=248 and 244<=b<=254
for y in [560, 640]:
    xs = [x for x in range(W//2, W) if is_accent(px[x,y])]
    if xs:
        runs = []; s = xs[0]; p = xs[0]
        for x in xs[1:]:
            if x-p > 8: runs.append((s,p)); s = x
            p = x
        runs.append((s,p))
        print(f"sidebar accent y={y}:", [(a,b,b-a+1) for a,b in runs if b-a>50])

# 3. Кнопка «Задать вопрос» в сайдбаре (тёмно-синяя)
def is_navy(c): r,g,b=c; return r<55 and g<65 and 40<b<100
for y in range(560, 720, 4):
    xs = [x for x in range(1000, W) if is_navy(px[x,y])]
    if len(xs) > 100:
        print(f"sidebar navy button y={y}: x {xs[0]}-{xs[-1]} (w={xs[-1]-xs[0]})")
        ys = [yy for yy in range(y-60, y+80) if is_navy(px[xs[0]+40, yy])]
        if ys: print(f"  button vertical: y {ys[0]}-{ys[-1]} (h={ys[-1]-ys[0]+1})")
        break

# 4. Заголовок hero: размер шрифта (высота глифов) «Понятно о ваших правах»
#    ищем строки с тёмным текстом в x 85-700, y 150-280
rows = []
for y in range(140, 300):
    xs = dark_in_row(y, 85, 700, 100)
    rows.append((y, len(xs)))
in_text = [y for y, n in rows if n > 15]
if in_text:
    # найдём непрерывные диапазоны
    bands = []; s = in_text[0]; p = in_text[0]
    for y in in_text[1:]:
        if y-p > 4: bands.append((s,p)); s = y
        p = y
    bands.append((s,p))
    print("hero title text bands:", bands)

# 5. Плитки: точные вертикальные границы (колонка внутри плитки 1, x=100)
def is_tileish(c): r,g,b = c; return 236<=r<=252 and 240<=g<=253 and 244<=b<=255
ys = [y for y in range(505, 700) if is_tileish(px[100,y])]
if ys:
    print("tile col x=100 light-bg rows:", ys[0], "-", ys[-1])
