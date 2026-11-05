// Los golpes de una criatura, fotograma a fotograma. La pone sola en medio
// del patio de armas, de perfil, con el jugador delante (quieto, sin que se le
// vea), y para cada uno de sus ataques (T.attacks) lo arranca y saca ocho
// fotogramas repartidos por su duración, de lado y de tres cuartos; los pega
// en una hoja por criatura, tools/shots/golpes/<tipo>.png (dos filas por
// golpe). Y mide lo que delata un golpe sin peso:
//  - los pies que patinan: lo que se mueve en el mundo un pie mientras está
//    apoyado (el tobillo a su altura de reposo), en centímetros;
//  - el cuerpo que se desliza: lo que viaja la criatura (su impulso) y si los
//    pies dan algún paso para acompañarlo;
//  - la cadera, que debe girar con el golpe y no quedarse cuadrada: su giro
//    máximo respecto al pecho;
//  - la cabeza, que debe seguir mirando al objetivo: su desviación máxima.
//   node tools/golpes.mjs soldier [combo]     (requiere npx vite --port 5199)
//   node tools/golpes.mjs penitent,cortesano  (varias criaturas)
import { chromium } from "playwright";
import fs from "fs";
const tipos = (process.argv[2] || "soldier").split(",");
const solo = process.argv[3] || null;
const out = "tools/shots/golpes";
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const p = await b.newPage({ viewport: { width: 480, height: 360 } });
const logs = [];
p.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message));
for (const tipo of tipos) {
  // (una página por criatura: las que se apartan para la anterior quedan
  // muertas, con su estado a medias)
  await p.goto("http://localhost:5199/?dev=1");
  await p.waitForFunction(() => window.__ready, null, { timeout: 180000 });
  const r = await p.evaluate(
    async ([tipo, solo]) => {
      window.__pause = true;
      const g = __game,
        T3 = g.THREE;
      g.ui.closeAll();
      g.ui.showHud(false);
      g.player.maxHp = g.player.hp = 1e9;
      g.dev.god = true;
      const e = g.enemies.find((q) => q.type === tipo);
      if (!e) return { err: "no hay " + tipo };
      for (const o of g.enemies)
        if (o !== e) {
          o.dead = true;
          o.state = "dead";
          o.stT = 99;
          o.obj.visible = false;
          if (o.shadow) o.shadow.visible = false;
        }
      // (en el patio de armas, donde no hay nada alrededor)
      const X = -80,
        Z = -2,
        Y = 0;
      const atks = e.T.attacks.filter((a) => !solo || a.name === solo);
      const N = 8;
      const res = [];
      const W = 200,
        H = 150;
      const sheet = document.createElement("canvas");
      sheet.width = 90 + W * N;
      sheet.height = H * 2 * atks.length;
      const sx = sheet.getContext("2d");
      sx.fillStyle = "#111";
      sx.fillRect(0, 0, sheet.width, sheet.height);
      sx.font = "13px monospace";
      const wp = new T3.Vector3();
      const fwd = new T3.Vector3();
      for (let ai = 0; ai < atks.length; ai++) {
        const a = atks[ai];
        // la criatura, mirando a +x; el jugador, a 2,2 m delante
        e.dead = false;
        e.state = "chase";
        e.hp = e.T.hp;
        e.obj.visible = true;
        e.anim.stop(0);
        e.body.pos.set(X, Y, Z);
        e.vx = e.vz = 0;
        e.yaw = Math.PI / 2;
        e.home = { x: X, y: Y, z: Z, yaw: e.yaw };
        g.player.spawn(
          X + Math.max(1.6, (a.min ?? 0) + 0.6),
          Y,
          Z,
          -Math.PI / 2,
        );
        g.player.obj.visible = false;
        g.playerShadow.visible = false;
        e.aware = true;
        e.sees = true;
        // (hasta que la criatura se despierta aquí: las de otras salas no se
        // animan hasta que el reparto de lo que se ve las alcanza)
        for (let i = 0, ok = 0; i < 240 && ok < 20; i++) {
          e.state = "chase";
          e.cooldown = 99;
          e.vx = e.vz = 0;
          e.body.pos.set(X, Y, Z);
          e.yaw = Math.PI / 2;
          g.update(1 / 60);
          ok =
            Math.hypot(e.obj.position.x - X, e.obj.position.z - Z) < 0.01
              ? ok + 1
              : 0;
        }
        // (un fotograma dibujado antes de empezar: la primera vez que se
        // dibuja aquí, la criatura aún venía de su sitio y sus pies, de allí)
        g.render();
        g.update(1 / 60);
        e.body.pos.set(X, Y, Z);
        e.vx = e.vz = 0;
        e.startAttack(a);
        const dur = a.dur;
        const feet = ["footL", "footR"].filter((j) => e.rig.joints[j]);
        const slip = Object.fromEntries(feet.map((j) => [j, 0]));
        const prev = {};
        let hipMax = 0,
          headMax = 0,
          steps = 0;
        const start = { x: e.pos.x, z: e.pos.z };
        const shots = [];
        const tk = Array.from({ length: N }, (_, k) => (dur * k) / (N - 1));
        let t = 0,
          next = 0;
        const dt = 1 / 60;
        const lastPlanted = {};
        while (t <= dur + 1e-6 && e.state === "attack") {
          // medidas
          for (const j of feet) {
            e.rig.joints[j].getWorldPosition(wp);
            // (apoyado: el tobillo a su altura de reposo, no levantado en un paso)
            const planted =
              wp.y - e.pos.y < (e.gait ? e.gait.ankleH : 0.08) + 0.03;
            if (planted && prev[j] && prev[j].planted && t > 0.02)
              slip[j] += Math.hypot(wp.x - prev[j].x, wp.z - prev[j].z);
            if (planted && lastPlanted[j] === false) steps++;
            lastPlanted[j] = planted;
            prev[j] = { x: wp.x, z: wp.z, planted };
          }
          const hq = e.rig.joints.hips ? e.rig.joints.hips.quaternion : null;
          const cq = e.rig.joints.chest ? e.rig.joints.chest.quaternion : null;
          if (hq && cq) {
            // (el giro de la cadera respecto al cuerpo: su yaw)
            const ey = new T3.Euler().setFromQuaternion(hq, "YXZ");
            hipMax = Math.max(hipMax, Math.abs(ey.y));
          }
          if (e.rig.joints.head) {
            e.rig.joints.head.getWorldDirection(fwd);
            const to = new T3.Vector3(
              g.player.pos.x - e.pos.x,
              0,
              g.player.pos.z - e.pos.z,
            ).normalize();
            fwd.y = 0;
            fwd.normalize();
            headMax = Math.max(
              headMax,
              (Math.acos(Math.max(-1, Math.min(1, fwd.dot(to)))) * 180) /
                Math.PI,
            );
          }
          if (next < N && t >= tk[next] - 1e-6) {
            // (sin el destello rojo de cuando el golpe alcanza al jugador)
            g.hurtFlash = 0;
            g.post.U.uHurt.value = 0;
            for (const [vi, cx, cz] of [
              [0, 0, 3.4],
              [1, 2.5, 2.5],
            ]) {
              // (la cámara sigue a la criatura si el golpe la lleva lejos)
              const tx = Math.max(X, e.pos.x) + 0.6,
                ty = Y + 1.05,
                tz = Z;
              g.camRig.override = {
                pos: new T3.Vector3(tx + cx, ty + 0.35, tz + cz),
                look: new T3.Vector3(tx, ty, tz),
                speed: 1000,
              };
              g.camera.position.set(tx + cx, ty + 0.35, tz + cz);
              g.camera.lookAt(tx, ty, tz);
              g.camera.updateMatrixWorld();
              g.render();
              sx.drawImage(
                g.renderer.domElement,
                80,
                20,
                320,
                240,
                90 + next * W,
                (ai * 2 + vi) * H,
                W,
                H,
              );
            }
            next++;
          }
          g.update(dt);
          t += dt;
        }
        g.camRig.override = null;
        sx.fillStyle = "#ddd";
        sx.fillText(a.name, 6, ai * 2 * H + 18);
        sx.fillText("lado", 6, ai * 2 * H + 36);
        sx.fillText("3/4", 6, (ai * 2 + 1) * H + 18);
        res.push({
          golpe: a.name,
          dur,
          viaja: +Math.hypot(e.pos.x - start.x, e.pos.z - start.z).toFixed(2),
          patina: Object.fromEntries(
            Object.entries(slip).map(([k, v]) => [k, Math.round(v * 100)]),
          ),
          pasos: steps,
          cadera: Math.round((hipMax * 180) / Math.PI),
          cabeza: Math.round(headMax),
        });
      }
      return { res, png: sheet.toDataURL("image/png").split(",")[1] };
    },
    [tipo, solo],
  );
  if (r.err) {
    console.log(tipo + ":", r.err);
    continue;
  }
  fs.writeFileSync(
    `${out}/${tipo}${solo ? "_" + solo : ""}.png`,
    Buffer.from(r.png, "base64"),
  );
  console.log(
    `== ${tipo}  (hoja: ${out}/${tipo}${solo ? "_" + solo : ""}.png)`,
  );
  console.log(
    "golpe".padEnd(10),
    "dur".padStart(5),
    "viaja m".padStart(8),
    " patinan los pies (cm)".padEnd(26),
    "pasos",
    "cadera°",
    "cabeza°",
  );
  for (const q of r.res)
    console.log(
      q.golpe.padEnd(10),
      q.dur.toFixed(2).padStart(5),
      String(q.viaja).padStart(8),
      "  " + JSON.stringify(q.patina).padEnd(24),
      String(q.pasos).padStart(5),
      String(q.cadera).padStart(7),
      String(q.cabeza).padStart(7),
    );
}
if (logs.length) console.log(logs.join("\n"));
await b.close();
