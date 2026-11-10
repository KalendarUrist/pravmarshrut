from PIL import Image

def analyze(path, label):
    im = Image.open(path).convert("RGB"); W,H = im.size; px = im.load()
    print(f"\n=== {label} ({W}x{H}) ===")

    def row_dark_range(y, thr=120):
        xs = [x for x in range(W) if sum(px[x,y])/3 < thr]
        return (xs[0], xs[-1]) if xs else None

    # 1. Header: логотип (тёмные пиксели) в верхней зоне, кнопка справа
    for y in [40]:
        r = row_dark_range(y)
        if r: print(f"header y={y}: dark from x={r[0]} to x={r[1]} (right edge {round(r[1]/W*100)}%)")

    # 2. Hero: кнопка «Найти» (тёмно-синяя заливка) — найдём её границы
    def is_navy(c): r,g,b=c; return r<50 and 40<b<95 and g<60
    for y in range(350, 460, 8):
        xs = [x for x in range(0, W//2) if is_navy(px[x,y])]
        if xs and len(xs)>30:
            print(f"hero Найти button y={y}: x {xs[0]}-{xs[-1]} (w={xs[-1]-xs[0]})")
            break

    # 3. Заголовок «Юридические вопросы» (крупный тёмный текст под hero)
    #    и плитки: светлые карточки #f2f5f9 на белом фоне
    def is_tile(c): r,g,b=c; return 238<=r<=247 and 241<=g<=250 and 245<=b<=254 and b>=g>=r
    # поиск строки с максимальным количеством плиточных пикселей
    best = None
    for y in range(460, min(H,1000), 4):
        cnt = sum(1 for x in range(0, W, 6) if is_tile(px[x,y]))
        if cnt > 20:
            if best is None: best = y
    if best:
        print(f"first tile row near y={best}")
        # границы первой плитки в этой строке
        xs = [x for x in range(W) if is_tile(px[x,best+4])]
        # найдём непрерывные отрезки
        runs = []
        if xs:
            s = xs[0]; p = xs[0]
            for x in xs[1:]:
                if x - p > 6: runs.append((s,p)); s = x
                p = x
            runs.append((s,p))
        print("tile runs:", [(a, b, b-a+1) for a,b in runs[:8]])

    # 4. Вертикальные границы первой плитки
    if best:
        x_probe = runs[0][0]+10
        ys = [y for y in range(best-30, best+140) if is_tile(px[x_probe,y])]
        if ys: print(f"tile vertical: y {ys[0]}-{ys[-1]} (h={ys[-1]-ys[0]+1})")

analyze("/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png", "МАКЕТ 1536")
analyze("/tmp/render/before-desktop-full.png", "ТЕКУЩИЙ 1440")
