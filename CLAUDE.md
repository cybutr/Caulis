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
- **Custom color picker** (`caulis-core.jsx`): `PALETTE_ORDER`/`ACCENT_ORDER` end in a `'custom'` slot alongside the 7 curated presets. `SwatchRow` renders it as a calm outline `IconPipette` tile (`caulis-core.jsx`, same restrained line-art language as `IconDrop`) on a neutral tint — not a fixed rainbow conic-gradient (too vibrant next to the curated swatches) and not the currently-picked hex either (indistinguishable from a preset at default); a small tip-dot in `opt.ring`'s color only appears once the slot is actually selected. Selecting it reveals a `CustomColorPicker` (`caulis-screens.jsx`) — as of v179 this is a fully custom, fully in-theme picker (`HsvSquare` + `HueStrip`, plain HSV math via `rgbToHsv`/`hsvToRgb` in `caulis-core.jsx`, CSS gradients not canvas, `setPointerCapture` drag) plus a plain hex text input, replacing the earlier native `<input type="color">` wrapper — that native swatch popped the browser/OS's own un-restylable hue/saturation grid, which read as un-themed chrome and was called out as unacceptable. `mode` prop (`'accent'` default or `'bg'`) picks which contrast check to show. The independent custom colors (`customPaletteColor` = `caulis_custom_palette_color`, `customAccentColor` = `caulis_custom_accent_color`, `customBgColor` = `caulis_custom_bg_color`/`customBgEnabled` = `caulis_custom_bg_enabled`, all in `app.jsx`) each run through `applyCustomPaletteColor`/`applyCustomAccentColor`/`applyCustomBgColor` (`caulis-core.jsx`) — the first two *before* `applyTheme()`, `applyCustomBgColor` *after* (it overrides `C.bg` post-theme-pick) — every render. `applyCustomPaletteColor`/`applyCustomAccentColor` mutate `PALETTES.custom`/`ACCENTS.custom` in place via `deriveShadesFromHex()`/`deriveAccentDark()`, plain HSL math that derives a full light+dark forest/sage pair (or a single dark accent variant) from one picked hue, matching the curated palettes' "darken for light mode, brighten for dark mode" shape. `contrastWarningFor(hex)` computes real WCAG relative luminance/contrast ratio (not a guess) against both `C_LIGHT.bg` and `C_DARK.bg` for the accent/palette pickers (3:1, WCAG's UI-component/large-text minimum); `bgContrastWarningFor(hex)` does the stricter check for the background picker — body text (`C.ink`/`C.brown`) against the picked background, at the 4.5:1 AA text minimum, since this background sits behind all text, not just accent-colored UI. Neither ever blocks the pick, the color still applies. Settings → Appearance → Background & motion has the "Custom background color" toggle + picker; `index.html`'s pre-mount script also reads `caulis_custom_bg_enabled`/`caulis_custom_bg_color` to set `--bg` before first paint, same reasoning as the font-pairing/palette pre-mount blocks.
- **Icon weight** (`caulis-core.jsx`): `ICON_STROKE_LEVELS`/`ICON_STROKE_ORDER` (`thin`/`regular`/`bold`, `caulis_icon_stroke`) scale every UI icon's stroke width via `applyIconStroke()` → `isw(baseWidth)` — each `Icon*` function (not `Leaf`/`Sprig`, which stay fixed) runs its literal stroke widths through `isw()`. Independent axis from corner-radius density (that scales roundness, this scales line boldness).
- **Garden name** (`caulis_garden_name`, `app.jsx`): free-text override for the "Caulis" wordmark shown at the top of every mobile screen (`ScreenHead`'s `appName` prop, plus `GardenScreen`'s own inline header) — falls back to "Caulis" when empty. Desktop sidebar branding and the About screen keep the literal app name on purpose (app identity vs. garden nickname).
- **Font pairing** (`caulis_font_pairing`, `caulis-core.jsx`): `FONT_SERIF`/`FONT_SANS` are no longer literal font stacks — they're `'var(--font-serif)'`/`'var(--font-sans)'`, so the ~540 existing `fontFamily:FONT_SERIF/FONT_SANS` call sites across every file never had to change. `FONT_PAIRINGS`/`FONT_PAIRING_ORDER` (`classic`/`literary`/`editorial`) each name a serif+sans pair; `applyFontPairing(key)` writes the two CSS custom properties onto `document.documentElement` and, for any pairing other than `classic` (already eagerly loaded via `index.html`'s `<link>`), lazily injects that pairing's Google Fonts `<link>` — fetched only the instant a user actually picks it, never upfront. `index.html` seeds `--font-serif`/`--font-sans` on `:root` for pre-mount paint, and its dark-mode pre-mount `<script>` also reads `caulis_font_pairing`/`caulis_palette` from localStorage to set the same CSS vars (plus a palette-accurate splash icon color and `theme-color` meta) before first paint — necessarily duplicating `FONT_PAIRINGS`' href/family table and a light/dark hex table for the 7 curated palettes, since there's no build step to share modules with the static shell; `applyFontPairing()`/`applyTheme()` re-run the same work harmlessly once React mounts. Settings → Appearance renders all three pairings as live font-preview rows (each option's own name set in its own `serif`/`sans`), not a plain `OptionList`, so a pick is WYSIWYG.

## Cozy depth system (grain, warmth, hero banner, micro-interactions)

- **Real grain texture** (`index.html` + `caulis-core.jsx`): a single fixed full-viewport `.grain-overlay` div (`mix-blend-mode: overlay`, `isolation: isolate`) driven by an SVG `#grainFilter` (`feTurbulence type="fractalNoise"` → `feColorMatrix` zeroing RGB, alpha-only so it's theme/palette-neutral). `GRAIN_LEVELS`/`GRAIN_ORDER` (`subtle`/`medium`/`bold`/`deep`, `caulis_grain_intensity`) follow the exact same apply/read pattern as icon stroke/radius density: `applyGrainIntensity(level, textureOn)` called every render in `app.jsx`, a module-level `let grainLevel`, read via `grain()`. The SVG filter's `baseFrequency` does NOT reliably take `var()` across engines, so it's mutated imperatively on `#grainTurb`; only the blend layer's CSS opacity goes through `--grain-opacity`. Only active when Settings → Appearance → Background texture is `paper` (replaces the old two-dot-layer CSS fake); `dot`/`none` unchanged. Grain intensity sub-control reveals conditionally, same pattern as the custom color picker's swatch reveal. `deep` (v179) is one bolder top-end preset added on user request for "more texture/depth" — still alpha-only fractal noise, never a literal burnt/stained-paper PNG, so it stays in the restrained-premium lane rather than the "cheap Instagram filter" look earlier research flagged. Each `GRAIN_LEVELS` entry also carries a `vignette` value driving a second fixed full-viewport `.vignette-overlay` (`index.html`, `--vignette-opacity`) — a radial `rgba(107,76,42,…)` wash visible only at the extreme viewport edges (`transparent 60%` in the center), tied to the same texture toggle/intensity rather than a separate setting. Reads as "cozier," never covers content.
- **Warmth helpers** (`caulis-core.jsx`): `warmEdgeStyle(strength)` (a low-opacity `C.brown`-tinted top-edge gradient, ceiling matched to `C.line`'s own 0.08 opacity) and `PHOTO_FRAME_SHADOW` (a subtle inset shadow) are the one shared "aged photo" vocabulary — reused on the Garden hero banner and Plant Detail's hero frame, never invented per-screen. Texture stays monochrome/grayscale-alpha; warmth always comes from palette + typography.
- **Garden hero banner** (`GardenHeroBanner`, `caulis-screens.jsx`): a rotating photo collage above/below `GardenScreen`'s header. `pickGardenHero(plants)` scores candidates with a real photo — `+3` needs-water, `+2` recently-added (plant id proxy), `+1` not one of the last 5 featured (`caulis_hero_last`, rotating array) — tie-broken randomly, so "needs water" is a signal, never an override (never nags every day). Returns the winner (`plant`/`why`, used for the caption and `caulis_hero_last` bookkeeping) plus a deduped top-`HERO_TILES` (3) `group` for the collage. **Live rotation (v179)**: a `useEffect` re-picks whenever the day rolls over or the most-urgent (needs-water) plant id changes — tracked in a `lastPick` ref — without ever remounting the component; a 5-minute interval tick keeps that check alive across a long-open session even if `plants` itself doesn't change. Previously this only ever computed once per mount (the `!hero` guard), so the only way to see a "new" pick was a hard remount — what read as the whole page "hot reloading." A rotation now **crossfades**: the outgoing pick (`prevHero`) stays mounted, absolutely positioned, fading `opacity 1→0` over 420ms while the incoming one fades in via the `fade` keyframe, both via a shared `renderContent(hero, fadingOut)` closure so old/new render identically. Computed initial pick via a `useEffect` once `plants` actually has data (not a lazy `useState` initializer, which would freeze on an empty list if plants were still mid-sync on first mount). **Collage, not one full-bleed photo**: `compressImage` (`caulis-detail.jsx`) caps stored photos at 1024px, and stretching one such photo across the banner's full width via `objectFit:cover` forced a heavy upscale (worse on wide desktop layouts, worse again under Ken Burns) — visibly pixelated. Instead the banner tiles up to 3 photos: the scoring winner large on the left (`flex:'0 0 62%'`), up to two supporting candidates stacked smaller on the right — each tile covers far less display area so needs far less upscale from the same source resolution. Falls back to one full-bleed image only when a garden has just one plant with a photo. Warm-edge/frame/scrim overlays sit above the whole collage as one shared layer (not per-tile) so it reads as a single considered composition. Crossfades in (`heroIn`); the featured tile gets the one-way Ken Burns zoom (`kenBurns`, `scale(1)→1.06`, 16s), supporting tiles get a gentler `kenBurnsTile` (`scale(1)→1.03`, staggered `animationDelay`) since their tighter crop shows zoom artifacts sooner — both `reduceMotion`-gated. Ken Burns is deliberately NOT applied to the actively-swiped `PhotoCarousel`, only this hero and Plant Detail's hero frame. A broken/corrupt tile photo hides itself via `onError` rather than showing a broken-image icon. **Desktop sizing (v179)**: raised from a flat `maxWidth:640` (read as small/stranded next to a wide sidebar layout's available width) to `width:'100%', maxWidth:980` and `height:210` (was 150) — scales with the actual column instead of a fixed number well under it. Caption/name sit asymmetrically (left-anchored, `right:'26%'`, not centered) with a small rotated `LeafOutline` accent in the top-right corner, and always reference the single scoring winner even though multiple photos are shown, so the banner still reads as personal/specific rather than generic.
- **Hero banner is fully user-controlled**: Settings → Appearance → "Garden hero photo" (`caulis_hero_banner`: `off`/`below`/`above`) — off disables it outright regardless of motion settings, `below`/`above` place it relative to the greeting/title block.
- **Secret "Layout Lab"** (`GardenHeroBanner`): tapping the hero banner 7× (same discovery shape as the Developer panel's 7-tap version row, no PIN — this only repositions a decorative element) sets `caulis_layout_lab_unlocked` and shows a one-time toast. **v179 fix**: the previous "suppress the 2nd+ tap" approach still opened Plant Detail synchronously on tap 1 — Plant Detail is a full-screen overlay that covers the banner, so the user had to manually close it before tap 2 could ever land, well outside the 1.4s counting window, making 7 taps unreachable in practice (confirmed by a realistic tap-and-wait Playwright test; the earlier "passing" test had used synthetic same-frame event bursts that never let a real overlay render in between). Reworked to the classic single-tap-vs-burst pattern instead: a tap never opens synchronously. It arms a short deferred open (`openTimer`, 280ms — under the ~300–500ms double-tap threshold used everywhere); a second tap before it fires cancels the pending open and keeps counting, so a genuine rapid-tap burst never opens Plant Detail mid-sequence, while a truly isolated single tap still opens, just imperceptibly later. Once unlocked, a plain tap (checked in `onUp`) opens immediately again — the deferred-open dance is only needed pre-unlock. Long-pressing (480ms) the hero enters a real drag mode (dashed sage glow + "Layout Lab" pill + Done chip): dragging it up past the header moves it to `above`, dragging down returns it to `below`, persisted through the same `onSetHeroBanner`/`caulis_hero_banner` as the plain Settings toggle. This is additive — the Settings toggle stays the simple, discoverable path; Layout Lab is an extra secret layer for whoever finds it.
- **Watering micro-celebration** (`NeedsRow`, `caulis-screens.jsx`): swiping a row to water triggers a small pulse (`waterPulse`, spring easing) + soft radial glow (`waterGlow`) behind the `StatusTag`, plus 1-2 particles drifting UP and fading (`driftUp`) — reads as "growth," deliberately smaller than and distinct from the falling-confetti treatment reserved for water-all/badges/milestones. Gated by `reduceMotion` in JS (not just the global CSS override) since it's triggered imperatively, not mounted.
- **Staggered card entrance**: `cardEntranceStyle(idx)`/`CARD_STAGGER_CAP` (`caulis-core.jsx`, cap 10) fade+rise `PlantCard`s on Garden grid mount (`cardIn`, 28ms stagger); beyond the cap, or under `reduceMotion`, cards mount at final position with no animation.
- **Pull-to-refresh reskin** (`app.jsx`): the plain scaling dot is now a `LeafOutline` that rotates proportional to pull distance and switches its ring color `C.line` → `C.sage` at the trigger threshold, matching the `isw()` icon-stroke system.
- **Empty-state warmth**: `EmptyGarden`, Needs-Water's "all caught up", and Print Queue's empty state all get a slow `sproutBob` loop on their icon plus warmer copy (still gated by `reduceMotion`).
- **Toggle feedback** (`ToggleKnob`, `caulis-screens.jsx`): every Settings on/off switch is now this one shared component — a brief confirming ring-flash (`toggleFlash`) on change via `key={on}` remount, instead of an instant flat flip. Converted every existing hand-rolled toggle switch to it (search `ToggleKnob` — don't reintroduce a bespoke inline switch elsewhere).
- **Reduce motion**: every animation above is a pure CSS `@keyframes` + `animation` property, so it's automatically neutralized by the existing global `html[data-rm="1"] *` override (`index.html`) in addition to any JS-level `reduceMotion` gating already present — belt and suspenders, never rely on only one.
- **Custom reminders are edit-gated** (`caulis-detail.jsx`): `PlantDetail`'s view-mode Reminders section only renders once a plant has 1+ schedules (mark-done and tap-to-edit-existing stay available there) — no empty state, no "add" prompt cluttering the normal view. Adding a NEW reminder only happens from the Add/Edit plant form (`AddPlant`'s own "Reminders" `Field`, gated on `editing` — a brand-new unsaved plant has no id to attach a schedule to). `AddPlant` looks up the live plant from the `plants` prop each render (not the `editing` snapshot captured when the form opened) so a just-added reminder appears immediately.
- **Surfaces reached in the broadened pass** (previously flat/untouched relative to Garden/Plant Detail): the species-suggestion loading state in the Add/Edit form (`caulis-detail.jsx`) now shows two `shimmerStyle()` skeleton rows instead of a bare spinner+text line — `shimmerStyle()` (`caulis-core.jsx`) existed unwired until this pass. `ContextMenu` (long-press menu, `caulis-screens.jsx`) gained a `warmEdgeStyle` top wash on its sheet plus a `slideFromL` stagger per row. `MoveSheet`'s room list picked up the same stagger. The Scanner `Viewfinder` got a soft warm radial glow behind the frame (no animation added — the existing 2.4s scanline stays the only motion there). `DesktopSidebar` nav rows (`SidebarItem`, new component) gained a hover lift/tint and a warm left-accent bar on the active tab — desktop had received none of today's depth pass until now.

## Weekly Digest

- **`WeeklyDigest`** (`caulis-screens.jsx`), opened via Settings → Notifications digest preview / `onOpenDigest`: redesigned in v180 from a single-photo banner + two flat stat tiles into a genuinely richer "weekly recap" using the same tokens (`C`, `rad()`, `ds()`, `FONT_SERIF`/`FONT_SANS`, `warmEdgeStyle`/`PHOTO_FRAME_SHADOW`) as everything else shipped this pass.
- **Hero banner**: `DigestHeroCollage` reuses `GardenHeroBanner`'s exact multi-tile collage technique (up to 3 recently-watered photos, scoring winner large-left) instead of one stretched full-bleed photo — the same upscale/pixelation problem the Garden hero banner had, same fix, deliberately the same component family rather than a second parallel implementation so future collage tweaks only happen once. Asymmetric: a small "N waterings" chip breaks the top-right corner instead of a centered banner strip, caption anchored bottom-left with room cut out on the right for the chip.
- **New data surfaced**: `WeekActivityBars` — a plain 7-bar div chart (not a charting library, same restrained spirit as the admin panel's own gauges) showing watering counts per day of the last week, today's bar bolded. "Watered this week" lists each individual plant watered with a relative `agoLabel()` (not just a count). "Other reminders completed" aggregates every plant's `schedules[].history[]` within the week (same midnight-anchored stamp shape as watering history) — plant + schedule label + when, mirroring the push-digest copy's own reminder rollup so the in-app view is at least as rich as the notification body.
- **Layout**: an asymmetric stat row (one wide "headline" waterings tile with the activity chart inside, one narrower stack of smaller tiles) replaces the old rigid 2-up equal grid. Desktop caps content at `maxWidth:720` centered, rather than stretching edge-to-edge.

## Location tags (color + icon)

- **Scope choice**: tags attach to LOCATIONS, not individual plants — rooms are a small, stable, named set that repeats across many plant cards, so one tag pays off everywhere that room's name appears; per-plant tagging would be much higher cardinality for the same visual payoff.
- **Storage** (`app.jsx`): `locationTags` — `{ [roomName]: {color, icon} }` — persisted to `localStorage('caulis_location_tags')` via `setLocationTag(name, tag)`. `color` is a `PALETTE_ORDER` key (`forest`/`teal`/…/`custom`) or `'custom'` + a stored `hex`; `icon` is a `SCHEDULE_ICONS` key — both reuse the exact sets built for the global theme accent picker and custom reminder schedules, no parallel color/icon vocabulary invented. `renameLocation`/`removeLocation` (`app.jsx`) carry/drop the tag entry alongside the room name so it never survives under a stale key.
- **Deliberately local-only, not synced**: `locations[]` is part of the synced garden payload with a strict server-side DB column and a 3-way `mergeArray` (see `caulis-firebase.jsx`) — that merge path has caused real incidents when widened carelessly. `locationTags` is a per-device visual preference instead, kept out of `pushGarden`/`mergeGarden` entirely, so this feature adds zero risk to the sync path. A plain-string location with no tag renders exactly as before (dot/pin fallback) — fully additive, no migration needed for existing data.
- **Helpers** (`caulis-core.jsx`): `locationTagColor(tag)` / `locationTagIcon(tag)` resolve a tag to a hex string / icon component, `null` when untagged (every call site falls back to the pre-existing look).
- **Editor** (`LocationTagEditor`, `caulis-screens.jsx`): inline under each room row in Settings → Garden → Rooms (`LocationsManager`), toggled by tapping a small color-swatch/pipette button next to the room name. Reuses `SwatchRow` + `CustomColorPicker` for color and the `SCHEDULE_ICON_ORDER` 12-icon grid for icon, plus a "Clear tag" action.
- **Rendered wherever a location shows as a plain chip/label**: Garden screen's room filter chips and grouped-by-room `RoomHeader`, each `PlantCard`'s location line (small color dot), `LocationPill` (Print Queue rows), and the room-picker list in `MoveSheet` (also picked up a staggered fade-in as part of the broader depth pass).

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
              // NeedsWaterScreen ("Water" tab) surfaces every plant's due/soon
              // schedules in an "Other reminders" section below the watering
              // list — same due-status math as ScheduleRow (caulis-detail.jsx),
              // reused directly so mark-done there matches the plant-detail
              // behavior exactly; onMarkScheduleDone is markScheduleDone (app.jsx)
locations[]   // known room names (plain strings — see Location tags below for
              // the separate, local-only color/icon overlay keyed by these names)
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

`sw.js` line 1: `const CACHE = 'caulis-vN'` — bump N every time any file changes. Current: v180.
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

`DoctorOverlay` (`caulis-detail.jsx`) — vision chat over the Anthropic API via `doctorAsk()` (`caulis-perenual.jsx`, raw `fetch` + `anthropic-dangerous-direct-browser-access`). Reuses the existing `anthropicKey`. Carries the same `Sprig` botanical watermark every other full-screen overlay has (was missing it — a same-day audit found and fixed the gap). Model chosen in Settings → AI (`caulis_doctor_model`, default `claude-haiku-4-5`, toggle Haiku/Sonnet). Capped thread: last 3 exchanges (6 msgs) resent each call; photo attached as a base64 image block on its user turn. Entry points: nav action `doctor` (standalone, photo-only) and a "Ask the doctor" button on `PlantDetail` (passes plant data as `plantContext`). Both nav actions `add`/`doctor` route through `onNavAction` in `app.jsx`.

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
- Hero crossfade: `heroIn`, 420ms `cubic-bezier(.2,.8,.2,1)` on initial mount; a live rotation instead cross-dissolves outgoing/incoming picks over 420ms (`opacity`/`fade`, see Garden hero banner above). Ken Burns: `kenBurns`, one-way `scale(1)→scale(1.06)`, 16s linear — Garden hero banner's featured tile + Plant Detail hero frame only, never the actively-swiped carousel. Hero banner's smaller supporting collage tiles use the gentler `kenBurnsTile`, `scale(1)→scale(1.03)`, 16s linear.
- Watering micro-celebration: `waterPulse` (240-260ms spring) + `waterGlow` (700ms ease-out) + `driftUp` particles (600-700ms ease-out) — smaller than and distinct from the water-all/badge confetti.
- Toggle confirm: `toggleFlash`, 500ms ease-out ring, fires on every `ToggleKnob` value change.
- Empty-state bob: `sproutBob`, 4.5-5s ease-in-out infinite.
- Every animation above is `reduceMotion`-gated, either via the app's own JS check or the blanket `html[data-rm="1"] *` CSS override (`index.html`) that forces `animation-duration: 0.001ms` / `iteration-count: 1` — both exist, don't remove either.
