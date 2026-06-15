// ════════════════════════════════════════════════════════════
//  Caulis — screens + bottom navigation
// ════════════════════════════════════════════════════════════
const PRINT_SIZES = [['S', 30], ['M', 40], ['L', 55]];

// device-local persistence for view prefs (never synced to a garden node)
const GS = {
  get: (k, f) => { try { const v = localStorage.getItem(k); return v != null ? JSON.parse(v) : f; } catch(e) { return f; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
};

// collapsible settings category — module-level so children keep identity (no remount)
function SettingsSection({ title, open, onToggle, children }) {
  return (
    <div>
      <div onClick={onToggle} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', padding:'0 6px 8px' }}>
        <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.6, textTransform:'uppercase' }}>{title}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" style={{ transform: open?'rotate(180deg)':'rotate(0deg)', transition:'transform 220ms ease', opacity:0.45 }}><path d="M6 9l6 6 6-6" stroke={C.brown} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div style={{ display:'grid', gridTemplateRows: open?'1fr':'0fr', transition:'grid-template-rows 260ms ease' }}>
        <div style={{ overflow:'hidden', minHeight:0 }}>{children}</div>
      </div>
    </div>
  );
}

// pointer-based reorder via a drag handle — nearest-center targeting works for
// both vertical lists and grids. Reorders by array position only; ids untouched.
function useReorder(onReorder) {
  const containerRef = useRef(null);
  const dragRef = useRef(null), overRef = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const start = (i) => (e) => {
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch(_) {}
    dragRef.current = i; overRef.current = i; setDragIdx(i); setOverIdx(i);
  };
  const move = (e) => {
    if (dragRef.current == null) return;
    const cont = containerRef.current; if (!cont) return;
    let target = dragRef.current, best = Infinity;
    [...cont.children].forEach((el, k) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2);
      const d = dx*dx + dy*dy;
      if (d < best) { best = d; target = k; }
    });
    overRef.current = target; setOverIdx(target);
  };
  const end = () => {
    const from = dragRef.current, to = overRef.current;
    dragRef.current = null; overRef.current = null; setDragIdx(null); setOverIdx(null);
    if (from != null && to != null && from !== to) onReorder(from, to);
  };
  const grip = (i) => ({ onPointerDown: start(i), onPointerMove: move, onPointerUp: end, onPointerCancel: end });
  return { containerRef, dragIdx, overIdx, grip };
}

function GripIcon({ c = C.brown }) {
  return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display:'block' }}>
    <circle cx="5.5" cy="4" r="1.1" fill={c}/><circle cx="10.5" cy="4" r="1.1" fill={c}/>
    <circle cx="5.5" cy="8" r="1.1" fill={c}/><circle cx="10.5" cy="8" r="1.1" fill={c}/>
    <circle cx="5.5" cy="12" r="1.1" fill={c}/><circle cx="10.5" cy="12" r="1.1" fill={c}/>
  </svg>);
}

// ── Plant card (Garden grid) ──────────────────────────────
function PlantCard({ plant, tint, onOpen, onLongPress, czechMode, grip, dragging, over, selectable, selected, onToggleSelect, compact }) {
  const [press, setPress] = useState(false);
  const timer = useRef(null);
  const longed = useRef(false);
  const status = statusOf(plant.days, plant.every);
  const start = () => {
    if (selectable) return;
    setPress(true); longed.current = false;
    timer.current = setTimeout(() => { longed.current = true; setPress(false); onLongPress && onLongPress(plant); }, 480);
  };
  const end = () => { setPress(false); if (timer.current) clearTimeout(timer.current); };
  const click = () => { if (selectable) { onToggleSelect(plant.id); return; } if (longed.current) { longed.current = false; return; } onOpen(plant.id); };
  return (
    <div
      onPointerDown={start} onPointerUp={end} onPointerLeave={end} onClick={click}
      style={{
        background:C.panel, borderRadius: compact ? 16 : 22, padding: compact ? 8 : 12, minWidth:0,
        boxShadow: press ? '0 1px 3px rgba(43,42,38,0.06)' : '0 1px 2px rgba(43,42,38,0.04), 0 8px 22px rgba(45,80,22,0.05)',
        border: selected ? `1.5px solid ${C.forest}` : over ? '1px solid rgba(110,154,62,0.6)' : '0.5px solid rgba(45,80,22,0.06)',
        transform: press ? 'scale(0.975)' : 'scale(1)',
        opacity: dragging ? 0.5 : 1,
        transition:'transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms ease, opacity 140ms ease, border-color 140ms ease',
        cursor:'pointer', position:'relative', userSelect:'none', WebkitUserSelect:'none',
      }}>
      <div style={{ position:'relative' }}>
        <Specimen tint={tint} height={compact ? 76 : 96} radius={compact ? 11 : 15} image={(plant.photos && plant.photos[0]) || plant.userImage || plant.image}/>
        {grip && (
          <div {...grip} onClick={e=>e.stopPropagation()} style={{ position:'absolute', top:9, left:9, width:24, height:24, borderRadius:999, background:C.panel, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(43,42,38,0.12)', cursor:'grab', touchAction:'none' }}>
            <GripIcon/>
          </div>
        )}
        {selectable && (
          <div style={{ position:'absolute', top:9, left:9, width:24, height:24, borderRadius:999, background: selected?C.forest:'rgba(255,255,255,0.92)', border: selected?'none':'1.5px solid rgba(45,80,22,0.28)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 3px rgba(43,42,38,0.18)' }}>
            {selected && <IconCheck s={14} c="#fff"/>}
          </div>
        )}
        <div style={{
          position:'absolute', top:9, right:9, width:18, height:18, borderRadius:999, background:C.panel,
          display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(43,42,38,0.12)',
        }}>
          <StatusDot status={status}/>
        </div>
      </div>
      <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize: compact ? 15.5 : 21, lineHeight:1.12, color:C.forest, marginTop: compact ? 8 : 11, letterSpacing:0.1, overflowWrap:'anywhere' }}>{czechMode && plant.czech ? plant.czech : plant.name}</div>
      <div style={{ fontFamily:FONT_SANS, fontSize: compact ? 9.5 : 10.5, fontWeight:400, color:C.brown, opacity:0.7, marginTop:2, letterSpacing:0.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{plant.location}</div>
      <div style={{ display:'flex', alignItems:'center', gap: compact ? 4 : 6, marginTop: compact ? 7 : 9 }}>
        <svg width="11" height="13" viewBox="0 0 11 13" style={{flexShrink:0}}>
          <path d="M5.5 1C5.5 1 1 6 1 8.6A4.5 4.5 0 0010 8.6C10 6 5.5 1 5.5 1Z" fill="none" stroke={STATUS[status].dot} strokeWidth="1.1"/>
        </svg>
        <span style={{ fontFamily:FONT_SANS, fontSize: compact ? 10 : 11.5, fontWeight:500, color:C.ink, opacity:0.62, letterSpacing:0.1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{compact ? (plant.days <= 0 ? 'Today' : plant.days === 1 ? '1 day' : `${plant.days} days`) : agoLabel(plant.days)}</span>
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
  const filters = [['all','All'],['urgent','Needs water'],['location','Location']];
  return (
    <div data-noswipe="1" style={{ display:'flex', gap:8, overflowX:'auto', padding:`14px ${sidePad}px 2px`, position:'relative', zIndex:2, WebkitOverflowScrolling:'touch' }}>
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

function GardenScreen({ plants, onOpen, onAdd, onLongPress, onReorder, isDesktop, czechMode, density, gridCols: gridColsPref, hideHealthy, onBulkWater, onBulkQueue, onBulkMove, onBulkRemove, onHaptic }) {
  const [sort, setSort] = useState(() => GS.get('caulis_g_sort', 'all'));
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState(() => GS.get('caulis_g_status', 'all'));
  const [fLoc, setFLoc] = useState(() => GS.get('caulis_g_loc', null));
  useEffect(() => { GS.set('caulis_g_sort', sort); }, [sort]);
  useEffect(() => { GS.set('caulis_g_status', fStatus); }, [fStatus]);
  useEffect(() => { GS.set('caulis_g_loc', fLoc); }, [fLoc]);
  const [selMode, setSelMode] = useState(false);
  const [sel, setSel] = useState(() => new Set());
  const exitSel = () => { setSelMode(false); setSel(new Set()); };
  const toggleSel = (id) => { onHaptic && onHaptic(); setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const runBulk = (fn) => { const ids = [...sel]; if (ids.length) fn(ids); exitSel(); };
  const re = useReorder(onReorder);
  const needs = plants.filter(p => statusOf(p.days,p.every) !== 'ok').length;
  const tintFor = id => TINTS[(id-1)%TINTS.length];
  const empty = plants.length === 0;
  const rooms = [...new Set(plants.map(p => p.location).filter(Boolean))].sort();
  const sidePad = isDesktop ? 28 : 18;
  const topPad  = isDesktop ? 32 : 56;
  const cols = gridColsPref || (density === 'compact' ? 3 : 2);
  const gridCols = isDesktop ? 'repeat(auto-fill, minmax(185px, 1fr))' : `repeat(${cols}, minmax(0, 1fr))`;
  const compact = !isDesktop && cols >= 3;
  const gridGap = compact ? 10 : 14;

  const nq = q.trim().toLowerCase();
  const matched = plants.filter(p => {
    if (nq && ![p.name, p.czech, p.latin, p.location, p.care, p.fact].some(v => (v||'').toLowerCase().includes(nq))) return false;
    if (hideHealthy && statusOf(p.days, p.every) === 'ok') return false;
    if (fStatus !== 'all' && statusOf(p.days, p.every) !== fStatus) return false;
    if (fLoc && p.location !== fLoc) return false;
    return true;
  });

  let groups = null, flat = null;
  if (sort === 'location') {
    const byRoom = {};
    matched.forEach(p => { (byRoom[p.location] = byRoom[p.location] || []).push(p); });
    groups = Object.keys(byRoom).sort().map(room => ({ room, items: byRoom[room] }));
  } else if (sort === 'urgent') {
    flat = [...matched].sort((a,b) => (b.days/b.every) - (a.days/a.every));
  } else {
    flat = [...matched];
  }

  const cardProps = { onOpen, onLongPress, czechMode, selectable: selMode, onToggleSelect: toggleSel, compact };

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
          <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:8 }}>
            {!empty && (
              <div onClick={()=>{ if (selMode) exitSel(); else setSelMode(true); }} style={{ width:38, height:38, borderRadius:999, background: selMode?C.forest:C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L20 4" stroke={selMode?'#fff':C.forest} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" stroke={selMode?'#fff':C.forest} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            )}
            <div onClick={onAdd} style={{ width:38, height:38, borderRadius:999, background:C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <IconPlus/>
            </div>
          </div>
        </div>
      </div>

      {empty && <EmptyGarden onAdd={onAdd}/>}

      {!empty && (
        <div style={{ padding:`12px ${sidePad}px 0`, position:'relative', zIndex:2 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, height:42, borderRadius:12, background:C.panel, border:C.hair, padding:'0 12px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, opacity:0.5 }}><circle cx="11" cy="11" r="7" stroke={C.ink} strokeWidth="1.7"/><path d="M21 21l-4-4" stroke={C.ink} strokeWidth="1.7" strokeLinecap="round"/></svg>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search plants…" style={{ flex:1, border:'none', background:'transparent', outline:'none', fontFamily:FONT_SANS, fontSize:14, color:C.ink }}/>
            {q && <div onClick={()=>setQ('')} style={{ cursor:'pointer', opacity:0.5 }}><svg width="13" height="13" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke={C.ink} strokeWidth="1.6" strokeLinecap="round"/></svg></div>}
          </div>
        </div>
      )}

      {!empty && <GardenFilterBar sort={sort} setSort={setSort} sidePad={sidePad}/>}

      {!empty && (
        <div data-noswipe="1" style={{ display:'flex', alignItems:'center', gap:8, overflowX:'auto', padding:`10px ${sidePad}px 2px`, position:'relative', zIndex:2, WebkitOverflowScrolling:'touch' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, opacity:0.55 }}><path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z" stroke={C.brown} strokeWidth="1.7" strokeLinejoin="round"/></svg>
          {[['all','All'],['needs','Needs'],['soon','Soon'],['ok','Healthy']].map(([k,l]) => {
            const on = fStatus === k;
            const col = k === 'all' ? C.forest : STATUS[k].dot;
            return (
              <div key={k} onClick={()=>setFStatus(k)} style={{
                flexShrink:0, cursor:'pointer', whiteSpace:'nowrap', borderRadius:999, padding:'6px 13px',
                background: on ? (k==='all' ? C.forest : STATUS[k].soft) : C.panel,
                border: on ? `1px solid ${col}` : '0.5px solid rgba(45,80,22,0.14)',
                color: on ? (k==='all' ? '#fff' : col) : C.ink,
                fontFamily:FONT_SANS, fontSize:12, fontWeight: on?600:500, transition:'all 140ms ease',
              }}>{l}</div>
            );
          })}
          {rooms.length > 0 && <div style={{ flexShrink:0, width:'0.5px', height:20, background:'rgba(45,80,22,0.14)', margin:'0 2px' }}/>}
          {rooms.map(r => {
            const on = fLoc === r;
            return (
              <div key={r} onClick={()=>setFLoc(on ? null : r)} style={{
                flexShrink:0, cursor:'pointer', whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:5, borderRadius:999, padding:'6px 12px',
                background: on ? 'rgba(122,158,78,0.16)' : C.panel,
                border: on ? '1px solid rgba(110,154,62,0.5)' : '0.5px solid rgba(45,80,22,0.14)',
                color: on ? C.forest : C.ink, fontFamily:FONT_SANS, fontSize:12, fontWeight: on?600:500, transition:'all 140ms ease',
              }}><IconPin s={11} c={on?C.forest:C.brown}/> {r}</div>
            );
          })}
        </div>
      )}

      {!empty && matched.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 30px', position:'relative', zIndex:2 }}>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:20, color:C.forest }}>No matches</div>
          <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.55, marginTop:4 }}>{nq ? `Nothing matches "${q}".` : 'No plants match these filters.'}</div>
        </div>
      )}

      {!empty && sort === 'location' && (
        <div style={{ padding:`4px ${sidePad}px 0`, position:'relative', zIndex:2 }}>
          {groups.map(g => (
            <div key={g.room}>
              <RoomHeader room={g.room} count={g.items.length}/>
              <div style={{ display:'grid', gridTemplateColumns:gridCols, gap:gridGap, marginTop:10 }}>
                {g.items.map(p => <PlantCard key={p.id} plant={p} tint={tintFor(p.id)} {...cardProps} selected={sel.has(p.id)}/>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!empty && sort !== 'location' && (() => {
        const dragEnabled = sort === 'all' && !nq && fStatus === 'all' && !fLoc && !hideHealthy && !selMode;
        return (
          <div ref={dragEnabled ? re.containerRef : null} style={{ display:'grid', gridTemplateColumns:gridCols, gap:gridGap, padding:`14px ${sidePad}px 0`, position:'relative', zIndex:2 }}>
            {flat.map((p,i) => <PlantCard key={p.id} plant={p} tint={tintFor(p.id)} {...cardProps} selected={sel.has(p.id)} grip={dragEnabled ? re.grip(i) : undefined} dragging={dragEnabled && re.dragIdx===i} over={dragEnabled && re.overIdx===i && re.dragIdx!==i}/>)}
          </div>
        );
      })()}

      {selMode && (
        <div data-noswipe="1" style={{ position:'fixed', left:0, right:0, bottom: isDesktop?16:78, zIndex:40, display:'flex', justifyContent:'center', padding:'0 12px', pointerEvents:'none' }}>
          <div style={{ pointerEvents:'auto', display:'flex', alignItems:'center', gap:2, background:C.panel, borderRadius:999, padding:'5px 6px 5px 14px', boxShadow:'0 10px 30px rgba(45,80,22,0.2)', border:C.hair }}>
            <span style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.ink, marginRight:4, whiteSpace:'nowrap' }}>{sel.size}</span>
            {[['Water', onBulkWater], ['Queue', onBulkQueue], ['Move', onBulkMove]].map(([label, fn]) => (
              <div key={label} onClick={sel.size ? ()=>runBulk(fn) : undefined} style={{ cursor: sel.size?'pointer':'default', opacity: sel.size?1:0.4, padding:'8px 11px', borderRadius:999, fontFamily:FONT_SANS, fontSize:13, fontWeight:600, color:C.forest, whiteSpace:'nowrap' }}>{label}</div>
            ))}
            <div onClick={sel.size ? ()=>runBulk(onBulkRemove) : undefined} style={{ cursor: sel.size?'pointer':'default', opacity: sel.size?1:0.4, padding:'8px 11px', borderRadius:999, fontFamily:FONT_SANS, fontSize:13, fontWeight:600, color:'#B4472E' }}>Delete</div>
            <div onClick={exitSel} style={{ cursor:'pointer', width:32, height:32, borderRadius:999, background:'rgba(45,80,22,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke={C.ink} strokeWidth="1.7" strokeLinecap="round"/></svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  NEEDS WATER
// ════════════════════════════════════════════════════════════
function NeedsRow({ plant, tint, onOpen, onLongPress, onSnooze, czechMode }) {
  const [press, setPress] = useState(false);
  const [dx, setDx] = useState(0);
  const timer = useRef(null);
  const longed = useRef(false);
  const startX = useRef(0), startY = useRef(0);
  const swiping = useRef(false), openRef = useRef(false), dxRef = useRef(0);
  const status = statusOf(plant.days, plant.every);
  const OPEN = -84;
  const setX = (v) => { dxRef.current = v; setDx(v); };

  const start = (e) => {
    setPress(true); longed.current = false; swiping.current = false;
    startX.current = e.clientX; startY.current = e.clientY;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch(_) {}
    timer.current = setTimeout(() => { longed.current = true; setPress(false); onLongPress && onLongPress(plant); }, 480);
  };
  const move = (e) => {
    const mx = e.clientX - startX.current, my = e.clientY - startY.current;
    if (!swiping.current && Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my)) {
      swiping.current = true; if (timer.current) clearTimeout(timer.current); setPress(false);
    }
    if (swiping.current) setX(Math.max(OPEN, Math.min(0, (openRef.current ? OPEN : 0) + mx)));
  };
  const end = () => {
    setPress(false); if (timer.current) clearTimeout(timer.current);
    if (swiping.current) { const open = dxRef.current < OPEN/2; openRef.current = open; setX(open ? OPEN : 0); swiping.current = false; }
  };
  const click = () => {
    if (longed.current) { longed.current = false; return; }
    if (openRef.current || dxRef.current !== 0) { openRef.current = false; setX(0); return; }
    onOpen(plant.id);
  };
  const doSnooze = (e) => { e.stopPropagation(); onSnooze && onSnooze(plant.id, 2); openRef.current = false; setX(0); };

  return (
    <div data-noswipe="1" style={{ position:'relative', borderRadius:18, overflow:'hidden' }}>
      <div onClick={doSnooze} style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:22, background:STATUS.soon.soft, cursor:'pointer' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, color:STATUS.soon.dot }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke={STATUS.soon.dot} strokeWidth="1.7"/><path d="M12 9.5V13l2.5 1.5M9 3.5h6" stroke={STATUS.soon.dot} strokeWidth="1.7" strokeLinecap="round"/></svg>
          <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:700 }}>+2d</span>
        </div>
      </div>
      <div onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onClick={click} style={{
        position:'relative', display:'flex', alignItems:'center', gap:13, background:C.panel, borderRadius:18, padding:10,
        border:'0.5px solid rgba(45,80,22,0.06)', boxShadow:'0 1px 2px rgba(43,42,38,0.03), 0 6px 16px rgba(45,80,22,0.04)',
        cursor:'pointer', userSelect:'none', WebkitUserSelect:'none', touchAction:'pan-y',
        transform: `translateX(${dx}px) scale(${press ? 0.985 : 1})`, transition: swiping.current ? 'none' : 'transform 220ms cubic-bezier(.2,.8,.2,1)',
      }}>
        <div style={{ width:62, height:62, flexShrink:0 }}><Specimen tint={tint} height={62} radius={13} leafSize={28} image={(plant.photos && plant.photos[0]) || plant.userImage || plant.image}/></div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:20, color:C.forest, lineHeight:1.1 }}>{czechMode && plant.czech ? plant.czech : plant.name}</div>
          <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.6, marginTop:3 }}>{agoLabel(plant.days)} · {plant.location}</div>
        </div>
        <StatusTag status={status}/>
      </div>
    </div>
  );
}
function NeedsWaterScreen({ plants, onOpen, onLongPress, onSnooze, onWaterAll, confirmDelete, isDesktop, czechMode }) {
  const order = { needs:0, soon:1 };
  const list = plants.filter(p=>statusOf(p.days,p.every)!=='ok')
    .sort((a,b)=> order[statusOf(a.days,a.every)] - order[statusOf(b.days,b.every)]);
  const sp = isDesktop ? 28 : 18;
  const [confirming, setConfirming] = useState(false);
  const doWaterAll = () => { if (confirming) { onWaterAll && onWaterAll(); setConfirming(false); } else { setConfirming(true); setTimeout(()=>setConfirming(false), 3200); } };
  return (
    <div style={{ minHeight:'100%', position:'relative', paddingBottom:24 }}>
      <Sprig opacity={0.16}/>
      <ScreenHead eyebrow="Today's round" title={list.length ? `${list.length} plants are thirsty` : 'All caught up'} isDesktop={isDesktop}/>
      {plants.length > 0 && (
        <div style={{ display:'flex', justifyContent:'flex-end', padding:`0 ${sp}px`, marginTop:-8, position:'relative', zIndex:3 }}>
          <div onClick={doWaterAll} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 15px', borderRadius:999, cursor:'pointer', background: confirming?C.forest:'rgba(45,80,22,0.08)', color: confirming?'#fff':C.forest, transition:'background 180ms' }}>
            <IconDrop s={15} c={confirming?'#fff':C.forest}/>
            <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>{confirming ? `Water all ${plants.length}?` : 'Water all'}</span>
          </div>
        </div>
      )}
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
        {list.map((p,i)=> <NeedsRow key={p.id} plant={p} tint={TINTS[(p.id-1)%TINTS.length]} onOpen={onOpen} onLongPress={onLongPress} onSnooze={onSnooze} czechMode={czechMode}/>)}
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

function ScannerScreen({ plants, onScan, isDesktop, paused }) {
  const [camError, setCamError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const scannedRef = useRef(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (isDesktop) return;
    const s = scannerRef.current; if (!s) return;
    try { paused ? s.pause(true) : s.resume(); } catch(e) {}
    if (!paused) scannedRef.current = false;
  }, [paused]);

  useEffect(() => {
    if (isDesktop) return;
    if (typeof Html5Qrcode === 'undefined') {
      setCamError('QR scanner script was blocked by the browser. Please check ad/tracker blockers.');
      return;
    }
    scannedRef.current = false;
    const scanner = new Html5Qrcode('caulis-qr-reader');
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (text) => {
        if (scannedRef.current) return;
        const m = text.match(/[?&]plant=(\d+)/);
        const gm = text.match(/[?&]g=([^&\s]+)/);
        if (m) { scannedRef.current = true; onScan(parseInt(m[1], 10), gm ? decodeURIComponent(gm[1]) : null); }
      },
      () => {}
    ).then(() => setScanning(true)).catch(() => setCamError('Camera access denied'));

    return () => { scannerRef.current = null; scanner.stop().then(() => scanner.clear()).catch(() => {}); };
  }, [isDesktop]);

  return (
    <div style={{ position:'absolute', inset:0, background:'#111', overflow:'hidden' }}>
      <div id="caulis-qr-reader" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}/>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:62, left:0, right:0, textAlign:'center', zIndex:3, pointerEvents:'none' }}>
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
function QueueRow({ plant, onOpen, onRemove, sizeMm, globalMm, onSetSize, czechMode, grip, dragging, over }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, background:C.panel, borderRadius:18, padding:12, border: over ? '1px solid rgba(110,154,62,0.6)' : '0.5px solid rgba(45,80,22,0.06)', boxShadow:'0 1px 2px rgba(43,42,38,0.03), 0 6px 16px rgba(45,80,22,0.04)', opacity: dragging ? 0.5 : 1, transition:'opacity 140ms ease, border-color 140ms ease' }}>
      <div {...grip} style={{ flexShrink:0, width:22, display:'flex', alignItems:'center', justifyContent:'center', cursor:'grab', touchAction:'none', opacity:0.45 }}><GripIcon/></div>
      <div style={{ width:48, height:48, flexShrink:0 }}><Specimen tint={TINTS[(plant.id-1)%TINTS.length]} height={48} radius={11} leafSize={22} image={(plant.photos && plant.photos[0]) || plant.userImage || plant.image}/></div>
      <div onClick={()=>onOpen(plant.id)} style={{ flex:1, minWidth:0, cursor:'pointer' }}>
        <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:19, color:C.forest, lineHeight:1.05, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{czechMode && plant.czech ? plant.czech : plant.name}</div>
        <div style={{ fontFamily:FONT_SANS, fontSize:10.5, color:C.ink, opacity:0.55, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{plant.latin}</div>
        <div style={{ marginTop:5 }}><LocationPill label={plant.location}/></div>
      </div>
      <div style={{ display:'flex', background:'rgba(45,80,22,0.07)', borderRadius:8, padding:2, flexShrink:0 }}>
        {PRINT_SIZES.map(([label, mm]) => {
          const isOverride = sizeMm === mm;
          const isGlobal = !sizeMm && mm === globalMm;
          return (
            <div key={label} onClick={()=>onSetSize(plant.id, isOverride ? null : mm)} style={{
              cursor:'pointer', width:26, height:22, borderRadius:6,
              background: isOverride ? C.forest : isGlobal ? 'rgba(45,80,22,0.18)' : 'transparent',
              color: isOverride ? '#fff' : C.ink,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:FONT_SANS, fontSize:10, fontWeight:600,
              opacity: isOverride || isGlobal ? 1 : 0.32,
              transition:'all 120ms ease',
            }}>{label}</div>
          );
        })}
      </div>
      <div onClick={()=>onRemove(plant.id)} style={{ cursor:'pointer', width:30, height:30, borderRadius:999, display:'flex', alignItems:'center', justifyContent:'center', color:C.brown, opacity:0.5, flexShrink:0 }}>
        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 3l8 8M11 3l-8 8" stroke={C.brown} strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
    </div>
  );
}
function PrintQueueScreen({ queue, plants, onOpen, onRemove, onPrintAll, printed, isDesktop, globalPrintSize, onSetGlobalSize, queueSizes, onSetSize, onReorder, monochromePrint, onToggleMono, czechMode }) {
  const items = queue.map(id => plants.find(p=>p.id===id)).filter(Boolean);
  const re = useReorder(onReorder);
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
      {items.length>0 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:`10px ${sp}px 0`, position:'relative', zIndex:2 }}>
          <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.ink, opacity:0.38, letterSpacing:0.4, textTransform:'uppercase', flexShrink:0 }}>Size</span>
          <div style={{ display:'flex', background:'rgba(45,80,22,0.07)', borderRadius:9, padding:3 }}>
            {PRINT_SIZES.map(([label, mm]) => {
              const on = globalPrintSize === mm;
              return (
                <div key={label} onClick={()=>onSetGlobalSize(mm)} style={{
                  cursor:'pointer', width:32, height:26, borderRadius:6,
                  background: on ? C.forest : 'transparent',
                  color: on ? '#fff' : C.ink,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600,
                  opacity: on ? 1 : 0.45,
                  transition:'all 140ms ease',
                }}>{label}</div>
              );
            })}
          </div>
          <span style={{ fontFamily:FONT_SANS, fontSize:10.5, color:C.brown, opacity:0.38 }}>{globalPrintSize}mm</span>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:7, cursor:'pointer' }} onClick={onToggleMono}>
            <span style={{ fontFamily:FONT_SANS, fontSize:12, fontWeight:600, color: monochromePrint ? C.forest : C.ink, opacity: monochromePrint ? 1 : 0.45, transition:'color 200ms' }}>Mono</span>
            <div style={{ width:36, height:22, borderRadius:999, background: monochromePrint ? C.forest : 'rgba(45,80,22,0.12)', position:'relative', transition:'background 200ms', flexShrink:0 }}>
              <div style={{ position:'absolute', top:2, left: monochromePrint ? 16 : 2, width:18, height:18, borderRadius:999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 200ms' }}/>
            </div>
          </div>
        </div>
      )}
      {items.length===0 && (
        <div style={{ textAlign:'center', padding:'56px 30px', position:'relative', zIndex:2 }}>
          <div style={{ display:'inline-flex', width:64, height:64, borderRadius:999, background:'rgba(107,76,42,0.1)', alignItems:'center', justifyContent:'center' }}>
            <IconPrint s={28} c={C.brown}/>
          </div>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:22, color:C.forest, marginTop:16 }}>Queue is empty</div>
          <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.55, marginTop:4 }}>Open a plant and tap "Add to print queue" to label it.</div>
        </div>
      )}
      <div ref={re.containerRef} style={{ display:'flex', flexDirection:'column', gap:12, padding:`14px ${sp}px 0`, position:'relative', zIndex:2 }}>
        {items.map((p,i) => <QueueRow key={p.id} plant={p} onOpen={onOpen} onRemove={onRemove} sizeMm={queueSizes[p.id]||null} globalMm={globalPrintSize} onSetSize={onSetSize} czechMode={czechMode} grip={re.grip(i)} dragging={re.dragIdx===i} over={re.overIdx===i && re.dragIdx!==i}/>)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════════════════════════
function SettingsScreen({ plants, isDesktop, gardenKey, gardenHistory, onRemoveHistory, onSetGardenKey, onRenameGardenKey, installPrompt, onInstall, darkMode, onToggleDark, gardenPassword, onSavePassword, perenualKey, onSavePerenualKey, housePlantsKey, onSaveHousePlantsKey, anthropicKey, onSaveAnthropicKey, onRecheckAI, aiRecheck, plantIdKey, onSavePlantIdKey, identifyLang, onSetIdentifyLang, defaultEvery, onSetDefaultEvery, globalPrintSize, onSetGlobalSize, monochromePrint, onToggleMono, googleClientId, onSaveGoogleClientId, googleToken, onConnectGoogle, onSyncCalendar, onDisconnectGoogle, googleSyncMode, onSetGoogleSyncMode, reminderTime, onSetReminderTime, onUpdateApp, onExport, onImport, cardDensity, onSetDensity, hideHealthy, onToggleHideHealthy, reduceMotion, onToggleReduceMotion, confirmDelete, onToggleConfirmDelete, haptics, onToggleHaptics, defaultTab, onSetDefaultTab, swipeNav, onToggleSwipeNav, onWaterAll, onDevOffsetDays, onDevSetDays, onDevLoadNode, onDevPushNode, navConfig, onSetNavConfig, navLabels, onToggleNavLabels, gridCols, onSetGridCols, sidebar, onSetSidebar, palette, onSetPalette, doctorModel, onSetDoctorModel }) {
  const [openSecs, setOpenSecs] = useState(() => GS.get('caulis_set_open', {}));
  const isOpen = (id) => openSecs[id] !== false;
  const toggleSec = (id) => setOpenSecs(s => { const n = { ...s, [id]: s[id] === false }; GS.set('caulis_set_open', n); return n; });
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [housePlantsInput, setHousePlantsInput] = useState('');
  const [housePlantsSaved, setHousePlantsSaved] = useState(false);
  const [plantIdInput, setPlantIdInput] = useState('');
  const [plantIdSaved, setPlantIdSaved] = useState(false);
  const [anthropicInput, setAnthropicInput] = useState('');
  const [anthropicSaved, setAnthropicSaved] = useState(false);
  const [gcalInput, setGcalInput] = useState('');
  const [gcalSaved, setGcalSaved] = useState(false);
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importErr, setImportErr] = useState(false);
  const [imported, setImported] = useState(false);
  const importRef = useRef(null);
  const onImportFile = (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    setImportErr(false);
    const reader = new FileReader();
    reader.onload = ev => {
      try { const d = JSON.parse(ev.target.result); if (!d || !Array.isArray(d.plants)) throw 0; setImportData(d); }
      catch(_) { setImportErr(true); }
    };
    reader.readAsText(f);
  };
  const doImport = (mode) => { if (onImport(importData, mode)) { setImportData(null); setImported(true); setTimeout(()=>setImported(false), 1800); } };
  const handleGcalSync = async () => { setGcalSyncing(true); await onSyncCalendar(); setGcalSyncing(false); };
  const sp = isDesktop ? 28 : 18;

  const [renaming, setRenaming] = useState(false);
  const [renameKey, setRenameKey] = useState('');
  const [renameStatus, setRenameStatus] = useState('idle');
  const [joining, setJoining] = useState(false);
  const [joinKey, setJoinKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinStatus, setJoinStatus] = useState('idle'); // 'idle' | 'checking' | 'notFound'

  const [devRevealed, setDevRevealed] = useState(() => { try { return localStorage.getItem('caulis_dev_revealed') === '1'; } catch(e) { return false; } });
  const [verTaps, setVerTaps] = useState(0);
  const verTapTimer = useRef(null);
  const tapVersion = () => {
    if (devRevealed) return;
    if (verTapTimer.current) clearTimeout(verTapTimer.current);
    verTapTimer.current = setTimeout(() => setVerTaps(0), 1500);
    setVerTaps(t => { const n = t + 1; if (n >= 7) { try { localStorage.setItem('caulis_dev_revealed', '1'); } catch(e) {} setDevRevealed(true); } return n; });
  };
  const [devAuthed, setDevAuthed] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinErr, setPinErr] = useState(false);
  const submitPin = () => {
    let stored = ''; try { stored = localStorage.getItem('caulis_dev_pin') || ''; } catch(e) {}
    if (!stored) { try { localStorage.setItem('caulis_dev_pin', pinInput); } catch(e) {} setDevAuthed(true); setPinInput(''); return; }
    if (pinInput === stored) { setDevAuthed(true); setPinInput(''); setPinErr(false); } else { setPinErr(true); }
  };
  const lockDev = () => { try { localStorage.removeItem('caulis_dev_revealed'); } catch(e) {} setDevRevealed(false); setDevAuthed(false); setVerTaps(0); };
  const [devOffsetN, setDevOffsetN] = useState(1);
  const [nodeKey, setNodeKey] = useState('');
  const [nodePw, setNodePw] = useState('');
  const [nodeLoaded, setNodeLoaded] = useState(null); // { node, data, plants }
  const [nodeStatus, setNodeStatus] = useState('idle'); // idle|loading|loaded|empty|error|pushing|pushed
  const [nodeOffsetN, setNodeOffsetN] = useState(1);
  const loadNode = async () => {
    if (!nodeKey.trim()) return;
    setNodeStatus('loading');
    try {
      const { node, data } = await onDevLoadNode(nodeKey.trim(), nodePw);
      if (!data || !Array.isArray(data.plants)) { setNodeLoaded({ node, data: data || {}, plants: [] }); setNodeStatus('empty'); return; }
      setNodeLoaded({ node, data, plants: data.plants.map(p => ({ ...p })) });
      setNodeStatus('loaded');
    } catch(e) { setNodeStatus('error'); }
  };
  const nodeShiftAll = (n) => setNodeLoaded(nl => nl && ({ ...nl, plants: nl.plants.map(p => { const wa = (typeof p.wateredAt === 'number' ? p.wateredAt : todayMidnight()) - n * 86400000; return { ...p, wateredAt: wa, wv: WATER_SCHEMA, days: daysSinceMidnight(wa) }; }) }));
  const nodeWaterAll = () => setNodeLoaded(nl => nl && ({ ...nl, plants: nl.plants.map(p => { const wa = todayMidnight(); return { ...p, wateredAt: wa, wv: WATER_SCHEMA, days: 0, history: [...(p.history||[]), fmtLocalDate(new Date())].slice(-60) }; }) }));
  const nodeSetDays = (id, d) => setNodeLoaded(nl => nl && ({ ...nl, plants: nl.plants.map(p => { if (p.id !== id) return p; const dd = Math.max(0, d | 0); const wa = todayMidnight() - dd * 86400000; return { ...p, wateredAt: wa, wv: WATER_SCHEMA, days: dd }; }) }));
  const pushNode = () => {
    if (!nodeLoaded) return;
    setNodeStatus('pushing');
    const clean = nodeLoaded.plants.map(({ photos, userImage, ...rest }) => rest);
    onDevPushNode(nodeLoaded.node, { ...nodeLoaded.data, plants: clean });
    setNodeStatus('pushed'); setTimeout(() => setNodeStatus('loaded'), 1800);
  };

  const copyKey = () => {
    navigator.clipboard.writeText(gardenKey).catch(()=>{});
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const checkRename = async () => {
    const k = renameKey.trim();
    if (!k || k === gardenKey) return;
    setRenameStatus('checking');
    const node = await gardenNodeId(k, gardenPassword);
    const exists = await gardenExists(node);
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

  const resetJoin = () => { setJoining(false); setJoinKey(''); setJoinPassword(''); setJoinStatus('idle'); };

  // single step: key + (optional) password derive the node. If nothing is
  // stored there, the key/password pair is wrong or the garden is empty.
  const submitJoin = async (force = false) => {
    const k = joinKey.trim();
    if (!k) return;
    if (FIREBASE_READY && !force) {
      setJoinStatus('checking');
      const node = await gardenNodeId(k, joinPassword);
      const data = await fetchGardenOnce(node);
      if (!data) { setJoinStatus('notFound'); return; }
    }
    onSetGardenKey(k, joinPassword); resetJoin();
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
        <SettingsSection title="Appearance" open={isOpen('appearance')} onToggle={()=>toggleSec('appearance')}>
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
            <div style={{ padding:'12px 16px', borderTop:C.hair }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Accent color</div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1, marginBottom:10 }}>Theme color for buttons, icons &amp; highlights</div>
              <div style={{ display:'flex', gap:10 }}>
                {PALETTE_ORDER.map(key => {
                  const p = PALETTES[key]; const on = palette === key;
                  return (
                    <div key={key} onClick={()=>onSetPalette(key)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer' }}>
                      <div style={{ width:34, height:34, borderRadius:999, background:p.swatch, boxShadow: on ? `0 0 0 2px ${C.bg}, 0 0 0 4px ${p.swatch}` : '0 1px 3px rgba(43,42,38,0.18)', transition:'box-shadow 160ms ease' }}/>
                      <span style={{ fontFamily:FONT_SANS, fontSize:10.5, fontWeight: on?600:500, color: on?C.forest:C.brown, opacity: on?1:0.7 }}>{p.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div onClick={onToggleReduceMotion} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:C.hair, cursor:'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Reduce motion</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.65, marginTop:1 }}>Disable swipe &amp; transition animations</div>
              </div>
              <div style={{ width:44, height:26, borderRadius:999, background:reduceMotion?C.forest:'rgba(45,80,22,0.14)', position:'relative', transition:'background 200ms', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:reduceMotion?21:3, width:20, height:20, borderRadius:999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 200ms' }}/>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:C.hair }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Card density</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Garden grid layout</div>
              </div>
              <div style={{ display:'flex', background:'rgba(45,80,22,0.07)', borderRadius:9, padding:3 }}>
                {[['comfy','Comfy'],['compact','Compact']].map(([val,label]) => {
                  const on = cardDensity === val;
                  return (
                    <div key={val} onClick={()=>onSetDensity(val)} style={{ cursor:'pointer', padding:'5px 12px', borderRadius:6, background:on?C.forest:'transparent', color:on?'#fff':C.ink, fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, opacity:on?1:0.5, transition:'all 140ms ease' }}>{label}</div>
                  );
                })}
              </div>
            </div>
            {!isDesktop && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:C.hair }}>
                <div>
                  <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Garden columns</div>
                  <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Override the grid width</div>
                </div>
                <div style={{ display:'flex', background:'rgba(45,80,22,0.07)', borderRadius:9, padding:3 }}>
                  {[[0,'Auto'],[2,'2'],[3,'3'],[4,'4']].map(([val,label]) => {
                    const on = (gridCols || 0) === val;
                    return (
                      <div key={val} onClick={()=>onSetGridCols(val)} style={{ cursor:'pointer', padding:'5px 11px', borderRadius:6, background:on?C.forest:'transparent', color:on?'#fff':C.ink, fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, opacity:on?1:0.5, transition:'all 140ms ease' }}>{label}</div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SettingsSection>
        <SettingsSection title="Garden" open={isOpen('garden')} onToggle={()=>toggleSec('garden')}>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden' }}>
            <Row label="Plants tracked" value={String(plants.length)}/>
            <Row label="Locations" value={String(new Set(plants.map(p=>p.location)).size)}/>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Default watering</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>For new plants without species data</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div onClick={()=>onSetDefaultEvery(Math.max(1, defaultEvery - 1))} style={{ width:28, height:28, borderRadius:8, background:'rgba(45,80,22,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:18, color:C.forest, fontWeight:500, userSelect:'none', WebkitUserSelect:'none' }}>−</div>
                <span style={{ fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:C.ink, minWidth:38, textAlign:'center' }}>{defaultEvery}d</span>
                <div onClick={()=>onSetDefaultEvery(Math.min(365, defaultEvery + 1))} style={{ width:28, height:28, borderRadius:8, background:'rgba(45,80,22,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:18, color:C.forest, fontWeight:500, userSelect:'none', WebkitUserSelect:'none' }}>+</div>
              </div>
            </div>
            <div onClick={onToggleHideHealthy} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:C.hair, cursor:'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Hide healthy plants</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Garden shows only soon &amp; thirsty plants</div>
              </div>
              <div style={{ width:44, height:26, borderRadius:999, background:hideHealthy?C.forest:'rgba(45,80,22,0.14)', position:'relative', transition:'background 200ms', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:hideHealthy?21:3, width:20, height:20, borderRadius:999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 200ms' }}/>
              </div>
            </div>
            <div style={{ padding:'12px 16px', borderTop:C.hair }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Opens on launch</div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1, marginBottom:9 }}>Tab shown when you start Caulis</div>
              <div style={{ display:'flex', gap:6, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                {(() => {
                  const seen = new Set();
                  const tabs = normalizeNav(navConfig).filter(s => s.action !== 'empty' && NAV_ACTIONS[s.action] && NAV_ACTIONS[s.action].tab && (seen.has(s.action) ? false : seen.add(s.action)));
                  return tabs.map(s => {
                    const on = defaultTab === s.action;
                    return <div key={s.action} onClick={()=>onSetDefaultTab(s.action)} style={{ flexShrink:0, cursor:'pointer', padding:'6px 13px', borderRadius:999, background:on?C.forest:C.input, color:on?'#fff':C.ink, fontFamily:FONT_SANS, fontSize:12, fontWeight:on?600:500, transition:'all 140ms ease' }}>{navLabel(s)}</div>;
                  });
                })()}
              </div>
            </div>
          </div>
        </SettingsSection>
        <SettingsSection title="Behavior" open={isOpen('behavior')} onToggle={()=>toggleSec('behavior')}>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden' }}>
            <div onClick={onToggleConfirmDelete} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', cursor:'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Confirm before delete</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Ask before removing a plant</div>
              </div>
              <div style={{ width:44, height:26, borderRadius:999, background:confirmDelete?C.forest:'rgba(45,80,22,0.14)', position:'relative', transition:'background 200ms', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:confirmDelete?21:3, width:20, height:20, borderRadius:999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 200ms' }}/>
              </div>
            </div>
            <div onClick={onToggleSwipeNav} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:C.hair, cursor:'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Swipe between tabs</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Horizontal swipe switches screens (mobile)</div>
              </div>
              <div style={{ width:44, height:26, borderRadius:999, background:swipeNav?C.forest:'rgba(45,80,22,0.14)', position:'relative', transition:'background 200ms', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:swipeNav?21:3, width:20, height:20, borderRadius:999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 200ms' }}/>
              </div>
            </div>
            <div onClick={onToggleHaptics} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:C.hair, cursor:'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Haptics</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Vibrate on water, snooze &amp; delete (mobile)</div>
              </div>
              <div style={{ width:44, height:26, borderRadius:999, background:haptics?C.forest:'rgba(45,80,22,0.14)', position:'relative', transition:'background 200ms', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:haptics?21:3, width:20, height:20, borderRadius:999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 200ms' }}/>
              </div>
            </div>
          </div>
        </SettingsSection>
        <SettingsSection title="Notifications" open={isOpen('notif')} onToggle={()=>toggleSec('notif')}>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:C.hair }}>
              <span style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Watering reminders</span><Toggle on/>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
              <span style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Weekly garden digest</span><Toggle/>
            </div>
          </div>
        </SettingsSection>
        <SettingsSection title="Printing" open={isOpen('printing')} onToggle={()=>toggleSec('printing')}>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:C.hair }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Label size</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>{globalPrintSize} × {globalPrintSize} mm default</div>
              </div>
              <div style={{ display:'flex', background:'rgba(45,80,22,0.07)', borderRadius:9, padding:3 }}>
                {PRINT_SIZES.map(([label, mm]) => {
                  const on = globalPrintSize === mm;
                  return (
                    <div key={label} onClick={()=>onSetGlobalSize(mm)} style={{
                      cursor:'pointer', width:32, height:26, borderRadius:6,
                      background: on ? C.forest : 'transparent',
                      color: on ? '#fff' : C.ink,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600,
                      opacity: on ? 1 : 0.45, transition:'all 140ms ease',
                    }}>{label}</div>
                  );
                })}
              </div>
            </div>
            <div onClick={onToggleMono} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', cursor:'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Monochrome</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Black &amp; white output</div>
              </div>
              <div style={{ width:44, height:26, borderRadius:999, background: monochromePrint ? C.forest : 'rgba(45,80,22,0.14)', position:'relative', transition:'background 200ms', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left: monochromePrint ? 21 : 3, width:20, height:20, borderRadius:999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 200ms' }}/>
              </div>
            </div>
          </div>
        </SettingsSection>
        <SettingsSection title="Plant data" open={isOpen('data')} onToggle={()=>toggleSec('data')}>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden', padding:'14px 16px', display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <div style={{ fontFamily:FONT_SANS, fontSize:12, fontWeight:600, color:C.ink, opacity:0.7, marginBottom:6 }}>Perenual — species photos &amp; care data</div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={key} onChange={e=>setKey(e.target.value)} placeholder="API key"
                  style={{ flex:1, boxSizing:'border-box', height:42, borderRadius:11, border:'1px solid rgba(45,80,22,0.14)', background:C.input, padding:'0 13px', fontFamily:'ui-monospace, Menlo, monospace', fontSize:12.5, color:C.ink, outline:'none' }}/>
                <div onClick={()=>{ onSavePerenualKey(key.trim()); setSaved(true); setTimeout(()=>setSaved(false),1800); }} style={{ flexShrink:0, padding:'0 14px', height:42, borderRadius:11, background: saved?C.sage:C.forest, color:'#fff', display:'flex', alignItems:'center', gap:6, cursor:'pointer', transition:'background 200ms' }}>
                  {saved && <IconCheck s={14}/>}
                  <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>{saved?'Saved':'Save'}</span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
                <span style={{ width:7, height:7, borderRadius:999, background: perenualKey ? C.sage : C.brown, opacity: perenualKey ? 1 : 0.4, flexShrink:0 }}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.6 }}>{perenualKey ? 'Live mode' : 'Using built-in library'}</span>
              </div>
            </div>
            <div style={{ height:'0.5px', background:'rgba(45,80,22,0.08)' }}/>
            <div>
              <div style={{ fontFamily:FONT_SANS, fontSize:12, fontWeight:600, color:C.ink, opacity:0.7, marginBottom:4 }}>House Plants API — fallback data</div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.5, lineHeight:1.5, marginBottom:8 }}>RapidAPI key for FreeWebApi House Plants. Used when Perenual hits rate limits.</div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={housePlantsInput} onChange={e=>setHousePlantsInput(e.target.value)} placeholder="RapidAPI key"
                  style={{ flex:1, boxSizing:'border-box', height:42, borderRadius:11, border:'1px solid rgba(45,80,22,0.14)', background:C.input, padding:'0 13px', fontFamily:'ui-monospace, Menlo, monospace', fontSize:12.5, color:C.ink, outline:'none' }}/>
                <div onClick={()=>{ onSaveHousePlantsKey(housePlantsInput.trim()); setHousePlantsSaved(true); setTimeout(()=>setHousePlantsSaved(false),1800); }} style={{ flexShrink:0, padding:'0 14px', height:42, borderRadius:11, background: housePlantsSaved?C.sage:C.forest, color:'#fff', display:'flex', alignItems:'center', gap:6, cursor:'pointer', transition:'background 200ms' }}>
                  {housePlantsSaved && <IconCheck s={14}/>}
                  <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>{housePlantsSaved?'Saved':'Save'}</span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
                <span style={{ width:7, height:7, borderRadius:999, background: housePlantsKey ? C.sage : C.brown, opacity: housePlantsKey ? 1 : 0.4, flexShrink:0 }}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.6 }}>{housePlantsKey ? 'Fallback active' : 'Not configured — Wikipedia images used as last resort'}</span>
              </div>
            </div>
            <div style={{ height:'0.5px', background:'rgba(45,80,22,0.08)' }}/>
            <div>
              <div style={{ fontFamily:FONT_SANS, fontSize:12, fontWeight:600, color:C.ink, opacity:0.7, marginBottom:6 }}>PlantNet — photo identification</div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={plantIdInput} onChange={e=>setPlantIdInput(e.target.value)} placeholder="API key"
                  style={{ flex:1, boxSizing:'border-box', height:42, borderRadius:11, border:'1px solid rgba(45,80,22,0.14)', background:C.input, padding:'0 13px', fontFamily:'ui-monospace, Menlo, monospace', fontSize:12.5, color:C.ink, outline:'none' }}/>
                <div onClick={()=>{ onSavePlantIdKey(plantIdInput.trim()); setPlantIdSaved(true); setTimeout(()=>setPlantIdSaved(false),1800); }} style={{ flexShrink:0, padding:'0 14px', height:42, borderRadius:11, background: plantIdSaved?C.sage:C.forest, color:'#fff', display:'flex', alignItems:'center', gap:6, cursor:'pointer', transition:'background 200ms' }}>
                  {plantIdSaved && <IconCheck s={14}/>}
                  <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>{plantIdSaved?'Saved':'Save'}</span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
                <span style={{ width:7, height:7, borderRadius:999, background: plantIdKey ? C.sage : C.brown, opacity: plantIdKey ? 1 : 0.4, flexShrink:0 }}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.6 }}>{plantIdKey ? 'Identification active' : 'No key — using demo mode'}</span>
              </div>
            </div>
            <div style={{ height:'0.5px', background:'rgba(45,80,22,0.08)' }}/>
            <div>
              <div style={{ fontFamily:FONT_SANS, fontSize:12, fontWeight:600, color:C.ink, opacity:0.7, marginBottom:4 }}>Claude — AI care review</div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.5, lineHeight:1.5, marginBottom:8 }}>Anthropic API key. Claude reviews &amp; corrects species care data on identify — filling gaps and fixing wrong watering intervals. Key is stored on this device; expose only in a prototype.</div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={anthropicInput} onChange={e=>setAnthropicInput(e.target.value)} placeholder="sk-ant-…"
                  style={{ flex:1, boxSizing:'border-box', height:42, borderRadius:11, border:'1px solid rgba(45,80,22,0.14)', background:C.input, padding:'0 13px', fontFamily:'ui-monospace, Menlo, monospace', fontSize:12.5, color:C.ink, outline:'none' }}/>
                <div onClick={()=>{ onSaveAnthropicKey(anthropicInput.trim()); setAnthropicSaved(true); setTimeout(()=>setAnthropicSaved(false),1800); }} style={{ flexShrink:0, padding:'0 14px', height:42, borderRadius:11, background: anthropicSaved?C.sage:C.forest, color:'#fff', display:'flex', alignItems:'center', gap:6, cursor:'pointer', transition:'background 200ms' }}>
                  {anthropicSaved && <IconCheck s={14}/>}
                  <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>{anthropicSaved?'Saved':'Save'}</span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
                <span style={{ width:7, height:7, borderRadius:999, background: anthropicKey ? C.sage : C.brown, opacity: anthropicKey ? 1 : 0.4, flexShrink:0 }}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.6 }}>{anthropicKey ? 'AI review active' : 'No key — using raw source data'}</span>
              </div>
              {anthropicKey && (plants || []).some(p => !p.aiV) && (() => {
                const pending = (plants || []).filter(p => !p.aiV).length;
                const busy = aiRecheck && aiRecheck.busy;
                return (
                  <div onClick={busy ? undefined : onRecheckAI} style={{ marginTop:12, padding:'11px 14px', borderRadius:12, border:`1px solid ${C.forest}`, background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor: busy?'default':'pointer', opacity: busy?0.65:1 }}>
                    <LeafOutline size={14} color={C.forest} sw={1.7}/>
                    <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600, color:C.forest }}>
                      {busy ? `Reviewing… ${aiRecheck.done}/${aiRecheck.total}` : `Recheck ${pending} older plant${pending===1?'':'s'} with AI`}
                    </span>
                  </div>
                );
              })()}
              <div style={{ marginTop:14 }}>
                <div style={{ fontFamily:FONT_SANS, fontSize:12, fontWeight:600, color:C.ink, opacity:0.7, marginBottom:2 }}>Doctor model</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.6, marginBottom:8 }}>Haiku is cheapest; Sonnet reads photos more carefully.</div>
                <div style={{ display:'flex', background:'rgba(45,80,22,0.07)', borderRadius:9, padding:3, alignSelf:'flex-start', width:'fit-content' }}>
                  {[['claude-haiku-4-5','Haiku'],['claude-sonnet-4-6','Sonnet']].map(([id, label]) => {
                    const on = (doctorModel || 'claude-haiku-4-5') === id;
                    return (
                      <div key={id} onClick={()=>onSetDoctorModel(id)} style={{ cursor:'pointer', padding:'5px 16px', borderRadius:6, background: on ? C.forest : 'transparent', fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color: on ? '#fff' : C.brown, transition:'background 180ms' }}>{label}</div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{ height:'0.5px', background:'rgba(45,80,22,0.08)' }}/>
            <div>
              <div style={{ fontFamily:FONT_SANS, fontSize:12, fontWeight:600, color:C.ink, opacity:0.7, marginBottom:8 }}>Name language</div>
              <div style={{ display:'flex', background:'rgba(45,80,22,0.07)', borderRadius:9, padding:3, alignSelf:'flex-start', width:'fit-content' }}>
                {[['en','English'],['cs','Česky']].map(([code, label]) => {
                  const on = identifyLang === code;
                  return (
                    <div key={code} onClick={()=>onSetIdentifyLang(code)} style={{
                      cursor:'pointer', padding:'5px 16px', borderRadius:6,
                      background: on ? C.forest : 'transparent',
                      color: on ? '#fff' : C.ink,
                      fontFamily:FONT_SANS, fontSize:13, fontWeight:600,
                      opacity: on ? 1 : 0.45, transition:'all 140ms ease',
                    }}>{label}</div>
                  );
                })}
              </div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.5, marginTop:7, lineHeight:1.5 }}>
                {identifyLang === 'cs' ? 'Identified names filled in Czech. Care data stays in English.' : 'Identified names filled in English.'}
              </div>
            </div>
          </div>
        </SettingsSection>
        {(installPrompt || /iphone|ipad|ipod/i.test(navigator.userAgent)) && (
          <SettingsSection title="App" open={isOpen('app')} onToggle={()=>toggleSec('app')}>
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
          </SettingsSection>
        )}
        <SettingsSection title="Google sync" open={isOpen('google')} onToggle={()=>toggleSec('google')}>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden', padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <div style={{ fontFamily:FONT_SANS, fontSize:12, fontWeight:600, color:C.ink, opacity:0.7, marginBottom:6 }}>Sync to</div>
              <div style={{ display:'flex', background:'rgba(45,80,22,0.07)', borderRadius:10, padding:3 }}>
                {[['tasks','Tasks'],['calendar','Calendar']].map(([val,label]) => {
                  const on = googleSyncMode === val;
                  return (
                    <div key={val} onClick={()=>onSetGoogleSyncMode(val)} style={{ flex:1, height:32, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', background: on?C.forest:'transparent', color: on?'#fff':C.ink, opacity: on?1:0.5, fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, transition:'all 140ms ease' }}>{label}</div>
                  );
                })}
              </div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11, color:C.ink, opacity:0.5, lineHeight:1.5, marginTop:6 }}>{googleSyncMode === 'calendar' ? `Own togglable "Caulis Plants" calendar, recurring reminders at ${reminderTime}.` : 'Checkable tasks in a "Caulis Plants" list. Tick them off in Google.'}</div>
            </div>
            {googleSyncMode === 'calendar' && (() => {
              const [h, m] = (reminderTime || '09:00').split(':').map(Number);
              const step = (dir) => { let t = h*60 + m + dir*30; t = Math.max(0, Math.min(1410, t)); onSetReminderTime(`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`); };
              const Btn = ({label, on}) => <div onClick={on} style={{ width:36, height:36, borderRadius:10, background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:18, fontWeight:600 }}>{label}</div>;
              return (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <span style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink }}>Reminder time</span>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <Btn label="−" on={()=>step(-1)}/>
                    <span style={{ minWidth:52, textAlign:'center', fontFamily:FONT_SANS, fontSize:15, fontWeight:600, color:C.ink }}>{reminderTime}</span>
                    <Btn label="+" on={()=>step(1)}/>
                  </div>
                </div>
              );
            })()}
            <div style={{ height:'0.5px', background:'rgba(45,80,22,0.08)' }}/>
            {!googleToken ? (<>
              <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.62, lineHeight:1.5 }}>Paste your OAuth 2.0 web client ID from Google Cloud Console.</div>
              <div style={{ display:'flex', gap:8 }}>
                <input value={gcalInput} onChange={e=>setGcalInput(e.target.value)} placeholder="OAuth client ID"
                  style={{ flex:1, boxSizing:'border-box', height:42, borderRadius:11, border:C.hair, background:C.input, padding:'0 12px', fontFamily:'ui-monospace,Menlo,monospace', fontSize:11.5, color:C.ink, outline:'none' }}/>
                <div onClick={()=>{ onSaveGoogleClientId(gcalInput.trim()); setGcalSaved(true); setTimeout(()=>setGcalSaved(false),1800); }} style={{ flexShrink:0, padding:'0 14px', height:42, borderRadius:11, background: gcalSaved?C.sage:C.forest, color:'#fff', display:'flex', alignItems:'center', gap:6, cursor:'pointer', transition:'background 200ms' }}>
                  {gcalSaved && <IconCheck s={14}/>}
                  <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>{gcalSaved?'Saved':'Save'}</span>
                </div>
              </div>
              {googleClientId && (
                <div onClick={onConnectGoogle} style={{ height:42, borderRadius:12, background:C.forest, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:9, cursor:'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="#fff" strokeWidth="1.7"/><path d="M3 9h18" stroke="#fff" strokeWidth="1.7"/><path d="M8 2v4M16 2v4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"/></svg>
                  <span style={{ fontFamily:FONT_SANS, fontSize:14, fontWeight:600 }}>Connect Google {googleSyncMode === 'calendar' ? 'Calendar' : 'Tasks'}</span>
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:7, height:7, borderRadius:999, background: googleClientId ? STATUS.soon.dot : C.brown, opacity: googleClientId ? 1 : 0.4, flexShrink:0 }}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.6 }}>{googleClientId ? 'Client ID saved — tap Connect' : 'Not configured'}</span>
              </div>
            </>) : (<>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:8, height:8, borderRadius:999, background:C.sage, flexShrink:0 }}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink, flex:1 }}>Connected</span>
                <div onClick={onDisconnectGoogle} style={{ padding:'6px 13px', borderRadius:10, background:'rgba(180,71,46,0.1)', cursor:'pointer', fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:'#B4472E' }}>Disconnect</div>
              </div>
              <div onClick={handleGcalSync} style={{ height:42, borderRadius:12, background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', gap:9, cursor:'pointer' }}>
                {gcalSyncing
                  ? <div style={{ width:16, height:16, borderRadius:999, border:`2px solid rgba(45,80,22,0.2)`, borderTopColor:C.forest, animation:'spin 0.9s linear infinite' }}/>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 018-8 8 8 0 016.9 4" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round"/><path d="M20 12a8 8 0 01-8 8 8 8 0 01-6.9-4" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round"/><path d="M18 4l2 3h-3M6 20l-2-3h3" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                }
                <span style={{ fontFamily:FONT_SANS, fontSize:14, fontWeight:600 }}>{gcalSyncing ? 'Syncing…' : (googleSyncMode === 'calendar' ? 'Sync all reminders' : 'Sync all tasks')}</span>
              </div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.5, lineHeight:1.5 }}>{googleSyncMode === 'calendar' ? `Recurring reminders update when you mark a plant as watered, at ${reminderTime} on the optimal day.` : 'Tasks update when you mark a plant as watered, due on the optimal day. Switching mode re-syncs everything.'}</div>
            </>)}
          </div>
        </SettingsSection>
        <SettingsSection title="Cloud sync" open={isOpen('cloud')} onToggle={()=>toggleSec('cloud')}>
          {!FIREBASE_READY && (
            <div style={{ background:C.panel, borderRadius:18, border:C.hair, padding:'14px 16px' }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.62, lineHeight:1.5 }}>Firebase not configured. Fill in FIREBASE_CONFIG in caulis-firebase.jsx.</div>
            </div>
          )}
          {FIREBASE_READY && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom:C.hair }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:FONT_SANS, fontSize:10.5, fontWeight:600, color:C.brown, opacity:0.55, letterSpacing:0.4, textTransform:'uppercase', marginBottom:3 }}>Garden key</div>
                    <div style={{ fontFamily:'ui-monospace,Menlo,monospace', fontSize:13.5, color:C.forest, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{gardenKey}</div>
                  </div>
                  <div onClick={copyKey} style={{ flexShrink:0, width:34, height:34, borderRadius:10, background: copied ? C.sage : 'rgba(45,80,22,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 160ms' }}>
                    {copied
                      ? <IconCheck s={15} c="#fff"/>
                      : <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="5.5" y="5.5" width="9" height="9" rx="2" stroke={C.forest} strokeWidth="1.4"/><path d="M3.5 10.5H2.5a1 1 0 01-1-1v-7a1 1 0 011-1h7a1 1 0 011 1v1" stroke={C.forest} strokeWidth="1.4"/></svg>
                    }
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:FONT_SANS, fontSize:10.5, fontWeight:600, color:C.brown, opacity:0.55, letterSpacing:0.4, textTransform:'uppercase', marginBottom:3 }}>Password</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:13.5, color: gardenPassword ? C.forest : C.ink, opacity: gardenPassword ? 1 : 0.35 }}>{gardenPassword ? 'Protected' : 'None'}</div>
                  </div>
                  {!settingPassword && (
                    <div onClick={()=>{ setSettingPassword(true); setNewPassword(''); }} style={{ flexShrink:0, padding:'6px 14px', borderRadius:10, background:'rgba(45,80,22,0.08)', cursor:'pointer', fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.forest }}>
                      {gardenPassword ? 'Change' : 'Set'}
                    </div>
                  )}
                </div>
                {settingPassword && (
                  <div style={{ padding:'0 16px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.55, lineHeight:1.5 }}>
                      {gardenPassword ? 'New password. Leave empty to remove protection.' : 'Prevent others from joining without a password.'}
                    </div>
                    <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Password…"
                      style={{ boxSizing:'border-box', height:42, borderRadius:10, border:C.hair, background:C.input, padding:'0 12px', fontFamily:FONT_SANS, fontSize:14, color:C.ink, outline:'none' }}/>
                    <div style={{ display:'flex', gap:8 }}>
                      <div onClick={()=>{ setSettingPassword(false); setNewPassword(''); }} style={{ flex:1, height:36, borderRadius:10, border:C.hair, color:C.brown, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13 }}>Cancel</div>
                      <div onClick={()=>{ onSavePassword(newPassword.trim()); setSettingPassword(false); setNewPassword(''); }} style={{ flex:2, height:36, borderRadius:10, background:C.forest, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Save</div>
                    </div>
                  </div>
                )}
              </div>
              {!renaming && !joining && (
                <div style={{ display:'flex', gap:8 }}>
                  <div onClick={()=>{ setRenaming(true); setRenameKey(''); setRenameStatus('idle'); }} style={{ flex:1, height:38, borderRadius:12, background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Rename</div>
                  <div onClick={()=>{ setJoining(true); setJoinKey(''); setJoinPassword(''); setJoinStatus('idle'); }} style={{ flex:1, height:38, borderRadius:12, background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Join garden</div>
                </div>
              )}
              {renaming && (
                <div style={{ background:C.panel, borderRadius:14, border:C.hair, padding:'14px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.6 }}>Rename keeps your current plants under a new key.</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <input value={renameKey} onChange={e=>{ setRenameKey(e.target.value); setRenameStatus('idle'); }} onKeyDown={e=>{ if(e.key==='Enter') checkRename(); }} placeholder="new-garden-name"
                      style={{ flex:1, boxSizing:'border-box', height:42, borderRadius:10, border:C.hair, background:C.input, padding:'0 12px', fontFamily:'ui-monospace,Menlo,monospace', fontSize:12.5, color:C.ink, outline:'none' }}/>
                    <div onClick={checkRename} style={{ flexShrink:0, padding:'0 14px', height:42, borderRadius:10, background:'rgba(45,80,22,0.1)', color:C.forest, display:'flex', alignItems:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Check</div>
                  </div>
                  {renameStatus==='checking' && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.7 }}>Checking…</div>}
                  {renameStatus==='available' && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:'#6E9A3E' }}>✓ Available</div>}
                  {renameStatus==='taken' && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:'#B4472E' }}>⚠ Key already taken — renaming will overwrite it.</div>}
                  {renameStatus==='error' && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:'#B4472E' }}>Something went wrong. Try again.</div>}
                  {renameStatus==='done' && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:'#6E9A3E' }}>✓ Renamed</div>}
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
                <div style={{ background:C.panel, borderRadius:14, border:C.hair, padding:'14px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.6 }}>
                    {joinStatus==='notFound' ? "No garden found. Create it now?" : "Enter the garden key and its password (if any). Your current plants will be replaced."}
                  </div>
                  <input value={joinKey} onChange={e=>{ setJoinKey(e.target.value); setJoinStatus('idle'); }} placeholder="garden-key"
                    style={{ boxSizing:'border-box', height:42, borderRadius:10, border:C.hair, background:C.input, padding:'0 12px', fontFamily:'ui-monospace,Menlo,monospace', fontSize:12.5, color:C.ink, outline:'none' }}/>
                  <input type="password" value={joinPassword} onChange={e=>{ setJoinPassword(e.target.value); setJoinStatus('idle'); }} onKeyDown={e=>{ if(e.key==='Enter') submitJoin(); }} placeholder="Password (leave empty if none)"
                    style={{ boxSizing:'border-box', height:42, borderRadius:10, border:C.hair, background:C.input, padding:'0 12px', fontFamily:FONT_SANS, fontSize:14, color:C.ink, outline:'none' }}/>
                  {joinStatus==='checking' && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.7 }}>Checking…</div>}
                  <div style={{ display:'flex', gap:8 }}>
                    <div onClick={resetJoin} style={{ flex:1, height:38, borderRadius:10, border:C.hair, color:C.brown, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13 }}>Cancel</div>
                    <div onClick={()=>submitJoin(joinStatus==='notFound')} style={{ flex:2, height:38, borderRadius:10, background:joinStatus==='notFound'?'#C98A2B':C.forest, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>
                      {joinStatus==='notFound'?'Create Garden':'Join'}
                    </div>
                  </div>
                </div>
              )}
              {gardenHistory && gardenHistory.length > 1 && !joining && !renaming && (
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                  <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.5, textTransform:'uppercase', letterSpacing:0.5 }}>Previous Gardens</div>
                  {gardenHistory.map(h => (
                    <div key={h.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div onClick={()=>onSetGardenKey(h.key, h.password)} style={{ flex:1, height:34, padding:'0 12px', borderRadius:8, background:'rgba(45,80,22,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
                        <span style={{ fontFamily:'ui-monospace,Menlo,monospace', fontSize:11, color:h.key===gardenKey?C.forest:C.ink, fontWeight:h.key===gardenKey?600:400 }}>{h.key}</span>
                        {h.key === gardenKey && <span style={{ width:6, height:6, borderRadius:999, background:C.sage }}/>}
                      </div>
                      {h.key !== gardenKey && (
                        <div onClick={()=>onRemoveHistory(h.key)} style={{ width:34, height:34, borderRadius:8, background:'rgba(180,71,46,0.06)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                          <span style={{ fontSize:16, color:'#B4472E', opacity:0.5 }}>×</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:7, height:7, borderRadius:999, background:C.sage, flexShrink:0 }}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.6 }}>Syncing — {gardenKey}</span>
              </div>
            </div>
          )}
        </SettingsSection>
        <SettingsSection title="Backup" open={isOpen('backup')} onToggle={()=>toggleSec('backup')}>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden', padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.6, lineHeight:1.5 }}>Export your whole garden (plants, photos, queue) to a JSON file, or restore from one.</div>
            <input ref={importRef} type="file" accept="application/json,.json" onChange={onImportFile} style={{ display:'none' }}/>
            <div style={{ display:'flex', gap:8 }}>
              <div onClick={onExport} style={{ flex:1, height:42, borderRadius:12, background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12M12 15l-4-4M12 15l4-4" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 20h14" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round"/></svg>
                <span style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600 }}>Export</span>
              </div>
              <div onClick={()=>{ setImportErr(false); importRef.current && importRef.current.click(); }} style={{ flex:1, height:42, borderRadius:12, background: imported?C.sage:'rgba(45,80,22,0.08)', color: imported?'#fff':C.forest, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', transition:'background 200ms' }}>
                {imported ? <IconCheck s={15}/> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15V3M12 3l-4 4M12 3l4 4" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 20h14" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round"/></svg>}
                <span style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600 }}>{imported?'Imported':'Import'}</span>
              </div>
            </div>
            {importErr && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:'#B4472E' }}>Not a valid Caulis export file.</div>}
            {importData && (
              <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'12px', borderRadius:12, background:'rgba(45,80,22,0.05)' }}>
                <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.75, lineHeight:1.5 }}>{importData.plants.length} plants in file. Merge keeps your current plants; Replace overwrites them.</div>
                <div style={{ display:'flex', gap:8 }}>
                  <div onClick={()=>setImportData(null)} style={{ flex:1, height:38, borderRadius:10, border:C.hair, color:C.brown, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13 }}>Cancel</div>
                  <div onClick={()=>doImport('merge')} style={{ flex:1, height:38, borderRadius:10, background:C.forest, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Merge</div>
                  <div onClick={()=>doImport('replace')} style={{ flex:1, height:38, borderRadius:10, background:'#B4472E', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Replace</div>
                </div>
              </div>
            )}
            <a href="docs.html" target="_blank" rel="noopener" style={{ textDecoration:'none', fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.brown, opacity:0.8 }}>View format &amp; API docs ↗</a>
          </div>
        </SettingsSection>
        {(() => {
          const nav = normalizeNav(navConfig);
          const opts = [...NAV_ORDER, 'empty'];
          const cycleAction = (i) => { const idx = opts.indexOf(nav[i].action); const next = opts[(idx + 1) % opts.length]; onSetNavConfig(nav.map((s, j) => j === i ? { ...s, action: next } : s)); };
          const setCenter = (i) => onSetNavConfig(nav.map((s, j) => ({ ...s, center: j === i })));
          const swap = (i, j) => { if (j < 0 || j >= nav.length) return; const out = nav.map(s => ({ ...s })); const t = out[i]; out[i] = out[j]; out[j] = t; onSetNavConfig(out); };
          const removeSlot = (i) => { if (nav.length <= 1) return; onSetNavConfig(nav.filter((_, j) => j !== i)); };
          const addSlot = () => { if (nav.length >= NAV_MAX) return; const used = nav.map(s => s.action); const pick = NAV_ORDER.find(a => !used.includes(a)) || 'garden'; onSetNavConfig([...nav, { action: pick }]); };
          const setLabel = (i, v) => onSetNavConfig(nav.map((s, j) => { if (j !== i) return s; const o = { ...s }; if (v.trim()) o.label = v; else delete o.label; return o; }));
          const setColor = (i, c) => onSetNavConfig(nav.map((s, j) => { if (j !== i) return s; const o = { ...s }; if (c) o.color = c; else delete o.color; return o; }));
          const SLOT_COLORS = ['#2D5016','#15605A','#5A2456','#8A3A1E','#6E9A3E','#C98A2B','#B4472E'];
          const arrow = (dir, enabled, onClick) => (
            <div onClick={enabled ? onClick : undefined} style={{ cursor: enabled ? 'pointer' : 'default', opacity: enabled ? 0.6 : 0.18, lineHeight:1, fontSize:11, color:C.brown, padding:'1px 3px' }}>{dir}</div>
          );
          return (
          <SettingsSection title="Navigation bar" open={isOpen('nav')} onToggle={()=>toggleSec('nav')}>
            <div style={{ background:C.panel, borderRadius:18, border:C.hair, padding:14, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.7, padding:'0 2px 2px' }}>Tap a slot to change its button, reorder with the arrows{isDesktop ? '' : ', pick which one is raised in the center'}, and add up to {NAV_MAX}. The “More” button opens everything not on the bar — so nothing is ever out of reach.</div>
              {nav.map((s, i) => {
                const meta = NAV_ACTIONS[s.action];
                const isEmpty = s.action === 'empty';
                return (
                  <div key={i} style={{ display:'flex', flexDirection:'column', gap:8, padding:'8px 10px', borderRadius:12, background:C.bg }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                        {arrow('▲', i > 0, ()=>swap(i, i-1))}
                        {arrow('▼', i < nav.length-1, ()=>swap(i, i+1))}
                      </div>
                      <div onClick={()=>cycleAction(i)} style={{ flex:1, display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                        {meta
                          ? <meta.Icon s={19} c={s.color || C.forest}/>
                          : <div style={{ width:19, height:19, borderRadius:6, border:`1.5px dashed ${C.line}` }}/>}
                        <span style={{ fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color: isEmpty?C.brown:C.ink, opacity: isEmpty?0.5:1 }}>{meta ? meta.label : 'Empty'}</span>
                      </div>
                      {!isDesktop && (
                        <div onClick={()=> !isEmpty && setCenter(i)} style={{ display:'flex', alignItems:'center', gap:6, cursor: isEmpty?'default':'pointer', opacity: isEmpty?0.3:1 }}>
                          <span style={{ fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.7 }}>Center</span>
                          <div style={{ width:18, height:18, borderRadius:999, border:`2px solid ${s.center?C.forest:C.line}`, background: s.center?C.forest:'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {s.center && <div style={{ width:7, height:7, borderRadius:999, background:'#fff' }}/>}
                          </div>
                        </div>
                      )}
                      <div onClick={()=>removeSlot(i)} style={{ cursor: nav.length>1?'pointer':'default', opacity: nav.length>1?0.5:0.2, color:C.brown, fontSize:18, lineHeight:1, padding:'0 2px' }}>×</div>
                    </div>
                    {!isEmpty && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:28 }}>
                        <input value={s.label || ''} onChange={e=>setLabel(i, e.target.value)} placeholder={meta.label} maxLength={18}
                          style={{ flex:1, minWidth:0, boxSizing:'border-box', height:32, borderRadius:9, border:`1px solid ${C.line}`, background:C.panel, padding:'0 10px', fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, outline:'none' }}/>
                        <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                          <div onClick={()=>setColor(i, null)} title="Default" style={{ width:18, height:18, borderRadius:999, border:`1.5px solid ${!s.color?C.forest:C.line}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                            {!s.color && <div style={{ width:7, height:7, borderRadius:999, background:C.forest }}/>}
                          </div>
                          {SLOT_COLORS.map(c => (
                            <div key={c} onClick={()=>setColor(i, c)} style={{ width:18, height:18, borderRadius:999, background:c, cursor:'pointer', boxShadow: s.color===c ? `0 0 0 1.5px ${C.bg}, 0 0 0 3px ${c}` : 'none' }}/>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:2 }}>
                {nav.length < NAV_MAX && (
                  <div onClick={addSlot} style={{ display:'inline-flex', alignItems:'center', gap:6, fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.forest, cursor:'pointer', padding:'4px 2px' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16"><path d="M8 2.5v11M2.5 8h11" stroke={C.forest} strokeWidth="1.8" strokeLinecap="round"/></svg> Add button
                  </div>
                )}
                <div onClick={()=>onSetNavConfig(DEFAULT_NAV)} style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.brown, opacity:0.7, cursor:'pointer', padding:'4px 2px' }}>Reset to default</div>
              </div>
              <div style={{ borderTop:C.hair, marginTop:4, paddingTop:12 }}>
                <div onClick={onToggleNavLabels} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
                  <div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Show labels</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Text under each {isDesktop ? 'sidebar' : 'bar'} icon</div>
                  </div>
                  <div style={{ width:44, height:26, borderRadius:999, background:navLabels?C.forest:'rgba(45,80,22,0.14)', position:'relative', transition:'background 200ms', flexShrink:0 }}>
                    <div style={{ position:'absolute', top:3, left:navLabels?21:3, width:20, height:20, borderRadius:999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 200ms' }}/>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ background:C.panel, borderRadius:18, border:C.hair, padding:14, display:'flex', flexDirection:'column', gap:12, marginTop:14 }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.6, textTransform:'uppercase' }}>Desktop sidebar</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Position</div>
                <div style={{ display:'flex', background:'rgba(45,80,22,0.07)', borderRadius:9, padding:3 }}>
                  {[['left','Left'],['right','Right']].map(([val,label]) => {
                    const on = (sidebar.side || 'left') === val;
                    return <div key={val} onClick={()=>onSetSidebar({ side: val })} style={{ cursor:'pointer', padding:'5px 12px', borderRadius:6, background:on?C.forest:'transparent', color:on?'#fff':C.ink, fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, opacity:on?1:0.5, transition:'all 140ms ease' }}>{label}</div>;
                  })}
                </div>
              </div>
              <div onClick={()=>onSetSidebar({ collapsed: !sidebar.collapsed })} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Collapse to icons</div>
                <div style={{ width:44, height:26, borderRadius:999, background:sidebar.collapsed?C.forest:'rgba(45,80,22,0.14)', position:'relative', transition:'background 200ms', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:3, left:sidebar.collapsed?21:3, width:20, height:20, borderRadius:999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 200ms' }}/>
                </div>
              </div>
              {!sidebar.collapsed && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Width</div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div onClick={()=>onSetSidebar({ width: Math.max(180, (sidebar.width||220) - 10) })} style={{ width:28, height:28, borderRadius:8, background:'rgba(45,80,22,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:18, color:C.forest, fontWeight:500, userSelect:'none' }}>−</div>
                    <span style={{ fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:C.ink, minWidth:48, textAlign:'center' }}>{sidebar.width||220}px</span>
                    <div onClick={()=>onSetSidebar({ width: Math.min(300, (sidebar.width||220) + 10) })} style={{ width:28, height:28, borderRadius:8, background:'rgba(45,80,22,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:18, color:C.forest, fontWeight:500, userSelect:'none' }}>+</div>
                  </div>
                </div>
              )}
              {!sidebar.collapsed && (
                <div>
                  <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink, marginBottom:8 }}>Footer text</div>
                  <input value={sidebar.footer != null ? sidebar.footer : 'grown with care'} onChange={e=>onSetSidebar({ footer: e.target.value.slice(0, 40) })} placeholder="grown with care"
                    style={{ width:'100%', boxSizing:'border-box', height:38, borderRadius:10, border:`1px solid ${C.line}`, background:C.bg, padding:'0 12px', fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:14, color:C.brown, outline:'none' }}/>
                </div>
              )}
            </div>
          </SettingsSection>
          );
        })()}
        {devRevealed && (() => {
          let pinIsSet = false; try { pinIsSet = !!localStorage.getItem('caulis_dev_pin'); } catch(e) {}
          const dInput = { width:'100%', padding:'11px 13px', borderRadius:12, border:`1px solid ${C.line}`, background:C.bg, fontFamily:FONT_SANS, fontSize:14, color:C.ink, outline:'none', boxSizing:'border-box' };
          const dBtn = (filled) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, padding:'10px 16px', borderRadius:12, cursor:'pointer', fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600, border:`1px solid ${C.forest}`, background: filled?C.forest:'transparent', color: filled?'#fff':C.forest, userSelect:'none' });
          const grpLabel = { fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.6, textTransform:'uppercase', marginBottom:2 };
          const stepper = (val, set) => (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div onClick={()=>set(Math.max(1, val-1))} style={{ ...dBtn(false), padding:'6px 12px', fontSize:16 }}>−</div>
              <span style={{ fontFamily:FONT_SANS, fontSize:15, fontWeight:600, color:C.ink, minWidth:46, textAlign:'center' }}>{val}d</span>
              <div onClick={()=>set(val+1)} style={{ ...dBtn(false), padding:'6px 12px', fontSize:16 }}>+</div>
            </div>
          );
          const plantEditor = (rows, onSet) => (
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:240, overflowY:'auto' }}>
              {rows.map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'8px 10px', borderRadius:11, background:C.bg }}>
                  <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:14.5, color:C.forest, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    <div onClick={()=>onSet(p.id, Math.max(0,(p.days||0)-1))} style={{ ...dBtn(false), padding:'4px 11px', fontSize:15 }}>−</div>
                    <input value={p.days||0} onChange={e=>onSet(p.id, parseInt(e.target.value)||0)} style={{ ...dInput, width:52, padding:'6px 4px', textAlign:'center' }}/>
                    <div onClick={()=>onSet(p.id,(p.days||0)+1)} style={{ ...dBtn(false), padding:'4px 11px', fontSize:15 }}>+</div>
                  </div>
                </div>
              ))}
            </div>
          );
          return (
          <SettingsSection title="Developer" open={isOpen('dev')} onToggle={()=>toggleSec('dev')}>
            <div style={{ background:C.panel, borderRadius:18, border:C.hair, padding:16, display:'flex', flexDirection:'column', gap:18 }}>
              {!devAuthed ? (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ fontFamily:FONT_SANS, fontSize:13, color:C.brown, opacity:0.75 }}>{pinIsSet ? 'Enter developer PIN' : 'Set a developer PIN to protect these tools'}</div>
                  <input type="password" inputMode="numeric" value={pinInput} onChange={e=>{ setPinInput(e.target.value); setPinErr(false); }} onKeyDown={e=>{ if(e.key==='Enter') submitPin(); }} placeholder="PIN" style={dInput}/>
                  {pinErr && <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:STATUS.needs.dot }}>Wrong PIN</div>}
                  <div style={{ display:'flex', gap:10 }}>
                    <div onClick={submitPin} style={dBtn(true)}>{pinIsSet ? 'Unlock' : 'Set PIN'}</div>
                    <div onClick={lockDev} style={{ ...dBtn(false), border:'none', color:C.brown, opacity:0.6 }}>Hide panel</div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={grpLabel}>This garden · {plants.length} plants</div>
                    <div onClick={onWaterAll} style={dBtn(true)}><IconDrop s={15} c="#fff"/> Water all to today</div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:FONT_SANS, fontSize:13.5, color:C.ink }}>Shift every plant</span>
                      {stepper(devOffsetN, setDevOffsetN)}
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <div onClick={()=>onDevOffsetDays(-devOffsetN)} style={{ ...dBtn(false), flex:1 }}>− {devOffsetN}d fresher</div>
                      <div onClick={()=>onDevOffsetDays(devOffsetN)} style={{ ...dBtn(false), flex:1 }}>+ {devOffsetN}d older</div>
                    </div>
                    <div style={grpLabel}>Per plant · days since watered</div>
                    {plantEditor(plants, onDevSetDays)}
                  </div>

                  <div style={{ height:1, background:C.line }}/>

                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div style={grpLabel}>Manage another node</div>
                    <input value={nodeKey} onChange={e=>setNodeKey(e.target.value)} placeholder="Garden key" style={dInput}/>
                    <input type="password" value={nodePw} onChange={e=>setNodePw(e.target.value)} placeholder="Garden password (if any)" style={dInput}/>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      <div onClick={loadNode} style={dBtn(false)}>{nodeStatus==='loading' ? 'Loading…' : 'Load node'}</div>
                      {nodeStatus==='error' && <span style={{ fontFamily:FONT_SANS, fontSize:12.5, color:STATUS.needs.dot }}>Load failed</span>}
                      {nodeStatus==='empty' && <span style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.7 }}>No plants at that node</span>}
                    </div>
                    {nodeLoaded && nodeLoaded.plants.length > 0 && (
                      <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:4, padding:12, borderRadius:14, background:C.bg }}>
                        <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.7 }}>{nodeLoaded.plants.length} plants loaded · edits stay local until pushed</div>
                        <div onClick={nodeWaterAll} style={dBtn(true)}><IconDrop s={15} c="#fff"/> Water all to today</div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                          <span style={{ fontFamily:FONT_SANS, fontSize:13.5, color:C.ink }}>Shift every plant</span>
                          {stepper(nodeOffsetN, setNodeOffsetN)}
                        </div>
                        <div style={{ display:'flex', gap:10 }}>
                          <div onClick={()=>nodeShiftAll(-nodeOffsetN)} style={{ ...dBtn(false), flex:1 }}>− {nodeOffsetN}d</div>
                          <div onClick={()=>nodeShiftAll(nodeOffsetN)} style={{ ...dBtn(false), flex:1 }}>+ {nodeOffsetN}d</div>
                        </div>
                        {plantEditor(nodeLoaded.plants, nodeSetDays)}
                        <div onClick={pushNode} style={{ ...dBtn(true), marginTop:2 }}>{nodeStatus==='pushed' ? 'Pushed ✓' : nodeStatus==='pushing' ? 'Pushing…' : 'Push to node'}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ height:1, background:C.line }}/>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.55 }}>schema v{WATER_SCHEMA} · app v{APP_VERSION}</span>
                    <div onClick={lockDev} style={{ ...dBtn(false), border:'none', color:C.brown, opacity:0.6, padding:'6px 10px' }}>Lock &amp; hide</div>
                  </div>
                </>
              )}
            </div>
          </SettingsSection>
          );
        })()}
        <SettingsSection title="About" open={isOpen('about')} onToggle={()=>toggleSec('about')}>
          <div style={{ background:C.panel, borderRadius:18, border:C.hair, overflow:'hidden' }}>
            <div onClick={tapVersion} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:C.hair, cursor:'default', userSelect:'none' }}>
              <span style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Version</span>
              <span style={{ fontFamily:FONT_SANS, fontSize:13.5, color:C.brown, opacity:0.7 }}>{`v${APP_VERSION}`}{!devRevealed && verTaps >= 3 && verTaps < 7 ? ` · ${7-verTaps} more` : ''}</span>
            </div>
            <div onClick={updating ? undefined : async ()=>{ setUpdating(true); await onUpdateApp(); }} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', cursor: updating?'default':'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Check for updates</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Clear cache & reload latest version</div>
              </div>
              <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:7, padding:'8px 14px', borderRadius:11, background:'rgba(45,80,22,0.08)', color:C.forest }}>
                {updating
                  ? <div style={{ width:15, height:15, borderRadius:999, border:`2px solid rgba(45,80,22,0.2)`, borderTopColor:C.forest, animation:'spin 0.9s linear infinite' }}/>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 018-8 8 8 0 016.9 4" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round"/><path d="M20 12a8 8 0 01-8 8 8 8 0 01-6.9-4" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round"/><path d="M18 4l2 3h-3M6 20l-2-3h3" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                }
                <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>{updating?'Updating…':'Update'}</span>
              </div>
            </div>
          </div>
        </SettingsSection>
        <div style={{ textAlign:'center', fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:15, color:C.brown, opacity:0.5, marginTop:4 }}>Caulis · grown with care</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  BOTTOM NAVIGATION
// ════════════════════════════════════════════════════════════
function BottomNav({ tab, setTab, onAction, navConfig, showLabels = true }) {
  const slots = normalizeNav(navConfig).filter(s => s.action !== 'empty');
  const fire = (action) => { const a = NAV_ACTIONS[action]; if (!a) return; if (a.tab) setTab(action); else onAction && onAction(action); };
  return (
    <div style={{
      flexShrink:0, position:'relative', zIndex:30,
      background: C.bg === '#111610' ? 'rgba(17,22,16,0.9)' : 'rgba(250,250,247,0.86)', backdropFilter:'blur(18px) saturate(160%)', WebkitBackdropFilter:'blur(18px) saturate(160%)',
      borderTop:'0.5px solid rgba(45,80,22,0.1)',
      padding:'9px 14px 26px',
      display:'flex', alignItems:'flex-end', justifyContent:'space-between',
    }}>
      {slots.map((s, i) => {
        const meta = NAV_ACTIONS[s.action];
        const active = meta.tab && tab === s.action;
        const accent = navColor(s);
        const label = navLabel(s);
        if (s.center) {
          return (
            <div key={i} onClick={()=>fire(s.action)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer' }}>
              <div style={{
                width:58, height:58, borderRadius:999, marginTop:-30,
                background: s.color ? accent : `linear-gradient(160deg, ${C.sage} 0%, ${C.forest} 90%)`,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: active ? '0 8px 20px rgba(45,80,22,0.42), 0 0 0 4px rgba(122,158,78,0.18)' : '0 6px 16px rgba(45,80,22,0.34)',
                border:`3px solid ${C.bg}`, transition:'box-shadow 200ms ease',
              }}>
                <meta.Icon s={26} c="#fff"/>
              </div>
              {showLabels && <span style={{ fontFamily:FONT_SANS, fontSize:10, fontWeight:600, color: active?accent:C.brown, opacity: active?1:0.7, letterSpacing:0.2 }}>{label}</span>}
            </div>
          );
        }
        const col = active ? accent : C.brown;
        return (
          <div key={i} onClick={()=>fire(s.action)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer', paddingBottom:2 }}>
            <meta.Icon s={23} c={col} a={active?1:0.55}/>
            {showLabels && <span style={{ fontFamily:FONT_SANS, fontSize:10, fontWeight: active?600:500, color:col, opacity: active?1:0.65, letterSpacing:0.2 }}>{label}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  MOVE SHEET (reassign room)
// ════════════════════════════════════════════════════════════
function MoveSheet({ plant, ids, locations, onClose, onPick, onAddLocation, isDesktop }) {
  const [typed, setTyped] = useState('');
  const bulk = Array.isArray(ids) && ids.length > 0;
  const targets = bulk ? ids : (plant ? [plant.id] : []);
  const addNew = () => {
    const v = typed.trim(); if (!v) return;
    if (!locations.some(l=>l.toLowerCase()===v.toLowerCase())) onAddLocation(v);
    targets.forEach(id => onPick(id, v)); onClose();
  };
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:36, background:'rgba(42,42,38,0.34)', display:'flex', flexDirection:'column', justifyContent:'flex-end', animation:'fade 160ms ease' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.bg, borderTopLeftRadius:26, borderTopRightRadius:26, padding:'10px 18px 30px', animation:'slideUp 260ms cubic-bezier(.2,.8,.2,1)', maxHeight:'80%', overflowY:'auto' }}>
        <div style={{ width:38, height:4, borderRadius:999, background:'rgba(45,80,22,0.16)', margin:'0 auto 14px' }}/>
        <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:21, color:C.forest, textAlign:'center' }}>{bulk ? `Move ${ids.length} plants` : `Move ${plant.name}`}</div>
        <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.65, textAlign:'center', marginTop:3, marginBottom:16 }}>{bulk ? 'Choose a room' : `Currently in ${plant.location}`}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {locations.map(l => {
            const on = !bulk && l === plant.location;
            return (
              <div key={l} onClick={()=>{ targets.forEach(id => onPick(id, l)); onClose(); }} style={{
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
function DesktopSidebar({ tab, setTab, onAction, navConfig, showLabels = true, sidebar = {} }) {
  const slots = normalizeNav(navConfig).filter(s => s.action !== 'empty');
  const fire = (action) => { const a = NAV_ACTIONS[action]; if (!a) return; if (a.tab) setTab(action); else onAction && onAction(action); };
  const collapsed = !!sidebar.collapsed;
  const labels = showLabels && !collapsed;
  const width = collapsed ? 72 : (sidebar.width || 220);
  const side = sidebar.side === 'right' ? 'right' : 'left';
  const footer = sidebar.footer != null ? sidebar.footer : 'grown with care';
  return (
    <div style={{
      width, flexShrink:0, background:C.panel,
      [side === 'right' ? 'borderLeft' : 'borderRight']: C.hair,
      display:'flex', flexDirection:'column',
      position:'sticky', top:0, alignSelf:'flex-start', height:'100vh',
      transition:'width 220ms cubic-bezier(.2,.8,.2,1)',
    }}>
      <div style={{ padding: collapsed ? '28px 0 20px' : '28px 20px 20px', borderBottom:C.hair, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start', gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:999, background:'rgba(122,158,78,0.14)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Leaf size={17} color={C.forest}/>
          </div>
          {!collapsed && <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:28, color:C.forest, letterSpacing:0.3 }}>Caulis</span>}
        </div>
      </div>
      <nav style={{ padding:'12px 10px 0', flex:1, overflowY:'auto' }}>
        {slots.map((s, i) => {
          const meta = NAV_ACTIONS[s.action];
          if (!meta) return null;
          const active = meta.tab && tab === s.action;
          const accent = navColor(s);
          return (
            <div key={i} onClick={()=>fire(s.action)} title={collapsed ? navLabel(s) : undefined} style={{
              display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start', gap:11,
              padding: collapsed ? '11px 0' : '11px 12px', borderRadius:12, marginBottom:4,
              cursor:'pointer',
              background: active ? 'rgba(45,80,22,0.09)' : 'transparent',
              transition:'background 140ms ease',
            }}>
              <meta.Icon s={20} c={active ? accent : C.brown} a={active ? 1 : 0.55}/>
              {labels && <span style={{
                fontFamily:FONT_SANS, fontSize:14, fontWeight: active ? 600 : 500,
                color: active ? accent : C.ink,
                opacity: active ? 1 : 0.75,
              }}>{navLabel(s)}</span>}
            </div>
          );
        })}
      </nav>
      {!collapsed && footer && (
        <div style={{ padding:'16px 20px 24px', borderTop:C.hair, position:'relative', overflow:'hidden', flexShrink:0 }}>
          <Sprig w={140} h={160} right={-18} bottom={-10} opacity={0.22}/>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:13, color:C.brown, opacity:0.45, position:'relative', zIndex:1 }}>{footer}</div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  DESKTOP MODAL WRAPPER
// ════════════════════════════════════════════════════════════
function DesktopModal({ onClose, children, maxWidth = 520, noBackdropClose = false }) {
  return (
    <div onClick={noBackdropClose ? undefined : (e=>{ if (window._filePickerOpen) return; onClose(); })} style={{
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
