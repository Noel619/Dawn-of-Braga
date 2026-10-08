// El jefe final entero, jugado por un robot: se agarra a la piel, trepa y
// apuñala de verdad (sin atajos de sigilos) en las dos peleas.
//
//   El Turiferario: de la punta de la cola, por su lomo y la espalda, hasta
//   la nuca; tras un mazazo, por la cadena de la campana hasta la mano; de
//   rodillas, por la ropa del pecho hasta el núcleo. Revienta, la nave
//   estalla y se alza Deo.
//   Deo Ignoto: cada brazo alzado, al quedarse plantado, de los nudillos al
//   sigilo del codo; desplomado, por la máscara a los dos ojos. Se hunde; se
//   entra en la nave por la brecha de la fachada.
//
// El robot trepa como un jugador: con el stick simulado (climb.autoMove)
// hacia puntos de paso por la piel. La IA de los colosos va congelada
// mientras se trepa (para que el robot no tenga que esquivar) y el jugador
// es invulnerable; los golpes que abren el camino (el mazazo, los brazos que
// golpean) se piden a mano.
//   node tools/finale.mjs        (con npx vite --port 5199 en marcha)
import { chromium } from 'playwright';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
p.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) logs.push('console.error: ' + m.text());
});
await p.goto('http://localhost:5199/?dev=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await p.evaluate(async () => {
  window.__pause = true;
  const g = __game;
  g.input.enabledPointerLock = false;
  g.input.onPointerLockLost = null;
  g.ui.closeAll();
  await g.colossi.model('turiferario');
  await g.colossi.model('deo');
  const T = g.THREE;
  const F = g.finale;
  const C = () => F.climb;
  const _w = new T.Vector3();
  // el estado de la trepada
  window.__R = () => {
    const c = C();
    return { on: c.active, zone: c.zone, mode: c.mode, sig: c.sig ? c.sig.id : null, st: Math.round(g.player.st) };
  };
  // adelanta sin dibujar (con teclas pulsadas) hasta que se cumpla 'until'
  window.__run = (sec, keys = [], until = null) => {
    const inp = g.input;
    for (const k of keys) inp.keys.add(k);
    let t = 0;
    for (; t < sec; t += 1 / 30) {
      g.update(1 / 30);
      if (until && until()) break;
    }
    for (const k of keys) {
      inp.keys.delete(k);
      inp.kReleased.add(k);
    }
    g.update(1 / 30);
    return +t.toFixed(2);
  };
  // un punto pegado a un hueso del coloso (x, y, z en el espacio del hueso)
  window.__bone = (boss, bn, x = 0, y = 0, z = 0) => (o) => {
    const B = boss.M.byName[bn];
    B.updateMatrixWorld();
    return o.set(x, y, z).applyMatrix4(B.matrixWorld);
  };
  // un punto de la ruta vieja de Deo (espacio del modelo en reposo, pegado a
  // su hueso)
  window.__rest = (boss, q) => (o) => {
    const rw = boss.M.restWorld[q.bone];
    const B = boss.M.byName[q.bone];
    B.updateMatrixWorld();
    return o.set(q.p[0] - rw.x, q.p[1] - rw.y, q.p[2] - rw.z).applyMatrix4(B.matrixWorld);
  };
  // un punto delante de un sigilo, a dist metros (por donde se le llega)
  window.__sigAt = (boss, id, dist) => (o) => {
    const S = boss.sig[id];
    S.b.updateMatrixWorld();
    return o.copy(S.off).addScaledVector(S.n, dist).applyMatrix4(S.b.matrixWorld);
  };
  // agarrarse a la piel de una de las zonas, de pie en el suelo junto a
  // alguno de los puntos (probando alrededor) e «interactuando»
  window.__grab = (zones, pts) => {
    const c = C();
    for (const pt of pts) {
      const P = pt(_w).clone();
      for (const r of [1.4, 1.9, 2.4, 3.0, 3.6])
        for (let a = 0; a < 16; a++) {
          const ang = (a / 16) * Math.PI * 2;
          const x = P.x + Math.cos(ang) * r,
            z = P.z + Math.sin(ang) * r;
          const y = g.world.col.groundHeight(x, z, 0.3, 3);
          if (y < -5) continue;
          g.player.spawn(x, y, z, Math.atan2(P.x - x, P.z - z));
          g.update(1 / 30);
          const k = c.findGrab();
          // (por arriba o por un costado: no bajo un saliente)
          if (!k || k.kind !== 'skin' || !zones.includes(c.surf.zoneOf(k.att)) || k.N.y < 0.05) continue;
          window.__sim(0.2, [], ['KeyE']);
          __run(0.8, [], () => c.active);
          if (c.active) return 'ok ' + c.zone;
        }
    }
    return 'no se agarra';
  };
  // agarrarse a la cadena (cerca de la campana clavada)
  window.__grabRope = () => {
    const c = C();
    const r = (c.boss.ropes() || []).find((q) => q.on);
    if (!r) return 'sin cadena';
    const Tn = new T.Vector3();
    for (const s of [0.8, 1.4, 2.0, 2.8])
      for (const d of [0.9, 1.3, 0.6])
        for (let a = 0; a < 8; a++) {
          const P = r.at(s, new T.Vector3(), Tn);
          const ang = (a / 8) * Math.PI * 2;
          const x = P.x + Math.cos(ang) * d,
            z = P.z + Math.sin(ang) * d;
          const y = g.world.col.groundHeight(x, z, 0.3, 3);
          if (y < -5) continue;
          g.player.spawn(x, y, z, Math.atan2(P.x - x, P.z - z));
          g.update(1 / 30);
          const k = c.findGrab();
          if (!k || k.kind !== 'rope') continue;
          window.__sim(0.2, [], ['KeyE']);
          __run(0.8, [], () => c.active);
          if (c.active) return 'ok ' + c.zone;
        }
    return 'no se agarra';
  };
  // trepar hacia los puntos de paso, uno tras otro (si no avanza, al
  // siguiente), hasta tener a mano el sigilo 'want'. Como un jugador: si el
  // punto queda tras un saliente, sube; si se atasca en el último, rodea
  window.__follow = (wps, want, maxT = 60, reach = 1.0, bias = true) => {
    const c = C();
    let wi = 0,
      best = Infinity,
      stuck = 0,
      esc = 0,
      escX = 0.8,
      t = 0;
    const tg = new T.Vector3();
    window.__trace = [];
    for (let f = 0; t < maxT && c.active; t += 1 / 30, f++) {
      wps[wi](tg);
      let mv = c.steerTo(tg);
      _w.subVectors(tg, c.P);
      const L = _w.length();
      if (L > 1.5 && _w.dot(c.Ns) < -0.55 * L) mv = { x: 0, y: 1 };
      // colgado de un costado, con el punto más arriba: primero, subir (a lo
      // alto del brazo o de la cola se anda de pie)
      else if (bias && c.mode === 'hang' && tg.y > c.P.y - 0.3) mv = { x: mv.x * 0.6, y: Math.max(mv.y, 0.8) };
      if (esc > 0) {
        mv = { x: escX, y: 0.75 };
        esc -= 1 / 30;
      }
      // (a ras de suelo, hacia atrás se bajaría: no)
      if (c.P.y < 2.6 && mv.y < -0.2) mv = { x: mv.x, y: -0.2 };
      c.autoMove = mv;
      g.update(1 / 30);
      // (al alcance: un poco más cerca, que la puñalada no se quede corta)
      if (c.sig && c.sig.id === want) {
        const S = c.boss.sig[want];
        const sp = c.boss.sigilPos(S, new T.Vector3());
        for (let k = 0; k < 45 && c.active && sp.distanceTo(c.handPos(_w)) > S.r + 0.35; k++) {
          c.autoMove = c.steerTo(c.boss.sigilPos(S, sp));
          g.update(1 / 30);
        }
        break;
      }
      const d = c.P.distanceTo(tg);
      if (f % 30 === 0) __trace.push([Math.round(t), wi, c.zone, c.mode[0], +d.toFixed(1), Math.round(g.player.st), c.P.toArray().map((v) => +v.toFixed(1))]);
      if (d < best - 0.05) {
        best = d;
        stuck = 0;
      } else stuck += 1 / 30;
      if (wi < wps.length - 1 && (d < reach || stuck > 2.5)) {
        wi++;
        best = Infinity;
        stuck = 0;
      } else if (wi === wps.length - 1 && stuck > 2.0) {
        esc = 1.4;
        escX = -escX;
        stuck = 0;
        best = Infinity;
      }
    }
    c.autoMove = null;
    return +t.toFixed(1);
  };
  // por la cadena, hacia la mano, hasta el sigilo
  window.__upRope = (want, maxT = 30) => {
    const c = C();
    let t = 0;
    window.__trace = [];
    for (let f = 0; t < maxT && c.active; t += 1 / 30, f++) {
      c.autoMove = { x: 0, y: 1 };
      g.update(1 / 30);
      if (c.sig && c.sig.id === want) break;
      if (f % 30 === 0) __trace.push([Math.round(t), c.rope && +c.rope.s.toFixed(2), c.mode[0], Math.round(g.player.st), c.P.toArray().map((v) => +v.toFixed(1)), c.boss.sigilPos(c.boss.sig[want], _w).distanceTo(c.handPos(new T.Vector3())).toFixed(2)]);
    }
    c.autoMove = null;
    return +t.toFixed(1);
  };
  // puñaladas cargadas
  window.__stab = (n) => {
    for (let k = 0; k < n; k++) {
      if (!C().active) break;
      window.__sim(1.15, ['M0']);
      window.__run(0.8);
    }
  };
  // soltarse y llegar al suelo
  window.__drop = () => {
    const c = C();
    if (c.active) c.release(null, true);
    return __run(6, [], () => c.state === 'off' && g.player.body.grounded && !g.player.puppet);
  };
});

const steps = [
  // ---------------------------------------------------------------- el Turiferario
  "(async()=>{const g=__game;await g.dev.instance('tur');g.dev.god=true;g.dev.freezeAI=true;__run(1);return {stage:g.finale.stage,st:g.finale.tur.st}})()",
  // de la punta de la cola, por su lomo y la espalda, hasta la nuca
  "(()=>{const g=__game,t=g.finale.tur;const bo=(n,x,y,z)=>__bone(t,n,x,y,z);const r=__grab(['cola'],[bo('tail6'),bo('tail5'),bo('tail4')]);const wps=[bo('tail5',0,1,0),bo('tail4',0,1.2,0),bo('tail3',0,1.4,0),bo('tail2',0,1.6,0),bo('tail1',0,1.8,0),bo('spine1',0,0,-2.2),bo('spine2',0,0,-2.2),bo('chest',0,0,-2),bo('chest',0,2.6,-1.4),__sigAt(t,'nuca',2.2),(o)=>t.sigilPos(t.sig.nuca,o)];const time=__follow(wps,'nuca',60);const at=__R();const tr=at.sig?null:__trace;__stab(3);__run(2.5);return {grab:r,time,at,nuca:t.sig.nuca.dead,tr}})()",
  // un mazazo: la campana se clava y se trepa por la cadena hasta la mano
  "(()=>{const g=__game,t=g.finale.tur;const fell=__drop();__run(4,[],()=>t.st==='idle');g.player.spawn(t.pos.x+Math.sin(t.yaw)*9,0,t.pos.z+Math.cos(t.yaw)*9,t.yaw+Math.PI);t.attack('slam');__run(5,[],()=>t.chainRoute.on);const on=t.chainRoute.on;const r=on?__grabRope():'cadena apagada';const time=__upRope('mano',30);const at=__R();const tr=at.sig?null:__trace;__stab(3);__run(3);return {fell,on,grab:r,time,at,mano:t.sig.mano.dead,phase:t.phase,tr}})()",
  // de rodillas, por la ropa del pecho hasta el núcleo; revienta y se alza Deo
  "(()=>{const g=__game,t=g.finale.tur;const fell=__drop();__run(14,[],()=>t.st==='kneel'&&t.stT>2);const kneel=t.st;const bo=(n,x,y,z)=>__bone(t,n,x,y,z);const r=__grab(['alba','casulla','pecho'],[bo('pelvis',0,0,2.6),bo('pelvis',1.5,0,2.4),bo('pelvis',-1.5,0,2.4),bo('spine1',0,0,2.6)]);const wps=[bo('spine1',0,0,2.6),bo('spine2',0,0,2.6),(o)=>t.sigilPos(t.sig.nucleo,o)];const time=__follow(wps,'nucleo',30);const at=__R();const tr=at.sig?null:__trace;__stab(3);const stages=[];__run(30,[],()=>{if(!stages.includes(g.finale.stage))stages.push(g.finale.stage);return g.finale.stage==='deo'});return {fell,kneel,grab:r,time,at,nucleo:t.sig.nucleo.dead,stages,deo:g.finale.deo.st,tr}})()",
  // ---------------------------------------------------------------- Deo Ignoto
  // los dos brazos alzados: golpea, se queda plantado y se trepa de los nudillos al codo
  "(()=>{const g=__game,d=g.finale.deo;g.dev.freezeAI=true;const out=[];for(const i of [4,5]){__drop();g.player.spawn(i===4?16:-14.5,0,-47,Math.PI);__run(0.3);d._slam(i);__run(5,[],()=>d.arms.planted(i));const on=d.zoneOn('brazo'+i);const pts=d.E.climb['brazo'+i].pts.map((q)=>__rest(d,q));const W=d.M.byName['a'+i+'w'],E=d.M.byName['a'+i+'e'];const fa=(k,up=1.6)=>(o)=>o.copy(W.getWorldPosition(new g.THREE.Vector3())).lerp(E.getWorldPosition(new g.THREE.Vector3()),k).add(new g.THREE.Vector3(0,up,0));const gr=on?__grab(['brazo'+i],[fa(0,0),pts[0],pts[1]]):'apagada';const time=__follow([pts[1],fa(0,1.8),fa(0.12),fa(0.3),fa(0.5),fa(0.7),fa(0.85),(o)=>d.sigilPos(d.sig['brazo'+i],o)],'brazo'+i,40);const tr=__R().sig?null:__trace;const at=__R();__stab(3);__run(3.5);out.push({i,on,grab:gr,time,at,dead:d.sig['brazo'+i].dead,tr})}__drop();__run(16,[],()=>d.st==='bowed'&&!g.finale.bowCam);return {arms:out,st:d.st,facade:g.finale.facadeDown}})()",
  // desplomado: por la máscara a la cuenca izquierda y luego a la derecha
  "(()=>{const g=__game,d=g.finale.deo;const pts=d.E.climb.mascara.pts.map((q)=>__rest(d,q));const r=__grab(['mascara'],pts.slice(0,4));const t1=__follow([...pts.slice(1),(o)=>d.sigilPos(d.sig.ojoL,o)],'ojoL',40,1.0,false);const a1=__R();const tr1=a1.sig?null:__trace;__stab(2);const ojoL=d.sig.ojoL.dead;__run(2);const C=g.finale.climb;const r2=C.active?'sigue agarrado':(__drop(),__run(3,[],()=>d.st==='bowed'),__grab(['mascara'],[pts[0],pts[1],(o)=>d.maskP(-1.2,-2.2,0.6,o),(o)=>d.maskP(1.2,-2.2,0.6,o)]));const t2=__follow([...pts.slice(1),(o)=>d.sigilPos(d.sig.ojoR,o)],'ojoR',40,1.0,false);const a2=__R();const tr2=a2.sig?null:__trace;__stab(2);const stages=[];__run(16,[],()=>{if(!stages.includes(g.finale.stage))stages.push(g.finale.stage);return g.finale.stage==='done'});return {grab:r,t1,a1,ojoL,r2,t2,a2,ojoR:d.sig.ojoR.dead,stages,boss:!!g.flags['boss:turibulario'],tr1,tr2}})()",
  // por la brecha de la fachada, hasta la reja de la cripta
  "(()=>{const g=__game;__drop();g.player.spawn(0,0,-46,Math.PI);g.camRig.yaw=Math.PI;__run(14,['KeyW'],()=>g.player.pos.z<-84);g.dev.god=false;g.dev.freezeAI=false;return {pos:g.player.pos.toArray().map(v=>+v.toFixed(1)),stage:g.finale.stage}})()",
];
let fails = 0;
for (const s of steps) {
  let r;
  try {
    r = await p.evaluate(s);
  } catch (e) {
    r = 'ERR ' + e.message;
    fails++;
  }
  console.log(s.slice(0, 60).padEnd(62), JSON.stringify(r));
}
if (logs.length) console.log(logs.slice(0, 20).join('\n'));
await b.close();
process.exit(fails || logs.length ? 1 : 0);
