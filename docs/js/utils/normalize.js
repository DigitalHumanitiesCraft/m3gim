/**
 * M³GIM Normalization Utilities
 * Shared name normalization and categorization logic.
 */

import { PERSONEN_NORMALISIERUNG, PERSONEN_KATEGORIEN } from '../data/constants.js';

/**
 * Normalize a person name using the canonical mapping.
 * @param {string} rawName
 * @returns {string}
 */
export function normalizePerson(rawName) {
  const lower = rawName.toLowerCase().trim();
  return PERSONEN_NORMALISIERUNG[lower] || rawName;
}

// Sort by keyword length descending so specific names match before generic ones
// e.g., "wieland wagner" matches before "wagner"
const SORTED_KATEGORIEN = Object.entries(PERSONEN_KATEGORIEN)
  .sort((a, b) => b[0].length - a[0].length);

/**
 * Determine person category from name using keyword matching.
 * @param {string} name
 * @returns {string}
 */
export function getPersonKategorie(name) {
  if (!name) return 'Andere';
  const lower = name.toLowerCase();
  for (const [keyword, kat] of SORTED_KATEGORIEN) {
    if (lower.includes(keyword)) return kat;
  }
  return 'Andere';
}
