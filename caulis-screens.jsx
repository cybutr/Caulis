// ════════════════════════════════════════════════════════════
//  Caulis — screens + bottom navigation
// ════════════════════════════════════════════════════════════
const PRINT_SIZES = [['S', 30], ['M', 40], ['L', 55]];

// device-local persistence for view prefs (never synced to a garden node)
const GS = {
  get: (k, f) => { try { const v = localStorage.getItem(k); return v != null ? JSON.parse(v) : f; } catch(e) { return f; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
};

// wraps every literal occurrence of query inside text with a tinted inline
// span, case-insensitive — used to highlight settings-search matches in place
function highlightText(text, query) {
  if (!query) return text;
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts = [];
  let i = 0, from = 0;
  while ((i = lower.indexOf(needle, from)) !== -1) {
    if (i > from) parts.push(text.slice(from, i));
    parts.push(
      <span key={i} style={{ background:C.sage, color:C.forest, borderRadius:3, padding:'0 2px' }}>
        {text.slice(i, i + needle.length)}
      </span>
    );
    from = i + needle.length;
  }
  parts.push(text.slice(from));
  return parts;
}

// live-highlights every occurrence of query inside el's rendered text using
// the CSS Custom Highlight API — doesn't touch the DOM tree React owns, so
// it can't desync from React's own reconciliation the way text-node mutation
// would. No-ops silently on browsers without Highlight support (Firefox <128).
function useTextHighlight(ref, query, active) {
  useEffect(() => {
    if (typeof Highlight === 'undefined' || !window.CSS || !CSS.highlights) return;
    if (!active || !query || !query.trim() || !ref.current) { CSS.highlights.delete('settings-match'); return; }
    const needle = query.trim().toLowerCase();
    const ranges = [];
    const walker = document.createTreeWalker(ref.current, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.toLowerCase();
      let from = 0, i;
      while ((i = text.indexOf(needle, from)) !== -1) {
        const r = new Range();
        r.setStart(node, i);
        r.setEnd(node, i + needle.length);
        ranges.push(r);
        from = i + needle.length;
      }
    }
    if (ranges.length) CSS.highlights.set('settings-match', new Highlight(...ranges));
    else CSS.highlights.delete('settings-match');
    return () => CSS.highlights.delete('settings-match');
  }, [ref, query, active]);
}

// a row of plain colored swatches — no inline text label baked into each
// swatch's box, so every row using this looks identical regardless of how
// many options it has or how long their names are. The name only ever shows
// via a hover title and a single "currently selected" chip in the row's own
// header (see callers) — never repeated under every swatch.
function SwatchRow({ options, value, onSelect, size = 32 }) {
  return (
    <div style={{ display:'flex', gap:12, overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:2 }}>
      {options.map(opt => {
        const on = value === opt.key;
        // the custom slot reads as a tool ("pick any color"), not a color
        // itself — a calm pipette icon, never the old vibrant rainbow tile.
        // The picked hue only shows as a small tip-dot once actually selected.
        if (opt.key === 'custom') {
          return (
            <div key={opt.key} onClick={()=>onSelect(opt.key)} title={opt.label} style={{
              flexShrink:0, width:size, height:size, borderRadius:999, cursor:'pointer', position:'relative',
              background:'rgba(45,80,22,0.06)', border:C.hair,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: on ? `0 0 0 2px ${C.bg}, 0 0 0 4px ${opt.ring || C.forest}` : 'none',
              transition:'box-shadow 160ms ease',
            }}>
              <IconPipette s={Math.round(size*0.56)} c={C.brown} a={0.75}/>
              {on && <span style={{ position:'absolute', right:2, bottom:2, width:7, height:7, borderRadius:999, background:opt.ring || C.forest, boxShadow:`0 0 0 1.5px ${C.bg}` }}/>}
            </div>
          );
        }
        return (
          <div key={opt.key} onClick={()=>onSelect(opt.key)} title={opt.label} style={{
            flexShrink:0, width:size, height:size, borderRadius:999, background:opt.swatch, cursor:'pointer',
            // near-white swatches (e.g. a literal "White" background option)
            // are otherwise invisible against the panel — a thin hairline
            // keeps them legible without changing the selected-ring language
            border: opt.border ? C.hair : 'none', boxSizing:'border-box',
            boxShadow: on ? `0 0 0 2px ${C.bg}, 0 0 0 4px ${opt.ring || opt.swatch}` : '0 1px 3px rgba(43,42,38,0.18)',
            transition:'box-shadow 160ms ease',
          }}/>
        );
      })}
    </div>
  );
}

// small live-preview tile for one background-texture option — cheap enough
// to render up to 6 of these at once in Settings. The CSS-only patterns
// (dot/linen/vein) render through the exact same bgTextureStyle() the real
// app background uses, so the swatch is a true preview, not an approximation.
// paper/marble get their own tiny self-contained SVG filter instead of
// hooking the shared full-viewport grain-overlay — a representative static
// sample (fixed "medium" look) rather than wiring 6 swatches to the user's
// live intensity setting, which would need per-swatch filter nodes anyway.
function TexturePreviewTile({ tKey, size = 34 }) {
  if (tKey === 'paper' || tKey === 'marble') {
    const fid = 'texPrev_' + tKey;
    return (
      <svg width={size} height={size} style={{ borderRadius:rad(8), display:'block' }}>
        <defs>
          <filter id={fid}>
            <feTurbulence type={tKey === 'marble' ? 'turbulence' : 'fractalNoise'} baseFrequency={tKey === 'marble' ? '0.08' : '0.7'} numOctaves={tKey === 'marble' ? '2' : '3'} stitchTiles="stitch"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0"/>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill={C.panel}/>
        <rect width="100%" height="100%" filter={`url(#${fid})`} opacity="0.4"/>
      </svg>
    );
  }
  return <div style={{ width:size, height:size, borderRadius:rad(8), background:C.panel, ...bgTextureStyle(tKey) }}/>;
}
function TexturePicker({ value, onSelect }) {
  return (
    <div style={{ display:'flex', gap:12, overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:2 }}>
      {BG_TEXTURE_ORDER.map(k => {
        const on = value === k;
        return (
          <div key={k} onClick={()=>onSelect(k)} title={BG_TEXTURES[k].label} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer', width:52 }}>
            <div style={{ borderRadius:rad(10), border:C.hair, boxShadow: on ? `0 0 0 2px ${C.bg}, 0 0 0 4px ${C.forest}` : 'none', transition:'box-shadow 160ms ease' }}>
              <TexturePreviewTile tKey={k}/>
            </div>
            <span style={{ fontFamily:FONT_SANS, fontSize:9, textAlign:'center', color:C.brown, opacity:on?0.95:0.55, fontWeight:on?600:500, lineHeight:1.2 }}>{BG_TEXTURES[k].label}</span>
          </div>
        );
      })}
    </div>
  );
}

// non-blocking contrast note reused by every background-color preset (White/
// Black/palette tint), not just the Custom slot — bgContrastWarningFor() is
// the same stricter body-text check CustomColorPicker's mode="bg" already uses
function BgContrastNote({ hex }) {
  const warn = bgContrastWarningFor(hex);
  if (!warn.warnInk && !warn.warnBrown) return null;
  return (
    <div style={{ fontFamily:FONT_SANS, fontSize:10.5, color:'#B4472E', opacity:0.9, marginTop:8, lineHeight:1.35 }}>
      Low contrast against body text — may be hard to read ({(warn.warnInk ? warn.ink : warn.brown).toFixed(1)}:1)
    </div>
  );
}

// full-width stacked rows with a trailing checkmark — for text-label presets
// that don't fit a segmented pill on a 390px screen (3 options with words
// like "Vignette"/"Paper grain" wrapped the old Segmented pill onto a second,
// half-empty line). Matches the rest of Settings' own row-list visual
// language (trailing checkmark = same affordance as a radio-style choice
// elsewhere in this app) instead of SwatchRow's circle pattern, which is
// built for color swatches specifically, not text options.
function OptionList({ options, value, onSelect }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', borderRadius:rad(12), border:C.hair, overflow:'hidden', marginTop:8 }}>
      {options.map(([val, label, desc], i) => {
        const on = value === val;
        return (
          <div key={String(val)} onClick={()=>onSelect(val)} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
            padding: desc ? '10px 13px' : '9px 13px', cursor:'pointer',
            background: on ? 'rgba(122,158,78,0.1)' : 'transparent',
            borderTop: i ? C.hair : 'none', transition:'background 140ms ease',
          }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:on?600:500, color:C.ink, opacity:on?1:0.78 }}>{label}</div>
              {desc && <div style={{ fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.55, marginTop:1 }}>{desc}</div>}
            </div>
            {on && <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink:0 }}><path d="M5 13l4 4L19 7" stroke={C.forest} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
        );
      })}
    </div>
  );
}

// a fully in-theme SV square + hue strip, replacing the old native
// <input type="color"> popup — that native swatch pops the browser/OS's own
// square hue/saturation grid + RGB boxes, which can't be restyled at all and
// reads as un-themed chrome next to the rest of this app. Plain HSV math
// (rgbToHsv/hsvToRgb, caulis-core.jsx) + CSS gradients, no canvas, no lib.
function HsvSquare({ hsv, onChange }) {
  const ref = useRef(null);
  const setFromEvent = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    onChange({ ...hsv, s: x, v: 1 - y });
  };
  const onDown = (e) => { e.target.setPointerCapture(e.pointerId); setFromEvent(e); };
  const onMove = (e) => { if (e.buttons) setFromEvent(e); };
  return (
    <div ref={ref} onPointerDown={onDown} onPointerMove={onMove} style={{
      position:'relative', width:'100%', height:120, borderRadius:rad(10), cursor:'crosshair', touchAction:'none',
      background:`linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${hsv.h}, 100%, 50%)`,
    }}>
      <div style={{
        position:'absolute', left:`${hsv.s * 100}%`, top:`${(1 - hsv.v) * 100}%`, width:14, height:14, borderRadius:999,
        transform:'translate(-50%,-50%)', border:'2px solid #fff', boxShadow:'0 0 0 1px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.4)',
        background:rgbToHex(hsvToRgb(hsv)), pointerEvents:'none',
      }}/>
    </div>
  );
}
function HueStrip({ h, onChange }) {
  const ref = useRef(null);
  const setFromEvent = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    onChange(x * 360);
  };
  const onDown = (e) => { e.target.setPointerCapture(e.pointerId); setFromEvent(e); };
  const onMove = (e) => { if (e.buttons) setFromEvent(e); };
  return (
    <div ref={ref} onPointerDown={onDown} onPointerMove={onMove} style={{
      position:'relative', width:'100%', height:16, borderRadius:999, cursor:'pointer', touchAction:'none',
      background:'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
    }}>
      <div style={{
        position:'absolute', left:`${(h / 360) * 100}%`, top:'50%', width:18, height:18, borderRadius:999,
        transform:'translate(-50%,-50%)', border:'2.5px solid #fff', boxShadow:'0 0 0 1px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.4)',
        background:`hsl(${h}, 100%, 50%)`, pointerEvents:'none',
      }}/>
    </div>
  );
}
// the free-form color picker slot: a fully in-theme SV square + hue strip
// (no native browser/OS chrome anywhere in the interactive surface) plus a
// plain hex text input for direct/keyboard entry. Below it: the live hex
// value and a REAL computed WCAG contrast check — not a hardcoded guess — so
// a pick that would be hard to read gets a plain, non-blocking warning
// instead of silently shipping bad contrast. `mode="bg"` swaps in the
// stricter body-text-vs-background check (bgContrastWarningFor) used by the
// custom background color picker, since that background sits behind ALL
// text, not just accent-colored UI elements like the palette/accent pickers.
function CustomColorPicker({ hex, onChange, mode = 'accent' }) {
  const warn = mode === 'bg' ? bgContrastWarningFor(hex) : contrastWarningFor(hex);
  const bad = mode === 'bg' ? (warn.warnInk || warn.warnBrown) : (warn.warnLight || warn.warnDark);
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(hex)));
  const [text, setText] = useState(hex.toUpperCase());
  // sync from an external hex change (opening the picker, switching custom
  // slots) but not from our own onChange round-trip — comparing against the
  // hex our own hsv would derive avoids the SV dot jittering mid-drag
  useEffect(() => {
    if (rgbToHex(hsvToRgb(hsv)).toLowerCase() !== String(hex).toLowerCase()) setHsv(rgbToHsv(hexToRgb(hex)));
    setText(hex.toUpperCase());
  }, [hex]);
  const commit = (nextHsv) => { setHsv(nextHsv); onChange(rgbToHex(hsvToRgb(nextHsv))); };
  const commitText = (v) => {
    setText(v);
    const norm = '#' + v.replace('#', '');
    if (/^#[0-9a-fA-F]{6}$/.test(norm)) onChange(norm);
  };
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:10, padding:`${ds(12)}px`, borderRadius:rad(14), background:C.panel, border:C.hair }}>
      <HsvSquare hsv={hsv} onChange={commit}/>
      <HueStrip h={hsv.h} onChange={h => commit({ ...hsv, h })}/>
      <div style={{ display:'flex', alignItems:'center', gap:ds(10) }}>
        <div style={{ width:28, height:28, borderRadius:999, flexShrink:0, background:hex, boxShadow:`0 0 0 2px ${C.bg}, 0 0 0 3px ${C.line}` }}/>
        <input value={text} onChange={e => commitText(e.target.value)} maxLength={7}
          style={{ flex:1, minWidth:0, fontFamily:'ui-monospace, "SF Mono", Menlo, monospace', fontSize:13, fontWeight:600, color:C.ink, background:C.input, border:C.hair, borderRadius:rad(10), padding:'7px 10px', outline:'none' }}/>
      </div>
      {bad ? (
        <div style={{ fontFamily:FONT_SANS, fontSize:10.5, color:'#B4472E', opacity:0.9, lineHeight:1.35 }}>
          {mode === 'bg'
            ? `Low contrast against body text — may be hard to read (${(warn.warnInk ? warn.ink : warn.brown).toFixed(1)}:1)`
            : `Low contrast${warn.warnLight && warn.warnDark ? ' in light & dark mode' : warn.warnLight ? ' in light mode' : ' in dark mode'} — may be hard to read (${(warn.warnLight ? warn.light : warn.dark).toFixed(1)}:1)`}
        </div>
      ) : (
        <div style={{ fontFamily:FONT_SANS, fontSize:10.5, color:C.brown, opacity:0.5 }}>Drag the square/strip, or type a hex code</div>
      )}
    </div>
  );
}

// toggle switch with a brief confirming ring-flash on change — small
// considered feedback beyond an instant state flip, same MOTION/keyframe
// vocabulary as everywhere else (gated for free by the global reduceMotion
// CSS override, since it's a pure keyframe with no JS branch of its own)
function ToggleKnob({ on, color }) {
  return (
    <div key={on} style={{ width:44, height:26, borderRadius:999, background: on ? (color||C.forest) : 'rgba(45,80,22,0.14)', position:'relative', transition:'background 200ms', flexShrink:0, animation:'toggleFlash 500ms ease-out' }}>
      <div style={{ position:'absolute', top:3, left:on?21:3, width:20, height:20, borderRadius:999, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 200ms' }}/>
    </div>
  );
}

// a pill-style segmented picker — shared by every 2-4 option Appearance
// control (card density, radius density, image treatment, spacing, texture)
function Segmented({ options, value, onSelect }) {
  const [pressed, setPressed] = useState(null);
  return (
    <div style={{ display:'flex', background:'rgba(45,80,22,0.07)', borderRadius:9, padding:3, flexWrap:'wrap', gap:0 }}>
      {options.map(([val,label]) => {
        const on = value === val;
        const down = pressed === val;
        return (
          <div key={String(val)}
            onPointerDown={()=>setPressed(val)} onPointerUp={()=>setPressed(null)} onPointerLeave={()=>setPressed(null)} onPointerCancel={()=>setPressed(null)}
            onClick={()=>onSelect(val)}
            style={{ cursor:'pointer', padding:'5px 12px', borderRadius:6, background:on?C.forest:'transparent', color:on?'#fff':C.ink, fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, opacity:on?1:0.5, transform:`scale(${down?0.92:1})`, transition:'transform 140ms cubic-bezier(.2,.8,.2,1), background 140ms ease, color 140ms ease, opacity 140ms ease', whiteSpace:'nowrap' }}>{label}</div>
        );
      })}
    </div>
  );
}

// collapsible settings category — module-level so children keep identity (no remount)
function SettingsSection({ title, open, onToggle, children, id, matched, query, bodyRef }) {
  // Body-text highlighting is NOT done per-instance here on purpose — with
  // 14 of these mounted at once, a per-section useTextHighlight() effect
  // (each keyed on the same shared 'settings-match' CSS Highlight registry
  // entry) races itself: React runs effects top-down, so the one truly
  // matched section sets the highlight and then every other (inactive)
  // section's effect immediately deletes that same shared entry again on
  // the same commit. Net visible result was always zero highlighted ranges.
  // SettingsScreen now owns this as a single effect over whichever section
  // is actually the current match — see the effect next to settingsMatches.
  return (
    <div id={id} style={matched ? { borderRadius:rad(16), boxShadow:`0 0 0 2px ${C.forest}`, transition:'box-shadow 200ms ease' } : { transition:'box-shadow 200ms ease' }}>
      <div onClick={onToggle} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', padding: matched ? '8px 6px 8px' : '0 6px 8px' }}>
        <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color: matched ? C.forest : C.brown, opacity: matched ? 1 : 0.6, letterSpacing:0.6, textTransform:'uppercase' }}>{highlightText(title, query)}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" style={{ transform: open?'rotate(180deg)':'rotate(0deg)', transition:'transform 220ms ease', opacity:0.45 }}><path d="M6 9l6 6 6-6" stroke={C.brown} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div style={{ display:'grid', gridTemplateRows: open?'1fr':'0fr', transition:'grid-template-rows 260ms ease' }}>
        <div ref={bodyRef} style={{ overflow:'hidden', minHeight:0 }}>{children}</div>
      </div>
    </div>
  );
}

// a second, quieter tier of collapse nested inside a SettingsSection body —
// same open/chevron language, one size down (smaller type, tighter padding,
// no uppercase section-header treatment) so a dense section (Developer,
// Appearance) can group its rows without reading as another top-level
// accordion. Single-open-per-parent is the caller's choice, not baked in here.
function SubCollapse({ title, open, onToggle, children }) {
  return (
    <div style={{ borderRadius:rad(14), border:C.hair, overflow:'hidden', background:C.panel }}>
      <div onClick={onToggle} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', padding:'11px 13px' }}>
        <span style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.ink }}>{title}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" style={{ transform: open?'rotate(180deg)':'rotate(0deg)', transition:'transform 220ms ease', opacity:0.45, flexShrink:0 }}><path d="M6 9l6 6 6-6" stroke={C.brown} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div style={{ display:'grid', gridTemplateRows: open?'1fr':'0fr', transition:'grid-template-rows 260ms ease' }}>
        <div style={{ overflow:'hidden', minHeight:0 }}>
          <div style={{ borderTop:C.hair }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// declaration order of every Settings accordion section, and its heading —
// drives both search ranking (title hits score highest) and tie-breaking
// (earlier sections win ties so results stay stable between keystrokes).
// Sections that render conditionally (app/nav/dev) simply never register a
// ref when absent, so they're skipped automatically — no separate list to
// keep in sync.
const SETTINGS_SECTION_ORDER = ['appearance', 'garden', 'badges', 'behavior', 'notif', 'printing', 'data', 'app', 'google', 'cloud', 'backup', 'nav', 'dev', 'about'];
const SETTINGS_SECTION_TITLES = {
  appearance: 'Appearance', garden: 'Garden', badges: 'Badges', behavior: 'Behavior', notif: 'Notifications',
  printing: 'Printing', data: 'Plant data', app: 'Install', google: 'Google sync', cloud: 'Cloud sync',
  backup: 'Backup', nav: 'Navigation bar', dev: 'Developer', about: 'About',
};

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
function PlantCard({ plant, tint, onOpen, onLongPress, czechMode, grip, dragging, over, selectable, selected, onToggleSelect, compact, entranceIdx, reduceMotion, locationTags, cardDateMode = 'last' }) {
  const [press, setPress] = useState(false);
  const timer = useRef(null);
  const longed = useRef(false);
  const status = statusOf(plant.days, plant.every, plant.snoozedUntil);
  const start = () => {
    if (selectable) return;
    setPress(true); longed.current = false;
    timer.current = setTimeout(() => { longed.current = true; setPress(false); onLongPress && onLongPress(plant); }, 480);
  };
  const end = () => { setPress(false); if (timer.current) clearTimeout(timer.current); };
  const click = () => { if (selectable) { onToggleSelect(plant.id); return; } if (longed.current) { longed.current = false; return; } onOpen(plant.id); };
  const entrance = (!reduceMotion && entranceIdx != null) ? cardEntranceStyle(entranceIdx) : {};
  return (
    <div data-noswipe="1" style={{ position:'relative', borderRadius: compact ? rad(16) : rad(22), overflow:'hidden', ...entrance }}>
      <div
        onPointerDown={start} onPointerUp={end} onPointerLeave={end} onPointerCancel={end} onClick={click}
        style={{
          background:C.panel, borderRadius: compact ? rad(16) : rad(22), padding: ds(compact ? 8 : 12), minWidth:0,
          boxShadow: press ? '0 1px 3px rgba(43,42,38,0.06)' : '0 1px 2px rgba(43,42,38,0.04), 0 8px 22px rgba(45,80,22,0.05)',
          border: selected ? `1.5px solid ${C.forest}` : over ? '1px solid rgba(110,154,62,0.6)' : '0.5px solid rgba(45,80,22,0.06)',
          transform: `scale(${press ? 0.975 : 1})`,
          opacity: dragging ? 0.5 : 1,
          transition: 'transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms ease, opacity 140ms ease, border-color 140ms ease',
          cursor:'pointer', position:'relative', userSelect:'none', WebkitUserSelect:'none', touchAction:'pan-y',
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
            position:'absolute', top:9, right:9, minWidth:18, height:18, borderRadius:999, background:C.panel,
            padding: getStatusStyle() === 'minimal' ? '0 6px' : 0,
            display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(43,42,38,0.12)',
          }}>
            <StatusDot status={status}/>
          </div>
        </div>
        <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize: compact ? 15.5 : 21, lineHeight:1.12, color:C.forest, marginTop: compact ? 8 : 11, letterSpacing:0.1, overflowWrap:'anywhere' }}>{czechMode && plant.czech ? plant.czech : plant.name}</div>
        <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2, overflow:'hidden' }}>
          {(() => {
            const col = locationTagColor(locationTags && locationTags[plant.location]);
            return col ? <span style={{ flexShrink:0, width:6, height:6, borderRadius:999, background:col }}/> : null;
          })()}
          <span style={{ fontFamily:FONT_SANS, fontSize: compact ? 9.5 : 10.5, fontWeight:400, color:C.brown, opacity:0.7, letterSpacing:0.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{plant.location}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: compact ? 4 : 6, marginTop: compact ? 7 : 9 }}>
          <svg width="11" height="13" viewBox="0 0 11 13" style={{flexShrink:0}}>
            <path d="M5.5 1C5.5 1 1 6 1 8.6A4.5 4.5 0 0010 8.6C10 6 5.5 1 5.5 1Z" fill="none" stroke={STATUS[status].dot} strokeWidth="1.1"/>
          </svg>
          <span style={{ fontFamily:FONT_SANS, fontSize: compact ? 10 : 11.5, fontWeight:500, color:C.ink, opacity:0.62, letterSpacing:0.1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {cardDateMode === 'due' ? dueLabel(plant.days, plant.every, compact) : (compact ? (plant.days <= 0 ? 'Today' : plant.days === 1 ? '1 day' : `${plant.days} days`) : agoLabel(plant.days))}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Shared screen header ──────────────────────────────────
function ScreenHead({ eyebrow, title, isDesktop, appName }) {
  return (
    <div style={{ padding: isDesktop ? '32px 28px 0' : '56px 22px 0', position:'relative', zIndex:2 }}>
      {!isDesktop && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
          <div style={{ width:30, height:30, borderRadius:999, background:'rgba(122,158,78,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Leaf size={16} color={C.forest}/>
          </div>
          <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:26, color:C.forest, letterSpacing:0.3 }}>{appName || 'Caulis'}</span>
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
function GardenFilterBar({ sort, setSort, sidePad = 22, filterOpen, onToggleFilter, filterActive }) {
  const filters = [['all','All'],['urgent','Most urgent first'],['location','Location']];
  return (
    <div data-noswipe="1" style={{ display:'flex', alignItems:'center', gap:8, overflowX:'auto', padding:`14px ${sidePad}px 2px`, position:'relative', zIndex:2, WebkitOverflowScrolling:'touch' }}>
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
      {onToggleFilter && (
        <div onClick={onToggleFilter} title="Filter" style={{
          flexShrink:0, marginLeft:'auto', width:34, height:34, borderRadius:999, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
          background: filterOpen ? C.forest : C.panel,
          border: filterOpen ? '1px solid '+C.forest : '0.5px solid rgba(45,80,22,0.14)',
          transition:'all 160ms ease',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z" stroke={filterOpen?'#fff':C.brown} strokeWidth="1.8" strokeLinejoin="round"/></svg>
          {filterActive && !filterOpen && <div style={{ position:'absolute', top:5, right:5, width:7, height:7, borderRadius:999, background:C.sage, border:'1.5px solid '+C.panel }}/>}
        </div>
      )}
    </div>
  );
}

function RoomHeader({ room, count, tag }) {
  const col = locationTagColor(tag);
  const TagIcon = locationTagIcon(tag);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'18px 4px 2px' }}>
      {TagIcon ? <TagIcon s={14} c={col || C.forest}/> : <IconPin s={14} c={C.brown}/>}
      <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:19, color: col || C.forest, lineHeight:1.1 }}>{room}</span>
      <div style={{ flex:1, height:'0.5px', background:'rgba(45,80,22,0.12)', margin:'0 4px' }}/>
      <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.55, letterSpacing:0.3, flexShrink:0 }}>{count}</span>
    </div>
  );
}

function ContextMenu({ plant, onClose, onEdit, onMove, onRemove, isDesktop }) {
  const Item = ({ icon, label, danger, onClick, i }) => (
    <div onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:13, padding:'14px 16px', cursor:'pointer',
      borderTop: C.hair, animation:`slideFromL 220ms ease both`, animationDelay:`${i*30}ms`,
    }}>
      <div style={{ width:34, height:34, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background: danger ? 'rgba(180,71,46,0.1)' : 'rgba(122,158,78,0.13)' }}>{icon}</div>
      <span style={{ fontFamily:FONT_SANS, fontSize:14.5, fontWeight:600, color: danger ? '#B4472E' : C.ink, whiteSpace:'nowrap' }}>{label}</span>
    </div>
  );
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:35, background:'rgba(42,42,38,0.34)', display:'flex', flexDirection:'column', justifyContent:'flex-end', animation:'fade 160ms ease' }}>
      <div onClick={e=>e.stopPropagation()} style={{ position:'relative', margin:'0 12px 12px', background:C.bg, borderRadius:rad(24), overflow:'hidden', animation:'slideUp 260ms cubic-bezier(.2,.8,.2,1)', boxShadow:'0 -4px 30px rgba(0,0,0,0.12)' }}>
        <div style={warmEdgeStyle(0.8)}/>
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:8, padding:'15px 16px 13px' }}>
          <Leaf size={17} color={C.forest}/>
          <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:19, color:C.forest }}>{plant.name}</span>
          <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6 }}>{plant.location}</span>
        </div>
        <Item i={0} icon={<IconPin s={17} c={C.forest}/>} label="Move to another room" onClick={()=>{ onClose(); onMove(plant); }}/>
        <Item i={1} icon={<svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M13 3.5l3.5 3.5L7 16.5H3.5V13L13 3.5Z" stroke={C.forest} strokeWidth="1.6" strokeLinejoin="round"/></svg>} label="Edit plant" onClick={()=>{ onClose(); onEdit(plant); }}/>
        <Item i={2} danger icon={<svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M4 5.5h12M8 5.5V4a1 1 0 011-1h2a1 1 0 011 1v1.5M6 5.5l.7 10a1.5 1.5 0 001.5 1.4h3.6a1.5 1.5 0 001.5-1.4l.7-10" stroke="#B4472E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>} label="Remove plant" onClick={()=>{ onClose(); onRemove(plant.id); }}/>
        <div onClick={onClose} style={{ borderTop:C.hair, textAlign:'center', padding:'14px', fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:C.brown, opacity:0.7, cursor:'pointer' }}>Cancel</div>
      </div>
    </div>
  );
}

function EmptyGarden({ onAdd, reduceMotion }) {
  return (
    <div style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'52px 40px 0', zIndex:2 }}>
      <div style={{ position:'relative', width:128, height:128, borderRadius:999, background:'rgba(122,158,78,0.1)', display:'flex', alignItems:'center', justifyContent:'center', animation: reduceMotion ? undefined : 'sproutBob 5s ease-in-out infinite' }}>
        <div style={{ position:'absolute', inset:0, borderRadius:999, border:'1px dashed rgba(45,80,22,0.22)' }}/>
        <LeafOutline size={58} color={C.sage} sw={1.3}/>
      </div>
      <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:27, color:C.forest, marginTop:26 }}>Your garden is empty</div>
      <div style={{ fontFamily:FONT_SANS, fontSize:13, color:C.ink, opacity:0.58, marginTop:8, lineHeight:1.55, maxWidth:240 }}>Add your first plant to start tracking watering, light and care.</div>
      <div onClick={onAdd} style={{ marginTop:24, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:9, background:C.forest, color:'#fff', borderRadius:rad(16), padding:'14px 22px', boxShadow:'0 6px 16px rgba(45,80,22,0.24)' }}>
        <IconPlus s={17} c="#fff"/>
        <span style={{ fontFamily:FONT_SANS, fontSize:15, fontWeight:600 }}>Add your first plant</span>
      </div>
      <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.6, marginTop:16 }}>Or use Scan to identify one from a photo, or Settings → App to import an existing garden.</div>
    </div>
  );
}

// deterministic-ish hero pick — a companion callout, not a nag: "needs
// water" is one signal among several, never an override, so the banner
// doesn't read as guilt-tripping every single day. Recomputed once per
// GardenScreen mount (i.e. once per tab-visit/day), never per re-render.
// collage tile count for the hero — a single blown-up photo stretched across
// a wide/short banner forces a heavy upscale on typical phone-camera photos
// (compressImage caps storage at 1024px), so the banner is a small considered
// collage instead: each tile covers far less display area, so it needs far
// less upscale from the same source resolution.
const HERO_TILES = 3;
// a whisper-layer of seasonal variety on the hero's quietest caption (the
// "nothing urgent, nothing new" fallback) — real calendar month, no user
// input, no palette/accent override. Deliberately just wording: a genuine
// seasonal color tint risked fighting the user's own chosen palette/accent,
// which this app treats as sacred everywhere else, so that idea stops here.
const SEASONAL_QUIET_CAPTIONS = {
  spring: ['New growth this time of year', 'Spring light on {name}', 'A quiet spring moment with {name}'],
  summer: ['Long days for {name}', 'A quiet moment with {name}', 'Summer light on the leaves'],
  autumn: ['Slower days for {name}', 'Autumn light on {name}', 'A quiet moment with {name}'],
  winter: ['{name}, holding steady through winter', 'A quiet moment with {name}', 'Winter light, still green'],
};
function currentSeason(month = new Date().getMonth()) {
  if (month <= 1 || month === 11) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'autumn';
}
function seasonalQuietCaption(name) {
  const season = currentSeason();
  const pool = SEASONAL_QUIET_CAPTIONS[season];
  // deterministic per day (not per render) so the caption doesn't flicker
  // between options on every rotation tick within the same visit
  const idx = new Date().getDate() % pool.length;
  return pool[idx].replace('{name}', name);
}
function pickGardenHero(plants) {
  const withPhoto = p => (p.photos && p.photos[0]) || p.userImage || p.image;
  const candidates = (plants || []).filter(withPhoto);
  if (!candidates.length) return null;
  let lastFeatured = [];
  try { lastFeatured = JSON.parse(localStorage.getItem('caulis_hero_last') || '[]'); } catch (e) {}
  const maxId = Math.max(...candidates.map(p => p.id));
  const scored = candidates.map(p => {
    let score = Math.random() * 0.5; // tie-break
    let why = 'featured';
    if (statusOf(p.days, p.every, p.snoozedUntil) === 'needs') { score += 3; why = 'needs'; }
    if (maxId - p.id <= 4) { score += 2; if (why === 'featured') why = 'recent'; } // id order proxy for "recently added"
    if (!lastFeatured.includes(p.id)) score += 1;
    return { p, score, why };
  });
  scored.sort((a, b) => b.score - a.score);
  const pick = scored[0];
  try { localStorage.setItem('caulis_hero_last', JSON.stringify([pick.p.id, ...lastFeatured.filter(id => id !== pick.p.id)].slice(0, 5))); } catch (e) {}
  // dedupe by plant id (a plant can't appear twice in its own collage)
  const group = [];
  const seen = new Set();
  for (const s of scored) {
    if (seen.has(s.p.id)) continue;
    seen.add(s.p.id);
    group.push({ plant: s.p, why: s.why });
    if (group.length >= HERO_TILES) break;
  }
  return { plant: pick.p, why: pick.why, group };
}
function GardenHeroBanner({ plants, onOpen, reduceMotion, czechMode, isDesktop, style, placement, onReposition, labUnlocked, onUnlock }) {
  const [hero, setHero] = useState(null);
  // the previous pick, kept mounted just long enough to crossfade out under
  // the new one — without this a rotation is a hard swap ("hot reload"
  // snap), since a plain setHero(next) unmounts the old collage instantly.
  const [prevHero, setPrevHero] = useState(null);
  const [crossfading, setCrossfading] = useState(false);
  // re-picks live, without ever remounting this component, whenever the day
  // rolls over or the most-urgent (needs-water) plant changes — the two
  // conditions that should visibly refresh "what's featured". A 5-minute
  // tick keeps that check alive even if `plants` itself doesn't change for
  // a long open session; a plants change (watering, add/remove) re-checks
  // immediately for free via the effect's own dependency.
  const [tick, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 5 * 60 * 1000); return () => clearInterval(iv); }, []);
  const lastPick = useRef({ date: null, topNeedsId: null });
  useEffect(() => {
    if (!plants || !plants.length) return;
    const todayStr = new Date().toDateString();
    const urgent = plants.filter(p => statusOf(p.days, p.every, p.snoozedUntil) === 'needs')
      .sort((a, b) => (b.days / b.every) - (a.days / a.every))[0];
    const topNeedsId = urgent ? urgent.id : null;
    const last = lastPick.current;
    if (hero && last.date === todayStr && last.topNeedsId === topNeedsId) return;
    lastPick.current = { date: todayStr, topNeedsId };
    const next = pickGardenHero(plants);
    if (!next) return;
    setHero(prev => {
      if (prev && prev.plant.id === next.plant.id) return prev; // same pick — nothing to transition
      if (prev) {
        setPrevHero(prev);
        setCrossfading(true);
        setTimeout(() => { setCrossfading(false); setPrevHero(null); }, 460);
      }
      return next;
    });
  }, [plants, tick]);

  // secret "Layout Lab" — 7 taps unlocks it (same discovery shape as the
  // Developer panel's 7-tap version row, no PIN needed since this only
  // repositions a decorative element). Once unlocked, a long-press enters a
  // real drag mode: drag the banner up past the header to move it above the
  // title, or back down to return it below — genuinely repositionable, not
  // just a settings flip, for whoever finds it.
  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  const [labToast, setLabToast] = useState(null);
  const [labMode, setLabMode] = useState(false);
  // "why this photo" — the scoring behind pickGardenHero is real (needs-water
  // signal, recency, not-shown-lately), but was entirely invisible; a curious
  // user had no way to know it wasn't random. A tiny reveal, not a settings
  // page: tap it, get one honest sentence, it fades — same toast vocabulary
  // as labToast below, never competing with the tap-to-open/7-tap/drag
  // gestures already layered on this banner (stopPropagation keeps it inert
  // to all three).
  const [whyToast, setWhyToast] = useState(false);
  const whyTimer = useRef(null);
  const showWhy = (e) => {
    e.stopPropagation();
    setWhyToast(true);
    if (whyTimer.current) clearTimeout(whyTimer.current);
    whyTimer.current = setTimeout(() => setWhyToast(false), 3200);
  };
  const [dragDy, setDragDy] = useState(0);
  const pressTimer = useRef(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  // classic single-tap-vs-multi-tap-burst disambiguation: a tap does NOT
  // open synchronously. It arms a short (near-imperceptible) deferred open,
  // well under the ~300-500ms double-tap threshold used everywhere. If a
  // second tap lands before that timer fires, the pending open is cancelled
  // and counting continues — so a genuine 7-tap burst never opens Plant
  // Detail mid-sequence (which would obscure the banner and make tap 8+
  // unreachable), while a truly isolated single tap still opens, just a
  // hair later than instant. Only the tap-counting path needs this — once
  // labUnlocked, a plain tap opens immediately again (see onUp).
  const openTimer = useRef(null);
  const OPEN_DELAY = 280;

  const handleTap = () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 1400);
    tapCount.current += 1;
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
    if (tapCount.current >= 7) {
      tapCount.current = 0;
      onUnlock && onUnlock();
      setLabToast('Layout Lab unlocked — long-press me to drag.');
      setTimeout(() => setLabToast(null), 3200);
      return;
    }
    openTimer.current = setTimeout(() => { openTimer.current = null; onOpen(hero.plant.id); }, OPEN_DELAY);
  };
  const onDown = (e) => {
    dragging.current = false;
    startY.current = e.clientY;
    if (labUnlocked) {
      pressTimer.current = setTimeout(() => { dragging.current = true; setLabMode(true); }, 480);
    }
  };
  const onMove = (e) => {
    if (!dragging.current) return;
    setDragDy(Math.max(-70, Math.min(70, e.clientY - startY.current)));
  };
  const onUp = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (dragging.current) {
      if (dragDy < -40 && placement !== 'above') onReposition && onReposition('above');
      else if (dragDy > 40 && placement !== 'below') onReposition && onReposition('below');
      setDragDy(0);
      dragging.current = false;
      return;
    }
    if (labUnlocked) { if (!labMode) onOpen(hero.plant.id); return; }
    handleTap();
  };

  if (!hero) return null;
  const tileImg = t => (t.plant.photos && t.plant.photos[0]) || t.plant.userImage || t.plant.image;
  const hideBrokenTile = e => { e.target.style.opacity = '0'; };
  // shared collage+caption content for a given hero pick — used for both the
  // live hero and (briefly, during a rotation) the outgoing prevHero, so the
  // two can cross-dissolve instead of the old pick vanishing instantly the
  // frame the new one appears (the "hot reload snap" the user was seeing —
  // there was previously no rotation logic at all to transition between).
  const renderContent = (h, fadingOut) => {
    const { plant, why, group } = h;
    const name = czechMode && plant.czech ? plant.czech : plant.name;
    const caption = why === 'needs' ? `${name} would love a drink today` : why === 'recent' ? 'New in your garden' : seasonalQuietCaption(name);
    const tiles = (group && group.length ? group : [{ plant, why }]).slice(0, HERO_TILES);
    return (
      <div style={{
        position: fadingOut ? 'absolute' : 'relative', inset: fadingOut ? 0 : undefined,
        width:'100%', height:'100%',
        opacity: fadingOut ? (crossfading ? 0 : 1) : 1,
        transition: fadingOut ? 'opacity 420ms ease' : undefined,
        animation: !fadingOut && !reduceMotion && crossfading ? 'fade 420ms ease both' : undefined,
      }}>
        {tiles.length === 1 ? (
          <img key={tiles[0].plant.id} src={tileImg(tiles[0])} alt="" onError={hideBrokenTile} style={{
            position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transformOrigin:'center',
            animation: reduceMotion ? undefined : 'kenBurns 16s linear both',
          }}/>
        ) : (
          <div style={{ position:'absolute', inset:0, display:'flex', gap:3 }}>
            <div style={{ flex:'0 0 62%', position:'relative', overflow:'hidden' }}>
              <img key={tiles[0].plant.id} src={tileImg(tiles[0])} alt="" onError={hideBrokenTile} style={{
                position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transformOrigin:'center',
                animation: reduceMotion ? undefined : 'kenBurns 16s linear both',
              }}/>
            </div>
            <div style={{ flex:'1 1 auto', display:'flex', flexDirection:'column', gap:3 }}>
              {tiles.slice(1).map((t, i) => (
                <div key={t.plant.id} style={{ flex:1, position:'relative', overflow:'hidden' }}>
                  <img src={tileImg(t)} alt="" onError={hideBrokenTile} style={{
                    position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', transformOrigin:'center',
                    animation: reduceMotion ? undefined : 'kenBurnsTile 16s linear both',
                    animationDelay: reduceMotion ? undefined : `${i * 200}ms`,
                  }}/>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ position:'absolute', inset:0, ...warmEdgeStyle(1) }}/>
        <div style={{ position:'absolute', inset:0, boxShadow:PHOTO_FRAME_SHADOW }}/>
        <div style={{ position:'absolute', inset:0, background:`linear-gradient(180deg, transparent 38%, ${C.bg}F2 94%)` }}/>
        {/* deliberately asymmetric: the caption reads as a corner note, not a
            centered banner strip — a small rotated leaf accent breaks the
            grid's otherwise even rhythm rather than sitting dead-center */}
        <div style={{ position:'absolute', left:16, right:'26%', bottom:12, display:'flex', alignItems:'flex-end', gap:6 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:19, color:C.forest }}>{name}</div>
            <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.85, marginTop:2, lineHeight:1.35 }}>{caption}</div>
          </div>
          {!fadingOut && (
            <div onClick={showWhy} role="button" aria-label="Why this photo?" style={{
              flexShrink:0, width:16, height:16, borderRadius:999, marginBottom:1,
              background:'rgba(255,255,255,0.55)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
            }}>
              <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:700, fontSize:10.5, color:C.forest, lineHeight:1 }}>i</span>
            </div>
          )}
        </div>
        <div style={{ position:'absolute', top:12, right:14, opacity:0.7, transform:'rotate(12deg)', filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}>
          <LeafOutline size={16} color="#fff" sw={1.6}/>
        </div>
      </div>
    );
  };
  const whyText = hero && (
    hero.why === 'needs' ? "Featured because it's due for water — a nudge, not the only reason a photo gets picked."
    : hero.why === 'recent' ? "Featured for being new here — recently-added plants get a turn in the spotlight."
    : "Featured for a quiet moment — no plant needed water, so it's here on rotation and hasn't shown up in the last few days."
  );
  return (
    <div style={{ position:'relative' }}>
      {whyToast && whyText && (
        <div style={{ position:'absolute', left:16, right:16, bottom:-8, transform:'translateY(100%)', zIndex:4, display:'flex', justifyContent:'flex-start', animation:'popUp 200ms cubic-bezier(.2,.9,.3,1.2)', pointerEvents:'none' }}>
          <div style={{ maxWidth:280, background:C.toast, color:'#fff', borderRadius:12, padding:'9px 12px', fontFamily:FONT_SANS, fontSize:11.5, lineHeight:1.4, boxShadow:'0 8px 20px rgba(0,0,0,0.24)' }}>{whyText}</div>
        </div>
      )}
      {labToast && (
        <div style={{ position:'fixed', bottom:'calc(86px + env(safe-area-inset-bottom))', left:0, right:0, display:'flex', justifyContent:'center', zIndex:60, animation:'popUp 240ms cubic-bezier(.2,.9,.3,1.2)', pointerEvents:'none' }}>
          <div style={{ background:C.toast, color:'#fff', borderRadius:999, padding:'10px 18px', fontFamily:FONT_SANS, fontSize:13, fontWeight:500, boxShadow:'0 10px 26px rgba(0,0,0,0.28)' }}>{labToast}</div>
        </div>
      )}
      {labMode && (
        <div style={{ position:'absolute', top:-24, left:18, zIndex:3, display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontFamily:FONT_SANS, fontSize:10.5, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase', color:C.sage, background:'rgba(122,158,78,0.16)', borderRadius:999, padding:'3px 9px' }}>Layout Lab · drag up/down</span>
          <span onClick={()=>setLabMode(false)} style={{ cursor:'pointer', fontFamily:FONT_SANS, fontSize:10.5, fontWeight:700, color:C.brown, opacity:0.7 }}>Done</span>
        </div>
      )}
      <div
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        style={{
          margin:'14px 18px 0', height: isDesktop ? 210 : 150, borderRadius:rad(20), overflow:'hidden', position:'relative', cursor:'pointer',
          boxShadow: labMode ? `0 0 0 2px ${C.sage}, 0 8px 22px rgba(45,80,22,0.14)` : '0 8px 22px rgba(45,80,22,0.1)',
          transform: dragging.current ? `translateY(${dragDy}px) scale(1.02)` : 'none',
          transition: dragging.current ? 'none' : 'box-shadow 200ms ease, transform 200ms ease',
          animation: reduceMotion ? undefined : 'heroIn 420ms cubic-bezier(.2,.8,.2,1) both',
          touchAction:'none',
          // wide desktop sidebar layouts have far more content width than any
          // fixed cap can anticipate (a 640px, then a 980px cap, both still
          // left visible dead space next to the full-width plant grid below
          // at typical desktop viewports) — match the grid's own width
          // exactly instead of guessing another fixed number. calc() (not a
          // plain 100%) accounts for this same element's own 18px left/right
          // margin below — 100% + that margin overflowed the sidebar layout
          // and forced a horizontal scrollbar.
          width: isDesktop ? 'calc(100% - 36px)' : undefined,
          ...style,
        }}>
        {/* collage, not one full-bleed photo stretched over a wide/short banner —
            a single stored photo (compressImage caps at 1024px) has to upscale
            hard to cover the whole width, which is what made the banner look
            pixelated; each tile below covers far less area so it needs far less
            upscale from the same source resolution. Featured tile (the scoring
            winner) reads left and large; up to two supporting tiles stack right —
            asymmetric on purpose, same "corner note, not centered" logic as the
            caption below. Falls back to one full-bleed image when only one
            plant photo exists at all. */}
        {prevHero && renderContent(prevHero, true)}
        {renderContent(hero, false)}
      </div>
    </div>
  );
}

function GardenScreen({ plants, roomLight, onOpen, onAdd, onLongPress, onReorder, isDesktop, czechMode, density, gridCols: gridColsPref, hideHealthy, onBulkWater, onBulkQueue, onBulkMove, onBulkRemove, onHaptic, onWaterOne, badges, ambientBadges, badgeDensity, onOpenBadges, gardenName, reduceMotion, heroBanner = 'below', onSetHeroBanner, layoutLabUnlocked, onUnlockLayoutLab, locationTags, cardDateMode = 'last' }) {
  const [healthOpen, setHealthOpen] = useState(false);
  const health = gardenHealthScore(plants, roomLight || {});
  const [sort, setSort] = useState(() => GS.get('caulis_g_sort', 'all'));
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState(() => GS.get('caulis_g_status', 'all'));
  const [fLoc, setFLoc] = useState(() => GS.get('caulis_g_loc', null));
  const [filterOpen, setFilterOpen] = useState(false);
  useEffect(() => { GS.set('caulis_g_sort', sort); }, [sort]);
  useEffect(() => { GS.set('caulis_g_status', fStatus); }, [fStatus]);
  useEffect(() => { GS.set('caulis_g_loc', fLoc); }, [fLoc]);
  const [selMode, setSelMode] = useState(false);
  const [sel, setSel] = useState(() => new Set());
  const exitSel = () => { setSelMode(false); setSel(new Set()); };
  const toggleSel = (id) => { onHaptic && onHaptic(); setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const runBulk = (fn) => { const ids = [...sel]; if (ids.length) fn(ids); exitSel(); };
  const re = useReorder(onReorder);
  const needs = plants.filter(p => statusOf(p.days,p.every,p.snoozedUntil) !== 'ok').length;
  const tintFor = id => TINTS[(id-1)%TINTS.length];
  const empty = plants.length === 0;
  const rooms = [...new Set(plants.map(p => p.location).filter(Boolean))].sort();
  const sidePad = isDesktop ? 28 : 18;
  const topPad  = isDesktop ? 32 : 56;
  const cols = gridColsPref || (density === 'compact' ? 3 : 2);
  const gridCols = isDesktop ? 'repeat(auto-fill, minmax(185px, 1fr))' : `repeat(${cols}, minmax(0, 1fr))`;
  const compact = !isDesktop && cols >= 3;
  const gridGap = ds(compact ? 10 : 14);

  const nq = q.trim().toLowerCase();
  const matched = plants.filter(p => {
    if (nq && ![p.name, p.czech, p.latin, p.location, p.care, p.fact].some(v => (v||'').toLowerCase().includes(nq))) return false;
    if (hideHealthy && statusOf(p.days, p.every, p.snoozedUntil) === 'ok') return false;
    if (fStatus !== 'all' && statusOf(p.days, p.every, p.snoozedUntil) !== fStatus) return false;
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

  const cardProps = { onOpen, onLongPress, onWater: onWaterOne, czechMode, selectable: selMode, onToggleSelect: toggleSel, compact, reduceMotion, locationTags, cardDateMode };
  let entranceCounter = 0;

  // easter egg: rapid-tapping the corner sprig watermark is a discoverable
  // no-op everywhere else in the app — reward the curiosity with a one-line joke
  const sprigTaps = useRef(0);
  const sprigTimer = useRef(null);
  const [sprigMsg, setSprigMsg] = useState(null);
  const SPRIG_LINES = ["That tickles.", "Still just a sprig.", "It's not going to grow any faster.", "Okay, you found it — nothing else here.", "A watched sprig never sprouts."];
  const tapSprig = () => {
    if (sprigTimer.current) clearTimeout(sprigTimer.current);
    sprigTimer.current = setTimeout(() => { sprigTaps.current = 0; }, 1200);
    sprigTaps.current += 1;
    if (sprigTaps.current >= 5) {
      sprigTaps.current = 0;
      setSprigMsg(SPRIG_LINES[Math.floor(Math.random() * SPRIG_LINES.length)]);
      setTimeout(() => setSprigMsg(null), 2200);
      try { localStorage.setItem('caulis_egg_sprig', '1'); } catch(e) {}
    }
  };
  // easter egg: a rare data-state coincidence — rapid-tapping the health pill
  // only pays off the day it happens to read a perfect 100
  const healthTaps = useRef(0);
  const healthTapTimer = useRef(null);
  const [healthMsg, setHealthMsg] = useState(null);
  const tapHealth = () => {
    if (!health || health.score !== 100) return;
    if (healthTapTimer.current) clearTimeout(healthTapTimer.current);
    healthTapTimer.current = setTimeout(() => { healthTaps.current = 0; }, 1200);
    healthTaps.current += 1;
    if (healthTaps.current >= 5) {
      healthTaps.current = 0;
      setHealthMsg('Immaculate. Suspiciously so.');
      setTimeout(() => setHealthMsg(null), 2400);
      try { localStorage.setItem('caulis_egg_perfect_health', '1'); } catch(e) {}
    }
  };

  return (
    <div style={{ minHeight:'100%', position:'relative', paddingBottom:24 }}>
      <Sprig onTap={tapSprig}/>
      {sprigMsg && (
        <div style={{ position:'fixed', bottom: isDesktop?24:'calc(86px + env(safe-area-inset-bottom))', left:0, right:0, display:'flex', justifyContent:'center', zIndex:60, animation:'popUp 240ms cubic-bezier(.2,.9,.3,1.2)', pointerEvents:'none' }}>
          <div style={{ background:C.toast, color:'#fff', borderRadius:999, padding:'10px 18px', fontFamily:FONT_SANS, fontSize:13, fontWeight:500, boxShadow:'0 10px 26px rgba(0,0,0,0.28)', display:'flex', alignItems:'center', gap:8 }}><Leaf size={14} color="#fff"/> {sprigMsg}</div>
        </div>
      )}
      {healthMsg && (
        <div style={{ position:'fixed', bottom: isDesktop?24:'calc(86px + env(safe-area-inset-bottom))', left:0, right:0, display:'flex', justifyContent:'center', zIndex:60, animation:'popUp 240ms cubic-bezier(.2,.9,.3,1.2)', pointerEvents:'none' }}>
          <div style={{ background:C.toast, color:'#fff', borderRadius:999, padding:'10px 18px', fontFamily:FONT_SANS, fontSize:13, fontWeight:500, boxShadow:'0 10px 26px rgba(0,0,0,0.28)', display:'flex', alignItems:'center', gap:8 }}>✦ {healthMsg}</div>
        </div>
      )}
      {!empty && heroBanner === 'above' && <GardenHeroBanner plants={plants} onOpen={onOpen} reduceMotion={reduceMotion} czechMode={czechMode} isDesktop={isDesktop} style={{ margin:`${topPad-30}px 18px 0` }} placement="above" onReposition={onSetHeroBanner} labUnlocked={layoutLabUnlocked} onUnlock={onUnlockLayoutLab}/>}
      <div style={{ padding:`${topPad}px ${sidePad}px 0`, position:'relative', zIndex:2 }}>
        <div style={{ display:'flex', alignItems: isDesktop ? 'flex-end' : 'center', justifyContent:'space-between', gap:12 }}>
          <div>
            {!isDesktop && (
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:22 }}>
                <div style={{ width:30, height:30, borderRadius:999, background:'rgba(122,158,78,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Leaf size={16} color={C.forest}/>
                </div>
                <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:30, color:C.forest, letterSpacing:0.3 }}>{gardenName || 'Caulis'}</span>
              </div>
            )}
            <div style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:500, color:C.brown, opacity:0.72, letterSpacing:0.3, textTransform:'uppercase' }}>{todayGreeting()}</div>
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:500, fontSize: isDesktop ? 32 : 27, color:C.ink, marginTop:2, lineHeight:1.2 }}>
              {empty ? <>Welcome to Caulis.</> : needs > 0 ? <>{needs} plants would love a drink.</> : <>Everything looks happy today.</>}
            </div>
            {health && (
              <div onClick={()=>{ setHealthOpen(o=>!o); tapHealth(); }} style={{ marginTop:10, display:'inline-flex', alignItems:'center', gap:7, cursor:'pointer' }}>
                <span style={{ width:8, height:8, borderRadius:999, background:HEALTH_TIERS[health.tier].dot, flexShrink:0 }}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.ink, opacity:0.75 }}>
                  Garden health {health.score} · {HEALTH_TIERS[health.tier].label}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" style={{ transform: healthOpen?'rotate(180deg)':'rotate(0deg)', transition:'transform 220ms ease', opacity:0.45, flexShrink:0 }}>
                  <path d="M6 9l6 6 6-6" stroke={C.ink} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            {health && healthOpen && (
              <div style={{ marginTop:8, padding:'10px 14px', borderRadius:rad(14), background:'rgba(45,80,22,0.05)', display:'flex', flexDirection:'column', gap:4, maxWidth:280 }}>
                {health.needs > 0 && <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.7 }}>{health.needs} need{health.needs===1?'s':''} water now</span>}
                {health.soon > 0 && <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.7 }}>{health.soon} will soon</span>}
                {health.mismatch > 0 && <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.7 }}>{health.mismatch} in a mismatched-light room</span>}
                {health.dropping > 0 && <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.7 }}>{health.dropping} recently reported dropping leaves</span>}
                {health.struggling > 0 && <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.7 }}>{health.struggling} recently reported stressed</span>}
                {!health.needs && !health.soon && !health.mismatch && !health.dropping && !health.struggling && <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.7 }}>Nothing pulling the score down.</span>}
              </div>
            )}
          </div>
          <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:8 }}>
            {!empty && badges && badges.filter(b=>!b.revoked).length > 0 && (
              <div onClick={onOpenBadges} title="Badges" style={{ height:38, borderRadius:999, background:C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.06)', display:'flex', alignItems:'center', gap:6, padding:'0 10px 0 12px', cursor:'pointer' }}>
                <BadgeIconSprout s={16} c={C.forest}/>
                <span style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.ink }}>{badges.filter(b=>!b.revoked).length}/{BADGE_DEFS.length}</span>
                <svg width="8" height="8" viewBox="0 0 24 24" style={{ opacity:0.4, flexShrink:0 }}><path d="M9 6l6 6-6 6" stroke={C.brown} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            )}
            {!empty && (
              <div onClick={()=>{ if (selMode) exitSel(); else setSelMode(true); }} title="Select plants" style={{ width:38, height:38, borderRadius:999, background: selMode?C.forest:C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L20 4" stroke={selMode?'#fff':C.forest} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" stroke={selMode?'#fff':C.forest} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            )}
            <div onClick={onAdd} title="Add plant" style={{ width:38, height:38, borderRadius:999, background:C.panel, border:C.hair, boxShadow:'0 2px 8px rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <IconPlus/>
            </div>
          </div>
        </div>
      </div>

      {empty && <EmptyGarden onAdd={onAdd} reduceMotion={reduceMotion}/>}

      {!empty && heroBanner === 'below' && <GardenHeroBanner plants={plants} onOpen={onOpen} reduceMotion={reduceMotion} czechMode={czechMode} isDesktop={isDesktop} placement="below" onReposition={onSetHeroBanner} labUnlocked={layoutLabUnlocked} onUnlock={onUnlockLayoutLab}/>}

      {!empty && (
        <div style={{ padding:`12px ${sidePad}px 0`, position:'relative', zIndex:2 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, height:42, borderRadius:rad(12), background:C.panel, border:C.hair, padding:'0 12px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, opacity:0.5 }}><circle cx="11" cy="11" r="7" stroke={C.ink} strokeWidth="1.7"/><path d="M21 21l-4-4" stroke={C.ink} strokeWidth="1.7" strokeLinecap="round"/></svg>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search plants…" style={{ flex:1, border:'none', background:'transparent', outline:'none', fontFamily:FONT_SANS, fontSize:14, color:C.ink }}/>
            {q && <div onClick={()=>setQ('')} style={{ cursor:'pointer', opacity:0.5 }}><svg width="13" height="13" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke={C.ink} strokeWidth="1.6" strokeLinecap="round"/></svg></div>}
          </div>
        </div>
      )}

      {!empty && (
        <GardenFilterBar
          sort={sort} setSort={setSort} sidePad={sidePad}
          filterOpen={filterOpen} onToggleFilter={()=>setFilterOpen(o=>!o)}
          filterActive={fStatus !== 'all' || !!fLoc}
        />
      )}

      {!empty && (
        <div style={{ display:'grid', gridTemplateRows: filterOpen ? '1fr' : '0fr', transition:'grid-template-rows 260ms ease' }}>
          <div style={{ overflow:'hidden', minHeight:0 }}>
            <div data-noswipe="1" style={{ display:'flex', alignItems:'center', gap:8, overflowX:'auto', padding:`10px ${sidePad}px 2px`, position:'relative', zIndex:2, WebkitOverflowScrolling:'touch' }}>
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
                const tag = locationTags && locationTags[r];
                const col = locationTagColor(tag);
                const TagIcon = locationTagIcon(tag);
                return (
                  <div key={r} onClick={()=>setFLoc(on ? null : r)} style={{
                    flexShrink:0, cursor:'pointer', whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:5, borderRadius:999, padding:'6px 12px',
                    background: on ? (col ? `${col}22` : 'rgba(122,158,78,0.16)') : C.panel,
                    border: on ? `1px solid ${col || 'rgba(110,154,62,0.5)'}` : '0.5px solid rgba(45,80,22,0.14)',
                    color: on ? (col || C.forest) : C.ink, fontFamily:FONT_SANS, fontSize:12, fontWeight: on?600:500, transition:'all 140ms ease',
                  }}>{TagIcon ? <TagIcon s={11} c={on ? (col||C.forest) : (col||C.brown)}/> : <IconPin s={11} c={on?C.forest:C.brown}/>} {r}</div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!empty && matched.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 30px', position:'relative', zIndex:2 }}>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:20, color:C.forest }}>No matches</div>
          <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.55, marginTop:4 }}>{nq ? `Nothing matches "${q}".` : 'No plants match these filters.'}</div>
          {(nq || fStatus !== 'all' || fLoc) && (
            <div onClick={()=>{ setQ(''); setFStatus('all'); setFLoc(null); }} style={{ display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer', marginTop:16, background:C.line, borderRadius:999, padding:'8px 16px' }}>
              <span style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.forest }}>Clear filters</span>
            </div>
          )}
        </div>
      )}

      {!empty && sort === 'location' && (
        <div style={{ padding:`4px ${sidePad}px 0`, position:'relative', zIndex:2 }}>
          {groups.map(g => (
            <div key={g.room}>
              <RoomHeader room={g.room} count={g.items.length} tag={locationTags && locationTags[g.room]}/>
              <div style={{ display:'grid', gridTemplateColumns:gridCols, gap:gridGap, marginTop:10 }}>
                {g.items.map(p => <PlantCard key={p.id} plant={p} tint={tintFor(p.id)} {...cardProps} selected={sel.has(p.id)} entranceIdx={entranceCounter++}/>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!empty && sort !== 'location' && (() => {
        const dragEnabled = sort === 'all' && !nq && fStatus === 'all' && !fLoc && !hideHealthy && !selMode;
        return (
          <div ref={dragEnabled ? re.containerRef : null} style={{ display:'grid', gridTemplateColumns:gridCols, gap:gridGap, padding:`14px ${sidePad}px 0`, position:'relative', zIndex:2 }}>
            {flat.map((p,i) => <PlantCard key={p.id} plant={p} tint={tintFor(p.id)} {...cardProps} selected={sel.has(p.id)} grip={dragEnabled ? re.grip(i) : undefined} dragging={dragEnabled && re.dragIdx===i} over={dragEnabled && re.overIdx===i && re.dragIdx!==i} entranceIdx={i}/>)}
          </div>
        );
      })()}

      {selMode && (
        <div data-noswipe="1" style={{ position:'fixed', left:0, right:0, bottom: isDesktop?16:'calc(78px + env(safe-area-inset-bottom))', zIndex:40, display:'flex', justifyContent:'center', padding:'0 12px', pointerEvents:'none' }}>
          <div style={{ pointerEvents:'auto', display:'flex', alignItems:'center', gap:2, background:C.panel, borderRadius:999, padding:'5px 6px 5px 14px', boxShadow:'0 10px 30px rgba(45,80,22,0.2)', border:C.hair }}>
            <span style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.ink, marginRight:4, whiteSpace:'nowrap' }}>{sel.size}</span>
            {[['Water', onBulkWater], ['Add to queue', onBulkQueue], ['Move', onBulkMove]].map(([label, fn]) => (
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
function NeedsRow({ plant, tint, onOpen, onLongPress, onSnooze, onWater, czechMode, reduceMotion }) {
  const [press, setPress] = useState(false);
  const [dx, setDx] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const timer = useRef(null);
  const longed = useRef(false);
  const startX = useRef(0), startY = useRef(0);
  const swiping = useRef(false), openRef = useRef(false), dxRef = useRef(0), down = useRef(false);
  const status = statusOf(plant.days, plant.every, plant.snoozedUntil);
  // a small "grew a little" pulse — distinct from and smaller than the
  // water-all confetti (which stays reserved for bulk wins). Particles drift
  // UP and fade, reading as growth rather than the falling-confetti treatment.
  const fireCelebration = () => {
    if (reduceMotion) return;
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 700);
  };
  const OPEN = -84;      // left-swipe (dx negative): swipe-through-to-snooze
  const WATER_MAX = 96;  // right-swipe (dx positive): swipe-through-to-water
  const WATER_THRESH = 72;
  const SNOOZE_THRESH = -60;
  const setX = (v) => { dxRef.current = v; setDx(v); };

  const start = (e) => {
    down.current = true; setPress(true); longed.current = false; swiping.current = false;
    startX.current = e.clientX; startY.current = e.clientY;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch(_) {}
    timer.current = setTimeout(() => { longed.current = true; setPress(false); onLongPress && onLongPress(plant); }, 480);
  };
  const move = (e) => {
    if (!down.current) return;
    const mx = e.clientX - startX.current, my = e.clientY - startY.current;
    if (!swiping.current && Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my)) {
      swiping.current = true; if (timer.current) clearTimeout(timer.current); setPress(false);
    }
    if (swiping.current) setX(Math.max(OPEN, Math.min(WATER_MAX, mx)));
  };
  const end = () => {
    down.current = false; setPress(false); if (timer.current) clearTimeout(timer.current);
    if (swiping.current) {
      swiping.current = false;
      if (dxRef.current >= WATER_THRESH) { onWater && onWater(plant.id); fireCelebration(); setX(0); return; }
      if (dxRef.current <= SNOOZE_THRESH) { onSnooze && onSnooze(plant.id, 2); setX(0); return; }
      setX(0);
    }
  };
  const click = () => {
    if (longed.current) { longed.current = false; return; }
    if (dxRef.current !== 0) { setX(0); return; }
    onOpen(plant.id);
  };
  const waterPull = Math.max(0, Math.min(1, dx / WATER_THRESH));
  const snoozePull = Math.max(0, Math.min(1, -dx / -SNOOZE_THRESH));

  return (
    <div data-noswipe="1" style={{ position:'relative', borderRadius:rad(18), overflow:'hidden' }}>
      {dx < 0 && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:22, background:`rgba(201,138,43,${0.14 + snoozePull*0.22})`, transition:'background 120ms linear' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, color:STATUS.soon.dot, transform:`scale(${0.85 + snoozePull*0.25})`, transition:'transform 120ms linear' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke={STATUS.soon.dot} strokeWidth="1.7"/><path d="M12 9.5V13l2.5 1.5M9 3.5h6" stroke={STATUS.soon.dot} strokeWidth="1.7" strokeLinecap="round"/></svg>
            <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:700 }}>{snoozePull >= 1 ? 'Release' : '+2d'}</span>
          </div>
        </div>
      )}
      {dx > 0 && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'flex-start', paddingLeft:22, background:`rgba(110,154,62,${0.14 + waterPull*0.22})`, transition:'background 120ms linear' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, color:STATUS.ok.dot, transform:`scale(${0.85 + waterPull*0.25})`, transition:'transform 120ms linear' }}>
            {waterPull >= 1 ? <IconCheck s={18} c={STATUS.ok.dot} w={2.4}/> : <IconDrop s={18} c={STATUS.ok.dot}/>}
            <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:700 }}>{waterPull >= 1 ? 'Release' : 'Water'}</span>
          </div>
        </div>
      )}
      <div onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onClick={click} style={{
        position:'relative', display:'flex', alignItems:'center', gap:ds(13), background:C.panel, borderRadius:rad(18), padding:ds(10),
        border:'0.5px solid rgba(45,80,22,0.06)', boxShadow:'0 1px 2px rgba(43,42,38,0.03), 0 6px 16px rgba(45,80,22,0.04)',
        cursor:'pointer', userSelect:'none', WebkitUserSelect:'none', touchAction:'pan-y',
        transform: `translateX(${dx}px) scale(${press ? 0.985 : 1})`, transition: swiping.current ? 'none' : 'transform 220ms cubic-bezier(.2,.8,.2,1)',
      }}>
        <div style={{ width:62, height:62, flexShrink:0 }}><Specimen tint={tint} height={62} radius={13} leafSize={28} image={(plant.photos && plant.photos[0]) || plant.userImage || plant.image}/></div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:20, color:C.forest, lineHeight:1.1 }}>{czechMode && plant.czech ? plant.czech : plant.name}</div>
          <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.6, marginTop:3 }}>{agoLabel(plant.days)} · {plant.location}</div>
        </div>
        <div style={{ position:'relative', display:'inline-flex' }}>
          {celebrate && (
            <div style={{ position:'absolute', inset:-8, borderRadius:999, background:'radial-gradient(circle, rgba(110,154,62,0.35), transparent 70%)', animation:'waterGlow 700ms ease-out both', pointerEvents:'none' }}/>
          )}
          <div style={{ animation: celebrate ? 'waterPulse 240ms cubic-bezier(.34,1.56,.64,1) both' : 'none' }}>
            <StatusTag status={celebrate ? 'ok' : status}/>
          </div>
          {celebrate && [0,1].map(i => (
            <div key={i} style={{
              position:'absolute', left: 6 + i*14, top:2, width:4, height:4, borderRadius:999, background:C.sage,
              animation:`driftUp ${600 + i*100}ms ease-out both`, animationDelay:`${i*70}ms`, pointerEvents:'none',
            }}/>
          ))}
        </div>
      </div>
    </div>
  );
}
// "do I need to water anything before I leave for the weekend" — days/every
// is trivially forward-projectable, so a 7-day forecast costs nothing new:
// no schedule storage, just projecting each plant's next due day and
// bucketing it. Only the *next* time a plant comes due is shown, not every
// future recurrence — this answers the planning question, a full recurring
// calendar would just be noise for a week-out glance.
function WaterForecast({ plants, czechMode, onOpen }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const buckets = Array.from({ length: 7 }, (_, i) => ({ date: new Date(today.getTime() + i * 86400000), count: 0, plants: [] }));
  plants.forEach(p => {
    const daysUntil = Math.max(0, (p.every || 7) - (p.days || 0));
    if (daysUntil <= 6) { buckets[daysUntil].count++; buckets[daysUntil].plants.push(p); }
  });
  const [openDay, setOpenDay] = useState(null);
  useEffect(() => { setOpenDay(null); }, [plants.length]);
  if (!plants.length) return null;
  const name = p => (czechMode && p.czech) ? p.czech : p.name;
  const active = openDay != null ? buckets[openDay] : null;
  return (
    <div>
      <div style={{ display:'flex', gap:7, overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:2 }}>
        {buckets.map((b, i) => {
          const label = i === 0 ? 'Today' : b.date.toLocaleDateString('en-US', { weekday:'short' });
          const busy = b.count > 0;
          const isOpen = openDay === i;
          return (
            <div key={i} onClick={() => busy && setOpenDay(isOpen ? null : i)} role={busy ? 'button' : undefined} style={{
              flexShrink:0, minWidth:52, borderRadius:rad(14), padding:'9px 6px', textAlign:'center', cursor: busy ? 'pointer' : 'default',
              background: i === 0 && busy ? C.forest : busy ? 'rgba(110,154,62,0.12)' : 'transparent',
              border: isOpen ? `1.5px solid ${C.forest}` : busy ? 'none' : `0.5px solid ${C.line}`,
              boxShadow: isOpen ? `0 0 0 2px ${i === 0 ? 'rgba(255,255,255,0.4)' : 'rgba(45,80,22,0.15)'} inset` : 'none',
              transition:'border 150ms, box-shadow 150ms',
            }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:10.5, fontWeight:600, letterSpacing:0.3, textTransform:'uppercase', color: i === 0 && busy ? 'rgba(255,255,255,0.75)' : C.brown, opacity: i === 0 && busy ? 1 : 0.65 }}>{label}</div>
              <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:18, marginTop:3, color: i === 0 && busy ? '#fff' : busy ? C.forest : C.ink, opacity: busy ? 1 : 0.3 }}>{b.count || '·'}</div>
            </div>
          );
        })}
      </div>
      {active && (
        <div style={{
          marginTop:8, borderRadius:rad(14), background:C.panel, border:C.hair, padding:'10px 12px',
          display:'flex', flexDirection:'column', gap:2, animation:'slideUp 220ms cubic-bezier(.2,.8,.2,1)',
        }}>
          <div style={{ fontFamily:FONT_SANS, fontSize:10.5, fontWeight:600, letterSpacing:0.4, textTransform:'uppercase', color:C.brown, opacity:0.55, marginBottom:4 }}>
            {openDay === 0 ? 'Today' : active.date.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })}
          </div>
          {active.plants.map(p => (
            <div key={p.id} onClick={() => onOpen && onOpen(p.id)} role={onOpen ? 'button' : undefined} style={{
              display:'flex', alignItems:'center', gap:8, padding:'6px 2px', cursor: onOpen ? 'pointer' : 'default',
            }}>
              <div style={{ width:6, height:6, borderRadius:999, background:C.sage, flexShrink:0 }}/>
              <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:15, color:C.forest }}>{name(p)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// "This week in your garden" — reachable from Settings, the Garden screen,
// and a weekly-digest push notification's deep link alike. Pulls real
// numbers out of each plant's history[] rather than showing boilerplate —
// the same substance also drives the push notification body server-side.
// same collage tiling technique as GardenHeroBanner — a single stretched
// photo (compressImage caps storage at 1024px) upscales hard across a wide
// banner and looks pixelated; tiling up to 3 recently-watered photos instead
// covers far less area per tile so needs far less upscale. Deliberately the
// same component family rather than a second parallel implementation, so a
// future tweak to the collage look only has to happen in one place.
function DigestHeroCollage({ tiles, reduceMotion }) {
  const tileImg = p => (p.photos && p.photos[0]) || p.userImage || p.image;
  const hide = e => { e.target.style.opacity = '0'; };
  if (!tiles.length) return null;
  if (tiles.length === 1) {
    return <img src={tileImg(tiles[0])} alt="" onError={hide} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', animation: reduceMotion ? undefined : 'kenBurns 16s linear both' }}/>;
  }
  return (
    <div style={{ position:'absolute', inset:0, display:'flex', gap:3 }}>
      <div style={{ flex:'1 1 auto', display:'flex', flexDirection:'column', gap:3 }}>
        {tiles.slice(1).map((p, i) => (
          <div key={p.id} style={{ flex:1, position:'relative', overflow:'hidden' }}>
            <img src={tileImg(p)} alt="" onError={hide} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', animation: reduceMotion ? undefined : 'kenBurnsTile 16s linear both', animationDelay: reduceMotion ? undefined : `${i * 200}ms` }}/>
          </div>
        ))}
      </div>
      <div style={{ flex:'0 0 62%', position:'relative', overflow:'hidden' }}>
        <img src={tileImg(tiles[0])} alt="" onError={hide} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', animation: reduceMotion ? undefined : 'kenBurns 16s linear both' }}/>
      </div>
    </div>
  );
}
// small 7-bar activity chart — deliberately plain divs sized by count, not a
// charting library, in the same spirit as the admin panel's own gauges
function WeekActivityBars({ counts, labels }) {
  const max = Math.max(1, ...counts);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:56 }}>
      {counts.map((c, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
          <div style={{
            width:'100%', maxWidth:22, height:Math.max(4, Math.round((c / max) * 42)), borderRadius:rad(5),
            background: c ? C.forest : 'rgba(45,80,22,0.1)', opacity: c ? (i === counts.length - 1 ? 1 : 0.75) : 1,
            transition:'height 220ms ease',
          }}/>
          <span style={{ fontFamily:FONT_SANS, fontSize:9.5, color:C.brown, opacity: i === counts.length - 1 ? 0.9 : 0.5, fontWeight: i === counts.length - 1 ? 700 : 500 }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
function WeeklyDigest({ plants, onBack, isDesktop, czechMode, reduceMotion }) {
  const cutoff = todayMidnight() - 6 * 86400000;
  let wateredCount = 0;
  const recentlyWatered = [];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayLabels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayMidnight() - i * 86400000);
    dayLabels.push(d.toLocaleDateString(undefined, { weekday:'short' }).slice(0, 2));
  }
  plants.forEach(p => {
    const h = Array.isArray(p.history) ? p.history : [];
    const inWeek = h.filter(stamp => midnightFromStamp(stamp) >= cutoff);
    wateredCount += inWeek.length;
    inWeek.forEach(stamp => {
      const idx = 6 - Math.round((todayMidnight() - midnightFromStamp(stamp)) / 86400000);
      if (idx >= 0 && idx <= 6) dayCounts[idx]++;
    });
    if (inWeek.length) recentlyWatered.push({ plant: p, last: inWeek[inWeek.length - 1] });
  });
  recentlyWatered.sort((a, b) => midnightFromStamp(b.last) - midnightFromStamp(a.last));
  const needsNow = plants.filter(p => statusOf(p.days, p.every) === 'needs');
  // custom-reminder completions this week, same schedule.history[] shape as
  // watering history (both midnight-anchored stamps, see State Shape docs)
  const remindersDone = [];
  plants.forEach(p => (p.schedules || []).forEach(s => {
    const h = Array.isArray(s.history) ? s.history : [];
    h.filter(stamp => midnightFromStamp(stamp) >= cutoff).forEach(stamp => remindersDone.push({ plant: p, schedule: s, stamp }));
  }));
  remindersDone.sort((a, b) => midnightFromStamp(b.stamp) - midnightFromStamp(a.stamp));
  // real user photo only — never the Perenual/species stock image, which
  // reads as a generic placeholder in a "your garden" recap
  const userPhoto = p => (p.photos && p.photos.length ? p.photos[0] : p.userImage) || null;
  const photoCandidates = [];
  const seenIds = new Set();
  [...recentlyWatered.map(r => r.plant), ...plants].forEach(p => {
    if (seenIds.has(p.id) || !userPhoto(p)) return;
    seenIds.add(p.id);
    photoCandidates.push(p);
  });
  const heroTiles = photoCandidates.slice(0, 3);
  const heroPlant = heroTiles[0];
  const name = p => czechMode && p.czech ? p.czech : p.name;
  const rangeLabel = (() => {
    const from = new Date(cutoff), to = new Date();
    const fmt = d => d.toLocaleDateString(undefined, { month:'short', day:'numeric' });
    return `${fmt(from)} – ${fmt(to)}`;
  })();
  return (
    <div style={{ position:'fixed', inset:0, zIndex:52, background:C.bg, display:'flex', flexDirection:'column', animation:'slideUp 320ms cubic-bezier(.2,.8,.2,1)' }}>
      <div style={{ flexShrink:0, padding:'calc(18px + env(safe-area-inset-top)) 18px 14px', display:'flex', alignItems:'center', gap:12 }}>
        <div onClick={onBack} role="button" style={{ width:36, height:36, borderRadius:999, background:'rgba(45,80,22,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><IconBack/></div>
        <div>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:22, color:C.forest }}>This week in your garden</div>
          <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>{rangeLabel}</div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'0 18px 40px', display:'flex', flexDirection:'column', gap:18, maxWidth: isDesktop ? 720 : undefined, margin: isDesktop ? '0 auto' : undefined, width:'100%', boxSizing:'border-box' }}>
        {heroTiles.length > 0 && (
          <div style={{ borderRadius:rad(20), overflow:'hidden', position:'relative', height: isDesktop ? 220 : 176, flexShrink:0 }}>
            <DigestHeroCollage tiles={heroTiles} reduceMotion={reduceMotion}/>
            <div style={{ position:'absolute', inset:0, ...warmEdgeStyle(1) }}/>
            <div style={{ position:'absolute', inset:0, boxShadow:PHOTO_FRAME_SHADOW }}/>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.58) 96%)' }}/>
            {/* asymmetric: a small stat chip breaks the top-right corner
                rather than a centered banner strip, name/caption anchored
                bottom-left with room cut out on the right for the chip */}
            <div style={{ position:'absolute', top:12, right:14, background:'rgba(0,0,0,0.38)', backdropFilter:'blur(2px)', borderRadius:999, padding:'5px 11px' }}>
              <span style={{ fontFamily:FONT_SANS, fontSize:11.5, fontWeight:700, color:'#fff' }}>{wateredCount} waterings</span>
            </div>
            <div style={{ position:'absolute', left:16, right:'22%', bottom:12 }}>
              <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:19, color:'#fff' }}>{name(heroPlant)}</div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:'rgba(255,255,255,0.82)', marginTop:2 }}>{recentlyWatered.some(r => r.plant.id === heroPlant.id) ? 'most recently watered' : 'from your garden'}</div>
            </div>
          </div>
        )}
        {/* asymmetric stat row: one wide "headline" tile + a narrower one,
            not a rigid 2-up grid of equal boxes */}
        <div style={{ display:'flex', gap:10 }}>
          <div style={{ flex:'1 1 60%', padding:'14px 16px', borderRadius:rad(16), background:C.panel, border:C.hair }}>
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:30, color:C.forest }}>{wateredCount}</div>
            <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.7 }}>waterings this week</div>
            <div style={{ marginTop:10 }}><WeekActivityBars counts={dayCounts} labels={dayLabels}/></div>
          </div>
          <div style={{ flex:'1 1 40%', display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ padding:'12px 14px', borderRadius:rad(16), background:C.panel, border:C.hair }}>
              <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:24, color: needsNow.length ? STATUS.needs.dot : C.forest }}>{needsNow.length}</div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.7 }}>need water now</div>
            </div>
            {remindersDone.length > 0 && (
              <div style={{ padding:'12px 14px', borderRadius:rad(16), background:C.panel, border:C.hair }}>
                <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:24, color:C.forest }}>{remindersDone.length}</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.7 }}>other reminders done</div>
              </div>
            )}
          </div>
        </div>
        {recentlyWatered.length > 0 && (
          <div>
            <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.5, textTransform:'uppercase', marginBottom:8 }}>Watered this week</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {recentlyWatered.slice(0, 8).map(r => (
                <div key={r.plant.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:rad(14), background:C.panel, border:C.hair }}>
                  <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:15, color:C.forest }}>{name(r.plant)}</span>
                  <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6 }}>{agoLabel(Math.round((todayMidnight() - midnightFromStamp(r.last)) / 86400000))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {remindersDone.length > 0 && (
          <div>
            <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.5, textTransform:'uppercase', marginBottom:8 }}>Other reminders completed</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {remindersDone.slice(0, 6).map((r, i) => (
                <div key={r.plant.id + '-' + r.schedule.id + '-' + i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:rad(14), background:C.panel, border:C.hair }}>
                  <span style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600, color:C.ink }}>{r.schedule.label} <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', color:C.forest }}>· {name(r.plant)}</span></span>
                  <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6 }}>{agoLabel(Math.round((todayMidnight() - midnightFromStamp(r.stamp)) / 86400000))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.5, textTransform:'uppercase', marginBottom:8 }}>Next 7 days</div>
          <WaterForecast plants={plants} czechMode={czechMode}/>
        </div>
        {needsNow.length > 0 && (
          <div>
            <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.5, textTransform:'uppercase', marginBottom:8 }}>Waiting on you</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {needsNow.slice(0, 6).map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:rad(14), background:C.panel, border:C.hair }}>
                  <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:15, color:C.forest }}>{name(p)}</span>
                  <span style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.6 }}>{p.location}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {!plants.length && (
          <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.brown, opacity:0.6, textAlign:'center', marginTop:40 }}>Nothing to report yet — add a plant to start the week.</div>
        )}
      </div>
    </div>
  );
}

// scope picker for "Water all" — one tap opens it, one tap on a row runs it.
// Defaults to whichever scope makes sense for where it was triggered from
// (defaultScope), since blasting the whole garden regardless of status was
// the bug being fixed here.
function WaterAllPicker({ counts, defaultScope, onPick, onClose }) {
  const rows = [
    { key:'needs', label:'Needs water', hint:'due now', count:counts.needs },
    { key:'soon',  label:'Water soon',  hint:'due or almost due', count:counts.soon },
    { key:'all',   label:'All plants',  hint:'every plant', count:counts.all },
  ];
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:45, animation:'fade 140ms ease' }}>
      <div onClick={e=>e.stopPropagation()} style={{
        position:'absolute', top:'calc(56px + env(safe-area-inset-top) + 44px)', right:18, minWidth:212,
        background:C.panel, borderRadius:rad(16), overflow:'hidden', boxShadow:'0 10px 30px rgba(0,0,0,0.18)',
        border:'0.5px solid rgba(45,80,22,0.08)', animation:'popUp 200ms cubic-bezier(.2,.9,.3,1.2)',
      }}>
        {rows.map(r => (
          <div key={r.key} onClick={()=>onPick(r.key)} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'12px 14px',
            cursor: r.count ? 'pointer' : 'default', opacity: r.count ? 1 : 0.4,
            background: r.key === defaultScope ? 'rgba(110,154,62,0.1)' : 'transparent',
            borderTop: r.key === 'needs' ? 'none' : C.hair,
          }}>
            <div>
              <div style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600, color:C.ink }}>{r.label}</div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.6, marginTop:1 }}>{r.hint}</div>
            </div>
            <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:700, color:C.forest }}>{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NeedsWaterScreen({ plants, onOpen, onLongPress, onSnooze, onWaterAll, onWaterOne, onMarkScheduleDone, confirmDelete, isDesktop, czechMode, gardenName, reduceMotion }) {
  const order = { needs:0, soon:1 };
  const list = plants.filter(p=>statusOf(p.days,p.every,p.snoozedUntil)!=='ok')
    .sort((a,b)=> order[statusOf(a.days,a.every,a.snoozedUntil)] - order[statusOf(b.days,b.every,b.snoozedUntil)]);
  const sp = isDesktop ? 28 : 18;
  // aggregates every plant's custom schedules the same way this screen already
  // aggregates watering — reuses ScheduleRow (caulis-detail.jsx) so a mark-done
  // here behaves identically to marking it done from the plant detail overlay
  const dueSchedules = useMemo(() => {
    const rows = [];
    plants.forEach(p => (p.schedules || []).forEach(s => {
      const days = s.lastDoneAt ? daysSinceMidnight(s.lastDoneAt) : null;
      const status = days == null ? 'needs' : statusOf(days, s.everyDays);
      if (status !== 'ok') rows.push({ plant: p, schedule: s, status });
    }));
    return rows.sort((a,b)=> order[a.status] - order[b.status]);
  }, [plants]);
  const [picking, setPicking] = useState(false);
  const counts = useMemo(() => {
    let needs = 0, soon = 0;
    plants.forEach(p => { const st = statusOf(p.days, p.every, p.snoozedUntil); if (st === 'needs') needs++; if (st === 'needs' || st === 'soon') soon++; });
    return { needs, soon, all: plants.length };
  }, [plants]);
  const pickScope = (scope) => { setPicking(false); onWaterAll && onWaterAll(scope); };
  // easter egg: rapid-tap the "all caught up" checkmark for a small reward —
  // same discoverable-by-curiosity pattern as the Sprig watermark joke
  const emptyTaps = useRef(0);
  const emptyTimer = useRef(null);
  const [emptyMsg, setEmptyMsg] = useState(null);
  const EMPTY_LINES = ["Go outside. Touch grass — carefully, it's someone else's now.", "Nothing thirsty. This is the dream.", "Suspicious. Check again tomorrow.", "You did it. All of it. For now."];
  const tapEmpty = () => {
    if (emptyTimer.current) clearTimeout(emptyTimer.current);
    emptyTimer.current = setTimeout(() => { emptyTaps.current = 0; }, 1200);
    emptyTaps.current += 1;
    if (emptyTaps.current >= 5) {
      emptyTaps.current = 0;
      setEmptyMsg(EMPTY_LINES[Math.floor(Math.random() * EMPTY_LINES.length)]);
      setTimeout(() => setEmptyMsg(null), 2400);
    }
  };
  return (
    <div style={{ minHeight:'100%', position:'relative', paddingBottom:24 }}>
      <Sprig opacity={0.16}/>
      <ScreenHead eyebrow="Today's round" title={list.length ? `${list.length} plants are thirsty` : 'All caught up'} isDesktop={isDesktop} appName={gardenName}/>
      {plants.length > 0 && (
        <div style={{ display:'flex', justifyContent:'flex-end', padding:`0 ${sp}px`, marginTop:-8, position:'relative', zIndex:3 }}>
          <div onClick={()=>setPicking(true)} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 15px', borderRadius:999, cursor:'pointer', background:'rgba(45,80,22,0.08)', color:C.forest, transition:'background 180ms' }}>
            <IconDrop s={15} c={C.forest}/>
            <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Water all</span>
          </div>
        </div>
      )}
      {picking && <WaterAllPicker counts={counts} defaultScope="needs" onPick={pickScope} onClose={()=>setPicking(false)}/>}
      <div style={{ padding:`18px ${sp}px 0`, position:'relative', zIndex:2 }}>
        <WaterForecast plants={plants} czechMode={czechMode} onOpen={onOpen}/>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:ds(12), padding:`14px ${sp}px 0`, position:'relative', zIndex:2 }}>
        {list.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 30px', position:'relative', zIndex:2 }}>
            <div onClick={tapEmpty} style={{
              display:'inline-flex', width:72, height:72, borderRadius:999, background:'rgba(110,154,62,0.12)',
              alignItems:'center', justifyContent:'center', cursor:'pointer', userSelect:'none', position:'relative',
              animation: reduceMotion ? undefined : 'sproutBob 4.5s ease-in-out infinite',
            }}>
              <LeafOutline size={30} color={C.sage} sw={1.6}/>
            </div>
            <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:22, color:C.forest, marginTop:16 }}>{emptyMsg || 'Everything is looked after'}</div>
            <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.55, marginTop:4, lineHeight:1.5 }}>Every plant is happily hydrated — a quiet, well-tended kind of day.</div>
          </div>
        )}
        {list.map((p,i)=> <NeedsRow key={p.id} plant={p} tint={TINTS[(p.id-1)%TINTS.length]} onOpen={onOpen} onLongPress={onLongPress} onSnooze={onSnooze} onWater={onWaterOne} czechMode={czechMode} reduceMotion={reduceMotion}/>)}
      </div>
      {dueSchedules.length > 0 && (
        <div style={{ padding:`24px ${sp}px 0`, position:'relative', zIndex:2 }}>
          <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, letterSpacing:0.5, textTransform:'uppercase', opacity:0.6, marginBottom:2 }}>Other reminders</div>
          <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, padding:'2px 15px', boxShadow:'0 1px 2px rgba(43,42,38,0.03)' }}>
            {dueSchedules.map(({ plant, schedule }) => (
              <div key={`${plant.id}-${schedule.id}`} onClick={()=>onOpen(plant.id)} style={{ cursor:'pointer' }}>
                <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:13, color:C.forest, paddingTop:11, opacity:0.85 }}>{czechMode && plant.czech ? plant.czech : plant.name}</div>
                <div onClick={e=>e.stopPropagation()}>
                  <ScheduleRow schedule={schedule} onMarkDone={onMarkScheduleDone ? id=>onMarkScheduleDone(plant.id, id) : ()=>{}} onEdit={()=>onOpen(plant.id)}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  QR SCANNER (primary action)
// ════════════════════════════════════════════════════════════
function Viewfinder({ onTap }) {
  return (
    <div onClick={onTap} style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:212, height:212, zIndex:3 }}>
      <div style={{ position:'absolute', inset:-30, borderRadius:36, background:'radial-gradient(circle, rgba(122,158,78,0.16), transparent 68%)', pointerEvents:'none' }}/>
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
  // easter egg: rapid-tap the viewfinder itself — same discoverable joke
  // pattern as the Sprig watermark, scoped to the scanner screen
  const vfTaps = useRef(0);
  const vfTimer = useRef(null);
  const [vfMsg, setVfMsg] = useState(null);
  const VF_LINES = ["There's no QR code on you. Probably.", "Try a plant tag, not the void.", "Nothing here but pixels."];
  const tapViewfinder = () => {
    if (vfTimer.current) clearTimeout(vfTimer.current);
    vfTimer.current = setTimeout(() => { vfTaps.current = 0; }, 1200);
    vfTaps.current += 1;
    if (vfTaps.current >= 6) {
      vfTaps.current = 0;
      setVfMsg(VF_LINES[Math.floor(Math.random() * VF_LINES.length)]);
      setTimeout(() => setVfMsg(null), 2200);
      try { localStorage.setItem('caulis_egg_viewfinder', '1'); } catch(e) {}
    }
  };

  useEffect(() => {
    if (isDesktop) return;
    const s = scannerRef.current; if (!s) return;
    try { paused ? s.pause(true) : s.resume(); } catch(e) {}
    if (!paused) scannedRef.current = false;
  }, [paused]);

  useEffect(() => {
    if (isDesktop) return;
    let cancelled = false;
    let scanner = null;

    loadHtml5Qrcode().then(() => {
      if (cancelled) return;
      if (typeof Html5Qrcode === 'undefined') {
        setCamError('QR scanner script was blocked by the browser. Please check ad/tracker blockers.');
        return;
      }
      scannedRef.current = false;
      scanner = new Html5Qrcode('caulis-qr-reader');
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
      ).then(() => { if (!cancelled) setScanning(true); }).catch(() => setCamError('Camera access denied'));
    }).catch(() => setCamError('QR scanner script was blocked by the browser. Please check ad/tracker blockers.'));

    return () => {
      cancelled = true;
      scannerRef.current = null;
      if (scanner) scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, [isDesktop]);

  return (
    <div style={{ position:'absolute', inset:0, background:'#111', overflow:'hidden' }}>
      <div id="caulis-qr-reader" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}/>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:62, left:0, right:0, textAlign:'center', zIndex:3, pointerEvents:'none' }}>
        <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:24, color:'#fff' }}>Scan a plant tag</div>
        <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:'rgba(255,255,255,0.72)', marginTop:3 }}>
          {vfMsg || camError || (scanning ? 'Point at a Caulis QR code' : 'Starting camera…')}
        </div>
      </div>
      <Viewfinder onTap={tapViewfinder}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  PRINT QUEUE
// ════════════════════════════════════════════════════════════
function QueueRow({ plant, onOpen, onRemove, sizeMm, globalMm, onSetSize, czechMode, grip, dragging, over, locationTags }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, background:C.panel, borderRadius:rad(18), padding:12, border: over ? '1px solid rgba(110,154,62,0.6)' : '0.5px solid rgba(45,80,22,0.06)', boxShadow:'0 1px 2px rgba(43,42,38,0.03), 0 6px 16px rgba(45,80,22,0.04)', opacity: dragging ? 0.5 : 1, transition:'opacity 140ms ease, border-color 140ms ease' }}>
      <div {...grip} style={{ flexShrink:0, width:22, display:'flex', alignItems:'center', justifyContent:'center', cursor:'grab', touchAction:'none', opacity:0.45 }}><GripIcon/></div>
      <div style={{ width:48, height:48, flexShrink:0 }}><Specimen tint={TINTS[(plant.id-1)%TINTS.length]} height={48} radius={11} leafSize={22} image={(plant.photos && plant.photos[0]) || plant.userImage || plant.image}/></div>
      <div onClick={()=>onOpen(plant.id)} style={{ flex:1, minWidth:0, cursor:'pointer' }}>
        <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:19, color:C.forest, lineHeight:1.05, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{czechMode && plant.czech ? plant.czech : plant.name}</div>
        <div style={{ fontFamily:FONT_SANS, fontSize:10.5, color:C.ink, opacity:0.55, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{plant.latin}</div>
        <div style={{ marginTop:5 }}><LocationPill label={plant.location} tag={locationTags && locationTags[plant.location]}/></div>
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
function PrintQueueScreen({ queue, plants, onOpen, onRemove, onPrintAll, printed, isDesktop, globalPrintSize, onSetGlobalSize, queueSizes, onSetSize, onReorder, monochromePrint, onToggleMono, czechMode, locationTags }) {
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
            <div key={printed} onClick={onPrintAll} style={{ flexShrink:0, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:7, background:printed?C.sage:C.forest, color:'#fff', borderRadius:999, padding:'10px 16px', boxShadow:'0 4px 12px rgba(45,80,22,0.22)', transition:'background 200ms ease', animation: printed ? 'waterPulse 260ms cubic-bezier(.34,1.56,.64,1) both' : 'none' }}>
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
          <div style={{ display:'inline-flex', width:64, height:64, borderRadius:999, background:'rgba(107,76,42,0.1)', alignItems:'center', justifyContent:'center', animation:'sproutBob 5s ease-in-out infinite' }}>
            <IconPrint s={28} c={C.brown}/>
          </div>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:22, color:C.forest, marginTop:16 }}>Nothing waiting to print</div>
          <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.55, marginTop:4 }}>Open a plant and tap "Add to print queue" to label it.</div>
        </div>
      )}
      <div ref={re.containerRef} style={{ display:'flex', flexDirection:'column', gap:12, padding:`14px ${sp}px 0`, position:'relative', zIndex:2 }}>
        {items.map((p,i) => <QueueRow key={p.id} plant={p} onOpen={onOpen} onRemove={onRemove} sizeMm={queueSizes[p.id]||null} globalMm={globalPrintSize} onSetSize={onSetSize} czechMode={czechMode} grip={re.grip(i)} dragging={re.dragIdx===i} over={re.overIdx===i && re.dragIdx!==i} locationTags={locationTags}/>)}
      </div>
    </div>
  );
}

// rooms are now a first-class list (locations = derived-from-plants ∪
// extraLocations, see app.jsx addLocation/renameLocation/removeLocation) —
// this lets a room be pre-created empty, renamed across every plant that
// lives there in one move, and removed once it's empty again. Previously
// onAddLocation was wired to a no-op everywhere, so a "room" only ever
// existed for as long as some plant happened to sit in it.
// inline color+icon editor for one room's tag — same SwatchRow/custom-picker
// vocabulary as the Appearance palette/accent pickers, and the same 12-icon
// SCHEDULE_ICONS grid built for custom reminder schedules, so a room tag
// reads as the same underlying feature rather than a third one-off picker.
function LocationTagEditor({ tag, onChange }) {
  const color = (tag && tag.color) || null;
  const hex = (tag && tag.color === 'custom' && tag.hex) || '#6B4C2A';
  const icon = (tag && tag.icon) || null;
  const setColor = (key) => onChange({ color: key, hex: key === 'custom' ? hex : undefined, icon });
  const setHex = (h) => onChange({ color: 'custom', hex: h, icon });
  const setIcon = (key) => onChange({ color: color || 'forest', hex: color === 'custom' ? hex : undefined, icon: icon === key ? null : key });
  return (
    <div style={{ marginTop:8, paddingTop:8, borderTop:C.hair }}>
      <div style={{ fontFamily:FONT_SANS, fontSize:10.5, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.4, textTransform:'uppercase', marginBottom:6 }}>Color</div>
      <SwatchRow size={26} value={color || 'none'} onSelect={setColor} options={[
        ...PALETTE_ORDER.map(key => key === 'custom' ? { key, label:'Custom', ring:hex } : { key, label:PALETTES[key].label, swatch:PALETTES[key].swatch }),
      ]}/>
      {color === 'custom' && <CustomColorPicker hex={hex} onChange={setHex}/>}
      <div style={{ fontFamily:FONT_SANS, fontSize:10.5, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.4, textTransform:'uppercase', margin:'10px 0 6px' }}>Icon</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {SCHEDULE_ICON_ORDER.map(key => {
          const on = icon === key;
          const Ico = SCHEDULE_ICONS[key].Icon;
          return (
            <div key={key} onClick={()=>setIcon(key)} title={SCHEDULE_ICONS[key].label} style={{
              width:30, height:30, borderRadius:rad(10), cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              background: on ? (locationTagColor({color:color||'forest',hex}) || C.forest) : 'rgba(45,80,22,0.07)', transition:'background 140ms ease',
            }}>
              <Ico s={14} c={on ? '#fff' : C.ink} a={on ? 1 : 0.65}/>
            </div>
          );
        })}
      </div>
      {(color || icon) && (
        <div onClick={()=>onChange(null)} style={{ marginTop:10, display:'inline-flex', alignItems:'center', gap:5, cursor:'pointer' }}>
          <span style={{ fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, color:C.brown, opacity:0.65 }}>Clear tag</span>
        </div>
      )}
    </div>
  );
}
function LocationsManager({ plants, locations, onAdd, onRename, onRemove, roomLight, onSetRoomLight, locationTags, onSetLocationTag }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [lightRoom, setLightRoom] = useState(null);
  const [tagRoom, setTagRoom] = useState(null);
  const counts = {};
  plants.forEach(p => { counts[p.location] = (counts[p.location] || 0) + 1; });
  const mismatches = {};
  plants.forEach(p => {
    const level = roomLight[p.location];
    if (level && roomLightMismatch(p, level)) mismatches[p.location] = (mismatches[p.location] || 0) + 1;
  });
  const submitNew = () => { const v = newName.trim(); if (v) onAdd(v); setNewName(''); setAdding(false); };
  const submitRename = (old) => { const v = editVal.trim(); if (v && v !== old) onRename(old, v); setEditing(null); };
  const rowInput = { flex:1, boxSizing:'border-box', height:34, borderRadius:9, border:`1px solid ${C.forest}`, background:C.bg, padding:'0 10px', fontFamily:FONT_SANS, fontSize:13, color:C.ink, outline:'none' };
  return (
    <div style={{ padding:'12px 16px', borderTop:C.hair }}>
      <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink, marginBottom:9 }}>Rooms</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {locations.map(l => (
          <div key={l} style={{ padding:'7px 10px', borderRadius:10, background:'rgba(45,80,22,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {editing === l ? (
                <>
                  <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') submitRename(l); if(e.key==='Escape') setEditing(null); }} style={rowInput}/>
                  <span onClick={()=>submitRename(l)} style={{ cursor:'pointer', fontFamily:FONT_SANS, fontSize:12, fontWeight:600, color:C.forest }}>Save</span>
                  <span onClick={()=>setEditing(null)} style={{ cursor:'pointer', fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.6 }}>Cancel</span>
                </>
              ) : (
                <>
                  {(() => {
                    const tag = locationTags && locationTags[l];
                    const col = locationTagColor(tag);
                    const TagIcon = locationTagIcon(tag);
                    return (
                      <span onClick={()=>setTagRoom(tagRoom === l ? null : l)} style={{ cursor:'pointer', flexShrink:0, width:20, height:20, borderRadius:999, background: col ? col : 'rgba(45,80,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {TagIcon ? <TagIcon s={11} c="#fff" a={1}/> : <IconPipette s={11} c={C.brown} a={0.6}/>}
                      </span>
                    );
                  })()}
                  <span style={{ flex:1, fontFamily:FONT_SANS, fontSize:13.5, color:C.ink }}>{l}</span>
                  <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.55 }}>{counts[l] || 0} plant{counts[l] === 1 ? '' : 's'}</span>
                  <span onClick={()=>setLightRoom(lightRoom === l ? null : l)} style={{ cursor:'pointer', padding:4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" fill="none" stroke={mismatches[l] ? STATUS.soon.dot : C.brown} strokeWidth="1.7"/><path d="M12 2.5v2.5M12 19v2.5M4.5 12H2M22 12h-2.5M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" stroke={mismatches[l] ? STATUS.soon.dot : C.brown} strokeWidth="1.7" strokeLinecap="round"/></svg>
                  </span>
                  <span onClick={()=>{ setEditing(l); setEditVal(l); }} style={{ cursor:'pointer', padding:4 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" fill="none" stroke={C.brown} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  {!counts[l] && (
                    <span onClick={()=>onRemove(l)} style={{ cursor:'pointer', padding:4 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke={STATUS.needs.dot} strokeWidth="1.8" strokeLinecap="round"/></svg>
                    </span>
                  )}
                </>
              )}
            </div>
            {tagRoom === l && (
              <LocationTagEditor tag={locationTags && locationTags[l]} onChange={(tag)=>onSetLocationTag(l, tag)}/>
            )}
            {lightRoom === l && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8, paddingTop:8, borderTop:C.hair }}>
                {ROOM_LIGHT_LEVELS.map(lv => {
                  const active = roomLight[l] === lv.id;
                  return (
                    <span key={lv.id} onClick={()=>onSetRoomLight(l, active ? null : lv.id)}
                      style={{ cursor:'pointer', padding:'5px 10px', borderRadius:999, fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600,
                        background: active ? C.forest : C.panel, color: active ? '#fff' : C.ink, border: active ? 'none' : C.hair }}>
                      {lv.label}
                    </span>
                  );
                })}
                {roomLight[l] && mismatches[l] > 0 && (
                  <div style={{ width:'100%', fontFamily:FONT_SANS, fontSize:11.5, color:STATUS.soon.dot, marginTop:2 }}>
                    {mismatches[l]} plant{mismatches[l]===1?'':'s'} here may not suit this light level
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {adding ? (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
          <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') submitNew(); if(e.key==='Escape') setAdding(false); }} placeholder="Room name…" style={rowInput}/>
          <span onClick={submitNew} style={{ cursor:'pointer', fontFamily:FONT_SANS, fontSize:12, fontWeight:600, color:C.forest }}>Add</span>
        </div>
      ) : (
        <div onClick={()=>setAdding(true)} style={{ marginTop:9, display:'inline-flex', alignItems:'center', gap:5, cursor:'pointer' }}>
          <IconPlus s={12} c={C.forest}/>
          <span style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.forest }}>Add empty room</span>
        </div>
      )}
    </div>
  );
}

function maskKey(k) {
  if (!k) return '';
  const tail = k.slice(-4);
  const dots = '•'.repeat(Math.min(20, Math.max(6, k.length - 4)));
  return dots + tail;
}

// self-contained API key input: shows a masked "•••1234" view of an already-
// saved key (with eye-reveal + copy) instead of a permanently blank field,
// so the owner can retrieve their own key later (e.g. to hand it to someone
// else joining the same garden). Typing a fresh value still works exactly
// like before — click/focus drops into edit mode.
function ApiKeyField({ value, savedValue, onChange, placeholder }) {
  const [editing, setEditing] = useState(!savedValue);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const prevSavedRef = useRef(savedValue);
  useEffect(() => {
    if (!savedValue) setEditing(true);
    else if (savedValue !== prevSavedRef.current) { setEditing(false); setRevealed(false); onChange(''); }
    prevSavedRef.current = savedValue;
  }, [savedValue]);
  const displayValue = editing ? value : (revealed ? savedValue : maskKey(savedValue));
  const copy = () => {
    try { navigator.clipboard.writeText(savedValue); setCopied(true); setTimeout(()=>setCopied(false), 1600); } catch(e) {}
  };
  return (
    <div style={{ display:'flex', gap:8, alignItems:'center', flex:1, minWidth:0 }}>
      <div style={{ flex:1, minWidth:0, position:'relative' }}>
        <input
          value={displayValue}
          readOnly={!editing}
          onFocus={()=>{ if (!editing) { setEditing(true); onChange(''); } }}
          onChange={e=>onChange(e.target.value)}
          placeholder={placeholder}
          style={{ width:'100%', boxSizing:'border-box', height:42, borderRadius:rad(11), border:'1px solid rgba(45,80,22,0.14)', background:C.input, padding: editing ? '0 13px' : '0 62px 0 13px', fontFamily:'ui-monospace, Menlo, monospace', fontSize:12.5, color:C.ink, outline:'none' }}/>
        {!editing && savedValue && (
          <div style={{ position:'absolute', right:6, top:0, bottom:0, display:'flex', alignItems:'center', gap:2 }}>
            <div onClick={()=>setRevealed(r=>!r)} title={revealed?'Hide':'Reveal'} style={{ width:26, height:26, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              {revealed ? <IconEyeOff s={15}/> : <IconEye s={15}/>}
            </div>
            <div onClick={copy} title="Copy" style={{ width:26, height:26, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              {copied ? <IconCheck s={14} c={C.sage}/> : <IconCopy s={15}/>}
            </div>
          </div>
        )}
      </div>
      {editing && savedValue && (
        <span onClick={()=>{ setEditing(false); onChange(''); }} style={{ cursor:'pointer', fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, color:C.brown, opacity:0.65, flexShrink:0 }}>Cancel</span>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════════════════════════
function SettingsScreen({ plants, locations, onAddLocationSetting, onRenameLocation, onRemoveLocation, roomLight, onSetRoomLight, locationTags, onSetLocationTag, isDesktop, gardenKey, gardenHistory, onRemoveHistory, onSetGardenKey, onRenameGardenKey, installPrompt, onInstall, darkMode, onToggleDark, gardenPassword, onSavePassword, perenualKey, onSavePerenualKey, housePlantsKey, onSaveHousePlantsKey, anthropicKey, onSaveAnthropicKey, onRecheckAI, aiRecheck, plantIdKey, onSavePlantIdKey, identifyLang, onSetIdentifyLang, defaultEvery, onSetDefaultEvery, globalPrintSize, onSetGlobalSize, monochromePrint, onToggleMono, googleClientId, onSaveGoogleClientId, googleToken, onConnectGoogle, onSyncCalendar, onDisconnectGoogle, googleSyncMode, onSetGoogleSyncMode, reminderTime, onSetReminderTime, onUpdateApp, onExport, onImport, onBuildMigrationCode, onApplyMigrationCode, cardDensity, onSetDensity, hideHealthy, onToggleHideHealthy, reduceMotion, onToggleReduceMotion, confirmDelete, onToggleConfirmDelete, haptics, onToggleHaptics, defaultTab, onSetDefaultTab, swipeNav, onToggleSwipeNav, onWaterAll, onDevOffsetDays, onDevSetDays, onDevResyncFromHistory, onAdminListGardens, onAdminLoadGarden, onAdminSaveGarden, onAdminRemoveGarden, onAdminBulkRemove, onAdminStats, onAdminGetSettings, onAdminGetSystem, onAdminSaveSettings, onAdminRunBackup, onAdminListBackups, onAdminBackupUrl, onVerifyPassword, navConfig, onSetNavConfig, navLabels, onToggleNavLabels, navIndicatorStyle, onSetNavIndicatorStyle, navBarStyle, onSetNavBarStyle, hapticIntensity, onSetHapticIntensity, cardDateMode, onSetCardDateMode, gridCols, onSetGridCols, sidebar, onSetSidebar, palette, onSetPalette, accent, onSetAccent, customPaletteColor, onSetCustomPaletteColor, customAccentColor, onSetCustomAccentColor, bgColorChoice, onSetBgColorChoice, customBgColor, onSetCustomBgColor, iconStroke, onSetIconStroke, gardenName, onSetGardenName, fontPairing, onSetFontPairing, radiusDensity, onSetRadiusDensity, imageTreatment, onSetImageTreatment, uiDensity, onSetUiDensity, bgTexture, onSetBgTexture, grainIntensity, onSetGrainIntensity, heroBanner, onSetHeroBanner, doctorModel, onSetDoctorModel, pushSupported, pushWatering, pushDigest, pushBusy, pushError, onTogglePushWatering, onTogglePushDigest, reminderHourLocal, onSetReminderHourLocal, digestDay, onSetDigestDay, customRemindersEnabled, onToggleCustomReminders, wateringFrequencyDays, onSetWateringFrequencyDays, statusStyle, onSetStatusStyle, onOpenDigest, onDevTestPush, onDevDedupeHistory, onDevDeleteHistoryEntry, onDevBulkUndoLastWatering, sessionInfo, onDevForcePull, onDevForcePush, syncBusy, syncMsg, badges, ambientBadges, onToggleAmbientBadges, badgeDensity, onSetBadgeDensity }) {
  // accordion — one section open at a time, everything else collapses. With
  // 13 sections all expanded by default this screen was an endless scroll.
  const [activeSec, setActiveSec] = useState(() => GS.get('caulis_set_open', null));
  const isOpen = (id) => activeSec === id;
  const toggleSec = (id) => setActiveSec(s => { const n = s === id ? null : id; GS.set('caulis_set_open', n); return n; });

  // settings search — jumps to and expands the best-matching section, and
  // doubles as the target for an intercepted browser Ctrl/Cmd+F.
  //
  // The index isn't a hand-maintained keyword list (that goes stale the
  // moment a label's copy changes) — it's built live from each section's
  // actual rendered DOM text via sectionRefs, so every toggle label, input
  // label and description is searchable, not just section headings.
  const [settingsQuery, setSettingsQuery] = useState('');
  const settingsSearchRef = useRef(null);
  const sectionRefs = useRef({});
  const registerSection = (id) => (el) => { if (el) sectionRefs.current[id] = el; else delete sectionRefs.current[id]; };
  const normalizedQuery = settingsQuery.trim().toLowerCase();
  const countOccurrences = (haystack, needle) => {
    if (!needle) return 0;
    let count = 0, from = 0, i;
    while ((i = haystack.indexOf(needle, from)) !== -1) { count++; from = i + needle.length; }
    return count;
  };
  // scored, not just matched: title hits outrank a stray body match, a
  // word-boundary prefix hit (e.g. "dark" matching "Dark mode") outranks a
  // mid-word substring hit, and section order breaks ties so results don't
  // jump around between keystrokes of the same query.
  const settingsMatches = useMemo(() => {
    if (!normalizedQuery) return [];
    const scored = [];
    SETTINGS_SECTION_ORDER.forEach((id, idx) => {
      const el = sectionRefs.current[id];
      if (!el) return;
      const title = (SETTINGS_SECTION_TITLES[id] || '').toLowerCase();
      const body = (el.textContent || '').toLowerCase();
      let score = 0;
      if (title.includes(normalizedQuery)) score += 50;
      if (new RegExp('\\b' + normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(body)) score += 8;
      score += countOccurrences(body, normalizedQuery);
      if (score > 0) scored.push({ id, score, idx });
    });
    scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
    return scored.map(s => s.id);
  }, [normalizedQuery]);
  const [settingsMatchIdx, setSettingsMatchIdx] = useState(0);
  // single owner of the shared 'settings-match' CSS Highlight registry entry
  // — see the comment in SettingsSection for why this can't safely be done
  // once per accordion instance. Only ever touches the one section that's
  // actually the current match (settingsMatches[settingsMatchIdx]).
  useEffect(() => {
    if (typeof Highlight === 'undefined' || !window.CSS || !CSS.highlights) return;
    const activeId = settingsMatches[settingsMatchIdx];
    const el = activeId && sectionRefs.current[activeId];
    if (!normalizedQuery || !el) { CSS.highlights.delete('settings-match'); return; }
    const ranges = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.toLowerCase();
      let from = 0, i;
      while ((i = text.indexOf(normalizedQuery, from)) !== -1) {
        const r = new Range();
        r.setStart(node, i);
        r.setEnd(node, i + normalizedQuery.length);
        ranges.push(r);
        from = i + normalizedQuery.length;
      }
    }
    if (ranges.length) CSS.highlights.set('settings-match', new Highlight(...ranges));
    else CSS.highlights.delete('settings-match');
    return () => CSS.highlights.delete('settings-match');
  }, [settingsMatches, settingsMatchIdx, normalizedQuery]);
  const jumpToSection = (id) => {
    setActiveSec(id);
    GS.set('caulis_set_open', id);
    const el = document.getElementById('sec-' + id);
    if (el) setTimeout(() => el.scrollIntoView({ behavior:'smooth', block:'start' }), 60);
  };
  useEffect(() => {
    setSettingsMatchIdx(0);
    if (!settingsMatches.length) return;
    jumpToSection(settingsMatches[0]);
  }, [settingsQuery]);
  const cycleMatch = (dir) => {
    if (!settingsMatches.length) return;
    const next = (settingsMatchIdx + dir + settingsMatches.length) % settingsMatches.length;
    setSettingsMatchIdx(next);
    jumpToSection(settingsMatches[next]);
  };
  useEffect(() => {
    const handler = (e) => {
      if (!((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'f' || e.key === 'F'))) return;
      // don't steal browser-find while a modal (password gate, migration code,
      // import picker) is sitting on top of Settings — the hidden search box
      // behind it isn't what the user is trying to search
      if (pwGate || migrationCode) return;
      e.preventDefault();
      settingsSearchRef.current && settingsSearchRef.current.focus();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pwGate, migrationCode]);
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

  // Export/Import/share-code can wipe or leak a garden — confirm against
  // the real backend password before any of them run, not just a local
  // string compare.
  const [pwGate, setPwGate] = useState(null); // 'export' | 'import' | 'migrate' | null
  const [pwGateInput, setPwGateInput] = useState('');
  const [pwGateErr, setPwGateErr] = useState(false);
  const [pwGateBusy, setPwGateBusy] = useState(false);
  const [migrationCode, setMigrationCode] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [enterCode, setEnterCode] = useState('');
  const requestGate = (action) => { setPwGate(action); setPwGateInput(''); setPwGateErr(false); };
  const confirmGate = async () => {
    setPwGateBusy(true);
    const ok = await onVerifyPassword(pwGateInput);
    setPwGateBusy(false);
    if (!ok) { setPwGateErr(true); return; }
    const action = pwGate;
    setPwGate(null);
    if (action === 'export') onExport();
    else if (action === 'import') importRef.current && importRef.current.click();
    else if (action === 'migrate') setMigrationCode(await onBuildMigrationCode());
  };
  const copyMigrationCode = () => {
    navigator.clipboard.writeText(migrationCode).catch(()=>{});
    setCodeCopied(true); setTimeout(()=>setCodeCopied(false), 1500);
  };
  const sp = isDesktop ? 28 : 18;
  // hoisted here (were previously declared only inside the Developer
  // panel's nested IIFE further down) — referenced from the always-rendered
  // Backup section too (dInput on the migration-code input) and from
  // numStepper (dBtn), both of which sit outside that IIFE's scope. Any
  // reference to either from outside it was a ReferenceError on every
  // Settings render, not just once admin tools were opened.
  const dInput = { width:'100%', padding:'11px 13px', borderRadius:rad(12), border:`1px solid ${C.line}`, background:C.bg, fontFamily:FONT_SANS, fontSize:14, color:C.ink, outline:'none', boxSizing:'border-box' };
  const dBtn = (filled) => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, padding:'10px 16px', borderRadius:rad(12), cursor:'pointer', fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600, border:`1px solid ${C.forest}`, background: filled?C.forest:'transparent', color: filled?'#fff':C.forest, userSelect:'none' });

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
  const [resyncMsg, setResyncMsg] = useState(null);
  const resyncFromHistory = () => {
    const fixed = onDevResyncFromHistory();
    setResyncMsg(fixed ? `Fixed ${fixed} plant${fixed===1?'':'s'} from the watering log` : 'Already matched the watering log');
    setTimeout(() => setResyncMsg(null), 3000);
  };
  const [historyPlantId, setHistoryPlantId] = useState(null);
  const [bulkUndoSel, setBulkUndoSel] = useState(() => new Set());
  const [bulkUndoResult, setBulkUndoResult] = useState(null);
  const toggleBulkUndoSel = (id) => { setBulkUndoResult(null); setBulkUndoSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const runBulkUndo = () => {
    const res = onDevBulkUndoLastWatering([...bulkUndoSel]);
    setBulkUndoResult(res);
    setBulkUndoSel(new Set());
  };
  const [testPushBusy, setTestPushBusy] = useState(null); // 'watering' | 'digest' | null
  const [testPushMsg, setTestPushMsg] = useState(null);
  const runTestPush = async (kind) => {
    setTestPushBusy(kind);
    const ok = await onDevTestPush(kind);
    setTestPushBusy(null);
    setTestPushMsg(ok ? 'Sent — check your notifications' : 'Failed to send. Are you subscribed?');
    setTimeout(() => setTestPushMsg(null), 3500);
  };
  const [adminSecret, setAdminSecretState] = useState(() => { try { return localStorage.getItem('caulis_admin_secret') || ''; } catch(e) { return ''; } });
  const setAdminSecret = (v) => { setAdminSecretState(v); try { localStorage.setItem('caulis_admin_secret', v); } catch(e) {} };
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminErr, setAdminErr] = useState(false);
  const [adminGardens, setAdminGardens] = useState(null);
  const [adminStats, setAdminStatsData] = useState(null);
  const [backupSettings, setBackupSettings] = useState(null);
  const [backupFiles, setBackupFiles] = useState(null);
  const [adminLoaded, setAdminLoaded] = useState(null); // { key, data, plants }
  const [adminStatus, setAdminStatus] = useState('idle'); // idle|loading|loaded|empty|error|pushing|pushed
  const [adminOffsetN, setAdminOffsetN] = useState(1);
  const [backupBusy, setBackupBusy] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminSystemData, setAdminSystemData] = useState(null);
  const [adminSystemBusy, setAdminSystemBusy] = useState(false);
  const [adminOpenSec, setAdminOpenSec] = useState(() => GS.get('caulis_admin_open', 'overview'));
  const isAdminOpen = (id) => adminOpenSec === id;
  const toggleAdminSec = (id) => {
    setAdminOpenSec(s => { const n = s === id ? null : id; GS.set('caulis_admin_open', n); return n; });
    if (id === 'system' && !adminSystemData && !adminSystemBusy) loadAdminSystem();
  };
  // same single-open-per-parent SubCollapse pattern as Admin above, reused for
  // the two sections the user singled out as too dense — Appearance and
  // Developer each get their own independent namespaced key
  const [apOpenSec, setApOpenSec] = useState(() => GS.get('caulis_ap_open', null));
  const isApOpen = (id) => apOpenSec === id;
  const toggleApSec = (id) => setApOpenSec(s => { const n = s === id ? null : id; GS.set('caulis_ap_open', n); return n; });
  const [devOpenSec, setDevOpenSec] = useState(() => GS.get('caulis_dev_open2', null));
  const isDevOpen = (id) => devOpenSec === id;
  const toggleDevSec = (id) => setDevOpenSec(s => { const n = s === id ? null : id; GS.set('caulis_dev_open2', n); return n; });
  const loadAdminSystem = async () => {
    setAdminSystemBusy(true);
    try { const s = await onAdminGetSystem(adminSecret); if (s) setAdminSystemData(s); } catch (e) {}
    setAdminSystemBusy(false);
  };

  // one unlock action loads everything at once — no more per-panel "Load…"
  // buttons, and every call is guarded so a network hiccup shows an inline
  // error instead of leaving the screen half-rendered.
  const unlockAdmin = async (secretOverride, silent) => {
    const secret = secretOverride != null ? secretOverride : adminSecret;
    setAdminBusy(true); if (!silent) setAdminErr(false);
    try {
      const [gardens, stats, settings, files] = await Promise.all([
        onAdminListGardens(secret), onAdminStats(secret),
        onAdminGetSettings(secret), onAdminListBackups(secret),
      ]);
      if (!gardens) {
        if (silent) setAdminSecret(''); else setAdminErr(true);
        setAdminBusy(false); return;
      }
      setAdminGardens(gardens); setAdminStatsData(stats); setBackupSettings(settings); setBackupFiles(files);
      setAdminUnlocked(true);
    } catch (e) { if (silent) setAdminSecret(''); else setAdminErr(true); }
    setAdminBusy(false);
  };
  // stored admin secret persists across reloads (same localStorage tradeoff as
  // the per-garden password) -- silently re-verify it once the dev panel is
  // reached, so the PIN gate is the only re-entry the user ever hits
  const silentAdminTried = useRef(false);
  useEffect(() => {
    if (devAuthed && adminSecret && !adminUnlocked && !silentAdminTried.current) {
      silentAdminTried.current = true;
      unlockAdmin(adminSecret, true);
    }
  }, [devAuthed, adminSecret, adminUnlocked]);
  const refreshAdminGardens = async () => {
    try { const gardens = await onAdminListGardens(adminSecret); if (gardens) setAdminGardens(gardens); } catch (e) {}
  };
  const loadAdminGarden = async (key) => {
    setAdminStatus('loading');
    try {
      const { data } = await onAdminLoadGarden(adminSecret, key);
      if (!data || !Array.isArray(data.plants)) { setAdminLoaded({ key, data: data || {}, plants: [] }); setAdminStatus('empty'); return; }
      setAdminLoaded({ key, data, plants: data.plants.map(p => ({ ...p })) });
      setAdminStatus('loaded');
    } catch (e) { setAdminStatus('error'); }
  };
  const adminShiftAll = (n) => setAdminLoaded(nl => nl && ({ ...nl, plants: nl.plants.map(p => { const wa = (typeof p.wateredAt === 'number' ? p.wateredAt : todayMidnight()) - n * 86400000; return { ...p, wateredAt: wa, wv: WATER_SCHEMA, days: daysSinceMidnight(wa) }; }) }));
  const adminWaterAll = () => setAdminLoaded(nl => nl && ({ ...nl, plants: nl.plants.map(p => { const wa = todayMidnight(); return { ...p, wateredAt: wa, wv: WATER_SCHEMA, days: 0, history: [...(p.history||[]), fmtLocalDate(new Date())].slice(-60) }; }) }));
  const adminSetDays = (id, d) => setAdminLoaded(nl => nl && ({ ...nl, plants: nl.plants.map(p => { if (p.id !== id) return p; const dd = Math.max(0, d | 0); const wa = todayMidnight() - dd * 86400000; return { ...p, wateredAt: wa, wv: WATER_SCHEMA, days: dd }; }) }));
  // grant/revoke for testing — same "stays local until Push to garden" model
  // as the day-shift tools above, so an admin can preview a change before
  // committing it through the real sync path
  const toggleAdminBadge = (id) => setAdminLoaded(nl => {
    if (!nl) return nl;
    const cur = Array.isArray(nl.data.badges) ? nl.data.badges : [];
    const existing = cur.find(b => b.id === id);
    const held = existing && !existing.revoked;
    let nextBadges;
    if (held) {
      // revoke: keep the entry (flagged, not removed) instead of deleting
      // it outright — a plain removal is indistinguishable from "never
      // earned" to the auto-unlock effect, which re-derives earned status
      // from live garden data on every plants/locations change. Almost
      // every non-secret badge's check() is a permanent state predicate
      // (e.g. "has 10+ plants"), so a removed-not-flagged revoke got
      // silently re-granted — often within minutes — the moment that
      // predicate re-evaluated true again, which it already was.
      nextBadges = cur.map(b => b.id === id ? { ...b, revoked: true } : b);
    } else if (existing) {
      // re-grant after a prior revoke — un-flag rather than duplicate
      nextBadges = cur.map(b => b.id === id ? { ...b, revoked: false, earnedAt: Date.now() } : b);
    } else {
      nextBadges = [...cur, { id, earnedAt: Date.now() }];
    }
    return { ...nl, data: { ...nl.data, badges: nextBadges } };
  });
  const pushAdminGarden = async () => {
    if (!adminLoaded) return;
    setAdminStatus('pushing');
    try {
      const clean = adminLoaded.plants.map(({ photos, userImage, ...rest }) => rest);
      await onAdminSaveGarden(adminSecret, adminLoaded.key, { ...adminLoaded.data, plants: clean });
      setAdminStatus('pushed'); setTimeout(() => setAdminStatus('loaded'), 1800);
    } catch (e) { setAdminStatus('error'); }
  };
  const deleteAdminGarden = async () => {
    if (!adminLoaded) return;
    try { await onAdminRemoveGarden(adminSecret, adminLoaded.key); } catch (e) {}
    setAdminLoaded(null); setAdminStatus('idle');
    refreshAdminGardens();
  };
  const filteredAdminGardens = adminGardens ? adminGardens.filter(g => g.key.toLowerCase().includes(adminSearch.toLowerCase())) : null;
  const bulkDelete = async (filter) => {
    try { const n = await onAdminBulkRemove(adminSecret, filter); if (n != null) refreshAdminGardens(); } catch (e) {}
  };
  const saveBackupSettings = async (next) => {
    setBackupSettings(next);
    try { await onAdminSaveSettings(adminSecret, next); } catch (e) {}
  };
  const runBackupNow = async () => {
    setBackupBusy(true);
    try {
      await onAdminRunBackup(adminSecret);
      const f = await onAdminListBackups(adminSecret);
      setBackupFiles(f);
    } catch (e) {}
    setBackupBusy(false);
  };
  // sidebar quick-action — re-pulls just the three numbers the aside card
  // shows (stats/backups/system) without touching the gardens list, which
  // is the heaviest call and isn't rendered there
  const [adminQuickBusy, setAdminQuickBusy] = useState(false);
  const refreshAdminQuick = async () => {
    setAdminQuickBusy(true);
    try {
      const [stats, files, sys] = await Promise.all([
        onAdminStats(adminSecret), onAdminListBackups(adminSecret), onAdminGetSystem(adminSecret),
      ]);
      if (stats) setAdminStatsData(stats);
      if (files) setBackupFiles(files);
      if (sys) setAdminSystemData(sys);
    } catch (e) {}
    setAdminQuickBusy(false);
  };
  const fmtBytes = (n) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(1)} MB`;
  const fmtDuration = (sec) => {
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };
  const fmtAgo = (iso) => {
    const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (sec < 90) return 'just now';
    const m = Math.floor(sec / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
    return `${Math.floor(d / 30)}mo ago`;
  };
  // recency isn't a bar-friendly magnitude like a count is — the list is
  // already ordered newest-first by the backend query, so the bar here is
  // purely rank-based (row 0 fullest, decreasing) and the real signal is the
  // relative-time label, not a value comparison
  const RecencyList = ({ rows, onRowClick }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {rows.map((r, i) => (
        <div key={r.key} onClick={onRowClick ? ()=>onRowClick(r) : undefined} style={{ cursor:onRowClick?'pointer':'default' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
            <span style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink }}>{r.key}</span>
            <span style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.6 }}>{fmtAgo(r.updated_at)}</span>
          </div>
          <div style={{ height:6, borderRadius:999, background:'rgba(45,80,22,0.08)', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${100 - i * (80/Math.max(1,rows.length-1||1))}%`, borderRadius:999, background: i===0?C.forest:'rgba(122,158,78,0.7)', transition:'width 300ms ease' }}/>
          </div>
        </div>
      ))}
    </div>
  );
  // small collapsible sub-card scoped to the admin block — same open/chevron
  // language as the outer Settings accordion, namespaced under its own key so
  // it never collides with caulis_set_open
  const AdminSub = ({ id, title, children }) => (
    <div style={{ borderRadius:rad(14), border:C.hair, overflow:'hidden', background:C.panel }}>
      <div onClick={()=>toggleAdminSec(id)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', padding:'12px 14px' }}>
        <span style={{ fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.ink }}>{title}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" style={{ transform: isAdminOpen(id)?'rotate(180deg)':'rotate(0deg)', transition:'transform 220ms ease', opacity:0.45, flexShrink:0 }}><path d="M6 9l6 6 6-6" stroke={C.brown} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div style={{ display:'grid', gridTemplateRows: isAdminOpen(id)?'1fr':'0fr', transition:'grid-template-rows 260ms ease' }}>
        <div style={{ overflow:'hidden', minHeight:0 }}>
          <div style={{ padding:'0 14px 14px', display:'flex', flexDirection:'column', gap:12 }}>{children}</div>
        </div>
      </div>
    </div>
  );
  const numStepper = (val, set, suffix) => (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div onClick={()=>set(Math.max(1, val-1))} style={{ ...dBtn(false), padding:'6px 12px', fontSize:16 }}>−</div>
      <span style={{ fontFamily:FONT_SANS, fontSize:15, fontWeight:600, color:C.ink, minWidth:46, textAlign:'center' }}>{val}{suffix}</span>
      <div onClick={()=>set(val+1)} style={{ ...dBtn(false), padding:'6px 12px', fontSize:16 }}>+</div>
    </div>
  );
  // sequential single-hue sparkline — magnitude over time, one series, no legend needed
  const Sparkline = ({ data }) => {
    if (!data || !data.length) return null;
    const days = [...data].reverse();
    const max = Math.max(1, ...days.map(d => d.count));
    return (
      <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:52, padding:'0 2px' }}>
        {days.map((d, i) => {
          const h = Math.max(3, (d.count / max) * 44);
          const isLast = i === days.length - 1;
          return (
            <div key={d.day} title={`${d.day.slice(0,10)}: ${d.count}`} style={{ flex:1, height:h, borderRadius:3, background: isLast ? C.forest : 'rgba(122,158,78,0.55)', transition:'height 300ms ease' }}/>
          );
        })}
      </div>
    );
  };
  // horizontal bar list — magnitude comparison, single hue scaled by rank
  const BarList = ({ rows, labelKey, valueKey, onRowClick }) => {
    const max = Math.max(1, ...rows.map(r => r[valueKey]));
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {rows.map((r, i) => (
          <div key={r[labelKey]} onClick={onRowClick ? ()=>onRowClick(r) : undefined} style={{ cursor:onRowClick?'pointer':'default' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink }}>{r[labelKey]}</span>
              <span style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.6 }}>{r[valueKey]}</span>
            </div>
            <div style={{ height:6, borderRadius:999, background:'rgba(45,80,22,0.08)', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${(r[valueKey]/max)*100}%`, borderRadius:999, background: i===0?C.forest:'rgba(122,158,78,0.7)', transition:'width 300ms ease' }}/>
            </div>
          </div>
        ))}
      </div>
    );
  };
  // small generic radial dial — magnitude-as-fraction-of-whole reads better as
  // a ring than a bar when the "whole" is conceptual (a rate, a share) rather
  // than a literal max value. Single hue only, per the app's sequential palette.
  const Gauge = ({ label, sub, pct, tone = 'forest' }) => {
    const r = 26, c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(1, pct));
    const color = tone === 'warn' ? STATUS.soon.dot : tone === 'bad' ? STATUS.needs.dot : C.forest;
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 8px', borderRadius:rad(12), background:C.bg }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(45,80,22,0.1)" strokeWidth="6"/>
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - clamped)} transform="rotate(-90 32 32)" style={{ transition:'stroke-dashoffset 500ms ease' }}/>
          <text x="32" y="37" textAnchor="middle" fontFamily={FONT_SANS} fontSize="13" fontWeight="700" fill={C.ink}>{Math.round(clamped * 100)}%</text>
        </svg>
        <div style={{ fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, color:C.ink, textAlign:'center' }}>{label}</div>
        {sub && <div style={{ fontFamily:FONT_SANS, fontSize:10, color:C.brown, opacity:0.6, textAlign:'center' }}>{sub}</div>}
      </div>
    );
  };
  // radial gauge — how due the next backup is (elapsed / interval), a ring not a bar since it's a cyclical "how full is the clock" read
  const BackupGauge = ({ settings, files }) => {
    if (!settings) return null;
    const last = files && files[0] ? new Date(files[0].createdAt).getTime() : null;
    const elapsedH = last ? (Date.now() - last) / 3600000 : null;
    const pct = elapsedH == null ? 0 : Math.min(1, elapsedH / settings.backupIntervalHours);
    const overdue = pct >= 1;
    const r = 30, c = 2 * Math.PI * r;
    const color = overdue ? STATUS.needs.dot : pct > 0.7 ? STATUS.soon.dot : C.forest;
    return (
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink:0 }}>
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(45,80,22,0.1)" strokeWidth="6"/>
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 36 36)" style={{ transition:'stroke-dashoffset 400ms ease' }}/>
        </svg>
        <div>
          <div style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600, color: overdue?STATUS.needs.dot:C.ink }}>{last ? (overdue ? 'Backup due' : `${Math.round((1-pct)*settings.backupIntervalHours)}h until due`) : 'No backups yet'}</div>
          <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.65 }}>{last ? `Last: ${new Date(last).toLocaleString()}` : 'Run one to start the clock'}</div>
        </div>
      </div>
    );
  };

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

  const resetJoin = () => { setJoining(false); setJoinKey(''); setJoinPassword(''); setJoinStatus('idle'); };

  // single step: key + (optional) password derive the node. If nothing is
  // stored there, the key/password pair is wrong or the garden is empty.
  const submitJoin = async (force = false) => {
    const k = joinKey.trim();
    if (!k) return;
    if (SYNC_READY && !force) {
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
    <ToggleKnob on={on} color={C.sage}/>
  );
  return (
    <div style={{ minHeight:'100%', position:'relative', paddingBottom:24 }}>
      <Sprig opacity={0.14}/>
      <ScreenHead eyebrow="Preferences" title="Settings" isDesktop={isDesktop} appName={gardenName}/>
      <div style={{ padding:`22px ${sp}px 0`, position:'relative', zIndex:2, display:'flex', gap:28, alignItems:'flex-start' }}>
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:18, maxWidth: isDesktop ? 680 : undefined }}>
        <div style={{ position:'relative' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', opacity:0.4, pointerEvents:'none' }}><circle cx="11" cy="11" r="6.5" stroke={C.brown} strokeWidth="1.8"/><path d="M20 20l-4.5-4.5" stroke={C.brown} strokeWidth="1.8" strokeLinecap="round"/></svg>
          <input
            ref={settingsSearchRef} value={settingsQuery} onChange={e=>setSettingsQuery(e.target.value)}
            placeholder={isDesktop ? 'Search settings… (Ctrl+F)' : 'Search settings…'}
            style={{ width:'100%', boxSizing:'border-box', padding:'11px 14px 11px 38px', borderRadius:rad(14), border:`1px solid ${C.line}`, background:C.input, fontFamily:FONT_SANS, fontSize:14, color:C.ink, outline:'none' }}/>
          {settingsQuery.trim() && (
            <div style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', display:'flex', alignItems:'center', gap:4 }}>
              {settingsMatches.length > 0 ? (
                <>
                  <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginRight:2 }}>{settingsMatchIdx + 1}/{settingsMatches.length}</span>
                  {settingsMatches.length > 1 && <>
                    <div onClick={()=>cycleMatch(-1)} style={{ cursor:'pointer', width:22, height:22, borderRadius:999, background:'rgba(45,80,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="9" height="9" viewBox="0 0 12 12"><path d="M8 2 3 6l5 4" stroke={C.brown} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div onClick={()=>cycleMatch(1)} style={{ cursor:'pointer', width:22, height:22, borderRadius:999, background:'rgba(45,80,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="9" height="9" viewBox="0 0 12 12"><path d="M4 2l5 4-5 4" stroke={C.brown} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </>}
                </>
              ) : <span style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6 }}>No match</span>}
              <div onClick={()=>setSettingsQuery('')} style={{ marginLeft:4, cursor:'pointer', width:22, height:22, borderRadius:999, background:'rgba(45,80,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke={C.brown} strokeWidth="1.6" strokeLinecap="round"/></svg>
              </div>
            </div>
          )}
        </div>
        <SettingsSection title="Appearance" open={isOpen('appearance')} onToggle={()=>toggleSec('appearance')} id={'sec-'+'appearance'} matched={settingsMatches[settingsMatchIdx] === 'appearance'} query={settingsMatches.includes('appearance') ? settingsQuery : ''} bodyRef={registerSection('appearance')}>
          <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, overflow:'hidden' }}>
            <div onClick={onToggleDark} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', cursor:'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Dark mode</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.65, marginTop:1 }}>Botanical night theme</div>
              </div>
              <ToggleKnob on={darkMode}/>
            </div>
            <div style={{ padding:'12px 16px', borderTop:C.hair }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Garden name</div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1, marginBottom:8 }}>Shown in place of "Caulis" at the top of every screen</div>
              <input value={gardenName} onChange={e=>onSetGardenName(e.target.value.slice(0,24))} placeholder="Caulis"
                style={{ width:'100%', boxSizing:'border-box', border:C.hair, borderRadius:rad(11), padding:'9px 12px', fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:16, color:C.forest, background:C.input, outline:'none' }}/>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:10 }}>
            <SubCollapse title="Color & palette" open={isApOpen('color')} onToggle={()=>toggleApSec('color')}>
              <div style={{ padding:'12px 16px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Accent color</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Theme color for buttons, icons &amp; highlights</div>
                  </div>
                  <span style={{ flexShrink:0, fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, color:C.forest }}>{PALETTES[palette].label}</span>
                </div>
                <SwatchRow value={palette} onSelect={onSetPalette} options={PALETTE_ORDER.map(key => key === 'custom'
                  ? { key, label:'Custom', ring:customPaletteColor }
                  : { key, label:PALETTES[key].label, swatch:PALETTES[key].swatch })}/>
                {palette === 'custom' && <CustomColorPicker hex={customPaletteColor} onChange={onSetCustomPaletteColor}/>}
              </div>
              <div style={{ padding:'12px 16px', borderTop:C.hair }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Selected tab highlight</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Independent accent for the active nav tab</div>
                  </div>
                  <span style={{ flexShrink:0, fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, color:C.forest }}>{ACCENTS[accent || 'match'].label}</span>
                </div>
                <SwatchRow value={accent || 'match'} onSelect={onSetAccent} options={ACCENT_ORDER.map(key => {
                  if (key === 'custom') return { key, label:'Custom', ring:customAccentColor };
                  const a = ACCENTS[key];
                  const swatch = a.swatch ? (darkMode ? (a.dark || a.swatch) : a.swatch) : `linear-gradient(135deg, ${C.forest} 50%, ${C.sage} 50%)`;
                  return { key, label:a.label, swatch, ring: a.swatch || C.forest };
                })}/>
                {accent === 'custom' && <CustomColorPicker hex={customAccentColor} onChange={onSetCustomAccentColor}/>}
              </div>
            </SubCollapse>
            <SubCollapse title="Shape & photos" open={isApOpen('shape')} onToggle={()=>toggleApSec('shape')}>
              <div style={{ padding:'12px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                  <div style={{ flexShrink:0, width:30, height:30, borderRadius:rad(16), background:'rgba(122,158,78,0.22)', border:`1.5px solid ${C.sage}`, transition:'border-radius 160ms ease' }}/>
                  <div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Corner roundness</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Scales every card, button &amp; sheet corner</div>
                  </div>
                </div>
                <OptionList value={radiusDensity} onSelect={onSetRadiusDensity} options={RADIUS_ORDER.map(k=>[k, RADIUS_DENSITY[k].label])}/>
              </div>
              <div style={{ padding:'0 16px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                  <div style={{ flexShrink:0, width:30, height:30, borderRadius:rad(8), background:'linear-gradient(135deg, #8FBB5E 0%, #2D5016 100%)', filter:IMAGE_TREATMENTS[imageTreatment].filter, transition:'filter 200ms ease' }}/>
                  <div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Photo treatment</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>How plant photos render everywhere</div>
                  </div>
                </div>
                <OptionList value={imageTreatment} onSelect={onSetImageTreatment} options={IMAGE_TREATMENT_ORDER.map(k=>[k, IMAGE_TREATMENTS[k].label])}/>
              </div>
              <div style={{ padding:'0 16px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                  <div style={{ flexShrink:0, width:30, height:30, borderRadius:999, background:'rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {statusStyle === 'minimal'
                      ? <span style={{ fontFamily:FONT_SANS, fontSize:7, fontWeight:800, color:STATUS.needs.dot }}>OK</span>
                      : <div style={{ width:9, height:9, borderRadius:999, background:STATUS.needs.dot, boxShadow:`0 0 0 3px ${STATUS.needs.ring}` }}/>}
                  </div>
                  <div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Status indicator</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Dot with glow, or a plain text label</div>
                  </div>
                </div>
                <OptionList value={statusStyle} onSelect={onSetStatusStyle} options={STATUS_STYLE_ORDER.map(k=>[k, STATUS_STYLES[k].label])}/>
              </div>
              <div style={{ padding:'0 16px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                  <div style={{ flexShrink:0, width:30, height:30, borderRadius:999, background:'rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <IconGear s={16} c={C.ink}/>
                  </div>
                  <div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Icon weight</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Line thickness of every UI icon — independent of corner roundness</div>
                  </div>
                </div>
                <OptionList value={iconStroke} onSelect={onSetIconStroke} options={ICON_STROKE_ORDER.map(k=>[k, ICON_STROKE_LEVELS[k].label])}/>
              </div>
              <div style={{ padding:'0 16px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                  <div style={{ flexShrink:0, width:30, height:30, borderRadius:999, background:'rgba(45,80,22,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:700, fontSize:16, color:C.ink }}>Aa</span>
                  </div>
                  <div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Font pairing</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>{FONT_PAIRINGS[fontPairing || 'classic'].label === 'Classic' ? 'The other two load only when picked' : 'Loaded — applies everywhere text appears'}</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:10 }}>
                  {FONT_PAIRING_ORDER.map(k => {
                    const p = FONT_PAIRINGS[k];
                    const on = (fontPairing || 'classic') === k;
                    return (
                      <div key={k} onClick={()=>onSetFontPairing(k)} style={{
                        display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, cursor:'pointer',
                        padding:'10px 12px', borderRadius:rad(12), background: on ? 'rgba(45,80,22,0.08)' : 'transparent',
                        border: on ? `1px solid ${C.forest}` : '1px solid transparent', transition:'background 160ms, border-color 160ms',
                      }}>
                        <div style={{ display:'flex', alignItems:'baseline', gap:9, minWidth:0 }}>
                          <span style={{ fontFamily:p.serif, fontStyle:'italic', fontWeight:600, fontSize:16, color: on ? C.forest : C.ink, flexShrink:0 }}>Caulis</span>
                          <span style={{ fontFamily:p.sans, fontSize:11.5, color:C.brown, opacity:0.75, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.label}</span>
                        </div>
                        {on && <IconCheck s={15} c={C.forest} w={2.2}/>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </SubCollapse>
            {/* "Columns" and "Padding & gaps" are two genuinely different axes
                (how many cards per row vs. how tight the padding/gaps are)
                that used to sit as two similarly-worded rows ("Card density" /
                "Spacing") right next to each other with no visual grouping —
                that's what read as a duplicate control. Grouping the column
                preset and its manual override together, then clearly
                separating "Padding & gaps" underneath with its own
                independent-of-columns description, makes the split obvious
                at a glance instead of requiring the user to read both twice. */}
            <SubCollapse title="Layout & spacing" open={isApOpen('layout')} onToggle={()=>toggleApSec('layout')}>
              {!isDesktop && (
                <div style={{ padding:'12px 16px' }}>
                  <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Columns</div>
                  <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>How many plant cards sit per row in Garden</div>
                  <OptionList value={gridCols || (cardDensity === 'compact' ? 3 : 2)} onSelect={v => { onSetGridCols(v); onSetDensity(v === 3 ? 'compact' : 'comfy'); }}
                    options={[[2,'2 columns'],[3,'3 columns'],[4,'4 columns']]}/>
                </div>
              )}
              <div style={{ padding: isDesktop ? '12px 16px' : '0 16px 12px' }}>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Padding &amp; gaps</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Tightness of spacing everywhere — independent of column count</div>
                <OptionList value={uiDensity} onSelect={onSetUiDensity} options={UI_DENSITY_ORDER.map(k=>[k, UI_DENSITY[k].label])}/>
              </div>
            </SubCollapse>
            <SubCollapse title="Background & motion" open={isApOpen('bg')} onToggle={()=>toggleApSec('bg')}>
              <div style={{ padding:'12px 16px' }}>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Texture</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>A very subtle pattern behind every screen</div>
                <div style={{ marginTop:10 }}><TexturePicker value={bgTexture} onSelect={onSetBgTexture}/></div>
                {(bgTexture === 'paper' || bgTexture === 'marble') && (
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginBottom:6 }}>{bgTexture === 'marble' ? 'Marble intensity' : 'Grain intensity'}</div>
                    <Segmented value={grainIntensity} onSelect={onSetGrainIntensity} options={GRAIN_ORDER.map(k=>[k, GRAIN_LEVELS[k].label])}/>
                  </div>
                )}
              </div>
              <div style={{ padding:'12px 16px', borderTop:C.hair }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Background color</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>White or black first, then a soft palette tint, or pick your own</div>
                  </div>
                  <span style={{ flexShrink:0, fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, color:C.forest }}>
                    {bgColorChoice === 'off' ? 'Theme default' : bgColorChoice === 'white' ? 'White' : bgColorChoice === 'black' ? 'Black' : bgColorChoice === 'custom' ? 'Custom' : (PALETTES[bgColorChoice] ? PALETTES[bgColorChoice].label : 'Theme default')}
                  </span>
                </div>
                <SwatchRow value={bgColorChoice || 'off'} onSelect={onSetBgColorChoice} options={BG_COLOR_ORDER.map(key => {
                  if (key === 'off') return { key, label:'Theme default', swatch:`linear-gradient(135deg, ${C_LIGHT.bg} 50%, ${C_DARK.bg} 50%)`, ring:C.forest, border:true };
                  if (key === 'white') return { key, label:'White', swatch:'#FFFFFF', ring:'#0A0A08', border:true };
                  if (key === 'black') return { key, label:'Black', swatch:'#0A0A08' };
                  if (key === 'custom') return { key, label:'Custom', ring:customBgColor };
                  return { key, label:PALETTES[key].label, swatch:BG_TINTS[key], ring:PALETTES[key].swatch, border:true };
                })}/>
                {bgColorChoice === 'custom'
                  ? <CustomColorPicker hex={customBgColor} onChange={onSetCustomBgColor} mode="bg"/>
                  : bgColorChoice && bgColorChoice !== 'off' && <BgContrastNote hex={resolveBgColorChoice(bgColorChoice, customBgColor)}/>}
              </div>
              <div style={{ padding:'12px 16px', borderTop:C.hair }}>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Garden hero photo</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>A rotating plant photo at the top of Garden — off, or placed above/below the title</div>
                <OptionList value={heroBanner || 'below'} onSelect={onSetHeroBanner} options={[['off','Off'],['below','Below title'],['above','Above title']]}/>
              </div>
              <div onClick={onToggleReduceMotion} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:C.hair, cursor:'pointer' }}>
                <div>
                  <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Reduce motion</div>
                  <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.65, marginTop:1 }}>Disable swipe &amp; transition animations</div>
                </div>
                <ToggleKnob on={reduceMotion}/>
              </div>
            </SubCollapse>
          </div>
        </SettingsSection>
        <SettingsSection title="Garden" open={isOpen('garden')} onToggle={()=>toggleSec('garden')} id={'sec-'+'garden'} matched={settingsMatches[settingsMatchIdx] === 'garden'} query={settingsMatches.includes('garden') ? settingsQuery : ''} bodyRef={registerSection('garden')}>
          <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, overflow:'hidden' }}>
            <Row label="Plants tracked" value={String(plants.length)}/>
            <Row label="Locations" value={String(locations.length)}/>
            <LocationsManager plants={plants} locations={locations} onAdd={onAddLocationSetting} onRename={onRenameLocation} onRemove={onRemoveLocation} roomLight={roomLight} onSetRoomLight={onSetRoomLight} locationTags={locationTags} onSetLocationTag={onSetLocationTag}/>
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
              <ToggleKnob on={hideHealthy}/>
            </div>
            <div style={{ padding:'12px 16px', borderTop:C.hair }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Card date line</div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>What each plant card's small date line says</div>
              <OptionList value={cardDateMode || 'last'} onSelect={onSetCardDateMode} options={CARD_DATE_MODE_ORDER.map(k=>[k, CARD_DATE_MODES[k].label])}/>
            </div>
            <div style={{ padding:'12px 16px', borderTop:C.hair }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Opens on launch</div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1, marginBottom:9 }}>What happens when you start Caulis — any button on your nav bar works, not just screens</div>
              <div style={{ display:'flex', gap:6, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
                {(() => {
                  const seen = new Set();
                  const slots = normalizeNav(navConfig).filter(s => s.action !== 'empty' && NAV_ACTIONS[s.action] && (seen.has(s.action) ? false : seen.add(s.action)));
                  return slots.map(s => {
                    const on = defaultTab === s.action;
                    const isAction = !NAV_ACTIONS[s.action].tab;
                    return <div key={s.action} onClick={()=>onSetDefaultTab(s.action)} style={{ flexShrink:0, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5, padding:'6px 13px', borderRadius:999, background:on?C.forest:C.input, color:on?'#fff':C.ink, fontFamily:FONT_SANS, fontSize:12, fontWeight:on?600:500, transition:'all 140ms ease' }}>{navLabel(s)}{isAction && <span style={{ opacity:on?0.8:0.5, fontSize:10 }}>↗</span>}</div>;
                  });
                })()}
              </div>
            </div>
          </div>
        </SettingsSection>
        <SettingsSection title="Badges" open={isOpen('badges')} onToggle={()=>toggleSec('badges')} id={'sec-'+'badges'} matched={settingsMatches[settingsMatchIdx] === 'badges'} query={settingsMatches.includes('badges') ? settingsQuery : ''} bodyRef={registerSection('badges')}>
          <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, overflow:'hidden' }}>
            <Row label="Earned" value={`${(badges||[]).filter(b=>!b.revoked).length} of ${BADGE_DEFS.length}`}/>
            <div onClick={onToggleAmbientBadges} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:C.hair, cursor:'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Ambient decorations</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Faint earned-badge icons in the Garden background</div>
              </div>
              <Toggle on={ambientBadges}/>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:C.hair }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Decoration density</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>How many ambient badges show at once</div>
              </div>
              <div style={{ display:'flex', background:'rgba(45,80,22,0.07)', borderRadius:9, padding:3 }}>
                {[['few','Few'],['normal','Normal'],['many','Many']].map(([val,label]) => {
                  const on = (badgeDensity||'normal') === val;
                  return (
                    <div key={val} onClick={()=>onSetBadgeDensity(val)} style={{ cursor:'pointer', padding:'5px 11px', borderRadius:6, background:on?C.forest:'transparent', color:on?'#fff':C.ink, fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, opacity:on?1:0.5, transition:'all 140ms ease' }}>{label}</div>
                  );
                })}
              </div>
            </div>
          </div>
        </SettingsSection>
        <SettingsSection title="Behavior" open={isOpen('behavior')} onToggle={()=>toggleSec('behavior')} id={'sec-'+'behavior'} matched={settingsMatches[settingsMatchIdx] === 'behavior'} query={settingsMatches.includes('behavior') ? settingsQuery : ''} bodyRef={registerSection('behavior')}>
          <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, overflow:'hidden' }}>
            <div onClick={onToggleConfirmDelete} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', cursor:'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Confirm before delete</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Ask before removing a plant</div>
              </div>
              <ToggleKnob on={confirmDelete}/>
            </div>
            <div onClick={onToggleSwipeNav} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:C.hair, cursor:'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Swipe between tabs</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Horizontal swipe switches screens (mobile)</div>
              </div>
              <ToggleKnob on={swipeNav}/>
            </div>
            <div onClick={onToggleHaptics} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:C.hair, cursor:'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Haptics</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Vibrate on water, snooze &amp; delete (mobile)</div>
              </div>
              <ToggleKnob on={haptics}/>
            </div>
            {haptics && (
              <div style={{ padding:'12px 16px', borderTop:C.hair }}>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Haptic strength</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1, marginBottom:9 }}>How strong the vibration feels — no sound involved</div>
                <div style={{ display:'flex', background:'rgba(45,80,22,0.07)', borderRadius:9, padding:3 }}>
                  {HAPTIC_INTENSITY_ORDER.map(val => {
                    const on = (hapticIntensity || 'standard') === val;
                    return (
                      <div key={val} onClick={()=>onSetHapticIntensity(val)} style={{ flex:1, textAlign:'center', cursor:'pointer', padding:'6px 0', borderRadius:6, background:on?C.forest:'transparent', color:on?'#fff':C.ink, fontFamily:FONT_SANS, fontSize:12, fontWeight:600, opacity:on?1:0.55, transition:'all 140ms ease' }}>{HAPTIC_INTENSITIES[val].label}</div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SettingsSection>
        <SettingsSection title="Notifications" open={isOpen('notif')} onToggle={()=>toggleSec('notif')} id={'sec-'+'notif'} matched={settingsMatches[settingsMatchIdx] === 'notif'} query={settingsMatches.includes('notif') ? settingsQuery : ''} bodyRef={registerSection('notif')}>
          <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, overflow:'hidden' }}>
            <div onClick={pushSupported && !pushBusy ? onTogglePushWatering : undefined} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:C.hair, cursor:pushSupported?'pointer':'default', opacity:pushSupported?1:0.5 }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Watering reminders</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Push when a plant needs water, once a day</div>
              </div>
              <Toggle on={pushWatering}/>
            </div>
            <div onClick={pushSupported && !pushBusy ? onTogglePushDigest : undefined} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', cursor:pushSupported?'pointer':'default', opacity:pushSupported?1:0.5 }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Weekly garden digest</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Monday summary of what needs attention</div>
              </div>
              <Toggle on={pushDigest}/>
            </div>
            <div onClick={pushSupported && !pushBusy ? onToggleCustomReminders : undefined} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:C.hair, cursor:pushSupported?'pointer':'default', opacity:pushSupported?1:0.5 }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Custom reminder pushes</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Fold due custom reminders into the daily ping</div>
              </div>
              <Toggle on={customRemindersEnabled}/>
            </div>
            {!pushSupported && <div style={{ padding:'10px 16px', fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, borderTop:C.hair }}>Not supported in this browser.</div>}
            {pushError && <div style={{ padding:'10px 16px', fontFamily:FONT_SANS, fontSize:11.5, color:'#B4472E', borderTop:C.hair }}>{pushError}</div>}
            <div style={{ padding:'12px 16px', borderTop:C.hair, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Reminder time</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Daily watering ping, your local time</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div onClick={()=>onSetReminderHourLocal((reminderHourLocal + 23) % 24)} style={{ cursor:'pointer', width:30, height:30, borderRadius:9, background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FONT_SANS, fontSize:17, fontWeight:600 }}>−</div>
                <span style={{ minWidth:60, textAlign:'center', fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:C.ink }}>{reminderHourLocal % 12 === 0 ? 12 : reminderHourLocal % 12}:00 {reminderHourLocal < 12 ? 'AM' : 'PM'}</span>
                <div onClick={()=>onSetReminderHourLocal((reminderHourLocal + 1) % 24)} style={{ cursor:'pointer', width:30, height:30, borderRadius:9, background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FONT_SANS, fontSize:17, fontWeight:600 }}>+</div>
              </div>
            </div>
            <div style={{ padding:'12px 16px', borderTop:C.hair }}>
              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:1 }}>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Watering ping frequency</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:700, color:C.forest }}>{wateringFrequencyDays === 1 ? 'Daily' : `Every ${wateringFrequencyDays} days`}</div>
              </div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginBottom:12 }}>How often the watering/reminder push can fire</div>
              <input
                type="range" min="1" max="14" step="1" value={wateringFrequencyDays}
                onChange={e=>onSetWateringFrequencyDays(Number(e.target.value))}
                style={{ width:'100%', accentColor:C.forest, height:22, cursor:'pointer' }}
              />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
                <span style={{ fontFamily:FONT_SANS, fontSize:10.5, color:C.brown, opacity:0.5 }}>1 day</span>
                <span style={{ fontFamily:FONT_SANS, fontSize:10.5, color:C.brown, opacity:0.5 }}>14 days</span>
              </div>
            </div>
            <div style={{ padding:'12px 16px', borderTop:C.hair }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink, marginBottom:1 }}>Digest day</div>
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginBottom:10 }}>Which day the weekly summary arrives</div>
              <div style={{ display:'flex', gap:6 }}>
                {['S','M','T','W','T','F','S'].map((label, dow) => {
                  const on = digestDay === dow;
                  return (
                    <div key={dow} onClick={()=>onSetDigestDay(dow)} style={{ flex:1, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', background: on?C.forest:'rgba(45,80,22,0.07)', color: on?'#fff':C.ink, opacity: on?1:0.6, fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, transition:'all 140ms ease' }}>{label}</div>
                  );
                })}
              </div>
            </div>
            <div onClick={onOpenDigest} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:C.hair, cursor:'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>This week in your garden</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>See the digest now, any day</div>
              </div>
              <span style={{ fontFamily:FONT_SANS, fontSize:18, color:C.brown, opacity:0.4 }}>&rsaquo;</span>
            </div>
          </div>
        </SettingsSection>
        <SettingsSection title="Printing" open={isOpen('printing')} onToggle={()=>toggleSec('printing')} id={'sec-'+'printing'} matched={settingsMatches[settingsMatchIdx] === 'printing'} query={settingsMatches.includes('printing') ? settingsQuery : ''} bodyRef={registerSection('printing')}>
          <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, overflow:'hidden' }}>
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
        <SettingsSection title="Plant data" open={isOpen('data')} onToggle={()=>toggleSec('data')} id={'sec-'+'data'} matched={settingsMatches[settingsMatchIdx] === 'data'} query={settingsMatches.includes('data') ? settingsQuery : ''} bodyRef={registerSection('data')}>
          <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, overflow:'hidden', padding:'14px 16px', display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <div style={{ fontFamily:FONT_SANS, fontSize:12, fontWeight:600, color:C.ink, opacity:0.7, marginBottom:6 }}>Perenual — species photos &amp; care data</div>
              <div style={{ display:'flex', gap:8 }}>
                <ApiKeyField value={key} savedValue={perenualKey} onChange={setKey} placeholder="API key"/>
                <div onClick={()=>{ onSavePerenualKey(key.trim()); setSaved(true); setTimeout(()=>setSaved(false),1800); }} style={{ flexShrink:0, padding:'0 14px', height:42, borderRadius:rad(11), background: saved?C.sage:C.forest, color:'#fff', display:'flex', alignItems:'center', gap:6, cursor:'pointer', transition:'background 200ms' }}>
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
                <ApiKeyField value={housePlantsInput} savedValue={housePlantsKey} onChange={setHousePlantsInput} placeholder="RapidAPI key"/>
                <div onClick={()=>{ onSaveHousePlantsKey(housePlantsInput.trim()); setHousePlantsSaved(true); setTimeout(()=>setHousePlantsSaved(false),1800); }} style={{ flexShrink:0, padding:'0 14px', height:42, borderRadius:rad(11), background: housePlantsSaved?C.sage:C.forest, color:'#fff', display:'flex', alignItems:'center', gap:6, cursor:'pointer', transition:'background 200ms' }}>
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
                <ApiKeyField value={plantIdInput} savedValue={plantIdKey} onChange={setPlantIdInput} placeholder="API key"/>
                <div onClick={()=>{ onSavePlantIdKey(plantIdInput.trim()); setPlantIdSaved(true); setTimeout(()=>setPlantIdSaved(false),1800); }} style={{ flexShrink:0, padding:'0 14px', height:42, borderRadius:rad(11), background: plantIdSaved?C.sage:C.forest, color:'#fff', display:'flex', alignItems:'center', gap:6, cursor:'pointer', transition:'background 200ms' }}>
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
              <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.ink, opacity:0.5, lineHeight:1.5, marginBottom:8 }}>Anthropic API key. Claude reviews &amp; corrects species care data on identify — filling gaps and fixing wrong watering intervals. Key is stored server-side against your garden and used only to call Anthropic on your behalf, never sent to the browser directly.</div>
              <div style={{ display:'flex', gap:8 }}>
                <ApiKeyField value={anthropicInput} savedValue={anthropicKey} onChange={setAnthropicInput} placeholder="sk-ant-…"/>
                <div onClick={()=>{ onSaveAnthropicKey(anthropicInput.trim()); setAnthropicSaved(true); setTimeout(()=>setAnthropicSaved(false),1800); }} style={{ flexShrink:0, padding:'0 14px', height:42, borderRadius:rad(11), background: anthropicSaved?C.sage:C.forest, color:'#fff', display:'flex', alignItems:'center', gap:6, cursor:'pointer', transition:'background 200ms' }}>
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
                  <div onClick={busy ? undefined : onRecheckAI} style={{ marginTop:12, padding:'11px 14px', borderRadius:rad(12), border:`1px solid ${C.forest}`, background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor: busy?'default':'pointer', opacity: busy?0.65:1 }}>
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
          <SettingsSection title="Install" open={isOpen('app')} onToggle={()=>toggleSec('app')} id={'sec-'+'app'} matched={settingsMatches[settingsMatchIdx] === 'app'} query={settingsMatches.includes('app') ? settingsQuery : ''} bodyRef={registerSection('app')}>
            <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, overflow:'hidden', padding:'14px 16px' }}>
              {installPrompt ? (
                <div onClick={onInstall} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
                  <div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:14, fontWeight:600, color:C.ink }}>Install Caulis</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.55, marginTop:2 }}>Add to your home screen</div>
                  </div>
                  <div style={{ flexShrink:0, padding:'10px 18px', borderRadius:rad(12), background:C.forest, color:'#fff', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Install</div>
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
        <SettingsSection title="Google sync" open={isOpen('google')} onToggle={()=>toggleSec('google')} id={'sec-'+'google'} matched={settingsMatches[settingsMatchIdx] === 'google'} query={settingsMatches.includes('google') ? settingsQuery : ''} bodyRef={registerSection('google')}>
          <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, overflow:'hidden', padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
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
                  style={{ flex:1, boxSizing:'border-box', height:42, borderRadius:rad(11), border:C.hair, background:C.input, padding:'0 12px', fontFamily:'ui-monospace,Menlo,monospace', fontSize:11.5, color:C.ink, outline:'none' }}/>
                <div onClick={()=>{ onSaveGoogleClientId(gcalInput.trim()); setGcalSaved(true); setTimeout(()=>setGcalSaved(false),1800); }} style={{ flexShrink:0, padding:'0 14px', height:42, borderRadius:rad(11), background: gcalSaved?C.sage:C.forest, color:'#fff', display:'flex', alignItems:'center', gap:6, cursor:'pointer', transition:'background 200ms' }}>
                  {gcalSaved && <IconCheck s={14}/>}
                  <span style={{ fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>{gcalSaved?'Saved':'Save'}</span>
                </div>
              </div>
              {googleClientId && (
                <div onClick={onConnectGoogle} style={{ height:42, borderRadius:rad(12), background:C.forest, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:9, cursor:'pointer' }}>
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
              <div onClick={handleGcalSync} style={{ height:42, borderRadius:rad(12), background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', gap:9, cursor:'pointer' }}>
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
        <SettingsSection title="Cloud sync" open={isOpen('cloud')} onToggle={()=>toggleSec('cloud')} id={'sec-'+'cloud'} matched={settingsMatches[settingsMatchIdx] === 'cloud'} query={settingsMatches.includes('cloud') ? settingsQuery : ''} bodyRef={registerSection('cloud')}>
          {!SYNC_READY && (
            <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, padding:'14px 16px' }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.62, lineHeight:1.5 }}>Firebase not configured. Fill in FIREBASE_CONFIG in caulis-firebase.jsx.</div>
            </div>
          )}
          {SYNC_READY && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, overflow:'hidden' }}>
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
                    <input type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Password…"
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
                  <div onClick={()=>{ setRenaming(true); setRenameKey(''); setRenameStatus('idle'); }} style={{ flex:1, height:38, borderRadius:rad(12), background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Rename</div>
                  <div onClick={()=>{ setJoining(true); setJoinKey(''); setJoinPassword(''); setJoinStatus('idle'); }} style={{ flex:1, height:38, borderRadius:rad(12), background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Join garden</div>
                </div>
              )}
              {renaming && (
                <div style={{ background:C.panel, borderRadius:rad(14), border:C.hair, padding:'14px 16px', display:'flex', flexDirection:'column', gap:8, animation:'popUp 220ms cubic-bezier(.2,.8,.2,1)' }}>
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
                <div style={{ background:C.panel, borderRadius:rad(14), border:C.hair, padding:'14px 16px', display:'flex', flexDirection:'column', gap:8, animation:'popUp 220ms cubic-bezier(.2,.8,.2,1)' }}>
                  <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.6 }}>
                    {joinStatus==='notFound' ? "No garden found. Create it now?" : "Enter the garden key and its password (if any). Your current plants will be replaced."}
                  </div>
                  <input value={joinKey} onChange={e=>{ setJoinKey(e.target.value); setJoinStatus('idle'); }} placeholder="garden-key" autoComplete="username" name="garden-key"
                    style={{ boxSizing:'border-box', height:42, borderRadius:10, border:C.hair, background:C.input, padding:'0 12px', fontFamily:'ui-monospace,Menlo,monospace', fontSize:12.5, color:C.ink, outline:'none' }}/>
                  <input type="password" autoComplete="current-password" name="garden-password" value={joinPassword} onChange={e=>{ setJoinPassword(e.target.value); setJoinStatus('idle'); }} onKeyDown={e=>{ if(e.key==='Enter') submitJoin(); }} placeholder="Password (leave empty if none)"
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
        <SettingsSection title="Backup" open={isOpen('backup')} onToggle={()=>toggleSec('backup')} id={'sec-'+'backup'} matched={settingsMatches[settingsMatchIdx] === 'backup'} query={settingsMatches.includes('backup') ? settingsQuery : ''} bodyRef={registerSection('backup')}>
          <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, overflow:'hidden', padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.6, lineHeight:1.5 }}>Export your whole garden (plants, photos, queue) to a JSON file, or restore from one.</div>
            <input ref={importRef} type="file" accept="application/json,.json" onChange={onImportFile} style={{ display:'none' }}/>
            <div style={{ display:'flex', gap:8 }}>
              <div onClick={()=>requestGate('export')} style={{ flex:1, height:42, borderRadius:rad(12), background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12M12 15l-4-4M12 15l4-4" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 20h14" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round"/></svg>
                <span style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600 }}>Export</span>
              </div>
              <div onClick={()=>{ setImportErr(false); requestGate('import'); }} style={{ flex:1, height:42, borderRadius:rad(12), background: imported?C.sage:'rgba(45,80,22,0.08)', color: imported?'#fff':C.forest, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', transition:'background 200ms' }}>
                {imported ? <IconCheck s={15}/> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15V3M12 3l-4 4M12 3l4 4" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 20h14" stroke={C.forest} strokeWidth="1.7" strokeLinecap="round"/></svg>}
                <span style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600 }}>{imported?'Imported':'Import'}</span>
              </div>
            </div>
            {pwGate && (
              <div style={{ display:'flex', flexDirection:'column', gap:8, padding:12, borderRadius:rad(12), background:'rgba(45,80,22,0.05)', animation:'popUp 220ms cubic-bezier(.2,.8,.2,1)' }}>
                <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.75 }}>Confirm your garden password to {pwGate}.</div>
                <input type="password" autoComplete="current-password" name="garden-password" value={pwGateInput} onChange={e=>{ setPwGateInput(e.target.value); setPwGateErr(false); }} onKeyDown={e=>{ if(e.key==='Enter') confirmGate(); }} placeholder="Garden password" style={dInput} autoFocus/>
                {pwGateErr && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:'#B4472E' }}>Wrong password</div>}
                <div style={{ display:'flex', gap:8 }}>
                  <div onClick={()=>setPwGate(null)} style={{ flex:1, height:38, borderRadius:10, border:C.hair, color:C.brown, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13 }}>Cancel</div>
                  <div onClick={confirmGate} style={{ flex:1, height:38, borderRadius:10, background:C.forest, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>{pwGateBusy?'Checking…':'Confirm'}</div>
                </div>
              </div>
            )}
            {importErr && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:'#B4472E' }}>Not a valid Caulis export file.</div>}
            {importData && (
              <div style={{ display:'flex', flexDirection:'column', gap:8, padding:'12px', borderRadius:rad(12), background:'rgba(45,80,22,0.05)', animation:'popUp 220ms cubic-bezier(.2,.8,.2,1)' }}>
                <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:0.75, lineHeight:1.5 }}>{importData.plants.length} plants in file. Merge keeps your current plants; Replace overwrites them.</div>
                <div style={{ display:'flex', gap:8 }}>
                  <div onClick={()=>setImportData(null)} style={{ flex:1, height:38, borderRadius:10, border:C.hair, color:C.brown, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13 }}>Cancel</div>
                  <div onClick={()=>doImport('merge')} style={{ flex:1, height:38, borderRadius:10, background:C.forest, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Merge</div>
                  <div onClick={()=>doImport('replace')} style={{ flex:1, height:38, borderRadius:10, background:'#B4472E', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Replace</div>
                </div>
              </div>
            )}
            <div style={{ height:1, background:C.line, margin:'2px 0' }}/>
            <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.6, lineHeight:1.5 }}>Moving to a new phone or browser? Get a one-time code that carries your garden key, password and settings over — read it out or paste it there.</div>
            <div onClick={()=>requestGate('migrate')} style={{ height:42, borderRadius:rad(12), background:'rgba(45,80,22,0.08)', color:C.forest, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' }}>
              <span style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600 }}>Share settings as a code</span>
            </div>
            {migrationCode && (
              <div style={{ display:'flex', flexDirection:'column', gap:8, padding:12, borderRadius:rad(12), background:'rgba(45,80,22,0.05)', animation:'popUp 220ms cubic-bezier(.2,.8,.2,1)' }}>
                <div style={{ fontFamily:'ui-monospace,monospace', fontSize:20, fontWeight:600, letterSpacing:1, color:C.forest, textAlign:'center', padding:'6px 0' }}>{migrationCode}</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:'#B4472E', textAlign:'center' }}>Treat this like a password — anyone with the code gets your garden.</div>
                <div onClick={copyMigrationCode} style={{ height:38, borderRadius:10, background:C.forest, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>{codeCopied?'Copied ✓':'Copy code'}</div>
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <input value={enterCode} onChange={e=>setEnterCode(e.target.value)} placeholder="Have a code? Enter it here" style={{ ...dInput, flex:1 }}/>
              <div onClick={()=>enterCode.trim() && onApplyMigrationCode(enterCode)} style={{ flexShrink:0, padding:'0 16px', borderRadius:rad(12), background:C.forest, color:'#fff', display:'flex', alignItems:'center', cursor:'pointer', fontFamily:FONT_SANS, fontSize:13, fontWeight:600 }}>Apply</div>
            </div>
            <a href="https://api.caulis.czeddaru.dev/docs" target="_blank" rel="noopener" style={{ textDecoration:'none', fontFamily:FONT_SANS, fontSize:12.5, fontWeight:600, color:C.brown, opacity:0.8 }}>View format &amp; API docs ↗</a>
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
          <SettingsSection title="Navigation bar" open={isOpen('nav')} onToggle={()=>toggleSec('nav')} id={'sec-'+'nav'} matched={settingsMatches[settingsMatchIdx] === 'nav'} query={settingsMatches.includes('nav') ? settingsQuery : ''} bodyRef={registerSection('nav')}>
            <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, padding:14, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.7, padding:'0 2px 2px' }}>Tap a slot to change its button, reorder with the arrows{isDesktop ? '' : ', pick which one is raised in the center'}, and add up to {NAV_MAX}. The “More” button opens everything not on the bar — so nothing is ever out of reach.</div>
              {nav.map((s, i) => {
                const meta = NAV_ACTIONS[s.action];
                const isEmpty = s.action === 'empty';
                return (
                  <div key={i} style={{ display:'flex', flexDirection:'column', gap:8, padding:'8px 10px', borderRadius:rad(12), background:C.bg }}>
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
                  <ToggleKnob on={navLabels}/>
                </div>
              </div>
              <div style={{ borderTop:C.hair, paddingTop:12 }}>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Active tab indicator</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>How the current {isDesktop ? 'sidebar row' : 'tab'} is marked</div>
                <OptionList value={navIndicatorStyle || 'tint'} onSelect={onSetNavIndicatorStyle} options={NAV_INDICATOR_ORDER.map(k=>[k, NAV_INDICATOR_STYLES[k].label, NAV_INDICATOR_STYLES[k].desc])}/>
              </div>
              {!isDesktop && (
                <div style={{ borderTop:C.hair, paddingTop:12 }}>
                  <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Bar shape</div>
                  <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>The bottom bar's own silhouette, not the icons inside it</div>
                  <OptionList value={navBarStyle || 'flat'} onSelect={onSetNavBarStyle} options={NAV_BAR_STYLE_ORDER.map(k=>[k, NAV_BAR_STYLES[k].label, NAV_BAR_STYLES[k].desc])}/>
                </div>
              )}
            </div>
            <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, padding:14, display:'flex', flexDirection:'column', gap:12, marginTop:14 }}>
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
                <ToggleKnob on={sidebar.collapsed}/>
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
                <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'8px 10px', borderRadius:rad(11), background:C.bg }}>
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
          // scan for the exact bug pattern that caused the July incident
          // (consecutive duplicate watering-log dates from a phantom
          // pointer-event bug), plus other obvious anomalies — read-only
          // until "Clean up" is tapped per plant.
          const issues = plants.map(p => {
            const h = Array.isArray(p.history) ? p.history : [];
            let dupRuns = 0;
            for (let i = 1; i < h.length; i++) if (h[i] === h[i-1]) dupRuns++;
            const oversized = h.length >= 55;
            if (!dupRuns && !oversized) return null;
            return { plant: p, dupRuns, size: h.length, oversized };
          }).filter(Boolean);
          const historyRow = (p) => {
            const h = Array.isArray(p.history) ? p.history : [];
            const open = historyPlantId === p.id;
            return (
              // flexShrink:0 is load-bearing here, not decorative — inside the
              // scroll wrapper below (a bounded-height flex column), a flex
              // item's default flex-shrink:1 means the browser will squash
              // every row down toward zero height to make them ALL fit the
              // container instead of overflowing it, which is what actually
              // renders as "blank" (every row a few px tall, no visible text)
              // rather than producing a scrollbar. This is almost certainly
              // the exact bug a prior pass hit and (never having isolated
              // this cause) worked around by deleting the scroll wrapper
              // outright.
              <div key={p.id} style={{ borderRadius:rad(11), background:C.bg, overflow:'hidden', flexShrink:0 }}>
                <div onClick={()=>setHistoryPlantId(open ? null : p.id)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'8px 10px', cursor:'pointer' }}>
                  <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:14.5, color:C.forest, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                  <span style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.6, flexShrink:0 }}>{h.length} entries {open ? '▾' : '▸'}</span>
                </div>
                {open && (
                  <div style={{ padding:'0 10px 10px', display:'flex', flexDirection:'column', gap:4, maxHeight:220, overflowY:'auto' }}>
                    {h.length === 0 && <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.6, padding:'6px 0' }}>No watering log yet.</div>}
                    {h.map((stamp, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 8px', borderRadius:8, background:C.panel }}>
                        <span style={{ fontFamily:'ui-monospace,Menlo,monospace', fontSize:12.5, color:C.ink }}>{stamp}</span>
                        <div onClick={()=>onDevDeleteHistoryEntry(p.id, i)} style={{ cursor:'pointer', color:STATUS.needs.dot, fontSize:16, lineHeight:1, padding:'2px 6px' }}>×</div>
                      </div>
                    ))}
                    {h.length > 0 && (
                      <div onClick={()=>onDevDedupeHistory(p.id)} style={{ ...dBtn(false), fontSize:12.5, marginTop:4 }}>Collapse consecutive duplicates</div>
                    )}
                  </div>
                )}
              </div>
            );
          };
          return (
          <SettingsSection title="Developer" open={isOpen('dev')} onToggle={()=>toggleSec('dev')} id={'sec-'+'dev'} matched={settingsMatches[settingsMatchIdx] === 'dev'} query={settingsMatches.includes('dev') ? settingsQuery : ''} bodyRef={registerSection('dev')}>
            <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, padding:16, display:'flex', flexDirection:'column', gap:18 }}>
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
                    <div onClick={resyncFromHistory} style={dBtn(false)}>Resync days from watering log</div>
                    {resyncMsg && <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.75 }}>{resyncMsg}</div>}
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

                  <SubCollapse title="Watering log & fixes" open={isDevOpen('log')} onToggle={()=>toggleDevSec('log')}>
                  <div style={{ padding:16, display:'flex', flexDirection:'column', gap:18 }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div style={grpLabel}>Scan for issues</div>
                    {issues.length === 0 ? (
                      <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.6 }}>Nothing looks wrong — no duplicate log entries or oversized histories.</div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {issues.map(({ plant, dupRuns, size, oversized }) => (
                          <div key={plant.id} style={{ padding:'10px 12px', borderRadius:rad(12), background:'rgba(201,138,43,0.1)', border:'1px solid rgba(201,138,43,0.25)' }}>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                              <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:14.5, color:C.forest }}>{plant.name}</span>
                              {dupRuns > 0 && <div onClick={()=>onDevDedupeHistory(plant.id)} style={{ ...dBtn(true), padding:'5px 12px', fontSize:12.5 }}>Clean up</div>}
                            </div>
                            <div style={{ fontFamily:FONT_SANS, fontSize:12, color:'#C98A2B', marginTop:3 }}>
                              {dupRuns > 0 && `${dupRuns} duplicate consecutive log ${dupRuns===1?'entry':'entries'}`}
                              {dupRuns > 0 && oversized && ' · '}
                              {oversized && `${size} entries logged (near the cap)`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ height:1, background:C.line }}/>

                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={grpLabel}>Watering log · per plant ({plants.length})</div>
                    {plants.length === 0 ? (
                      <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.6 }}>This device isn't logged into a garden with any plants yet — these tools act on whatever garden you're currently in, not on a garden loaded elsewhere in Admin.</div>
                    ) : (
                      // bounded-height scroll wrapper, added back deliberately as a
                      // plain un-animated div — a prior pass had removed a scroll
                      // container from around this exact list while chasing an
                      // unrelated "renders blank" bug, worked around by dropping the
                      // wrapper instead of root-causing it. This one is a normal
                      // block-level child of the accordion's already-open body (the
                      // accordion's own collapse animation lives on SettingsSection's
                      // grid-template-rows wrapper, several levels up) — it never
                      // itself sits inside anything mid-transform, so it doesn't
                      // fight that animation the way the earlier attempt apparently did.
                      <div style={{ maxHeight:'60vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:6, paddingRight:2 }}>
                        {plants.map(p => historyRow(p))}
                      </div>
                    )}
                  </div>

                  <div style={{ height:1, background:C.line }}/>

                  {(() => {
                    const lastDateOf = (p) => { const h = Array.isArray(p.history) ? p.history : []; return h.length ? h[h.length - 1] : null; };
                    const dateCounts = {};
                    plants.forEach(p => { const d = lastDateOf(p); if (d) dateCounts[d] = (dateCounts[d] || 0) + 1; });
                    const dateChips = Object.entries(dateCounts).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1)).slice(0, 5);
                    const selectByDate = (d) => { setBulkUndoResult(null); setBulkUndoSel(new Set(plants.filter(p => lastDateOf(p) === d).map(p => p.id))); };
                    return (
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <div style={grpLabel}>Undo most recent watering · batch</div>
                      <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.7, lineHeight:1.5 }}>
                        For fixing a bad swipe/sync that logged the same wrong date across several plants — pick the affected plants, pop each one's last watering-log entry, and recompute its watered date from what's left.
                      </div>
                      {dateChips.length > 0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {dateChips.map(([d, n]) => (
                            <div key={d} onClick={()=>selectByDate(d)} style={{ ...dBtn(false), padding:'6px 11px', fontSize:12.5 }}>{d} · {n} plant{n===1?'':'s'}</div>
                          ))}
                        </div>
                      )}
                      <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:240, overflowY:'auto' }}>
                        {plants.map(p => {
                          const d = lastDateOf(p);
                          const checked = bulkUndoSel.has(p.id);
                          return (
                            <div key={p.id} onClick={()=>toggleBulkUndoSel(p.id)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'8px 10px', borderRadius:rad(11), background:C.bg, cursor:'pointer' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:9, overflow:'hidden' }}>
                                <div style={{ width:20, height:20, borderRadius:999, background: checked?C.forest:C.panel, border: checked?'none':'1.5px solid rgba(45,80,22,0.28)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                  {checked && <IconCheck s={12} c="#fff"/>}
                                </div>
                                <span style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:14.5, color:C.forest, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                              </div>
                              <span style={{ fontFamily:'ui-monospace,Menlo,monospace', fontSize:11.5, color:C.brown, opacity:0.65, flexShrink:0 }}>{d || 'no log'}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div onClick={bulkUndoSel.size ? runBulkUndo : undefined} style={{ ...dBtn(true), opacity: bulkUndoSel.size ? 1 : 0.4, cursor: bulkUndoSel.size ? 'pointer' : 'default' }}>Undo last watering for selected ({bulkUndoSel.size})</div>
                      {bulkUndoResult && (
                        <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.8, lineHeight:1.5 }}>
                          {bulkUndoResult.updated} plant{bulkUndoResult.updated===1?'':'s'} updated
                          {bulkUndoResult.skipped.length > 0 && ` · ${bulkUndoResult.skipped.length} skipped — no prior watering on record for ${bulkUndoResult.skipped.join(', ')}`}
                        </div>
                      )}
                    </div>
                    );
                  })()}
                  </div>
                  </SubCollapse>

                  <SubCollapse title="Sync tools" open={isDevOpen('sync')} onToggle={()=>toggleDevSec('sync')}>
                  <div style={{ padding:16, display:'flex', flexDirection:'column', gap:18 }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div style={grpLabel}>Sync / rev</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:13, color:C.ink }}>
                      Server rev: <span style={{ fontWeight:600 }}>{sessionInfo ? sessionInfo.rev : '—'}</span>
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <div onClick={()=>{ if (confirm('Discard this device\'s unsynced local changes and reload whatever the server currently has?')) onDevForcePull(); }} style={{ ...dBtn(false), flex:1 }}>{syncBusy==='pull' ? 'Pulling…' : 'Force refresh from server'}</div>
                      <div onClick={()=>{ if (confirm('Overwrite the server with this device\'s local data? Bypasses conflict detection — any change another device made since this device last synced will be lost.')) onDevForcePush(); }} style={{ ...dBtn(false), flex:1, color:STATUS.needs.dot, borderColor:'rgba(180,71,46,0.3)' }}>{syncBusy==='push' ? 'Pushing…' : 'Force push local as truth'}</div>
                    </div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.65, lineHeight:1.5 }}>
                      Refresh replaces what's on this device with the server's copy. Push overwrites the server with what's on this device right now — either can discard changes made elsewhere. Use only when a garden is stuck out of sync.
                    </div>
                    {syncMsg && <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.8 }}>{syncMsg}</div>}
                  </div>

                  <div style={{ height:1, background:C.line }}/>

                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div style={grpLabel}>Push notifications</div>
                    <div style={{ display:'flex', gap:10 }}>
                      <div onClick={()=>runTestPush('watering')} style={{ ...dBtn(false), flex:1 }}>{testPushBusy==='watering' ? 'Sending…' : 'Test watering reminder'}</div>
                      <div onClick={()=>runTestPush('digest')} style={{ ...dBtn(false), flex:1 }}>{testPushBusy==='digest' ? 'Sending…' : 'Test weekly digest'}</div>
                    </div>
                    {testPushMsg && <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.8 }}>{testPushMsg}</div>}
                  </div>
                  </div>
                  </SubCollapse>

                  <SubCollapse title="Cross-garden node management" open={isDevOpen('admin')} onToggle={()=>toggleDevSec('admin')}>
                  <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
                    {!adminUnlocked ? (
                      <>
                        <input type="password" value={adminSecret} onChange={e=>{ setAdminSecret(e.target.value); setAdminErr(false); }} onKeyDown={e=>{ if(e.key==='Enter') unlockAdmin(); }} placeholder="Admin secret" style={dInput}/>
                        <div onClick={()=>unlockAdmin()} style={dBtn(true)}>{adminBusy ? 'Unlocking…' : 'Unlock admin'}</div>
                        {adminErr && <span style={{ fontFamily:FONT_SANS, fontSize:12.5, color:STATUS.needs.dot }}>Wrong secret or request failed</span>}
                      </>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:10, animation:'popUp 240ms cubic-bezier(.2,.8,.2,1)' }}>
                        <AdminSub id="overview" title="Overview">
                        {adminStats && (() => {
                          const claimedPct = adminStats.totalGardens > 0 ? 1 - (adminStats.unclaimedCount / adminStats.totalGardens) : 0;
                          const photoPct = adminStats.totalGardens > 0 ? Math.min(1, adminStats.totalPhotoSets / adminStats.totalGardens) : 0;
                          // "density" has no natural 100% — 20/garden is just a display
                          // ceiling to keep the ring readable, not a target, so the sub-label
                          // says so plainly rather than implying a real rate like the other two
                          const densityCap = 20;
                          const densityPct = Math.min(1, adminStats.avgPlantsPerGarden / densityCap);
                          const cutoff = Date.now() - 86400000;
                          // only the top-10-by-size gardens are ever fetched from the backend,
                          // so this can only ever answer "how many of the 10 biggest gardens
                          // touched their data in the last day" — not true sitewide activity
                          const activeToday = (adminStats.mostActive || []).filter(g => new Date(g.updated_at).getTime() >= cutoff).length;
                          return (
                          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6 }}>
                              <Gauge label="Claimed" sub={`${adminStats.totalGardens - adminStats.unclaimedCount}/${adminStats.totalGardens}`} pct={claimedPct}/>
                              <Gauge label="Photo coverage" sub={`${adminStats.totalPhotoSets} sets`} pct={photoPct} tone={photoPct < 0.3 ? 'warn' : 'forest'}/>
                              <Gauge label="Density" sub={`${adminStats.avgPlantsPerGarden}/garden · cap ${densityCap}`} pct={densityPct}/>
                            </div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8 }}>
                              {[
                                ['Gardens', adminStats.totalGardens],
                                ['Plants', adminStats.totalPlants],
                                ['Active today · top 10', activeToday],
                                ['Avg / garden', adminStats.avgPlantsPerGarden],
                              ].map(([label, val]) => (
                                <div key={label} style={{ padding:'10px 12px', borderRadius:rad(12), background:C.bg }}>
                                  <div style={{ fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.6, textTransform:'uppercase', letterSpacing:0.4 }}>{label}</div>
                                  <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:22, color:C.forest }}>{val}</div>
                                </div>
                              ))}
                            </div>
                            {adminStats.gardensPerDay && adminStats.gardensPerDay.length > 0 && (
                              <div style={{ padding:'10px 12px', borderRadius:rad(12), background:C.bg }}>
                                <div style={{ fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.6, textTransform:'uppercase', letterSpacing:0.4, marginBottom:6 }}>Gardens created · last 14 days</div>
                                <Sparkline data={adminStats.gardensPerDay}/>
                              </div>
                            )}
                            <div style={{ display:'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap:12 }}>
                              {adminStats.topSpecies.length > 0 && <div>
                                <div style={grpLabel}>Most common species</div>
                                <BarList rows={adminStats.topSpecies} labelKey="name" valueKey="count"/>
                              </div>}
                              {adminStats.mostActive.length > 0 && <div>
                                <div style={grpLabel}>Most recently active</div>
                                <RecencyList rows={adminStats.mostActive} onRowClick={g=>loadAdminGarden(g.key)}/>
                              </div>}
                            </div>
                          </div>
                          );
                        })()}
                        </AdminSub>

                        <AdminSub id="gardens" title="Gardens">
                          <input value={adminSearch} onChange={e=>setAdminSearch(e.target.value)} placeholder="Search by key" style={dInput}/>
                          <div style={{ display:'flex', gap:8 }}>
                            <div onClick={()=>bulkDelete('unclaimed')} style={{ ...dBtn(false), flex:1, fontSize:12.5 }}>Delete all unclaimed</div>
                            <div onClick={()=>bulkDelete('empty')} style={{ ...dBtn(false), flex:1, fontSize:12.5 }}>Delete all empty</div>
                          </div>
                          {filteredAdminGardens && (
                            <div style={{ display:'flex', flexDirection:'column', gap:1, marginTop:4, borderRadius:rad(14), overflow:'hidden', border:C.hair, maxHeight:280, overflowY:'auto' }}>
                              {filteredAdminGardens.map(g => (
                                <div key={g.key} onClick={()=>loadAdminGarden(g.key)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:C.panel, borderBottom:C.hair, cursor:'pointer' }}>
                                  <span style={{ fontFamily:FONT_SANS, fontSize:13, color:C.ink }}>{g.key}{g.unclaimed ? ' · unclaimed' : ''}</span>
                                  <span style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.6 }}>{g.plant_count} plants</span>
                                </div>
                              ))}
                              {filteredAdminGardens.length === 0 && <div style={{ padding:12, fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.6 }}>No gardens match</div>}
                            </div>
                          )}
                          {adminStatus==='empty' && <span style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.7 }}>No plants in that garden</span>}
                          {adminLoaded && (
                            <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:4, padding:12, borderRadius:rad(14), background:C.bg, animation:'popUp 220ms cubic-bezier(.2,.8,.2,1)' }}>
                              <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.7 }}>{adminLoaded.key} · {adminLoaded.plants.length} plants loaded · edits stay local until pushed</div>
                              {adminLoaded.plants.length > 0 && <>
                                <div onClick={adminWaterAll} style={dBtn(true)}><IconDrop s={15} c="#fff"/> Water all to today</div>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                                  <span style={{ fontFamily:FONT_SANS, fontSize:13.5, color:C.ink }}>Shift every plant</span>
                                  {stepper(adminOffsetN, setAdminOffsetN)}
                                </div>
                                <div style={{ display:'flex', gap:10 }}>
                                  <div onClick={()=>adminShiftAll(-adminOffsetN)} style={{ ...dBtn(false), flex:1 }}>− {adminOffsetN}d</div>
                                  <div onClick={()=>adminShiftAll(adminOffsetN)} style={{ ...dBtn(false), flex:1 }}>+ {adminOffsetN}d</div>
                                </div>
                                {plantEditor(adminLoaded.plants, adminSetDays)}
                                <div onClick={pushAdminGarden} style={{ ...dBtn(true), marginTop:2 }}>{adminStatus==='pushed' ? 'Pushed ✓' : adminStatus==='pushing' ? 'Pushing…' : 'Push to garden'}</div>
                              </>}
                              <div onClick={deleteAdminGarden} style={{ ...dBtn(false), color:STATUS.needs.dot, borderColor:'rgba(180,71,46,0.3)' }}>Delete this garden</div>
                            </div>
                          )}
                        </AdminSub>

                        <AdminSub id="badges" title="Badges">
                          {!adminLoaded && <span style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.65 }}>Load a garden above (Gardens section) to grant or revoke its badges.</span>}
                          {adminLoaded && (
                            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                              <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.7 }}>{adminLoaded.key} · {(Array.isArray(adminLoaded.data.badges) ? adminLoaded.data.badges.filter(b=>!b.revoked).length : 0)} of {BADGE_DEFS.length} earned · edits stay local until pushed</div>
                              <div style={{ display:'flex', flexDirection:'column', gap:1, borderRadius:rad(14), overflow:'hidden', border:C.hair }}>
                                {BADGE_DEFS.map(def => {
                                  const earned = Array.isArray(adminLoaded.data.badges) && adminLoaded.data.badges.some(b => b.id === def.id && !b.revoked);
                                  return (
                                    <div key={def.id} onClick={()=>toggleAdminBadge(def.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:C.panel, borderBottom:C.hair, cursor:'pointer' }}>
                                      <def.Icon s={17} c={earned?C.forest:C.brown}/>
                                      <span style={{ flex:1, fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, opacity:earned?1:0.55 }}>{def.name}</span>
                                      <span style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color: earned?C.forest:C.brown, opacity:earned?1:0.5 }}>{earned?'Earned · tap to revoke':'Tap to grant'}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div onClick={pushAdminGarden} style={dBtn(true)}>{adminStatus==='pushed' ? 'Pushed ✓' : adminStatus==='pushing' ? 'Pushing…' : 'Push to garden'}</div>
                            </div>
                          )}
                        </AdminSub>

                        <AdminSub id="backups" title="Backups">
                          <BackupGauge settings={backupSettings} files={backupFiles}/>
                          {backupSettings && (
                            <>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                                <span style={{ fontFamily:FONT_SANS, fontSize:13.5, color:C.ink }}>Backup every</span>
                                {numStepper(backupSettings.backupIntervalHours, (v)=>saveBackupSettings({ ...backupSettings, backupIntervalHours: v }), 'h')}
                              </div>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                                <span style={{ fontFamily:FONT_SANS, fontSize:13.5, color:C.ink }}>Keep last N backups</span>
                                {numStepper(backupSettings.backupKeepCount, (v)=>saveBackupSettings({ ...backupSettings, backupKeepCount: v }), '')}
                              </div>
                              <div onClick={runBackupNow} style={dBtn(true)}>{backupBusy ? 'Running…' : 'Run backup now'}</div>
                              {backupFiles && (
                                <div style={{ display:'flex', flexDirection:'column', gap:1, borderRadius:rad(14), overflow:'hidden', border:C.hair, maxHeight:220, overflowY:'auto' }}>
                                  {backupFiles.map(f => (
                                    <div key={f.name} onClick={()=>onAdminBackupUrl(adminSecret, f.name)} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background:C.panel, borderBottom:C.hair, cursor:'pointer' }}>
                                      <span style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.forest, fontWeight:600 }}>{f.name}</span>
                                      <span style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.6 }}>{fmtBytes(f.size)}</span>
                                    </div>
                                  ))}
                                  {backupFiles.length === 0 && <div style={{ padding:12, fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.6 }}>No backups yet</div>}
                                </div>
                              )}
                            </>
                          )}
                        </AdminSub>

                        <AdminSub id="system" title="System">
                          {adminSystemBusy && !adminSystemData && <div style={{ fontFamily:FONT_SANS, fontSize:12.5, color:C.brown, opacity:0.6 }}>Loading…</div>}
                          {adminSystemData && (() => {
                            const s = adminSystemData;
                            const heapPct = s.memory.heapTotal > 0 ? s.memory.heapUsed / s.memory.heapTotal : 0;
                            // load average has no fixed 100% either — normalize against core count so
                            // the ring reads "how loaded relative to what this box actually has"
                            const loadPct = s.cpuCount > 0 ? Math.min(1, s.loadavg[0] / s.cpuCount) : 0;
                            return (
                            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:6 }}>
                                <Gauge label="Heap used" sub={`${fmtBytes(s.memory.heapUsed)} / ${fmtBytes(s.memory.heapTotal)}`} pct={heapPct} tone={heapPct > 0.85 ? 'bad' : heapPct > 0.6 ? 'warn' : 'forest'}/>
                                <Gauge label="Load (1m)" sub={`${s.loadavg[0].toFixed(2)} / ${s.cpuCount} cores`} pct={loadPct} tone={loadPct > 0.85 ? 'bad' : loadPct > 0.6 ? 'warn' : 'forest'}/>
                              </div>
                              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8 }}>
                                {[
                                  ['Uptime', fmtDuration(s.uptimeSec)],
                                  ['Node', s.nodeVersion],
                                  ['RSS memory', fmtBytes(s.memory.rss)],
                                  ['DB size', s.dbSizeBytes != null ? fmtBytes(s.dbSizeBytes) : '—'],
                                  ['Backup dir', fmtBytes(s.backupDirBytes)],
                                  ['Requests', `${s.requestCount} · ${s.requestsPerMin}/min`],
                                ].map(([label, val]) => (
                                  <div key={label} style={{ padding:'10px 12px', borderRadius:rad(12), background:C.bg }}>
                                    <div style={{ fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.6, textTransform:'uppercase', letterSpacing:0.4 }}>{label}</div>
                                    <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:18, color:C.forest }}>{val}</div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ padding:'10px 12px', borderRadius:rad(12), background:C.bg }}>
                                <div style={{ fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.6, textTransform:'uppercase', letterSpacing:0.4, marginBottom:6 }}>Load average · 1m / 5m / 15m</div>
                                <div style={{ display:'flex', gap:16 }}>
                                  {s.loadavg.map((l, i) => (
                                    <div key={i} style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600, color:C.ink }}>{l.toFixed(2)}</div>
                                  ))}
                                </div>
                              </div>
                              <div style={{ padding:'10px 12px', borderRadius:rad(12), background:C.bg }}>
                                <div style={{ fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.6, textTransform:'uppercase', letterSpacing:0.4, marginBottom:6 }}>DB pool · total / idle / waiting</div>
                                <div style={{ display:'flex', gap:16 }}>
                                  <div style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600, color:C.ink }}>{s.pool.total}</div>
                                  <div style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600, color:C.ink }}>{s.pool.idle}</div>
                                  <div style={{ fontFamily:FONT_SANS, fontSize:13.5, fontWeight:600, color:C.ink }}>{s.pool.waiting}</div>
                                </div>
                              </div>
                              <div onClick={loadAdminSystem} style={{ ...dBtn(false), fontSize:12.5 }}>{adminSystemBusy ? 'Refreshing…' : 'Refresh'}</div>
                            </div>
                            );
                          })()}
                        </AdminSub>
                      </div>
                    )}
                  </div>
                  </SubCollapse>

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
        <SettingsSection title="About" open={isOpen('about')} onToggle={()=>toggleSec('about')} id={'sec-'+'about'} matched={settingsMatches[settingsMatchIdx] === 'about'} query={settingsMatches.includes('about') ? settingsQuery : ''} bodyRef={registerSection('about')}>
          <div style={{ background:C.panel, borderRadius:rad(18), border:C.hair, overflow:'hidden' }}>
            <div onClick={tapVersion} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:C.hair, cursor:'default', userSelect:'none' }}>
              <span style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Version</span>
              <span style={{ fontFamily:FONT_SANS, fontSize:13.5, color:C.brown, opacity:0.7 }}>{`v${APP_VERSION}`}{!devRevealed && verTaps >= 3 && verTaps < 7 ? ` · ${7-verTaps} more` : ''}</span>
            </div>
            <div onClick={updating ? undefined : async ()=>{ setUpdating(true); await onUpdateApp(); }} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', cursor: updating?'default':'pointer' }}>
              <div>
                <div style={{ fontFamily:FONT_SANS, fontSize:14, color:C.ink }}>Check for updates</div>
                <div style={{ fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.6, marginTop:1 }}>Clear cache & reload latest version</div>
              </div>
              <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:7, padding:'8px 14px', borderRadius:rad(11), background:'rgba(45,80,22,0.08)', color:C.forest }}>
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
      {isDesktop && (
        <div style={{ width:260, flexShrink:0, position:'sticky', top:32, display:'flex', flexDirection:'column', gap:14 }}>
          <DesktopSettingsAside
            plants={plants} adminUnlocked={adminUnlocked} adminStats={adminStats}
            backupSettings={backupSettings} backupFiles={backupFiles} BackupGauge={BackupGauge} Gauge={Gauge}
            adminSecret={adminSecret} setAdminSecret={setAdminSecret} unlockAdmin={unlockAdmin} adminBusy={adminBusy} adminErr={adminErr}
            adminSystemData={adminSystemData} adminSystemBusy={adminSystemBusy} loadAdminSystem={loadAdminSystem}
            onRunBackup={runBackupNow} backupBusy={backupBusy}
            onRefreshQuick={refreshAdminQuick} adminQuickBusy={adminQuickBusy}
            fmtBytes={fmtBytes} fmtDuration={fmtDuration}/>
        </div>
      )}
      </div>
    </div>
  );
}

// desktop-only right rail — the accordion tops out at 680px, leaving a bare
// column on wide screens. Fills it with an always-useful glance card, a
// compact admin summary/unlock card, and (once unlocked) a couple of small
// focused widget cards — system health + quick actions — so real admin data
// and controls are reachable right here without a trip into Developer/Admin.
function DesktopSettingsAside({
  plants, adminUnlocked, adminStats, backupSettings, backupFiles, BackupGauge, Gauge,
  adminSecret, setAdminSecret, unlockAdmin, adminBusy, adminErr,
  adminSystemData, adminSystemBusy, loadAdminSystem,
  onRunBackup, backupBusy, onRefreshQuick, adminQuickBusy,
  fmtBytes, fmtDuration,
}) {
  const needs = plants.filter(p => statusOf(p.days, p.every, p.snoozedUntil) !== 'ok').length;
  const [unlockOpen, setUnlockOpen] = useState(false);
  useEffect(() => {
    if (adminUnlocked && !adminSystemData && !adminSystemBusy) loadAdminSystem();
  }, [adminUnlocked]);

  const cardStyle = { background:C.panel, borderRadius:rad(18), border:C.hair, padding:18, display:'flex', flexDirection:'column', gap:12 };
  const eyebrow = { fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.6, textTransform:'uppercase' };
  const pill = (busy) => ({
    flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
    padding:'8px 10px', borderRadius:rad(999), cursor: busy?'default':'pointer',
    fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, color:C.forest,
    background:'rgba(122,158,78,0.14)', opacity: busy?0.6:1, userSelect:'none',
    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
  });

  return (
    <>
      <div style={cardStyle}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Leaf size={22} color={C.forest}/>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:18, color:C.forest }}>Caulis</div>
        </div>
        <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.65 }}>v{APP_VERSION} · {plants.length} plant{plants.length===1?'':'s'} · {needs} thirsty</div>
        <div style={{ height:1, background:C.line, margin:'2px 0' }}/>
        <a href="https://github.com/cybutr/Caulis" target="_blank" rel="noopener" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', color:C.ink, fontFamily:FONT_SANS, fontSize:13, fontWeight:500 }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill={C.brown}><path d="M8 0a8 8 0 00-2.53 15.59c.4.07.55-.17.55-.38v-1.35c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.16-.89-1.16-.72-.5.06-.49.06-.49.8.06 1.22.82 1.22.82.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.01.08-2.1 0 0 .67-.22 2.2.82a7.6 7.6 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.09.16 1.9.08 2.1.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 008 0Z"/></svg>
          GitHub repo
        </a>
        <a href="https://api.caulis.czeddaru.dev/docs" target="_blank" rel="noopener" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', color:C.ink, fontFamily:FONT_SANS, fontSize:13, fontWeight:500 }}>
          <IconGear s={15} c={C.brown}/> Docs &amp; changelog
        </a>
      </div>

      {!adminUnlocked ? (
        <div style={cardStyle}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
            <div style={eyebrow}>Admin at a glance</div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}><rect x="5" y="11" width="14" height="9" rx="2" stroke={C.brown} strokeWidth="1.8" opacity="0.6"/><path d="M8 11V8a4 4 0 018 0v3" stroke={C.brown} strokeWidth="1.8" opacity="0.6"/></svg>
          </div>
          {!unlockOpen ? (
            <div onClick={()=>setUnlockOpen(true)} style={{ ...pill(false), padding:'9px 10px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke={C.forest} strokeWidth="2"/><path d="M8 11V8a4 4 0 018 0v3" stroke={C.forest} strokeWidth="2"/></svg>
              Unlock admin
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <input type="password" autoFocus value={adminSecret} onChange={e=>setAdminSecret(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') unlockAdmin(); }} placeholder="Admin secret"
                style={{ width:'100%', padding:'8px 10px', borderRadius:rad(10), border:`1px solid ${C.line}`, background:C.bg, fontFamily:FONT_SANS, fontSize:12.5, color:C.ink, outline:'none', boxSizing:'border-box' }}/>
              <div onClick={()=>unlockAdmin()} style={{ ...pill(adminBusy), background:C.forest, color:'#fff' }}>{adminBusy ? 'Unlocking…' : 'Unlock'}</div>
              {adminErr && <span style={{ fontFamily:FONT_SANS, fontSize:11, color:STATUS.needs.dot }}>Wrong secret</span>}
            </div>
          )}
        </div>
      ) : (
        <>
          {adminStats && (
            <div style={{ ...cardStyle, animation:'popUp 240ms cubic-bezier(.2,.8,.2,1)' }}>
              <div style={eyebrow}>Admin at a glance</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[['Gardens', adminStats.totalGardens], ['Plants', adminStats.totalPlants]].map(([label, val]) => (
                  <div key={label} style={{ padding:'9px 10px', borderRadius:rad(11), background:C.bg }}>
                    <div style={{ fontFamily:FONT_SANS, fontSize:10, color:C.brown, opacity:0.6, textTransform:'uppercase', letterSpacing:0.4 }}>{label}</div>
                    <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontSize:19, color:C.forest }}>{val}</div>
                  </div>
                ))}
              </div>
              {backupSettings && BackupGauge && <BackupGauge settings={backupSettings} files={backupFiles}/>}
            </div>
          )}

          <div style={{ ...cardStyle, animation:'popUp 240ms cubic-bezier(.2,.8,.2,1)' }}>
            <div style={eyebrow}>System</div>
            {adminSystemBusy && !adminSystemData && <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.6 }}>Loading…</div>}
            {adminSystemData && Gauge && (() => {
              const s = adminSystemData;
              const heapPct = s.memory.heapTotal > 0 ? s.memory.heapUsed / s.memory.heapTotal : 0;
              const loadPct = s.cpuCount > 0 ? Math.min(1, s.loadavg[0] / s.cpuCount) : 0;
              return (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    <Gauge label="Heap" sub={fmtBytes(s.memory.heapUsed)} pct={heapPct} tone={heapPct > 0.85 ? 'bad' : heapPct > 0.6 ? 'warn' : 'forest'}/>
                    <Gauge label="Load" sub={`${s.loadavg[0].toFixed(2)}/${s.cpuCount}c`} pct={loadPct} tone={loadPct > 0.85 ? 'bad' : loadPct > 0.6 ? 'warn' : 'forest'}/>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontFamily:FONT_SANS, fontSize:11.5, color:C.brown, opacity:0.75, padding:'0 2px' }}>
                    <span>Up {fmtDuration(s.uptimeSec)}</span>
                    <span>{s.requestsPerMin}/min</span>
                  </div>
                </>
              );
            })()}
          </div>

          <div style={{ ...cardStyle, gap:8, animation:'popUp 240ms cubic-bezier(.2,.8,.2,1)' }}>
            <div style={eyebrow}>Quick actions</div>
            <div style={{ display:'flex', gap:8 }}>
              <div onClick={backupBusy ? undefined : onRunBackup} style={pill(backupBusy)}>{backupBusy ? 'Running…' : 'Backup now'}</div>
              <div onClick={adminQuickBusy ? undefined : onRefreshQuick} style={pill(adminQuickBusy)}>{adminQuickBusy ? 'Refreshing…' : 'Refresh'}</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  BOTTOM NAVIGATION
// ════════════════════════════════════════════════════════════
function BottomNav({ tab, setTab, onAction, navConfig, showLabels = true, indicatorStyle = 'tint', barStyle = 'flat' }) {
  const slots = normalizeNav(navConfig).filter(s => s.action !== 'empty');
  const fire = (action) => { const a = NAV_ACTIONS[action]; if (!a) return; if (a.tab) setTab(action); else onAction && onAction(action); };
  const floating = barStyle === 'floating';
  // translucent glass over C.bg itself (not a hardcoded light/dark pair) so
  // a custom background color tints the bar instead of leaving it pinned
  // to the two built-in theme hexes
  const { r: navR, g: navG, b: navB } = hexToRgb(C.bg);
  const navBg = `rgba(${navR},${navG},${navB},${relLuminance(C.bg) < 0.5 ? 0.9 : 0.86})`;
  return (
    <div style={{
      flexShrink:0, position:'relative', zIndex:30,
      background: navBg, backdropFilter:'blur(18px) saturate(160%)', WebkitBackdropFilter:'blur(18px) saturate(160%)',
      borderTop: floating ? 'none' : '0.5px solid rgba(45,80,22,0.1)',
      borderRadius: floating ? rad(22) : 0,
      margin: floating ? '0 14px calc(10px + env(safe-area-inset-bottom))' : 0,
      boxShadow: floating ? '0 10px 28px rgba(45,80,22,0.16), 0 1px 0 rgba(45,80,22,0.06)' : 'none',
      border: floating ? '0.5px solid rgba(45,80,22,0.1)' : undefined,
      padding: floating ? '9px 14px 12px' : '9px 14px calc(26px + env(safe-area-inset-bottom))',
      display:'flex', alignItems:'flex-end', justifyContent:'space-between',
    }}>
      {slots.map((s, i) => {
        const meta = NAV_ACTIONS[s.action];
        const active = meta.tab && tab === s.action;
        const accent = navColor(s);
        const label = navLabel(s);
        if (s.center) {
          return (
            <div key={i} onClick={()=>fire(s.action)} role="button" aria-label={label} aria-current={active ? 'page' : undefined} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer' }}>
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
          <div key={i} onClick={()=>fire(s.action)} role="button" aria-label={label} aria-current={active ? 'page' : undefined} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer', paddingBottom:2 }}>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              width: indicatorStyle === 'pill' ? 44 : 'auto', height: indicatorStyle === 'pill' ? 26 : 'auto',
              borderRadius:999, background: indicatorStyle === 'pill' && active ? (s.color ? `${accent}26` : 'rgba(122,158,78,0.16)') : 'transparent',
              transition:'background 160ms ease',
            }}>
              <meta.Icon s={23} c={col} a={active?1:0.55}/>
            </div>
            {indicatorStyle === 'underline' && <div style={{ width: active?16:0, height:2.5, borderRadius:999, background:accent, transition:'width 160ms ease', marginTop:-2 }}/>}
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
function MoveSheet({ plant, ids, locations, onClose, onPick, onAddLocation, isDesktop, locationTags }) {
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
      <div onClick={e=>e.stopPropagation()} style={{ background:C.bg, borderTopLeftRadius:rad(26), borderTopRightRadius:rad(26), padding:'10px 18px 30px', animation:'slideUp 260ms cubic-bezier(.2,.8,.2,1)', maxHeight:'80%', overflowY:'auto' }}>
        <div style={{ width:38, height:4, borderRadius:999, background:'rgba(45,80,22,0.16)', margin:'0 auto 14px' }}/>
        <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:21, color:C.forest, textAlign:'center' }}>{bulk ? `Move ${ids.length} plants` : `Move ${plant.name}`}</div>
        <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.65, textAlign:'center', marginTop:3, marginBottom:16 }}>{bulk ? 'Choose a room' : `Currently in ${plant.location}`}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {locations.map((l, i) => {
            const on = !bulk && l === plant.location;
            const tag = locationTags && locationTags[l];
            const col = locationTagColor(tag);
            const TagIcon = locationTagIcon(tag);
            return (
              <div key={l} onClick={()=>{ targets.forEach(id => onPick(id, l)); onClose(); }} style={{
                display:'flex', alignItems:'center', gap:11, padding:'13px 14px', cursor:'pointer',
                background:C.panel, borderRadius:rad(14), border: on ? `1px solid ${col || 'rgba(110,154,62,0.5)'}` : '0.5px solid rgba(45,80,22,0.12)',
                animation: i < CARD_STAGGER_CAP ? `slideFromL 260ms ease both` : 'none', animationDelay:`${i*24}ms`,
              }}>
                {TagIcon ? <TagIcon s={16} c={on ? (col||C.forest) : (col||C.brown)}/> : <IconPin s={16} c={on?C.forest:C.brown}/>}
                <span style={{ flex:1, fontFamily:FONT_SANS, fontSize:14, fontWeight:on?600:500, color: on?(col||C.forest):C.ink }}>{l}</span>
                {on && <IconCheck s={16} c={C.sage}/>}
              </div>
            );
          })}
        </div>
        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          <input value={typed} onChange={e=>setTyped(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addNew(); } }} placeholder="New room…"
            style={{ flex:1, boxSizing:'border-box', height:46, borderRadius:rad(14), border:'1px solid rgba(45,80,22,0.14)', background:C.input, padding:'0 15px', fontFamily:FONT_SANS, fontSize:14, color:C.ink, outline:'none' }}/>
          <div onClick={addNew} style={{ flexShrink:0, width:46, height:46, borderRadius:rad(14), background: typed.trim()?C.forest:'rgba(45,80,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
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
      <div onClick={onBack} style={{ marginTop:28, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:9, background:C.forest, color:'#fff', borderRadius:rad(16), padding:'14px 24px', boxShadow:'0 6px 16px rgba(45,80,22,0.24)', position:'relative', zIndex:2 }}>
        <IconBack s={17} c="#fff"/>
        <span style={{ fontFamily:FONT_SANS, fontSize:15, fontWeight:600 }}>Back to garden</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  DESKTOP SIDEBAR
// ════════════════════════════════════════════════════════════
// desktop sidebar row — a hover lift + warm left-accent bar for the active
// tab, matching the mobile card-press/entrance vocabulary instead of the flat
// background-only state the sidebar had before (desktop was otherwise the
// one surface today's cozy pass hadn't reached at all)
function SidebarItem({ onClick, title, collapsed, active, accent, indicatorStyle = 'tint', children }) {
  const [hover, setHover] = useState(false);
  const pill = indicatorStyle === 'pill';
  const underline = indicatorStyle === 'underline';
  return (
    <div onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} title={title} style={{
      position:'relative', display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start', gap:11,
      padding: collapsed ? '11px 0' : '11px 12px', borderRadius:rad(12), marginBottom:4,
      cursor:'pointer',
      background: active ? (pill ? `${accent}22` : underline ? 'transparent' : 'rgba(45,80,22,0.09)') : hover ? 'rgba(45,80,22,0.045)' : 'transparent',
      borderBottom: underline ? `2px solid ${active ? accent : 'transparent'}` : 'none',
      transform: hover && !active ? 'translateX(2px)' : 'translateX(0)',
      transition:'background 140ms ease, transform 160ms cubic-bezier(.2,.8,.2,1), border-color 160ms ease',
    }}>
      {active && indicatorStyle === 'tint' && <span style={{ position:'absolute', left:-6, top:'22%', bottom:'22%', width:3, borderRadius:999, background:accent }}/>}
      {children}
    </div>
  );
}
function DesktopSidebar({ tab, setTab, onAction, navConfig, showLabels = true, sidebar = {}, indicatorStyle = 'tint' }) {
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
            <SidebarItem key={i} onClick={()=>fire(s.action)} title={collapsed ? navLabel(s) : undefined} collapsed={collapsed} active={active} accent={accent} indicatorStyle={indicatorStyle}>
              <meta.Icon s={20} c={active ? accent : C.brown} a={active ? 1 : 0.55}/>
              {labels && <span style={{
                fontFamily:FONT_SANS, fontSize:14, fontWeight: active ? 600 : 500,
                color: active ? accent : C.ink,
                opacity: active ? 1 : 0.75,
              }}>{navLabel(s)}</span>}
            </SidebarItem>
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
  DesktopSidebar, DesktopModal, PlantNotFoundScreen, WeeklyDigest,
});
