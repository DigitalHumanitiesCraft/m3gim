/** Lossless aggregation of timeline rows for one natural calendar group. */
const FAMILIES = ['ort', 'person', 'werk', 'part', 'institution'];

function appendUnique(target, values) {
  for (const value of values || []) if (!target.includes(value)) target.push(value);
}

function appendUniqueEvidence(target, signatures, values) {
  for (const value of values || []) {
    const signature = JSON.stringify(value);
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    target.push(value);
  }
}

/** Aggregate presentation data without replacing any original source context. */
export function aggregateCalendarGroup(group) {
  const rows = Array.isArray(group?.rows) ? group.rows : [];
  const sources = [];
  const sourcesByRecord = new Map();
  const lanes = Object.fromEntries(FAMILIES.map(family => [family, []]));
  const entriesByFamily = Object.fromEntries(FAMILIES.map(family => [family, new Map()]));
  const evidenceSignatures = new WeakMap();

  for (const row of rows) {
    for (const source of row.sources || []) {
      let aggregate = sourcesByRecord.get(source.recordId);
      if (!aggregate) {
        aggregate = { recordId: source.recordId, contexts: [] };
        sourcesByRecord.set(source.recordId, aggregate);
        sources.push(aggregate);
      }
      aggregate.contexts.push({ source, row });
    }
    for (const family of FAMILIES) {
      for (const entry of row.lanes?.[family] || []) {
        let aggregate = entriesByFamily[family].get(entry.key);
        if (!aggregate) {
          aggregate = { ...entry, key: entry.key, family,
            recordIds: [], roles: [], evidence: [], notes: [] };
          entriesByFamily[family].set(entry.key, aggregate);
          lanes[family].push(aggregate);
          evidenceSignatures.set(aggregate, new Set());
        }
        appendUnique(aggregate.recordIds, entry.recordIds);
        appendUnique(aggregate.roles, entry.roles);
        appendUnique(aggregate.notes, entry.notes);
        appendUniqueEvidence(aggregate.evidence, evidenceSignatures.get(aggregate), entry.evidence);
      }
    }
  }
  return { ...group, key: group?.key, dateLabel: group?.label, sources, lanes };
}
