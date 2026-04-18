/**
 * Environment-Helper: unterscheidet Lokal-Dev von Produktion.
 *
 * Single source of truth fuer "logge nur lokal". Auf dhcraft.org keine
 * Konsolen-Ausgabe -- Store-Report, Stempel, Debug-Helper sind stumm.
 */

export const IS_DEV = typeof location !== 'undefined'
  && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

/**
 * Kompakter State-Log-Stempel fuer Tab-Views.
 * Format: `[viewName] key:val | key:val | ...` mit fester Key-Reihenfolge.
 * Schreibt nur in DEV. Parts als Array `[[key, val], ...]` damit die
 * Reihenfolge auf Aufrufer-Seite bewusst gesetzt wird.
 */
export function logStamp(viewName, parts) {
  if (!IS_DEV) return;
  const rendered = parts
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}:${v}`)
    .join(' | ');
  // eslint-disable-next-line no-console
  console.log(`[${viewName}] ${rendered}`);
}
