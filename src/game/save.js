// Guardado local (localStorage) con tolerancia a fallos.
const KEY = 'dawnOfBraga.save.v1';
const SKEY = 'dawnOfBraga.settings.v1';

export function loadSave() {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}
export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}
export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
}
export function loadSettings() {
  try {
    const s = localStorage.getItem(SKEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}
export function writeSettings(s) {
  try {
    localStorage.setItem(SKEY, JSON.stringify(s));
  } catch (e) {}
}

export class Inventory {
  constructor(data) {
    this.items = new Map(data ? Object.entries(data) : []);
  }
  has(id) {
    return (this.items.get(id) || 0) > 0;
  }
  count(id) {
    return this.items.get(id) || 0;
  }
  add(id, n = 1) {
    this.items.set(id, this.count(id) + n);
  }
  toJSON() {
    return Object.fromEntries(this.items);
  }
}
