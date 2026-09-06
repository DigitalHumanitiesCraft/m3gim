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
