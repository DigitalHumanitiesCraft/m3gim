/**
 * Der Dokumenttyp-Badge einer Bestandszeile im gefilterten Modus.
 *
 * Der stille Defekt, gegen den diese Datei steht: beim Abflachen der Hierarchie
 * (aktiver Filter) verlor `updateBestandView` das `isChild`-Kennzeichen der
 * Kindzeilen. `renderRows` behandelte sie danach als Standalone-Records, und
 * `isStandaloneKonvolut` liefert fuer jede Signatur ohne `/PL_` und `_TT_` true.
 * Damit trugen die Rezensionen eines Konvoluts (NIM_004) in der Trefferliste den
 * Badge "Konvolut" statt "Rezension".
 *
 * `flattenForFilter` erhaelt das Kennzeichen, `badgeKindForItem` entscheidet den
 * Badge rein aus dem Item — beides ohne DOM, damit die Entscheidung pruefbar
 * bleibt.
 *
 * Lauf: node --test tests/frontend/bestand-badge.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

// archive-holdings.js pulls in ui/events.js, which registers a window listener
// at module scope. The stub keeps the import viable under Node without touching
// the view; the module loads only after the stub is in place.
globalThis.window = globalThis.window || {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
};
let flattenForFilter;
let badgeKindForItem;
before(async () => {
  ({ flattenForFilter, badgeKindForItem } = await import('../../docs/js/views/archive-holdings.js'));
});

// isStandaloneKonvolut-Ersatz mit derselben Regel wie im View: eine Signatur
// mit /PL_ oder _TT_ ist ein Einzelstueck, alles andere ein Top-Level-Konvolut.
const isStandaloneKonvolut = (r) => {
  const sig = r['rico:identifier'] || '';
  return !(sig.includes('/PL_') || sig.includes('_TT_'));
};

describe('flattenForFilter erhaelt das Kind-Kennzeichen', () => {
  const items = [
    { record: { '@id': 'k1' }, isKonvolut: true, konvolutId: 'k1', visibleChildCount: 2 },
    { record: { '@id': 'c1' }, isChild: true, konvolutId: 'k1' },
    { record: { '@id': 'c2' }, isChild: true, konvolutId: 'k1' },
    { record: { '@id': 'r1' } },
  ];

  test('Konvolut-Header fallen weg, Kinder bleiben Kinder', () => {
    const flat = flattenForFilter(items);
    assert.deepEqual(flat.map(i => i.record['@id']), ['c1', 'c2', 'r1']);
    assert.equal(flat[0].isChild, true, (
      'Das isChild-Kennzeichen darf beim Abflachen nicht verlorengehen, sonst '
      + 'behandelt renderRows die Kinder als Standalone-Records.'
    ));
    assert.equal(flat[0].konvolutId, 'k1');
    assert.equal(flat[2].isChild, undefined, 'ein echter Standalone-Record bleibt ungeflaggt');
  });
});

describe('badgeKindForItem trifft den echten Dokumenttyp', () => {
  test('eine gefilterte Kind-Zeile bekommt ihren Doctype, nicht Konvolut', () => {
    const item = { record: { '@id': 'c1', 'rico:identifier': 'UAKUG/NIM_004 3' }, isChild: true, konvolutId: 'k1' };
    const kind = badgeKindForItem(item, item.record, 'rezension', isStandaloneKonvolut);
    assert.equal(kind, 'doctype', (
      'Eine Kind-Zeile im Flachmodus zeigt ihren eigenen Dokumenttyp-Badge.'
    ));
  });

  test('ein Kind ohne Doctype ist nicht klassifiziert', () => {
    const item = { record: { '@id': 'c1', 'rico:identifier': 'UAKUG/NIM_004 3' }, isChild: true };
    assert.equal(badgeKindForItem(item, item.record, '', isStandaloneKonvolut), 'unclassified');
  });

  test('ein Kind, dessen Doctype selbst konvolut ist, faellt nicht auf den Konvolut-Struct-Badge', () => {
    const item = { record: { '@id': 'c1', 'rico:identifier': 'UAKUG/NIM_004 3' }, isChild: true };
    assert.equal(badgeKindForItem(item, item.record, '', isStandaloneKonvolut), 'unclassified');
  });

  test('ein echter Top-Level-Sammelrecord bleibt Standalone-Konvolut', () => {
    const item = { record: { '@id': 'r1', 'rico:identifier': 'UAKUG/NIM_010' } };
    assert.equal(badgeKindForItem(item, item.record, '', isStandaloneKonvolut), 'standalone-konvolut');
  });

  test('ein Plakat bleibt kein Konvolut, sondern zeigt seinen Doctype', () => {
    const item = { record: { '@id': 'p1', 'rico:identifier': 'UAKUG/NIM/PL_04' } };
    assert.equal(badgeKindForItem(item, item.record, 'plakat', isStandaloneKonvolut), 'doctype');
  });

  test('der Konvolut-Header selbst traegt den Struct-Badge', () => {
    const item = { record: { '@id': 'k1' }, isKonvolut: true };
    assert.equal(badgeKindForItem(item, item.record, '', isStandaloneKonvolut), 'konvolut-struct');
  });
});
