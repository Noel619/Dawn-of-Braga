// Ensamblado del nivel completo: geometría, colisión, luces horneadas,
// interactuables, enemigos, zonas y datos del mapa.
import * as THREE from 'three';
import { WorldBuilder } from '../gfx/geo.js';
import { CollisionWorld } from './collision.js';
import { WalkGrid } from './walkgrid.js';
import { buildCastle, buildSouto, buildPraca, buildRuaSe, buildLargo, buildPelames, buildTanners, buildRamparts, buildFerraria } from './level_city.js';
import { buildNW, buildSW, buildNE, buildSE, buildFillers } from './level_barrios.js';
import { buildCathedral, buildCloister, buildCrypt, buildRiver } from './level_sacred.js';
import { buildCanon } from './level_canon.js';
import { scatterClutter } from './clutter.js';
import { corpseLog } from '../entities/models.js';

export function buildLevel() {
  const ctx = {
    wb: new WorldBuilder(),
    col: new CollisionWorld(),
    lights: [], // luces horneadas por vértice
    fires: [], // fuegos visibles
    dynLights: [], // fuentes para el pool de luces dinámicas
    decals: [],
    banners: [],
    shafts: [],
    waters: [], // superficies de agua (cisterna, pozo)
    crows: [], // bandadas de cuervos {x,y,z,r,n} | {pts:[[x,y,z]...], yaw}
    rats: [], // nidos de ratas {x,y,z,n}
    flies: [], // enjambres de moscas (salen de los cadáveres)
  };
  corpseLog.length = 0;
  const L = { interact: [], enemies: [], zones: [], map: [], phantoms: [], breakables: [] };
  const S = new WalkGrid(-96, -232, 84, 72, 0.5); // superficie
  const C = new WalkGrid(-24, -200, 24, -84, 0.5); // cripta
  const B = new WalkGrid(24, -86, 74, -24, 0.5); // bodegas del canónigo
  ctx.S = S; // las casas visitables pintan su huella transitable

  buildCastle(ctx, S, L);
  // los barrios primero: sus fachadas son los muros en los que trepan las
  // carnosidades de las calles principales
  buildNW(ctx, S, L);
  buildSW(ctx, S, L);
  buildNE(ctx, S, L);
  buildSE(ctx, S, L);
  buildSouto(ctx, S, L);
  buildPraca(ctx, S, L);
  buildRuaSe(ctx, S, L);
  buildLargo(ctx, S, L);
  buildPelames(ctx, S, L);
  buildTanners(ctx, S, L);
  const nB = buildCanon(ctx, S, B, L);
  buildRamparts(ctx, S, L);
  buildFerraria(ctx, S, L);
  buildCathedral(ctx, S, L);
  buildCloister(ctx, S, L);
  buildCrypt(ctx, S, C, L);
  buildRiver(ctx, S, L);
  buildFillers(ctx, S, L);

  // moscas sobre los cadáveres (lejos del fuego; uno por grupo)
  for (const c of corpseLog) {
    if (ctx.fires.some((f) => f.s >= 0.8 && Math.hypot(f.x - c.x, f.z - c.z) < 2.6 && Math.abs(f.y - c.y) < 3)) continue;
    if (ctx.flies.some((f) => Math.hypot(f.x - c.x, f.z - c.z) < 1.8 && Math.abs(f.y - c.y) < 1.2)) continue;
    ctx.flies.push({ x: c.x, y: c.y, z: c.z });
  }
  // detritos al pie de los muros
  const clutter = scatterClutter(ctx, S, L, corpseLog);

  // colisión generada a partir de las zonas transitables
  const nS = S.toColliders(ctx.col, -1, 5.2);
  const nC = C.toColliders(ctx.col, -10.6, -1.2);
  // losa de suelo global con los huecos de las escaleras de la cripta
  const F = new WalkGrid(-96, -232, 84, 72, 1);
  F.paint(-96, -232, 84, 72, 1);
  F.paint(-2, -97, 2, -86, 0);
  F.paint(-2, -186, 2, -167, 0);
  F.paint(58, -32, 61, -27, 0); // escalera de la bodega del canónigo
  for (const [a, b, c, d] of F.rects(1)) {
    ctx.col.add(a, -1, b, c, 0, d, 'floor').cam = true;
    // suelo visual de fondo (tierra), un poco por debajo de calles e
    // interiores: donde no hay pavimento se ve tierra, nunca el vacío
    ctx.wb.box('dirt', a, -0.2, b, c, -0.06, d, { faces: 't', ao: false, sub: 8, tint: [0.62, 0.58, 0.54] });
  }

  // antorchas y braseros alimentan el pool de luces dinámicas
  ctx.wb.bake(ctx.lights);
  const meshes = ctx.wb.build();
  return { ctx, L, meshes, S, C, B, stats: { ...ctx.wb.stats(), boxes: ctx.col.boxes.length, surfaceBlocks: nS, cryptBlocks: nC, cellarBlocks: nB, clutter } };
}
