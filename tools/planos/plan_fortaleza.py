# Plano de la fortaleza-palacio (PLAN_FORTALEZA.md), dibujado a escala.
from PIL import Image, ImageDraw, ImageFont
X0, X1, Z0, Z1 = -146, -36, -132, 30
S = 8  # px por metro
M = 40  # margen
W, H = int((X1 - X0) * S) + 2 * M, int((Z1 - Z0) * S) + 2 * M + 60
im = Image.new('RGB', (W, H), (24, 22, 20))
d = ImageDraw.Draw(im)
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f9, f11, f13, f16, f22 = (ImageFont.truetype(F, 11), ImageFont.truetype(F, 13), ImageFont.truetype(FB, 14), ImageFont.truetype(FB, 17), ImageFont.truetype(FB, 24))
def P(x, z): return (M + (x - X0) * S, M + 60 + (z - Z0) * S)
def rect(x0, z0, x1, z1, fill, outline=(10, 10, 10), w=2):
    a, b = P(x0, z0), P(x1, z1)
    d.rectangle([a, b], fill=fill, outline=outline, width=w)
def label(x, z, t, font=f11, col=(20, 18, 16), anchor='mm'):
    d.multiline_text(P(x, z), t, font=font, fill=col, anchor=anchor, align='center')
def dashed(x0, z0, x1, z1, col=(140, 120, 100)):
    a, b = P(x0, z0), P(x1, z1)
    for k in range(int(a[0]), int(b[0]), 12):
        d.line([(k, a[1]), (min(k + 6, b[0]), a[1])], fill=col, width=2); d.line([(k, b[1]), (min(k + 6, b[0]), b[1])], fill=col, width=2)
    for k in range(int(a[1]), int(b[1]), 12):
        d.line([(a[0], k), (a[0], min(k + 6, b[1]))], fill=col, width=2); d.line([(b[0], k), (b[0], min(k + 6, b[1]))], fill=col, width=2)
# título
d.text((M, 18), 'La fortaleza-palacio de Braga · planta (norte arriba; 1 cuadro = 10 m)', font=f16, fill=(230, 215, 190))
# rejilla de 10 m
for x in range(-140, -36, 10):
    d.line([P(x, Z0), P(x, Z1)], fill=(34, 32, 30), width=1)
for z in range(-130, 31, 10):
    d.line([P(X0, z), P(X1, z)], fill=(34, 32, 30), width=1)
# la ciudad (al este)
rect(-47, -132, -36, 30, (58, 46, 40), (58, 46, 40))
for k in range(-132, 30, 4):
    d.line([P(-47, k), P(-36, k + 4)], fill=(70, 56, 48), width=1)
label(-41.5, -60, 'CIUDAD', f13, (200, 170, 150))
# muralla norte, fanal, atalaya, coracha
rect(-140, -126, -47, -122, (120, 116, 110))
label(-100, -124, 'muralla norte · adarve · el MIRADOR', f9, (20, 20, 20))
rect(-64, -128, -56, -120, (150, 146, 140)); label(-60, -124, 'FANAL', f9)
rect(-64, -113, -56, -105, (150, 146, 140)); label(-60, -109, 'ATA-\nLAYA', f9)
rect(-62, -105, -58, -28, (126, 122, 116), w=1); label(-60, -70, 'C\nO\nR\nA\nC\nH\nA', f9)
# jardín del Rey
rect(-138, -122, -64, -100, (62, 92, 56))
label(-126, -111, 'JARDÍN DEL REY\nalberca · fuente · pomar\ncolmenas · palomar', f11, (230, 240, 220))
label(-76, -111, 'naranjos\nsecos', f9, (220, 235, 210))
# la fortaleza: alas
rect(-138, -100, -64, -32, (96, 90, 84), w=3)
rect(-138, -89, -124, -43, (150, 70, 60)); label(-131, -66, 'GRAN\nSALÓN\n14 × 40\n(la Corte)', f13, (250, 235, 220))
rect(-78, -89, -64, -58, (70, 92, 140)); label(-71, -74, 'CAPILLA\nREAL\n(tribuna,\ncampanario)', f11, (235, 240, 250))
rect(-78, -58, -64, -43, (170, 140, 100)); label(-71, -50.5, 'CANCI-\nLLERÍA', f11)
rect(-127, -46, -107, -32, (150, 120, 90)); label(-117, -39, 'despensa ·\nbotillería', f11)
rect(-107, -46, -95, -32, (90, 84, 78)); label(-101, -39, 'PUERTA\n(2 rastrillos)', f9, (240, 230, 220))
rect(-95, -46, -75, -32, (130, 112, 96)); label(-85, -39, 'cuerpo de guardia ·\narmería y taller\n(la ballesta)', f9)
rect(-127, -100, -114, -86, (120, 90, 130)); label(-120.5, -93, 'cámaras de\nla reina', f11, (245, 235, 250))
rect(-88, -100, -75, -86, (140, 100, 70)); label(-81.5, -93, 'cámaras\ndel Rey ·\ntesoro', f11, (250, 240, 230))
# patio de honor y claustro
rect(-124, -86, -78, -46, (182, 170, 150))
for (a, b, c, e) in [(-124, -86, -120, -46), (-82, -86, -78, -46), (-124, -50, -78, -46)]:
    rect(a, b, c, e, (160, 148, 128), (120, 110, 96), 1)
    if c - a < 5:
        for z in range(int(b) + 2, int(e), 4):
            d.ellipse([P((a + c) / 2 - 0.5, z - 0.5), P((a + c) / 2 + 0.5, z + 0.5)], fill=(90, 84, 76))
    else:
        for x in range(int(a) + 2, int(c), 4):
            d.ellipse([P(x - 0.5, (b + e) / 2 - 0.5), P(x + 0.5, (b + e) / 2 + 0.5)], fill=(90, 84, 76))
label(-101, -66, 'PATIO DE HONOR · 46 × 40\n(claustro en dos alturas)', f16, (40, 34, 28))
label(-112, -60, 'olmo\nseco', f9); d.ellipse([P(-113.5, -64.5), P(-110.5, -61.5)], fill=(70, 60, 50))
label(-90, -60, 'brocal del\naljibe', f9); d.ellipse([P(-91, -64), P(-89, -62)], fill=(80, 80, 90))
d.ellipse([P(-103, -74), P(-99, -70)], outline=(60, 60, 70), width=2); label(-101, -76, 'fuente', f9)
# escalinata de la torre
rect(-105, -86, -97, -80, (140, 132, 120), (80, 74, 66), 1); label(-101, -83, 'escalinata', f9)
# la torre del homenaje
rect(-114, -112, -88, -86, (58, 52, 50), w=4)
for (a, b) in [(-114, -112), (-91, -112), (-114, -89), (-91, -89)]:
    rect(a, b, a + 3, b + 3, (80, 74, 70), w=2)
label(-101, -99, 'TORRE DEL\nHOMENAJE\n26 × 26 · 34 m\n(sala del trono:\nel REY)', f13, (250, 230, 190))
# torres de las esquinas
for (x0, z0, t) in [(-138, -43, 'COCINA'), (-75, -43, 'TOMBO'), (-138, -100, 'REINA'), (-75, -100, 'CORACHA\n(altar)')]:
    rect(x0, z0, x0 + 11, z0 + 11, (110, 104, 98), w=3); label(x0 + 5.5, z0 + 5.5, t, f11, (250, 245, 235))
# puerta del adarve de la coracha
d.line([P(-64, -94.5), P(-62, -94.5)], fill=(240, 200, 120), width=5)
# el eje
for z in range(-31, -86, -3):
    d.line([P(-101, z), P(-101, z - 1.5)], fill=(240, 200, 120), width=2)
# el foso y el puente
rect(-108, -32, -94, -27, (40, 34, 30)); rect(-103.5, -32, -98.5, -27, (120, 96, 70), (60, 50, 40), 1); label(-101, -29.5, 'puente', f9, (240, 230, 220))
# patio de armas
rect(-120, -27, -47, 24, (120, 106, 84), w=3)
rect(-120, -32, -108, -27, (120, 106, 84), (120, 106, 84), 1); rect(-94, -32, -64, -27, (120, 106, 84), (120, 106, 84), 1)
label(-84, -16, 'PATIO DE ARMAS · 73 × 56', f16, (35, 28, 20))
rect(-90, 4, -81, 14, (100, 94, 88), w=2); label(-85.5, 9, 'TORRE DE\nLA CÁRCEL', f9, (240, 235, 230))
rect(-59, -7, -48, 5, (100, 94, 88), w=2); label(-53.5, -1, 'TORRE-\nPUERTA', f9, (240, 235, 230))
rect(-47, -3.5, -43, 3.5, (110, 104, 98), w=2); label(-38, 0, 'barbacana →\ncalle del Soto', f9, (230, 210, 190))
rect(-62, -20, -54, -14, (130, 120, 110), w=2); label(-58, -17, 'capilla\n(altar)', f9)
rect(-80, 13, -66, 20, (130, 112, 96), w=2); label(-73, 16.5, 'cuartel', f9)
rect(-120, -22, -112, 6, (130, 112, 96), w=2); label(-116, -8, 'cuadras ·\nhalconera', f9)
rect(-112, 12, -102, 20, (140, 100, 80), w=2); label(-107, 16, 'fragua', f9)
d.ellipse([P(-63, 11), P(-60.6, 13.4)], fill=(60, 60, 70)); label(-61.8, 9.4, 'pozo', f9)
label(-97, -10, 'fundíbulo\nroto', f9)
rect(-120, 20, -47, 24, (110, 104, 98)); label(-84, 22, 'muralla sur · la brecha', f9, (230, 225, 220))
# mazmorras (de puntos)
dashed(-96, -24, -46, 24, (190, 160, 120)); label(-71, -3, 'mazmorras del principio (−5)', f11, (230, 200, 160))
dashed(-124, -80, -80, -34, (200, 120, 110)); label(-102, -52.5, 'mazmorras del castillo (−5) y aljibe del palacio', f9, (120, 40, 30))
d.line([P(-88.5, -20), P(-84.5, -20)], fill=(220, 80, 60), width=5); label(-79, -21.5, 'RASTRILLO', f11, (240, 120, 100))
dashed(-98, -132, -46, -85, (100, 130, 160)); label(-72, -129, 'debajo: la cripta honda (no se cava)', f9, (150, 180, 210))
# leyenda de recorrido
d.text((M, H - 34), 'Se entra a media partida por la coracha (torre de la coracha) y se baja por dentro; el puente levadizo y el rastrillo son los atajos.', font=f11, fill=(220, 205, 180))
im.save('docs/planos/plan_fortaleza.png')
print(W, H)
