// Los sprites que salen del juego en 3D: los modelos de las criaturas, de los
// jefes, de los personajes y del Condenado con cada armadura, fotografiados
// solos (con su luz de retrato, el fondo recortado y el contorno de 1 px de los
// iconos), y las vistas de juego de cada zona. Todo se lee de la imagen de baja
// resolución del posproceso: son los píxeles del juego, sin reescalar.
// Se guardan en tools/scratch/hoja_de_ruta/ y no se repiten si ya están
// (salvo con --retratos).
import fs from 'fs';

const CACHE = 'tools/scratch/hoja_de_ruta';
const BASE = 'http://localhost:5199/';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
export const LAUNCH = { executablePath: '/opt/pw-browsers/chromium', args: ARGS };

const enCache = (k) => `${CACHE}/${k}.png`;
const leer = (k) => {
  const f = enCache(k);
  if (!fs.existsSync(f)) return null;
  const buf = fs.readFileSync(f);
  return { url: 'data:image/png;base64,' + buf.toString('base64'), w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
};
const guardar = (k, r) => {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(enCache(k), Buffer.from(r.url.split(',')[1], 'base64'));
};

async function cargarJuego(p, extra = '') {
  await p.goto(BASE + '?dev=1' + extra);
  await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
}

// ---------------------------------------------------------------- retratos
// MODELOS (datos.mjs): { clave: { tipo, clip: 'nombre@t', idle, az, el, fr } |
// { jugador: armadura | null } }. Devuelve { clave: { url, w, h } }: el modelo
// cabe en arte × arte píxeles, y el juego lo dibuja a esa resolución (no se
// reduce). Como el posproceso no baja de 160 × 120 píxeles, uno pequeño se
// dibuja en ese lienzo, encuadrado en sus arte píxeles (luego se recorta).
export async function retratos(browser, MODELOS, { forzar = false, log = console.log, arte = 160 } = {}) {
  const out = {};
  const pre = `m${arte}_`;
  const faltan = Object.keys(MODELOS).filter((k) => forzar || !(out[k] = leer(pre + k)));
  if (!faltan.length) return out;
  const Wi = Math.max(160, arte),
    Hi = Math.max(120, arte);
  const VW = Wi * 4,
    VH = Hi * 4;
  const p = await browser.newPage({ viewport: { width: VW, height: VH } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await cargarJuego(p);
  await p.evaluate(([VW, VH, Hi]) => {
    window.__pause = true;
    const g = __game,
      T = g.THREE;
    g.ui.closeAll();
    g.ui.showHud(false);
    g.atmo.update = () => {};
    // fuera el mundo y las luces del juego; la luz del retrato: un relleno
    // tenue, una lumbre cálida de frente y a la izquierda y la luna fría por
    // detrás, que recorta la silueta
    for (const o of g.scene.children) if (!o.isLight) o.visible = false;
    g.scene.traverse((o) => o.isLight && (o.intensity = 0));
    const L = new T.Group();
    const hemi = new T.HemisphereLight(0x8a8478, 0x231d18, 0.6);
    const key = new T.PointLight(0xffa860, 18, 14, 1.4);
    const rim = new T.DirectionalLight(0x9fb2cc, 1.8);
    L.add(hemi, key, rim, rim.target);
    g.scene.add(L);
    window.__luz = { key, rim };
    g.scene.fog.density = 0;
    g.post.setSize(VW, VH, Hi);
    const U = g.post.U;
    U.uVol.value = 0;
    U.uGrain.value = 0;
    U.uVignette.value = 0;
    U.uSat.value = 0.92;
    U.uExposure.value = 1.28;
    U.uBloom.value = 0.4;
    for (const k of ['uSkyGlow', 'uSun', 'uMoonK']) if (U[k]) U[k].value = 0;
    if (g.post.blit.uniforms.uCrt) g.post.blit.uniforms.uCrt.value = 0;
  }, [VW, VH, Hi]);
  for (const k of faltan) {
    const m = MODELOS[k];
    const r = await p.evaluate(
      async ([m, arte, Wi, Hi]) => {
        const g = __game,
          T = g.THREE;
        if (window.__rig) {
          if (window.__rig !== 'jugador') g.scene.remove(window.__rig.root);
          else g.player.obj.visible = false;
          window.__rig = null;
        }
        const at = [-10, 0, 44];
        let root, rig;
        if ('jugador' in m) {
          // el Condenado, con la armadura que se diga (o sin ella)
          const A = await import('/src/entities/armaduras.js');
          const set = m.jugador ? Object.fromEntries(A.RANURAS.map((r) => [r, A.ARMADURAS[m.jugador].piezas[r].item])) : null;
          g.player.setArmorAll(set);
          g.player.spawn(at[0], at[1], at[2], 0);
          for (let i = 0; i < 20; i++) g.update(1 / 30);
          g.player.obj.visible = true;
          // (sin su farol encendido: lo bañaba todo de naranja)
          if (g.player.lamp) g.player.lamp.intensity = 0;
          rig = g.player.rig;
          root = g.player.obj;
          window.__rig = 'jugador';
        } else {
          const E = await import('/src/entities/enemies.js');
          const R = await import('/src/entities/rig.js');
          const Ty = E.TYPES[m.tipo];
          rig = Ty.build();
          rig.own();
          root = rig.root;
          g.scene.add(root);
          root.position.set(...at);
          let pose = null;
          const kind = m.idle || 'stand';
          try {
            if (Ty.idlePose) pose = Ty.idlePose({ data: {}, phase: 0, game: g, type: Ty, pos: root.position, idle: kind }, kind, 0, 0);
          } catch (e) {}
          if (m.clip) {
            const [cn, ct] = m.clip.split('@');
            const c = (Ty.clips || {})[cn];
            if (c) pose = R.sampleClip(c, +ct, {});
          }
          if (pose) rig.apply(pose);
          try {
            Ty.postPose && Ty.postPose({ data: {}, game: g, rig, type: Ty }, rig);
          } catch (e) {}
          window.__rig = rig;
        }
        rig.setProbe && rig.setProbe(0.36, 0.33, 0.3, at[1]);
        root.updateMatrixWorld(true);
        // el encuadre: los vértices de verdad, proyectados (cabe entero y
        // centrado)
        const pts = [];
        root.traverse((o) => {
          if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
          for (let q = o; q; q = q.parent) if (q.visible === false) return;
          const P = o.geometry.attributes.position,
            st = Math.max(1, Math.floor(P.count / 600));
          for (let i = 0; i < P.count; i += st) pts.push(new T.Vector3().fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld));
        });
        const box = new T.Box3().setFromPoints(pts);
        const size = box.getSize(new T.Vector3()),
          look = box.getCenter(new T.Vector3());
        const fov = 30,
          a = ((m.az ?? 25) * Math.PI) / 180,
          e = ((m.el ?? 4) * Math.PI) / 180,
          fr = m.fr ?? 1;
        const dir = new T.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
        let d = (Math.max(size.y, 1) * 0.6) / Math.tan(((fov / 2) * Math.PI) / 180);
        const cam = g.camera;
        cam.fov = fov;
        cam.aspect = Wi / Hi;
        cam.updateProjectionMatrix();
        // (lo que puede ocupar, en coordenadas de pantalla: sus arte píxeles,
        // con un margen)
        const fx = (arte / Wi) * 1.8,
          fy = (arte / Hi) * 1.8;
        for (let it = 0; it < 6; it++) {
          cam.position.copy(look).addScaledVector(dir, d);
          cam.lookAt(look);
          cam.updateMatrixWorld(true);
          let x0 = 9,
            x1 = -9,
            y0 = 9,
            y1 = -9;
          for (const q of pts) {
            const v = q.clone().project(cam);
            x0 = Math.min(x0, v.x);
            x1 = Math.max(x1, v.x);
            y0 = Math.min(y0, v.y);
            y1 = Math.max(y1, v.y);
          }
          const halfH = Math.tan(((fov / 2) * Math.PI) / 180) * d;
          const right = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 0),
            up = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
          look.addScaledVector(right, ((x0 + x1) / 2) * halfH).addScaledVector(up, ((y0 + y1) / 2) * halfH);
          d *= Math.max((x1 - x0) / fx, (y1 - y0) / fy) / fr;
        }
        const c = look.clone().addScaledVector(dir, d);
        // las luces, respecto a la cámara
        const fw = new T.Vector3(Math.sin(a), 0, Math.cos(a)),
          side = new T.Vector3(Math.cos(a), 0, -Math.sin(a));
        const { key, rim } = window.__luz;
        key.position.copy(look).addScaledVector(side, -d * 0.55).addScaledVector(fw, d * 0.5).add(new T.Vector3(0, size.y * 0.45, 0));
        key.distance = d * 3;
        rim.position.copy(look).addScaledVector(side, d * 0.6).addScaledVector(fw, -d).add(new T.Vector3(0, size.y * 0.8, 0));
        rim.target.position.copy(look);
        g.camRig.override = { pos: c, look, speed: 1000, fov };
        const foto = (bg) => {
          g.scene.background = null;
          g.post.U.uFogColor.value.set(bg[0], bg[1], bg[2]);
          cam.position.copy(c);
          cam.lookAt(look);
          cam.fov = fov;
          cam.aspect = Wi / Hi;
          cam.updateProjectionMatrix();
          g.render();
          const rt = g.post.rtFinal,
            w = rt.width,
            h = rt.height;
          const buf = new Uint8Array(w * h * 4);
          g.renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
          return { w, h, buf };
        };
        if (!('jugador' in m)) for (let i = 0; i < 2; i++) g.update(1 / 30);
        // dos fotos, con el cielo negro y con el cielo azul: el modelo es lo
        // que no cambia
        const A = foto([0, 0, 0]),
          B = foto([0, 0, 0.6]);
        const w = A.w,
          H = A.h;
        const out = new Uint8ClampedArray(w * H * 4);
        for (let y = 0; y < H; y++)
          for (let x = 0; x < w; x++) {
            const i = ((H - 1 - y) * w + x) * 4,
              o = (y * w + x) * 4;
            if (Math.abs(A.buf[i] - B.buf[i]) + Math.abs(A.buf[i + 1] - B.buf[i + 1]) + Math.abs(A.buf[i + 2] - B.buf[i + 2]) > 6) continue;
            out[o] = A.buf[i];
            out[o + 1] = A.buf[i + 1];
            out[o + 2] = A.buf[i + 2];
            out[o + 3] = 255;
          }
        const on = (x, y) => x >= 0 && y >= 0 && x < w && y < H && out[(y * w + x) * 4 + 3] === 255;
        const borde = [];
        for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) borde.push((y * w + x) * 4);
        for (const o of borde) {
          out[o] = 6;
          out[o + 1] = 5;
          out[o + 2] = 5;
          out[o + 3] = 255;
        }
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = H;
        cv.getContext('2d').putImageData(new ImageData(out, w, H), 0, 0);
        return { url: cv.toDataURL('image/png'), w, h: H };
      },
      [m, arte, Wi, Hi]
    );
    out[k] = r;
    guardar(pre + k, r);
    log(`  modelo ${k} (${arte} px)`);
  }
  if (errs.length) log('  (errores de la página: ' + errs.slice(0, 3).join(' | ') + ')');
  await p.close();
  return out;
}

// ---------------------------------------------------------------- escenas
// ESCENAS (datos.mjs): { clave: { vista: [x, y, z, yaw°, pitch, dist], atmo,
// criaturas } | { panorama: [x, y, z, yaw°, pitch°] } }. Cada una con el juego
// recién cargado (una escena que se dispare en una, como la de los Velados al
// pisar la antesala, no se queda con la cámara de la siguiente). Las vistas,
// a 320×180; el panorama, a 480×270.
export async function escenas(browser, ESCENAS, { forzar = false, log = console.log } = {}) {
  const out = {};
  const faltan = Object.keys(ESCENAS).filter((k) => forzar || !(out[k] = leer('e_' + k)));
  for (const k of faltan) {
    const E = ESCENAS[k];
    const pano = !!E.panorama;
    const W = pano ? 960 : 640,
      H = pano ? 540 : 360,
      IH = pano ? 270 : 180;
    const p = await browser.newPage({ viewport: { width: W, height: H } });
    await cargarJuego(p, '&items=espada,escudo');
    const r = await p.evaluate(
      ([E, W, H, IH]) => {
        window.__pause = true;
        const g = __game,
          T = g.THREE;
        g.input.enabledPointerLock = false;
        g.ui.closeAll();
        g.ui.showHud(false);
        g.state = 'play';
        g.dev.god = true;
        const [x, y, z, yawD, pitch = 0.3, dist = 0] = E.vista || E.panorama;
        const yaw = (yawD * Math.PI) / 180;
        g.enemies.forEach((e) => {
          const on = !!E.criaturas && Math.hypot(e.pos.x - x, e.pos.z - z) < 40;
          e.obj.visible = on;
          e.shadow && (e.shadow.visible = on);
        });
        g.player.spawn(x, y, z, yaw);
        g.camRig.snapTo(g.player);
        if (E.panorama) {
          // el panorama: desde los ojos, sin el jugador
          g.player.obj.visible = false;
          g.playerShadow && (g.playerShadow.visible = false);
          const zn = g.zoneAt(g.player.pos);
          g.atmo.set(E.atmo || (zn ? zn.atmo : 'city'), true);
          const pt = (pitch * Math.PI) / 180;
          const c = new T.Vector3(x, y + 1.7, z);
          const look = c.clone().add(new T.Vector3(-Math.sin(yaw) * Math.cos(pt), Math.sin(pt), -Math.cos(yaw) * Math.cos(pt)));
          g.camRig.override = { pos: c, look, speed: 1000, fov: 62 };
          for (let k = 0; k < 40; k++) g.update(1 / 30);
          g.post.setSize(W, H, IH);
          g.camera.position.copy(c);
          g.camera.lookAt(look);
          g.camera.fov = 62;
          g.camera.aspect = W / H;
          g.camera.updateProjectionMatrix();
        } else {
          g.camRig.yaw = yaw;
          g.camRig.pitch = pitch;
          if (dist) g.camRig.dist = dist;
          for (let k = 0; k < 45; k++) {
            g.camRig.yaw = yaw;
            g.camRig.pitch = pitch;
            g.update(1 / 30);
          }
          if (E.atmo) g.atmo.set(E.atmo, true);
          for (let k = 0; k < 3; k++) {
            g.camRig.yaw = yaw;
            g.camRig.pitch = pitch;
            g.update(1 / 30);
          }
          g.post.setSize(W, H, IH);
        }
        if (g.post.blit.uniforms.uCrt) g.post.blit.uniforms.uCrt.value = 0;
        // (sin el grano de película: el tramado del juego se queda)
        g.post.U.uGrain.value = 0;
        g.render();
        const rt = g.post.rtFinal,
          w = rt.width,
          h = rt.height;
        const buf = new Uint8Array(w * h * 4);
        g.renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
        const px = new Uint8ClampedArray(w * h * 4);
        for (let yy = 0; yy < h; yy++) px.set(buf.subarray((h - 1 - yy) * w * 4, (h - yy) * w * 4), yy * w * 4);
        for (let i = 3; i < px.length; i += 4) px[i] = 255;
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        cv.getContext('2d').putImageData(new ImageData(px, w, h), 0, 0);
        return { url: cv.toDataURL('image/png'), w, h };
      },
      [E, W, H, IH]
    );
    out[k] = r;
    guardar('e_' + k, r);
    log(`  escena ${k}`);
    await p.close();
  }
  return out;
}
