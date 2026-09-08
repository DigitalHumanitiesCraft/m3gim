/**
 * Provenance helper: compact xlsxSource extraction for JSON-LD nodes.
 *
 * Every record and every nested entity (AgRelOn, annotation, finance item)
 * carries an `m3gim-ontology:xlsxSource` subobject with sheet, row and optional
 * data-point id. Store and exports read this provenance through the
 * same function, so the format is defined in only one place.
 *
 * @param {Object|null|undefined} obj - JSON-LD entity with `m3gim-ontology:xlsxSource`
 * @returns {{sheet: ?string, row: number, datenpunkt: ?number}|null}
 *   compact shape or null when no row provenance is present.
 */
export function extractXlsxSource(obj) {
  const src = obj && obj['m3gim-ontology:xlsxSource'];
  if (!src || typeof src !== 'object') return null;
  const row = src['m3gim-ontology:xlsxRow'];
  if (!row) return null;
  return {
    sheet: src['m3gim-ontology:xlsxSheet'] || null,
    row,
    datenpunkt: src['m3gim-ontology:dataPointId'] || null,
  };
}

/** Property-level sources emitted by the E-301 serializer. */
export function propertySources(obj, sourceProperty = null) {
  const values = obj && obj['m3gim-ontology:propertySource'];
  const list = values == null ? [] : Array.isArray(values) ? values : [values];
  return list.filter(source => source && (!sourceProperty
    || source['m3gim-ontology:sourceProperty'] === sourceProperty));
}

export function compactPropertySource(source) {
  if (!source) return null;
  return {
    sourceProperty: source['m3gim-ontology:sourceProperty'] || null,
    sourceKind: source['m3gim-ontology:sourceKind'] || null,
    sourceValue: source['m3gim-ontology:sourceValue'] ?? null,
    source: source['dcterms:source']?.['@id'] || source['dcterms:source'] || null,
    xlsxSource: extractXlsxSource(source),
  };
}
