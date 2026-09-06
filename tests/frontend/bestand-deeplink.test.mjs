/**
 * Ein Sprung, der einen Datensatz benennt, muss ihn zeigen.
 *
 * Steht ein Schnitt, faellt ein Deep Link oder ein Sprung aus Karte, Netzwerk
 * oder Indizes auf einen Datensatz ausserhalb dieses Schnitts ins Leere: keine
 * Zeile, kein Detail, kein Hinweis. `widenFilterForRecord` weitet den Schnitt
 * minimal, statt ihn fallenzulassen. Der Beispielschnitt lief bis E-262 ueber
 * den Erschliessungsstand; er laeuft jetzt ueber die Verknuepfungsrolle, die
 * dieselbe Eigenschaft hat, naemlich dass ein Datensatz sie tragen kann oder
 * auch nicht.
 *
 * Lauf: node --test tests/frontend/bestand-deeplink.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { widenFilterForRecord, filterBySharedState }
  from '../../docs/js/views/_bestand-filter.js';
import { recordMatchesSearch } from '../../docs/js/data/records-for.js';
import { baseIds, recordsFor } from '../../docs/js/data/records-for.js';
import { storeFromShipped } from './_shipped.mjs';

const store = await storeFromShipped();

/** Ob der Datensatz unter diesem Schnitt eine Zeile bekaeme. */
function visible(shared, recordId) {
  const record = store.records.get(recordId);
  const items = filterBySharedState(store, [{ record }], shared, {
    getRecord: (it) => it.record,
    searchMatch: (r, q) => recordMatchesSearch(store, r, q),
  });
  return items.length === 1;
}

/** Der gewaehlte Schnitt der Beispiele: die Dokumente mit einer
 *  Werkverknuepfung, eine geschlossene und gut belegte Achse. */
const DEFAULT_CUT = { verknuepfung: ['werk'] };

/** Ein Datensatz der Grundmenge innerhalb oder ausserhalb dieses Schnitts. */
function recordInCut(inside) {
  const base = baseIds(store);
  const werke = recordsFor(store, DEFAULT_CUT).ids;
  const hit = store.allRecords.find(r => base.has(r['@id'])
    && werke.has(r['@id']) === inside);
  assert.ok(hit, `es gibt einen Datensatz ${inside ? 'im' : 'ausserhalb des'} Schnitts`);
  return hit['@id'];
}

describe('Gewaehlte Verknuepfungsachse', () => {
  test('ein Datensatz ausserhalb des Schnitts wird hereingeholt', () => {
    const id = recordInCut(false);
    assert.equal(visible(DEFAULT_CUT, id), false, 'ohne Weitung faellt er heraus');

    const { patch, blocked } = widenFilterForRecord(store, id, DEFAULT_CUT);
    assert.deepEqual(blocked, []);
    assert.equal(patch.verknuepfung[0], 'werk', 'die gewaehlte Achse bleibt stehen');
    assert.equal(patch.verknuepfung.length, 2, 'genau ein Wert kommt hinzu');
    assert.equal(visible({ ...DEFAULT_CUT, ...patch }, id), true);
  });

  test('ein Datensatz im Schnitt weitet nichts', () => {
    const id = recordInCut(true);
    const { patch, blocked } = widenFilterForRecord(store, id, DEFAULT_CUT);
    assert.deepEqual(patch, {});
    assert.deepEqual(blocked, []);
  });
});

describe('Die uebrigen Facetten', () => {
  test('eine mitlaufende Facette faellt nicht weg', () => {
    const id = recordInCut(false);
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
    const id = recordInCut(false);
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
    const id = recordInCut(false);
    const { patch } = widenFilterForRecord(
      store, id, { ...DEFAULT_CUT, zeitfenster: [1919, 1920] });
    assert.ok(Array.isArray(patch.zeitfenster), 'das Fenster wird geweitet');
    assert.equal(patch.zeitfenster[0], 1919);
    assert.ok(patch.zeitfenster[1] > 1920);
  });
});
