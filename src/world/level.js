// Ensamblado del nivel completo: geometría, colisión, luces horneadas,
// interactuables, enemigos, zonas y datos del mapa.
import * as THREE from 'three';
import { WorldBuilder } from '../gfx/geo.js';
import { CollisionWorld } from './collision.js';
import { WalkGrid } from './walkgrid.js';
import { buildCastle, buildSouto, buildPraca, buildRuaSe, buildLargo, buildPelames, buildTanners, buildRamparts, buildFerraria } from './level_city.js';
import { buildCathedral, buildCloister, buildCrypt, buildRiver } from './level_sacred.js';

export function buildLevel() {
  const ctx = {
    wb: new WorldBuilder(),
    col: new CollisionWorld(),
    lights: [], // luces horneadas por vértice
    fires: [], // fuegos visibles
    dynLights: [], // fuentes para el pool de luces dinámicas
    decals: [],
    banners: [],
  };
  const L = { interact: [], enemies: [], zones: [], map: [], phantoms: [] };
  const S = new WalkGrid(-96, -232, 84, 72, 0.5); // superficie
  const C = new WalkGrid(-24, -200, 24, -84, 0.5); // cripta

  buildCastle(ctx, S, L);
  buildSouto(ctx, S, L);
  buildPraca(ctx, S, L);
  buildRuaSe(ctx, S, L);
  buildLargo(ctx, S, L);
  buildPelames(ctx, S, L);
  buildTanners(ctx, S, L);
  buildRamparts(ctx, S, L);
  buildFerraria(ctx, S, L);
  buildCathedral(ctx, S, L);
  buildCloister(ctx, S, L);
  buildCrypt(ctx, S, C, L);
  buildRiver(ctx, S, L);

  // colisión generada a partir de las zonas transitables
  const nS = S.toColliders(ctx.col, -1, 5.2);
  const nC = C.toColliders(ctx.col, -10.6, -1.2);
  // losa de suelo global con los huecos de las escaleras de la cripta
  const F = new WalkGrid(-96, -232, 84, 72, 1);
  F.paint(-96, -232, 84, 72, 1);
  F.paint(-2, -97, 2, -86, 0);
  F.paint(-2, -186, 2, -167, 0);
  for (const [a, b, c, d] of F.rects(1)) ctx.col.add(a, -1, b, c, 0, d, 'floor').cam = true;

  // antorchas y braseros alimentan el pool de luces dinámicas
  ctx.wb.bake(ctx.lights);
  const meshes = ctx.wb.build();
  return { ctx, L, meshes, S, C, stats: { ...ctx.wb.stats(), boxes: ctx.col.boxes.length, surfaceBlocks: nS, cryptBlocks: nC } };
}
