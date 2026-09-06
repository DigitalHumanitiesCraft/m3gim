/**
 * Die Datumsspalte des Bestands zeigt den Zeitanker, nicht `rico:date`.
 *
 * Seit F3 nimmt `primaryYear` zuerst die ranghoechste ankernde Datierung der
 * Verknuepfungen und `rico:date` nur als Rueckfall. Las die Tabelle weiter
 * `rico:date` zuerst, nannte sie fuer denselben Datensatz ein anderes Jahr als
 * die Chronik, und die Ruecknahme eines Befundes auf das belegende Dokument
 * fuehrte auf zwei verschiedene Jahre.
 *
 * Lauf: node --test tests/frontend/bestand-date.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { primaryYear } from '../../docs/js/data/loader.js';
import { extractYear } from '../../docs/js/utils/date-parser.js';
import { baseIds } from '../../docs/js/data/records-for.js';
import { isUndatedItem } from '../../docs/js/views/bestand-data.js';
import { storeFromShipped } from './_shipped.mjs';

// Der Anker steht entweder am Dokument selbst oder kommt aus einer seiner
// Verknuepfungen; nur das zweite wird als ergaenzt markiert. Dieselbe Menge
// fuehrt chronik.js.
const OBJECT_OWN_SOURCES = new Set(['rico:date', 'rico:creationDate']);

let store;
before(async () => {
  store = await storeFromShipped();
});

const source = () => readFile(
  new URL('../../docs/js/views/bestand.js', import.meta.url), 'utf8');

describe('Herkunft des angezeigten Datums', () => {
  test('die Zeile liest das Datum des Ankers, nicht das Feld', async () => {
    const src = await source();
    assert.ok(src.includes('formatDate(anchor.date)'),
      'die Datumsspalte nimmt das Datum des Zeitankers');
    assert.ok(!src.includes('const derivedYear'),
      'die eigene Jahresableitung aus rico:date ist mit F3 entfallen');
    const at = src.indexOf('formatDate(anchor.date)');
    const own = src.indexOf("formatDate(r['rico:date'])", at);
    assert.ok(own > at,
      'rico:date steht erst nach dem Anker, sonst gewinnt wieder das Feld');
  });

  test('ein Datum aus einer Verknuepfung traegt Marke und Herkunft', async () => {
    const src = await source();
    assert.ok(src.includes('OBJECT_OWN_SOURCES'),
      'die Zeile unterscheidet die eigene Datierung von der der Verknuepfung');
    assert.ok(src.includes('Quelldatierung des Objekts'),
      'wo der Anker die Objektdatierung ueberstimmt, nennt der Tooltip sie');
  });
});

describe('Der ausgelieferte Datenstand', () => {
  test('eine Verknuepfungsdatierung ueberstimmt die Objektdatierung', () => {
    const record = store.bySignatur.get('UAKUG/NIM_007 11');
    assert.ok(record, 'UAKUG/NIM_007 11 steht im ausgelieferten Datensatz');
    assert.equal(extractYear(record['rico:date']), 1968,
      'die Quelle datiert das Objekt auf 1968');
    const anchor = primaryYear(store, record);
    assert.equal(anchor.year, 1959, 'die Auffuehrung datiert es auf 1959');
    assert.equal(anchor.label, 'aufführung');
    assert.ok(!OBJECT_OWN_SOURCES.has(anchor.source),
      'die Zeile markiert das Jahr als ergaenzt');
  });

  test('die Spalte aendert sich fuer eine kleine, benannte Menge', () => {
    const base = baseIds(store);
    const changed = store.allRecords
      .filter(r => base.has(r['@id']))
      .filter(r => {
        const own = extractYear(r['rico:date']);
        const anchor = primaryYear(store, r);
        return own != null && anchor.year != null && anchor.year !== own;
      })
      .map(r => r['rico:identifier'])
      .sort();
    // Von Hand am ausgelieferten Datenstand gezaehlt: zwoelf Datensaetze zeigen
    // in der Spalte ein anderes Jahr als ihre Objektdatierung.
    assert.ok(changed.length >= 10 && changed.length <= 40,
      `${changed.length} Datensaetze weichen ab, das ist keine kleine Menge mehr`);
    assert.ok(changed.includes('UAKUG/NIM_007 11'));
    assert.ok(changed.includes('UAKUG/NIM_011 7'));
  });

  test('ohne jeden Anker bleibt die Zeile undatiert', () => {
    const undated = store.allRecords.find(
      r => !r['rico:date'] && primaryYear(store, r).year == null);
    assert.ok(undated, 'der Datenstand fuehrt Datensaetze ohne jeden Zeitanker');
    assert.equal(isUndatedItem({ record: undated, pages: [] }, store), true);
    const dated = store.bySignatur.get('UAKUG/NIM_007 11');
    assert.equal(isUndatedItem({ record: dated, pages: [] }, store), false);
  });
});
