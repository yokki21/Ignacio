// Almacén clave-valor local (localStorage) con marca de tiempo por clave, para sincronizar con Firestore.
const PREFIX = 'ignacio:';
const mem = new Map();
const listeners = new Set();
let pushHook = null; // la pone sync.js

function load() {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k.startsWith(PREFIX)) continue;
    try { mem.set(k.slice(PREFIX.length), JSON.parse(localStorage.getItem(k))); } catch { /* ignora */ }
  }
}
load();

export function get(key, fallback = null) {
  const rec = mem.get(key);
  if (!rec || rec.d) return fallback;
  return structuredClone(rec.v);
}

export function set(key, value, { silent = false, t = Date.now(), fromRemote = false } = {}) {
  const rec = { v: value, t };
  mem.set(key, rec);
  try { localStorage.setItem(PREFIX + key, JSON.stringify(rec)); } catch (e) { console.error('Almacenamiento lleno', e); }
  if (!fromRemote && pushHook) pushHook(key, rec);
  if (!silent) listeners.forEach(fn => fn(key));
}

export function del(key) {
  // borrado lógico para que se propague
  const rec = { v: null, t: Date.now(), d: 1 };
  mem.set(key, rec);
  localStorage.setItem(PREFIX + key, JSON.stringify(rec));
  if (pushHook) pushHook(key, rec);
  listeners.forEach(fn => fn(key));
}

export function update(key, fallback, fn) {
  const v = get(key, fallback);
  const r = fn(v);
  set(key, r === undefined ? v : r);
  return get(key);
}

export function keys(prefix = '') {
  return [...mem.entries()].filter(([k, r]) => k.startsWith(prefix) && !r.d).map(([k]) => k);
}

export function raw(key) { return mem.get(key) || null; }
export function allRaw() { return [...mem.entries()]; }

export function applyRemote(key, rec) {
  const local = mem.get(key);
  if (local && local.t >= rec.t) return false;
  mem.set(key, rec);
  localStorage.setItem(PREFIX + key, JSON.stringify(rec));
  return true;
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function notifyAll() { listeners.forEach(fn => fn('*')); }
export function setPushHook(fn) { pushHook = fn; }

export function exportAll() {
  const out = {};
  for (const [k, r] of mem) out[k] = r;
  return { app: 'ignacio', version: 1, exported: new Date().toISOString(), data: out };
}

export function importAll(obj) {
  if (!obj || obj.app !== 'ignacio') throw new Error('Archivo no válido');
  for (const [k, r] of Object.entries(obj.data)) {
    mem.set(k, r);
    localStorage.setItem(PREFIX + k, JSON.stringify(r));
    if (pushHook) pushHook(k, r);
  }
  notifyAll();
}

// ---- Fotos (solo en el dispositivo, IndexedDB) ----
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('ignacio-fotos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('fotos', { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function savePhoto(photo) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('fotos', 'readwrite');
    tx.objectStore('fotos').put(photo);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
export async function listPhotos() {
  const db = await idb();
  return new Promise((res, rej) => {
    const r = db.transaction('fotos').objectStore('fotos').getAll();
    r.onsuccess = () => res(r.result.sort((a, b) => b.date.localeCompare(a.date)));
    r.onerror = () => rej(r.error);
  });
}
export async function deletePhoto(id) {
  const db = await idb();
  return new Promise((res) => {
    const tx = db.transaction('fotos', 'readwrite');
    tx.objectStore('fotos').delete(id);
    tx.oncomplete = res;
  });
}
