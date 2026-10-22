// El guion de la casa tapiada, el pasadizo del Soto y la casa del tonelero
// (el mundo: world/level_souto.js; Miguel: entities/morador.js).
//
//  1. El hueco del pasadizo: sin tablón, se examina (NO CRUCES); con uno (el
//     que sobra de las ventanas de Henrique), se tiende de borde a borde.
//  2. Sobre el tablón se hace equilibrio: se anda despacio, con los brazos en
//     cruz, y el cuerpo se va inclinando; hay que echarse hacia el otro lado.
//     Si te pasas, caes a la calle (y duele). Al hueco se puede uno tirar
//     también sin tablón.
//  3. Miguel, en el rincón de su alcoba, de cara a la esquina: llora y habla
//     solo. Si le ves y te ve, te grita que no te acerques; de cerca se
//     encoge, tiembla y se muerde el brazo para no lanzarse sobre ti. Nunca
//     ataca. Entre ruego y ruego, cuenta lo que pasó.
//  4. Si te vas de su casa (después de que te haya visto) y tardas en volver
//     (o descansas, o caes), se ha ahorcado de la viga de la alcoba: el
//     taburete volcado, la duela escrita a carbón y la soga que cruje.
//
// Banderas: souto:tabla (el tablón, tendido), morador:met (te ha visto),
// morador:ahorcado y morador:visto (ya le has visto colgado).
import * as THREE from 'three';
import { SOUTO } from '../world/level_souto.js';
import { DIALOG, MSG } from './story.js';
import { objMat, cloneMat } from '../gfx/materials.js';
import { angleDiff, damp, clamp, DEG } from '../core/util.js';

const V3 = THREE.Vector3;
const PL = SOUTO.plank;
const BAL = SOUTO.balance;
const FY = SOUTO.FY;
const MG = SOUTO.miguel;
const HG = SOUTO.hang;
const PZ = SOUTO.pz;
// lo que tarda en ahorcarse desde que te vas de su casa (s)
const HANG_AFTER = 60;
// te ve y te grita (m); demasiado cerca: se encoge; pegado: se muerde
const WARN_R = 5.6,
  NEAR_R = 2.6,
  BITE_R = 1.7;
// colgado: los pies a medio metro del suelo
const HANG_Y = FY + 0.5;
// el equilibrio: lo que se tuerce solo (inestable), el freno, cuánto corrige
// el jugador y cuánto le zarandea el tablón; la velocidad sobre él
// (sin corregir, dos de cada tres veces se cae a medio camino, a los dos
// segundos; corrigiendo, aunque sea tarde, se cruza)
const B_UNST = 3.0,
  B_DAMP = 1.8,
  B_PUSH = 5.5,
  B_NOISE = 1.05,
  B_SPEED = 0.95;

export class SoutoQuest {
  constructor(g) {
    this.g = g;
    this.npc = g.enemies.find((e) => e.type === 'morador') || null;
    this.spot = g.interact.list.find((i) => i.id === 'x_hueco');
    this.note = g.interact.list.find((i) => i.id === 'n_miguel');
    this.door = g.interact.list.find((i) => i.id === 'd_miguel');
    this._hOff = new V3(0, 0.42, 0.03);
    this._v = new V3();
    this._w = new V3();
    this.who = {
      id: 'miguel',
      name: 'Miguel',
      voice: 'miguelTalk',
      hearR: 15,
      head: (out) => (this.npc && this.npc.obj.visible ? this.npc.rig.worldPos('head', out, this._hOff) : out.set(MG.x, MG.y + 1.0, MG.z)),
    };
    this.buildPlank();
    this.buildRope();
    this.reset();
  }

  get F() {
    return this.g.flags;
  }
  hanged() {
    return !!this.F['morador:ahorcado'];
  }
  // ¿Está en la casa de Miguel (cualquiera de sus dos plantas)?
  inHouse(p) {
    const [x0, z0, x1, z1] = SOUTO.mhBox;
    return p.x > x0 && p.x < x1 && p.z > z0 + 0.05 && p.z < z1 && p.y > -1 && p.y < 9;
  }

  reset() {
    this.mode = 'alone';
    this.mt = 0;
    this.away = 0;
    this.left = false;
    this.taleI = 0;
    this.lineK = 0;
    this.talkT = 4;
    this.sobT = 1.5;
    this.creakT = 2;
    this.los = false;
    this.losT = 0;
    this.lastLine = null;
    this.placing = null;
    this.falling = null;
    this.balT = 0;
  }

  // ------------------------------------------------------------ piezas
  // Material de una pieza móvil con la luz horneada del sitio (sonda).
  mat(name, x, y, z, room) {
    const g = this.g;
    const m = cloneMat(objMat(name));
    if (m._u) {
      const pr = g.probe.sample(x, y, z, g.level.ctx.wb.roomId(room));
      m._u.uProbe.value.set(pr[0], pr[1], pr[2]);
      m._u.uGround.value.set(FY, 0.34);
    }
    return m;
  }
  // El tablón tendido sobre el hueco (y su colisión, cuando está puesto).
  buildPlank() {
    const g = this.g;
    const len = PL.z1 - PL.z0;
    const cz = (PL.z0 + PL.z1) / 2;
    const grp = new THREE.Group();
    const wood = this.mat('planks', PL.x, FY + 0.5, cz, 'pasadizo'),
      iron = this.mat('iron', PL.x, FY + 0.5, cz, 'pasadizo');
    const b = new THREE.Mesh(new THREE.BoxGeometry(PL.w, PL.th, len), wood);
    b.position.y = PL.th / 2;
    grp.add(b);
    // los clavos torcidos de donde estuvo
    for (const [x, z, r] of [
      [-0.08, -len * 0.42, 0.5],
      [0.07, len * 0.31, -0.4],
      [-0.05, len * 0.05, 0.3],
    ]) {
      const n = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.012), iron);
      n.position.set(x, PL.th + 0.03, z);
      n.rotation.z = r;
      grp.add(n);
    }
    grp.position.set(PL.x, FY, cz);
    grp.visible = false;
    g.scene.add(grp);
    this.plankMesh = grp;
    this.plankBox = g.world.col.add(PL.x - PL.w / 2, FY - 0.04, PL.z0, PL.x + PL.w / 2, FY + PL.th, PL.z1);
    this.plankBox.enabled = false;
  }
  setPlank(on) {
    const cz = (PL.z0 + PL.z1) / 2;
    this.plankMesh.visible = on;
    this.plankMesh.position.set(PL.x, FY, cz);
    this.plankMesh.rotation.set(0, 0, 0);
    this.plankBox.enabled = on;
    if (this.spot) {
      this.spot.done = on;
      this.spot.hidden = on;
    }
  }
  // La soga: de la viga al cuello (la mueve update cuando cuelga).
  buildRope() {
    const g = this.g;
    const m = this.mat('rope', HG.x, FY + 2.2, HG.z, 'tonelero_alta');
    const grp = new THREE.Group();
    const rope = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1, 0.03), m);
    grp.add(rope);
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.08), m);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 4, 10), m);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 4, 8), m);
    tie.rotation.y = Math.PI / 2;
    tie.position.set(HG.x, HG.beamY + 0.11, HG.z);
    g.scene.add(knot, loop, tie);
    g.scene.add(grp);
    grp.visible = knot.visible = loop.visible = tie.visible = false;
    this.rope = { grp, rope, knot, loop, tie };
  }
  showRope(on) {
    const r = this.rope;
    r.grp.visible = r.knot.visible = r.loop.visible = r.tie.visible = on;
  }
  // La soga, del nudo de la viga a la nuca (sigue al cuerpo que gira).
  updateRope(e) {
    const r = this.rope;
    const neck = e.rig.worldPos('head', this._v, this._w.set(0, 0.06, -0.04));
    const top = this._w.set(HG.x, HG.beamY, HG.z);
    const len = neck.distanceTo(top);
    r.grp.position.copy(neck).add(top).multiplyScalar(0.5);
    r.grp.lookAt(top);
    r.grp.rotateX(Math.PI / 2);
    r.rope.scale.y = len;
    // el nudo, detrás de la oreja; el lazo, alrededor del cuello
    const k = e.rig.worldPos('head', this._v, this._w.set(0.07, 0.07, -0.08));
    r.knot.position.copy(k);
    r.knot.rotation.set(0, e.yaw, 0.4);
    const n = e.rig.worldPos('head', this._v, this._w.set(0, 0.02, 0));
    r.loop.position.copy(n);
    r.loop.rotation.set(Math.PI / 2 - 0.3, 0, e.yaw);
  }

  // ------------------------------------------------------------ el hueco
  plankLabel() {
    return this.g.inventory.has('tablon') ? 'Tender el tablón' : 'Examinar el hueco';
  }
  usePlank(it) {
    const g = this.g;
    if (this.F['souto:tabla'] || this.placing) return;
    if (!g.inventory.has('tablon')) {
      g.ui.toast(MSG.hueco, 7);
      return;
    }
    g.inventory.add('tablon', -1);
    this.F['souto:tabla'] = true;
    it.done = true;
    it.hidden = true;
    this.placing = { t: 0 };
    this.plankMesh.visible = true;
    const p = g.player;
    p.playInteract('push', Math.atan2(PL.x - p.pos.x, (PL.z0 + PL.z1) / 2 - p.pos.z), 1.3);
    g.audio && g.audio.play('boards', { x: PL.x, y: FY + 0.5, z: PL.z0 });
    g.saveGame();
  }
  // El tablón sale de las manos y se tiende hasta el borde de enfrente.
  updatePlacing(dt) {
    const P = this.placing;
    if (!P) return;
    P.t += dt;
    const cz = (PL.z0 + PL.z1) / 2;
    const len = PL.z1 - PL.z0;
    const u = clamp((P.t - 0.25) / 0.9, 0, 1);
    const e = u * u * (3 - 2 * u);
    // (sale de delante del jugador, algo alzado, y cae en su sitio)
    const z = PL.z0 - len / 2 + 0.4 + e * (cz - (PL.z0 - len / 2 + 0.4));
    const lift = (1 - e) * 0.55 + (u >= 1 ? 0 : Math.sin(Math.PI * u) * 0.1);
    this.plankMesh.position.set(PL.x, FY + lift, z);
    this.plankMesh.rotation.x = (1 - e) * 0.18;
    if (u >= 1 && !P.down) {
      P.down = true;
      const g = this.g;
      g.audio && g.audio.play('stairCreak', { x: PL.x, y: FY, z: PL.z1 });
      g.audio && g.audio.play('land', { x: PL.x, y: FY, z: cz }, { v: 7 });
      g.camRig.shake(0.12);
    }
    if (P.t > 1.35) {
      this.placing = null;
      this.setPlank(true);
      this.g.ui.toast(MSG.tablaPuesta, 4);
    }
  }

  // ------------------------------------------------------------ el equilibrio
  onPlank(p) {
    return !!this.F['souto:tabla'] && !this.placing && !p.dead && p.body.grounded && Math.abs(p.pos.x - PL.x) < 0.45 && p.pos.z > BAL.z0 && p.pos.z < BAL.z1 && Math.abs(p.pos.y - (FY + PL.th)) < 0.2;
  }
  startBalance(p) {
    const g = this.g;
    // (a lo largo del tablón, de una casa a la otra; lean > 0: hacia +x)
    p.balance = { ax: 0, az: 1, cx: PL.x, lean: (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.05), vel: 0, input: 0 };
    p.state = 'free';
    p.buffer = null;
    this.balT = 0;
    this.creakT = 0.3;
    this.ph = Math.random() * 10;
    if (!g.hintsShown.balance) {
      g.hintsShown.balance = true;
      g.say(MSG.equilibrio);
    }
  }
  endBalance(p) {
    p.balance = null;
  }
  updateBalance(dt) {
    const g = this.g;
    const p = g.player;
    const on = this.onPlank(p) && p.state === 'free';
    if (on && !p.balance) this.startBalance(p);
    else if (!on && p.balance) this.endBalance(p);
    const b = p.balance;
    if (!b) return;
    this.balT += dt;
    const t = g.time;
    const walk = clamp(Math.abs(p.vz) / B_SPEED, 0, 1);
    // el tablón cimbrea: más al andar, y más en medio del hueco
    const mid = 1 - Math.abs(p.pos.z - (PL.z0 + PL.z1) / 2) / ((BAL.z1 - BAL.z0) / 2);
    const n = Math.sin(t * 1.9 + this.ph) * 0.6 + Math.sin(t * 0.83 + this.ph * 2.3) * 0.5 + Math.sin(t * 3.7 + this.ph) * 0.2;
    const acc = B_UNST * b.lean + n * B_NOISE * (0.35 + 0.65 * walk) * (0.6 + 0.4 * clamp(mid, 0, 1)) - B_DAMP * b.vel + B_PUSH * b.input;
    b.vel += acc * dt;
    b.lean += b.vel * dt;
    // cruje
    this.creakT -= dt * (0.6 + walk + Math.abs(b.lean) * 1.5);
    if (this.creakT <= 0) {
      this.creakT = 0.9 + Math.random() * 0.8;
      g.audio && g.audio.play('stairCreak', { x: p.pos.x, y: FY, z: p.pos.z });
    }
    if (Math.abs(b.lean) >= 1) this.fall(p, Math.sign(b.lean));
  }
  // Se pasa de inclinarse: trastabilla hacia ese lado y cae a la calle.
  fall(p, s) {
    const g = this.g;
    this.endBalance(p);
    p.state = 'stagger';
    p.stT = 0;
    p.anim.play(p.clips.stagger, { blend: 0.06 });
    p.pos.x += s * 0.22;
    p.vx = s * 3.4;
    p.vz = 0;
    this.falling = { t: 0 };
    g.ui.toast(MSG.caida, 2.5);
    g.audio && g.audio.play('stairCreak', { x: p.pos.x, y: FY, z: p.pos.z });
  }
  // Caer por el hueco (del tablón, o tirarse): el golpe contra el empedrado.
  updateFall(dt) {
    const g = this.g;
    const p = g.player;
    if (!this.falling) {
      // (también al tirarse por el hueco sin tablón)
      const over = p.pos.x > PZ.x0 && p.pos.x < PZ.x1 && p.pos.z > PZ.h0 - 0.3 && p.pos.z < PZ.h1 + 0.3;
      if (over && !p.body.grounded && p.pos.y < FY - 0.4 && p.pos.y > 1.2) this.falling = { t: 0 };
      return;
    }
    this.falling.t += dt;
    if (p.dead || this.falling.t > 4) {
      this.falling = null;
      return;
    }
    if (p.body.grounded && p.pos.y < FY - 1.5) {
      this.falling = null;
      const dmg = Math.round(p.maxHp * 0.15);
      p.hp = Math.max(1, p.hp - dmg);
      p.state = 'stagger';
      p.stT = 0;
      p.vx = p.vz = 0;
      p.anim.play(p.clips.stagger, { blend: 0.04 });
      p.flinchX.kick(-8);
      g.hurtFlash = Math.max(g.hurtFlash, 0.7);
      g.camRig.shake(0.45);
      g.audio && g.audio.play('playerHurt', p.pos);
      g.input.rumble && g.input.rumble(0.8, 0.6, 180);
    }
  }

  // ------------------------------------------------------------ Miguel
  setMode(m) {
    this.mode = m;
    this.mt = 0;
  }
  say(text, dur) {
    const s = this.g.speech;
    s.say(this.who, text, dur ? { dur } : {});
    this.lastLine = text;
  }
  // una frase de la lista que no sea la última que dijo
  pickLine(list) {
    let l = list[Math.floor(Math.random() * list.length)];
    if (l === this.lastLine && list.length > 1) l = list[(list.indexOf(l) + 1) % list.length];
    return l;
  }
  // Al volver a su sitio (al empezar, al descansar, al morir, al cargar):
  // en su rincón; si ya te vio y te fuiste, ha pasado el tiempo: se ahorcó.
  npcReset(e) {
    e.scripted = false;
    e.state = 'dormant';
    e.vx = e.vz = 0;
    e.data.W = { sob: 1, cower: 0, bite: 0, hang: 0 };
    e.data.look = [0, 0];
    e.data.shake = 0;
    e.data.sob = 1;
    this.mode = 'alone';
    this.mt = 0;
    this.away = 0;
    if (this.F['morador:met'] && !this.hanged()) this.F['morador:ahorcado'] = true;
    if (this.hanged()) this.placeHanged(e);
    else {
      e.body.pos.set(MG.x, MG.y, MG.z);
      e.yaw = MG.yaw;
      e.idle = 'sob';
      this.showRope(false);
    }
  }
  placeHanged(e) {
    e.idle = 'hang';
    e.data.W = { sob: 0, cower: 0, bite: 0, hang: 1 };
    e.data.look = [0, 0];
    e.data.shake = 0;
    e.data.sob = 0;
    this.hangYaw = MG.yaw + 2.3;
    e.yaw = this.hangYaw;
    e.body.pos.set(HG.x, HANG_Y, HG.z);
    e.body.vy = 0;
    this.showRope(true);
  }
  // Se ahorca (no le ves: estás fuera de su casa).
  hang() {
    const g = this.g;
    this.F['morador:ahorcado'] = true;
    g.speech.hush(this.who);
    if (this.npc) this.placeHanged(this.npc);
    this.applyHangedWorld();
    g.saveGame();
  }
  // Lo que cambia en la casa: el taburete volcado, la duela escrita, la
  // puerta (ya no se le oye llorar).
  applyHangedWorld() {
    const h = this.hanged();
    this.g.setGroupVisible('miguelAhorcado', h);
    const n = this.note;
    if (n) {
      n.hidden = !h;
      if (n.obj) n.obj.visible = h;
    }
    if (this.door) this.door.barredMsg = h ? null : 'doorMiguel';
  }
  // Lo que hace en cada momento (lo llama su tipo: entities/morador.js).
  npcAI(e, dt, player) {
    const g = this.g;
    this.mt += dt;
    e.stT += dt;
    e.vx = e.vz = 0;
    e.state = 'dormant';
    const W = e.data.W || (e.data.W = { sob: 1 });
    let want = 'sob',
      shake = 0.05,
      sob = 1,
      lookW = 0;
    const P = player.pos;
    const dx = P.x - e.pos.x,
      dz = P.z - e.pos.z;
    const d = Math.hypot(dx, dz);
    const same = Math.abs(P.y - FY) < 1.6;
    // ¿te ve? (por encima del hombro, en su alcoba)
    this.losT -= dt;
    if (this.losT <= 0) {
      this.losT = 0.25;
      this.los = same && d < 10 && g.world.col.lineOfSight(e.pos.x, FY + 0.9, e.pos.z, P.x, P.y + 1.4, P.z);
    }
    const sees = this.los && !player.dead;
    if (this.hanged()) {
      // colgado: la soga gira despacio y el cuerpo se mece
      want = 'hang';
      sob = 0;
      shake = 0;
      e.idle = 'hang';
      e.yaw = this.hangYaw + Math.sin(g.time * 0.37) * 0.35 + Math.sin(g.time * 0.13) * 0.2;
      e.body.pos.set(HG.x + Math.sin(g.time * 0.61) * 0.025, HANG_Y, HG.z + Math.cos(g.time * 0.53) * 0.02);
      // la primera vez que le ves colgado
      if (sees && d < 8 && !this.F['morador:visto']) {
        this.F['morador:visto'] = true;
        g.audio && g.audio.play('dread');
      }
      this.creakT -= dt;
      if (this.creakT <= 0) {
        this.creakT = 2.6 + Math.random() * 2.4;
        if (d < 13 && same) g.audio && g.audio.play('stairCreak', { x: HG.x, y: HG.beamY, z: HG.z });
      }
    } else {
      const m = this.mode;
      if (m === 'alone' || m === 'calm') {
        if (sees && d < WARN_R) this.notice(e, m === 'calm');
      } else if (m === 'warn') {
        if (!sees || d > WARN_R + 1.4) this.calm();
        else if (d < NEAR_R) this.setMode('near');
      } else if (m === 'near') {
        if (!sees || d > NEAR_R + 0.8) this.setMode('warn');
      }
      const mm = this.mode;
      if (mm === 'alone') {
        // solo: llora, se mece y habla solo
        sob = 1;
        this.selfTalk(e, d, same, dt);
      } else if (mm === 'warn') {
        want = 'sob';
        sob = 0.25;
        shake = 0.35;
        lookW = 1;
        this.talkT -= dt;
        if (this.talkT <= 0 && !g.speech.busy(this.who)) {
          // entre ruego y ruego, lo que pasó (en orden, una vez)
          const tale = DIALOG.miguelTale;
          if (this.lineK++ % 2 === 1 && this.taleI < tale.length) this.say(tale[this.taleI++]);
          else this.say(this.pickLine(DIALOG.miguelWarn));
          this.talkT = 1.2 + Math.random() * 1.2;
        }
      } else if (mm === 'near') {
        // demasiado cerca: se encoge contra el rincón; pegado, se muerde el
        // brazo para no lanzarse
        want = d < BITE_R ? 'bite' : 'cower';
        sob = 0;
        shake = 1;
        lookW = want === 'bite' ? 0.2 : 0.45;
        this.talkT -= dt;
        if (this.talkT <= 0) {
          this.say(this.pickLine(DIALOG.miguelNear), 1.6);
          this.talkT = 1.9 + Math.random() * 0.9;
          g.audio && g.audio.enemyVoice(e, 'attack');
          g.camRig.shake(0.06);
        }
      } else if (mm === 'calm') {
        sob = 0.6;
        shake = 0.15;
        lookW = this.mt < 2 ? 0.6 : 0;
        if (this.mt > 7) this.setMode('alone');
      }
    }
    // la cabeza hacia ti, por encima del hombro
    const rel = clamp(angleDiff(e.yaw, Math.atan2(dx, dz)), -135 * DEG, 135 * DEG);
    const L = e.data.look || (e.data.look = [0, 0]);
    L[0] = damp(L[0], rel, 5, dt);
    L[1] = damp(L[1], lookW, lookW > L[1] ? 9 : 2.5, dt);
    for (const k of ['sob', 'cower', 'bite', 'hang']) W[k] = damp(W[k] || 0, k === want ? 1 : 0, want === 'hang' ? 60 : 4, dt);
    e.data.shake = damp(e.data.shake || 0, shake, 6, dt);
    e.data.sob = damp(e.data.sob ?? 1, sob, 3, dt);
    e.animate(dt);
    // (colgado, su sombra no va por el aire)
    if (this.hanged()) {
      e.shadow.visible = false;
      this.updateRope(e);
    }
  }
  // Solo: el llanto (se oye desde el pasadizo) y lo que se dice a sí mismo.
  selfTalk(e, d, same, dt) {
    const g = this.g;
    this.sobT -= dt;
    if (this.sobT <= 0) {
      this.sobT = 2.4 + Math.random() * 3;
      if (d < 17) g.audio && g.audio.enemyVoice(e, 'idle');
    }
    this.talkT -= dt;
    if (this.talkT <= 0) {
      this.talkT = 6 + Math.random() * 5;
      if (d < 13 && same && !g.speech.busy(this.who)) this.say(this.pickLine(DIALOG.miguelSob), 3.4);
    }
  }
  // Te ve: se vuelve de golpe y te grita (si te fuiste y vuelves, que por
  // qué vuelves).
  notice(e, again) {
    const g = this.g;
    const F = this.F;
    this.setMode('warn');
    this.talkT = 2.6;
    if (!again) {
      this.say(F['morador:met'] && this.left ? this.pickLine(DIALOG.miguelBack) : DIALOG.miguelSee, 2.6);
      g.audio && g.audio.enemyVoice(e, 'alert');
      e.flY.kick(6);
    }
    this.left = false;
    if (!F['morador:met']) {
      F['morador:met'] = true;
      g.saveGame();
    }
  }
  // Te alejas: se calma (un poco).
  calm() {
    this.setMode('calm');
    if (!this.g.speech.busy(this.who)) this.say(this.pickLine(DIALOG.miguelCalm), 2.4);
  }

  // ------------------------------------------------------------ cada fotograma
  update(dt) {
    const g = this.g;
    this.updatePlacing(dt);
    this.updateBalance(dt);
    this.updateFall(dt);
    // fuera de su casa (tras haberle visto), el tiempo corre
    const p = g.player;
    if (this.F['morador:met'] && !this.hanged()) {
      if (this.inHouse(p.pos)) this.away = 0;
      else {
        this.away += dt;
        this.left = true;
        if (this.away >= HANG_AFTER) this.hang();
      }
    }
  }

  // Al cargar una partida (o empezar una).
  applyFlags() {
    const g = this.g;
    this.reset();
    if (g.player.balance) this.endBalance(g.player);
    g.speech && g.speech.hush(this.who);
    this.setPlank(!!this.F['souto:tabla']);
    if (this.npc) this.npcReset(this.npc);
    this.applyHangedWorld();
    if (!this.hanged()) this.showRope(false);
  }
  // Tras caer (o descansar): el tablón sigue donde estaba.
  onRespawn() {
    const g = this.g;
    if (g.player.balance) this.endBalance(g.player);
    this.falling = null;
    g.speech.hush(this.who);
    this.applyHangedWorld();
  }
}
