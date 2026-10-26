// El ídolo de la fuente: la estatua de Deo Ignoto, la que encontraron los
// romanos dentro de la roca (la geometría, en idol_statue_geo.js, que se
// esculpe en un hilo de fondo: idol_worker.js; el montaje y lo que se mueve,
// en idol_statue.js). Se alza en la sima del fondo del círculo de la
// cisterna (world/sanctum.js); la pone y la mueve game/spring.js.
// (Las formas de antes, la primera estatua y el monolito, en archive/.)
import * as THREE from 'three';
import { statueData, eyeRest, STATUE } from './idol_statue_geo.js';
import { Statue } from './idol_statue.js';
import { unpackData } from './colossus/model.js';
import { SANCT } from '../world/level_finale.js';
import IdolWorker from './idol_worker.js?worker&inline';

// dónde está: el pie, en el agua de la sima; mira al norte (su +z es el -z
// del mundo y su +x, el -x)
export const IDOL = { x: SANCT.idol.x, y: SANCT.idol.y, z: SANCT.idol.z, yaw: Math.PI, height: STATUE.height };
// del espacio de la estatua al mundo
export const idolToWorld = (p, out = new THREE.Vector3()) => out.set(IDOL.x - p[0], IDOL.y + p[1], IDOL.z - p[2]);
// el ojo, en el mundo (con la cabeza en reposo)
export const idolEye = () => idolToWorld(eyeRest());

// Los datos de la estatua: se esculpen una vez, en un hilo de fondo (si el
// navegador no lo deja abrir, en el principal: un tirón de unos segundos)
let data = null,
  job = null;
export function idolReady() {
  return !!data;
}
export function loadIdol() {
  if (data) return Promise.resolve(data);
  if (job) return job;
  const t0 = performance.now();
  const main = () => statueData();
  job = new Promise((res) => {
    let w;
    try {
      w = new IdolWorker();
    } catch (e) {
      return res(main());
    }
    w.onmessage = (ev) => {
      w.terminate();
      if (!ev.data.ok) console.warn('[ídolo] el hilo de fondo falló; se esculpe en el principal', ev.data.error);
      res(ev.data.ok ? unpackData(ev.data.data) : main());
    };
    w.onerror = (e) => {
      w.terminate();
      console.warn('[ídolo] el hilo de fondo falló; se esculpe en el principal', e.message || e);
      res(main());
    };
    w.postMessage({ opts: {} });
  }).then((d) => {
    d.ms = Math.round(performance.now() - t0);
    data = d;
    job = null;
    return d;
  });
  return job;
}

// La estatua montada; null si todavía no están sus datos (loadIdol() y
// volver a pedirla)
export function buildIdol() {
  return data ? new Statue(data) : null;
}
