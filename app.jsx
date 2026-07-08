// ════════════════════════════════════════════════════════════
//  Caulis — App router & state
// ════════════════════════════════════════════════════════════

// ── haptics ──────────────────────────────────────────────────
// Android/desktop use navigator.vibrate. iOS Safari has no vibrate
// API, so we trigger the Taptic Engine via a hidden <input switch>
// toggle (iOS 17.4+) — clicked inside a user gesture. (technique:
// haptics.lochie.me)
const _IS_IOS = typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent) && !window.MSStream;
let _hapticSwitch = null;
function _getHapticSwitch() {
  if (_hapticSwitch || typeof document === 'undefined') return _hapticSwitch;
  try {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.appendChild(input);
    document.body.appendChild(label);
    _hapticSwitch = input;
  } catch (e) {}
  return _hapticSwitch;
}
// kind: 'light' | 'medium' | 'heavy' | 'success' | 'warning'
function fireHaptic(kind = 'light') {
  if (_IS_IOS) {
    const sw = _getHapticSwitch();
    if (sw) {
      const taps = kind === 'success' ? 2 : kind === 'warning' ? 3 : 1;
      try { sw.click(); for (let i = 1; i < taps; i++) setTimeout(() => sw.click(), i * 90); } catch (e) {}
      return;
    }
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const pat = { light: 8, medium: 16, heavy: 28, success: [12, 60, 12], warning: [10, 40, 10, 40, 10] }[kind] || 10;
    try { navigator.vibrate(pat); } catch (e) {}
  }
}

// ── photo storage: IndexedDB (huge quota, handles base64 blobs).
// Local cache only — sync still flows through Firebase. ──────────
const _IDB_NAME = 'caulis', _IDB_STORE = 'photos';
let _idbP = null;
function _idb() {
  if (_idbP) return _idbP;
  _idbP = new Promise((res, rej) => {
    try {
      const r = indexedDB.open(_IDB_NAME, 1);
      r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(_IDB_STORE)) db.createObjectStore(_IDB_STORE); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
  return _idbP;
}
async function idbSet(key, val) { const db = await _idb(); return new Promise((res, rej) => { const tx = db.transaction(_IDB_STORE, 'readwrite'); tx.objectStore(_IDB_STORE).put(val, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }
async function idbDel(key) { try { const db = await _idb(); return await new Promise((res) => { const tx = db.transaction(_IDB_STORE, 'readwrite'); tx.objectStore(_IDB_STORE).delete(key); tx.oncomplete = () => res(); tx.onerror = () => res(); }); } catch (e) {} }
async function idbGetAll() { const db = await _idb(); return new Promise((res) => { const tx = db.transaction(_IDB_STORE, 'readonly'); const store = tx.objectStore(_IDB_STORE); const kq = store.getAllKeys(), vq = store.getAll(); const out = {}; tx.oncomplete = () => { const ks = kq.result || [], vs = vq.result || []; ks.forEach((k, i) => { out[k] = vs[i]; }); res(out); }; tx.onerror = () => res({}); }); }

function scheduleWatering(plants) {
  const today = new Date(); today.setHours(0,0,0,0);
  const tally = {}, result = {};
  const sorted = [...plants].sort((a,b) => (b.days/b.every) - (a.days/a.every));
  for (const p of sorted) {
    const due = new Date(today);
    due.setDate(due.getDate() + Math.max(0, p.every - p.days));
    let best = null, bestScore = -Infinity;
    for (let i = -1; i <= 4; i++) {
      const d = new Date(due); d.setDate(d.getDate() + i);
      if (d < today) continue;
      const ds = fmtLocalDate(d);
      const dow = d.getDay();
      const score = ((dow===0||dow===6)?2:0) - Math.abs(i)*0.5 - (tally[ds]||0)*1.5 - (i<0?0.5:0);
      if (score > bestScore) { bestScore = score; best = d; }
    }
    if (best) { const ds = fmtLocalDate(best); tally[ds]=(tally[ds]||0)+1; result[p.id]=ds; }
  }
  return result;
}

function App() {
  const vw = useWindowWidth();
  const isDesktop = vw >= DESKTOP_BP;

  const lsGet = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e) { if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) setStorageFull(true); return false; } };
  const [storageFull, setStorageFull] = useState(false);

  const [plants, setPlants]       = useState(() => lsGet('caulis_plants', []).map(p => {
    const photos = lsGet('caulis_imgs_' + p.id, null);
    const legacy = lsGet('caulis_img_' + p.id, null);
    const history = Array.isArray(p.history) ? p.history : [];
    const wateredAt = deriveWateredAt({ ...p, history });
    return { ...p, history, wateredAt, wv: WATER_SCHEMA, days: daysSinceMidnight(wateredAt), photos: photos || (legacy ? [legacy] : (p.photos || [])) };
  }));
  const locations = [...new Set(plants.map(p => p.location).filter(Boolean))].sort();
  const photosReady = useRef(false);
  const [tab, setTab]             = useState(() => lsGet('caulis_default_tab', 'garden'));
  const [detail, setDetail]       = useState(null);
  const [form, setForm]           = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [menuPlant, setMenuPlant]   = useState(null);
  const [undoDelete, setUndoDelete] = useState(null);
  const [queue, setQueue]         = useState(() => lsGet('caulis_queue', []));
  const [printed, setPrinted]     = useState(false);
  const [globalPrintSize, setGlobalPrintSizeRaw] = useState(() => lsGet('caulis_print_size', 40));
  const [queueSizes, setQueueSizes] = useState(() => lsGet('caulis_queue_sizes', {}));
  const [cardDensity, setCardDensityRaw] = useState(() => lsGet('caulis_density', 'comfy'));
  const setCardDensity = (v) => { setCardDensityRaw(v); lsSet('caulis_density', v); };
  const [hideHealthy, setHideHealthyRaw] = useState(() => lsGet('caulis_hide_healthy', false));
  const setHideHealthy = (v) => { setHideHealthyRaw(v); lsSet('caulis_hide_healthy', v); };
  const [reduceMotion, setReduceMotionRaw] = useState(() => lsGet('caulis_reduce_motion', false));
  const setReduceMotion = (v) => { setReduceMotionRaw(v); lsSet('caulis_reduce_motion', v); };
  const [confirmDelete, setConfirmDeleteRaw] = useState(() => lsGet('caulis_confirm_delete', false));
  const setConfirmDelete = (v) => { setConfirmDeleteRaw(v); lsSet('caulis_confirm_delete', v); };
  const [haptics, setHapticsRaw] = useState(() => lsGet('caulis_haptics', true));
  const setHaptics = (v) => { setHapticsRaw(v); lsSet('caulis_haptics', v); };
  const [defaultTab, setDefaultTabRaw] = useState(() => lsGet('caulis_default_tab', 'garden'));
  const setDefaultTab = (v) => { setDefaultTabRaw(v); lsSet('caulis_default_tab', v); };
  const [swipeNav, setSwipeNavRaw] = useState(() => lsGet('caulis_swipe_nav', true));
  const setSwipeNav = (v) => { setSwipeNavRaw(v); lsSet('caulis_swipe_nav', v); };
  const [navConfig, setNavConfigRaw] = useState(() => normalizeNav(lsGet('caulis_navbar', null)));
  const setNavConfig = (cfg) => { const n = normalizeNav(cfg); setNavConfigRaw(n); lsSet('caulis_navbar', n); };
  const [navLabels, setNavLabelsRaw] = useState(() => lsGet('caulis_nav_labels', true));
  const setNavLabels = (v) => { setNavLabelsRaw(v); lsSet('caulis_nav_labels', v); };
  const [gridCols, setGridColsRaw] = useState(() => lsGet('caulis_grid_cols', 0)); // 0 = follow density
  const setGridCols = (v) => { setGridColsRaw(v); lsSet('caulis_grid_cols', v); };
  const [sidebar, setSidebarRaw] = useState(() => ({ width:220, collapsed:false, side:'left', footer:'grown with care', ...lsGet('caulis_sidebar', {}) }));
  const setSidebar = (patch) => setSidebarRaw(prev => { const n = { ...prev, ...patch }; lsSet('caulis_sidebar', n); return n; });
  const [moreOpen, setMoreOpen] = useState(false);
  const onNavAction = (action) => {
    if (action === 'add') setForm({ mode:'add' });
    else if (action === 'doctor') setDoctor({});
    else if (action === 'more') setMoreOpen(true);
  };
  const navTo = (action) => { setMoreOpen(false); const meta = NAV_ACTIONS[action]; if (!meta) return; if (meta.tab) setTab(action); else onNavAction(action); };
  // launch: if the saved/default tab isn't in the customized bar, snap to its first tab
  useEffect(() => { const order = navTabOrder(navConfig); if (!order.includes(tab)) setTab(order[0]); }, [navConfig]);
  // "opens on launch" can now point at a non-tab action (Doctor, Add, More) —
  // there's no screen to land on for those, so this fires once at mount: land
  // on a real tab first (the effect above already handles that), then trigger
  // the action itself right after. Only ever runs once per app load, never on
  // later navConfig/defaultTab edits — otherwise saving the setting would
  // re-fire Doctor every time Settings re-renders.
  const firedLaunchActionRef = useRef(false);
  useEffect(() => {
    if (firedLaunchActionRef.current) return;
    firedLaunchActionRef.current = true;
    const meta = NAV_ACTIONS[defaultTab];
    if (meta && !meta.tab) setTimeout(() => onNavAction(defaultTab), 80);
  }, []);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [bulkMove, setBulkMove] = useState(null);
  const [bulkRemoveIds, setBulkRemoveIds] = useState(null);
  useEffect(() => { try { document.documentElement.setAttribute('data-rm', reduceMotion ? '1' : '0'); } catch(e) {} }, [reduceMotion]);
  const haptic = (kind = 'light') => { if (haptics) fireHaptic(kind); };

  // ── easter eggs ──────────────────────────────────────────────
  // konami code, anywhere in the app — a burst of falling leaves, purely decorative
  const [confetti, setConfetti] = useState(false);
  useEffect(() => {
    const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let pos = 0;
    const handler = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === seq[pos]) { pos++; if (pos === seq.length) { pos = 0; haptic('success'); setConfetti(true); setTimeout(() => setConfetti(false), 2600); } }
      else pos = key === seq[0] ? 1 : 0;
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  // a quiet milestone badge the first time the garden crosses a nice round size
  const MILESTONES = [5, 10, 25, 50, 100, 200];
  const [milestoneToast, setMilestoneToast] = useState(null);
  useEffect(() => {
    let seen = []; try { seen = lsGet('caulis_milestones_seen', []); } catch(e) {}
    const hit = MILESTONES.find(m => plants.length >= m && !seen.includes(m));
    if (hit) { lsSet('caulis_milestones_seen', [...seen, hit]); setMilestoneToast(hit); haptic('success'); setTimeout(() => setMilestoneToast(null), 4000); }
  }, [plants.length]);

  const [monochromePrint, setMonochromePrintRaw] = useState(() => lsGet('caulis_print_mono', false));
  const [gardenPassword, setGardenPassword] = useState(() => { try { return localStorage.getItem('caulis_garden_pw') || ''; } catch(e) { return ''; } });
  const [gardenNode, setGardenNode] = useState(null);
  const [gardenHistory, setGardenHistory] = useState(() => {
    const hist = lsGet('caulis_gardens', []);
    const currentKey = localStorage.getItem('caulis_garden_key');
    const currentPw = localStorage.getItem('caulis_garden_pw') || '';
    if (currentKey && !hist.find(h => h.key === currentKey)) {
      return [{ key: currentKey, password: currentPw }, ...hist].slice(0, 10);
    }
    return hist;
  });
  const [perenualKey, setPerenualKeyState] = useState(() => { try { return localStorage.getItem('caulis_perenual_key') || ''; } catch(e) { return ''; } });
  const [plantIdKey, setPlantIdKeyState] = useState(() => { try { return localStorage.getItem('caulis_plantid_key') || ''; } catch(e) { return ''; } });
  const [housePlantsKey, setHousePlantsKeyState] = useState(() => { try { return localStorage.getItem('caulis_houseplants_key') || ''; } catch(e) { return ''; } });
  const [anthropicKey, setAnthropicKeyState] = useState(() => { try { return localStorage.getItem('caulis_anthropic_key') || ''; } catch(e) { return ''; } });
  const [doctor, setDoctor] = useState(null); // { plant? } | null
  const [doctorModel, setDoctorModelState] = useState(() => { try { return localStorage.getItem('caulis_doctor_model') || 'claude-haiku-4-5'; } catch(e) { return 'claude-haiku-4-5'; } });
  const setDoctorModel = (m) => { try { localStorage.setItem('caulis_doctor_model', m); } catch(e) {} setDoctorModelState(m); };
  const [identifyLang, setIdentifyLangState] = useState(() => { try { return localStorage.getItem('caulis_identify_lang') || 'en'; } catch(e) { return 'en'; } });
  const [googleClientId, setGoogleClientIdState] = useState(() => { try { return localStorage.getItem('caulis_gcal_cid') || ''; } catch(e) { return ''; } });
  const [googleToken, setGoogleToken] = useState(null);
  const [googleEventIds, setGoogleEventIds] = useState(() => lsGet('caulis_gcal_eids', {}));
  const [googleSyncMode, setGoogleSyncModeState] = useState(() => { try { return localStorage.getItem('caulis_gsync_mode') || 'tasks'; } catch(e) { return 'tasks'; } });
  const saveGoogleClientId = (id) => { try { localStorage.setItem('caulis_gcal_cid', id); } catch(e) {} setGoogleClientIdState(id); };
  const [defaultEvery, setDefaultEvery] = useState(() => lsGet('caulis_default_every', 7));
  const [reminderTime, setReminderTimeState] = useState(() => { try { return localStorage.getItem('caulis_reminder_time') || '09:00'; } catch(e) { return '09:00'; } });
  const setReminderTime = (t) => { try { localStorage.setItem('caulis_reminder_time', t); } catch(e) {} setReminderTimeState(t); };
  const setGlobalPrintSize = v => { lsSet('caulis_print_size', v); setGlobalPrintSizeRaw(v); };
  const toggleMono = () => { const v = !monochromePrint; lsSet('caulis_print_mono', v); setMonochromePrintRaw(v); };
  const saveGardenPassword = async (pw) => {
    const next = pw || '';
    if (next === gardenPassword) return;
    await changeGardenPassword(gardenKey, next);
    try { localStorage.setItem('caulis_garden_pw', next); } catch(e) {}
    setGardenPassword(next);
  };

  const tokenClientRef = useRef(null);
  const getTokenClient = () => {
    if (tokenClientRef.current) return tokenClientRef.current;
    if (!googleClientId || typeof google === 'undefined') return null;
    tokenClientRef.current = google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: 'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar',
      callback: (res) => { if (res.access_token) { try { localStorage.setItem('caulis_gcal_seen', '1'); } catch(e) {} setGoogleToken(res.access_token); } },
      error_callback: () => {},
    });
    return tokenClientRef.current;
  };
  const connectGoogle = () => { const c = getTokenClient(); if (c) c.requestAccessToken(); };

  const TASKS_API = 'https://tasks.googleapis.com/tasks/v1';
  const CAL_API = 'https://www.googleapis.com/calendar/v3';

  // ── Tasks backend ──
  const getTaskListId = async (token) => {
    try { const cached = localStorage.getItem('caulis_gtasks_listid'); if (cached) return cached; } catch(e) {}
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      const lr = await fetch(`${TASKS_API}/users/@me/lists?maxResults=100`, { headers });
      if (lr.status === 401) { setGoogleToken(null); return null; }
      const items = (await lr.json()).items || [];
      const found = items.find(l => l.title === 'Caulis Plants');
      if (found) { try { localStorage.setItem('caulis_gtasks_listid', found.id); } catch(e) {} return found.id; }
    } catch(e) {}
    try {
      const cr = await fetch(`${TASKS_API}/users/@me/lists`, { method: 'POST', headers, body: JSON.stringify({ title: 'Caulis Plants' }) });
      if (!cr.ok) return null;
      const list = await cr.json();
      try { localStorage.setItem('caulis_gtasks_listid', list.id); } catch(e) {}
      return list.id;
    } catch(e) { return null; }
  };

  const upsertTask = async (plant, dateStr, token, existingId, listId) => {
    if (!listId) return null;
    const every = Math.max(1, Math.round(plant.every || 7));
    const task = {
      title: `💧 ${plant.name}`,
      notes: `Water every ${every} days\n${plant.latin||''}\n${plant.location}`,
      due: `${dateStr}T00:00:00.000Z`,
      status: 'needsAction',
      completed: null,
    };
    const base = `${TASKS_API}/lists/${listId}/tasks`;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    let res;
    if (existingId) {
      res = await fetch(`${base}/${existingId}`, { method: 'PATCH', headers, body: JSON.stringify(task) });
      if (res.status === 401) { setGoogleToken(null); return null; }
      if (!res.ok) res = await fetch(base, { method: 'POST', headers, body: JSON.stringify(task) });
    } else {
      res = await fetch(base, { method: 'POST', headers, body: JSON.stringify(task) });
    }
    if (res.status === 401) { setGoogleToken(null); return null; }
    if (!res.ok) return null;
    return (await res.json()).id;
  };

  // ── Calendar backend (dedicated, togglable "Caulis Plants" calendar) ──
  const getCalendarId = async (token) => {
    try { const cached = localStorage.getItem('caulis_gcal_calid'); if (cached) return cached; } catch(e) {}
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      const lr = await fetch(`${CAL_API}/users/me/calendarList`, { headers });
      if (lr.status === 401) { setGoogleToken(null); return null; }
      const items = (await lr.json()).items || [];
      const found = items.find(c => c.summary === 'Caulis Plants');
      if (found) { try { localStorage.setItem('caulis_gcal_calid', found.id); } catch(e) {} return found.id; }
    } catch(e) {}
    try {
      const cr = await fetch(`${CAL_API}/calendars`, { method: 'POST', headers, body: JSON.stringify({ summary: 'Caulis Plants', description: 'Watering reminders from Caulis', timeZone: tz }) });
      if (!cr.ok) return null;
      const cal = await cr.json();
      try { await fetch(`${CAL_API}/users/me/calendarList/${encodeURIComponent(cal.id)}`, { method: 'PATCH', headers, body: JSON.stringify({ backgroundColor: '#2D5016', foregroundColor: '#FFFFFF' }) }); } catch(e) {}
      try { localStorage.setItem('caulis_gcal_calid', cal.id); } catch(e) {}
      return cal.id;
    } catch(e) { return null; }
  };

  const upsertCalendarEvent = async (plant, dateStr, token, existingId, calId) => {
    if (!calId) return null;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const every = Math.max(1, Math.round(plant.every || 7));
    const [h, m] = (reminderTime || '09:00').split(':').map(Number);
    const pad = n => String(n).padStart(2, '0');
    const endH = (h + (m + 30 >= 60 ? 1 : 0)) % 24;
    const endM = (m + 30) % 60;
    const event = {
      summary: `💧 ${plant.name}`,
      description: `Water every ${every} days\n${plant.latin||''}\n${plant.location}`,
      start: { dateTime: `${dateStr}T${pad(h)}:${pad(m)}:00`, timeZone: tz },
      end:   { dateTime: `${dateStr}T${pad(endH)}:${pad(endM)}:00`, timeZone: tz },
      recurrence: [`RRULE:FREQ=DAILY;INTERVAL=${every}`],
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] },
    };
    const base = `${CAL_API}/calendars/${encodeURIComponent(calId)}/events`;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    let res;
    if (existingId) {
      res = await fetch(`${base}/${existingId}`, { method: 'PUT', headers, body: JSON.stringify(event) });
      if (res.status === 401) { setGoogleToken(null); return null; }
      if (!res.ok) {
        try { await fetch(`${base}/${existingId}`, { method: 'DELETE', headers }); } catch(e) {}
        res = await fetch(base, { method: 'POST', headers, body: JSON.stringify(event) });
      }
    } else {
      res = await fetch(base, { method: 'POST', headers, body: JSON.stringify(event) });
    }
    if (res.status === 401) { setGoogleToken(null); return null; }
    if (!res.ok) return null;
    return (await res.json()).id;
  };

  // ── mode dispatch ──
  const getSyncTargetId = (token, mode = googleSyncMode) => mode === 'calendar' ? getCalendarId(token) : getTaskListId(token);
  const upsertItem = (plant, dateStr, token, existingId, targetId, mode = googleSyncMode) =>
    mode === 'calendar'
      ? upsertCalendarEvent(plant, dateStr, token, existingId, targetId)
      : upsertTask(plant, dateStr, token, existingId, targetId);

  // delete the remote container (calendar or task list) for a given mode, keep token
  const purgeRemote = async (token, mode) => {
    const headers = { Authorization: `Bearer ${token}` };
    if (mode === 'calendar') {
      let calId = null; try { calId = localStorage.getItem('caulis_gcal_calid'); } catch(e) {}
      if (calId) { try { await fetch(`${CAL_API}/calendars/${encodeURIComponent(calId)}`, { method: 'DELETE', headers }); } catch(e) {} }
      try { localStorage.removeItem('caulis_gcal_calid'); } catch(e) {}
    } else {
      let listId = null; try { listId = localStorage.getItem('caulis_gtasks_listid'); } catch(e) {}
      if (listId) { try { await fetch(`${TASKS_API}/users/@me/lists/${listId}`, { method: 'DELETE', headers }); } catch(e) {} }
      try { localStorage.removeItem('caulis_gtasks_listid'); } catch(e) {}
    }
  };

  const syncAllToCalendar = async () => {
    if (!googleToken || !plants.length) return;
    const targetId = await getSyncTargetId(googleToken);
    if (!googleToken) return;
    const schedule = scheduleWatering(plants);
    const ids = { ...googleEventIds };
    for (const plant of plants) {
      const dateStr = schedule[plant.id];
      if (!dateStr) continue;
      const itemId = await upsertItem(plant, dateStr, googleToken, ids[plant.id], targetId);
      if (itemId) ids[plant.id] = itemId;
      if (!googleToken) break;
    }
    setGoogleEventIds(ids);
  };

  const setGoogleSyncMode = async (mode) => {
    if (mode === googleSyncMode) return;
    if (googleToken) await purgeRemote(googleToken, googleSyncMode); // tear down the old backend
    setGoogleEventIds({});
    try { localStorage.setItem('caulis_gsync_mode', mode); } catch(e) {}
    setGoogleSyncModeState(mode); // resync fires via the effect below
  };

  const disconnectGoogle = async () => {
    if (googleToken) await purgeRemote(googleToken, googleSyncMode);
    setGoogleEventIds({});
    setGoogleToken(null);
  };
  const savePerenualKey = (k) => { setApiKey(k); setPerenualKeyState(k || ''); };
  const savePlantIdKey = (k) => { setPlantIdKey(k); setPlantIdKeyState(k || ''); };
  const saveHousePlantsKey = (k) => { setHousePlantsKey(k); setHousePlantsKeyState(k || ''); };
  const saveAnthropicKey = (k) => { setAnthropicKey(k); setAnthropicKeyState(k || ''); };
  const saveIdentifyLang = (lang) => { setIdentifyLang(lang); setIdentifyLangState(lang); };
  const genKey = () => {
    const adj  = ['green','mossy','sunny','leafy','dewy','wild','quiet','calm','bright','soft','deep','cool'];
    const noun = ['fern','oak','sage','moss','leaf','vine','seed','root','grove','bloom','stem','bud'];
    return adj[Math.random()*adj.length|0]+'-'+noun[Math.random()*noun.length|0]+'-'+((Math.random()*90+10)|0);
  };

  const [gardenKey, setGardenKeyState] = useState(() => {
    try {
      let k = localStorage.getItem('caulis_garden_key');
      if (!k) { k = genKey(); localStorage.setItem('caulis_garden_key', k); }
      return k;
    } catch(e) { return 'local-garden'; }
  });

  const switchingGardenRef = useRef(
    (() => { try { return false; } catch(e) { return false; } })()
  );

  const [darkMode, setDarkModeState] = useState(() => {
    try { return localStorage.getItem('caulis_dark') === '1'; } catch(e) { return false; }
  });
  const setDarkMode = (v) => {
    try { localStorage.setItem('caulis_dark', v ? '1' : '0'); } catch(e) {}
    setDarkModeState(v);
  };
  const [palette, setPaletteRaw] = useState(() => lsGet('caulis_palette', 'forest'));
  const setPalette = (v) => { setPaletteRaw(v); lsSet('caulis_palette', v); };
  applyTheme(darkMode, palette);
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = C.bg === '#111610' ? '#111610' : C.forest;
  }, [darkMode, palette]);

  const fromRemoteRef = useRef(false);
  const [plantNotFound, setPlantNotFound] = useState(false);
  const [guestView, setGuestView] = useState(null);

  const openGuestPlant = async (gKey, plantId) => {
    setGuestView('loading');
    const data = await fetchGardenOnce(gKey);
    if (!data) { setGuestView(null); setPlantNotFound(true); return; }
    const arr = data.plants ? (Array.isArray(data.plants) ? data.plants : Object.values(data.plants)).filter(Boolean) : [];
    const plant = arr.find(p => p.id === plantId);
    if (!plant) { setGuestView(null); setPlantNotFound(true); return; }
    setGuestView({ plant, fromGardenKey: gKey });
  };
  const [installPrompt, setInstallPrompt] = useState(null);
  const [pendingLink] = useState(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const id = parseInt(sp.get('plant'), 10);
      const g = sp.get('g');
      if (!isNaN(id)) { window.history.replaceState({}, '', window.location.pathname); return { id, node: g || null }; }
    } catch(e) {}
    return null;
  });
  const pendingPlantId = pendingLink && !pendingLink.node ? pendingLink.id : null;

  // open a shared garden's plant as a read-only guest (capability = node in ?g=)
  useEffect(() => {
    if (pendingLink && pendingLink.node) openGuestPlant(pendingLink.node, pendingLink.id);
  }, []);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const setGardenKey = (k, pw = '') => {
    if (k === gardenKey && pw === gardenPassword) return;
    try {
      localStorage.setItem('caulis_garden_key', k);
      localStorage.setItem('caulis_garden_pw', pw || '');
      localStorage.removeItem('caulis_garden_node');
      const hist = [{ key: k, password: pw }, ...gardenHistory.filter(h => h.key !== k)].slice(0, 10);
      setGardenHistory(hist);
      lsSet('caulis_gardens', hist);
    } catch(e) {}
    switchingGardenRef.current = true;
    setGardenNode(null);
    setGardenKeyState(k);
    setGardenPassword(pw || '');
    setPlants([]);
    setQueue([]);
  };

  const removeGardenFromHistory = (key) => {
    const hist = gardenHistory.filter(h => h.key !== key);
    setGardenHistory(hist);
    lsSet('caulis_gardens', hist);
  };

  const renameGardenKey = async (newKey) => {
    const newNode = await gardenNodeId(newKey, gardenPassword);
    const cleanPlants = plants.map(({ photos, ...rest }) => rest);
    const data = { plants: cleanPlants, locations, queue, perenualKey: perenualKey || null, plantIdKey: plantIdKey || null, housePlantsKey: housePlantsKey || null, anthropicKey: anthropicKey || null};
    const ok = gardenNode ? await renameGarden(gardenNode, newNode, data) : true;
    if (ok) {
      try {
        localStorage.setItem('caulis_garden_key', newKey);
        localStorage.setItem('caulis_garden_node', newNode);
      } catch(e) {}
      switchingGardenRef.current = true;
      setGardenNode(newNode);
      setGardenKeyState(newKey);
    }
    return ok;
  };

  // ── derive the secret storage node from key + password ──
  useEffect(() => {
    let cancelled = false;
    gardenNodeId(gardenKey, gardenPassword).then(node => {
      if (cancelled) return;
      setGardenNode(node);
      setActiveGarden(node);
      try { localStorage.setItem('caulis_garden_node', node); } catch(e) {}
    });
    return () => { cancelled = true; };
  }, [gardenKey, gardenPassword]);

  // recompute days from the absolute watered timestamp when the day rolls
  // over or the tab regains focus (a left-open tab would otherwise freeze)
  useEffect(() => {
    const sync = () => setPlants(ps => ps.map(p => {
      const d = daysSinceMidnight(p.wateredAt);
      return d === p.days ? p : { ...p, days: d };
    }));
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    const t = setInterval(sync, 3600000);
    return () => { document.removeEventListener('visibilitychange', sync); window.removeEventListener('focus', sync); clearInterval(t); };
  }, []);

  // ── Persist: plant blob (photos stripped) to localStorage, photos to
  //    IndexedDB (big quota). Sync still goes through Firebase separately. ──
  useEffect(() => {
    lsSet('caulis_plants', plants.map(({ photos, userImage, ...rest }) => rest));
    if (!photosReady.current) return; // wait until initial photo load/migration done
    plants.forEach(p => {
      if (p.photos && p.photos.length) idbSet(p.id, p.photos).catch(()=>{});
      else idbDel(p.id);
    });
  }, [plants]);
  // load photos from IndexedDB once, migrating any left in localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let all = {};
      try { all = await idbGetAll(); } catch (e) {}
      try {
        const legacyKeys = [];
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('caulis_imgs_') === 0) legacyKeys.push(k); }
        for (const k of legacyKeys) {
          const id = +k.slice('caulis_imgs_'.length);
          try { const v = JSON.parse(localStorage.getItem(k)); if (v && v.length && !(all[id] && all[id].length)) { await idbSet(id, v); all[id] = v; } } catch (e) {}
          try { localStorage.removeItem(k); } catch (e) {}
        }
      } catch (e) {}
      if (!cancelled && Object.keys(all).length) {
        setPlants(ps => ps.map(p => (all[p.id] && all[p.id].length && !(p.photos && p.photos.length)) ? { ...p, photos: all[p.id] } : p));
      }
      photosReady.current = true;
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { lsSet('caulis_queue', queue); }, [queue]);
  useEffect(() => { lsSet('caulis_queue_sizes', queueSizes); }, [queueSizes]);
  useEffect(() => { lsSet('caulis_default_every', defaultEvery); }, [defaultEvery]);
  useEffect(() => { lsSet('caulis_gcal_eids', googleEventIds); }, [googleEventIds]);
  // re-sync whenever the calendar connects — recreates anything deleted/crossed
  // off in Google and re-anchors every reminder to its next due date
  useEffect(() => { if (googleToken) syncAllToCalendar(); }, [googleToken, googleSyncMode, reminderTime]);
  // silently re-acquire a token on start if access was granted before — no clicks
  useEffect(() => {
    if (!googleClientId) return;
    try { if (localStorage.getItem('caulis_gcal_seen') !== '1') return; } catch(e) { return; }
    let tries = 0;
    const t = setInterval(() => {
      if (typeof google === 'undefined') { if (++tries > 40) clearInterval(t); return; }
      clearInterval(t);
      const c = getTokenClient();
      if (c) c.requestAccessToken({ prompt: 'none' });
    }, 150);
    return () => clearInterval(t);
  }, []);

  // ── Open plant from URL param once data loads ──
  useEffect(() => {
    if (!pendingPlantId || !plants.length) return;
    if (plants.find(p => p.id === pendingPlantId)) openDetail(pendingPlantId, true);
  }, [plants]);


  // ── Firebase sync: listen for remote changes ──
  useEffect(() => {
    if (!gardenNode) return;
    const toArr = v => v ? (Array.isArray(v) ? v : Object.values(v)) : [];
    const unsubscribe = listenGarden(gardenNode, (data) => {
      fromRemoteRef.current = true;
      if (data.plants) {
        const incoming = toArr(data.plants).filter(Boolean);
        if (incoming.length) setPlants(prev => incoming.map(p => {
          const local = prev.find(lp => lp.id === p.id);
          // prefer synced photos; fall back to whatever this device already had
          const photos = (p.photos && p.photos.length) ? p.photos : (local ? (local.photos || []) : []);
          
          if (!photos.length) {
            // Lazy load from discrete photo node
            fetchPhotos(gardenNode, p.id).then(ph => {
              if (ph && ph.length) {
                setPlants(curr => curr.map(cp => cp.id === p.id && (!cp.photos || !cp.photos.length) ? { ...cp, photos: ph } : cp));
              }
            });
          }

          const history = Array.isArray(p.history) ? p.history : [];
          const wateredAt = deriveWateredAt({ ...p, history });
          return { ...p, history, wateredAt, wv: WATER_SCHEMA, days: daysSinceMidnight(wateredAt), photos };
        }));
      }
      if (data.queue)     setQueue(toArr(data.queue).filter(Boolean));
      if (data.perenualKey) { setApiKey(data.perenualKey); setPerenualKeyState(data.perenualKey); }
      if (data.plantIdKey) { setPlantIdKey(data.plantIdKey); setPlantIdKeyState(data.plantIdKey); }
      if (data.housePlantsKey) { setHousePlantsKey(data.housePlantsKey); setHousePlantsKeyState(data.housePlantsKey); }
      if (data.anthropicKey) { setAnthropicKey(data.anthropicKey); setAnthropicKeyState(data.anthropicKey); }
    });
    return unsubscribe;
  }, [gardenNode]);

  // ── Firebase sync: push local changes ──
  useEffect(() => {
    if (!gardenNode) return;
    if (fromRemoteRef.current) { fromRemoteRef.current = false; return; }
    if (switchingGardenRef.current) { switchingGardenRef.current = false; return; }
    const timer = setTimeout(() => {
      const cleanPlants = plants.map(({ photos, ...rest }) => rest);
      pushGarden(gardenNode, { plants: cleanPlants, locations, queue, perenualKey: perenualKey || null, plantIdKey: plantIdKey || null, housePlantsKey: housePlantsKey || null, anthropicKey: anthropicKey || null});
    }, 800);
    return () => clearTimeout(timer);
  }, [plants, locations, queue, gardenNode, perenualKey, plantIdKey, housePlantsKey, anthropicKey]);

  const updateApp = async () => {
    // Force a sync of any pending changes before wiping caches and reloading
    if (gardenNode) {
      const cleanPlants = plants.map(({ photos, ...rest }) => rest);
      pushGarden(gardenNode, { plants: cleanPlants, locations, queue, perenualKey: perenualKey || null, plantIdKey: plantIdKey || null, housePlantsKey: housePlantsKey || null, anthropicKey: anthropicKey || null });
    }
    
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.update()));
      }
      if (window.caches) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }
    } catch(e) {}
    window.location.reload();
  };

  const tintFor = (id) => TINTS[(id - 1) % TINTS.length];

  // unified mobile gesture: horizontal swipe = change tab (if enabled),
  // vertical pull at scroll-top = pull-to-refresh. Ignored over overlays
  // and horizontally-scrollable zones (marked data-noswipe).
  const TAB_ORDER = navTabOrder(navConfig); // screen-change animation direction only — persistent screens
  // swiping reaches every slot actually in the bar, not just the persistent-
  // screen ones — a slot replaced with Doctor/Add/More should be swipeable
  // to, same as tapping it would fire that action. A position pointer is
  // needed alongside `tab` because firing a non-tab action doesn't change
  // `tab` (Doctor/Add open as overlays, not screens), so pure index-of-tab
  // would get stuck re-firing the same slot on repeated swipes.
  const SWIPE_ORDER = normalizeNav(navConfig).filter(s => s.action !== 'empty').map(s => s.action);
  const swipeIdxRef = useRef(Math.max(0, SWIPE_ORDER.indexOf(tab)));
  useEffect(() => { const i = SWIPE_ORDER.indexOf(tab); if (i >= 0) swipeIdxRef.current = i; }, [tab, navConfig]);
  const PULL_MAX = 88, PULL_TRIG = 62;
  const swipeRef = useRef(null);
  const [pull, setPull] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const doRefresh = async () => {
    setRefreshing(true); setPull(PULL_TRIG); haptic('medium');
    const start = Date.now();
    try {
      if (SYNC_READY && gardenNode) {
        const data = await fetchGardenOnce(gardenNode);
        if (data) {
          const toArr = v => v ? (Array.isArray(v) ? v : Object.values(v)) : [];
          const incoming = toArr(data.plants).filter(Boolean);
          if (incoming.length) setPlants(prev => incoming.map(p => {
             const local = prev.find(lp => lp.id === p.id);
             const photos = (p.photos && p.photos.length) ? p.photos : (local ? (local.photos || []) : []);
             if (!photos.length) {
                fetchPhotos(gardenNode, p.id).then(ph => {
                   if (ph && ph.length) setPlants(curr => curr.map(cp => cp.id === p.id && (!cp.photos || !cp.photos.length) ? { ...cp, photos: ph } : cp));
                });
             }
             const history = Array.isArray(p.history) ? p.history : [];
             const wateredAt = deriveWateredAt({ ...p, history });
             return { ...p, history, wateredAt, wv: WATER_SCHEMA, days: daysSinceMidnight(wateredAt), photos };
          }));
          if (data.queue) setQueue(toArr(data.queue).filter(Boolean));
        }
      }
    } catch (e) {}
    setTimeout(() => { setRefreshing(false); setPull(0); }, Math.max(0, 650 - (Date.now() - start)));
  };
  const onSwipeStart = (e) => {
    if (e.pointerType === 'mouse' || refreshing) { swipeRef.current = null; return; }
    if (detail || form || moveTarget || menuPlant || guestView || confirmRemove != null || bulkMove || bulkRemoveIds) { swipeRef.current = null; return; }
    const noswipe = !!(e.target.closest && e.target.closest('[data-noswipe]'));
    swipeRef.current = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, top: e.currentTarget.scrollTop <= 0, noswipe, mode: null };
  };
  const onSwipeMove = (e) => {
    const s = swipeRef.current; if (!s) return;
    s.lx = e.clientX; s.ly = e.clientY;
    const dx = s.lx - s.x, dy = s.ly - s.y;
    if (!s.mode) {
      if (s.top && dy > 8 && dy > Math.abs(dx) * 1.3) s.mode = 'pull';
      else if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) s.mode = 'swipe';
    }
    if (s.mode === 'pull') { if (!pulling) setPulling(true); setPull(Math.min(PULL_MAX, dy * 0.5)); }
  };
  const onSwipeEnd = () => {
    const s = swipeRef.current; swipeRef.current = null;
    setPulling(false);
    if (!s) return;
    if (s.mode === 'pull') { if ((s.ly - s.y) * 0.5 >= PULL_TRIG) doRefresh(); else setPull(0); return; }
    if (!swipeNav || s.noswipe) return;
    const dx = s.lx - s.x, dy = s.ly - s.y;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const i = swipeIdxRef.current;
    const ni = dx < 0 ? Math.min(SWIPE_ORDER.length - 1, i + 1) : Math.max(0, i - 1);
    if (ni !== i) { swipeIdxRef.current = ni; navTo(SWIPE_ORDER[ni]); }
  };
  const prevTabRef = useRef(tab);
  const tabDir = TAB_ORDER.indexOf(tab) >= TAB_ORDER.indexOf(prevTabRef.current) ? 1 : -1;
  useEffect(() => { prevTabRef.current = tab; }, [tab]);
  const tabAnim = reduceMotion ? undefined : `${tabDir > 0 ? 'slideFromR' : 'slideFromL'} 280ms cubic-bezier(.2,.8,.2,1)`;

  // ── actions ──
  const openDetail = (id, fromScan = false) => setDetail({ id, fromScan });
  const closeDetail = () => setDetail(null);

  const water = (id, daysAgo = 0) => {
    haptic('light');
    const d = Math.max(0, daysAgo || 0);
    const when = new Date(); when.setHours(0,0,0,0); when.setDate(when.getDate() - d);
    const stamp = fmtLocalDate(when);
    setPlants(ps => ps.map(p => p.id === id ? { ...p, wateredAt: when.getTime(), wv: WATER_SCHEMA, days: d, history: [...(p.history||[]), stamp].slice(-60) } : p));
    if (googleToken) {
      const plant = plants.find(p => p.id === id);
      if (plant) {
        const updated = { ...plant, days: d };
        const ds = scheduleWatering([updated])[id];
        if (ds) getSyncTargetId(googleToken)
          .then(targetId => upsertItem(updated, ds, googleToken, googleEventIds[id], targetId))
          .then(itemId => { if (itemId) setGoogleEventIds(prev => ({ ...prev, [id]: itemId })); });
      }
    }
  };
  const undoWater = (id, prevDays) => setPlants(ps => ps.map(p => p.id === id ? { ...p, wateredAt: todayMidnight() - prevDays * 86400000, wv: WATER_SCHEMA, days: prevDays, history: (p.history||[]).slice(0, -1) } : p));
  const snooze = (id, n = 2) => { haptic('light'); setPlants(ps => ps.map(p => { if (p.id !== id) return p; const wa = Math.min(todayMidnight(), (p.wateredAt ?? todayMidnight()) + n * 86400000); return { ...p, wateredAt: wa, wv: WATER_SCHEMA, days: daysSinceMidnight(wa) }; })); };

  const toggleQueue = (id) => { setQueue(q => q.includes(id) ? q.filter(x => x !== id) : [...q, id]); setPrinted(false); };
  const removeQueue = (id) => {
    setQueue(q => q.filter(x => x !== id));
    setQueueSizes(s => { const n = {...s}; delete n[id]; return n; });
  };
  const setPlantSize = (id, mm) => setQueueSizes(s => {
    if (mm === null) { const n = {...s}; delete n[id]; return n; }
    return {...s, [id]: mm};
  });
  const printAll = () => {
    const items = queue.map(id => plants.find(p => p.id === id)).filter(Boolean);
    if (!items.length) return;
    const mono = monochromePrint;
    const czechMode = identifyLang === 'cs';
    const qrInk    = mono ? '000000' : '2D5016';
    const qrGround = mono ? 'FFFFFF' : 'FAFAF7';
    const labelBg  = mono ? '#fff'   : '#FAFAF7';
    const nameCol  = mono ? '#111'   : '#2D5016';
    const latinCol = mono ? '#666'   : '#6B4C2A';
    const qrSrc = (data, px) =>
      `https://api.qrserver.com/v1/create-qr-code/?size=${px}x${px}&margin=0&qzone=1&color=${qrInk}&bgcolor=${qrGround}&data=${encodeURIComponent(data)}`;
    const labels = items.map(p => {
      const mm      = queueSizes[p.id] || globalPrintSize;
      const qrMm    = (mm * 0.64).toFixed(1);
      const qrPx    = Math.max(200, Math.round(mm * 0.64 * 9));
      const wrapMm  = mm + 9;
      const namePt  = (mm * 0.20).toFixed(1);
      const latinPt = (mm * 0.115).toFixed(1);
      const textW   = (mm * 0.88).toFixed(1);
      return `
    <div class="wrap" style="width:${wrapMm}mm;height:${wrapMm}mm">
      <div class="label" style="width:${mm}mm;height:${mm}mm;background:${labelBg}">
        <div class="mark tl"></div><div class="mark tr"></div>
        <div class="mark bl"></div><div class="mark br"></div>
        <img src="${qrSrc(PLANT_QR_URL(p.id), qrPx)}" alt="" style="width:${qrMm}mm;height:${qrMm}mm"/>
        <div class="name" style="font-size:${namePt}pt;width:${textW}mm;color:${nameCol}">${czechMode && p.czech ? p.czech : p.name}</div>
        <div class="latin" style="font-size:${latinPt}pt;width:${textW}mm;color:${latinCol}">${p.latin}</div>
      </div>
    </div>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Caulis labels</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,600&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.labels{display:flex;flex-wrap:wrap;padding:10mm;gap:0;align-items:flex-start}
.wrap{display:flex;align-items:center;justify-content:center;break-inside:avoid}
.label{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;border:0.4px solid rgba(0,0,0,0.14);border-radius:3mm}
.mark{position:absolute;width:4mm;height:4mm}
.mark::before,.mark::after{content:'';position:absolute;background:#bbb}
.mark::before{width:100%;height:0.3px;top:0;left:0}
.mark::after{width:0.3px;height:100%;top:0;left:0}
.tl{top:-3.5mm;left:-3.5mm}.tr{top:-3.5mm;right:-3.5mm;transform:scaleX(-1)}.bl{bottom:-3.5mm;left:-3.5mm;transform:scaleY(-1)}.br{bottom:-3.5mm;right:-3.5mm;transform:scale(-1)}
.label img{display:block}
.name{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;margin-top:1mm;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.02em}
.latin{font-family:'DM Sans',sans-serif;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:0.5mm;opacity:0.65;letter-spacing:0.01em}
@media print{body{margin:0}.labels{padding:8mm}}
</style></head><body>
<div class="labels">${labels}</div>
<script>
window.onload=()=>{
  const imgs=document.querySelectorAll('img');
  let n=0,t=imgs.length;
  const go=()=>{if(++n>=t){window.print();setTimeout(()=>window.close(),500)}};
  if(!t){window.print();setTimeout(()=>window.close(),500);return}
  imgs.forEach(img=>{if(img.complete)go();else{img.onload=go;img.onerror=go}});
};
</script></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
    setPrinted(true);
    setTimeout(() => setPrinted(false), 2600);
  };

  const removePlant = (id) => {
    haptic('heavy');
    const p = plants.find(x => x.id === id);
    setPlants(ps => ps.filter(x => x.id !== id));
    setQueue(q => q.filter(x => x !== id));
    if (p) setUndoDelete({ plant: p, queued: queue.includes(id) });
    idbDel(id);
    if (gardenNode) deletePhotos(gardenNode, id);
  };
  const requestRemove = (id) => { if (confirmDelete) setConfirmRemove(id); else removePlant(id); };
  const undoRemove = () => {
    if (!undoDelete) return;
    const { plant, queued } = undoDelete;
    setPlants(ps => ps.some(x => x.id === plant.id) ? ps : [...ps, plant]);
    if (queued) setQueue(q => q.includes(plant.id) ? q : [...q, plant.id]);
    setUndoDelete(null);
  };
  useEffect(() => {
    if (!undoDelete) return;
    const t = setTimeout(() => setUndoDelete(null), 5000);
    return () => clearTimeout(t);
  }, [undoDelete]);
  const movePlant   = (id, room) => setPlants(ps => ps.map(p => p.id === id ? { ...p, location: room } : p));
  const bulkWater  = (ids) => ids.forEach(id => water(id, 0));
  const waterAll = () => { haptic('medium'); const stamp = fmtLocalDate(new Date()); const wa = todayMidnight(); setPlants(ps => ps.map(p => ({ ...p, wateredAt: wa, wv: WATER_SCHEMA, days: 0, history: [...(p.history||[]), stamp].slice(-60) }))); };
  const devOffsetDays = (n) => setPlants(ps => ps.map(p => { const wa = (typeof p.wateredAt === 'number' ? p.wateredAt : todayMidnight()) - n * 86400000; return { ...p, wateredAt: wa, wv: WATER_SCHEMA, days: daysSinceMidnight(wa) }; }));
  const devSetDays = (id, d) => setPlants(ps => ps.map(p => { if (p.id !== id) return p; const dd = Math.max(0, d | 0); const wa = todayMidnight() - dd * 86400000; return { ...p, wateredAt: wa, wv: WATER_SCHEMA, days: dd }; }));
  // repair tool: force-recompute wateredAt/days from the watering log
  // (history[]), ignoring whatever wateredAt currently says — history is the
  // append-only record of actual waterings, so it survives a corrupted stamp
  // (e.g. a bad sync bumping wateredAt/days without a matching history entry).
  const devResyncFromHistory = () => {
    let fixed = 0;
    setPlants(ps => ps.map(p => {
      const h = Array.isArray(p.history) ? p.history : [];
      if (!h.length) return p;
      const wa = midnightFromStamp(h[h.length - 1]);
      const days = daysSinceMidnight(wa);
      if (wa === p.wateredAt && days === p.days) return p;
      fixed++;
      return { ...p, wateredAt: wa, wv: WATER_SCHEMA, days };
    }));
    return fixed;
  };
  const adminListAllGardens = (secret) => adminListGardens(secret);
  const adminLoadGarden = async (secret, key) => { const data = await adminGetGarden(secret, key); return { key, data }; };
  const adminSaveGarden = (secret, key, data) => adminPushGarden(secret, key, data);
  const adminRemoveGarden = (secret, key) => adminDeleteGarden(secret, key);
  const adminBulkRemove = (secret, filter) => adminBulkDelete(secret, filter);
  const adminStats = (secret) => adminGetStats(secret);
  const adminSettings = (secret) => adminGetSettings(secret);
  const adminSaveSettingsFn = (secret, settings) => adminSaveSettings(secret, settings);
  const adminRunBackupFn = (secret) => adminRunBackup(secret);
  const adminListBackupsFn = (secret) => adminListBackups(secret);
  const adminBackupUrl = (secret, name) => adminBackupDownloadUrl(secret, name);
  const bulkQueue  = (ids) => { haptic('medium'); setQueue(q => { const s = new Set(q); ids.forEach(id => s.add(id)); return [...s]; }); setPrinted(false); };
  const doBulkRemove = () => { const ids = bulkRemoveIds || []; haptic('warning'); setPlants(ps => ps.filter(p => !ids.includes(p.id))); setQueue(q => q.filter(id => !ids.includes(id))); ids.forEach(id => idbDel(id)); setBulkRemoveIds(null); };
  const reorderQueue = (from, to) => setQueue(q => { if (from===to||from<0||to<0||from>=q.length||to>=q.length) return q; const n=[...q]; const [x]=n.splice(from,1); n.splice(to,0,x); return n; });
  const reorderPlants = (from, to) => setPlants(ps => { if (from===to||from<0||to<0||from>=ps.length||to>=ps.length) return ps; const n=[...ps]; const [x]=n.splice(from,1); n.splice(to,0,x); return n; });

  const savePlant = (data) => {
    if (data.id) {
      setPlants(ps => ps.map(p => {
        if (p.id !== data.id) return p;
        const next = { ...p, name: data.name, czech: data.czech || '', latin: data.latin, location: data.location };
        if (data.species) {
          const care = speciesCare(data.species);
          Object.assign(next, { every:care.every, light:care.light, care:care.care, fact:care.fact, watering:care.watering, benchmark:care.benchmark, sunlight:care.sunlight, species_id:care.species_id });
        }
        if (data.every) { next.every = data.every; next.benchmark = `${data.every} days`; }
        if (data.light) next.light = data.light;
        if (data.care) next.care = data.care;
        if (data.fact) next.fact = data.fact;
        if (data.days != null) { next.days = data.days; next.wateredAt = todayMidnight() - data.days * 86400000; next.wv = WATER_SCHEMA; }
        next.photos = data.photos || [];
        next.image = data.presetImage != null ? data.presetImage : p.image;
        delete next.userImage;
        if (gardenNode) pushPhoto(gardenNode, next.id, next.photos);
        return next;
      }));
    } else {
      const id = Math.max(0, ...plants.map(p => p.id)) + 1;
      const sp = data.species;
      const care = sp ? speciesCare(sp) : { every:defaultEvery, light:'Bright, indirect', care:'Water when the top of the soil feels dry.', fact:'Freshly added — identify it to enrich its care notes.', watering:'Average', benchmark:`${defaultEvery} days`, sunlight:[], image:null, species_id:null };
      if (gardenNode) pushPhoto(gardenNode, id, data.photos || []);
      setPlants(ps => [...ps, {
        id, name: data.name, czech: data.czech || '', latin: data.latin, location: data.location, days: data.days || 0, wateredAt: todayMidnight() - (data.days || 0) * 86400000, wv: WATER_SCHEMA,
        every: data.every || care.every, light: data.light || care.light, care: data.care || care.care, fact: data.fact || care.fact,
        watering:care.watering, benchmark: data.every ? `${data.every} days` : care.benchmark, sunlight:care.sunlight,
        species_id:care.species_id,
        image: data.presetImage != null ? data.presetImage : care.image,
        photos: data.photos || [],
        aiV: APP_VERSION,
      }]);
      setTab('garden');
    }
    setForm(null);
  };

  const [aiRecheck, setAiRecheck] = useState({ busy: false, done: 0, total: 0 });
  const recheckAllAI = async () => {
    if (aiRecheck.busy || !hasAnthropicKey()) return;
    const targets = plants.filter(p => !p.aiV);
    const withLatin = targets.filter(p => p.latin && p.latin !== '—');
    setAiRecheck({ busy: true, done: 0, total: withLatin.length });
    for (const p of withLatin) {
      try {
        const rec = await aiReviewCare({
          common_name: p.name, scientific_name: [p.latin], czech: p.czech || '',
          watering: p.watering || null, _aiEvery: p.every || undefined,
          watering_general_benchmark: p.every ? { value: String(p.every), unit: 'days' } : undefined,
          sunlight: p.sunlight || [], _care: p.care || '', _fact: p.fact || '', _source: 'recheck',
        });
        const care = speciesCare(rec);
        const blankName = (n) => !n || ['—','-','unknown','new plant','unnamed','plant'].includes(String(n).trim().toLowerCase());
        setPlants(ps => ps.map(x => x.id === p.id ? {
          ...x, name: (blankName(x.name) && rec._aiName) ? rec._aiName : x.name,
          every: care.every, light: care.light, care: care.care, fact: care.fact,
          watering: care.watering, benchmark: care.benchmark, sunlight: care.sunlight,
          czech: x.czech || care.czech || '', aiV: APP_VERSION,
        } : x));
      } catch (e) {}
      setAiRecheck(r => ({ ...r, done: r.done + 1 }));
    }
    setPlants(ps => ps.map(x => x.aiV ? x : { ...x, aiV: APP_VERSION }));
    setAiRecheck({ busy: false, done: 0, total: 0 });
  };

  // manual counterpart to the automatic GH-Pages-move redirect: same gather
  // logic (small settings/credentials, not the bulky re-derivable caches),
  // exchanged for a short one-time code — plain text you read/type/paste
  // rather than a link, since a tap-through URL turned out to be fragile
  // across messaging apps and installed-PWA webviews.
  const buildMigrationCode = async () => {
    const skip = new Set(['caulis_plants', 'caulis_queue', 'caulis_ai_care', 'caulis_garden_node']);
    const payload = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('caulis_') === 0 && !skip.has(k) && k.indexOf('caulis_img') !== 0) payload[k] = localStorage.getItem(k);
    }
    const r = await fetch(`${BACKEND_URL}/api/migrate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const { token } = await r.json();
    return token;
  };
  // applying a code while the app is already mounted can't just poke
  // localStorage — React already read it once at mount — so this hands off
  // to a full reload through the existing (already-tested) redemption path
  const applyMigrationCode = (code) => {
    location.href = 'https://caulis.czeddaru.dev/?_migrate=' + encodeURIComponent(code.trim());
  };

  const exportGarden = () => {
    const data = { version: APP_VERSION, exportedAt: new Date().toISOString(), gardenKey, locations, queue, plants };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `caulis-${gardenKey}-${fmtLocalDate(new Date())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importGarden = (data, mode) => {
    if (!data || !Array.isArray(data.plants)) return false;
    const incoming = data.plants.filter(Boolean).map(p => ({
      ...p, history: Array.isArray(p.history) ? p.history : [], photos: Array.isArray(p.photos) ? p.photos : [],
    }));
    if (mode === 'replace') {
      setPlants(incoming);
      setQueue(Array.isArray(data.queue) ? data.queue.filter(id => incoming.some(p => p.id === id)) : []);
      if (gardenNode) {
         incoming.forEach(p => {
             if (p.photos && p.photos.length) pushPhoto(gardenNode, p.id, p.photos);
         });
      }
      return true;
    }
    // merge — reindex colliding ids so existing plants (and their QRs) are untouched
    let nextId = Math.max(0, ...plants.map(p => p.id), ...incoming.map(p => p.id || 0)) + 1;
    const existing = new Set(plants.map(p => p.id));
    const remap = {};
    const added = incoming.map(p => {
      let id = p.id;
      if (existing.has(id)) { remap[p.id] = nextId; id = nextId; nextId++; }
      existing.add(id);
      return { ...p, id };
    });
    setPlants([...plants, ...added]);
    if (gardenNode) {
       added.forEach(p => {
           if (p.photos && p.photos.length) pushPhoto(gardenNode, p.id, p.photos);
       });
    }
    const importedQueue = (Array.isArray(data.queue) ? data.queue : []).map(id => remap[id] != null ? remap[id] : id);
    const allIds = new Set([...plants, ...added].map(p => p.id));
    setQueue(q => [...q, ...importedQueue.filter(id => !q.includes(id) && allIds.has(id))]);
    return true;
  };

  // ── shared overlay elements ──
  const detailPlant = detail ? plants.find(p => p.id === detail.id) : null;
  const moving = moveTarget ? plants.find(p => p.id === moveTarget.id) : null;

  const detailEl = detailPlant && (
    <PlantDetail
      key={detailPlant.id}
      plant={detailPlant} tint={tintFor(detailPlant.id)} fromScan={detail.fromScan}
      inQueue={queue.includes(detailPlant.id)}
      onBack={closeDetail} onWater={water} onUndoWater={undoWater}
      onToggleQueue={toggleQueue}
      onGoQueue={()=>{ closeDetail(); setTab('print'); }}
      onEdit={p=>{ closeDetail(); setForm({mode:'edit', plant:p}); }}
      onAskDoctor={p=>{ closeDetail(); setDoctor({ plant:p }); }}
      isDesktop={isDesktop}
      czechMode={identifyLang === 'cs'}
    />
  );

  const applyCorrection = (plantId, changes) => {
    haptic('light');
    setPlants(ps => ps.map(p => {
      if (p.id !== plantId) return p;
      const next = { ...p, ...changes };
      if (changes.every != null) next.benchmark = `${changes.every} days`;
      return next;
    }));
  };
  const doctorEl = doctor && (
    <DoctorOverlay plant={doctor.plant ? plants.find(p => p.id === doctor.plant.id) || doctor.plant : null} plants={plants} anthropicKey={anthropicKey} model={doctorModel} onApplyCorrection={applyCorrection} onBack={()=>setDoctor(null)} isDesktop={isDesktop}/>
  );

  const moreEl = moreOpen && (
    <div onClick={()=>setMoreOpen(false)} style={{ position:'fixed', inset:0, zIndex:44, background:'rgba(42,42,38,0.34)', display:'flex', flexDirection:'column', justifyContent:'flex-end', animation:'fade 160ms ease' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.bg, borderTopLeftRadius:26, borderTopRightRadius:26, padding:'10px 18px calc(30px + env(safe-area-inset-bottom))', animation:'slideUp 260ms cubic-bezier(.2,.8,.2,1)', maxHeight:'72%', overflowY:'auto' }}>
        <div style={{ width:38, height:4, borderRadius:999, background:'rgba(45,80,22,0.16)', margin:'0 auto 14px' }}/>
        <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:21, color:C.forest, textAlign:'center', marginBottom:14 }}>All sections</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(92px, 1fr))', gap:12 }}>
          {NAV_ORDER.filter(a => a !== 'more').map(a => {
            const meta = NAV_ACTIONS[a]; const active = meta.tab && tab === a;
            return (
              <div key={a} onClick={()=>navTo(a)} style={{ cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 8px', borderRadius:18, background: active ? 'rgba(110,154,62,0.1)' : C.panel, border: active ? '1px solid rgba(110,154,62,0.4)' : C.hair }}>
                <meta.Icon s={24} c={active ? C.forest : C.brown} a={active ? 1 : 0.7}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color: active ? C.forest : C.ink }}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const formEl = form && (
    <AddPlant
      key={form.mode === 'edit' ? 'edit-'+form.plant.id : 'add'}
      locations={locations} editing={form.mode === 'edit' ? form.plant : null}
      onBack={()=>setForm(null)} onSave={savePlant} onAddLocation={()=>{}}
      isDesktop={isDesktop} czechMode={identifyLang === 'cs'}/>
  );

  const undoDeleteEl = undoDelete && (
    <div style={{ position:'fixed', bottom: isDesktop?24:'calc(86px + env(safe-area-inset-bottom))', left:0, right:0, display:'flex', justifyContent:'center', zIndex:60, animation:'popUp 280ms cubic-bezier(.2,.9,.3,1.2)', pointerEvents:'none' }}>
      <div style={{ pointerEvents:'auto', display:'inline-flex', alignItems:'center', gap:12, background:C.toast, borderRadius:999, padding:'10px 12px 10px 18px', boxShadow:'0 10px 26px rgba(0,0,0,0.28)' }}>
        <span style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:500, color:'#fff' }}>{undoDelete.plant.name} removed</span>
        <div onClick={undoRemove} style={{ cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.16)', borderRadius:999, padding:'6px 13px' }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5 3 2 6l3 3M2 6h6.5a3.5 3.5 0 010 7H6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600, color:'#fff' }}>Undo</span>
        </div>
      </div>
    </div>
  );

  const storageFullEl = storageFull && (
    <div style={{ position:'fixed', bottom: isDesktop?24:'calc(86px + env(safe-area-inset-bottom))', left:0, right:0, display:'flex', justifyContent:'center', zIndex:70, padding:'0 18px', animation:'popUp 280ms cubic-bezier(.2,.9,.3,1.2)', pointerEvents:'none' }}>
      <div style={{ pointerEvents:'auto', display:'inline-flex', alignItems:'center', gap:12, maxWidth:420, background:'#B4472E', borderRadius:18, padding:'12px 14px 12px 16px', boxShadow:'0 10px 26px rgba(0,0,0,0.28)' }}>
        <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:500, color:'#fff', lineHeight:1.4 }}>Device storage full — recent photos may not be saved. Remove some photos or back up your garden.</span>
        <div onClick={()=>setStorageFull(false)} style={{ cursor:'pointer', flexShrink:0, width:26, height:26, borderRadius:999, background:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="11" height="11" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </div>
      </div>
    </div>
  );

  const confettiEl = confetti && (
    <div style={{ position:'fixed', inset:0, zIndex:90, pointerEvents:'none', overflow:'hidden' }}>
      {Array.from({ length: 28 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const dur = 1.8 + Math.random() * 1.2;
        const size = 12 + Math.random() * 10;
        const rot = Math.random() * 360;
        const hue = i % 2 === 0 ? C.forest : C.sage;
        return (
          <div key={i} style={{ position:'absolute', top:-24, left:`${left}%`, fontSize:size, opacity:0.9,
            animation:`confettiFall ${dur}s ease-in ${delay}s forwards`, transform:`rotate(${rot}deg)`, color:hue }}>🌿</div>
        );
      })}
    </div>
  );
  const milestoneToastEl = milestoneToast != null && (
    <div style={{ position:'fixed', top:'calc(18px + env(safe-area-inset-top))', left:0, right:0, display:'flex', justifyContent:'center', zIndex:65, animation:'popUp 320ms cubic-bezier(.2,.9,.3,1.2)', pointerEvents:'none' }}>
      <div style={{ background:C.toast, color:'#fff', borderRadius:999, padding:'11px 20px', fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600, boxShadow:'0 10px 26px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', gap:8 }}>
        🌱 {milestoneToast} plants — your garden is growing
      </div>
    </div>
  );

  const confirmRemoveEl = confirmRemove != null && (() => {
    const p = plants.find(x => x.id === confirmRemove);
    if (!p) return null;
    return (
      <div onClick={()=>setConfirmRemove(null)} style={{ position:'fixed', inset:0, zIndex:80, background:'rgba(20,30,12,0.42)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, animation:'fade 160ms ease' }}>
        <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:320, background:C.panel, borderRadius:22, padding:'22px 22px 16px', boxShadow:'0 18px 48px rgba(0,0,0,0.3)', animation:'popUp 240ms cubic-bezier(.2,.9,.3,1.2)' }}>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:22, color:C.ink }}>Delete {p.name}?</div>
          <div style={{ fontFamily:FONT_SANS, fontSize:13, color:C.ink, opacity:0.6, marginTop:6, lineHeight:1.5 }}>This removes the plant from your garden. You can undo right after.</div>
          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <div onClick={()=>setConfirmRemove(null)} style={{ flex:1, textAlign:'center', padding:'12px 0', borderRadius:14, background:'rgba(45,80,22,0.07)', fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:C.ink, cursor:'pointer' }}>Cancel</div>
            <div onClick={()=>{ removePlant(confirmRemove); setConfirmRemove(null); }} style={{ flex:1, textAlign:'center', padding:'12px 0', borderRadius:14, background:'#B4472E', fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:'#fff', cursor:'pointer' }}>Delete</div>
          </div>
        </div>
      </div>
    );
  })();

  const bulkRemoveEl = bulkRemoveIds && bulkRemoveIds.length > 0 && (
    <div onClick={()=>setBulkRemoveIds(null)} style={{ position:'fixed', inset:0, zIndex:80, background:'rgba(20,30,12,0.42)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, animation:'fade 160ms ease' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:320, background:C.panel, borderRadius:22, padding:'22px 22px 16px', boxShadow:'0 18px 48px rgba(0,0,0,0.3)', animation:'popUp 240ms cubic-bezier(.2,.9,.3,1.2)' }}>
        <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:22, color:C.ink }}>Delete {bulkRemoveIds.length} plant{bulkRemoveIds.length===1?'':'s'}?</div>
        <div style={{ fontFamily:FONT_SANS, fontSize:13, color:C.ink, opacity:0.6, marginTop:6, lineHeight:1.5 }}>This removes them from your garden and cannot be undone.</div>
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <div onClick={()=>setBulkRemoveIds(null)} style={{ flex:1, textAlign:'center', padding:'12px 0', borderRadius:14, background:'rgba(45,80,22,0.07)', fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:C.ink, cursor:'pointer' }}>Cancel</div>
          <div onClick={doBulkRemove} style={{ flex:1, textAlign:'center', padding:'12px 0', borderRadius:14, background:'#B4472E', fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:'#fff', cursor:'pointer' }}>Delete</div>
        </div>
      </div>
    </div>
  );

  // ── active screen ──
  const screenProps = { isDesktop };
  let screen = null;
  if (tab === 'garden')   screen = <GardenScreen plants={plants} onOpen={id=>openDetail(id)} onAdd={()=>setForm({mode:'add'})} onLongPress={p=>setMenuPlant(p)} onReorder={reorderPlants} density={cardDensity} gridCols={gridCols} hideHealthy={hideHealthy} onBulkWater={bulkWater} onBulkQueue={bulkQueue} onBulkMove={setBulkMove} onBulkRemove={setBulkRemoveIds} onHaptic={()=>haptic('light')} czechMode={identifyLang === 'cs'} {...screenProps}/>;
  if (tab === 'needs')    screen = <NeedsWaterScreen plants={plants} onOpen={id=>openDetail(id)} onLongPress={p=>setMenuPlant(p)} onSnooze={snooze} onWaterAll={waterAll} confirmDelete={confirmDelete} czechMode={identifyLang === 'cs'} {...screenProps}/>;
  if (tab === 'scanner')  screen = <ScannerScreen plants={plants} paused={!!detail || !!guestView || plantNotFound} onScan={(id, scannedGarden) => { if (scannedGarden && scannedGarden !== gardenNode) openGuestPlant(scannedGarden, id); else openDetail(id, true); }} {...screenProps}/>;
  if (tab === 'print')    screen = <PrintQueueScreen queue={queue} plants={plants} onOpen={id=>openDetail(id)} onRemove={removeQueue} onPrintAll={printAll} printed={printed} globalPrintSize={globalPrintSize} onSetGlobalSize={setGlobalPrintSize} queueSizes={queueSizes} onSetSize={setPlantSize} onReorder={reorderQueue} monochromePrint={monochromePrint} onToggleMono={toggleMono} czechMode={identifyLang === 'cs'} {...screenProps}/>;
  if (tab === 'settings') screen = <SettingsScreen plants={plants} gardenKey={gardenKey} gardenHistory={gardenHistory} onRemoveHistory={removeGardenFromHistory} onSetGardenKey={setGardenKey} onRenameGardenKey={renameGardenKey} installPrompt={installPrompt} onInstall={()=>{ if(installPrompt){ installPrompt.prompt(); installPrompt.userChoice.then(()=>setInstallPrompt(null)); } }} darkMode={darkMode} onToggleDark={()=>setDarkMode(!darkMode)} gardenPassword={gardenPassword} onSavePassword={saveGardenPassword} perenualKey={perenualKey} onSavePerenualKey={savePerenualKey} housePlantsKey={housePlantsKey} onSaveHousePlantsKey={saveHousePlantsKey} anthropicKey={anthropicKey} onSaveAnthropicKey={saveAnthropicKey} onRecheckAI={recheckAllAI} aiRecheck={aiRecheck} plantIdKey={plantIdKey} onSavePlantIdKey={savePlantIdKey} identifyLang={identifyLang} onSetIdentifyLang={saveIdentifyLang} defaultEvery={defaultEvery} onSetDefaultEvery={setDefaultEvery} globalPrintSize={globalPrintSize} onSetGlobalSize={setGlobalPrintSize} monochromePrint={monochromePrint} onToggleMono={toggleMono} googleClientId={googleClientId} onSaveGoogleClientId={saveGoogleClientId} googleToken={googleToken} onConnectGoogle={connectGoogle} onSyncCalendar={syncAllToCalendar} onDisconnectGoogle={disconnectGoogle} googleSyncMode={googleSyncMode} onSetGoogleSyncMode={setGoogleSyncMode} reminderTime={reminderTime} onSetReminderTime={setReminderTime} onUpdateApp={updateApp} onExport={exportGarden} onImport={importGarden} onBuildMigrationCode={buildMigrationCode} onApplyMigrationCode={applyMigrationCode} cardDensity={cardDensity} onSetDensity={setCardDensity} hideHealthy={hideHealthy} onToggleHideHealthy={()=>setHideHealthy(!hideHealthy)} reduceMotion={reduceMotion} onToggleReduceMotion={()=>setReduceMotion(!reduceMotion)} confirmDelete={confirmDelete} onToggleConfirmDelete={()=>setConfirmDelete(!confirmDelete)} haptics={haptics} onToggleHaptics={()=>setHaptics(!haptics)} defaultTab={defaultTab} onSetDefaultTab={setDefaultTab} swipeNav={swipeNav} onToggleSwipeNav={()=>setSwipeNav(!swipeNav)} onWaterAll={waterAll} onDevOffsetDays={devOffsetDays} onDevSetDays={devSetDays} onDevResyncFromHistory={devResyncFromHistory} onAdminListGardens={adminListAllGardens} onAdminLoadGarden={adminLoadGarden} onAdminSaveGarden={adminSaveGarden} onAdminRemoveGarden={adminRemoveGarden} onAdminBulkRemove={adminBulkRemove} onAdminStats={adminStats} onAdminGetSettings={adminSettings} onAdminSaveSettings={adminSaveSettingsFn} onAdminRunBackup={adminRunBackupFn} onAdminListBackups={adminListBackupsFn} onAdminBackupUrl={adminBackupUrl} onVerifyPassword={(pw)=>verifyGardenPassword(gardenKey,pw)} navConfig={navConfig} onSetNavConfig={setNavConfig} navLabels={navLabels} onToggleNavLabels={()=>setNavLabels(!navLabels)} gridCols={gridCols} onSetGridCols={setGridCols} sidebar={sidebar} onSetSidebar={setSidebar} palette={palette} onSetPalette={setPalette} doctorModel={doctorModel} onSetDoctorModel={setDoctorModel} {...screenProps}/>;

  // ════════════════════════════════════════
  //  DESKTOP LAYOUT
  // ════════════════════════════════════════
  if (isDesktop) {
    return (
      <div style={{ display:'flex', minHeight:'100vh', background:C.bg, flexDirection: sidebar.side === 'right' ? 'row-reverse' : 'row' }}>
        <DesktopSidebar tab={tab} setTab={setTab} onAction={onNavAction} navConfig={navConfig} showLabels={navLabels} sidebar={sidebar}/>
        <div style={{ flex:1, height:'100vh', overflowY:'auto', overflowX:'hidden', position:'relative' }}>
          <div key={tab} style={{ animation: tabAnim, minHeight:'100%' }}>{screen}</div>
        </div>

        {detailPlant && (
          <DesktopModal onClose={closeDetail} maxWidth={520}>
            {detailEl}
          </DesktopModal>
        )}
        {form && (
          <DesktopModal onClose={()=>setForm(null)} maxWidth={480} noBackdropClose>
            {formEl}
          </DesktopModal>
        )}
        {doctor && <div style={{ position:'fixed', inset:0, zIndex:46 }}>{doctorEl}</div>}
        {moreEl}
        {moving && (
          <MoveSheet plant={moving} locations={locations} onClose={()=>setMoveTarget(null)} onPick={movePlant} onAddLocation={()=>{}} isDesktop/>
        )}
        {bulkMove && bulkMove.length > 0 && (
          <MoveSheet ids={bulkMove} locations={locations} onClose={()=>setBulkMove(null)} onPick={movePlant} onAddLocation={()=>{}} isDesktop/>
        )}
        {menuPlant && (
          <ContextMenu
            plant={menuPlant} onClose={()=>setMenuPlant(null)}
            onEdit={p=>setForm({mode:'edit', plant:p})}
            onMove={p=>setMoveTarget(p)}
            onRemove={requestRemove}
            isDesktop/>
        )}
        {plantNotFound && <PlantNotFoundScreen onBack={()=>{ setPlantNotFound(false); setTab('garden'); }}/>}
        {undoDeleteEl}
        {storageFullEl}
        {confettiEl}
        {milestoneToastEl}
        {confirmRemoveEl}
        {bulkRemoveEl}
        {guestView === 'loading' && <div style={{ position:'fixed', inset:0, zIndex:50, background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', animation:'fade 160ms ease' }}><div style={{ width:38, height:38, borderRadius:999, border:`3px solid rgba(45,80,22,0.2)`, borderTopColor:C.forest, animation:'spin 0.9s linear infinite' }}/></div>}
        {guestView && guestView !== 'loading' && (
          <DesktopModal onClose={()=>setGuestView(null)} maxWidth={520}>
            <PlantDetail plant={guestView.plant} tint={tintFor(guestView.plant.id)} fromScan readonly inQueue={false} onBack={()=>setGuestView(null)} onWater={()=>{}} onUndoWater={()=>{}} onToggleQueue={()=>{}} onGoQueue={()=>{}} onEdit={()=>{}} isDesktop={isDesktop} czechMode={identifyLang === 'cs'}/>
          </DesktopModal>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  //  MOBILE LAYOUT
  // ════════════════════════════════════════
  return (
    <div style={{ position:'fixed', inset:0, display:'flex', flexDirection:'column', background:C.bg, overflow:'hidden' }}>
      <div onPointerDown={onSwipeStart} onPointerMove={onSwipeMove} onPointerUp={onSwipeEnd} onPointerCancel={onSwipeEnd} style={{ flex:1, overflowY:'auto', overflowX:'hidden', position:'relative', WebkitOverflowScrolling:'touch', touchAction:'pan-y' }}>
        {(pull > 0 || refreshing) && (
          <div style={{ position:'absolute', top:0, left:0, right:0, height:0, display:'flex', justifyContent:'center', pointerEvents:'none', zIndex:5 }}>
            <div style={{ marginTop: Math.max(6, pull - 24), opacity: Math.min(1, pull / PULL_TRIG), transform:`scale(${Math.min(1, 0.55 + pull / PULL_MAX)})`, width:32, height:32, borderRadius:999, background:C.panel, boxShadow:'0 4px 16px rgba(45,80,22,0.2)', display:'flex', alignItems:'center', justifyContent:'center', transition: pulling ? 'none' : `margin-top ${MOTION.base}ms ${MOTION.out}, opacity ${MOTION.base}ms ${MOTION.out}` }}>
              <div style={{ width:15, height:15, borderRadius:999, border:'2px solid rgba(45,80,22,0.18)', borderTopColor:C.forest, animation: refreshing ? 'spin 0.8s linear infinite' : 'none', transform: refreshing ? 'none' : `rotate(${pull * 3}deg)` }}/>
            </div>
          </div>
        )}
        <div style={{ transform: pull > 0 ? `translateY(${pull}px)` : undefined, transition: pulling ? 'none' : `transform ${MOTION.base}ms ${MOTION.out}` }}>
          <div key={tab} style={{ animation: tabAnim, minHeight:'100%' }}>{screen}</div>
        </div>
      </div>
      <BottomNav tab={tab} setTab={setTab} onAction={onNavAction} navConfig={navConfig} showLabels={navLabels}/>

      {detailPlant && detailEl}
      {form && formEl}
      {doctor && doctorEl}
      {moreEl}
      {moving && (
        <MoveSheet plant={moving} locations={locations} onClose={()=>setMoveTarget(null)} onPick={movePlant} onAddLocation={()=>{}}/>
      )}
      {bulkMove && bulkMove.length > 0 && (
        <MoveSheet ids={bulkMove} locations={locations} onClose={()=>setBulkMove(null)} onPick={movePlant} onAddLocation={()=>{}}/>
      )}
      {menuPlant && (
        <ContextMenu
          plant={menuPlant} onClose={()=>setMenuPlant(null)}
          onEdit={p=>setForm({mode:'edit', plant:p})}
          onMove={p=>setMoveTarget(p)}
          onRemove={requestRemove}/>
      )}
      {plantNotFound && <PlantNotFoundScreen onBack={()=>{ setPlantNotFound(false); setTab('garden'); }}/>}
      {undoDeleteEl}
      {storageFullEl}
      {confettiEl}
      {milestoneToastEl}
      {confirmRemoveEl}
      {bulkRemoveEl}
      {guestView === 'loading' && <div style={{ position:'fixed', inset:0, zIndex:50, background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', animation:'fade 160ms ease' }}><div style={{ width:38, height:38, borderRadius:999, border:`3px solid rgba(45,80,22,0.2)`, borderTopColor:C.forest, animation:'spin 0.9s linear infinite' }}/></div>}
      {guestView && guestView !== 'loading' && <PlantDetail plant={guestView.plant} tint={tintFor(guestView.plant.id)} fromScan readonly inQueue={false} onBack={()=>setGuestView(null)} onWater={()=>{}} onUndoWater={()=>{}} onToggleQueue={()=>{}} onGoQueue={()=>{}} onEdit={()=>{}} isDesktop={false} czechMode={identifyLang === 'cs'}/>}
    </div>
  );
}

// catches any render-time error and shows a recoverable screen instead of a
// blank white page — without this, one bad value reaching a render (e.g. a
// malformed import, a corrupted local cache) silently unmounts the whole app
// standalone light/dark read for the boundary below — it wraps <App/> so it
// can't trust App's own darkMode state to still exist by the time it renders
function _crashTheme() {
  let dark = false;
  try {
    const stored = localStorage.getItem('caulis_dark');
    dark = stored != null ? stored === '1' : matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (e) {}
  return dark
    ? { bg:'#111610', panel:'#192115', forest:'#7EC870', ink:'#DCE8CC', brown:'#C4A882' }
    : { bg:'#FAFAF7', panel:'#FFFFFF', forest:'#2D5016', ink:'#2A2A26', brown:'#6B4C2A' };
}

// a little personality beats a generic crash notice — picked once per mount
// so a reload gets a fresh line rather than the same one every time
const _CRASH_LINES = [
  ['Root rot detected', "Something in the code wilted. Your garden's fine — it lives on the server, not in this tab."],
  ['Overwatered the state tree', "One branch got too much and the rest went soggy. Reloading dries it back out."],
  ['A pest got into the leaves', "Caulis hit a bug it couldn't shake off. Your plants are untouched — they're server-side."],
  ['This leaf just gave up', "Rare, but it happens. Nothing you did — and nothing lost either."],
  ['Something went sideways', "Caulis hit an error it couldn't recover from. Your garden data is safe on the server either way."],
];

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; this.line = _CRASH_LINES[Math.floor(Math.random() * _CRASH_LINES.length)]; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Caulis crashed:', error, info); }
  resetData = () => {
    try {
      const keep = new Set(['caulis_garden_key', 'caulis_garden_pw', 'caulis_admin_secret']);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.indexOf('caulis_') === 0 && !keep.has(k)) localStorage.removeItem(k);
      }
    } catch (e) {}
    location.reload();
  };
  render() {
    if (!this.state.error) return this.props.children;
    const t = _crashTheme();
    const [title, body] = this.line;
    return (
      <div style={{ position:'fixed', inset:0, background:t.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:32, fontFamily:'"DM Sans",sans-serif' }}>
        <div style={{ maxWidth:340, textAlign:'center' }}>
          <svg width="34" height="34" viewBox="0 0 24 24" style={{ margin:'0 auto 14px', display:'block', opacity:0.7 }}><path d="M12 3C7.6 6.4 5 10.6 5 14.4 5 18.6 8 21 12 21s7-2.4 7-6.6C19 10.6 16.4 6.4 12 3Z" fill={t.forest} transform="rotate(12 12 12)"/></svg>
          <div style={{ fontFamily:'"Cormorant Garamond",serif', fontStyle:'italic', fontWeight:600, fontSize:26, color:t.forest, marginBottom:12 }}>{title}</div>
          <div style={{ fontSize:13.5, color:t.ink, opacity:0.75, lineHeight:1.6, marginBottom:20 }}>{body}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div onClick={()=>location.reload()} style={{ background:t.forest, color:t.bg, borderRadius:999, padding:'13px 26px', fontWeight:600, fontSize:14, cursor:'pointer' }}>Reload</div>
            <div onClick={this.resetData} style={{ color:t.brown, opacity:0.7, fontSize:13, cursor:'pointer', padding:8 }}>Reset local data &amp; reload</div>
          </div>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);
