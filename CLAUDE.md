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
- Customization multiplier/preset pattern: a `caulis_*` localStorage value → an `apply*()` call in `app.jsx` (runs every render, no effect needed) → a module-level `let` in `caulis-core.jsx` read through a plain function (`rad()`, `ds()`, `getStatusStyle()`). Never a parallel styling mechanism or inline `<style>` — always through this same apply/read pair. `STATUS_STYLES`/`STATUS_STYLE_ORDER`/`applyStatusStyle`/`getStatusStyle` (`caulis-core.jsx`) toggle `StatusDot`/`StatusTag` between the classic dot+glow ring and a plain colored text abbreviation (`OK`/`SOON`/`NEEDS`) — wired in Settings → Appearance ("Status indicator").
- **Custom color picker** (`caulis-core.jsx`): `PALETTE_ORDER`/`ACCENT_ORDER` end in a `'custom'` slot alongside the 7 curated presets. `SwatchRow` renders it as a fixed rainbow conic-gradient tile (never the currently-picked hex — that would be indistinguishable from a preset at default); selecting it reveals a `CustomColorPicker` (`caulis-screens.jsx`) wrapping a real `<input type="color">` — the platform primitive, since this repo has no build step and no UI-library dependency to reach for instead. The two independent custom colors (`customPaletteColor` = `caulis_custom_palette_color`, `customAccentColor` = `caulis_custom_accent_color`, both in `app.jsx`) each run through `applyCustomPaletteColor`/`applyCustomAccentColor` (`caulis-core.jsx`) *before* `applyTheme()` every render — these mutate `PALETTES.custom`/`ACCENTS.custom` in place via `deriveShadesFromHex()`/`deriveAccentDark()`, plain HSL math that derives a full light+dark forest/sage pair (or a single dark accent variant) from one picked hue, matching the curated palettes' "darken for light mode, brighten for dark mode" shape. `contrastWarningFor(hex)` computes real WCAG relative luminance/contrast ratio (not a guess) against both `C_LIGHT.bg` and `C_DARK.bg`; `CustomColorPicker` shows a plain non-blocking warning below 3:1 (WCAG's UI-component/large-text minimum, appropriate since the accent is mostly icons/pills/headings) — it never blocks the pick, the color still applies.
- **Icon weight** (`caulis-core.jsx`): `ICON_STROKE_LEVELS`/`ICON_STROKE_ORDER` (`thin`/`regular`/`bold`, `caulis_icon_stroke`) scale every UI icon's stroke width via `applyIconStroke()` → `isw(baseWidth)` — each `Icon*` function (not `Leaf`/`Sprig`, which stay fixed) runs its literal stroke widths through `isw()`. Independent axis from corner-radius density (that scales roundness, this scales line boldness).
- **Garden name** (`caulis_garden_name`, `app.jsx`): free-text override for the "Caulis" wordmark shown at the top of every mobile screen (`ScreenHead`'s `appName` prop, plus `GardenScreen`'s own inline header) — falls back to "Caulis" when empty. Desktop sidebar branding and the About screen keep the literal app name on purpose (app identity vs. garden nickname).
- **Font pairing** (`caulis_font_pairing`, `caulis-core.jsx`): `FONT_SERIF`/`FONT_SANS` are no longer literal font stacks — they're `'var(--font-serif)'`/`'var(--font-sans)'`, so the ~540 existing `fontFamily:FONT_SERIF/FONT_SANS` call sites across every file never had to change. `FONT_PAIRINGS`/`FONT_PAIRING_ORDER` (`classic`/`literary`/`editorial`) each name a serif+sans pair; `applyFontPairing(key)` writes the two CSS custom properties onto `document.documentElement` and, for any pairing other than `classic` (already eagerly loaded via `index.html`'s `<link>`), lazily injects that pairing's Google Fonts `<link>` — fetched only the instant a user actually picks it, never upfront. `index.html` seeds `--font-serif`/`--font-sans` on `:root` for pre-mount paint, and its dark-mode pre-mount `<script>` also reads `caulis_font_pairing`/`caulis_palette` from localStorage to set the same CSS vars (plus a palette-accurate splash icon color and `theme-color` meta) before first paint — necessarily duplicating `FONT_PAIRINGS`' href/family table and a light/dark hex table for the 7 curated palettes, since there's no build step to share modules with the static shell; `applyFontPairing()`/`applyTheme()` re-run the same work harmlessly once React mounts. Settings → Appearance renders all three pairings as live font-preview rows (each option's own name set in its own `serif`/`sans`), not a plain `OptionList`, so a pick is WYSIWYG.

## Cozy depth system (grain, warmth, hero banner, micro-interactions)

- **Real grain texture** (`index.html` + `caulis-core.jsx`): a single fixed full-viewport `.grain-overlay` div (`mix-blend-mode: overlay`, `isolation: isolate`) driven by an SVG `#grainFilter` (`feTurbulence type="fractalNoise"` → `feColorMatrix` zeroing RGB, alpha-only so it's theme/palette-neutral). `GRAIN_LEVELS`/`GRAIN_ORDER` (`subtle`/`medium`/`bold`, `caulis_grain_intensity`) follow the exact same apply/read pattern as icon stroke/radius density: `applyGrainIntensity(level, textureOn)` called every render in `app.jsx`, a module-level `let grainLevel`, read via `grain()`. The SVG filter's `baseFrequency` does NOT reliably take `var()` across engines, so it's mutated imperatively on `#grainTurb`; only the blend layer's CSS opacity goes through `--grain-opacity`. Only active when Settings → Appearance → Background texture is `paper` (replaces the old two-dot-layer CSS fake); `dot`/`none` unchanged. Grain intensity sub-control reveals conditionally, same pattern as the custom color picker's swatch reveal.
- **Warmth helpers** (`caulis-core.jsx`): `warmEdgeStyle(strength)` (a low-opacity `C.brown`-tinted top-edge gradient, ceiling matched to `C.line`'s own 0.08 opacity) and `PHOTO_FRAME_SHADOW` (a subtle inset shadow) are the one shared "aged photo" vocabulary — reused on the Garden hero banner and Plant Detail's hero frame, never invented per-screen. Texture stays monochrome/grayscale-alpha; warmth always comes from palette + typography.
- **Garden hero banner** (`GardenHeroBanner`, `caulis-screens.jsx`): a full-bleed rotating plant photo above/below `GardenScreen`'s header. `pickGardenHero(plants)` scores candidates with a real photo — `+3` needs-water, `+2` recently-added (plant id proxy), `+1` not one of the last 5 featured (`caulis_hero_last`, rotating array) — tie-broken randomly, so "needs water" is a signal, never an override (never nags every day). Computed via a `useEffect` once `plants` actually has data (not a lazy `useState` initializer, which would freeze on an empty list if plants were still mid-sync on first mount). Crossfades in (`heroIn`) with a one-way Ken Burns zoom (`kenBurns`, 16s, `reduceMotion`-gated) — Ken Burns is deliberately NOT applied to the actively-swiped `PhotoCarousel`, only this static hero and Plant Detail's hero frame. Caption/name sit asymmetrically (left-anchored, `right:'26%'`, not centered) with a small rotated `LeafOutline` accent in the top-right corner, reading as an editorial corner note rather than a centered banner strip.
- **Hero banner is fully user-controlled**: Settings → Appearance → "Garden hero photo" (`caulis_hero_banner`: `off`/`below`/`above`) — off disables it outright regardless of motion settings, `below`/`above` place it relative to the greeting/title block.
- **Secret "Layout Lab"** (`GardenHeroBanner`): tapping the hero banner 7× (same discovery shape as the Developer panel's 7-tap version row, no PIN — this only repositions a decorative element) sets `caulis_layout_lab_unlocked` and shows a one-time toast. Once unlocked, long-pressing (480ms) the hero enters a real drag mode (dashed sage glow + "Layout Lab" pill + Done chip): dragging it up past the header moves it to `above`, dragging down returns it to `below`, persisted through the same `onSetHeroBanner`/`caulis_hero_banner` as the plain Settings toggle. This is additive — the Settings toggle stays the simple, discoverable path; Layout Lab is an extra secret layer for whoever finds it.
- **Watering micro-celebration** (`NeedsRow`, `caulis-screens.jsx`): swiping a row to water triggers a small pulse (`waterPulse`, spring easing) + soft radial glow (`waterGlow`) behind the `StatusTag`, plus 1-2 particles drifting UP and fading (`driftUp`) — reads as "growth," deliberately smaller than and distinct from the falling-confetti treatment reserved for water-all/badges/milestones. Gated by `reduceMotion` in JS (not just the global CSS override) since it's triggered imperatively, not mounted.
- **Staggered card entrance**: `cardEntranceStyle(idx)`/`CARD_STAGGER_CAP` (`caulis-core.jsx`, cap 10) fade+rise `PlantCard`s on Garden grid mount (`cardIn`, 28ms stagger); beyond the cap, or under `reduceMotion`, cards mount at final position with no animation.
- **Pull-to-refresh reskin** (`app.jsx`): the plain scaling dot is now a `LeafOutline` that rotates proportional to pull distance and switches its ring color `C.line` → `C.sage` at the trigger threshold, matching the `isw()` icon-stroke system.
- **Empty-state warmth**: `EmptyGarden`, Needs-Water's "all caught up", and Print Queue's empty state all get a slow `sproutBob` loop on their icon plus warmer copy (still gated by `reduceMotion`).
- **Toggle feedback** (`ToggleKnob`, `caulis-screens.jsx`): every Settings on/off switch is now this one shared component — a brief confirming ring-flash (`toggleFlash`) on change via `key={on}` remount, instead of an instant flat flip. Converted every existing hand-rolled toggle switch to it (search `ToggleKnob` — don't reintroduce a bespoke inline switch elsewhere).
- **Reduce motion**: every animation above is a pure CSS `@keyframes` + `animation` property, so it's automatically neutralized by the existing global `html[data-rm="1"] *` override (`index.html`) in addition to any JS-level `reduceMotion` gating already present — belt and suspenders, never rely on only one.
- **Custom reminders are edit-gated** (`caulis-detail.jsx`): `PlantDetail`'s view-mode Reminders section only renders once a plant has 1+ schedules (mark-done and tap-to-edit-existing stay available there) — no empty state, no "add" prompt cluttering the normal view. Adding a NEW reminder only happens from the Add/Edit plant form (`AddPlant`'s own "Reminders" `Field`, gated on `editing` — a brand-new unsaved plant has no id to attach a schedule to). `AddPlant` looks up the live plant from the `plants` prop each render (not the `editing` snapshot captured when the form opened) so a just-added reminder appears immediately.

## State Shape (`app.jsx`)

```js
plants[]      // { id, name, latin, location, days, every, light, care, fact,
              //   watering, benchmark, sunlight[], species_id, image, userImage,
              //   schedules[] }
              // schedules[]: { id, label, everyDays, lastDoneAt, history[] } — user-
              // defined recurring reminders (misting, fertilizing, anything), modeled
              // exactly like watering (lastDoneAt is midnight-anchored like wateredAt,
              // statusOf(days, everyDays) drives its status pill, no unit is stored —
              // the add/edit form's days/weeks toggle collapses to a plain everyDays int)
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

`sw.js` line 1: `const CACHE = 'caulis-vN'` — bump N every time any file changes. Current: v173.
Keep `APP_VERSION` in `caulis-core.jsx` in sync with the `sw.js` CACHE number.

Push payloads carry a `type` (`watering` | `reminder` | `digest`) that the `push` handler uses to pick a per-type `vibrate` pattern and a stable `tag` (with `renotify:true`, so a second same-type push replaces rather than stacks). Single-item watering/reminder pushes carry per-action signed tokens in `data` (`actionToken` for water/schedule-done, `snoozeToken` for snooze) minted by `signActionToken(gardenId, plantId, action, extra)` (`backend/src/auth.js`) — `notificationclick` looks up the right token for `e.action` and POSTs it + the action name to `/api/push/action`, which validates the signed action matches the button pressed before mutating anything. iOS Safari PWAs ignore `vibrate` entirely (no web-push vibration API) and don't render `image`/big-picture banners — richness there is limited to title/body/icon/actions; Android/Chrome gets the full set.

`push_subscriptions.watering_frequency_days` (default 1 = daily) lets a garden pick the watering/custom-reminder push cadence independent of its time-of-day — Settings → Notifications → "Watering ping frequency" (Daily / 2 days / 3 days / Weekly). `checkAndSendPushes` in `backend/src/server.js` gates the send on both `last_watering_sent_on !== today` (never sends twice same day) AND elapsed days since the last send `>= watering_frequency_days`. Digest keeps its fixed weekly cadence (day-of-week picker only, no separate frequency column).

## Notification settings & custom reminders

`push_subscriptions` (backend) carries per-garden schedule: `reminder_hour_utc` (default 8, converted client-side from the local hour shown in Settings → Notifications via `localHourToUtc`/`utcHourToLocal` in `app.jsx`), `digest_day_of_week` (0=Sun..6=Sat, default 1/Monday), `custom_reminders_enabled` (separate toggle from watering/digest — folds due custom reminders into the single daily push instead of sending a second one). `checkAndSendPushes` (`backend/src/server.js`) gates per-row against these instead of a hardcoded global time. `isDue(anchorMs, everyDays, snoozedUntil)` is the one shared due-calculation used by both watering (`plantNeedsWater`) and custom schedules (`dueSchedules`) — never duplicate the days-since-midnight math again. `buildWateringPush`/`buildDigestPush` combine watering + due schedules into one push per garden per day (never one push per reminder kind — that recreates the original spam pattern) and name a couple of plants/schedules when short (`listNames`), falling back to a count only when long.

## Watering Model

`wateredAt` (absolute midnight epoch) is the source of truth; `days` is derived via `daysSinceMidnight()`. `deriveWateredAt(p)` in `caulis-core.jsx` trusts a stored `wateredAt` only when `p.wv === WATER_SCHEMA`, else recomputes from the last `history` stamp, else `today - days`. Bump `WATER_SCHEMA` to invalidate previously-stamped data after a model change. Never re-introduce a synthetic day offset in the derive — it corrupts waterings synced from un-updated clients.

## Developer Panel

Hidden in Settings → About: tap the Version row 7× to reveal a "Developer" section, gated by a PIN (`localStorage caulis_dev_pin`, set on first use). Tools: water-all, bulk day shift, per-plant day set for the current garden, plus cross-garden node management (load any garden by key+password, edit dates in memory, push back). Client-side obscurity only — not real auth. "Lock & hide" clears `caulis_dev_revealed`.

## Doctor (AI plant chat)

`DoctorOverlay` (`caulis-detail.jsx`) — vision chat over the Anthropic API via `doctorAsk()` (`caulis-perenual.jsx`, raw `fetch` + `anthropic-dangerous-direct-browser-access`). Reuses the existing `anthropicKey`. Model chosen in Settings → AI (`caulis_doctor_model`, default `claude-haiku-4-5`, toggle Haiku/Sonnet). Capped thread: last 3 exchanges (6 msgs) resent each call; photo attached as a base64 image block on its user turn. Entry points: nav action `doctor` (standalone, photo-only) and a "Ask the doctor" button on `PlantDetail` (passes plant data as `plantContext`). Both nav actions `add`/`doctor` route through `onNavAction` in `app.jsx`.

**Agentic tools** (`DOCTOR_TOOLS` in `caulis-perenual.jsx`): `list_garden_plants` (lazy garden read — only sent when needed, keeps tokens low) and `suggest_correction` (proposes field edits to a saved plant). `doctorAsk({withTools})` returns `{content, stop_reason, text, toolUses}`; the overlay runs a capped 4-hop tool loop (`runTool`), executing tools client-side and feeding `tool_result` back. Tool plumbing is NOT persisted to `thread` — only final text + correction cards — so future turns don't resend it. A `suggest_correction` renders a polished accept/dismiss card; Apply calls `onApplyCorrection(plantId, changes)` → `applyCorrection` in `app.jsx` (mirrors edit-path `every`→`benchmark`).

**History**: last 3 chats persist to `localStorage('caulis_doctor_chats')` via `saveDoctorChats` (strips images oldest-first on quota). Overlay resumes the most recent chat for the current plant (or most recent overall) on open; header has new-chat (+) and history (clock) buttons. **Markdown**: assistant replies render through `MarkdownText` (bold/italic/code/bullets/numbered/headings); the latest reply types out via `TypewriterMarkdown` (~2.4s reveal, balances dangling `**`, blink caret). Premium polish: `doctorIn` fade-rise on bubbles, `bar` equalizer "examining…" indicator (keyframes in `index.html`). System prompt tightened to lead with the answer, ~120-word cap.

## Bottom Navigation

Customizable via Settings → Navigation bar. `navConfig` (`caulis_navbar`) is an array of `{action, center?}` slots normalized by `normalizeNav()` (`caulis-core.jsx`), up to `NAV_MAX` (7); editor supports add/remove/reorder/center. Actions in `NAV_ACTIONS`/`NAV_ORDER`. Tab actions call `setTab`; non-tab actions (`add`, `doctor`, `more`) call `onNavAction`. **Swipes and launch-tab respect the bar**: `navTabOrder(navConfig)` drives both the swipe `TAB_ORDER` and a mount effect that snaps to the first bar tab if the saved tab isn't present. `more` opens a sheet (`moreEl` in `app.jsx`) listing every action — guarantees access to anything not on the bar. Desktop uses `DesktopSidebar` (not customizable).

## Doctor — garden photos

Opening the doctor from a plant pre-seeds that plant's saved photo (`firstPhoto`) so you can ask without snapping a new one; `activePlant` (state, init from the `plant` prop) drives context + `suggest_correction` target and updates a chip in the composer. A leaf button in the composer opens a garden picker sheet (`pickGardenPlant`) to attach any saved plant's photo + set it as context. `imgBlock()` builds the Anthropic image block from a dataURL (base64) or a remote https URL, so both stored user photos and API images work.

## Animations

- Overlay slide-in: `translateY(26px → 0)` + fade, 320ms `cubic-bezier(.2,.8,.2,1)`.
- Card press: `scale(0.975)`, shadow softens, 180ms.
- Long-press threshold: 480ms; suppresses the subsequent click.
- Scan line: 2.4s `ease-in-out` loop. Spinner: 0.9s `linear` rotate.
- Undo pill: `popUp` spring animation.
- Print-all "Sent" state: 2600ms timeout.
- Card entrance: `cardIn`, `translateY(10px)→0` + fade, 240ms `MOTION.out`, 28ms stagger, capped at 10 cards (`cardEntranceStyle`).
- Shimmer sweep (`shimmerStyle`, `caulis-core.jsx`): `linear-gradient` sweep, 1.4s linear infinite — for async image-loading slots.
- Hero crossfade: `heroIn`, 420ms `cubic-bezier(.2,.8,.2,1)`. Ken Burns: `kenBurns`, one-way `scale(1)→scale(1.06)`, 16s linear — hero banner + Plant Detail hero frame only, never the actively-swiped carousel.
- Watering micro-celebration: `waterPulse` (240-260ms spring) + `waterGlow` (700ms ease-out) + `driftUp` particles (600-700ms ease-out) — smaller than and distinct from the water-all/badge confetti.
- Toggle confirm: `toggleFlash`, 500ms ease-out ring, fires on every `ToggleKnob` value change.
- Empty-state bob: `sproutBob`, 4.5-5s ease-in-out infinite.
- Every animation above is `reduceMotion`-gated, either via the app's own JS check or the blanket `html[data-rm="1"] *` CSS override (`index.html`) that forces `animation-duration: 0.001ms` / `iteration-count: 1` — both exist, don't remove either.
