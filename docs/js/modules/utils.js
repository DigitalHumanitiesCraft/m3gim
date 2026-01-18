/**
 * M³GIM Utility Functions
 * Shared helper functions
 */

import { DOKUMENTTYP_LABELS } from './config.js';

/**
 * Escape HTML special characters
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Ensure value is an array
 */
export function ensureArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Debounce function calls
 */
export function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Format date for display
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';

  // Handle date ranges
  if (dateStr.includes('/')) {
    const [from, to] = dateStr.split('/');
    return `${formatSingleDate(from)} – ${formatSingleDate(to)}`;
  }

  return formatSingleDate(dateStr);
}

/**
 * Format a single date value
 */
export function formatSingleDate(dateStr) {
  if (!dateStr) return '';

  // Year only (1958)
  if (/^\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  // Year-Month (1958-04)
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [y, m] = dateStr.split('-');
    return `${m}/${y}`;
  }

  // Full date (1958-04-18)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  }

  return dateStr;
}

/**
 * Get document type from record
 */
export function getDokumenttyp(record) {
  const dft = record['rico:hasDocumentaryFormType'];
  if (!dft) return null;

  const id = dft['@id'] || '';
  return id.replace('m3gim-dft:', '');
}

/**
 * Get German label for document type
 */
export function getDokumenttypLabel(typ) {
  return DOKUMENTTYP_LABELS[typ] || typ || 'Unbekannt';
}

/**
 * Check if record is a photo
 */
export function isPhoto(record) {
  return getDokumenttyp(record) === 'Photograph';
}

/**
 * Get access status from record
 */
export function getAccessStatus(record) {
  return record['m3gim:accessStatus'] || 'offen';
}

/**
 * Parse year from date string
 */
export function parseYear(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate unique ID
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone an object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if two arrays have the same elements
 */
export function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}
