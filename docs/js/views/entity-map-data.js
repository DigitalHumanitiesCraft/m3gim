/**
 * Datenschicht der Entitaets-Karte.
 *
 * Die Karte ist entitaetszentriert: man waehlt eine Entitaet (Organisation oder
 * Person) und sieht alle Orte, die an ihren Records haengen, als Punkte. Die
 * Orte einer Entitaet liegen an zwei Stellen im Graph und werden hier
 * zusammengezogen:
 *   1. an den Records selbst (`rico:hasOrHadLocation`) — der Hauptteil,
 *   2. in den raumzeitlichen Ereignissen (STE, `store.mobilityEvents`).
 *
 * Das Ergebnis ist eine flache Liste von Orts-Belegen (occurrences), die der
 * View nach gewaehlter Entitaet filtert und zu Stadt-Knoten gruppiert.
 */

import { ensureArray, cityOf } from '../utils/format.js';
import { extractXlsxSource } from '../utils/provenance.js';

/**
 * Waehlbare Entitaeten: Organisationen + Personen, je mit ihrer Record-Menge.
 * Absteigend nach Record-Zahl (die ergiebigsten zuerst), dann alphabetisch.
 * @returns {Array<{id,kind,name,records:Set<string>,wikidata:?string}>}
 */
export function buildEntities(store) {
  const out = [];
  for (const [name, e] of store.organizations) {
    out.push({ id: 'org:' + name, kind: 'org', name, records: e.records, wikidata: e.wikidata || null });
  }
  for (const [name, e] of store.persons) {
    out.push({ id: 'person:' + name, kind: 'person', name, records: e.records, wikidata: e.wikidata || null });
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
 * Quelle), dedupliziert. Aus Record-Orten und STE.
 * @returns {Array<Occurrence>}
 * @typedef {Object} Occurrence
 * @property {string} place         Roher Ortsname (ggf. adressgenau)
 * @property {?number} placeLat
 * @property {?number} placeLon
 * @property {?string} placeWikidata  wd:-Q-ID oder null
 * @property {?string} date         ISO-Datum / Jahr
 * @property {?string} role         Rolle (auffuehrungsort, zielort, …)
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

  // Record-Orte (rico:hasOrHadLocation). Das Datum des Belegs ist das
  // Record-Datum (Orte tragen selbst keins), damit der Zeitfilter greift.
  for (const rec of store.allRecords) {
    const rid = rec['@id'];
    const recDate = rec['rico:date'] || null;
    for (const loc of ensureArray(rec['rico:hasOrHadLocation'])) {
      const name = loc.name || loc['skos:prefLabel'];
      if (!name) continue;
      push({
        place: name,
        placeLat: typeof loc['geo:lat'] === 'number' ? loc['geo:lat'] : null,
        placeLon: typeof loc['geo:long'] === 'number' ? loc['geo:long'] : null,
        placeWikidata: loc['@id'] && String(loc['@id']).startsWith('wd:') ? loc['@id'] : null,
        date: recDate,
        role: loc.role || null,
        recordId: rid,
        source: 'loc',
        xlsxSource: extractXlsxSource(loc) || extractXlsxSource(rec) || null,
      });
    }
  }

  // Raumzeitliche Ereignisse (STE), bereits flach im Store.
  for (const ev of store.mobilityEvents.values()) {
    if (!ev.place) continue;
    push({
      place: ev.place,
      placeLat: typeof ev.placeLat === 'number' ? ev.placeLat : null,
      placeLon: typeof ev.placeLon === 'number' ? ev.placeLon : null,
      placeWikidata: ev.placeWikidata || null,
      date: ev.date || null,
      role: ev.role || null,
      recordId: ev.recordId || null,
      source: 'ste',
      xlsxSource: ev.xlsxSource || null,
    });
  }

  return assignPlacement(out);
}
