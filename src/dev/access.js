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

export async function hashIp(ip) {
  if (!ip || !(crypto && crypto.subtle)) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(ip.trim().toLowerCase()), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT), iterations: ROUNDS }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
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
