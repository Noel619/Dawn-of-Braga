# Plano del Lobishome (PLAN_LOBO.md): la galería de los lobos y la Fosa de los
# Pobres, entre el Vergel de la cloaca y las Catacumbas de la Sé. A escala.
#   python3 tools/planos/plan_lobo.py   ->   docs/planos/plan_lobo.png
import math
from PIL import Image, ImageDraw, ImageFont

X0, X1, Z0, Z1 = -68, 40, -110, 42
S = 7  # px por metro
M = 44  # margen
W, H = int((X1 - X0) * S) + 2 * M, int((Z1 - Z0) * S) + 2 * M + 150
im = Image.new('RGB', (W, H), (22, 21, 24))
d = ImageDraw.Draw(im)
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f9, f11, f13, f16 = (ImageFont.truetype(F, 11), ImageFont.truetype(F, 13), ImageFont.truetype(FB, 14), ImageFont.truetype(FB, 17))


def P(x, z):
    return (M + (x - X0) * S, M + 60 + (z - Z0) * S)


def rect(x0, z0, x1, z1, fill, outline=(10, 10, 10), w=2):
    a, b = P(x0, z0), P(x1, z1)
    d.rectangle([a, b], fill=fill, outline=outline, width=w)


def label(x, z, t, font=f9, col=(230, 220, 205), anchor='mm'):
    d.multiline_text(P(x, z), t, font=font, fill=col, anchor=anchor, align='center')


def poly(pts, fill, outline=(10, 10, 10), w=2):
    d.polygon([P(x, z) for x, z in pts], fill=fill, outline=outline, width=w)


def ancho(pts, wid, col):
    # un pasillo de ancho 'wid' (m) a lo largo de una polilínea
    d.line([P(x, z) for x, z in pts], fill=col, width=int(wid * S), joint='curve')
    for x, z in pts:
        cx, cy = P(x, z)
        r = wid * S / 2
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)


def dashed(pts, col, w=3, on=10, off=7):
    for (a, b) in zip(pts, pts[1:]):
        (x0, y0), (x1, y1) = P(*a), P(*b)
        L = math.hypot(x1 - x0, y1 - y0)
        k = 0.0
        while k < L:
            e = min(k + on, L)
            d.line([(x0 + (x1 - x0) * k / L, y0 + (y1 - y0) * k / L), (x0 + (x1 - x0) * e / L, y0 + (y1 - y0) * e / L)], fill=col, width=w)
            k += on + off


d.text((M, 16), 'El Lobishome · la galería de los lobos y la Fosa de los Pobres (propuesta)', font=f16, fill=(230, 215, 190))
d.text((M, 40), 'norte arriba; 1 cuadro = 10 m; todo bajo tierra, de −10 a −12 m · lo nuevo, en color; lo que ya está, en gris', font=f11, fill=(170, 160, 150))
for x in range(-60, 41, 10):
    d.line([P(x, Z0), P(x, Z1)], fill=(32, 31, 35), width=1)
for z in range(-110, 43, 10):
    d.line([P(X0, z), P(X1, z)], fill=(32, 31, 35), width=1)

# ------------------------------------------------------------ lo que ya está
GRIS = (84, 82, 86)
# las Catacumbas de la Sé (level_crypt2.js) y su lucernario
for r in [
    [-45.5, -99, -34.5, -88],
    [-41.5, -102, -38.5, -99],
    [-34.5, -95, -15.5, -92],
    [-15.5, -103, -12.9, -92],
    [-12.9, -103, -7.5, -100.5],
    [-49, -95, -45.5, -92],
    [-55, -100, -49, -85],
    [-62, -95, -55, -92],
    [-49, -87.5, -33, -85],
    [-41.5, -88, -38.5, -87.5],
]:
    rect(*r, GRIS, (40, 40, 44))
label(-38, -106.5, 'CATACUMBAS DE LA SÉ  (−10,6)', f11, (200, 196, 205))
label(-40, -93.5, 'lucer-\nnario', f9, (225, 222, 230))
label(-52, -88, 'los\nhuesos', f9, (225, 222, 230))
label(-10.2, -97, 'bajada\nde la\ncripta', f9, (225, 222, 230))
# las bodegas del canónigo (no se cruzan)
rect(24, -86, 40, -24, (52, 50, 56), (40, 40, 44))
label(32, -55, 'bodegas\ndel\ncanónigo\n(no se\ncruzan)', f9, (180, 176, 186))
# la cloaca: la bodega, la galería, la sala de la luz
VERDE_G = (66, 84, 72)
rect(-20, -19, -13.6, -12, VERDE_G, (30, 40, 34))
rect(-16, -12, -14.6, -9.6, VERDE_G, (30, 40, 34))
rect(-16, -9.6, -12.8, 9, VERDE_G, (30, 40, 34))
rect(-16, 9, 0, 27, VERDE_G, (30, 40, 34))
rect(0.3, 23.2, 5.3, 24.8, VERDE_G, (30, 40, 34))
label(-17, -21.5, 'bodega del\nCuervo', f9, (200, 214, 204))
label(-8, 18, 'SALA DE\nLA LUZ', f11, (215, 230, 220))
label(-21, 0, 'la\ngalería', f9, (200, 214, 204))
# el Vergel (world/vergel.js)
A = [[27.6, 9.5], [30.4, 10.6], [32.2, 14.4], [32.9, 19.8], [32.8, 25.0], [33.2, 28.6], [32.6, 32.6], [30.6, 36.4], [26.8, 38.6], [21.0, 39.4], [15.2, 39.0], [10.4, 38.2], [6.6, 36.6], [4.8, 33.4], [4.4, 29.4], [5.3, 26.6], [5.3, 24.9]]
B = [[5.3, 23.1], [4.6, 20.4], [4.3, 16.6], [5.0, 12.8], [7.6, 10.4], [12.0, 9.2], [17.4, 9.6], [21.6, 8.8], [24.4, 9.5]]
poly(A + B, (74, 104, 78), (30, 46, 34))
label(19, 25, 'EL VERGEL', f13, (225, 240, 225))
label(8.4, 32.5, 'botica', f9, (220, 236, 222))
d.line([P(23.0, 11.6), P(29.2, 11.6)], fill=(250, 200, 110), width=3)
label(20.2, 13.2, 'raya de\ncandiles', f9, (250, 214, 150), 'mm')
# el paso oscuro (ya está) y su derrumbe
rect(24.6, -0.6, 27.4, 9.6, (60, 56, 64), (30, 28, 34))
for k in range(5):
    x = 24.8 + k * 0.6
    d.line([P(x, -0.6), P(x + 0.5, 1.0)], fill=(140, 120, 100), width=2)
label(31.8, 3.5, 'paso oscuro\n(derrumbe)', f9, (200, 190, 200))

# ------------------------------------------------------------ lo nuevo
MORADO = (86, 62, 112)
# la galería de los lobos: del derrumbe al norte, a poniente bajo la plaza
# del Pan y al noroeste, hasta la Fosa
GAL = [[26, -0.6], [26, -14], [12, -16.5], [3, -18], [-4, -30], [-7, -40], [-9, -44.5]]
ancho(GAL, 3, MORADO)
label(17, -27, 'LA GALERÍA DE LOS LOBOS', f11, (226, 210, 245))
label(17, -24.2, '60 m a oscuras · el acecho', f9, (205, 192, 225))
# los sumideros con su raya de luna, y los candiles apagados
for x, z in [[19, -15.5], [-2.6, -27]]:
    cx, cy = P(x, z)
    d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=(170, 190, 230))
for x, z in [[26, -6], [8, -17], [-5.5, -35]]:
    cx, cy = P(x, z)
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(120, 90, 60))
# la Fosa de los Pobres
cx, cz, rx, rz = -16, -54, 11, 10
a, b = P(cx - rx, cz - rz), P(cx + rx, cz + rz)
d.ellipse([a, b], fill=(104, 66, 70), outline=(20, 10, 12), width=3)
# los nichos (el muro, por dentro)
for k in range(72):
    t = k / 72 * math.tau
    x0, z0 = cx + math.cos(t) * (rx - 0.6), cz + math.sin(t) * (rz - 0.6)
    p = P(x0, z0)
    d.rectangle([p[0] - 1.5, p[1] - 1.5, p[0] + 1.5, p[1] + 1.5], fill=(70, 44, 48))
# los pilares y los braseros
for k in range(6):
    t = k / 6 * math.tau + 0.3
    p = P(cx + math.cos(t) * 6.2, cz + math.sin(t) * 5.6)
    d.rectangle([p[0] - 5, p[1] - 5, p[0] + 5, p[1] + 5], fill=(150, 140, 136), outline=(20, 20, 20))
for k in range(8):
    t = k / 8 * math.tau
    p = P(cx + math.cos(t) * 8.4, cz + math.sin(t) * 7.6)
    d.ellipse([p[0] - 6, p[1] - 6, p[0] + 6, p[1] + 6], fill=(230, 140, 60), outline=(40, 20, 10), width=2)
# la fosa común (se hunde en la fase 3) y la raya de luna del pozo
p0, p1 = P(cx - 3.2, cz - 2.8), P(cx + 3.2, cz + 2.8)
d.ellipse([p0, p1], fill=(48, 30, 32), outline=(20, 10, 12), width=2)
for k in range(-3, 4):
    d.line([P(cx - 2.6 + k * 0.4, cz - 2.2), P(cx - 1.2 + k * 0.4, cz + 2.2)], fill=(80, 54, 56), width=1)
pc = P(cx + 0.4, cz - 0.6)
d.ellipse([pc[0] - 9, pc[1] - 9, pc[0] + 9, pc[1] + 9], outline=(190, 210, 245), width=2)
label(cx - rx - 1.5, cz - 3.5, 'LA FOSA\nDE LOS POBRES', f13, (250, 222, 222), 'rm')
label(cx - rx - 1.5, cz + 4.5, 'la arena (22 × 20 m, a −11,5):\nocho braseros, seis pilares,\nnichos de pared a pared,\nla fosa común y el pozo\nde las ánimas', f9, (232, 210, 210), 'rm')
# la salida al norte: a las catacumbas de la Sé por la reja de los pobres
NORTE = [[-21, -63], [-26, -72], [-31, -80], [-33, -84.5]]
ancho(NORTE, 2.6, MORADO)
p = P(-33, -85.2)
d.rectangle([p[0] - 10, p[1] - 3, p[0] + 10, p[1] + 3], fill=(210, 70, 60))
label(-18.5, -79.5, 'la reja de los pobres\n(se abre después: el atajo)', f9, (240, 190, 180))
# el camino que se hace
dashed([[19, 25], [8.4, 22], [5.6, 24], [-6, 24]], (255, 214, 80), 2)
dashed([[25, 13], [26, 6], [26, -10], [10, -16.8], [-3, -27], [-8, -42], [-14, -50]], (255, 214, 80), 3)

# ------------------------------------------------------------ leyenda
LEY = [
    ((200, 192, 182), 'Lo que ya está (gris): la cloaca y el Vergel, con su paso oscuro y el derrumbe (world/cloaca.js,'),
    ((200, 192, 182), 'world/vergel.js); las Catacumbas de la Sé (world/level_crypt2.js); las bodegas del canónigo.'),
    ((220, 206, 236), 'Lo nuevo (en color): la galería de los lobos (el acecho: a oscuras, con dos sumideros de luna y los'),
    ((220, 206, 236), 'candiles del Desfigurado apagados), la Fosa de los Pobres (la arena: los braseros, en naranja, se'),
    ((220, 206, 236), 'encienden con el farol; él los apaga) y la reja de los pobres, el atajo a la cripta honda.'),
    ((240, 220, 150), 'La línea amarilla: el camino, de la sala de la luz por el caño al Vergel, la raya de candiles, el paso'),
    ((240, 220, 150), 'oscuro (cuando esté cavado) y la galería, hasta la Fosa.'),
]
y = H - 140
for col, t in LEY:
    d.text((M, y), t, font=f11, fill=col)
    y += 19

im.save('docs/planos/plan_lobo.png')
print('docs/planos/plan_lobo.png', im.size)
