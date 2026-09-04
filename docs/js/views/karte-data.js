/**
 * Datenschicht der Entitaets-Karte.
 *
 * Die Karte ist entitaetszentriert: man waehlt eine Entitaet (Organisation oder
 * Person) und sieht alle Orte, die an ihren Records haengen, als Punkte. Die
 * Orte einer Entitaet liegen an zwei Stellen im Graph und werden hier
 * zusammengezogen:
 *   1. an den Records selbst (`rico:hasOrHadLocation`) — der Hauptteil,
 *   2. in den verorteten Annotationen (`store.mobilityEvents`).
 *
 * Das Ergebnis ist eine flache Liste von Orts-Belegen (occurrences), die der
 * View nach gewaehlter Entitaet filtert und zu Stadt-Knoten gruppiert. Jeder
 * Beleg fuehrt seine Rolle in drei Formen mit: die Rohform als Dedup-Schluessel,
 * die Anzeigeform aus den Daten und die Mobilitaetssicht, nach der die Karte
 * einfaerbt. Damit muss keine Ansicht mehr aus einem Rollennamen ableiten,
 * was er bedeutet.
 */

import { ensureArray, cityOf, roleIdOf, roleToken, roleLabel } from '../utils/format.js';
import { mobilityClusterFor } from '../data/constants.js';
import { extractXlsxSource } from '../utils/provenance.js';
import { extractYear } from '../utils/date-parser.js';
import { primaryYear } from '../data/loader.js';
import { recordsFor } from '../data/records-for.js';
import { SICHTEN as SHARED_SICHTEN, SICHT_COLOR } from './statistik-data.js';

// Mobilitaetssichten als Farb-/Label-Schluessel der Knoten. Farben und die fuenf
// Basis-Sichten kommen aus der geteilten Quelle (statistik-data.js: SICHT_COLOR
// + SICHTEN), damit Karte, Statistik und Chronik dieselbe Sicht in derselben
// Farbe und mit demselben Label zeigen. Die Karte ergaenzt 'kontext' fuer
// Nicht-Cluster-Ortsrollen (Entstehung, Erwaehnung, Auftrag); null faellt
// dorthin. Reihenfolge: Basis-Sichten, dann kontext.
export const KONTEXT_ID = 'kontext';
export const SICHTEN = [
  ...SHARED_SICHTEN.map(s => ({ id: s.id, label: s.label, color: SICHT_COLOR[s.id] })),
  { id: KONTEXT_ID, label: 'Weiterer Ortsbezug', color: SICHT_COLOR.kontext },
];
const TYPE_BY_ID = new Map(SICHTEN.map(t => [t.id, t]));

// Die Sicht steht am Beleg: die Datenschicht loest sie aus der Concept-Id der
// Rolle auf. Ohne Sicht (Entstehung, Erwaehnung, Auftrag) faellt der Beleg in
// den Kontext-Eimer.
const sichtOf = o => o.cluster || KONTEXT_ID;
export const colorOf = id => (TYPE_BY_ID.get(id) || TYPE_BY_ID.get(KONTEXT_ID)).color;
export const hasGeo = o => typeof o.placeLat === 'number' && typeof o.placeLon === 'number';

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
 * @property {?string} cluster      Mobilitaetssicht der Rolle
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
  // Fehlt rico:date, tritt der Zeitanker der Datenschicht ein; sonst faellt
  // der Beleg auf der Karte als undatiert durch, waehrend Chronik und
  // Netzwerk denselben Record datiert fuehren.
  for (const rec of store.allRecords) {
    const rid = rec['@id'];
    const anchor = primaryYear(store, rec);
    const recDate = rec['rico:date']
      || (anchor.year != null ? String(anchor.year) : null);
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
        cluster: mobilityClusterFor(roleId || (typeof role === 'string' ? role : null)),
        recordId: rid,
        source: 'loc',
        xlsxSource: extractXlsxSource(loc) || extractXlsxSource(rec) || null,
      });
    }
  }

  // Verortete Annotationen, bereits flach im Store; Rolle, Anzeigeform und
  // Mobilitaetssicht liegen dort fertig vor.
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
      cluster: ev.cluster || null,
      recordId: ev.recordId || null,
      source: 'ste',
      xlsxSource: ev.xlsxSource || null,
    });
  }

  return assignPlacement(out);
}

/**
 * Die Belege des geteilten Schnitts: alles, dessen Dokument nicht in der Menge
 * aus `recordsFor` liegt, faellt weg — aus den Punkten, der Laender-Reichweite,
 * den Zaehlstaenden und den Beleg-Listen gleichermassen.
 *
 * Die Karte schnitt frueher nur ueber Entitaet, Land und Zeitfenster, also stand
 * ein Personen- oder Dokumenttyp-Schnitt als Chip in der Leiste, ohne einen
 * einzigen Punkt zu bewegen (Frontend-Audit 2026-09-04).
 *
 * Das Zeitfenster bleibt aus dem Schnitt heraus: die Karte schneidet die Zeit am
 * Datum des Belegs und nicht am Zeitanker seines Dokuments, sonst fiele eine im
 * Fenster datierte Annotation mit ihrem ausserhalb datierten Dokument weg.
 * @param {Object} store
 * @param {Array<Occurrence>} occurrences
 * @param {Object} shared  getFilter()-Ergebnis
 * @returns {Array<Occurrence>}
 */
export function occurrencesInCut(store, occurrences, shared) {
  const facets = { ...(shared || {}) };
  delete facets.zeitfenster;
  const { ids } = recordsFor(store, facets);
  return (occurrences || []).filter(o => ids.has(o.recordId));
}

// ---------------------------------------------------------------------------
// Laender-Reichweite
// ---------------------------------------------------------------------------

/**
 * Land je Stadt, aus den verorteten Annotationen. Das Land steht nur am
 * Ereignis; ueber die Stadt erreicht es auch die Record-Orte, die keines
 * fuehren. Zaehlt die Nennungen und nimmt die haeufigste Zuordnung, damit eine
 * abweichende Einzelnennung eine Stadt nicht umhaengt.
 * @returns {Map<string, string>} Stadt in Kleinschreibung → Land
 */
export function countryByCity(store) {
  const tally = new Map();
  if (store && store.mobilityEvents) {
    for (const ev of store.mobilityEvents.values()) {
      if (!ev.place || !ev.placeCountry) continue;
      const key = cityOf(ev.place).toLowerCase();
      let counts = tally.get(key);
      if (!counts) { counts = new Map(); tally.set(key, counts); }
      counts.set(ev.placeCountry, (counts.get(ev.placeCountry) || 0) + 1);
    }
  }
  const out = new Map();
  for (const [key, counts] of tally) {
    out.set(key, [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
  return out;
}

// E-224: Reichweite is presence, not mention. Only the performative and
// institutional place roles put the person at the place; the correspondence
// roles (Absendung, Zielort, Abreiseort, Empfang, Vertragsort), erwaehnt,
// entstehung and every role without Sicht name a place without anyone being
// there. Derived from the role register, not from a second list.
const STAY_CLUSTERS = new Set(['performativ', 'institutionell']);
// Two roles outside those clusters still put the person at the place: a
// Wohnort is a state of being there by definition (residencePlace, vocab
// editorial note), and a Vertragsort attests an engagement at the house
// (Projektleitung, 2026-09-04).
const STAY_ROLES = new Set(['m3gim-vocab:residencePlace', 'wohnort',
  'm3gim-vocab:contractPlace', 'vertragsort']);

/**
 * Does this role attest a stay of the person at the place (E-224)? Only the
 * Laender-Reichweite reads it; the map points keep every role.
 * @param {?string} role  Concept-Id oder Rohform der Rolle
 */
export function isStayRole(role) {
  return STAY_ROLES.has(role) || STAY_CLUSTERS.has(mobilityClusterFor(role));
}

/**
 * Laender-Reichweite: Laender nach der Zahl der Dokumente, absteigend.
 * Gezaehlt werden Dokumente und nicht Belege, damit die Liste dieselbe Groesse
 * misst wie die Ergebniszeile der Sidebar. Gezaehlt wird nur, was einen
 * Aufenthalt belegt (isStayRole, E-224).
 * @param {Array<Occurrence>} occurrences  die Belege des Ausschnitts
 * @param {Map<string, string>} cityCountry
 * @returns {Array<{code:string, label:string, count:number}>}
 */
export function aggregateCountries(occurrences, cityCountry) {
  const perCountry = new Map();
  for (const o of occurrences || []) {
    if (!isStayRole(o.roleId || o.role)) continue;
    const land = countryOfOcc(o, cityCountry);
    if (!land) continue;
    let set = perCountry.get(land);
    if (!set) { set = new Set(); perCountry.set(land, set); }
    set.add(o.recordId || o.place);
  }
  return [...perCountry.entries()]
    .map(([code, set]) => ({ code, label: code, count: set.size }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code, 'de'));
}

/** Land eines Belegs ueber seine Stadt; null, wenn keines bekannt ist. */
export function countryOfOcc(occurrence, cityCountry) {
  if (!occurrence || !occurrence.place || !cityCountry) return null;
  return cityCountry.get(cityOf(occurrence.place).toLowerCase()) || null;
}

// ---------------------------------------------------------------------------
// Ableitungen ueber einer Beleg-Liste (Knoten, Tooltip, Ortsdetail)
// ---------------------------------------------------------------------------

/** Sicht-Aufschluesselung eines Knotens, absteigend nach Haeufigkeit. */
export function breakdownByView(occ) {
  const c = new Map();
  for (const o of occ) { const id = sichtOf(o); c.set(id, (c.get(id) || 0) + 1); }
  return [...c.entries()]
    .map(([id, count]) => {
      const t = TYPE_BY_ID.get(id) || TYPE_BY_ID.get(KONTEXT_ID);
      return { id, label: t.label, color: t.color, count };
    })
    .sort((a, b) => b.count - a.count);
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
