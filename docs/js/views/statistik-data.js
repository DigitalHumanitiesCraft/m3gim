/**
 * Statistik — reine Datenschicht.
 *
 * Aggregationen ueber den Live-Store, ohne DOM und ohne d3. Jede Aggregation
 * nimmt neben dem Store die Dokumentmenge des aktuellen Schnitts (`ids` aus
 * `recordsFor`) und zaehlt darin; ohne Menge zaehlt sie den ganzen Store. Damit
 * schneiden die geteilten Facetten und der Zeitraum die Statistik, ohne dass
 * die Ansicht einen zweiten Filterweg baut.
 *
 * Seit E-160 traegt die Statistik nur noch den Bestand in Zahlen. Die
 * Mobilitaets- und Beziehungsaggregate liegen in Karte, Chronik und Netzwerk;
 * die Sichten-Konstanten bleiben hier, weil Karte und Chronik sie von hier
 * beziehen.
 */

import { getDocTypeId, dftLabel } from '../utils/format.js';
import { yearOf } from '../data/records-for.js';

// ---------------------------------------------------------------------------
// Mobilitaetssichten — geteilt mit Karte und Chronik
// ---------------------------------------------------------------------------

// Konkrete, zielgruppennahe Labels (projektweit einheitlich: Karte, Statistik,
// Chronik). Der analytische Begriff steht im desc-Feld zur Erlaeuterung.
export const SICHTEN = [
  { id: 'performativ',    label: 'Auftritt',    desc: 'Performativ: Auftritte, Gastspiele, Premieren' },
  { id: 'institutionell', label: 'Engagement',  desc: 'Institutionell: Spielzeit-Engagements, Ensemble-Zugehoerigkeit' },
  { id: 'korrespondenz',  label: 'Reise & Korrespondenz', desc: 'Reisewege (Ziel-, Abreise-, Vertragsort), Korrespondenz-Orte und Briefdaten' },
  { id: 'diskursiv',      label: 'Rezeption',   desc: 'Diskursiv: Rezensionen, Rundfunk, Druckerscheinungen' },
  { id: 'biografisch',    label: 'Biografisch', desc: 'Ausweise, Wohnsitz, persoenliche Dokumente' },
];

// Eine Quelle fuer die Sichten-Farben: die --color-sicht-*-Tokens (variables.css).
// Karte, Statistik und Chronik zeigen dieselbe Sicht damit in derselben Farbe.
// 'kontext' deckt die Nicht-Cluster-Ortsrollen der Karte ab (Entstehung,
// Erwaehnung, Auftrag).
export const SICHT_COLOR = {
  performativ:    'var(--color-sicht-performativ)',
  institutionell: 'var(--color-sicht-institutionell)',
  korrespondenz:  'var(--color-sicht-korrespondenz)',
  diskursiv:      'var(--color-sicht-diskursiv)',
  biografisch:    'var(--color-sicht-biografisch)',
  kontext:        'var(--color-sicht-kontext)',
  neutral:        'var(--color-text-tertiary)',
};

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

// ---------------------------------------------------------------------------
// Erschliessungsstand: was fehlt, und wo
// ---------------------------------------------------------------------------

/**
 * Die Achsen, an denen ein Dokument erschlossen ist. Jede haelt einen Test,
 * der genau ihren eigenen Beleg prueft. Ein Teilbeleg zaehlt nicht: eine
 * Datierung ohne Ort belegt die Zeit und nicht den Raum, sonst liesse die
 * Arbeitsliste genau die Luecke aus, die sie finden soll.
 */
const GAP_AXES = [
  { id: 'typ', label: 'Dokumenttyp', test: (r) => Boolean(r['rico:hasDocumentaryFormType']) },
  { id: 'datum', label: 'Datierung', test: (r, store) => yearOf(store, r) != null },
  { id: 'ort', label: 'Ort', test: (r, store) => hasPlace(r, store) },
  { id: 'person', label: 'Person', test: (r) => hasAgentOfKind(r, 'person') },
  { id: 'institution', label: 'Institution', test: (r) => hasAgentOfKind(r, 'institution') },
  { id: 'werk', label: 'Werk', test: (r) => hasWork(r) },
];

const CORPORATE_TYPES = new Set(['rico:CorporateBody', 'rico:Group']);

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function hasPlace(record, store) {
  if (asArray(record['rico:hasOrHadLocation']).some((l) => l && (l.name || l['skos:prefLabel']))) {
    return true;
  }
  const events = store?.recordToEvents?.get(record['@id']);
  return Array.isArray(events) && events.length > 0;
}

function hasAgentOfKind(record, kind) {
  const agents = asArray(record['m3gim-ontology:hasAssociatedAgent']);
  const subjects = asArray(record['rico:hasOrHadSubject'])
    .filter((s) => s && s['@type'] === 'rico:Person');
  const all = kind === 'person' ? agents.concat(subjects) : agents;
  return all.some((a) => {
    if (!a || !(a.name || a['skos:prefLabel'])) return false;
    const corporate = CORPORATE_TYPES.has(a['@type']);
    return kind === 'institution' ? corporate : !corporate;
  });
}

function hasWork(record) {
  return asArray(record['rico:hasOrHadSubject'])
    .some((s) => s && s['@type'] === 'm3gim-ontology:MusicalWork'
      && (s.name || s['skos:prefLabel']));
}

/**
 * Erschliessungsstand des Schnitts, je Achse und je Konvolut.
 *
 * @param {object} store
 * @param {?Set<string>} ids
 * @returns {{total:number, none:number,
 *            axes:Array<{id:string,label:string,filled:number,missing:number,share:number}>,
 *            byKonvolut:Array<{id:string,label:string,total:number,filled:object,share:number}>}}
 */
export function aggregateCatalogueGaps(store, ids) {
  const records = cutRecords(store, ids);
  const total = records.length;
  const filled = Object.fromEntries(GAP_AXES.map((a) => [a.id, 0]));
  const perKonvolut = new Map();
  let none = 0;

  for (const record of records) {
    const kid = store?.childToKonvolut?.get(record['@id']) || null;
    if (!perKonvolut.has(kid)) {
      perKonvolut.set(kid, {
        id: kid, total: 0,
        filled: Object.fromEntries(GAP_AXES.map((a) => [a.id, 0])),
      });
    }
    const bucket = perKonvolut.get(kid);
    bucket.total += 1;

    let any = false;
    for (const axisDef of GAP_AXES) {
      if (!axisDef.test(record, store)) continue;
      filled[axisDef.id] += 1;
      bucket.filled[axisDef.id] += 1;
      any = true;
    }
    if (!any) none += 1;
  }

  const axes = GAP_AXES.map((a) => ({
    id: a.id, label: a.label,
    filled: filled[a.id],
    missing: total - filled[a.id],
    share: total ? filled[a.id] / total : 0,
  }));

  const byKonvolut = [...perKonvolut.values()].map((k) => {
    const node = k.id ? store?.konvolute?.get(k.id) : null;
    const sum = GAP_AXES.reduce((s, a) => s + k.filled[a.id], 0);
    return {
      ...k,
      // Die Archivsignatur ist der lesbare Name eines Konvoluts; die interne
      // Kennung waere im Bericht eine nackte Id ohne Klartext.
      label: (node && (node['rico:identifier'] || node['rico:title'] || node.name))
        || k.id || 'ohne Konvolut',
      // Erschliessungsgrad: belegte Achsen gegen alle moeglichen. Die
      // Sortierung stellt das duennste Konvolut nach oben, damit die
      // Arbeitsliste ohne eigenes Suchen lesbar ist.
      share: k.total ? sum / (k.total * GAP_AXES.length) : 0,
    };
  }).sort((a, b) => a.share - b.share || b.total - a.total);

  return { total, none, axes, byKonvolut };
}
