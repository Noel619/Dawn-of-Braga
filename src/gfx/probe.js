// Sonda de luz horneada: suma las mismas luces que se hornean en los vértices
// del escenario (antorchas, velas, ventanas, braseros...) en un punto, para
// iluminar a los personajes igual que a las paredes que tienen al lado.
const CELL = 8;

export class BakedProbe {
  constructor(lights) {
    this.grid = new Map();
    for (const L of lights) {
      const r = L.radius;
      for (let gx = Math.floor((L.x - r) / CELL); gx <= Math.floor((L.x + r) / CELL); gx++)
        for (let gz = Math.floor((L.z - r) / CELL); gz <= Math.floor((L.z + r) / CELL); gz++) {
          const k = gx * 73856093 ^ gz * 19349663;
          let a = this.grid.get(k);
          if (!a) this.grid.set(k, (a = []));
          a.push(L);
        }
    }
    this.out = [0, 0, 0];
  }

  // rid: habitación (0 = exterior). Devuelve [r,g,b] lineal.
  sample(x, y, z, rid = 0) {
    const o = this.out;
    o[0] = o[1] = o[2] = 0;
    const list = this.grid.get(Math.floor(x / CELL) * 73856093 ^ Math.floor(z / CELL) * 19349663);
    if (!list) return o;
    for (const L of list) {
      if ((L._rid ?? 0) !== rid && !L.anyRoom) continue;
      const d = Math.hypot(L.x - x, L.y - y, L.z - z);
      if (d >= L.radius) continue;
      // media del término envolvente del horneado sobre una figura (~0.5)
      const k = (1 - d / L.radius) ** 2 * L.intensity * 0.5;
      o[0] += L.r * k;
      o[1] += L.g * k;
      o[2] += L.b * k;
    }
    return o;
  }
}
