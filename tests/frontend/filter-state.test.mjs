/**
 * Nullpunkt und atomarer Ersatz im geteilten Filter.
 *
 * Lauf:
 *   node --test tests/frontend/filter-state.test.mjs
 *
 * Entscheidung der Projektleitung vom 2026-09-03: der Nullpunkt ist die leere
 * Wahl. Eine Ansichts-Voreinstellung, die Dokumente ausschliesst, ist damit ein
 * sichtbarer Filter mit Chip und Zuruecksetzen-Link, und Zuruecksetzen fuehrt
 * auf die volle Grundmenge statt zurueck in dieselbe Verengung.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getFilter, setFilter, replaceFilter, resetFilter, isFilterActive, deviatingKeys,
} from '../../docs/js/ui/filter-state.js';

// Der Erschliessungsstand war bis E-262 die Facette, an der dieser Mechanismus
// haengt. Er ist aus dem Filter genommen, der Mechanismus bleibt; die Beispiele
// laufen deshalb ueber den Dokumenttyp mit Werten des Datensatzes.
describe('Nullpunkt und Filterersatz', () => {
  beforeEach(() => resetFilter());

  test('eine Wahl weicht sichtbar vom Nullpunkt ab', () => {
    setFilter({ docType: ['m3gim-vocab:program', 'm3gim-vocab:press'] });
    assert.deepEqual(getFilter().docType, ['m3gim-vocab:program', 'm3gim-vocab:press']);
    assert.equal(isFilterActive(), true, 'sie traegt den Zuruecksetzen-Link');
    assert.deepEqual(deviatingKeys(), ['docType'], 'und einen Chip');
  });

  test('Zuruecksetzen fuehrt auf die volle Grundmenge, nicht auf den Default', () => {
    setFilter({ docType: ['m3gim-vocab:program', 'm3gim-vocab:press'] });
    resetFilter();
    assert.deepEqual(getFilter().docType, []);
    assert.equal(isFilterActive(), false);
  });

  test('atomarer Ersatz leert nicht genannte Facetten', () => {
    setFilter({ docType: ['m3gim-vocab:program'], ort: ['Graz'], search: 'brief' });
    replaceFilter({ ort: ['Wien'] });
    assert.deepEqual(getFilter().ort, ['Wien']);
    assert.deepEqual(getFilter().docType, []);
    assert.equal(getFilter().search, '');
  });

  test('das Wegnehmen des Chips zeigt wieder die Grundmenge', () => {
    setFilter({ docType: ['m3gim-vocab:program', 'm3gim-vocab:press'] });
    setFilter({ docType: [] });
    assert.equal(isFilterActive(), false);
    assert.deepEqual(deviatingKeys(), []);
  });

  test('der Erschliessungsstand ist kein Filterschluessel mehr (E-262)', () => {
    setFilter({ stand: ['abgeschlossen'] });
    assert.equal('stand' in getFilter(), false,
      'Der Bearbeitungsstand schneidet nichts mehr, er steht nur im Detail.');
    assert.equal(isFilterActive(), false);
  });
});

describe('Filterbenachrichtigung', () => {
  test('jede Aenderung dispatcht einmal, ein No-op nie', () => {
    const previousWindow = globalThis.window;
    globalThis.window = new EventTarget();
    try {
      resetFilter();
      let dispatches = 0;
      const handler = () => { dispatches += 1; };
      globalThis.window.addEventListener('m3gim:filter', handler);
      setFilter({ ort: 'Bayreuth' });
      setFilter({ ort: 'Bayreuth' });
      setFilter({ person: 'Malaniuk, Ira' });
      globalThis.window.removeEventListener('m3gim:filter', handler);
      assert.equal(dispatches, 2);
    } finally {
      resetFilter();
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    }
  });
});
