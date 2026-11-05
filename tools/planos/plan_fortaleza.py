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
label(-118, -124, 'muralla norte · adarve del jardín', f9, (20, 20, 20))
rect(-64, -128, -56, -120, (150, 146, 140)); label(-60, -124, 'FANAL', f9)
rect(-64, -113, -56, -105, (150, 146, 140)); label(-60, -109, 'ATA-\nLAYA', f9)
rect(-62, -105, -58, -23, (126, 122, 116), w=1); label(-60, -70, 'C\nO\nR\nA\nC\nH\nA', f9)
# jardín del Rey: el crucero con la fuente, la alberca, el pomar, el palomar,
# el colmenar, el vivero; la escalera del adarve y el mirador, volado
rect(-138, -122, -62, -100, (62, 92, 56))
for (a, b, c, e) in [(-136.7, -119.7, -125.8, -112.8), (-123.2, -120.2, -112.7, -112.8), (-137.7, -110.2, -131.8, -102.3), (-129.4, -110.2, -125.8, -102.3), (-123.2, -110.2, -112.7, -100.3)]:
    rect(a, b, c, e, (78, 108, 66), (150, 96, 76), 1)
d.ellipse([P(-126.4, -113.4), P(-122.6, -109.6)], fill=(150, 146, 140), outline=(60, 60, 60))
label(-130.5, -116.2, 'JARDÍN\nDE LA REINA', f11, (230, 240, 220)); label(-124.5, -107.6, 'fuente', f9, (230, 240, 220))
rect(-106.4, -119, -89.6, -114.2, (150, 146, 140), (60, 60, 60), 1); rect(-106, -118.6, -90, -114.6, (110, 104, 92), (110, 104, 92), 1); label(-98, -116.6, 'alberca', f9, (240, 240, 230))
rect(-82.6, -119.6, -78.2, -115.2, (220, 214, 200), (60, 60, 60), 2); label(-80.4, -117.4, 'palo-\nmar', f9)
rect(-79.5, -110.6, -71.5, -106.2, (60, 70, 72), (150, 146, 140), 2); label(-75.5, -108.4, 'vivero', f9, (230, 235, 240))
rect(-75, -102.9, -66.4, -102, (200, 170, 110), (90, 70, 40), 1); label(-70.7, -104.2, 'colmenas', f9, (230, 240, 220))
rect(-76, -122, -66, -120.4, (140, 136, 130), (60, 60, 60), 1); label(-71, -119.2, 'escalera del adarve', f9, (230, 240, 220))
label(-70, -113.6, 'POMAR', f11, (230, 240, 220))
rect(-101, -128.4, -95, -126, (170, 164, 156), (40, 40, 40), 2); label(-118, -129.4, 'MIRADOR del Rey (↑ el campamento)', f9, (230, 225, 215))
d.line([P(-131.25, -102), P(-129.95, -102)], fill=(240, 200, 120), width=5); label(-136, -103.6, 'puerta', f9, (240, 220, 180))
# la fortaleza: alas
rect(-138, -100, -62, -32, (96, 90, 84), w=3)
rect(-135.6, -86, -121.2, -47.2, (150, 70, 60)); label(-128.4, -66, 'GRAN\nSALÓN\n14 × 39\n(la Corte)', f13, (250, 235, 220))
# la galería del salón, en el grueso del muro (+5,5), de la torre de la reina a la cocina
rect(-137.4, -89.2, -136.2, -42.8, (200, 150, 110), (90, 60, 40), 1)
label(-143, -66, 'G\nA\nL\nE\nR\nÍ\nA', f9, (220, 190, 160))
rect(-74.8, -86, -64.4, -60.6, (70, 92, 140)); label(-69.6, -73, 'CAPILLA\nREAL\n(tribuna,\naltar)', f11, (235, 240, 250))
# la tribuna del Rey (+4,5) y el campanario sobre el presbiterio
rect(-74.8, -86, -72.4, -64.6, (110, 130, 170), (50, 60, 90), 1); rect(-74.8, -64.6, -64.4, -60.6, (110, 130, 170), (50, 60, 90), 1)
rect(-72.2, -85.2, -68.2, -81.2, (210, 200, 180), (40, 40, 50), 2); label(-70.2, -83.2, 'camp.', f9, (40, 40, 50))
rect(-74.8, -59.4, -64.4, -46, (170, 140, 100)); label(-69.6, -52.7, 'CANCI-\nLLERÍA', f11)
rect(-126, -44.8, -106, -34.4, (150, 120, 90)); label(-116, -39.6, 'despensa ·\nbotillería', f11)
rect(-106, -46, -90, -29, (90, 84, 78)); label(-98, -39, 'PUERTA\n(rastrillo ·\ntorno)', f9, (240, 230, 220))
rect(-90, -44.8, -76, -34.4, (130, 112, 96)); label(-83, -39.6, 'cuerpo de guardia ·\narmería y taller\n(la ballesta)', f9)
rect(-126, -97.6, -111, -87.2, (120, 90, 130)); label(-118.5, -92.4, 'estrado de las damas\n· sala de la reina\n(+5,5)', f9, (245, 235, 250))
rect(-85, -97.6, -76, -87.2, (140, 100, 70)); label(-80.5, -92.4, 'antecámara\n· cámara\ndel Rey\n(+4,5)', f9, (250, 240, 230))
# el pasadizo del Rey (+12), por el adarve norte, a la torre
rect(-85, -100, -76, -97.6, (60, 40, 30), (30, 20, 16), 1); label(-78.8, -103.4, 'pasadizo (+12)', f9, (220, 200, 180))
# patio de honor y claustro
rect(-120, -86, -76, -46, (182, 170, 150))
for (a, b, c, e) in [(-120, -86, -116, -46), (-80, -86, -76, -46), (-120, -50, -76, -46)]:
    rect(a, b, c, e, (160, 148, 128), (120, 110, 96), 1)
    if c - a < 5:
        for z in range(int(b) + 2, int(e), 4):
            d.ellipse([P((a + c) / 2 - 0.5, z - 0.5), P((a + c) / 2 + 0.5, z + 0.5)], fill=(90, 84, 76))
    else:
        for x in range(int(a) + 2, int(c), 4):
            d.ellipse([P(x - 0.5, (b + e) / 2 - 0.5), P(x + 0.5, (b + e) / 2 + 0.5)], fill=(90, 84, 76))
label(-98, -60, 'PATIO DE HONOR · 44 × 40\n(claustro)', f16, (40, 34, 28))
label(-108, -73, 'olmo\nseco', f9); d.ellipse([P(-109.6, -77.6), P(-106.4, -74.4)], fill=(70, 60, 50))
label(-87.75, -55.5, 'brocal del\naljibe', f9); d.ellipse([P(-88.75, -60.25), P(-86.75, -58.25)], fill=(80, 80, 90))
d.ellipse([P(-101, -71), P(-95, -65)], outline=(60, 60, 70), width=2); label(-98, -64, 'fuente', f9)
# escalinata de la torre
rect(-109.4, -86, -86.6, -83, (140, 132, 120), (80, 74, 66), 1); label(-98, -84.5, 'escalinata', f9)
# la torre del homenaje
rect(-111, -112, -85, -86, (58, 52, 50), w=4)
for (a, b) in [(-112, -113), (-87.4, -113), (-112, -88.4), (-87.4, -88.4)]:
    rect(a, b, a + 3.6, b + 3.6, (80, 74, 70), w=2)
# (por dentro: el muro de carga, de poniente a levante, y la caja del caracol, en el rincón del noroeste)
rect(-108.4, -101.5, -87.6, -100.5, (84, 78, 74), (84, 78, 74), 1)
rect(-108.4, -109.4, -104.8, -105.8, (96, 90, 86), (20, 18, 16), 1); label(-106.6, -107.6, 'car.', f9, (230, 220, 200))
label(-98, -99.1, 'TORRE DEL HOMENAJE', f13, (250, 230, 190)); label(-98, -95.9, '26 × 26 · 34 m\n(sala del trono: el REY\nterraza: el CABALLERO)', f9, (250, 230, 190))
# torres de las esquinas
for (x0, z0, x1, z1, t) in [(-140, -44.8, -126, -30, 'COCINA\n(secadero)'), (-76, -46, -62, -32, 'TOMBO'), (-140, -102, -126, -87.2, 'REINA\n(oratorio ·\ncámara)'), (-76, -102, -62, -86, 'CORACHA\n(altar · oratorio\ndel Rey · tesoro)')]:
    rect(x0, z0, x1, z1, (110, 104, 98), w=3); label((x0 + x1) / 2, (z0 + z1) / 2, t, f11, (250, 245, 235))
# puerta del adarve de la coracha
d.line([P(-64, -95.4), P(-62, -95.4)], fill=(240, 200, 120), width=5)
# el adarve de levante (+12): de la torre de la coracha, por su puerta y su
# puente, a la terraza de la cancillería y a la puerta del Tombo
rect(-64.4, -86, -62, -60.6, (170, 150, 110), (90, 70, 40), 1)
d.line([P(-65.6, -86), P(-64.4, -86)], fill=(240, 200, 120), width=5)
d.line([P(-66.6, -46), P(-65.4, -46)], fill=(240, 200, 120), width=5)
label(-56.5, -82, 'adarve de\nlevante\n(+12)', f9, (230, 210, 180))
label(-69.6, -47.6, 'terraza (+12)', f9, (60, 40, 20))
# el eje
for z in range(-29, -86, -3):
    d.line([P(-98, z), P(-98, z - 1.5)], fill=(240, 200, 120), width=2)
# patio de armas: el recinto entero, de la muralla de poniente (corrida) a la
# de levante, con lo que se hizo en lo ganado
rect(-123, -32, -120, 23, (110, 104, 98), w=2)
rect(-120, -32, -62, -23, (120, 106, 84), (120, 106, 84), 1)
rect(-120, -23, -48, 20, (120, 106, 84), w=3)
rect(-71, -23, -48, -20, (110, 104, 98), w=2); label(-59.5, -24.6, 'muralla norte (la escalera rota)', f9, (230, 210, 190))
label(-76, -8.6, 'PATIO DE ARMAS · 73 × 56', f16, (35, 28, 20))
rect(-90, 4, -81, 14, (100, 94, 88), w=2); label(-85.5, 9, 'TORRE DE\nLA CÁRCEL', f9, (240, 235, 230))
rect(-93, 3.4, -90, 14.6, (96, 88, 80), (40, 36, 32), 1)
rect(-59, -7, -48, 5, (100, 94, 88), w=2); label(-53.5, -1, 'TORRE-\nPUERTA', f9, (240, 235, 230))
rect(-47, -3.5, -43, 3.5, (110, 104, 98), w=2); label(-38, 0, 'barbacana →\ncalle del Soto', f9, (230, 210, 190))
rect(-60, -20, -52, -14, (130, 120, 110), w=2); label(-56, -17, 'capilla\n(altar)', f9)
rect(-80, 13, -66, 20, (130, 112, 96), w=2); label(-73, 16.5, 'cuartel', f9)
rect(-120, -23, -111, -15.2, (138, 118, 98), w=2); label(-115.5, -19.1, 'halco-\nnera', f9)
rect(-120, -15.2, -111, 6, (130, 112, 96), w=2); label(-115.5, -4.6, 'CUADRAS', f9)
rect(-120, -31.1, -107, -25.4, (106, 96, 76), (60, 50, 40), 2); label(-113.5, -28.2, 'corral de\nla cocina', f9, (235, 225, 210))
d.line([P(-113.6, -32), P(-112.4, -32)], fill=(240, 200, 120), width=5); label(-118, -34.2, 'poterna', f9, (240, 220, 180))
rect(-120, 7.4, -114.6, 11.4, (170, 150, 90), (90, 80, 50), 1); label(-111, 9.4, 'pajar ·\ncarros', f9)
rect(-116.4, 13.8, -103, 20, (140, 100, 80), w=2); label(-109.7, 16.9, 'fragua', f9)
rect(-128, -9, -122, -3, (110, 104, 98), w=2)
rect(-124.5, 18.5, -118.5, 24.5, (110, 104, 98), w=2)
d.ellipse([P(-63, 11), P(-60.6, 13.4)], fill=(60, 60, 70)); label(-61.8, 9.4, 'pozo', f9)
rect(-103.4, -10, -100.6, -2, (90, 74, 56), (50, 40, 30), 1); label(-102, 0.2, 'fundíbulo\nroto', f9)
# el foso de las estacas y el puente levadizo (bajado)
rect(-102, -28, -94, -24, (40, 34, 30)); rect(-100.5, -29, -95.5, -23.8, (120, 96, 70), (60, 50, 40), 1); label(-98, -26.4, 'puente', f9, (240, 230, 220))
# el cadalso, colgado de la torre de levante de la puerta y de la muralla de la guardia, con la garita del alférez
for (a, b, c, e) in [(-95.3, -29, -88.2, -27.2), (-90, -30.2, -88.2, -29), (-90, -32, -76, -30.2)]:
    rect(a, b, c, e, (150, 110, 70), (70, 50, 30), 1)
rect(-77.8, -32, -76, -30.2, (110, 76, 46), (60, 40, 24), 1)
label(-80.5, -28.6, 'cadalso (el ALFÉREZ)', f9, (240, 220, 190))
rect(-123, 20, -48, 23, (110, 104, 98)); label(-84, 21.5, 'muralla sur · la brecha', f9, (230, 225, 220))
# mazmorras (de puntos)
dashed(-96, -24, -46, 24, (190, 160, 120)); label(-71, -3, 'mazmorras del principio (−5)', f11, (230, 200, 160))
# la cárcel del Rey (−7), bajo la fortaleza y el patio de armas: la bajada
# desde la trampilla del almacén de la torre, la sala de los carceleros, la
# cárcel, el aljibe del palacio, los pasos del eje, el cuarto de los
# verdugos, la capilla de los reos y la subida al rastrillo, al fondo del
# pasillo de las celdas de la mazmorra del principio
for (x0, z0, x1, z1) in [(-107, -93, -105, -84.5), (-110.5, -84.5, -101.5, -76), (-112, -75, -100, -52.5), (-99, -70.5, -81, -52.5), (-98, -52.5, -96, -41.5), (-100, -41.5, -94, -29), (-98, -29, -96, -15.5), (-100.5, -15.5, -93.5, -8.5), (-93.5, -13, -89.5, -11)]:
    dashed(x0, z0, x1, z1, (200, 120, 110))
rect(-107, -93, -105, -89, (120, 40, 34), (200, 120, 110), 1)
label(-106, -81.4, 'cárcel del\nRey (−7)', f9, (120, 40, 30)); label(-102.2, -91, 'trampilla', f9, (240, 200, 180), 'lm')
label(-90, -66.5, 'aljibe del palacio', f9, (120, 40, 30))
label(-97, -31, 'verdugos', f9, (240, 220, 200))
label(-97, -12, 'reos', f9, (240, 210, 190))
d.line([P(-89.25, -13), P(-89.25, -11)], fill=(220, 80, 60), width=5); label(-87.5, -16, 'RASTRILLO', f11, (240, 120, 100))
dashed(-98, -132, -46, -85, (100, 130, 160)); label(-72, -129, 'debajo: la cripta honda (no se cava)', f9, (150, 180, 210))
# leyenda de recorrido
d.text((M, H - 34), 'Se entra por la coracha (su torre) y se baja por dentro; de la torre, por su trampilla, a la cárcel del Rey.\nAtajos: el puente levadizo, la poterna, la puerta del Tombo, el rastrillo.', font=f11, fill=(220, 205, 180))
im.save('docs/planos/plan_fortaleza.png')
print(W, H)
