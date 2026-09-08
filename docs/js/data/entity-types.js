/** Shared register, filter and network entity keys. */
export const REGISTER_ENTITY_TYPE = Object.freeze({
  personen: 'person',
  organisationen: 'institution',
  orte: 'ort',
  werke: 'werk',
});

const TYPE_TO_FACET = Object.freeze({
  'rico:Person': 'person',
  'rico:CorporateBody': 'institution',
  'rico:Group': 'institution',
  'rico:Place': 'ort',
  'm3gim-ontology:MusicalWork': 'werk',
});

/** Unknown types have no filter target. */
export function entityFacet(entity) {
  const types = [entity?.['@type']].flat();
  return types.map(type => TYPE_TO_FACET[type]).find(Boolean) || null;
}
