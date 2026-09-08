import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storeFromShipped } from './_shipped.mjs';
import { searchSuggestions } from '../../docs/js/ui/search-data.js';

const store = await storeFromShipped();

test('Zürich suggestion counts the typed place without committing draft text', () => {
  const filter = { search: '', ort: [] };
  const before = JSON.stringify(filter);
  const hits = searchSuggestions(store, filter, 'Zürich');
  assert.equal(hits.find(item => item.family === 'ort' && item.rawValue === 'Zürich').count, 42);
  assert.equal(JSON.stringify(filter), before);
});

test('identical names in separate families retain independent keys', () => {
  const hits = searchSuggestions(store, {}, 'Bayreuth').filter(item => item.label === 'Bayreuth');
  assert.ok(hits.some(item => item.family === 'ort'));
  assert.ok(hits.some(item => item.family === 'institution'));
  assert.equal(new Set(hits.map(item => item.key)).size, hits.length);
});

test('document suggestions expose stable ID, signature and full title', () => {
  const id = 'm3gim-data:NIM_023_5';
  const item = searchSuggestions(store, {}, 'NIM_023_5').find(item => item.rawValue === id);
  assert.equal(item.family, 'document');
  assert.equal(item.label, store.records.get(id)['rico:identifier']);
  assert.equal(item.title, store.records.get(id)['rico:title']);
});

test('removing a committed restriction restores eligible suggestions', () => {
  assert.deepEqual(searchSuggestions(store, { predicates: [{ type: 'records', ids: [] }] }, 'Zürich'), []);
  assert.ok(searchSuggestions(store, {}, 'Zürich').length > 0);
});
