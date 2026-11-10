"""Контактный лист сгенерированных изображений категорий — для визуальной проверки.
Подписывает каждую плитку slug-ом, чтобы было видно соответствие категории."""
from PIL import Image, ImageDraw, ImageFont
import pathlib

SRC = pathlib.Path('/home/z/my-project/scripts/generated-categories')
OUT = '/tmp/render/category-contact-sheet.jpg'

slugs = ['family', 'divorce', 'alimony', 'inheritance', 'real-estate', 'consumer-rights',
         'debts', 'bankruptcy-individuals', 'labor', 'housing', 'court',
         'money-recovery', 'enforcement', 'appeals']

THUMB_W, THUMB_H = 448, 256
LABEL_H = 26
COLS = 3
rows = (len(slugs) + COLS - 1) // COLS

sheet = Image.new('RGB', (COLS * THUMB_W, rows * (THUMB_H + LABEL_H)), 'white')
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
except Exception:
    font = ImageFont.load_default()

for i, slug in enumerate(slugs):
    col, row = i % COLS, i // COLS
    img = Image.open(SRC / f'{slug}.png').convert('RGB').resize((THUMB_W, THUMB_H))
    x, y = col * THUMB_W, row * (THUMB_H + LABEL_H)
    sheet.paste(img, (x, y))
    draw.rectangle([x, y + THUMB_H, x + THUMB_W, y + THUMB_H + LABEL_H], fill=(17, 38, 60))
    draw.text((x + 8, y + THUMB_H + 4), slug, fill='white', font=font)

sheet.save(OUT, quality=80)
print(OUT, sheet.size)
