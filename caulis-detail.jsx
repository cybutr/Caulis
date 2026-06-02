// ════════════════════════════════════════════════════════════
//  Caulis — Plant detail + Add/Edit (overlays)
// ════════════════════════════════════════════════════════════

// ── info tile ─────────────────────────────────────────────
function InfoTile({ icon, label, children, accent = C.forest }) {
  return (
    <div style={{ background:C.panel, borderRadius:18, border:C.hair, padding:'14px 15px', boxShadow:'0 1px 2px rgba(43,42,38,0.03)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
        <div style={{ width:24, height:24, borderRadius:7, background:'rgba(122,158,78,0.13)', display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</div>
        <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:accent, letterSpacing:0.5, textTransform:'uppercase', whiteSpace:'nowrap' }}>{label}</span>
      </div>
      <div style={{ fontFamily:FONT_SANS, fontSize:13, lineHeight:1.5, color:C.ink, opacity:0.82 }}>{children}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  PLANT DETAIL
// ════════════════════════════════════════════════════════════
function PlantDetail({ plant, tint, fromScan, inQueue, onBack, onWater, onUndoWater, onToggleQueue, onGoQueue, onEdit, isDesktop, readonly = false, czechMode = false }) {
  const [justWatered, setJustWatered] = useState(false);
  const prevRef = useRef(null);
  const status = statusOf(plant.days, plant.every);

  const water = () => {
    prevRef.current = { days: plant.days };
    onWater(plant.id);
    setJustWatered(true);
  };
  const undo = () => {
    if (prevRef.current) onUndoWater(plant.id, prevRef.current.days);
    setJustWatered(false);
  };

  return (
    <div style={{ position: isDesktop ? 'absolute' : 'fixed', inset:0, zIndex:40, background:C.bg, display:'flex', flexDirection:'column', animation:'slideUp 320ms cubic-bezier(.2,.8,.2,1)' }}>
      {/* scrollable body */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', position:'relative' }}>
        <Sprig opacity={0.12}/>
        {/* top bar */}
        <div style={{ position:'sticky', top:0, zIndex:5, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'52px 18px 10px', background:`linear-gradient(180deg, ${C.bg}F5 60%, ${C.bg}00)` }}>
          <div onClick={onBack} style={{ cursor:'pointer', width:38, height:38, borderRadius:999, background:C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <IconBack/>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {fromScan && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, background: readonly ? 'rgba(107,76,42,0.12)' : 'rgba(122,158,78,0.14)', borderRadius:999, padding:'6px 12px' }}>
                <IconScan s={14} c={readonly ? C.brown : C.forest}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, color: readonly ? C.brown : C.forest }}>{readonly ? 'Guest view' : 'Scanned'}</span>
              </div>
            )}
            {!readonly && (
              <div onClick={()=>onEdit(plant)} style={{ cursor:'pointer', width:38, height:38, borderRadius:999, background:C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M13 3.5l3.5 3.5L7 16.5H3.5V13L13 3.5Z" stroke={C.forest} strokeWidth="1.6" strokeLinejoin="round"/></svg>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding:'0 18px', position:'relative', zIndex:2 }}>
          {/* hero */}
          <Specimen tint={tint} height={196} radius={22} leafSize={84} caption="plant photo" image={plant.userImage || plant.image}/>

          {/* name block */}
          <div style={{ marginTop:16 }}>
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:34, color:C.forest, lineHeight:1.05 }}>{czechMode && plant.czech ? plant.czech : plant.name}</div>
            {czechMode && plant.czech && (
              <div style={{ fontFamily:FONT_SANS, fontWeight:500, fontSize:14, color:C.ink, opacity:0.6, marginTop:3 }}>{plant.name}</div>
            )}
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:500, fontSize:16, color:C.brown, opacity:0.75, marginTop:2 }}>{plant.latin}</div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, flexWrap:'wrap' }}>
              <LocationPill label={plant.location}/>
              <StatusTag status={justWatered ? 'ok' : status}/>
              <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.5 }}>{agoLabel(plant.days)}</span>
            </div>
          </div>

          {/* water button */}
          {readonly ? (
            <div style={{ marginTop:18, height:52, borderRadius:16, background:'rgba(45,80,22,0.06)', border:'0.5px solid rgba(45,80,22,0.12)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <LeafOutline size={16} color={C.brown} sw={1.5}/>
              <span style={{ fontFamily:FONT_SANS, fontSize:14, color:C.brown, opacity:0.7 }}>View only — not your garden</span>
            </div>
          ) : (
            <div onClick={!justWatered ? water : undefined} style={{
              marginTop:18, cursor: justWatered?'default':'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:9,
              height:52, borderRadius:16,
              background: justWatered ? 'rgba(110,154,62,0.14)' : C.forest,
              color: justWatered ? C.sage : '#fff',
              boxShadow: justWatered ? 'none' : '0 6px 16px rgba(45,80,22,0.24)',
              transition:'all 260ms cubic-bezier(.2,.8,.2,1)',
              border: justWatered ? '1px solid rgba(110,154,62,0.4)' : 'none',
            }}>
              {justWatered ? <IconCheck s={19} c={C.sage}/> : <IconDrop s={20} c="#fff" fill/>}
              <span style={{ fontFamily:FONT_SANS, fontSize:15, fontWeight:600, letterSpacing:0.2 }}>{justWatered ? 'Watered today' : 'Mark as watered'}</span>
            </div>
          )}

          {/* info tiles */}
          <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:18 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <InfoTile icon={<svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" fill={C.sage}/><path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6" stroke={C.sage} strokeWidth="1.8" strokeLinecap="round"/></svg>} label="Light">{plant.light || '—'}</InfoTile>
              <InfoTile icon={<IconDrop s={14} c={C.sage}/>} label="Watering">
                <span style={{ fontWeight:600 }}>{plant.watering || 'Average'}</span>
                <span style={{ opacity:0.6 }}> · every {plant.benchmark || plant.every + ' days'}</span>
              </InfoTile>
            </div>
            <InfoTile icon={<LeafOutline size={14} color={C.sage} sw={1.7}/>} label="Care">{plant.care}</InfoTile>
            <InfoTile icon={<span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:700, fontSize:14, color:C.sage }}>i</span>} label="Fun fact">{plant.fact}</InfoTile>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'2px 4px' }}>
              <LeafOutline size={11} color={C.brown} sw={1.5}/>
              <span style={{ fontFamily:FONT_SANS, fontSize:10.5, color:C.brown, opacity:0.55, letterSpacing:0.2 }}>Care data &amp; photo via Perenual, House Plants &amp; Wikipedia</span>
            </div>
          </div>

          {/* QR block */}
          {!readonly && <div style={{ marginTop:18, marginBottom:24, background:C.panel, borderRadius:20, border:C.hair, padding:'20px', boxShadow:'0 1px 2px rgba(43,42,38,0.03)', display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.6, textTransform:'uppercase' }}>Plant tag</div>
            <div style={{ width:148, height:148, marginTop:14, padding:10, background:C.bg, borderRadius:14, border:C.hair }}>
              <img src={qrUrl(PLANT_QR_URL(plant.id), 220)} alt="QR code" style={{ width:'100%', height:'100%', display:'block' }}/>
            </div>
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:15, color:C.forest, marginTop:12 }}>Scan to open {czechMode && plant.czech ? plant.czech : plant.name}</div>
            <div onClick={()=>onToggleQueue(plant.id)} style={{
              marginTop:16, cursor:'pointer', width:'100%',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8, height:48, borderRadius:14,
              background: inQueue ? 'rgba(122,158,78,0.14)' : 'rgba(45,80,22,0.06)',
              border: inQueue ? '1px solid rgba(110,154,62,0.4)' : '0.5px solid rgba(45,80,22,0.12)',
              color: inQueue ? C.sage : C.forest, transition:'all 200ms ease',
            }}>
              {inQueue ? <IconCheck s={17} c={C.sage}/> : <IconPrint s={18} c={C.forest}/>}
              <span style={{ fontFamily:FONT_SANS, fontSize:14, fontWeight:600 }}>{inQueue ? 'In print queue' : 'Add to print queue'}</span>
            </div>
            {inQueue && (
              <div onClick={onGoQueue} style={{ cursor:'pointer', marginTop:10, fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.brown, opacity:0.8, textDecoration:'underline', textUnderlineOffset:3 }}>View print queue →</div>
            )}
          </div>}
          {readonly && <div style={{ marginBottom:24 }}/>}
        </div>
      </div>

      {/* floating Undo pill */}
      {justWatered && (
        <div style={{ position:'absolute', bottom:24, left:0, right:0, display:'flex', justifyContent:'center', zIndex:40, animation:'popUp 280ms cubic-bezier(.2,.9,.3,1.2)', pointerEvents:'none' }}>
          <div style={{ pointerEvents:'auto', display:'inline-flex', alignItems:'center', gap:12, background:C.ink, borderRadius:999, padding:'10px 12px 10px 18px', boxShadow:'0 10px 26px rgba(0,0,0,0.28)' }}>
            <span style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:500, color:'#fff' }}>{plant.name} watered</span>
            <div onClick={undo} style={{ cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.16)', borderRadius:999, padding:'6px 13px' }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5 3 2 6l3 3M2 6h6.5a3.5 3.5 0 010 7H6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600, color:'#fff' }}>Undo</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  ADD / EDIT PLANT
// ════════════════════════════════════════════════════════════
function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.7, letterSpacing:0.5, textTransform:'uppercase', marginBottom:7 }}>{label}</div>
      {children}
    </div>
  );
}
const inputStyle = () => ({
  width:'100%', boxSizing:'border-box', height:48, borderRadius:14, border:C.hair,
  background:C.input, padding:'0 15px', fontFamily:FONT_SANS, fontSize:15, color:C.ink, outline:'none',
});

// the plant identifier returns a Perenual species record (see caulis-perenual.jsx)
function CameraIcon({ s = 20, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{display:'block', marginTop:1, marginLeft:3}}>
    <path d="M3.5 8.5A2 2 0 015.5 6.5h1.2l1-1.6a1.5 1.5 0 011.3-.7h4a1.5 1.5 0 011.3.7l1 1.6h1.2a2 2 0 012 2v8a2 2 0 01-2 2h-13a2 2 0 01-2-2v-8Z" stroke={c} strokeWidth="1.6"/>
    <circle cx="12" cy="12.5" r="3.3" stroke={c} strokeWidth="1.6"/>
  </svg>);
}
function SparkIcon({ s = 20, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3Z" fill={c}/>
    <path d="M18.5 14l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1Z" fill={c} opacity="0.6"/>
  </svg>);
}

function AddPlant({ locations, editing, onBack, onSave, onAddLocation, isDesktop, czechMode }) {
  const [name, setName] = useState(editing ? editing.name : '');
  const [czech, setCzech] = useState(editing ? (editing.czech || '') : '');
  const [latin, setLatin] = useState(editing && editing.latin !== '\u2014' ? editing.latin : '');
  const [loc, setLoc] = useState(editing ? editing.location : '');
  const [typed, setTyped] = useState('');
  const [sheet, setSheet] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const [identified, setIdentified] = useState(false);
  const [source, setSource] = useState('');
  const [species, setSpecies] = useState(null);
  const [presetImage, setPresetImage] = useState(editing ? editing.image : null);
  const [userPhoto, setUserPhoto] = useState(editing ? editing.userImage : null);
  const [every, setEvery] = useState(editing ? editing.every : 7);
  const [light, setLight] = useState(editing ? editing.light || '' : '');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSpecies, setLoadingSpecies] = useState(false);
  const fileRef = useRef(null);
  const photoModeRef = useRef('photo');

  const fmtName = n => n.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const onNameChange = (val) => {
    setName(val);
    setSuggestions(searchLocalPlants(val));
  };

  const pickSuggestion = async (p) => {
    setSuggestions([]);
    setName(fmtName(p.name));
    setLatin(p.latin);
    if (p.czech) setCzech(p.czech);
    if (!hasApiKey()) return;
    setLoadingSpecies(true);
    try {
      const sp = await getSpeciesDetails(p.id, p.latin);
      if (sp) {
        const care = speciesCare(sp);
        setSpecies(sp);
        setPresetImage(care.image);
        setEvery(care.every);
        setLight(care.light || '');
        if (care.czech) setCzech(care.czech);
        setSource(sp._source || 'Perenual');
        setIdentified(true);
      }
    } finally {
      setLoadingSpecies(false);
    }
  };

  const displayImage = userPhoto || presetImage;
  const hasPhoto = !!displayImage;

  const commitTyped = () => {
    const v = typed.trim();
    if (!v) return;
    if (!locations.some(l=>l.toLowerCase()===v.toLowerCase())) onAddLocation(v);
    setLoc(v); setTyped('');
  };
  const canSave = name.trim().length > 0;

  const processFile = async (f) => {
    window._filePickerOpen = false;
    const preview = URL.createObjectURL(f);
    setUserPhoto(preview);
    setIdentified(false);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setUserPhoto(dataUrl);
      if (photoModeRef.current === 'identify') {
        setIdentifying(true);
        const sp = await identifySpecies(dataUrl);
        const care = speciesCare(sp);
        setName(sp.common_name || '');
        setLatin(Array.isArray(sp.scientific_name) ? sp.scientific_name[0] : (sp.scientific_name || ''));
        setCzech((sp.czech_names && sp.czech_names[0]) || sp.czech || care.czech || '');
        setSpecies(sp);
        setPresetImage(care.image);
        setEvery(care.every);
        setLight(care.light || '');
        setSource(sp._source || 'PlantNet');
        setIdentifying(false);
        setIdentified(true);
      }
    };
    reader.readAsDataURL(f);
  };

  const openPicker = async (mode = 'photo') => {
    photoModeRef.current = mode;
    window._filePickerOpen = true;
    const useCamera = !isDesktop && mode !== 'gallery';
    if (!useCamera && window.showOpenFilePicker) {
      try {
        const [fh] = await window.showOpenFilePicker({ types:[{ description:'Images', accept:{'image/*':['.jpg','.jpeg','.png','.gif','.webp','.avif','.heic']} }], multiple:false });
        const file = await fh.getFile();
        await processFile(file);
      } catch(e) { window._filePickerOpen = false; }
      return;
    }
    const input = fileRef.current;
    if (!input) { window._filePickerOpen = false; return; }
    input.value = '';
    if (useCamera) input.setAttribute('capture', 'environment');
    else input.removeAttribute('capture');
    let done = false;
    const finish = (f) => { if (done) return; done = true; clearInterval(poll); clearTimeout(giveUp); processFile(f); };
    const poll = setInterval(() => { const f = input.files?.[0]; if (f) finish(f); }, 100);
    const giveUp = setTimeout(() => { done = true; clearInterval(poll); window._filePickerOpen = false; }, 60000);
    input.click();
  };

  const takePhoto    = () => { setSheet(false); openPicker('photo'); };
  const fromGallery  = () => { setSheet(false); openPicker('gallery'); };
  const identify     = () => { setSheet(false); openPicker('identify'); };
  return (
    <div style={{ position: isDesktop ? 'absolute' : 'fixed', inset:0, zIndex:45, background:C.bg, display:'flex', flexDirection:'column', animation:'slideUp 320ms cubic-bezier(.2,.8,.2,1)' }}>
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', position:'relative' }}>
        <Sprig opacity={0.1}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'52px 18px 6px', position:'relative', zIndex:2 }}>
          <div onClick={onBack} style={{ cursor:'pointer', width:38, height:38, borderRadius:999, background:C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <IconBack/>
          </div>
          <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:22, color:C.forest, whiteSpace:'nowrap' }}>{editing ? 'Edit plant' : 'New plant'}</span>
          <div style={{ width:38 }}/>
        </div>

        <div style={{ padding:'10px 18px 14px', position:'relative', zIndex:2, display:'flex', flexDirection:'column', gap:12 }}>
          {/* photo area — input lives outside conditional so it never remounts */}
          <input ref={fileRef} id="caulis-file-input" type="file" accept="image/*" style={{ display:'none' }}/>
          <div style={{ position:'relative' }}>
            {isDesktop ? (
            <div onClick={()=>{ if (identifying) return; openPicker('photo'); }} style={{ cursor: identifying ? 'default' : 'pointer' }}>
              <Specimen tint={TINTS[0]} height={120} radius={20} leafSize={60} image={displayImage}
                caption={identifying ? '' : (hasPhoto ? '' : 'click to add a photo')}/>
            </div>
            ) : (
            <div onClick={()=>{ if (identifying) return; setSheet(true); }} style={{ cursor: identifying ? 'default' : 'pointer' }}>
              <Specimen tint={TINTS[0]} height={120} radius={20} leafSize={60} image={displayImage}
                caption={identifying ? '' : (hasPhoto ? '' : 'tap to add a photo')}/>
            </div>
            )}
            {!identifying && (
              <div style={{ position:'absolute', top:12, right:12, width:36, height:36, borderRadius:999, background:C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                <CameraIcon s={19}/>
              </div>
            )}
            {identified && !identifying && (
              <div style={{ position:'absolute', bottom:12, left:12, display:'inline-flex', alignItems:'center', gap:6, background:C.forest, borderRadius:999, padding:'5px 11px', pointerEvents:'none' }}>
                <SparkIcon s={13} c="#fff"/>
                <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:'#fff' }}>{source === 'demo' ? 'Demo match' : `Identified via ${source || 'Perenual'}`}</span>
              </div>
            )}
            {userPhoto && !identifying && (
              <div style={{ position:'absolute', bottom:12, left:12, display:'inline-flex', alignItems:'center', gap:6, background:'rgba(42,42,38,0.7)', borderRadius:999, padding:'5px 11px', pointerEvents:'none' }}>
                <CameraIcon s={13} c="#fff"/>
                <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:'#fff' }}>Your photo</span>
              </div>
            )}
            {identifying && (
              <div style={{ position:'absolute', inset:0, borderRadius:20, background:'rgba(45,80,22,0.32)', backdropFilter:'blur(2px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:999, border:'3px solid rgba(255,255,255,0.35)', borderTopColor:'#fff', animation:'spin 0.9s linear infinite' }}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:'#fff', letterSpacing:0.3 }}>Identifying plant…</span>
              </div>
            )}
          </div>

          <Field label="Common name">
            <input value={name} onChange={e=>onNameChange(e.target.value)} placeholder="e.g. Monstera" style={inputStyle()}/>
            {suggestions.length > 0 && (
              <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:4 }}>
                {suggestions.map(p => (
                  <div key={p.id} onClick={()=>pickSuggestion(p)} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'10px 14px', borderRadius:12, cursor:'pointer',
                    background:C.panel, border:'0.5px solid rgba(45,80,22,0.12)',
                    transition:'background 120ms ease',
                  }}>
                    <div>
                      <div style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600, color:C.forest }}>{fmtName(p.name)}</div>
                      <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:12, color:C.brown, opacity:0.75, marginTop:1 }}>{p.latin}</div>
                    </div>
                    {hasApiKey()
                      ? <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.sage }}>Fill info</span>
                      : <span style={{ fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.5 }}>use name</span>}
                  </div>
                ))}
              </div>
            )}
            {loadingSpecies && (
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, padding:'8px 14px' }}>
                <div style={{ width:16, height:16, borderRadius:999, border:'2px solid rgba(45,80,22,0.2)', borderTopColor:C.forest, animation:'spin 0.9s linear infinite' }}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.6 }}>Loading care data…</span>
              </div>
            )}
          </Field>
          <Field label="Latin name">
            <input value={latin} onChange={e=>setLatin(e.target.value)} placeholder="e.g. Monstera deliciosa" style={{ ...inputStyle(), fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:16 }}/>
          </Field>
          <Field label="Czech name">
            <input value={czech} onChange={e=>setCzech(e.target.value)} placeholder="e.g. Monstera děravá" style={inputStyle()}/>
          </Field>

          {/* location tag input */}
          <Field label="Location">
            <div style={{ display:'flex', gap:8 }}>
              <input
                value={typed} onChange={e=>setTyped(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); commitTyped(); } }}
                placeholder={loc ? '' : 'Type a room or spot…'}
                style={{ ...inputStyle(), flex:1 }}/>
              <div onClick={commitTyped} style={{ flexShrink:0, width:48, height:48, borderRadius:14, background: typed.trim()?C.forest:'rgba(45,80,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'background 160ms' }}>
                <IconPlus s={17} c={typed.trim()?'#fff':C.forest}/>
              </div>
            </div>
            {/* selected */}
            {loc && (
              <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.5 }}>Selected:</span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:C.forest, color:'#fff', borderRadius:999, padding:'6px 12px', fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600 }}>
                  <IconPin s={12} c="#fff"/> {loc}
                  <span onClick={()=>setLoc('')} style={{ cursor:'pointer', marginLeft:2, opacity:0.8 }}>
                    <svg width="11" height="11" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </span>
                </span>
              </div>
            )}
            {/* suggestions */}
            <div style={{ marginTop:12 }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:10.5, fontWeight:600, color:C.brown, opacity:0.55, letterSpacing:0.5, textTransform:'uppercase', marginBottom:8 }}>Previously used</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {locations.map(l => {
                  const on = loc===l;
                  return (
                    <div key={l} onClick={()=>{ setLoc(l); setTyped(''); }} style={{
                      cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5,
                      borderRadius:999, padding:'7px 13px',
                      background: on ? 'rgba(122,158,78,0.16)' : C.panel,
                      border: on ? '1px solid rgba(110,154,62,0.5)' : '0.5px solid rgba(45,80,22,0.14)',
                      fontFamily:FONT_SANS, fontSize:12.5, fontWeight:500, color: on?C.forest:C.ink,
                      transition:'all 140ms ease',
                    }}>
                      <IconPin s={11} c={on?C.forest:C.brown}/> {l}
                    </div>
                  );
                })}
              </div>
            </div>
          </Field>
          <Field label="Watering">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink, opacity:0.65 }}>Every</span>
              <input type="number" min="1" max="365" value={every} onChange={e=>setEvery(Math.max(1,parseInt(e.target.value)||7))} style={{ ...inputStyle(), width:88 }}/>
              <span style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink, opacity:0.65 }}>days</span>
            </div>
          </Field>
          <Field label="Light">
            <input value={light} onChange={e=>setLight(e.target.value)} placeholder="e.g. Bright, indirect" style={inputStyle()}/>
          </Field>
        </div>
      </div>

      {/* save bar */}
      <div style={{ flexShrink:0, padding:'12px 18px 26px', borderTop:'0.5px solid rgba(45,80,22,0.1)', background:C.bg+'F2', backdropFilter:'blur(14px)' }}>
        <div onClick={canSave ? ()=>onSave({ id: editing ? editing.id : undefined, name:name.trim(), czech:czech.trim(), latin:latin.trim()||'\u2014', location:loc||'Unassigned', species, presetImage, userImage:userPhoto, every, light:light.trim() }) : undefined}
          style={{
            height:52, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            background: canSave ? C.forest : 'rgba(45,80,22,0.18)', color:'#fff',
            boxShadow: canSave ? '0 6px 16px rgba(45,80,22,0.24)' : 'none',
            cursor: canSave?'pointer':'default', transition:'all 200ms ease',
          }}>
          <LeafOutline size={18} color="#fff" sw={1.8}/>
          <span style={{ fontFamily:FONT_SANS, fontSize:15, fontWeight:600 }}>{editing ? 'Save changes' : 'Add to garden'}</span>
        </div>
      </div>

      {/* photo action sheet — mobile only */}
      {!isDesktop && sheet && (
        <div onClick={()=>setSheet(false)} style={{ position:'absolute', inset:0, zIndex:10, background:'rgba(42,42,38,0.34)', display:'flex', flexDirection:'column', justifyContent:'flex-end', animation:'fade 180ms ease' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.bg, borderTopLeftRadius:26, borderTopRightRadius:26, padding:'10px 16px 30px', animation:'slideUp 280ms cubic-bezier(.2,.8,.2,1)' }}>
            <div style={{ width:38, height:4, borderRadius:999, background:'rgba(45,80,22,0.16)', margin:'0 auto 14px' }}/>
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:20, color:C.forest, textAlign:'center', marginBottom:14 }}>Add a photo</div>
            <div onClick={takePhoto} style={{ display:'flex', alignItems:'center', gap:13, padding:'14px 14px', background:C.panel, borderRadius:16, border:C.hair, cursor:'pointer', marginBottom:10 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:'rgba(122,158,78,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}><CameraIcon s={22}/></div>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14.5, fontWeight:600, color:C.ink }}>Take photo</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.55, marginTop:1 }}>Open camera directly</div>
              </div>
            </div>
            <div onClick={fromGallery} style={{ display:'flex', alignItems:'center', gap:13, padding:'14px 14px', background:C.panel, borderRadius:16, border:C.hair, cursor:'pointer', marginBottom:10 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:'rgba(122,158,78,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke={C.forest} strokeWidth="1.6"/><circle cx="8.5" cy="8.5" r="2" stroke={C.forest} strokeWidth="1.4"/><path d="M3 15l5-5 4 4 2-2 4 4" stroke={C.forest} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/></svg>
              </div>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14.5, fontWeight:600, color:C.ink }}>Choose from library</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.55, marginTop:1 }}>Pick an existing photo</div>
              </div>
            </div>
            <div onClick={identify} style={{ display:'flex', alignItems:'center', gap:13, padding:'14px 14px', background:C.panel, borderRadius:16, border:'1px solid rgba(110,154,62,0.35)', cursor:'pointer' }}>
              <div style={{ width:42, height:42, borderRadius:12, background:'rgba(45,80,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}><SparkIcon s={22}/></div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:FONT_SANS, fontSize:14.5, fontWeight:600, color:C.forest }}>Identify plant</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.55, marginTop:1 }}>Take a photo to auto-fill name &amp; species</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { InfoTile, PlantDetail, AddPlant, Field });
