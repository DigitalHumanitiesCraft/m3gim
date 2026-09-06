/**
 * Datenschicht der Entitaets-Karte.
 *
 * Die Karte ist entitaetszentriert: man waehlt eine Entitaet (Organisation,
 * Person oder Werk) und sieht alle Orte, die an ihren Records haengen, als
 * Punkte. Die Orte einer Entitaet liegen an zwei Stellen im Graph und werden
 * hier zusammengezogen:
 *   1. an den Records selbst (`rico:hasOrHadLocation`) — der Hauptteil,
 *   2. in den verorteten Annotationen (`store.mobilityEvents`).
 *
 * Das Ergebnis ist eine flache Liste von Orts-Belegen (occurrences), die der
 * View nach gewaehlter Entitaet filtert und zu Stadt-Knoten gruppiert. Jeder
 * Beleg fuehrt seine Ortsrolle in zwei Formen mit, die Concept-Id als
 * Schluessel und die Anzeigeform aus den Daten. Die Rolle ist zugleich die
 * Achse, nach der die Karte einfaerbt und aufschluesselt.
 */

import { ensureArray, cityOf, roleIdOf, roleToken, roleLabel } from '../utils/format.js';
import { extractXlsxSource } from '../utils/provenance.js';
import { extractYear } from '../utils/date-parser.js';
import { primaryYear } from '../data/loader.js';
import { recordsFor } from '../data/records-for.js';
// The city-to-country resolution moved into the shared filter layer with the
// Land facet; it stays reachable here for the Orte register, which reads it
// through this module beside the Belege.
export { countryByCity } from '../data/records-for.js';
import { facetValues } from '../ui/filter-state.js';
import { rankedRoleScale, REST_COLOR } from './statistik-data.js';

/** Key and display form of a Beleg whose place link carries no role at all. */
export const NO_ROLE = '';
const NO_ROLE_LABEL = 'ohne Rolle';

/** The role a Beleg is counted and coloured under. */
const roleKeyOf = o => o.roleId || o.role || NO_ROLE;

export const hasGeo = o => typeof o.placeLat === 'number' && typeof o.placeLon === 'number';

/**
 * The place roles of the whole Bestand as a ranked colour scale. Built once
 * over every Beleg and not over the cut, so the colour of a role holds while
 * the filter moves; the six most frequent roles carry a hue, the rest share
 * the grey and stay separate rows in every breakdown (task 2 asks which roles
 * the remaining places carry, so no role is merged away).
 * @param {Array<Occurrence>} occurrences
 * @returns {Map<string, {key:string, label:string, count:number, color:string}>}
 */
export function placeRoleScale(occurrences) {
  const tally = new Map();
  let noRole = 0;
  for (const o of occurrences || []) {
    const key = roleKeyOf(o);
    if (key === NO_ROLE) { noRole += 1; continue; }
    let e = tally.get(key);
    if (!e) { e = { key, label: o.roleLabel || key, count: 0 }; tally.set(key, e); }
    e.count += 1;
  }
  const scale = rankedRoleScale([...tally.values()]);
  // Absence is no category (design rule 4): a place link without a role takes
  // the grey of the tail instead of one of the six hues.
  if (noRole > 0) {
    scale.set(NO_ROLE, { key: NO_ROLE, label: NO_ROLE_LABEL, count: noRole, color: REST_COLOR });
  }
  return scale;
}

/** Inhaltsfamilie je Entitaets-Art, fuer Symbol und Farbe der Wahl. */
export const ENTITY_FAMILY = Object.freeze({
  org: 'institution', person: 'person', werk: 'werk',
});

/**
 * Waehlbare Entitaeten: Organisationen, Personen und Werke, je mit ihrer
 * Record-Menge. Absteigend nach Record-Zahl (die ergiebigsten zuerst), dann
 * alphabetisch.
 *
 * Das Werk ist die dritte Familie: die Orte eines Werks sind die Orte der
 * Dokumente, die es nennen, also gilt fuer es dieselbe Rechnung wie fuer Person
 * und Organisation. Ein Werk ohne Dokumente bleibt draussen, weil seine Wahl
 * die Karte leerraeumen wuerde.
 * @returns {Array<{id,kind,family,name,records:Set<string>,wikidata:?string}>}
 */
export function buildEntities(store) {
  const out = [];
  const push = (kind, prefix, name, e) => {
    out.push({ id: prefix + name, kind, family: ENTITY_FAMILY[kind], name,
      records: e.records, wikidata: e.wikidata || null });
  };
  for (const [name, e] of store.organizations) push('org', 'org:', name, e);
  for (const [name, e] of store.persons) push('person', 'person:', name, e);
  for (const [name, e] of (store.works || new Map())) {
    if (!e || !e.records || e.records.size === 0) continue;
    push('werk', 'werk:', name, e);
  }
  out.sort((a, b) => b.records.size - a.records.size || a.name.localeCompare(b.name, 'de-DE'));
  return out;
}

// Datums-Leak in der Ortsspalte ("06-09" u. a.): Ortsnamen, die mit einer
// Ziffer beginnen, sind keine Orte. Ehrlich uebersprungen statt als Geister-Ort
// gezeigt (Datenfehler-Register).
const looksDateLike = s => /^\d/.test(String(s).trim());

/**
 * Alle Orts-Belege des Bestands, ein Eintrag je (Record, Stadt, Rolle, Datum,
 * Quelle), dedupliziert. Aus Record-Orten und verorteten Annotationen.
 * @returns {Array<Occurrence>}
 * @typedef {Object} Occurrence
 * @property {string} place         Roher Ortsname (ggf. adressgenau)
 * @property {?number} placeLat
 * @property {?number} placeLon
 * @property {?string} placeWikidata  wd:-Q-ID oder null
 * @property {?string} date         ISO-Datum / Jahr
 * @property {?string} role         Rohform der Rolle (auffuehrungsort, zielort, …)
 * @property {?string} roleId       Concept-Id der Rolle, null beim Literal
 * @property {string} roleLabel     Anzeigeform der Rolle aus den Daten
 * @property {?string} recordId
 * @property {'loc'|'ste'} source
 * @property {?object} xlsxSource
 * @property {'secured'|'city'|'far'|'unlocatable'} placement  Verortungs-Stufe
 */

// Europaeischer Fokus-Rahmen. Koordinaten ausserhalb gelten als 'far' (Verdacht
// auf Geocoding-Fehlmatch, z. B. der New-York-Fall AF-01).
const inEurope = (lat, lon) => lon > -15 && lon < 35 && lat > 34 && lat < 60;

/**
 * Verortungs-Stufe je Beleg, plus Stadt-Hochrollung. Ehrliche Unterscheidung
 * der Verortungs-Sicherheit (capta statt data):
 *   secured     eigener gesicherter Q-ID-Treffer im europaeischen Fokus
 *   city        keine eigene Koordinate, aber die Stadt ist (aus einem anderen
 *               Beleg) gesichert verortet -> Koordinate der Stadt geerbt,
 *               stadtgenau (keine erfundene Adress-Genauigkeit)
 *   far         eigene Koordinate weit ausserhalb Europas (Fehlmatch-Verdacht)
 *   unlocatable keine Koordinate und keine bekannte Stadt -> kein Kartenpunkt
 * Mutiert die Eintraege in place: 'city'-Belege bekommen die Stadtkoordinate.
 */
function assignPlacement(out) {
  const cityCoord = new Map();
  for (const o of out) {
    if (o.placeLat != null && o.placeLon != null) {
      const k = cityOf(o.place).toLowerCase();
      if (!cityCoord.has(k)) cityCoord.set(k, { lat: o.placeLat, lon: o.placeLon });
    }
  }
  for (const o of out) {
    if (o.placeLat != null && o.placeLon != null) {
      o.placement = inEurope(o.placeLat, o.placeLon) ? 'secured' : 'far';
    } else {
      const c = cityCoord.get(cityOf(o.place).toLowerCase());
      if (c) { o.placeLat = c.lat; o.placeLon = c.lon; o.placement = 'city'; }
      else o.placement = 'unlocatable';
    }
  }
  return out;
}
export function buildOccurrences(store) {
  const out = [];
  const seen = new Set();
  const push = (o) => {
    if (!o.place || looksDateLike(o.place)) return;
    const key = `${o.recordId}|${cityOf(o.place).toLowerCase()}|${o.role || ''}|${o.date || ''}|${o.source}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(o);
  };

  // Record-Orte (rico:hasOrHadLocation). Places carry no date of their own, so
  // a Beleg takes the date of its record and the Zeitfenster can grip it. The
  // date comes from the Zeitanker of the Datenschicht (F3: Verknuepfungsdatum
  // before source dating), with `rico:date` only as the last fallback, because
  // Karte and Chronik must cut the same record at the same year.
  for (const rec of store.allRecords) {
    const rid = rec['@id'];
    const anchor = primaryYear(store, rec);
    const recDate = anchor.date
      || (anchor.year != null ? String(anchor.year) : null)
      || rec['rico:date'] || null;
    for (const loc of ensureArray(rec['rico:hasOrHadLocation'])) {
      const name = loc.name || loc['skos:prefLabel'];
      if (!name) continue;
      // Die Rolle steht als Verweisknoten am Ort. Roh in den Dedup-Schluessel,
      // sonst landete dort ein Objekt und jeder Beleg waere derselbe.
      const role = loc.role;
      const roleId = roleIdOf(role);
      push({
        place: name,
        placeLat: typeof loc['geo:lat'] === 'number' ? loc['geo:lat'] : null,
        placeLon: typeof loc['geo:long'] === 'number' ? loc['geo:long'] : null,
        placeWikidata: loc['@id'] && String(loc['@id']).startsWith('wd:') ? loc['@id'] : null,
        date: recDate,
        role: roleToken(role),
        roleId,
        roleLabel: roleLabel(store, role),
        recordId: rid,
        source: 'loc',
        xlsxSource: extractXlsxSource(loc) || extractXlsxSource(rec) || null,
      });
    }
  }

  // Verortete Annotationen, bereits flach im Store; Rolle und Anzeigeform
  // liegen dort fertig vor.
  for (const ev of store.mobilityEvents.values()) {
    if (!ev.place) continue;
    push({
      place: ev.place,
      placeLat: typeof ev.placeLat === 'number' ? ev.placeLat : null,
      placeLon: typeof ev.placeLon === 'number' ? ev.placeLon : null,
      placeWikidata: ev.placeWikidata || null,
      date: ev.date || null,
      role: ev.role || null,
      roleId: ev.roleId || null,
      roleLabel: ev.roleLabel || '',
      recordId: ev.recordId || null,
      source: 'ste',
      xlsxSource: ev.xlsxSource || null,
    });
  }

  return assignPlacement(out);
}

/**
 * Die Belege des geteilten Schnitts: alles, dessen Dokument nicht in der Menge
 * aus `recordsFor` liegt, faellt weg, aus den Punkten, den Zaehlstaenden und den
 * Beleg-Listen gleichermassen.
 *
 * Die Karte schnitt frueher nur ueber Entitaet, Land und Zeitfenster, also stand
 * ein Personen- oder Dokumenttyp-Schnitt als Chip in der Leiste, ohne einen
 * einzigen Punkt zu bewegen (Frontend-Audit 2026-09-04).
 *
 * Zwei Facetten wirken hier am Beleg statt am Dokument, weil der Beleg die
 * Einheit der Karte ist. Das Zeitfenster schneidet am Datum des Belegs, sonst
 * fiele eine im Fenster datierte Annotation mit ihrem ausserhalb datierten
 * Dokument weg; deshalb bleibt es hier aussen vor und die View wendet es an.
 * Die Ortsrollen der Verknuepfungs-Facette schneiden die Belege direkt: wer
 * "Gastspiel" waehlt, will die Gastspielorte sehen und nicht zusaetzlich den
 * Absendeort desselben Briefs (Aufgabe 2 des Aufgabensatzes).
 * @param {Object} store
 * @param {Array<Occurrence>} occurrences
 * @param {Object} shared  getFilter()-Ergebnis
 * @returns {Array<Occurrence>}
 */
export function occurrencesInCut(store, occurrences, shared) {
  const facets = { ...(shared || {}) };
  delete facets.zeitfenster;
  const { ids } = recordsFor(store, facets);
  const roles = placeRolesOf(shared);
  return (occurrences || []).filter(o => ids.has(o.recordId)
    && (roles === null || roles.has(o.roleId || o.role)));
}

/** Prefix of a place role in a value of the Verknuepfungs-Facette. */
const PLACE_LINK = 'ort:';

/**
 * The chosen place roles as their raw keys, or null when the facet names none.
 * The bare type `ort` names no role and therefore leaves every Beleg standing,
 * as any other facet does.
 * @param {Object} shared  getFilter() result
 * @returns {?Set<string>}
 */
export function placeRolesOf(shared) {
  const values = facetValues(shared, 'verknuepfung')
    .filter(v => typeof v === 'string' && v.startsWith(PLACE_LINK))
    .map(v => v.slice(PLACE_LINK.length));
  return values.length > 0 ? new Set(values) : null;
}

// ---------------------------------------------------------------------------
// Ableitungen ueber einer Beleg-Liste (Knoten, Tooltip, Ortsdetail)
// ---------------------------------------------------------------------------

/**
 * The places of a Beleg list the map cannot draw, one row per city with its
 * document count and its reason. Counterpart to the nodes: what stands here
 * stands not on the map, and the two together are the whole cut.
 *
 * The reason separates two situations that call for different work, a place with
 * a Q-ID whose Wikidata item carries no coordinates in the dataset (enrichment),
 * and a place the reconciliation never resolved.
 * @param {Array<Occurrence>} occurrences
 * @returns {Array<{city:string, records:number, wikidata:boolean}>}
 */
export function unlocatedPlaces(occurrences) {
  const m = new Map();
  for (const o of occurrences || []) {
    if (o.placement !== 'unlocatable') continue;
    const city = cityOf(o.place);
    const key = city.toLowerCase();
    let e = m.get(key);
    if (!e) { e = { city, records: new Set(), wikidata: false }; m.set(key, e); }
    e.records.add(o.recordId || o.place);
    if (o.placeWikidata) e.wikidata = true;
  }
  return [...m.values()]
    .map(e => ({ city: e.city, records: e.records.size, wikidata: e.wikidata }))
    .sort((a, b) => b.records - a.records || a.city.localeCompare(b.city, 'de-DE'));
}

/**
 * Place-role breakdown of a node, most frequent first. A role outside the six
 * hues keeps its row and only shares the grey, so the tooltip names every role
 * it carries (task 2 asks exactly that).
 * @param {Array<Occurrence>} occ
 * @param {Map<string, {label:string, color:string}>} scale  from placeRoleScale
 */
export function breakdownByRole(occ, scale) {
  const c = new Map();
  for (const o of occ) { const id = roleKeyOf(o); c.set(id, (c.get(id) || 0) + 1); }
  return [...c.entries()]
    .map(([id, count]) => {
      const e = (scale && scale.get(id)) || { label: NO_ROLE_LABEL, color: REST_COLOR };
      return { id, label: e.label, color: e.color, count };
    })
    .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label, 'de'));
}

/** Segmente fuer den gestapelten Proportionsbalken: [{ pct, color, label, count }].
 *  Geteilt zwischen Hover-Tooltip (HTML) und Klick-Detail (DOM). */
export function barSegments(breakdown) {
  const sum = breakdown.reduce((s, b) => s + b.count, 0) || 1;
  return breakdown.map(b => ({ pct: b.count / sum * 100, color: b.color, label: b.label, count: b.count }));
}

export function firstYear(occ) {
  const ys = occ.map(o => extractYear(o.date)).filter(y => y != null);
  return ys.length ? Math.min(...ys) : null;
}

export function lastYear(occ) {
  const ys = occ.map(o => extractYear(o.date)).filter(y => y != null);
  return ys.length ? Math.max(...ys) : null;
}

/** Belege chronologisch, undatierte hinten, dann nach Ort und Rolle. */
export function sortOcc(occ) {
  return occ.slice().sort((a, b) => {
    const ya = extractYear(a.date), yb = extractYear(b.date);
    if (ya != null && yb != null && ya !== yb) return ya - yb;
    if (ya != null && yb == null) return -1;
    if (ya == null && yb != null) return 1;
    const pa = (a.place || '').localeCompare(b.place || '', 'de-DE');
    return pa !== 0 ? pa : (a.role || '').localeCompare(b.role || '', 'de-DE');
  });
}
