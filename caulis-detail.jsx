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

const offsetLabel = (n) => n === 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n} days ago`;

// downscale + jpeg-compress so photos are light enough to sync to Firebase
function compressImage(dataUrl, max = 1024, q = 0.72) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
      else if (h >= w && h > max) { w = Math.round(w * max / h); h = max; }
      try {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', q));
      } catch (e) { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// photos of a plant, in display order: user photos first, then preset/wiki
function plantGallery(plant) {
  const user = plant.photos || (plant.userImage ? [plant.userImage] : []);
  const all = [...user];
  if (plant.image && !all.includes(plant.image)) all.push(plant.image);
  return all;
}
function firstPhoto(plant) {
  return (plant.photos && plant.photos[0]) || plant.userImage || plant.image || null;
}

// ── swipeable photo carousel ──────────────────────────────
function PhotoCarousel({ images, tint, height = 196, radius = 22 }) {
  const [slide, setSlide] = useState(0);
  const ref = useRef(null);
  const imgs = images.length ? images : [null];
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };
  return (
    <div style={{ position:'relative' }}>
      <div ref={ref} onScroll={onScroll} style={{ display:'flex', overflowX:'auto', overflowY:'hidden', scrollSnapType:'x mandatory', borderRadius:radius, WebkitOverflowScrolling:'touch', scrollbarWidth:'none' }}>
        {imgs.map((img, i) => (
          <div key={i} style={{ flex:'0 0 100%', scrollSnapAlign:'center' }}>
            <Specimen tint={tint} height={height} radius={radius} leafSize={84} caption="plant photo" image={img}/>
          </div>
        ))}
      </div>
      {imgs.length > 1 && (
        <div style={{ position:'absolute', bottom:10, left:0, right:0, display:'flex', justifyContent:'center', gap:6, pointerEvents:'none' }}>
          {imgs.map((_, i) => (
            <span key={i} style={{ width: i===slide?7:6, height: i===slide?7:6, borderRadius:999, background:'#fff', opacity: i===slide?1:0.5, boxShadow:'0 1px 2px rgba(0,0,0,0.3)', transition:'all 160ms' }}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  PLANT DETAIL
// ════════════════════════════════════════════════════════════
function PlantDetail({ plant, tint, fromScan, inQueue, onBack, onWater, onUndoWater, onToggleQueue, onGoQueue, onEdit, onAskDoctor, onOpenPlant, onCareCheck, plants, roomLight, isDesktop, readonly = false, czechMode = false }) {
  const [justWatered, setJustWatered] = useState(false);
  const [waterOffset, setWaterOffset] = useState(0); // days ago
  const prevRef = useRef(null);
  const status = statusOf(plant.days, plant.every, plant.snoozedUntil);
  const gallery = plantGallery(plant);

  const water = () => {
    prevRef.current = { days: plant.days };
    onWater(plant.id, waterOffset);
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
          <PhotoCarousel images={gallery} tint={tint}/>

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
            {(() => {
              if (!plants) return null;
              const parent = plant.propagatedFrom != null ? plants.find(p => p.id === plant.propagatedFrom) : null;
              const children = plants.filter(p => p.propagatedFrom === plant.id);
              if (!parent && !children.length) return null;
              return (
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
                  {parent && (
                    <span onClick={()=>onOpenPlant && onOpenPlant(parent.id)} style={{ cursor: onOpenPlant ? 'pointer' : 'default', display:'inline-flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:999, background:'rgba(107,76,42,0.08)', fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, color:C.brown }}>
                      <LeafOutline size={11} color={C.brown} sw={1.6}/> Propagated from {parent.name}
                    </span>
                  )}
                  {children.map(c => (
                    <span key={c.id} onClick={()=>onOpenPlant && onOpenPlant(c.id)} style={{ cursor: onOpenPlant ? 'pointer' : 'default', display:'inline-flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:999, background:'rgba(122,158,78,0.1)', fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, color:C.sage }}>
                      <LeafOutline size={11} color={C.sage} sw={1.6}/> Parent of {c.name}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* water button */}
          {readonly ? (
            <div style={{ marginTop:18, height:52, borderRadius:16, background:'rgba(45,80,22,0.06)', border:'0.5px solid rgba(45,80,22,0.12)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <LeafOutline size={16} color={C.brown} sw={1.5}/>
              <span style={{ fontFamily:FONT_SANS, fontSize:14, color:C.brown, opacity:0.7 }}>View only — not your garden</span>
            </div>
          ) : (<>
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
              <span style={{ fontFamily:FONT_SANS, fontSize:15, fontWeight:600, letterSpacing:0.2 }}>{justWatered ? 'Watered' + (waterOffset ? ` ${offsetLabel(waterOffset)}` : ' today') : (waterOffset ? `Mark watered ${offsetLabel(waterOffset)}` : 'Mark as watered')}</span>
            </div>
            {!justWatered && (
              <div style={{ marginTop:10, display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
                <span style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.5 }}>When?</span>
                <div onClick={()=>setWaterOffset(o=>Math.max(0, o-1))} style={{ cursor:'pointer', width:30, height:30, borderRadius:9, background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FONT_SANS, fontSize:17, fontWeight:600 }}>−</div>
                <span style={{ minWidth:78, textAlign:'center', fontFamily:FONT_SANS, fontSize:13, fontWeight:600, color:C.ink }}>{offsetLabel(waterOffset)}</span>
                <div onClick={()=>setWaterOffset(o=>Math.min(60, o+1))} style={{ cursor:'pointer', width:30, height:30, borderRadius:9, background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FONT_SANS, fontSize:17, fontWeight:600 }}>+</div>
              </div>
            )}
          </>)}

          {onAskDoctor && (
            <div onClick={()=>onAskDoctor(plant)} style={{ marginTop:10, display:'flex', alignItems:'center', justifyContent:'center', gap:8, height:46, borderRadius:16, border:`1px solid ${C.forest}`, cursor:'pointer' }}>
              <IconDoctor s={17} c={C.forest}/>
              <span style={{ fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:C.forest }}>Ask the doctor</span>
            </div>
          )}

          {!readonly && onCareCheck && careCheckDue(plant) && (
            <div style={{ marginTop:14, padding:14, borderRadius:16, background:'rgba(122,158,78,0.1)', border:'1px solid rgba(122,158,78,0.3)' }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600, color:C.forest, marginBottom:10 }}>How's {czechMode && plant.czech ? plant.czech : plant.name} doing lately?</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[
                  { id:'thriving', label:'Thriving' },
                  { id:'struggling', label:'A bit stressed' },
                  { id:'dropping', label:'Dropping leaves' },
                ].map(o => (
                  <span key={o.id} onClick={()=>onCareCheck(plant.id, o.id)} style={{ cursor:'pointer', padding:'7px 12px', borderRadius:999, background:C.panel, border:`1px solid ${C.forest}`, fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.forest }}>
                    {o.label}
                  </span>
                ))}
                <span onClick={()=>onCareCheck(plant.id, 'dismiss')} style={{ cursor:'pointer', padding:'7px 12px', fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.5 }}>
                  Not sure
                </span>
              </div>
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
            {(() => {
              const mismatch = roomLight ? roomLightMismatch(plant, roomLight) : null;
              if (!mismatch) return null;
              const msg = mismatch === 'dim'
                ? `${plant.location || 'This room'} may be too dim for this plant's light needs.`
                : `${plant.location || 'This room'} may get more direct sun than this plant likes.`;
              return (
                <InfoTile
                  icon={<svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" fill="none" stroke={STATUS.soon.dot} strokeWidth="1.7"/><path d="M12 2.5v2.5M12 19v2.5M4.5 12H2M22 12h-2.5M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" stroke={STATUS.soon.dot} strokeWidth="1.7" strokeLinecap="round"/></svg>}
                  label="Room light"
                >
                  <span style={{ color:STATUS.soon.dot, fontWeight:600 }}>{msg}</span>
                </InfoTile>
              );
            })()}
            {typeof plant.toxicToPets === 'boolean' && (
              <InfoTile
                icon={plant.toxicToPets
                  ? <svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 2 2 21h20L12 2Z" fill="none" stroke={STATUS.needs.dot} strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 9v5M12 17.2v.1" stroke={STATUS.needs.dot} strokeWidth="1.8" strokeLinecap="round"/></svg>
                  : <IconCheck s={14} c={C.sage}/>}
                label="Pet safety"
              >
                <span style={{ fontWeight:600, color: plant.toxicToPets ? STATUS.needs.dot : C.sage }}>{plant.toxicToPets ? 'Toxic to pets' : 'Safe for pets'}</span>
                <span style={{ opacity:0.6 }}> — {plant.toxicToPets ? 'keep away from cats & dogs' : 'no known toxicity to cats & dogs'}</span>
              </InfoTile>
            )}
            {plant.care && <InfoTile icon={<LeafOutline size={14} color={C.sage} sw={1.7}/>} label="Care">{plant.care}</InfoTile>}
            {plant.fact && <InfoTile icon={<span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:700, fontSize:14, color:C.sage }}>i</span>} label="Fun fact">{plant.fact}</InfoTile>}
            {(() => {
              const st = wateringStats(plant.history);
              const fmt = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d).toLocaleDateString('en-US', { month:'short', day:'numeric' }); };
              const recent = [...(plant.history || [])].slice(-6).reverse();
              return (
                <InfoTile icon={<IconDrop s={14} c={C.sage}/>} label="Watering log">
                  {st.total ? (<>
                    <div style={{ display:'flex', gap:16, marginBottom: recent.length ? 8 : 0 }}>
                      <span><span style={{ fontWeight:700, color:C.ink }}>{st.total}</span> total</span>
                      <span><span style={{ fontWeight:700, color:C.ink }}>{st.count30}</span> in 30 days</span>
                    </div>
                    {recent.length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {recent.map((s,i) => <span key={i} style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, background:'rgba(107,76,42,0.08)', borderRadius:999, padding:'3px 9px' }}>{fmt(s)}</span>)}
                      </div>
                    )}
                  </>) : <span style={{ opacity:0.6 }}>No history yet — mark this plant watered to start logging.</span>}
                </InfoTile>
              );
            })()}
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
          <div style={{ pointerEvents:'auto', display:'inline-flex', alignItems:'center', gap:12, background:C.toast, borderRadius:999, padding:'10px 12px 10px 18px', boxShadow:'0 10px 26px rgba(0,0,0,0.28)' }}>
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

function AddPlant({ locations, plants, editing, onBack, onSave, onAddLocation, isDesktop, czechMode }) {
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
  const [photos, setPhotos] = useState(editing ? (editing.photos || (editing.userImage ? [editing.userImage] : [])) : []);
  const [every, setEvery] = useState(editing ? editing.every : 7);
  const [toxicToPets, setToxicToPets] = useState(editing && typeof editing.toxicToPets === 'boolean' ? editing.toxicToPets : null);
  const [light, setLight] = useState(editing ? editing.light || '' : '');
  const [care, setCare] = useState(editing ? editing.care || '' : '');
  const [fact, setFact] = useState(editing ? editing.fact || '' : '');
  const [lastWatered, setLastWatered] = useState(editing ? (editing.days || 0) : 0);
  const [propagatedFrom, setPropagatedFrom] = useState(editing ? (editing.propagatedFrom || null) : null);
  // a plant can't be propagated from one of its own descendants — walk each
  // candidate's chain back and exclude it if it ever reaches this plant
  const propagationOptions = (plants || []).filter(p => {
    if (!editing || p.id !== editing.id) {
      let cur = p, hops = 0;
      while (cur && cur.propagatedFrom != null && hops < 50) {
        if (editing && cur.propagatedFrom === editing.id) return false;
        cur = (plants || []).find(x => x.id === cur.propagatedFrom);
        hops++;
      }
      return true;
    }
    return false;
  });
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSpecies, setLoadingSpecies] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [rechecking, setRechecking] = useState(false);
  const [refreshingSpecies, setRefreshingSpecies] = useState(false);
  const fileRef = useRef(null);
  const photoModeRef = useRef('photo');

  // fill the form from a resolved species record
  const applyIdentified = (sp) => {
    const c = speciesCare(sp);
    setName(sp.common_name || '');
    setLatin(Array.isArray(sp.scientific_name) ? sp.scientific_name[0] : (sp.scientific_name || ''));
    setCzech((sp.czech_names && sp.czech_names[0]) || sp.czech || c.czech || '');
    setSpecies(sp);
    setPresetImage(c.image);
    setEvery(c.every);
    setLight(c.light || '');
    setCare(c.care || '');
    setFact(c.fact || '');
    setToxicToPets(c.toxicToPets);
    setSource((sp._source || 'PlantNet') + (sp._score ? ` · ${Math.round(sp._score * 100)}%` : ''));
    setIdentified(true);
  };
  const chooseCandidate = async (cand) => {
    setCandidates([]);
    setIdentifying(true);
    const full = await resolveSpecies(cand.scientificName, cand.commonName || cand.scientificName, cand.score);
    setIdentifying(false);
    applyIdentified(full);
  };

  const runAiRecheck = async () => {
    if (rechecking || !latin) return;
    setRechecking(true);
    try {
      const record = species ? { ...species } : {
        scientific_name: latin,
        common_name: name,
        czech: czech,
        _care: care,
        _fact: fact
      };
      const aiRecord = await aiReviewCare(record);
      if (!aiRecord) return;
      const c = speciesCare(aiRecord);
      setEvery(c.every);
      if (c.light) setLight(c.light);
      if (c.care) setCare(c.care);
      if (c.fact) setFact(c.fact);
      if (c.czech && !czech) setCzech(c.czech);
      if (toxicToPets == null && c.toxicToPets != null) setToxicToPets(c.toxicToPets);
      setSource((source || 'Manual') + ' · AI Reviewed');
      if (aiRecord.common_name && !name) setName(aiRecord.common_name);
    } catch(e) {
      console.error(e);
    } finally {
      setRechecking(false);
    }
  };

  // pulls the latest bundled/Perenual data for this plant's already-linked
  // species — for anyone without an Anthropic key, or whenever the species
  // library improves after a plant was first added. Only touches
  // species-derived fields; never overwrites the user's own photos.
  const refreshFromSpecies = async () => {
    if (refreshingSpecies || !editing || !editing.species_id) return;
    setRefreshingSpecies(true);
    try {
      const sp = await getSpeciesDetails(editing.species_id, latin);
      if (!sp) return;
      const c = speciesCare(sp);
      setSpecies(sp);
      setEvery(c.every);
      if (c.light) setLight(c.light);
      if (c.care) setCare(c.care);
      if (c.fact) setFact(c.fact);
      if (c.toxicToPets != null) setToxicToPets(c.toxicToPets);
      setSource((sp._source || source || 'Perenual') + ' · Refreshed');
    } catch(e) {
      console.error(e);
    } finally {
      setRefreshingSpecies(false);
    }
  };

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
    if (!hasApiKey() && !p.isLibrary) return;
    setLoadingSpecies(true);
    try {
      const sp = await getSpeciesDetails(p.id, p.latin);
      if (sp) {
        const care = speciesCare(sp);
        setSpecies(sp);
        setPresetImage(care.image);
        setEvery(care.every);
        setLight(care.light || '');
        setCare(care.care || '');
        setFact(care.fact || '');
        setToxicToPets(care.toxicToPets);
        if (care.czech) setCzech(care.czech);
        setSource(sp._source || 'Perenual');
        setIdentified(true);
      }
    } finally {
      setLoadingSpecies(false);
    }
  };

  const formGallery = [...photos, ...(presetImage && !photos.includes(presetImage) ? [presetImage] : [])];
  const hasPhoto = formGallery.length > 0;

  const commitTyped = () => {
    const v = typed.trim();
    if (!v) return;
    if (!locations.some(l=>l.toLowerCase()===v.toLowerCase())) onAddLocation(v);
    setLoc(v); setTyped('');
  };
  const canSave = name.trim().length > 0;

  const processFile = async (f) => {
    window._filePickerOpen = false;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = await compressImage(ev.target.result);
      setPhotos(prev => [...prev, dataUrl]); // keep the user's shot; never replaced
      if (photoModeRef.current === 'identify') {
        setIdentified(false);
        setCandidates([]);
        setIdentifying(true);
        const sp = await identifySpecies(dataUrl);
        setIdentifying(false);
        if (!sp) { setSource('failed'); return; }
        if (sp.candidates) { setCandidates(sp.candidates); return; } // uncertain — let user pick
        applyIdentified(sp);
      }
    };
    reader.readAsDataURL(f);
  };
  const removePhoto = (i) => setPhotos(prev => prev.filter((_, idx) => idx !== i));

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
          {(() => { const addPhoto = () => { if (identifying) return; isDesktop ? openPicker('photo') : setSheet(true); }; return (<>
          <div style={{ position:'relative' }}>
            {hasPhoto ? (
              <PhotoCarousel images={formGallery} tint={TINTS[0]} height={120} radius={20}/>
            ) : (
              <div onClick={addPhoto} style={{ cursor: identifying ? 'default' : 'pointer' }}>
                <Specimen tint={TINTS[0]} height={120} radius={20} leafSize={60} image={null}
                  caption={identifying ? '' : (isDesktop ? 'click to add a photo' : 'tap to add a photo')}/>
              </div>
            )}
            {!identifying && (
              <div onClick={addPhoto} style={{ position:'absolute', top:12, right:12, width:36, height:36, borderRadius:999, background:C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <CameraIcon s={19}/>
              </div>
            )}
            {identified && !identifying && (
              <div style={{ position:'absolute', top:12, left:12, display:'inline-flex', alignItems:'center', gap:6, background:C.forest, borderRadius:999, padding:'5px 11px', pointerEvents:'none' }}>
                <SparkIcon s={13} c="#fff"/>
                <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:'#fff' }}>{source === 'demo' ? 'Demo match' : `Identified via ${source || 'Perenual'}`}</span>
              </div>
            )}
            {source === 'failed' && !identifying && (
              <div style={{ position:'absolute', top:12, left:12, display:'inline-flex', alignItems:'center', gap:6, background:'#B4472E', borderRadius:999, padding:'5px 11px', pointerEvents:'none' }}>
                <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:'#fff' }}>Couldn't identify</span>
              </div>
            )}
            {identifying && (
              <div style={{ position:'absolute', inset:0, borderRadius:20, background:'rgba(45,80,22,0.32)', backdropFilter:'blur(2px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:999, border:'3px solid rgba(255,255,255,0.35)', borderTopColor:'#fff', animation:'spin 0.9s linear infinite' }}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:'#fff', letterSpacing:0.3 }}>Identifying plant…</span>
              </div>
            )}
          </div>
          {/* thumbnail strip — your photos, removable */}
          {photos.length > 0 && (
            <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:2 }}>
              {photos.map((img, i) => (
                <div key={i} onClick={()=> i!==0 && setPhotos(prev => [prev[i], ...prev.filter((_,idx)=>idx!==i)])} style={{ position:'relative', flexShrink:0, cursor: i!==0 ? 'pointer' : 'default' }}>
                  <img src={img} alt="" style={{ width:54, height:54, borderRadius:11, objectFit:'cover', border: i===0 ? `2px solid ${C.forest}` : C.hair }}/>
                  {i===0 && <span style={{ position:'absolute', bottom:3, left:3, fontFamily:FONT_SANS, fontSize:8, fontWeight:700, color:'#fff', background:'rgba(45,80,22,0.85)', borderRadius:5, padding:'1px 5px', letterSpacing:0.3 }}>COVER</span>}
                  <div onClick={(e)=>{ e.stopPropagation(); removePhoto(i); }} style={{ position:'absolute', top:-5, right:-5, width:20, height:20, borderRadius:999, background:C.toast, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}>
                    <svg width="9" height="9" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  </div>
                </div>
              ))}
              <div onClick={addPhoto} style={{ flexShrink:0, width:54, height:54, borderRadius:11, border:'1.5px dashed rgba(45,80,22,0.3)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <IconPlus s={18} c={C.forest}/>
              </div>
            </div>
          )}
          </>); })()}

          {candidates.length > 0 && (
            <div style={{ background:C.panel, borderRadius:16, border:'1px solid rgba(110,154,62,0.35)', padding:'12px 14px' }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.forest, marginBottom:8 }}>Not sure — pick the closest:</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {candidates.map((c, i) => (
                  <div key={i} onClick={()=>chooseCandidate(c)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'10px 12px', borderRadius:12, background:C.bg, border:'0.5px solid rgba(45,80,22,0.12)', cursor:'pointer' }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.commonName || c.scientificName}</div>
                      <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:12, color:C.brown, opacity:0.75 }}>{c.scientificName}</div>
                    </div>
                    <span style={{ flexShrink:0, fontFamily:FONT_SANS, fontSize:11, fontWeight:700, color:C.sage }}>{Math.round(c.score*100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              <input type="number" min="1" max="365" value={every}
                onChange={e=>{ const v=e.target.value; if(v==='') return setEvery(''); const n=parseInt(v,10); if(!isNaN(n)) setEvery(Math.min(365, Math.max(1, n))); }}
                onBlur={()=>{ if(every==='' || every<1) setEvery(7); }}
                style={{ ...inputStyle(), width:88 }}/>
              <span style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink, opacity:0.65 }}>days</span>
            </div>
          </Field>
          <Field label="Light">
            <input value={light} onChange={e=>setLight(e.target.value)} placeholder="e.g. Bright, indirect" style={inputStyle()}/>
          </Field>
          <Field label="Care notes">
            <textarea value={care} onChange={e=>setCare(e.target.value)} placeholder="e.g. Water when the top 5cm of soil is dry." rows={2} style={{ ...inputStyle(), height:'auto', minHeight:56, paddingTop:12, paddingBottom:12, resize:'vertical', lineHeight:1.5 }}/>
          </Field>
          <Field label="Fun fact">
            <textarea value={fact} onChange={e=>setFact(e.target.value)} placeholder="Something interesting about this plant…" rows={2} style={{ ...inputStyle(), height:'auto', minHeight:56, paddingTop:12, paddingBottom:12, resize:'vertical', lineHeight:1.5 }}/>
          </Field>
          <Field label="Propagated from">
            <select value={propagatedFrom == null ? '' : propagatedFrom} onChange={e=>setPropagatedFrom(e.target.value ? +e.target.value : null)} style={inputStyle()}>
              <option value="">None — grown or bought independently</option>
              {propagationOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Last watered">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div onClick={()=>setLastWatered(d=>Math.max(0, d-1))} style={{ cursor:'pointer', width:44, height:44, borderRadius:12, background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FONT_SANS, fontSize:20, fontWeight:600 }}>−</div>
              <span style={{ flex:1, textAlign:'center', fontFamily:FONT_SANS, fontSize:15, fontWeight:600, color:C.ink }}>{offsetLabel(lastWatered)}</span>
              <div onClick={()=>setLastWatered(d=>Math.min(365, d+1))} style={{ cursor:'pointer', width:44, height:44, borderRadius:12, background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FONT_SANS, fontSize:20, fontWeight:600 }}>+</div>
            </div>
          </Field>

          {editing && editing.species_id && (
            <div onClick={refreshFromSpecies} style={{
              marginTop: 10,
              height: 48, borderRadius: 14, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              background: 'rgba(45,80,22,0.05)', border: `1px solid rgba(45,80,22,0.2)`,
              cursor: refreshingSpecies ? 'default' : 'pointer',
              opacity: refreshingSpecies ? 0.7 : 1, transition:'all 200ms ease'
            }}>
              {refreshingSpecies ? (
                <div style={{ width:16, height:16, borderRadius:999, border:'2px solid rgba(45,80,22,0.2)', borderTopColor:C.forest, animation:'spin 0.9s linear infinite' }}/>
              ) : (
                <LeafOutline size={16} color={C.forest} sw={1.7}/>
              )}
              <span style={{ fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:C.forest }}>
                {refreshingSpecies ? 'Refreshing…' : 'Refresh care from species library'}
              </span>
            </div>
          )}

          {hasAnthropicKey() && (
            <div onClick={runAiRecheck} style={{
              marginTop: 10,
              height: 48, borderRadius: 14, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              background: 'rgba(122,158,78,0.1)', border: `1px solid rgba(122,158,78,0.3)`,
              cursor: rechecking || !latin ? 'default' : 'pointer',
              opacity: !latin ? 0.5 : 1, transition:'all 200ms ease'
            }}>
              {rechecking ? (
                <div style={{ width:16, height:16, borderRadius:999, border:'2px solid rgba(45,80,22,0.2)', borderTopColor:C.forest, animation:'spin 0.9s linear infinite' }}/>
              ) : (
                <SparkIcon s={16} c={C.forest}/>
              )}
              <span style={{ fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:C.forest }}>
                {rechecking ? 'Enhancing with AI…' : 'Recheck care info with AI'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* save bar */}
      <div style={{ flexShrink:0, padding:'12px 18px 26px', borderTop:'0.5px solid rgba(45,80,22,0.1)', background:C.bg+'F2', backdropFilter:'blur(14px)' }}>
        <div onClick={canSave ? ()=>onSave({ id: editing ? editing.id : undefined, name:name.trim(), czech:czech.trim(), latin:latin.trim()||'\u2014', location:loc||'Unassigned', species, presetImage, photos, every, light:light.trim(), care:care.trim(), fact:fact.trim(), days:lastWatered, toxicToPets, propagatedFrom }) : undefined}
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

// ════════════════════════════════════════════════════════════
//  DOCTOR — vision chat with the plant doctor
// ════════════════════════════════════════════════════════════
function splitDataUrl(d) { const m = /^data:([^;]+);base64,(.*)$/.exec(d || ''); return m ? { media_type: m[1], data: m[2] } : null; }
// build an Anthropic image content block from a dataURL or a remote https URL
function imgBlock(src) {
  const b = splitDataUrl(src);
  if (b) return { type: 'image', source: { type: 'base64', media_type: b.media_type, data: b.data } };
  if (/^https?:\/\//.test(src || '')) return { type: 'image', source: { type: 'url', url: src } };
  return null;
}

// ── lightweight inline Markdown → React (bold, italic, code) ──
function mdInline(str) {
  const out = []; let key = 0, last = 0, m;
  const re = /(\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`)/g;
  while ((m = re.exec(str))) {
    if (m.index > last) out.push(str.slice(last, m.index));
    if (m[2] != null) out.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3] != null) out.push(<em key={key++}>{m[3]}</em>);
    else if (m[4] != null) out.push(<code key={key++} style={{ fontFamily:'monospace', fontSize:'0.9em', background:'rgba(45,80,22,0.08)', padding:'1px 5px', borderRadius:5 }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < str.length) out.push(str.slice(last));
  return out;
}
// block-level: paragraphs, bullets, numbered lists, light headings
function MarkdownText({ text }) {
  const lines = (text || '').split('\n');
  const blocks = []; let list = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };
  for (const ln of lines) {
    const bullet = /^\s*[-*•]\s+(.*)/.exec(ln);
    const num = /^\s*\d+[.)]\s+(.*)/.exec(ln);
    const head = /^\s*#{1,3}\s+(.*)/.exec(ln);
    if (bullet) { if (!list || list.type !== 'ul') { flush(); list = { type:'ul', items:[] }; } list.items.push(bullet[1]); }
    else if (num) { if (!list || list.type !== 'ol') { flush(); list = { type:'ol', items:[] }; } list.items.push(num[1]); }
    else if (head) { flush(); blocks.push({ type:'h', text:head[1] }); }
    else if (ln.trim() === '') { flush(); }
    else { flush(); blocks.push({ type:'p', text:ln }); }
  }
  flush();
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {blocks.map((b, i) => {
        if (b.type === 'h') return <div key={i} style={{ fontFamily:FONT_SANS, fontSize:14.5, fontWeight:700, color:C.forest }}>{mdInline(b.text)}</div>;
        if (b.type === 'p') return <div key={i} style={{ lineHeight:1.55 }}>{mdInline(b.text)}</div>;
        return (
          <div key={i} style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {b.items.map((it, j) => (
              <div key={j} style={{ display:'flex', gap:9, alignItems:'flex-start', lineHeight:1.5 }}>
                <span style={{ flexShrink:0, marginTop:b.type==='ul'?6:0, fontFamily:FONT_SANS, fontSize: b.type==='ul'?0:13, fontWeight:700, color:C.sage }}>
                  {b.type==='ul' ? <span style={{ display:'inline-block', width:5, height:5, borderRadius:999, background:C.sage }}/> : `${j+1}.`}
                </span>
                <span>{mdInline(it)}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
// reveals text progressively (~2.4s total), then renders Markdown; balances stray ** mid-reveal
function TypewriterMarkdown({ text, onTick }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const total = (text || '').length; if (!total) return;
    const step = Math.max(2, Math.ceil(total / 150));
    let i = 0;
    const id = setInterval(() => {
      i += step; setN(i); onTick && onTick();
      if (i >= total) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [text]);
  const done = n >= (text || '').length;
  let shown = (text || '').slice(0, n);
  if (!done && (shown.match(/\*\*/g) || []).length % 2) shown = shown.replace(/\*\*[^*]*$/, ''); // drop dangling bold
  return (
    <div>
      <MarkdownText text={shown}/>
      {!done && <span style={{ display:'inline-block', width:6, height:14, marginLeft:1, borderRadius:1, background:C.sage, animation:'blink 1s steps(2) infinite', verticalAlign:'-2px' }}/>}
    </div>
  );
}

function relTime(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const mn = Math.round(s / 60); if (mn < 60) return `${mn}m ago`;
  const h = Math.round(mn / 60); if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24); return d === 1 ? 'yesterday' : `${d}d ago`;
}

// ── persist last 3 doctor chats locally (strip images oldest-first on quota) ──
const DOCTOR_CHATS_KEY = 'caulis_doctor_chats';
function loadDoctorChats() { try { const v = JSON.parse(localStorage.getItem(DOCTOR_CHATS_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch(e) { return []; } }
function saveDoctorChats(chats) {
  const trimmed = chats.slice(-3);
  const write = (arr) => localStorage.setItem(DOCTOR_CHATS_KEY, JSON.stringify(arr));
  try { write(trimmed); return; } catch(e) {}
  // quota — strip images from oldest chats until it fits
  const stripped = trimmed.map(c => ({ ...c, thread: c.thread }));
  for (let i = 0; i < stripped.length; i++) {
    stripped[i] = { ...stripped[i], thread: stripped[i].thread.map(m => m.image ? { ...m, image: null, imgStripped: true } : m) };
    try { write(stripped); return; } catch(e) {}
  }
  try { write(stripped.slice(-1)); } catch(e) {}
}

const TOOL_NOTES = {
  list_garden_plants: 'checking your garden…',
  suggest_correction: 'preparing a correction…',
  check_watering_schedule: 'checking watering schedule…',
  lookup_species_care: 'looking up species care…',
  garden_risk_report: 'scanning your garden…',
};

// easter egg: a few exact, low-stakes phrases get a scripted reply instead of
// hitting the API — free, instant, and doesn't risk the model breaking
// character. Only fires on a bare text message (no photo), matched after
// trimming punctuation, so it never intercepts a real plant question.
const DOCTOR_EASTER_EGGS = {
  'are you a robot': "Only in the sense that I run on electricity and never sleep. Otherwise, all plant.",
  'are you real': "As real as photosynthesis. Ask me something leafy.",
  'tell me a joke': "Why did the fern and the cactus break up? Too many mixed signals about watering.",
  'who made you': "A gardener with too many houseplants and a very patient editor.",
  'do you like plants': "I'm contractually obligated to. Also, genuinely, yes.",
  'i love you': "Sweet — but I think your plants would appreciate hearing that more.",
  'what is the meaning of life': "Photosynthesis, mostly. Water, light, patience — the rest is decoration.",
};

function DoctorOverlay({ plant, plants, anthropicKey, model, onApplyCorrection, onBack, isDesktop }) {
  const [chats, setChats] = useState(() => loadDoctorChats());
  const initial = useRef(null);
  if (initial.current === null) {
    const mine = chats.filter(c => plant ? c.plantId === plant.id : !c.plantId);
    const resume = (mine.length ? mine : chats).slice(-1)[0];
    initial.current = resume ? { id: resume.id, thread: resume.thread } : { id: 'dc-' + Date.now().toString(36), thread: [] };
  }
  const [chatId, setChatId] = useState(initial.current.id);
  const [thread, setThread] = useState(initial.current.thread);
  // seed the saved plant photo when opening from a plant on a fresh chat — ask without snapping a new one
  const [pendingImage, setPendingImage] = useState(() => (plant && !initial.current.thread.length) ? firstPhoto(plant) : null);
  const [activePlant, setActivePlant] = useState(plant || null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [toolNote, setToolNote] = useState('');
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showGarden, setShowGarden] = useState(false);
  const fileRef = useRef(null);
  const scrollRef = useRef(null);
  const gardenWithPhotos = (plants || []).filter(p => firstPhoto(p));

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [thread, busy, pendingImage]);

  // persist current chat (debounced via effect) into the last-3 store
  useEffect(() => {
    if (!thread.length) return;
    const persistThread = thread.map(m => m.animate ? { ...m, animate: false } : m);
    setChats(prev => {
      const others = prev.filter(c => c.id !== chatId);
      const next = [...others, { id: chatId, plantId: activePlant ? activePlant.id : null, plantName: activePlant ? activePlant.name : 'General', ts: Date.now(), thread: persistThread }].slice(-3);
      saveDoctorChats(next);
      return next;
    });
  }, [thread]);

  const startNewChat = () => { setShowHistory(false); setChatId('dc-' + Date.now().toString(36)); setThread([]); setActivePlant(plant || null); setPendingImage(plant ? firstPhoto(plant) : null); setError(''); };
  const loadChat = (c) => { setShowHistory(false); setChatId(c.id); setThread(c.thread.map(m => ({ ...m, animate: false }))); setActivePlant((plants || []).find(p => p.id === c.plantId) || null); setPendingImage(null); setError(''); };
  const pickGardenPlant = (p) => { setShowGarden(false); setActivePlant(p); setPendingImage(firstPhoto(p)); setError(''); };
  const pinScroll = () => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; };

  const processFile = (f) => {
    const reader = new FileReader();
    reader.onload = async (ev) => { setPendingImage(await compressImage(ev.target.result)); setError(''); };
    reader.readAsDataURL(f);
  };
  const openPicker = () => {
    const input = fileRef.current; if (!input) return;
    input.value = '';
    if (!isDesktop) input.setAttribute('capture', 'environment'); else input.removeAttribute('capture');
    input.onchange = () => { const f = input.files?.[0]; if (f) processFile(f); };
    input.click();
  };

  const hasPhoto = pendingImage || thread.some(m => m.image);
  const canSend = !busy && (pendingImage || input.trim());

  // execute a tool call locally; returns the string result fed back to the model
  const runTool = async (name, input) => {
    if (name === 'list_garden_plants') {
      return JSON.stringify((plants || []).map(p => ({ id: p.id, name: p.name, latin: p.latin || '', location: p.location || '' })));
    }
    if (name === 'suggest_correction') {
      const target = (plants || []).find(p => String(p.id) === String(input.plant_id)) || activePlant;
      if (!target) return 'No matching plant found in the garden.';
      const changes = {};
      for (const k of ['name','latin','location','every','light']) {
        if (input.changes && input.changes[k] != null && String(input.changes[k]) !== String(target[k] ?? '')) changes[k] = input.changes[k];
      }
      if (!Object.keys(changes).length) return 'No effective change — the stored data already matches.';
      setThread(t => [...t, { role: 'card', correction: { plantId: target.id, plantName: target.name, changes, reason: input.reason, status: 'pending' } }]);
      return 'Correction shown to the user for review.';
    }
    if (name === 'check_watering_schedule') {
      const target = (plants || []).find(p => String(p.id) === String(input.plant_id)) || activePlant;
      if (!target) return 'No matching plant found in the garden.';
      const ratio = target.every ? target.days / target.every : 0;
      const status = statusOf(target.days, target.every, target.snoozedUntil);
      return JSON.stringify({
        name: target.name, days: target.days, every: target.every, light: target.light || 'unknown',
        status, ratio: +ratio.toFixed(2),
        note: status === 'needs' ? 'overdue for water' : status === 'soon' ? 'due soon' : 'on schedule',
      });
    }
    if (name === 'lookup_species_care') {
      try {
        const results = await searchSpecies(input.query || '');
        if (!results || !results.length) return 'No species found matching that query.';
        const care = speciesCare(results[0]);
        return JSON.stringify({ name: results[0].common_name, latin: results[0].scientific_name, every: care.every, light: care.light, watering: care.watering });
      } catch (e) { return 'Species lookup failed: ' + (e.message || e); }
    }
    if (name === 'garden_risk_report') {
      const risky = (plants || [])
        .map(p => ({ id: p.id, name: p.name, days: p.days, every: p.every, status: statusOf(p.days, p.every, p.snoozedUntil) }))
        .filter(p => p.status !== 'ok')
        .sort((a, b) => (b.days / b.every) - (a.days / a.every));
      if (!risky.length) return 'No plants currently need water — the whole garden is on schedule.';
      return JSON.stringify(risky.slice(0, 15));
    }
    return 'Unknown tool.';
  };

  const send = async () => {
    if (!hasPhoto && !input.trim()) { setError('Add a photo or ask a question.'); return; }
    if (!canSend) return;
    const userMsg = { role: 'user', text: input.trim() || 'What’s going on with this plant?', image: pendingImage };
    const next = [...thread, userMsg];
    setThread(next); setInput(''); setPendingImage(null); setError(''); setBusy(true);
    if (!hasPhoto) {
      const egg = DOCTOR_EASTER_EGGS[userMsg.text.trim().toLowerCase().replace(/[.!?]+$/, '')];
      if (egg) { setTimeout(() => { setThread(t => [...t, { role: 'assistant', text: egg }]); setBusy(false); }, 480); return; }
    }
    // resend only the last 3 exchanges of text/image — tool plumbing is never persisted
    const recent = next.filter(m => m.role === 'user' || (m.role === 'assistant' && m.text)).slice(-6);
    let messages = recent.map(m => {
      if (m.role === 'user' && m.image) {
        const block = imgBlock(m.image);
        const content = [];
        if (block) content.push(block);
        content.push({ type: 'text', text: m.text });
        return { role: 'user', content };
      }
      return { role: m.role, content: m.text };
    });
    const ap = activePlant;
    const plantContext = ap
      ? `This conversation is about a saved plant.\nid: ${ap.id}\nName: ${ap.name}\nLatin: ${ap.latin || 'unknown'}\nLocation: ${ap.location || 'unknown'}\nWaters every ${ap.every} days; last watered ${ap.days} day(s) ago.\nLight: ${ap.light || 'unknown'}\nCare notes: ${ap.care || 'none'}`
      : null;
    try {
      let finalText = '';
      for (let hop = 0; hop < 4; hop++) {
        const res = await doctorAsk({ messages, plantContext, model, key: anthropicKey, withTools: true });
        if (res.stop_reason === 'tool_use' && res.toolUses.length) {
          setToolNote(TOOL_NOTES[res.toolUses[0].name] || 'checking…');
          messages = [...messages, { role: 'assistant', content: res.content }];
          const results = await Promise.all(res.toolUses.map(async tu => ({ type: 'tool_result', tool_use_id: tu.id, content: await runTool(tu.name, tu.input || {}) })));
          messages = [...messages, { role: 'user', content: results }];
          if (res.text) setThread(t => [...t, { role: 'assistant', text: res.text }]);
          continue;
        }
        finalText = res.text; break;
      }
      setThread(t => [...t, { role: 'assistant', text: finalText || 'I couldn’t read that — try another photo?', animate: true }]);
    } catch (e) {
      setThread(t => [...t, { role: 'assistant', text: '', error: String(e.message || e) }]);
    } finally { setBusy(false); setToolNote(''); }
  };

  const FIELD_LABELS = { name:'Name', latin:'Latin name', location:'Location', every:'Water every', light:'Light' };
  const acceptCorrection = (i) => {
    setThread(t => t.map((m, idx) => {
      if (idx !== i || m.role !== 'card') return m;
      onApplyCorrection && onApplyCorrection(m.correction.plantId, m.correction.changes);
      return { ...m, correction: { ...m.correction, status: 'accepted' } };
    }));
  };
  const dismissCorrection = (i) => setThread(t => t.map((m, idx) => (idx === i && m.role === 'card') ? { ...m, correction: { ...m.correction, status: 'dismissed' } } : m));

  const correctionCard = (m, i) => {
    const c = m.correction; const done = c.status !== 'pending';
    return (
      <div key={i} style={{ display:'flex', justifyContent:'flex-start', marginBottom:10 }}>
        <div style={{ maxWidth:'90%', width:'100%', background:C.panel, border:`1px solid ${c.status==='accepted'?'rgba(110,154,62,0.5)':C.line}`, borderRadius:20, padding:'14px 15px', boxShadow:'0px 8px 32px rgba(45,80,22,0.07)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <div style={{ width:26, height:26, borderRadius:999, background:'rgba(110,154,62,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M13 3.5l3.5 3.5L7 16.5H3.5V13L13 3.5Z" stroke={C.forest} strokeWidth="1.6" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:16, color:C.forest }}>Suggested correction</span>
            <span style={{ fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.6, marginLeft:'auto' }}>{c.plantName}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {Object.entries(c.changes).map(([k, v]) => (
              <div key={k} style={{ display:'flex', alignItems:'baseline', gap:8, fontFamily:FONT_SANS, fontSize:13 }}>
                <span style={{ minWidth:88, color:C.brown, opacity:0.7, fontSize:11.5, fontWeight:600, textTransform:'uppercase', letterSpacing:0.4 }}>{FIELD_LABELS[k] || k}</span>
                <span style={{ color:C.ink, fontWeight:600 }}>{k==='every'?`${v} days`:String(v)}</span>
              </div>
            ))}
          </div>
          {c.reason && <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.6, marginTop:10, lineHeight:1.45 }}>{c.reason}</div>}
          {c.status === 'pending' ? (
            <div style={{ display:'flex', gap:9, marginTop:13 }}>
              <div onClick={()=>acceptCorrection(i)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, height:40, borderRadius:13, background:C.forest, color:'#fff', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600 }}>
                <IconCheck s={16} c="#fff"/> Apply
              </div>
              <div onClick={()=>dismissCorrection(i)} style={{ flexShrink:0, padding:'0 18px', height:40, borderRadius:13, border:C.hair, color:C.brown, display:'flex', alignItems:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600 }}>Dismiss</div>
            </div>
          ) : (
            <div style={{ marginTop:12, fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color: c.status==='accepted'?C.sage:C.brown, opacity: c.status==='accepted'?1:0.6 }}>{c.status==='accepted'?'✓ Applied':'Dismissed'}</div>
          )}
        </div>
      </div>
    );
  };

  const bubble = (m, i) => {
    const mine = m.role === 'user';
    return (
      <div key={i} style={{ display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom:10 }}>
        <div style={{ maxWidth:'82%', display:'flex', flexDirection:'column', gap:6, alignItems: mine ? 'flex-end' : 'flex-start' }}>
          {m.image && <img src={m.image} alt="" style={{ width:150, height:150, objectFit:'cover', borderRadius:15, border:C.hair }}/>}
          {!m.image && m.imgStripped && <div style={{ width:150, height:96, borderRadius:15, background:'rgba(45,80,22,0.05)', border:C.hair, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.6 }}>photo from earlier</div>}
          {m.error
            ? <div style={{ fontFamily:FONT_SANS, fontSize:13.5, color:STATUS.needs.dot, background:'rgba(180,71,46,0.08)', padding:'10px 13px', borderRadius:16 }}>{m.error}</div>
            : !!m.text && <div style={{ fontFamily:FONT_SANS, fontSize:14, color: mine ? '#fff' : C.ink, background: mine ? C.forest : C.panel, border: mine ? 'none' : C.hair, padding:'11px 14px', borderRadius:18, boxShadow: mine ? 'none' : '0px 4px 18px rgba(45,80,22,0.05)', animation: mine ? 'none' : 'doctorIn 360ms cubic-bezier(.2,.8,.2,1)' }}>
                {mine ? <span style={{ whiteSpace:'pre-wrap', lineHeight:1.5 }}>{m.text}</span> : (m.animate ? <TypewriterMarkdown text={m.text} onTick={pinScroll}/> : <MarkdownText text={m.text}/>)}
              </div>}
        </div>
      </div>
    );
  };

  const sp = isDesktop ? 28 : 18;
  return (
    <div style={{ position: isDesktop ? 'absolute' : 'fixed', inset:0, zIndex:46, background:C.bg, display:'flex', flexDirection:'column', animation:'slideUp 320ms cubic-bezier(.2,.8,.2,1)' }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}/>
      <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:12, padding:`56px ${sp}px 14px`, position:'relative', zIndex:5 }}>
        <div onClick={onBack} style={{ cursor:'pointer', width:38, height:38, borderRadius:999, background:C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <IconBack/>
        </div>
        <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
          <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:22, color:C.forest, lineHeight:1.1 }}>Plant doctor</span>
          {activePlant && <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.65 }}>about {activePlant.name}</span>}
        </div>
        <div onClick={startNewChat} title="New chat" style={{ cursor:'pointer', width:38, height:38, borderRadius:999, background:C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke={C.forest} strokeWidth="1.9" strokeLinecap="round"/></svg>
        </div>
        {chats.length > 0 && (
          <div onClick={()=>setShowHistory(v=>!v)} title="History" style={{ cursor:'pointer', width:38, height:38, borderRadius:999, background: showHistory ? C.forest : C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 7v5l3.5 2" stroke={showHistory?'#fff':C.forest} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="8.5" stroke={showHistory?'#fff':C.forest} strokeWidth="1.6"/></svg>
          </div>
        )}
        {showHistory && (
          <div style={{ position:'absolute', top:'calc(100% - 4px)', right:sp, width:'min(320px, 78vw)', background:C.panel, borderRadius:18, border:C.hair, boxShadow:'0px 12px 40px rgba(45,80,22,0.14)', overflow:'hidden', zIndex:8, animation:'doctorIn 200ms cubic-bezier(.2,.8,.2,1)' }}>
            <div style={{ padding:'11px 15px', fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.5, textTransform:'uppercase', borderBottom:C.hair }}>Recent chats</div>
            {[...chats].reverse().map(c => {
              const firstQ = (c.thread.find(m => m.role === 'user' && m.text) || {}).text || 'Photo';
              const active = c.id === chatId;
              return (
                <div key={c.id} onClick={()=>loadChat(c)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 15px', cursor:'pointer', background: active ? 'rgba(110,154,62,0.08)' : 'transparent', borderBottom:C.hair }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{firstQ}</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.6, marginTop:1 }}>{c.plantName} · {relTime(c.ts)}</div>
                  </div>
                  {active && <IconCheck s={15} c={C.sage}/>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:`6px ${sp}px 10px`, position:'relative', zIndex:2 }}>
        {thread.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 24px' }}>
            <div style={{ display:'inline-flex', width:60, height:60, borderRadius:999, background:'rgba(110,154,62,0.12)', alignItems:'center', justifyContent:'center' }}>
              <IconDoctor s={28} c={C.sage}/>
            </div>
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:20, color:C.forest, marginTop:14 }}>Show me your plant</div>
            <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.55, marginTop:5, maxWidth:280, marginLeft:'auto', marginRight:'auto' }}>Snap a photo and ask anything — “what’s wrong with this?”, “how tall will it grow?” — or ask about your whole garden, like “what needs water this week?”</div>
          </div>
        )}
        {thread.map((m, i) => m.role === 'card' ? correctionCard(m, i) : bubble(m, i))}
        {busy && (
          <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:10, animation:'doctorIn 360ms cubic-bezier(.2,.8,.2,1)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, padding:'12px 16px', background:C.panel, border:C.hair, borderRadius:18, boxShadow:'0px 4px 18px rgba(45,80,22,0.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:4, height:16 }}>
                {[0,1,2,3].map(i => <div key={i} style={{ width:3.5, height:16, borderRadius:999, background:C.sage, transformOrigin:'center', animation:`bar 1.1s ${i*0.13}s ease-in-out infinite` }}/>)}
              </div>
              <span style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.7 }}>{toolNote || 'examining…'}</span>
            </div>
          </div>
        )}
      </div>

      {!anthropicKey && (
        <div style={{ flexShrink:0, padding:`0 ${sp}px 6px`, fontFamily:FONT_SANS, fontSize:12, color:STATUS.needs.dot }}>Add an Anthropic API key in Settings to use the doctor.</div>
      )}
      {error && <div style={{ flexShrink:0, padding:`0 ${sp}px 6px`, fontFamily:FONT_SANS, fontSize:12, color:STATUS.needs.dot }}>{error}</div>}

      <div style={{ flexShrink:0, padding:`8px ${sp}px calc(20px + env(safe-area-inset-bottom))`, borderTop:C.hair, background:C.bg }}>
        {(pendingImage || activePlant) && (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            {pendingImage && (
              <div style={{ display:'inline-flex', position:'relative' }}>
                <img src={pendingImage} alt="" style={{ width:56, height:56, objectFit:'cover', borderRadius:12, border:C.hair }}/>
                <div onClick={()=>setPendingImage(null)} style={{ position:'absolute', top:-6, right:-6, width:20, height:20, borderRadius:999, background:C.ink, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13 }}>×</div>
              </div>
            )}
            {activePlant && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 11px', borderRadius:999, background:'rgba(110,154,62,0.1)', border:'0.5px solid rgba(110,154,62,0.3)' }}>
                <LeafOutline size={12} color={C.forest} sw={1.7}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:12, fontWeight:600, color:C.forest }}>{activePlant.name}</span>
                <span onClick={()=>setActivePlant(null)} style={{ cursor:'pointer', color:C.brown, opacity:0.6, fontSize:14, lineHeight:1 }}>×</span>
              </div>
            )}
          </div>
        )}
        <div style={{ display:'flex', alignItems:'flex-end', gap:9 }}>
          <div onClick={openPicker} title="Take / upload a photo" style={{ flexShrink:0, width:42, height:42, borderRadius:13, background:C.panel, border:C.hair, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1l1-1.5h7L16.5 6h2A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z" stroke={C.forest} strokeWidth="1.6"/><circle cx="12" cy="13" r="3.2" stroke={C.forest} strokeWidth="1.6"/></svg>
          </div>
          {gardenWithPhotos.length > 0 && (
            <div onClick={()=>setShowGarden(true)} title="Pick a plant from your garden" style={{ flexShrink:0, width:42, height:42, borderRadius:13, background:C.panel, border:C.hair, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <LeafOutline size={19} color={C.forest} sw={1.7}/>
            </div>
          )}
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={hasPhoto ? 'Ask the doctor…' : 'Ask about your garden, or add a photo'} rows={1} style={{ flex:1, resize:'none', maxHeight:120, padding:'11px 14px', borderRadius:16, border:C.hair, background:C.panel, fontFamily:FONT_SANS, fontSize:14, color:C.ink, outline:'none', lineHeight:1.4 }}/>
          <div onClick={send} style={{ flexShrink:0, width:42, height:42, borderRadius:13, background: canSend ? C.forest : 'rgba(45,80,22,0.12)', display:'flex', alignItems:'center', justifyContent:'center', cursor: canSend ? 'pointer' : 'default' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke={canSend ? '#fff' : C.forest} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>

      {showGarden && (
        <div onClick={()=>setShowGarden(false)} style={{ position:'absolute', inset:0, zIndex:10, background:'rgba(42,42,38,0.34)', display:'flex', flexDirection:'column', justifyContent:'flex-end', animation:'fade 160ms ease' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.bg, borderTopLeftRadius:26, borderTopRightRadius:26, padding:'10px 18px calc(26px + env(safe-area-inset-bottom))', animation:'slideUp 260ms cubic-bezier(.2,.8,.2,1)', maxHeight:'70%', overflowY:'auto' }}>
            <div style={{ width:38, height:4, borderRadius:999, background:'rgba(45,80,22,0.16)', margin:'0 auto 14px' }}/>
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:21, color:C.forest, textAlign:'center' }}>From your garden</div>
            <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.65, textAlign:'center', marginTop:3, marginBottom:14 }}>Use a saved plant's photo — no new shot needed</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(96px, 1fr))', gap:12 }}>
              {gardenWithPhotos.map(p => (
                <div key={p.id} onClick={()=>pickGardenPlant(p)} style={{ cursor:'pointer', display:'flex', flexDirection:'column', gap:5 }}>
                  <img src={firstPhoto(p)} alt="" style={{ width:'100%', aspectRatio:'1', objectFit:'cover', borderRadius:14, border: activePlant && activePlant.id===p.id ? `2px solid ${C.forest}` : C.hair }}/>
                  <span style={{ fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'center' }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { InfoTile, PlantDetail, AddPlant, Field, DoctorOverlay });
