// La Puerta del Dios Ignoto y lo que la abre (la cripta honda: ver
// world/level_crypt2.js).
//
// San Martín de Dumio la cerró con cuatro cerrojos; el arzobispo los
// descorrió y, cuando él pasó, sus dos canónigos volvieron a echar los que
// pudieron. Para abrirla hace falta:
//  1. Que caigan los Velados, sus dos guardianes de piedra (los dos).
//  2. La Garra de Oro (la mano que el santo le cortó al ídolo; en su
//     relicario de la Cámara de la Garra, con su emboscada): gira en la
//     cerradura del centro del pentáculo.
//  3. Los cinco círculos de sangre de las puntas del pentáculo, llenos. La
//     sangre viene de las tres pilas (se abre su compuerta con siete tirones
//     de cadena): la de los Inocentes llena los dos de la izquierda, la de
//     los Mártires los de la derecha y la de los Condenados, que sube del
//     suelo, el de abajo. Cuando corre, las cabezas del dintel la lloran; con
//     los cinco llenos, la inscripción arde.
//  4. El dios no oye: huele. Se le llama con humo: el incensario colgado
//     sobre el estrado tiene que arder con el incienso negro del arzobispo
//     (en su sacristía, que se abre con su anillo).
// Aquí: la puerta (sus hojas, el pentáculo, los regueros de sangre y la
// cerradura), las pilas que se vacían, el incensario y la emboscada de la
// Garra.
import * as THREE from 'three';
import { DEEP } from '../world/level_crypt2.js';
import { objMat, cloneMat, additiveFog } from '../gfx/materials.js';
import { getTexture } from '../gfx/textures.js';
import { MSG } from './story.js';

const V3 = THREE.Vector3;
const D = DEEP;
const AY = D.AY;
const DR = D.door;
// las hojas: su eje (en el vano del muro de la cisterna) y su grueso; la cara
// que da a la antesala, en el espacio de la hoja (x hacia la cisterna)
const LEAF_T = 0.36;
const LEAF_X = -15.55;
const FACE = -LEAF_T / 2 - 0.006;
// el pentáculo invertido (u a lo largo de la puerta, v en altura), sus cinco
// puntas (la de abajo primero) y el círculo de signos que lo rodea
const PC = { u: DR.z, v: AY + 2.7, R: 1.7, r: 0.27 };
const POINTS = [0, 1, 2, 3, 4].map((k) => {
  const a = Math.PI + (k * Math.PI * 2) / 5;
  return { u: PC.u + PC.R * Math.sin(a), v: PC.v + PC.R * Math.cos(a) };
});
const RING = [PC.R + 0.32, PC.R + 0.6];
// de qué pila se llena cada círculo, y cuándo (segundos desde que se ve
// correr la sangre): los regueros [desde, hasta] y los círculos
const FONT_OF = ['honda', 'oeste', 'oeste', 'este', 'este'];
const FONTS = ['oeste', 'este', 'honda'];
const FONT_NAME = { oeste: 'los Inocentes', este: 'los Mártires', honda: 'los Condenados' };
const FLOW = {
  oeste: {
    segs: [
      [1.0, 3.0],
      [4.2, 6.2],
    ],
    circles: { 2: [3.0, 4.2], 1: [6.2, 7.4] },
    end: 7.6,
  },
  este: {
    segs: [
      [1.0, 3.0],
      [4.2, 6.2],
    ],
    circles: { 3: [3.0, 4.2], 4: [6.2, 7.4] },
    end: 7.6,
  },
  honda: { segs: [[1.0, 3.0]], circles: { 0: [3.0, 4.2] }, end: 4.4 },
};
// las tres cabezas del dintel (ver level_crypt2.js): su cara, sus ojos
const HEAD_X = D.hall.x1 - 0.02 - 0.667;
const HEAD_Y = AY + DR.h + 0.95;
const HEAD_Z = { oeste: DR.z - 1.0, honda: DR.z, este: DR.z + 1.0 };
// el incensario: el gancho en la bóveda y la altura de su fondo, frío (en su
// peana) e izado (por encima de la cabeza de los Velados y por debajo de la
// vista de la puerta)
const CENSER_HOOK = D.hall.YS + 2.9;
const CENSER_REST = AY + 0.3;
const CENSER_UP = AY + 4.6;
const CENSER_TOP = 2.15; // del fondo a la argolla de las cadenas
const CENSER_T = 3.9; // su vaivén (un péndulo de casi cuatro metros)
// la reja que cierra la Cámara de la Garra (en el paso a las catacumbas)
const GATE = { x: D.claw.x1 + 0.25, z0: -115, z1: -112.5, h: 3.1 };
const ramp = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const ease = (u) => u * u * (3 - 2 * u);

// Caja con la textura a la escala del mundo (rep: repeticiones por metro).
function tiledBox(w, h, d, rep) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // caras: ±x (u: z, v: y), ±y (u: x, v: z), ±z (u: x, v: y)
  const size = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++)
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * size[f][0] * rep, uv.getY(k) * size[f][1] * rep);
    }
  return g;
}
// Barra de p0 a p1 (una cadena, un dedo).
const _Y = new V3(0, 1, 0);
function bar(p0, p1, w, mat) {
  const d = new V3().subVectors(p1, p0);
  const L = d.length();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, L, w), mat);
  m.position.copy(p0).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(_Y, d.normalize());
  return m;
}

// La Garra de Oro: una mano de cuatro dedos con garras, de la muñeca a las
// uñas a lo largo de +y; la palma mira a -x.
function clawModel(gold, s = 1) {
  const grp = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.07 * s, 0.17 * s, 0.17 * s), gold);
  palm.position.y = 0.04 * s;
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.07 * s, 0.1 * s, 6), gold);
  wrist.position.y = -0.08 * s;
  grp.add(palm, wrist);
  for (let k = 0; k < 4; k++) {
    const z = (-0.066 + k * 0.044) * s;
    const spread = (k - 1.5) * 0.12;
    const p0 = new V3(0, 0.12 * s, z);
    const p1 = new V3(-0.02 * s, 0.24 * s, z + spread * 0.12 * s);
    const p2 = new V3(-0.07 * s, 0.32 * s, z + spread * 0.2 * s);
    grp.add(bar(p0, p1, 0.034 * s, gold), bar(p1, p2, 0.03 * s, gold));
    // la uña, larga y curva hacia la palma
    const nail = new THREE.Mesh(new THREE.ConeGeometry(0.016 * s, 0.11 * s, 4), gold);
    nail.position.set(-0.11 * s, 0.35 * s, z + spread * 0.22 * s);
    nail.rotation.z = 1.1;
    grp.add(nail);
  }
  // el pulgar, de lado
  grp.add(bar(new V3(0, 0, 0.085 * s), new V3(-0.05 * s, 0.1 * s, 0.15 * s), 0.034 * s, gold));
  const tn = new THREE.Mesh(new THREE.ConeGeometry(0.016 * s, 0.09 * s, 4), gold);
  tn.position.set(-0.09 * s, 0.14 * s, 0.17 * s);
  tn.rotation.z = 0.9;
  grp.add(tn);
  return grp;
}

export class CryptQuest {
  constructor(g) {
    this.g = g;
    const L = g.interact.list;
    this.door = L.find((i) => i.id === 'd_dios') || null;
    this.levers = L.filter((i) => i.kind === 'lever' && i.font);
    this.ambushers = g.enemies.filter((e) => e.spec.ambush === 'garra');
    this.t = 0;
    this._v = new V3();
    this._w = new V3();
    this.flows = [];
    this.opening = null;
    this.ambush = null;
    this.toss = null;
    this.flare = 0;
    this.inscK = 0;
    this.buildDoor();
    this.buildFonts();
    this.buildCenser();
    this.buildGate();
  }
  get F() {
    return this.g.flags;
  }

  // Material de objeto con la luz horneada del sitio (sonda en x,y,z; el
  // suelo, para la oclusión del pie, en 'ground').
  mat(name, x, y, z, ground, opts) {
    const g = this.g;
    const m = cloneMat(objMat(name, opts));
    const zn = g.zoneAt({ x, y, z });
    const pr = g.probe.sample(x, y, z, zn && zn.room ? g.level.ctx.wb.roomId(zn.room) : 0);
    if (m._u) {
      m._u.uProbe.value.set(pr[0], pr[1], pr[2]);
      m._u.uGround.value.set(ground, 0.3);
    }
    return m;
  }

  // ------------------------------------------------------------ la puerta
  buildDoor() {
    const g = this.g;
    // (con la luz de la antesala, delante de la puerta)
    const lx = LEAF_X - 1.6;
    // (piedra negra, sin juntas)
    const stone = this.mat('rock', lx, AY + 2.6, DR.z, AY);
    stone.color = new THREE.Color(0.3, 0.28, 0.28);
    const trim = this.mat('ashlar', lx, AY + 2.6, DR.z, AY);
    trim.color = new THREE.Color(0.66, 0.62, 0.58);
    const iron = this.mat('iron', lx, AY + 2.6, DR.z, AY);
    const bronze = this.mat('bronze', lx, AY + 2.6, DR.z, AY);
    const dark = new THREE.MeshBasicMaterial({ color: 0x0b0606 });
    this.bloodMat = new THREE.MeshBasicMaterial({ color: 0x6e0604 });
    // (los surcos del pentáculo y del círculo de signos: se encienden)
    this.lineMat = new THREE.MeshBasicMaterial({ color: 0x0b0606 });
    const hw = DR.w / 2;
    const lw = hw - 0.003;
    this.leaves = [];
    for (const [hz, s] of [
      [DR.z - hw, 1],
      [DR.z + hw, -1],
    ]) {
      const piv = new THREE.Group();
      piv.position.set(LEAF_X, AY, hz);
      const leaf = new THREE.Mesh(tiledBox(LEAF_T, DR.h - 0.02, lw, 0.5), stone);
      leaf.position.set(0, DR.h / 2, (s * lw) / 2);
      piv.add(leaf);
      // el marco en relieve (el canto de los goznes, arriba y un zócalo; el
      // de la junta, liso, para no cortar el pentáculo) con clavos de bronce
      const B = 0.16,
        Pd = 0.05,
        x = -LEAF_T / 2 - Pd / 2;
      const rail = (y0, y1, z0, z1) => {
        const m = new THREE.Mesh(tiledBox(Pd, y1 - y0, Math.abs(z1 - z0), 0.36), trim);
        m.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2);
        piv.add(m);
      };
      rail(0, DR.h - 0.02, 0, s * B);
      rail(DR.h - 0.02 - B, DR.h - 0.02, s * B, s * lw);
      rail(0, 0.32, s * B, s * lw);
      for (let y = 0.5; y < DR.h - 0.3; y += 0.9) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.07), bronze);
        st.position.set(x - Pd / 2 - 0.01, y, (s * B) / 2);
        piv.add(st);
      }
      for (let z = 0.45; z < lw - 0.2; z += 0.6)
        for (const y of [0.16, DR.h - 0.1]) {
          const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.07), bronze);
          st.position.set(x - Pd / 2 - 0.01, y, s * z);
          piv.add(st);
        }
      // los goznes, por la cara de la cisterna
      for (const y of [0.7, DR.h / 2, DR.h - 0.7]) {
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.9), iron);
        h.position.set(LEAF_T / 2 + 0.03, y, s * 0.45);
        piv.add(h);
      }
      piv.userData = { s, hz };
      g.scene.add(piv);
      this.leaves.push(piv);
    }
    const leafFor = (u) => (u < DR.z ? this.leaves[0] : this.leaves[1]);
    // del plano de la puerta (u, v) al espacio de la hoja
    const local = (piv, u, v, d = 0) => new V3(FACE - d, v - AY, u - piv.userData.hz);
    // un trazo entre dos puntos de la cara (partido si cruza la junta)
    const stroke = (u0, v0, u1, v1, w, mat, d = 0) => {
      const seg = (a0, b0, a1, b1) => {
        const piv = leafFor((a0 + a1) / 2);
        const L = Math.hypot(a1 - a0, b1 - b0);
        if (L < 0.01) return;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, w, L), mat);
        m.position.copy(local(piv, (a0 + a1) / 2, (b0 + b1) / 2, d));
        m.rotation.x = -Math.atan2(b1 - b0, a1 - a0);
        piv.add(m);
      };
      if ((u0 - DR.z) * (u1 - DR.z) < 0) {
        const k = (DR.z - u0) / (u1 - u0);
        const vm = v0 + (v1 - v0) * k;
        seg(u0, v0, DR.z - 0.001, vm);
        seg(DR.z + 0.001, vm, u1, v1);
      } else seg(u0, v0, u1, v1);
    };
    // el pentáculo: las cinco líneas (surcos) entre los círculos
    for (let k = 0; k < 5; k++) {
      const a = POINTS[k],
        b = POINTS[(k + 2) % 5];
      const du = b.u - a.u,
        dv = b.v - a.v;
      const cut = (PC.r + 0.03) / Math.hypot(du, dv);
      stroke(a.u + du * cut, a.v + dv * cut, b.u - du * cut, b.v - dv * cut, 0.07, this.lineMat);
    }
    // el círculo de signos: dos anillos y, entre ellos, los signos
    const N = 44;
    for (let k = 0; k < N; k++) {
      const a0 = (k / N) * Math.PI * 2,
        a1 = ((k + 1) / N) * Math.PI * 2;
      for (const R of RING) stroke(PC.u + R * Math.sin(a0), PC.v + R * Math.cos(a0), PC.u + R * Math.sin(a1), PC.v + R * Math.cos(a1), 0.045, this.lineMat);
      // un signo: un trazo largo y, uno sí y uno no, otro que lo cruza
      const am = (a0 + a1) / 2;
      const r0 = RING[0] + 0.06,
        r1 = RING[1] - 0.06;
      const tw = k % 3 === 0 ? 0.07 : k % 3 === 1 ? -0.05 : 0;
      stroke(PC.u + r0 * Math.sin(am - tw), PC.v + r0 * Math.cos(am - tw), PC.u + r1 * Math.sin(am + tw), PC.v + r1 * Math.cos(am + tw), 0.03, this.lineMat);
      if (k % 2 === 0) {
        const rm = (r0 + r1) / 2;
        stroke(PC.u + rm * Math.sin(am - 0.035), PC.v + rm * Math.cos(am - 0.035), PC.u + rm * Math.sin(am + 0.05), PC.v + rm * Math.cos(am + 0.05), 0.026, this.lineMat);
      }
    }
    // los círculos de las puntas: el aro de hierro, el hueco y la sangre que
    // lo llena (el de abajo, partido entre las dos hojas)
    const halves = (u) =>
      Math.abs(u - DR.z) < PC.r + 0.05
        ? [
            [this.leaves[0], Math.PI / 2, Math.PI],
            [this.leaves[1], -Math.PI / 2, Math.PI],
          ]
        : [[leafFor(u), 0, Math.PI * 2]];
    const circleOn = (u, v, r, mats) => {
      const out = [];
      for (const [piv, a0, len] of halves(u)) {
        const n = len > 4 ? 16 : 8;
        const at = local(piv, u, v);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 4, n, len).rotateZ(a0).rotateY(-Math.PI / 2), mats.ring);
        ring.position.copy(at);
        const sock = new THREE.Mesh(new THREE.CircleGeometry(r - 0.02, n, a0, len).rotateY(-Math.PI / 2), dark);
        sock.position.copy(at);
        piv.add(ring, sock);
        if (mats.fill) {
          const f = new THREE.Mesh(new THREE.CircleGeometry(r - 0.03, n, a0, len).rotateY(-Math.PI / 2), mats.fill);
          f.position.copy(local(piv, u, v, 0.004));
          f.scale.setScalar(0.001);
          piv.add(f);
          out.push(f);
        }
      }
      return out;
    };
    this.circles = POINTS.map((p, k) => ({ k, font: FONT_OF[k], k01: 0, fills: circleOn(p.u, p.v, PC.r, { ring: iron, fill: this.bloodMat }) }));
    // los regueros: de lo alto de la puerta a los círculos de cada lado y,
    // para el de abajo, del suelo hacia arriba (surco y sangre)
    const flowSeg = (u0, v0, u1, v1) => {
      const piv = leafFor((u0 + u1) / 2);
      const L = Math.hypot(u1 - u0, v1 - v0);
      const grp = new THREE.Group();
      grp.position.copy(local(piv, u0, v0, 0.002));
      grp.rotation.x = -Math.atan2(v1 - v0, u1 - u0);
      const gr = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, L).translate(0, 0, L / 2), dark);
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.065, L).translate(0, 0, L / 2), this.bloodMat);
      bl.position.x = -0.004;
      bl.scale.z = 0.001;
      grp.add(gr, bl);
      piv.add(grp);
      return bl;
    };
    const top = AY + DR.h - 0.05;
    const c = (k) => POINTS[k];
    this.streams = {
      oeste: [flowSeg(c(2).u, top, c(2).u, c(2).v + PC.r), flowSeg(c(2).u - 0.04, c(2).v - PC.r, c(1).u + 0.1, c(1).v + PC.r * 0.92)],
      este: [flowSeg(c(3).u, top, c(3).u, c(3).v + PC.r), flowSeg(c(3).u + 0.04, c(3).v - PC.r, c(4).u - 0.1, c(4).v + PC.r * 0.92)],
      honda: [flowSeg(PC.u - 0.14, AY + 0.02, PC.u - 0.14, c(0).v - PC.r)],
    };
    // la cerradura: un hueco redondo con su aro de bronce en el centro del
    // pentáculo (partido entre las hojas) y, dentro, la huella de la mano
    circleOn(PC.u, PC.v, 0.36, { ring: bronze });
    const print = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.2, 0.03), this.lineMat);
      m.position.set(0, 0.16, -0.066 + k * 0.044 + (k - 1.5) * 0.02);
      m.rotation.x = -(k - 1.5) * 0.12;
      print.add(m);
    }
    print.add(new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.16, 0.17), this.lineMat));
    print.position.copy(local(this.leaves[0], PC.u, PC.v - 0.06, 0.002));
    this.leaves[0].add(print);
    // la Garra, cuando entra en la cerradura (va con la hoja izquierda)
    const gold = this.mat('gold', lx, PC.v, DR.z, AY);
    this.claw = clawModel(gold, 1.25);
    this.claw.visible = false;
    this.leaves[0].add(this.claw);
    // DEO IGNOTO, en el dintel
    this.buildInscription();
    // las lágrimas de las tres cabezas y el charco del suelo, de donde sube
    // la sangre de los condenados
    this.tears = {};
    for (const id of FONTS) {
      const grp = new THREE.Group();
      for (const dz of [-0.085, 0.085]) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.3, 0.03).translate(0, -0.15, 0), this.bloodMat);
        t.position.set(HEAD_X - 0.004, HEAD_Y + 0.33, HEAD_Z[id] + dz);
        t.scale.y = 0.001;
        grp.add(t);
      }
      g.scene.add(grp);
      this.tears[id] = grp;
    }
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12).rotateX(-Math.PI / 2), this.bloodMat);
    pool.position.set(D.hall.x1 - 0.15, AY + 0.012, PC.u - 0.14);
    pool.scale.setScalar(0.001);
    g.scene.add(pool);
    this.pool = pool;
    // el resplandor del pentáculo encendido y su luz
    const glow = new THREE.Sprite(additiveFog(new THREE.SpriteMaterial({ map: getTexture('glow'), color: 0xff2a14, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })));
    glow.position.set(LEAF_X - 0.5, PC.v, PC.u);
    glow.scale.set(6, 6, 1);
    g.scene.add(glow);
    this.doorGlow = glow;
    this.doorLight = g.fx.lights.add({ x: LEAF_X - 1.6, y: PC.v, z: PC.u, color: 0xff2a14, intensity: 0, range: 11, flicker: 1, priority: 3, on: false });
  }

  // DEO IGNOTO en capitales romanas, talladas en el dintel, y las mismas
  // letras en rojo vivo encima (arden cuando el pentáculo se llena).
  buildInscription() {
    const W = 512,
      Hh = 64;
    const text = 'DEO · IGNOTO';
    const tex = (draw) => {
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = Hh;
      const c = cv.getContext('2d');
      c.font = 'bold 44px "Times New Roman", Georgia, serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if ('letterSpacing' in c) c.letterSpacing = '9px';
      draw(c);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.magFilter = THREE.NearestFilter;
      return t;
    };
    // el surco: oscuro, con la luz en el borde de abajo
    const carved = tex((c) => {
      c.fillStyle = 'rgba(255,235,210,0.22)';
      c.fillText(text, W / 2 + 1, Hh / 2 + 3);
      c.fillStyle = 'rgba(8,5,4,0.92)';
      c.fillText(text, W / 2, Hh / 2 + 1);
    });
    const lit = tex((c) => {
      c.shadowColor = '#ff3010';
      c.shadowBlur = 10;
      c.fillStyle = '#ff5a30';
      c.fillText(text, W / 2, Hh / 2 + 1);
    });
    const x = D.hall.x1 - 0.02 - 0.6;
    const geo = new THREE.PlaneGeometry(3.8, 0.475);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: carved, transparent: true, depthWrite: false }));
    m.rotation.y = -Math.PI / 2;
    m.position.set(x - 0.006, AY + DR.h + 0.38, DR.z);
    const m2 = new THREE.Mesh(geo, additiveFog(new THREE.MeshBasicMaterial({ map: lit, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
    m2.rotation.y = -Math.PI / 2;
    m2.position.set(x - 0.01, AY + DR.h + 0.38, DR.z);
    this.g.scene.add(m, m2);
    this.inscLit = m2;
  }

  // ------------------------------------------------------------ las pilas
  buildFonts() {
    this.basins = {};
    for (const it of this.levers) {
      const R = it.font === 'oeste' ? D.font1 : it.font === 'este' ? D.font2 : D.font3;
      const cx = (R.x0 + R.x1) / 2,
        cz = (R.z0 + R.z1) / 2;
      const y = it.y;
      // la sangre de la taza (un octógono con los lados en la cara del brocal)
      const m = new THREE.Mesh(new THREE.CircleGeometry(1.32, 8).rotateX(-Math.PI / 2), this.mat('blood', cx, y + 1.4, cz, y));
      m.position.set(cx, y + 1.1, cz);
      this.g.scene.add(m);
      this.basins[it.font] = { mesh: m, y0: y + 1.1, y1: y + 0.73, k: 1, x: cx, z: cz, drain: 0 };
    }
  }
  fontsDone() {
    return FONTS.filter((f) => this.F['lever:p_pila_' + f]).length;
  }
  circlesFull() {
    return this.circles.filter((c) => c.k01 >= 1).length;
  }

  // ------------------------------------------------------------ el incensario
  // Un botafumeiro: de una sola cadena, colgado de la bóveda; la caja de
  // bronce calada, con las brasas dentro.
  buildCenser() {
    const g = this.g;
    const C = D.censer;
    // (de plata, como el botafumeiro, ennegrecida por el humo)
    const silver = this.mat('silver', C.x, AY + 1.2, C.z, AY);
    silver.color = new THREE.Color(0.62, 0.6, 0.6);
    const bronze = this.mat('bronze', C.x, AY + 1.2, C.z, AY);
    const iron = this.mat('iron', C.x, AY + 1.2, C.z, AY);
    const piv = new THREE.Group();
    piv.position.set(C.x, CENSER_HOOK, C.z);
    // la cadena larga, del gancho a la argolla (se acorta al izarlo)
    const chain = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1, 0.045).translate(0, -0.5, 0), iron);
    piv.add(chain);
    const body = new THREE.Group();
    const prof = [
      [0, 0],
      [0.1, 0.03],
      [0.2, 0.12],
      [0.34, 0.3],
      [0.46, 0.52],
      [0.52, 0.7],
      [0.5, 0.82],
      [0.44, 0.88],
      [0.47, 0.92],
      [0.43, 1.0],
      [0.36, 1.14],
      [0.26, 1.28],
      [0.14, 1.4],
      [0.09, 1.46],
      [0.12, 1.5],
      [0.001, 1.58],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    body.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 12), silver));
    // los cercos de bronce (la boca y la cintura)
    for (const [r, y] of [
      [0.475, 0.9],
      [0.53, 0.66],
    ]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 4, 14).rotateX(Math.PI / 2), bronze);
      band.position.y = y;
      body.add(band);
    }
    // las rendijas de la tapa, por donde se ven las brasas y sale el humo
    this.emberMat = this.mat('ember', C.x, AY + 1.2, C.z, AY);
    this.emberMat.emissiveIntensity = 0;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const sl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.06), this.emberMat);
      sl.position.set(Math.cos(a) * 0.38, 1.08, Math.sin(a) * 0.38);
      sl.rotation.y = -a;
      sl.rotation.z = 0.5;
      body.add(sl);
    }
    // las cuatro cadenas cortas hasta la argolla
    const top = new V3(0, CENSER_TOP, 0);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      body.add(bar(new V3(Math.cos(a) * 0.46, 0.9, Math.sin(a) * 0.46), top, 0.03, iron));
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 4, 10), iron);
    ring.position.y = CENSER_TOP;
    body.add(ring);
    piv.add(body);
    g.scene.add(piv);
    // frío, en su peana, estorba (también a los Velados)
    const box = g.world.col.add(C.x - 0.55, AY, C.z - 0.55, C.x + 0.55, AY + 1.9, C.z + 0.55);
    box.enabled = false; // (setCenserHeight lo enciende y rehace la navegación)
    this.censer = { piv, body, chain, box, swing: 0, lit: false, litK: 0, up: 0 };
    this.setCenserHeight(0);
    this.censerLight = g.fx.lights.add({ x: C.x, y: AY + 1.4, z: C.z, color: 0xff6a20, intensity: 0, range: 8, flicker: 1, priority: 2, on: false });
    // el humo: bocanadas que no suben, se arrastran hacia la puerta
    const tex = getTexture('puff');
    this.puffs = [];
    for (let i = 0; i < 26; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x5a5254, transparent: true, depthWrite: false, opacity: 0 }));
      sp.visible = false;
      g.scene.add(sp);
      this.puffs.push({ sp, life: 0, max: 1, v: new V3(), s0: 0.4 });
    }
    this.puffT = 0;
    // el grano de incienso que se echa (vuela de la mano al incensario)
    this.grain = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.08), new THREE.MeshBasicMaterial({ color: 0x0a0807 }));
    this.grain.visible = false;
    g.scene.add(this.grain);
  }
  // k: 0 en su peana, 1 izado
  setCenserHeight(k) {
    const C = this.censer;
    C.up = k;
    const y = CENSER_REST + (CENSER_UP - CENSER_REST) * k;
    const len = CENSER_HOOK - (y + CENSER_TOP);
    C.chain.scale.y = len;
    C.body.position.y = -len - CENSER_TOP;
    const solid = k < 0.5;
    if (C.box.enabled !== solid) {
      C.box.enabled = solid;
      const nav = this.g.navCrypt;
      const P = D.censer;
      if (nav) nav.refresh(P.x - 1.2, P.z - 1.2, P.x + 1.2, P.z + 1.2);
    }
  }
  // Dónde está la boca del incensario ahora (se mece).
  censerMouth(out) {
    this.censer.piv.updateMatrixWorld(true);
    return this.censer.body.localToWorld(out.set(0, 1.1, 0));
  }
  puff(p, k = 1) {
    const P = this.puffs.find((q) => q.life <= 0);
    if (!P) return;
    P.life = P.max = (4.8 + Math.random() * 1.6) * k;
    P.sp.position.copy(p);
    P.v.set(1.15 + Math.random() * 0.45, 0.12 + Math.random() * 0.15, (Math.random() - 0.5) * 0.3);
    P.s0 = 0.5 + Math.random() * 0.3;
    P.sp.visible = true;
  }

  // ------------------------------------------------------------ la reja de la Garra
  buildGate() {
    const g = this.g;
    const iron = this.mat('iron', GATE.x - 1.5, D.Y + 1.5, (GATE.z0 + GATE.z1) / 2, D.Y);
    const grp = new THREE.Group();
    const n = 8;
    for (let k = 0; k <= n; k++) {
      const z = GATE.z0 + 0.12 + (k / n) * (GATE.z1 - GATE.z0 - 0.24);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, GATE.h, 0.07), iron);
      b.position.set(0, GATE.h / 2, z);
      // las puntas, abajo
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4).rotateX(Math.PI), iron);
      tip.position.set(0, -0.09, z);
      grp.add(b, tip);
    }
    for (const y of [0.35, 1.6, 2.85]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, GATE.z1 - GATE.z0), iron);
      b.position.set(0, y, (GATE.z0 + GATE.z1) / 2);
      grp.add(b);
    }
    grp.position.set(GATE.x, D.Y + GATE.h, 0);
    g.scene.add(grp);
    this.gate = { grp, box: g.world.col.add(GATE.x - 0.25, D.Y, GATE.z0, GATE.x + 0.25, D.Y + 3.2, GATE.z1), k: 0, target: 0 };
    this.gate.box.enabled = false;
  }
  setGate(down, instant = false) {
    const G = this.gate;
    G.target = down ? 1 : 0;
    G.box.enabled = down;
    if (instant) {
      G.k = G.target;
      G.grp.position.y = D.Y + GATE.h * (1 - G.k);
    }
  }

  // ------------------------------------------------------------ estado
  applyFlags() {
    const F = this.F;
    this.flows.length = 0;
    this.flare = 0;
    // cada pila: vaciada (su sangre, en la puerta) o llena
    for (const f of FONTS) {
      const done = !!F['lever:p_pila_' + f];
      const B = this.basins[f];
      if (B) {
        B.k = done ? 0 : 1;
        B.drain = 0;
        B.mesh.visible = !done;
        B.mesh.position.y = B.y0;
      }
      for (const s of this.streams[f]) s.scale.z = done ? 1 : 0.001;
      for (const t of this.tears[f].children) t.scale.y = done ? 1 : 0.001;
      if (f === 'honda') this.pool.scale.setScalar(done ? 1 : 0.001);
    }
    for (const c of this.circles) {
      c.k01 = F['lever:p_pila_' + c.font] ? 1 : 0;
      for (const f of c.fills) f.scale.setScalar(Math.max(0.001, c.k01));
    }
    this.setInscription(this.fontsDone() >= 3 ? 1 : 0);
    // el incensario
    this.toss = null;
    this.grain.visible = false;
    this.setCenser(!!F['god:incense'], true);
    // la Garra (hundida en la puerta) y la puerta (abierta: hojas dentro)
    const open = !!F['door:d_dios'];
    this.claw.visible = false;
    this.opening = null;
    for (const lf of this.leaves) lf.rotation.y = open ? lf.userData.s * 1.45 : 0;
    if (this.door && open && !this.door.done) this.g.interact.setOpen(this.door, true);
    // la emboscada de la Garra: hecha, si ya se cogió
    this.ambush = null;
    this.setGate(false, true);
    if (F['take:i_garra']) F['garra:ambush'] = true;
  }
  onRespawn() {
    // (si se cae en la emboscada no se repite: la Garra ya es tuya)
    if (this.ambush) this.F['garra:ambush'] = true;
    // (la sangre que todavía no se vio correr por la puerta, correrá)
    const pending = this.flows.map((fl) => fl.f);
    this.applyFlags();
    for (const f of pending) this.pend(f);
  }
  // Una pila vaciada cuya sangre aún no ha llegado a la puerta.
  pend(f) {
    for (const s of this.streams[f]) s.scale.z = 0.001;
    for (const t of this.tears[f].children) t.scale.y = 0.001;
    if (f === 'honda') this.pool.scale.setScalar(0.001);
    for (const c of this.circles)
      if (c.font === f) {
        c.k01 = 0;
        for (const m of c.fills) m.scale.setScalar(0.001);
      }
    this.setInscription(0);
    this.flows.push({ f, t: -1 });
  }

  setInscription(k) {
    this.inscK = k;
    this.lineColor(k, 1);
    this.inscLit.material.opacity = k;
  }
  // los surcos: casi negros, o rojo vivo cuando arden (valores lineales)
  lineColor(k, pulse) {
    this.lineMat.color.setRGB((0.004 + 0.996 * k) * pulse, 0.002 + 0.12 * k, 0.002 + 0.035 * k);
  }
  setCenser(lit, instant = false) {
    const C = this.censer;
    C.lit = lit;
    if (instant) {
      C.litK = lit ? 1 : 0;
      C.swing = lit ? 1 : 0;
      C.hoist = lit ? 1 : 0;
      C.piv.rotation.set(0, 0, 0);
      this.setCenserHeight(lit ? 1 : 0);
    }
    this.emberMat.emissiveIntensity = 1.6 * C.litK;
    this.censerLight.on = lit;
    if (!lit)
      for (const P of this.puffs) {
        P.life = 0;
        P.sp.visible = false;
      }
  }

  // ------------------------------------------------------------ lo que hace el jugador
  // Lo que falta para abrirla.
  missing() {
    const F = this.F;
    const out = [];
    if (!F['boss:guardianes']) out.push('velados');
    if (!this.g.inventory.has('garra')) out.push('garra');
    if (this.circlesFull() < 5 || this.flows.length) out.push('sangre');
    if (!F['god:incense']) out.push('humo');
    return out;
  }
  // Lo que se ve al examinarla (y lo que le falta).
  doorNote() {
    const F = this.F;
    const lines = [MSG.godDoor];
    lines.push(F['boss:guardianes'] ? MSG.godGuardsDown : MSG.godGuards);
    lines.push(this.g.inventory.has('garra') ? MSG.godClawFits : MSG.godClaw);
    lines.push(MSG.godBlood(this.circlesFull()));
    lines.push(F['god:incense'] ? MSG.godSmokeOn : MSG.godSmoke);
    return { title: 'La Puerta del Dios Ignoto', text: lines.join('\n\n') };
  }
  doorLabel() {
    return this.missing().length ? 'Examinar la puerta' : 'Girar la Garra en la cerradura';
  }
  useDoor(it) {
    const g = this.g;
    if (this.opening || this.F['door:d_dios']) return;
    if (!this.missing().length) {
      this.open(it);
      return;
    }
    g.audio && g.audio.play('paper');
    g.ui.showNote(this.doorNote());
  }
  open(it) {
    const g = this.g;
    const p = g.player;
    this.opening = { t: 0, it };
    g.inventory.add('garra', -1);
    this.claw.visible = true;
    this.claw.rotation.set(0, 0, 0);
    this.claw.position.copy(this.clawAt(-0.15));
    g.ui.toast(MSG.godOpen, 5);
    p.playInteract('interact', Math.atan2(it.x - p.pos.x, it.z - p.pos.z), 1.0);
    g.audio && g.audio.play('unlock', { x: LEAF_X, y: PC.v, z: PC.u });
    g.lockTarget = null;
    // la cámara se aparta para ver la puerta entera
    g.cinematic(7.6, new V3(LEAF_X - 8.6, AY + 2.4, DR.z + 2.4), new V3(LEAF_X, AY + 3.0, DR.z));
    g.audio && g.audio.stopMusic();
  }
  // La Garra en la cerradura (en la hoja izquierda): k 0 en la cara, más
  // hacia dentro de la piedra.
  clawAt(k) {
    return this._w.set(FACE - 0.05 + k * 0.32, PC.v - 0.08 - AY, PC.u - this.leaves[0].userData.hz);
  }
  censerLabel() {
    if (this.F['god:incense']) return 'Mirar el incensario';
    return this.g.inventory.has('incienso') ? 'Echar el incienso negro' : 'Examinar el incensario';
  }
  useCenser(it) {
    const g = this.g;
    if (this.F['god:incense'] || this.toss) {
      g.ui.toast(MSG.censerLit, 4);
      return;
    }
    if (!g.inventory.has('incienso')) {
      g.ui.toast(MSG.censerCold, 6);
      return;
    }
    // se echa el grano a la boca del incensario, en lo alto
    const p = g.player;
    g.inventory.add('incienso', -1);
    this.F['god:incense'] = true;
    p.playInteract('interact', Math.atan2(it.x - p.pos.x, it.z - p.pos.z), 0.9);
    this.toss = { t: -0.35, from: new V3(p.pos.x, p.pos.y + 1.5, p.pos.z) };
    g.saveGame();
  }
  ignite() {
    const g = this.g;
    this.setCenser(true);
    this.censer.swing = 0;
    this.censer.hoist = 0;
    const m = this.censerMouth(this._v);
    if (g.audio) {
      g.audio.play('fireWhoosh', m);
      g.audio.play('censerLit', m);
    }
    g.fx.blood.emit(m.x, m.y, m.z, 30, { color: [1, 0.5, 0.15], speed: 2.2, life: 0.8, up: 1.2, gravity: -1 });
    for (let i = 0; i < 6; i++) this.puff(m, 0.8);
    g.ui.toast(MSG.censerLight, 6);
  }
  // Una pila vaciada (al acabar de tirar de la cadena de su compuerta).
  onFont(it) {
    const g = this.g;
    const f = it.font;
    const B = this.basins[f];
    if (B) B.drain = 0.001;
    const a = g.audio;
    if (a) {
      a.play('chainRun', { x: it.x, y: it.y + 2.5, z: it.z });
      g.later(500, () => a.play('bloodDrain', { x: B ? B.x : it.x, y: it.y + 1, z: B ? B.z : it.z }));
    }
    // (la sangre corre por la puerta cuando se la ve: ver update)
    this.flows.push({ f, t: -1 });
    g.ui.toast(MSG.fontDone(FONT_NAME[f], this.fontsDone()), 6);
    g.camRig.shake(0.2);
  }

  // ------------------------------------------------------------ cada fotograma
  inHall(p) {
    const H = D.hall;
    return p.x > H.x0 && p.x < H.x1 + 1 && p.z > H.z0 && p.z < H.z1 && p.y < D.Y - 0.5;
  }
  update(dt) {
    const g = this.g;
    this.t += dt;
    const t = this.t;
    // las pilas que se vacían
    for (const f in this.basins) {
      const B = this.basins[f];
      if (!(B.drain > 0) || B.k <= 0) continue;
      B.drain += dt;
      B.k = Math.max(0, 1 - B.drain / 6);
      B.mesh.position.y = B.y1 + (B.y0 - B.y1) * B.k;
      if (Math.random() < dt * 10) g.fx.blood.emit(B.x + (Math.random() - 0.5) * 1.6, B.mesh.position.y + 0.02, B.z + (Math.random() - 0.5) * 1.6, 2, { color: [0.4, 0.03, 0.02], speed: 0.5, life: 0.5, up: 0.4 });
      if (B.k <= 0) B.mesh.visible = false;
    }
    // la sangre que corre por la puerta: espera a que se esté en la antesala
    if (this.flows.length && this.inHall(g.player.pos)) this.updateFlows(dt);
    if (this.flare > 0) {
      this.flare += dt;
      this.setInscription(Math.min(1, this.flare / 3));
      if (this.flare >= 3) this.flare = 0;
    }
    const ik = this.inscK;
    if (ik > 0) this.lineColor(ik, 0.85 + 0.15 * Math.sin(t * 2.4));
    this.doorGlow.material.opacity = ik * (0.28 + 0.07 * Math.sin(t * 2.4));
    const li = ik * (2.4 + Math.sin(t * 2.4) * 0.4) + (this.opening ? 4 * Math.min(1, this.opening.t / 2) : 0);
    this.doorLight.intensity = li;
    this.doorLight.on = li > 0.02;
    this.updateCenser(dt);
    this.updateOpening(dt);
    // la reja de la Garra: cae de golpe, sube despacio
    const G = this.gate;
    if (G.k !== G.target) {
      G.k = G.target > G.k ? Math.min(G.target, G.k + dt / 0.3) : Math.max(G.target, G.k - dt / 2.4);
      G.grp.position.y = D.Y + GATE.h * (1 - G.k);
      if (G.target === 1 && G.k >= 1) {
        g.audio && g.audio.play('slam', { x: GATE.x, y: D.Y + 0.5, z: (GATE.z0 + GATE.z1) / 2 });
        g.camRig.shake(0.35);
      }
    }
    // la emboscada: al coger la Garra
    if (!this.ambush && this.F['take:i_garra'] && !this.F['garra:ambush']) this.startAmbush();
    if (this.ambush) this.updateAmbush(dt);
  }

  updateFlows(dt) {
    const g = this.g;
    for (let i = this.flows.length - 1; i >= 0; i--) {
      const fl = this.flows[i];
      if (fl.t < 0) {
        fl.t = 0;
        g.audio && g.audio.play('bloodDrain', { x: LEAF_X - 0.5, y: AY + 3, z: DR.z });
      }
      fl.t += dt;
      const T = FLOW[fl.f];
      for (const tr of this.tears[fl.f].children) tr.scale.y = Math.max(0.001, ramp(fl.t, 0, 1.2));
      if (fl.f === 'honda') this.pool.scale.setScalar(Math.max(0.001, ramp(fl.t, 0, 1.4)));
      this.streams[fl.f].forEach((s, k) => (s.scale.z = Math.max(0.001, ramp(fl.t, T.segs[k][0], T.segs[k][1]))));
      for (const k in T.circles) {
        const c = this.circles[k];
        c.k01 = Math.max(c.k01, ramp(fl.t, T.circles[k][0], T.circles[k][1]));
        for (const m of c.fills) m.scale.setScalar(Math.max(0.001, c.k01));
      }
      // gotas que caen de las cabezas al estrado
      if (Math.random() < dt * 3) g.fx.blood.emit(HEAD_X - 0.14, HEAD_Y - 0.02, HEAD_Z[fl.f] + (Math.random() - 0.5) * 0.2, 1, { color: [0.45, 0.03, 0.02], speed: 0.1, life: 1.4, up: 0 });
      if (fl.t < T.end) continue;
      this.flows.splice(i, 1);
      // los cinco llenos: la inscripción arde
      if (!this.flows.length && this.circlesFull() >= 5 && this.inscK < 1) {
        this.flare = 0.001;
        g.audio && g.audio.play('godSeal', { x: LEAF_X, y: PC.v, z: DR.z });
        g.camRig.shake(0.35);
        g.ui.toast(MSG.godSealed, 5);
      }
    }
  }

  updateCenser(dt) {
    const g = this.g;
    const C = this.censer;
    const t = this.t;
    // el grano de incienso, de la mano a la boca del incensario
    const S = this.toss;
    if (S) {
      S.t += dt;
      if (S.t >= 0) {
        const u = Math.min(1, S.t / 0.75);
        const to = this.censerMouth(this._v);
        this.grain.visible = true;
        this.grain.position.lerpVectors(S.from, to, u);
        this.grain.position.y += Math.sin(Math.PI * u) * 1.2;
        this.grain.rotation.set(u * 9, u * 5, 0);
        if (u >= 1) {
          this.toss = null;
          this.grain.visible = false;
          this.ignite();
        }
      }
    }
    if (!C.lit) return;
    C.litK = Math.min(1, C.litK + dt / 1.5);
    this.emberMat.emissiveIntensity = 1.6 * C.litK * (0.85 + 0.15 * Math.sin(t * 9));
    // la cadena lo iza sola hasta lo alto (nadie tira de ella)...
    if (C.hoist < 1) {
      const h0 = C.hoist;
      C.hoist = Math.min(1, C.hoist + dt / 4.5);
      this.setCenserHeight(ease(Math.max(0, (C.hoist - 0.15) / 0.85)));
      if (h0 < 0.15 && C.hoist >= 0.15) g.audio && g.audio.play('chainRun', { x: D.censer.x, y: AY + 4, z: D.censer.z });
    }
    // ...y se mece de lado a lado, cada vez más
    if (C.hoist > 0.7) C.swing = Math.min(1, C.swing + dt * 0.08);
    const w = (Math.PI * 2) / CENSER_T;
    C.piv.rotation.x = Math.sin(t * w) * 0.32 * C.swing;
    C.piv.rotation.z = Math.sin(t * w * 0.5 + 1) * 0.04 * C.swing;
    const m = this.censerMouth(this._v);
    this.censerLight.x = m.x;
    this.censerLight.y = m.y;
    this.censerLight.z = m.z;
    this.censerLight.intensity = (2.0 + Math.sin(t * 7) * 0.3) * C.litK;
    this.puffT -= dt;
    if (this.puffT <= 0) {
      this.puffT = 0.16 + Math.random() * 0.1;
      this.puff(m);
    }
    // el humo: baja y se arrastra hacia la puerta; al llegar se abre en
    // abanico por la piedra y se cuela por las juntas
    const doorX = LEAF_X - LEAF_T / 2 - 0.25;
    for (const P of this.puffs) {
      if (P.life <= 0) continue;
      P.life -= dt;
      const sp = P.sp;
      if (P.life <= 0) {
        sp.visible = false;
        continue;
      }
      const age = 1 - P.life / P.max;
      // primero sube un poco, luego cae hacia el suelo del estrado
      P.v.y += (age < 0.15 ? 0.05 : -0.32) * dt;
      sp.position.addScaledVector(P.v, dt);
      if (sp.position.y < AY + 0.5) {
        sp.position.y = AY + 0.5;
        P.v.y = 0;
      }
      if (sp.position.x > doorX) {
        sp.position.x = doorX;
        P.v.x = 0;
        P.v.z += (sp.position.z < DR.z ? -1 : 1) * 0.3 * dt;
        P.v.y += 0.25 * dt;
      }
      const s = P.s0 + age * 2.2;
      sp.scale.set(s, s, 1);
      sp.material.opacity = Math.min(1, age * 5) * (1 - age) * 0.55 * C.litK;
    }
  }

  updateOpening(dt) {
    const g = this.g;
    const O = this.opening;
    if (!O) return;
    O.t += dt;
    // la Garra entra en la cerradura, gira y se hunde en la piedra
    const u0 = ramp(O.t, 0.3, 1.0),
      u1 = ramp(O.t, 1.2, 1.9),
      u2 = ramp(O.t, 2.1, 2.9);
    this.claw.position.copy(this.clawAt(-0.15 * (1 - u0) + u2));
    this.claw.rotation.x = -ease(u1) * (Math.PI / 2);
    if (u2 >= 1) this.claw.visible = false;
    if (O.t > 1.9 && !O.click) {
      O.click = true;
      g.audio && g.audio.play('clawTurn', { x: LEAF_X, y: PC.v, z: PC.u });
      g.camRig.shake(0.25);
      this.setInscription(1);
    }
    // todo tiembla; las hojas se abren hacia la cisterna
    if (O.t > 3.0 && !O.rumble) {
      O.rumble = true;
      g.audio && g.audio.play('godDoor', { x: LEAF_X, y: AY + 2.5, z: DR.z });
      g.camRig.shake(0.7);
    }
    if (O.t <= 3.0) return;
    const u = ramp(O.t, 3.0, 7.5);
    const e = ease(u);
    for (const lf of this.leaves) lf.rotation.y = lf.userData.s * 1.45 * e;
    if (u < 1) {
      g.camRig.shake(dt * 0.5);
      if (Math.random() < dt * 24) g.fx.blood.emit(LEAF_X - 0.3, AY + DR.h * Math.random(), DR.z + (Math.random() - 0.5) * 0.3 * (1 + e * 10), 2, { color: [0.36, 0.34, 0.31], speed: 1.2, life: 1.3, up: 0.2 });
      if (Math.random() < dt * 10) g.fx.blood.emit(LEAF_X - 0.4, AY + DR.h - 0.1, DR.z + (Math.random() - 0.5) * DR.w, 3, { color: [0.36, 0.34, 0.31], speed: 0.6, life: 1.6, up: 0 });
      return;
    }
    this.opening = null;
    this.F['door:d_dios'] = true;
    if (this.door) g.interact.setOpen(this.door, true);
    g.ui.area(MSG.godOpenArea);
    g.saveGame();
  }

  // ------------------------------------------------------------ la emboscada
  // Se cierra la reja y los muertos salen: los de los sepulcros se levantan,
  // los del techo se dejan caer.
  startAmbush() {
    const g = this.g;
    const CL = D.claw;
    const cx = (CL.x0 + CL.x1) / 2;
    let i = 0;
    const list = this.ambushers
      .filter((e) => !e.dead)
      .map((e) => {
        const ceil = e.spec.idle === 'ceiling';
        const sx = e.spec.x,
          sz = e.spec.z;
        return { e, ceil, at: 0.8 + (ceil ? 1.6 + i * 0.5 : i++ * 0.9), phase: 'wait', sx, sz, ox: sx + (cx > sx ? 1.4 : -1.4), oz: sz };
      });
    this.ambush = { t: 0, end: 0, list };
    this.setGate(true);
    if (g.audio) {
      g.audio.play('chainRun', { x: GATE.x, y: D.Y + 3, z: (GATE.z0 + GATE.z1) / 2 });
      g.audio.play('stinger');
    }
    g.ui.toast(MSG.clawAmbush, 4.5);
  }
  updateAmbush(dt) {
    const g = this.g;
    const A = this.ambush;
    const Y = D.Y;
    A.t += dt;
    for (const a of A.list) {
      const e = a.e;
      if (a.phase === 'wait') {
        if (A.t < a.at) continue;
        e.dead = false;
        e.obj.visible = true;
        if (a.ceil) {
          // asoman del techo, colgados, y se dejan caer al poco
          e.scripted = false;
          e.aware = true;
          a.phase = 'ceiling';
          a.drop = A.t + 0.7 + Math.random() * 0.8;
          g.audio && g.audio.enemyVoice(e, 'idle');
        } else {
          // se levantan dentro del sepulcro abierto, de cara a la sala
          a.phase = 'rise';
          a.pt = 0;
          e.state = 'dormant';
          e.idle = 'stand';
          e.yaw = Math.atan2(a.ox - a.sx, a.oz - a.sz);
          e.body.pos.set(a.sx, Y - 1.3, a.sz);
          e.shadow.visible = false;
          g.audio && g.audio.play('stoneCreak', { x: a.sx, y: Y + 1, z: a.sz });
          g.fx.blood.emit(a.sx, Y + 0.95, a.sz, 20, { color: [0.3, 0.28, 0.25], speed: 1.6, life: 1.0, up: 1.2 });
        }
      } else if (a.phase === 'rise') {
        a.pt += dt;
        const u = ease(Math.min(1, a.pt / 1.4));
        e.body.pos.set(a.sx, Y - 1.3 + 2.2 * u, a.sz);
        e.animate(dt);
        e.shadow.visible = false;
        if (a.pt >= 1.4) {
          a.phase = 'hop';
          a.pt = 0;
          e.state = 'alert';
          if (e.T.clips.alert) e.anim.play(e.T.clips.alert, { blend: 0.1 });
          g.audio && g.audio.enemyVoice(e, 'alert');
        }
      } else if (a.phase === 'hop') {
        // salta por encima del borde del sepulcro al suelo
        a.pt += dt;
        const u = Math.min(1, a.pt / 0.5);
        e.body.pos.set(a.sx + (a.ox - a.sx) * ease(u), Y + 0.9 * (1 - u) + Math.sin(Math.PI * u) * 0.45, a.sz);
        e.animate(dt);
        if (u >= 1) {
          e.body.pos.set(a.ox, Y, a.oz);
          e.body.vy = 0;
          e.body.grounded = true;
          e.scripted = false;
          e.aware = true;
          e.state = 'chase';
          e.stT = 0;
          e.cooldown = 0.5;
          e.home = { x: a.ox, y: Y, z: a.oz, yaw: e.yaw };
          a.phase = 'fight';
          g.camRig.shake(0.15);
        }
      } else if (a.phase === 'ceiling') {
        if (e.dead || e.state !== 'ceiling') a.phase = 'fight';
        else if (A.t >= a.drop) {
          e.drop();
          a.phase = 'fight';
        }
      }
    }
    // todas fuera y todas muertas: la reja vuelve a subir
    if (!A.list.every((a) => a.phase === 'fight' && a.e.dead)) return;
    A.end += dt;
    if (A.end < 1.6) return;
    this.ambush = null;
    this.F['garra:ambush'] = true;
    this.setGate(false);
    g.audio && g.audio.play('gateOpen', { x: GATE.x, y: Y + 2, z: (GATE.z0 + GATE.z1) / 2 });
    g.ui.toast(MSG.clawFree, 4);
    g.saveGame();
  }
}
