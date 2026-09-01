/**
 * Der Dokumenttyp als geteilte Facette (Sidebar-Umbau Bestand/Chronik).
 *
 * Die Facette loest ueber recordsFor auf, dieselbe Stelle wie Person/Ort/Werk.
 * Ein gewaehlter Blattwert schneidet auf seinen Typ, ein gewaehlter Oberbegriff
 * der DFT-Hierarchie loest ueber expandDftFilter auf alle seine Blaetter auf
 * (ODER). docTypeGroups liefert die Baumgruppen als gruppierte Vorschlaege mit
 * per-Wert-Zaehlern, damit die Sidebar die Facette wie die uebrigen bedient.
 *
 * Lauf: node --test tests/frontend/doctype-facet.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { recordsFor, docTypeGroups, facetInventory } from '../../docs/js/data/records-for.js';

// Miniatur-Store mit einer DFT-Hierarchie: Oberbegriff schriftgut -> {brief,
// rezension}, dazu ein freistehender Typ plakat. getDocTypeId liest
// rico:hasDocumentaryFormType als Kurz-Id.
function makeStore() {
  const rec = (id, type) => ({ '@id': id, 'rico:hasDocumentaryFormType': { '@id': `m3gim-vocab:${type}` } });
  const records = new Map([
    ['r1', rec('r1', 'brief')],
    ['r2', rec('r2', 'brief')],
    ['r3', rec('r3', 'rezension')],
    ['r4', rec('r4', 'plakat')],
  ]);
  const dftHierarchy = new Map([
    ['m3gim-vocab:schriftgut', { id: 'm3gim-vocab:schriftgut', prefLabel: 'Schriftgut', broader: null, children: ['m3gim-vocab:brief', 'm3gim-vocab:rezension'] }],
    ['m3gim-vocab:brief', { id: 'm3gim-vocab:brief', prefLabel: 'Brief', broader: 'm3gim-vocab:schriftgut', children: [] }],
    ['m3gim-vocab:rezension', { id: 'm3gim-vocab:rezension', prefLabel: 'Rezension', broader: 'm3gim-vocab:schriftgut', children: [] }],
    ['m3gim-vocab:plakat', { id: 'm3gim-vocab:plakat', prefLabel: 'Plakat', broader: null, children: [] }],
  ]);
  const byDocType = new Map([['brief', new Set(['r1', 'r2'])], ['rezension', new Set(['r3'])], ['plakat', new Set(['r4'])]]);
  return {
    records,
    allRecords: [...records.values()],
    persons: new Map(), locations: new Map(), works: new Map(),
    organizations: new Map(), ensembles: new Map(),
    recordsByAgentRole: new Map(), eventsByRole: new Map(),
    recordToAnnotations: new Map(), annotations: new Map(),
    recordToEvents: new Map(), recordToPerformances: new Map(),
    finances: new Map(), roleVocab: new Map(),
    recordDatings: new Map(),
    dftHierarchy, byDocType,
  };
}

const idsOf = (store, filter) => [...recordsFor(store, filter).ids].sort();

describe('docType schneidet ueber recordsFor', () => {
  test('ein Blattwert schneidet auf seinen Typ', () => {
    assert.deepEqual(idsOf(makeStore(), { docType: ['brief'] }), ['r1', 'r2']);
  });

  test('ein Oberbegriff loest auf alle Blaetter auf (ODER)', () => {
    assert.deepEqual(idsOf(makeStore(), { docType: ['schriftgut'] }), ['r1', 'r2', 'r3']);
  });

  test('zwei Blattwerte vereinigen sich (ODER innerhalb der Facette)', () => {
    assert.deepEqual(idsOf(makeStore(), { docType: ['brief', 'plakat'] }), ['r1', 'r2', 'r4']);
  });

  test('docType und eine zweite Facette bleiben UND-verknuepft', () => {
    // Es gibt keine Person, also schneidet die zweite Facette auf leer.
    const store = makeStore();
    store.persons = new Map([['X', { records: new Set(['r1']) }]]);
    assert.deepEqual(idsOf(store, { docType: ['schriftgut'], person: ['X'] }), ['r1']);
  });
});

describe('docTypeGroups liefert die Baumgruppen als Vorschlaege', () => {
  test('Gruppe traegt Kinder mit eigenen Zaehlern', () => {
    const groups = docTypeGroups(makeStore());
    const schriftgut = groups.find(g => g.value === 'schriftgut');
    assert.ok(schriftgut, 'Oberbegriff Schriftgut erscheint als Gruppe');
    assert.equal(schriftgut.count, 3, 'die Gruppe zaehlt die Summe ihrer Blaetter');
    const kinder = schriftgut.children.map(c => `${c.value}:${c.count}`).sort();
    assert.deepEqual(kinder, ['brief:2', 'rezension:1']);
  });

  test('nur belegte Werte erscheinen', () => {
    const store = makeStore();
    // rezension leeren -> das Kind faellt weg, Gruppe bleibt (brief traegt sie).
    store.allRecords = store.allRecords.filter(r => r['@id'] !== 'r3');
    const groups = docTypeGroups(store);
    const schriftgut = groups.find(g => g.value === 'schriftgut');
    assert.deepEqual(schriftgut.children.map(c => c.value), ['brief']);
  });
});

describe('facetInventory kennt docType mit Anzeigelabel', () => {
  test('die Blaetter tragen ihr prefLabel', () => {
    const inv = facetInventory(makeStore(), 'docType');
    const brief = inv.find(e => e.value === 'brief');
    assert.equal(brief.label, 'Brief');
    assert.equal(brief.count, 2);
  });
});
