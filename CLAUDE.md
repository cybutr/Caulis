# Caulis — Codebase Guide

## What This Is

In-browser React prototype (Babel transpiled, no build step). Design handoff for a mobile plant-care tracker. **Not production code** — recreate in React Native/Expo or equivalent for a real build.

Entry point: `Caulis Plant Collection.html` loads fonts, React/Babel, then the `.jsx` files in order.

## File Map

| File | Purpose |
|---|---|
| `caulis-core.jsx` | Palette (`C`), font vars, icons, `Specimen`, `statusOf`, shared primitives |
| `caulis-perenual.jsx` | Perenual API service, species library, `speciesCare()` field mapping, `SEED_PLANTS` |
| `caulis-screens.jsx` | Garden, NeedsWater, Scanner, PrintQueue, Settings, bottom nav, context menu, move sheet |
| `caulis-detail.jsx` | PlantDetail overlay, Add/Edit form, photo sheet, identify flow |
| `app.jsx` | All state + action handlers + screen router |
| `ios-frame.jsx` | Simulated iPhone bezel — prototype only, not part of a real app |

## Design Tokens

```js
const C = {
  bg: '#FAFAF7', panel: '#FFFFFF',
  forest: '#2D5016', sage: '#7A9E4E',
  brown: '#6B4C2A', ink: '#2A2A26',
  line: 'rgba(45,80,22,0.08)', hair: '0.5px solid rgba(45,80,22,0.08)',
};
const FONT_SERIF = '"Cormorant Garamond", serif'; // italic, plant names, titles
const FONT_SANS  = '"DM Sans", sans-serif';       // UI labels, body, inputs
```

Status colors: ok `#6E9A3E`, soon `#C98A2B`, needs `#B4472E`.

Radius scale: 11–14 tiles/inputs, 15 card image, 16 buttons, 18 rows, 20–22 cards/sheets, 999 pills.

Spacing: 18–22px side padding, 14px grid gap, 12px list gap, 56px header top.

## Coding Patterns

- All styling is **inline `style={{}}`** — no CSS files, no className styling.
- Never hardcode a color that exists in `C` — always `C.forest`, `C.sage`, etc.
- Icons are inline SVG functions (`Leaf`, `LeafOutline`, `IconGarden`, etc.) — no icon font or external lib.
- `Sprig` SVG (brown, ~20% opacity, absolute bottom-right) appears on every screen as botanical watermark.
- `statusOf(days, every)` returns `'needs' | 'soon' | 'ok'`; `STATUS[status]` gives dot/ring/soft/label.
- `agoLabel(days)` formats the watered-ago string.
- Plant images: `plant.userImage` overrides `plant.image` everywhere.
- QR payload format: `caulis://plant/{id}`. Generated via `qrUrl(data, size)`.

## State Shape (`app.jsx`)

```js
plants[]      // { id, name, latin, location, days, every, light, care, fact,
              //   watering, benchmark, sunlight[], species_id, image, userImage }
locations[]   // known room names
tab           // 'garden' | 'needs' | 'scanner' | 'print' | 'settings'
detail        // { id, fromScan } | null
form          // { mode:'add' } | { mode:'edit', plant } | null
moveTarget    // plant id | null
menuPlant     // plant | null
queue[]       // plant ids
printed       // bool (transient Print-all confirmation)
```

`days / every` ratio drives status: `>= 1` needs water, `>= 0.7` water soon, else ok.

## Perenual API (`caulis-perenual.jsx`)

- `searchSpecies(q, key)` — `/api/v2/species-list?q=…`
- `getSpeciesDetails(id, key)` — `/api/v2/species/details/{id}`
- `speciesCare(species)` — maps API fields to app shape:
  - `watering` → `every`: Frequent 4 / Average 7 / Minimum 14 / None 21
  - `sunlight[]` → `light` label
  - `default_image.regular_url` → `image`
- No key → uses bundled library (~13 species, same shape as API). Key saved to `localStorage('caulis_perenual_key')`.
- CORS/key-exposure warning: production needs a serverless proxy; never expose the key client-side.

## Service Worker

`sw.js` line 1: `const CACHE = 'caulis-vN'` — bump N every time any file changes. Current: v82.
Keep `APP_VERSION` in `caulis-core.jsx` in sync with the `sw.js` CACHE number.

## Watering Model

`wateredAt` (absolute midnight epoch) is the source of truth; `days` is derived via `daysSinceMidnight()`. `deriveWateredAt(p)` in `caulis-core.jsx` trusts a stored `wateredAt` only when `p.wv === WATER_SCHEMA`, else recomputes from the last `history` stamp, else `today - days`. Bump `WATER_SCHEMA` to invalidate previously-stamped data after a model change. Never re-introduce a synthetic day offset in the derive — it corrupts waterings synced from un-updated clients.

## Developer Panel

Hidden in Settings → About: tap the Version row 7× to reveal a "Developer" section, gated by a PIN (`localStorage caulis_dev_pin`, set on first use). Tools: water-all, bulk day shift, per-plant day set for the current garden, plus cross-garden node management (load any garden by key+password, edit dates in memory, push back). Client-side obscurity only — not real auth. "Lock & hide" clears `caulis_dev_revealed`.

## Animations

- Overlay slide-in: `translateY(26px → 0)` + fade, 320ms `cubic-bezier(.2,.8,.2,1)`.
- Card press: `scale(0.975)`, shadow softens, 180ms.
- Long-press threshold: 480ms; suppresses the subsequent click.
- Scan line: 2.4s `ease-in-out` loop. Spinner: 0.9s `linear` rotate.
- Undo pill: `popUp` spring animation.
- Print-all "Sent" state: 2600ms timeout.
