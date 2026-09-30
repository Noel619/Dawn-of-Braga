// Utilidades compartidas por el cuerpo, los golpes y la cabeza del
// Descoyuntado (curvas de tiempo y de golpe).
import { clamp } from '../core/util.js';

export const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
export const seg = (t, a, b) => sm((t - a) / (b - a));
export const lin = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
export const rnd = (a, b) => a + Math.random() * (b - a);
export const approach = (v, to, step) => (v < to ? Math.min(to, v + step) : Math.max(to, v - step));
// arranque con impulso hacia atrás (preparación), llegada seca (golpe) y
// rebote al final (inercia)
export const easeOutExpo = (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(u, 0, 1)));
export const easeInBack = (u) => {
  u = clamp(u, 0, 1);
  return u * u * (2.7 * u - 1.7);
};
export const overshoot = (u, k = 0.18) => {
  u = clamp(u, 0, 1);
  return 1 - Math.pow(1 - u, 3) + Math.sin(u * Math.PI) * k * (1 - u);
};
