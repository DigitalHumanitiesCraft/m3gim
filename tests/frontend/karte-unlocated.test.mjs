/**
 * No place of the Karte vanishes silently (F4).
 *
 * The map draws only Belege with coordinates. The silent defect this file
 * stands against: a place without a coordinate fell out of the nodes and the
 * view said nowhere that it exists. The invariant checked against the shipped
 * dataset is that the drawn places and the places listed beside the map are
 * together every place the Karte knows at all, and that the two do not overlap.
 *
 * Run: node --test tests/frontend/karte-unlocated.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import { buildOccurrences, hasGeo, groupPlaces }
  from '../../docs/js/views/karte-data.js';
import { cityOf } from '../../docs/js/utils/format.js';
import { storeFromShipped } from './_shipped.mjs';

const key = place => cityOf(place).toLowerCase();

let store = null;
let occ = null;

before(async () => {
  store = await storeFromShipped();
  occ = buildOccurrences(store);
});

describe('Ortsliste ohne Kartenpunkt am ausgelieferten Datensatz', () => {
  test('gezeichnete und ausgewiesene Orte ergeben zusammen alle Orte der Karte', () => {
    const all = new Set(occ.map(o => key(o.place)));
    const drawn = new Set(occ.filter(hasGeo).map(o => key(o.place)));
    const listed = new Set(groupPlaces(occ).filter(group => !group.located).map(r => r.city.toLowerCase()));

    // Minimum sizes, so the equality does not hold over empty sets. The list
    // gets no lower bound: it is meant to shrink as the reconciliation resolves
    // further places.
    assert.ok(all.size >= 50, `zu wenige Orte im Datensatz: ${all.size}`);
    assert.ok(drawn.size >= 20, `zu wenige gezeichnete Orte: ${drawn.size}`);

    assert.deepEqual([...new Set([...drawn, ...listed])].sort(), [...all].sort());
    const both = [...drawn].filter(k => listed.has(k));
    assert.deepEqual(both, [], `Ort zugleich gezeichnet und ausgewiesen: ${both}`);
  });

  test('jede Zeile traegt eine Dokumentzahl und einen Ort, den die Ort-Facette kennt', () => {
    const rows = groupPlaces(occ).filter(group => !group.located);
    assert.ok(rows.length > 0, 'der Test hat keinen Gegenstand mehr');
    for (const row of rows) {
      assert.ok(row.records.size >= 1, `${row.city} ohne Dokument`);
      // The jump of the row writes the place into the shared ort facet. A place
      // absent there would lead the row into an empty result set.
      assert.ok(store.locations.has(row.city),
        `${row.city} ist kein Wert der Ort-Facette`);
    }
  });

  test('Aufgabe 9: jeder Ort der Prüfrecords ist gezeichnet oder ausgewiesen', () => {
    const listed = new Set(groupPlaces(occ).filter(group => !group.located).map(r => r.city.toLowerCase()));
    const drawn = new Set(occ.filter(hasGeo).map(o => key(o.place)));
    // UAKUG/NIM_023 5 (Wuppertal, without coordinates) and a record of the
    // Wagner family carrying both situations at once, Muenchen located and the
    // Prinzregententheater not.
    for (const id of ['m3gim-data:NIM_023_5', 'm3gim-data:NIM_004_6']) {
      const places = occ.filter(o => o.recordId === id);
      assert.ok(places.length > 0, `${id} traegt keinen Ortsbeleg`);
      for (const o of places) {
        assert.ok(drawn.has(key(o.place)) || listed.has(key(o.place)),
          `${id}: ${o.place} steht weder auf der Karte noch in der Liste`);
      }
    }
  });
});
