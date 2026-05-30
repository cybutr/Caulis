// ════════════════════════════════════════════════════════════
//  Caulis — App router & state
// ════════════════════════════════════════════════════════════

function App() {
  const vw = useWindowWidth();
  const isDesktop = vw >= DESKTOP_BP;

  const lsGet = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} };

  const [plants, setPlants]       = useState(() => lsGet('caulis_plants', []).map(p => ({ ...p, userImage: lsGet('caulis_img_' + p.id, null) })));
  const [locations, setLocations] = useState(() => lsGet('caulis_locations', [...SEED_LOCATIONS]));
  const [tab, setTab]             = useState('garden');
  const [detail, setDetail]       = useState(null);
  const [form, setForm]           = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [menuPlant, setMenuPlant]   = useState(null);
  const [queue, setQueue]         = useState(() => lsGet('caulis_queue', []));
  const [printed, setPrinted]     = useState(false);
  const genKey = () => {
    const adj  = ['green','mossy','sunny','leafy','dewy','wild','quiet','calm','bright','soft','deep','cool'];
    const noun = ['fern','oak','sage','moss','leaf','vine','seed','root','grove','bloom','stem','bud'];
    return adj[Math.random()*adj.length|0]+'-'+noun[Math.random()*noun.length|0]+'-'+((Math.random()*90+10)|0);
  };

  const [gardenKey, setGardenKeyState] = useState(() => {
    try {
      const g = new URLSearchParams(window.location.search).get('g');
      if (g) { localStorage.setItem('caulis_garden_key', g); return g; }
      let k = localStorage.getItem('caulis_garden_key');
      if (!k) { k = genKey(); localStorage.setItem('caulis_garden_key', k); }
      return k;
    } catch(e) { return 'local-garden'; }
  });

  const switchingGardenRef = useRef(
    (() => { try { return !!new URLSearchParams(window.location.search).get('g'); } catch(e) { return false; } })()
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
  const [installPrompt, setInstallPrompt] = useState(null);
  const [pendingPlantId] = useState(() => {
    try {
      const id = parseInt(new URLSearchParams(window.location.search).get('plant'), 10);
      if (!isNaN(id)) { window.history.replaceState({}, '', window.location.pathname); return id; }
    } catch(e) {}
    return null;
  });

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const setGardenKey = (k) => {
    if (k === gardenKey) return;
    try { localStorage.setItem('caulis_garden_key', k); } catch(e) {}
    switchingGardenRef.current = true;
    setGardenKeyState(k);
    setPlants([]);
    setLocations([...SEED_LOCATIONS]);
    setQueue([]);
  };

  const renameGardenKey = async (newKey) => {
    const data = { plants, locations, queue };
    const ok = await renameGarden(gardenKey, newKey, data);
    if (ok) {
      try { localStorage.setItem('caulis_garden_key', newKey); } catch(e) {}
      setGardenKeyState(newKey);
    }
    return ok;
  };

  // ── Persist to localStorage ──
  useEffect(() => {
    lsSet('caulis_plants', plants.map(({ userImage, ...rest }) => rest));
    plants.forEach(p => {
      try {
        if (p.userImage) localStorage.setItem('caulis_img_' + p.id, p.userImage);
        else localStorage.removeItem('caulis_img_' + p.id);
      } catch(e) {}
    });
  }, [plants]);
  useEffect(() => { lsSet('caulis_locations', locations); }, [locations]);
  useEffect(() => { lsSet('caulis_queue', queue); }, [queue]);

  // ── Open plant from URL param once data loads ──
  useEffect(() => {
    if (!pendingPlantId || !plants.length) return;
    if (plants.find(p => p.id === pendingPlantId)) openDetail(pendingPlantId, true);
  }, [plants]);

  // ── Firebase sync: listen for remote changes ──
  useEffect(() => {
    if (!gardenKey) return;
    const toArr = v => v ? (Array.isArray(v) ? v : Object.values(v)) : [];
    const unsubscribe = listenGarden(gardenKey, (data) => {
      fromRemoteRef.current = true;
      if (data.plants) {
        const incoming = toArr(data.plants).filter(Boolean);
        if (incoming.length) setPlants(prev => incoming.map(p => {
          const local = prev.find(lp => lp.id === p.id);
          return { ...p, userImage: local ? local.userImage : null };
        }));
      }
      if (data.locations) { const a = toArr(data.locations).filter(Boolean); if (a.length) setLocations(a); }
      if (data.queue)     setQueue(toArr(data.queue).filter(Boolean));
    });
    return unsubscribe;
  }, [gardenKey]);

  // ── Firebase sync: push local changes ──
  useEffect(() => {
    if (!gardenKey) return;
    if (fromRemoteRef.current) { fromRemoteRef.current = false; return; }
    if (switchingGardenRef.current) { switchingGardenRef.current = false; return; }
    const timer = setTimeout(() => {
      pushGarden(gardenKey, { plants, locations, queue });
    }, 800);
    return () => clearTimeout(timer);
  }, [plants, locations, queue, gardenKey]);

  const tintFor = (id) => TINTS[(id - 1) % TINTS.length];

  // ── actions ──
  const openDetail = (id, fromScan = false) => setDetail({ id, fromScan });
  const closeDetail = () => setDetail(null);

  const water = (id) => setPlants(ps => ps.map(p => p.id === id ? { ...p, days: 0 } : p));
  const undoWater = (id, prevDays) => setPlants(ps => ps.map(p => p.id === id ? { ...p, days: prevDays } : p));

  const toggleQueue = (id) => { setQueue(q => q.includes(id) ? q.filter(x => x !== id) : [...q, id]); setPrinted(false); };
  const removeQueue = (id) => setQueue(q => q.filter(x => x !== id));
  const printAll = () => {
    const items = queue.map(id => plants.find(p => p.id === id)).filter(Boolean);
    if (!items.length) return;
    const labels = items.map(p => `
      <div class="wrap">
        <div class="label">
          <div class="mark tl"></div><div class="mark tr"></div>
          <div class="mark bl"></div><div class="mark br"></div>
          <img src="${qrUrl(PLANT_QR_URL(p.id), 220)}" alt=""/>
          <div class="name">${p.name}</div>
          <div class="latin">${p.latin}</div>
          <div class="brand">Caulis</div>
        </div>
      </div>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Caulis labels</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,600&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.labels{display:flex;flex-wrap:wrap;padding:8mm;gap:0}
.wrap{width:48mm;height:48mm;display:flex;align-items:center;justify-content:center;break-inside:avoid}
.label{width:40mm;height:40mm;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;border:0.6px solid #2D5016;border-radius:2.5mm;padding:1.5mm;background:#FAFAF7}
.mark{position:absolute;width:3.5mm;height:3.5mm}
.mark::before,.mark::after{content:'';position:absolute;background:#999}
.mark::before{width:100%;height:0.3px;top:0;left:0}
.mark::after{width:0.3px;height:100%;top:0;left:0}
.tl{top:-3mm;left:-3mm}.tr{top:-3mm;right:-3mm;transform:scaleX(-1)}.bl{bottom:-3mm;left:-3mm;transform:scaleY(-1)}.br{bottom:-3mm;right:-3mm;transform:scale(-1)}
.label img{width:26mm;height:26mm;display:block}
.name{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:7pt;color:#2D5016;margin-top:0.8mm;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:36mm}
.latin{font-family:'DM Sans',sans-serif;font-size:4pt;color:#6B4C2A;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:36mm;margin-top:0.4mm;font-style:italic}
.brand{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:4pt;color:#2D5016;opacity:0.45;margin-top:0.6mm}
@media print{body{margin:0}.labels{padding:6mm}}
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

  const addLocation = (v) => setLocations(ls => ls.includes(v) ? ls : [...ls, v]);

  const removePlant = (id) => { setPlants(ps => ps.filter(p => p.id !== id)); setQueue(q => q.filter(x => x !== id)); };
  const movePlant   = (id, room) => { addLocation(room); setPlants(ps => ps.map(p => p.id === id ? { ...p, location: room } : p)); };

  const savePlant = (data) => {
    if (data.id) {
      setPlants(ps => ps.map(p => {
        if (p.id !== data.id) return p;
        const next = { ...p, name: data.name, latin: data.latin, location: data.location };
        if (data.species) {
          const care = speciesCare(data.species);
          Object.assign(next, { every:care.every, light:care.light, care:care.care, fact:care.fact, watering:care.watering, benchmark:care.benchmark, sunlight:care.sunlight, species_id:care.species_id });
        }
        next.userImage = data.userImage || null;
        next.image = data.presetImage != null ? data.presetImage : p.image;
        return next;
      }));
    } else {
      const id = Math.max(0, ...plants.map(p => p.id)) + 1;
      const sp = data.species;
      const care = sp ? speciesCare(sp) : { every:7, light:'Bright, indirect', care:'Water when the top of the soil feels dry.', fact:'Freshly added — identify it to enrich its care notes.', watering:'Average', benchmark:'7 days', sunlight:[], image:null, species_id:null };
      setPlants(ps => [...ps, {
        id, name: data.name, latin: data.latin, location: data.location, days: 0,
        every:care.every, light:care.light, care:care.care, fact:care.fact,
        watering:care.watering, benchmark:care.benchmark, sunlight:care.sunlight,
        species_id:care.species_id,
        image: data.presetImage != null ? data.presetImage : care.image,
        userImage: data.userImage || null,
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
    />
  );

  const formEl = form && (
    <AddPlant
      key={form.mode === 'edit' ? 'edit-'+form.plant.id : 'add'}
      locations={locations} editing={form.mode === 'edit' ? form.plant : null}
      onBack={()=>setForm(null)} onSave={savePlant} onAddLocation={addLocation}
      isDesktop={isDesktop}/>
  );

  // ── active screen ──
  const screenProps = { isDesktop };
  let screen = null;
  if (tab === 'garden')   screen = <GardenScreen plants={plants} onOpen={id=>openDetail(id)} onAdd={()=>setForm({mode:'add'})} onLongPress={p=>setMenuPlant(p)} {...screenProps}/>;
  if (tab === 'needs')    screen = <NeedsWaterScreen plants={plants} onOpen={id=>openDetail(id)} onLongPress={p=>setMenuPlant(p)} {...screenProps}/>;
  if (tab === 'scanner')  screen = <ScannerScreen plants={plants} onScan={id=>openDetail(id, true)} {...screenProps}/>;
  if (tab === 'print')    screen = <PrintQueueScreen queue={queue} plants={plants} onOpen={id=>openDetail(id)} onRemove={removeQueue} onPrintAll={printAll} printed={printed} {...screenProps}/>;
  if (tab === 'settings') screen = <SettingsScreen plants={plants} gardenKey={gardenKey} onSetGardenKey={setGardenKey} onRenameGardenKey={renameGardenKey} installPrompt={installPrompt} onInstall={()=>{ if(installPrompt){ installPrompt.prompt(); installPrompt.userChoice.then(()=>setInstallPrompt(null)); } }} darkMode={darkMode} onToggleDark={()=>setDarkMode(!darkMode)} {...screenProps}/>;

  // ════════════════════════════════════════
  //  DESKTOP LAYOUT
  // ════════════════════════════════════════
  if (isDesktop) {
    return (
      <div style={{ display:'flex', minHeight:'100vh', background:C.bg }}>
        <DesktopSidebar tab={tab} setTab={setTab}/>
        <div style={{ flex:1, height:'100vh', overflowY:'auto', position:'relative' }}>
          {screen}
        </div>

        {detailPlant && (
          <DesktopModal onClose={closeDetail} maxWidth={520}>
            {detailEl}
          </DesktopModal>
        )}
        {form && (
          <DesktopModal onClose={()=>setForm(null)} maxWidth={480}>
            {formEl}
          </DesktopModal>
        )}
        {moving && (
          <MoveSheet plant={moving} locations={locations} onClose={()=>setMoveTarget(null)} onPick={movePlant} onAddLocation={addLocation} isDesktop/>
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
      </div>
    );
  }

  // ════════════════════════════════════════
  //  MOBILE LAYOUT
  // ════════════════════════════════════════
  return (
    <div style={{ position:'fixed', inset:0, display:'flex', flexDirection:'column', background:C.bg, overflow:'hidden' }}>
      <div style={{ flex:1, overflowY:'auto', position:'relative', WebkitOverflowScrolling:'touch' }}>
        {screen}
      </div>
      <BottomNav tab={tab} setTab={setTab}/>

      {detailPlant && detailEl}
      {form && formEl}
      {moving && (
        <MoveSheet plant={moving} locations={locations} onClose={()=>setMoveTarget(null)} onPick={movePlant} onAddLocation={addLocation}/>
      )}
      {menuPlant && (
        <ContextMenu
          plant={menuPlant} onClose={()=>setMenuPlant(null)}
          onEdit={p=>setForm({mode:'edit', plant:p})}
          onMove={p=>setMoveTarget(p)}
          onRemove={removePlant}/>
      )}
      {plantNotFound && <PlantNotFoundScreen onBack={()=>{ setPlantNotFound(false); setTab('garden'); }}/>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
