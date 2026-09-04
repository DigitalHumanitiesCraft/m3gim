/**
 * Ein Sprung, der einen Datensatz benennt, muss ihn zeigen.
 *
 * Die Bestandsansicht oeffnet mit der Stand-Voreinstellung (abgeschlossen,
 * begonnen). Ein Deep Link oder ein Sprung aus Karte, Netzwerk oder Indizes auf
 * einen zurueckgestellten Datensatz oder einen ohne Angabe fiel damit unter den
 * Schnitt: keine Zeile, kein Detail, kein Hinweis. `widenFilterForRecord`
 * weitet den Schnitt minimal, statt ihn fallenzulassen.
 *
 * Lauf: node --test tests/frontend/bestand-deeplink.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { widenFilterForRecord, filterBySharedState, searchMatchBestand }
  from '../../docs/js/views/_bestand-filter.js';
import { STAND_DEFAULT, baseIds } from '../../docs/js/data/records-for.js';
import { storeFromShipped } from './_shipped.mjs';

const store = await storeFromShipped();

/** Ob der Datensatz unter diesem Schnitt eine Zeile bekaeme. */
function visible(shared, recordId) {
  const record = store.records.get(recordId);
  const items = filterBySharedState(store, [{ record }], shared, {
    getRecord: (it) => it.record,
    searchMatch: (r, q) => searchMatchBestand(r, q, store),
  });
  return items.length === 1;
}

/** Ein Datensatz des Bestands mit diesem Bearbeitungsstand. */
function recordWithStand(status) {
  const base = baseIds(store);
  const hit = store.allRecords.find(r => base.has(r['@id'])
    && (r['m3gim-ontology:processingStatus'] || null) === status);
  assert.ok(hit, `der Datensatz traegt den Stand ${status}`);
  return hit['@id'];
}

const DEFAULT_CUT = { stand: [...STAND_DEFAULT] };

describe('Stand-Voreinstellung', () => {
  test('ein zurueckgestellter Datensatz wird hereingeholt', () => {
    const id = recordWithStand('zurueckgestellt');
    assert.equal(visible(DEFAULT_CUT, id), false, 'ohne Weitung faellt er heraus');

    const { patch, blocked } = widenFilterForRecord(store, id, DEFAULT_CUT);
    assert.deepEqual(patch.stand, [...STAND_DEFAULT, 'zurueckgestellt']);
    assert.deepEqual(blocked, []);
    assert.equal(visible({ ...DEFAULT_CUT, ...patch }, id), true);
  });

  test('ein Datensatz ohne Angabe wird hereingeholt', () => {
    const id = recordWithStand(null);
    assert.equal(visible(DEFAULT_CUT, id), false);

    const { patch } = widenFilterForRecord(store, id, DEFAULT_CUT);
    assert.deepEqual(patch.stand, [...STAND_DEFAULT, 'ohne-angabe']);
    assert.equal(visible({ ...DEFAULT_CUT, ...patch }, id), true);
  });

  test('ein Datensatz im Schnitt weitet nichts', () => {
    const id = recordWithStand('abgeschlossen');
    const { patch, blocked } = widenFilterForRecord(store, id, DEFAULT_CUT);
    assert.deepEqual(patch, {});
    assert.deepEqual(blocked, []);
  });
});

describe('Die uebrigen Facetten', () => {
  test('eine mitlaufende Facette faellt nicht weg', () => {
    const id = recordWithStand('zurueckgestellt');
    const record = store.records.get(id);
    // Ein Ort, den der Datensatz selbst traegt: die Ortsfacette blockiert
    // nicht, sie muss trotzdem im Schnitt bleiben.
    const ort = [...store.locations].find(([, entry]) => entry.records.has(id))?.[0];
    assert.ok(ort, `${record['rico:identifier']} traegt einen Ort`);

    const shared = { ...DEFAULT_CUT, ort: [ort] };
    const { patch } = widenFilterForRecord(store, id, shared);
    assert.equal(patch.ort, undefined, 'die nicht blockierende Facette bleibt unberuehrt');
    assert.equal(visible({ ...shared, ...patch }, id), true);
  });

  test('eine blockierende Entitaetsfacette wird um einen eigenen Wert geweitet', () => {
    const id = recordWithStand('zurueckgestellt');
    const fremd = [...store.locations.keys()].find(
      name => !store.locations.get(name).records.has(id));
    const shared = { ...DEFAULT_CUT, ort: [fremd] };
    assert.equal(visible(shared, id), false);

    const { patch, blocked } = widenFilterForRecord(store, id, shared);
    assert.deepEqual(blocked, []);
    assert.equal(patch.ort[0], fremd, 'der gewaehlte Ort bleibt stehen');
    assert.equal(patch.ort.length, 2, 'genau ein Wert kommt hinzu');
    assert.equal(visible({ ...shared, ...patch }, id), true);
  });

  test('eine Facette ohne eigenen Wert wird gemeldet statt still uebergangen', () => {
    const base = baseIds(store);
    const ohnePerson = store.allRecords.find(r => base.has(r['@id'])
      && ![...store.persons.values()].some(e => e.records.has(r['@id'])));
    assert.ok(ohnePerson, 'es gibt einen Datensatz ohne Person');
    const person = [...store.persons.keys()][0];

    const { patch, blocked } = widenFilterForRecord(
      store, ohnePerson['@id'], { person: [person] });
    assert.equal(patch.person, undefined);
    assert.deepEqual(blocked, ['person']);
  });

  test('das Zeitfenster wird auf das Jahr des Datensatzes ausgedehnt', () => {
    const id = recordWithStand('zurueckgestellt');
    const { patch } = widenFilterForRecord(
      store, id, { ...DEFAULT_CUT, zeitfenster: [1919, 1920] });
    assert.ok(Array.isArray(patch.zeitfenster), 'das Fenster wird geweitet');
    assert.equal(patch.zeitfenster[0], 1919);
    assert.ok(patch.zeitfenster[1] > 1920);
  });
});
