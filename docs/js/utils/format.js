/**
 * M³GIM Display Formatting Utilities
 */

import { DOKUMENTTYP_LABELS } from '../data/constants.js';

/** Extract the short part of a signatur (e.g. "UAKUG/NIM_003 1_1" → "NIM_003 1_1"). */
export function formatSignatur(identifier) {
  if (!identifier) return '';
  return identifier.replace('UAKUG/', '');
}

/** Format a child signatur showing only the piece number (e.g. "UAKUG/NIM_003 1_1" → "Nr. 1.1"). */
export function formatChildSignatur(identifier, parentIdentifier) {
  if (!identifier || !parentIdentifier) return formatSignatur(identifier);
  const sig = formatSignatur(identifier);
  const parentSig = formatSignatur(parentIdentifier);
  if (sig.startsWith(parentSig + ' ')) {
    const nr = sig.slice(parentSig.length + 1).replace(/_/g, '.');
    return 'Nr.\u2009' + nr;
  }
  return sig;
}

/** Get document type ID from a RiC-O documentaryFormType. */
export function getDocTypeId(record) {
  const dft = record['rico:hasDocumentaryFormType'];
  if (!dft) return null;
  const id = typeof dft === 'object' ? dft['@id'] : dft;
  return id ? id.replace('m3gim-dft:', '') : null;
}

/** Get human-readable label for a document type. */
export function formatDocType(record) {
  const typeId = getDocTypeId(record);
  if (!typeId) return '';
  return DOKUMENTTYP_LABELS[typeId] || typeId;
}

/** Ensure a value is always an array. */
export function ensureArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/** Count linked entities on a record. */
export function countLinks(record) {
  let count = 0;
  count += ensureArray(record['rico:hasOrHadAgent']).length;
  count += ensureArray(record['rico:hasOrHadLocation']).length;
  count += ensureArray(record['rico:hasOrHadSubject']).length;
  count += ensureArray(record['m3gim:mentions']).length;
  count += ensureArray(record['rico:isAssociatedWithDate']).length;
  count += ensureArray(record['m3gim:hasPerformanceRole']).length;
  return count;
}

/** Truncate a string with ellipsis. */
export function truncate(str, maxLen = 80) {
  if (!str || str.length <= maxLen) return str || '';
  return str.slice(0, maxLen - 1) + '\u2026';
}
