# Plano del albacar (PLAN_ALBACAR.md): el patio de armas del castillo viejo,
# rehecho como el refugio de la gente de fuera durante el cerco. A escala.
#   python3 tools/planos/plan_albacar.py   ->   docs/planos/plan_albacar.png
import math
import random
from PIL import Image, ImageDraw, ImageFont

X0, X1, Z0, Z1 = -127, -30, -50, 26
S = 12  # px por metro
M = 44  # margen
W, H = int((X1 - X0) * S) + 2 * M, int((Z1 - Z0) * S) + 2 * M + 110
im = Image.new('RGB', (W, H), (24, 22, 20))
d = ImageDraw.Draw(im)
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f9, f11, f13, f16, f22 = (ImageFont.truetype(F, 11), ImageFont.truetype(F, 13), ImageFont.truetype(FB, 14), ImageFont.truetype(FB, 17), ImageFont.truetype(FB, 22))


def P(x, z):
    return (M + (x - X0) * S, M + 60 + (z - Z0) * S)


def rect(x0, z0, x1, z1, fill, outline=(10, 10, 10), w=2):
    a, b = P(x0, z0), P(x1, z1)
    d.rectangle([a, b], fill=fill, outline=outline, width=w)


def label(x, z, t, font=f9, col=(20, 18, 16), anchor='mm'):
    d.multiline_text(P(x, z), t, font=font, fill=col, anchor=anchor, align='center')


def dashed(pts, col, w=3, on=10, off=7):
    for (a, b) in zip(pts, pts[1:]):
        (x0, y0), (x1, y1) = P(*a), P(*b)
        L = math.hypot(x1 - x0, y1 - y0)
        k = 0.0
        while k < L:
            e = min(k + on, L)
            d.line([(x0 + (x1 - x0) * k / L, y0 + (y1 - y0) * k / L), (x0 + (x1 - x0) * e / L, y0 + (y1 - y0) * e / L)], fill=col, width=w)
            k += on + off


d.text((M, 16), 'El albacar · el patio de armas del castillo viejo, refugio de la gente de fuera (propuesta)', font=f16, fill=(230, 215, 190))
d.text((M, 40), 'norte arriba; 1 cuadro = 10 m · lo nuevo, en color; lo que ya está, en gris', font=f11, fill=(170, 160, 145))
for x in range(-120, -29, 10):
    d.line([P(x, Z0), P(x, Z1)], fill=(34, 32, 30), width=1)
for z in range(-50, 27, 10):
    d.line([P(X0, z), P(X1, z)], fill=(34, 32, 30), width=1)

# la ciudad, al este
rect(-47, Z0, X1, Z1, (58, 46, 40), (58, 46, 40))
rect(-62, -50, -47, -23, (58, 46, 40), (58, 46, 40))
label(-38.5, -12, 'CIUDAD', f13, (200, 170, 150))

# la fortaleza (el castillo): su frente del sur
rect(-126, -50, -62, -32, (70, 66, 62), w=3)
rect(-140, -44.8, -126, -30, (80, 76, 72), w=3)
label(-121, -40.5, 'COCINA', f11, (220, 215, 205))
rect(-106, -46, -90, -29, (92, 86, 80), w=3)
label(-98, -40, 'PUERTA DE LA\nFORTALEZA\n(el puente, alzado)', f11, (240, 232, 220))
rect(-76, -46, -62, -32, (86, 80, 74), w=3)
label(-69, -39, 'TOMBO', f11, (225, 220, 210))
label(-90, -48.4, 'LA FORTALEZA (el castillo del Rey) · su torre del homenaje, 54 m más al norte ↑', f11, (200, 190, 175))
# el foso, las estacas y el puente (alzado)
rect(-102, -28, -94, -24, (40, 34, 30), (20, 18, 16), 1)
for x in range(-101, -94):
    for z in (-27, -25):
        d.line([P(x + 0.5, z - 0.4), P(x + 0.5, z + 0.4)], fill=(150, 120, 90), width=2)
label(-98, -26, 'foso', f9, (220, 210, 200))
# el cadalso del alférez
for (a, b, c, e) in [(-95.3, -29, -88.2, -27.2), (-90, -30.2, -88.2, -29), (-90, -32, -76, -30.2)]:
    rect(a, b, c, e, (150, 110, 70), (70, 50, 30), 1)
label(-82, -33.6, 'cadalso (el ALFÉREZ, arriba)', f9, (230, 210, 180))

# el albacar: el recinto
rect(-123, -32, -120, 23, (110, 104, 98), w=2)
rect(-120, -32, -62, -23, (96, 86, 70), (96, 86, 70), 1)
rect(-120, -23, -48, 20, (96, 86, 70), w=3)
rect(-123, 20, -48, 23, (110, 104, 98))
label(-84, 21.6, 'muralla sur', f9, (40, 36, 32))
rect(-64.2, 20, -59.4, 23, (130, 96, 60), (60, 40, 20), 1)
label(-61.8, 24.6, 'la brecha', f9, (220, 190, 150))
rect(-71, -23, -48, -20, (110, 104, 98), w=2)
label(-56, -24.6, 'muralla del castillo viejo (la escalera rota)', f9, (225, 210, 190))

# lo que ya está (gris)
G0, GT = (118, 112, 104), (235, 230, 222)
for (x0, z0, x1, z1, t) in [
    (-120, -23, -111, -15.2, 'halco-\nnera'),
    (-120, -15.2, -111, 6, 'CUADRAS'),
    (-120, 7.4, -114.6, 11.4, 'pajar'),
    (-116.4, 13.8, -103, 20, 'fragua'),
    (-90, 4, -81, 14, 'TORRE DE\nLA CÁRCEL'),
    (-80, 13, -66, 20, 'cuartel'),
    (-66, 15.6, -52.5, 20, 'almacén · horno'),
    (-60, -20, -52, -14, 'capilla\n(altar)'),
    (-58.6, -14, -51, -7.4, 'secadero'),
    (-59, -7, -48, 5, 'TORRE-\nPUERTA'),
    (-120, -31.1, -107, -25.4, 'corral de\nla cocina'),
]:
    rect(x0, z0, x1, z1, G0, (40, 38, 36), 2)
    label((x0 + x1) / 2, (z0 + z1) / 2, t, f9, GT)
rect(-93, 3.4, -90, 14.6, (100, 94, 88), (40, 36, 32), 1)
rect(-47, -3.5, -43, 3.5, (110, 104, 98), w=2)
label(-37, 0, '→ calle del Soto', f9, (230, 210, 190))
d.ellipse([P(-63, 11), P(-60.6, 13.4)], fill=(60, 60, 70))
label(-61.8, 15, 'pozo', f9, (230, 225, 215))
rect(-103.4, -10, -100.6, -2, (100, 84, 62), (50, 40, 30), 1)
label(-102, -11.6, 'fundíbulo', f9, (230, 220, 200))
# la puerta de la torre de la cárcel (la salida)
d.line([P(-81, 7.3), P(-81, 8.7)], fill=(250, 220, 120), width=6)

# --- lo nuevo
NEW = (176, 138, 92)
# los cimientos de la torre vieja: abiertos al norte (su muro se lo llevó el
# foso), arrasados a media altura, con algún machón más alto
RUINA = (150, 136, 112)
for (x0, z0, x1, z1) in [(-97, -24, -94.6, -3), (-73.4, -29, -71, -3), (-97, -5.4, -71, -3), (-85.2, -26, -83.8, -5.4)]:
    rect(x0, z0, x1, z1, RUINA, (60, 50, 40), 1)
for (x0, z0, x1, z1) in [(-97, -6, -94, -3), (-74, -6, -71, -3), (-74, -29, -71, -26)]:
    rect(x0, z0, x1, z1, (120, 108, 88), (50, 40, 30), 2)
dashed([(-94, -29), (-71, -29)], (150, 136, 112), 2, 4, 4)
label(-84.5, -27.6, 'los cimientos de la TORRE VIEJA (26 × 26, arrasada a 0,5–1,5 m)', f9, (240, 228, 200))
# la losa de la bajada vieja, cegada, sobre el rastrillo de abajo
rect(-90.2, -10.6, -88.3, -8.7, (90, 80, 70), (220, 90, 70), 2)
label(-89.2, -7.3, 'la losa\ncegada', f9, (240, 150, 130))

# el campamento: tiendas (chozas de lona sobre palos) y carros, dentro y
# fuera de los cimientos
rnd = random.Random(1167)
TIENDA = (196, 170, 128)
tiendas = []


def tienda(x, z, w=2.6, l=3.2, rot=0):
    if rot:
        w, l = l, w
    rect(x - w / 2, z - l / 2, x + w / 2, z + l / 2, TIENDA, (90, 70, 46), 1)
    tiendas.append((x, z))


for x in (-92.5, -88.5, -80, -76.5):
    for z in (-21.5, -16.5, -11.5):
        if abs(x + 89.2) < 2 and abs(z + 9.6) < 3:
            continue
        tienda(x + rnd.uniform(-0.6, 0.6), z + rnd.uniform(-0.6, 0.6), rot=rnd.random() < 0.3)
for (x, z) in [(-108, -20.5), (-106.5, -14.8), (-92, 0.2), (-87.5, 0.6), (-76, 0.2), (-66.5, -16), (-66, -6.2), (-110, -2.5), (-106, 1.5), (-70, -21.5)]:
    tienda(x + rnd.uniform(-0.4, 0.4), z + rnd.uniform(-0.4, 0.4), rot=rnd.random() < 0.5)
CARRO = (130, 96, 60)
for (x, z, r) in [(-68.5, 6.5, 0), (-65.6, 8.2, 1), (-70.4, 9.6, 1), (-84.5, -24.4, 0), (-108.5, -9.5, 1), (-90.5, -19, 0), (-64.6, -12.2, 1)]:
    w, l = (1.6, 3.2) if not r else (3.2, 1.6)
    rect(x - w / 2, z - l / 2, x + w / 2, z + l / 2, CARRO, (60, 40, 20), 1)
label(-67.5, 11.2, 'los carros\natravesados', f9, (240, 220, 190))
# las hogueras del campamento
for (x, z) in [(-84.5, -14), (-78.2, -8.5), (-90.4, -19.0), (-69.5, -10.5), (-104, -17.5)]:
    d.ellipse([P(x - 0.7, z - 0.7), P(x + 0.7, z + 0.7)], fill=(220, 120, 50), outline=(90, 40, 20))
label(-84.5, -16, 'EL CAMPAMENTO', f13, (250, 236, 210))

# el reparto, ante la torre de la cárcel
rect(-79, -2.2, -70, 3.8, (150, 70, 52), (60, 30, 20), 2)
label(-75.6, 0.8, 'EL REPARTO\n(la mesa, el peso,\nel libro)', f9, (250, 236, 220))
# los corrales, ante las puertas de las cuadras
for (x0, z0, x1, z1) in [(-110.4, -13.4, -104.4, -4.8), (-110.4, -3.2, -104.4, 4.6)]:
    rect(x0, z0, x1, z1, (110, 120, 70), (70, 80, 40), 2)
label(-107.4, -9, 'corral', f9, (240, 245, 220))
label(-107.4, 0.7, 'corral', f9, (240, 245, 220))
label(-114, -26.6, '', f9)
# el fosal: las tumbas y la fosa de la cal
for i in range(4):
    for j in range(6):
        x = -102 + i * 1.9
        z = 2.6 + j * 1.85
        rect(x - 0.45, z - 0.8, x + 0.45, z + 0.8, (92, 76, 60), (60, 48, 36), 1)
rect(-102.6, 14.2, -96.4, 18.4, (210, 205, 190), (90, 90, 80), 2)
label(-99.5, 16.3, 'la fosa\nde la cal', f9, (40, 40, 36))
label(-99.6, 0.8, 'EL FOSAL', f11, (240, 225, 205))
# ante el foso: la última embestida (las escalas contra las torres de la puerta)
for x in (-104.5, -92.6, -91.2):
    d.line([P(x, -29.2), P(x + 0.6, -24.6)], fill=(200, 170, 120), width=4)
label(-112.5, -21.6 + 0.0, '', f9)
label(-112, -28.5 + 0.0, '', f9)
label(-88.2, -22.9, 'ante el foso: la última\nembestida (escalas, virotes)', f9, (240, 225, 200))

# los de rodillas, todos de cara a la Sé (al nordeste)
def rodilla(x, z):
    a = math.atan2(-1, 1)  # hacia el nordeste en planta (x+, z-)
    cx, cz = P(x, z)
    r = 7
    pts = [(cx + math.cos(a) * r, cz + math.sin(a) * r), (cx + math.cos(a + 2.5) * r * 0.7, cz + math.sin(a + 2.5) * r * 0.7), (cx + math.cos(a - 2.5) * r * 0.7, cz + math.sin(a - 2.5) * r * 0.7)]
    d.polygon(pts, fill=(235, 235, 240), outline=(40, 40, 50))


for (x, z) in [(-86.4, -19), (-82, -14.5), (-78.5, -18.6), (-88.7, -13.4), (-74.5, -12.8), (-70.6, -15.4), (-75.7, -4.8), (-72, -0.7), (-77.2, 1.2), (-68.6, 0.2), (-93.2, -9), (-81.6, -7.6), (-104.8, -21.6), (-100.4, -18.5), (-97, -22), (-91, -26.4), (-100, 5.8), (-96.4, 9.6), (-64.4, -3.5), (-62.4, -17.5), (-107, -16.6)]:
    rodilla(x, z)
# la rosa: el norte, la Sé
cx, cz = -36, -40
d.line([P(cx, cz + 2.8), P(cx, cz - 2.8)], fill=(220, 210, 190), width=2)
label(cx, cz - 4.2, 'N', f11, (220, 210, 190))
d.line([P(cx, cz), P(cx + 3.6, cz - 3.6)], fill=(240, 200, 120), width=3)
label(cx + 4.6, cz - 5.2, 'la Sé', f9, (240, 200, 120))
rodilla(-41.2, -29.6)
label(-39.6, -29.6, '= de rodillas, de\ncara a la Sé', f9, (220, 215, 205), 'lm')

# el recorrido de la salida: de la torre de la cárcel, por el reparto y el
# campamento, a la capilla (el altar) y a la puerta
dashed([(-80.6, 8), (-76.5, 6.2), (-74.5, 4.8), (-73.5, -3.6), (-71.6, -7.4), (-64, -9.2), (-60.2, -12.6), (-57.2, -13.6), (-61.2, -11), (-61.4, 3.8), (-57.6, 7.6), (-54.4, 5.6), (-54.4, 1)], (250, 210, 90), 3)
label(-68.6, 3.4, '', f9)
d.text((M, H - 92), 'La línea amarilla: la salida, de la torre de la cárcel a la puerta del albacar por el reparto, el campamento y la capilla (el altar);\nlos carros atravesados cortan el camino recto. Lo demás, a un lado: los corrales y las cuadras, el fosal y la fragua, ante el foso.', font=f11, fill=(220, 205, 180))
d.text((M, H - 52), 'Debajo, como hasta ahora: las mazmorras del principio (−5) y, al norte, la capilla de los reos y el rastrillo de la cárcel del Rey (−7):\nla losa cegada de la torre vieja está encima de su rellano.', font=f11, fill=(170, 160, 145))
for x in range(-120, -29, 10):
    label(x, Z0 - 1.8, str(x), f9, (130, 120, 110))
for z in range(-50, 27, 10):
    d.text((P(X0, z)[0] - 30, P(X0, z)[1] - 6), str(z), font=f9, fill=(130, 120, 110))
im.save('docs/planos/plan_albacar.png')
print(W, H)
