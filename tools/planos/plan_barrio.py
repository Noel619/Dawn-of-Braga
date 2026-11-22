# Plano del barrio de los Pellejeros: cómo era (quince casas pequeñas, una
# calleja de 4 m) y cómo es ahora (cinco casas grandes, la rúa de 7 m con su
# arco, una escalera en cada casa), con el camino que se anda. A escala.
#   python3 tools/planos/plan_barrio.py   ->   docs/planos/plan_barrio.png
import math
from PIL import Image, ImageDraw, ImageFont

X0, X1, Z0, Z1 = 2, 76, 0, 63
S = 9  # px por metro
M = 36  # margen
PW = int((X1 - X0) * S)
W, H = 2 * PW + 3 * M, int((Z1 - Z0) * S) + 2 * M + 210
im = Image.new('RGB', (W, H), (24, 22, 20))
d = ImageDraw.Draw(im)
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f9, f10, f12, f15 = (ImageFont.truetype(F, 10), ImageFont.truetype(F, 11), ImageFont.truetype(FB, 12), ImageFont.truetype(FB, 16))
OX = [M, 2 * M + PW]
TOP = M + 74


def P(i, x, z):
    return (OX[i] + (x - X0) * S, TOP + (z - Z0) * S)


def rect(i, x0, z0, x1, z1, fill, outline=(12, 12, 12), w=1):
    a, b = P(i, x0, z0), P(i, x1, z1)
    d.rectangle([a, b], fill=fill, outline=outline, width=w)


def label(i, x, z, t, font=f9, col=(22, 20, 18)):
    d.multiline_text(P(i, x, z), t, font=font, fill=col, anchor='mm', align='center')


def dashed(i, pts, col, w=3, on=9, off=6):
    for (a, b) in zip(pts, pts[1:]):
        (x0, y0), (x1, y1) = P(i, *a), P(i, *b)
        L = math.hypot(x1 - x0, y1 - y0)
        k = 0.0
        while k < L:
            e = min(k + on, L)
            d.line([(x0 + (x1 - x0) * k / L, y0 + (y1 - y0) * k / L), (x0 + (x1 - x0) * e / L, y0 + (y1 - y0) * e / L)], fill=col, width=w)
            k += on + off


def flecha(i, pts, col, w=3):
    dashed(i, pts, col, w)
    (xa, za), (xb, zb) = pts[-2], pts[-1]
    a = math.atan2(zb - za, xb - xa)
    tip = P(i, xb, zb)
    for s in (-1, 1):
        q = (tip[0] - math.cos(a + s * 0.5) * 11, tip[1] - math.sin(a + s * 0.5) * 11)
        d.line([tip, q], fill=col, width=w)


def escalera(i, x0, z0, x1, z1):
    # el tramo, con sus peldaños
    rect(i, x0, z0, x1, z1, (196, 170, 120), (70, 50, 30), 1)
    along = (x1 - x0) >= (z1 - z0)
    n = 8
    for k in range(1, n):
        if along:
            x = x0 + (x1 - x0) * k / n
            d.line([P(i, x, z0), P(i, x, z1)], fill=(110, 84, 50), width=1)
        else:
            z = z0 + (z1 - z0) * k / n
            d.line([P(i, x0, z), P(i, x1, z)], fill=(110, 84, 50), width=1)


GRIS = (78, 74, 70)
CALLE = (148, 140, 126)
CASA = (172, 128, 84)
CASA2 = (140, 104, 70)
SALA = (190, 92, 70)
MURO = (58, 54, 50)

d.text((M, 12), 'El barrio de los Pellejeros · antes y ahora (norte arriba; a escala, 1 cuadro = 10 m)', font=f15, fill=(232, 216, 190))
d.text((M, 36), 'Antes: quince casas pequeñas (salas de 4 a 6 m), una calleja de 4 m y, en la del palomero, tres escaleras una encima de otra.', font=f10, fill=(176, 166, 150))
d.text((M, 52), 'Ahora: cinco casas grandes (salas de 9 m), la rúa de 7 m con su arco, una sola escalera en cada casa y la sala grande del Físico, de 8 x 16 m.', font=f10, fill=(176, 166, 150))

for i in (0, 1):
    for x in range(0, 77, 10):
        d.line([P(i, x, Z0), P(i, x, Z1)], fill=(34, 32, 30), width=1)
    for z in range(0, 64, 10):
        d.line([P(i, X0, z), P(i, X1, z)], fill=(34, 32, 30), width=1)
    # lo que no cambia: la plaza de la Herrería, el corral, el establo, la
    # cordelería, la capilla, las casas del norte, la muralla
    rect(i, X0, 42, 14, 58, CALLE, CALLE)
    label(i, 8, 50, 'PLAZA DE LA\nHERRERÍA', f9, (40, 36, 32))
    rect(i, 3.5, 33, 14, 42, GRIS)
    rect(i, 14, 17, 30, 31, (96, 90, 80))
    label(i, 22, 24, 'corral', f9, (200, 190, 175))
    rect(i, 30, 19.5, 38.5, 31, GRIS)
    label(i, 34.2, 25, 'establo', f9, (200, 190, 175))
    rect(i, 38.5, 3, 44, 22, GRIS)
    rect(i, 38.5, 22, 46, 31, GRIS)
    label(i, 41.2, 12, 'cor-\ndele-\nría', f9, (210, 200, 185))
    rect(i, 44, 12.2, 54, 22, GRIS)
    label(i, 49, 17, 'capilla', f9, (210, 200, 185))
    rect(i, 54, 12, 72, 22, GRIS)
    rect(i, X0, 58, X1, 62, MURO, MURO)
    rect(i, 72, Z0, 76, 62, MURO, MURO)
    label(i, 40, 60, 'MURALLA', f9, (150, 140, 128))
    rect(i, 14, 0, 38.5, 3, CALLE, CALLE)
    label(i, 26, 1.6, 'calle de los Pelames', f9, (40, 36, 32))

# ---- antes (el plano de la versión de octubre)
i = 0
for (x0, z0, x1, z1) in [(14, 42, 34, 46), (34, 38.5, 49.5, 51), (46, 22, 49.5, 38.5), (49.5, 22, 61, 34)]:
    rect(i, x0, z0, x1, z1, CALLE, CALLE)
for (x0, z0, x1, z1) in [(14, 31, 20, 42), (20, 31, 27, 42), (27, 31, 34, 42), (14, 46, 22, 55), (22, 46, 29.5, 55), (29.5, 46, 34, 55),
                         (34, 31, 46, 38.5), (34, 51, 42, 58), (42, 51, 49.5, 58), (49.5, 34, 61, 49), (49.5, 49, 61, 58), (61, 44, 72, 58), (61, 30, 72, 44), (61, 22, 72, 30)]:
    rect(i, x0, z0, x1, z1, CASA2)
for (x0, z0, x1, z1) in [(14, 55, 34, 58)]:
    rect(i, x0, z0, x1, z1, (120, 112, 96))
label(i, 24, 44, 'calleja (4 m)', f9)
label(i, 41.7, 45, 'plazuela', f9)
label(i, 23.5, 36.5, 'zapat.', f9, (240, 230, 214))
label(i, 25.7, 50.5, 'viuda', f9, (240, 230, 214))
label(i, 31.7, 50.5, 'que-\nmada', f9, (240, 230, 214))
label(i, 40, 34.7, 'tintorería', f9, (240, 230, 214))
label(i, 55.2, 41.5, 'Casa de los\nInocentes', f9, (240, 230, 214))
rect(i, 50.1, 34.6, 60.4, 40.75, SALA)
label(i, 55.2, 37.7, 'quirófano\n10 x 6', f9, (250, 240, 225))
label(i, 66.5, 37, 'palome-\nro', f9, (240, 230, 214))
# las escaleras de antes (las de la tintorería, la Casa y la del palomero)
for (x0, z0, x1, z1) in [(25.35, 36.85, 26.55, 41.05), (27.85, 49.85, 29.05, 54.05), (32.5, 49.85, 33.5, 54.05), (41.0, 31.5, 45.2, 32.7), (36.45, 34.25, 37.55, 37.55),
                         (59.45, 43.85, 60.55, 48.05), (55.65, 44.75, 56.65, 48.05), (42.35, 16.6, 43.35, 20.8), (39.15, 7.0, 40.15, 11.2)]:
    escalera(i, x0, z0, x1, z1)
for (x0, z0, x1, z1) in [(69.4, 30.6, 70.6, 33.4), (65.95, 39.4, 67.05, 42.4), (65.95, 36.4, 67.05, 39.4)]:
    escalera(i, x0, z0, x1, z1)
d.ellipse([P(i, 63.5, 29.5), P(i, 73.0, 44.0)], outline=(240, 90, 70), width=3)
label(i, 68.2, 46.3, 'tres escaleras,\nuna encima de otra', f9, (250, 150, 130))

# ---- ahora
i = 1
for (x0, z0, x1, z1) in [(14, 41, 34, 48), (34, 41, 49.5, 52), (46, 22, 49.5, 41)]:
    rect(i, x0, z0, x1, z1, CALLE, CALLE)
rect(i, 49.5, 22, 72, 34, (118, 108, 88), (118, 108, 88))
rect(i, 66, 34, 72, 58, (104, 118, 80), (104, 118, 80))
label(i, 60.5, 26.4, 'patio (la cal, las jaulas, la camilla)', f9, (235, 228, 210))
label(i, 69, 45.5, 'huerto\nde las\nhierbas', f9, (235, 238, 220))
# las casas grandes
rect(i, 14, 31, 34, 41, CASA)
rect(i, 14, 48, 34, 58, CASA)
rect(i, 34, 31, 46, 41, CASA)
rect(i, 34, 52, 49.5, 58, (122, 96, 76))
rect(i, 49.5, 34, 66, 58, CASA)
# sus salas: tabiques
for (a, b) in [((24, 31.5), (24, 40.5)), ((24, 48.5), (24, 57.5)), ((57.1, 34.6), (57.1, 50.8)), ((50.1, 50.9), (65.4, 50.9)), ((57.1, 51.0), (57.1, 57.4))]:
    d.line([P(i, *a), P(i, *b)], fill=(70, 46, 26), width=2)
rect(i, 57.2, 34.6, 65.4, 50.8, SALA)
label(i, 61.3, 41.2, 'SALA GRANDE\n(se le pelea)\n8 x 16 m,\nabierta hasta\nlas cerchas', f9, (255, 246, 232))
d.ellipse([P(i, 60.6, 45.6), P(i, 62.0, 46.4)], fill=(80, 40, 30))
label(i, 61.3, 47.2, 'su mesa', f9, (255, 236, 220))
label(i, 53.5, 45.5, 'zaguán', f9, (255, 246, 232))
label(i, 53.5, 54.2, 'consulta', f9, (255, 246, 232))
label(i, 61.3, 54.2, 'celdas', f9, (255, 246, 232))
label(i, 19.2, 34.5, 'obrador', f9, (255, 246, 232))
label(i, 29.0, 37.6, 'zaguán y\ncocina', f9, (255, 246, 232))
label(i, 19.2, 54.6, 'tienda de\nlas velas', f9, (255, 246, 232))
label(i, 29.0, 52.6, 'zaguán y\ncocina', f9, (255, 246, 232))
label(i, 40, 37.0, 'TINTORERÍA\n(tintes; arriba,\npaños; secadero)', f9, (255, 246, 232))
label(i, 41.75, 55.2, 'LA QUEMADA\n(los Gomes)', f9, (245, 232, 218))
label(i, 19.2, 38.6, 'CASA DEL\nZAPATERO', f12, (255, 246, 232))
label(i, 19.2, 50.6, 'CASA DE LA\nCERERA', f12, (255, 246, 232))
label(i, 57.75, 32.4, 'CASA DE LOS INOCENTES', f12, (255, 246, 232))
label(i, 21.5, 44.6, 'RÚA DE LOS\nPELLEJEROS (7 m)', f12, (40, 36, 32))
label(i, 42.6, 49.6, 'plazuela', f10, (40, 36, 32))
label(i, 47.75, 31, 'ca-\nlle-\njón', f9, (40, 36, 32))
# el arco
rect(i, 14, 41, 15.2, 41.8, (226, 214, 190))
rect(i, 14, 47.2, 15.2, 48, (226, 214, 190))
d.arc([P(i, 12.8, 41.8), P(i, 16.4, 47.2)], 270, 90, fill=(226, 214, 190), width=3)
label(i, 10.6, 40.0, 'el arco', f10, (226, 214, 190))
# una escalera en cada casa (la de la tintorería y la de la Casa, de ida y vuelta)
for (x0, z0, x1, z1) in [(25.0, 31.6, 29.5, 33.1), (25.2, 55.9, 29.7, 57.4), (35.2, 31.6, 39.7, 33.1), (35.8, 33.2, 39.7, 34.7), (51.5, 34.7, 56.0, 36.2), (51.5, 36.3, 56.0, 37.8)]:
    escalera(i, x0, z0, x1, z1)
# la viga sobre la rúa
d.line([P(i, 30.6, 41.3), P(i, 30.6, 47.7)], fill=(250, 210, 120), width=4)
label(i, 32.2, 42.6, 'viga', f9, (250, 210, 120))
# la claraboya y el boquete
rect(i, 54.0, 45.6, 55.2, 46.8, (120, 170, 220))
rect(i, 29.3, 37.9, 31.5, 39.6, (120, 170, 220))
# el camino: por la calle (amarillo), por los tejados (violeta)
flecha(i, [(9, 44.5), (27, 44.5), (27, 39.5)], (255, 214, 90))
flecha(i, [(27.5, 44.0), (27.5, 49.5)], (255, 214, 90))
flecha(i, [(33.5, 50.0), (40, 44.0), (40, 40.0)], (255, 214, 90))
flecha(i, [(37.5, 36.5), (34.5, 36.0), (30.4, 36.0), (30.4, 41.3), (30.6, 47.7), (33.5, 55), (49.5, 55.3), (54.6, 46.2)], (196, 140, 250))
flecha(i, [(56.0, 40.0), (59.5, 44.0)], (255, 214, 90))
flecha(i, [(61.3, 36.0), (61.3, 29.0), (49.0, 28.1), (46.5, 27.0)], (120, 220, 140))

# ---- las leyendas
y = TOP + (Z1 - Z0) * S + 18
xs = [M, 2 * M + PW]
d.text((xs[0], y), 'ANTES', font=f15, fill=(232, 216, 190))
d.text((xs[1], y), 'AHORA', font=f15, fill=(232, 216, 190))
lin = [
    ((255, 214, 90), 'por la calle: el arco (la palanca), el zapatero, la cerera (la viga del balcón y la llave), la tintorería'),
    ((196, 140, 250), 'por arriba: el secadero, el desván de las palomas, la rampa, la viga sobre la rúa, la quemada, la claraboya'),
    ((120, 220, 140), 'vencido el Físico: su patio, el callejón y la cordelería, a los Pelames'),
    ((196, 170, 120), 'escaleras: una sola en cada casa (la de la tintorería y la de la Casa, de ida y vuelta, por plantas)'),
]
for k, (c, t) in enumerate(lin):
    yy = y + 26 + k * 18
    d.rectangle([xs[1], yy + 3, xs[1] + 22, yy + 9], fill=c)
    d.text((xs[1] + 30, yy), t, font=f10, fill=(200, 190, 175))
ant = [
    'La calleja, de 4 m, era un pasillo entre muros; en las casas,',
    'salas de 4 a 6 m (la quemada, de 3,6 m por dentro), y la cámara',
    'chocaba con todo. El Físico se peleaba en un quirófano de 10 x 6.',
    'En la casa del palomero, tres escaleras en fila: la enterrada, la',
    'del desván y la del palomar, por el tejado abierto.',
]
for k, t in enumerate(ant):
    d.text((xs[0], y + 26 + k * 18), t, font=f10, fill=(200, 190, 175))
im.save('docs/planos/plan_barrio.png')
print('docs/planos/plan_barrio.png', im.size)
