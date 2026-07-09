// ════════════════════════════════════════════════════════════
//  Caulis — badges: definitions, ambient decoration, interactive shelf
// ════════════════════════════════════════════════════════════

// ── badge glyphs — same stroke-based line language as the core icon set ──
function BadgeIconSprout({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 20V11" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M12 11C12 11 6 11 6 5.5C11.5 5.5 12 11 12 11Z" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M12 13C12 13 18 13 18 8C12.5 8 12 13 12 13Z" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>);
}
function BadgeIconCluster({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 4.5C9 6.8 7 9.6 7 12.2 7 14.8 9.2 16.5 12 16.5s5-1.7 5-4.3C17 9.6 15 6.8 12 4.5Z" stroke={c} strokeWidth="1.5"/>
    <path d="M6 12.5C4.3 13.9 3.2 15.6 3.2 17.1 3.2 18.6 4.5 19.6 6.2 19.6S9.2 18.6 9.2 17.1c0-1.5-1.1-3.2-3.2-4.6Z" stroke={c} strokeWidth="1.3"/>
    <path d="M18 12.5C16.3 13.9 15.2 15.6 15.2 17.1c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5c0-1.5-1.1-3.2-3.2-4.6Z" stroke={c} strokeWidth="1.3"/>
  </svg>);
}
function BadgeIconArboretum({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 21V13.5" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="12" cy="8.5" r="5.5" fill="none" stroke={c} strokeWidth="1.5"/>
    <circle cx="6.5" cy="12.5" r="3.4" fill="none" stroke={c} strokeWidth="1.3"/>
    <circle cx="17.5" cy="12.5" r="3.4" fill="none" stroke={c} strokeWidth="1.3"/>
  </svg>);
}
function BadgeIconSteady({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="13" r="8" stroke={c} strokeWidth="1.5"/>
    <path d="M12 8.5V13l3 2" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 3.5h6" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>);
}
function BadgeIconSpecies({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M6 20V14.5C6 10.4 8.7 7 12 7s6 3.4 6 7.5V20" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 7C12 7 9 9.5 9 13" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
    <path d="M12 7C12 7 15 9.5 15 13" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
    <circle cx="12" cy="5" r="2" fill="none" stroke={c} strokeWidth="1.4"/>
  </svg>);
}
function BadgeIconRooms({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M4 11.5 12 4l8 7.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.5 10v9.5h11V10" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M12 19.5v-5" stroke={c} strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/>
  </svg>);
}
function BadgeIconThriving({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4.2" stroke={c} strokeWidth="1.5"/>
    <path d="M12 3.5v2.4M12 18.1v2.4M20.5 12h-2.4M5.9 12H3.5M17.6 6.4l-1.7 1.7M8.1 15.9l-1.7 1.7M17.6 17.6l-1.7-1.7M8.1 8.1 6.4 6.4" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>);
}
function BadgeIconPropagate({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 4l14 14M19 4 5 18" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="6" cy="16.5" r="2.3" fill="none" stroke={c} strokeWidth="1.4"/>
    <circle cx="18" cy="5.5" r="2.3" fill="none" stroke={c} strokeWidth="1.4"/>
    <path d="M9.5 12c0 3-2 5-2 5" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
  </svg>);
}
function BadgeIconPortrait({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <rect x="3.5" y="5" width="17" height="14" rx="2.2" stroke={c} strokeWidth="1.5"/>
    <path d="M12 14.5c-2.3-2.6-3.6-4-3.6-5.4C8.4 7.6 9.5 7 10.6 7c.7 0 1.3.35 1.4.9.1-.55.7-.9 1.4-.9 1.1 0 2.2.6 2.2 2.1 0 1.4-1.3 2.8-3.6 5.4Z" stroke={c} strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>);
}

// ── badge definitions ─────────────────────────────────────────
// check(state) receives { plants, locations, roomLight } — the same read of
// state that already exists elsewhere (gardenHealthScore, milestone toast)
// so nothing new needs to be tracked just for badges.
const BADGE_MILESTONES = [
  { n: 10,  id: 'plants-10',  name: 'Budding Collector', text: 'Ten plants deep, no signs of stopping.', Icon: BadgeIconSprout },
  { n: 25,  id: 'plants-25',  name: 'Greenhouse Keeper', text: 'Twenty-five and counting.',               Icon: BadgeIconCluster },
  { n: 50,  id: 'plants-50',  name: 'Botanist',          text: 'Fifty plants under one roof.',            Icon: BadgeIconArboretum },
  { n: 100, id: 'plants-100', name: 'The Arboretum',     text: 'A hundred plants. This is a lifestyle now.', Icon: BadgeIconArboretum },
];

// a plant is "on schedule" for a stretch of history if no gap between
// consecutive waterings ran meaningfully past its own interval — a little
// slack (15%) so an ordinary day-early/day-late doesn't break the streak
function longestOnScheduleStreak(plant) {
  const h = Array.isArray(plant.history) ? plant.history : [];
  if (h.length < 2 || !plant.every) return h.length >= 8 ? h.length : 0;
  const slack = plant.every * 1.15;
  let best = 1, cur = 1;
  for (let i = 1; i < h.length; i++) {
    const gapDays = (midnightFromStamp(h[i]) - midnightFromStamp(h[i - 1])) / DAY_MS;
    if (gapDays <= slack) { cur++; best = Math.max(best, cur); } else cur = 1;
  }
  return best;
}

const BADGE_DEFS = [
  { id: 'first-sprig', name: 'First Sprig', text: 'The one that started it all.', Icon: BadgeIconSprout,
    check: ({ plants }) => plants.length >= 1 },
  ...BADGE_MILESTONES.map(m => ({ id: m.id, name: m.name, text: m.text, Icon: m.Icon,
    check: ({ plants }) => plants.length >= m.n })),
  { id: 'on-schedule', name: 'Steady Hand', text: 'Eight waterings, never once late.', Icon: BadgeIconSteady,
    check: ({ plants }) => plants.some(p => longestOnScheduleStreak(p) >= 8) },
  { id: 'variety-species', name: "Collector's Eye", text: 'Eight distinct species and counting.', Icon: BadgeIconSpecies,
    check: ({ plants }) => new Set(plants.map(p => (p.latin || '').trim().toLowerCase()).filter(v => v && v !== '—')).size >= 8 },
  { id: 'variety-rooms', name: 'Room to Room', text: 'Every room has something green.', Icon: BadgeIconRooms,
    check: ({ plants, locations }) => {
      if (!locations || locations.length < 3) return false;
      const withPlants = new Set(plants.map(p => p.location).filter(Boolean));
      return locations.every(l => withPlants.has(l));
    } },
  { id: 'thriving-garden', name: "Everything's Thriving", text: 'Not one plant asking for water. Rare, and worth noting.', Icon: BadgeIconThriving,
    check: ({ plants }) => plants.length >= 5 && plants.every(p => statusOf(p.days, p.every, p.snoozedUntil) !== 'needs') },
  { id: 'propagator', name: 'Cutting Edge', text: 'A new plant, grown from an old one.', Icon: BadgeIconPropagate,
    check: ({ plants }) => plants.some(p => p.propagatedFrom != null) },
  { id: 'documented', name: 'Portrait Mode', text: 'You gave a plant its own photograph.', Icon: BadgeIconPortrait,
    check: ({ plants }) => plants.some(p => p.userImage || (p.photos && p.photos.length)) },
];
const BADGE_BY_ID = Object.fromEntries(BADGE_DEFS.map(d => [d.id, d]));

// deterministic pseudo-random from a string — same badge always lands in the
// same ambient spot for a given viewport class, no layout jitter on re-render
function _hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

// ════════════════════════════════════════════════════════════
//  Ambient decorative layer — Sprig-tier watermark texture, never
//  interactive. Anchored to the top band of the Garden screen (header
//  through the first grid row) rather than the full scroll height, so it
//  never needs to track dynamic content height.
// ════════════════════════════════════════════════════════════
function AmbientBadgeLayer({ badges, enabled, density, isDesktop }) {
  if (!enabled || !badges || !badges.length) return null;
  const cap = { few: 3, normal: 6, many: 10 }[density] || 6;
  const shown = [...badges].sort((a, b) => b.earnedAt - a.earnedAt).slice(0, cap);
  const bandH = isDesktop ? 520 : 460;
  return (
    <div style={{ position:'absolute', top:0, left:0, right:0, height:bandH, overflow:'hidden', pointerEvents:'none', zIndex:1 }} aria-hidden="true">
      {shown.map((b, i) => {
        const def = BADGE_BY_ID[b.id];
        if (!def) return null;
        const h = _hash(b.id + i);
        const left = 6 + (h % 88);
        const top = 8 + ((h >> 4) % (bandH - 60));
        const rot = ((h >> 8) % 30) - 15;
        const size = 26 + (h % 3) * 6;
        const delay = (h % 40) / 10;
        const dur = 6 + (h % 30) / 10;
        return (
          <div key={b.id} style={{ position:'absolute', left:`${left}%`, top, transform:`rotate(${rot}deg)` }}>
            <div style={{ animation:`badgeDrift ${dur}s ease-in-out ${delay}s infinite` }}>
              <def.Icon s={size} c={C.sage}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Interactive badge shelf — real drag physics (velocity + damping,
//  spring-back to rest), isolated to its own strip so pointer events never
//  reach the plant grid underneath. Mirrors the feel of BrassBound's machine
//  drag: velocity captured while dragging, then a spring integrates it back
//  to rest on release via requestAnimationFrame — not a CSS transition.
// ════════════════════════════════════════════════════════════
const BADGE_DRAG_LIMIT = 20;
const BADGE_K_SPRING = 0.22;
const BADGE_K_DAMP = 0.74;

function useBadgeDragPhysics() {
  const elRef = useRef(null);
  const pos = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const rafId = useRef(null);
  const grabAt = useRef({ x: 0, y: 0 });

  const paint = () => { if (elRef.current) elRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`; };

  const tick = () => {
    if (!dragging.current) {
      const p = pos.current, v = vel.current;
      v.x = (v.x + (0 - p.x) * BADGE_K_SPRING) * BADGE_K_DAMP;
      v.y = (v.y + (0 - p.y) * BADGE_K_SPRING) * BADGE_K_DAMP;
      p.x += v.x; p.y += v.y;
      paint();
      if (Math.abs(v.x) < 0.03 && Math.abs(v.y) < 0.03 && Math.abs(p.x) < 0.05 && Math.abs(p.y) < 0.05) {
        p.x = 0; p.y = 0; paint();
        rafId.current = null;
        return;
      }
    }
    rafId.current = requestAnimationFrame(tick);
  };
  const ensureLoop = () => { if (rafId.current == null) rafId.current = requestAnimationFrame(tick); };

  const onPointerDown = (e) => {
    dragging.current = true;
    vel.current = { x: 0, y: 0 };
    grabAt.current = { x: e.clientX - pos.current.x, y: e.clientY - pos.current.y };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    if (elRef.current) elRef.current.style.transition = 'none';
    ensureLoop();
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const nx = e.clientX - grabAt.current.x, ny = e.clientY - grabAt.current.y;
    const dist = Math.sqrt(nx * nx + ny * ny);
    const clamp = dist > BADGE_DRAG_LIMIT ? BADGE_DRAG_LIMIT / dist : 1;
    const px = nx * clamp, py = ny * clamp;
    vel.current = { x: px - pos.current.x, y: py - pos.current.y };
    pos.current = { x: px, y: py };
    paint();
  };
  const release = () => { dragging.current = false; ensureLoop(); };

  return { elRef, onPointerDown, onPointerMove, onPointerUp: release, onPointerCancel: release };
}

function BadgeMedallion({ badge, def }) {
  const drag = useBadgeDragPhysics();
  return (
    <div
      ref={drag.elRef}
      onPointerDown={drag.onPointerDown} onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp} onPointerCancel={drag.onPointerCancel}
      title={`${def.name} — ${def.text}`}
      style={{
        flexShrink:0, width:60, height:60, borderRadius:999, background:C.panel,
        border:`1.5px solid rgba(45,80,22,0.16)`, boxShadow:'0 2px 8px rgba(45,80,22,0.10)',
        display:'flex', alignItems:'center', justifyContent:'center', cursor:'grab',
        touchAction:'none', userSelect:'none', WebkitUserSelect:'none', willChange:'transform',
      }}>
      <def.Icon s={26} c={C.forest}/>
    </div>
  );
}

function LockedMedallion({ def }) {
  return (
    <div title={def.name} style={{
      flexShrink:0, width:60, height:60, borderRadius:999, background:'transparent',
      border:'1.5px dashed rgba(45,80,22,0.22)', opacity:0.45,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <def.Icon s={24} c={C.brown}/>
    </div>
  );
}

function BadgeShelf({ badges, curatedIds, isDesktop }) {
  const [open, setOpen] = useState(() => GS.get('caulis_badge_shelf_open', true));
  const toggle = () => setOpen(o => { GS.set('caulis_badge_shelf_open', !o); return !o; });
  if (!badges) return null;
  const earnedIds = new Set(badges.map(b => b.id));
  const shownIds = Array.isArray(curatedIds) && curatedIds.length ? curatedIds.filter(id => earnedIds.has(id)) : [...earnedIds];
  const shownEarned = shownIds.map(id => badges.find(b => b.id === id)).filter(Boolean).sort((a, b) => a.earnedAt - b.earnedAt);
  const locked = BADGE_DEFS.filter(d => !earnedIds.has(d.id));
  if (!badges.length) return null;
  return (
    <div style={{ background:C.panel, borderRadius:20, border:C.hair, boxShadow:'0 1px 2px rgba(43,42,38,0.03), 0 6px 16px rgba(45,80,22,0.04)', overflow:'hidden' }}>
      <div onClick={toggle} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', cursor:'pointer' }}>
        <div>
          <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.72, letterSpacing:0.4, textTransform:'uppercase' }}>Badges</div>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:16, color:C.forest, marginTop:1 }}>{badges.length} of {BADGE_DEFS.length} earned</div>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" style={{ transform: open?'rotate(180deg)':'rotate(0deg)', transition:'transform 220ms ease', opacity:0.45, flexShrink:0 }}>
          <path d="M6 9l6 6 6-6" stroke={C.brown} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ display:'grid', gridTemplateRows: open?'1fr':'0fr', transition:'grid-template-rows 260ms ease' }}>
        <div style={{ overflow:'hidden', minHeight:0 }}>
          <div data-noswipe="1" style={{ display:'flex', gap:12, overflowX:'auto', WebkitOverflowScrolling:'touch', padding:'2px 16px 16px', touchAction:'pan-x' }}>
            {shownEarned.map(b => { const def = BADGE_BY_ID[b.id]; return def ? <BadgeMedallion key={b.id} badge={b} def={def}/> : null; })}
            {locked.map(def => <LockedMedallion key={def.id} def={def}/>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// syncs current garden state against every badge definition and returns the
// ids currently satisfied — used both by the unlock-detection effect (app.jsx)
// and the admin panel (to show earned/not-earned per definition)
function computeSatisfiedBadgeIds(state) {
  return BADGE_DEFS.filter(d => { try { return d.check(state); } catch (e) { return false; } }).map(d => d.id);
}

Object.assign(window, {
  BADGE_DEFS, BADGE_BY_ID, computeSatisfiedBadgeIds,
  AmbientBadgeLayer, BadgeShelf,
});
