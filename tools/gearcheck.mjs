// Escudo y arma frente al cuerpo durante la locomoción (andar, trotar, correr,
// girar, bloquear, desplazarse fijado...). Recorre cada situación a 60 Hz con
// el animador real del jugador y mide cuánto se mete el escudo o la hoja en
// el torso, la cadera, la cabeza y las piernas (cajas de las piezas del
// modelo), y hacia dónde apunta la hoja respecto a la marcha.
//   node tools/gearcheck.mjs [arma]          (requiere npx vite --port 5199)
// Salida por situación:
//   escudo  % de fotogramas con el escudo dentro del cuerpo y profundidad máx.
//   hoja    lo mismo para la hoja
//   punta   ángulo medio de la hoja respecto al frente (0° = delante, 180° = detrás)
//   empuje  cuánto ha tenido que apartar keepShieldOut el escudo del cuerpo
import { chromium } from 'playwright';
const arma = process.argv[2] || 'espada';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 270 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5199/?dev=1&at=0,0,-44&yaw=0');
await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
const out = await p.evaluate(async (arma) => {
  window.__pause = true;
  const g = __game;
  const T = g.THREE;
  const { playerDef } = await import('/src/entities/models.js');
  const P = g.player;
  P.setEquipment(true, true);
  P.equipWeapon(arma);
  const rig = P.rig;
  // cajas del cuerpo (sin estrechamientos: algo conservadoras)
  const BODY = ['hips', 'chest', 'head', 'legL', 'legR', 'shinL', 'shinR'];
  const boxes = [];
  for (const pt of playerDef().parts) {
    if (!BODY.includes(pt.j) || (pt.type || 'box') !== 'box' || !pt.s) continue;
    if (pt.s[0] < 0.1 || pt.s[1] < 0.1 || pt.s[2] < 0.1) continue; // tiras, ribetes
    const r = pt.r || [0, 0, 0];
    const m = new T.Matrix4().compose(new T.Vector3(...(pt.p || [0, 0, 0])), new T.Quaternion().setFromEuler(new T.Euler(r[0] * (Math.PI / 180), r[1] * (Math.PI / 180), r[2] * (Math.PI / 180))), new T.Vector3(1, 1, 1));
    boxes.push({ j: pt.j, name: pt.j + '[' + (pt.mat || '') + ']', h: [pt.s[0] / 2, pt.s[1] / 2, pt.s[2] / 2], inv: m.clone().invert() });
  }
  // puntos del escudo: silueta de lágrima y su interior, por las dos caras
  const shieldPts = [];
  const hw = 0.3,
    hh = 0.77;
  for (let yy = -0.55; yy <= 0.42; yy += 0.08)
    for (let xx = -1; xx <= 1.001; xx += 0.2) {
      const y = yy * hh;
      // anchura de la lágrima a esa altura
      const wAt = y > 0.02 * hh ? hw : hw * Math.sqrt(Math.max(0, 1 - Math.pow((0.02 * hh - y) / (0.6 * hh), 2)));
      for (const z of [-0.025, 0.035]) shieldPts.push(new T.Vector3(xx * wAt, y + 0.035, z));
    }
  const W = P.weapon;
  const bladePts = [];
  for (let i = 0; i <= 8; i++) bladePts.push(new T.Vector3().fromArray(W.trail[0]).lerp(new T.Vector3().fromArray(W.tip), i / 8));
  const inv = new T.Matrix4();
  const q = new T.Vector3();
  const depthIn = (worldPt) => {
    let best = 0,
      part = '';
    for (const bx of boxes) {
      const J = rig.joints[bx.j];
      inv.copy(J.matrixWorld).invert();
      q.copy(worldPt).applyMatrix4(inv).applyMatrix4(bx.inv);
      const dx = bx.h[0] - Math.abs(q.x),
        dy = bx.h[1] - Math.abs(q.y),
        dz = bx.h[2] - Math.abs(q.z);
      if (dx > 0 && dy > 0 && dz > 0) {
        const d = Math.min(dx, dy, dz);
        if (d > best) {
          best = d;
          part = bx.name;
        }
      }
    }
    return [best, part];
  };
  const wp = new T.Vector3();
  const scen = {
    quieto: { v: 0 },
    andar: { v: 2.2 },
    trotar: { v: 4.5 },
    correr: { v: 6.7, exert: 1 },
    'girar sitio': { v: 0, turn: 6 },
    'trotar curva': { v: 4.5, turn: 2.5 },
    'correr curva': { v: 6.7, turn: 2.2, exert: 1 },
    'fijado izq': { v: 3.6, side: 1, lock: true },
    'fijado der': { v: 3.6, side: -1, lock: true },
    'fijado atrás': { v: 3.6, back: true, lock: true },
    'bloquear andando': { v: 1.9, block: true },
    arrancar: { v: 6.7, ramp: 0.4, exert: 1 },
    frenar: { v: 6.7, stop: 0.7, exert: 1 },
  };
  const res = {};
  for (const [name, S] of Object.entries(scen)) {
    P.spawn(0, 0, -44, 0);
    P.state = 'free';
    P.blocking = !!S.block;
    P.blockW = S.block ? 1 : 0;
    P.exert = S.exert || 0;
    g.lockTarget = S.lock ? { pos: new T.Vector3(0, 0, -30), dead: false } : null;
    let yaw = 0;
    const dt = 1 / 60;
    let n = 0,
      shHit = 0,
      shMax = 0,
      shPart = '',
      blHit = 0,
      blMax = 0,
      blPart = '',
      aim = 0,
      aimN = 0,
      push = 0,
      pushMax = 0;
    for (let f = 0; f < 240; f++) {
      const t = f * dt;
      let sp = S.v;
      if (S.ramp) sp = S.v * Math.min(1, t / S.ramp);
      if (S.stop) sp = t < S.stop ? S.v : Math.max(0, S.v * (1 - (t - S.stop) / 0.3));
      if (S.turn) yaw += S.turn * dt;
      let dirYaw = yaw;
      if (S.side) dirYaw = yaw + (S.side * Math.PI) / 2;
      if (S.back) dirYaw = yaw + Math.PI;
      P.yaw = yaw;
      P.vx = Math.sin(dirYaw) * sp;
      P.vz = Math.cos(dirYaw) * sp;
      P.sprinting = sp > 6;
      g.time += dt;
      P.animate(dt);
      if (f < 60) continue; // que se asiente la marcha
      rig.root.updateMatrixWorld(true);
      n++;
      push += P.shieldPush || 0;
      pushMax = Math.max(pushMax, P.shieldPush || 0);
      // escudo
      const sj = rig.joints.shield;
      if (sj.visible) {
        let m = 0,
          pt = '';
        for (const s of shieldPts) {
          const [d, part] = depthIn(wp.copy(s).applyMatrix4(sj.matrixWorld));
          if (d > m) {
            m = d;
            pt = part;
          }
        }
        if (m > 0.01) shHit++;
        if (m > shMax) {
          shMax = m;
          shPart = pt;
        }
      }
      // hoja
      const bj = rig.joints.sword;
      let m = 0,
        pt = '';
      for (const s of bladePts) {
        const [d, part] = depthIn(wp.copy(s).applyMatrix4(bj.matrixWorld));
        if (d > m) {
          m = d;
          pt = part;
        }
      }
      if (m > 0.01) blHit++;
      if (m > blMax) {
        blMax = m;
        blPart = pt;
      }
      // dirección de la hoja en el plano del suelo respecto al frente del cuerpo
      const b0 = new T.Vector3().fromArray(W.trail[0]).applyMatrix4(bj.matrixWorld);
      const b1 = new T.Vector3().fromArray(W.tip).applyMatrix4(bj.matrixWorld);
      const dx = b1.x - b0.x,
        dz = b1.z - b0.z;
      if (Math.hypot(dx, dz) > 0.05) {
        let a = Math.atan2(dx, dz) - yaw;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        aim += Math.abs(a);
        aimN++;
      }
    }
    res[name] = {
      escudo: `${((100 * shHit) / n).toFixed(0).padStart(3)}% máx ${(shMax * 100).toFixed(1).padStart(4)} cm ${shPart}`,
      hoja: `${((100 * blHit) / n).toFixed(0).padStart(3)}% máx ${(blMax * 100).toFixed(1).padStart(4)} cm ${blPart}`,
      punta: aimN ? Math.round(((aim / aimN) * 180) / Math.PI) + '°' : '-',
      empuje: `${((push / n) * 100).toFixed(1)} / ${(pushMax * 100).toFixed(1)} cm`,
    };
  }
  g.lockTarget = null;
  return res;
}, arma);
console.log('arma:', arma);
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(18), 'escudo', v.escudo.padEnd(22), 'hoja', v.hoja.padEnd(22), 'punta', v.punta.padEnd(5), 'empuje med/máx', v.empuje);
if (logs.length) console.log(logs.join('\n'));
await b.close();
