/**
 * M³GIM Normalization Utilities
 * Shared name normalization and categorization logic, plus the diacritic-folding
 * text match every facet autocomplete uses.
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

/* ------------------------------------------------------------------ */
/*  Diakritika-faltender Textabgleich der Facetten-Autovervollstaendigung */
/* ------------------------------------------------------------------ */

/**
 * Folded form of a single character. Umlauts and accents lose their combining
 * mark (NFD + strip), the Eszett becomes `ss`, so that a query typed without
 * German special characters still reaches "Böhm, Karl" or "Ančerl".
 * @param {string} ch
 * @returns {string} may be empty (a bare combining mark) or longer than one
 */
function foldChar(ch) {
  const lower = ch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return lower === 'ß' ? 'ss' : lower;
}

/**
 * Folded form of a text, for comparison only.
 * @param {string} value
 * @returns {string}
 */
export function foldText(value) {
  let out = '';
  for (const ch of String(value == null ? '' : value)) out += foldChar(ch);
  return out;
}

/**
 * Folded text plus, per folded character, the index of the source character it
 * came from. The map is what lets a match be marked in the original label.
 * @param {string} value
 * @returns {{folded: string, map: number[], chars: string[]}}
 */
function foldWithMap(value) {
  const chars = [...String(value == null ? '' : value)];
  const map = [];
  let folded = '';
  chars.forEach((ch, i) => {
    const f = foldChar(ch);
    for (let k = 0; k < f.length; k += 1) map.push(i);
    folded += f;
  });
  return { folded, map, chars };
}

/** The query as its whitespace-separated, folded words. */
function queryTerms(query) {
  return foldText(query).split(/\s+/).filter(Boolean);
}

/**
 * Does every word of the query appear somewhere in the label? Word order is
 * irrelevant, so "herbert karajan" reaches "Karajan, Herbert von".
 * @param {string} label
 * @param {string} query  empty query matches everything
 * @returns {boolean}
 */
export function matchesQuery(label, query) {
  const terms = queryTerms(query);
  if (terms.length === 0) return true;
  const hay = foldText(label);
  return terms.every(t => hay.includes(t));
}

/**
 * The character ranges of the label that the query words cover, merged and in
 * reading order. Indices count characters of the label (code points), so a
 * surrogate pair stays one position.
 * @param {string} label
 * @param {string} query
 * @returns {Array<[number, number]>} half-open [start, end) ranges
 */
export function matchRanges(label, query) {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  const { folded, map, chars } = foldWithMap(label);
  const spans = [];
  for (const term of terms) {
    let at = folded.indexOf(term);
    while (at !== -1) {
      const start = map[at];
      // The end is the source character after the last folded one; a folded
      // expansion ("ss" from one Eszett) must not cut the source character.
      const lastFolded = at + term.length - 1;
      const end = lastFolded < map.length ? map[lastFolded] + 1 : chars.length;
      if (start != null) spans.push([start, end]);
      at = folded.indexOf(term, at + 1);
    }
  }
  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([span[0], span[1]]);
  }
  return merged;
}
