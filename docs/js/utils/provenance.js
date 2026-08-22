/**
 * Provenienz-Helper: kompakte xlsxSource-Extraktion fuer JSON-LD-Knoten.
 *
 * Jeder Record + jede geschachtelte Entity (AgRelOn, Annotation, Finanzposten)
 * traegt ein `m3gim-ontology:xlsxSource`-Subobjekt mit Sheet, Zeile und
 * optionaler Datenpunkt-ID. Store, Inline-Detail und Korb lesen diese Herkunft
 * aus — alle drei durch dieselbe Funktion, damit das Format an nur einer
 * Stelle definiert wird.
 *
 * @param {Object|null|undefined} obj - JSON-LD-Entity mit `m3gim-ontology:xlsxSource`
 * @returns {{sheet: ?string, row: number, datenpunkt: ?number}|null}
 *   kompaktes Shape oder null, wenn keine Zeilen-Herkunft vorhanden ist.
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
