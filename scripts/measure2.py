from PIL import Image

def analyze(path, label):
    im = Image.open(path).convert("RGB"); W,H = im.size; px = im.load()
    print(f"\n=== {label} ({W}x{H}) ===")

    # Hero band: светлый серо-голубой. Найдём где он кончается (переход к белому фону секций)
    def is_lightbg(c): r,g,b=c; return 220<r<250 and 228<g<252 and 238<b<255
    def is_white(c): r,g,b=c; return r>250 and g>250 and b>252
    # по колонке x = 30 (левое поле)
    col = [px[30,y] for y in range(H)]
    # найдём последний y в верхней трети, где цвет светло-голубой (не белый)
    hero_rows = [y for y in range(100, min(H,1200)) if is_lightbg(col[y])]
    if hero_rows:
        print("hero band at x=30: y", hero_rows[0], "-", hero_rows[-1], "h=", hero_rows[-1]-hero_rows[0]+1)

    # Левый край контента: первая колонка с тёмным пикселем (текст) в диапазоне заголовка секций
    def left_text_edge(y):
        for x in range(0, W//2):
            r,g,b = px[x,y]
            if r<110 and g<110 and b<130: return x
        return None
    # заголовок hero (крупный): ищем в первых строках после nav
    for y in range(150, 400, 30):
        e = left_text_edge(y)
        if e: print(f"hero text left edge at y={y}: x={e}")

    # Фото Фемиды: тёмные пиксели (коричневые) в hero
    def is_dark_photo(c): r,g,b=c; return r<120 and g<100 and b<110
    for y in [200, 300]:
        xs = [x for x in range(W//2, W, 4) if is_dark_photo(px[x,y])]
        if xs: print(f"photo dark pixels at y={y}: from x={xs[0]} ({round(xs[0]/W*100)}%)")

    # Белая карточка плитки: в секции категорий найдём фон плиток (светло-серый #f2f5f9)
    def is_tile(c): r,g,b=c; return 238<=r<=248 and 241<=g<=250 and 245<=b<=253 and not (r>250 and g>250)
    return im

analyze("/home/z/my-project/upload/Правовой маршрут_ юридическая помощь.png", "МАКЕТ")
analyze("/tmp/render/before-desktop-full.png", "ТЕКУЩИЙ")
