# Plano de los Paços (PLAN_PACOS.md): el patio de armas del castillo viejo,
# rehecho como el barrio de los ricos de la corte, cerrado; y lo que queda del
# patio, el de la guardia. A escala.
#   python3 tools/planos/plan_pacos.py   ->   docs/planos/plan_pacos.png
import math
from PIL import Image, ImageDraw, ImageFont

X0, X1, Z0, Z1 = -127, -30, -50, 26
S = 12  # px por metro
M = 44  # margen
W, H = int((X1 - X0) * S) + 2 * M, int((Z1 - Z0) * S) + 2 * M + 150
im = Image.new('RGB', (W, H), (24, 22, 20))
d = ImageDraw.Draw(im)
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f9, f11, f13, f16 = (ImageFont.truetype(F, 11), ImageFont.truetype(F, 13), ImageFont.truetype(FB, 14), ImageFont.truetype(FB, 17))


def P(x, z):
    return (M + (x - X0) * S, M + 60 + (z - Z0) * S)


def rect(x0, z0, x1, z1, fill, outline=(10, 10, 10), w=2):
    a, b = P(x0, z0), P(x1, z1)
    d.rectangle([a, b], fill=fill, outline=outline, width=w)


def label(x, z, t, font=f9, col=(20, 18, 16), anchor='mm'):
    d.multiline_text(P(x, z), t, font=font, fill=col, anchor=anchor, align='center')


def placa(x, z, t, font=f9, col=(20, 18, 16), bg=(24, 22, 20), pad=3):
    # un rótulo con su fondo: tapa lo que pasa por debajo (las estacas)
    bb = d.multiline_textbbox(P(x, z), t, font=font, anchor='mm', align='center')
    d.rectangle([bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad], fill=bg)
    label(x, z, t, font, col)


def dashed(pts, col, w=3, on=10, off=7):
    for (a, b) in zip(pts, pts[1:]):
        (x0, y0), (x1, y1) = P(*a), P(*b)
        L = math.hypot(x1 - x0, y1 - y0)
        k = 0.0
        while k < L:
            e = min(k + on, L)
            d.line([(x0 + (x1 - x0) * k / L, y0 + (y1 - y0) * k / L), (x0 + (x1 - x0) * e / L, y0 + (y1 - y0) * e / L)], fill=col, width=w)
            k += on + off


def flecha(pts, col, w=4):
    dashed(pts, col, w, 12, 6)
    (xa, za), (xb, zb) = pts[-2], pts[-1]
    a = math.atan2(zb - za, xb - xa)
    tip = P(xb, zb)
    for s in (-1, 1):
        q = (tip[0] - math.cos(a + s * 0.5) * 14, tip[1] - math.sin(a + s * 0.5) * 14)
        d.line([tip, q], fill=col, width=w)


def barricada(x0, z0, x1, z1):
    rect(x0, z0, x1, z1, (120, 60, 40), (40, 16, 10), 2)
    a, b = P(x0, z0), P(x1, z1)
    for k in range(0, int(b[0] - a[0]) + int(b[1] - a[1]), 6):
        d.line([(a[0] + k, a[1]), (a[0], a[1] + k)], fill=(70, 30, 20), width=1)


d.text((M, 16), 'Los Paços · el patio de armas viejo, rehecho como el barrio de los ricos de la corte (propuesta)', font=f16, fill=(230, 215, 190))
d.text((M, 40), 'norte arriba; 1 cuadro = 10 m · lo nuevo, en color; lo que ya está, en gris', font=f11, fill=(170, 160, 145))
for x in range(-120, -29, 10):
    d.line([P(x, Z0), P(x, Z1)], fill=(34, 32, 30), width=1)
for z in range(-50, 27, 10):
    d.line([P(X0, z), P(X1, z)], fill=(34, 32, 30), width=1)

# la ciudad, al este
rect(-47, Z0, X1, Z1, (58, 46, 40), (58, 46, 40))
rect(-62, -50, -47, -23, (58, 46, 40), (58, 46, 40))
label(-38.5, -12, 'CIUDAD', f13, (200, 170, 150))

# la fortaleza: su frente del sur
rect(-126, -50, -62, -32, (70, 66, 62), w=3)
rect(-140, -44.8, -126, -30, (80, 76, 72), w=3)
label(-121, -40.5, 'COCINA', f11, (220, 215, 205))
rect(-106, -46, -90, -29, (92, 86, 80), w=3)
label(-98, -40.5, 'PUERTA DE LA\nFORTALEZA', f11, (240, 232, 220))
rect(-76, -46, -62, -32, (86, 80, 74), w=3)
label(-69, -39, 'TOMBO', f11, (225, 220, 210))
label(-90, -48.4, 'LA FORTALEZA del Rey · su torre del homenaje, más al norte ↑', f11, (200, 190, 175))

# las murallas del castillo viejo (las de siempre)
rect(-123, -32, -120, 23, (110, 104, 98), w=2)
rect(-123, 20, -48, 23, (110, 104, 98))
label(-104, 21.6, 'muralla sur', f9, (40, 36, 32))
rect(-64.2, 20, -59.4, 23, (130, 96, 60), (60, 40, 20), 1)
label(-61.8, 24.6, 'la brecha', f9, (220, 190, 150))
rect(-71, -23, -48, -20, (110, 104, 98), w=2)
label(-55.0, -21.5, 'muralla vieja (la coracha)', f9, (40, 36, 32))
rect(-93, 3.4, -90, 14.6, (100, 94, 88), (40, 36, 32), 1)

# lo que ya está y se queda (gris)
G0, GT = (118, 112, 104), (235, 230, 222)
for (x0, z0, x1, z1, t) in [
    (-120, -23, -111, -15.2, 'halco-\nnera'),
    (-120, -15.2, -111, 6, 'CUADRAS\nDEL REY'),
    (-120, 7.4, -114.6, 11.4, 'pajar'),
    (-116.4, 13.8, -103, 20, 'fragua del armero'),
    (-90, 4, -81, 14, 'TORRE DE\nLA CÁRCEL'),
    (-80, 13, -66, 20, 'cuartel'),
    (-66, 15.6, -52.5, 20, 'almacén · horno'),
    (-60, -20, -52, -14, 'capilla de la\nguarnición'),
    (-58.6, -14, -51, -7.4, 'secadero'),
    (-59, -7, -48, 5, 'TORRE-\nPUERTA'),
    (-120, -31.1, -107, -25.4, 'corral de\nla cocina'),
]:
    rect(x0, z0, x1, z1, G0, (40, 38, 36), 2)
    label((x0 + x1) / 2, (z0 + z1) / 2, t, f9, GT)
rect(-47, -3.5, -43, 3.5, (110, 104, 98), w=2)
label(-37, 0, '→ calle del Soto', f9, (230, 210, 190))
# la puerta de la torre de la cárcel (la salida)
d.line([P(-81, 7.3), P(-81, 8.7)], fill=(250, 220, 120), width=6)
# el altar de la guarnición
d.ellipse([P(-56.7, -19.2), P(-55.3, -17.8)], fill=(250, 200, 90))

# --- el patio de la guardia (nuevo, lo poco): el pozo en su casilla y el
# fundíbulo partido, detrás de la torre de la cárcel
rect(-63.4, 10.4, -60.2, 13.6, (150, 120, 80), (60, 40, 20), 2)
d.ellipse([P(-62.5, 11.3), P(-61.1, 12.7)], fill=(50, 60, 75))
label(-61.8, 15.2, 'el pozo,\nen su casilla', f9, (240, 225, 200))
rect(-91.5, 15.6, -82.5, 18.4, (130, 100, 70), (60, 40, 20), 1)
label(-87, 17, 'fundíbulo', f9, (240, 225, 200))
label(-53.8, 11.2, 'EL PATIO DE\nLA GUARDIA', f13, (235, 225, 205))

# --- los Paços
PIEDRA = (150, 136, 112)
CASA = (172, 120, 74)
CASA2 = (150, 100, 60)
# la cava: el foso, a lo largo de la fortaleza, con sus estacas; y el puente
rect(-107, -28, -62, -24, (40, 34, 30), (20, 18, 16), 2)
for x in range(-106, -62):
    if -101 <= x <= -95:
        continue
    for z in (-27, -25):
        d.line([P(x + 0.5, z - 0.4), P(x + 0.5, z + 0.4)], fill=(150, 120, 90), width=2)
rect(-100.5, -29, -95.5, -23.6, (150, 116, 74), (60, 40, 20), 2)
label(-98, -26.3, 'el puente', f9, (30, 20, 10))
placa(-80, -25.2, 'LA CAVA (el foso, a lo largo)', f9, (235, 215, 180), (40, 34, 30))
# la escalera de la cava, junto al pilar del puente
for k in range(4):
    rect(-95.3 + k * 0.7, -27.6, -94.6 + k * 0.7, -24.4, (110, 100, 90), (40, 36, 32), 1)
# el Terreiro
rect(-106, -24, -86, -12, (196, 184, 160), (60, 54, 46), 2)
label(-101.5, -13.8, 'EL TERREIRO', f13, (40, 34, 28))
d.ellipse([P(-96.9, -18.9), P(-95.1, -17.1)], fill=(90, 80, 70), outline=(20, 18, 16))
label(-96, -15.8, 'pelourinho', f9, (40, 34, 28))
rect(-88.6, -20.6, -86.2, -15.4, (120, 150, 170), (40, 50, 60), 2)
label(-91.2, -18, 'chafariz', f9, (40, 34, 28))
# la Rúa de los Paços (en codo) y la calleja de la Moneda
RUA = (176, 160, 136)
rect(-90, -12, -63.5, -8, RUA, (60, 54, 46), 1)
rect(-76, -8, -72, 3, RUA, (60, 54, 46), 1)
rect(-97, -12, -90, -2, RUA, (60, 54, 46), 1)
label(-71, -10, 'LA RÚA DE LOS PAÇOS', f9, (40, 34, 28))
# las casas
rect(-86, -24, -71, -12, CASA, (50, 30, 16), 3)
rect(-75, -24, -71, -20, CASA2, (50, 30, 16), 3)
label(-79.5, -18.4, 'PAÇO DEL\nMAYORDOMO\n(la cena,\nlos graneros)', f9, (255, 245, 230))
label(-73, -22, '▲', f9, (255, 230, 160))
rect(-71, -20, -63.5, -12, CASA, (50, 30, 16), 3)
label(-67.2, -16, 'CASA DE\nLAS\nDUEÑAS', f9, (255, 245, 230))
rect(-111, -12, -97, -2, CASA, (50, 30, 16), 3)
label(-104, -7, 'CASA DE LA\nMONEDA\n(el cambista)', f9, (255, 245, 230))
rect(-90, -8, -76, 3, CASA, (50, 30, 16), 3)
label(-83, -2.5, 'PAÇO DEL\nCANCILLER', f9, (255, 245, 230))
rect(-72, -8, -63.5, 3, (160, 150, 140), (50, 40, 30), 3)
label(-67.7, -3.5, 'CAPILLA DE\nLOS PAÇOS', f9, (30, 24, 20))
d.ellipse([P(-68.4, -7.2), P(-67, -5.8)], fill=(250, 200, 90))
# el pasadizo cubierto, por encima de la Rúa
a, b = P(-81, -12), P(-79, -8)
d.rectangle([a, b], outline=(250, 230, 180), width=2)
d.line([a, b], fill=(250, 230, 180), width=1)
d.line([(a[0], b[1]), (b[0], a[1])], fill=(250, 230, 180), width=1)
label(-80, -13.6, 'pasadizo', f9, (250, 230, 180))
# los jardines
rect(-111, -2, -93, 13.5, (88, 110, 64), (40, 56, 30), 2)
for (x, z) in [(-108, 1), (-104, 1), (-100, 1), (-108, 6), (-100, 6), (-106, 10.5), (-98, 10.5)]:
    d.ellipse([P(x - 0.9, z - 0.9), P(x + 0.9, z + 0.9)], fill=(60, 84, 44))
rect(-105.4, 4.4, -101.6, 7.6, (70, 96, 120), (30, 40, 50), 1)
label(-102, 9.0, 'LOS JARDINES\n(emparrado, estanque,\ncenador)', f9, (230, 240, 220))
# la cerca de los Paços, con su Puerta (encadenada por dentro)
CERCA = (214, 204, 186)
rect(-90, 3, -76, 3.6, CERCA, (60, 54, 46), 1)
rect(-72, 3, -63.5, 3.6, CERCA, (60, 54, 46), 1)
rect(-63.5, -20, -62.9, 3.6, CERCA, (60, 54, 46), 1)
rect(-93, 14.6, -92.4, 20, CERCA, (60, 54, 46), 1)
rect(-76, 2.8, -72, 3.8, (40, 40, 44), (230, 200, 90), 2)
label(-72.0, 5.3, 'PUERTA DE LA CERCA\n(encadenada por dentro)', f9, (250, 220, 120))
# las barricadas de la Rúa
barricada(-76, 0, -72, 1.4)
barricada(-83.4, -12, -82, -8)

# --- las entradas (desde otras zonas) y el atajo
AZUL, MORADO, ROJO, VERDE = (110, 170, 255), (200, 130, 230), (240, 90, 70), (120, 220, 120)
flecha([(-54, -27.2), (-62.4, -27.2), (-90, -27.2), (-93.4, -27.2), (-93.4, -22.5)], AZUL)
label(-55.5, -29.2, '1 · el portillo de la cava\n(la llave de la taberna)', f9, AZUL)
flecha([(-61.2, -24.4), (-64.6, -21.6), (-66.6, -19.3)], MORADO)
label(-56.0, -25.3, '2 · por arriba', f9, MORADO)
dashed([(-98, -31), (-98, -27.5)], ROJO, 4, 12, 6)
flecha([(-98, -25.1), (-98, -21.5)], ROJO)
label(-110.5, -35.5, '3 · el puente y\n4 · la poterna (fortaleza)', f9, ROJO)
flecha([(-109.2, -33.5), (-109.2, -25.6)], ROJO)
d.line([P(-75.6, 3.3), P(-72.4, 3.3)], fill=VERDE, width=5)
label(-72.0, 7.8, 'el atajo: la cadena\nse suelta desde dentro', f9, VERDE)

# --- el recorrido del principio: de la torre de la cárcel a la torre-puerta,
# con la capilla (el altar)
dashed([(-80.6, 8), (-79.2, 9.7), (-64.4, 9.7), (-61.8, 6.2), (-61.6, 4.0), (-61.2, -6), (-60.4, -12.6), (-57.2, -13.6), (-61.2, -11), (-61.4, 3.8), (-57.6, 7.6), (-54.4, 5.6), (-54.4, 1)], (250, 210, 90), 3)

# la rosa
cx, cz = -36, -40
d.line([P(cx, cz + 2.8), P(cx, cz - 2.8)], fill=(220, 210, 190), width=2)
label(cx, cz - 4.2, 'N', f11, (220, 210, 190))

d.text((M, H - 132), 'La línea amarilla: el principio, como ahora: de la torre de la cárcel a la capilla (el altar) y a la torre-puerta, por el patio de la guardia;\nla Puerta de la Cerca, delante, encadenada. Los Paços no se abren desde aquí: se entra por la cava (1, con la llave de la taberna), por los\ntejados desde la muralla vieja (2) o desde la fortaleza (3 y 4); la cadena de la Puerta se suelta desde dentro (el atajo).', font=f11, fill=(220, 205, 180))
d.text((M, H - 72), 'Del Terreiro a la Puerta de la Cerca se llega siempre sin nada de fuera (por la planta baja del mayordomo o por la Rúa, rodeando las barricadas);\nlas llaves guardan las salas: la sala de la cena (la llave del mayordomo), la cámara del cambista. Debajo, como hasta ahora: las mazmorras (−5)\ny el paso de la cárcel del Rey (−7), que pasa bajo la cava por el eje de la puerta: la cava no baja más de lo que bajaba el foso.', font=f11, fill=(170, 160, 145))
for x in range(-120, -29, 10):
    label(x, Z0 - 1.8, str(x), f9, (130, 120, 110))
for z in range(-50, 27, 10):
    d.text((P(X0, z)[0] - 30, P(X0, z)[1] - 6), str(z), font=f9, fill=(130, 120, 110))
im.save('docs/planos/plan_pacos.png')
print(W, H)
