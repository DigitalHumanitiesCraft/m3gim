/**
 * Statistik — reine Datenschicht.
 *
 * Aggregationen ueber den Live-Store, ohne DOM und ohne d3. Jede Aggregation
 * nimmt neben dem Store die Dokumentmenge des aktuellen Schnitts (`ids` aus
 * `recordsFor`) und zaehlt darin; ohne Menge zaehlt sie den ganzen Store. Damit
 * schneiden die geteilten Facetten und der Zeitraum die Statistik, ohne dass
 * die Ansicht einen zweiten Filterweg baut.
 *
 * Since E-160 the Statistik carries the fonds in numbers only. The mobility and
 * relation aggregates live in Karte, Chronik and Netzwerk; the ranked colour
 * scale below stays here, because those two views read it from here.
 */

import { getDocTypeId, dftLabel } from '../utils/format.js';

// ---------------------------------------------------------------------------
// Farbskala der Rollen — geteilt mit Karte und Chronik
// ---------------------------------------------------------------------------

/**
 * The six categorical hues of `variables.css`. They are the whole colour budget
 * for a category axis, so a set with more members than this cannot give every
 * member a hue of its own.
 */
const CAT_COLORS = Object.freeze([
  'var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)',
  'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)',
]);

/** Colour of everything past the six hues: the long tail is one grey. */
export const REST_COLOR = 'var(--color-text-tertiary)';

/**
 * A set of roles as a ranked colour scale, the most frequent first. The six
 * leading roles take the categorical hues, everything rarer shares the grey;
 * the display form is raised to sentence case here, as `facetInventory` does
 * for the facets, because the vocabulary stores its labels in lower case.
 *
 * The ranking is taken over the whole Bestand and never over a cut, so a filter
 * moves the sizes and not the colours.
 * @param {Array<{key:string, label:string, count:number}>} entries
 * @returns {Map<string, {key:string, label:string, count:number, color:string}>}
 *   in rank order, so the same map serves as lookup and as legend
 */
export function rankedRoleScale(entries) {
  const ranked = [...(entries || [])]
    .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label, 'de'));
  const out = new Map();
  ranked.forEach((e, i) => {
    const label = e.label ? e.label[0].toLocaleUpperCase('de-DE') + e.label.slice(1) : e.key;
    out.set(e.key, {
      key: e.key, label, count: e.count,
      color: i < CAT_COLORS.length ? CAT_COLORS[i] : REST_COLOR,
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Der Schnitt als Zaehlgrundlage
// ---------------------------------------------------------------------------

/** Records des Schnitts; ohne Menge der ganze Store. */
function cutRecords(store, ids) {
  const all = (store && store.allRecords) || [];
  return ids instanceof Set ? all.filter(r => ids.has(r['@id'])) : all;
}

/** Groesse der Schnittmenge einer Record-Id-Menge mit dem Schnitt. */
function countIn(recordIds, ids) {
  if (!recordIds) return 0;
  if (!(ids instanceof Set)) return recordIds.size || 0;
  let n = 0;
  for (const id of recordIds) if (ids.has(id)) n += 1;
  return n;
}

const byCountDesc = (a, b) => (b.count - a.count) || a.label.localeCompare(b.label, 'de');

// ---------------------------------------------------------------------------
// Dokumenttypen
// ---------------------------------------------------------------------------

export function aggregateDocTypes(store, ids) {
  const counts = new Map();
  let ohneTyp = 0;
  for (const rec of cutRecords(store, ids)) {
    const id = getDocTypeId(rec);
    if (!id) { ohneTyp++; continue; }
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const rows = [...counts.entries()]
    // dftLabel prefixes the short id before the lookup; a bare id never hits
    // store.dftHierarchy and would silently fall back to the technical key.
    .map(([id, count]) => ({ id, count, label: dftLabel(store, id) }))
    .sort((a, b) => b.count - a.count);
  if (ohneTyp > 0) {
    rows.push({ id: null, count: ohneTyp, label: 'ohne Typ' });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Entitaeten: Personen, Institutionen, Werke
// ---------------------------------------------------------------------------

/**
 * Eintraege einer Entitaets-Map mit ihrer Dokumentzahl im Schnitt. Der Name ist
 * zugleich der Facettenwert, mit dem die Zeile in den Bestand fuehrt.
 * @param {object} store
 * @param {string} mapName  persons | organizations | works
 * @param {?Set<string>} ids
 * @returns {Array<{value:string, label:string, count:number}>}
 */
export function aggregateEntities(store, mapName, ids) {
  const source = store && store[mapName];
  if (!source) return [];
  const out = [];
  for (const [name, entry] of source) {
    const count = countIn(entry && entry.records, ids);
    if (count === 0) continue;
    out.push({ value: name, label: name, count });
  }
  return out.sort(byCountDesc);
}

/**
 * Rollen der Mitwirkenden mit ihrer Dokumentzahl im Schnitt, aus
 * store.recordsByAgentRole. Rollen ohne Anzeigeform bleiben draussen
 * (E-143), sie waeren als nackte Concept-Id keine Aussage.
 */
export function aggregateAgentRoles(store, ids) {
  const index = store && store.recordsByAgentRole;
  if (!index) return [];
  const out = [];
  for (const [value, recordIds] of index) {
    const count = countIn(recordIds, ids);
    if (count === 0) continue;
    const entry = store.roleVocab ? store.roleVocab.get(value) : null;
    const label = (entry && entry.label) || '';
    if (!label) continue;
    out.push({ value, label, count });
  }
  return out.sort(byCountDesc);
}

/**
 * Buehnenrollen (Partien) mit der Zahl der Dokumente im Schnitt, die sie
 * belegen. Sie haengen an den Auffuehrungen, nicht am Record, und tragen
 * deshalb keine Facette.
 */
export function aggregateStageRoles(store, ids) {
  const index = store && store.recordToPerformances;
  if (!index) return [];
  const perRole = new Map();
  for (const [recordId, performances] of index) {
    if (ids instanceof Set && !ids.has(recordId)) continue;
    for (const perf of performances || []) {
      for (const role of (perf && perf.stageRoles) || []) {
        if (!role) continue;
        let set = perRole.get(role);
        if (!set) { set = new Set(); perRole.set(role, set); }
        set.add(recordId);
      }
    }
  }
  return [...perRole.entries()]
    .map(([label, set]) => ({ label, count: set.size }))
    .sort(byCountDesc);
}

/**
 * Komponisten mit der Zahl der Dokumente im Schnitt, die eines ihrer Werke
 * nennen. Distinkt gezaehlt, damit ein Dokument mit zwei Werken desselben
 * Komponisten einmal zaehlt.
 */
export function aggregateComposers(store, ids) {
  const works = store && store.works;
  if (!works) return [];
  const perComposer = new Map();
  for (const entry of works.values()) {
    const komponist = (entry && entry.komponist || '').trim();
    if (!komponist) continue;
    let set = perComposer.get(komponist);
    if (!set) { set = new Set(); perComposer.set(komponist, set); }
    for (const id of entry.records || []) {
      if (!(ids instanceof Set) || ids.has(id)) set.add(id);
    }
  }
  return [...perComposer.entries()]
    .map(([label, set]) => ({ label, count: set.size }))
    .filter(row => row.count > 0)
    .sort(byCountDesc);
}
