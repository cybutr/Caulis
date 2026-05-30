# Handoff: Caulis — Personal Plant Care Tracker (Mobile App)

## Overview
Caulis is a mobile app for tracking houseplant care. Users keep a "garden" of
plants, see which need watering, mark plants as watered, scan a QR code on a
plant's physical label to jump straight to it, print QR labels in batches, and
add new plants — auto-filling species data (photo, watering, sunlight, care
notes) from the **Perenual plant API**.

The aesthetic is a calm, Scandinavian **botanical field notebook**: warm
off-white paper, deep forest green + sage + warm brown, refined italic serif
display type, and a faint pressed-botanical watermark on every screen.

## About the Design Files
The files in this bundle are **design references created in HTML/React (via
in-browser Babel)** — working prototypes showing the intended look and behavior.
They are **not** production code to ship directly. The task is to **recreate
these designs in the target codebase's environment** using its established
patterns (e.g. React Native / Expo, SwiftUI, Flutter, or a PWA). If no codebase
exists yet, React Native + Expo is the natural fit for this phone-shaped app.

The prototype renders inside a simulated iPhone frame (`ios-frame.jsx`); in a
real build, that frame is just the device — implement the screens, not the bezel.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, interactions, and copy are
all defined. Recreate the UI to match, using the target platform's component
primitives. Exact tokens are in the **Design Tokens** section below.

---

## Information Architecture

A persistent **bottom tab bar** with 5 destinations. The center tab (QR Scanner)
is the primary action and is visually raised.

1. **Garden** — grid of all plants (home).
2. **Water** (Needs Water) — list of plants that are thirsty.
3. **Scan** (center, raised) — QR scanner; the primary action.
4. **Queue** (Print Queue) — plants queued for QR-label printing.
5. **Settings** — preferences + Perenual API key.

Two full-screen overlays slide up over any tab:
- **Plant Detail** — opened by tapping a plant card OR by scanning a QR code.
- **Add / Edit Plant** — opened by the + button (add) or the detail screen's
  pencil (edit). Same component, two modes.

Two bottom sheets:
- **Photo action sheet** (Take photo / Identify plant) in the Add/Edit form.
- **Move sheet** (reassign a plant's room) from the long-press context menu.

One context menu:
- **Long-press a plant card** (in Garden or Water) → Move / Edit / Remove.

---

## Screens / Views

### 1. Garden (home)
- **Purpose:** see the whole collection; entry point to every plant.
- **Layout:** vertical scroll. Header (56px top padding): leaf-in-circle mark +
  "Caulis" wordmark (italic serif, 30px) on the left, a circular + button (38px)
  on the right. Below: an uppercase live greeting (e.g. "SATURDAY EVENING",
  DM Sans 12.5px) and an italic-serif status line (27px) reading
  "{n} plants would love a drink." / "Everything looks happy today." / (empty)
  "Welcome to Caulis."
- **Filter bar:** horizontal pill row, two options — **All** and **Location**.
  Active pill = solid forest green fill, white text; inactive = white with
  hairline border. (Earlier "A–Z" and "Needs water first" were removed.)
- **Grid:** 2 columns, 14px gap, 18px side padding. Each **Plant Card**:
  - White panel, radius 22, padding 12, soft shadow
    (`0 1px 2px rgba(43,42,38,.04), 0 8px 22px rgba(45,80,22,.05)`),
    `0.5px solid rgba(45,80,22,.06)` border.
  - **Specimen image** block: height 96, radius 15. Shows the plant photo
    (object-fit: cover) over a tinted background; a faint leaf glyph + 135°
    hairline hatch show while loading / as fallback.
  - **Status indicator**: top-right, an 18px white circle holding a 9px dot
    with a colored 3px ring — green (ok) / amber (soon) / red (needs water).
  - Plant name: italic serif, 21px, forest green.
  - Location: DM Sans 10.5px, brown @ 70%.
  - Last-watered row: small water-drop outline + "Watered N days ago"
    (DM Sans 11.5px, ink @ 62%).
  - **Press:** scale 0.975, shadow softens (180ms).
  - **Long-press (~480ms):** opens the context menu (see below); suppresses the
    tap-to-open.
- **Location mode:** cards group under **Room headers** — pin icon + italic
  serif room name + hairline rule + count. Rooms sorted alphabetically.
- **Empty state** (no plants): centered. A 128px circle (sage @ 10% fill,
  dashed forest ring) containing a 58px leaf outline; "Your garden is empty"
  (italic serif 27px); subtext; a solid forest "Add your first plant" button.

### 2. Water (Needs Water)
- **Purpose:** the day's watering round.
- **Layout:** header (leaf mark + "Caulis", eyebrow "TODAY'S ROUND", title
  "{n} plants are thirsty" / "All caught up"). Then a vertical list (12px gap).
- **Needs Row:** white panel radius 18, padding 10. Left: 62px specimen
  thumbnail (radius 13). Middle: plant name (italic serif 20px) + "Watered N
  days ago · {location}". Right: a **status tag** pill (tinted fill, colored
  dot + label "Water soon" / "Needs water").
  - Sorted needs-water first, then water-soon.
  - Tap → detail. **Long-press → context menu.**
- **Empty:** check-in-circle, "Nothing to water", subtext.

### 3. Scan (QR Scanner) — primary action
- **Purpose:** scan a plant's physical QR label to open its detail screen.
- **Layout:** full-bleed dark "camera" background (radial green gradient +
  faint hatch + ghosted leaf outlines). Top: "Scan a plant tag" (white italic
  serif 24px) + subtitle. Center: a 212px **viewfinder** — 4 white corner
  brackets (40px, 3px, rounded outer corner) + an animated horizontal scan line
  (sage glow, sweeps top↔bottom over 2.4s). Bottom: a 74px round shutter button
  (white inner circle, forest scan glyph) + "Tap to simulate a scan".
- **Behavior:** tapping the shutter opens the Plant Detail for a target plant
  with a "Scanned" badge. (Real build: wire to the device camera + QR decoder;
  the QR payload is `caulis://plant/{id}` — parse the id and open that plant.)

### 4. Queue (Print Queue)
- **Purpose:** batch-print QR labels for plants.
- **Layout:** header eyebrow "PRINT QUEUE" + title "{n} tags ready"; top-right
  **Print all** button (solid forest; turns sage "Sent" with a check for ~2.6s
  after tap). Vertical list (12px gap).
- **Queue Row:** white panel radius 18, padding 12. Left→right: 48px plant
  thumbnail, a 50px QR-code tile (rendered from `caulis://plant/{id}`), name +
  latin + a location pill, and an × remove button.
- **Empty:** printer icon, "Queue is empty", subtext.

### 5. Settings
- **Layout:** header eyebrow "PREFERENCES" + title "Settings". Grouped cards
  (uppercase section label above each white rounded card):
  - **Garden:** Plants tracked / Locations / Default reminder time (8:00 AM).
  - **Notifications:** Watering reminders (toggle ON), Weekly garden digest
    (toggle OFF). Toggle = 44×26 pill, sage when on.
  - **Printing:** Label size (40 × 40 mm), Printer (Brother QL-820).
  - **Plant data · Perenual:** explanatory text + a monospace API-key input +
    Save button (turns sage "Saved" for ~1.8s); a status line with a dot —
    "Live mode — fetching from Perenual" when a key is set, else "Using
    built-in species library".
  - Footer: "Caulis · grown with care" (italic serif, brown @ 50%).

### 6. Plant Detail (overlay)
- **Opened from:** tapping a card, or scanning a QR (adds a "Scanned" badge).
- **Layout (scrollable):** sticky top bar — back button (left); right side shows
  the "Scanned" badge (if from scan) + a circular **edit (pencil)** button.
  - **Hero:** specimen image, height 196, radius 22 (plant photo, cover).
  - **Name block:** name (italic serif 34px, forest), latin (italic serif 16px,
    brown @ 75%), then a row of: location pill, status tag, "Watered N days ago".
  - **Mark as watered** button (full width, 52px, solid forest). On tap →
    becomes a sage "Watered today" pill-state (border + tint, check icon) AND a
    floating **Undo** pill appears at the bottom of the screen ("{name} watered"
    + Undo). Undo reverts the days value. The pill disappears on navigating away.
    No confirmation modal — scanning/opening is already intentional.
  - **Info tiles** (Perenual data): a 2-up row — **Light** ("Part shade ·
    Filtered shade") and **Watering** ("Average · every 7 days") — then full-
    width **Care** and **Fun fact** tiles. Below: "Care data & photo via
    Perenual" attribution line.
  - **QR block:** white card with "PLANT TAG" label, a 148px QR code
    (`caulis://plant/{id}`), "Scan to open {name}", and an **Add to print
    queue** button (toggles to sage "In print queue" + a "View print queue →"
    link).

### 7. Add / Edit Plant (overlay)
- **Modes:** Add (empty) or Edit (prefilled from a plant; title "Edit plant";
  button "Save changes" instead of "Add to garden").
- **Layout (scrollable, with a sticky bottom Save bar):**
  - **Photo area** (height 150, radius 20): shows the chosen image, or a
    placeholder ("tap to add a photo") with a camera badge top-right. Tapping it
    opens the **photo action sheet**:
    - **Take photo** → opens a real file picker; the chosen image becomes the
      user's own photo and overrides any preset (badge: "Your photo").
    - **Identify plant** → calls the Perenual identification flow; shows a
      **loading overlay** (spinner + "Identifying plant…", ~1.7s), then
      auto-fills Common name + Latin name and sets the preset species photo
      (badge: "Identified via Perenual").
  - **Common name** input.
  - **Latin name** input (italic serif).
  - **Location** — a **tag input**: a text field (+ commit button, also commits
    on Enter) for typing a new room, a "Selected:" chip when one is chosen
    (with an × to clear), and a "Previously used" wrap of tappable room pills.
    Typing a new room adds it to the known locations list.
  - **Save bar:** disabled (faded) until a Common name is entered; otherwise
    solid forest "Add to garden" / "Save changes".

---

## Interactions & Behavior
- **Tap card → detail; long-press card (480ms) → context menu** (Move / Edit /
  Remove). Remove uses a **red destructive** style. The long-press must suppress
  the subsequent tap.
- **Context menu** and both **bottom sheets** are full-width, slide up from the
  bottom over a 34%-black scrim, with a grab handle. Tapping the scrim closes.
- **Move sheet:** lists known rooms (current room checked) + a "New room…" input;
  picking a room reassigns the plant.
- **Water → Undo:** marking watered sets `days = 0`; Undo restores the previous
  `days`. Undo pill is transient and tied to the detail screen instance.
- **Print all:** sets a transient "Sent" confirmation state (~2.6s).
- **Overlays** animate in with `slideUp` (translateY 26px→0, fade, 320ms
  cubic-bezier(.2,.8,.2,1)). The Undo pill uses a `popUp` spring. The scan line
  uses a 2.4s ease-in-out loop. Spinner = 0.9s linear rotate.

## State Management
- **plants[]**: `{ id, name, latin, location, days, every, light, care, fact,
  watering, benchmark, sunlight[], species_id, image, userImage }`.
  - `days` = days since last watered; `every` = watering interval (days).
  - `image` = preset (API/library) photo URL; `userImage` = user's own (data
    URL) and **overrides** `image` everywhere when set.
- **Status** is derived: `r = days / every` → `r >= 1` needs (red),
  `r >= 0.7` soon (amber), else ok (green).
- **locations[]**: known room names (seeded + user-added).
- **queue[]**: plant ids queued for printing.
- **Navigation state:** active tab; detail target `{id, fromScan}`; form
  `{mode:'add'|'edit', plant}`; move target; context-menu target; printed flag.
- **Perenual key:** persisted in `localStorage` (`caulis_perenual_key`).

---

## Perenual API Integration (important)
Implemented in `caulis-perenual.jsx`, shaped 1:1 on the Perenual v2 API
(https://perenual.com/docs/api).

- **Endpoints used:**
  - `GET /api/v2/species-list?key=KEY&q=…` — search.
  - `GET /api/v2/species/details/{id}?key=KEY` — full record.
  - Identification: real product should POST the photo to the Perenual
    identification API (https://perenual.com/docs/identify/api). The prototype
    simulates a match (returns a random library species after ~1.7s).
- **Fields consumed:** `common_name`, `scientific_name[]`, `cycle`, `watering`
  ("Frequent"/"Average"/"Minimum"), `watering_general_benchmark {value, unit}`,
  `sunlight[]`, `care_level`, `default_image.regular_url`.
- **Field mapping → app** (`speciesCare()`):
  - `watering` → `every` days: Frequent 4 / Average 7 / Minimum 14 / None 21.
  - `sunlight[]` → `light` label (first two, title-cased, joined " · ").
  - `watering_general_benchmark` → `benchmark` string ("7 days").
  - `default_image.regular_url` → `image`.
- **Live vs library:** if an API key is saved, the service fetches live and
  falls back to the bundled library on any error; with no key it uses the
  library. The bundled library (~13 species) is hand-built to match Perenual's
  response shape so the app is fully functional offline.
- **⚠ CORS / key exposure:** calling Perenual directly from a browser may be
  blocked by CORS, and a client-side key is publicly visible. **Recommended
  production setup:** a small serverless proxy (Cloudflare Worker / Vercel /
  Netlify function) that holds the key server-side and forwards requests; point
  the app's `searchSpecies` / `getSpeciesDetails` / identify at the proxy URL.
- **Care notes:** Perenual's per-species care guides are a paid tier; the
  prototype hand-authors short `care`/`fact` copy. Decide whether to license the
  paid guides or keep curated copy.

## Design Tokens
Colors:
- Background / paper: `#FAFAF7`
- Panel (cards): `#FFFFFF`
- Forest green (primary / actions): `#2D5016`
- Sage (secondary accent / "alive"): `#7A9E4E`
- Warm brown (secondary text/detail): `#6B4C2A`
- Ink (body text): `#2A2A26`
- Hairline border: `rgba(45,80,22,0.08)` (0.5px)
- Status — ok dot `#6E9A3E`, soon dot `#C98A2B`, needs dot `#B4472E`
  (each with a 3px ring at ~18% of the same hue, and a ~12% "soft" fill for tags)
- Specimen tints (rotated per card): `#E7EDDE #EEEAE0 #E3EAD6 #ECE7DC #E9EEE2
  #EDE9DF #E6ECE0 #EFE9DE`

Typography:
- **Cormorant Garamond** (italic, 500/600/700) — app name, plant names, titles,
  section flourishes.
- **DM Sans** (400/500/600) — all UI labels, metadata, body, inputs.
- Uppercase labels: DM Sans, 11–12.5px, weight 600, letter-spacing 0.4–0.6px.

Radius: 11–14 (tiles/inputs), 15 (card image), 16 (buttons), 18 (rows), 20–22
(cards/hero/sheets), 999 (pills/dots/circular buttons).

Shadows: card `0 1px 2px rgba(43,42,38,.04), 0 8px 22px rgba(45,80,22,.05)`;
button `0 6px 16px rgba(45,80,22,.24)`; floating pill `0 10px 26px rgba(0,0,0,.28)`.

Spacing: 18px screen side padding; 14px grid gap; 12px list gap; 56px header top.

## Assets
- **Plant photos:** Wikimedia Commons via stable `Special:FilePath` URLs (CC-
  licensed). The species library lists the exact filenames in
  `default_image.regular_url`. In production, prefer Perenual's `default_image`
  URLs (with a key) or self-host. **Note:** Wikimedia's `Special:FilePath`
  redirect does not allow CORS-mode image loads, so images are loaded as plain
  `<img>` (no `crossorigin`); that's fine for display.
- **QR codes:** generated via `api.qrserver.com` from the payload
  `caulis://plant/{id}`. Replace with any QR lib (e.g. `qrcode`) in production.
- **Icons:** inline SVGs (garden grid, water drop, scan, printer, gear, pin,
  camera, sparkle, check, back, plus, edit pencil, trash). No icon font.
- **Botanical watermark:** the `Sprig` SVG (hand-drawn stem + leaves), absolute
  bottom-right, ~20% opacity, on every screen.
- No emoji.

## Files (in this bundle)
- `Caulis Plant Collection.html` — entry point; loads fonts, React/Babel, and
  the scripts below in order.
- `caulis-core.jsx` — palette, fonts, icons, the `Specimen` (image/placeholder)
  and shared components, status logic, live-date greeting, seed locations.
- `caulis-perenual.jsx` — **the API service layer + species library + field
  mapping + seed plants.** Start here for the integration.
- `caulis-screens.jsx` — Garden, Needs Water, Scanner, Print Queue, Settings,
  bottom nav, context menu, move sheet, empty states.
- `caulis-detail.jsx` — Plant Detail (water/undo, info tiles, QR) and Add/Edit
  form (photo sheet, identify, location tag input).
- `app.jsx` — router + all app state + action handlers.
- `ios-frame.jsx` — the simulated device bezel (prototype only; not part of the
  real app).
