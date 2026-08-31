/**
 * Geteilter Filter-State (frontend-architecture.md § Cross-View-Filter,
 * Milestone 4 / E-117).
 *
 * EIN Filter-State-Objekt als Quelle fuer alle filterbaren Views. Jede Facette
 * zieht ihre Werte aus store.* (keine redaktionellen Listen). Leerwert =
 * Facette inaktiv. Der `schaerfe`-Modus ist kein Entitaetsfilter, sondern der
 * Schalter weit (Record-Bezug) / eng (Ereignis-Verortung) aus
 * knowledge/frontend-architecture.md, Abschnitt Schaerfegrade als Filtersemantik.
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

// Facetten, die mehrere Werte zugleich tragen. Innerhalb einer Facette wirken
// sie als ODER, zwischen Facetten bleibt es UND (E-151). Eine leere Liste
// heisst Facette inaktiv.
const LIST_FACETS = new Set(['ort', 'person', 'werk', 'institution', 'rolle', 'sicht']);

const EMPTY = Object.freeze({
  ort: [],          // Stadtnamen (store.locations, cityOf-konsolidiert)
  person: [],       // Namen (store.persons)
  werk: [],         // Namen (store.works)
  institution: [],  // Namen (store.organizations)
  rolle: [],        // Akteursrollen (store.recordsByAgentRole)
  zeitfenster: null, // [vonJahr, bisJahr] oder null = volle Spanne
  sicht: [],        // Mobilitaetssichten (mobilityClusterFor) oder 'kontext'
  schaerfe: 'weit', // 'weit' | 'eng' — Modus, kein Entitaetsfilter
});

// Ensemble, Ereignisrolle und Waehrung sind in records-for.js als Achsen
// gebaut, stehen aber nach der Entscheidung der Projektleitung vom 2026-08-31
// noch nicht im geteilten State: die Ensemble-Deckung ist zu duenn und die
// Finanzachse traegt heute nur Vorhandensein und Waehrung.

const state = {};
for (const key of Object.keys(EMPTY)) {
  state[key] = Array.isArray(EMPTY[key]) ? [] : EMPTY[key];
}

// Facetten, die seit dem letzten Zuruecksetzen gesetzt wurden. Der Vermerk
// trennt "der Nutzer hat diese Facette bewusst gewaehlt" von "sie steht auf
// ihrem Anfangswert" und traegt damit den Voreinstellungs-Mechanismus pro
// Ansicht: ein View darf seinen Default nur auf eine unberuehrte Facette
// legen, sonst ueberschriebe der Tab-Wechsel eine getroffene Wahl.
const touched = new Set();

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
    touched.add(key);
    if (!shallowEqual(state[key], next)) {
      state[key] = next;
      changed = true;
    }
  }
  if (changed) dispatch();
}

/** Ob eine Facette seit dem letzten Zuruecksetzen gesetzt wurde. */
export function isFacetTouched(key) {
  return touched.has(key);
}

/**
 * Voreinstellung einer Ansicht. Setzt nur die Facetten, die der Nutzer noch
 * nicht angefasst hat, und laesst eine getroffene Wahl unberuehrt. Damit kann
 * jede Ansicht ihren passenden Schaerfegrad mitbringen (Zeitstrahl und Karte
 * eng, Netzwerk und Bestand weit), ohne den geteilten Schnitt zu ueberschreiben.
 * @param {Object} patch
 */
export function applyViewDefault(patch) {
  if (!patch || typeof patch !== 'object') return;
  const fresh = {};
  for (const key of Object.keys(patch)) {
    if (!(key in EMPTY) || touched.has(key)) continue;
    fresh[key] = patch[key];
  }
  if (Object.keys(fresh).length === 0) return;
  setFilter(fresh);
  // Die Voreinstellung ist keine Wahl des Nutzers; sonst bliebe sie nach einem
  // Tab-Wechsel als "angefasst" stehen und der naechste View koennte seinen
  // eigenen Default nicht mehr setzen.
  for (const key of Object.keys(fresh)) touched.delete(key);
}

/** Setzt alle Facetten auf den Leerwert zurueck. */
export function resetFilter() {
  let changed = false;
  for (const key of Object.keys(EMPTY)) {
    const empty = LIST_FACETS.has(key) ? [] : EMPTY[key];
    if (!shallowEqual(state[key], empty)) {
      state[key] = empty;
      changed = true;
    }
  }
  touched.clear();
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

/** True, wenn mindestens eine Facette vom Leerwert abweicht. */
export function isFilterActive() {
  for (const key of Object.keys(EMPTY)) {
    const empty = LIST_FACETS.has(key) ? [] : EMPTY[key];
    if (!shallowEqual(state[key], empty)) return true;
  }
  return false;
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
