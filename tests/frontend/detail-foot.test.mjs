/**
 * Unit-Tests fuer sourceSummary() aus docs/js/views/archive-inline-detail.js.
 *
 * Lauf:
 *   node --test tests/frontend/detail-foot.test.mjs
 *
 * sourceSummary buendelt die Provenienz eines Eintrags und aller in ihm
 * verschachtelten Entitaeten. Sie ist dom-frei und damit hier pruefbar; das
 * gerenderte Fussstueck deckt der Playwright-Smoke ab. Zwei Strecken: eine
 * synthetische Partition fuer Gruppierung und Sortierung, der ausgelieferte
 * Datensatz fuer das reale Ankommen.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sourceSummary } from '../../docs/js/views/archive-inline-detail.js';
import { storeFromShipped } from './_shipped.mjs';

/** xlsxSource-Subobjekt, wie die Pipeline es an einen JSON-LD-Knoten schreibt. */
function src(sheet, row) {
  return {
    'm3gim-ontology:xlsxSource': {
      'm3gim-ontology:xlsxSheet': sheet,
      'm3gim-ontology:xlsxRow': row,
    },
  };
}

test('sourceSummary: Record-Quelle und Verknuepfungen nach Sheet gruppiert und nach Zeile sortiert', () => {
  const record = {
    '@id': 'm3gim-data:r1',
    ...src('Objekte', 42),
    'm3gim-ontology:hasAssociatedAgent': [
      { name: 'B', ...src('Box 1', 246) },
      { name: 'A', ...src('Box 1', 245) },
    ],
    'rico:hasOrHadLocation': [{ name: 'Wien', ...src('Box 2', 12) }],
  };
  const store = {
    // Store-abgeleitete Entitaeten tragen die kompakte Form direkt.
    finances: new Map([['m3gim-data:r1', [{ amount: 5, xlsxSource: { sheet: 'Box 1', row: 245 } }]]]),
  };
  const { record: own, linked } = sourceSummary(record, store);

  assert.deepEqual(own, { sheet: 'Objekte', row: 42 });
  assert.deepEqual(linked, [
    // Zeile 245 steht doppelt in der Quelle (Agent + Finanz) und genau einmal hier.
    { sheet: 'Box 1', rows: [245, 246] },
    { sheet: 'Box 2', rows: [12] },
  ]);
});

test('sourceSummary: Record ohne Provenienz und ohne Verknuepfungen liefert leere Struktur', () => {
  assert.deepEqual(sourceSummary({ '@id': 'x' }, {}), { record: null, linked: [] });
});

test('sourceSummary: am ausgelieferten Datensatz traegt ein verknuepfter Eintrag beide Ebenen', async () => {
  const store = await storeFromShipped();
  const record = store.bySignatur.get('UAKUG/NIM_073 30_1');
  assert.ok(record, 'Anker-Record UAKUG/NIM_073 30_1 nicht im Store');
  const { record: own, linked } = sourceSummary(record, store);

  assert.ok(own && own.row > 0, 'Record ohne eigene Zeilen-Provenienz');
  assert.ok(linked.length > 0, 'keine verknuepfte Quelle angekommen');
  for (const { sheet, rows } of linked) {
    assert.ok(sheet, 'Verknuepfung ohne Sheet');
    assert.ok(rows.length > 0 && rows.every(r => Number.isFinite(r)), `unsaubere Zeilen in ${sheet}`);
    assert.deepEqual(rows, [...rows].sort((a, b) => a - b), `Zeilen in ${sheet} unsortiert`);
    assert.equal(new Set(rows).size, rows.length, `doppelte Zeile in ${sheet}`);
  }
});
