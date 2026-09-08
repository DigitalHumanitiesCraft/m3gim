import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storeFromShipped } from './_shipped.mjs';
import { buildOccurrences, groupPlaces } from '../../docs/js/views/karte-data.js';
import { extractXlsxSource } from '../../docs/js/utils/provenance.js';
import { ensureArray, roleIdOf, roleToken } from '../../docs/js/utils/format.js';

const key = o => JSON.stringify([o.recordId, o.place, o.roleId || o.role || null,
  o.xlsxSource?.sheet, o.xlsxSource?.row]);

test('every shipped source row survives and mirrored paths count once', async () => {
  const store = await storeFromShipped();
  const original = JSON.stringify([...store.mobilityEvents]);
  const expected = new Set();
  for (const rec of store.allRecords) {
    for (const loc of ensureArray(rec['rico:hasOrHadLocation'])) {
      if (!loc.name || /^\d/.test(loc.name.trim())) continue;
      expected.add(key({ recordId: rec['@id'], place: loc.name,
        roleId: roleIdOf(loc.role), role: roleToken(loc.role), xlsxSource: extractXlsxSource(loc) }));
    }
  }
  for (const annotation of store.mobilityEvents.values()) {
    if (annotation.place && !/^\d/.test(annotation.place.trim())) expected.add(key(annotation));
  }
  const evidence = buildOccurrences(store);
  assert.deepEqual(new Set(evidence.map(key)), expected);
  assert.equal(evidence.length, expected.size);
  assert.equal(JSON.stringify([...store.mobilityEvents]), original);
  const warsaw = evidence.filter(o => o.recordId === 'm3gim-data:NIM_005_15' && o.place === 'Warschau');
  assert.equal(warsaw.length, 1);
  assert.deepEqual(warsaw[0].sources, ['loc', 'ste']);
  assert.equal(warsaw[0].xlsxSource.row, 903);
});

test('a Wuppertal performance-place reference retains its separate dating contexts', async () => {
  const evidence = buildOccurrences(await storeFromShipped());
  const wuppertal = evidence.find(o => o.recordId === 'm3gim-data:NIM_023_5' && o.place === 'Wuppertal');
  assert.equal(wuppertal.date, null);
  assert.equal(wuppertal.documentDate, '1953-04-26');
  assert.equal(wuppertal.recordDate, '1953-04-04');
});

test('distinct addresses, rows, qualified datings and caveats remain independent', () => {
  const source = row => ({ 'm3gim-ontology:xlsxSheet': 'Box', 'm3gim-ontology:xlsxRow': row });
  const role = { '@id': 'm3gim-vocab:guestPerformance', 'skos:prefLabel': 'Gastspiel' };
  const rec = { '@id': 'r1', 'rico:date': '1950', 'rico:hasOrHadLocation': [
    { name: 'Wien, Adresse A', role, 'm3gim-ontology:xlsxSource': source(1) },
    { name: 'Wien, Adresse A', role, 'm3gim-ontology:xlsxSource': source(2) },
    { name: 'Wien, Adresse B', role, 'm3gim-ontology:xlsxSource': source(3) },
  ] };
  const store = { allRecords: [rec], records: new Map([['r1', rec]]), recordDatings: new Map(),
    mobilityEvents: new Map([['a', { id: 'a', recordId: 'r1', place: 'Wien, Adresse A',
      roleId: role['@id'], rawDate: 'circa 1951', date: '1951', description: 'Datierung unsicher',
      xlsxSource: { sheet: 'Box', row: 1 } }]]) };
  const evidence = buildOccurrences(store);
  assert.equal(evidence.length, 3);
  assert.equal(evidence.find(o => o.id === 'a').date, 'circa 1951');
  assert.equal(evidence.find(o => o.id === 'a').description, 'Datierung unsicher');
  assert.equal(evidence.filter(o => o.date === null).length, 2);
});

test('place and role counts refer to distinct documents', () => {
  const [group] = groupPlaces([
    { place: 'Wien', recordId: 'r1', role: 'gastspiel' },
    { place: 'Wien', recordId: 'r1', role: 'gastspiel' },
    { place: 'Wien', recordId: 'r2', role: 'gastspiel' },
  ]);
  assert.equal(group.evidence.length, 3);
  assert.equal(group.records.size, 2);
  assert.equal(group.roles[0].count, 2);
});
