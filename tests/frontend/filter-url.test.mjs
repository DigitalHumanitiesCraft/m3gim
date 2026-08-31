/**
 * Ein Schnitt ist zitierbar und ueberlebt den Reload.
 *
 * Der geteilte Filter lebte bis hierher nur im Modul. Wer einen Befund zeigen
 * wollte, konnte den Link schicken und der Empfaenger sah den vollen Bestand,
 * ohne dass etwas darauf hinwies. Die Hash-Grammatik lautet jetzt
 * `#<tab>[/<recordId>][?<query>]`.
 *
 * Die stillen Defekte, gegen die diese Datei steht:
 *
 *   * Ein Name mit Komma (die Regelform `Nachname, Vorname`) zerfaellt am
 *     Trennzeichen der Mehrfachauswahl in zwei Werte.
 *   * Ein alter Deep-Link auf einen Datensatz bricht, weil der Query-Teil vor
 *     dem Aufteilen an `/` nicht abgetrennt wird.
 *   * Ein unveraendertes Zeitfenster erscheint als aktiver Filter in der URL.
 *
 * Lauf: node --test tests/frontend/filter-url.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  serializeFilter, parseFilterQuery, splitHash, buildHash,
} from '../../docs/js/ui/filter-url.js';
import { resolveRecordId } from '../../docs/js/ui/router.js';

describe('serializeFilter', () => {
  test('ein leerer Filter erzeugt keinen Query-Teil', () => {
    assert.equal(serializeFilter({}), '');
    assert.equal(serializeFilter({ ort: [], person: [], zeitfenster: null, schaerfe: 'weit' }), '');
  });

  test('ein gefaltetes Zeitfenster erscheint nicht in der URL', () => {
    // yearRangeToZeitfenster faltet die volle Spanne zu null; der Slider in
    // Ruhestellung darf keinen Filter behaupten.
    assert.equal(serializeFilter({ zeitfenster: null }), '');
    assert.equal(serializeFilter({ zeitfenster: [1951, 1953] }), 'jahr=1951-1953');
  });

  test('der Default-Schaerfegrad steht nicht in der URL', () => {
    assert.equal(serializeFilter({ schaerfe: 'weit' }), '');
    assert.equal(serializeFilter({ schaerfe: 'eng' }), 'schaerfe=eng');
  });

  test('mehrere Werte einer Facette trennt das Komma', () => {
    assert.equal(serializeFilter({ ort: ['Bayreuth', 'Wien'] }), 'ort=Bayreuth,Wien');
  });

  test('ein Komma im Wert wird kodiert und bleibt ein Wert', () => {
    const q = serializeFilter({ person: ['Malaniuk, Ira'] });
    assert.equal(q, 'person=Malaniuk%2C%20Ira');
    assert.deepEqual(parseFilterQuery(q).person, ['Malaniuk, Ira']);
  });
});

describe('parseFilterQuery', () => {
  test('ein unbekannter Schluessel faellt weg und wirft nicht', () => {
    const patch = parseFilterQuery('ort=Wien&voodoo=1');
    assert.deepEqual(patch.ort, ['Wien']);
    assert.equal('voodoo' in patch, false);
  });

  test('ein fuehrendes Fragezeichen stoert nicht', () => {
    assert.deepEqual(parseFilterQuery('?ort=Wien').ort, ['Wien']);
  });

  test('leere Eingaben ergeben einen leeren Patch', () => {
    assert.deepEqual(parseFilterQuery(''), {});
    assert.deepEqual(parseFilterQuery(null), {});
    assert.deepEqual(parseFilterQuery('?'), {});
  });

  test('ein unbrauchbares Jahresfenster wird verworfen statt geraten', () => {
    assert.equal('zeitfenster' in parseFilterQuery('jahr=abc'), false);
    assert.equal('zeitfenster' in parseFilterQuery('jahr=1951'), false);
    assert.deepEqual(parseFilterQuery('jahr=1953-1951').zeitfenster, [1951, 1953],
      'verdrehte Grenzen werden geordnet, nicht verworfen');
  });

  test('ein unbekannter Schaerfegrad wird verworfen', () => {
    assert.equal('schaerfe' in parseFilterQuery('schaerfe=mittel'), false);
    assert.equal(parseFilterQuery('schaerfe=eng').schaerfe, 'eng');
  });
});

describe('Rundlauf ueber jede Facette', () => {
  const cases = {
    ort: ['Bayreuth', 'Wien'],
    person: ['Malaniuk, Ira'],
    werk: ['Tristan und Isolde'],
    institution: ['Bayreuther Festspiele'],
    rolle: ['m3gim-vocab:singer'],
    sicht: ['performativ'],
  };

  for (const [key, values] of Object.entries(cases)) {
    test(`${key} ueberlebt beide Richtungen`, () => {
      const q = serializeFilter({ [key]: values });
      assert.ok(q.length > 0);
      assert.deepEqual(parseFilterQuery(q)[key], values);
    });
  }

  test('alle Facetten zusammen ueberleben den Rundlauf', () => {
    const filter = { ...cases, zeitfenster: [1951, 1953], schaerfe: 'eng' };
    const back = parseFilterQuery(serializeFilter(filter));
    for (const [key, values] of Object.entries(cases)) assert.deepEqual(back[key], values);
    assert.deepEqual(back.zeitfenster, [1951, 1953]);
    assert.equal(back.schaerfe, 'eng');
  });
});

describe('Hash-Grammatik #<tab>[/<recordId>][?<query>]', () => {
  test('ein Deep-Link der Bestandsansicht bleibt gueltig', () => {
    const parts = splitHash('#bestand/m3gim-data%3ANIM_004_1');
    assert.equal(parts.path, 'bestand/m3gim-data%3ANIM_004_1');
    assert.equal(parts.query, '');
  });

  test('der Query-Teil wird vor dem Aufteilen an / abgetrennt', () => {
    const parts = splitHash('#bestand/m3gim-data%3ANIM_004_1?ort=Bayreuth');
    assert.equal(parts.path, 'bestand/m3gim-data%3ANIM_004_1');
    assert.equal(parts.query, 'ort=Bayreuth');
    const id = decodeURIComponent(parts.path.split('/')[1]);
    assert.equal(resolveRecordId(id), 'm3gim-data:NIM_004_1',
      'die Datensatz-Id ueberlebt den Query-Teil unveraendert');
  });

  test('ein alter Link mit Instanzpraefix m3gim: bleibt aufloesbar', () => {
    const parts = splitHash('#bestand/m3gim%3ANIM_004_1?jahr=1951-1953');
    const id = decodeURIComponent(parts.path.split('/')[1]);
    assert.equal(resolveRecordId(id), 'm3gim-data:NIM_004_1');
  });

  test('ein Hash ohne Query bleibt ohne Query', () => {
    assert.equal(buildHash('bestand', null, {}), '#bestand');
    assert.equal(buildHash('bestand', 'm3gim-data:NIM_004_1', {}),
      '#bestand/m3gim-data%3ANIM_004_1');
  });

  test('buildHash und splitHash sind zueinander invers', () => {
    const hash = buildHash('verknuepfungen', null, { ort: ['Bayreuth'], schaerfe: 'eng' });
    assert.equal(hash, '#verknuepfungen?ort=Bayreuth&schaerfe=eng');
    const parts = splitHash(hash);
    assert.equal(parts.path, 'verknuepfungen');
    assert.deepEqual(parseFilterQuery(parts.query).ort, ['Bayreuth']);
  });
});
