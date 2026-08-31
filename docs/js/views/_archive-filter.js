/**
 * Geteilte Toolbar-Filter-Pipeline fuer Bestand und Chronik (Tier 2.6).
 *
 * Beide Views wenden dieselben fuenf Facetten (search, docType, person,
 * location, werk) auf eine Item-Liste an. Der einzige strukturelle Unterschied:
 * Bestand filtert gewrappte Items ({ record, ... }), Chronik nackte Records.
 * Das loest `getRecord` (Accessor). Die Such-Felder weichen ab (Bestand sucht
 * zusaetzlich in Typ-Label + Datum) -- daher das `searchMatch`-Praedikat als
 * Parameter, mit den zwei konkreten Implementierungen hier exportiert.
 */

import { getDocTypeId, expandDftFilter, dftLabel } from '../utils/format.js';
import { facetValues } from '../ui/filter-state.js';
import { recordsFor } from '../data/records-for.js';

/** Ob mindestens eine der fuenf Facetten aktiv ist. Die drei Entitaetsfacetten
 *  halten seit E-151 Listen; eine leere Liste heisst inaktiv. */
export function isToolbarFiltered(state) {
  const { search = '', docType = '' } = state || {};
  if (search || docType) return true;
  for (const key of ['person', 'location', 'werk']) {
    if (facetValues(state, key).length > 0) return true;
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
 * Wendet die fuenf Toolbar-Facetten auf `items` an und gibt die gefilterte
 * Liste zurueck (nicht mutierend).
 *
 * @param {Object} store
 * @param {Array}  items   - Item-Liste (gewrappt oder nackte Records).
 * @param {Object} state   - { search, docType, person, location, werk }.
 * @param {Object} opts
 * @param {Function} opts.getRecord   - item -> JSON-LD-Record.
 * @param {Function} opts.searchMatch - (record, qLower) -> boolean.
 */
export function filterByToolbarState(store, items, state, { getRecord, searchMatch }) {
  const { search = '', docType = '' } = state || {};
  let out = items;

  if (search) {
    const q = search.toLowerCase();
    out = out.filter(it => searchMatch(getRecord(it), q));
  }
  if (docType === '__none__') {
    // Erschliessungsluecke begehbar: Records ohne klassifizierten Dokumenttyp.
    out = out.filter(it => !getDocTypeId(getRecord(it)));
  } else if (docType) {
    const allowed = expandDftFilter(store, docType);
    out = out.filter(it => allowed.has(getDocTypeId(getRecord(it))));
  }
  // Die drei Entitaetsfacetten loest recordsFor auf, die eine Stelle im
  // Frontend, an der Filter zu Dokumentmenge wird. Suche und Dokumenttyp
  // bleiben hier, sie sind Toolbar-lokal und kein geteilter Schnitt.
  const entityFilter = {
    person: facetValues(state, 'person'),
    ort: facetValues(state, 'location'),
    werk: facetValues(state, 'werk'),
  };
  if (Object.values(entityFilter).some(v => v.length > 0)) {
    const base = new Set(out.map(it => getRecord(it)['@id']));
    const { ids } = recordsFor(store, entityFilter, { base });
    out = out.filter(it => ids.has(getRecord(it)['@id']));
  }
  return out;
}
