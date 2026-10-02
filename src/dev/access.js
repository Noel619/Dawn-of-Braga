// ¿Quién puede abrir el modo desarrollador (F2)?
//
//  - En el propio ordenador (localhost: el servidor de desarrollo, y las
//    pruebas automáticas), siempre.
//  - En la versión publicada, sólo desde la IP del autor. La IP no aparece
//    aquí: se guarda su huella (PBKDF2-SHA256, 120 000 vueltas, con sal) y
//    al pulsar F2 se pregunta la IP pública a un servicio externo, se le
//    calcula la huella y se compara. Si no coincide, el panel no sale nunca
//    (y no se dice nada). La consulta sólo se hace al pulsar F2: quien no lo
//    pulse no contacta con nadie.
//
// Para autorizar otra IP: pon su huella en DEV_IP_HASHES. La de la IP desde
// la que juegas se saca en localhost con el botón «Huella de mi IP» del
// panel, o en la consola del navegador con __game.dev.ipHash().
//
// (Es una puerta para que el panel no aparezca a los jugadores, no una
// cerradura: todo el código del juego viaja al navegador.)

export const DEV_IP_HASHES = [
  // huellas (hex) de las IP autorizadas
];

const SALT = 'dawn-of-braga/modo-desarrollador';
const ROUNDS = 120000;

// servicios que devuelven la IP pública (IPv4) en texto o JSON, con CORS
const IP_SERVICES = ['https://api.ipify.org?format=json', 'https://ipv4.icanhazip.com/'];

export function isLocalHost() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]' || h.endsWith('.localhost');
}

async function fetchIp() {
  for (const url of IP_SERVICES) {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch(url, { signal: ctl.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
      clearTimeout(to);
      if (!r.ok) continue;
      const t = (await r.text()).trim();
      let ip = t;
      if (t.startsWith('{')) ip = JSON.parse(t).ip;
      if (ip && /^[0-9a-f.:]+$/i.test(ip)) return ip;
    } catch (e) {
      /* el siguiente servicio */
    }
  }
  return null;
}

const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function hashIp(ip) {
  if (!ip) return null;
  const enc = new TextEncoder();
  const pass = enc.encode(ip.trim().toLowerCase()),
    salt = enc.encode(SALT);
  // (sin HTTPS el navegador no ofrece crypto.subtle: la versión propia)
  if (!(globalThis.crypto && crypto.subtle)) return hex(pbkdf2Sha256(pass, salt, ROUNDS));
  const key = await crypto.subtle.importKey('raw', pass, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ROUNDS }, key, 256);
  return hex(new Uint8Array(bits));
}

// ------------------------------------------------------------ PBKDF2-SHA256
// (32 bytes de salida: un solo bloque; HMAC con los estados internos de la
// clave precalculados, dos compresiones por vuelta)
const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const IV = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const _w = new Int32Array(64);
function compress(st, w) {
  for (let i = 16; i < 64; i++) {
    const x = w[i - 15],
      y = w[i - 2];
    const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
    const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
  }
  let a = st[0],
    b = st[1],
    c = st[2],
    d = st[3],
    e = st[4],
    f = st[5],
    g = st[6],
    h = st[7];
  for (let i = 0; i < 64; i++) {
    const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
    const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K256[i] + w[i]) | 0;
    const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
    const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
    h = g;
    g = f;
    f = e;
    e = (d + t1) | 0;
    d = c;
    c = b;
    b = a;
    a = (t1 + t2) | 0;
  }
  st[0] = (st[0] + a) | 0;
  st[1] = (st[1] + b) | 0;
  st[2] = (st[2] + c) | 0;
  st[3] = (st[3] + d) | 0;
  st[4] = (st[4] + e) | 0;
  st[5] = (st[5] + f) | 0;
  st[6] = (st[6] + g) | 0;
  st[7] = (st[7] + h) | 0;
}
// Termina un hash cuyo estado ya ha procesado 'done' bytes, con el mensaje m.
function finish(st0, m, done) {
  const st = Int32Array.from(st0);
  const total = done + m.length;
  const n = Math.ceil((m.length + 9) / 64) * 64;
  const buf = new Uint8Array(n);
  buf.set(m);
  buf[m.length] = 0x80;
  const bits = total * 8;
  buf[n - 4] = (bits >>> 24) & 255;
  buf[n - 3] = (bits >>> 16) & 255;
  buf[n - 2] = (bits >>> 8) & 255;
  buf[n - 1] = bits & 255;
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) _w[i] = (buf[o + i * 4] << 24) | (buf[o + i * 4 + 1] << 16) | (buf[o + i * 4 + 2] << 8) | buf[o + i * 4 + 3];
    compress(st, _w);
  }
  return st;
}
const toBytes = (st) => {
  const o = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    o[i * 4] = (st[i] >>> 24) & 255;
    o[i * 4 + 1] = (st[i] >>> 16) & 255;
    o[i * 4 + 2] = (st[i] >>> 8) & 255;
    o[i * 4 + 3] = st[i] & 255;
  }
  return o;
};
export function pbkdf2Sha256(pass, salt, iters) {
  let key = pass;
  if (key.length > 64) key = toBytes(finish(IV, key, 0));
  const pad = (v) => {
    const blk = new Uint8Array(64).fill(v);
    for (let i = 0; i < key.length; i++) blk[i] ^= key[i];
    const st = Int32Array.from(IV);
    for (let i = 0; i < 16; i++) _w[i] = (blk[i * 4] << 24) | (blk[i * 4 + 1] << 16) | (blk[i * 4 + 2] << 8) | blk[i * 4 + 3];
    compress(st, _w);
    return st;
  };
  const ist = pad(0x36),
    ost = pad(0x5c);
  const m1 = new Uint8Array(salt.length + 4);
  m1.set(salt);
  m1[salt.length + 3] = 1;
  let u = finish(ost, toBytes(finish(ist, m1, 64)), 64);
  const t = Int32Array.from(u);
  // vueltas: el mensaje es siempre de 32 bytes (un bloque con su relleno)
  const st = new Int32Array(8);
  for (let k = 1; k < iters; k++) {
    for (let pass2 = 0; pass2 < 2; pass2++) {
      st.set(pass2 ? ost : ist);
      for (let i = 0; i < 8; i++) _w[i] = u[i];
      _w[8] = 0x80000000 | 0;
      for (let i = 9; i < 15; i++) _w[i] = 0;
      _w[15] = 768;
      compress(st, _w);
      u = st.slice();
    }
    for (let i = 0; i < 8; i++) t[i] ^= u[i];
  }
  return toBytes(t);
}

// Huella de la IP pública actual (para añadirla a DEV_IP_HASHES).
export async function myIpHash() {
  const ip = await fetchIp();
  return ip ? { ip, hash: await hashIp(ip) } : null;
}

let _cached = null;
// true si este navegador puede abrir el panel. Se consulta una vez por sesión.
export function checkAccess() {
  if (isLocalHost()) return Promise.resolve(true);
  if (_cached) return _cached;
  _cached = (async () => {
    try {
      const s = sessionStorage.getItem('dob-dev');
      if (s === '1') return true;
      if (s === '0') return false;
    } catch (e) {
      /* sin almacenamiento de sesión */
    }
    // (sin ninguna huella autorizada, ni se pregunta: nadie contacta con nadie)
    let ok = false,
      sure = true;
    if (DEV_IP_HASHES.length) {
      const ip = await fetchIp();
      const h = ip ? await hashIp(ip).catch(() => null) : null;
      if (!h) sure = false;
      ok = !!h && DEV_IP_HASHES.includes(h);
    }
    // (si no se pudo saber la IP, se vuelve a intentar al pulsar F2 otra vez)
    if (!sure) {
      _cached = null;
      return false;
    }
    try {
      sessionStorage.setItem('dob-dev', ok ? '1' : '0');
    } catch (e) {
      /* sin almacenamiento de sesión */
    }
    return ok;
  })();
  return _cached;
}
