/**
 * Dom-freie Projektions- und Sync-Helfer fuer den geteilten Filter (M4, E-117).
 *
 * Die vier Altviews (Bestand, Chronik, Netzwerk, Karte) tragen je eigene
 * Filter-Shapes. Dieses Modul uebersetzt zwischen dem geteilten State
 * (filter-state.js) und diesen lokalen Shapes als reine Funktionen, damit die
 * Kopplung ohne DOM testbar bleibt. Der Loop-Guard (makeSyncGuard) verhindert
 * die setFacet<->setFilter-Endlosschleife: schreibt ein View auf den geteilten
 * State, faecht subscribe an alle Views zurueck, inkl. den Schreiber selbst —
 * ohne Guard wuerde dessen Subscriber erneut setFilter rufen.
 */

import { primaryYear } from '../data/loader.js';
import { facetValues } from './filter-state.js';

/**
 * Projiziert den geteilten Filter auf die Bestand/Chronik-Toolbar-Facetten.
 * Der geteilte `ort` ist stadt-konsolidiert; store.locations traegt die Stadt
 * als eigenen Eintrag (consolidateCityLocations), daher mappt ort -> location
 * 1:1 ohne weitere Uebersetzung. zeitfenster/sicht/rolle wirken NICHT ueber die
 * Toolbar-Pipeline (zeitfenster via applyZeitfenster, schaerfe via applySchaerfe).
 *
 * Seit E-151 haelt jede Entitaetsfacette eine Liste (ODER innerhalb, UND
 * zwischen den Facetten). Ein String aus einer Altstelle wird zur
 * einelementigen Liste, damit keine lesende Stelle still einen String erwartet,
 * wenn der State Listen haelt.
 * @param {object} shared - getFilter()-Ergebnis
 * @returns {{person:string[], location:string[], werk:string[]}}
 */
export function sharedToToolbarState(shared) {
  return {
    person: facetValues(shared, 'person'),
    location: facetValues(shared, 'ort'),
    werk: facetValues(shared, 'werk'),
  };
}

/**
 * Projiziert eine Toolbar-State-Aenderung zurueck auf den geteilten Filter.
 * Nur die geteilten Facetten (person/ort/werk) wandern zurueck; view-lokale
 * Facetten (search, docType, zeigeUnerschlossen) bleiben aussen vor.
 * @param {object} toolbarState - toolbar.getState()
 * @returns {{person:string[], ort:string[], werk:string[]}}
 */
export function toolbarStateToShared(toolbarState) {
  const t = toolbarState || {};
  return {
    person: facetValues(t, 'person'),
    ort: facetValues(t, 'location'),
    werk: facetValues(t, 'werk'),
  };
}

/**
 * Records, die mind. eine verortete Annotation ODER eine Performance tragen —
 * die enge (raumzeitlich/auffuehrungs-belegte) Menge (knowledge/frontend-architecture.md, Abschnitt Schaerfegrade).
 * store.recordToEvents fuehrt genau die verorteten Annotationen; eine reine
 * Datierung ohne Ort engt den Schaerfegrad nicht.
 * @param {object} store
 * @returns {Set<string>} Record-@ids
 */
export function engRecordSet(store) {
  const set = new Set();
  if (store?.recordToEvents) for (const id of store.recordToEvents.keys()) set.add(id);
  if (store?.recordToPerformances) for (const id of store.recordToPerformances.keys()) set.add(id);
  return set;
}

/**
 * Engt eine Item-Liste auf die ereignis-/auffuehrungs-belegten Records ein
 * (Schaerfegrad 'eng'). Reine Funktion; nennt die Differenz fuer die Anzeige.
 * @param {Array} items
 * @param {object} store
 * @param {(item:any)=>object} getRecord - item -> Record
 * @returns {{items:Array, total:number, eng:number}}
 */
export function applySchaerfeEng(items, store, getRecord) {
  const anchored = engRecordSet(store);
  const out = items.filter(it => anchored.has(getRecord(it)['@id']));
  return { items: out, total: items.length, eng: out.length };
}

/**
 * Liest das Jahr eines Records (kanonisch rico:date). Liefert null, wenn
 * undatiert.
 *
 * Die Aufloesung ist `primaryYear` der Datenschicht (Frontend-Vertrag A4):
 * `rico:date` hat Vorrang, fehlt es, datiert die ranghoechste ankernde
 * Datierung. Eine eigene Aufloesung an dieser Stelle wuerde Records ohne
 * `rico:date` im Zeitfilter als undatiert durchfallen lassen, waehrend Chronik
 * und Netzwerk sie datiert zeigen.
 */
export function recordYear(store, record) {
  const y = primaryYear(store, record).year;
  return (typeof y === 'number' && Number.isFinite(y)) ? y : null;
}

/**
 * Filtert eine Item-Liste auf das geteilte Zeitfenster [von,bis]. Undatierte
 * Records bleiben sichtbar (Erschliessungsspiegel, E-88) — das Zeitfenster ist
 * ein Ausschnitt der datierten Spur, kein Tilgen des Undatierten.
 * Leeres Fenster (null) laesst alles durch.
 * @param {Array} items
 * @param {[number,number]|null} zeitfenster
 * @param {(item:any)=>object} getRecord
 * @returns {Array}
 */
export function applyZeitfenster(items, zeitfenster, getRecord, store) {
  if (!Array.isArray(zeitfenster)) return items;
  const [von, bis] = zeitfenster;
  if (von == null && bis == null) return items;
  const lo = von ?? -Infinity;
  const hi = bis ?? Infinity;
  return items.filter(it => {
    const y = recordYear(store, getRecord(it));
    return y == null || (y >= lo && y <= hi);
  });
}

/**
 * Loop-Guard: ein boolesches Flag, das ein Sync-Schreiben markiert. Ein
 * subscribe-Callback, der waehrend des eigenen Schreibens erneut feuert, sieht
 * isActive()===true und bricht ab. run(fn) setzt das Flag um fn herum und
 * raeumt es im finally wieder ab (auch bei Ausnahme).
 * @returns {{isActive:()=>boolean, run:(fn:()=>void)=>void}}
 */
export function makeSyncGuard() {
  let syncing = false;
  return {
    isActive: () => syncing,
    run(fn) {
      if (syncing) return;
      syncing = true;
      try { fn(); } finally { syncing = false; }
    },
  };
}

/**
 * Sicht-Facette -> Karten-`state.active`-Set. Leere Auswahl => alle Sichten
 * aktiv (Facette inaktiv); gesetzte Werte => genau die bekannten davon.
 * @param {string|string[]} sicht - '' | [] | Cluster-Ids | 'kontext'
 * @param {string[]} allTypeIds - alle bekannten Sicht-Ids (inkl. 'kontext')
 * @returns {Set<string>}
 */
export function sichtToActiveSet(sicht, allTypeIds) {
  const wanted = facetValues({ sicht }, 'sicht').filter(v => allTypeIds.includes(v));
  if (wanted.length === 0) return new Set(allTypeIds);
  return new Set(wanted);
}

/**
 * Karten-`state.active`-Set -> Sicht-Facette. Alle aktiv => leere Liste
 * (Facette inaktiv), sonst die aktiven Ids in der Reihenfolge von allTypeIds.
 * @param {Set<string>} active
 * @param {string[]} allTypeIds
 * @returns {string[]}
 */
export function activeSetToSicht(active, allTypeIds) {
  if (!active || active.size === allTypeIds.length) return [];
  return allTypeIds.filter(id => active.has(id));
}

/**
 * Geteiltes Zeitfenster -> {yearFrom, yearTo} eines Views mit eigener Spanne.
 * Leeres Fenster => null/null (unbeschraenkt). Werte werden nicht an die
 * View-Spanne geklemmt; das ueberlaesst der Aufrufer seiner Filterlogik.
 * @param {[number,number]|null} zeitfenster
 * @returns {{yearFrom:number|null, yearTo:number|null}}
 */
export function zeitfensterToYearRange(zeitfenster) {
  if (!Array.isArray(zeitfenster)) return { yearFrom: null, yearTo: null };
  const [von, bis] = zeitfenster;
  return { yearFrom: von ?? null, yearTo: bis ?? null };
}

/**
 * {yearFrom, yearTo} -> geteiltes Zeitfenster. Ein Fenster, das die volle
 * Spanne [min,max] abdeckt, wird zu null (Facette inaktiv) gefaltet, damit ein
 * unveraenderter Slider nicht als aktiver Filter erscheint.
 * @param {number|null} yearFrom
 * @param {number|null} yearTo
 * @param {{min:number, max:number}} span
 * @returns {[number,number]|null}
 */
export function yearRangeToZeitfenster(yearFrom, yearTo, span) {
  const von = (yearFrom == null) ? span.min : yearFrom;
  const bis = (yearTo == null) ? span.max : yearTo;
  if (von <= span.min && bis >= span.max) return null;
  return [von, bis];
}
