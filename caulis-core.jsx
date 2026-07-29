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
const APP_VERSION = '190'; // keep in sync with sw.js CACHE

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

// custom background color — overrides C.bg after applyTheme() picks the
// light/dark value, same "apply pattern" as the custom accent/palette
// colors. Kept separate from PALETTES/ACCENTS since it isn't a swatch
// choice among presets, it's an on/off override of the base page color.
// resolveBgColorChoice() (below, once PALETTE_ORDER exists) turns a picker
// choice into this one hex-or-null — applyCustomBgColor never has to know
// about "off" vs "white" vs a palette tint vs custom, only the result.
//
// C.bg alone only recolors the thin canvas sliver visible around panels —
// every card/sheet/sidebar reads C.panel, and inputs read C.input, so a
// custom pick has to derive those too or most of the screen stays stuck on
// the built-in white. Inspecting the two shipped themes shows panel is
// ALWAYS a touch lighter than bg (light: FAFAF7→FFFFFF, dark: 111610→
// 192115 — an "elevated surface" convention, not a light/dark-flipped one),
// while input runs the other way in each theme (light: sunken, a shade
// darker than bg; dark: raised, lighter even than panel) — so input derives
// off the ORIGINAL bg lightness, not the already-lightened panel.
function deriveBgSurfaces(hex) {
  const hsl = rgbToHsl(hexToRgb(hex));
  const dark = hsl.l < 50;
  const clampL = v => Math.max(0, Math.min(100, v));
  const panelL = clampL(hsl.l + (dark ? 8 : 3));
  const inputL = clampL(hsl.l + (dark ? 11 : -3));
  return {
    dark,
    panel: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: panelL })),
    input: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: inputL })),
  };
}
// text has to follow the ACTUAL picked background's lightness, not whichever
// ink the Dark mode toggle happens to be set to — dark mode's light-mode ink
// (#2A2A26) rendered over a custom dark background, or its dark-mode ink
// (#DCE8CC) rendered over a custom light background, both read as
// pale-on-pale/near-invisible. This is the one real place Dark mode and a
// custom background color can visibly fight each other, so the custom pick
// always wins for legibility, same as it already wins for bg/panel/input.
function applyCustomBgColor(hex) {
  if (!(hex && /^#[0-9a-fA-F]{6}$/.test(hex))) return;
  C.bg = hex;
  const { panel, input, dark } = deriveBgSurfaces(hex);
  C.panel = panel;
  C.input = input;
  C.ink = dark ? C_DARK.ink : C_LIGHT.ink;
  C.brown = dark ? C_DARK.brown : C_LIGHT.brown;
}
// body text (C.ink) is the safety-critical check here — it's read against
// this background everywhere, not just on accent-colored UI elements, so
// this uses the stricter 4.5:1 WCAG AA text minimum rather than the 3:1
// large-text/UI-component floor contrastWarningFor() uses for accents.
// Checks both C.bg and the derived C.panel — text sits on panels at least
// as often as on raw canvas, so a pick that's fine on one but not the other
// still needs the warning.
function bgContrastWarningFor(hex) {
  try {
    const { panel } = deriveBgSurfaces(hex);
    const inkBg = contrastRatio(hex, C.ink), inkPanel = contrastRatio(panel, C.ink);
    const ink = Math.round(Math.min(inkBg, inkPanel) * 100) / 100;
    const brown = Math.round(contrastRatio(hex, C.brown) * 100) / 100;
    return { ink, brown, warnInk: ink < 4.5, warnBrown: brown < 3 };
  } catch (e) { return { ink: 21, brown: 21, warnInk: false, warnBrown: false }; }
}

// every call site sets fontFamily to these two constants inline (538 usages
// across screens/detail/app) — rather than touch every one, the constants
// point at CSS custom properties so a font-pairing switch is one DOM write
// instead of a repo-wide refactor. index.html seeds the same two vars on
// :root for the pre-mount splash / first paint.
const FONT_SERIF = 'var(--font-serif)';
const FONT_SANS  = 'var(--font-sans)';

// font pairing — Classic is what's already eagerly loaded via the <link> in
// index.html, so picking it costs nothing. The other two are fetched lazily,
// only the moment someone actually selects them, via a dynamically injected
// Google Fonts stylesheet link — never loaded upfront, so users who never
// touch this setting pay zero extra bytes.
const FONT_PAIRINGS = {
  classic: {
    label: 'Classic', serif: '"Cormorant Garamond", serif', sans: '"DM Sans", sans-serif', href: null,
  },
  literary: {
    label: 'Literary', serif: '"Fraunces", serif', sans: '"Inter", sans-serif',
    href: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;1,500;1,600;1,700&family=Inter:wght@400;500;600&display=swap',
  },
  editorial: {
    label: 'Editorial', serif: '"Playfair Display", serif', sans: '"Work Sans", sans-serif',
    href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600;1,700&family=Work+Sans:wght@400;500;600&display=swap',
  },
};
const FONT_PAIRING_ORDER = ['classic', 'literary', 'editorial'];
function ensureFontLoaded(href) {
  if (!href || document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}
function applyFontPairing(key) {
  const p = FONT_PAIRINGS[key] || FONT_PAIRINGS.classic;
  ensureFontLoaded(p.href);
  document.documentElement.style.setProperty('--font-serif', p.serif);
  document.documentElement.style.setProperty('--font-sans', p.sans);
}

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
// ── color math — plain hex/HSL conversions + WCAG relative luminance, no
// dependency, used to derive a full palette (light/dark forest+sage) from a
// single user-picked hex and to compute a real contrast ratio against both
// theme backgrounds (never a hardcoded guess)
function hexToRgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function rgbToHsv({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}
function hsvToRgb({ h, s, v }) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}
function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslToRgb({ h, s, l }) {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return { r: hue2rgb(p, q, h + 1 / 3) * 255, g: hue2rgb(p, q, h) * 255, b: hue2rgb(p, q, h - 1 / 3) * 255 };
}
const clampL = (l, min, max) => Math.max(min, Math.min(max, l));
// one custom hue → a full forest/sage pair for both themes, in the same
// spirit as the curated PALETTES: light mode darkens toward the base hue,
// dark mode lifts it into a brighter tint of the same hue (mirrors how
// e.g. teal/plum/ocean above pair a deep light color with a lit-up dark one)
function deriveShadesFromHex(hex) {
  const hsl = rgbToHsl(hexToRgb(hex));
  return {
    light: {
      forest: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: clampL(hsl.l, 14, 40) })),
      sage:   rgbToHex(hslToRgb({ h: hsl.h, s: Math.max(20, hsl.s - 15), l: clampL(hsl.l + 22, 40, 64) })),
    },
    dark: {
      forest: rgbToHex(hslToRgb({ h: hsl.h, s: Math.min(90, hsl.s + 5), l: clampL(hsl.l + 32, 55, 82) })),
      sage:   rgbToHex(hslToRgb({ h: hsl.h, s: Math.max(25, hsl.s - 10), l: clampL(hsl.l + 40, 60, 86) })),
    },
  };
}
// five additional curated hues rounding out the wheel the original seven
// left uncovered — blue-violet, jade green, true red, olive-gold, and a
// desaturated neutral (no strong hue at all, for anyone who wants a calmer
// accent than every other option). Derived through the same deriveShadesFromHex
// math a custom pick goes through, rather than hand-tuned, so each still
// follows the established "darken for light mode, lift for dark mode" shape.
Object.assign(PALETTES, {
  indigo:   { label:'Indigo',   swatch:'#3F3D9E', ...deriveShadesFromHex('#3F3D9E') },
  jade:     { label:'Jade',     swatch:'#1C6B4F', ...deriveShadesFromHex('#1C6B4F') },
  crimson:  { label:'Crimson',  swatch:'#9E1B23', ...deriveShadesFromHex('#9E1B23') },
  olive:    { label:'Olive',    swatch:'#6B6B1E', ...deriveShadesFromHex('#6B6B1E') },
  graphite: { label:'Graphite', swatch:'#4A4A46', ...deriveShadesFromHex('#4A4A46') },
});
// the independent tab-highlight accent only needs a single dark-mode variant
function deriveAccentDark(hex) {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ h: hsl.h, s: Math.min(95, hsl.s + 5), l: clampL(hsl.l + 28, 55, 84) }));
}
function relLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const chan = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}
function contrastRatio(hexA, hexB) {
  const a = relLuminance(hexA), b = relLuminance(hexB);
  const lighter = Math.max(a, b), darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}
// real computed WCAG contrast against both theme backgrounds — not a guess.
// 3:1 is the WCAG 2.1 minimum for large text / UI components, appropriate
// here since the accent is mostly used for icons, pills and headings rather
// than small body copy.
function contrastWarningFor(hex) {
  try {
    const light = Math.round(contrastRatio(hex, C_LIGHT.bg) * 100) / 100;
    const dark = Math.round(contrastRatio(hex, C_DARK.bg) * 100) / 100;
    return { light, dark, warnLight: light < 3, warnDark: dark < 3 };
  } catch (e) { return { light: 21, dark: 21, warnLight: false, warnDark: false }; }
}

const PALETTE_ORDER = ['forest','teal','plum','clay','ocean','amber','rose','indigo','jade','crimson','olive','graphite','custom'];
let activePalette = 'forest';
// seeded with a sane default so PALETTES.custom always exists even before the
// user ever opens the color picker
PALETTES.custom = { label: 'Custom', swatch: '#2D5016', ...deriveShadesFromHex('#2D5016') };
function applyCustomPaletteColor(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  PALETTES.custom = { label: 'Custom', swatch: hex, ...deriveShadesFromHex(hex) };
}

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
// same five additions as PALETTES above, mirrored here with identical hexes
// so "Indigo" means the same color whether picked as the main palette or
// just the tab-highlight accent
Object.assign(ACCENTS, {
  indigo:   { label:'Indigo',   swatch:'#3F3D9E', dark: deriveAccentDark('#3F3D9E') },
  jade:     { label:'Jade',     swatch:'#1C6B4F', dark: deriveAccentDark('#1C6B4F') },
  crimson:  { label:'Crimson',  swatch:'#9E1B23', dark: deriveAccentDark('#9E1B23') },
  olive:    { label:'Olive',    swatch:'#6B6B1E', dark: deriveAccentDark('#6B6B1E') },
  graphite: { label:'Graphite', swatch:'#4A4A46', dark: deriveAccentDark('#4A4A46') },
});
const ACCENT_ORDER = ['match','forest','teal','plum','clay','ocean','amber','rose','indigo','jade','crimson','olive','graphite','custom'];
let activeAccent = 'match';
ACCENTS.custom = { label: 'Custom', swatch: '#2D5016', dark: deriveAccentDark('#2D5016') };
function applyCustomAccentColor(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  ACCENTS.custom = { label: 'Custom', swatch: hex, dark: deriveAccentDark(hex) };
}

// background-color picker — Off (theme default) first, exactly like
// ACCENTS' own 'match' slot, then literal White/Black, then one soft tint
// per curated palette (derived, not full-saturation — a page background
// should read as "this palette's mood," not shout the accent color), and
// finally the existing free-form Custom slot. Every option resolves through
// resolveBgColorChoice() into one hex-or-null, so applyCustomBgColor keeps
// its simple "one hex or nothing" shape from before this picker existed.
function deriveBgTint(hex) {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ h: hsl.h, s: Math.min(38, hsl.s * 0.55), l: 96 }));
}
const BG_TINT_KEYS = PALETTE_ORDER.filter(k => k !== 'custom');
const BG_TINTS = {};
BG_TINT_KEYS.forEach(k => { BG_TINTS[k] = deriveBgTint(PALETTES[k].swatch); });
const BG_COLOR_ORDER = ['off', 'white', 'black', ...BG_TINT_KEYS, 'custom'];
function resolveBgColorChoice(choice, customHex) {
  if (!choice || choice === 'off') return null;
  if (choice === 'white') return '#FFFFFF';
  if (choice === 'black') return '#0A0A08';
  if (choice === 'custom') return customHex;
  if (BG_TINTS[choice]) return BG_TINTS[choice];
  return null;
}
// Dark mode is no longer its own toggle — picking "Black" (or any custom
// color dark enough) from the SAME background-color picker above IS what
// flips the app into its dark theme now. One control instead of two that
// used to silently fight each other (see applyCustomBgColor's own history).
// 'off'/'white'/a palette tint all resolve to null-or-light, so they stay
// light; deriveBgSurfaces' lightness check (also used for panel/input/ink
// derivation) is reused here as the single source of truth for dark-or-not.
function darkFromBgChoice(choice, customHex) {
  const hex = resolveBgColorChoice(choice, customHex);
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return false;
  return deriveBgSurfaces(hex).dark;
}

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

// background texture — a very subtle, optional wash behind every screen, in
// the same restrained spirit as the Sprig watermark. Off by default. Three
// families now, not just "more grain": a CSS-only organic dot jitter, a
// CSS-only woven linen crosshatch, a CSS-only botanical leaf-vein line
// pattern (thematically apt for a plant app), plus the two feTurbulence-
// driven noise characters (fine-grain paper, marbled turbulence) that share
// the one fixed full-viewport .grain-overlay layer. Every one stays alpha-
// only/monochrome — texture never carries its own color, warmth still only
// ever comes from palette + typography.
const BG_TEXTURES = {
  none:   { label:'None' },
  dot:    { label:'Dot grid' },
  linen:  { label:'Linen weave' },
  vein:   { label:'Leaf vein' },
  paper:  { label:'Paper grain' },
  marble: { label:'Marble grain' },
};
const BG_TEXTURE_ORDER = ['none','dot','linen','vein','paper','marble'];
let activeBgTexture = 'none';
function applyBgTexture(v) { if (BG_TEXTURES[v]) activeBgTexture = v; }
// deterministic point set (not Math.random per call) so the dot jitter
// never visibly re-randomizes on re-render — "irregular" is baked into the
// fixed offsets themselves, not regenerated
const DOT_JITTER_PTS = [[6,8],[19,4],[33,14],[46,7],[12,24],[28,29],[41,22],[54,31],[7,42],[22,46],[37,44],[50,50],[15,55],[44,58]];
function dotPatternUri(color) {
  const circles = DOT_JITTER_PTS.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${color}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">${circles}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
function veinPatternUri(color) {
  // a few branching curved strokes, not a literal leaf outline — reads as
  // "organic linework" at this scale/opacity rather than wallpaper botanical art
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="130">
    <path d="M12 122 C 32 100, 26 66, 42 44 C 52 28, 46 12, 62 4" stroke="${color}" stroke-width="1" fill="none"/>
    <path d="M42 44 C 58 50, 68 55, 82 60" stroke="${color}" stroke-width="0.7" fill="none"/>
    <path d="M26 66 C 15 71, 8 82, 5 98" stroke="${color}" stroke-width="0.7" fill="none"/>
    <path d="M62 4 C 78 15, 88 10, 104 22" stroke="${color}" stroke-width="0.7" fill="none"/>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
// texture parameter accepted so Settings' live preview swatches can render
// any option regardless of which one is currently active — defaults to the
// active texture for the real app-background call sites, which never pass it
// backgroundImage/backgroundSize are always both present (even as 'none'/
// 'auto' for none/paper/marble) so the key set never changes shape between
// renders — call sites spread this alongside a `background` shorthand, and
// React warns about shorthand/longhand conflicts if a longhand key appears
// or disappears across a rerender instead of just changing value.
function bgTextureStyle(texture) {
  const t = texture || activeBgTexture;
  if (t === 'dot') return { backgroundImage: dotPatternUri(C.line), backgroundSize:'60px 60px' };
  if (t === 'linen') return { backgroundImage: `repeating-linear-gradient(45deg, ${C.line} 0 1px, transparent 1px 15px), repeating-linear-gradient(-45deg, ${C.line} 0 1px, transparent 1px 15px)`, backgroundSize:'auto' };
  if (t === 'vein') return { backgroundImage: veinPatternUri(C.line), backgroundSize:'130px 130px' };
  // paper/marble: real grain (feTurbulence, see index.html's #grainFilter +
  // .grain-overlay) carries these as one fixed full-viewport layer instead of
  // a backgroundImage trick, toggled on by applyGrainIntensity() below.
  return { backgroundImage:'none', backgroundSize:'auto' };
}

// grain intensity — same apply/read pattern as icon stroke / radius density:
// a module-level `let`, an apply* fn called every render, a plain reader.
// Only the blend layer's CSS opacity goes through a custom property; the SVG
// filter's baseFrequency/type do NOT reliably take var()/CSS across engines,
// so they're mutated imperatively on the <feTurbulence> node instead.
const GRAIN_LEVELS = {
  subtle: { label:'Subtle', freq:0.9, op:0.15, vignette:0.03 },
  medium: { label:'Medium', freq:0.7, op:0.3,  vignette:0.05 },
  bold:   { label:'Bold',   freq:0.5, op:0.45, vignette:0.07 },
  // one bolder top-end preset the user asked for ("more texture, more
  // depth") — still alpha-only fractal noise, never a literal burnt/stained
  // paper PNG, so it stays in this app's restrained-premium lane rather
  // than crossing into the "cheap Instagram filter" look research flagged.
  deep:   { label:'Deep',   freq:0.4, op:0.6,  vignette:0.1 },
};
const GRAIN_ORDER = ['subtle','medium','bold','deep'];
let grainLevel = 'medium';
// 'marble' reuses the exact same singleton <feTurbulence> node as 'paper' —
// only one grain-family texture is ever active at once, so switching the
// filter's type/baseFrequency in place is one DOM write instead of a second
// full-viewport overlay. type="turbulence" (not fractalNoise) at a much
// lower base frequency + fewer octaves is what gives it the coarser, veined/
// marbled character instead of paper's fine grain.
function applyGrainIntensity(level, textureOn, texture) {
  if (GRAIN_LEVELS[level]) grainLevel = level;
  const cfg = GRAIN_LEVELS[grainLevel];
  const marble = (texture || activeBgTexture) === 'marble';
  try {
    const fe = document.getElementById('grainTurb');
    if (fe) {
      fe.setAttribute('type', marble ? 'turbulence' : 'fractalNoise');
      fe.setAttribute('baseFrequency', String(marble ? cfg.freq * 0.12 : cfg.freq));
      fe.setAttribute('numOctaves', marble ? '2' : '3');
    }
    document.documentElement.style.setProperty('--grain-opacity', textureOn ? cfg.op : 0);
    // whisper of vignette at the viewport edges, tied to the same texture
    // toggle/intensity rather than a separate setting — content itself is
    // never covered, this is a corner/edge-only radial wash
    document.documentElement.style.setProperty('--vignette-opacity', textureOn ? cfg.vignette : 0);
  } catch (e) {}
}
function grain() { return GRAIN_LEVELS[grainLevel] || GRAIN_LEVELS.medium; }

// ── shared "cozy depth" touches — one small vocabulary reused across every
// screen instead of a one-off treatment per surface. Warmth always comes
// from C.brown/palette at a low, consistent opacity ceiling (matching
// C.line's own rgba(...,0.08)), never from the grain layer itself.
function warmEdgeStyle(strength = 1) {
  const a = Math.round(7 * strength);
  return {
    position:'absolute', inset:0, pointerEvents:'none',
    background:`linear-gradient(180deg, rgba(107,76,42,${(a/100).toFixed(2)}), transparent 42%)`,
  };
}
const PHOTO_FRAME_SHADOW = 'inset 0 0 24px rgba(0,0,0,0.05)';
// staggered fade+rise for grid entrances — capped so a big garden doesn't
// stagger 40 cards one by one; beyond the cap everything just mounts at once
const CARD_STAGGER_CAP = 10;
function cardEntranceStyle(idx) {
  if (idx >= CARD_STAGGER_CAP) return {};
  return { animation:`cardIn ${MOTION.base}ms ${MOTION.out} both`, animationDelay:`${idx * 28}ms` };
}
function shimmerStyle() {
  return {
    backgroundImage:`linear-gradient(90deg, ${C.line}, rgba(255,255,255,0.5), ${C.line})`,
    backgroundSize:'200% 100%', animation:'shimmerSweep 1.4s linear infinite',
  };
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
// the "Next due" alternative to agoLabel for PlantCard's date line — a pure
// countdown of the same days/every ratio statusOf already derives from,
// never a second source of truth on the watering model
function dueLabel(days, every, compact) {
  const left = Math.round((every || 7) - days);
  if (left <= 0) return compact ? 'Due now' : (left === 0 ? 'Due today' : `Overdue ${-left}d`);
  if (compact) return `${left}d left`;
  return left === 1 ? 'Due tomorrow' : `Due in ${left} days`;
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

// "time with this plant" — addedAt is a real creation timestamp (savePlant
// in app.jsx), backfilled once to "now" for plants saved before this field
// existed (see the caulis_plants initializer), so an old plant's clock
// starts ticking from the day this shipped rather than a fabricated past.
// Milestones only surface as a callout for a short window right after they're
// crossed (MILESTONE_WINDOW_DAYS) — this is a passing moment, not a permanent
// stat readout sitting in the detail view forever.
const PLANT_MILESTONES = [
  { days: 30, label: 'One month with you' },
  { days: 182, label: 'Half a year with you' },
  { days: 365, label: 'One year with you' },
];
const MILESTONE_WINDOW_DAYS = 12;
function plantMilestoneLabel(addedAt) {
  if (!addedAt) return null;
  const ageDays = Math.floor((Date.now() - addedAt) / DAY_MS);
  if (ageDays < 30) return null;
  // yearly milestones past the first (2 years, 3 years, …) reuse the same
  // phrasing rather than growing a second label table
  let best = null;
  for (const m of PLANT_MILESTONES) if (ageDays >= m.days) best = m;
  if (ageDays >= 365) {
    const years = Math.floor(ageDays / 365);
    if (years >= 2) best = { days: years * 365, label: `${years} years with you` };
  }
  if (!best) return null;
  const sinceCrossing = ageDays - best.days;
  if (sinceCrossing < 0 || sinceCrossing > MILESTONE_WINDOW_DAYS) return null;
  return best.label;
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

// growth stage — "how overgrown the garden's watermark has become" driven by
// real, already-persisted account data: badges earned counts most (each one
// is a genuine milestone), plant count and total waterings logged add a
// smaller, gentler pull. Reads localStorage directly rather than threading
// props through every Sprig call site (8 of them, across 3 files) — same
// "read a persisted flag straight from storage" pattern already used by the
// secret badge checks and _badgeReduceMotion in caulis-badges.jsx.
function gardenGrowthStage() {
  try {
    const badges = JSON.parse(localStorage.getItem('caulis_badges') || '[]');
    const earned = Array.isArray(badges) ? badges.filter(b => !b.revoked).length : 0;
    const plants = JSON.parse(localStorage.getItem('caulis_plants') || '[]');
    const plantCount = Array.isArray(plants) ? plants.length : 0;
    const waterings = Array.isArray(plants)
      ? plants.reduce((s, p) => s + (Array.isArray(p.history) ? p.history.length : 0), 0)
      : 0;
    const score = earned * 3 + Math.min(plantCount, 30) * 0.4 + Math.min(waterings, 200) * 0.05;
    return Math.max(0, Math.min(6, Math.floor(score / 3.5)));
  } catch (e) { return 0; }
}

// tracks the distinct values a setting has ever been set to — used by a few
// "tried everything" secret badges (full accent spectrum, both theme modes,
// every corner-radius density). Same shape as the badge system's other
// persisted-flag reads: a plain localStorage array, best-effort, never throws.
function trackSeenValue(key, value) {
  try {
    const seen = JSON.parse(localStorage.getItem(key) || '[]');
    if (!seen.includes(value)) { seen.push(value); localStorage.setItem(key, JSON.stringify(seen)); }
  } catch (e) {}
}

function Sprig({ w = 260, h = 300, right = -26, bottom = -22, opacity = 0.2, onTap, growth }) {
  const leaf = (cx, cy, rot, scale = 1) => (
    <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${scale})`}>
      <ellipse cx="0" cy="-13" rx="7.5" ry="15" fill="none" stroke={C.brown} strokeWidth="1.4"/>
      <line x1="0" y1="0" x2="0" y2="-26" stroke={C.brown} strokeWidth="1.1"/>
    </g>
  );
  const bud = (cx, cy, r = 4) => <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.brown} strokeWidth="1.3"/>;
  const bloom = (cx, cy, rot = 0) => (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      {[0, 72, 144, 216, 288].map(a => (
        <ellipse key={a} cx="0" cy="-6" rx="3.2" ry="6" fill="none" stroke={C.brown} strokeWidth="1.1" transform={`rotate(${a})`}/>
      ))}
      <circle r="2" fill={C.brown} opacity="0.5"/>
    </g>
  );
  // stage 0 is the original 6-leaf sprig, unchanged — every stage above adds
  // one more tendril/bud/bloom element so a returning user with a bigger,
  // busier garden sees a visibly fuller corner watermark than they did on day one
  const stage = Math.max(0, Math.min(6, growth == null ? gardenGrowthStage() : growth));
  // every addition grows OFF the main stem via its own short connecting
  // tendril — never a bare floating leaf/bud/bloom — so each stage reads as
  // the same plant putting out one more shoot, not unrelated marks added
  // near it (a stray disconnected bud was the exact critique this fixes)
  const stages = [
    () => <g key="g1"><path d="M132 96 C 110 108, 96 128, 92 152" fill="none" stroke={C.brown} strokeWidth="1.1" strokeLinecap="round" opacity="0.85"/>{leaf(94,146,-40,0.85)}</g>,
    () => <g key="g2"><path d="M154 42 C 168 46, 178 52, 178 60" fill="none" stroke={C.brown} strokeWidth="1" strokeLinecap="round" opacity="0.8"/>{leaf(178,60,26,0.8)}</g>,
    () => <g key="g3"><path d="M126 150 C 118 142, 112 132, 112 122" fill="none" stroke={C.brown} strokeWidth="1" strokeLinecap="round" opacity="0.8"/>{bud(112,120,3.4)}</g>,
    () => <g key="g4"><path d="M196 14 C 190 18, 185 22, 184 26" fill="none" stroke={C.brown} strokeWidth="1" strokeLinecap="round" opacity="0.8"/>{bloom(184,22,-8)}</g>,
    () => <g key="g5"><path d="M146 76 C 160 92, 168 112, 162 134" fill="none" stroke={C.brown} strokeWidth="1" strokeLinecap="round" opacity="0.8"/>{leaf(163,132,50,0.75)}</g>,
    () => <g key="g6"><path d="M122 130 C 116 136, 110 142, 108 148" fill="none" stroke={C.brown} strokeWidth="1" strokeLinecap="round" opacity="0.8"/>{bloom(108,148,14)}<path d="M158 30 C 154 32, 151 32, 150 32" fill="none" stroke={C.brown} strokeWidth="1" strokeLinecap="round" opacity="0.8"/>{bud(150,32,3)}</g>,
  ];
  const sway = !onTap && stage > 0;
  return (
    <svg width={w} height={h} viewBox="0 0 260 300" onClick={onTap}
      style={{ position:'absolute', right, bottom, opacity,
        // 'visiblePainted' (not 'auto') on purpose — 'auto' makes the entire
        // 260x300 bounding box hit-testable including its transparent
        // majority, which silently ate every ambient badge tap on the Garden
        // screen (the one screen this prop is interactive on): any badge
        // landing in that bottom-right quadrant found this box's cursor:
        // pointer while walking its occlusion probe and got permanently
        // disqualified. Restricting the hit-test to actual painted strokes
        // shrinks the clickable/cursor area down to the drawn plant lines,
        // matching what a user can actually see as tappable.
        pointerEvents: onTap ? 'visiblePainted' : 'none', cursor: onTap ? 'pointer' : 'default',
        transformOrigin:'85% 95%', animation: sway ? 'sprigSway 9s ease-in-out infinite' : 'none' }}>
      <path d="M205 296 C 150 250, 120 180, 132 96 C 138 56, 158 30, 196 14"
        fill="none" stroke={C.brown} strokeWidth="1.4" strokeLinecap="round"/>
      {leaf(150,232,38)}{leaf(133,188,-34)}{leaf(126,150,30)}
      {leaf(128,112,-28)}{leaf(146,76,22)}{leaf(170,46,-18)}
      <circle cx="196" cy="14" r="4.5" fill="none" stroke={C.brown} strokeWidth="1.4"/>
      {stages.slice(0, stage).map(fn => fn())}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════
//  UI icons (simple line set)
// ════════════════════════════════════════════════════════════
function IconGarden({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" stroke={c} strokeWidth={isw(1.7)}/>
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" stroke={c} strokeWidth={isw(1.7)}/>
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" stroke={c} strokeWidth={isw(1.7)}/>
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" stroke={c} strokeWidth={isw(1.7)}/>
  </svg>);
}
function IconDrop({ s = 24, c = C.ink, a = 1, fill = false }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <path d="M12 3.5C12 3.5 5 11 5 15.5a7 7 0 0014 0C19 11 12 3.5 12 3.5Z"
      stroke={c} strokeWidth={isw(1.7)} fill={fill ? c : 'none'} strokeLinejoin="round"/>
  </svg>);
}
function IconScan({ s = 26, c = '#fff' }) {
  return (<svg width={s} height={s} viewBox="0 0 28 28" fill="none">
    <path d="M3 8.5V6a3 3 0 013-3h2.5M19.5 3H22a3 3 0 013 3v2.5M25 19.5V22a3 3 0 01-3 3h-2.5M8.5 25H6a3 3 0 01-3-3v-2.5"
      stroke={c} strokeWidth={isw(2)} strokeLinecap="round"/>
    <rect x="8" y="8" width="12" height="12" rx="2.5" stroke={c} strokeWidth={isw(2)}/>
    <path d="M3 14h22" stroke={c} strokeWidth={isw(1.4)} strokeLinecap="round" opacity="0.55"/>
  </svg>);
}
function IconPrint({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <path d="M7 9V4h10v5" stroke={c} strokeWidth={isw(1.7)} strokeLinejoin="round"/>
    <rect x="3.5" y="9" width="17" height="8" rx="2" stroke={c} strokeWidth={isw(1.7)}/>
    <rect x="7" y="14" width="10" height="6" rx="1" stroke={c} strokeWidth={isw(1.7)}/>
    <circle cx="17" cy="12.2" r="1" fill={c}/>
  </svg>);
}
function IconGear({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <circle cx="12" cy="12" r="3.2" stroke={c} strokeWidth={isw(1.7)}/>
    <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
      stroke={c} strokeWidth={isw(1.7)} strokeLinecap="round"/>
  </svg>);
}
function IconPlus({ s = 16, c = C.forest, w = 1.7 }) {
  return (<svg width={s} height={s} viewBox="0 0 16 16"><path d="M8 2.5v11M2.5 8h11" stroke={c} strokeWidth={isw(w)} strokeLinecap="round"/></svg>);
}
function IconBack({ s = 20, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M12.5 4 6.5 10l6 6" stroke={c} strokeWidth={isw(1.9)} strokeLinecap="round" strokeLinejoin="round"/></svg>);
}
function IconMore({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" opacity={a}><circle cx="5" cy="12" r="1.7" fill={c}/><circle cx="12" cy="12" r="1.7" fill={c}/><circle cx="19" cy="12" r="1.7" fill={c}/></svg>);
}
function IconDoctor({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" opacity={a}>
    <path d="M6 3v5a4 4 0 0 0 8 0V3" stroke={c} strokeWidth={isw(1.7)} strokeLinecap="round"/>
    <path d="M5 3h2M13 3h2" stroke={c} strokeWidth={isw(1.7)} strokeLinecap="round"/>
    <path d="M10 12v3.5a4.5 4.5 0 0 0 9 0V14" stroke={c} strokeWidth={isw(1.7)} strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="19" cy="12.5" r="2" stroke={c} strokeWidth={isw(1.7)}/>
  </svg>);
}
function IconCheck({ s = 18, c = '#fff', w = 2 }) {
  return (<svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M4 10.5 8 14.5 16 6" stroke={c} strokeWidth={isw(w)} strokeLinecap="round" strokeLinejoin="round"/></svg>);
}
function IconPin({ s = 13, c = C.brown }) {
  return (<svg width={s} height={s} viewBox="0 0 14 14" fill="none">
    <path d="M7 1.5c-2.5 0-4.3 1.9-4.3 4.2C2.7 8.8 7 12.5 7 12.5s4.3-3.7 4.3-6.8C11.3 3.4 9.5 1.5 7 1.5Z" stroke={c} strokeWidth={isw(1.2)}/>
    <circle cx="7" cy="5.7" r="1.5" stroke={c} strokeWidth={isw(1.2)}/>
  </svg>);
}
function IconEye({ s = 16, c = C.ink, a = 0.55 }) {
  return (<svg width={s} height={s} viewBox="0 0 20 20" fill="none" opacity={a}>
    <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" stroke={c} strokeWidth={isw(1.5)} strokeLinejoin="round"/>
    <circle cx="10" cy="10" r="2.4" stroke={c} strokeWidth={isw(1.5)}/>
  </svg>);
}
function IconEyeOff({ s = 16, c = C.ink, a = 0.55 }) {
  return (<svg width={s} height={s} viewBox="0 0 20 20" fill="none" opacity={a}>
    <path d="M2.5 2.5l15 15" stroke={c} strokeWidth={isw(1.5)} strokeLinecap="round"/>
    <path d="M8.3 4.4C8.85 4.14 9.42 4 10 4c5.5 0 8.5 6 8.5 6a15 15 0 0 1-2.3 3.1M5.7 5.7A15 15 0 0 0 1.5 10s3 6 8.5 6c1 0 1.9-.18 2.7-.5" stroke={c} strokeWidth={isw(1.5)} strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.2 8.2a2.4 2.4 0 0 0 3.3 3.3" stroke={c} strokeWidth={isw(1.5)} strokeLinecap="round"/>
  </svg>);
}
// a pipette/dropper — the "pick any color" affordance for the custom-color
// swatch slot, in the same restrained line-art language as IconDrop rather
// than a vibrant rainbow gradient tile (that read as garish next to the
// curated palette swatches)
function IconPipette({ s = 20, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <path d="M15.3 3.3l5.4 5.4-2.3 2.3-5.4-5.4 2.3-2.3Z" stroke={c} strokeWidth={isw(1.6)} strokeLinejoin="round"/>
    <path d="M16.4 8.4 7.5 17.3l-4 .7.7-4 8.9-8.9" stroke={c} strokeWidth={isw(1.6)} strokeLinejoin="round" strokeLinecap="round"/>
    <circle cx="5.2" cy="18.8" r="1.2" fill={c}/>
  </svg>);
}
function IconCopy({ s = 16, c = C.ink, a = 0.55 }) {
  return (<svg width={s} height={s} viewBox="0 0 20 20" fill="none" opacity={a}>
    <rect x="7" y="7" width="10.5" height="10.5" rx="2" stroke={c} strokeWidth={isw(1.5)}/>
    <path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3H4a1.5 1.5 0 0 0-1.5 1.5V12a1.5 1.5 0 0 0 1.5 1.5H7" stroke={c} strokeWidth={isw(1.5)} strokeLinecap="round"/>
  </svg>);
}

// ── curated reminder icon set — same line-art language/isw() convention as
// every Icon* above; a fixed, hand-drawn set rather than free SVG upload
// (no sanitization pipeline in this repo, no build step to vet an asset)
function IconMist({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <path d="M8 21v-7.5a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3V21" stroke={c} strokeWidth={isw(1.7)} strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 10.5V4l2-2 2 2v6.5" stroke={c} strokeWidth={isw(1.7)} strokeLinejoin="round"/>
    <path d="M17 8.5l2.2-1.2M18 12h2.5M17 15.5l2.2 1.2" stroke={c} strokeWidth={isw(1.5)} strokeLinecap="round"/>
  </svg>);
}
function IconFertilize({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <path d="M7 10.5h10l-1.3 9a2 2 0 0 1-2 1.7h-3.4a2 2 0 0 1-2-1.7l-1.3-9Z" stroke={c} strokeWidth={isw(1.7)} strokeLinejoin="round"/>
    <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" stroke={c} strokeWidth={isw(1.7)} strokeLinejoin="round"/>
    <path d="M12 13.5v5M9.7 15.5h4.6" stroke={c} strokeWidth={isw(1.5)} strokeLinecap="round"/>
  </svg>);
}
function IconSun({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <circle cx="12" cy="12" r="4.5" stroke={c} strokeWidth={isw(1.8)}/>
    <path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6" stroke={c} strokeWidth={isw(1.8)} strokeLinecap="round"/>
  </svg>);
}
function IconScissors({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <circle cx="6" cy="6.5" r="2.5" stroke={c} strokeWidth={isw(1.7)}/>
    <circle cx="6" cy="17.5" r="2.5" stroke={c} strokeWidth={isw(1.7)}/>
    <path d="M8 8.2 20 19M8 15.8 20 5" stroke={c} strokeWidth={isw(1.7)} strokeLinecap="round"/>
  </svg>);
}
function IconRepot({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <path d="M6 9h12l-1.4 10.2a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8L6 9Z" stroke={c} strokeWidth={isw(1.7)} strokeLinejoin="round"/>
    <path d="M4.5 9h15" stroke={c} strokeWidth={isw(1.7)} strokeLinecap="round"/>
    <path d="M9.5 9V6.5a2.5 2.5 0 0 1 5 0V9" stroke={c} strokeWidth={isw(1.7)}/>
  </svg>);
}
function IconClock({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <circle cx="12" cy="12" r="8.5" stroke={c} strokeWidth={isw(1.7)}/>
    <path d="M12 7.5V12l3.2 2" stroke={c} strokeWidth={isw(1.7)} strokeLinecap="round" strokeLinejoin="round"/>
  </svg>);
}
function IconCalendarCheck({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke={c} strokeWidth={isw(1.7)}/>
    <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" stroke={c} strokeWidth={isw(1.7)} strokeLinecap="round"/>
    <path d="M8.5 14.3l2.2 2.2 4.3-4.6" stroke={c} strokeWidth={isw(1.7)} strokeLinecap="round" strokeLinejoin="round"/>
  </svg>);
}
function IconThermometer({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <path d="M13.5 13.2V5.5a1.5 1.5 0 0 0-3 0v7.7a3.5 3.5 0 1 0 3 0Z" stroke={c} strokeWidth={isw(1.7)} strokeLinejoin="round"/>
    <circle cx="12" cy="16.5" r="1.4" fill={c}/>
  </svg>);
}
function IconRotate({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <path d="M4.5 12a7.5 7.5 0 0 1 12.6-5.5M19.5 12a7.5 7.5 0 0 1-12.6 5.5" stroke={c} strokeWidth={isw(1.7)} strokeLinecap="round"/>
    <path d="M17.5 3.5v3.5H14M6.5 20.5V17H10" stroke={c} strokeWidth={isw(1.7)} strokeLinecap="round" strokeLinejoin="round"/>
  </svg>);
}
function IconWipe({ s = 24, c = C.ink, a = 1 }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{opacity:a}}>
    <path d="M5 19c3-1 5.5-3.5 6.5-6.5C13 8 16 6 19 5.5" stroke={c} strokeWidth={isw(1.7)} strokeLinecap="round"/>
    <path d="M15.5 5.5c1 1.3 1 3-.3 4.7" stroke={c} strokeWidth={isw(1.5)} strokeLinecap="round" opacity="0.6"/>
    <circle cx="6" cy="19.5" r="1.4" fill={c}/>
  </svg>);
}

// key → { label, Icon } — SCHEDULE_ICON_ORDER drives picker grid order,
//'leaf'/'droplet' reuse the existing LeafOutline/IconDrop rather than
// redrawing what already exists in this file's visual language
const SCHEDULE_ICONS = {
  droplet:  { label: 'Water',    Icon: (p) => <IconDrop {...p}/> },
  mist:     { label: 'Mist',     Icon: (p) => <IconMist {...p}/> },
  fertilize:{ label: 'Fertilize',Icon: (p) => <IconFertilize {...p}/> },
  sun:      { label: 'Light',    Icon: (p) => <IconSun {...p}/> },
  scissors: { label: 'Prune',    Icon: (p) => <IconScissors {...p}/> },
  repot:    { label: 'Repot',    Icon: (p) => <IconRepot {...p}/> },
  rotate:   { label: 'Rotate',   Icon: (p) => <IconRotate {...p}/> },
  wipe:     { label: 'Clean',    Icon: (p) => <IconWipe {...p}/> },
  leaf:     { label: 'Leaf',     Icon: ({ s, c, a }) => <LeafOutline size={s} color={c} sw={1.4}/> },
  thermometer:{ label: 'Temp',   Icon: (p) => <IconThermometer {...p}/> },
  clock:    { label: 'Clock',    Icon: (p) => <IconClock {...p}/> },
  calendar: { label: 'Calendar', Icon: (p) => <IconCalendarCheck {...p}/> },
};
const SCHEDULE_ICON_ORDER = ['droplet','mist','fertilize','sun','scissors','repot','rotate','wipe','leaf','thermometer','clock','calendar'];
// simple keyword fallback, not real NLP — a sensible default beats a blank
// generic marker on every existing schedule that predates this feature
function defaultScheduleIcon(label) {
  const l = (label || '').toLowerCase();
  if (/mist|spray|humid/.test(l)) return 'mist';
  if (/water/.test(l)) return 'droplet';
  if (/fertil|feed|nutrient/.test(l)) return 'fertilize';
  if (/sun|light|rotate|turn/.test(l)) return /rotate|turn/.test(l) ? 'rotate' : 'sun';
  if (/prune|trim|cut/.test(l)) return 'scissors';
  if (/repot|pot/.test(l)) return 'repot';
  if (/clean|wipe|dust/.test(l)) return 'wipe';
  if (/temp/.test(l)) return 'thermometer';
  return 'calendar';
}
function scheduleIconKey(schedule) { return (schedule && schedule.icon && SCHEDULE_ICONS[schedule.icon]) ? schedule.icon : defaultScheduleIcon(schedule && schedule.label); }

// ════════════════════════════════════════════════════════════
//  Small shared components
// ════════════════════════════════════════════════════════════
// status indicator style — 'dot' is the original filled dot+glow ring,
// 'minimal' swaps it for a plain colored text abbreviation, for anyone who
// finds the dots visually noisy across a big grid. Same STATUS colors either
// way — this only changes the shape, never invents a second palette.
const STATUS_STYLES = { dot: { label:'Dot' }, minimal: { label:'Minimal' } };
const STATUS_STYLE_ORDER = ['dot', 'minimal'];
let statusStyle = 'dot';
function applyStatusStyle(v) { if (STATUS_STYLES[v]) statusStyle = v; }
function getStatusStyle() { return statusStyle; }
const STATUS_ABBR = { ok:'OK', soon:'SOON', needs:'NEEDS' };

// icon stroke weight — a single multiplier over every UI icon's line width,
// independent of corner-radius density (that scales *roundness*, this scales
// *boldness*) and independent of image treatment (that's photos, not icons).
// Icon components already take s/c/a props; isw() is the extra hook each one
// runs its literal stroke widths through.
const ICON_STROKE_LEVELS = {
  thin:    { label: 'Thin',    mult: 0.7 },
  regular: { label: 'Regular', mult: 1 },
  bold:    { label: 'Bold',    mult: 1.45 },
};
const ICON_STROKE_ORDER = ['thin', 'regular', 'bold'];
let iconStrokeMult = 1;
function applyIconStroke(level) { iconStrokeMult = (ICON_STROKE_LEVELS[level] || ICON_STROKE_LEVELS.regular).mult; }
function isw(v) { return Math.round(v * iconStrokeMult * 100) / 100; }

function StatusDot({ status, size = 9 }) {
  const s = STATUS[status];
  if (statusStyle === 'minimal') {
    return <span style={{ fontFamily:FONT_SANS, fontSize:8, fontWeight:800, letterSpacing:0.3, color:s.dot }}>{STATUS_ABBR[status]}</span>;
  }
  return <div style={{ width:size, height:size, borderRadius:999, background:s.dot, boxShadow:`0 0 0 3px ${s.ring}` }}/>;
}

// a location's optional {color,icon} tag — color is a PALETTE_ORDER key (or
// 'custom' + a stored hex), icon is a SCHEDULE_ICONS key. Reuses both existing
// sets rather than inventing a location-specific color/icon vocabulary.
function locationTagColor(tag) {
  if (!tag) return null;
  if (tag.color === 'custom' && tag.hex) return tag.hex;
  return (PALETTES[tag.color] || {}).swatch || null;
}
function locationTagIcon(tag) {
  if (!tag || !tag.icon || !SCHEDULE_ICONS[tag.icon]) return null;
  return SCHEDULE_ICONS[tag.icon].Icon;
}
function LocationPill({ label, tag }) {
  const col = locationTagColor(tag);
  const TagIcon = locationTagIcon(tag);
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      background: col ? `${col}17` : 'rgba(107,76,42,0.08)', color: col || C.brown,
      borderRadius:999, padding:'4px 10px 4px 8px',
      fontFamily:FONT_SANS, fontSize:11.5, fontWeight:500, letterSpacing:0.2,
    }}>
      {TagIcon ? <TagIcon s={11} c={col} a={1}/> : <IconPin/>} {label}
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
      {statusStyle !== 'minimal' && <span style={{ width:7, height:7, borderRadius:999, background:s.dot }}/>} {s.label}
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

// active-tab indicator treatment — independent of icon-stroke-weight (line
// boldness) and radius density (corner rounding scale): this is which visual
// device marks "you are here" on a regular (non-center) bottom-nav slot.
const NAV_INDICATOR_STYLES = {
  tint:      { label:'Icon & label tint', desc:'Color the icon and label — no extra shape' },
  underline: { label:'Underline', desc:'A short accent bar beneath the active icon' },
  pill:      { label:'Filled pill', desc:'A soft pill fills in behind the active icon' },
};
const NAV_INDICATOR_ORDER = ['tint','underline','pill'];

// nav bar shape/elevation — a container silhouette choice, distinct from
// radius density (which scales corner rounding proportionally everywhere):
// this changes whether the bar spans edge-to-edge or floats as an island.
const NAV_BAR_STYLES = {
  flat:     { label:'Flat bar', desc:'Edge-to-edge, anchored to the bottom' },
  floating: { label:'Floating pill', desc:'Rounded, inset from the edges with a shadow' },
};
const NAV_BAR_STYLE_ORDER = ['flat','floating'];

// haptic intensity — a silent, tactile-only axis (sound stays out of scope
// on purpose); scales the existing vibrate-pattern ms values in app.jsx's
// fireHaptic rather than inventing new patterns per kind.
const HAPTIC_INTENSITIES = {
  gentle:   { label:'Gentle',   mult:0.55 },
  standard: { label:'Standard', mult:1 },
  firm:     { label:'Firm',     mult:1.7 },
};
const HAPTIC_INTENSITY_ORDER = ['gentle','standard','firm'];

// which date line a PlantCard face shows — last-watered ("ago") is the long-
// standing default; next-due flips the same slot to a countdown instead.
// Pure display choice, no change to the underlying watering model.
const CARD_DATE_MODES = {
  last: { label:'Last watered' },
  due:  { label:'Next due' },
};
const CARD_DATE_MODE_ORDER = ['last','due'];
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
  C, FONT_SERIF, FONT_SANS, qrUrl, TINTS, statusOf, STATUS, agoLabel, dueLabel, todayGreeting, fmtLocalDate, wateringStats,
  ROOM_LIGHT_LEVELS, sunlightLevel, plantLightRange, roomLightMismatch,
  careCheckDue, adjustEveryForOutcome, HEALTH_TIERS, gardenHealthScore, plantMilestoneLabel,
  todayMidnight, midnightFromStamp, daysSinceMidnight, deriveWateredAt, WATER_SCHEMA,
  NAV_ACTIONS, NAV_ORDER, NAV_MAX, DEFAULT_NAV, normalizeNav, navTabOrder, navLabel, navColor, MILESTONES,
  NAV_INDICATOR_STYLES, NAV_INDICATOR_ORDER, NAV_BAR_STYLES, NAV_BAR_STYLE_ORDER,
  HAPTIC_INTENSITIES, HAPTIC_INTENSITY_ORDER, CARD_DATE_MODES, CARD_DATE_MODE_ORDER,
  PALETTES, PALETTE_ORDER, ACCENTS, ACCENT_ORDER,
  applyCustomPaletteColor, applyCustomAccentColor, contrastWarningFor,
  applyCustomBgColor, bgContrastWarningFor, rgbToHsv, hsvToRgb, hexToRgb, rgbToHex, relLuminance,
  BG_COLOR_ORDER, BG_TINTS, resolveBgColorChoice, darkFromBgChoice,
  RADIUS_DENSITY, RADIUS_ORDER, applyRadiusDensity, rad,
  IMAGE_TREATMENTS, IMAGE_TREATMENT_ORDER, applyImageTreatment,
  UI_DENSITY, UI_DENSITY_ORDER, applyUiDensity, ds,
  BG_TEXTURES, BG_TEXTURE_ORDER, applyBgTexture, bgTextureStyle,
  GRAIN_LEVELS, GRAIN_ORDER, applyGrainIntensity, grain,
  warmEdgeStyle, PHOTO_FRAME_SHADOW, cardEntranceStyle, CARD_STAGGER_CAP, shimmerStyle,
  STATUS_STYLES, STATUS_STYLE_ORDER, applyStatusStyle, getStatusStyle,
  ICON_STROKE_LEVELS, ICON_STROKE_ORDER, applyIconStroke,
  FONT_PAIRINGS, FONT_PAIRING_ORDER, applyFontPairing,
  Leaf, LeafOutline, Sprig, gardenGrowthStage, trackSeenValue,
  IconGarden, IconDrop, IconScan, IconPrint, IconGear, IconPlus, IconBack, IconCheck, IconPin, IconDoctor, IconMore, IconEye, IconEyeOff, IconCopy, IconPipette,
  IconMist, IconFertilize, IconSun, IconScissors, IconRepot, IconClock, IconCalendarCheck, IconThermometer, IconRotate, IconWipe,
  SCHEDULE_ICONS, SCHEDULE_ICON_ORDER, defaultScheduleIcon, scheduleIconKey,
  StatusDot, LocationPill, StatusTag, Specimen, locationTagColor, locationTagIcon,
  SEED_LOCATIONS,
  useWindowWidth, DESKTOP_BP, PLANT_QR_URL, applyTheme, APP_VERSION, MOTION,
});
