// El cuerpo de un coloso para chocar con él: cápsulas entre puntos de sus
// huesos (y esferas: cápsulas de largo cero), recalculadas cada fotograma.
//   - el jugador, en el suelo, no lo atraviesa: se le empuja fuera en
//     horizontal (las piernas, el alba, la cola, la campana, la mano plantada)
//   - la cámara no se mete dentro: un rayo contra todas (también el torso,
//     los brazos y la cabeza)
import * as THREE from 'three';

const _ab = new THREE.Vector3(),
  _ao = new THREE.Vector3(),
  _oc = new THREE.Vector3();

// El rayo (O, D unitaria) contra la cápsula a-b de radio r: la distancia al
// punto de entrada, o -1 (Íñigo Quílez, «capsule intersection»). Si el
// origen está dentro, -1 (desde dentro no tapa).
export function rayCapsule(O, D, a, b, r) {
  _ab.subVectors(b, a);
  _ao.subVectors(O, a);
  const baba = _ab.dot(_ab),
    bard = _ab.dot(D),
    baoa = _ab.dot(_ao),
    rdoa = D.dot(_ao),
    oaoa = _ao.dot(_ao);
  if (baba < 1e-8) {
    // esfera
    const bq = rdoa,
      c = oaoa - r * r;
    if (c < 0) return -1;
    const h = bq * bq - c;
    if (h < 0) return -1;
    const t = -bq - Math.sqrt(h);
    return t > 0 ? t : -1;
  }
  const A = baba - bard * bard;
  let B = baba * rdoa - baoa * bard;
  let C = baba * oaoa - baoa * baoa - r * r * baba;
  // (dentro del cilindro o de una tapa: no tapa)
  const y0 = baoa;
  if (C < 0 && y0 > 0 && y0 < baba) return -1;
  let h = B * B - A * C;
  if (h >= 0 && A > 1e-8) {
    const t = (-B - Math.sqrt(h)) / A;
    const y = baoa + t * bard;
    if (y > 0 && y < baba) return t > 0 ? t : -1;
    // las tapas
    _oc.copy(O).sub(y <= 0 ? a : b);
    B = D.dot(_oc);
    C = _oc.dot(_oc) - r * r;
    if (C < 0) return -1;
    h = B * B - C;
    if (h > 0) {
      const t2 = -B - Math.sqrt(h);
      return t2 > 0 ? t2 : -1;
    }
  }
  return -1;
}

export class ColBody {
  constructor() {
    this.caps = [];
    this.n = 0;
  }
  // empieza la lista de este fotograma
  begin() {
    this.n = 0;
  }
  // una cápsula de a a b (mundo), radio r; ground: también empuja al
  // jugador en el suelo (si no, sólo tapa a la cámara)
  add(a, b, r, ground = true) {
    let c = this.caps[this.n];
    if (!c) this.caps.push((c = { a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0, ground: true }));
    c.a.copy(a);
    c.b.copy(b);
    c.r = r;
    c.ground = ground;
    this.n++;
    return c;
  }
  // Empuja fuera (en horizontal) un cuerpo vertical de pies en P, radio pr y
  // alto ph. Devuelve cuánto lo ha movido (0: no tocaba).
  push(P, pr, ph) {
    let moved = 0;
    for (let i = 0; i < this.n; i++) {
      const c = this.caps[i];
      if (!c.ground) continue;
      // el punto del eje de la cápsula más cercano a la vertical del jugador
      const ax = c.b.x - c.a.x,
        ay = c.b.y - c.a.y,
        az = c.b.z - c.a.z;
      const L2 = ax * ax + ay * ay + az * az;
      // (a la altura del pecho, acotada al alto del cuerpo)
      let t = 0;
      if (L2 > 1e-8) {
        const px = P.x - c.a.x,
          py = P.y + ph * 0.5 - c.a.y,
          pz = P.z - c.a.z;
        // en planta, ponderando poco la altura
        t = (px * ax + py * ay * 0.3 + pz * az) / (ax * ax + ay * ay * 0.3 + az * az || 1e-8);
        t = t < 0 ? 0 : t > 1 ? 1 : t;
      }
      const cx = c.a.x + ax * t,
        cy = c.a.y + ay * t,
        cz = c.a.z + az * t;
      // ¿a su altura? (la cápsula alcanza del suelo a la cabeza del jugador)
      if (cy - c.r > P.y + ph || cy + c.r < P.y) continue;
      // el radio a la altura del jugador (una esfera se estrecha arriba y abajo)
      const dy = Math.max(0, Math.max(P.y - cy, cy - (P.y + ph)));
      const rr = Math.sqrt(Math.max(0, c.r * c.r - dy * dy));
      const dx = P.x - cx,
        dz = P.z - cz;
      const d = Math.hypot(dx, dz);
      const R = rr + pr;
      if (d >= R) continue;
      if (d < 1e-4) {
        P.x += R;
        moved += R;
        continue;
      }
      P.x = cx + (dx / d) * R;
      P.z = cz + (dz / d) * R;
      moved += R - d;
    }
    return moved;
  }
  // El rayo O + D·t (D unitaria) hasta len: la distancia al primer choque,
  // o Infinity.
  ray(O, D, len) {
    let best = Infinity;
    for (let i = 0; i < this.n; i++) {
      const c = this.caps[i];
      const t = rayCapsule(O, D, c.a, c.b, c.r);
      if (t > 0 && t < best && t < len) best = t;
    }
    return best;
  }
  // ¿el punto está dentro de alguna? (la cámara)
  inside(P, margin = 0) {
    for (let i = 0; i < this.n; i++) {
      const c = this.caps[i];
      const ax = c.b.x - c.a.x,
        ay = c.b.y - c.a.y,
        az = c.b.z - c.a.z;
      const L2 = ax * ax + ay * ay + az * az;
      let t = L2 > 1e-8 ? ((P.x - c.a.x) * ax + (P.y - c.a.y) * ay + (P.z - c.a.z) * az) / L2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = P.x - c.a.x - ax * t,
        dy = P.y - c.a.y - ay * t,
        dz = P.z - c.a.z - az * t;
      if (dx * dx + dy * dy + dz * dz < (c.r + margin) * (c.r + margin)) return true;
    }
    return false;
  }
}
