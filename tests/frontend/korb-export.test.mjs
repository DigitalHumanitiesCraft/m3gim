/**
 * Die beiden Ausfuhren des Korbs, BibTeX und CSV, auf dem ausgelieferten
 * Datenstand.
 *
 * Die stillen Defekte, gegen die diese Datei steht:
 *
 *   * Die BibTeX-Maskierung deckt nur `{` und `}` ab. Jede Signatur trägt einen
 *     Unterstrich, mehrere Titel tragen `&` oder `_`; unmaskiert bricht die
 *     Datei beim Setzen, ohne dass die Anwendung etwas meldet.
 *   * Eine Maskierung läuft über ihre eigenen Ersetzungen und macht aus `&`
 *     zuerst `\&` und dann `\textbackslash{}&`.
 *   * Die CSV-Spalte Beziehungen nennt den Partner ohne die Richtung, obwohl
 *     das Detail „Korrespondenz · Adressat" zeigt; aus der gerichteten
 *     Beziehung wird eine bloße Nennung.
 *
 * Lauf: node --test tests/frontend/korb-export.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import { buildBibTeX, buildCSVRows } from '../../docs/js/views/korb.js';
import { storeFromShipped } from './_shipped.mjs';

// Zwei Datensätze des ausgelieferten Stands: der eine trägt ein `&` im Titel,
// der andere einen Unterstrich in Titel und Signatur.
const AMP_ID = 'm3gim-data:NIM_069';
const UNDERSCORE_ID = 'm3gim-data:NIM_137_15_1';
// Trägt eine Korrespondenz mit erfasster Rolle des Ziels.
const CORRESPONDENCE_ID = 'm3gim-data:NIM_003_1_1';

let store;
before(async () => { store = await storeFromShipped(); });

describe('BibTeX-Maskierung', () => {
  test('die Fixture-Datensätze stehen im ausgelieferten Stand', () => {
    for (const id of [AMP_ID, UNDERSCORE_ID, CORRESPONDENCE_ID]) {
      assert.ok(store.records.get(id), `${id} fehlt im Datensatz`);
    }
    assert.match(store.records.get(AMP_ID)['rico:title'], /&/);
    assert.match(store.records.get(UNDERSCORE_ID)['rico:title'], /_/);
  });

  test('& und _ stehen maskiert in den Feldwerten', () => {
    const bib = buildBibTeX([AMP_ID, UNDERSCORE_ID], store);
    assert.match(bib, /Diverse Programme \\& Kritiken/);
    assert.match(bib, /Foto\\_Zeitungskritik/);
    assert.match(bib, /note {6}= \{UAKUG\/NIM\\_069\. Quelle: Objekte Zeile \d+/);
  });

  test('kein unmaskiertes Sonderzeichen bleibt in einem Feldwert stehen', () => {
    const bib = buildBibTeX([...store.records.keys()].slice(0, 200), store);
    for (const line of bib.split('\n')) {
      const m = line.match(/^ +\w+ += \{(.*)\}$/);
      if (!m) continue;
      // Ein & % $ # _ ~ ^ ohne Backslash davor bricht den Satz.
      assert.doesNotMatch(m[1], /(^|[^\\])[&%$#_~^]/, line);
    }
  });

  test('der Backslash wird nicht doppelt ersetzt', () => {
    const fake = {
      records: new Map([['x', { '@id': 'x', 'rico:identifier': 'A\\B', 'rico:title': 'a & b_c {d} 100% ~ ^ $ #' }]]),
      agentRelations: new Map(),
      recordDatings: new Map(),
      annotations: new Map(),
    };
    const bib = buildBibTeX(['x'], fake);
    assert.match(bib, /title {5}= \{a \\& b\\_c \\\{d\\\} 100\\% \\textasciitilde\{\} \\textasciicircum\{\} \\\$ \\#\}/);
    assert.match(bib, /note {6}= \{A\\textbackslash\{\}B\}/);
  });

  test('der Key bleibt roh, er ist bereits normalisiert', () => {
    const bib = buildBibTeX([AMP_ID], store);
    assert.match(bib, /@misc\{UAKUG_NIM_069,/);
  });
});

/** Index einer CSV-Spalte über ihr Label; die Kopfzeile führt dahinter den Formathinweis. */
function column(rows, label) {
  const index = rows[0].findIndex(head => head === label || head.startsWith(label + ' ('));
  assert.notEqual(index, -1, `Spalte ${label} fehlt: ${rows[0].join(' | ')}`);
  return index;
}

describe('CSV-Zeilen', () => {
  test('die Kopfzeile führt die Spalte Beziehungen', () => {
    const rows = buildCSVRows([CORRESPONDENCE_ID], store);
    assert.ok(column(rows, 'Beziehungen') >= 0);
    assert.equal(rows.length, 2);
  });

  test('die Beziehung nennt die Richtung wie der Chip im Detail', () => {
    const rel = store.agentRelations.get(CORRESPONDENCE_ID)
      .find(r => r.type === 'agrelon:HasCorrespondent' && r.objectRoleLabel);
    assert.ok(rel, 'Fixture trägt keine Korrespondenz mit Rolle mehr');
    const rows = buildCSVRows([CORRESPONDENCE_ID], store);
    const cell = rows[1][column(rows, 'Beziehungen')];
    assert.ok(
      cell.includes(`Korrespondenz \u00b7 ${rel.objectRoleLabel}: ${rel.objectName}`),
      cell,
    );
  });

  test('eine Beziehung ohne Rolle bleibt ungerichtet', () => {
    const fake = {
      records: new Map([['x', { '@id': 'x', 'rico:identifier': 'S', 'rico:title': 'T' }]]),
      agentRelations: new Map([['x', [
        { type: 'agrelon:HasCorrespondent', objectName: 'Wagner, Wieland', objectRoleLabel: null },
      ]]]),
      recordToEvents: new Map(),
      mobilityEvents: new Map(),
      finances: new Map(),
      childToKonvolut: new Map(),
      konvolute: new Map(),
      recordDatings: new Map(),
    };
    const rows = buildCSVRows(['x'], fake);
    assert.equal(rows[1][column(rows, 'Beziehungen')], 'Korrespondenz: Wagner, Wieland');
  });
});
