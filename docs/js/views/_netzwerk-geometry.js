/**
 * Netzwerk geometry: the pure half of the view. No DOM, no d3, so the picture
 * stays reproducible in unit tests and in the dev console.
 *
 * The graph is the typed neighbourhood of a Fokus-Entitaet over the node types
 * Person, Werk, Institution and Ort. With Malaniuk as focus and the node type
 * restricted to Person it is the concentric person network of the earlier
 * Netzwerk tab; the merged form generalises it (E-160).
 *
 * Two things carry evidence, and they are orthogonal.
 *   - Line type. A straight line means an explicitly annotated AgRelOn
 *     relation, a curved one means Ko-Okkurrenz derived from the documents
 *     (E-163 keeps this distinction after the Schaerfegrad-Umschalter went).
 *   - Ring. The inner ring holds nodes with a structured relation or a
 *     Normdaten-anchored, document-dense tie; the outer ring the rest.
 *
 * Determinismus (design.md Regel 15): angles from the alphabetical order inside
 * a type sector, positions analytically from sin/cos, no force simulation.
 * Winkel 0 = 12 Uhr, x = cx + R·sin(a), y = cy − R·cos(a).
 */

import { KOMPONISTEN_NAMEN } from '../data/constants.js';

// ---------------------------------------------------------------------------
// Knotentypen
// ---------------------------------------------------------------------------

export const NODE_TYPES = ['person', 'werk', 'institution', 'ort'];

/**
 * Display form and colour per node type. The colours are the four
 * Inhaltsfamilien of design.md Regel 2, the same tokens the Bestand uses, so a
 * Werk carries one colour across the whole interface. Person nodes are the
 * exception: they are filled by their Netzwerk-Kategorie, and the family colour
 * stays their marker in the Knotentypen control.
 */
export const NODE_TYPE_META = {
  person:      { label: 'Person',      color: 'var(--chip-c-person-text)' },
  werk:        { label: 'Werk',        color: 'var(--chip-c-werk-text)' },
  institution: { label: 'Institution', color: 'var(--chip-c-institution-text)' },
  ort:         { label: 'Ort',         color: 'var(--chip-c-ort-text)' },
};

const STORE_MAP_FOR_TYPE = {
  person: 'persons',
  werk: 'works',
  institution: 'organizations',
  ort: 'locations',
};

/** Fokus-Default: das Nachlass-Subjekt. Per Q-ID stabil, Name als Fallback. */
export const DEFAULT_FOCUS = { type: 'person', name: 'Malaniuk, Ira' };

/** Knoten je Typ, solange die View keinen anderen Wert stellt. */
export const DEFAULT_TOP_N = 12;

// ---------------------------------------------------------------------------
// Rollenbasierte Personen-Kategorisierung
//
// Die globale `entry.kategorie` aus `getPersonKategorie()` nutzt eine statische
// Keyword-Liste ueber Namen; nur ein Bruchteil der Personen matcht dort. Hier
// entsteht die Kategorie aus den tatsaechlichen `entry.roles`, also datengetragen.
//
// Prioritaet bei Mehrfachrollen: Produktion > Buehne > Vermittlung >
// Korrespondenz > Presse > Erwaehnt. Wer dirigiert UND singt, ist primaer
// Dirigent; reine Rezensions-Erwaehnungen stehen hinten an.
// ---------------------------------------------------------------------------

/**
 * Farbe je Netzwerk-Kategorie als `var(--color-netzwerk-*)`-Verweis auf die
 * kategoriale Palette in `variables.css`. Erwaehnt und Andere bleiben grau,
 * schwache Evidenz ist keine eigene Kategorie. Konsumenten setzen den Wert als
 * *style*, nicht als SVG-`fill`-Attribut, sonst loest `var()` nicht auf.
 */
export const NETZWERK_KATEGORIEN = {
  'Produktion':     'var(--color-netzwerk-produktion)',    // Regie/Dirigat/Komposition
  'Bühne':          'var(--color-netzwerk-buehne)',        // Sänger:innen-Kolleg:innen
  'Vermittlung':    'var(--color-netzwerk-vermittlung)',   // Agenten, Veranstalter
  'Korrespondenz':  'var(--color-netzwerk-korrespondenz)', // Absender, Empfaenger
  'Presse':         'var(--color-netzwerk-presse)',        // Verfasser:innen von Texten
  'Erwähnt':        'var(--color-netzwerk-erwaehnt)',      // grau — nur in Dritt-Erwaehnung
  'Andere':         'var(--color-netzwerk-andere)',        // grau — ohne Kategorie
};

const ROLE_PRIO = [
  ['Produktion', new Set([
    'komponist', 'dirigent', 'regisseur', 'chorleiter', 'librettist',
    'arrangeur', 'bühnenbildner', 'buehnenbildner', 'kostümbildner',
    'kostuembildner', 'choreograph', 'choreograf', 'ausstatter',
    'technische leitung', 'übersetzer', 'uebersetzer', 'herausgeber',
    'bühnenleiter', 'buehnenleiter',
  ])],
  ['Bühne', new Set(['sänger', 'saenger', 'sängerin', 'interpret', 'protagonist'])],
  ['Vermittlung', new Set(['vermittler', 'agent', 'auftraggeber', 'veranstalter'])],
  ['Korrespondenz', new Set([
    'absender', 'empfänger', 'empfaenger', 'adressat', 'unterzeichner',
  ])],
  ['Presse', new Set(['verfasser'])],
];

const ERWAEHNT_RX = /^erw(?:ä|ae)hnt$/;

/** Kategorie einer Person aus ihren Rollen. Liefert einen Key aus NETZWERK_KATEGORIEN. */
export function derivePersonKategorie(entry) {
  if (!entry || !entry.roles || entry.roles.size === 0) return 'Andere';
  const roles = new Set();
  for (const r of entry.roles) roles.add(String(r || '').toLowerCase().trim());

  for (const [kat, set] of ROLE_PRIO) {
    for (const r of roles) if (set.has(r)) return kat;
  }
  let onlyErwaehnt = true;
  for (const r of roles) {
    if (!ERWAEHNT_RX.test(r)) { onlyErwaehnt = false; break; }
  }
  if (onlyErwaehnt) return 'Erwähnt';
  return 'Andere';
}

/** Farbe eines Personenknotens: rollenbasierte Kategorie, nicht die statische
 *  Namens-Keyword-Kategorie in entry.kategorie. */
export function nodeColor(entry) {
  return NETZWERK_KATEGORIEN[derivePersonKategorie(entry)] || NETZWERK_KATEGORIEN.Andere;
}

// ---------------------------------------------------------------------------
// Evidenz
// ---------------------------------------------------------------------------

// Malaniuk-Identifikation: per Q-ID stabil, Name als Fallback.
const MALANIUK_QID = 'wd:Q94208';
const MALANIUK_NAME_RX = /malaniuk/i;

/** Schwellen der Ringzuordnung, gebuendelt, damit sie tunebar bleiben. */
export const RING_THRESHOLDS = {
  HARD_MIN_RECORDS_WITH_QID: 5,  // innerer Ring, wenn Q-ID + dokumenten-dicht
};

/** Ist die Entitaet Ira Malaniuk selbst? */
export function isMalaniuk(name, entry) {
  if (entry && entry.wikidata === MALANIUK_QID) return true;
  if (name && MALANIUK_NAME_RX.test(name)) return true;
  return false;
}

/**
 * 'strong' = AgRelOn-strukturierte Beziehung vorhanden, 'weak' = nur
 * Ko-Okkurrenz in Dokumenten. Orthogonal zur Ringzuordnung.
 */
export function nodeEvidence(entry) {
  return (entry && entry.relations && entry.relations.length > 0) ? 'strong' : 'weak';
}

/**
 * Ring eines Knotens. Innen steht, was eine strukturierte Beziehung traegt oder
 * normdaten-verankert und dokumenten-dicht am Fokus haengt; aussen der Rest.
 * @param {{evidence: string, wikidata: ?string, weight: number}} node
 * @returns {1|2}
 */
export function nodeRing(node) {
  if (!node) return 2;
  if (node.evidence === 'strong') return 1;
  const hasQid = !!(node.wikidata && String(node.wikidata).startsWith('wd:'));
  if (hasQid && node.weight >= RING_THRESHOLDS.HARD_MIN_RECORDS_WITH_QID) return 1;
  return 2;
}

// ---------------------------------------------------------------------------
// Reine Werk-Komponisten
// ---------------------------------------------------------------------------

// Namensbestandteile als Menge, an Nicht-Buchstaben getrennt. Ein Vergleich per
// includes() traf jede Teilzeichenkette: 'wolf' passte auf "Wolfgang" und
// "Wolfram", 'verdi' auf "Monteverdi".
function nameTokens(name) {
  return new Set(String(name).toLowerCase().split(/[^\p{L}]+/u).filter(Boolean));
}

/** Traegt der Name den Nachnamen eines gelisteten Werk-Komponisten? */
function hasComposerSurname(name) {
  const tokens = nameTokens(name);
  for (const composer of KOMPONISTEN_NAMEN) {
    if (tokens.has(composer)) return true;
  }
  return false;
}

const COMPOSER_ROLE = 'komponist';

/**
 * Soll die Person als Personenknoten auftauchen? Reine Werk-Komponisten
 * (Wagner R., Strauss, Mozart, Beethoven) stehen als Komponist am Werk-Knoten
 * und bleiben als Person draussen.
 *
 * Zwei Bedingungen muessen zusammenkommen. Der Name traegt den Nachnamen eines
 * gelisteten Komponisten, und die Person tritt im Bestand tatsaechlich als
 * Komponist auf. Ein geteilter Nachname allein genuegt nicht, sonst fallen der
 * Bassist "Weber, Ludiwig" und die Saengerin "Schubert, Erika" heraus. Ausnahme
 * bleibt jede kuratierte Nicht-Komponisten-Kategorie, also Regie (Wieland und
 * Wolfgang Wagner) ebenso wie Dirigat (Hindemith dirigierte und komponierte).
 */
export function isPureComposer(name, entry) {
  if (!name) return false;
  const kat = entry && entry.kategorie;
  if (kat && kat !== 'Komponist' && kat !== 'Andere') return false;
  if (!hasComposerSurname(name)) return false;
  if (entry && entry.roles && entry.roles.size > 0) {
    for (const role of entry.roles) {
      if (String(role || '').toLowerCase().trim() === COMPOSER_ROLE) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Fokus und Graphaufbau
// ---------------------------------------------------------------------------

/** Store-Eintrag der Fokus-Entitaet. Malaniuk wird tolerant getroffen, sie
 *  traegt im Personen-Index die kanonische Form "Malaniuk, Ira". */
function resolveFocus(store, focus) {
  const map = store && store[STORE_MAP_FOR_TYPE[focus.type] || 'persons'];
  if (!map) return null;
  if (map.has(focus.name)) {
    const entry = map.get(focus.name);
    return { type: focus.type, name: focus.name, entry, records: entry.records };
  }
  if (focus.type === 'person' && MALANIUK_NAME_RX.test(focus.name)) {
    for (const [name, entry] of map) {
      if (MALANIUK_NAME_RX.test(name)) return { type: 'person', name, entry, records: entry.records };
    }
  }
  return null;
}

/**
 * Der Record-Satz der Fokus-Entitaet, die Startmenge des Schnitts. Leeres Set,
 * wenn der Fokus nicht im Bestand steht. Der View braucht dieselbe Aufloesung
 * wie buildGraph, sonst weichen Bild und Zaehlstand voneinander ab.
 * @returns {Set<string>}
 */
export function focusRecords(store, focus) {
  const resolved = resolveFocus(store, focus || DEFAULT_FOCUS);
  return resolved ? resolved.records : new Set();
}

/** Stabiler Knoten-Identifier (Typ + Name). */
export function nodeId(node) {
  return `${node.type}:${node.name}`;
}

/** Zusatzfelder je Entitaetstyp fuer Tooltip und Detail — datengedeckt, ohne Deuten. */
function nodeMeta(type, entry) {
  const e = entry || {};
  if (type === 'institution') {
    return { sitz: e.sitz || null, keyContact: e.keyContact || null,
             note: e.note || null, roles: [...(e.roles || [])] };
  }
  if (type === 'person') {
    return { note: e.note || null, lifespan: e.lifespan || null,
             voiceType: e.voiceType || null, roles: [...(e.roles || [])] };
  }
  if (type === 'werk') {
    return { partie: e.partie || null, komponist: e.komponist || null, note: e.note || null };
  }
  return { roles: [...(e.roles || [])] };
}

/** Eine annotierte Beziehung schlaegt jede Ko-Okkurrenz-Zahl, damit die geraden
 *  Linien die Kappung ueberleben. */
function evidenceRank(node) {
  return node.evidence === 'strong' ? 1 : 0;
}

/**
 * Baut die getypte Nachbarschaft des Fokus.
 *
 * @param {object} store
 * @param {object} opts
 * @param {{type,name}} [opts.focus]              Fokus-Entitaet (Default Malaniuk)
 * @param {?Set<string>} [opts.records]           Dokumentmenge aus recordsFor; ohne
 *   Angabe bleibt der Record-Satz des Fokus unbeschnitten
 * @param {Object<string,boolean>} [opts.types]   Knotentyp-Schalter (Default alle an)
 * @param {number} [opts.topN]                    max. Knoten je Typ
 * @returns {{center, nodes, edges, stats}}
 */
export function buildGraph(store, opts = {}) {
  const focus = opts.focus || DEFAULT_FOCUS;
  const typeOn = { person: true, werk: true, institution: true, ort: true, ...(opts.types || {}) };
  const topN = Number.isFinite(opts.topN) ? opts.topN : DEFAULT_TOP_N;

  const resolved = resolveFocus(store, focus);
  if (!resolved) {
    return {
      center: null, nodes: [], edges: [],
      stats: { focus: focus.name, focusType: focus.type, recordsBase: 0, records: 0,
               eng: 0, total: 0, agrelon: 0, truncated: {}, byType: {}, candidates: {} },
    };
  }

  const scope = opts.records instanceof Set ? opts.records : null;
  const effective = new Set();
  for (const id of resolved.records) {
    if (!scope || scope.has(id)) effective.add(id);
  }

  // Jede AgRelOn-Relation haengt am Nachlass-Subjekt. Eine gerade Linie kann es
  // also nur geben, solange sie der Fokus ist; bei jedem anderen Fokus traegt
  // der Graph reine Ko-Okkurrenz und sagt das ueber die Linienart.
  const focusIsSubject = isMalaniuk(resolved.name, resolved.entry);

  const byType = {};
  const truncated = {};
  for (const type of NODE_TYPES) {
    if (!typeOn[type]) continue;
    const map = store[STORE_MAP_FOR_TYPE[type]];
    if (!map) continue;
    const cand = [];
    for (const [name, entry] of map) {
      if (!entry || !entry.records) continue;
      if (type === resolved.type && name === resolved.name) continue;
      // Malaniuk steht im Zentrum oder gar nicht; reine Werk-Komponisten
      // stehen am Werk-Knoten.
      if (type === 'person' && (isMalaniuk(name, entry) || isPureComposer(name, entry))) continue;
      let shared = 0;
      for (const id of effective) if (entry.records.has(id)) shared++;
      if (shared === 0) continue;
      const evidence = (focusIsSubject && type === 'person') ? nodeEvidence(entry) : 'weak';
      const node = {
        id: `${type}:${name}`,
        type, name, entry,
        weight: shared,
        records: entry.records,
        meta: nodeMeta(type, entry),
        evidence,
        wikidata: entry.wikidata || null,
        kategorie: type === 'person' ? derivePersonKategorie(entry) : null,
        color: type === 'person' ? nodeColor(entry) : NODE_TYPE_META[type].color,
      };
      node.ring = nodeRing(node);
      cand.push(node);
    }
    cand.sort((a, b) => (evidenceRank(b) - evidenceRank(a))
      || (b.weight - a.weight)
      || a.name.localeCompare(b.name, 'de'));
    if (cand.length > topN) truncated[type] = cand.length - topN;
    byType[type] = cand.slice(0, topN);
  }

  const nodes = NODE_TYPES.flatMap(t => byType[t] || []);
  const edges = nodes.map(n => ({
    a: '__focus__', b: n.id, shared: n.weight,
    kind: n.evidence === 'strong' ? 'agrelon' : 'cooc',
  }));

  const center = {
    id: '__focus__', type: resolved.type, name: resolved.name, entry: resolved.entry,
    records: resolved.records, wikidata: (resolved.entry && resolved.entry.wikidata) || null,
    kategorie: resolved.type === 'person' ? derivePersonKategorie(resolved.entry) : null,
    meta: nodeMeta(resolved.type, resolved.entry),
  };

  const anchored = eventAnchoredRecords(store);
  let engCount = 0;
  for (const id of effective) if (anchored.has(id)) engCount++;

  return {
    center, nodes, edges, effective,
    stats: {
      focus: resolved.name,
      focusType: resolved.type,
      recordsBase: resolved.records.size,   // Fokus-Records vor dem Schnitt
      records: effective.size,              // Fokus-Records im aktuellen Schnitt
      eng: engCount,                        // davon raumzeitlich/auffuehrungs-belegt
      total: nodes.length,
      agrelon: nodes.filter(n => n.evidence === 'strong').length,
      truncated,
      byType: Object.fromEntries(NODE_TYPES.map(t => [t, (byType[t] || []).length])),
      // Kandidaten je Typ vor der Kappung, damit die Sidebar "12 von 436"
      // beziffern kann statt die Kappung stumm zu lassen.
      candidates: Object.fromEntries(NODE_TYPES.map(t =>
        [t, (byType[t] || []).length + (truncated[t] || 0)])),
      ringCounts: {
        1: nodes.filter(n => n.ring === 1).length,
        2: nodes.filter(n => n.ring === 2).length,
      },
    },
  };
}

/** Records mit verorteter Annotation oder Performance (raumzeitlich belegt). */
function eventAnchoredRecords(store) {
  const set = new Set();
  if (store && store.recordToEvents) for (const id of store.recordToEvents.keys()) set.add(id);
  if (store && store.recordToPerformances) for (const id of store.recordToPerformances.keys()) set.add(id);
  return set;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * Die eingeschalteten Knotentypen teilen den Kreis unter sich auf, Person oben,
 * dann im Uhrzeigersinn Werk, Institution, Ort. Stehen alle vier, ist jeder
 * Sektor ein Quadrant; bleibt nur einer uebrig, traegt er den vollen Kreis und
 * das Bild ist das konzentrische Personennetz.
 */
const SECTOR_GAP = 0.92;                // Luft zwischen zwei Sektoren
// Versatz innerhalb eines Rings: jeder zweite Knoten sitzt etwas weiter aussen.
// Ohne ihn ueberlappen die Kreise, sobald ein Sektor mehr als eine Handvoll
// Knoten traegt; die beiden Evidenzbaender bleiben dabei getrennt lesbar.
const STAGGER = 1.15;

/** Normalisierter Sortierschluessel: "Nachname, Vorname" -> "nachname". */
function sortKey(name) {
  return String(name || '').split(',')[0].trim().toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
}

/**
 * Deterministisches typ-partitioniertes Radial-Layout. Die eingeschalteten
 * Knotentypen teilen den Kreis unter sich auf, darin zwei Ringe nach
 * Evidenzstaerke, die Knoten alphabetisch auf dem Sektorbogen verteilt. Die
 * alphabetische Ordnung haelt die Position eines Knotens stabil, wenn ein Filter
 * die Nachbarschaft verkleinert.
 *
 * @returns {{center:{x,y,r}, nodes:Array, edges:Array, radii:{1:number,2:number}}}
 */
export function computeLayout(graph, { cx, cy, radius }) {
  const ringRadius = { 1: radius, 2: radius * 1.38 };
  const present = NODE_TYPES.filter(t => graph.nodes.some(n => n.type === t));
  const slot = 2 * Math.PI / (present.length || 1);
  const full = present.length === 1;
  const laid = [];
  for (const type of present) {
    const sectorCenter = present.indexOf(type) * slot;
    const span = full ? 2 * Math.PI : slot * SECTOR_GAP;
    for (const ring of [1, 2]) {
      const group = graph.nodes
        .filter(n => n.type === type && n.ring === ring)
        .sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name), 'de'));
      const total = group.length;
      if (total === 0) continue;
      // Im vollen Kreis schliesst sich der Bogen, also traegt jeder Knoten
      // seinen eigenen Schritt; in einem Sektor sitzen erster und letzter
      // Knoten auf den Sektorgrenzen.
      const start = full ? 0 : sectorCenter - span / 2;
      const step = full ? span / total : (total > 1 ? span / (total - 1) : 0);
      const R = ringRadius[ring];
      for (let i = 0; i < total; i++) {
        const n = group[i];
        const angle = (!full && total === 1) ? sectorCenter : start + i * step;
        const rr = total > 1 && i % 2 === 1 ? R * STAGGER : R;
        laid.push({
          ...n,
          x: cx + rr * Math.sin(angle),
          y: cy - rr * Math.cos(angle),
          r: Math.max(6, Math.min(20, Math.sqrt(n.weight) * 4)),
          angle,
        });
      }
    }
  }

  return {
    center: graph.center ? { ...graph.center, x: cx, y: cy, r: 34 } : null,
    nodes: laid,
    edges: graph.edges,
    radii: ringRadius,
  };
}

/**
 * Textanker und Versatz eines Knoten-Labels. Winkel 0 = 12 Uhr, rechte
 * Halbebene haengt das Label rechts an, linke links.
 */
export function labelGeometry(angle, nodeR, gap = 5) {
  const norm = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const rightHalf = norm < Math.PI;
  return {
    anchor: rightHalf ? 'start' : 'end',
    dx: (rightHalf ? 1 : -1) * (nodeR + gap),
    dy: 3,
  };
}

// ---------------------------------------------------------------------------
// Ko-Okkurrenz unter den Nachbarn
// ---------------------------------------------------------------------------

/**
 * Zwei Nachbarn sind verknuepft, wenn sie in mindestens `minShared` Dokumenten
 * des aktuellen Schnitts gemeinsam vorkommen. Das ist die Topologie jenseits
 * der Fokus-Sternstruktur: wer mit wem sang, welches Werk an welchem Ort stand.
 *
 * Implementiert ueber Record-Buckets statt paarweiser Mengenschnitte.
 * Deterministisch: gleiche Daten, gleiche Paarliste.
 *
 * @param {Array} nodes            Knoten aus buildGraph
 * @param {Set<string>} scope      Dokumentmenge des Schnitts
 * @returns {Array<{a: string, b: string, shared: number}>} Knoten-Ids, absteigend
 */
export function computeCoOccurrence(nodes, scope, { minShared = 2, maxEdges = 250 } = {}) {
  const recordToNodes = new Map();
  for (const n of nodes) {
    for (const id of n.records) {
      if (scope && !scope.has(id)) continue;
      let set = recordToNodes.get(id);
      if (!set) { set = []; recordToNodes.set(id, set); }
      set.push(n.id);
    }
  }

  // Der Paar-Key verbindet die beiden Ids mit einem Steuerzeichen, weil es in
  // keinem Namen vorkommen kann. Als Escape geschrieben, sonst sieht es im
  // Editor wie eine leere Zeichenkette aus.
  const SEP = '';
  const pairCount = new Map();
  for (const ids of recordToNodes.values()) {
    if (ids.length < 2) continue;
    const arr = [...ids].sort();
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = arr[i] + SEP + arr[j];
        pairCount.set(key, (pairCount.get(key) || 0) + 1);
      }
    }
  }

  const pairs = [];
  for (const [key, count] of pairCount) {
    if (count < minShared) continue;
    const [a, b] = key.split(SEP);
    pairs.push({ a, b, shared: count });
  }
  pairs.sort((x, y) => (y.shared - x.shared)
    || x.a.localeCompare(y.a, 'de')
    || x.b.localeCompare(y.b, 'de'));
  return (maxEdges && pairs.length > maxEdges) ? pairs.slice(0, maxEdges) : pairs;
}
