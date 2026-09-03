/**
 * Bestand und Chronik schneiden ueber den einen geteilten Filter, inklusive der
 * Facetten institution und sicht.
 *
 * Seit dem Sidebar-Umbau nimmt `filterBySharedState` direkt den geteilten Filter
 * (person/ort/werk/docType/institution/sicht plus Freitext) entgegen und
 * reicht die schneidenden Facetten an `recordsFor`, die eine Aufloesung im
 * Frontend. `sharedFacetsActive` beziffert, ob institution/sicht die
 * Hierarchie abflacht.
 *
 * Lauf: node --test tests/frontend/shared-facets-holdings.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  filterBySharedState, sharedFacetsActive,
} from '../../docs/js/views/_bestand-filter.js';

// Miniatur-Store nach dem Muster aus records-for.test.mjs: die drei geteilten
// Facetten liegen als Store-Indizes.
function makeStore() {
  const S = (...ids) => new Set(ids);
  const rec = (id) => ({ '@id': id });
  const records = new Map(['r1', 'r2', 'r3', 'r4'].map(id => [id, rec(id)]));
  return {
    records,
    allRecords: [...records.values()],
    recordDatings: new Map(),
    persons: new Map(),
    locations: new Map(),
    works: new Map(),
    organizations: new Map([
      ['Wiener Staatsoper', { records: S('r1', 'r2') }],
    ]),
    ensembles: new Map(),
    recordsByAgentRole: new Map(),
    eventsByRole: new Map(),
    recordToAnnotations: new Map([['r1', ['a1']]]),
    annotations: new Map([['a1', { id: 'a1', cluster: 'performativ' }]]),
    recordToEvents: new Map(),
    recordToPerformances: new Map(),
    finances: new Map(),
    roleVocab: new Map([
      ['m3gim-vocab:conductor', { id: 'm3gim-vocab:conductor', label: 'dirigent' }],
    ]),
  };
}

const items = ['r1', 'r2', 'r3', 'r4'].map(id => ({ record: { '@id': id } }));
const opts = { getRecord: (it) => it.record, searchMatch: () => true };

describe('filterBySharedState schneidet ueber die geteilten Facetten', () => {
  test('ohne Filter bleibt der ganze Bestand', () => {
    const out = filterBySharedState(makeStore(), items, {}, opts);
    assert.deepEqual(out.map(i => i.record['@id']), ['r1', 'r2', 'r3', 'r4']);
  });

  test('ein Institutionsfilter schneidet', () => {
    const out = filterBySharedState(makeStore(), items,
      { institution: ['Wiener Staatsoper'] }, opts);
    assert.deepEqual(out.map(i => i.record['@id']), ['r1', 'r2']);
  });

  test('ein Sichtfilter schneidet', () => {
    const out = filterBySharedState(makeStore(), items,
      { sicht: ['performativ'] }, opts);
    assert.deepEqual(out.map(i => i.record['@id']), ['r1']);
  });

  test('zwei Facetten bleiben UND-verknuepft', () => {
    // Institution Wiener Staatsoper (r1,r2) UND Sicht performativ (r1) -> r1.
    const out = filterBySharedState(makeStore(), items,
      { institution: ['Wiener Staatsoper'], sicht: ['performativ'] }, opts);
    assert.deepEqual(out.map(i => i.record['@id']), ['r1']);
  });

  test('das zeitfenster schneidet hier nicht (View-eigene Pipeline)', () => {
    // Es wirkt ueber applyZeitfenster, nicht hier.
    const out = filterBySharedState(makeStore(), items,
      { zeitfenster: [1900, 1901] }, opts);
    assert.deepEqual(out.map(i => i.record['@id']), ['r1', 'r2', 'r3', 'r4']);
  });

  test('die Freitextsuche schneidet ueber searchMatch', () => {
    const out = filterBySharedState(makeStore(), items, { search: 'r2' }, {
      getRecord: (it) => it.record,
      searchMatch: (rec, q) => rec['@id'].includes(q),
    });
    assert.deepEqual(out.map(i => i.record['@id']), ['r2']);
  });
});

describe('sharedFacetsActive beziffert die neuen Facetten', () => {
  test('leerer Filter ist inaktiv', () => {
    assert.equal(sharedFacetsActive({}), false);
    assert.equal(sharedFacetsActive(null), false);
  });

  test('eine gesetzte Institution ist aktiv', () => {
    assert.equal(sharedFacetsActive({ institution: ['Wiener Staatsoper'] }), true);
  });

  test('eine gesetzte Sicht ist aktiv', () => {
    assert.equal(sharedFacetsActive({ sicht: ['performativ'] }), true);
  });

  test('person/ort/werk zaehlen hier nicht mit (die traegt die Toolbar-Sync)', () => {
    assert.equal(sharedFacetsActive({ person: ['X'], ort: ['Y'], werk: ['Z'] }), false);
  });

  test('das zeitfenster zaehlt hier nicht mit', () => {
    assert.equal(sharedFacetsActive({ zeitfenster: [1950, 1955] }), false);
  });
});
