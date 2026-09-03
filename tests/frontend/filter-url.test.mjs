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
    assert.equal(serializeFilter({ ort: [], person: [], stand: [], zeitfenster: null }), '');
  });

  test('ein gefaltetes Zeitfenster erscheint nicht in der URL', () => {
    // yearRangeToZeitfenster faltet die volle Spanne zu null; der Slider in
    // Ruhestellung darf keinen Filter behaupten.
    assert.equal(serializeFilter({ zeitfenster: null }), '');
    assert.equal(serializeFilter({ zeitfenster: [1951, 1953] }), 'jahr=1951-1953');
  });

  test('der Erschliessungsstand steht als eigene Facette in der URL', () => {
    assert.equal(serializeFilter({ stand: [] }), '');
    assert.equal(serializeFilter({ stand: ['abgeschlossen', 'begonnen'] }),
      'stand=abgeschlossen,begonnen');
  });

  test('der Dokumenttyp steht als typ in der URL, nicht als docType', () => {
    assert.equal(serializeFilter({ docType: ['correspondence'] }), 'typ=correspondence');
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

  test('der abgeloeste Schaerfegrad wird nicht mehr gelesen (E-163)', () => {
    assert.equal('schaerfe' in parseFilterQuery('schaerfe=eng'), false);
    assert.equal('scope' in parseFilterQuery('scope=gesamt'), false);
  });

  test('typ und der alte Schluessel docType landen beide auf docType', () => {
    assert.deepEqual(parseFilterQuery('typ=correspondence,poster').docType, ['correspondence', 'poster']);
    assert.deepEqual(parseFilterQuery('docType=correspondence').docType, ['correspondence'],
      'ein bestehender Deep-Link bleibt gueltig');
    assert.equal('typ' in parseFilterQuery('typ=correspondence'), false,
      'der State-Schluessel heisst weiter docType');
  });

  test('bei beiden Schluesseln gewinnt typ, gleich in welcher Reihenfolge', () => {
    assert.deepEqual(parseFilterQuery('docType=poster&typ=correspondence').docType, ['correspondence']);
    assert.deepEqual(parseFilterQuery('typ=correspondence&docType=poster').docType, ['correspondence']);
  });

  test('der Erschliessungsstand kommt als Werteliste an', () => {
    assert.deepEqual(parseFilterQuery('stand=abgeschlossen,begonnen').stand,
      ['abgeschlossen', 'begonnen']);
  });
});

describe('Rundlauf ueber jede Facette', () => {
  const cases = {
    ort: ['Bayreuth', 'Wien'],
    person: ['Malaniuk, Ira'],
    werk: ['Tristan und Isolde'],
    institution: ['Bayreuther Festspiele'],
    docType: ['correspondence'],
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
    const filter = { ...cases, zeitfenster: [1951, 1953] };
    const back = parseFilterQuery(serializeFilter(filter));
    for (const [key, values] of Object.entries(cases)) assert.deepEqual(back[key], values);
    assert.deepEqual(back.zeitfenster, [1951, 1953]);
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
    const hash = buildHash('netzwerk', null, { ort: ['Bayreuth'], stand: ['begonnen'] });
    assert.equal(hash, '#netzwerk?ort=Bayreuth&stand=begonnen');
    const parts = splitHash(hash);
    assert.equal(parts.path, 'netzwerk');
    assert.deepEqual(parseFilterQuery(parts.query).ort, ['Bayreuth']);
  });
});
