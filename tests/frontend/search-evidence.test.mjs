import { test } from 'node:test';
import assert from 'node:assert/strict';

import { storeFromShipped } from './_shipped.mjs';
import { recordsFor } from '../../docs/js/data/records-for.js';

const store = await storeFromShipped();

function rowsFor(result, recordId) {
  return result.witnesses
    .filter(witness => witness.recordId === recordId)
    .map(witness => [witness.sourceRef.sheet, witness.sourceRef.row]);
}

test('text search points to the linked source rows that make a record match', () => {
  const result = recordsFor(store, { search: 'Zürich' });
  assert.equal(result.ids.size, 45);
  assert.deepEqual(rowsFor(result, 'm3gim-data:NIM_016_3'), [['Box 2', 239]]);
  assert.deepEqual(rowsFor(result, 'm3gim-data:NIM_073_33_1_3'), [['Box 4', 339]]);
  assert.ok([...result.ids].every(id => result.witnesses.some(witness => witness.recordId === id)));
});

test('terms distributed over document and link fields retain both sources', () => {
  const result = recordsFor(store, { search: 'Moltkau Zürich' });
  assert.ok(result.ids.has('m3gim-data:NIM_016_3'));
  assert.deepEqual(rowsFor(result, 'm3gim-data:NIM_016_3'), [
    ['Objekte', 218],
    ['Box 2', 234],
    ['Box 2', 239],
  ]);
});
