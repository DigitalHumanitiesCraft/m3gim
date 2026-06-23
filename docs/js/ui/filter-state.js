/**
 * Geteilter Filter-State (filter-modell.md, Milestone 4 / E-117).
 *
 * EIN Filter-State-Objekt als Quelle fuer alle filterbaren Views. Jede Facette
 * zieht ihre Werte aus store.* (keine redaktionellen Listen). Leerwert =
 * Facette inaktiv. Der `schaerfe`-Modus ist kein Entitaetsfilter, sondern der
 * Schalter weit (Record-Bezug) / eng (Ereignis-Verortung) aus
 * visualisierung-bayreuth.md.
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

export const FILTER_FACETS = ['ort', 'person', 'werk', 'rolle', 'zeitfenster', 'sicht', 'schaerfe'];

const EMPTY = Object.freeze({
  ort: '',          // Stadtname (store.locations, cityOf-konsolidiert)
  person: '',       // Name (store.persons)
  werk: '',         // Name (store.works)
  rolle: '',        // Akteursrolle (store.persons[].roles)
  zeitfenster: null, // [vonJahr, bisJahr] oder null = volle Spanne
  sicht: '',        // Mobilitaetssicht (mobilityClusterFor) oder 'kontext'
  schaerfe: 'weit', // 'weit' | 'eng' — Modus, kein Entitaetsfilter
});

const state = { ...EMPTY };

const CHANNEL = 'm3gim:filter';

/** Aktuellen Filter-State als flache Kopie. */
export function getFilter() {
  return { ...state };
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
    const next = patch[key];
    if (!shallowEqual(state[key], next)) {
      state[key] = next;
      changed = true;
    }
  }
  if (changed) dispatch();
}

/** Setzt alle Facetten auf den Leerwert zurueck. */
export function resetFilter() {
  let changed = false;
  for (const key of Object.keys(EMPTY)) {
    if (!shallowEqual(state[key], EMPTY[key])) {
      state[key] = EMPTY[key];
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

/** True, wenn mindestens eine Facette vom Leerwert abweicht. */
export function isFilterActive() {
  for (const key of Object.keys(EMPTY)) {
    if (!shallowEqual(state[key], EMPTY[key])) return true;
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
