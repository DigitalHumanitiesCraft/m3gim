/**
 * Dom-freie Anwend- und Sync-Helfer fuer den geteilten Filter (M4, E-117).
 *
 * Die Views wenden den geteilten State auf ihre Item-Listen an, statt ihn zu
 * uebersetzen. Reine Funktionen, damit die Kopplung ohne DOM testbar bleibt.
 */

import { yearOf } from '../data/records-for.js';

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
    const y = yearOf(store, getRecord(it));
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
