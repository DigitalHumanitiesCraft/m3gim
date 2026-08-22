/**
 * Mehrfachauswahl innerhalb einer Facette wirkt als ODER.
 *
 * Bis 2026-08-22 hielt der geteilte Filter je Facette genau einen Wert, und
 * mehrere Facetten wurden mit UND verknuepft. Damit war die haeufigste Frage
 * des Bestands nicht stellbar, naemlich die nach zwei Orten oder zwei Personen
 * zugleich (E-151).
 *
 * Die stillen Defekte, gegen die diese Datei steht:
 *
 *   * Eine Ansicht setzt eine Liste, eine andere liest weiterhin einen String
 *     und zeigt kommentarlos einen anderen Ausschnitt.
 *   * Die Mehrfachauswahl schneidet statt zu vereinigen, sodass zwei Orte
 *     zusammen weniger Dokumente ergeben als jeder einzeln.
 *   * Ein unbekannter Wert in der Liste laesst die ganze Facette wirkungslos
 *     werden, statt nur sich selbst.
 *
 * Lauf: node --test tests/frontend/multi-facet.test.mjs
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getFilter, setFilter, resetFilter, isFilterActive, facetValues,
} from '../../docs/js/ui/filter-state.js';
import {
  sharedToToolbarState, toolbarStateToShared,
} from '../../docs/js/ui/filter-sync.js';
import { filterByToolbarState } from '../../docs/js/views/_archive-filter.js';

describe('Geteilter Filter haelt Listen', () => {
  beforeEach(() => resetFilter());

  test('ein einzelner Wert wird zur einelementigen Liste', () => {
    setFilter({ ort: 'Graz' });
    assert.deepEqual(getFilter().ort, ['Graz'], (
      'Ein Aufrufer, der einen String setzt, muss weiter funktionieren; sonst '
      + 'bricht jede bestehende Stelle stumm.'
    ));
  });

  test('eine Liste bleibt eine Liste', () => {
    setFilter({ ort: ['Graz', 'Wien'] });
    assert.deepEqual(getFilter().ort, ['Graz', 'Wien']);
  });

  test('Leerwert und leere Liste bedeuten dasselbe', () => {
    setFilter({ ort: ['Graz'] });
    setFilter({ ort: '' });
    assert.deepEqual(getFilter().ort, []);
    assert.equal(isFilterActive(), false);
  });

  test('Dubletten fallen weg, die Reihenfolge bleibt', () => {
    setFilter({ person: ['Wagner, Wieland', 'Malaniuk, Ira', 'Wagner, Wieland'] });
    assert.deepEqual(getFilter().person, ['Wagner, Wieland', 'Malaniuk, Ira']);
  });

  test('facetValues liefert immer eine Liste', () => {
    assert.deepEqual(facetValues(getFilter(), 'ort'), []);
    setFilter({ ort: 'Graz' });
    assert.deepEqual(facetValues(getFilter(), 'ort'), ['Graz']);
  });

  test('ein gesetzter Wert macht den Filter aktiv', () => {
    assert.equal(isFilterActive(), false);
    setFilter({ werk: ['Aida'] });
    assert.equal(isFilterActive(), true);
  });
});

describe('Projektion auf die Toolbar', () => {
  test('mehrere Werte kommen als Liste in der Toolbar an', () => {
    const projected = sharedToToolbarState({ ort: ['Graz', 'Wien'], person: [], werk: [] });
    assert.deepEqual(projected.location, ['Graz', 'Wien']);
  });

  test('der Rueckweg erhaelt die Liste', () => {
    const back = toolbarStateToShared({ location: ['Graz', 'Wien'], person: [], werk: [] });
    assert.deepEqual(back.ort, ['Graz', 'Wien']);
  });

  test('ein String aus einer Altstelle ueberlebt beide Richtungen', () => {
    assert.deepEqual(sharedToToolbarState({ ort: 'Graz' }).location, ['Graz']);
    assert.deepEqual(toolbarStateToShared({ location: 'Graz' }).ort, ['Graz']);
  });
});

describe('ODER innerhalb einer Facette', () => {
  const store = {
    persons: new Map([
      ['A', { records: new Set(['r1', 'r2']) }],
      ['B', { records: new Set(['r3']) }],
    ]),
    locations: new Map([['Graz', { records: new Set(['r1']) }]]),
    works: new Map(),
    dftHierarchy: new Map(),
  };
  const items = ['r1', 'r2', 'r3', 'r4'].map(id => ({ '@id': id }));
  const opts = { getRecord: (it) => it, searchMatch: () => true };

  test('zwei Personen vereinigen ihre Dokumente', () => {
    const out = filterByToolbarState(store, items, { person: ['A', 'B'] }, opts);
    assert.deepEqual(out.map(i => i['@id']), ['r1', 'r2', 'r3'], (
      'Die Mehrfachauswahl schneidet statt zu vereinigen; zwei Werte ergaeben '
      + 'dann weniger als jeder einzelne.'
    ));
  });

  test('eine Person allein bleibt wie zuvor', () => {
    const out = filterByToolbarState(store, items, { person: ['B'] }, opts);
    assert.deepEqual(out.map(i => i['@id']), ['r3']);
  });

  test('zwei verschiedene Facetten bleiben UND-verknuepft', () => {
    const out = filterByToolbarState(store, items,
      { person: ['A', 'B'], location: ['Graz'] }, opts);
    assert.deepEqual(out.map(i => i['@id']), ['r1'], (
      'Das ODER gilt innerhalb einer Facette; zwischen Facetten bleibt es UND.'
    ));
  });

  test('ein unbekannter Wert entwertet die Facette nicht', () => {
    const out = filterByToolbarState(store, items, { person: ['B', 'Unbekannt'] }, opts);
    assert.deepEqual(out.map(i => i['@id']), ['r3'], (
      'Ein Wert ohne Entsprechung im Bestand darf nur sich selbst betreffen.'
    ));
  });

  test('nur unbekannte Werte ergeben eine leere Menge', () => {
    const out = filterByToolbarState(store, items, { person: ['Unbekannt'] }, opts);
    assert.deepEqual(out.map(i => i['@id']), [], (
      'Eine Facette, deren Werte nichts treffen, muss leer liefern statt alles '
      + 'durchzulassen.'
    ));
  });

  test('ein String aus einer Altstelle wirkt weiterhin', () => {
    const out = filterByToolbarState(store, items, { person: 'A' }, opts);
    assert.deepEqual(out.map(i => i['@id']), ['r1', 'r2']);
  });
});
