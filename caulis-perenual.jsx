// ════════════════════════════════════════════════════════════
//  Caulis — Perenual service layer + species library
//  Shaped 1:1 on the Perenual v2 API (perenual.com/docs/api).
//  Live mode activates when an API key is saved (Settings);
//  otherwise a bundled, schema-accurate library backs the
//  prototype so it is fully functional offline.
// ════════════════════════════════════════════════════════════

const WIKI = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const img = (file) => WIKI + file;

// A Perenual-shaped record: common_name, scientific_name[], cycle,
// watering, watering_general_benchmark{value,unit}, sunlight[],
// care_level, indoor, description, default_image{regular_url,...}.
// `_care` / `_fact` are app-side care copy (Perenual's care guide
// endpoint is a paid tier; we hand-author concise notes here).
const PERENUAL = [
  { id:1442, common_name:'Monstera', scientific_name:['Monstera deliciosa'], czech_names:['Monstera','Monstera děravá'], cycle:'Perennial',
    watering:'Average', watering_general_benchmark:{value:'7', unit:'days'},
    sunlight:['part shade','filtered shade'], care_level:'Medium', indoor:true,
    default_image:{ regular_url: img('Monstera_deliciosa3.jpg') },
    _care:'Water when the top 5cm of soil is dry. Wipe leaves monthly.',
    _fact:'Its leaf holes are called fenestrations — they let light reach lower leaves.' },

  { id:832, common_name:'Fiddle Leaf', scientific_name:['Ficus lyrata'], czech_names:['Fíkovník lourovitý','Fíkus lyrata'], cycle:'Perennial',
    watering:'Average', watering_general_benchmark:{value:'7', unit:'days'},
    sunlight:['full sun','part shade'], care_level:'Medium-High', indoor:true,
    default_image:{ regular_url: img('Ficus_lyrata.jpg') },
    _care:'Keep soil evenly moist, never soggy. Hates being moved.',
    _fact:'A single fiddle leaf can grow up to 45cm long indoors.' },

  { id:2056, common_name:'Snake Plant', scientific_name:['Sansevieria trifasciata'], czech_names:['Tchynin jazyk','Sanseviérie'], cycle:'Perennial',
    watering:'Minimum', watering_general_benchmark:{value:'14', unit:'days'},
    sunlight:['full shade','part shade','full sun'], care_level:'Low', indoor:true,
    default_image:{ regular_url: img('Sansevieria_trifasciata_1.jpg') },
    _care:'Let dry fully between drinks. Tolerates neglect well.',
    _fact:'NASA lists it among the best plants for filtering indoor air.' },

  { id:700, common_name:'Golden Pothos', scientific_name:['Epipremnum aureum'], czech_names:['Pothos zlatý','Epipremnum zlaté'], cycle:'Perennial',
    watering:'Average', watering_general_benchmark:{value:'6', unit:'days'},
    sunlight:['part shade','full shade'], care_level:'Low', indoor:true,
    default_image:{ regular_url: img('Epipremnum_aureum_31082012.jpg') },
    _care:'Water weekly; trailing vines love a humid spot.',
    _fact:'Nicknamed "Devil\u2019s Ivy" because it\u2019s nearly impossible to kill.' },

  { id:2110, common_name:'Peace Lily', scientific_name:['Spathiphyllum wallisii'], czech_names:['Lopatkovec','Spatifylum'], cycle:'Perennial',
    watering:'Frequent', watering_general_benchmark:{value:'4-5', unit:'days'},
    sunlight:['part shade','full shade'], care_level:'Medium', indoor:true,
    default_image:{ regular_url: img('Spathiphyllum_cochlearispathum_RTBG.jpg') },
    _care:'Keep consistently moist. Droops dramatically when thirsty.',
    _fact:'Its drooping leaves are an honest thirst signal — it perks back up fast.' },

  { id:2003, common_name:'String of Pearls', scientific_name:['Senecio rowleyanus'], czech_names:['Provázkovník','Senecio perlový'], cycle:'Perennial',
    watering:'Average', watering_general_benchmark:{value:'5', unit:'days'},
    sunlight:['full sun','part shade'], care_level:'Medium', indoor:true,
    default_image:{ regular_url: img('Senecio_rowleyanus.jpg') },
    _care:'Soak then dry out completely. Beads store water.',
    _fact:'Each "pearl" has a translucent window that lets in extra light.' },

  { id:1056, common_name:'Calathea', scientific_name:['Calathea orbifolia'], czech_names:['Kalatéa','Kalateja'], cycle:'Perennial',
    watering:'Frequent', watering_general_benchmark:{value:'6', unit:'days'},
    sunlight:['part shade'], care_level:'High', indoor:true,
    default_image:{ regular_url: img('Calathea_orbifolia.jpg') },
    _care:'Loves humidity and filtered water. Sensitive to tap minerals.',
    _fact:'It folds its leaves up at night — a movement called nyctinasty.' },

  { id:831, common_name:'Rubber Plant', scientific_name:['Ficus elastica'], czech_names:['Pryžovník','Fíkovník pryžový'], cycle:'Perennial',
    watering:'Average', watering_general_benchmark:{value:'7', unit:'days'},
    sunlight:['part shade','full sun'], care_level:'Low-Medium', indoor:true,
    default_image:{ regular_url: img('Ficus_elastica2.jpg') },
    _care:'Water when top soil dries. Dust the broad leaves often.',
    _fact:'Its sap was once used to make natural rubber.' },

  // — extra species the identifier / search can return —
  { id:2071, common_name:'ZZ Plant', scientific_name:['Zamioculcas zamiifolia'], czech_names:['Zamiokulkas'], cycle:'Perennial',
    watering:'Minimum', watering_general_benchmark:{value:'14', unit:'days'},
    sunlight:['full shade','part shade'], care_level:'Low', indoor:true,
    default_image:{ regular_url: img('Zamioculcas_zamiifolia_1.jpg') },
    _care:'Water sparingly once the soil is fully dry. Thrives on neglect.',
    _fact:'Its rhizomes store water, so it shrugs off a missed watering.' },

  { id:1109, common_name:'Spider Plant', scientific_name:['Chlorophytum comosum'], czech_names:['Zelenec chocholatý','Pavoučí rostlina'], cycle:'Perennial',
    watering:'Average', watering_general_benchmark:{value:'7', unit:'days'},
    sunlight:['part shade','full sun'], care_level:'Low', indoor:true,
    default_image:{ regular_url: img('Chlorophytum_comosum.jpg') },
    _care:'Keep lightly moist. Pups can be potted into new plants.',
    _fact:'It sends out baby "spiderettes" on long arching stems.' },

  { id:2475, common_name:'Bird of Paradise', scientific_name:['Strelitzia reginae'], czech_names:['Strelície královská','Rajský pták'], cycle:'Perennial',
    watering:'Average', watering_general_benchmark:{value:'7', unit:'days'},
    sunlight:['full sun','part shade'], care_level:'Medium', indoor:true,
    default_image:{ regular_url: img('Strelitzia_reginae0.jpg') },
    _care:'Water when the top 5cm dries. Loves warmth and bright light.',
    _fact:'Its flower looks like a tropical bird mid-flight.' },

  { id:1789, common_name:'Philodendron', scientific_name:['Philodendron hederaceum'], czech_names:['Filodendrón','Filodendron'], cycle:'Perennial',
    watering:'Average', watering_general_benchmark:{value:'7', unit:'days'},
    sunlight:['part shade','full shade'], care_level:'Low', indoor:true,
    default_image:{ regular_url: img('Philodendron_hederaceum_kz01.jpg') },
    _care:'Let the top of the soil dry between waterings.',
    _fact:'Heartleaf philodendron is one of the easiest vines to grow.' },

  { id:120, common_name:'Aloe Vera', scientific_name:['Aloe barbadensis miller'], czech_names:['Aloe pravé','Aloe vera'], cycle:'Perennial',
    watering:'Minimum', watering_general_benchmark:{value:'14', unit:'days'},
    sunlight:['full sun','part shade'], care_level:'Low', indoor:true,
    default_image:{ regular_url: img('Aloe_vera_flower_inset.png') },
    _care:'Soak thoroughly, then let dry out completely.',
    _fact:'Its leaf gel has been used to soothe skin for millennia.' },
];

// ── field mapping: Perenual record → Caulis plant care fields ──
const WATER_DAYS = { Frequent: 4, Average: 7, Minimum: 14, None: 21 };
const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function speciesCare(sp) {
  const sunlight = sp.sunlight || [];
  return {
    every:     sp._aiEvery || WATER_DAYS[sp.watering] || 7,
    light:     sunlight.slice(0, 2).map(titleCase).join(' · ') || 'Bright, indirect',
    care:      sp._care || sp.description || 'Water when the top of the soil feels dry.',
    fact:      sp._fact || `${sp.common_name} — care data via Perenual.`,
    watering:  sp.watering || 'Average',
    benchmark: sp.watering_general_benchmark ? `${sp.watering_general_benchmark.value} ${sp.watering_general_benchmark.unit}` : null,
    sunlight,
    image:     sp.default_image ? (sp.default_image.regular_url || sp.default_image.medium_url || null) : null,
    species_id: sp.id,
    czech:     (sp.czech_names && sp.czech_names[0]) || sp.czech || '',
  };
}

function searchLocalPlants(query) {
  const norm = s => s.toLowerCase().replace(/[-_]/g, ' ');
  const q = norm((query || '').trim());
  if (!q || q.length < 2) return [];

  const fromIndoor = INDOOR_PLANTS.filter(p =>
    norm(p.name).includes(q) || norm(p.latin).includes(q) || (p.czech && norm(p.czech).includes(q))
  );

  const fromPerenual = PERENUAL.filter(p =>
    norm(p.common_name).includes(q) ||
    p.scientific_name.some(s => norm(s).includes(q)) ||
    (p.czech_names && p.czech_names.some(s => norm(s).includes(q)))
  ).map(p => ({
    id: p.id,
    name: p.common_name,
    latin: p.scientific_name[0],
    czech: (p.czech_names && p.czech_names[0]) || '',
    isLibrary: true
  }));

  // Merge, prioritizing library matches (PERENUAL) then INDOOR_PLANTS
  const seen = new Set();
  const results = [];

  for (const p of fromPerenual) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      results.push(p);
    }
  }

  for (const p of fromIndoor) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      results.push(p);
    }
  }

  return results.slice(0, 7);
}

// ── service (live when key present, else bundled library) ──
// keys are cached locally for instant UI state, but the values that matter
// live server-side (garden.perenual_key / anthropic_key etc) — every save
// also PUTs to /api/garden/keys so the backend proxy can use them without
// the browser ever sending them straight to the third-party API again.
function _pushKeyToBackend(field, value) {
  const token = getActiveToken();
  if (!token) return;
  fetch(`${BACKEND_URL}/api/garden/keys`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ [field]: value }),
  }).catch(() => {});
}

let API_KEY = '';
try { API_KEY = localStorage.getItem('caulis_perenual_key') || ''; } catch (e) {}
function setApiKey(k) { API_KEY = k || ''; try { localStorage.setItem('caulis_perenual_key', API_KEY); } catch (e) {} _pushKeyToBackend('perenualKey', API_KEY); }
function hasApiKey() { return !!API_KEY; }

let PLANT_ID_KEY = '';
try { PLANT_ID_KEY = localStorage.getItem('caulis_plantid_key') || ''; } catch(e) {}
function setPlantIdKey(k) { PLANT_ID_KEY = k || ''; try { localStorage.setItem('caulis_plantid_key', PLANT_ID_KEY); } catch(e) {} _pushKeyToBackend('plantIdKey', PLANT_ID_KEY); }

let IDENTIFY_LANG = 'en';
try { IDENTIFY_LANG = localStorage.getItem('caulis_identify_lang') || 'en'; } catch(e) {}
function setIdentifyLang(lang) { IDENTIFY_LANG = lang || 'en'; try { localStorage.setItem('caulis_identify_lang', IDENTIFY_LANG); } catch(e) {} }

let HOUSE_PLANTS_KEY = '';
try { HOUSE_PLANTS_KEY = localStorage.getItem('caulis_houseplants_key') || ''; } catch(e) {}
function setHousePlantsKey(k) { HOUSE_PLANTS_KEY = k || ''; try { localStorage.setItem('caulis_houseplants_key', HOUSE_PLANTS_KEY); } catch(e) {} _pushKeyToBackend('housePlantsKey', HOUSE_PLANTS_KEY); }

let ANTHROPIC_KEY = '';
try { ANTHROPIC_KEY = localStorage.getItem('caulis_anthropic_key') || ''; } catch(e) {}
function setAnthropicKey(k) { ANTHROPIC_KEY = k || ''; try { localStorage.setItem('caulis_anthropic_key', ANTHROPIC_KEY); } catch(e) {} _pushKeyToBackend('anthropicKey', ANTHROPIC_KEY); }
function hasAnthropicKey() { return !!ANTHROPIC_KEY; }

const _wait = (ms) => new Promise(r => setTimeout(r, ms));

async function _wikiImage(latinName) {
  try {
    const base = latinName.replace(/['"]/g, '').split(' ').slice(0, 2).join(' ');
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(base)}`);
    if (!r.ok) return null;
    const d = await r.json();
    return d.thumbnail?.source || null;
  } catch(e) { return null; }
}

// czech name via Wikipedia's cross-language link (cs) for the latin name
async function _czechName(latinName) {
  try {
    const base = latinName.replace(/['"]/g, '').split(' ').slice(0, 2).join(' ');
    const u = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(base)}&prop=langlinks&lllang=cs&format=json&origin=*`;
    const r = await fetch(u);
    if (!r.ok) return '';
    const pages = (await r.json())?.query?.pages || {};
    for (const k in pages) { const ll = pages[k].langlinks; if (ll && ll[0]) return ll[0]['*'] || ''; }
  } catch(e) {}
  return '';
}

function _normalizeHP(p) {
  return {
    id: p.id,
    common_name: (p['Common name'] || [])[0] || p['Latin name'] || '',
    scientific_name: [p['Latin name'] || ''],
    watering: p['Watering'] || 'Average',
    sunlight: [p['Light ideal'] || p['Light tolered'] || 'Bright indirect light'].filter(Boolean),
    default_image: { regular_url: (p.img || [])[0] || null },
    description: p['Description'] || '',
    care_level: p['Difficulty'] || '',
  };
}

async function _hpSearch(q) {
  if (!HOUSE_PLANTS_KEY || !q) return [];
  try {
    const clean = q.replace(/['"]/g, '').split(' ').slice(0, 2).join(' ');
    const r = await fetch(`https://house-plants2.p.rapidapi.com/search?query=${encodeURIComponent(clean)}`, {
      headers: { 'X-RapidAPI-Key': HOUSE_PLANTS_KEY, 'X-RapidAPI-Host': 'house-plants2.p.rapidapi.com' },
    });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch(e) { return []; }
}

async function _hpGetByName(latinName) {
  const results = await _hpSearch(latinName);
  const match = results.find(p => (p['Latin name']||'').toLowerCase() === latinName.toLowerCase()) || results[0];
  if (!match) return null;
  const norm = _normalizeHP(match);
  if (!norm.default_image?.regular_url) norm.default_image = { regular_url: await _wikiImage(latinName) };
  return norm;
}

// succulents/cacti need far less water — sensible default when no DB hit
const _SUCCULENT_GENERA = ['euphorbia','aloe','agave','cactus','opuntia','echeveria','sedum','crassula','sansevieria','haworthia','kalanchoe','gasteria','sempervivum','mammillaria','cereus','senecio','aeonium','lithops','pachypodium','yucca'];
function _heuristicCare(latinName) {
  const genus = (latinName || '').toLowerCase().split(' ')[0];
  if (_SUCCULENT_GENERA.includes(genus)) {
    return { watering: 'Minimum', watering_general_benchmark: { value: '14', unit: 'days' }, sunlight: ['full sun', 'part shade'],
      _care: 'Let the soil dry out completely between waterings. Tolerates drought well.',
      _fact: `${latinName} is a succulent — it stores water in its tissue, so err on the side of underwatering.` };
  }
  return { watering: 'Average', sunlight: ['Bright indirect light'] };
}

// ── AI care review: Claude evaluates the resolved record, fills gaps,
//    corrects botanically wrong values (e.g. a cactus marked "Frequent") ──
const WATER_LABELS = ['Frequent', 'Average', 'Minimum', 'None'];

function _aiCacheGet(latin) {
  try {
    const all = JSON.parse(localStorage.getItem('caulis_ai_care') || '{}');
    return all[latin] || null;
  } catch(e) { return null; }
}
function _aiCacheSet(latin, result) {
  try {
    const all = JSON.parse(localStorage.getItem('caulis_ai_care') || '{}');
    all[latin] = result;
    localStorage.setItem('caulis_ai_care', JSON.stringify(all));
  } catch(e) {}
}

function _applyAiCare(record, ai) {
  const out = { ...record };
  if (ai.name && String(ai.name).trim()) out._aiName = String(ai.name).trim();
  if (Number.isFinite(ai.every)) {
    out._aiEvery = Math.min(365, Math.max(1, Math.round(ai.every)));
    out.watering_general_benchmark = { value: String(out._aiEvery), unit: 'days' };
  }
  if (ai.watering && WATER_LABELS.includes(ai.watering)) out.watering = ai.watering;
  if (Array.isArray(ai.sunlight) && ai.sunlight.length) out.sunlight = ai.sunlight;
  if (ai.care) out._care = ai.care;
  if (ai.fact) out._fact = ai.fact;
  if (ai.czech && !out.czech) out.czech = ai.czech;
  out._source = (out._source || 'library') + ' · AI';
  return out;
}

async function aiReviewCare(record) {
  if (!ANTHROPIC_KEY || !record) return record;
  const latin = (Array.isArray(record.scientific_name) ? record.scientific_name[0] : record.scientific_name) || '';
  if (!latin) return record;
  const key = latin.toLowerCase();

  const cached = _aiCacheGet(key);
  if (cached) return _applyAiCare(record, cached);

  const current = {
    common_name: record.common_name || '',
    scientific_name: latin,
    watering: record.watering || null,
    interval_days: record.watering_general_benchmark ? record.watering_general_benchmark.value : null,
    sunlight: record.sunlight || [],
    care: record._care || record.description || null,
    fact: record._fact || null,
    czech: record.czech || null,
  };

  try {
    const sys = 'You are a horticulture expert correcting plant-care metadata for a houseplant tracker. ' +
      'You are given a plant and its current (often unreliable) care data. Keep values that are botanically plausible. ' +
      'Only fill fields that are missing AND correct values that are clearly wrong for the species ' +
      '(e.g. a cactus or succulent should have a long watering interval; ferns and carnivorous plants a short one). ' +
      'Reply with ONLY a JSON object, no prose, no code fences, with keys: ' +
      'name (the correct, properly capitalised English common name of the species, e.g. "Snake plant" — only if you are confident, otherwise empty string), ' +
      'every (integer days between waterings), watering (one of "Frequent","Average","Minimum","None"), ' +
      'light (short phrase), care (one or two concise sentences), fact (one short interesting sentence), ' +
      'sunlight (array of short light strings), czech (the Czech common name of the species — only if you are confident, otherwise empty string).';
    const aiBody = {
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      temperature: 0,
      system: sys,
      messages: [{ role: 'user', content: 'Current data:\n' + JSON.stringify(current, null, 2) }],
    };
    const aiToken = getActiveToken();
    const r = aiToken
      ? await fetch(`${BACKEND_URL}/api/ai/messages`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${aiToken}` },
          body: JSON.stringify(aiBody),
        })
      : await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify(aiBody),
        });
    if (!r.ok) return record;
    const j = await r.json();
    let text = (j?.content || []).map(b => b.text || '').join('').trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const start = text.indexOf('{'), end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return record;
    const ai = JSON.parse(text.slice(start, end + 1));
    _aiCacheSet(key, ai);
    return _applyAiCare(record, ai);
  } catch(e) {
    return record;
  }
}

// ── Doctor: vision chat over the Anthropic API (raw fetch, browser-direct) ──
const DOCTOR_SYSTEM =
  'You are Caulis\'s resident plant doctor — a warm, knowledgeable botanist. ' +
  'The user shows a photo of a houseplant and asks about it. Lead with the direct answer in one or two sentences. ' +
  'Then, only if it genuinely helps, add a few short supporting points — use a "- " bullet list for steps or fixes. ' +
  'Keep the whole reply under ~120 words unless the user explicitly asks for depth. ' +
  'Use light Markdown: **bold** for the key term or verdict, "- " bullets for lists. ' +
  'If you genuinely cannot tell from the image, say so plainly and ask one clarifying question. ' +
  'Skip hedging disclaimers, do not repeat the question back, and never pad the answer to seem thorough.';

// Tools the doctor can call. Kept terse on purpose — schemas are resent every
// loop turn, so every word here is recurring token cost.
const DOCTOR_TOOLS = [
  {
    name: 'list_garden_plants',
    description: 'List the plants already saved in the user\'s garden (id, name, latin, location). Call this only when you need to find or compare against a saved plant — it is not needed for general care questions.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'suggest_correction',
    description: 'Propose a correction to a saved plant when its stored data looks wrong for what you see in the photo (e.g. mislabeled species, wrong watering interval). The user reviews and accepts it; do not claim it is applied.',
    input_schema: {
      type: 'object',
      properties: {
        plant_id: { type: 'string', description: 'id of the plant to correct (from list_garden_plants, or the plant in context)' },
        changes: {
          type: 'object',
          description: 'Only the fields that should change.',
          properties: {
            name: { type: 'string' }, latin: { type: 'string' }, location: { type: 'string' },
            every: { type: 'integer', description: 'days between waterings' }, light: { type: 'string' },
          },
        },
        reason: { type: 'string', description: 'one short sentence on why' },
      },
      required: ['plant_id', 'changes', 'reason'],
    },
  },
];

async function doctorAsk({ messages, plantContext, model, key, withTools }) {
  if (!key) throw new Error('No Anthropic API key. Add one in Settings.');
  const system = (plantContext ? `${DOCTOR_SYSTEM}\n\nKnown details about this plant:\n${plantContext}` : DOCTOR_SYSTEM)
    + (withTools ? '\n\nYou can use tools to inspect the garden and propose data corrections. Only reach for them when the conversation is actually about a saved plant being wrong — never for routine advice.' : '');
  const body = { model: model || 'claude-haiku-4-5', max_tokens: 1024, system, messages };
  if (withTools) body.tools = DOCTOR_TOOLS;

  const token = getActiveToken();
  const r = token
    ? await fetch(`${BACKEND_URL}/api/ai/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
    : await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      });
  if (!r.ok) {
    let msg = ''; try { msg = (await r.json())?.error?.message; } catch(e) {}
    throw new Error(msg || `Request failed (${r.status})`);
  }
  const j = await r.json();
  const content = j?.content || [];
  return {
    content,
    stop_reason: j?.stop_reason,
    text: content.filter(b => b.type === 'text').map(b => b.text || '').join('').trim(),
    toolUses: content.filter(b => b.type === 'tool_use'),
  };
}

// fetch real care data by latin name from the live services
async function _careByLatin(latinName) {
  if (HOUSE_PLANTS_KEY) {
    const hp = await _hpGetByName(latinName);
    if (hp) return { ...hp, _via: 'House Plants' };
  }
  if (API_KEY) {
    try {
      const list = await searchSpecies(latinName);
      const hit = (list || []).find(p => {
        const sn = Array.isArray(p.scientific_name) ? p.scientific_name : [p.scientific_name || ''];
        return sn.some(s => (s||'').toLowerCase() === latinName.toLowerCase());
      }) || (list || [])[0];
      if (hit) {
        const det = await getSpeciesDetails(hit.id, latinName);
        if (det) return { ...det, _via: 'Perenual' };
      }
    } catch(e) {}
  }
  return null;
}

async function searchSpecies(query) {
  const q = (query || '').trim().toLowerCase();
  if (API_KEY) {
    try {
      const token = getActiveToken();
      const r = token
        ? await fetch(`${BACKEND_URL}/api/perenual/search?q=${encodeURIComponent(q)}`, { headers: { authorization: `Bearer ${token}` } })
        : await fetch(`https://perenual.com/api/v2/species-list?key=${API_KEY}&q=${encodeURIComponent(q)}`);
      if (r.ok) { const j = await r.json(); if (j?.data?.length) return j.data; }
    } catch (e) {}
  }
  if (HOUSE_PLANTS_KEY && q) {
    const results = await _hpSearch(q);
    if (results.length) return results.map(_normalizeHP);
  }
  if (!q) return PERENUAL;
  return PERENUAL.filter(p =>
    p.common_name.toLowerCase().includes(q) ||
    (Array.isArray(p.scientific_name) ? p.scientific_name : [p.scientific_name||'']).join(' ').toLowerCase().includes(q));
}

async function getSpeciesDetails(id, latinNameHint) {
  if (API_KEY) {
    try {
      const token = getActiveToken();
      const r = token
        ? await fetch(`${BACKEND_URL}/api/perenual/species/${id}`, { headers: { authorization: `Bearer ${token}` } })
        : await fetch(`https://perenual.com/api/v2/species/details/${id}?key=${API_KEY}`);
      if (r.ok) { const j = await r.json(); if (j?.id) return await aiReviewCare({ ...j, _source: 'Perenual' }); }
    } catch (e) {}
  }
  const local = PERENUAL.find(p => p.id === id);
  const latinName = (Array.isArray(local?.scientific_name) ? local.scientific_name[0] : local?.scientific_name) || latinNameHint;
  if (HOUSE_PLANTS_KEY && latinName) {
    const hp = await _hpGetByName(latinName);
    if (hp) return await aiReviewCare({ ...hp, _source: 'House Plants' });
  }
  if (latinName) {
    const img = await _wikiImage(latinName);
    if (img) return await aiReviewCare(local
      ? { ...local, default_image: { regular_url: img }, _source: 'Wikipedia' }
      : { id, common_name: latinNameHint || latinName, scientific_name: [latinName], watering: 'Average', sunlight: [], default_image: { regular_url: img }, _source: 'Wikipedia' });
  }
  return local ? await aiReviewCare({ ...local, _source: 'library' }) : null;
}

async function _plantNetIdentify(blob, lang) {
  const form = new FormData();
  form.append('images', blob, 'plant.jpg');
  form.append('organs', 'auto');
  const r = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${PLANT_ID_KEY}&lang=${lang}`, {
    method: 'POST', body: form,
  });
  const json = await r.json();
  const top = json?.results?.[0];
  if (!top) return null;
  return {
    scientificName: top.species?.scientificNameWithoutAuthor || '',
    commonName: (top.species?.commonNames || [])[0] || '',
    score: top.score,
    results: json.results
  };
}

// turn a chosen scientific name into a full, care-enriched plant record
async function resolveSpecies(scientificName, englishName, score) {
  const exact = PERENUAL.find(p =>
    (Array.isArray(p.scientific_name) ? p.scientific_name : [p.scientific_name || ''])
      .some(s => s.toLowerCase() === scientificName.toLowerCase()));
  if (exact) {
    let czech = (exact.czech_names && exact.czech_names[0]) || '';
    if (!czech) czech = await _czechName(scientificName);
    return await aiReviewCare({ ...exact, common_name: englishName || exact.common_name, scientific_name: [scientificName], czech, _source: 'PlantNet', _score: score });
  }
  const enrich = await _careByLatin(scientificName);
  const img = (enrich && enrich.default_image?.regular_url) || await _wikiImage(scientificName);
  const base = enrich || _heuristicCare(scientificName);
  const czech = await _czechName(scientificName);
  return await aiReviewCare({ ...base, common_name: englishName || scientificName, scientific_name: [scientificName], czech,
    default_image: img ? { regular_url: img } : base.default_image,
    _source: enrich ? `PlantNet + ${enrich._via}` : 'PlantNet', _score: score });
}

async function identifySpecies(dataUrl) {
  if (PLANT_ID_KEY && dataUrl) {
    try {
      const [meta, b64] = dataUrl.split(',');
      const mime = (meta.match(/:(.*?);/) || [])[1] || 'image/jpeg';
      const bytes = atob(b64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const en = await _plantNetIdentify(blob, 'en');
      const results = en?.results || [];
      if (results.length) {
        const cands = results.slice(0, 3).map(r => ({
          scientificName: r.species?.scientificNameWithoutAuthor || '',
          commonName: (r.species?.commonNames || [])[0] || '',
          score: r.score,
        })).filter(c => c.scientificName);
        const top = cands[0];
        // confident = strong top score AND clearly ahead of the runner-up
        const confident = top && top.score >= 0.5 && (cands.length < 2 || top.score - cands[1].score >= 0.12);
        if (confident) return await resolveSpecies(top.scientificName, top.commonName || top.scientificName, top.score);
        if (cands.length) return { candidates: cands };
      }
    } catch(e) {}
  }
  if (API_KEY && dataUrl) {
    try {
      const r = await fetch(`https://perenual.com/api/v2/identify?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [dataUrl] }),
      });
      const json = await r.json();
      const hits = json?.data;
      if (Array.isArray(hits) && hits.length) {
        const hit = hits[0];
        if (hit.common_name || hit.scientific_name) return { ...hit, _source: 'Perenual' };
      }
    } catch(e) {}
  }
  return null; // couldn't identify — no fake match
}

// ── seed garden: 8 plants built from the species library ──
const _SEED_SPEC = [
  { sid:1442, location:'Living room',       days:2 },
  { sid:832,  location:'Living room',       days:5 },
  { sid:2056, location:'Bedroom',           days:9 },
  { sid:700,  location:'Kitchen windowsill', days:6 },
  { sid:2110, location:'Bathroom',          days:1 },
  { sid:2003, location:'Bedroom',           days:4 },
  { sid:1056, location:'Office',            days:3 },
  { sid:831,  location:'Office',            days:7 },
];
const SEED_PLANTS = _SEED_SPEC.map((s, i) => {
  const sp = PERENUAL.find(p => p.id === s.sid);
  const care = speciesCare(sp);
  return {
    id: i + 1,
    name: sp.common_name,
    czech: care.czech || '',
    latin: sp.scientific_name[0],
    location: s.location,
    days: s.days,
    every: care.every,
    light: care.light,
    care: care.care,
    fact: care.fact,
    watering: care.watering,
    benchmark: care.benchmark,
    sunlight: care.sunlight,
    species_id: sp.id,
    image: care.image,   // preset photo from the API/library
    userImage: null,     // user's own photo, overrides preset when set
  };
});

const INDOOR_PLANTS = [
  {id:7030,name:"African violet",latin:"Saintpaulia ionantha",czech:"Africká fialka"},
  {id:721,name:"aloe",latin:"Aloe harlana",czech:"Aloe"},
  {id:727,name:"aloe",latin:"Aloe suzannae",czech:"Aloe"},
  {id:728,name:"aloe",latin:"Aloe vera",czech:"Aloe pravá"},
  {id:6068,name:"aluminum plant",latin:"Pilea cadierei",czech:"Pilea"},
  {id:3828,name:"amaryllis",latin:"Hippeastrum (group)",czech:"Hvězdník"},
  {id:8613,name:"amaryllis",latin:"Hippeastrum cvs.",czech:"Hvězdník"},
  {id:2829,name:"Amazon lily",latin:"Eucharis amazonica",czech:"Amazonská lilie"},
  {id:711,name:"Amazonian elephant\'s ear",latin:"Alocasia amazonica \'Polly\'",czech:"Alokázie"},
  {id:7639,name:"American evergreen",latin:"Syngonium podophyllum",czech:"Syngonium"},
  {id:1457,name:"angel wings",latin:"Caladium bicolor",czech:"Kaládium"},
  {id:1220,name:"angelwing begonia",latin:"Begonia \'Sinbad\'",czech:"Begónie"},
  {id:1222,name:"angelwing begonia",latin:"Begonia \'Sophia\'",czech:"Begónie"},
  {id:855,name:"anthurium",latin:"Anthurium andraeanum",czech:"Toleček"},
  {id:856,name:"anthurium",latin:"Anthurium crassinervium",czech:"Toleček"},
  {id:8494,name:"anthurium",latin:"Anthurium andraeanum (incl. hybrid cvs.)",czech:"Toleček"},
  {id:7640,name:"arrowhead plant",latin:"Syngonium podophyllum \'Neon Robusta\'",czech:"Syngonium"},
  {id:6070,name:"artillery plant",latin:"Pilea microphylla",czech:"Pilea"},
  {id:8691,name:"artillery plant",latin:"Pilea depressa",czech:"Pilea"},
  {id:6535,name:"Asian bell tree",latin:"Radermachera sinica",czech:"Radermachera"},
  {id:1024,name:"asparagus fern",latin:"Asparagus densiflorus \'Myersii\'",czech:"Chřest"},
  {id:1025,name:"asparagus fern",latin:"Asparagus densiflorus \'Sprengeri\'",czech:"Chřest"},
  {id:1031,name:"asparagus fern",latin:"Asparagus setaceus",czech:"Chřest"},
  {id:5808,name:"baby rubber plant",latin:"Peperomia obtusifolia",czech:"Peperomie"},
  {id:7410,name:"baby\'s tears",latin:"Soleirolia soleirolii",czech:"Drobněnka"},
  {id:8766,name:"bacopa",latin:"Sutera cordata",czech:"Bakopa"},
  {id:8704,name:"Balfour aralia",latin:"Polyscias balfouriana",czech:"Polyscias"},
  {id:1822,name:"bamboo palm",latin:"Chamaedorea seifrizii",czech:"Chamaedorea"},
  {id:2568,name:"bamboo palm",latin:"Dypsis lutescens",czech:"Areka"},
  {id:5498,name:"basil",latin:"Ocimum citriodorum \'Pesto Perpetuo\'",czech:"Bazalka"},
  {id:7681,name:"batflower",latin:"Tacca leontopetaloides",czech:"Takka"},
  {id:1194,name:"begonia",latin:"Begonia \'Art Hodes\'",czech:"Begónie"},
  {id:1195,name:"begonia",latin:"Begonia benariensis BIG SERIES",czech:"Begónie"},
  {id:1196,name:"begonia",latin:"Begonia \'Bepared\' DRAGON WING RED",czech:"Begónie"},
  {id:1197,name:"begonia",latin:"Begonia boliviensis BOSSA NOVA RED",czech:"Begónie"},
  {id:1198,name:"begonia",latin:"Begonia \'Canary Wing\'",czech:"Begónie"},
  {id:1199,name:"begonia",latin:"Begonia \'Casper\'",czech:"Begónie"},
  {id:1200,name:"begonia",latin:"Begonia \'Curly Fireflush\'",czech:"Begónie"},
  {id:1201,name:"begonia",latin:"Begonia \'Dangling Pearls\'",czech:"Begónie"},
  {id:1202,name:"begonia",latin:"Begonia \'Emerald Glow\'",czech:"Begónie"},
  {id:1208,name:"begonia",latin:"Begonia \'Green Gold\'",czech:"Begónie"},
  {id:1209,name:"begonia",latin:"Begonia \'Gryphon\'",czech:"Begónie"},
  {id:1210,name:"begonia",latin:"Begonia \'Lime Royale\'",czech:"Begónie"},
  {id:1211,name:"begonia",latin:"Begonia \'Martha Stewart\'",czech:"Begónie"},
  {id:1213,name:"begonia",latin:"Begonia \'Penny Lahn\'",czech:"Begónie"},
  {id:1216,name:"begonia",latin:"Begonia \'River Nile\'",czech:"Begónie"},
  {id:1217,name:"begonia",latin:"Begonia (Semperflorens Cultorum Group)",czech:"Begónie"},
  {id:1218,name:"begonia",latin:"Begonia semperflorens \'Senator Deep Rose\'",czech:"Begónie"},
  {id:1221,name:"begonia",latin:"Begonia \'Solar Flare\'",czech:"Begónie"},
  {id:1225,name:"begonia",latin:"Begonia tuberosa \'Fortune Peach Shades\'",czech:"Begónie"},
  {id:1038,name:"bird\'s nest fern",latin:"Asplenium nidus \'Antiquum\'",czech:"Sleziník"},
  {id:1971,name:"bleeding heart",latin:"Clerodendrum thomsoniae",czech:"Blahokeř"},
  {id:7164,name:"blue sansevieria",latin:"Sansevieria ehrenberghii \'Samurai Dwarf\'",czech:"Tchýnin jazyk"},
  {id:5443,name:"blushing bromeliad",latin:"Neoregelia carolinae f. tricolor",czech:"Neoregélie"},
  {id:7918,name:"boat lily",latin:"Tradescantia spathacea",czech:"Podeňka"},
  {id:5465,name:"Boston fern",latin:"Nephrolepis exaltata",czech:"Ledviník"},
  {id:5466,name:"Boston fern",latin:"Nephrolepis exaltata \'Bostoniensis\'",czech:"Ledviník"},
  {id:5467,name:"Boston fern",latin:"Nephrolepis exaltata \'Tiger Fern\'",czech:"Ledviník"},
  {id:7163,name:"bowstring hemp",latin:"Sansevieria cylindrica",czech:"Tchýnin jazyk"},
  {id:7170,name:"bowstring hemp",latin:"Sansevieria suffruticosa",czech:"Tchýnin jazyk"},
  {id:1416,name:"boxwood",latin:"Buxus microphylla \'Peergold\' GOLDEN DREAM",czech:"Zimostráz"},
  {id:8791,name:"bromeliad",latin:"Vriesea spp.",czech:"Vrízie"},
  {id:4280,name:"busy lizzy",latin:"Impatiens walleriana",czech:"Netýkavka"},
  {id:5740,name:"button fern",latin:"Pellaea rotundifolia",czech:"Pelej"},
  {id:8798,name:"calamondin orange",latin:"x Citrofortunella microcarpa",czech:"Kalamondin"},
  {id:8509,name:"calathea",latin:"Calathea roseopicta",czech:"Kalatea"},
  {id:7569,name:"Cape primrose",latin:"Streptocarpus (group)",czech:"Streptokarpus"},
  {id:8765,name:"cape primrose",latin:"Streptocarpus x hybridus",czech:"Streptokarpus"},
  {id:8385,name:"cardboard palm",latin:"Zamia furfuracea",czech:"Zámie"},
  {id:1036,name:"cast-iron plant",latin:"Aspidistra elatior",czech:"Aspidistra"},
  {id:5444,name:"catmint",latin:"Nepeta \'Blue Dragon\'",czech:"Šanta"},
  {id:5446,name:"catmint",latin:"Nepeta \'Cat\'s Pajamas\'",czech:"Šanta"},
  {id:5445,name:"catnip",latin:"Nepeta cataria",czech:"Šanta kočičí"},
  {id:5269,name:"centipede plant",latin:"Muehlenbeckia platyclada",czech:"Mühlenbeckie"},
  {id:1821,name:"chamaedorea",latin:"Chamaedorea microspadix",czech:"Chamaedorea"},
  {id:626,name:"Chinese evegreen",latin:"Aglaonema \'Cutlass\'",czech:"Aglaonéma"},
  {id:627,name:"Chinese evergreen",latin:"Aglaonema \'Red Gold\'",czech:"Aglaonéma"},
  {id:628,name:"Chinese evergreen",latin:"Aglaonema \'Silver Queen\'",czech:"Aglaonéma"},
  {id:8485,name:"Chinese evergreen",latin:"Aglaonema cvs.",czech:"Aglaonéma"},
  {id:8480,name:"Chinese lantern ",latin:"Abutilon x hybridum",czech:"Mračňák"},
  {id:7265,name:"Christmas cactus",latin:"Schlumbergera buckleyi",czech:"Vánoční kaktus"},
  {id:7266,name:"Christmas cactus",latin:"Schlumbergera truncata",czech:"Vánoční kaktus"},
  {id:2885,name:"christplant",latin:"Euphorbia milii",czech:"Pryšec"},
  {id:1855,name:"chrysanthemum",latin:"Chrysanthemum \'Fireworks Igloo\'",czech:"Chryzantéma"},
  {id:1864,name:"chrysanthemum",latin:"Chrysanthemum \'Radiant Igloo\'",czech:"Chryzantéma"},
  {id:1868,name:"chrysanthemum",latin:"Chrysanthemum \'Yobra\' BRAVO",czech:"Chryzantéma"},
  {id:1870,name:"chrysanthemum",latin:"Chrysanthemum \'Yogin\' GINGER",czech:"Chryzantéma"},
  {id:1871,name:"chrysanthemum",latin:"Chrysanthemum \'Yogrena\' GRENADINE",czech:"Chryzantéma"},
  {id:1873,name:"chrysanthemum",latin:"Chrysanthemum \'Yoraquel\' RAQUEL",czech:"Chryzantéma"},
  {id:2965,name:"climbing fig",latin:"Ficus pumila",czech:"Fíkovník"},
  {id:6199,name:"coleus",latin:"Plectranthus \'Balcenna\' HENNA",czech:"Pochvatec"},
  {id:6200,name:"coleus",latin:"Plectranthus COLORBLAZE LIME TIME",czech:"Pochvatec"},
  {id:6201,name:"coleus",latin:"Plectranthus COLORBLAZE ROYALE CHERRY BRANDY",czech:"Pochvatec"},
  {id:6204,name:"coleus",latin:"Plectranthus PREMIUM SUN LIME DELIGHT",czech:"Pochvatec"},
  {id:6205,name:"coleus",latin:"Plectranthus scutellarioides",czech:"Pochvatec"},
  {id:6207,name:"coleus",latin:"Plectranthus \'Redhead\'",czech:"Pochvatec"},
  {id:8699,name:"coleus",latin:"Plectranthus scutellarioides hybrids & cvs. ( syn. Solenostemon )",czech:"Pochvatec"},
  {id:2030,name:"columnea",latin:"Columnea microcalyx",czech:"Kolumnea"},
  {id:3986,name:"common hyacinth",latin:"Hyacinthus orientalis",czech:"Hyacint"},
  {id:3988,name:"common hyacinth",latin:"Hyacinthus orientalis ETOUFFEE",czech:"Hyacint"},
  {id:4727,name:"Cooper’s African hyacinth",latin:"Ledebouria cooperi",czech:"Ledebourie"},
  {id:8610,name:"coral bells ",latin:"Heuchera cvs.",czech:"Dlužicha"},
  {id:8692,name:"creeping Charlie",latin:"Pilea nummulariifolia",czech:"Pilea"},
  {id:8596,name:"creeping Charlie ",latin:"Glechoma hederacea",czech:"Popenec"},
  {id:6405,name:"cretan brake",latin:"Pteris cretica",czech:"Pteris"},
  {id:1999,name:"croton",latin:"Codiaeum variegatum",czech:"Kroton"},
  {id:2000,name:"croton",latin:"Codiaeum variegatum var. pictum",czech:"Kroton"},
  {id:8565,name:"crown of thorns",latin:"Euphorbia milii (incl. hybrids)",czech:"Pryšec"},
  {id:2244,name:"cryptanthus",latin:"Cryptanthus (group)",czech:"Kryptantus"},
  {id:2263,name:"cuphea",latin:"Cuphea VERMILLIONAIRE",czech:"Kufea"},
  {id:2275,name:"cyclamen",latin:"Cyclamen persicum",czech:"Brambořík"},
  {id:8543,name:"cyclamen",latin:"Cyclamen persicum (incl. hybrids)",czech:"Brambořík"},
  {id:2277,name:"cymbalaria",latin:"Cymbalaria aequitriloba",czech:"Zvěšinec"},
  {id:546,name:"delta maidenhair fern",latin:"Adiantum raddianum",czech:"Netík"},
  {id:540,name:"desert rose",latin:"Adenium obesum",czech:"Pouštní růže"},
  {id:2533,name:"dracaena",latin:"Dracaena sanderiana",czech:"Dračinec"},
  {id:2531,name:"dragontree",latin:"Dracaena marginata",czech:"Dračinec"},
  {id:2468,name:"dumb cane",latin:"Dieffenbachia seguine",czech:"Difenbachie"},
  {id:6208,name:"dwarf fern-leaf bamboo",latin:"Pleioblastus pygmaeus",czech:"Pleioblastus"},
  {id:8538,name:"earth star",latin:"Cryptanthus bivittatus",czech:"Kryptantus"},
  {id:8601,name:"Easter cactus",latin:"Hatiora x graeseri",czech:"Velikonoční kaktus"},
  {id:7405,name:"eggplant",latin:"Solanum melongena",czech:"Lilek"},
  {id:710,name:"elephant\'s ear",latin:"Alocasia amazonica",czech:"Alokázie"},
  {id:712,name:"elephant\'s ear",latin:"Alocasia \'Frydek\'",czech:"Alokázie"},
  {id:713,name:"elephant\'s ear",latin:"Alocasia (group)",czech:"Alokázie"},
  {id:714,name:"elephant\'s ear",latin:"Alocasia LOW RIDER",czech:"Alokázie"},
  {id:716,name:"elephant\'s ear",latin:"Alocasia \'Metalhead\'",czech:"Alokázie"},
  {id:717,name:"elephant\'s ear",latin:"Alocasia \'Portora\'",czech:"Alokázie"},
  {id:718,name:"elephant\'s ear",latin:"Alocasia \'Sarian\'",czech:"Alokázie"},
  {id:6178,name:"elkhorn fern",latin:"Platycerium bifurcatum",czech:"Parožnatka"},
  {id:5807,name:"emerald ripple pepper",latin:"Peperomia caperata",czech:"Peperomie"},
  {id:3349,name:"English ivy",latin:"Hedera helix",czech:"Břečťan popínavý"},
  {id:3350,name:"English ivy",latin:"Hedera helix \'Arborescens\'",czech:"Břečťan"},
  {id:3351,name:"English ivy",latin:"Hedera helix \'Glacier\'",czech:"Břečťan"},
  {id:3352,name:"English ivy",latin:"Hedera helix \'Midas Touch\'",czech:"Břečťan"},
  {id:3353,name:"English ivy",latin:"Hedera helix \'Tango\'",czech:"Břečťan"},
  {id:3354,name:"English ivy",latin:"Hedera helix var. baltica",czech:"Břečťan"},
  {id:6210,name:"false aralia",latin:"Plerandra elegantissima",czech:"Šeflera"},
  {id:8743,name:"false aralia",latin:"Schefflera elegantissima",czech:"Šeflera"},
  {id:8677,name:"false shamrock",latin:"Oxalis triangularis",czech:"Šťavel"},
  {id:6252,name:"fern-leaf aralia",latin:"Polyscias filicifolia",czech:"Polyscias"},
  {id:2963,name:"fiddle-leaf fig",latin:"Ficus lyrata",czech:"Fíkovník lyrovitý"},
  {id:2956,name:"fig",latin:"Ficus carica \'Brown Turkey\'",czech:"Fíkovník smokvoň"},
  {id:2957,name:"fig",latin:"Ficus carica \'Celeste\'",czech:"Fíkovník smokvoň"},
  {id:2958,name:"fig",latin:"Ficus carica \'Chicago Hardy\'",czech:"Fíkovník smokvoň"},
  {id:2959,name:"fig",latin:"Ficus carica \'MAJOAM\' LITTLE MISS FIGGY",czech:"Fíkovník smokvoň"},
  {id:2242,name:"firecracker flower",latin:"Crossandra infundibuliformis",czech:"Krosandra"},
  {id:2775,name:"flame violet",latin:"Episcia cupreata",czech:"Episcie"},
  {id:5810,name:"florist\'s cineraria",latin:"Pericallis hybrida",czech:"Cinerárie"},
  {id:425,name:"flowering-maple",latin:"Abutilon hybridum",czech:"Mračňák"},
  {id:426,name:"flowering-maple",latin:"Abutilon hybridum \'Bella Red\'",czech:"Mračňák"},
  {id:427,name:"flowering-maple",latin:"Abutilon \'Moonchimes\'",czech:"Mračňák"},
  {id:428,name:"flowering-maple",latin:"Abutilon pictum \'Gold Dust\'",czech:"Mračňák"},
  {id:7858,name:"foam flower",latin:"Tiarella \'Filigree Lace\'",czech:"Tiarka"},
  {id:7864,name:"foam flower",latin:"Tiarella \'Ninja\'",czech:"Tiarka"},
  {id:7866,name:"foam flower",latin:"Tiarella \'Pink Brushes\'",czech:"Tiarka"},
  {id:7873,name:"foam flower",latin:"Tiarella \'Tntia041\' STARGAZER MERCURY",czech:"Tiarka"},
  {id:2528,name:"fragrant dracaena",latin:"Dracaena fragrans",czech:"Dračinec vonný"},
  {id:5564,name:"fragrant olive",latin:"Osmanthus fragrans",czech:"Vonokvětka"},
  {id:7189,name:"fragrant sweet box",latin:"Sarcococca ruscifolia",czech:"Sarkokoka"},
  {id:6069,name:"friendship plant",latin:"Pilea involucrata",czech:"Pilea"},
  {id:3087,name:"gardenia",latin:"Gardenia jasminoides",czech:"Gardénie"},
  {id:3089,name:"gardenia",latin:"Gardenia jasminoides \'Crown Jewel\'",czech:"Gardénie"},
  {id:3090,name:"gardenia",latin:"Gardenia jasminoides \'Grif\'s Select\'",czech:"Gardénie"},
  {id:8588,name:"geranium",latin:"Geranium spp. and/ or cvs.",czech:"Kakost"},
  {id:715,name:"giant elephant\'s ear",latin:"Alocasia macrorrhizos",czech:"Alokázie"},
  {id:7384,name:"gloxinia",latin:"Sinningia speciosa",czech:"Sinningie"},
  {id:3236,name:"goeppertia",latin:"Goeppertia roseopicta",czech:"Kalatea"},
  {id:8550,name:"gold-dust dracaena",latin:"Dracaena surculosa",czech:"Dračinec"},
  {id:2773,name:"golden pothos",latin:"Epipremnum aureum",czech:"Potos zlatý"},
  {id:8836,name:"Green Mountain Maidenhair Fern",latin:"Adiantum viridimontanum",czech:"Netík"},
  {id:5588,name:"Guiana chestnut",latin:"Pachira aquatica",czech:"Pachira vodní"},
  {id:5868,name:"horsehead philodendron",latin:"Philodendron bipinnatifidum",czech:"Filodendron"},
  {id:502,name:"hot water plant",latin:"Achimenes (group)",czech:"Achiménes"},
  {id:8487,name:"hybrid ornamental onion",latin:"Allium (incl. hybrids)",czech:"Okrasný česnek"},
  {id:8685,name:"hybrid philodendron",latin:"Philodendron x hybrida",czech:"Filodendron"},
  {id:1203,name:"hybrid tuberous begonia",latin:"Begonia FUNKY PINK",czech:"Begónie hlíznatá"},
  {id:1223,name:"hybrid tuberous begonia",latin:"Begonia tuberhybrida \'Jurassic Pink Splash\'",czech:"Begónie hlíznatá"},
  {id:1224,name:"hybrid tuberous begonia",latin:"Begonia tuberhybrida \'Jurassic Silver Swirl\'",czech:"Begónie hlíznatá"},
  {id:1226,name:"hybrid tuberous begonia",latin:"Begonia (Tuberosa Group)",czech:"Begónie hlíznatá"},
  {id:7923,name:"inch plant",latin:"Tradescantia zebrina",czech:"Podeňka"},
  {id:2962,name:"India rubber plant",latin:"Ficus elastica \'Burgundy\'",czech:"Fíkovník pryžodárný"},
  {id:2961,name:"Indian rubberplant",latin:"Ficus elastica",czech:"Fíkovník pryžodárný"},
  {id:4349,name:"iris",latin:"Iris spp.",czech:"Kosatec"},
  {id:1212,name:"iron cross begonia",latin:"Begonia masoniana",czech:"Begónie"},
  {id:5738,name:"ivyleaf geranium",latin:"Pelargonium peltatum",czech:"Muškát převislý"},
  {id:434,name:"Jacob\'s coat",latin:"Acalypha wilkesiana",czech:"Akalyfa"},
  {id:2193,name:"jade plant",latin:"Crassula ovata",czech:"Tlustice vejčitá"},
  {id:2294,name:"Japanese holly fern",latin:"Cyrtomium falcatum",czech:"Cyrtomium"},
  {id:2295,name:"Japanese holly fern",latin:"Cyrtomium fortunei",czech:"Cyrtomium"},
  {id:1130,name:"Japanese painted fern",latin:"Athyrium niponicum var. pictum",czech:"Papratka"},
  {id:1133,name:"Japanese painted fern",latin:"Athyrium niponicum var. pictum \'Metallicum\'",czech:"Papratka"},
  {id:8625,name:"jasmine",latin:"Jasminum polyanthum",czech:"Jasmín"},
  {id:5007,name:"jewel orchid",latin:"Ludisia (group)",czech:"Ludisie"},
  {id:1272,name:"jewel plant",latin:"Bertolonia maculata",czech:"Bertolonie"},
  {id:747,name:"Joseph\'s coat",latin:"Alternanthera ficoidea",czech:"Nestřeba"},
  {id:748,name:"Joseph\'s coat",latin:"Alternanthera ficoidea (yellow form)",czech:"Nestřeba"},
  {id:4558,name:"kalanchoe",latin:"Kalanchoe blossfeldiana",czech:"Kalanchoe"},
  {id:4559,name:"kalanchoe",latin:"Kalanchoe thyrsiflora \'Flapjacks\'",czech:"Kalanchoe"},
  {id:6554,name:"lady palm",latin:"Rhapis excelsa",czech:"Rapis"},
  {id:4722,name:"lavender",latin:"Lavandula \'Silver Frost\'",czech:"Levandule"},
  {id:552,name:"lipstick plant",latin:"Aeschynanthus radicans",czech:"Aeschynantus"},
  {id:4947,name:"lobelia",latin:"Lobelia erinus",czech:"Lobelka"},
  {id:4956,name:"lobelia",latin:"Lobelia \'Sparkle DeVine\'",czech:"Lobelka"},
  {id:543,name:"maidenhair fern",latin:"Adiantum capillus-veneris",czech:"Netík"},
  {id:8722,name:"majesty palm",latin:"Ravenea rivularis",czech:"Ravenea"},
  {id:5203,name:"marvel of Peru",latin:"Mirabilis jalapa",czech:"Nocenka"},
  {id:7167,name:"Mason\'s Congo sansevieria",latin:"Sansevieria masoniana",czech:"Tchýnin jazyk"},
  {id:1891,name:"meyer lemon",latin:"Citrus meyeri",czech:"Citroník"},
  {id:6253,name:"Ming aralia",latin:"Polyscias fruticosa",czech:"Polyscias"},
  {id:6809,name:"miniature rose",latin:"Rosa \'Benblack\' BLACK JADE",czech:"Růže"},
  {id:6913,name:"miniature rose",latin:"Rosa \'Savasach\' SACHET",czech:"Růže"},
  {id:6920,name:"miniature rose",latin:"Rosa \'Scrivluv\' BABY LOVE",czech:"Růže"},
  {id:3972,name:"miniature wax plant",latin:"Hoya lanceolata subsp. bella",czech:"Voskovka"},
  {id:7919,name:"Moses-in-a-basket",latin:"Tradescantia spathacea \'Vittata\'",czech:"Podeňka"},
  {id:5837,name:"moth orchid",latin:"Phalaenopsis (group)",czech:"Můrovec"},
  {id:7165,name:"mother-in-law\'s tongue",latin:"Sansevieria \'Fernwood Mikado\'",czech:"Tchýnin jazyk"},
  {id:7166,name:"mother-in-law\'s tongue",latin:"Sansevieria kirkii \'Silver Blue\'",czech:"Tchýnin jazyk"},
  {id:7169,name:"mother-in-law\'s tongue",latin:"Sansevieria \'Starfish\'",czech:"Tchýnin jazyk"},
  {id:7172,name:"mother-in-law\'s tongue",latin:"Sansevieria trifasciata \'Bantel\'s Sensation\'",czech:"Tchýnin jazyk"},
  {id:7173,name:"mother-in-law\'s tongue",latin:"Sansevieria trifasciata \'Black Coral\'",czech:"Tchýnin jazyk"},
  {id:7174,name:"mother-in-law\'s tongue",latin:"Sansevieria trifasciata \'Black Robusta\'",czech:"Tchýnin jazyk"},
  {id:7175,name:"mother-in-law\'s tongue",latin:"Sansevieria trifasciata \'Black Star\'",czech:"Tchýnin jazyk"},
  {id:7176,name:"mother-in-law\'s tongue",latin:"Sansevieria trifasciata \'Dwarf Laurentii\'",czech:"Tchýnin jazyk"},
  {id:7177,name:"mother-in-law\'s tongue",latin:"Sansevieria trifasciata \'Gold Flame\'",czech:"Tchýnin jazyk"},
  {id:1993,name:"Natal lily",latin:"Clivia miniata",czech:"Klívie"},
  {id:3355,name:"Nepal ivy",latin:"Hedera nepalensis var. sinensis",czech:"Břečťan"},
  {id:5449,name:"nepeta",latin:"Nepeta faassenii \'Kit Cat\'",czech:"Šanta"},
  {id:5462,name:"nepeta",latin:"Nepeta subsessilis \'Candy Cat\'",czech:"Šanta"},
  {id:2976,name:"Nerve Plant",latin:"Fittonia albivenis (Argyroneura Group)",czech:"Fitónie"},
  {id:7244,name:"octopus tree",latin:"Schefflera actinophylla",czech:"Šeflera"},
  {id:667,name:"onion",latin:"Allium cepa",czech:"Cibule kuchyňská"},
  {id:1468,name:"orchid",latin:"Calanthe \'Kozu Spice\'",czech:"Kalanta"},
  {id:1716,name:"orchid",latin:"Cattleya (group)",czech:"Kateleja"},
  {id:2279,name:"orchid",latin:"Cymbidium (group)",czech:"Cymbidium"},
  {id:2354,name:"orchid",latin:"Dendrobium (group)",czech:"Stromokvětka"},
  {id:5520,name:"orchid",latin:"Oncidium (group)",czech:"Oncidium"},
  {id:5836,name:"orchid",latin:"Phaius (group)",czech:"Fajus"},
  {id:5950,name:"orchid",latin:"Phragmipedium (group)",czech:"Fragmipedium"},
  {id:8422,name:"orchid",latin:"Zygopetalum (group)",czech:"Zygopetalum"},
  {id:4901,name:"orienpet lily",latin:"Lilium \'Touching\'",czech:"Lilie"},
  {id:1597,name:"ornamental pepper",latin:"Capsicum annuum \'Black Pearl\'",czech:"Paprika roční"},
  {id:1598,name:"ornamental pepper",latin:"Capsicum annuum \'Chinese Five Color\'",czech:"Paprika roční"},
  {id:1601,name:"ornamental pepper",latin:"Capsicum annuum \'Onyx Red\'",czech:"Paprika roční"},
  {id:1603,name:"ornamental pepper",latin:"Capsicum annuum \'Purple Flash\'",czech:"Paprika roční"},
  {id:8512,name:"ornamental pepper",latin:"Capsicum annuum cv.",czech:"Paprika roční"},
  {id:1820,name:"parlor palm",latin:"Chamaedorea elegans",czech:"Chamaedorea ladná"},
  {id:5726,name:"passion flower",latin:"Passiflora \'Incense\'",czech:"Mučenka"},
  {id:8679,name:"passion flower",latin:"Passiflora (incl. hybrids)",czech:"Mučenka"},
  {id:7463,name:"peace lily",latin:"Spathiphyllum (group)",czech:"Lopatkovec"},
  {id:8763,name:"peace lily",latin:"Spathiphyllum cvs.",czech:"Lopatkovec"},
  {id:1470,name:"peacock plant",latin:"Calathea makoyana",czech:"Kalatea"},
  {id:8681,name:"pelargonium",latin:"Pelargonium x domesticum",czech:"Muškát"},
  {id:4122,name:"pennywort",latin:"Hydrocotyle vulgaris",czech:"Pupečník"},
  {id:3347,name:"Persian ivy",latin:"Hedera colchica",czech:"Břečťan kolchický"},
  {id:2274,name:"Persian violet",latin:"Cyclamen hederifolium",czech:"Brambořík břečťanolistý"},
  {id:2915,name:"Persian violet",latin:"Exacum affine",czech:"Exakum"},
  {id:625,name:"Philippine evergreen",latin:"Aglaonema commutatum",czech:"Aglaonéma"},
  {id:5870,name:"philodendron",latin:"Philodendron \'Pink Princess\'",czech:"Filodendron"},
  {id:5871,name:"philodendron",latin:"Philodendron \'Winterbourn\' XANADU",czech:"Filodendron"},
  {id:8778,name:"piggyback plant",latin:"Tolmiea menziesii",czech:"Tolmie"},
  {id:6071,name:"pilea",latin:"Pilea mollis \'Moon Valley\'",czech:"Pilea"},
  {id:2891,name:"poinsettia",latin:"Euphorbia pulcherrima",czech:"Vánoční hvězda"},
  {id:4181,name:"polka dot plant",latin:"Hypoestes phyllostachya",czech:"Hypoestes"},
  {id:4182,name:"polka dot plant",latin:"Hypoestes phyllostachya \'Confetti Compact White\'",czech:"Hypoestes"},
  {id:4183,name:"polka dot plant",latin:"Hypoestes phyllostachya SPLASH SELECT PINK",czech:"Hypoestes"},
  {id:1192,name:"ponytail palm",latin:"Beaucarnea recurvata",czech:"Nolina"},
  {id:7409,name:"potato",latin:"Solanum tuberosum",czech:"Brambor"},
  {id:2774,name:"pothos",latin:"Epipremnum aureum \'Neon\'",czech:"Potos"},
  {id:5159,name:"prayer plant",latin:"Maranta leuconeura var. erythroneura",czech:"Maranta"},
  {id:8653,name:"prayer plant",latin:"Maranta leuconeura var. kerchoviana",czech:"Maranta"},
  {id:6311,name:"primula",latin:"Primula vialii",czech:"Prvosenka"},
  {id:6317,name:"primula",latin:"Primula \'Wanda Kay\'",czech:"Prvosenka"},
  {id:6318,name:"primula",latin:"Primula \'Wanda Renae\'s Pearl\'",czech:"Prvosenka"},
  {id:8709,name:"primula",latin:"Primula vulgaris (incl. hybrids)",czech:"Prvosenka"},
  {id:2322,name:"rabbit\'s foot fern",latin:"Davallia fejeensis",czech:"Davalie"},
  {id:2323,name:"rabbit\'s foot fern",latin:"Davallia fejeensis \'Dwarf Ripple\'",czech:"Davalie"},
  {id:1469,name:"rattlesnake plant",latin:"Calathea lancifolia",czech:"Kalatea"},
  {id:3637,name:"red ivy",latin:"Hemigraphis alternata",czech:"Hemigrafis"},
  {id:8652,name:"red-veined prayer plant",latin:"Maranta leuconeura \'Erythroneura\'",czech:"Maranta"},
  {id:5736,name:"regal geranium",latin:"Pelargonium domesticum",czech:"Muškát"},
  {id:1214,name:"rex begonia",latin:"Begonia rex-cultorum",czech:"Begónie královská"},
  {id:1215,name:"rex begonia",latin:"Begonia rex-cultorum \'Super Curl\'",czech:"Begónie královská"},
  {id:8549,name:"ribbon plant",latin:"Dracaena braunii",czech:"Dračinec"},
  {id:2272,name:"Sago palm",latin:"Cycas revoluta",czech:"Cykas"},
  {id:7276,name:"satin pothos",latin:"Scindapsus pictus \'Argyraeus\'",czech:"Scindapsus"},
  {id:3256,name:"scarlet star",latin:"Guzmania lingulata",czech:"Guzmánie"},
  {id:5739,name:"scented-leaved geranium",latin:"Pelargonium (scented-leaved group)",czech:"Muškát"},
  {id:5180,name:"showy medinilla",latin:"Medinilla magnifica",czech:"Medinila"},
  {id:4554,name:"shrimp plant",latin:"Justicia brandegeeana \'Yellow Queen\'",czech:"Justicie"},
  {id:8682,name:"silver-leaf peperomia",latin:"Peperomia griseoargentea",czech:"Peperomie"},
  {id:7911,name:"small-leaf spiderwort",latin:"Tradescantia fluminensis",czech:"Podeňka"},
  {id:7168,name:"snake plant",latin:"Sansevieria patens",czech:"Tchýnin jazyk"},
  {id:7352,name:"snowrose",latin:"Serissa japonica",czech:"Serisa"},
  {id:7353,name:"snowrose",latin:"Serissa japonica \'Kowloon\'",czech:"Serisa"},
  {id:7354,name:"snowrose",latin:"Serissa japonica \'Variegata\'",czech:"Serisa"},
  {id:2532,name:"song of India",latin:"Dracaena reflexa \'Variegata\'",czech:"Dračinec"},
  {id:8132,name:"speedwell",latin:"Veronica \'Mann\'s Variety\'",czech:"Rozrazil"},
  {id:7917,name:"spider lily",latin:"Tradescantia pallida \'Purpurea\'",czech:"Podeňka"},
  {id:7921,name:"spider lily",latin:"Tradescantia tharpii",czech:"Podeňka"},
  {id:1846,name:"spider plant",latin:"Chlorophytum \'Bonnie\'",czech:"Zelenec chocholatý"},
  {id:1847,name:"spider plant",latin:"Chlorophytum comosum \'Vittatum\'",czech:"Zelenec chocholatý"},
  {id:1848,name:"spider plant",latin:"Chlorophytum \'Fire Flash\'",czech:"Zelenec chocholatý"},
  {id:7901,name:"spiderwort",latin:"Tradescantia (Andersoniana Group) \'Blushing Bride\'",czech:"Podeňka"},
  {id:7902,name:"spiderwort",latin:"Tradescantia (Andersoniana Group) \'Concord Grape\'",czech:"Podeňka"},
  {id:7903,name:"spiderwort",latin:"Tradescantia (Andersoniana Group) \'Little Doll\'",czech:"Podeňka"},
  {id:7904,name:"spiderwort",latin:"Tradescantia (Andersoniana Group) \'Mariella\'",czech:"Podeňka"},
  {id:7905,name:"spiderwort",latin:"Tradescantia (Andersoniana Group) \'Purple Profusion\'",czech:"Podeňka"},
  {id:7906,name:"spiderwort",latin:"Tradescantia \'Red Cloud\'",czech:"Podeňka"},
  {id:7907,name:"spiderwort",latin:"Tradescantia (Andersoniana Group) \'Snowcap\'",czech:"Podeňka"},
  {id:7908,name:"spiderwort",latin:"Tradescantia (Andersoniana Group) \'Sweet Kate\'",czech:"Podeňka"},
  {id:7910,name:"spiderwort",latin:"Tradescantia ernestiana",czech:"Podeňka"},
  {id:7912,name:"spiderwort",latin:"Tradescantia fluminensis \'Albovittata\'",czech:"Podeňka"},
  {id:7913,name:"spiderwort",latin:"Tradescantia \'Hawaiian Punch\'",czech:"Podeňka"},
  {id:7914,name:"spiderwort",latin:"Tradescantia longipes",czech:"Podeňka"},
  {id:7915,name:"spiderwort",latin:"Tradescantia \'Lucky Charm\'",czech:"Podeňka"},
  {id:8377,name:"Spineless yucca",latin:"Yucca elephantipes",czech:"Juka"},
  {id:8683,name:"spoon leaf peperomia",latin:"Peperomia magnoliifolia",czech:"Peperomie"},
  {id:1147,name:"spotted laurel",latin:"Aucuba japonica \'Mr. Goldstrike\'",czech:"Aukuba japonská"},
  {id:1149,name:"spotted laurel",latin:"Aucuba japonica \'Suruga Benten\'",czech:"Aukuba japonská"},
  {id:1150,name:"spotted laurel",latin:"Aucuba japonica \'Variegata\'",czech:"Aukuba japonská"},
  {id:1023,name:"Sprenger\'s asparagus fern",latin:"Asparagus densiflorus",czech:"Chřest"},
  {id:1845,name:"St. Bernard\'s lily",latin:"Chlorophytum amaniense",czech:"Zelenec"},
  {id:551,name:"stalked aeonium",latin:"Aeonium undulatum",czech:"Eonium"},
  {id:8520,name:"string of hearts",latin:"Ceropegia linearis ssp. woodii",czech:"Svícnovec"},
  {id:7345,name:"string of pearls",latin:"Senecio rowleyanus",czech:"Starček"},
  {id:8755,name:"string-of-pearls ",latin:"Senecio rowleyanus (syn. Curio rowleyanus)",czech:"Starček"},
  {id:2529,name:"striped dracaena",latin:"Dracaena fragrans (Deremensis Group) \'Lemon Lime\'",czech:"Dračinec"},
  {id:2530,name:"striped dracaena",latin:"Dracaena fragrans (Deremensis Group) \'Limelight\'",czech:"Dračinec"},
  {id:7571,name:"stromanthe",latin:"Stromanthe sanguinea",czech:"Stromanta"},
  {id:7572,name:"stromanthe",latin:"Stromanthe sanguinea \'Tristar\'",czech:"Stromanta"},
  {id:6197,name:"Swedish ivy",latin:"Plectranthus australis",czech:"Pochvatec"},
  {id:6202,name:"Swedish ivy",latin:"Plectranthus forsteri \'Marginatus\'",czech:"Pochvatec"},
  {id:6203,name:"Swedish ivy",latin:"Plectranthus \'Mona Lavender\'",czech:"Pochvatec"},
  {id:6206,name:"Swedish ivy",latin:"Plectranthus strigosus",czech:"Pochvatec"},
  {id:8700,name:"Swedish ivy",latin:"Plectranthus verticillatus",czech:"Pochvatec"},
  {id:5497,name:"sweet basil",latin:"Ocimum basilicum",czech:"Bazalka pravá"},
  {id:7186,name:"sweet box",latin:"Sarcococca hookeriana",czech:"Sarkokoka"},
  {id:7187,name:"sweet box",latin:"Sarcococca hookeriana var. humilis",czech:"Sarkokoka"},
  {id:7188,name:"sweet box",latin:"Sarcococca hookeriana var. humilis \'Sarsid2\' FRAGRANT MOUNTAIN",czech:"Sarkokoka"},
  {id:4304,name:"sweet potato vine",latin:"Ipomoea batatas SWEET CAROLINE BEWITCHED GREEN WITH ENVY",czech:"Povíjnice batátová"},
  {id:8622,name:"sweet potato vine",latin:"Ipomoea batatas cvs.",czech:"Povíjnice batátová"},
  {id:5257,name:"Swiss cheese plant",latin:"Monstera deliciosa",czech:"Monstera"},
  {id:8717,name:"table fern",latin:"Pteris ensiformis",czech:"Pteris"},
  {id:1001,name:"trailing snapdragon",latin:"Asarina procumbens",czech:"Asarina"},
  {id:5741,name:"trailing watermelon begonia",latin:"Pellionia repens",czech:"Pelionie"},
  {id:7743,name:"tropical almond",latin:"Terminalia catappa",czech:"Terminálie"},
  {id:8004,name:"tulip",latin:"Tulipa (group)",czech:"Tulipán"},
  {id:2287,name:"umbrella plant",latin:"Cyperus alternifolius \'Variegatus\'",czech:"Šáchor"},
  {id:2288,name:"umbrella plant",latin:"Cyperus involucratus",czech:"Šáchor"},
  {id:2289,name:"umbrella plant",latin:"Cyperus involucratus \'Baby Tut\'",czech:"Šáchor"},
  {id:2290,name:"umbrella plant",latin:"Cyperus involucratus \'Gracilis\'",czech:"Šáchor"},
  {id:7245,name:"umbrella plant",latin:"Schefflera arboricola",czech:"Šeflera"},
  {id:549,name:"urn plant",latin:"Aechmea fasciata",czech:"Echmea"},
  {id:8603,name:"variegated Persian ivy",latin:"Hedera colchica \'Sulfur Heart\'",czech:"Břečťan kolchický"},
  {id:5258,name:"variegated Swiss cheese plant",latin:"Monstera deliciosa \'Variegata\'",czech:"Monstera"},
  {id:4557,name:"velvet leaf kalanchoe",latin:"Kalanchoe beharensis",czech:"Kalanchoe"},
  {id:3259,name:"velvet plant",latin:"Gynura aurantiaca",czech:"Gynura"},
  {id:2498,name:"Venus fly trap",latin:"Dionaea muscipula",czech:"Mucholapka podivná"},
  {id:2499,name:"Venus fly trap",latin:"Dionaea muscipula \'Akai Ryu\'",czech:"Mucholapka podivná"},
  {id:2500,name:"Venus fly trap",latin:"Dionaea muscipula \'Cup-shaped\'",czech:"Mucholapka podivná"},
  {id:2501,name:"Venus fly trap",latin:"Dionaea muscipula \'King Henry\'",czech:"Mucholapka podivná"},
  {id:5706,name:"Venus\' slipper",latin:"Paphiopedilum (group)",czech:"Pafiopedilum"},
  {id:5869,name:"vilevine",latin:"Philodendron hederaceum",czech:"Filodendron"},
  {id:7171,name:"viper\'s bowstring hemp",latin:"Sansevieria trifasciata",czech:"Tchýnin jazyk"},
  {id:8314,name:"vriesea",latin:"Vriesea splendens",czech:"Vrízie"},
  {id:5589,name:"water chestnut",latin:"Pachira aquatica \'Lemon Blush\'",czech:"Pachira vodní"},
  {id:5806,name:"watermelon peperomia",latin:"Peperomia argyreia",czech:"Peperomie"},
  {id:1219,name:"wax begonia",latin:"Begonia semperflorens-cultorum \'Harmony Scarlet\'",czech:"Begónie stálokvětá"},
  {id:3971,name:"wax plant",latin:"Hoya carnosa",czech:"Voskovka"},
  {id:2954,name:"weeping fig",latin:"Ficus benjamina",czech:"Fíkovník Benjamínův"},
  {id:2955,name:"weeping fig",latin:"Ficus benjamina \'Variegata\'",czech:"Fíkovník Benjamínův"},
  {id:7890,name:"wishbone flower",latin:"Torenia fournieri",czech:"Torénie"},
  {id:8794,name:"yucca",latin:"Yucca filamentosa (incl. hybrid cvs.)",czech:"Juka vláknitá"},
  {id:861,name:"zebra plant",latin:"Aphelandra squarrosa",czech:"Afelandra"},
  {id:1471,name:"zebra plant",latin:"Calathea zebrina",czech:"Kalatea"},
  {id:7920,name:"zigzag spiderwort",latin:"Tradescantia subaspera",czech:"Podeňka"},
  {id:5737,name:"zonal geranium",latin:"Pelargonium hortorum",czech:"Muškát zahradní"},
  {id:8680,name:"zonal geranium",latin:"Pelargonium x hortorum",czech:"Muškát zahradní"},
  {id:8386,name:"ZZ plant",latin:"Zamioculcas zamiifolia",czech:"Zamiokulkas"},
  {id:8387,name:"ZZ plant",latin:"Zamioculcas zamiifolia \'Raven\'",czech:"Zamiokulkas"},
];

Object.assign(window, {
  PERENUAL, INDOOR_PLANTS, speciesCare, searchSpecies, searchLocalPlants, getSpeciesDetails, identifySpecies, resolveSpecies, setPlantIdKey, setIdentifyLang, setHousePlantsKey,
  setApiKey, hasApiKey, SEED_PLANTS,
  setAnthropicKey, hasAnthropicKey, aiReviewCare, doctorAsk,
});
