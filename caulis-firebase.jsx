// ════════════════════════════════════════════════════════════
//  Caulis — Firebase Realtime Database sync
//
//  Setup:
//  1. Create a Firebase project at console.firebase.google.com
//  2. Add a Realtime Database (start in test mode)
//  3. Paste your config below
//  4. In Database Rules, set:
//     { "rules": { "gardens": { "$key": { ".read": true, ".write": true } } } }
// ════════════════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCQ_kk_6-7elkJ5WReONEg05mjmFjwlBC0",
  authDomain:        "caulis.firebaseapp.com",
  databaseURL:       "https://caulis-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "caulis",
  storageBucket:     "caulis.firebasestorage.app",
  messagingSenderId: "261845636692",
  appId:             "1:261845636692:web:47dba792aae4331cfa3fc1",
};

const FIREBASE_READY = FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";

let _db = null;
function getDb() {
  if (_db) return _db;
  if (!FIREBASE_READY || typeof firebase === 'undefined') return null;
  try {
    try { firebase.app(); } catch (e) { firebase.initializeApp(FIREBASE_CONFIG); }
    _db = firebase.database();
  } catch (e) { console.warn('Firebase init failed:', e); }
  return _db;
}

// Storage node id = SHA-256(key + '::' + password). Without both you cannot
// compute the path, so the password gates read AND write at the data layer.
async function gardenNodeId(key, password) {
  const raw = (key || '') + '::' + (password || '');
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // crypto.subtle needs a secure context; fall back to a weak hash
    let h = 0; for (let i = 0; i < raw.length; i++) { h = (h * 31 + raw.charCodeAt(i)) | 0; }
    return 'x' + (h >>> 0).toString(16);
  }
}

function gardenRef(key) {
  const db = getDb();
  return (db && key) ? db.ref(`gardens/${encodeURIComponent(key)}`) : null;
}

function listenGarden(key, onData) {
  const ref = gardenRef(key);
  if (!ref) return () => {};
  const handler = snap => { if (snap.exists()) onData(snap.val()); };
  ref.on('value', handler);
  return () => ref.off('value', handler);
}

function pushGarden(key, data) {
  const ref = gardenRef(key);
  if (!ref) return;
  const clean = JSON.parse(JSON.stringify(data, (_, v) => v === undefined ? null : v));
  ref.set(clean);
}

async function gardenExists(key) {
  const ref = gardenRef(key);
  if (!ref) return false;
  try { const snap = await ref.once('value'); return snap.exists(); } catch(e) { return false; }
}

async function renameGarden(oldKey, newKey, data) {
  const nr = gardenRef(newKey), or = gardenRef(oldKey);
  if (!nr || !or) return false;
  await nr.set(data);
  await or.remove();
  return true;
}

async function fetchGardenOnce(key) {
  const ref = gardenRef(key);
  if (!ref) return null;
  try { const snap = await ref.once('value'); return snap.exists() ? snap.val() : null; } catch(e) { return null; }
}

async function getGardenPasswordOnly(key) {
  const ref = gardenRef(key);
  if (!ref) return null;
  try {
    const snap = await ref.child('password').once('value');
    return snap.exists() ? snap.val() : null;
  } catch(e) { return null; }
}

Object.assign(window, { listenGarden, pushGarden, gardenExists, renameGarden, fetchGardenOnce, getGardenPasswordOnly, gardenNodeId, FIREBASE_READY });
