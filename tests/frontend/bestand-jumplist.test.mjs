/**
 * Die Sprungliste am Signatur-Spaltenkopf (Projektleitung, 2026-09-04).
 *
 * Zwei Zustaende, ein Modell: in der Tektonik listet sie die Konvolut-Koepfe mit
 * Auf-/Zuklapp-Aktion, unter einem Filter liegen die Zeilen flach, dann nennt
 * sie die im Schnitt vertretenen Konvolute samt der Zahl sichtbarer Zeilen --
 * ohne Chevron und ohne "alle aufklappen", weil es keinen Kopf zu oeffnen gibt.
 * Ein leerer Schnitt hat kein Sprungziel, der Ausloeser ist dann abgeschaltet.
 *
 * Lauf: node --test tests/frontend/bestand-jumplist.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  jumpListModel, konvolutJumpEntries, konvolutJumpEntriesFlat,
  flattenForFilter, currentKonvolutFromOffsets,
} from '../../docs/js/views/bestand-data.js';

/** Minimaler Store: die Sprungliste liest nur Signatur und Titel je Konvolut. */
const store = {
  konvolute: new Map([
    ['K1', { 'rico:identifier': 'UAKUG/NIM_004' }],
    ['K2', { 'rico:identifier': 'UAKUG/NIM_007' }],
    ['K3', { 'rico:identifier': 'UAKUG/NIM_011' }],
  ]),
  konvolutMeta: new Map([
    ['K1', { title: 'Bayreuth 1953', childCount: 9 }],
    ['K2', { title: 'Korrespondenz', childCount: 4 }],
    ['K3', { title: 'Presse', childCount: 2 }],
  ]),
};

const rec = (id) => ({ '@id': id, 'rico:identifier': id });
const structural = [
  { record: store.konvolute.get('K1'), isKonvolut: true, konvolutId: 'K1', visibleChildCount: 2 },
  { record: rec('a'), isChild: true, konvolutId: 'K1' },
  { record: rec('b'), isChild: true, konvolutId: 'K1' },
  { record: store.konvolute.get('K2'), isKonvolut: true, konvolutId: 'K2', visibleChildCount: 1 },
  { record: rec('c'), isChild: true, konvolutId: 'K2' },
  { record: rec('solo') },
];

describe('Sprungliste in der Tektonik', () => {
  test('listet die Koepfe des Schnitts mit ihren sichtbaren Kindern', () => {
    const model = jumpListModel(structural, store, false);
    assert.equal(model.flat, false);
    assert.equal(model.showToggles, true);
    assert.equal(model.disabled, false);
    assert.deepEqual(model.entries, [
      { konvolutId: 'K1', signatur: 'NIM_004', title: 'Bayreuth 1953', childCount: 2 },
      { konvolutId: 'K2', signatur: 'NIM_007', title: 'Korrespondenz', childCount: 1 },
    ]);
  });

  test('konvolutJumpEntries bleibt die Quelle dieses Zustands', () => {
    assert.deepEqual(jumpListModel(structural, store, false).entries,
      konvolutJumpEntries(structural, store));
  });
});

describe('Sprungliste im flachen Schnitt', () => {
  const flat = flattenForFilter(structural);

  test('flattenForFilter nimmt die Koepfe heraus, die Herkunft bleibt', () => {
    assert.equal(flat.some(item => item.isKonvolut), false);
    assert.deepEqual(flat.map(item => item.konvolutId), ['K1', 'K1', 'K2', undefined]);
  });

  test('die Konvolute kommen aus der Herkunft der Zeilen, gezaehlt wird der Schnitt', () => {
    assert.deepEqual(konvolutJumpEntriesFlat(flat, store), [
      { konvolutId: 'K1', signatur: 'NIM_004', title: 'Bayreuth 1953', childCount: 2 },
      { konvolutId: 'K2', signatur: 'NIM_007', title: 'Korrespondenz', childCount: 1 },
    ]);
  });

  test('die Zahl nennt die sichtbaren Zeilen, nicht den Umfang des Konvoluts', () => {
    const oneRow = konvolutJumpEntriesFlat(
      [{ record: rec('a'), isChild: true, konvolutId: 'K1' }], store);
    assert.deepEqual(oneRow.map(e => e.childCount), [1],
      'K1 haelt 9 Objekte, im Schnitt steht eines.');
  });

  test('die Reihenfolge ist die Zeilenreihenfolge der Tabelle', () => {
    const rows = [
      { record: rec('x'), isChild: true, konvolutId: 'K3' },
      { record: rec('y'), isChild: true, konvolutId: 'K1' },
      { record: rec('z'), isChild: true, konvolutId: 'K3' },
    ];
    assert.deepEqual(konvolutJumpEntriesFlat(rows, store).map(e => e.konvolutId), ['K3', 'K1']);
  });

  test('kein Chevron und keine Auf-/Zuklapp-Aktion', () => {
    const model = jumpListModel(flat, store, true);
    assert.equal(model.flat, true);
    assert.equal(model.showToggles, false,
      'Ohne Koepfe waere "alle aufklappen" ein Knopf ohne Wirkung.');
  });

  test('ein Schnitt ohne Zeilen schaltet den Ausloeser ab', () => {
    assert.equal(jumpListModel([], store, true).disabled, true);
    assert.equal(jumpListModel([{ record: rec('solo') }], store, true).disabled, true,
      'Ein Einzelstueck ohne Konvolut ist kein Sprungziel.');
    assert.equal(jumpListModel([], store, false).disabled, true);
  });
});

describe('Aktuelle Marke ueber gemessene Offsets', () => {
  const heads = [
    { konvolutId: 'K1', top: 100 },
    { konvolutId: 'K2', top: 900 },
    { konvolutId: 'K3', top: 1700 },
  ];

  test('das letzte Ziel auf oder ueber der Linie unter dem Spaltenkopf', () => {
    assert.equal(currentKonvolutFromOffsets(heads, 50), 'K1');
    assert.equal(currentKonvolutFromOffsets(heads, 900), 'K2');
    assert.equal(currentKonvolutFromOffsets(heads, 1698), 'K2');
    assert.equal(currentKonvolutFromOffsets(heads, 1699), 'K3',
      'Ein Pixel Toleranz: ein geparktes Ziel misst je nach Pixelverhaeltnis knapp darueber.');
    assert.equal(currentKonvolutFromOffsets(heads, 1701), 'K3');
  });

  test('ohne Ziele gibt es keine Marke', () => {
    assert.equal(currentKonvolutFromOffsets([], 0), null);
  });
});
