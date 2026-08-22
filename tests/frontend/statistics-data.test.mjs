/**
 * Statistik-Datenschicht: Dokumenttyp-Aggregation zeigt Anzeigelabels.
 *
 * Der Aufriss schluesselt auf die kurze Kennung, waehrend store.dftHierarchy
 * auf die praefigierte schluesselt. Ohne die gemeinsame Aufloesungshilfe faellt
 * die Aggregation stumm auf die technische Kennung zurueck und wird damit
 * blind gegen jede Vokabularentscheidung, etwa die Umbenennung des
 * kanonischen Dokumenttyps auf Programm (E-131).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { aggregateDocTypes } from '../../docs/js/views/statistics-data.js';

function makeStore(records, concepts) {
  return {
    allRecords: records,
    dftHierarchy: new Map(concepts.map((c) => [c.id, { prefLabel: c.prefLabel }])),
  };
}

const RECORDS = [
  { 'rico:hasDocumentaryFormType': { '@id': 'm3gim-dft:programm' } },
  { 'rico:hasDocumentaryFormType': { '@id': 'm3gim-dft:programm' } },
  { 'rico:hasDocumentaryFormType': { '@id': 'm3gim-dft:rezension' } },
  {},
];

const CONCEPTS = [
  { id: 'm3gim-dft:programm', prefLabel: 'Programm' },
  { id: 'm3gim-dft:rezension', prefLabel: 'Rezension' },
];

test('aggregateDocTypes liefert das Anzeigelabel statt der technischen Kennung', () => {
  const rows = aggregateDocTypes(makeStore(RECORDS, CONCEPTS));
  const programm = rows.find((r) => r.id === 'programm');
  assert.equal(programm.label, 'Programm');
  assert.equal(programm.count, 2);
  const rezension = rows.find((r) => r.id === 'rezension');
  assert.equal(rezension.label, 'Rezension');
});

test('aggregateDocTypes faellt nur dort auf die Kennung zurueck, wo kein Concept existiert', () => {
  const rows = aggregateDocTypes(makeStore(RECORDS, [CONCEPTS[0]]));
  assert.equal(rows.find((r) => r.id === 'programm').label, 'Programm');
  assert.equal(rows.find((r) => r.id === 'rezension').label, 'rezension');
});

test('aggregateDocTypes zaehlt Records ohne Dokumenttyp gesondert', () => {
  const rows = aggregateDocTypes(makeStore(RECORDS, CONCEPTS));
  const ohne = rows.find((r) => r.id === null);
  assert.equal(ohne.label, 'ohne Typ');
  assert.equal(ohne.count, 1);
});
