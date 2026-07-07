// ════════════════════════════════════════════════════════════
//  Caulis — backend sync (Oracle box, Postgres via caulis-backend)
//  Real username/password identity: the garden's raw `key` IS the
//  server-side identity (bcrypt password_hash column), no client-side
//  hashing into a derived "node" path. gardenNodeId() is kept only as
//  the existing call-site name — it now just ensures a login session
//  and returns the key itself, unchanged. The old sha256(key+password)
//  scheme survives narrowly as a one-time recovery lookup for gardens
//  migrated from the earlier Firebase prototype (see _legacyHash).
// ════════════════════════════════════════════════════════════

const BACKEND_URL = 'https://api.caulis.czeddaru.dev';
const SYNC_READY = true;

// key -> { password, token }
const _sessions = {};
let _activeKey = null;

async function _api(path, opts = {}, token) {
  const headers = { 'content-type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  const r = await fetch(`${BACKEND_URL}${path}`, { ...opts, headers });
  let data = null;
  try { data = await r.json(); } catch (e) {}
  return { ok: r.ok, status: r.status, data };
}

// only used to recover a garden migrated from the old Firebase model,
// which is keyed server-side by this same derivation (legacy_node_hash)
async function _legacyHash(key, password) {
  const raw = (key || '') + '::' + (password || '');
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return null; }
}

// login-or-register for (key,password), cache the token under the key.
// Never throws — a wrong password / network failure just leaves no token,
// which every read/write below treats as "no access".
async function _ensureSession(key, password) {
  _sessions[key] = { ..._sessions[key], password };
  const login = await _api('/api/gardens/login', { method: 'POST', body: JSON.stringify({ key, password }) });
  if (login.ok) { _sessions[key].token = login.data.token; return; }
  if (login.status === 404) {
    const legacyHash = await _legacyHash(key, password);
    if (legacyHash) {
      const claim = await _api('/api/gardens/claim', { method: 'POST', body: JSON.stringify({ oldKey: legacyHash, newKey: key, newPassword: password }) });
      if (claim.ok) { _sessions[key].token = claim.data.token; return; }
    }
    const reg = await _api('/api/gardens/register', { method: 'POST', body: JSON.stringify({ key, password }) });
    if (reg.ok) { _sessions[key].token = reg.data.token; return; }
  }
  // wrong password, or register lost a race — leave token unset
}

async function gardenNodeId(key, password) {
  await _ensureSession(key, password);
  return key;
}

// called once from app.jsx's main sync effect so the perenual/AI proxy
// calls (which don't carry a key around) know which session is "current"
function setActiveGarden(key) { _activeKey = key; }
function getActiveToken() { return _activeKey ? _sessions[_activeKey]?.token : null; }

function listenGarden(key, onData) {
  const session = _sessions[key];
  if (!session?.token) return () => {};
  let lastStamp = null;
  let stopped = false;
  const poll = async () => {
    const { ok, data } = await _api('/api/garden', {}, session.token);
    if (ok && data && data.updated_at !== lastStamp) {
      lastStamp = data.updated_at;
      onData({ plants: data.plants, locations: data.locations, queue: data.queue });
    }
  };
  poll();
  const id = setInterval(() => { if (!stopped) poll(); }, 20000);
  return () => { stopped = true; clearInterval(id); };
}

async function pushGarden(key, data) {
  const session = _sessions[key];
  if (!session?.token) return;
  const clean = JSON.parse(JSON.stringify(data, (_, v) => v === undefined ? null : v));
  await _api('/api/garden', { method: 'PUT', body: JSON.stringify(clean) }, session.token);
}

async function fetchGardenOnce(key) {
  const session = _sessions[key];
  if (!session?.token) return null;
  const { ok, data } = await _api('/api/garden', {}, session.token);
  return ok ? { plants: data.plants, locations: data.locations, queue: data.queue } : null;
}

async function gardenExists(key) {
  const { ok, data } = await _api(`/api/gardens/exists?key=${encodeURIComponent(key)}`);
  return ok ? !!data.exists : false;
}

// re-checks a password against the real backend (not a local string compare)
// before a destructive local action like Export/Import — doesn't touch the
// cached session either way
async function verifyGardenPassword(key, password) {
  const { ok } = await _api('/api/gardens/login', { method: 'POST', body: JSON.stringify({ key, password }) });
  return ok;
}

// password-only change: same key, no rename needed, just update the credential
async function changeGardenPassword(key, newPassword) {
  const session = _sessions[key];
  if (!session?.token) return false;
  const { ok } = await _api('/api/gardens/password', { method: 'PATCH', body: JSON.stringify({ newPassword }) }, session.token);
  if (ok) session.password = newPassword;
  return ok;
}

// real key rename: newKey's session already established via gardenNodeId(newKey, pw)
async function renameGarden(oldKey, newKey, data) {
  const oldSession = _sessions[oldKey], newSession = _sessions[newKey];
  if (!newSession?.token) return false;
  await pushGarden(newKey, data);
  if (oldSession?.token) await _api('/api/gardens/me', { method: 'DELETE' }, oldSession.token);
  return true;
}

async function pushPhoto(key, plantId, photos) {
  const session = _sessions[key];
  if (!session?.token) return;
  await _api(`/api/garden/photos/${encodeURIComponent(plantId)}`, { method: 'PUT', body: JSON.stringify({ photos: photos || [] }) }, session.token);
}

async function fetchPhotos(key, plantId) {
  const session = _sessions[key];
  if (!session?.token) return [];
  const { ok, data } = await _api(`/api/garden/photos/${encodeURIComponent(plantId)}`, {}, session.token);
  return ok ? (data.photos || []) : [];
}

async function deletePhotos(key, plantId) {
  const session = _sessions[key];
  if (!session?.token) return;
  await _api(`/api/garden/photos/${encodeURIComponent(plantId)}`, { method: 'DELETE' }, session.token);
}

// admin: cross-garden access via a shared secret (Settings → Developer),
// entirely separate from the per-garden JWT sessions above
async function adminListGardens(secret) {
  const { ok, data } = await _api('/api/admin/gardens', { headers: { 'x-admin-secret': secret } });
  return ok ? (data.gardens || []) : null;
}

async function adminGetGarden(secret, key) {
  const { ok, data } = await _api(`/api/admin/gardens/${encodeURIComponent(key)}`, { headers: { 'x-admin-secret': secret } });
  return ok ? data : null;
}

async function adminPushGarden(secret, key, data) {
  const clean = JSON.parse(JSON.stringify(data, (_, v) => v === undefined ? null : v));
  const { ok } = await _api(`/api/admin/gardens/${encodeURIComponent(key)}`, { method: 'PUT', headers: { 'x-admin-secret': secret }, body: JSON.stringify(clean) });
  return ok;
}

async function adminDeleteGarden(secret, key) {
  const { ok } = await _api(`/api/admin/gardens/${encodeURIComponent(key)}`, { method: 'DELETE', headers: { 'x-admin-secret': secret } });
  return ok;
}

async function adminBulkDelete(secret, filter) {
  const { ok, data } = await _api('/api/admin/gardens/bulk-delete', { method: 'POST', headers: { 'x-admin-secret': secret }, body: JSON.stringify({ filter }) });
  return ok ? data.deleted : null;
}

async function adminGetStats(secret) {
  const { ok, data } = await _api('/api/admin/stats', { headers: { 'x-admin-secret': secret } });
  return ok ? data : null;
}

async function adminGetSettings(secret) {
  const { ok, data } = await _api('/api/admin/settings', { headers: { 'x-admin-secret': secret } });
  return ok ? data : null;
}

async function adminSaveSettings(secret, settings) {
  const { ok } = await _api('/api/admin/settings', { method: 'PUT', headers: { 'x-admin-secret': secret }, body: JSON.stringify(settings) });
  return ok;
}

async function adminRunBackup(secret) {
  const { ok, data } = await _api('/api/admin/backup/run', { method: 'POST', headers: { 'x-admin-secret': secret } });
  return ok ? data.file : null;
}

async function adminListBackups(secret) {
  const { ok, data } = await _api('/api/admin/backup/list', { headers: { 'x-admin-secret': secret } });
  return ok ? data.files : null;
}

function adminBackupDownloadUrl(secret, name) {
  return `${BACKEND_URL}/api/admin/backup/download/${encodeURIComponent(name)}?secret=${encodeURIComponent(secret)}`;
}

Object.assign(window, {
  listenGarden, pushGarden, gardenExists, renameGarden, fetchGardenOnce, gardenNodeId, changeGardenPassword, verifyGardenPassword,
  SYNC_READY, pushPhoto, fetchPhotos, deletePhotos, setActiveGarden, getActiveToken, BACKEND_URL,
  adminListGardens, adminGetGarden, adminPushGarden, adminDeleteGarden, adminBulkDelete, adminGetStats,
  adminGetSettings, adminSaveSettings, adminRunBackup, adminListBackups, adminBackupDownloadUrl,
});
