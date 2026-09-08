import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entityFacet } from '../../docs/js/data/entity-types.js';

// Unknown and multi-typed nodes exercise the dispatch boundary beyond this corpus.
for (const [type, expected] of [
  ['rico:Person', 'person'], ['rico:CorporateBody', 'institution'],
  ['rico:Group', 'institution'], ['rico:Place', 'ort'],
  ['m3gim-ontology:MusicalWork', 'werk'], ['m3gim-ontology:FramingEvent', null],
  [['rico:Agent', 'rico:CorporateBody'], 'institution'], [undefined, null],
]) {
  test(`entityFacet: ${JSON.stringify(type)} → ${expected}`, () => {
    assert.equal(entityFacet({ '@type': type }), expected);
  });
}
