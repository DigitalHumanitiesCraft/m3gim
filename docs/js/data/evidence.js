/** Shared source-witness identities for query and aggregate results. */

import { extractXlsxSource } from '../utils/provenance.js';

/**
 * Stable identity of one recorded source row.
 * Graph paths produced from the same source row intentionally share this key;
 * independent rows retain different keys even when their wording is equal.
 */
export function sourceReference(recordId, value, fallback = {}) {
  const xlsxSource = value && typeof value === 'object' && ('sheet' in value || 'row' in value)
    ? value : extractXlsxSource(value);
  const sheet = xlsxSource?.sheet || null;
  const row = Number.isFinite(Number(xlsxSource?.row)) ? Number(xlsxSource.row) : null;
  const datenpunkt = xlsxSource?.datenpunkt ?? null;
  const nodeId = fallback.nodeId || value?.id || value?.['@id'] || null;
  const kind = fallback.kind || 'statement';
  const ordinal = Number.isInteger(fallback.ordinal) ? fallback.ordinal : null;
  const parts = sheet && row != null
    ? ['row', recordId, sheet, row, datenpunkt]
    : ['node', recordId, nodeId, kind, ordinal];
  return Object.freeze({
    key: JSON.stringify(parts), recordId, sheet, row, datenpunkt, nodeId, kind,
  });
}

/** @param {Object} witness @returns {string} */
export function witnessKey(witness) {
  if (witness?.sourceRef?.key) return witness.sourceRef.key;
  return sourceReference(witness?.recordId || '', witness?.xlsxSource || null, {
    nodeId: witness?.nodeId || witness?.id || null,
    kind: witness?.kind || witness?.dimension || 'statement',
    ordinal: witness?.ordinal,
  }).key;
}

/**
 * Canonical matching witness. `sourceRef` identifies the recorded row while
 * dimension/value/role describe why it matched the query.
 */
export function createWitness({
  recordId, dimension, value = null, role = null, source = null,
  nodeId = null, kind = 'statement', ordinal = null,
}) {
  const sourceRef = sourceReference(recordId, source, { nodeId, kind, ordinal });
  return Object.freeze({
    id: sourceRef.key,
    recordId,
    dimension,
    value,
    role,
    sourceRef,
  });
}

/** Deduplicate witnesses by source-row identity while retaining source order. */
export function uniqueWitnesses(witnesses) {
  const seen = new Set();
  const out = [];
  for (const witness of witnesses || []) {
    const key = witnessKey(witness);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(witness);
  }
  return Object.freeze(out);
}

/**
 * Common query/aggregate evidence envelope.
 *
 * `recordIds` is the supporting document set, `witnesses` the matching source
 * statements, and `contextRecordIds` the documents whose complete details may
 * be opened. Keeping both prevents a matching row from being mistaken for all
 * statements in its document.
 */
export function evidenceResult({ recordIds, witnesses = [], contextRecordIds, invalid = [] }) {
  const ids = new Set(recordIds || []);
  const matching = uniqueWitnesses(witnesses).filter(witness => ids.has(witness.recordId));
  return Object.freeze({
    recordIds: ids,
    witnesses: Object.freeze([...matching]),
    witnessIds: new Set(matching.map(witnessKey)),
    contextRecordIds: new Set(contextRecordIds || ids),
    invalidPredicates: Object.freeze([...(invalid || [])]),
    valid: (invalid || []).length === 0,
  });
}

/** Restrict evidence to documents in `recordIds`. */
export function evidenceInRecords(result, recordIds) {
  const keep = new Set(recordIds || []);
  return evidenceResult({
    recordIds: [...result.recordIds].filter(id => keep.has(id)),
    contextRecordIds: [...result.contextRecordIds].filter(id => keep.has(id)),
    witnesses: result.witnesses.filter(witness => keep.has(witness.recordId)),
    invalid: result.invalidPredicates,
  });
}

/** Union several selected evidence units with source and document deduplication. */
export function unionEvidence(results) {
  const recordIds = new Set();
  const contextRecordIds = new Set();
  const witnesses = [];
  const invalid = [];
  for (const result of results || []) {
    for (const id of result?.recordIds || []) recordIds.add(id);
    for (const id of result?.contextRecordIds || []) contextRecordIds.add(id);
    witnesses.push(...(result?.witnesses || []));
    invalid.push(...(result?.invalidPredicates || []));
  }
  return evidenceResult({ recordIds, contextRecordIds, witnesses, invalid });
}
