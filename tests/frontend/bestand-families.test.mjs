/**
 * Die typisierte Erschliessungsanzeige der Bestand-Tabelle (E-158).
 *
 * `familiesForRecord` ist die dom-freie Kern-Logik hinter den sechs Punkten je
 * Objektzeile: sie zaehlt aus derselben Partition, aus der das Inline-Detail
 * seine Bloecke baut, und liefert die Familien in CONTENT_FAMILIES-Reihenfolge.
 * Bricht diese Reihenfolge oder eine Zuordnung, tragen Tabelle und Detail
 * unterschiedliche Farben fuer dieselbe Sache, und die Legende aus Naehe
 * (design.md Regel 2) faellt in sich zusammen.
 *
 * `isOutOfScope` haelt die Scope-Regel an einer Stelle: Plakate und Tontraeger
 * fallen nur im Fein-Scope weg, im Gesamt-Scope ist nichts unerreichbar (E-157).
 *
 * Lauf: node --test tests/frontend/bestand-families.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import { CONTENT_FAMILIES } from '../../docs/js/data/constants.js';
import { storeFromShipped } from './_shipped.mjs';

// archive-holdings.js pulls in ui/events.js, which registers a window listener
// at module scope; the stub keeps the import viable under Node.
globalThis.window = globalThis.window || {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
};

let familiesForRecord;
let isOutOfScope;
let store;
before(async () => {
  ({ familiesForRecord, isOutOfScope } = await import('../../docs/js/views/archive-holdings.js'));
  store = await storeFromShipped();
});

const BAYREUTH_1953 = 'm3gim-data:NIM_004_10';

describe('familiesForRecord am ausgelieferten Datenstand', () => {
  test('liefert die sechs Familien in CONTENT_FAMILIES-Reihenfolge', () => {
    const record = store.records.get(BAYREUTH_1953);
    assert.ok(record, `${BAYREUTH_1953} muss im ausgelieferten Datensatz stehen`);
    const families = familiesForRecord(record, store);
    assert.deepEqual(
      families.map(f => f.key),
      CONTENT_FAMILIES.map(f => f.key),
      'Die Reihenfolge traegt die Farbzuordnung zwischen Tabelle und Detail.'
    );
    assert.deepEqual(families.map(f => f.label), CONTENT_FAMILIES.map(f => f.label));
  });

  test('die Bayreuther Rezension von 1953 traegt einen Ortsbezug', () => {
    const families = familiesForRecord(store.records.get(BAYREUTH_1953), store);
    const ort = families.find(f => f.key === 'ort');
    assert.ok(ort.count > 0, (
      'Ein raumzeitlich erschlossener Record muss die Ort-Familie gefuellt zeigen, '
      + 'sonst bleibt die Anzeige hinter dem Detail zurueck.'
    ));
    const person = families.find(f => f.key === 'person');
    assert.ok(person.count > 0, 'die beteiligten Personen stehen ebenfalls am Record');
  });

  test('ein unerschlossener Record zeigt durchgehend leere Familien', () => {
    const id = [...store.unprocessedIds].find(rid => store.records.has(rid));
    assert.ok(id, 'der Datenstand fuehrt unerschlossene Records');
    const families = familiesForRecord(store.records.get(id), store);
    assert.deepEqual(families.map(f => f.count), [0, 0, 0, 0, 0, 0], (
      'Ohne Verknuepfungen bleibt jeder Punkt leer -- die Anzeige darf keinen '
      + 'Erschliessungsstand behaupten, den die Daten nicht tragen.'
    ));
  });
});

describe('isOutOfScope traegt die Scope-Regel', () => {
  const poster = { 'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:poster' } };
  const brief = { 'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:letter' } };

  test('Plakate fallen im Fein-Scope raus', () => {
    assert.equal(isOutOfScope(poster, false), true);
  });

  test('im Gesamt-Scope ist nichts unerreichbar', () => {
    assert.equal(isOutOfScope(poster, true), false, (
      'E-157: der Gesamt-Scope blendet auch Plakate und Tontraeger nicht aus.'
    ));
  });

  test('ein Schriftstueck bleibt in beiden Scopes', () => {
    assert.equal(isOutOfScope(brief, false), false);
    assert.equal(isOutOfScope(brief, true), false);
  });
});
