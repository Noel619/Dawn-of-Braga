// Vida ambiental: cuervos que alzan el vuelo, ratas que huyen y moscas sobre
// los cadáveres. Es decorativa (sin colisión con el jugador) y va instanciada:
// dos llamadas de dibujo para todos los cuervos, una para las ratas y otra
// para las moscas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { registerMaterialPatch, G } from '../gfx/materials.js';
import { RNG, damp } from '../core/util.js';

// Pieza con color por vértice (para fundir varias en una sola geometría).
function part(geo, color, x, y, z, rx = 0, ry = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

const BLACK = 0x1a1c22,
  DARK = 0x3a3530;

// Cuerpo del cuervo mirando a +Z, patas en y=0.
function crowBody() {
  return mergeGeometries([
    part(new THREE.BoxGeometry(0.12, 0.1, 0.22), BLACK, 0, 0.1, 0),
    part(new THREE.BoxGeometry(0.085, 0.08, 0.09), BLACK, 0, 0.17, 0.12),
    part(new THREE.ConeGeometry(0.02, 0.085, 4), DARK, 0, 0.165, 0.205, Math.PI / 2),
    part(new THREE.BoxGeometry(0.1, 0.018, 0.13), BLACK, 0, 0.115, -0.16, 0.3),
    part(new THREE.BoxGeometry(0.014, 0.06, 0.014), DARK, 0.03, 0.03, 0.01),
    part(new THREE.BoxGeometry(0.014, 0.06, 0.014), DARK, -0.03, 0.03, 0.01),
  ]);
}

// Ala izquierda con la bisagra en x=0 (la derecha es su reflejo).
function crowWing() {
  return mergeGeometries([part(new THREE.BoxGeometry(0.15, 0.012, 0.13), BLACK, 0.075, 0, -0.02), part(new THREE.BoxGeometry(0.13, 0.01, 0.09), BLACK, 0.215, 0, -0.04)]);
}

function ratBody() {
  return mergeGeometries([
    part(new THREE.BoxGeometry(0.085, 0.07, 0.18), 0x5a4a40, 0, 0.045, 0),
    part(new THREE.ConeGeometry(0.042, 0.1, 5), 0x54463c, 0, 0.045, 0.13, Math.PI / 2),
    part(new THREE.BoxGeometry(0.03, 0.03, 0.01), 0x6a5048, 0.025, 0.085, 0.09),
    part(new THREE.BoxGeometry(0.03, 0.03, 0.01), 0x6a5048, -0.025, 0.085, 0.09),
    part(new THREE.BoxGeometry(0.012, 0.012, 0.22), 0x8a6a62, 0, 0.028, -0.19, -0.12),
  ]);
}

const _m = new THREE.Matrix4(),
  _w = new THREE.Matrix4(),
  _t = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _e = new THREE.Euler(0, 0, 0, 'YXZ'),
  _p = new THREE.Vector3(),
  _s = new THREE.Vector3(),
  _mir = new THREE.Matrix4().makeScale(-1, 1, 1);

export class Fauna {
  constructor(game, spots) {
    this.game = game;
    const scene = game.scene;
    const rng = new RNG(4242);
    const mat = registerMaterialPatch(new THREE.MeshLambertMaterial({ vertexColors: true }));
    const wingMat = registerMaterialPatch(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));

    // --- cuervos
    this.crows = [];
    for (const s of spots.crows || []) {
      s.scared = false;
      const pts = s.pts || [];
      const n = s.pts ? pts.length : (s.n ?? 3);
      for (let i = 0; i < n; i++) {
        let home;
        if (s.pts) home = new THREE.Vector3(...pts[i]);
        else if (s.line) home = new THREE.Vector3(s.x + s.line[0] * (i - (n - 1) / 2) * 0.5, s.y, s.z + s.line[1] * (i - (n - 1) / 2) * 0.5);
        else {
          // alrededor del cadáver, no dentro
          const a = ((i + rng.range(-0.3, 0.3)) / n) * Math.PI * 2,
            r = rng.range(0.8, Math.max(1.1, s.r ?? 1.2) + 0.3);
          home = new THREE.Vector3(s.x + Math.cos(a) * r, s.y, s.z + Math.sin(a) * r);
        }
        this.crows.push({
          home,
          // en una cornisa miran hacia fuera; en el suelo, a cualquier lado
          homeYaw: s.yaw !== undefined ? s.yaw + rng.range(-0.5, 0.5) : rng.range(0, Math.PI * 2),
          flock: s,
          seed: rng.range(0, 100),
          scale: rng.range(1.1, 1.35),
          state: 'idle',
          t: 0,
          pos: home.clone(),
          vel: new THREE.Vector3(),
          yaw: 0,
          pitch: 0,
          open: 0,
          fade: 1,
        });
      }
    }
    for (const c of this.crows) c.yaw = c.homeYaw;
    const nc = Math.max(1, this.crows.length);
    this.crowIM = new THREE.InstancedMesh(crowBody(), mat, nc);
    this.wingIM = new THREE.InstancedMesh(crowWing(), wingMat, nc * 2);
    for (const im of [this.crowIM, this.wingIM]) {
      im.frustumCulled = false;
      im.count = 0;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(im);
    }

    // --- ratas
    this.rats = [];
    for (const s of spots.rats || []) {
      const n = s.n ?? 2;
      for (let i = 0; i < n; i++) {
        const home = new THREE.Vector3(s.x + rng.range(-0.6, 0.6), s.y, s.z + rng.range(-0.6, 0.6));
        this.rats.push({ home, pos: home.clone(), yaw: rng.range(0, Math.PI * 2), drawYaw: 0, state: 'idle', t: rng.range(0, 3), seed: rng.range(0, 100), scale: rng.range(0.85, 1.2), fade: 1, goal: new THREE.Vector3() });
      }
    }
    // nadie nace dentro de un barril o de un muro
    const unstick = (p) => {
      for (let k = 0; k < 20 && this._blocked(p.x, p.z, p.y); k++) {
        p.x += rng.range(-0.45, 0.45);
        p.z += rng.range(-0.45, 0.45);
      }
    };
    for (const r of this.rats) {
      unstick(r.home);
      r.pos.copy(r.home);
    }
    for (const c of this.crows) {
      if (c.flock.pts) continue;
      unstick(c.home);
      c.pos.copy(c.home);
    }
    this.ratIM = new THREE.InstancedMesh(ratBody(), mat, Math.max(1, this.rats.length));
    this.ratIM.frustumCulled = false;
    this.ratIM.count = 0;
    this.ratIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.ratIM);

    // --- moscas: un único sistema de puntos animado en el shader
    const flies = (this.flySpots = spots.flies || []);
    const per = 14;
    const pos = new Float32Array(Math.max(1, flies.length * per) * 3);
    const seed = new Float32Array(Math.max(1, flies.length * per));
    flies.forEach((f, i) => {
      for (let k = 0; k < per; k++) {
        const j = i * per + k;
        pos[j * 3] = f.x;
        pos[j * 3 + 1] = f.y;
        pos[j * 3 + 2] = f.z;
        seed[j] = rng.range(0, 1000);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.flyMat = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uPix: { value: 1 } },
      vertexShader: `
        attribute float aSeed; uniform float uTime; uniform float uPix; varying float vA;
        void main(){
          float t = uTime * (0.9 + fract(aSeed * 0.13) * 0.9) + aSeed;
          vec3 p = position + vec3(sin(t * 2.3) * 0.32 + sin(t * 7.1 + aSeed) * 0.07,
                                   0.3 + sin(t * 3.1 + aSeed * 0.7) * 0.2 + sin(t * 9.0) * 0.03,
                                   cos(t * 2.7) * 0.32 + cos(t * 6.3 + aSeed) * 0.07);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = -mv.z;
          gl_PointSize = uPix * clamp(2.6 / max(d, 0.5), 1.0, 2.5);
          vA = 1.0 - smoothstep(9.0, 15.0, d);
        }`,
      fragmentShader: `varying float vA; void main(){ if (vA < 0.02) discard; gl_FragColor = vec4(vec3(0.015), vA); }`,
      transparent: true,
      depthWrite: false,
    });
    this.flies = new THREE.Points(geo, this.flyMat);
    this.flies.frustumCulled = false;
    this.flies.visible = flies.length > 0;
    scene.add(this.flies);
  }

  reset() {
    for (const c of this.crows) {
      c.state = 'idle';
      c.flock.scared = false;
      c.pos.copy(c.home);
      c.yaw = c.homeYaw;
      c.open = 0;
      c.fade = 1;
    }
    for (const r of this.rats) {
      r.state = 'idle';
      r.pos.copy(r.home);
      r.fade = 1;
    }
  }

  // Enjambre de moscas más cercano (para el zumbido posicional).
  nearestFlies(p, maxD = 7) {
    let best = null,
      bd = maxD * maxD;
    for (const f of this.flySpots) {
      const d = (f.x - p.x) ** 2 + (f.y - p.y) ** 2 * 2 + (f.z - p.z) ** 2;
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  // player = null: sólo animación en reposo (pantalla de título)
  update(dt, player, time) {
    const g = this.game;
    const P = player ? player.pos : g.camera.position;
    const loud = !!player && (player.sprinting || player.state === 'attack' || player.state === 'roll');
    this._crows(dt, player, P, loud, time);
    this._rats(dt, player, P, time);
    this.flyMat.uniforms.uPix.value = Math.max(1, g.post.h / 300);
  }

  _crows(dt, player, P, loud, time) {
    const g = this.game;
    let caws = 0,
      k = 0;
    for (const c of this.crows) {
      const dx = c.pos.x - P.x,
        dy = c.pos.y - P.y,
        dz = c.pos.z - P.z;
      const d = Math.hypot(dx, dz);
      if (c.state === 'gone') {
        // vuelven cuando el jugador se ha alejado
        if (d > 34 || !player) {
          c.state = 'idle';
          c.flock.scared = false;
          c.pos.copy(c.home);
          c.yaw = c.homeYaw;
          c.open = 0;
          c.fade = 1;
        }
        continue;
      }
      if (d > 62) continue;
      let flap = 0;
      if (c.state === 'idle') {
        const d3 = Math.hypot(d, dy);
        const near = player && !player.dead && (d3 < 6.5 || (loud && d3 < 11));
        // toda la bandada se asusta a la vez
        if (near || c.flock.scared) {
          c.flock.scared = true;
          c.state = 'fly';
          c.t = -Math.random() * 0.25;
          const a = Math.atan2(dx, dz) + (Math.random() - 0.5) * 1.3;
          c.vel.set(Math.sin(a) * (3 + Math.random()), 2.4 + Math.random() * 1.4, Math.cos(a) * (3 + Math.random()));
          if (caws < 2 && g.audio) {
            g.audio.play('crow', c.pos);
            caws++;
          }
        } else {
          // picotear, girarse, algún saltito
          const t = time + c.seed;
          const peck = Math.max(0, Math.sin(t * 1.7) * 6 - 5);
          const hop = Math.max(0, Math.sin(t * 0.8) * 8 - 7.6) / 0.4;
          if (hop > 0.02) c.yaw += dt * Math.sin(c.seed * 3.1) * 2.2;
          c.pos.set(c.home.x, c.home.y + Math.sin(hop * Math.PI) * 0.1, c.home.z);
          if (player && d < 26 && g.audio && Math.random() < dt * 0.006) g.audio.play('crow', c.pos);
          c.pitch = peck * 0.55;
          c.open = damp(c.open, hop > 0.02 ? 0.5 : 0, 10, dt);
          flap = hop > 0.02 ? Math.sin(time * 30) * 0.6 : -0.1;
        }
      }
      if (c.state === 'fly') {
        c.t += dt;
        if (c.t > 0) {
          c.vel.y += (1.4 - c.vel.y) * dt * 0.7;
          c.pos.addScaledVector(c.vel, dt);
          c.yaw = Math.atan2(c.vel.x, c.vel.z);
          c.pitch = -0.3;
          c.open = damp(c.open, 1, 14, dt);
          flap = Math.sin((time + c.seed) * 24) * 0.95;
          if (c.t > 3.6) c.fade = Math.max(0, c.fade - dt * 2.5);
          if (c.t > 4.2) {
            c.state = 'gone';
            continue;
          }
        }
      }
      // cuerpo
      const sc = c.scale * c.fade;
      _e.set(c.pitch, c.yaw, 0, 'YXZ');
      _q.setFromEuler(_e);
      _m.compose(c.pos, _q, _s.set(sc, sc, sc));
      this.crowIM.setMatrixAt(k, _m);
      // alas: plegadas junto al cuerpo en reposo, abiertas al volar
      for (let side = 0; side < 2; side++) {
        _w.copy(_m).multiply(_t.makeTranslation(side ? -0.055 : 0.055, 0.14, 0.02));
        if (side) _w.multiply(_mir);
        _e.set(0, (1 - c.open) * 1.38, flap * c.open + (1 - c.open) * -0.15, 'YXZ');
        _w.multiply(_t.makeRotationFromEuler(_e));
        this.wingIM.setMatrixAt(k * 2 + side, _w);
      }
      k++;
    }
    this.crowIM.count = k;
    this.wingIM.count = k * 2;
    this.crowIM.instanceMatrix.needsUpdate = true;
    this.wingIM.instanceMatrix.needsUpdate = true;
  }

  // ¿Hay algo sólido a la altura de una rata en (x,z)?
  _blocked(x, z, y) {
    const col = this.game.world.col;
    const list = col.query(x - 0.08, z - 0.08, x + 0.08, z + 0.08, this._qb || (this._qb = []));
    for (const b of list) {
      if (b.maxy <= y + 0.12 || b.miny >= y + 0.3 || b.tag === 'fog') continue;
      if (col.overlapXZ(b, x, z, 0.08)) return true;
    }
    return false;
  }

  _rats(dt, player, P, time) {
    const col = this.game.world.col;
    let k = 0;
    for (const r of this.rats) {
      const dx = r.pos.x - P.x,
        dz = r.pos.z - P.z;
      const d = Math.hypot(dx, dz);
      if (r.state === 'gone') {
        if (d > 24 || !player) {
          r.state = 'idle';
          r.pos.copy(r.home);
          r.fade = 1;
        }
        continue;
      }
      if (d > 40) {
        if (r.state !== 'idle') {
          r.state = 'idle';
          r.pos.copy(r.home);
        }
        continue;
      }
      const scared = player && !player.dead && d < 4.2 && Math.abs(r.pos.y - P.y) < 2;
      let bob = 0,
        pitch = 0;
      const t = time + r.seed;
      if (r.state === 'idle') {
        r.t -= dt;
        pitch = Math.sin(t * 9) * 0.06 * Math.max(0, Math.sin(t * 0.7));
        if (r.t <= 0) {
          // correteo corto alrededor de su sitio
          r.t = 1.5 + Math.random() * 3;
          r.goal.set(r.home.x + (Math.random() - 0.5) * 1.8, r.home.y, r.home.z + (Math.random() - 0.5) * 1.8);
          r.state = 'wander';
        }
      }
      if (scared && r.state !== 'flee') {
        r.state = 'flee';
        r.t = 0;
        r.yaw = Math.atan2(dx, dz) + (Math.random() - 0.5) * 1.2;
      }
      if (r.state === 'wander' || r.state === 'flee') {
        let spd, ty;
        if (r.state === 'flee') {
          spd = 3.4;
          r.t += dt;
          ty = r.yaw + Math.sin(t * 6) * 0.35;
        } else {
          spd = 1.1;
          const gx = r.goal.x - r.pos.x,
            gz = r.goal.z - r.pos.z;
          ty = Math.atan2(gx, gz);
          r.yaw = ty;
          if (Math.hypot(gx, gz) < 0.12) r.state = 'idle';
        }
        const nx = r.pos.x + Math.sin(ty) * spd * dt,
          nz = r.pos.z + Math.cos(ty) * spd * dt;
        const gy = col.groundHeight(nx, nz, 0.05, r.pos.y + 0.3);
        if (Math.abs(gy - r.pos.y) < 0.3 && !this._blocked(nx, nz, gy)) r.pos.set(nx, gy, nz);
        else if (r.state === 'flee') r.yaw += (Math.random() < 0.5 ? 1 : -1) * (1.2 + Math.random());
        else r.state = 'idle';
        bob = Math.abs(Math.sin(t * 22)) * 0.018;
        if (r.state === 'flee' && r.t > 2) r.fade = Math.max(0, r.fade - dt * 4);
        if (r.fade <= 0) {
          r.state = 'gone';
          continue;
        }
        r.drawYaw = ty;
      } else r.drawYaw = r.yaw;
      const sc = r.scale * r.fade;
      _e.set(pitch, r.drawYaw, 0, 'YXZ');
      _q.setFromEuler(_e);
      _m.compose(_p.set(r.pos.x, r.pos.y + bob, r.pos.z), _q, _s.set(sc, sc, sc));
      this.ratIM.setMatrixAt(k++, _m);
    }
    this.ratIM.count = k;
    this.ratIM.instanceMatrix.needsUpdate = true;
  }
}
