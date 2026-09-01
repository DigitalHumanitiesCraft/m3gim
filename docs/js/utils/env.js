/**
 * Environment helper distinguishing local dev from production.
 *
 * Single source of truth for "log only locally". No console output on
 * dhcraft.org -- store report, stamps, debug helpers stay silent.
 */

export const IS_DEV = typeof location !== 'undefined'
  && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

/**
 * Compact state-log stamp for tab views. DEV only.
 * Format: `[viewName] key:val | key:val | ...` with fixed key order.
 * Parts as array `[[key, val], ...]` so the caller sets the order deliberately.
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
