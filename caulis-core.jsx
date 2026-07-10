// ════════════════════════════════════════════════════════════
//  Caulis — core: palette, icons, data, shared primitives
// ════════════════════════════════════════════════════════════
const { useState, useEffect, useRef, useMemo } = React;

function useWindowWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return w;
}
const DESKTOP_BP = 900;
const APP_VERSION = '152'; // keep in sync with sw.js CACHE

let _html5QrcodeLoad = null;
function loadHtml5Qrcode() {
  if (typeof Html5Qrcode !== 'undefined') return Promise.resolve();
  if (_html5QrcodeLoad) return _html5QrcodeLoad;
  _html5QrcodeLoad = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    s.onload = () => resolve();
    s.onerror = () => { _html5QrcodeLoad = null; reject(new Error('load failed')); };
    document.head.appendChild(s);
  });
  return _html5QrcodeLoad;
}

// motion tokens — one scale for every transition so the app feels consistent
const MOTION = {
  out:    'cubic-bezier(.2,.8,.2,1)',     // standard ease-out
  spring: 'cubic-bezier(.34,1.56,.64,1)', // playful overshoot
  fast: 160, base: 240, slow: 320,
};

const C = {
  bg:     '#FAFAF7',
  panel:  '#FFFFFF',
  forest: '#2D5016',
  sage:   '#7A9E4E',
  brown:  '#6B4C2A',
  ink:    '#2A2A26',
  line:   'rgba(45,80,22,0.08)',
  hair:   '0.5px solid rgba(45,80,22,0.08)',
};
const C_LIGHT = { ...C, input: '#F2F2EE', toast: '#2A2A26' };
const C_DARK = {
  bg:     '#111610',
  panel:  '#192115',
  forest: '#7EC870',
  sage:   '#A0C876',
  brown:  '#C4A882',
  ink:    '#DCE8CC',
  line:   'rgba(255,255,255,0.07)',
  hair:   '0.5px solid rgba(255,255,255,0.08)',
  input:  '#1E2A1A',
  toast:  '#243019',
};
C.input = C_LIGHT.input;
C.toast = C_LIGHT.toast;

const FONT_SERIF = '"Cormorant Garamond", serif';
const FONT_SANS  = '"DM Sans", sans-serif';

// QR generator (forest-green ink on warm ground) ------------
function qrUrl(data, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=0&qzone=1&color=2D5016&bgcolor=FAFAF7&data=${encodeURIComponent(data)}`;
}
const PLANT_QR_URL = id => {
  let g = '';
  try { g = localStorage.getItem('caulis_garden_node') || ''; } catch(e) {}
  return `https://cybutr.github.io/Caulis/?plant=${id}${g ? '&g='+encodeURIComponent(g) : ''}`;
};

// soft specimen tints ---------------------------------------
const TINTS_LIGHT = ['#E7EDDE','#EEEAE0','#E3EAD6','#ECE7DC','#E9EEE2','#EDE9DF','#E6ECE0','#EFE9DE'];
const TINTS_DARK  = ['#1A2416','#201C12','#182210','#1E1C14','#1A2014','#201E14','#182016','#201A12'];
const TINTS = [...TINTS_LIGHT];

// curated accent palettes — only the accent pair shifts, paper/ink stay (max consistency)
const PALETTES = {
  forest: { label:'Forest', swatch:'#2D5016', light:{ forest:'#2D5016', sage:'#7A9E4E' }, dark:{ forest:'#7EC870', sage:'#A0C876' } },
  teal:   { label:'Teal',   swatch:'#15605A', light:{ forest:'#15605A', sage:'#3E9E92' }, dark:{ forest:'#5FC7BC', sage:'#76C8BE' } },
  plum:   { label:'Plum',   swatch:'#5A2456', light:{ forest:'#5A2456', sage:'#9E4E92' }, dark:{ forest:'#C870BC', sage:'#C876BE' } },
  clay:   { label:'Clay',   swatch:'#8A3A1E', light:{ forest:'#8A3A1E', sage:'#C07A4E' }, dark:{ forest:'#D4885F', sage:'#D8A074' } },
  ocean:  { label:'Ocean',  swatch:'#1D4E89', light:{ forest:'#1D4E89', sage:'#5487B0' }, dark:{ forest:'#7DAEDC', sage:'#8FC0E8' } },
  amber:  { label:'Amber',  swatch:'#8A6A12', light:{ forest:'#8A6A12', sage:'#C0973E' }, dark:{ forest:'#E0B84E', sage:'#D8C074' } },
  rose:   { label:'Rose',   swatch:'#8A2A3E', light:{ forest:'#8A2A3E', sage:'#C06478' }, dark:{ forest:'#E08096', sage:'#E0A0B0' } },
};
const PALETTE_ORDER = ['forest','teal','plum','clay','ocean','amber','rose'];
let activePalette = 'forest';

// the "active/selected" highlight — independent of the main forest/sage
// accent pair above so someone can e.g. run a Teal palette with an Amber
// selected-tab highlight. 'match' (the default) just mirrors C.forest so
// existing gardens see zero visual change until they opt in.
const ACCENTS = {
  match: { label:'Match palette', swatch:null },
  forest: { label:'Forest', swatch:'#2D5016', dark:'#7EC870' },
  teal:   { label:'Teal',   swatch:'#15605A', dark:'#5FC7BC' },
  plum:   { label:'Plum',   swatch:'#5A2456', dark:'#C870BC' },
  clay:   { label:'Clay',   swatch:'#8A3A1E', dark:'#D4885F' },
  ocean:  { label:'Ocean',  swatch:'#1D4E89', dark:'#7DAEDC' },
  amber:  { label:'Amber',  swatch:'#8A6A12', dark:'#E0B84E' },
  rose:   { label:'Rose',   swatch:'#8A2A3E', dark:'#E08096' },
};
const ACCENT_ORDER = ['match','forest','teal','plum','clay','ocean','amber','rose'];
let activeAccent = 'match';

// corner-radius density — one multiplier over the whole radius scale (11-22px
// tiles/inputs, 16 buttons, 18 rows, 20-22 cards/sheets) so a single setting
// visibly retunes cards, buttons and sheets together instead of just one spot.
// pills (999) are excluded on purpose — they're already maximally round.
const RADIUS_DENSITY = {
  sharp: { label:'Sharp', mult:0.45 },
  soft:  { label:'Soft',  mult:1 },
  round: { label:'Round', mult:1.4 },
};
const RADIUS_ORDER = ['sharp','soft','round'];
let radiusMult = 1;
function applyRadiusDensity(level) { radiusMult = (RADIUS_DENSITY[level] || RADIUS_DENSITY.soft).mult; }
function rad(px) { return Math.max(2, Math.round(px * radiusMult)); }

// card image treatment — CSS filter presets applied inside Specimen, the one
// component every plant photo already renders through (Garden, Needs Water,
// Plant Detail, Print Queue, Digest), so one setting reaches all of them.
const IMAGE_TREATMENTS = {
  natural:  { label:'Natural',  filter:'none' },
  vivid:    { label:'Vivid',    filter:'saturate(1.4) contrast(1.1) brightness(1.03)' },
  vignette: { label:'Vignette', filter:'saturate(1.05) contrast(1.05) brightness(0.97)', vignette:true },
};
const IMAGE_TREATMENT_ORDER = ['natural','vivid','vignette'];
let activeImageTreatment = 'natural';
function applyImageTreatment(v) { if (IMAGE_TREATMENTS[v]) activeImageTreatment = v; }

// UI density — a single spacing multiplier for grid gaps / row padding,
// independent of "Card density" (which only picks the grid column count)
const UI_DENSITY = {
  compact:     { label:'Compact',     mult:0.7 },
  comfortable: { label:'Comfortable', mult:1 },
  spacious:    { label:'Spacious',    mult:1.35 },
};
const UI_DENSITY_ORDER = ['compact','comfortable','spacious'];
let uiDensityMult = 1;
function applyUiDensity(level) { uiDensityMult = (UI_DENSITY[level] || UI_DENSITY.comfortable).mult; }
function ds(px) { return Math.max(2, Math.round(px * uiDensityMult)); }

// background texture — a very subtle, optional wash behind every screen,
// in the same restrained spirit as the Sprig watermark. Off by default.
const BG_TEXTURES = {
  none:  { label:'None' },
  dot:   { label:'Dot grid' },
  paper: { label:'Paper grain' },
};
const BG_TEXTURE_ORDER = ['none','dot','paper'];
let activeBgTexture = 'none';
function applyBgTexture(v) { if (BG_TEXTURES[v]) activeBgTexture = v; }
function bgTextureStyle() {
  if (activeBgTexture === 'dot') return { backgroundImage:`radial-gradient(${C.line} 1px, transparent 1px)`, backgroundSize:'22px 22px' };
  if (activeBgTexture === 'paper') return { backgroundImage:`repeating-linear-gradient(135deg, ${C.line} 0 1px, transparent 1px 8px)` };
  return {};
}

function applyTheme(dark, palette, accent) {
  if (palette && PALETTES[palette]) activePalette = palette;
  if (accent && ACCENTS[accent]) activeAccent = accent;
  const src = dark ? C_DARK : C_LIGHT;
  Object.assign(C, src);
  const pal = PALETTES[activePalette] || PALETTES.forest;
  Object.assign(C, dark ? pal.dark : pal.light);
  const acc = ACCENTS[activeAccent] || ACCENTS.match;
  C.accent = acc.swatch ? (dark ? (acc.dark || acc.swatch) : acc.swatch) : C.forest;
  const ss = dark ? STATUS_DARK : STATUS_LIGHT;
  Object.assign(STATUS.ok, ss.ok);
  Object.assign(STATUS.soon, ss.soon);
  Object.assign(STATUS.needs, ss.needs);
  const ts = dark ? TINTS_DARK : TINTS_LIGHT;
  ts.forEach((t, i) => { TINTS[i] = t; });
  if (typeof document !== 'undefined') {
    let el = document.getElementById('caulis-theme');
    if (!el) { el = document.createElement('style'); el.id = 'caulis-theme'; document.head.appendChild(el); }
    el.textContent = dark
      ? 'input::placeholder,textarea::placeholder{color:rgba(220,232,204,0.32)!important}'
      : 'input::placeholder,textarea::placeholder{color:rgba(42,42,38,0.34)!important}';
  }
}

// ── status from days-since vs interval ────────────────────
function statusOf(days, every, snoozedUntil) {
  if (typeof snoozedUntil === 'number' && todayMidnight() < snoozedUntil) return 'ok';
  const r = days / every;
  if (r >= 1)   return 'needs';
  if (r >= 0.7) return 'soon';
  return 'ok';
}
const STATUS_LIGHT = {
  ok:    { dot: '#6E9A3E', ring: 'rgba(110,154,62,0.18)', soft: 'rgba(110,154,62,0.12)', label: 'Healthy' },
  soon:  { dot: '#C98A2B', ring: 'rgba(201,138,43,0.18)', soft: 'rgba(201,138,43,0.12)', label: 'Water soon' },
  needs: { dot: '#B4472E', ring: 'rgba(180,71,46,0.18)',  soft: 'rgba(180,71,46,0.12)',  label: 'Needs water' },
};
const STATUS_DARK = {
  ok:    { dot: '#72C050', ring: 'rgba(114,192,80,0.22)', soft: 'rgba(114,192,80,0.16)', label: 'Healthy' },
  soon:  { dot: '#D4962E', ring: 'rgba(212,150,46,0.22)', soft: 'rgba(212,150,46,0.16)', label: 'Water soon' },
  needs: { dot: '#D45840', ring: 'rgba(212,88,64,0.22)',  soft: 'rgba(212,88,64,0.16)',  label: 'Needs water' },
};
const STATUS = {
  ok:    { ...STATUS_LIGHT.ok },
  soon:  { ...STATUS_LIGHT.soon },
  needs: { ...STATUS_LIGHT.needs },
};

// ── room light levels vs a plant's sunlight needs ─────────
const ROOM_LIGHT_LEVELS = [
  { id: 'low',    label: 'Low light' },
  { id: 'medium', label: 'Medium light' },
  { id: 'bright', label: 'Bright, indirect' },
  { id: 'direct', label: 'Direct sun' },
];
function sunlightLevel(tag) {
  const t = String(tag || '').toLowerCase();
  if (t.includes('full sun') || t.includes('direct')) return 'direct';
  if (t.includes('part') || t.includes('filtered')) return 'medium';
  if (t.includes('full shade') || t.includes('shade')) return 'low';
  if (t.includes('bright') || t.includes('indirect')) return 'bright';
  return null;
}
// returns the widest and narrowest light levels a plant tolerates, from its
// sunlight[] tags (or a light label string fallback), or null if unknown
function plantLightRange(plant) {
  const order = ['low', 'medium', 'bright', 'direct'];
  const tags = Array.isArray(plant.sunlight) && plant.sunlight.length ? plant.sunlight : [plant.light];
  const levels = tags.map(sunlightLevel).filter(Boolean);
  if (!levels.length) return null;
  const idxs = levels.map(l => order.indexOf(l));
  return { min: order[Math.min(...idxs)], max: order[Math.max(...idxs)] };
}
// compares a plant's tolerated light range against its room's configured
// light level; null = no warning (unknown range, or no room level set)
function roomLightMismatch(plant, roomLevel) {
  if (!roomLevel) return null;
  const range = plantLightRange(plant);
  if (!range) return null;
  const order = ['low', 'medium', 'bright', 'direct'];
  const roomIdx = order.indexOf(roomLevel);
  const minIdx = order.indexOf(range.min);
  const maxIdx = order.indexOf(range.max);
  if (roomIdx < minIdx) return 'dim';   // room is darker than the plant tolerates
  if (roomIdx > maxIdx) return 'harsh'; // room is brighter than the plant tolerates
  return null;
}

function agoLabel(days) {
  if (days <= 0) return 'Watered today';
  if (days === 1) return 'Watered yesterday';
  return `Watered ${days} days ago`;
}

// local YYYY-MM-DD (never UTC — avoids off-by-one in +UTC timezones)
function fmtLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── elapsed-days from an absolute watered timestamp (the real clock) ──
const DAY_MS = 86400000;
function todayMidnight() { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); }
function midnightFromStamp(stamp) { const [y,m,d] = String(stamp).split('-').map(Number); const dt = new Date(y, (m||1)-1, d||1); dt.setHours(0,0,0,0); return dt.getTime(); }
function daysSinceMidnight(ms) { return Math.max(0, Math.round((todayMidnight() - ms) / DAY_MS)); }
// absolute watered timestamp for a plant. trust an existing wateredAt only once
// the plant carries the current schema marker (wv) — earlier builds wrote a bad
// "today" stamp, so unmarked plants are recomputed from history, else from days
// plus a 5-day legacy backfill. idempotent: re-runs until the marker is stamped.
const WATER_SCHEMA = 3;
function deriveWateredAt(p) {
  if (p.wv === WATER_SCHEMA && typeof p.wateredAt === 'number') return p.wateredAt;
  const h = Array.isArray(p.history) ? p.history : [];
  if (h.length) return midnightFromStamp(h[h.length - 1]);
  return todayMidnight() - (p.days || 0) * DAY_MS;
}

// a plant is due a care check-in once it has enough watering history to be
// meaningful (4+ waterings) and it's been at least 21 days since the last
// check-in (or it's never had one) — deliberately infrequent, this is a
// nudge to correct the interval, not a nag
const CARE_CHECK_COOLDOWN_MS = 21 * DAY_MS;
function careCheckDue(plant) {
  const history = Array.isArray(plant.history) ? plant.history : [];
  if (history.length < 4) return false;
  if (!plant.lastCareCheck) return true;
  return todayMidnight() - plant.lastCareCheck >= CARE_CHECK_COOLDOWN_MS;
}
// nudges a watering interval from a care check-in outcome, bounded 1..365
function adjustEveryForOutcome(every, outcome) {
  const factor = outcome === 'thriving' ? 1.15 : outcome === 'struggling' ? 0.85 : outcome === 'dropping' ? 0.7 : 1;
  return Math.min(365, Math.max(1, Math.round(every * factor)));
}

// a single rolled-up "garden health" score — not a new signal, purely a
// weighted read of state that already exists (status, room-light mismatch,
// recent care check-in outcomes), so nothing new needs to sync for it
const HEALTH_TIERS = {
  thriving:   { label: 'Thriving',        dot: '#6E9A3E' },
  good:       { label: 'Doing well',      dot: '#7A9E4E' },
  attention:  { label: 'Needs attention', dot: '#C98A2B' },
  struggling: { label: 'Struggling',      dot: '#B4472E' },
};
function gardenHealthScore(plants, roomLight) {
  if (!plants || !plants.length) return null;
  const n = plants.length;
  const cutoff = todayMidnight() - CARE_CHECK_COOLDOWN_MS;
  let needs = 0, soon = 0, mismatch = 0, dropping = 0, struggling = 0;
  plants.forEach(p => {
    const st = statusOf(p.days, p.every, p.snoozedUntil);
    if (st === 'needs') needs++; else if (st === 'soon') soon++;
    if (roomLight && roomLight[p.location] && roomLightMismatch(p, roomLight[p.location])) mismatch++;
    if (p.lastCareOutcome === 'dropping' && p.lastCareCheck >= cutoff) dropping++;
    else if (p.lastCareOutcome === 'struggling' && p.lastCareCheck >= cutoff) struggling++;
  });
  let score = 100 - (needs/n)*45 - (soon/n)*15 - (mismatch/n)*15 - (dropping/n)*20 - (struggling/n)*10;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier = score >= 90 ? 'thriving' : score >= 75 ? 'good' : score >= 50 ? 'attention' : 'struggling';
  return { score, tier, needs, soon, mismatch, dropping, struggling };
}

// watering log summary from an array of 'YYYY-MM-DD' strings (newest last)
function wateringStats(history) {
  const h = Array.isArray(history) ? history : [];
  const cutoff = new Date(); cutoff.setHours(0,0,0,0); cutoff.setDate(cutoff.getDate() - 30);
  const count30 = h.filter(s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d) >= cutoff; }).length;
  return { total: h.length, count30, last: h.length ? h[h.length-1] : null };
}

// plant-count thresholds worth a quiet celebration — shared between the
// milestone toast (app.jsx) and the badge definitions (caulis-badges.jsx) so
// the two "hit a nice round garden size" events never drift out of sync
const MILESTONES = [5, 10, 25, 50, 100, 200];

// live weekday + part-of-day, e.g. "Saturday morning"
function todayGreeting() {
  const d = new Date();
  const wd = d.toLocaleDateString('en-US', { weekday: 'long' });
  const h = d.getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  return `${wd} ${part}`;
}

// ════════════════════════════════════════════════════════════
//  Botanical glyphs
// ════════════════════════════════════════════════════════════
function Leaf({ size = 22, color = C.forest, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', opacity }}>
      <path d="M12 3C7.6 6.4 5 10.6 5 14.4 5 18.6 8 21 12 21s7-2.4 7-6.6C19 10.6 16.4 6.4 12 3Z" fill={color}/>
      <path d="M12 5.6v13.2" stroke={C.bg} strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function LeafOutline({ size = 22, color = C.forest, sw = 1.4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
      <path d="M12 3C7.6 6.4 5 10.6 5 14.4 5 18.6 8 21 12 21s7-2.4 7-6.6C19 10.6 16.4 6.4 12 3Z" fill="none" stroke={color} strokeWidth={sw}/>
      <path d="M12 5.6v12.8" stroke={color} strokeWidth={sw * 0.8} strokeLinecap="round"/>
    </svg>
  );
}

function Sprig({ w = 260, h = 300, right = -26, bottom = -22, opacity = 0.2, onTap }) {
  const leaf = (cx, cy, rot) => (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <ellipse cx="0" cy="-13" rx="7.5" ry="15" fill="none" stroke={C.brown} strokeWidth="1.4"/>
      <line x1="0" y1="0" x2="0" y2="-26" stroke={C.brown} strokeWidth="1.1"/>
    </g>
  );
  return (
    <svg width={w} height={h} viewBox="0 0 260 300" onClick={onTap}
      style={{ position:'absolute', right, bottom, opacity, pointerEvents: onTap ? 'auto' : 'none', cursor: onTap ? 'pointer' : 'default' }}>
      <path d="M205 296 C 150 250, 120 180, 132 96 C 138 56, 158 30, 196 14"
        fill="none" stroke={C.brown} strokeWidth="1.4" strokeLinecap="round"/>
      {leaf(150,232,38)}{leaf(133,188,-34)}{leaf(126,150,30)}
      {leaf(128,112,-28)}{leaf(146,76,22)}{leaf(170,46,-18)}
      <circle cx="196" cy="14" r="4.5" fill="none" stroke={C.brown} strokeWidth="1.4"/>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════
//  UI icons (simple line set)
// ════════════════════════════════════════════════════════════
function IconGarden({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" stroke={c} strokeWidth="1.7"/>
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" stroke={c} strokeWidth="1.7"/>
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" stroke={c} strokeWidth="1.7"/>
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" stroke={c} strokeWidth="1.7"/>
  </svg>);
}
function IconDrop({ s = 24, c = C.ink, a = 1, fill = false }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <path d="M12 3.5C12 3.5 5 11 5 15.5a7 7 0 0014 0C19 11 12 3.5 12 3.5Z"
      stroke={c} strokeWidth="1.7" fill={fill ? c : 'none'} strokeLinejoin="round"/>
  </svg>);
}
function IconScan({ s = 26, c = '#fff' }) {
  return (<svg width={s} height={s} viewBox="0 0 28 28" fill="none">
    <path d="M3 8.5V6a3 3 0 013-3h2.5M19.5 3H22a3 3 0 013 3v2.5M25 19.5V22a3 3 0 01-3 3h-2.5M8.5 25H6a3 3 0 01-3-3v-2.5"
      stroke={c} strokeWidth="2" strokeLinecap="round"/>
    <rect x="8" y="8" width="12" height="12" rx="2.5" stroke={c} strokeWidth="2"/>
    <path d="M3 14h22" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.55"/>
  </svg>);
}
function IconPrint({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <path d="M7 9V4h10v5" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/>
    <rect x="3.5" y="9" width="17" height="8" rx="2" stroke={c} strokeWidth="1.7"/>
    <rect x="7" y="14" width="10" height="6" rx="1" stroke={c} strokeWidth="1.7"/>
    <circle cx="17" cy="12.2" r="1" fill={c}/>
  </svg>);
}
function IconGear({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <circle cx="12" cy="12" r="3.2" stroke={c} strokeWidth="1.7"/>
    <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
      stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
  </svg>);
}
function IconPlus({ s = 16, c = C.forest, w = 1.7 }) {
  return (<svg width={s} height={s} viewBox="0 0 16 16"><path d="M8 2.5v11M2.5 8h11" stroke={c} strokeWidth={w} strokeLinecap="round"/></svg>);
}
function IconBack({ s = 20, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M12.5 4 6.5 10l6 6" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}
function IconMore({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" opacity={a}><circle cx="5" cy="12" r="1.7" fill={c}/><circle cx="12" cy="12" r="1.7" fill={c}/><circle cx="19" cy="12" r="1.7" fill={c}/></svg>);
}
function IconDoctor({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" opacity={a}>
    <path d="M6 3v5a4 4 0 0 0 8 0V3" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    <path d="M5 3h2M13 3h2" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
    <path d="M10 12v3.5a4.5 4.5 0 0 0 9 0V14" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="19" cy="12.5" r="2" stroke={c} strokeWidth="1.7"/>
  </svg>);
}
function IconCheck({ s = 18, c = '#fff', w = 2 }) {
  return (<svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M4 10.5 8 14.5 16 6" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"/></svg>);
}
function IconPin({ s = 13, c = C.brown }) {
  return (<svg width={s} height={s} viewBox="0 0 14 14" fill="none">
    <path d="M7 1.5c-2.5 0-4.3 1.9-4.3 4.2C2.7 8.8 7 12.5 7 12.5s4.3-3.7 4.3-6.8C11.3 3.4 9.5 1.5 7 1.5Z" stroke={c} strokeWidth="1.2"/>
    <circle cx="7" cy="5.7" r="1.5" stroke={c} strokeWidth="1.2"/>
  </svg>);
}

// ════════════════════════════════════════════════════════════
//  Small shared components
// ════════════════════════════════════════════════════════════
function StatusDot({ status, size = 9 }) {
  const s = STATUS[status];
  return <div style={{ width:size, height:size, borderRadius:999, background:s.dot, boxShadow:`0 0 0 3px ${s.ring}` }}/>;
}

function LocationPill({ label }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      background:'rgba(107,76,42,0.08)', color:C.brown,
      borderRadius:999, padding:'4px 10px 4px 8px',
      fontFamily:FONT_SANS, fontSize:11.5, fontWeight:500, letterSpacing:0.2,
    }}>
      <IconPin/> {label}
    </span>
  );
}

function StatusTag({ status }) {
  const s = STATUS[status];
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      background:s.soft, color:s.dot, borderRadius:999, padding:'4px 11px',
      fontFamily:FONT_SANS, fontSize:11.5, fontWeight:600, letterSpacing:0.2,
    }}>
      <span style={{ width:7, height:7, borderRadius:999, background:s.dot }}/> {s.label}
    </span>
  );
}

// Specimen image placeholder OR real photo (tinted block w/ leaf motif) ---
function Specimen({ tint, height, radius = 15, leafSize = 46, caption, image }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);
  // cached images can finish loading before React attaches onLoad — catch that
  useEffect(() => {
    setLoaded(false);
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, [image]);
  const showImg = image && !failed;
  const r = rad(radius);
  const treatment = IMAGE_TREATMENTS[activeImageTreatment] || IMAGE_TREATMENTS.natural;
  return (
    <div style={{
      position:'relative', height, borderRadius:r, background:tint,
      display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
    }}>
      <div style={{
        position:'absolute', inset:0, opacity:0.5,
        backgroundImage:`repeating-linear-gradient(135deg, rgba(45,80,22,0.04) 0 1px, transparent 1px 9px)`,
      }}/>
      <Leaf size={leafSize} color={C.forest} opacity={0.16}/>
      {showImg && (
        <img
          key={image} ref={imgRef} src={image} alt="" draggable={false}
          onError={()=>setFailed(true)} onLoad={()=>setLoaded(true)}
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', display:'block',
            opacity: loaded?1:0, transform: loaded?'none':'scale(1.06)', filter: loaded?treatment.filter:'blur(14px)',
            transition:`opacity ${MOTION.base}ms ${MOTION.out}, transform ${MOTION.slow}ms ${MOTION.out}, filter ${MOTION.slow}ms ${MOTION.out}` }}/>
      )}
      {showImg && (
        <div style={{ position:'absolute', inset:0, boxShadow:'inset 0 0 0 0.5px rgba(45,80,22,0.10)', borderRadius:r, pointerEvents:'none',
          background: treatment.vignette
            ? 'radial-gradient(ellipse at center, transparent 45%, rgba(20,26,14,0.28) 100%), linear-gradient(to top, rgba(28,38,18,0.2), transparent 38%)'
            : 'linear-gradient(to top, rgba(28,38,18,0.18), transparent 38%)' }}/>
      )}
      {caption && !showImg && (
        <span style={{
          position:'absolute', bottom:8, left:0, right:0, textAlign:'center',
          fontFamily:'ui-monospace, "SF Mono", Menlo, monospace', fontSize:9,
          letterSpacing:1, color:C.forest, opacity:0.34, textTransform:'uppercase',
        }}>{caption}</span>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Data — locations (plants are built in caulis-perenual.jsx)
// ════════════════════════════════════════════════════════════
const SEED_LOCATIONS = ['Living room','Bedroom','Kitchen windowsill','Bathroom','Office','Balcony'];

// ── customizable bottom navigation ───────────────────────────
const NAV_ACTIONS = {
  garden:   { label:'Garden',   Icon:IconGarden, tab:true },
  needs:    { label:'Water',    Icon:IconDrop,   tab:true },
  scanner:  { label:'Scan',     Icon:IconScan,   tab:true },
  print:    { label:'Queue',    Icon:IconPrint,  tab:true },
  settings: { label:'Settings', Icon:IconGear,   tab:true },
  add:      { label:'Add',      Icon:IconPlus,   tab:false },
  doctor:   { label:'Doctor',   Icon:IconDoctor, tab:false },
  digest:   { label:'This week', Icon:IconGarden, tab:false },
  more:     { label:'More',     Icon:IconMore,   tab:false },
};
const NAV_ORDER = ['garden','needs','scanner','print','settings','add','doctor','digest','more'];
const NAV_MAX = 7;
const DEFAULT_NAV = [
  { action:'garden' }, { action:'needs' }, { action:'scanner', center:true }, { action:'print' }, { action:'settings' },
];
function normalizeNav(cfg) {
  if (!Array.isArray(cfg) || !cfg.length) return DEFAULT_NAV.map(s => ({ ...s }));
  const slots = cfg.slice(0, NAV_MAX).map(s => {
    const out = { action: NAV_ACTIONS[s && s.action] ? s.action : 'empty', center: !!(s && s.center) };
    if (s && typeof s.label === 'string' && s.label.trim()) out.label = s.label.slice(0, 18);
    if (s && typeof s.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(s.color)) out.color = s.color;
    return out;
  });
  if (!slots.length) return DEFAULT_NAV.map(s => ({ ...s }));
  if (!slots.some(s => s.center)) { const i = slots.findIndex(s => s.action !== 'empty'); if (i >= 0) slots[i].center = true; }
  let seen = false; for (const s of slots) { if (s.center && !seen) seen = true; else s.center = false; }
  return slots;
}
const navLabel = (s) => (s && s.label) || (NAV_ACTIONS[s && s.action] ? NAV_ACTIONS[s.action].label : '');
const navColor = (s) => (s && s.color) || C.accent || C.forest;
// ordered tab actions present in the bar — what swipes and launch-tab respect
function navTabOrder(cfg) {
  const seen = new Set();
  const order = normalizeNav(cfg)
    .filter(s => s.action !== 'empty' && NAV_ACTIONS[s.action] && NAV_ACTIONS[s.action].tab)
    .map(s => s.action)
    .filter(a => (seen.has(a) ? false : seen.add(a)));
  return order.length ? order : ['garden'];
}

// export to window for other babel scripts -------------------
Object.assign(window, {
  C, FONT_SERIF, FONT_SANS, qrUrl, TINTS, statusOf, STATUS, agoLabel, todayGreeting, fmtLocalDate, wateringStats,
  ROOM_LIGHT_LEVELS, sunlightLevel, plantLightRange, roomLightMismatch,
  careCheckDue, adjustEveryForOutcome, HEALTH_TIERS, gardenHealthScore,
  todayMidnight, midnightFromStamp, daysSinceMidnight, deriveWateredAt, WATER_SCHEMA,
  NAV_ACTIONS, NAV_ORDER, NAV_MAX, DEFAULT_NAV, normalizeNav, navTabOrder, navLabel, navColor, MILESTONES,
  PALETTES, PALETTE_ORDER, ACCENTS, ACCENT_ORDER,
  RADIUS_DENSITY, RADIUS_ORDER, applyRadiusDensity, rad,
  IMAGE_TREATMENTS, IMAGE_TREATMENT_ORDER, applyImageTreatment,
  UI_DENSITY, UI_DENSITY_ORDER, applyUiDensity, ds,
  BG_TEXTURES, BG_TEXTURE_ORDER, applyBgTexture, bgTextureStyle,
  Leaf, LeafOutline, Sprig,
  IconGarden, IconDrop, IconScan, IconPrint, IconGear, IconPlus, IconBack, IconCheck, IconPin, IconDoctor, IconMore,
  StatusDot, LocationPill, StatusTag, Specimen,
  SEED_LOCATIONS,
  useWindowWidth, DESKTOP_BP, PLANT_QR_URL, applyTheme, APP_VERSION, MOTION,
});
