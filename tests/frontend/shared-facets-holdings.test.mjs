/**
 * Bestand und Chronik schneiden ueber den einen geteilten Filter, die Facetten
 * Institution, Land und Verknuepfung eingeschlossen.
 *
 * `filterBySharedState` nimmt den geteilten Filter entgegen und reicht jede
 * gesetzte Achse an `recordsFor`, die eine Aufloesung im Frontend. Der stille
 * Defekt, gegen den diese Datei steht: die Liste der schneidenden Achsen stand
 * hier einmal als Zweitschrift, sodass eine neue Facette in der Spalte als Chip
 * erschien, ohne im Bestand eine Zeile zu bewegen. `sharedFacetsActive`
 * beziffert, ob die Institution die Konvolut-Hierarchie abflacht.
 *
 * Lauf: node --test tests/frontend/shared-facets-holdings.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  filterBySharedState, sharedFacetsActive, isSharedFiltered,
} from '../../docs/js/views/_bestand-filter.js';
import { FACET_KEYS } from '../../docs/js/data/records-for.js';

// Miniatur-Store nach dem Muster aus records-for.test.mjs: die drei geteilten
// Facetten liegen als Store-Indizes.
function makeStore() {
  const S = (...ids) => new Set(ids);
  const rec = (id) => ({ '@id': id });
  const place = (name, role, land) => ({
    name, '@type': 'rico:Place', role: { '@id': role },
    'm3gim-ontology:country': land,
  });
  const records = new Map(['r1', 'r2', 'r3', 'r4'].map(id => [id, rec(id)]));
  records.get('r1')['rico:hasOrHadLocation'] =
    place('Bayreuth', 'm3gim-vocab:guestPerformance', 'Deutschland');
  records.get('r3')['rico:hasOrHadLocation'] =
    place('Wien', 'm3gim-vocab:dispatch', 'Österreich');
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
    conceptDefinitions: new Map(),
    roleVocab: new Map([
      ['m3gim-vocab:conductor', { id: 'm3gim-vocab:conductor', label: 'dirigent' }],
      ['m3gim-vocab:guestPerformance', { id: 'm3gim-vocab:guestPerformance', label: 'gastspiel' }],
      ['m3gim-vocab:dispatch', { id: 'm3gim-vocab:dispatch', label: 'absendeort' }],
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

  test('die Verknuepfungsrolle schneidet', () => {
    const out = filterBySharedState(makeStore(), items,
      { verknuepfung: ['ort:m3gim-vocab:guestPerformance'] }, opts);
    assert.deepEqual(out.map(i => i.record['@id']), ['r1']);
  });

  test('das Land schneidet', () => {
    const out = filterBySharedState(makeStore(), items,
      { land: ['Österreich'] }, opts);
    assert.deepEqual(out.map(i => i.record['@id']), ['r3']);
  });

  test('zwei Facetten bleiben UND-verknuepft', () => {
    // Institution Wiener Staatsoper (r1,r2) UND Land Deutschland (r1) -> r1.
    const out = filterBySharedState(makeStore(), items,
      { institution: ['Wiener Staatsoper'], land: ['Deutschland'] }, opts);
    assert.deepEqual(out.map(i => i.record['@id']), ['r1']);
  });

  test('jede Achse des Filters schneidet hier, keine Zweitschrift', () => {
    // Der Defekt, gegen den das steht: eine Facette in der Spalte, die im
    // Bestand nichts bewegt, weil ihr Schluessel in einer zweiten Liste fehlt.
    for (const key of ['land', 'verknuepfung']) {
      assert.ok(FACET_KEYS.includes(key), `${key} fehlt in FACET_KEYS`);
    }
    assert.equal(isSharedFiltered({ verknuepfung: ['ort'] }), true);
    assert.equal(isSharedFiltered({ land: ['Deutschland'] }), true);
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

  test('die abgeschaffte Sicht ist keine Achse mehr', () => {
    assert.equal(sharedFacetsActive({ sicht: ['performativ'] }), false);
    assert.equal(isSharedFiltered({ sicht: ['performativ'] }), false);
  });

  test('person/ort/werk zaehlen hier nicht mit (die traegt die Toolbar-Sync)', () => {
    assert.equal(sharedFacetsActive({ person: ['X'], ort: ['Y'], werk: ['Z'] }), false);
  });

  test('das zeitfenster zaehlt hier nicht mit', () => {
    assert.equal(sharedFacetsActive({ zeitfenster: [1950, 1955] }), false);
  });
});
