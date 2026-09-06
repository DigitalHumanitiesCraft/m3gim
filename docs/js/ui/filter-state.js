/**
 * Geteilter Filter-State (architecture.md § Cross-View-Filter,
 * Milestone 4 / E-117).
 *
 * EIN Filter-State-Objekt als Quelle fuer alle filterbaren Views. Jede Facette
 * zieht ihre Werte aus store.* (keine redaktionellen Listen). Leerwert =
 * Facette inaktiv. Seit E-163 gibt es keinen Modus mehr neben den Facetten:
 * der Schaerfegrad-Umschalter ist entfallen. Der Erschliessungsstand ist mit
 * E-262 ganz aus dem Filter genommen, er steht nur noch als Aussage im
 * Datensatz-Detail.
 *
 * Mechanik: setFilter(patch) merged den Patch und dispatcht ein
 * `m3gim:filter`-CustomEvent ueber denselben window-Kanal, den events.js
 * traegt — der CustomEvent faecht an N Subscriber aus (anders als die
 * tab->1-Handler-Map in events.js). subscribe(fn) registriert einen Listener
 * und liefert die Abmeldefunktion; beim Subscribe wird der aktuelle State
 * einmal zugestellt, damit ein spaet gerenderter View nachzieht.
 *
 * Persistenz ueber Tab-Wechsel ist gratis: der State lebt im Modul, Views
 * abonnieren beim (lazy, einmaligen) Render und bleiben abonniert.
 */

import { FACET_KEYS } from '../data/records-for.js';

// Facetten, die mehrere Werte zugleich tragen. Innerhalb einer Facette wirken
// sie als ODER, zwischen Facetten bleibt es UND (E-151). Eine leere Liste
// heisst Facette inaktiv.
const LIST_FACETS = new Set([
  'ort', 'person', 'werk', 'institution', 'docType', 'verknuepfung', 'land',
]);

const EMPTY = Object.freeze({
  ort: [],          // Stadtnamen (store.locations, cityOf-konsolidiert)
  person: [],       // Namen (store.persons)
  werk: [],         // Namen (store.works)
  institution: [],  // Namen (store.organizations)
  docType: [],      // Dokumenttyp-Kurz-Ids (DFT-Hierarchie, expandDftFilter)
  land: [],         // Laender der verorteten Orte (landIndex)
  verknuepfung: [], // Verknuepfungstyp oder `typ:rolle` (linkIndex)
  zeitfenster: null, // [vonJahr, bisJahr] oder null = volle Spanne
  search: '',       // Freitext (Bestand/Chronik)
});

// Ensemble, Ereignisrolle und Waehrung sind in records-for.js als Achsen
// gebaut, stehen aber nach der Entscheidung der Projektleitung vom 2026-08-31
// noch nicht im geteilten State: die Ensemble-Deckung ist zu duenn und die
// Finanzachse traegt heute nur Vorhandensein und Waehrung.

const state = {};
for (const key of Object.keys(EMPTY)) {
  state[key] = Array.isArray(EMPTY[key]) ? [] : EMPTY[key];
}

// The empty selection is the one baseline shared by every view.
function baselineOf(key) {
  return LIST_FACETS.has(key) ? [] : EMPTY[key];
}

/** Facetten, die vom Nullpunkt abweichen — die Chips der Ergebniszeile. */
export function deviatingKeys() {
  return Object.keys(EMPTY).filter(key => !shallowEqual(state[key], baselineOf(key)));
}

/**
 * Bringt einen Facettenwert auf die Listenform. Ein String bleibt zulaessig,
 * damit jede bestehende Schreibstelle weiter funktioniert; er wird zur
 * einelementigen Liste. Leerwerte werden zur leeren Liste, Dubletten fallen in
 * Auftrittsreihenfolge weg.
 */
function toList(value) {
  if (value == null || value === '') return [];
  const raw = Array.isArray(value) ? value : [value];
  const out = [];
  for (const v of raw) {
    if (v == null || v === '') continue;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

/** Die Werte einer Facette als Liste, unabhaengig davon, wie sie gesetzt wurde. */
export function facetValues(filterState, key) {
  return toList(filterState && filterState[key]);
}

const CHANNEL = 'm3gim:filter';

/** Aktuellen Filter-State als flache Kopie. */
export function getFilter() {
  const out = { ...state };
  for (const key of LIST_FACETS) out[key] = [...state[key]];
  return out;
}

/**
 * Merged einen Patch in den State und benachrichtigt alle Subscriber.
 * Nur tatsaechliche Aenderungen loesen einen Dispatch aus (idempotent).
 */
export function setFilter(patch) {
  if (!patch || typeof patch !== 'object') return;
  let changed = false;
  for (const key of Object.keys(patch)) {
    if (!(key in EMPTY)) continue;
    const next = LIST_FACETS.has(key) ? toList(patch[key]) : patch[key];
    if (!shallowEqual(state[key], next)) {
      state[key] = next;
      changed = true;
    }
  }
  if (changed) dispatch();
}

/**
 * Haengt einen Wert (oder mehrere) an eine Facette an, ohne die vorhandenen zu
 * verwerfen. Der Weg jeder Cross-Navigation in den geteilten Schnitt: ein Klick
 * auf einen Chip verengt, er ersetzt nicht. Ein Schluessel ausserhalb der
 * Facettenachsen aus records-for.js wird ignoriert.
 * @param {string} key
 * @param {string|string[]} value
 */
export function addFacetValue(key, value) {
  if (!FACET_KEYS.includes(key) || !LIST_FACETS.has(key)) return;
  const merged = [...facetValues(state, key)];
  for (const v of toList(value)) if (!merged.includes(v)) merged.push(v);
  setFilter({ [key]: merged });
}

/** Replace the complete filter in one dispatch. */
export function replaceFilter(next = {}) {
  const patch = {};
  for (const key of Object.keys(EMPTY)) {
    const value = key in next ? next[key] : baselineOf(key);
    patch[key] = Array.isArray(value) ? [...value] : value;
  }
  setFilter(patch);
}

/** Setzt alle Facetten auf den Nullpunkt zurueck, also auf die leere Wahl: nach
 *  dem Zuruecksetzen steht die volle Grundmenge, nicht der Ansichts-Default. */
export function resetFilter() {
  let changed = false;
  for (const key of Object.keys(EMPTY)) {
    const base = baselineOf(key);
    const next = Array.isArray(base) ? [...base] : base;
    if (!shallowEqual(state[key], next)) {
      state[key] = next;
      changed = true;
    }
  }
  if (changed) dispatch();
}

/**
 * Abonniert Filteraenderungen. fn erhaelt den aktuellen State (flache Kopie).
 * Liefert eine Abmeldefunktion. Der aktuelle State wird beim Subscribe einmal
 * zugestellt (Pull beim spaeten Render).
 * @param {(state: object) => void} fn
 * @param {{immediate?: boolean}} [opts]
 * @returns {() => void}
 */
export function subscribe(fn, { immediate = true } = {}) {
  const handler = (e) => fn(e.detail);
  if (typeof window !== 'undefined') {
    window.addEventListener(CHANNEL, handler);
  }
  if (immediate) fn(getFilter());
  return () => {
    if (typeof window !== 'undefined') window.removeEventListener(CHANNEL, handler);
  };
}

/** True, wenn mindestens eine Facette vom Nullpunkt der Ansicht abweicht. */
export function isFilterActive() {
  return deviatingKeys().length > 0;
}

function dispatch() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CHANNEL, { detail: getFilter() }));
}

function shallowEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return false;
}
