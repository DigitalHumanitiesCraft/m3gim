/**
 * Das Ortslabel eines Chronik-Chips auf dem ausgelieferten Datenstand.
 *
 * Der stille Defekt, gegen den diese Datei steht: die Ortsspalte der Quelle
 * trägt vereinzelt ein Datum („06-09", „1956-11-21"). Die Karte überspringt
 * solche Pseudo-Orte seit dem Datenfehler-Register, die Chronik schrieb sie als
 * Ortsnamen an den Chip. Der Datensatz behält seinen Punkt, nur der Pseudo-Ort
 * wird nicht als Ort gezeigt.
 *
 * Lauf: node --test tests/frontend/chronik-place.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import { placeLabelFor } from '../../docs/js/views/chronik-data.js';
import { storeFromShipped } from './_shipped.mjs';

let store;
before(async () => { store = await storeFromShipped(); });

describe('Ortslabel der Chronik', () => {
  test('kein Datensatz des Bestands trägt ein ziffernanfängiges Ortslabel', () => {
    const leaks = [];
    for (const [id, record] of store.records) {
      const place = placeLabelFor(store, record);
      if (/^\d/.test(place)) leaks.push([id, place]);
    }
    assert.deepEqual(leaks, []);
  });

  test('die beiden bekannten Datums-Leaks der Quelle bleiben ohne Ortslabel', () => {
    // NIM_004_34 trägt den Wert am Record-Ort, NIM_004_15 an der verorteten
    // Annotation; beide Wege müssen die Regel treffen.
    const atLocation = store.records.get('m3gim-data:NIM_004_34');
    const atEvent = store.records.get('m3gim-data:NIM_004_15');
    assert.ok(atLocation && atEvent, 'Fixture-Datensätze fehlen im ausgelieferten Stand');
    assert.equal(atLocation['rico:hasOrHadLocation'].name, '06-09',
      'der Quellbefund ist behoben, die Fixture ist nachzuziehen');
    assert.equal(placeLabelFor(store, atLocation), '');
    assert.equal(placeLabelFor(store, atEvent), '');
  });

  test('ein echter Ortsname bleibt unverändert stehen', () => {
    const fake = {
      recordToEvents: new Map([['x', ['e1']]]),
      mobilityEvents: new Map([['e1', { place: 'Bayreuth' }]]),
    };
    assert.equal(placeLabelFor(fake, { '@id': 'x' }), 'Bayreuth');
  });

  test('ohne verortete Annotation zählt der erste Record-Ort', () => {
    const fake = { recordToEvents: new Map(), mobilityEvents: new Map() };
    const record = { '@id': 'x', 'rico:hasOrHadLocation': [{ name: 'Zürich' }, { name: 'Graz' }] };
    assert.equal(placeLabelFor(fake, record), 'Zürich');
  });
});
