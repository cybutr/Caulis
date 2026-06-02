// ════════════════════════════════════════════════════════════
//  Caulis — App router & state
// ════════════════════════════════════════════════════════════

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
      const ds = d.toISOString().split('T')[0];
      const dow = d.getDay();
      const score = ((dow===0||dow===6)?2:0) - Math.abs(i)*0.5 - (tally[ds]||0)*1.5 - (i<0?0.5:0);
      if (score > bestScore) { bestScore = score; best = d; }
    }
    if (best) { const ds = best.toISOString().split('T')[0]; tally[ds]=(tally[ds]||0)+1; result[p.id]=ds; }
  }
  return result;
}

function App() {
  const vw = useWindowWidth();
  const isDesktop = vw >= DESKTOP_BP;

  const lsGet = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} };

  const [plants, setPlants]       = useState(() => lsGet('caulis_plants', []).map(p => {
    const photos = lsGet('caulis_imgs_' + p.id, null);
    const legacy = lsGet('caulis_img_' + p.id, null);
    return { ...p, photos: photos || (legacy ? [legacy] : (p.photos || [])) };
  }));
  const locations = [...new Set(plants.map(p => p.location).filter(Boolean))].sort();
  const [tab, setTab]             = useState('garden');
  const [detail, setDetail]       = useState(null);
  const [form, setForm]           = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [menuPlant, setMenuPlant]   = useState(null);
  const [undoDelete, setUndoDelete] = useState(null);
  const [queue, setQueue]         = useState(() => lsGet('caulis_queue', []));
  const [printed, setPrinted]     = useState(false);
  const [globalPrintSize, setGlobalPrintSizeRaw] = useState(() => lsGet('caulis_print_size', 40));
  const [queueSizes, setQueueSizes] = useState(() => lsGet('caulis_queue_sizes', {}));
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
    const oldNode = gardenNode;
    const newNode = await gardenNodeId(gardenKey, next);
    if (oldNode && newNode && oldNode !== newNode) {
      switchingGardenRef.current = true;
      await renameGarden(oldNode, newNode, { plants, locations, queue, perenualKey: perenualKey || null, plantIdKey: plantIdKey || null, housePlantsKey: housePlantsKey || null });
      setGardenNode(newNode);
      try { localStorage.setItem('caulis_garden_node', newNode); } catch(e) {}
    }
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
  applyTheme(darkMode);
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = darkMode ? '#111610' : '#2D5016';
  }, [darkMode]);

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
    const data = { plants, locations, queue, perenualKey: perenualKey || null, plantIdKey: plantIdKey || null, housePlantsKey: housePlantsKey || null };
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
      try { localStorage.setItem('caulis_garden_node', node); } catch(e) {}
    });
    return () => { cancelled = true; };
  }, [gardenKey, gardenPassword]);

  // ── Persist to localStorage (photos stored separately, off the main blob) ──
  useEffect(() => {
    lsSet('caulis_plants', plants.map(({ photos, userImage, ...rest }) => rest));
    plants.forEach(p => {
      try {
        if (p.photos && p.photos.length) lsSet('caulis_imgs_' + p.id, p.photos);
        else try { localStorage.removeItem('caulis_imgs_' + p.id); } catch(e) {}
        try { localStorage.removeItem('caulis_img_' + p.id); } catch(e) {} // drop legacy single
      } catch(e) {}
    });
  }, [plants]);
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
          return { ...p, photos };
        }));
      }
      if (data.queue)     setQueue(toArr(data.queue).filter(Boolean));
      if (data.perenualKey) { setApiKey(data.perenualKey); setPerenualKeyState(data.perenualKey); }
      if (data.plantIdKey) { setPlantIdKey(data.plantIdKey); setPlantIdKeyState(data.plantIdKey); }
      if (data.housePlantsKey) { setHousePlantsKey(data.housePlantsKey); setHousePlantsKeyState(data.housePlantsKey); }
    });
    return unsubscribe;
  }, [gardenNode]);

  // ── Firebase sync: push local changes ──
  useEffect(() => {
    if (!gardenNode) return;
    if (fromRemoteRef.current) { fromRemoteRef.current = false; return; }
    if (switchingGardenRef.current) { switchingGardenRef.current = false; return; }
    const timer = setTimeout(() => {
      pushGarden(gardenNode, { plants, locations, queue, perenualKey: perenualKey || null, plantIdKey: plantIdKey || null, housePlantsKey: housePlantsKey || null });
    }, 800);
    return () => clearTimeout(timer);
  }, [plants, locations, queue, gardenNode, perenualKey, plantIdKey, housePlantsKey]);

  const tintFor = (id) => TINTS[(id - 1) % TINTS.length];

  // ── actions ──
  const openDetail = (id, fromScan = false) => setDetail({ id, fromScan });
  const closeDetail = () => setDetail(null);

  const water = (id, daysAgo = 0) => {
    const d = Math.max(0, daysAgo || 0);
    setPlants(ps => ps.map(p => p.id === id ? { ...p, days: d } : p));
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
  const undoWater = (id, prevDays) => setPlants(ps => ps.map(p => p.id === id ? { ...p, days: prevDays } : p));

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
    const p = plants.find(x => x.id === id);
    setPlants(ps => ps.filter(x => x.id !== id));
    setQueue(q => q.filter(x => x !== id));
    if (p) setUndoDelete({ plant: p, queued: queue.includes(id) });
  };
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
        if (data.days != null) next.days = data.days;
        next.photos = data.photos || [];
        next.image = data.presetImage != null ? data.presetImage : p.image;
        delete next.userImage;
        return next;
      }));
    } else {
      const id = Math.max(0, ...plants.map(p => p.id)) + 1;
      const sp = data.species;
      const care = sp ? speciesCare(sp) : { every:defaultEvery, light:'Bright, indirect', care:'Water when the top of the soil feels dry.', fact:'Freshly added — identify it to enrich its care notes.', watering:'Average', benchmark:`${defaultEvery} days`, sunlight:[], image:null, species_id:null };
      setPlants(ps => [...ps, {
        id, name: data.name, czech: data.czech || '', latin: data.latin, location: data.location, days: data.days || 0,
        every: data.every || care.every, light: data.light || care.light, care: data.care || care.care, fact: data.fact || care.fact,
        watering:care.watering, benchmark: data.every ? `${data.every} days` : care.benchmark, sunlight:care.sunlight,
        species_id:care.species_id,
        image: data.presetImage != null ? data.presetImage : care.image,
        photos: data.photos || [],
      }]);
      setTab('garden');
    }
    setForm(null);
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
      isDesktop={isDesktop}
      czechMode={identifyLang === 'cs'}
    />
  );

  const formEl = form && (
    <AddPlant
      key={form.mode === 'edit' ? 'edit-'+form.plant.id : 'add'}
      locations={locations} editing={form.mode === 'edit' ? form.plant : null}
      onBack={()=>setForm(null)} onSave={savePlant} onAddLocation={()=>{}}
      isDesktop={isDesktop} czechMode={identifyLang === 'cs'}/>
  );

  const undoDeleteEl = undoDelete && (
    <div style={{ position:'fixed', bottom: isDesktop?24:86, left:0, right:0, display:'flex', justifyContent:'center', zIndex:60, animation:'popUp 280ms cubic-bezier(.2,.9,.3,1.2)', pointerEvents:'none' }}>
      <div style={{ pointerEvents:'auto', display:'inline-flex', alignItems:'center', gap:12, background:C.ink, borderRadius:999, padding:'10px 12px 10px 18px', boxShadow:'0 10px 26px rgba(0,0,0,0.28)' }}>
        <span style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:500, color:'#fff' }}>{undoDelete.plant.name} removed</span>
        <div onClick={undoRemove} style={{ cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.16)', borderRadius:999, padding:'6px 13px' }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5 3 2 6l3 3M2 6h6.5a3.5 3.5 0 010 7H6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600, color:'#fff' }}>Undo</span>
        </div>
      </div>
    </div>
  );

  // ── active screen ──
  const screenProps = { isDesktop };
  let screen = null;
  if (tab === 'garden')   screen = <GardenScreen plants={plants} onOpen={id=>openDetail(id)} onAdd={()=>setForm({mode:'add'})} onLongPress={p=>setMenuPlant(p)} czechMode={identifyLang === 'cs'} {...screenProps}/>;
  if (tab === 'needs')    screen = <NeedsWaterScreen plants={plants} onOpen={id=>openDetail(id)} onLongPress={p=>setMenuPlant(p)} czechMode={identifyLang === 'cs'} {...screenProps}/>;
  if (tab === 'scanner')  screen = <ScannerScreen plants={plants} onScan={(id, scannedGarden) => { if (scannedGarden && scannedGarden !== gardenNode) openGuestPlant(scannedGarden, id); else openDetail(id, true); }} {...screenProps}/>;
  if (tab === 'print')    screen = <PrintQueueScreen queue={queue} plants={plants} onOpen={id=>openDetail(id)} onRemove={removeQueue} onPrintAll={printAll} printed={printed} globalPrintSize={globalPrintSize} onSetGlobalSize={setGlobalPrintSize} queueSizes={queueSizes} onSetSize={setPlantSize} monochromePrint={monochromePrint} onToggleMono={toggleMono} czechMode={identifyLang === 'cs'} {...screenProps}/>;
  if (tab === 'settings') screen = <SettingsScreen plants={plants} gardenKey={gardenKey} gardenHistory={gardenHistory} onRemoveHistory={removeGardenFromHistory} onSetGardenKey={setGardenKey} onRenameGardenKey={renameGardenKey} installPrompt={installPrompt} onInstall={()=>{ if(installPrompt){ installPrompt.prompt(); installPrompt.userChoice.then(()=>setInstallPrompt(null)); } }} darkMode={darkMode} onToggleDark={()=>setDarkMode(!darkMode)} gardenPassword={gardenPassword} onSavePassword={saveGardenPassword} perenualKey={perenualKey} onSavePerenualKey={savePerenualKey} housePlantsKey={housePlantsKey} onSaveHousePlantsKey={saveHousePlantsKey} plantIdKey={plantIdKey} onSavePlantIdKey={savePlantIdKey} identifyLang={identifyLang} onSetIdentifyLang={saveIdentifyLang} defaultEvery={defaultEvery} onSetDefaultEvery={setDefaultEvery} globalPrintSize={globalPrintSize} onSetGlobalSize={setGlobalPrintSize} monochromePrint={monochromePrint} onToggleMono={toggleMono} googleClientId={googleClientId} onSaveGoogleClientId={saveGoogleClientId} googleToken={googleToken} onConnectGoogle={connectGoogle} onSyncCalendar={syncAllToCalendar} onDisconnectGoogle={disconnectGoogle} googleSyncMode={googleSyncMode} onSetGoogleSyncMode={setGoogleSyncMode} reminderTime={reminderTime} onSetReminderTime={setReminderTime} {...screenProps}/>;

  // ════════════════════════════════════════
  //  DESKTOP LAYOUT
  // ════════════════════════════════════════
  if (isDesktop) {
    return (
      <div style={{ display:'flex', minHeight:'100vh', background:C.bg }}>
        <DesktopSidebar tab={tab} setTab={setTab}/>
        <div style={{ flex:1, height:'100vh', overflowY:'auto', overflowX:'hidden', position:'relative' }}>
          {screen}
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
        {moving && (
          <MoveSheet plant={moving} locations={locations} onClose={()=>setMoveTarget(null)} onPick={movePlant} onAddLocation={()=>{}} isDesktop/>
        )}
        {menuPlant && (
          <ContextMenu
            plant={menuPlant} onClose={()=>setMenuPlant(null)}
            onEdit={p=>setForm({mode:'edit', plant:p})}
            onMove={p=>setMoveTarget(p)}
            onRemove={removePlant}
            isDesktop/>
        )}
        {plantNotFound && <PlantNotFoundScreen onBack={()=>{ setPlantNotFound(false); setTab('garden'); }}/>}
        {undoDeleteEl}
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
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', position:'relative', WebkitOverflowScrolling:'touch' }}>
        {screen}
      </div>
      <BottomNav tab={tab} setTab={setTab}/>

      {detailPlant && detailEl}
      {form && formEl}
      {moving && (
        <MoveSheet plant={moving} locations={locations} onClose={()=>setMoveTarget(null)} onPick={movePlant} onAddLocation={()=>{}}/>
      )}
      {menuPlant && (
        <ContextMenu
          plant={menuPlant} onClose={()=>setMenuPlant(null)}
          onEdit={p=>setForm({mode:'edit', plant:p})}
          onMove={p=>setMoveTarget(p)}
          onRemove={removePlant}/>
      )}
      {plantNotFound && <PlantNotFoundScreen onBack={()=>{ setPlantNotFound(false); setTab('garden'); }}/>}
      {undoDeleteEl}
      {guestView === 'loading' && <div style={{ position:'fixed', inset:0, zIndex:50, background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', animation:'fade 160ms ease' }}><div style={{ width:38, height:38, borderRadius:999, border:`3px solid rgba(45,80,22,0.2)`, borderTopColor:C.forest, animation:'spin 0.9s linear infinite' }}/></div>}
      {guestView && guestView !== 'loading' && <PlantDetail plant={guestView.plant} tint={tintFor(guestView.plant.id)} fromScan readonly inQueue={false} onBack={()=>setGuestView(null)} onWater={()=>{}} onUndoWater={()=>{}} onToggleQueue={()=>{}} onGoQueue={()=>{}} onEdit={()=>{}} isDesktop={false} czechMode={identifyLang === 'cs'}/>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
