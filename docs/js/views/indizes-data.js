/**
 * Indizes — pure data layer.
 *
 * Entry list of one register, its sorting, the shared-cut intersection, the
 * name search and the Umfeld of an expanded entry. No DOM: indizes.js adds
 * icons, columns and cell renderers on top.
 *
 * Since E-226 the view shows exactly one register at a time, so the former
 * cross-register facet cut is gone; what connects the registers now is the
 * Umfeld of an entry, which names the co-occurring entities instead of silently
 * cutting three other tables.
 */

import { isMalaniuk } from './_netzwerk-geometry.js';
import { buildEntities, buildOccurrences, hasGeo, countryByCity } from './karte-data.js';
import { cityOf } from '../utils/format.js';
import { yearOfId } from '../data/records-for.js';
import { matchesQuery } from '../utils/normalize.js';
import { facetValues } from '../ui/filter-state.js';

/**
 * @typedef {Object} GridEntry
 * @property {string} name
 * @property {number} count       number of linked records
 * @property {Set<string>} records
 * @property {?string} wikidata
 * @property {?Array<Object>} relations  persons only, AgRelOn (loader pass 2.5)
 */

/** Register key -> content family (E-212), the shared symbol and colour set. */
export const REGISTER_FAMILY = Object.freeze({
  personen: 'person',
  organisationen: 'institution',
  orte: 'ort',
  werke: 'werk',
});

/** Register key -> Beschriftung; Registerkopf und Tab-Menue teilen sie (E-230). */
export const REGISTER_LABELS = Object.freeze({
  personen: 'Personen',
  organisationen: 'Organisationen',
  orte: 'Orte',
  werke: 'Werke',
});

/**
 * Register key -> the entity type the rest of the application names it by. It
 * is the facet key of the shared filter and, with the same words, the node type
 * of the Netzwerk focus; the two coincide because both address the same four
 * content families (E-212).
 */
export const REGISTER_ENTITY_TYPE = Object.freeze({
  personen: 'person',
  organisationen: 'institution',
  orte: 'ort',
  werke: 'werk',
});

/** Register key -> store map holding its entries. */
const REGISTER_MAP = Object.freeze({
  personen: 'persons',
  organisationen: 'organizations',
  orte: 'locations',
  werke: 'works',
});

/** Per-register entry source and the fields the search runs over. */
const GRID_SOURCES = {
  personen: {
    getEntries: (s) => [...s.persons.entries()]
      .filter(([, data]) => data.records.size > 0)
      .map(([name, data]) => ({
        name, count: data.records.size, kategorie: data.kategorie, wikidata: data.wikidata, records: data.records,
        occupation: data.occupation || null, voiceType: data.voiceType || null,
        birthDate: data.birthDate || null, deathDate: data.deathDate || null,
        // AgRelOn relations from loader pass 2.5; without this field the
        // relation badges in indizes.js never had data (user-story audit
        // 2026-09-03).
        relations: data.relations || null,
      })),
    searchFields: (e) => [e.name, e.kategorie].filter(Boolean).join(' '),
  },
  organisationen: {
    getEntries: (s) => [...s.organizations.entries()]
      .filter(([, data]) => data.records.size > 0)
      .map(([name, data]) => ({
        name, count: data.records.size, wikidata: data.wikidata, records: data.records,
        // Sitz aus dem Organisationsindex, ersatzweise aus Wikidata; der Loader
        // fuehrt beides in einem Feld.
        sitz: data.sitz || null,
      })),
    searchFields: (e) => e.name,
  },
  orte: {
    getEntries: (s) => {
      const country = countryByCity(s);
      return [...s.locations.entries()]
        .filter(([, data]) => data.records.size > 0)
        .map(([name, data]) => ({
          name, count: data.records.size, wikidata: data.wikidata, records: data.records,
          land: country.get(cityOf(name).toLowerCase()) || null,
        }));
    },
    searchFields: (e) => e.name,
  },
  werke: {
    getEntries: (s) => [...s.works.entries()]
      .filter(([, data]) => data.records.size > 0)
      .map(([name, data]) => ({
        name, count: data.records.size, komponist: data.komponist || '', wikidata: data.wikidata, records: data.records,
        // Die Partie ist die kuratierte Angabe am Werk-Index; die belegten
        // Buehnenrollen kommen abgeleitet aus workStageRoles.
        partie: data.partie || '',
      })),
    searchFields: (e) => [e.name, e.komponist].filter(Boolean).join(' '),
  },
};

/** Every register key, in reading order. */
export const REGISTER_KEYS = Object.freeze(Object.keys(GRID_SOURCES));

// Memoised entry lists per register. getEntries materialises the full list from
// the store map on every call; the data never changes after the load.
// renderIndizes clears the cache when the store is exchanged.
const entriesCache = new Map();

/** Cached entry list of one register. */
export function getGridEntries(store, gridKey) {
  let cached = entriesCache.get(gridKey);
  if (!cached) {
    cached = GRID_SOURCES[gridKey].getEntries(store);
    entriesCache.set(gridKey, cached);
  }
  return cached;
}

export function clearEntriesCache() {
  entriesCache.clear();
  rolesCache = null;
  ambiguousRolesCache = null;
  karteNamesCache = null;
}

/**
 * The shared cut applied to a register: only entries with at least one document
 * in the cut survive (design rule 7, one sidebar and one document set). Each
 * survivor gets `cutCount`, the documents it holds inside the cut, as a copy;
 * the memoised list stays untouched. Ohne diese Zahl zeigte die Zeile den
 * Bestand ueber den ganzen Teilnachlass und widersprach der Sidebar (E-227).
 * @param {Array<GridEntry>} entries
 * @param {?Set<string>} recordIds  null leaves the list untouched
 */
export function entriesWithRecordsIn(entries, recordIds) {
  if (!recordIds) return entries;
  const out = [];
  for (const e of entries) {
    let n = 0;
    for (const id of e.records) if (recordIds.has(id)) n++;
    if (n > 0) out.push({ ...e, cutCount: n });
  }
  return out;
}

/** Belege eines Eintrags im aktuellen Schnitt; ungeschnitten sein Gesamtstand. */
export function cutCountOf(entry) {
  return entry.cutCount == null ? entry.count : entry.cutCount;
}

/**
 * Die Suche ueber die eigenen Felder des Registers. Der Begriff kommt
 * kleingeschrieben an. Die Normdaten-Schalter sind mit E-230 entfallen, die
 * Wikidata-Verknuepfung steht als Marke an der Zeile statt als Schnitt.
 * @param {Array<GridEntry>} entries
 * @param {string} gridKey
 * @param {{q?: string}} state
 */
export function filterEntries(entries, gridKey, { q = '' } = {}) {
  if (!q) return entries;
  const search = GRID_SOURCES[gridKey].searchFields;
  return entries.filter(e => matchesQuery(search(e), q));
}

/**
 * Sortierung des Registers (E-226): Belegzahl absteigend als Voreinstellung,
 * alphabetisch nach Name. Die Belegzahl ist die des Schnitts (E-227), damit die
 * Reihung dieselbe Zahl ordnet, die die Zeile zeigt. Returns a new array; the
 * memoised list stays intact.
 * @param {Array<GridEntry>} entries
 * @param {'count'|'alpha'} mode
 */
export function sortEntries(entries, mode) {
  const out = entries.slice();
  if (mode === 'alpha') {
    out.sort((a, b) => a.name.localeCompare(b.name, 'de-DE'));
  } else {
    out.sort((a, b) => cutCountOf(b) - cutCountOf(a) || a.name.localeCompare(b.name, 'de-DE'));
  }
  return out;
}

/** Umfeld groups in reading order, with the label the view prints. */
const UMFELD_GROUPS = Object.freeze([
  { key: 'personen', label: 'Personen' },
  { key: 'organisationen', label: 'Institutionen' },
  { key: 'orte', label: 'Orte' },
  { key: 'werke', label: 'Werke' },
]);

/**
 * Das Umfeld eines Eintrags: alle Entitaeten, die mit ihm in denselben
 * Dokumenten stehen, nach Inhaltsfamilie gruppiert und nach Ko-Okkurrenz
 * sortiert. Der Eintrag selbst faellt aus seiner eigenen Gruppe heraus.
 *
 * Ko-Okkurrenz ist der weite Schaerfegrad "im selben Dokument genannt", nicht
 * "im selben Auftritt"; die Ansicht muss das an der Marke sagen.
 *
 * Die Nachlassbildnerin faellt aus dem Umfeld der uebrigen Eintraege heraus. Sie
 * steht in fast jedem Dokument des Teilnachlasses und stuende deshalb bei jedem
 * als erste Nachbarin, ohne etwas ueber ihn zu sagen (Frontend-Audit
 * 2026-09-04). Ist sie selbst der aufgeklappte Eintrag, bleibt ihr Umfeld
 * unveraendert. Die Gruppe meldet den Schnitt als `omitsNachlassbildnerin`, weil
 * die Ansicht ihn im Tooltip nennen muss.
 *
 * @param {Object} store
 * @param {string} registerKey     register the entry belongs to
 * @param {{name: string, records: Set<string>}} entry
 * @param {{limit?: number, recordIds?: ?Set<string>}} [opts]
 *   `recordIds` narrows the co-occurrence to the shared cut.
 * @returns {Array<{key: string, label: string, family: string,
 *   omitsNachlassbildnerin: boolean,
 *   items: Array<{name: string, count: number}>, rest: Array<{name: string, count: number}>}>}
 */
export function buildUmfeld(store, registerKey, entry, { limit = 8, recordIds = null } = {}) {
  const own = new Set();
  for (const id of entry.records) {
    if (!recordIds || recordIds.has(id)) own.add(id);
  }
  if (own.size === 0) return [];

  const subjectIsNachlassbildnerin = registerKey === 'personen' && isMalaniuk(entry.name, entry);

  const out = [];
  for (const group of UMFELD_GROUPS) {
    const map = store[REGISTER_MAP[group.key]];
    if (!map) continue;
    const dropSubject = group.key === 'personen' && !subjectIsNachlassbildnerin;
    let omitted = false;
    const items = [];
    for (const [name, data] of map) {
      if (!data || !data.records || data.records.size === 0) continue;
      if (group.key === registerKey && name === entry.name) continue;
      if (dropSubject && isMalaniuk(name, data)) { omitted = true; continue; }
      let count = 0;
      for (const id of data.records) if (own.has(id)) count++;
      if (count > 0) items.push({ name, count });
    }
    if (items.length === 0) continue;
    items.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de-DE'));
    out.push({
      key: group.key, label: group.label, family: REGISTER_FAMILY[group.key],
      omitsNachlassbildnerin: omitted,
      items: items.slice(0, limit), rest: items.slice(limit),
    });
  }
  return out;
}

// Memoised set of Karte-selectable names; cleared with the entry lists.
let karteNamesCache = null;

/**
 * Namen, die die Karte wirklich zeigen kann. Die Karte waehlt eine Entitaet
 * ueber ihren Namen aus buildEntities, zeichnet aber nur verortete Belege: eine
 * Person oder Organisation ohne einen solchen Beleg landet auf einer leeren
 * Karte. Der Sprungknopf des Registers faellt deshalb weg, wo dieser Set den
 * Namen nicht fuehrt (Frontend-Audit 2026-09-04).
 * @returns {Set<string>}
 */
export function karteSelectableNames(store) {
  if (karteNamesCache) return karteNamesCache;
  const located = new Set();
  for (const occ of buildOccurrences(store)) {
    if (hasGeo(occ) && occ.recordId) located.add(occ.recordId);
  }
  const out = new Set();
  for (const entity of buildEntities(store)) {
    for (const id of entity.records) {
      if (located.has(id)) { out.add(entity.name); break; }
    }
  }
  karteNamesCache = out;
  return out;
}

// Memoised role index; cleared with the entry lists.
let rolesCache = null;
let ambiguousRolesCache = null;

/**
 * Belegte Buehnenrollen je Werk. Die Aufführungsknoten des Datenstands tragen
 * entweder ein Werk oder eine Rolle, nie beides, weshalb kein Knoten die
 * Bindung hergibt. Sie wird deshalb ueber den Beleg geschlossen, wenn das
 * Dokument genau ein Werk nennt. Alle Rollen desselben Belegs gehören zu
 * diesem Werk; bei mehreren Werken bleibt die Bindung mehrdeutig.
 * Das Ergebnis ist abgeleitet und traegt in der Ansicht die Marke aus Regel 16
 * (E-216).
 *
 * @param {Object} store
 * @returns {Map<string, Array<{name: string, count: number}>>} Werkname -> Rollen
 */
export function workStageRoles(store, recordIds = null) {
  if (!recordIds && rolesCache) return rolesCache;
  const byWork = new Map();
  const worksOfRecord = new Map();
  for (const [name, data] of store.works || []) {
    for (const id of data.records) {
      if (!worksOfRecord.has(id)) worksOfRecord.set(id, new Set());
      worksOfRecord.get(id).add(name);
    }
  }
  for (const [recordId, performances] of store.recordToPerformances || []) {
    if (recordIds instanceof Set && !recordIds.has(recordId)) continue;
    const roles = new Set();
    for (const perf of performances) for (const r of perf.stageRoles || []) roles.add(r);
    const works = new Set(worksOfRecord.get(recordId) || []);
    for (const perf of performances) if (perf.work && perf.work.name) works.add(perf.work.name);
    if (roles.size === 0 || works.size !== 1) continue;
    const work = [...works][0];
    if (!byWork.has(work)) byWork.set(work, new Map());
    const counts = byWork.get(work);
    for (const r of roles) counts.set(r, (counts.get(r) || 0) + 1);
  }
  const result = new Map();
  for (const [work, counts] of byWork) {
    result.set(work, [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de-DE')));
  }
  if (!recordIds) rolesCache = result;
  return result;
}

/** Ambiguous performance evidence is counted without assigning a role. */
export function ambiguousWorkStageRoles(store, recordIds = null) {
  if (!recordIds && ambiguousRolesCache) return ambiguousRolesCache;
  const worksOfRecord = new Map();
  for (const [name, data] of store.works || []) {
    for (const id of data.records) {
      if (!worksOfRecord.has(id)) worksOfRecord.set(id, new Set());
      worksOfRecord.get(id).add(name);
    }
  }
  const out = new Map();
  for (const [recordId, performances] of store.recordToPerformances || []) {
    if (recordIds instanceof Set && !recordIds.has(recordId)) continue;
    const roles = new Set();
    const works = new Set(worksOfRecord.get(recordId) || []);
    for (const perf of performances) {
      for (const role of perf.stageRoles || []) if (role) roles.add(role);
      if (perf.work && perf.work.name) works.add(perf.work.name);
    }
    if (roles.size > 0 && works.size === 1) continue;
    if (roles.size === 0 || works.size === 0) continue;
    for (const work of works) out.set(work, (out.get(work) || 0) + 1);
  }
  if (!recordIds) ambiguousRolesCache = out;
  return out;
}

/**
 * Der Schnitt, den der Sprung aus einem Registereintrag in den Bestand setzt:
 * der geteilte Filter mit der Facette dieses Eintrags und ohne den Suchbegriff.
 * Eine Quelle fuer beides, das href der Zeile und den Klick.
 *
 * Der Suchbegriff war das Mittel, den Eintrag zu finden, und kein Schnitt, den
 * das Ziel behalten soll: im Bestand trifft er Signatur, Titel, Typ und Datum
 * und laesst dort keine Zeile stehen (user-story audit 2026-09-04).
 * @param {string} registerKey
 * @param {Object} baseFilter   getFilter()-Ergebnis
 * @param {string} name
 * @returns {?Object} null, wenn das Register keine Facette hat
 */
export function bestandFilterFor(registerKey, baseFilter, name) {
  const facet = REGISTER_ENTITY_TYPE[registerKey];
  if (!facet || !name) return null;
  const base = baseFilter || {};
  return { ...base, [facet]: [...facetValues(base, facet), name] };
}

/**
 * Zeitspanne der Belege eines Eintrags, das erste und das letzte datierte
 * verknuepfte Dokument. Undatierte Belege fallen heraus, sie sagen ueber die
 * Spanne nichts; ein Eintrag ohne ein einziges datiertes Dokument hat keine.
 * @param {Object} store
 * @param {{records: Set<string>}} entry
 * @param {?Set<string>} [recordIds]  auf den Schnitt beschraenken
 * @returns {?{from: number, to: number}}
 */
export function entryYearSpan(store, entry, recordIds = null) {
  let from = null;
  let to = null;
  for (const id of entry.records) {
    if (recordIds && !recordIds.has(id)) continue;
    const year = yearOfId(store, id);
    if (year == null) continue;
    if (from == null || year < from) from = year;
    if (to == null || year > to) to = year;
  }
  return from == null ? null : { from, to };
}

/**
 * Die Rollen, in denen eine Entitaet auftritt, mit der Zahl der Dokumente, die
 * sie in dieser Rolle fuehren. Die Rollen stehen als Vokabular am Store-Eintrag
 * (loader, addEntityRole); gezaehlt wird im Schnitt, damit die Chips dieselbe
 * Dokumentmenge meinen wie die Belegzahl der Zeile.
 * @param {Object} store
 * @param {string} registerKey
 * @param {{name: string}} entry
 * @param {?Set<string>} [recordIds]
 * @returns {Array<{name: string, count: number}>}
 */
export function entryRoles(store, registerKey, entry, recordIds = null) {
  const map = store && store[REGISTER_MAP[registerKey]];
  const data = map && map.get(entry.name);
  if (!data || !data.roleRecords) return [];
  const out = [];
  for (const [name, ids] of data.roleRecords) {
    if (!name) continue;
    let count = 0;
    for (const id of ids) if (!recordIds || recordIds.has(id)) count += 1;
    if (count > 0) out.push({ name, count });
  }
  out.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de-DE'));
  return out;
}
