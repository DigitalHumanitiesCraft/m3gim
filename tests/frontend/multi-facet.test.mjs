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
  addFacetValue,
} from '../../docs/js/ui/filter-state.js';
import { isSharedFiltered } from '../../docs/js/views/_bestand-filter.js';
import { recordsFor } from '../../docs/js/data/records-for.js';

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
  const cut = filter => recordsFor(store, filter, {
    base: new Set(items.map(item => item['@id'])),
  }).ids;

  test('zwei Personen vereinigen ihre Dokumente', () => {
    const out = cut({ person: ['A', 'B'] });
    assert.deepEqual([...out], ['r1', 'r2', 'r3'], (
      'Die Mehrfachauswahl schneidet statt zu vereinigen; zwei Werte ergaeben '
      + 'dann weniger als jeder einzelne.'
    ));
  });

  test('eine Person allein bleibt wie zuvor', () => {
    assert.deepEqual([...cut({ person: ['B'] })], ['r3']);
  });

  test('zwei verschiedene Facetten bleiben UND-verknuepft', () => {
    const out = cut({ person: ['A', 'B'], ort: ['Graz'] });
    assert.deepEqual([...out], ['r1'], (
      'Das ODER gilt innerhalb einer Facette; zwischen Facetten bleibt es UND.'
    ));
  });

  test('ein unbekannter Wert entwertet die Facette nicht', () => {
    const out = cut({ person: ['B', 'Unbekannt'] });
    assert.deepEqual([...out], ['r3'], (
      'Ein Wert ohne Entsprechung im Bestand darf nur sich selbst betreffen.'
    ));
  });

  test('nur unbekannte Werte ergeben eine leere Menge', () => {
    const out = cut({ person: ['Unbekannt'] });
    assert.deepEqual([...out], [], (
      'Eine Facette, deren Werte nichts treffen, muss leer liefern statt alles '
      + 'durchzulassen.'
    ));
  });

  test('ein String aus einer Altstelle wirkt weiterhin', () => {
    assert.deepEqual([...cut({ person: 'A' })], ['r1', 'r2']);
  });
});

describe('Leerformen kippen keine lesende Stelle', () => {
  test('facetValues ohne State liefert eine leere Liste', () => {
    assert.deepEqual(facetValues(null, 'ort'), [], (
      'Ein View, der vor dem ersten setFilter liest, bekaeme sonst undefined '
      + 'und wuerde beim Iterieren werfen.'
    ));
    assert.deepEqual(facetValues({}, 'ort'), []);
  });

  test('eine leere Facettenliste zaehlt nicht als aktiver Filter', () => {
    assert.equal(isSharedFiltered({ person: [] }), false, (
      'Eine leere Liste ist der Leerwert; sonst blieben Reset-Knopf und '
      + 'Hierarchie-Abflachung dauerhaft an.'
    ));
    assert.equal(isSharedFiltered({ person: ['A'] }), true);
    assert.equal(isSharedFiltered({}), false);
  });
});

describe('addFacetValue (Cross-Navigation verengt, ersetzt nicht)', () => {
  beforeEach(() => resetFilter());

  test('haengt an, ohne den vorhandenen Wert zu verwerfen', () => {
    setFilter({ ort: ['Bayreuth'] });
    addFacetValue('ort', 'Wien');
    assert.deepEqual(getFilter().ort, ['Bayreuth', 'Wien']);
  });

  test('ein doppelter Wert bleibt einmal drin', () => {
    addFacetValue('person', 'Malaniuk, Ira');
    addFacetValue('person', 'Malaniuk, Ira');
    assert.deepEqual(getFilter().person, ['Malaniuk, Ira']);
  });

  test('ein Schluessel ausserhalb der Facettenachsen wirkt nicht', () => {
    addFacetValue('search', 'Bayreuth');
    addFacetValue('gibtsnicht', 'x');
    assert.equal(getFilter().search, '');
    assert.equal(isFilterActive(), false);
  });
});
