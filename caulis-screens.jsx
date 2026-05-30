// ════════════════════════════════════════════════════════════
//  Caulis — screens + bottom navigation
// ════════════════════════════════════════════════════════════

// ── Plant card (Garden grid) ──────────────────────────────
function PlantCard({ plant, tint, onOpen, onLongPress }) {
  const [press, setPress] = useState(false);
  const timer = useRef(null);
  const longed = useRef(false);
  const status = statusOf(plant.days, plant.every);
  const start = () => {
    setPress(true); longed.current = false;
    timer.current = setTimeout(() => { longed.current = true; setPress(false); onLongPress && onLongPress(plant); }, 480);
  };
  const end = () => { setPress(false); if (timer.current) clearTimeout(timer.current); };
  const click = () => { if (longed.current) { longed.current = false; return; } onOpen(plant.id); };
  return (
    <div
      onPointerDown={start} onPointerUp={end} onPointerLeave={end} onClick={click}
      style={{
        background:C.panel, borderRadius:22, padding:12,
        boxShadow: press ? '0 1px 3px rgba(43,42,38,0.06)' : '0 1px 2px rgba(43,42,38,0.04), 0 8px 22px rgba(45,80,22,0.05)',
        border:'0.5px solid rgba(45,80,22,0.06)',
        transform: press ? 'scale(0.975)' : 'scale(1)',
        transition:'transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms ease',
        cursor:'pointer', position:'relative', userSelect:'none', WebkitUserSelect:'none',
      }}>
      <div style={{ position:'relative' }}>
        <Specimen tint={tint} height={96} image={plant.userImage || plant.image}/>
        <div style={{
          position:'absolute', top:9, right:9, width:18, height:18, borderRadius:999, background:C.panel,
          display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(43,42,38,0.12)',
        }}>
          <StatusDot status={status}/>
        </div>
      </div>
      <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:21, lineHeight:1.12, color:C.forest, marginTop:11, letterSpacing:0.1 }}>{plant.name}</div>
      <div style={{ fontFamily:FONT_SANS, fontSize:10.5, fontWeight:400, color:C.brown, opacity:0.7, marginTop:2, letterSpacing:0.2 }}>{plant.location}</div>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:9 }}>
        <svg width="11" height="13" viewBox="0 0 11 13" style={{flexShrink:0}}>
          <path d="M5.5 1C5.5 1 1 6 1 8.6A4.5 4.5 0 0010 8.6C10 6 5.5 1 5.5 1Z" fill="none" stroke={STATUS[status].dot} strokeWidth="1.1"/>
        </svg>
        <span style={{ fontFamily:FONT_SANS, fontSize:11.5, fontWeight:500, color:C.ink, opacity:0.62, letterSpacing:0.1 }}>{agoLabel(plant.days)}</span>
      </div>
    </div>
  );
}

// ── Shared screen header ──────────────────────────────────
function ScreenHead({ eyebrow, title, isDesktop }) {
  return (
    <div style={{ padding: isDesktop ? '32px 28px 0' : '56px 22px 0', position:'relative', zIndex:2 }}>
      {!isDesktop && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
          <div style={{ width:30, height:30, borderRadius:999, background:'rgba(122,158,78,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Leaf size={16} color={C.forest}/>
          </div>
          <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:26, color:C.forest, letterSpacing:0.3 }}>Caulis</span>
        </div>
      )}
      <div style={{ fontFamily:FONT_SANS, fontSize:12, fontWeight:500, color:C.brown, opacity:0.72, marginTop: isDesktop ? 0 : 0, letterSpacing:0.4, textTransform:'uppercase' }}>{eyebrow}</div>
      <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:500, fontSize: isDesktop ? 32 : 27, color:C.ink, marginTop:2, lineHeight:1.2 }}>{title}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  GARDEN
// ════════════════════════════════════════════════════════════
function GardenFilterBar({ sort, setSort, sidePad = 22 }) {
  const filters = [['all','All'],['location','Location']];
  return (
    <div style={{ display:'flex', gap:8, overflowX:'auto', padding:`14px ${sidePad}px 2px`, position:'relative', zIndex:2, WebkitOverflowScrolling:'touch' }}>
      {filters.map(([key,label]) => {
        const on = sort === key;
        return (
          <div key={key} onClick={()=>setSort(key)} style={{
            flexShrink:0, cursor:'pointer', whiteSpace:'nowrap',
            borderRadius:999, padding:'8px 15px',
            background: on ? C.forest : C.panel,
            border: on ? '1px solid '+C.forest : '0.5px solid rgba(45,80,22,0.14)',
            color: on ? '#fff' : C.ink,
            fontFamily:FONT_SANS, fontSize:12.5, fontWeight:on?600:500, letterSpacing:0.1,
            boxShadow: on ? '0 3px 10px rgba(45,80,22,0.18)' : 'none', transition:'all 160ms ease',
          }}>{label}</div>
        );
      })}
    </div>
  );
}

function RoomHeader({ room, count }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'18px 4px 2px' }}>
      <IconPin s={14} c={C.brown}/>
      <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:19, color:C.forest, lineHeight:1.1 }}>{room}</span>
      <div style={{ flex:1, height:'0.5px', background:'rgba(45,80,22,0.12)', margin:'0 4px' }}/>
      <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.55, letterSpacing:0.3, flexShrink:0 }}>{count}</span>
    </div>
  );
}

function ContextMenu({ plant, onClose, onEdit, onMove, onRemove, isDesktop }) {
  const Item = ({ icon, label, danger, onClick }) => (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:13, padding:'14px 16px', cursor:'pointer',
      borderTop: C.hair,
    }}>
      <div style={{ width:34, height:34, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background: danger ? 'rgba(180,71,46,0.1)' : 'rgba(122,158,78,0.13)' }}>{icon}</div>
      <span style={{ fontFamily:FONT_SANS, fontSize:14.5, fontWeight:600, color: danger ? '#B4472E' : C.ink, whiteSpace:'nowrap' }}>{label}</span>
    </div>
  );
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:35, background:'rgba(42,42,38,0.34)', display:'flex', flexDirection:'column', justifyContent:'flex-end', animation:'fade 160ms ease' }}>
      <div onClick={e=>e.stopPropagation()} style={{ margin:'0 12px 12px', background:C.bg, borderRadius:24, overflow:'hidden', animation:'slideUp 260ms cubic-bezier(.2,.8,.2,1)', boxShadow:'0 -4px 30px rgba(0,0,0,0.12)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'15px 16px 13px' }}>
          <Leaf size={17} color={C.forest}/>
          <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:19, color:C.forest }}>{plant.name}</span>
          <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6 }}>{plant.location}</span>
        </div>
        <Item icon={<IconPin s={17} c={C.forest}/>} label="Move to another room" onClick={()=>{ onClose(); onMove(plant); }}/>
        <Item icon={<svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M13 3.5l3.5 3.5L7 16.5H3.5V13L13 3.5Z" stroke={C.forest} strokeWidth="1.6" strokeLinejoin="round"/></svg>} label="Edit plant" onClick={()=>{ onClose(); onEdit(plant); }}/>
        <Item danger icon={<svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M4 5.5h12M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5M6 5.5l.7 10a1.5 1.5 0 001.5 1.4h3.6a1.5 1.5 0 001.5-1.4l.7-10" stroke="#B4472E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>} label="Remove plant" onClick={()=>{ onClose(); onRemove(plant.id); }}/>
        <div onClick={onClose} style={{ borderTop:C.hair, textAlign:'center', padding:'14px', fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:C.brown, opacity:0.7, cursor:'pointer' }}>Cancel</div>
      </div>
    </div>
  );
}

function EmptyGarden({ onAdd }) {
  return (
    <div style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'52px 40px 0', zIndex:2 }}>
      <div style={{ position:'relative', width:128, height:128, borderRadius:999, background:'rgba(122,158,78,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ position:'absolute', inset:0, borderRadius:999, border:'1px dashed rgba(45,80,22,0.22)' }}/>
        <LeafOutline size={58} color={C.sage} sw={1.3}/>
      </div>
      <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:27, color:C.forest, marginTop:26 }}>Your garden is empty</div>
      <div style={{ fontFamily:FONT_SANS, fontSize:13, color:C.ink, opacity:0.58, marginTop:8, lineHeight:1.55, maxWidth:240 }}>Add your first plant to start tracking watering, light and care.</div>
      <div onClick={onAdd} style={{ marginTop:24, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:9, background:C.forest, color:'#fff', borderRadius:16, padding:'14px 22px', boxShadow:'0 6px 16px rgba(45,80,22,0.24)' }}>
        <IconPlus s={17} c="#fff"/>
        <span style={{ fontFamily:FONT_SANS, fontSize:15, fontWeight:600 }}>Add your first plant</span>
      </div>
    </div>
  );
}

function GardenScreen({ plants, onOpen, onAdd, onLongPress, isDesktop }) {
  const [sort, setSort] = useState('all');
  const needs = plants.filter(p => statusOf(p.days,p.every) !== 'ok').length;
  const tintFor = id => TINTS[(id-1)%TINTS.length];
  const empty = plants.length === 0;
  const sidePad = isDesktop ? 28 : 18;
  const topPad  = isDesktop ? 32 : 56;
  const gridCols = isDesktop ? 'repeat(auto-fill, minmax(185px, 1fr))' : '1fr 1fr';

  let groups = null, flat = null;
  if (sort === 'location') {
    const byRoom = {};
    plants.forEach(p => { (byRoom[p.location] = byRoom[p.location] || []).push(p); });
    groups = Object.keys(byRoom).sort().map(room => ({ room, items: byRoom[room] }));
  } else {
    flat = [...plants];
  }

  const cardProps = { onOpen, onLongPress };

  return (
    <div style={{ minHeight:'100%', position:'relative', paddingBottom:24 }}>
      <Sprig/>
      <div style={{ padding:`${topPad}px ${sidePad}px 0`, position:'relative', zIndex:2 }}>
        <div style={{ display:'flex', alignItems: isDesktop ? 'flex-end' : 'center', justifyContent:'space-between', gap:12 }}>
          <div>
            {!isDesktop && (
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:22 }}>
                <div style={{ width:30, height:30, borderRadius:999, background:'rgba(122,158,78,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Leaf size={16} color={C.forest}/>
                </div>
                <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:30, color:C.forest, letterSpacing:0.3 }}>Caulis</span>
              </div>
            )}
            <div style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:500, color:C.brown, opacity:0.72, letterSpacing:0.3, textTransform:'uppercase' }}>{todayGreeting()}</div>
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:500, fontSize: isDesktop ? 32 : 27, color:C.ink, marginTop:2, lineHeight:1.2 }}>
              {empty ? <>Welcome to Caulis.</> : needs > 0 ? <>{needs} plants would love a drink.</> : <>Everything looks happy today.</>}
            </div>
          </div>
          <div onClick={onAdd} style={{ flexShrink:0, width:38, height:38, borderRadius:999, background:C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <IconPlus/>
          </div>
        </div>
      </div>

      {empty && <EmptyGarden onAdd={onAdd}/>}

      {!empty && <GardenFilterBar sort={sort} setSort={setSort} sidePad={sidePad}/>}

      {!empty && sort === 'location' && (
        <div style={{ padding:`4px ${sidePad}px 0`, position:'relative', zIndex:2 }}>
          {groups.map(g => (
            <div key={g.room}>
              <RoomHeader room={g.room} count={g.items.length}/>
              <div style={{ display:'grid', gridTemplateColumns:gridCols, gap:14, marginTop:10 }}>
                {g.items.map(p => <PlantCard key={p.id} plant={p} tint={tintFor(p.id)} {...cardProps}/>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!empty && sort !== 'location' && (
        <div style={{ display:'grid', gridTemplateColumns:gridCols, gap:14, padding:`14px ${sidePad}px 0`, position:'relative', zIndex:2 }}>
          {flat.map(p => <PlantCard key={p.id} plant={p} tint={tintFor(p.id)} {...cardProps}/>)}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  NEEDS WATER
// ════════════════════════════════════════════════════════════
function NeedsRow({ plant, tint, onOpen, onLongPress }) {
  const [press, setPress] = useState(false);
  const timer = useRef(null);
  const longed = useRef(false);
  const status = statusOf(plant.days, plant.every);
  const start = () => { setPress(true); longed.current = false; timer.current = setTimeout(() => { longed.current = true; setPress(false); onLongPress && onLongPress(plant); }, 480); };
  const end = () => { setPress(false); if (timer.current) clearTimeout(timer.current); };
  const click = () => { if (longed.current) { longed.current = false; return; } onOpen(plant.id); };
  return (
    <div onPointerDown={start} onPointerUp={end} onPointerLeave={end} onClick={click} style={{
      display:'flex', alignItems:'center', gap:13, background:C.panel, borderRadius:18, padding:10,
      border:'0.5px solid rgba(45,80,22,0.06)', boxShadow:'0 1px 2px rgba(43,42,38,0.03), 0 6px 16px rgba(45,80,22,0.04)',
      cursor:'pointer', userSelect:'none', WebkitUserSelect:'none',
      transform: press ? 'scale(0.985)' : 'scale(1)', transition:'transform 160ms ease',
    }}>
      <div style={{ width:62, height:62, flexShrink:0 }}><Specimen tint={tint} height={62} radius={13} leafSize={28} image={plant.userImage || plant.image}/></div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:20, color:C.forest, lineHeight:1.1 }}>{plant.name}</div>
        <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.6, marginTop:3 }}>{agoLabel(plant.days)} · {plant.location}</div>
      </div>
      <StatusTag status={status}/>
    </div>
  );
}
function NeedsWaterScreen({ plants, onOpen, onLongPress, isDesktop }) {
  const order = { needs:0, soon:1 };
  const list = plants.filter(p=>statusOf(p.days,p.every)!=='ok')
    .sort((a,b)=> order[statusOf(a.days,a.every)] - order[statusOf(b.days,b.every)]);
  const sp = isDesktop ? 28 : 18;
  return (
    <div style={{ minHeight:'100%', position:'relative', paddingBottom:24 }}>
      <Sprig opacity={0.16}/>
      <ScreenHead eyebrow="Today's round" title={list.length ? `${list.length} plants are thirsty` : 'All caught up'} isDesktop={isDesktop}/>
      <div style={{ display:'flex', flexDirection:'column', gap:12, padding:`22px ${sp}px 0`, position:'relative', zIndex:2 }}>
        {list.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 30px', position:'relative', zIndex:2 }}>
            <div style={{ display:'inline-flex', width:64, height:64, borderRadius:999, background:'rgba(110,154,62,0.12)', alignItems:'center', justifyContent:'center' }}>
              <IconCheck s={28} c={C.sage} w={2.4}/>
            </div>
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:22, color:C.forest, marginTop:16 }}>Nothing to water</div>
            <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.55, marginTop:4 }}>Every plant is happily hydrated.</div>
          </div>
        )}
        {list.map((p,i)=> <NeedsRow key={p.id} plant={p} tint={TINTS[(p.id-1)%TINTS.length]} onOpen={onOpen} onLongPress={onLongPress}/>)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  QR SCANNER (primary action)
// ════════════════════════════════════════════════════════════
function Viewfinder() {
  return (
    <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:212, height:212, zIndex:3 }}>
      {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h],i)=>(
        <div key={i} style={{
          position:'absolute', [v]:0, [h]:0, width:40, height:40,
          [`border${v[0].toUpperCase()+v.slice(1)}`]:`3px solid rgba(255,255,255,0.92)`,
          [`border${h[0].toUpperCase()+h.slice(1)}`]:`3px solid rgba(255,255,255,0.92)`,
          [`border${v==='top'?'TopLeftRadius':'BottomLeftRadius'}`]: h==='left'?14:0,
          [`border${v==='top'?'TopRightRadius':'BottomRightRadius'}`]: h==='right'?14:0,
        }}/>
      ))}
      <div style={{ position:'absolute', left:6, right:6, height:2, borderRadius:2, background:'rgba(170,210,120,0.9)', boxShadow:'0 0 14px rgba(170,210,120,0.8)', animation:'scanline 2.4s ease-in-out infinite' }}/>
    </div>
  );
}

function ScannerScreen({ plants, onScan, isDesktop }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [camError, setCamError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const target = plants.find(p=>statusOf(p.days,p.every)==='needs') || plants[0];

  useEffect(() => {
    if (isDesktop) return;
    let stream = null;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR !== 'undefined') {
          const code = jsQR(img.data, img.width, img.height);
          if (code) {
            const m = code.data.match(/[?&]plant=(\d+)/) || code.data.match(/caulis:\/\/plant\/(\d+)/);
            if (m) { onScan(parseInt(m[1], 10)); return; }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } })
      .then(s => {
        stream = s;
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
        setScanning(true);
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => setCamError('Camera access denied'));

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [isDesktop]);

  if (isDesktop) {
    return (
      <div style={{ height:'100vh', position:'relative', background:'#20301A', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(120% 90% at 50% 35%, #2E4322 0%, #1B2814 70%, #141E0F 100%)' }}/>
        <div style={{ position:'absolute', inset:0, opacity:0.5, backgroundImage:'repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 7px)' }}/>
        <Leaf size={150} color="#fff" opacity={0.04}/>
        <div style={{ position:'absolute', top:62, left:0, right:0, textAlign:'center', zIndex:3 }}>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:24, color:'#fff' }}>Scan a plant tag</div>
          <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:'rgba(255,255,255,0.72)', marginTop:3 }}>Use your phone to scan — or simulate below</div>
        </div>
        <Viewfinder/>
        <div style={{ position:'absolute', bottom:34, left:0, right:0, display:'flex', flexDirection:'column', alignItems:'center', gap:14, zIndex:3 }}>
          {target && <div onClick={()=>onScan(target.id)} style={{ cursor:'pointer', width:74, height:74, borderRadius:999, background:'rgba(255,255,255,0.16)', border:'2px solid rgba(255,255,255,0.85)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:58, height:58, borderRadius:999, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}><IconScan s={28} c={C.forest}/></div>
          </div>}
          <div style={{ fontFamily:FONT_SANS, fontSize:11, color:'rgba(255,255,255,0.6)', letterSpacing:0.3 }}>Tap to simulate a scan</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height:'100%', position:'relative', background:'#111', overflow:'hidden' }}>
      <video ref={videoRef} playsInline muted style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}/>
      <canvas ref={canvasRef} style={{ display:'none' }}/>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)' }}/>
      <div style={{ position:'absolute', top:62, left:0, right:0, textAlign:'center', zIndex:3 }}>
        <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:24, color:'#fff' }}>Scan a plant tag</div>
        <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:'rgba(255,255,255,0.72)', marginTop:3 }}>
          {camError || (scanning ? 'Point at a Caulis QR code' : 'Starting camera…')}
        </div>
      </div>
      <Viewfinder/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  PRINT QUEUE
// ════════════════════════════════════════════════════════════
function QueueRow({ plant, onOpen, onRemove }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, background:C.panel, borderRadius:18, padding:12, border:'0.5px solid rgba(45,80,22,0.06)', boxShadow:'0 1px 2px rgba(43,42,38,0.03), 0 6px 16px rgba(45,80,22,0.04)' }}>
      <div style={{ width:48, height:48, flexShrink:0 }}><Specimen tint={TINTS[(plant.id-1)%TINTS.length]} height={48} radius={11} leafSize={22} image={plant.userImage || plant.image}/></div>
      <div style={{ width:50, height:50, borderRadius:11, background:C.bg, border:C.hair, padding:5, flexShrink:0 }}>
        <img src={qrUrl(PLANT_QR_URL(plant.id), 120)} alt="QR" style={{ width:'100%', height:'100%', display:'block' }}/>
      </div>
      <div onClick={()=>onOpen(plant.id)} style={{ flex:1, minWidth:0, cursor:'pointer' }}>
        <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:19, color:C.forest, lineHeight:1.05, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{plant.name}</div>
        <div style={{ fontFamily:FONT_SANS, fontSize:10.5, color:C.ink, opacity:0.55, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{plant.latin}</div>
        <div style={{ marginTop:5 }}><LocationPill label={plant.location}/></div>
      </div>
      <div onClick={()=>onRemove(plant.id)} style={{ cursor:'pointer', width:30, height:30, borderRadius:999, display:'flex', alignItems:'center', justifyContent:'center', color:C.brown, opacity:0.5, flexShrink:0 }}>
        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 3l8 8M11 3l-8 8" stroke={C.brown} strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
    </div>
  );
}
function PrintQueueScreen({ queue, plants, onOpen, onRemove, onPrintAll, printed, isDesktop }) {
  const items = queue.map(id => plants.find(p=>p.id===id)).filter(Boolean);
  const sp = isDesktop ? 28 : 22;
  const tp = isDesktop ? 32 : 56;
  return (
    <div style={{ minHeight:'100%', position:'relative', paddingBottom:24 }}>
      <Sprig opacity={0.14}/>
      <div style={{ padding:`${tp}px ${sp}px 4px`, position:'relative', zIndex:2 }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:12 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:FONT_SANS, fontSize:12, fontWeight:500, color:C.brown, opacity:0.72, letterSpacing:0.4, textTransform:'uppercase' }}>Print queue</div>
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:500, fontSize:26, color:C.ink, marginTop:2, lineHeight:1.15, whiteSpace:'nowrap' }}>{items.length} {items.length===1?'tag':'tags'} ready</div>
          </div>
          {items.length>0 && (
            <div onClick={onPrintAll} style={{ flexShrink:0, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:7, background:printed?C.sage:C.forest, color:'#fff', borderRadius:999, padding:'10px 16px', boxShadow:'0 4px 12px rgba(45,80,22,0.22)', transition:'background 200ms ease' }}>
              {printed ? <IconCheck s={15}/> : <IconPrint s={17} c="#fff"/>}
              <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>{printed?'Sent':'Print all'}</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12, padding:`22px ${sp}px 0`, position:'relative', zIndex:2 }}>
        {items.length===0 && (
          <div style={{ textAlign:'center', padding:'56px 30px' }}>
            <div style={{ display:'inline-flex', width:64, height:64, borderRadius:999, background:'rgba(107,76,42,0.1)', alignItems:'center', justifyContent:'center' }}>
              <IconPrint s={28} c={C.brown}/>
            </div>
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:22, color:C.forest, marginTop:16 }}>Queue is empty</div>
            <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.55, marginTop:4 }}>Open a plant and tap "Add to print queue" to label it.</div>
          </div>
        )}
        {items.map(p=> <QueueRow key={p.id} plant={p} onOpen={onOpen} onRemove={onRemove}/>)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════════════════════════
function SettingsScreen({ plants, isDesktop, gardenKey, onSetGardenKey, onRenameGardenKey, installPrompt, onInstall, darkMode, onToggleDark }) {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const sp = isDesktop ? 28 : 18;

  const [renaming, setRenaming] = useState(false);
  const [renameKey, setRenameKey] = useState('');
  const [renameStatus, setRenameStatus] = useState('idle'); // idle|checking|available|taken|saving|done|error
  const [joining, setJoining] = useState(false);
  const [joinKey, setJoinKey] = useState('');
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(gardenKey).catch(()=>{});
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const checkRename = async () => {
    const k = renameKey.trim();
    if (!k || k === gardenKey) return;
    setRenameStatus('checking');
    const exists = await gardenExists(k);
    setRenameStatus(exists ? 'taken' : 'available');
  };

  const doRename = async () => {
    const k = renameKey.trim();
    if (!k || k === gardenKey) return;
    setRenameStatus('saving');
    const ok = await onRenameGardenKey(k);
    setRenameStatus(ok ? 'done' : 'error');
    if (ok) setTimeout(() => { setRenaming(false); setRenameKey(''); setRenameStatus('idle'); }, 1200);
  };

  const doJoin = () => {
    const k = joinKey.trim();
    if (!k) return;
    onSetGardenKey(k);
    setJoining(false); setJoinKey('');
  };
  const Row = ({ label, value, last }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom: last?'none':C.hair }}>
      <span style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>{label}</span>
      <span style={{ fontFamily:FONT_SANS, fontSize:13.5, color:C.brown, opacity:0.7 }}>{value}</span>
    </div>
  );
  const Toggle = ({ on }) => (
    <div style={{ width:44, height:26, borderRadius:999, background:on?C.sage:'rgba(45,80,22,0.14)', position:'relative', transition:'background 200ms' }}>
      <div style={{ position:'absolute', top:3, left:on?21:3, width:20, height:20, borderRadius:999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 200ms' }}/>
    </div>
  );
  return (
    <div style={{ minHeight:'100%', position:'relative', paddingBottom:24 }}>
      <Sprig opacity={0.14}/>
      <ScreenHead eyebrow="Preferences" title="Settings" isDesktop={isDesktop}/>
      <div style={{ padding:`22px ${sp}px 0`, position:'relative', zIndex:2, display:'flex', flexDirection:'column', gap:18, maxWidth: isDesktop ? 680 : undefined }}>
        <div>
          <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.6, textTransform:'uppercase', padding:'0 6px 8px' }}>Appearance</div>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden' }}>
            <div onClick={onToggleDark} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', cursor:'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Dark mode</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.65, marginTop:1 }}>Botanical night theme</div>
              </div>
              <div style={{ width:44, height:26, borderRadius:999, background:darkMode?C.forest:'rgba(45,80,22,0.14)', position:'relative', transition:'background 200ms', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:darkMode?21:3, width:20, height:20, borderRadius:999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 200ms' }}/>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.6, textTransform:'uppercase', padding:'0 6px 8px' }}>Garden</div>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden' }}>
            <Row label="Plants tracked" value={String(plants.length)}/>
            <Row label="Locations" value={String(new Set(plants.map(p=>p.location)).size)}/>
            <Row label="Default reminder time" value="8:00 AM" last/>
          </div>
        </div>
        <div>
          <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.6, textTransform:'uppercase', padding:'0 6px 8px' }}>Notifications</div>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:C.hair }}>
              <span style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Watering reminders</span><Toggle on/>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
              <span style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Weekly garden digest</span><Toggle/>
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.6, textTransform:'uppercase', padding:'0 6px 8px' }}>Printing</div>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden' }}>
            <Row label="Label size" value="40 × 40 mm"/>
            <Row label="Printer" value="Brother QL-820" last/>
          </div>
        </div>
        <div>
          <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.6, textTransform:'uppercase', padding:'0 6px 8px' }}>Plant data · Perenual</div>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden', padding:'14px 16px' }}>
            <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.62, lineHeight:1.5, marginBottom:11 }}>Add a Perenual API key to pull live species photos &amp; care data. Without one, Caulis uses its built-in library.</div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={key} onChange={e=>setKey(e.target.value)} placeholder="perenual API key"
                style={{ flex:1, boxSizing:'border-box', height:44, borderRadius:12, border:'1px solid rgba(45,80,22,0.14)', background:C.input, padding:'0 13px', fontFamily:'ui-monospace, Menlo, monospace', fontSize:12.5, color:C.ink, outline:'none' }}/>
              <div onClick={()=>{ setApiKey(key.trim()); setSaved(true); setTimeout(()=>setSaved(false),1800); }} style={{ flexShrink:0, padding:'0 16px', height:44, borderRadius:12, background: saved?C.sage:C.forest, color:'#fff', display:'flex', alignItems:'center', gap:6, cursor:'pointer', transition:'background 200ms' }}>
                {saved && <IconCheck s={14}/>}
                <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>{saved?'Saved':'Save'}</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:11 }}>
              <span style={{ width:7, height:7, borderRadius:999, background: hasApiKey()? C.sage : C.brown, opacity: hasApiKey()?1:0.4 }}/>
              <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.6 }}>{hasApiKey() ? 'Live mode — fetching from Perenual' : 'Using built-in species library'}</span>
            </div>
          </div>
        </div>
        {(installPrompt || /iphone|ipad|ipod/i.test(navigator.userAgent)) && (
          <div>
            <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.6, textTransform:'uppercase', padding:'0 6px 8px' }}>App</div>
            <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden', padding:'14px 16px' }}>
              {installPrompt ? (
                <div onClick={onInstall} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
                  <div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:C.ink }}>Install Caulis</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.55, marginTop:2 }}>Add to your home screen</div>
                  </div>
                  <div style={{ flexShrink:0, padding:'10px 18px', borderRadius:12, background:C.forest, color:'#fff', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Install</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:C.ink, marginBottom:4 }}>Add to Home Screen</div>
                  <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.6, lineHeight:1.5 }}>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> in Safari to install Caulis.</div>
                </div>
              )}
            </div>
          </div>
        )}
        <div>
          <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.6, textTransform:'uppercase', padding:'0 6px 8px' }}>Cloud sync</div>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden', padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
            {!FIREBASE_READY && (
              <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.62, lineHeight:1.5 }}>Firebase not configured. Fill in FIREBASE_CONFIG in caulis-firebase.jsx.</div>
            )}
            {FIREBASE_READY && (<>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ flex:1, fontFamily:'ui-monospace,Menlo,monospace', fontSize:13, color:C.forest, background:C.input, borderRadius:10, padding:'9px 12px', border:C.hair, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{gardenKey}</div>
                <div onClick={copyKey} style={{ flexShrink:0, padding:'0 14px', height:38, borderRadius:10, background: copied ? C.sage : 'rgba(45,80,22,0.1)', color: copied ? '#fff' : C.forest, display:'flex', alignItems:'center', gap:5, cursor:'pointer', transition:'all 160ms', fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600 }}>
                  {copied && <IconCheck s={13} c="#fff"/>}{copied ? 'Copied' : 'Copy'}
                </div>
              </div>
              {!renaming && !joining && (
                <div style={{ display:'flex', gap:8 }}>
                  <div onClick={()=>{ setRenaming(true); setRenameKey(''); setRenameStatus('idle'); }} style={{ flex:1, height:38, borderRadius:10, background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Rename</div>
                  <div onClick={()=>{ setJoining(true); setJoinKey(''); }} style={{ flex:1, height:38, borderRadius:10, background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Join garden</div>
                </div>
              )}
              {renaming && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.6 }}>Rename keeps your current plants under a new key.</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <input value={renameKey} onChange={e=>{ setRenameKey(e.target.value); setRenameStatus('idle'); }} onKeyDown={e=>{ if(e.key==='Enter') checkRename(); }} placeholder="new-garden-name"
                      style={{ flex:1, boxSizing:'border-box', height:42, borderRadius:10, border:C.hair, background:C.input, padding:'0 12px', fontFamily:'ui-monospace,Menlo,monospace', fontSize:12.5, color:C.ink, outline:'none' }}/>
                    <div onClick={checkRename} style={{ flexShrink:0, padding:'0 14px', height:42, borderRadius:10, background:'rgba(45,80,22,0.1)', color:C.forest, display:'flex', alignItems:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Check</div>
                  </div>
                  {renameStatus==='checking' && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.7 }}>Checking…</div>}
                  {renameStatus==='available' && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:'#6E9A3E' }}>✓ Available — safe to rename</div>}
                  {renameStatus==='taken' && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:'#B4472E' }}>⚠ Key already has a garden. Renaming will overwrite it.</div>}
                  {renameStatus==='error' && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:'#B4472E' }}>Something went wrong. Try again.</div>}
                  {renameStatus==='done' && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:'#6E9A3E' }}>✓ Renamed successfully</div>}
                  <div style={{ display:'flex', gap:8 }}>
                    <div onClick={()=>{ setRenaming(false); setRenameKey(''); setRenameStatus('idle'); }} style={{ flex:1, height:38, borderRadius:10, border:C.hair, color:C.brown, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13 }}>Cancel</div>
                    {(renameStatus==='available'||renameStatus==='taken') && (
                      <div onClick={doRename} style={{ flex:2, height:38, borderRadius:10, background:renameStatus==='taken'?'#B4472E':C.forest, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>
                        {renameStatus==='saving'?'Saving…':renameStatus==='taken'?'Overwrite & rename':'Rename'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {joining && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.6 }}>Enter a key to load that garden. Your current plants will be replaced.</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <input value={joinKey} onChange={e=>setJoinKey(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') doJoin(); }} placeholder="other-garden-key"
                      style={{ flex:1, boxSizing:'border-box', height:42, borderRadius:10, border:C.hair, background:C.input, padding:'0 12px', fontFamily:'ui-monospace,Menlo,monospace', fontSize:12.5, color:C.ink, outline:'none' }}/>
                    <div onClick={doJoin} style={{ flexShrink:0, padding:'0 14px', height:42, borderRadius:10, background:C.forest, color:'#fff', display:'flex', alignItems:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Join</div>
                  </div>
                  <div onClick={()=>{ setJoining(false); setJoinKey(''); }} style={{ height:36, borderRadius:10, border:C.hair, color:C.brown, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13 }}>Cancel</div>
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:7, height:7, borderRadius:999, background:C.sage, flexShrink:0 }}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.6 }}>Syncing — {gardenKey}</span>
              </div>
            </>)}
          </div>
        </div>
        <div style={{ textAlign:'center', fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:15, color:C.brown, opacity:0.5, marginTop:4 }}>Caulis · grown with care</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  BOTTOM NAVIGATION
// ════════════════════════════════════════════════════════════
function BottomNav({ tab, setTab }) {
  const items = [
    { key:'garden', label:'Garden',  Icon:IconGarden },
    { key:'needs',  label:'Water',   Icon:IconDrop },
    { key:'scanner', label:'Scan',   center:true },
    { key:'print',  label:'Queue',   Icon:IconPrint },
    { key:'settings', label:'Settings', Icon:IconGear },
  ];
  return (
    <div style={{
      flexShrink:0, position:'relative', zIndex:30,
      background:'rgba(250,250,247,0.86)', backdropFilter:'blur(18px) saturate(160%)', WebkitBackdropFilter:'blur(18px) saturate(160%)',
      borderTop:'0.5px solid rgba(45,80,22,0.1)',
      padding:'9px 14px 26px',
      display:'flex', alignItems:'flex-end', justifyContent:'space-between',
    }}>
      {items.map(it => {
        if (it.center) {
          const active = tab === it.key;
          return (
            <div key={it.key} onClick={()=>setTab(it.key)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer' }}>
              <div style={{
                width:58, height:58, borderRadius:999, marginTop:-30,
                background:`linear-gradient(160deg, ${C.sage} 0%, ${C.forest} 90%)`,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: active ? '0 8px 20px rgba(45,80,22,0.42), 0 0 0 4px rgba(122,158,78,0.18)' : '0 6px 16px rgba(45,80,22,0.34)',
                border:'3px solid #FAFAF7', transition:'box-shadow 200ms ease',
              }}>
                <IconScan s={26} c="#fff"/>
              </div>
              <span style={{ fontFamily:FONT_SANS, fontSize:10, fontWeight:600, color: active?C.forest:C.brown, opacity: active?1:0.7, letterSpacing:0.2 }}>{it.label}</span>
            </div>
          );
        }
        const active = tab === it.key;
        const col = active ? C.forest : C.brown;
        return (
          <div key={it.key} onClick={()=>setTab(it.key)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer', paddingBottom:2 }}>
            <it.Icon s={23} c={col} a={active?1:0.55}/>
            <span style={{ fontFamily:FONT_SANS, fontSize:10, fontWeight: active?600:500, color:col, opacity: active?1:0.65, letterSpacing:0.2 }}>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  MOVE SHEET (reassign room)
// ════════════════════════════════════════════════════════════
function MoveSheet({ plant, locations, onClose, onPick, onAddLocation, isDesktop }) {
  const [typed, setTyped] = useState('');
  const addNew = () => {
    const v = typed.trim(); if (!v) return;
    if (!locations.some(l=>l.toLowerCase()===v.toLowerCase())) onAddLocation(v);
    onPick(plant.id, v); onClose();
  };
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:36, background:'rgba(42,42,38,0.34)', display:'flex', flexDirection:'column', justifyContent:'flex-end', animation:'fade 160ms ease' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.bg, borderTopLeftRadius:26, borderTopRightRadius:26, padding:'10px 18px 30px', animation:'slideUp 260ms cubic-bezier(.2,.8,.2,1)', maxHeight:'80%', overflowY:'auto' }}>
        <div style={{ width:38, height:4, borderRadius:999, background:'rgba(45,80,22,0.16)', margin:'0 auto 14px' }}/>
        <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:21, color:C.forest, textAlign:'center' }}>Move {plant.name}</div>
        <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.65, textAlign:'center', marginTop:3, marginBottom:16 }}>Currently in {plant.location}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {locations.map(l => {
            const on = l === plant.location;
            return (
              <div key={l} onClick={()=>{ onPick(plant.id, l); onClose(); }} style={{
                display:'flex', alignItems:'center', gap:11, padding:'13px 14px', cursor:'pointer',
                background:C.panel, borderRadius:14, border: on ? '1px solid rgba(110,154,62,0.5)' : '0.5px solid rgba(45,80,22,0.12)',
              }}>
                <IconPin s={16} c={on?C.forest:C.brown}/>
                <span style={{ flex:1, fontFamily:FONT_SANS, fontSize:14, fontWeight:on?600:500, color: on?C.forest:C.ink }}>{l}</span>
                {on && <IconCheck s={16} c={C.sage}/>}
              </div>
            );
          })}
        </div>
        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          <input value={typed} onChange={e=>setTyped(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addNew(); } }} placeholder="New room…"
            style={{ flex:1, boxSizing:'border-box', height:46, borderRadius:14, border:'1px solid rgba(45,80,22,0.14)', background:C.input, padding:'0 15px', fontFamily:FONT_SANS, fontSize:14, color:C.ink, outline:'none' }}/>
          <div onClick={addNew} style={{ flexShrink:0, width:46, height:46, borderRadius:14, background: typed.trim()?C.forest:'rgba(45,80,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <IconPlus s={16} c={typed.trim()?'#fff':C.forest}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  ERROR SCREENS
// ════════════════════════════════════════════════════════════
function PlantNotFoundScreen({ onBack }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, animation:'slideUp 320ms cubic-bezier(.2,.8,.2,1)' }}>
      <Sprig opacity={0.14}/>
      <div style={{ width:96, height:96, borderRadius:999, background:'rgba(180,71,46,0.1)', border:'1px dashed rgba(180,71,46,0.3)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', zIndex:2 }}>
        <LeafOutline size={44} color='#B4472E' sw={1.2}/>
      </div>
      <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:28, color:C.forest, marginTop:24, textAlign:'center', position:'relative', zIndex:2 }}>Plant not found</div>
      <div style={{ fontFamily:FONT_SANS, fontSize:13.5, color:C.ink, opacity:0.55, marginTop:8, lineHeight:1.6, textAlign:'center', maxWidth:260, position:'relative', zIndex:2 }}>This QR code points to a plant that doesn't exist in your garden.</div>
      <div onClick={onBack} style={{ marginTop:28, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:9, background:C.forest, color:'#fff', borderRadius:16, padding:'14px 24px', boxShadow:'0 6px 16px rgba(45,80,22,0.24)', position:'relative', zIndex:2 }}>
        <IconBack s={17} c="#fff"/>
        <span style={{ fontFamily:FONT_SANS, fontSize:15, fontWeight:600 }}>Back to garden</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  DESKTOP SIDEBAR
// ════════════════════════════════════════════════════════════
function DesktopSidebar({ tab, setTab }) {
  const items = [
    { key:'garden',   label:'Garden',   Icon:IconGarden },
    { key:'needs',    label:'Water',    Icon:IconDrop },
    { key:'print',    label:'Queue',    Icon:IconPrint },
    { key:'settings', label:'Settings', Icon:IconGear },
  ];
  return (
    <div style={{
      width:220, flexShrink:0, background:C.panel, borderRight:C.hair,
      display:'flex', flexDirection:'column',
      position:'sticky', top:0, alignSelf:'flex-start', height:'100vh',
    }}>
      <div style={{ padding:'28px 20px 20px', borderBottom:C.hair, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:999, background:'rgba(122,158,78,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Leaf size={17} color={C.forest}/>
          </div>
          <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:28, color:C.forest, letterSpacing:0.3 }}>Caulis</span>
        </div>
      </div>
      <nav style={{ padding:'12px 10px 0', flex:1, overflowY:'auto' }}>
        {items.map(({ key, label, Icon, special }) => {
          const active = tab === key;
          return (
            <div key={key} onClick={()=>setTab(key)} style={{
              display:'flex', alignItems:'center', gap:11,
              padding:'11px 12px', borderRadius:12, marginBottom:4,
              cursor:'pointer',
              background: active
                ? (special ? `linear-gradient(120deg, ${C.sage} 0%, ${C.forest} 100%)` : 'rgba(45,80,22,0.09)')
                : 'transparent',
              transition:'background 140ms ease',
            }}>
              <Icon s={20} c={active ? (special ? '#fff' : C.forest) : C.brown} a={active ? 1 : 0.55}/>
              <span style={{
                fontFamily:FONT_SANS, fontSize:14, fontWeight: active ? 600 : 500,
                color: active ? (special ? '#fff' : C.forest) : C.ink,
                opacity: active ? 1 : 0.75,
              }}>{label}</span>
            </div>
          );
        })}
      </nav>
      <div style={{ padding:'16px 20px 24px', borderTop:C.hair, position:'relative', overflow:'hidden', flexShrink:0 }}>
        <Sprig w={140} h={160} right={-18} bottom={-10} opacity={0.22}/>
        <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:13, color:C.brown, opacity:0.45, position:'relative', zIndex:1 }}>grown with care</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  DESKTOP MODAL WRAPPER
// ════════════════════════════════════════════════════════════
function DesktopModal({ onClose, children, maxWidth = 520 }) {
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:100,
      background:'rgba(42,42,38,0.38)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'32px 20px',
      animation:'fade 160ms ease',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxWidth,
        height:'min(88vh, 840px)',
        position:'relative',
        borderRadius:28,
        overflow:'hidden',
        background:C.bg,
        boxShadow:'0 24px 60px rgba(0,0,0,0.28), 0 0 0 0.5px rgba(45,80,22,0.1)',
        animation:'slideUp 300ms cubic-bezier(.2,.8,.2,1)',
      }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, {
  PlantCard, ScreenHead, GardenScreen, NeedsWaterScreen, ScannerScreen,
  PrintQueueScreen, SettingsScreen, BottomNav, MoveSheet, ContextMenu,
  DesktopSidebar, DesktopModal, PlantNotFoundScreen,
});
