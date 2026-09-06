/**
 * Nullpunkt und Voreinstellung im geteilten Filter (docs/js/ui/filter-state.js).
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
  getFilter, setFilter, resetFilter, applyViewDefault, isFilterActive, deviatingKeys,
} from '../../docs/js/ui/filter-state.js';

// Der Erschliessungsstand war bis E-262 die Facette, an der dieser Mechanismus
// haengt. Er ist aus dem Filter genommen, der Mechanismus bleibt; die Beispiele
// laufen deshalb ueber den Dokumenttyp mit Werten des Datensatzes.
describe('Nullpunkt und Ansichts-Voreinstellung', () => {
  beforeEach(() => resetFilter());

  test('eine Voreinstellung weicht sichtbar vom Nullpunkt ab', () => {
    applyViewDefault({ docType: ['m3gim-vocab:program', 'm3gim-vocab:press'] });
    assert.deepEqual(getFilter().docType, ['m3gim-vocab:program', 'm3gim-vocab:press']);
    assert.equal(isFilterActive(), true, 'sie traegt den Zuruecksetzen-Link');
    assert.deepEqual(deviatingKeys(), ['docType'], 'und einen Chip');
  });

  test('Zuruecksetzen fuehrt auf die volle Grundmenge, nicht auf den Default', () => {
    applyViewDefault({ docType: ['m3gim-vocab:program', 'm3gim-vocab:press'] });
    resetFilter();
    assert.deepEqual(getFilter().docType, []);
    assert.equal(isFilterActive(), false);
  });

  test('die Ansicht oeffnet weiterhin mit ihrer Voreinstellung', () => {
    applyViewDefault({ docType: ['m3gim-vocab:program'] });
    assert.deepEqual(getFilter().docType, ['m3gim-vocab:program']);
    // Eine getroffene Wahl bleibt unberuehrt, sonst kippte der Tab-Wechsel sie.
    setFilter({ docType: ['m3gim-vocab:contract'] });
    applyViewDefault({ docType: ['m3gim-vocab:program'] });
    assert.deepEqual(getFilter().docType, ['m3gim-vocab:contract']);
  });

  test('das Wegnehmen des Chips zeigt wieder die Grundmenge', () => {
    applyViewDefault({ docType: ['m3gim-vocab:program', 'm3gim-vocab:press'] });
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
