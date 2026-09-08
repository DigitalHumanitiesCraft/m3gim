import { test } from 'node:test';
import assert from 'node:assert/strict';

import { asWikidataId } from '../../docs/js/utils/format.js';
import { documentDateBounds, primaryYear } from '../../docs/js/data/loader.js';
import { recordsFor } from '../../docs/js/data/records-for.js';
import { aggregateMatrix, aggregateTime } from '../../docs/js/views/statistik-data.js';
import { buildCSVRows } from '../../docs/js/views/korb.js';
import { storeFromShipped } from './_shipped.mjs';

test('authorityReference is read without treating the local mention id as Wikidata', () => {
  const mention = {
    '@id': '_:mention-1',
    'm3gim-ontology:authorityReference': { '@id': 'wd:Q42' },
  };
  assert.equal(asWikidataId(mention), 'wd:Q42');
  assert.equal(asWikidataId({ '@id': '_:mention-1' }), null);
  assert.equal(asWikidataId({ '@id': 'wd:Q42' }), 'wd:Q42');
});

test('document date keeps intervals and qualifiers out of exact year bins', () => {
  const range = { 'rico:date': '1947/1952' };
  assert.deepEqual(documentDateBounds(range), {
    source: 'rico:date', raw: '1947/1952', qualifier: null, from: 1947, to: 1952, exact: false,
  });
  assert.equal(primaryYear({}, range).year, null);
  assert.deepEqual(documentDateBounds({ 'rico:date': 'nach:1956' }), {
    source: 'rico:date', raw: 'nach:1956', qualifier: 'nach', from: 1957, to: null, exact: false,
  });
  assert.equal(primaryYear({}, { 'rico:date': 'circa:1956' }).year, null);
  assert.equal(primaryYear({}, { 'rico:date': 'ab 1956' }).year, null);
  assert.equal(primaryYear({}, { 'rico:date': 'seit:1956' }).year, null);
  assert.equal(primaryYear({}, { 'rico:date': 'wohl irgendwann 1956' }).year, null);
  assert.equal(documentDateBounds({ 'rico:date': 'wohl irgendwann 1956' }).from, null);
});

test('year filtering respects exclusive qualifier boundaries at calendar edges', () => {
  const values = {
    beforeYear: 'vor:1956', beforeJanuary: 'vor 1956-01',
    beforeNewYear: 'vor:1956-01-01', beforeWithin: 'vor:1956-06-01',
    afterYear: 'nach:1956', afterDecember: 'nach 1956-12',
    afterNewYear: 'nach:1956-12-31', afterWithin: 'nach:1956-06-01',
    fromYear: 'ab 1956', sinceNewYear: 'seit:1956-01-01',
  };
  const allRecords = Object.entries(values).map(([id, date]) => ({ '@id': id, 'rico:date': date }));
  const store = { allRecords, records: new Map(allRecords.map(record => [record['@id'], record])) };
  assert.deepEqual([...recordsFor(store, { zeitfenster: [1956, 1956] }).ids].sort(),
    ['afterWithin', 'beforeWithin', 'fromYear', 'sinceNewYear']);
  assert.equal(documentDateBounds(store.records.get('beforeJanuary')).to, 1955);
  assert.equal(documentDateBounds(store.records.get('beforeWithin')).to, 1956);
  assert.equal(documentDateBounds(store.records.get('afterDecember')).from, 1957);
  assert.equal(documentDateBounds(store.records.get('afterWithin')).from, 1956);
});

test('time aggregation exposes an interval as its recorded value', () => {
  const record = { '@id': 'r1', 'rico:date': '1947/1952' };
  const store = { allRecords: [record], records: new Map([['r1', record]]), recordDatings: new Map() };
  const bins = aggregateTime(store, new Set(['r1']));
  assert.deepEqual(bins.map(bin => [bin.key, bin.label]), [['date:1947/1952', '1947/1952']]);
});

test('a stage part without a source-local work stays unassigned', () => {
  const record = { '@id': 'r1', 'rico:hasOrHadSubject': {
    '@type': 'm3gim-ontology:MusicalWork', name: 'Only work named elsewhere on the record',
  } };
  const store = {
    allRecords: [record], records: new Map([['r1', record]]),
    recordToPerformances: new Map([['r1', [{ id: 'p1', work: null, stageRoles: ['Part'] }]]]),
  };
  const result = aggregateMatrix(store, new Set(['r1']), 'work-stagepart');
  assert.equal(result.cells[0].row.key, '__unassigned__');
  assert.equal(result.cells[0].binding, 'unassigned');
});

test('CSV export retains raw notes and property-level witnesses', () => {
  const source = { '@type': 'rico:Person', name: 'Taubmann, Frau',
    'rico:generalDescription': 'Frau von Martin H. Taubmann',
    'm3gim-ontology:propertySource': [{
      'm3gim-ontology:sourceProperty': 'm3gim-ontology:authorityReference',
      'm3gim-ontology:sourceKind': 'index', 'm3gim-ontology:sourceValue': 'Q1',
      'dcterms:source': { '@id': 'file:///index.xlsx' },
      'm3gim-ontology:xlsxSource': { 'm3gim-ontology:xlsxSheet': 'Personenindex', 'm3gim-ontology:xlsxRow': 2 },
    }] };
  const record = { '@id': 'r1', 'rico:identifier': 'R1', 'm3gim-ontology:hasAssociatedAgent': source };
  const store = { records: new Map([['r1', record]]), childToKonvolut: new Map(), konvolute: new Map(),
    recordDatings: new Map(), agentRelations: new Map(), finances: new Map(), roleVocab: new Map(), dftHierarchy: new Map() };
  const rows = buildCSVRows(['r1'], store);
  assert.equal(rows[1][rows[0].indexOf('Anmerkungen')], 'Frau von Martin H. Taubmann');
  assert.match(rows[1][rows[0].indexOf('Eigenschaftsquellen')], /Personenindex Zeile 2/);
});

test('NIM_004_34 does not bind Tristan to Amneris or Venus', async () => {
  const store = await storeFromShipped();
  const id = 'm3gim-data:NIM_004_34';
  const matrix = aggregateMatrix(store, new Set([id]), 'work-stagepart');
  assert.ok(!matrix.cells.some(cell => cell.row.label === 'Tristan und Isolde'
    && ['Amneris', 'Venus'].includes(cell.column.label)));
});
