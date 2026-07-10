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
function BadgeIconCalendar({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="5.5" width="16" height="14.5" rx="2" stroke={c} strokeWidth="1.5"/>
    <path d="M4 9.5h16" stroke={c} strokeWidth="1.4"/>
    <path d="M8 4v3M16 4v3" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8.5 13.5l2.2 2.2 4.8-4.8" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>);
}
function BadgeIconLantern({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="7" fill="none" stroke={c} strokeWidth="1.5"/>
    <path d="M12 3.2v2.6M12 18.2v2.6M4.2 12H2M22 12h-2.2M6.3 6.3l1.8 1.8M15.9 15.9l1.8 1.8M6.3 17.7l1.8-1.8M15.9 8.1l1.8-1.8" stroke={c} strokeWidth="1.3" strokeLinecap="round" opacity="0.55"/>
    <path d="M9.5 9.5a3.6 3.6 0 0 0 5 5" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>);
}
function BadgeIconDroplet({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 3.5c3 4 5.5 7.3 5.5 10.3a5.5 5.5 0 1 1-11 0C6.5 10.8 9 7.5 12 3.5Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>);
}
function BadgeIconCamel({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M3.5 17.5c1-4 3-6 5-6 1.2 0 1.8 1 2.6 1s1-1.2 2.2-1.2 2 1.2 3.2 1.2c1.6 0 2.7-1.5 3.8-.7" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 17.5v2.3M18 17.5v2.3" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="4.3" cy="10.5" r="1.3" fill="none" stroke={c} strokeWidth="1.3"/>
  </svg>);
}
function BadgeIconMoon({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M17.5 14.2A7.2 7.2 0 1 1 9.8 6.5a5.7 5.7 0 0 0 7.7 7.7Z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M18.5 4.5v2.4M17.3 5.7h2.4" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>);
}
function BadgeIconKey({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <circle cx="7.5" cy="14.5" r="4" stroke={c} strokeWidth="1.5"/>
    <path d="M10.8 11.2 19 3M16 6l2.5 2.5M18.3 3.7l2.2 2.2" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>);
}
function BadgeIconGamepad({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M6.5 8.5h11a3.5 3.5 0 0 1 3.4 4.3l-.6 2.5a2.6 2.6 0 0 1-4.6 1L14 14.5h-4l-1.7 1.8a2.6 2.6 0 0 1-4.6-1l-.6-2.5A3.5 3.5 0 0 1 6.5 8.5Z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M8 10.8v2.4M6.8 12h2.4" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="17" cy="11" r="0.9" fill={c}/>
    <circle cx="15" cy="13" r="0.9" fill={c}/>
  </svg>);
}
function BadgeIconViewfinder({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="3.2" stroke={c} strokeWidth="1.4"/>
  </svg>);
}
function BadgeIconCompass({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8.5" stroke={c} strokeWidth="1.5"/>
    <path d="M15.2 8.8 13 13l-4.2 2.2L11 11l4.2-2.2Z" stroke={c} strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="1.1" fill={c}/>
  </svg>);
}
function BadgeIconSunrise({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M6 15a6 6 0 0 1 12 0" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M3.5 15h17M12 5.5v2.4M5 8.5l1.7 1.7M19 8.5l-1.7 1.7" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M9 18.5h6" stroke={c} strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/>
  </svg>);
}
function BadgeIconClover({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 12C12 12 8 10.5 8 6.8a2.6 2.6 0 0 1 5.2 0" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M12 12C12 12 16 10.5 16 6.8a2.6 2.6 0 0 0-5.2 0" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M12 12C12 12 8 13.5 8 17.2a2.6 2.6 0 0 0 5.2 0" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M12 20.5V12" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M15.5 14.2 19 17.8M19 14.2l-3.5 3.6" stroke={c} strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/>
  </svg>);
}
function BadgeIconStarburst({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5M5.3 5.3l3.5 3.5M15.2 15.2l3.5 3.5M18.7 5.3l-3.5 3.5M8.8 15.2l-3.5 3.5" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="2.8" stroke={c} strokeWidth="1.4"/>
  </svg>);
}
function BadgeIconSpectrum({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M3.5 17.5a8.5 8.5 0 0 1 17 0" stroke={c} strokeWidth="1.4"/>
    <path d="M6.3 17.5a5.7 5.7 0 0 1 11.4 0" stroke={c} strokeWidth="1.4" opacity="0.7"/>
    <path d="M9.1 17.5a2.9 2.9 0 0 1 5.8 0" stroke={c} strokeWidth="1.4" opacity="0.45"/>
  </svg>);
}
function BadgeIconYinLeaf({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.5"/>
    <path d="M12 4a8 8 0 0 1 0 16 4 4 0 0 1 0-8 4 4 0 0 0 0-8Z" fill={c} opacity="0.85"/>
    <circle cx="12" cy="8" r="1.3" fill={C.panel}/>
    <circle cx="12" cy="16" r="1.3" fill={c}/>
  </svg>);
}
function BadgeIconPrism({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 3.5 20 18H4Z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
    <circle cx="12" cy="14" r="4.2" stroke={c} strokeWidth="1.3" opacity="0.6"/>
  </svg>);
}
function BadgeIconHouseFull({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M4 11.5 12 4l8 7.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.5 10v9.5h11V10" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M9.5 19.5V15h5v4.5" stroke={c} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M9 13.5c1-1.4 2-1.4 3 0 1-1.4 2-1.4 3 0" stroke={c} strokeWidth="1.1" strokeLinecap="round" opacity="0.7"/>
  </svg>);
}
function BadgeIconMap({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M9 4.5 4 6.5v13l5-2 6 2 5-2v-13l-5 2-6-2Z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M9 4.5v13M15 6.5v13" stroke={c} strokeWidth="1.2" opacity="0.6"/>
    <circle cx="9" cy="11" r="1.3" fill={c}/>
    <circle cx="15" cy="14.5" r="1.3" fill={c}/>
  </svg>);
}
function BadgeIconScale({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 3.5v17M7 6.5h10" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M4 8.5 7 6.5l3 2-3 5-3-5ZM17 8.5l3-2 3 2-3 5-3-5Z" stroke={c} strokeWidth="1.2" strokeLinejoin="round"/>
    <path d="M9 20.5h6" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>);
}
function BadgeIconOldFriend({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 20.3c-4.4-3-8-6.4-8-10.3a4.5 4.5 0 0 1 8-2.8 4.5 4.5 0 0 1 8 2.8c0 3.9-3.6 7.3-8 10.3Z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M12 12.5V8" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
    <path d="M12 8c0-1.6 1.4-2.4 1.4-2.4" stroke={c} strokeWidth="1.1" strokeLinecap="round" opacity="0.55"/>
  </svg>);
}
function BadgeIconSproutFace({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 21v-8.5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 12.5C12 12.5 6.5 12.5 6.5 7C11.9 7 12 12.5 12 12.5ZM12 12.5C12 12.5 17.5 12.5 17.5 7C12.1 7 12 12.5 12 12.5Z" fill="none" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/>
    <ellipse cx="9.6" cy="8.7" rx="0.85" ry="1.1" fill={c}/>
    <ellipse cx="14.4" cy="8.7" rx="0.85" ry="1.1" fill={c}/>
    <path d="M10.2 10.6c0.6 0.7 2 0.7 3.6 0" stroke={c} strokeWidth="1" strokeLinecap="round"/>
  </svg>);
}
function BadgeIconSeal({ s = 22, c = C.forest }) {
  return (<svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="10.5" r="6.5" stroke={c} strokeWidth="1.5"/>
    <path d="M9 10.7l2 2 4-4.2" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 16l-1.5 5 3.8-2 1.7 2 1.7-2 3.8 2-1.5-5" stroke={c} strokeWidth="1.3" strokeLinejoin="round"/>
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
  { n: 200, id: 'plants-200', name: 'Botanical Garden',  text: 'Two hundred plants. There is no more room.', Icon: BadgeIconArboretum },
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
  { id: 'variety-species', name: "Collector's Eye", text: 'Eight distinct species, no two alike.', Icon: BadgeIconSpecies,
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
  { id: 'documented-5', name: 'Full Gallery', text: 'Five plants, five photographs.', Icon: BadgeIconPortrait,
    check: ({ plants }) => plants.filter(p => p.userImage || (p.photos && p.photos.length)).length >= 5 },
  { id: 'variety-species-15', name: 'The Herbarium', text: 'Fifteen distinct species under one roof.', Icon: BadgeIconSpecies,
    check: ({ plants }) => new Set(plants.map(p => (p.latin || '').trim().toLowerCase()).filter(v => v && v !== '—')).size >= 15 },
  { id: 'on-schedule-16', name: 'Iron Watering Can', text: 'Sixteen waterings, never once late.', Icon: BadgeIconSteady,
    check: ({ plants }) => plants.some(p => longestOnScheduleStreak(p) >= 16) },
  { id: 'thriving-10', name: 'Green Thumb', text: 'Ten plants thriving, not one asking for water.', Icon: BadgeIconThriving,
    check: ({ plants }) => plants.length >= 10 && plants.every(p => statusOf(p.days, p.every, p.snoozedUntil) !== 'needs') },
  { id: 'garden-anniversary', name: 'One Year In', text: 'A full year of keeping something alive.', Icon: BadgeIconCalendar,
    check: ({ plants }) => {
      const stamps = plants.flatMap(p => (Array.isArray(p.history) ? p.history : []));
      if (!stamps.length) return false;
      const earliest = stamps.reduce((min, s) => (s < min ? s : min), stamps[0]);
      return (Date.now() - earliest) >= 365 * DAY_MS;
    } },
  { id: 'well-lit', name: 'Sun Room', text: 'Every plant matched to a room with the right light.', Icon: BadgeIconLantern,
    check: ({ plants, roomLight }) => plants.length >= 5 && !!roomLight &&
      plants.every(p => roomLight[p.location] && !roomLightMismatch(p, roomLight[p.location])) },
  // ── secret: not shown in the locked list until earned, discoverable only
  // by stumbling into the exact condition. Real conditions, no fake gating.
  { id: 'secret-night-owl', name: 'Night Owl', text: 'Tending the garden well past midnight.', Icon: BadgeIconMoon, secret: true,
    check: () => { const h = new Date().getHours(); return h >= 1 && h < 4; } },
  { id: 'secret-thirsty', name: 'High Maintenance', text: 'A plant that needs water every single day.', Icon: BadgeIconDroplet, secret: true,
    check: ({ plants }) => plants.some(p => p.every <= 1) },
  { id: 'secret-camel', name: 'Camel Plant', text: 'A plant that barely needs water at all.', Icon: BadgeIconCamel, secret: true,
    check: ({ plants }) => plants.some(p => p.every >= 45) },
  { id: 'secret-konami', name: 'Old Habits', text: 'Some codes never leave muscle memory.', Icon: BadgeIconGamepad, secret: true,
    check: () => { try { return localStorage.getItem('caulis_egg_konami') === '1'; } catch(e) { return false; } } },
  { id: 'secret-sprig', name: 'Leaf Me Alone', text: "Found what the corner sprig does when you won't stop.", Icon: BadgeIconSprout, secret: true,
    check: () => { try { return localStorage.getItem('caulis_egg_sprig') === '1'; } catch(e) { return false; } } },
  { id: 'secret-viewfinder', name: 'Nothing to Scan', text: 'Tapped the scanner viewfinder until it talked back.', Icon: BadgeIconViewfinder, secret: true,
    check: () => { try { return localStorage.getItem('caulis_egg_viewfinder') === '1'; } catch(e) { return false; } } },
  { id: 'variety-species-25', name: 'Living Encyclopedia', text: 'Twenty-five distinct species. You could write a field guide.', Icon: BadgeIconSpecies,
    check: ({ plants }) => new Set(plants.map(p => (p.latin || '').trim().toLowerCase()).filter(v => v && v !== '—')).size >= 25 },
  { id: 'on-schedule-30', name: 'Clockwork Gardener', text: 'Thirty waterings, never once late.', Icon: BadgeIconSteady,
    check: ({ plants }) => plants.some(p => longestOnScheduleStreak(p) >= 30) },
  // ── secret: same rules as above — real conditions, not shown until earned.
  // This batch leans hard into "tried everything" / "caught in the act" /
  // "found every other secret" territory, on purpose — the more of these a
  // returning user stumbles into, the more the ambient layer has to show.
  { id: 'secret-completionist', name: 'Every Corner Turned', text: 'Found every other hidden thing this app has to offer.', Icon: BadgeIconStarburst, secret: true,
    check: () => { try {
      return localStorage.getItem('caulis_egg_konami') === '1'
        && localStorage.getItem('caulis_egg_sprig') === '1'
        && localStorage.getItem('caulis_egg_viewfinder') === '1';
    } catch(e) { return false; } } },
  { id: 'secret-dawn', name: 'Dawn Patrol', text: 'Out in the garden before the sun’s properly up.', Icon: BadgeIconSunrise, secret: true,
    check: () => { const h = new Date().getHours(); return h >= 4 && h < 6; } },
  { id: 'secret-friday13', name: 'Unlucky Sprout', text: 'Tending the garden on a Friday the 13th.', Icon: BadgeIconClover, secret: true,
    check: () => { const d = new Date(); return d.getDay() === 5 && d.getDate() === 13; } },
  { id: 'secret-leap', name: 'Leap Day Gardener', text: 'A watering logged on the rarest date on the calendar.', Icon: BadgeIconStarburst, secret: true,
    check: () => { const d = new Date(); return d.getMonth() === 1 && d.getDate() === 29; } },
  { id: 'secret-spectrum', name: 'Full Spectrum', text: 'Tried on every accent color in the wardrobe.', Icon: BadgeIconSpectrum, secret: true,
    check: () => { try {
      const seen = JSON.parse(localStorage.getItem('caulis_seen_accents') || '[]');
      return ACCENT_ORDER.every(a => seen.includes(a));
    } catch(e) { return false; } } },
  { id: 'secret-two-sides', name: 'Two Sides of the Leaf', text: 'Seen the garden in both light and dark.', Icon: BadgeIconYinLeaf, secret: true,
    check: () => { try {
      const seen = JSON.parse(localStorage.getItem('caulis_seen_modes') || '[]');
      return seen.includes('light') && seen.includes('dark');
    } catch(e) { return false; } } },
  { id: 'secret-shapeshifter', name: 'Shape Shifter', text: 'Tried every corner on the radius scale.', Icon: BadgeIconPrism, secret: true,
    check: () => { try {
      const seen = JSON.parse(localStorage.getItem('caulis_seen_radius') || '[]');
      return RADIUS_ORDER.every(r => seen.includes(r));
    } catch(e) { return false; } } },
  { id: 'secret-monoroom', name: 'One Room Empire', text: 'Eight plants, one room, no compromise.', Icon: BadgeIconHouseFull, secret: true,
    check: ({ plants }) => {
      if (plants.length < 8) return false;
      const locs = new Set(plants.map(p => p.location).filter(Boolean));
      return locs.size === 1;
    } },
  { id: 'secret-sprawl', name: 'Sprawling Estate', text: 'Ten different rooms, all of them green.', Icon: BadgeIconMap, secret: true,
    check: ({ plants }) => new Set(plants.map(p => p.location).filter(Boolean)).size >= 10 },
  { id: 'secret-opposites', name: 'Opposites Thrive', text: 'One plant that barely drinks, one that never stops asking.', Icon: BadgeIconScale, secret: true,
    check: ({ plants }) => plants.some(p => p.every <= 1) && plants.some(p => p.every >= 45) },
  { id: 'secret-old-friend', name: 'Old Friend', text: 'Thirty waterings for one plant. That’s a relationship.', Icon: BadgeIconOldFriend, secret: true,
    check: ({ plants }) => plants.some(p => Array.isArray(p.history) && p.history.length >= 30) },
  { id: 'secret-well-traveled', name: 'Well Traveled', text: 'Visited three different gardens from one device.', Icon: BadgeIconCompass, secret: true,
    check: () => { try {
      const hist = JSON.parse(localStorage.getItem('caulis_gardens') || '[]');
      return Array.isArray(hist) && hist.length >= 3;
    } catch(e) { return false; } } },
  { id: 'secret-its-alive', name: 'It’s Alive', text: 'A plant named after the most famous carnivore in fiction.', Icon: BadgeIconSproutFace, secret: true,
    check: ({ plants }) => plants.some(p => ['audrey', 'audrey ii', 'seymour'].includes((p.name || '').trim().toLowerCase())) },
  // ── admin-only: check() always false — never earned through normal play,
  // only ever granted/revoked from the Admin panel's badge tool.
  { id: 'admin-verified', name: 'Verified by the Gardener', text: 'A stamp of approval, personally handed out.', Icon: BadgeIconSeal, adminOnly: true,
    check: () => false },
  { id: 'admin-beta', name: 'Beta Sprout', text: 'Here before it was finished.', Icon: BadgeIconKey, adminOnly: true,
    check: () => false },
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
//  interactive (pointer-events:none throughout). Deliberately `fixed` to
//  the viewport rather than living inside the scrolling content: it reads
//  as wallpaper behind the garden, not a decoration on any one row, so it
//  has to stay visible no matter how far the plant grid scrolls — an
//  absolutely-positioned band anchored to the top of the content used to
//  scroll away with the first screenful and leave nothing behind it.
// ════════════════════════════════════════════════════════════
// The layer itself, and every decorative element inside it (positioning
// wrapper, drift animation wrapper, connecting nothing-else), stays
// `pointer-events:none` throughout — that's what makes it safe to render
// underneath the entire app without risking the July gesture-bleed bug
// (a reorder-drag hit-region bleeding into a card's own swipe tracking).
// The ONLY element that ever gets `pointer-events:auto` is the small
// icon-sized hit target below (`_BadgeHit`), sized exactly to the icon it
// wraps — never the layer, the positioning wrapper, or anything larger.
function _BadgeHit({ def, size, dur, delay }) {
  const [bump, setBump] = useState(false);
  const [tip, setTip] = useState(false);
  const tipTimer = useRef(null);
  const bumpTimer = useRef(null);
  const tap = (e) => {
    e.stopPropagation();
    if (!_badgeReduceMotion()) {
      setBump(false);
      requestAnimationFrame(() => setBump(true));
      if (bumpTimer.current) clearTimeout(bumpTimer.current);
      bumpTimer.current = setTimeout(() => setBump(false), 520);
    }
    setTip(true);
    if (tipTimer.current) clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => setTip(false), 1700);
  };
  useEffect(() => () => {
    if (tipTimer.current) clearTimeout(tipTimer.current);
    if (bumpTimer.current) clearTimeout(bumpTimer.current);
  }, []);
  const active = bump || tip;
  return (
    <div style={{ position:'relative' }}>
      <div style={{ animation:`badgeDrift ${dur}s ease-in-out ${delay}s infinite`, opacity: active ? 0.9 : 0.16, transition:'opacity 200ms ease' }}>
        <div
          onClick={tap}
          role="button"
          aria-label={def.name}
          style={{
            width:size, height:size, display:'flex', alignItems:'center', justifyContent:'center',
            pointerEvents:'auto', cursor:'pointer', touchAction:'manipulation',
            animation: bump ? 'badgeNudge 520ms cubic-bezier(.3,1.8,.4,1)' : 'none',
          }}>
          <def.Icon s={size} c={C.sage}/>
        </div>
      </div>
      {tip && (
        <div style={{
          position:'absolute', bottom:'100%', left:'50%', transform:'translateX(-50%)', marginBottom:6,
          background:C.toast, color:'#fff', fontFamily:FONT_SANS, fontSize:11, fontWeight:600,
          padding:'5px 9px', borderRadius:8, whiteSpace:'nowrap', boxShadow:'0 6px 16px rgba(0,0,0,0.22)',
          pointerEvents:'none', animation:'popUp 180ms cubic-bezier(.2,.9,.3,1.2)',
        }}>{def.name}</div>
      )}
    </div>
  );
}

function AmbientBadgeLayer({ badges, enabled, density, isDesktop }) {
  const held = badges ? badges.filter(b => !b.revoked) : [];
  const wantVisible = !!enabled && held.length > 0;
  const [mounted, setMounted] = useState(wantVisible);
  const [shown_, setShown_] = useState(wantVisible);
  useEffect(() => {
    let t;
    if (wantVisible) { setMounted(true); t = setTimeout(() => setShown_(true), 20); }
    else { setShown_(false); t = setTimeout(() => setMounted(false), MOTION.base); }
    return () => clearTimeout(t);
  }, [wantVisible]);
  if (!mounted) return null;
  const cap = { few: 3, normal: 6, many: 10 }[density] || 6;
  const list = [...held].sort((a, b) => b.earnedAt - a.earnedAt).slice(0, cap);
  const bandH = (typeof window !== 'undefined' && window.innerHeight) || (isDesktop ? 900 : 700);
  return (
    <div
      style={{
        // z-index:1 (not 0) is load-bearing: every screen wraps its actual
        // content — headers, plant grids, settings accordions — in an
        // ancestor with an explicit z-index of 2 or higher (a pre-existing
        // convention to stay above the decorative Sprig watermark, which
        // sits at the implicit z-index:auto tier). At z-index:0 this layer
        // ties with that same z-index:auto tier and loses every DOM-order
        // tiebreak to each screen's own root wrapper — verified empirically,
        // badges landed unreachable on every screen. z-index:1 beats only
        // that inert, non-interactive tier; every real interactive surface
        // (grids/headers at 2-3, nav at 30, sheets/overlays at 40+) still
        // safely wins, unconditionally, regardless of DOM order.
        position:'fixed', top:0, left:0, right:0, bottom:0, overflow:'hidden', pointerEvents:'none', zIndex:1,
        opacity: shown_ ? 1 : 0, transition:`opacity ${MOTION.base}ms ${MOTION.out}`,
      }}
      aria-hidden="true">
      {list.map((b, i) => {
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
            <_BadgeHit def={def} size={size} dur={dur} delay={delay}/>
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

function _badgeReduceMotion() {
  try { if (document.documentElement.getAttribute('data-rm') === '1') return true; } catch (e) {}
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}

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
      if (_badgeReduceMotion()) {
        p.x = 0; p.y = 0; v.x = 0; v.y = 0;
        paint();
        rafId.current = null;
        return;
      }
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

  useEffect(() => () => {
    dragging.current = false;
    if (rafId.current != null) { cancelAnimationFrame(rafId.current); rafId.current = null; }
  }, []);

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
  const hidden = !!def.secret;
  return (
    <div title={hidden ? 'Secret badge' : def.name} style={{
      flexShrink:0, width:60, height:60, borderRadius:999, background:'transparent',
      border:'1.5px dashed rgba(45,80,22,0.22)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      {hidden
        ? <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:20, color:C.brown, opacity:0.45 }}>?</div>
        : <div style={{ opacity:0.45, display:'flex' }}><def.Icon s={24} c={C.brown}/></div>}
    </div>
  );
}

function BadgeShelf({ badges, curatedIds, isDesktop }) {
  const [open, setOpen] = useState(() => GS.get('caulis_badge_shelf_open', true));
  const toggle = () => setOpen(o => { GS.set('caulis_badge_shelf_open', !o); return !o; });
  if (!badges) return null;
  // "held" = has an un-revoked entry — what actually counts as earned for
  // display. A revoked entry stays in `badges` on purpose (see
  // toggleAdminBadge in caulis-screens.jsx) so the auto-unlock effect's
  // plain id-presence check doesn't silently re-grant it the next time its
  // check() re-evaluates true, which for almost every non-secret badge is
  // a permanent predicate that's already still true.
  const held = badges.filter(b => !b.revoked);
  const heldIds = new Set(held.map(b => b.id));
  const shownIds = Array.isArray(curatedIds) && curatedIds.length ? curatedIds.filter(id => heldIds.has(id)) : [...heldIds];
  const shownEarned = shownIds.map(id => held.find(b => b.id === id)).filter(Boolean).sort((a, b) => a.earnedAt - b.earnedAt);
  const locked = BADGE_DEFS.filter(d => !heldIds.has(d.id) && !d.adminOnly);
  if (!held.length) return null;
  return (
    <div style={{ background:C.panel, borderRadius:20, border:C.hair, boxShadow:'0 1px 2px rgba(43,42,38,0.03), 0 6px 16px rgba(45,80,22,0.04)', overflow:'hidden' }}>
      <div onClick={toggle} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', cursor:'pointer' }}>
        <div>
          <div style={{ fontFamily:FONT_SANS, fontSize:12, fontWeight:500, color:C.brown, opacity:0.72, letterSpacing:0.4, textTransform:'uppercase' }}>Badges</div>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:16, color:C.forest, marginTop:1 }}>{held.length} of {BADGE_DEFS.length} earned</div>
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

// ════════════════════════════════════════════════════════════
//  Dedicated badges view — mirrors WeeklyDigest's pattern exactly: a
//  full-screen slide-up overlay reached from a small entry point, rather
//  than a card living permanently in the Garden screen.
// ════════════════════════════════════════════════════════════
function BadgesView({ badges, onBack, isDesktop }) {
  // "held" = has an un-revoked entry — see toggleAdminBadge in
  // caulis-screens.jsx for why a revoked badge stays in the array (flagged)
  // instead of being removed outright.
  const earned = (badges || []).filter(b => !b.revoked);
  const earnedIds = new Set(earned.map(b => b.id));
  const earnedByDef = BADGE_DEFS.filter(d => earnedIds.has(d.id))
    .map(d => ({ def: d, at: earned.find(b => b.id === d.id).earnedAt }))
    .sort((a, b) => b.at - a.at);
  // adminOnly badges are never earnable through play (check() always
  // false) — they don't belong in a "here's what you could still earn"
  // list at all, admin-granted or not. Hiding them here (not just as a "?"
  // secret placeholder) is what actually matches the adminOnly intent;
  // leaving them in `locked` was showing their real name/icon/text to
  // every user who hadn't been personally granted one.
  const locked = BADGE_DEFS.filter(d => !earnedIds.has(d.id) && !d.adminOnly);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:52, background:C.bg, display:'flex', flexDirection:'column', animation:'slideUp 320ms cubic-bezier(.2,.8,.2,1)' }}>
      <div style={{ flexShrink:0, padding:'calc(18px + env(safe-area-inset-top)) 18px 14px', display:'flex', alignItems:'center', gap:12 }}>
        <div onClick={onBack} role="button" style={{ width:36, height:36, borderRadius:999, background:'rgba(45,80,22,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><IconBack/></div>
        <div>
          <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:22, color:C.forest, lineHeight:1.1 }}>Badges</div>
          <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.brown, opacity:0.65, marginTop:2 }}>{earned.length} of {BADGE_DEFS.length} earned</div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'0 18px 40px', display:'flex', flexDirection:'column', gap:22 }}>
        {earnedByDef.length > 0 && (
          <div>
            <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.5, textTransform:'uppercase', marginBottom:10 }}>Earned</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {earnedByDef.map(({ def, at }) => (
                <div key={def.id} style={{ display:'flex', alignItems:'center', gap:13, padding:'12px 14px', borderRadius:16, background:C.panel, border:C.hair }}>
                  <div style={{ flexShrink:0, width:48, height:48, borderRadius:999, background:'rgba(122,158,78,0.13)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <def.Icon s={24} c={C.forest}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:16, color:C.forest }}>{def.name}</div>
                    <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.6, marginTop:2 }}>{def.text}</div>
                  </div>
                  <div style={{ flexShrink:0, fontFamily:FONT_SANS, fontSize:11, color:C.brown, opacity:0.55, textAlign:'right', whiteSpace:'nowrap' }}>{new Date(at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {locked.length > 0 && (
          <div>
            <div style={{ fontFamily:FONT_SANS, fontSize:11, fontWeight:600, color:C.brown, opacity:0.6, letterSpacing:0.5, textTransform:'uppercase', marginBottom:10 }}>Locked</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {locked.map(def => {
                const hidden = !!def.secret;
                return (
                  <div key={def.id} style={{ display:'flex', alignItems:'center', gap:13, padding:'12px 14px', borderRadius:16, background:'transparent', border:'1px dashed rgba(45,80,22,0.18)' }}>
                    <div style={{ flexShrink:0, width:48, height:48, borderRadius:999, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {hidden
                        ? <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:20, color:C.brown, opacity:0.4 }}>?</div>
                        : <div style={{ opacity:0.4, display:'flex' }}><def.Icon s={22} c={C.brown}/></div>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:FONT_SERIF, fontStyle:'italic', fontWeight:600, fontSize:16, color:C.ink, opacity:0.7 }}>{hidden ? 'Secret badge' : def.name}</div>
                      <div style={{ fontFamily:FONT_SANS, fontSize:12, color:C.ink, opacity:0.5, marginTop:2 }}>{hidden ? 'Keep exploring to find this one.' : def.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  BADGE_DEFS, BADGE_BY_ID, computeSatisfiedBadgeIds,
  AmbientBadgeLayer, BadgeShelf, BadgesView,
});
