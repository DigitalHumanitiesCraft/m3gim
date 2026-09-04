/**
 * Die Hash-Grammatik `#<tab>[/<recordId>][?<query>]` beim Lesen.
 *
 * `filter-url.test.mjs` prüft das Zerlegen und Bauen des Hash als Zeichenkette.
 * Hier steht die andere Richtung: was `parseHash` daraus in den Router-State und
 * in den geteilten Filter überträgt.
 *
 * Die stillen Defekte, gegen die diese Datei steht:
 *
 *   * Ein Tab-Wechsel ohne Query löscht den gesetzten Filter. Ein leerer Query
 *     heißt "dieser Link nennt keinen Schnitt", nicht "kein Schnitt".
 *   * Ein Deep-Link mit Query verliert den Datensatz, weil der Query-Teil vor
 *     dem Aufteilen an `/` nicht abgetrennt wird.
 *   * Ein alter Bookmark (`#archiv`, `#mobilitaet`) landet auf keinem Tab und
 *     zeigt nichts an, ohne einen Fehler zu melden.
 *   * Ein Sprung auf einen Datensatz schreibt die Adresszeile an `buildHash`
 *     vorbei und verliert dabei den geteilten Schnitt.
 *
 * Lauf: node --test tests/frontend/router-hash.test.mjs
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// router.js liest window.location.hash; der Stub steht vor dem Modulimport.
globalThis.window = globalThis.window || {
  location: { hash: '' },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
};
// Der Router schreibt ueber history.replaceState; der Stub legt das Ergebnis
// dort ab, wo der Browser es haette, damit die Adresszeile pruefbar wird.
globalThis.history = globalThis.history || {
  replaceState(_state, _title, url) { globalThis.window.location.hash = url; },
};
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || ((fn) => fn());
globalThis.document = globalThis.document || {
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getElementById() { return null; },
};

const { parseHash, getState, navigateToView, selectRecord } =
  await import('../../docs/js/ui/router.js');
const { getFilter, resetFilter } = await import('../../docs/js/ui/filter-state.js');

const parse = (hash) => { window.location.hash = hash; parseHash(); };

beforeEach(() => {
  resetFilter();
  parse('#bestand');
});

describe('Pfad-Teil', () => {
  test('ein registrierter Tab wird uebernommen', () => {
    parse('#karte');
    assert.equal(getState().activeTab, 'karte');
  });

  test('ein unbekannter Tab laesst den bisherigen stehen', () => {
    parse('#gibtsnicht');
    assert.equal(getState().activeTab, 'bestand');
  });

  test('ein leerer Hash aendert nichts', () => {
    parse('#chronik');
    parse('');
    assert.equal(getState().activeTab, 'chronik');
  });
});

describe('Datensatz-Teil', () => {
  test('der Deep-Link traegt den Datensatz', () => {
    parse('#bestand/m3gim-data:NIM_004_10');
    assert.equal(getState().activeTab, 'bestand');
    assert.equal(getState().selectedRecord, 'm3gim-data:NIM_004_10');
  });

  test('die Signatur wird URL-dekodiert', () => {
    parse('#bestand/' + encodeURIComponent('UAKUG/NIM_003 Folio 01'));
    assert.equal(getState().selectedRecord, 'UAKUG/NIM_003 Folio 01');
  });

  test('der alte Instanzpraefix wird aufgeloest', () => {
    parse('#bestand/m3gim:NIM_004_1');
    assert.equal(getState().selectedRecord, 'm3gim-data:NIM_004_1');
  });
});

describe('Query-Teil', () => {
  test('der Schnitt kommt im geteilten Filter an', () => {
    parse('#bestand?person=Malaniuk%2C%20Ira&jahr=1950-1960');
    assert.deepEqual(getFilter().person, ['Malaniuk, Ira']);
    assert.deepEqual(getFilter().zeitfenster, [1950, 1960]);
  });

  test('Query und Datensatz stehen nebeneinander', () => {
    parse('#bestand/m3gim-data:NIM_004_10?person=Malaniuk%2C%20Ira');
    assert.equal(getState().selectedRecord, 'm3gim-data:NIM_004_10',
      'Der Query-Teil muss vor dem Aufteilen an / abgetrennt werden.');
    assert.deepEqual(getFilter().person, ['Malaniuk, Ira']);
  });

  test('ein Hash ohne Query loescht den gesetzten Schnitt nicht', () => {
    parse('#bestand?person=Malaniuk%2C%20Ira');
    parse('#karte');
    assert.deepEqual(getFilter().person, ['Malaniuk, Ira']);
  });
});

describe('Legacy-Aliasse', () => {
  test('#archiv fuehrt in den Bestand', () => {
    parse('#archiv');
    assert.equal(getState().activeTab, 'bestand');
  });

  test('#archiv/<id> behaelt den Datensatz', () => {
    parse('#archiv/m3gim-data:NIM_004_10');
    assert.equal(getState().activeTab, 'bestand');
    assert.equal(getState().selectedRecord, 'm3gim-data:NIM_004_10');
  });

  test('#mobilitaet und #mobilitaets-atlas fuehren auf die Karte', () => {
    parse('#mobilitaet');
    assert.equal(getState().activeTab, 'karte');
    parse('#bestand');
    parse('#mobilitaets-atlas');
    assert.equal(getState().activeTab, 'karte');
  });
});

describe('Record-Sprung', () => {
  const ID = 'm3gim-data:NIM_004_10';

  test('der Sprung in den Bestand behaelt Datensatz und Schnitt', () => {
    parse('#indizes?person=Malaniuk%2C%20Ira');
    navigateToView('bestand', { recordId: ID });
    assert.equal(getState().activeTab, 'bestand');
    assert.equal(getState().selectedRecord, ID);
    assert.equal(window.location.hash,
      '#bestand/' + encodeURIComponent(ID) + '?person=Malaniuk%2C%20Ira',
      'Ein Sprung an buildHash vorbei verliert den geteilten Schnitt.');
  });

  test('selectRecord schreibt den Schnitt mit', () => {
    parse('#bestand?typ=correspondence');
    selectRecord(ID);
    assert.equal(window.location.hash,
      '#bestand/' + encodeURIComponent(ID) + '?typ=correspondence');
  });

  test('ein Sprung ohne Datensatz laesst den Pfad beim Tab', () => {
    parse('#indizes?ort=Bayreuth');
    navigateToView('karte');
    assert.equal(getState().selectedRecord, null);
    assert.equal(window.location.hash, '#karte?ort=Bayreuth');
  });

  test('der alte Instanzpraefix wird auch beim Sprung aufgeloest', () => {
    parse('#indizes');
    navigateToView('bestand', { recordId: 'm3gim:NIM_004_1' });
    assert.equal(getState().selectedRecord, 'm3gim-data:NIM_004_1');
  });
});
