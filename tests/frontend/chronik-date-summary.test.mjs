import { before, test } from 'node:test';
import assert from 'node:assert/strict';

import { summarizeSourceDates } from '../../docs/js/views/chronik-date-summary.js';
import { buildChronikTimeline } from '../../docs/js/views/chronik-timeline-data.js';
import { storeFromShipped } from './_shipped.mjs';

let store;
before(async () => { store = await storeFromShipped(); });
const context = (key, dateLabel = key, precision = 'day') => ({ source: {}, row: { key, dateLabel, precision } });

test('real NIM_005_25 dates summarize their count and calendar coverage', () => {
  const record = store.records.get('m3gim-data:NIM_005_25');
  const rows = buildChronikTimeline(store, [record]).rows.filter(row => row.year === 1963);
  const contexts = rows.flatMap(row => row.sources.map(source => ({ source, row })));
  assert.equal(summarizeSourceDates(contexts), '25 Datierungen · Jänner–Dezember 1963');
});

test('three or more precise values use month coverage rather than event language', () => {
  const contexts = [context('1963-01-02'), context('1963-04'), context('1963-07-31')];
  assert.equal(summarizeSourceDates(contexts), '3 Datierungen · Jänner–Juli 1963');
});

test('qualifiers, ranges, years and malformed values remain explicit', () => {
  const contexts = [
    context('1963-01-02'),
    context('circa:1963-02', 'ca. Februar 1963', 'circa-month'),
    context('vor:1963', 'vor 1963', 'vor-year'),
    context('nach:1963', 'nach 1963', 'nach-year'),
    context('ab 1963', 'ab 1963', 'ab-year'),
    context('1963', '1963', 'year'),
    context('1963/1964', '1963–1964', 'range'),
    context('oops', 'oops', 'malformed'),
    context('1963/xx', '1963/xx', 'malformed-range'),
  ];
  assert.equal(summarizeSourceDates(contexts),
    '9 Datierungen · Jänner 1963 · 1 Zeitraum · 1 ca.-Angabe · 1 Vorher-Angabe · 1 Nachher-Angabe · 1 offene Beginnangabe · 1 reine Jahresangabe · 2 unklare Datierungen');
});

test('duplicates count one recorded value', () => {
  const repeated = context('1963-01-02', '2. Jänner 1963');
  assert.equal(summarizeSourceDates([repeated, repeated,
    context('1963-02-03', '3. Februar 1963'), context('1963-03-04', '4. März 1963')]),
  '3 Datierungen · Jänner–März 1963');
});

test('zero, one and two values preserve their original display text', () => {
  assert.equal(summarizeSourceDates([]), '');
  assert.equal(summarizeSourceDates(null), '');
  assert.equal(summarizeSourceDates([context('undated', 'Ohne Datum', 'undated')]), 'Ohne Datum');
  assert.equal(summarizeSourceDates([
    context('circa:1963', 'ca. 1963', 'circa-year'),
    context('1963/1964', '1963–1964', 'range'),
  ]), 'ca. 1963 · 1963–1964');
});

test('input contexts and rows remain untouched', () => {
  const contexts = [context('1963-01'), context('1963-02'), context('1963-03')];
  const snapshot = structuredClone(contexts);
  summarizeSourceDates(contexts);
  assert.deepEqual(contexts, snapshot);
});
