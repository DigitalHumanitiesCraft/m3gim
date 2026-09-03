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

describe('Nullpunkt und Ansichts-Voreinstellung', () => {
  beforeEach(() => resetFilter());

  test('die Voreinstellung des Bestands weicht sichtbar vom Nullpunkt ab', () => {
    applyViewDefault({ stand: ['abgeschlossen', 'begonnen'] });
    assert.deepEqual(getFilter().stand, ['abgeschlossen', 'begonnen']);
    assert.equal(isFilterActive(), true, 'sie traegt den Zuruecksetzen-Link');
    assert.deepEqual(deviatingKeys(), ['stand'], 'und einen Chip');
  });

  test('Zuruecksetzen fuehrt auf die volle Grundmenge, nicht auf den Default', () => {
    applyViewDefault({ stand: ['abgeschlossen', 'begonnen'] });
    resetFilter();
    assert.deepEqual(getFilter().stand, []);
    assert.equal(isFilterActive(), false);
  });

  test('die Ansicht oeffnet weiterhin mit ihrer Voreinstellung', () => {
    applyViewDefault({ stand: ['abgeschlossen'] });
    assert.deepEqual(getFilter().stand, ['abgeschlossen']);
    // Eine getroffene Wahl bleibt unberuehrt, sonst kippte der Tab-Wechsel sie.
    setFilter({ stand: ['zurueckgestellt'] });
    applyViewDefault({ stand: ['abgeschlossen'] });
    assert.deepEqual(getFilter().stand, ['zurueckgestellt']);
  });

  test('das Wegnehmen des Chips zeigt alle Erschliessungsstaende', () => {
    applyViewDefault({ stand: ['abgeschlossen', 'begonnen'] });
    setFilter({ stand: [] });
    assert.equal(isFilterActive(), false);
    assert.deepEqual(deviatingKeys(), []);
  });
});
