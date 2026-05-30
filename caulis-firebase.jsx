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
  if (ref) ref.set(data);
}

Object.assign(window, { listenGarden, pushGarden, FIREBASE_READY });
