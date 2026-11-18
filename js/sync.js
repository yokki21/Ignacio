// Cuenta de Google (Firebase Auth) + sincronización con Firestore.
// Estructura: users/{uid}/kv/{clave} = { v: JSON (texto), t: marca de tiempo, d?: borrado }
import { FIREBASE_CONFIG } from '../firebase-config.js';
import * as store from './store.js';

const V = '10.12.2';
let fb = null; // módulos cargados
let auth = null, db = null, user = null;
const pending = new Map();
let timer = null;
const statusListeners = new Set();
let status = 'local'; // local | conectando | sincronizado | pendiente | error

export const configured = () => !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith('PEGA'));
export const currentUser = () => user;
export const getStatus = () => status;
export function onStatus(fn) { statusListeners.add(fn); fn(status, user); }
function setStatus(s) { status = s; statusListeners.forEach(fn => fn(status, user)); }

async function loadFirebase() {
  if (fb) return fb;
  const base = `https://www.gstatic.com/firebasejs/${V}`;
  const [app, authM, fs] = await Promise.all([
    import(`${base}/firebase-app.js`), import(`${base}/firebase-auth.js`), import(`${base}/firebase-firestore.js`),
  ]);
  fb = { app, authM, fs };
  const a = app.initializeApp(FIREBASE_CONFIG);
  auth = authM.getAuth(a);
  db = fs.getFirestore(a);
  return fb;
}

export async function init() {
  store.setPushHook(queuePush);
  if (!configured()) return;
  try {
    await loadFirebase();
    try { await fb.authM.getRedirectResult(auth); } catch { /* sin redirección pendiente */ }
    fb.authM.onAuthStateChanged(auth, async (u) => {
      user = u;
      if (u) { setStatus('conectando'); await fullSync(); } else setStatus('local');
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && user) pull(); });
  } catch (e) { console.error(e); setStatus('error'); }
}

export async function login() {
  await loadFirebase();
  const provider = new fb.authM.GoogleAuthProvider();
  try { await fb.authM.signInWithPopup(auth, provider); }
  catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
      await fb.authM.signInWithRedirect(auth, provider);
    } else throw e;
  }
}
export async function logout() { if (auth) await fb.authM.signOut(auth); }

function col() { return fb.fs.collection(db, 'users', user.uid, 'kv'); }

async function pull() {
  const snap = await fb.fs.getDocs(col());
  let changed = false;
  const remote = new Map();
  snap.forEach(d => {
    const x = d.data();
    const rec = { v: x.d ? null : JSON.parse(x.v), t: x.t, ...(x.d ? { d: 1 } : {}) };
    remote.set(d.id, rec);
    if (store.applyRemote(d.id, rec)) changed = true;
  });
  if (changed) store.notifyAll();
  return remote;
}

async function fullSync() {
  try {
    const remote = await pull();
    // sube lo local que sea más nuevo o no exista en la nube
    for (const [k, rec] of store.allRaw()) {
      const r = remote.get(k);
      if (!r || r.t < rec.t) pending.set(k, rec);
    }
    await flush();
  } catch (e) { console.error(e); setStatus('error'); }
}

function queuePush(key, rec) {
  if (!user) return;
  pending.set(key, rec);
  setStatus('pendiente');
  clearTimeout(timer);
  timer = setTimeout(flush, 1500);
}

async function flush() {
  if (!user) return;
  const entries = [...pending.entries()];
  pending.clear();
  try {
    for (let i = 0; i < entries.length; i += 400) {
      const batch = fb.fs.writeBatch(db);
      for (const [k, rec] of entries.slice(i, i + 400)) {
        batch.set(fb.fs.doc(db, 'users', user.uid, 'kv', k), rec.d ? { d: 1, t: rec.t, v: 'null' } : { v: JSON.stringify(rec.v), t: rec.t });
      }
      await batch.commit();
    }
    setStatus('sincronizado');
  } catch (e) {
    console.error(e);
    entries.forEach(([k, r]) => pending.set(k, r));
    setStatus('error');
    clearTimeout(timer); timer = setTimeout(flush, 15000);
  }
}
