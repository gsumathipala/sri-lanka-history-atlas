import sys
from PIL import Image, ImageDraw
src, x0, y0, w, h, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
im = Image.open(src).convert('RGB').crop((x0, y0, x0 + w, y0 + h))
d = ImageDraw.Draw(im)
step = 20
for x in range(0, w, step):
    X = x0 + x
    col = (255, 0, 0) if X % 100 == 0 else (0, 120, 255)
    if X % 100 == 0 or X % 50 == 0: d.line([(x, 0), (x, h)], fill=col, width=1); d.text((x + 2, 2), str(X), fill=(255, 0, 0))
for y in range(0, h, step):
    Y = y0 + y
    if Y % 50 == 0: d.line([(0, y), (w, y)], fill=(255, 0, 0) if Y % 100 == 0 else (0, 120, 255), width=1); d.text((2, y + 2), str(Y), fill=(255, 0, 0))
im = im.resize((w * 2, h * 2))
im.save(out)
