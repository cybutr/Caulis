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

// key -> { password, token, rev, base }
// `rev` is the last revision this session knows the server holds; `base` is
// the {plants,locations,queue} that was true at that rev — the common
// ancestor a 3-way merge diffs against when a push conflicts.
const _sessions = {};
let _activeKey = null;

function sameJSON(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

function indexById(arr) {
  const m = new Map();
  (arr || []).forEach(p => { if (p && p.id != null) m.set(p.id, p); });
  return m;
}

// per-plant 3-way merge: unchanged-on-one-side wins cleanly; a real edit-vs-
// edit conflict on the same plant prefers the remote copy (so nothing this
// device hasn't seen yet gets thrown away) and is flagged so the caller can
// tell the user a merge happened. Deletes never silently eat an edit made on
// the other side — an edited-elsewhere plant survives even if this device
// tried to delete it (and vice versa).
function mergePlants(base, local, remote) {
  const B = indexById(base), L = indexById(local), R = indexById(remote);
  const ids = new Set([...B.keys(), ...L.keys(), ...R.keys()]);
  const merged = [];
  let conflict = false;
  for (const id of ids) {
    const b = B.get(id), l = L.get(id), r = R.get(id);
    const lChanged = b ? (l ? !sameJSON(l, b) : true) : !!l;
    const rChanged = b ? (r ? !sameJSON(r, b) : true) : !!r;
    if (!l && !r) continue; // deleted on both sides
    if (l && !r) {
      if (!b) { merged.push(l); continue; } // new local plant
      if (lChanged) { merged.push(l); conflict = true; } // edited locally after remote deleted it — keep the edit
      continue; // remote deletion wins, nothing local changed
    }
    if (!l && r) {
      if (!b) { merged.push(r); continue; } // new remote plant
      if (rChanged) { merged.push(r); conflict = true; } // edited remotely after local deleted it — keep the edit
      continue; // local deletion wins
    }
    // present on both sides
    if (!lChanged) { merged.push(r); continue; }
    if (!rChanged) { merged.push(l); continue; }
    if (sameJSON(l, r)) { merged.push(l); continue; } // changed identically, no real conflict
    merged.push(r); // both edited the same plant differently — prefer remote, flag it
    conflict = true;
  }
  return { plants: merged, conflict };
}

// locations/queue are plain arrays (room names / plant ids) — no per-item
// identity worth a full 3-way diff, but a plain union is wrong once *both*
// sides changed: an item present in base and still sitting in one side's
// stale copy would "come back" even though the other side deliberately
// removed it (e.g. someone dequeues a printed tag on one device while the
// other device, mid-edit on something unrelated, still holds that id in its
// in-memory queue — a naive union resurrects it). So: a brand-new item
// (not in base) from either side is always kept; an item that *was* in base
// is kept only if neither side dropped it.
function mergeArray(base, local, remote) {
  if (sameJSON(local, base)) return remote || [];
  if (sameJSON(remote, base)) return local || [];
  const B = new Set(base || []), L = new Set(local || []), R = new Set(remote || []);
  const out = [];
  const seen = new Set();
  const add = v => { if (!seen.has(v)) { seen.add(v); out.push(v); } };
  (local || []).forEach(v => { if (!B.has(v) || R.has(v)) add(v); });
  (remote || []).forEach(v => { if (!B.has(v) || L.has(v)) add(v); });
  return out;
}

// badges are append-only records ({id, earnedAt}) that never contradict each
// other — the same badge earned on two devices always has the same id, so a
// plain union keyed by id (keeping the earliest earnedAt, in case two devices
// raced to unlock the same one at slightly different moments) is the whole
// merge, no 3-way diff needed the way plant edits require.
function mergeBadges(base, local, remote) {
  const m = new Map();
  const add = (b) => { if (!b || b.id == null) return; const ex = m.get(b.id); if (!ex || (b.earnedAt < ex.earnedAt)) m.set(b.id, { id: b.id, earnedAt: b.earnedAt }); };
  (base || []).forEach(add); (local || []).forEach(add); (remote || []).forEach(add);
  return [...m.values()].sort((a, b) => a.earnedAt - b.earnedAt);
}

function mergeGarden(base, local, remote) {
  const b = base || {};
  const { plants, conflict } = mergePlants(b.plants, local.plants, remote.plants);
  return {
    plants,
    locations: mergeArray(b.locations, local.locations, remote.locations),
    queue: mergeArray(b.queue, local.queue, remote.queue),
    badges: mergeBadges(b.badges, local.badges, remote.badges),
    conflict,
  };
}

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

function listenGarden(key, onData, isPushPending) {
  const session = _sessions[key];
  if (!session?.token) return () => {};
  let lastStamp = null;
  let stopped = false;
  const poll = async () => {
    const { ok, data } = await _api('/api/garden', {}, session.token);
    if (!ok || !data) return;
    // a local edit is debounced or its push is in flight, based on the
    // *previous* session.rev/base — overwriting them here with whatever a
    // concurrent device just wrote would make pushGarden's next PUT carry a
    // rev that happens to match the server's current row (since we just
    // adopted it), so the conditional-write check on the server silently
    // passes instead of 409ing, and the 3-way merge (which relies on
    // session.base being the *true* common ancestor) never runs — the
    // in-flight local edit would clobber the concurrent remote write with no
    // conflict detection at all. Skip the refresh entirely while pending; the
    // poll right after this device's push resolves (rev advanced for real,
    // or via a genuine 409+merge) will pick up the authoritative state.
    if (isPushPending && isPushPending()) return;
    session.rev = data.rev;
    session.base = { plants: data.plants, locations: data.locations, queue: data.queue, badges: data.badges };
    if (data.updated_at !== lastStamp) {
      lastStamp = data.updated_at;
      onData({ plants: data.plants, locations: data.locations, queue: data.queue, badges: data.badges });
    }
  };
  poll();
  const id = setInterval(() => { if (!stopped) poll(); }, 20000);
  return () => { stopped = true; clearInterval(id); };
}

// returns false on any failure (offline, expired token, server error) so
// callers can surface it — a save that silently never reaches the server is
// worse than one that visibly fails, especially for something people treat
// as a cloud backup of their plant collection.
//
// Conflict handling lives here, once, so every call site stays a plain
// "push this state" call: a 409 (someone else wrote since our last known
// rev) triggers a 3-way merge against the server's current copy and a single
// retry with the new rev. `onMerge(merged)` — if given — is called with the
// merged {plants,locations,queue} whenever a merge actually happened, so the
// caller can reconcile its own in-memory state instead of re-pushing the
// pre-merge version next time around. `onConflictNote(hadRealConflict)` is
// called alongside it so the UI can decide whether to surface a toast (only
// needed when the merge had to pick a side on the same plant, not for the
// common case of two different plants edited on two devices).
async function pushGarden(key, data, onMerge) {
  const session = _sessions[key];
  if (!session?.token) return false;
  const clean = JSON.parse(JSON.stringify(data, (_, v) => v === undefined ? null : v));
  const put = async (payload) => {
    try {
      const { ok, status, data: resp } = await _api('/api/garden', { method: 'PUT', body: JSON.stringify(payload) }, session.token);
      return { ok, status, resp };
    } catch (e) {
      return { ok: false, status: 0, resp: null };
    }
  };

  const rev = session.rev;
  const first = await put({ ...clean, rev });
  if (first.ok) {
    session.rev = first.resp?.rev ?? session.rev;
    session.base = { plants: clean.plants, locations: clean.locations, queue: clean.queue, badges: clean.badges };
    return true;
  }
  if (first.status !== 409 || !first.resp) return false;

  // conflict: merge our attempted write against the server's current copy,
  // using the last-known-common state (session.base) as the 3-way ancestor.
  const remote = first.resp;
  const merged = mergeGarden(session.base, clean, remote);
  const retryPayload = { ...clean, plants: merged.plants, locations: merged.locations, queue: merged.queue, badges: merged.badges, rev: remote.rev };
  const second = await put(retryPayload);
  if (!second.ok) return false; // another concurrent write raced us again — give up, next debounced push or poll will retry

  session.rev = second.resp?.rev ?? remote.rev + 1;
  session.base = { plants: merged.plants, locations: merged.locations, queue: merged.queue, badges: merged.badges };
  if (onMerge) onMerge({ plants: merged.plants, locations: merged.locations, queue: merged.queue, badges: merged.badges, conflict: merged.conflict });
  return true;
}

async function fetchGardenOnce(key) {
  const session = _sessions[key];
  if (!session?.token) return null;
  const { ok, data } = await _api('/api/garden', {}, session.token);
  if (!ok) return null;
  session.rev = data.rev;
  session.base = { plants: data.plants, locations: data.locations, queue: data.queue, badges: data.badges };
  return { plants: data.plants, locations: data.locations, queue: data.queue, badges: data.badges };
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
  const { ok, data } = await _api('/api/gardens/password', { method: 'PATCH', body: JSON.stringify({ newPassword }) }, session.token);
  // the server bumps token_version on every password change (so any other
  // token issued before now stops working) and hands back a freshly signed
  // token for this same request's caller — without swapping it in, this
  // device would immediately log itself out on its own next call.
  if (ok) { session.password = newPassword; if (data?.token) session.token = data.token; }
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

async function adminGetSystem(secret) {
  const { ok, data } = await _api('/api/admin/system', { headers: { 'x-admin-secret': secret } });
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

// fetches the backup file with the admin secret as a header (like every
// other admin call) instead of a query-string ?secret=... on a plain <a
// href> — that URL form was the one admin route still exposing the secret
// to browser history and, more importantly, reverse-proxy access logs on
// every click. Triggers the browser's normal save dialog via a throwaway
// object URL once the bytes are actually in hand.
async function adminDownloadBackup(secret, name) {
  try {
    const r = await fetch(`${BACKEND_URL}/api/admin/backup/download/${encodeURIComponent(name)}`, {
      headers: { 'x-admin-secret': secret },
    });
    if (!r.ok) return false;
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch (e) { return false; }
}

// web push: VAPID key + subscription CRUD, all scoped to the active garden's session
async function pushVapidKey() {
  const { ok, data } = await _api('/api/push/vapid-key');
  return ok ? data.key : null;
}

async function pushSubscribe(subscription, wateringEnabled, digestEnabled, lang) {
  const token = getActiveToken();
  if (!token) return false;
  const { ok } = await _api('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription, wateringEnabled, digestEnabled, lang }),
  }, token);
  return ok;
}

async function pushSetPrefs(endpoint, wateringEnabled, digestEnabled, lang) {
  const token = getActiveToken();
  if (!token) return false;
  const { ok } = await _api('/api/push/prefs', {
    method: 'PUT',
    body: JSON.stringify({ endpoint, wateringEnabled, digestEnabled, lang }),
  }, token);
  return ok;
}

async function pushUnsubscribe(endpoint) {
  const token = getActiveToken();
  if (!token) return false;
  const { ok } = await _api('/api/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) }, token);
  return ok;
}

async function pushSendTest(kind) {
  const token = getActiveToken();
  if (!token) return false;
  const { ok } = await _api('/api/push/test', { method: 'POST', body: JSON.stringify({ kind }) }, token);
  return ok;
}

// dev/self-service sync tools (Settings → Developer): raw rev visibility
// plus the two manual overrides for when a garden is stuck in a bad sync
// state — bypassing the normal 3-way merge entirely, on purpose.
function getSessionInfo(key) {
  const session = _sessions[key];
  if (!session) return null;
  return { rev: session.rev, hasToken: !!session.token };
}

// pulls the server's copy and makes it the new local truth + new merge
// ancestor, discarding whatever's only-local right now.
async function forcePullGarden(key) {
  const session = _sessions[key];
  if (!session?.token) return null;
  const { ok, data } = await _api('/api/garden', {}, session.token);
  if (!ok) return null;
  session.rev = data.rev;
  session.base = { plants: data.plants, locations: data.locations, queue: data.queue };
  return { plants: data.plants, locations: data.locations, queue: data.queue };
}

// unconditional overwrite: sends rev:null, which the server's conflict check
// treats as "no known rev" and skips entirely (same escape hatch older
// pre-rev clients rely on) — so this always wins, discarding any remote
// writes this session hasn't seen. Confirm hard before wiring this to a UI.
async function forcePushGarden(key, data) {
  const session = _sessions[key];
  if (!session?.token) return false;
  const clean = JSON.parse(JSON.stringify(data, (_, v) => v === undefined ? null : v));
  const { ok, data: resp } = await _api('/api/garden', { method: 'PUT', body: JSON.stringify({ ...clean, rev: null }) }, session.token);
  if (!ok) return false;
  session.rev = resp?.rev ?? session.rev;
  session.base = { plants: clean.plants, locations: clean.locations, queue: clean.queue };
  return true;
}

Object.assign(window, {
  listenGarden, pushGarden, gardenExists, renameGarden, fetchGardenOnce, gardenNodeId, changeGardenPassword, verifyGardenPassword,
  SYNC_READY, pushPhoto, fetchPhotos, deletePhotos, setActiveGarden, getActiveToken, BACKEND_URL,
  adminListGardens, adminGetGarden, adminPushGarden, adminDeleteGarden, adminBulkDelete, adminGetStats,
  adminGetSettings, adminSaveSettings, adminRunBackup, adminListBackups, adminDownloadBackup, adminGetSystem,
  pushVapidKey, pushSubscribe, pushSetPrefs, pushUnsubscribe, pushSendTest,
  getSessionInfo, forcePullGarden, forcePushGarden,
});
