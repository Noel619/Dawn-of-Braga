// Al echar a andar (y al pararse): lo que patina cada pie apoyado. Pone a
// una criatura sola en medio del patio de armas, quieta un rato (los pies,
// anclados), y la hace arrancar de golpe hacia delante, andando o
// corriendo, desde ocho momentos distintos del paso (la fase con la que se
// quedó quieta); la lleva dos segundos y la para. Mide, por pie, lo que se
// mueve en el mundo mientras está apoyado (el tobillo a su altura de
// reposo), en centímetros: en el arranque, en la marcha ya hecha y al
// pararse. Así se prueba la marcha de siempre (#29 en bugs_y_correciones).
//   node tools/arranque.mjs soldier            (requiere npx vite --port 5199)
//   node tools/arranque.mjs soldier,penitent   (varias)
//   node tools/arranque.mjs jugador            (el del jugador)
import { chromium } from "playwright";
const tipos = (process.argv[2] || "soldier").split(",");
// (ARRANQUE_DEBUG=corre,0.375,footR: fotograma a fotograma, ese pie)
const dbg = process.env.ARRANQUE_DEBUG
  ? process.env.ARRANQUE_DEBUG.split(",")
  : null;
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const p = await b.newPage({ viewport: { width: 320, height: 240 } });
const logs = [];
p.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message));
let peor = 0;
for (const tipo of tipos) {
  await p.goto("http://localhost:5199/?dev=1");
  await p.waitForFunction(() => window.__ready, null, { timeout: 180000 });
  const r = await p.evaluate(
    async ([tipo, dbg]) => {
      const trace = [];
      window.__pause = true;
      const g = __game;
      g.ui.closeAll();
      g.dev.god = true;
      const X = -80,
        Z = -2,
        Y = 0;
      const jug = tipo === "jugador";
      let e = null;
      if (!jug) {
        e = g.enemies.find((q) => q.type === tipo);
        if (!e) return { err: "no hay " + tipo };
        for (const o of g.enemies)
          if (o !== e) {
            o.dead = true;
            o.state = "dead";
            o.stT = 99;
            o.obj.visible = false;
          }
        e.dead = false;
        e.state = "chase";
        e.scripted = true;
        e.obj.visible = true;
        e.anim.stop(0);
        g.player.spawn(X - 30, Y, Z + 20, 0);
      } else g.player.spawn(X, Y, Z, Math.PI / 2);
      const P = g.player;
      // quién: su cuerpo, su marcha, sus pies y cómo se le mueve y se le anima
      const who = jug
        ? {
            gait: P.gait,
            rig: P.rig,
            pos: P.body.pos,
            set(x, z, vx, vz, yaw = Math.PI / 2) {
              P.body.pos.set(x, Y, z);
              P.body.grounded = true;
              P.vx = vx;
              P.vz = vz;
              P.yaw = yaw;
            },
            step(dt) {
              P.animate(dt);
            },
            // (andando, al paso; corriendo, al trote: player.js, WALK y JOG)
            walk: 2.2,
            run: 4.5,
          }
        : {
            gait: e.gait,
            rig: e.rig,
            pos: e.pos,
            set(x, z, vx, vz, yaw = Math.PI / 2) {
              e.body.pos.set(x, Y, z);
              e.vx = vx;
              e.vz = vz;
              e.yaw = yaw;
            },
            step(dt) {
              e.animate(dt);
            },
            walk: e.T.walk,
            run: e.T.run || e.T.walk,
          };
      if (!who.gait) return { err: tipo + " no anda con la marcha (Biped)" };
      const feet = ["footL", "footR"].filter((j) => who.rig.joints[j]);
      const wp = new g.THREE.Vector3();
      const dt = 1 / 60;
      const res = [];
      for (const modo of ["anda", "corre"]) {
        const V = modo === "anda" ? who.walk : who.run;
        for (let k = 0; k < 8; k++) {
          const ph = k / 8;
          // quieto un buen rato, con la fase del paso en la que se paró
          let x = X,
            vx = 0;
          for (let i = 0; i < 90; i++) {
            who.set(x, Z, 0, 0);
            if (i === 60) who.gait.phase = ph;
            who.step(dt);
            g.time += dt;
          }
          // arranca (como steerTo: la velocidad, amortiguada), dos segundos;
          // luego se para y se queda quieto otro rato
          const slip = { arranque: {}, marcha: {}, parada: {} };
          for (const t of Object.keys(slip))
            for (const j of feet) slip[t][j] = 0;
          const prev = {};
          const T0 = 2.0,
            T1 = 3.2;
          for (let t = 0; t < T1; t += dt) {
            const want = t < T0 ? V : 0;
            vx += (want - vx) * (1 - Math.exp(-8 * dt));
            x += vx * dt;
            who.set(x, Z, vx, 0);
            who.step(dt);
            g.time += dt;
            const tramo = t < 0.9 ? "arranque" : t < T0 ? "marcha" : "parada";
            for (const j of feet) {
              who.rig.joints[j].getWorldPosition(wp);
              const planted =
                wp.y - who.pos.y < who.gait.ankleH + 0.03 * who.gait.scale;
              const dd =
                planted && prev[j] && prev[j].planted
                  ? Math.hypot(wp.x - prev[j].x, wp.z - prev[j].z)
                  : 0;
              slip[tramo][j] += dd;
              if (
                dbg &&
                dbg[0] === modo &&
                +dbg[1] === ph &&
                dbg[2] === j &&
                t < 1.2
              ) {
                const G = who.gait,
                  sd = j === "footL" ? "L" : "R";
                trace.push(
                  [
                    t.toFixed(3),
                    "u",
                    G._u[sd].toFixed(3),
                    "y",
                    (wp.y - who.pos.y).toFixed(3),
                    "mw",
                    G.mw.toFixed(2),
                    "spd",
                    G.spd.toFixed(2),
                    "W",
                    G.lkS[sd].toFixed(2),
                    "st",
                    G.pl[sd].st,
                    "duty",
                    G.duty.toFixed(2),
                    "d",
                    (dd * 100).toFixed(1),
                  ].join(" "),
                );
              }
              prev[j] = { x: wp.x, z: wp.z, planted };
            }
          }
          res.push({
            modo,
            ph,
            ...Object.fromEntries(
              Object.entries(slip).map(([t, s]) => [
                t,
                Object.fromEntries(
                  Object.entries(s).map(([j, v]) => [j, Math.round(v * 100)]),
                ),
              ]),
            ),
          });
        }
      }
      // Las maniobras: en curva, de lado, hacia atrás, la media vuelta sin
      // pararse, el giro en el sitio y el zigzag. Cada una desde quieto (medio
      // segundo) y con la velocidad y el rumbo como los lleva la criatura
      // (amortiguados); lo que patina cada pie apoyado en toda la maniobra.
      const turnTo = (a, b, m) => {
        let d =
          ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
            (2 * Math.PI)) -
          Math.PI;
        return a + Math.max(-m, Math.min(m, d));
      };
      const V0 = who.walk,
        V1 = who.run;
      const MAN = {
        // (rumbo de la marcha y hacia dónde mira, según t; v, la velocidad que quiere)
        curva: {
          dur: 4,
          f: (t) => ({ v: V0, hd: Math.PI / 2 + (t * V0) / 2.5 }),
        },
        curva_corre: {
          dur: 4,
          f: (t) => ({ v: V1, hd: Math.PI / 2 + (t * V1) / 4 }),
        },
        lado: {
          dur: 2.5,
          f: () => ({ v: V0 * 0.8, hd: 0, look: Math.PI / 2 }),
        },
        atras: {
          dur: 2.5,
          f: () => ({ v: V0 * 0.6, hd: -Math.PI / 2, look: Math.PI / 2 }),
        },
        vuelta: {
          dur: 3,
          f: (t) => ({ v: V0, hd: t < 1.5 ? Math.PI / 2 : -Math.PI / 2 }),
        },
        giro: {
          dur: 2,
          f: (t) => ({
            v: 0,
            hd: Math.PI / 2,
            look: Math.PI / 2 + Math.min(Math.PI, t * 3),
          }),
        },
        zigzag: {
          dur: 3.2,
          f: (t) => ({
            v: V0,
            hd: Math.PI / 2 + (Math.floor(t / 0.8) % 2 ? 0.8 : -0.8),
          }),
        },
      };
      const man = [];
      for (const [name, M] of Object.entries(MAN)) {
        let x = X,
          z = Z,
          vx = 0,
          vz = 0,
          yaw = Math.PI / 2;
        for (let i = 0; i < 30; i++) {
          who.set(x, z, 0, 0, yaw);
          who.step(dt);
          g.time += dt;
        }
        const slip = Object.fromEntries(feet.map((j) => [j, 0]));
        const prev = {};
        let steps = 0;
        for (let t = 0; t < M.dur; t += dt) {
          const q = M.f(t);
          const tx = Math.sin(q.hd) * q.v,
            tz = Math.cos(q.hd) * q.v;
          vx += (tx - vx) * (1 - Math.exp(-8 * dt));
          vz += (tz - vz) * (1 - Math.exp(-8 * dt));
          x += vx * dt;
          z += vz * dt;
          // (mira a donde va, girando a 5 rad/s como steerTo; o a donde le dicen)
          const want =
            q.look ?? (Math.hypot(vx, vz) > 0.1 ? Math.atan2(vx, vz) : yaw);
          yaw =
            q.look !== undefined && name !== "giro"
              ? q.look
              : turnTo(yaw, want, 5 * dt);
          if (name === "giro") yaw = q.look;
          who.set(x, z, vx, vz, yaw);
          who.step(dt);
          g.time += dt;
          for (const j of feet) {
            who.rig.joints[j].getWorldPosition(wp);
            const planted =
              wp.y - who.pos.y < who.gait.ankleH + 0.03 * who.gait.scale;
            const dd =
              planted && prev[j] && prev[j].planted
                ? Math.hypot(wp.x - prev[j].x, wp.z - prev[j].z)
                : 0;
            slip[j] += dd;
            if (planted && prev[j] && !prev[j].planted) steps++;
            if (
              dbg &&
              dbg[0] === name &&
              dbg[2] === j &&
              (dd > 0.003 || t < +(dbg[3] || 0))
            ) {
              const G = who.gait,
                sd = j === "footL" ? "L" : "R";
              const tg = G.target[sd];
              trace.push(
                [
                  t.toFixed(3),
                  "u",
                  G._u[sd].toFixed(3),
                  "ph",
                  G.phase.toFixed(3),
                  "still",
                  G._still ? 1 : 0,
                  "y",
                  (wp.y - who.pos.y).toFixed(3),
                  "mw",
                  G.mw.toFixed(2),
                  "W",
                  G.lkS[sd].toFixed(2),
                  "st",
                  G.pl[sd].st,
                  "ox",
                  G.pl[sd].ox.toFixed(2),
                  G.pl[sd].oz.toFixed(2),
                  "tg",
                  tg.x.toFixed(2),
                  tg.y.toFixed(2),
                  tg.z.toFixed(2),
                  "d",
                  (dd * 100).toFixed(1),
                ].join(" "),
              );
            }
            prev[j] = { x: wp.x, z: wp.z, planted };
          }
        }
        man.push({
          name,
          steps,
          ...Object.fromEntries(
            Object.entries(slip).map(([j, v]) => [j, Math.round(v * 100)]),
          ),
        });
      }
      return { res, trace, man };
    },
    [tipo, dbg],
  );
  if (r.trace && r.trace.length) console.log(r.trace.join("\n"));
  if (r.err) {
    console.log(tipo + ":", r.err);
    continue;
  }
  console.log(`== ${tipo}: lo que patina cada pie apoyado (cm, L/R)`);
  console.log("modo   fase   arranque   marcha    parada");
  for (const q of r.res) {
    const f = (o) => `${o.footL ?? "-"}/${o.footR ?? "-"}`.padEnd(10);
    console.log(
      q.modo.padEnd(6),
      q.ph.toFixed(3).padEnd(6),
      f(q.arranque),
      f(q.marcha),
      f(q.parada),
    );
    peor = Math.max(
      peor,
      ...Object.values(q.arranque),
      ...Object.values(q.parada),
    );
  }
  console.log("maniobra      patina L/R (cm)   pasos");
  for (const q of r.man)
    console.log(
      q.name.padEnd(13),
      `${q.footL ?? "-"}/${q.footR ?? "-"}`.padEnd(17),
      String(q.steps).padStart(5),
    );
}
console.log("peor (arranque o parada):", peor, "cm");
if (logs.length) console.log(logs.join("\n"));
await b.close();
