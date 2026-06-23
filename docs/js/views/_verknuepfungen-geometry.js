/**
 * Geometrie + Graphaufbau fuer den Verknuepfungen-Tab (heterogener Graph).
 * Reine Funktionen, kein DOM, kein D3 — damit unit-testbar und deterministisch
 * (Vorbild _network-geometry.js): gleiche Daten + gleiche Optionen ergeben
 * dieselbe Grafik, analytische Positionen aus sin/cos, KEINE Force-Simulation.
 *
 * Modell. Der Graph ist die getypte Nachbarschaft einer Fokus-Entitaet
 * (Default: Malaniuk) ueber einen Record-Satz. Knotentypen: person, ort, werk,
 * institution. Zwei Schaerfegrade:
 *   - weit  (Record-Bezug): Entitaeten, die mit dem Fokus im selben Dokument
 *           genannt sind. Unscharf — Ko-Okkurrenz, KEIN Auftrittsnachweis.
 *   - eng   (Ereignis-Verortung): nur Records, die ein m3gim:SpatiotemporalEvent
 *           oder eine m3gim:Performance tragen (raumzeitlich/auffuehrungs-belegt).
 * Die Differenz (eng von weit) wird als Kennzahl ausgewiesen, nicht geglaettet.
 */

export const NODE_TYPES = ['person', 'werk', 'institution', 'ort'];

export const NODE_TYPE_META = {
  person:      { label: 'Person',      color: 'var(--vk-node-person)' },
  werk:        { label: 'Werk',        color: 'var(--vk-node-werk)' },
  institution: { label: 'Institution', color: 'var(--vk-node-institution)' },
  ort:         { label: 'Ort',         color: 'var(--vk-node-ort)' },
};

// Fokus-Default: das Nachlass-Subjekt. Per Q-ID stabil, Name als Fallback.
export const DEFAULT_FOCUS = { type: 'person', name: 'Malaniuk, Ira' };
const MALANIUK_RX = /malaniuk/i;

const STORE_MAP_FOR_TYPE = {
  person: 'persons',
  werk: 'works',
  institution: 'organizations',
  ort: 'locations',
};

/**
 * recordId -> Jahr (aus store.byYear invertiert). Fuer die Zeitfenster-Facette.
 */
function recordYearIndex(store) {
  const idx = new Map();
  for (const [year, recs] of store.byYear) {
    for (const r of recs) idx.set(r['@id'], year);
  }
  return idx;
}

/** Records, die mind. ein STE ODER eine Performance tragen (enger Schaerfegrad). */
function eventAnchoredRecords(store) {
  const set = new Set();
  for (const id of store.recordToEvents.keys()) set.add(id);
  for (const id of store.recordToPerformances.keys()) set.add(id);
  return set;
}

/**
 * Findet den Store-Eintrag der Fokus-Entitaet und liefert {name, records:Set}.
 * Malaniuk wird per Name-Regex robust getroffen (sie traegt im Personen-Index
 * die kanonische Form "Malaniuk, Ira").
 */
function resolveFocus(store, focus) {
  const mapName = STORE_MAP_FOR_TYPE[focus.type] || 'persons';
  const map = store[mapName];
  if (!map) return null;
  if (map.has(focus.name)) {
    return { type: focus.type, name: focus.name, records: map.get(focus.name).records };
  }
  // Fallback fuer Malaniuk: tolerante Suche.
  if (focus.type === 'person' && MALANIUK_RX.test(focus.name)) {
    for (const [name, entry] of map) {
      if (MALANIUK_RX.test(name)) return { type: 'person', name, records: entry.records };
    }
  }
  return null;
}

/** Zusatz-Metadaten je Entitaetstyp fuer Tooltip/Detail (datengedeckt, kein Deuten). */
function nodeMeta(type, entry) {
  if (type === 'institution') {
    return { sitz: entry.sitz || null, keyContact: entry.keyContact || null,
             note: entry.note || null, roles: [...(entry.roles || [])] };
  }
  if (type === 'person') {
    return { note: entry.note || null, lifespan: entry.lifespan || null,
             voiceType: entry.voiceType || null, roles: [...(entry.roles || [])] };
  }
  if (type === 'werk') {
    return { partie: entry.partie || null, komponist: entry.komponist || null,
             note: entry.note || null };
  }
  return { roles: [...(entry.roles || [])] };
}

/**
 * Baut die getypte Nachbarschaft des Fokus.
 *
 * @param {object} store
 * @param {object} opts
 * @param {{type,name}} [opts.focus]      Fokus-Entitaet (Default Malaniuk)
 * @param {'weit'|'eng'} [opts.schaerfe]
 * @param {{ort?:string, zeitfenster?:[number,number]}} [opts.filter]
 * @param {Object<string,boolean>} [opts.types]  Knotentyp-Toggles (Default alle an)
 * @param {number} [opts.topN]            max. Knoten je Typ (Lesbarkeits-Cap)
 * @returns {{center, nodes, edges, stats}}
 */
export function buildGraph(store, opts = {}) {
  const focus = opts.focus || DEFAULT_FOCUS;
  const schaerfe = opts.schaerfe === 'eng' ? 'eng' : 'weit';
  const filter = opts.filter || {};
  const typeOn = { person: true, werk: true, institution: true, ort: true, ...(opts.types || {}) };
  const topN = Number.isFinite(opts.topN) ? opts.topN : 12;

  const resolved = resolveFocus(store, focus);
  const empty = { center: null, nodes: [], edges: [],
                  stats: { focus: focus.name, recordsWeit: 0, recordsEng: 0, total: 0, truncated: {} } };
  if (!resolved) return empty;

  // Record-Satz des Fokus, dann Filter anwenden.
  let records = new Set(resolved.records);
  const recordsWeitBase = records.size;

  if (filter.ort && store.locations.has(filter.ort)) {
    const ortRecs = store.locations.get(filter.ort).records;
    records = new Set([...records].filter(id => ortRecs.has(id)));
  }
  if (Array.isArray(filter.zeitfenster)) {
    const [from, to] = filter.zeitfenster;
    const yIdx = recordYearIndex(store);
    records = new Set([...records].filter(id => {
      const y = yIdx.get(id);
      return y != null && y >= from && y <= to;
    }));
  }

  const recordsWeit = records.size;

  // Enger Schaerfegrad: nur ereignis-/auffuehrungs-belegte Records.
  let effective = records;
  if (schaerfe === 'eng') {
    const anchored = eventAnchoredRecords(store);
    effective = new Set([...records].filter(id => anchored.has(id)));
  }
  const recordsEng = schaerfe === 'eng' ? effective.size
    : [...records].filter(id => store.recordToEvents.has(id) || store.recordToPerformances.has(id)).length;

  // Nachbarn je Typ: shared = |entity.records ∩ effective|.
  const byType = {};
  const truncated = {};
  for (const type of NODE_TYPES) {
    if (!typeOn[type]) continue;
    const map = store[STORE_MAP_FOR_TYPE[type]];
    const cand = [];
    for (const [name, entry] of map) {
      if (type === resolved.type && name === resolved.name) continue; // Fokus selbst raus
      let shared = 0;
      for (const id of effective) if (entry.records.has(id)) shared++;
      if (shared > 0) {
        cand.push({ type, name, weight: shared, records: entry.records, meta: nodeMeta(type, entry) });
      }
    }
    cand.sort((a, b) => (b.weight - a.weight) || a.name.localeCompare(b.name, 'de'));
    if (cand.length > topN) truncated[type] = cand.length - topN;
    byType[type] = cand.slice(0, topN);
  }

  const nodes = NODE_TYPES.flatMap(t => byType[t] || []);

  // Kanten Fokus -> Nachbar (Gewicht = geteilte Records).
  const edges = nodes.map(n => ({ a: '__focus__', b: nodeId(n), shared: n.weight, kind: 'focus' }));

  const center = {
    id: '__focus__', type: resolved.type, name: resolved.name,
    records: resolved.records, meta: nodeMeta(resolved.type, store[STORE_MAP_FOR_TYPE[resolved.type]].get(resolved.name) || {}),
  };

  return {
    center,
    nodes,
    edges,
    stats: {
      focus: resolved.name,
      recordsWeitBase,   // Fokus-Records vor Filter
      recordsWeit,       // nach Ort/Zeit-Filter (weit)
      recordsEng,        // ereignis-/auffuehrungs-belegt
      total: nodes.length,
      truncated,         // {type: anzahl uebersprungen}
      byType: Object.fromEntries(NODE_TYPES.map(t => [t, (byType[t] || []).length])),
    },
  };
}

/** Stabiler Knoten-Identifier (Typ + Name). */
export function nodeId(node) {
  return `${node.type}:${node.name}`;
}

/**
 * Deterministisches typ-partitioniertes Radial-Layout. Vier Typ-Sektoren je
 * 90 Grad (Person oben, Werk rechts, Institution unten, Ort links), Knoten
 * alphabetisch-stabil auf dem Sektor-Bogen verteilt, Radius nach Ring, Position
 * analytisch. Winkel 0 = 12 Uhr, x = cx + R·sin(a), y = cy − R·cos(a).
 *
 * @returns {{center:{x,y,r}, nodes:[{...,x,y,r,angle,color}], edges}}
 */
export function computeLayout(graph, { cx, cy, radius }) {
  // Sektor-Mitte je Typ (Radiant, 0 = oben, im Uhrzeigersinn).
  const SECTOR_CENTER = {
    person: 0,                 // oben
    werk: Math.PI / 2,         // rechts
    institution: Math.PI,      // unten
    ort: 3 * Math.PI / 2,      // links
  };
  const SECTOR_SPAN = Math.PI / 2 * 0.82; // etwas Luft zwischen den Sektoren

  const laidNodes = [];
  for (const type of NODE_TYPES) {
    const group = graph.nodes.filter(n => n.type === type);
    const total = group.length;
    if (total === 0) continue;
    const center = SECTOR_CENTER[type];
    const start = center - SECTOR_SPAN / 2;
    const step = total > 1 ? SECTOR_SPAN / (total - 1) : 0;
    for (let i = 0; i < total; i++) {
      const n = group[i];
      const angle = total === 1 ? center : start + i * step;
      // Zwei Ringe gegen Gedraenge: gerade Indizes innen, ungerade aussen.
      const ring = (i % 2 === 0) ? radius : radius * 1.32;
      const nodeR = Math.max(7, Math.min(26, Math.sqrt(n.weight) * 5));
      laidNodes.push({
        ...n,
        id: nodeId(n),
        x: cx + ring * Math.sin(angle),
        y: cy - ring * Math.cos(angle),
        r: nodeR,
        angle,
        color: NODE_TYPE_META[type].color,
      });
    }
  }

  return {
    center: { ...graph.center, x: cx, y: cy, r: 34, color: 'var(--vk-node-focus)' },
    nodes: laidNodes,
    edges: graph.edges,
  };
}
