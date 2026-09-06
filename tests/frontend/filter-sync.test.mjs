/** Cross-view time and dispatch contracts. */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import { applyZeitfenster } from '../../docs/js/ui/filter-sync.js';
import { yearOf } from '../../docs/js/data/records-for.js';
import { DATING_SCOPE } from '../../docs/js/data/constants.js';

describe('applyZeitfenster', () => {
  const items = [
    { '@id': 'a', 'rico:date': '1951-08-26' },
    { '@id': 'b', 'rico:date': '1960' },
    { '@id': 'c' },
  ];
  const stub = { recordDatings: new Map() };

  test('ein leeres Fenster lässt alles durch', () => {
    assert.equal(applyZeitfenster(items, null, (item) => item, stub).length, 3);
  });

  test('ein Fenster behält undatierte Dokumente', () => {
    const ids = applyZeitfenster(items, [1950, 1953], (item) => item, stub)
      .map((item) => item['@id']);
    assert.deepEqual(ids, ['a', 'c']);
  });

  test('yearOf verwendet den primären Zeitanker', () => {
    const store = {
      recordDatings: new Map([['x', [{ year: 1949, scope: DATING_SCOPE.attested, rank: 1 }]]]),
    };
    assert.equal(yearOf(store, { '@id': 'x' }), 1949);
  });
});

describe('filter-state dispatch', () => {
  let filterState;

  before(async () => {
    if (typeof globalThis.window === 'undefined') globalThis.window = new EventTarget();
    filterState = await import('../../docs/js/ui/filter-state.js');
  });

  test('setFilter dispatcht einmal je Änderung und nie bei einem No-op', () => {
    const { setFilter, resetFilter } = filterState;
    resetFilter();
    let dispatches = 0;
    const handler = () => { dispatches += 1; };
    globalThis.window.addEventListener('m3gim:filter', handler);
    setFilter({ ort: 'Bayreuth' });
    setFilter({ ort: 'Bayreuth' });
    setFilter({ person: 'Malaniuk, Ira' });
    globalThis.window.removeEventListener('m3gim:filter', handler);
    assert.equal(dispatches, 2);
    resetFilter();
  });
});
