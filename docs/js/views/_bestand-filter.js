/**
 * Geteilte Filter-Pipeline fuer Bestand und Chronik.
 *
 * Beide Views wenden denselben geteilten Filter (filter-state.js) auf eine
 * Item-Liste an. Der einzige strukturelle Unterschied: Bestand filtert
 * gewrappte Items ({ record, ... }), Chronik nackte Records. Das loest
 * `getRecord` (Accessor). Die Such-Felder weichen ab (Bestand sucht zusaetzlich
 * in Typ-Label + Datum) -- daher das `searchMatch`-Praedikat als Parameter, mit
 * den zwei konkreten Implementierungen hier exportiert.
 *
 * Seit dem Sidebar-Umbau wohnen Suche und Dokumenttyp im geteilten Filter. Die
 * Freitextsuche bleibt hier (view-eigenes Textmatch), Dokumenttyp und die
 * Entitaets-/geteilten Facetten loest recordsFor auf, die eine Stelle im
 * Frontend, an der Filter zur Dokumentmenge wird.
 */

import { getDocTypeId, dftLabel } from '../utils/format.js';
import { facetValues } from '../ui/filter-state.js';
import { recordsFor, FACET_KEYS } from '../data/records-for.js';

/** Facetten des geteilten Filters, die im Bestand/in der Chronik schneiden.
 *  finanzen und ereignis liegen im Store, werden hier aber nicht bedient. */
const CUT_FACETS = ['docType', 'person', 'ort', 'werk', 'institution', 'sicht', 'stand']
  .filter(k => FACET_KEYS.includes(k));

/** Ob mindestens eine schneidende Facette oder die Suche aktiv ist. Eine leere
 *  Liste heisst inaktiv. `stand` zaehlt hier nicht mit: der Erschliessungsstand
 *  schneidet Objekte, er loest die Konvolut-Hierarchie aber nicht auf, sonst
 *  laege die Startansicht des Bestands flach vor dem Betrachter. */
export function isSharedFiltered(shared) {
  if (shared && (shared.search || '').trim()) return true;
  for (const key of CUT_FACETS) {
    if (key === 'stand') continue;
    if (facetValues(shared, key).length > 0) return true;
  }
  return false;
}

/** Die Facetten, die ueber person/ort/werk/docType hinaus die Hierarchie
 *  abflachen (institution/sicht). Das Zeitfenster wirkt separat ueber
 *  applyZeitfenster. */
const FLATTEN_FACETS = ['institution', 'sicht'];

/** Ob eine dieser Facetten gesetzt ist. Zaehlt fuer die Frage, ob die
 *  Hierarchie abzuflachen und der gefilterte Zaehler zu zeigen ist. */
export function sharedFacetsActive(sharedFilter) {
  for (const key of FLATTEN_FACETS) {
    if (facetValues(sharedFilter, key).length > 0) return true;
  }
  return false;
}

/** Bestand-Suche: Signatur, Titel, Typ-Label, Datum. Der Store liefert das
 *  Typ-Label (skos:prefLabel); ohne Store entfällt nur die Label-Teilsuche. */
export function searchMatchBestand(record, q, store) {
  const sig = (record['rico:identifier'] || '').toLowerCase();
  const title = (record['rico:title'] || '').toLowerCase();
  const typ = dftLabel(store, getDocTypeId(record)).toLowerCase();
  const datum = (record['rico:date'] || '').toLowerCase();
  return sig.includes(q) || title.includes(q) || typ.includes(q) || datum.includes(q);
}

/** Chronik-Suche: Signatur + Titel. */
export function searchMatchChronik(record, q) {
  const sig = (record['rico:identifier'] || '').toLowerCase();
  const title = (record['rico:title'] || '').toLowerCase();
  return sig.includes(q) || title.includes(q);
}

/**
 * Wendet den geteilten Filter auf `items` an und gibt die gefilterte Liste
 * zurueck (nicht mutierend).
 *
 * @param {Object} store
 * @param {Array}  items   - Item-Liste (gewrappt oder nackte Records).
 * @param {Object} shared  - geteilter Filterzustand (getFilter()).
 * @param {Object} opts
 * @param {Function} opts.getRecord     - item -> JSON-LD-Record.
 * @param {Function} opts.searchMatch   - (record, qLower) -> boolean.
 */
export function filterBySharedState(store, items, shared, { getRecord, searchMatch }) {
  const s = shared || {};
  let out = items;

  const search = (s.search || '').trim();
  if (search) {
    const q = search.toLowerCase();
    out = out.filter(it => searchMatch(getRecord(it), q));
  }

  // Alle schneidenden Facetten (inkl. Dokumenttyp mit DFT-Hierarchie) loest
  // recordsFor auf. Nur die tatsaechlich gesetzten uebergeben, damit die eine
  // Aufloesung greift, ohne dass hier eine zweite Filterwelt entsteht.
  const facetFilter = {};
  let anyFacet = false;
  for (const key of CUT_FACETS) {
    const vals = facetValues(s, key);
    if (vals.length > 0) { facetFilter[key] = vals; anyFacet = true; }
  }
  if (anyFacet) {
    const base = new Set(out.map(it => getRecord(it)['@id']));
    const { ids } = recordsFor(store, facetFilter, { base });
    out = out.filter(it => ids.has(getRecord(it)['@id']));
  }
  return out;
}
