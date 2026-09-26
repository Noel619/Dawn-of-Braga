// Iconos de objetos dibujados por código (pixel art 32x32 escalado).

function cv(draw) {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  draw(g);
  return c;
}
const px = (g, col, x, y, w = 1, h = 1) => {
  g.fillStyle = col;
  g.fillRect(x, y, w, h);
};
const line = (g, col, x0, y0, x1, y1, w = 1) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) px(g, col, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), w, w);
};

const ICONS = {
  sword: (g) => {
    line(g, '#9aa0a8', 7, 25, 24, 8, 2);
    line(g, '#d8dde2', 8, 24, 24, 8, 1);
    px(g, '#e8ecf0', 25, 6, 2, 2);
    line(g, '#6a5a3a', 4, 22, 11, 29, 2);
    line(g, '#3a2a1a', 4, 28, 7, 25, 2);
    px(g, '#8a7a5a', 3, 29, 2, 2);
  },
  shield: (g) => {
    g.fillStyle = '#5a3a22';
    g.beginPath();
    g.moveTo(6, 5);
    g.lineTo(26, 5);
    g.lineTo(26, 16);
    g.quadraticCurveTo(25, 25, 16, 29);
    g.quadraticCurveTo(7, 25, 6, 16);
    g.closePath();
    g.fill();
    px(g, '#8a1a18', 14, 7, 4, 19);
    px(g, '#8a1a18', 9, 12, 14, 4);
    px(g, '#9a9a9a', 6, 5, 20, 2);
  },
  crowbar: (g) => {
    line(g, '#5a5a62', 6, 27, 25, 8, 2);
    line(g, '#8a8a92', 7, 26, 25, 8, 1);
    line(g, '#5a5a62', 25, 8, 22, 4, 2);
    line(g, '#5a5a62', 6, 27, 4, 24, 2);
  },
  key: (g) => {
    g.strokeStyle = '#b08840';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(10, 10, 5, 0, Math.PI * 2);
    g.stroke();
    line(g, '#b08840', 13, 13, 26, 26, 3);
    px(g, '#b08840', 20, 22, 3, 5);
    px(g, '#b08840', 23, 25, 3, 4);
    px(g, '#e0c070', 8, 7, 2, 1);
  },
  crank: (g) => {
    px(g, '#5a5a62', 6, 14, 18, 4);
    px(g, '#7a7a82', 6, 14, 18, 1);
    px(g, '#5a5a62', 20, 6, 4, 10);
    px(g, '#5a3a22', 19, 3, 6, 5);
    px(g, '#3a3a42', 4, 12, 5, 8);
  },
  ring: (g) => {
    g.strokeStyle = '#c8a040';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(16, 19, 8, 7, 0, 0, Math.PI * 2);
    g.stroke();
    px(g, '#a01818', 13, 7, 6, 6);
    px(g, '#ff5040', 14, 8, 2, 2);
  },
  flask: (g) => {
    px(g, '#5a4a3a', 13, 3, 6, 4);
    g.fillStyle = '#3a6a8a';
    g.beginPath();
    g.moveTo(12, 8);
    g.lineTo(20, 8);
    g.lineTo(25, 20);
    g.quadraticCurveTo(24, 28, 16, 28);
    g.quadraticCurveTo(8, 28, 7, 20);
    g.closePath();
    g.fill();
    px(g, '#a0d0ff', 11, 16, 2, 6);
    px(g, '#6aa0c8', 9, 20, 14, 5);
  },
  reliquary: (g) => {
    px(g, '#a8a8b0', 8, 8, 16, 16);
    px(g, '#d0d0d8', 8, 8, 16, 2);
    px(g, '#3a2a1a', 11, 11, 10, 10);
    px(g, '#d8c8a0', 13, 14, 6, 3);
    px(g, '#d8c8a0', 12, 13, 2, 5);
    px(g, '#d8c8a0', 18, 13, 2, 5);
    px(g, '#a8a8b0', 15, 3, 2, 5);
    px(g, '#a8a8b0', 13, 4, 6, 2);
  },
  whetstone: (g) => {
    g.fillStyle = '#6a6a70';
    g.beginPath();
    g.moveTo(5, 20);
    g.lineTo(22, 9);
    g.lineTo(27, 13);
    g.lineTo(10, 25);
    g.closePath();
    g.fill();
    line(g, '#9a9aa0', 6, 20, 22, 10, 1);
    px(g, '#ffd080', 20, 7, 2, 2);
    px(g, '#ffd080', 25, 9, 1, 1);
  },
  note: (g) => {
    px(g, '#c8b88a', 7, 4, 18, 24);
    px(g, '#a8986a', 7, 4, 18, 2);
    for (let y = 9; y < 25; y += 3) px(g, '#5a4a3a', 10, y, 12 - (y % 5), 1);
  },
};

const cache = new Map();
export function icon(name) {
  if (!cache.has(name)) cache.set(name, cv(ICONS[name] || ICONS.note).toDataURL());
  return cache.get(name);
}
