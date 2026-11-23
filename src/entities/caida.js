// La caída: el cuerpo de quien muere, que deja de sostenerse.
//
// Antes, cada criatura caía con su clip de muerte: unas pocas poses fijas (de
// rodillas y, de un golpe, el cuerpo entero de bruces o de espaldas, como una
// tabla) y se quedaba en la última, tiesa: las piernas rectas, un brazo en el
// aire, la cabeza en su sitio, el escudo de canto. Ahora, al morir, el cuerpo
// es un muñeco de trapo: unos puntos (la pelvis, el cuello, la coronilla, los
// hombros, codos, muñecas y manos, las caderas, rodillas, tobillos y puntas de
// los pies) que caen con la gravedad, el empujón del golpe y lo que llevaba
// de carrera, unidos por sus huesos (el tronco, rígido; los miembros, con sus
// articulaciones y sus topes: las rodillas y los codos sólo se doblan hacia
// donde se doblan, el cuello no da la vuelta) y que chocan con el suelo y con
// las paredes del mundo (world/collision.js): por una escalera rueda, contra
// un muro se queda sentado. Los primeros instantes aún le queda algo de
// fuerza (los brazos y la cabeza la pierden en medio segundo; las piernas,
// enseguida: se le doblan las rodillas) y la espalda se le afloja; luego,
// nada. Cuando deja de moverse, se queda así.
//
// De los puntos se sacan los giros de las articulaciones del esqueleto (las
// mismas que usan las poses: rig.apply), así que lo que va colgado de ellas
// (la ropa, las armas, el escudo, la corona) sigue al cuerpo.
//   puedeCaer(rig): si el esqueleto es de persona (los quince huesos).
//   new Caida(game, rig, obj, o): o.de (de dónde vino el golpe: {x, z}),
//     o.fuerte (golpe pesado), o.vel ({x, z}: su carrera), o.adelante (hacia
//     dónde miraba: yaw).
//   caida.update(dt): un paso (nada, si ya está quieto).
//   caida.pose(out): sus giros (radianes) y su 'root', para rig.apply.
import * as THREE from 'three';
import { q2e } from './rig.js';

const J = ['hips', 'chest', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'legL', 'shinL', 'footL', 'legR', 'shinR', 'footR'];
export const puedeCaer = (rig) => !!rig && J.every((j) => rig.joints[j]);

// los puntos
const HIP = 0,
  NECK = 1,
  HEAD = 2,
  SHL = 3,
  ELL = 4,
  WRL = 5,
  HAL = 6,
  SHR = 7,
  ELR = 8,
  WRR = 9,
  HAR = 10,
  THL = 11,
  KNL = 12,
  ANL = 13,
  TOL = 14,
  THR = 15,
  KNR = 16,
  ANR = 17,
  TOR = 18,
  CHF = 19,
  BAK = 20;
const N = 21;
// el tronco (rígido: se ajusta entero, como un sólido, a donde estén sus puntos)
const TRONCO = [HIP, NECK, SHL, SHR, THL, THR, CHF, BAK];
// con qué chocan (m) y lo que pesan (relativo)
const RADIO = [0.13, 0.09, 0.11, 0.08, 0.06, 0.05, 0.04, 0.08, 0.06, 0.05, 0.04, 0.09, 0.07, 0.05, 0.04, 0.09, 0.07, 0.05, 0.04, 0.1, 0.11];
const MASA = [4, 2.5, 1.5, 1.5, 0.8, 0.5, 0.3, 1.5, 0.8, 0.5, 0.3, 2.5, 1.4, 0.7, 0.3, 2.5, 1.4, 0.7, 0.3, 2, 2];
// las articulaciones que se orientan por un hueso: [articulación, padre,
// desde, hasta, tope, fuerza que le queda (cuánta y cuánto le dura, s)]
const CADENA = [
  ['head', 'chest', NECK, HEAD, 'cabeza', 0.45, 0.6],
  ['armL', 'chest', SHL, ELL, 'hombro', 0.3, 0.45],
  ['foreL', 'armL', ELL, WRL, 'codo', 0.3, 0.45],
  ['handL', 'foreL', WRL, HAL, 'muneca', 0.2, 0.3],
  ['armR', 'chest', SHR, ELR, 'hombro', 0.3, 0.45],
  ['foreR', 'armR', ELR, WRR, 'codo', 0.3, 0.45],
  ['handR', 'foreR', WRR, HAR, 'muneca', 0.2, 0.3],
  ['legL', 'hips', THL, KNL, 'caderaL', 0.1, 0.18],
  ['shinL', 'legL', KNL, ANL, 'rodilla', 0, 0],
  ['footL', 'shinL', ANL, TOL, 'tobillo', 0.3, 0.6],
  ['legR', 'hips', THR, KNR, 'caderaR', 0.1, 0.18],
  ['shinR', 'legR', KNR, ANR, 'rodilla', 0, 0],
  ['footR', 'shinR', ANR, TOR, 'tobillo', 0.3, 0.6],
];
const G = 9.8;
const PASO = 1 / 120;
// lo que no se mete en el tronco
const MIEMBROS = [ELL, WRL, HAL, ELR, WRR, HAR, KNL, ANL, TOL, KNR, ANR, TOR];

// (vectores y giros de trabajo)
const _v = new THREE.Vector3(),
  _w = new THREE.Vector3(),
  _u = new THREE.Vector3(),
  _a = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _r = new THREE.Quaternion(),
  _qi = new THREE.Quaternion(),
  _m = new THREE.Matrix4();
const X = new THREE.Vector3(1, 0, 0);
// los ejes de los conos de los topes (en el marco de reposo de la articulación)
const ADELANTE = new THREE.Vector3(0, 0, 1);
const MUSLO = new THREE.Vector3(0, -Math.cos(0.75), Math.sin(0.75));
const NUCA = new THREE.Vector3(0, Math.cos(0.2), Math.sin(0.2));

export class Caida {
  constructor(game, rig, obj, o = {}) {
    this.g = game;
    this.rig = rig;
    this.t = 0;
    this.quieto = false;
    this.calmaT = 0;
    this.acum = 0;
    // (los golpes contra el suelo: el primero del tronco suena)
    this.golpes = 0;
    this.onGolpe = o.onGolpe || null;
    const jt = rig.joints;
    obj.updateMatrixWorld(true);
    // el marco de la criatura, al morir (la raíz no se mueve: el cuerpo se
    // mueve dentro de ella)
    this.p0 = obj.getWorldPosition(new THREE.Vector3());
    this.q0 = obj.getWorldQuaternion(new THREE.Quaternion());
    this.q0i = this.q0.clone().invert();
    this.s = obj.getWorldScale(new THREE.Vector3()).x || 1;
    const s = this.s;
    // su tamaño (de la pelvis al cuello, 0,66 en el esqueleto de 1,85 m)
    const k = (rig.rest.chest.pos.length() + rig.rest.head.pos.length()) / 0.66;
    // los huesos virtuales: la coronilla, la mano, la punta del pie, el
    // esternón y el sacro (en el marco de su articulación)
    this.grosor = 0.13 * k;
    this._ejeT = {};
    this.off = {
      head: new THREE.Vector3(0, 0.24 * k, 0.03 * k),
      handL: new THREE.Vector3(0, -0.11 * k, 0.01 * k),
      handR: new THREE.Vector3(0, -0.11 * k, 0.01 * k),
      footL: new THREE.Vector3(0, -0.06 * k, 0.18 * k),
      footR: new THREE.Vector3(0, -0.06 * k, 0.18 * k),
      chf: new THREE.Vector3(0, 0.32 * k, 0.15 * k),
      bak: new THREE.Vector3(0, 0, -0.12 * k),
    };
    // el hueso de cada articulación de la cadena (en su marco): hasta su hija
    const hija = { head: null, armL: 'foreL', foreL: 'handL', handL: null, armR: 'foreR', foreR: 'handR', handR: null, legL: 'shinL', shinL: 'footL', footL: null, legR: 'shinR', shinR: 'footR', footR: null };
    this.hueso = {};
    for (const [jn] of CADENA) this.hueso[jn] = (hija[jn] ? jt[hija[jn]].position.clone() : this.off[jn].clone()).multiplyScalar(s);
    // los giros de reposo de cada articulación, y los de ahora (locales)
    this.R = {};
    this.Ri = {};
    this.L = {};
    this.L0 = {};
    for (const jn of J) {
      this.R[jn] = rig.restQ[jn].clone();
      this.Ri[jn] = rig.restQ[jn].clone().invert();
      this.L[jn] = jt[jn].quaternion.clone();
      this.L0[jn] = jt[jn].quaternion.clone();
    }
    // los puntos, donde están ahora
    const wp = (jn, local = null) => {
      const j = jt[jn];
      j.updateWorldMatrix(true, false);
      return local ? local.clone().applyMatrix4(j.matrixWorld) : new THREE.Vector3().setFromMatrixPosition(j.matrixWorld);
    };
    const P = [];
    P[HIP] = wp('hips');
    P[NECK] = wp('head');
    P[HEAD] = wp('head', this.off.head);
    P[SHL] = wp('armL');
    P[ELL] = wp('foreL');
    P[WRL] = wp('handL');
    P[HAL] = wp('handL', this.off.handL);
    P[SHR] = wp('armR');
    P[ELR] = wp('foreR');
    P[WRR] = wp('handR');
    P[HAR] = wp('handR', this.off.handR);
    P[THL] = wp('legL');
    P[KNL] = wp('shinL');
    P[ANL] = wp('footL');
    P[TOL] = wp('footL', this.off.footL);
    P[THR] = wp('legR');
    P[KNR] = wp('shinR');
    P[ANR] = wp('footR');
    P[TOR] = wp('footR', this.off.footR);
    P[CHF] = wp('chest', this.off.chf);
    P[BAK] = wp('hips', this.off.bak);
    this.x = P;
    this.xp = P.map((p) => p.clone());
    this.w = MASA.map((m) => 1 / m);
    // la largura de cada hueso (en el mundo)
    this.len = {};
    for (const [jn, , a, b] of CADENA) this.len[jn] = P[a].distanceTo(P[b]);
    // el tronco: sus puntos en el marco de la pelvis, como está al morir y
    // con la espalda ya floja (el pecho, derecho sobre la cadera)
    const qh = jt.hips.getWorldQuaternion(new THREE.Quaternion());
    this.qT = qh.clone();
    const qhi = qh.clone().invert();
    const forma0 = TRONCO.map((i) => P[i].clone().sub(P[HIP]).applyQuaternion(qhi));
    const cp = jt.chest.position.clone().multiplyScalar(s);
    const Lc0 = this.L0.chest,
      Lc1 = this.R.chest.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X, 0.08));
    this.Lc0 = Lc0;
    this.Lc1 = Lc1;
    const Lc0i = Lc0.clone().invert();
    const delPecho = new Set([NECK, SHL, SHR, CHF]);
    const forma1 = TRONCO.map((i, n) => (delPecho.has(i) ? forma0[n].clone().sub(cp).applyQuaternion(Lc0i).applyQuaternion(Lc1).add(cp) : forma0[n].clone()));
    this.forma0 = forma0;
    this.forma1 = forma1;
    this.forma = forma0.map((v) => v.clone());
    // el empujón: lo que llevaba de carrera; el golpe, lejos de quien se lo
    // dio (arriba, más; la pelvis, menos); las rodillas, hacia delante (así
    // se doblan, y no cae como una tabla); y un poco de azar de lado
    const h = PASO;
    const vel = o.vel || { x: 0, z: 0 };
    const yaw = o.adelante ?? 0;
    const fx = Math.sin(yaw),
      fz = Math.cos(yaw);
    let nx = 0,
      nz = 0;
    if (o.de) {
      nx = P[HIP].x - o.de.x;
      nz = P[HIP].z - o.de.z;
      const d = Math.hypot(nx, nz) || 1;
      nx /= d;
      nz /= d;
    }
    // (la carrera ya lleva el retroceso del golpe: enemy.takeHit)
    const fuerza = o.fuerte ? 1.0 : 0.7;
    const lado = (Math.random() - 0.5) * 0.6;
    const arriba = new Set([NECK, HEAD, SHL, SHR, CHF]);
    for (let i = 0; i < N; i++) {
      let vx = vel.x * 0.35,
        vz = vel.z * 0.35,
        vy = 0;
      const kk = arriba.has(i) ? 1 : i === HIP || i === BAK || i === THL || i === THR ? 0.3 : 0.1;
      vx += nx * fuerza * kk + -fz * lado * kk;
      vz += nz * fuerza * kk + fx * lado * kk;
      if (i === KNL || i === KNR) {
        vx += fx * 0.6;
        vz += fz * 0.6;
      }
      if (i === HIP || i === BAK) vy -= 0.4;
      this.xp[i].set(P[i].x - vx * h, P[i].y - vy * h, P[i].z - vz * h);
    }
    this._p = { x: 0, z: 0 };
  }

  // ---------------------------------------------------------------- física
  update(dt) {
    if (this.quieto) return;
    this.t += dt;
    this.acum += Math.min(dt, 0.1);
    let mov = 0;
    while (this.acum >= PASO) {
      this.acum -= PASO;
      mov = Math.max(mov, this.paso(PASO));
    }
    // (quieto: cuando lleva medio segundo sin moverse; o, pase lo que pase,
    // a los seis)
    if (this.t > 0.8 && mov < 0.0006) this.calmaT += dt;
    else this.calmaT = 0;
    if (this.calmaT > 0.5 || this.t > 6) this.quieto = true;
  }
  paso(h) {
    const x = this.x,
      xp = this.xp;
    // Verlet: lo que lleva, con algo de rozamiento (más cuando ya ha caído:
    // un cuerpo muerto no rebota ni se sacude), y la gravedad
    const tarde = Math.min(1, Math.max(0, (this.t - 1.0) / 1.2));
    // (y, en cuanto el tronco da en el suelo, el golpe se lo come casi todo:
    // un cuerpo no rebota)
    const amort = (0.995 - 0.012 * tarde) * (this.enSuelo ? 0.975 : 1);
    let mov = 0;
    for (let i = 0; i < N; i++) {
      const p = x[i],
        q = xp[i];
      const vx = (p.x - q.x) * amort,
        vy = (p.y - q.y) * amort,
        vz = (p.z - q.z) * amort;
      q.copy(p);
      p.x += vx;
      p.y += vy - G * h * h;
      p.z += vz;
      mov = Math.max(mov, Math.abs(vx) + Math.abs(vy) + Math.abs(vz));
    }
    // la espalda se afloja (en el primer segundo)
    const e = Math.min(1, Math.max(0, (this.t - 0.1) / 0.8));
    const k = e * e * (3 - 2 * e);
    for (let n = 0; n < TRONCO.length; n++) this.forma[n].lerpVectors(this.forma0[n], this.forma1[n], k);
    // (el suelo bajo cada punto, una vez por paso: en un paso se mueve poco)
    this.alturas();
    // las ligaduras, unas cuantas veces: el tronco, los huesos, los topes de
    // las articulaciones (y la fuerza que aún le queda), que los brazos y las
    // piernas no se metan en el tronco, y el suelo; al final, los muros
    for (let it = 0; it < 4; it++) {
      this.tronco();
      this.huesos();
      this.orientaTodo(0.4);
      this.cuerpo();
      this.suelo();
    }
    this.muros();
    return mov;
  }
  // el tronco, como un sólido: el giro que mejor lleva su forma a donde
  // están sus puntos (el método de Müller para el giro de una deformación)
  tronco() {
    const x = this.x,
      F = this.forma;
    let M = 0;
    const c = _v.set(0, 0, 0),
      c0 = _w.set(0, 0, 0);
    for (let n = 0; n < TRONCO.length; n++) {
      const i = TRONCO[n],
        m = MASA[i];
      c.addScaledVector(x[i], m);
      c0.addScaledVector(F[n], m);
      M += m;
    }
    c.multiplyScalar(1 / M);
    c0.multiplyScalar(1 / M);
    // A = sum m (p - c)(q - c0)^T, por columnas
    const A = this._A || (this._A = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
    for (const a of A) a.set(0, 0, 0);
    for (let n = 0; n < TRONCO.length; n++) {
      const i = TRONCO[n],
        m = MASA[i];
      const px = (x[i].x - c.x) * m,
        py = (x[i].y - c.y) * m,
        pz = (x[i].z - c.z) * m;
      const qx = F[n].x - c0.x,
        qy = F[n].y - c0.y,
        qz = F[n].z - c0.z;
      A[0].x += px * qx;
      A[0].y += py * qx;
      A[0].z += pz * qx;
      A[1].x += px * qy;
      A[1].y += py * qy;
      A[1].z += pz * qy;
      A[2].x += px * qz;
      A[2].y += py * qz;
      A[2].z += pz * qz;
    }
    const q = this.qT;
    const r0 = new THREE.Vector3(),
      r1 = new THREE.Vector3(),
      r2 = new THREE.Vector3();
    for (let it = 0; it < 8; it++) {
      _m.makeRotationFromQuaternion(q);
      r0.setFromMatrixColumn(_m, 0);
      r1.setFromMatrixColumn(_m, 1);
      r2.setFromMatrixColumn(_m, 2);
      const om = _u.set(0, 0, 0);
      om.add(_a.copy(r0).cross(A[0]))
        .add(_a.copy(r1).cross(A[1]))
        .add(_a.copy(r2).cross(A[2]));
      const den = Math.abs(r0.dot(A[0]) + r1.dot(A[1]) + r2.dot(A[2])) + 1e-9;
      om.multiplyScalar(1 / den);
      const w = om.length();
      if (w < 1e-9) break;
      _q.setFromAxisAngle(om.multiplyScalar(1 / w), w);
      q.premultiply(_q).normalize();
    }
    // cada punto, a su sitio en el sólido
    for (let n = 0; n < TRONCO.length; n++) {
      const i = TRONCO[n];
      _a.copy(F[n]).sub(c0).applyQuaternion(q).add(c);
      x[i].copy(_a);
    }
  }
  // los huesos de los miembros: a su largura (lo ligero se mueve más)
  huesos() {
    const x = this.x,
      w = this.w;
    for (const [jn, , a, b] of CADENA) {
      const L = this.len[jn];
      const d = _v.subVectors(x[b], x[a]);
      const l = d.length() || 1e-6;
      const wa = w[a],
        wb = w[b];
      const k = (l - L) / l / (wa + wb);
      x[a].addScaledVector(d, k * wa);
      x[b].addScaledVector(d, -k * wb);
    }
  }
  // el suelo bajo cada punto (lo más alto que no le quede por encima)
  alturas() {
    const col = this.g.world && this.g.world.col;
    const gy = this.gy || (this.gy = new Float64Array(N));
    for (let i = 0; i < N; i++) gy[i] = col ? col.groundHeight(this.x[i].x, this.x[i].z, 0.04, this.x[i].y + 0.35, true) : -100;
  }
  // el suelo, con su roce (y el golpe del tronco contra él, que suena)
  suelo() {
    const x = this.x,
      xp = this.xp,
      gy = this.gy;
    for (let i = 0; i < N; i++) {
      const p = x[i],
        r = RADIO[i];
      if (p.y - r >= gy[i]) continue;
      const vy = p.y - xp[i].y;
      p.y = gy[i] + r;
      // (el roce: lo que corría por el suelo, casi todo fuera)
      xp[i].x = p.x - (p.x - xp[i].x) * 0.55;
      xp[i].z = p.z - (p.z - xp[i].z) * 0.55;
      xp[i].y = p.y;
      if (i === HIP || i === NECK || i === CHF || i === BAK) {
        // (el tronco en el suelo: desde ahí, se acabó el impulso)
        this.enSuelo = true;
        if (vy < -0.01 && this.golpes < 2 && (i === HIP || i === NECK)) {
          this.golpes++;
          if (this.onGolpe) this.onGolpe(p, -vy / PASO, this.golpes);
        }
      }
    }
  }
  // los muros (y lo que no se pisa: las paredes invisibles también paran)
  muros() {
    const col = this.g.world && this.g.world.col;
    if (!col) return;
    const P = this._p;
    for (let i = 0; i < N; i++) {
      const p = this.x[i],
        r = RADIO[i];
      P.x = p.x;
      P.z = p.z;
      if (col.resolve(P, r * 0.8, p.y - r, 2 * r, 0)) {
        p.x = P.x;
        p.z = P.z;
      }
    }
  }
  // los brazos y las piernas, fuera del tronco (una cápsula de la pelvis al
  // cuello): sin esto, un brazo que cae sobre el pecho lo atravesaba
  cuerpo() {
    const x = this.x;
    const a = x[HIP],
      b = x[NECK];
    const ab = _v.subVectors(b, a);
    const L2 = ab.lengthSq() || 1e-6;
    const R = this.grosor;
    for (const i of MIEMBROS) {
      const p = x[i];
      const t = Math.min(1, Math.max(0, _w.subVectors(p, a).dot(ab) / L2));
      const c = _a.copy(a).addScaledVector(ab, t);
      const d = _w.subVectors(p, c);
      const l = d.length();
      const rr = R + RADIO[i];
      if (l >= rr || l < 1e-6) continue;
      p.addScaledVector(d, (rr - l) / l);
    }
  }

  // ---------------------------------------------------------------- giros
  // De los puntos, los giros (con sus topes y la fuerza que le queda); y los
  // puntos que cuelgan, otra vez donde dicen los giros (corrige: los topes).
  orientaTodo(corrige) {
    const x = this.x;
    // la pelvis y el pecho: el tronco
    const Qh = this.qT;
    this.L.hips.copy(this.q0i).multiply(Qh);
    const e = Math.min(1, Math.max(0, (this.t - 0.1) / 0.8));
    this.L.chest.slerpQuaternions(this.Lc0, this.Lc1, e * e * (3 - 2 * e));
    const W = this._W || (this._W = {});
    W.hips = Qh;
    W.chest = (W.chest || new THREE.Quaternion()).copy(Qh).multiply(this.L.chest);
    for (const [jn, padre, a, b, tope, f0, fT] of CADENA) {
      const Qp = W[padre];
      const r = _u.copy(this.hueso[jn]).normalize();
      // a dónde apunta el hueso, en el marco del padre
      const d = _v.subVectors(x[b], x[a]);
      if (d.lengthSq() < 1e-10) continue;
      d.normalize().applyQuaternion(_qi.copy(Qp).invert());
      // el giro más corto desde el de ahora
      const L = this.L[jn];
      const cur = _w.copy(r).applyQuaternion(L);
      _q.setFromUnitVectors(cur, d);
      L.premultiply(_q);
      // el tope, en el marco de reposo de la articulación
      this.tope(jn, tope, r);
      // la fuerza que le queda: hacia como estaba al morir
      if (corrige && f0 > 0 && this.t < fT) {
        const u = 1 - this.t / fT;
        L.slerp(this.L0[jn], f0 * u * u);
      }
      const Qj = (W[jn] || (W[jn] = new THREE.Quaternion())).copy(Qp).multiply(L);
      if (corrige) {
        // (el tope empuja a los dos lados, cada uno según lo que pesa: si
        // sólo se movía el de abajo, el cuerpo ganaba un empujón de la nada
        // en cada paso y, ya en el suelo, no paraba de arrastrarse)
        const wa = this.w[a],
          wb = this.w[b];
        _w.copy(x[a]).addScaledVector(_a.copy(r).applyQuaternion(Qj), this.len[jn]).sub(x[b]);
        const kb = (corrige * wb) / (wa + wb),
          ka = (corrige * wa) / (wa + wb);
        x[b].addScaledVector(_w, kb);
        x[a].addScaledVector(_w, -ka);
      }
    }
  }
  tope(jn, tope, r) {
    const L = this.L[jn];
    // el giro respecto al reposo, y el hueso en ese marco
    const P = _r.copy(this.Ri[jn]).multiply(L);
    const u = _a.copy(r).applyQuaternion(P);
    if (tope === 'rodilla' || tope === 'codo') {
      // bisagra: sólo el giro en x (la rodilla, hacia atrás; el codo, hacia
      // delante), sin torcerse
      // (al tope más cercano por la vuelta que falta: una rodilla doblada del
      // todo que se pasaba de media vuelta saltaba a estirada de golpe, y la
      // pierna salía disparada)
      const th0 = Math.atan2(-u.z, -u.y);
      // (nunca del todo estirados: un brazo o una pierna sin fuerza, del
      // todo rectos, hacían de puntal, y el cuerpo volteaba por encima de
      // ellos como haciendo el pino; un poco doblados, ceden)
      const [lo, hi] = tope === 'rodilla' ? [0.22, 2.5] : [-2.45, -0.25];
      let th = th0;
      if (th < lo || th > hi) {
        const dLo = Math.abs(Math.atan2(Math.sin(th - lo), Math.cos(th - lo))),
          dHi = Math.abs(Math.atan2(Math.sin(th - hi), Math.cos(th - hi)));
        th = dLo < dHi ? lo : hi;
      }
      P.setFromAxisAngle(X, th);
      L.copy(this.R[jn]).multiply(P);
      return;
    }
    // conos: el eje y su abertura
    let eje, ab;
    if (tope === 'hombro') (eje = ADELANTE), (ab = 2.2);
    else if (tope === 'caderaL' || tope === 'caderaR') (eje = MUSLO), (ab = 1.35);
    else if (tope === 'cabeza') (eje = NUCA), (ab = 0.85);
    else if (tope === 'muneca') (eje = _w.set(0, -1, 0)), (ab = 1.1);
    else (eje = _w.copy(r)), (ab = 0.6);
    const lim = this._lim || (this._lim = new THREE.Vector3());
    lim.copy(u);
    const ang = lim.angleTo(eje);
    if (ang > ab) {
      // (hasta el borde del cono, por el camino más corto; casi del revés,
      // por el lado por el que se fue la otra vez: no da la vuelta)
      const ax = _v.crossVectors(eje, lim);
      if (ax.lengthSq() < 1e-6) ax.copy(this._ejeT[jn] || (this._ejeT[jn] = new THREE.Vector3(1, 0, 0)));
      else (this._ejeT[jn] || (this._ejeT[jn] = new THREE.Vector3())).copy(ax).normalize();
      lim.copy(eje).applyAxisAngle(ax.normalize(), ab);
    }
    // las caderas, además, sin abrirse mucho ni cruzarse
    if (tope === 'caderaL' || tope === 'caderaR') {
      const sx = tope === 'caderaL' ? 1 : -1;
      const lat = lim.x * sx;
      const c = lat > 0.7 ? 0.7 : lat < -0.3 ? -0.3 : lat;
      if (c !== lat) {
        lim.x = c * sx;
        const rest = Math.sqrt(Math.max(1e-6, 1 - c * c)) / (Math.hypot(lim.y, lim.z) || 1);
        lim.y *= rest;
        lim.z *= rest;
      }
    }
    if (lim.angleTo(u) > 1e-5) {
      _q.setFromUnitVectors(u.normalize(), lim.normalize());
      P.premultiply(_q);
      L.copy(this.R[jn]).multiply(P);
    }
  }

  // ---------------------------------------------------------------- la pose
  // Los giros (relativos al reposo, como las poses) y la raíz.
  pose(out = {}) {
    // (sin corregir: sólo leer)
    this.orientaTodo(0);
    for (const jn of J) {
      _q.copy(this.Ri[jn]).multiply(this.L[jn]);
      out[jn] = q2e(_q, out[jn] || [0, 0, 0]);
    }
    // la pelvis: donde está, en el marco de la criatura al morir
    const rp = this.rig.rest.hips.pos;
    _v.copy(this.x[HIP]).sub(this.p0).applyQuaternion(this.q0i).multiplyScalar(1 / this.s);
    out.root = [_v.x - rp.x, _v.y - rp.y, _v.z - rp.z];
    return out;
  }
  // dónde está el cuerpo (para su sombra)
  centro(out = new THREE.Vector3()) {
    return out.copy(this.x[HIP]);
  }
}
