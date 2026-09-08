/** Geographic presentation must not turn one source statement into another. */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildOccurrences, countryByCity } from '../../docs/js/data/place-evidence.js';
import { facetInventory, recordsFor } from '../../docs/js/data/records-for.js';
import { facetMemberWitnesses } from '../../docs/js/data/query-evidence.js';

const place = (name, country = null, coordinates = null) => ({
  '@type': 'rico:Place',
  name,
  ...(country ? { 'm3gim-ontology:country': country } : {}),
  ...(coordinates ? { 'geo:lat': coordinates[0], 'geo:long': coordinates[1] } : {}),
});

function geographicStore(rows) {
  const records = rows.map(([id, location]) => ({
    '@id': id,
    'rico:identifier': id,
    'rico:hasOrHadLocation': [location],
  }));
  return {
    records: new Map(records.map(record => [record['@id'], record])),
    allRecords: records,
    unprocessedIds: new Set(),
    locations: new Map(),
    persons: new Map(),
    organizations: new Map(),
    ensembles: new Map(),
    works: new Map(),
    recordsByAgentRole: new Map(),
    eventsByRole: new Map(),
    recordToAnnotations: new Map(),
    annotations: new Map(),
    mobilityEvents: new Map(),
    recordDatings: new Map(),
    finances: new Map(),
    conceptDefinitions: new Map(),
    roleVocab: new Map(),
  };
}

test('a country on one statement does not enter a landless namesake into the facet', () => {
  const store = geographicStore([
    ['r-source', place('Wien', 'Österreich')],
    ['r-landless', place('Wien, Kärntner Straße 1')],
  ]);

  assert.deepEqual([...recordsFor(store, { land: ['Österreich'] }).ids], ['r-source']);
  assert.deepEqual(facetInventory(store, 'land'), [
    { value: 'Österreich', label: 'Österreich', count: 1 },
  ]);
  assert.deepEqual(
    facetMemberWitnesses(store, 'land', 'Österreich', new Set(['r-landless'])),
    [],
    'a landless source row must not become a matching source witness',
  );
});

test('conflicting namesakes have no inferred majority country', () => {
  const store = geographicStore([
    ['r-at-1', place('Neustadt', 'Österreich')],
    ['r-at-2', place('Neustadt, Hauptplatz 1', 'Österreich')],
    ['r-de', place('Neustadt, Bahnhofstraße 2', 'Deutschland')],
    ['r-open', place('Neustadt, Markt 3')],
  ]);

  assert.equal(countryByCity(store).has('neustadt'), false);
  assert.equal(recordsFor(store, { land: ['Österreich'] }).ids.has('r-open'), false);
  assert.equal(recordsFor(store, { land: ['Deutschland'] }).ids.has('r-open'), false);
});

test('coordinates remain attached only to the statement that records them', () => {
  const store = geographicStore([
    ['r-geo', place('Wien', 'Österreich', [48.2082, 16.3738])],
    ['r-open', place('Wien, Unbekannte Adresse')],
  ]);

  const occurrences = buildOccurrences(store);
  const direct = occurrences.find(item => item.recordId === 'r-geo');
  const landless = occurrences.find(item => item.recordId === 'r-open');
  assert.equal(direct.placement, 'direct');
  assert.equal(landless.placement, 'unlocatable');
  assert.equal(landless.placeLat, null);
  assert.equal(landless.placeLon, null);
});

test('mirrored graph paths count one source row once and retain its full statement', () => {
  const source = row => ({
    'm3gim-ontology:xlsxSheet': 'Box 1',
    'm3gim-ontology:xlsxRow': row,
  });
  const role = 'm3gim-vocab:season';
  const record = {
    '@id': 'r-mirror',
    'rico:identifier': 'r-mirror',
    'rico:hasOrHadLocation': [{
      ...place('Zürich'),
      'm3gim-ontology:xlsxSource': source(574),
    }],
  };
  const store = geographicStore([]);
  store.records.set(record['@id'], record);
  store.allRecords.push(record);
  store.mobilityEvents.set('event-574', {
    id: 'event-574', recordId: record['@id'], place: 'Zürich',
    rawDate: '1947/1952', date: '1947/1952', role: 'spielzeit', roleId: role,
    xlsxSource: { sheet: 'Box 1', row: 574 },
  });

  const occurrences = buildOccurrences(store);
  assert.equal(occurrences.length, 1);
  assert.equal(occurrences[0].date, '1947/1952');
  assert.equal(occurrences[0].roleId, role);
  assert.deepEqual(occurrences[0].sources, ['loc', 'ste']);
});

test('equal place wording in two source rows remains two pieces of evidence', () => {
  const source = row => ({
    'm3gim-ontology:xlsxSheet': 'Box 1',
    'm3gim-ontology:xlsxRow': row,
  });
  const record = {
    '@id': 'r-two-rows',
    'rico:identifier': 'r-two-rows',
    'rico:hasOrHadLocation': [
      { ...place('Paris'), 'm3gim-ontology:xlsxSource': source(515) },
      { ...place('Paris'), 'm3gim-ontology:xlsxSource': source(516) },
    ],
  };
  const store = geographicStore([]);
  store.records.set(record['@id'], record);
  store.allRecords.push(record);
  for (const [row, date] of [[515, '1956'], [516, '1955']]) {
    store.mobilityEvents.set(`event-${row}`, {
      id: `event-${row}`, recordId: record['@id'], place: 'Paris', date, rawDate: date,
      role: 'aufführung', roleId: 'm3gim-vocab:performance',
      xlsxSource: { sheet: 'Box 1', row },
    });
  }

  const occurrences = buildOccurrences(store);
  assert.equal(occurrences.length, 2);
  assert.deepEqual(occurrences.map(item => item.xlsxSource.row).sort(), [515, 516]);
  assert.ok(occurrences.every(item => item.sources.join(',') === 'loc,ste'));
});
