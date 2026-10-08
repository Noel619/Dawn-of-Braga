// El jefe final entero, jugado por un robot: se agarra, trepa y apuñala de
// verdad (sin atajos de sigilos) en las dos peleas.
//
//   El Turiferario: por la cola, la espalda y la joroba hasta la nuca; tras
//   un mazazo, por la cadena de la campana hasta la mano; de rodillas, por la
//   casulla hasta el núcleo. Revienta, la nave estalla y se alza Deo.
//   Deo Ignoto: cada brazo alzado, al quedarse plantado, del dorso de la mano
//   al sigilo del codo; desplomado, por la grieta de la máscara a los dos
//   ojos. Se hunde; se entra en la nave por la brecha de la fachada.
//
// La IA de los colosos va congelada mientras se trepa (para que el robot no
// tenga que esquivar) y el jugador es invulnerable; los golpes que provocan
// las rutas (el mazazo, los brazos que golpean) se piden a mano.
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
  // el estado de la trepada
  window.__R = () => {
    const c = C();
    return { on: c.active, route: c.route && c.route.id, s: c.s != null ? +c.s.toFixed(2) : null, mode: c.mode, st: Math.round(g.player.st) };
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
  // agarrarse a una ruta del coloso cerca de s: de pie en el suelo junto al
  // punto (probando a varios lados) y «interactuar»
  window.__grab = (id, s = 0.3) => {
    const r = C().boss.routes().find((q) => q.id === id);
    if (!r) return 'no existe ' + id;
    if (!r.on) return 'ruta apagada ' + id;
    r.eval && r.eval();
    const P = new T.Vector3(),
      Tn = new T.Vector3(),
      N = new T.Vector3();
    r.sample(s, P, Tn, N);
    const side = Tn.clone().cross(N).setY(0);
    const dirs = [new T.Vector3(N.x, 0, N.z), side, side.clone().negate(), new T.Vector3(-Tn.x, 0, -Tn.z)];
    for (const d of dirs) {
      if (d.lengthSq() < 1e-3) continue;
      d.normalize();
      for (const k of [1.0, 1.5, 0.6, 2.0]) {
        const x = P.x + d.x * k,
          z = P.z + d.z * k;
        const y = g.world.col.groundHeight(x, z, 0.3, Math.max(P.y, 0) + 1.5);
        if (y < -40) continue;
        g.player.spawn(x, y, z, Math.atan2(P.x - x, P.z - z));
        g.update(1 / 30);
        if (C().findGrab()) {
          window.__sim(0.2, [], ['KeyE']);
          if (C().active) return 'ok';
        }
      }
    }
    return 'no se agarra';
  };
  // trepar hacia delante (W: siempre hacia el sigilo) hasta s en la ruta id
  window.__climb = (id, sT, maxT = 30) => __run(maxT, ['KeyW'], () => !C().active || (C().route && C().route.id === id && C().s >= sT));
  // puñaladas cargadas
  window.__stab = (n) => {
    for (let k = 0; k < n; k++) {
      if (!C().active) break;
      window.__sim(1.15, ['M0']);
      window.__run(0.8);
    }
  };
});

const steps = [
  // ---------------------------------------------------------------- el Turiferario
  "(async()=>{const g=__game;await g.dev.instance('tur');g.dev.god=true;g.dev.freezeAI=true;__run(1);return {stage:g.finale.stage,st:g.finale.tur.st}})()",
  // por la cola, la espalda y la joroba hasta la nuca
  "(()=>{const g=__game,t=g.finale.tur;const r=__grab('cola',0.4);const n=t.route.nuca;const time=__climb('nuca',n.L-0.25,40);const at=__R();__stab(3);__run(2.5);return {grab:r,time,at,nuca:t.sig.nuca.dead}})()",
  // un mazazo: la campana se clava y se trepa por la cadena hasta la mano
  "(()=>{const g=__game,t=g.finale.tur;__run(3,[],()=>t.st==='idle');g.player.spawn(t.pos.x+2,0,t.pos.z+9,Math.PI);t.attack('slam');__run(5,[],()=>t.route.cadena.on);const on=t.route.cadena.on;const r=on?__grab('cadena',0.6):'cadena apagada';const time=__climb('cadena',t.route.cadena.L-0.3,30);const at=__R();__stab(3);__run(3);return {on,grab:r,time,at,mano:t.sig.mano.dead,phase:t.phase}})()",
  // de rodillas, por la casulla hasta el núcleo; revienta y se alza Deo
  "(()=>{const g=__game,t=g.finale.tur;__run(12,[],()=>t.route.pecho.on);const on=t.route.pecho.on;const r=on?__grab('pecho',0.3):'pecho apagado';const time=__climb('pecho',t.route.pecho.L-0.2,20);const at=__R();__stab(3);const stages=[];__run(30,[],()=>{if(!stages.includes(g.finale.stage))stages.push(g.finale.stage);return g.finale.stage==='deo'});return {on,grab:r,time,at,nucleo:t.sig.nucleo.dead,stages,deo:g.finale.deo.st}})()",
  // ---------------------------------------------------------------- Deo Ignoto
  // los dos brazos alzados: golpea, se queda plantado y se trepa del dorso al codo
  "(()=>{const g=__game,d=g.finale.deo;g.dev.freezeAI=true;const out=[];for(const i of [4,5]){g.player.spawn(i===4?16:-14.5,0,-47,Math.PI);__run(0.3);d._slam(i);__run(5,[],()=>d.arms.planted(i));const r=d.route['brazo'+i];const on=r.on;const gr=on?__grab('brazo'+i,0.4):'apagada';const time=__climb('brazo'+i,r.L-0.3,30);const at=__R();__stab(3);__run(3.5);out.push({i,on,grab:gr,time,at,dead:d.sig['brazo'+i].dead})}__run(16,[],()=>d.st==='bowed'&&!g.finale.bowCam);return {arms:out,st:d.st,facade:g.finale.facadeDown}})()",
  // desplomado: por la grieta de la máscara a la cuenca izquierda y, por el puente de la nariz, a la derecha
  "(()=>{const g=__game,d=g.finale.deo,m=d.route.mascara;const r=__grab('mascara',0.4);const t1=__climb('mascara',m.cum[5]-0.1,30);const a1=__R();__stab(2);const ojoL=d.sig.ojoL.dead;__run(3.6,['M2']);__run(3.5);const t2=__climb('mascara',m.cum[11]-0.1,30);const a2=__R();__stab(2);const stages=[];__run(16,[],()=>{if(!stages.includes(g.finale.stage))stages.push(g.finale.stage);return g.finale.stage==='done'});return {grab:r,t1,a1,ojoL,t2,a2,ojoR:d.sig.ojoR.dead,stages,boss:!!g.flags['boss:turibulario']}})()",
  // por la brecha de la fachada, hasta la reja de la cripta
  "(()=>{const g=__game;g.player.spawn(0,0,-46,Math.PI);g.camRig.yaw=Math.PI;__run(14,['KeyW'],()=>g.player.pos.z<-84);g.dev.god=false;g.dev.freezeAI=false;return {pos:g.player.pos.toArray().map(v=>+v.toFixed(1)),stage:g.finale.stage}})()",
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
