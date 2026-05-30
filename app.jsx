// ════════════════════════════════════════════════════════════
//  Caulis — App router & state
// ════════════════════════════════════════════════════════════

function App() {
  const vw = useWindowWidth();
  const isDesktop = vw >= DESKTOP_BP;

  const [plants, setPlants]       = useState([]);
  const [locations, setLocations] = useState(() => [...SEED_LOCATIONS]);
  const [tab, setTab]             = useState('garden');
  const [detail, setDetail]       = useState(null);
  const [form, setForm]           = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [menuPlant, setMenuPlant]   = useState(null);
  const [queue, setQueue]         = useState([]);
  const [printed, setPrinted]     = useState(false);
  const [gardenKey, setGardenKeyState] = useState(() => {
    try { return localStorage.getItem('caulis_garden_key') || ''; } catch(e) { return ''; }
  });

  const fromRemoteRef = useRef(false);
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
    try { localStorage.setItem('caulis_garden_key', k); } catch(e) {}
    setGardenKeyState(k);
  };

  // ── Open plant from URL param once data loads ──
  useEffect(() => {
    if (!pendingPlantId || !plants.length) return;
    if (plants.find(p => p.id === pendingPlantId)) openDetail(pendingPlantId, true);
  }, [plants]);

  // ── Firebase sync: listen for remote changes ──
  useEffect(() => {
    if (!gardenKey) return;
    const unsubscribe = listenGarden(gardenKey, (data) => {
      fromRemoteRef.current = true;
      if (Array.isArray(data.plants) && data.plants.length) setPlants(data.plants);
      if (Array.isArray(data.locations) && data.locations.length) setLocations(data.locations);
      if (Array.isArray(data.queue)) setQueue(data.queue);
    });
    return unsubscribe;
  }, [gardenKey]);

  // ── Firebase sync: push local changes ──
  useEffect(() => {
    if (!gardenKey) return;
    if (fromRemoteRef.current) { fromRemoteRef.current = false; return; }
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
  const printAll = () => { setPrinted(true); setTimeout(() => setPrinted(false), 2600); };

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
  if (tab === 'settings') screen = <SettingsScreen plants={plants} gardenKey={gardenKey} onSetGardenKey={setGardenKey} installPrompt={installPrompt} onInstall={()=>{ if(installPrompt){ installPrompt.prompt(); installPrompt.userChoice.then(()=>setInstallPrompt(null)); } }} {...screenProps}/>;

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
      </div>
    );
  }

  // ════════════════════════════════════════
  //  MOBILE LAYOUT
  // ════════════════════════════════════════
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#ECEAE3', padding:'28px 0' }}>
      <IOSDevice>
        <div style={{ position:'relative', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ flex:1, overflowY:'auto', position:'relative' }}>
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
        </div>
      </IOSDevice>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
