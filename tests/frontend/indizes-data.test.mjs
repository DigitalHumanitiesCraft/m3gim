/**
 * Die Datenschicht der Indizes: Einträge, Suche und der Schnitt auf die
 * Dokumentmenge der Sidebar.
 *
 * Die vier Register lesen aus je einer Store-Map und zeigen nur Einträge mit
 * belegten Dokumenten. Darüber liegen zwei Schnitte: der geteilte Filter als
 * Dokumentmenge und die Freitextsuche über die Felder des jeweiligen Registers.
 * Die Normdaten-Schalter sind mit E-230 entfallen. Umfeld, Sortierung und
 * Bühnenrollen prüft `indizes-register.test.mjs`.
 *
 * Die stillen Defekte, gegen die diese Datei steht:
 *
 *   * Ein Eintrag ohne verknüpfte Dokumente steht im Index und führt beim Klick
 *     ins Leere.
 *   * Der Schnitt auf die Dokumentmenge lässt Einträge stehen, die kein
 *     Dokument des Schnitts belegen.
 *   * Die AgRelOn-Beziehungen aus Pass 2.5 des Loaders werden beim Bau der
 *     Einträge nicht durchgereicht; die Beziehungsbadges im Personen-Grid
 *     bleiben dann toter Code, ohne dass etwas fehlschlägt.
 *
 * Lauf: node --test tests/frontend/indizes-data.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  getGridEntries, clearEntriesCache, entriesWithRecordsIn, filterEntries,
} from '../../docs/js/views/indizes-data.js';
import { storeFromShipped } from './_shipped.mjs';

// Kleine Fixture in der Form, die loader.js aufbaut: Name -> { records, … }.
const entry = (ids, extra = {}) => ({ records: new Set(ids), ...extra });

const STORE = {
  persons: new Map([
    ['Malaniuk, Ira', entry(['r1', 'r2', 'r3'], { kategorie: 'Sängerin', wikidata: 'wd:Q84509' })],
    ['Karajan, Herbert von', entry(['r1'], { kategorie: 'Dirigent', wikidata: 'wd:Q154556',
      relations: [{ type: 'agrelon:HasCorrespondent', recordId: 'r1', objectName: 'Karajan, Herbert von' }] })],
    ['Unbekannt, N.', entry(['r3'], { kategorie: 'Andere', wikidata: null })],
    ['Ohne Beleg', entry([], { kategorie: 'Andere', wikidata: 'wd:Q1' })],
  ]),
  organizations: new Map([
    ['Bayreuther Festspiele', entry(['r1'], { wikidata: 'wd:Q157043' })],
    ['Oper Graz', entry(['r2', 'r3'], { wikidata: '' })],
  ]),
  locations: new Map([
    ['Bayreuth', entry(['r1'], { wikidata: 'wd:Q2861' })],
    ['Graz', entry(['r2', 'r3'], { wikidata: 'wd:Q13298' })],
  ]),
  works: new Map([
    ['Die Walküre', entry(['r1'], { komponist: 'Wagner, Richard', wikidata: 'wd:Q186416' })],
    ['Carmen', entry(['r2'], { komponist: 'Bizet, Georges', wikidata: null })],
  ]),
};

const namesOf = (entries) => entries.map(e => e.name);

describe('getGridEntries', () => {
  test('nur Eintraege mit verknuepften Dokumenten', () => {
    clearEntriesCache();
    const names = namesOf(getGridEntries(STORE, 'personen'));
    assert.ok(!names.includes('Ohne Beleg'),
      'Ein Eintrag ohne Dokumente fuehrt beim Klick ins Leere und gehoert nicht in den Index.');
    assert.deepEqual(names, ['Malaniuk, Ira', 'Karajan, Herbert von', 'Unbekannt, N.']);
  });

  test('count ist die Zahl der belegenden Dokumente', () => {
    clearEntriesCache();
    const malaniuk = getGridEntries(STORE, 'personen').find(e => e.name === 'Malaniuk, Ira');
    assert.equal(malaniuk.count, 3);
  });

  test('die Liste ist memoisiert und wird beim Store-Wechsel verworfen', () => {
    clearEntriesCache();
    const first = getGridEntries(STORE, 'werke');
    assert.equal(getGridEntries(STORE, 'werke'), first, 'derselbe Aufruf materialisiert nicht neu');
    clearEntriesCache();
    assert.notEqual(getGridEntries(STORE, 'werke'), first);
  });
});

describe('Freitextsuche', () => {
  test('Personen werden ausschließlich über ihre Quellenbezeichnung gefunden', () => {
    clearEntriesCache();
    const all = getGridEntries(STORE, 'personen');
    assert.deepEqual(namesOf(filterEntries(all, 'personen', { q: 'malaniuk' })), ['Malaniuk, Ira']);
    assert.deepEqual(namesOf(filterEntries(all, 'personen', { q: 'dirigent' })), []);
  });

  test('Werke werden auch ueber den Komponisten gefunden', () => {
    clearEntriesCache();
    const all = getGridEntries(STORE, 'werke');
    assert.deepEqual(namesOf(filterEntries(all, 'werke', { q: 'bizet' })), ['Carmen']);
  });

  test('ein leerer Suchterm schneidet nicht', () => {
    clearEntriesCache();
    const all = getGridEntries(STORE, 'orte');
    assert.equal(filterEntries(all, 'orte', { q: '' }).length, all.length);
    assert.equal(filterEntries(all, 'orte', {}).length, all.length);
  });

  test('ein Treffer ohne Entsprechung liefert die leere Liste', () => {
    clearEntriesCache();
    const all = getGridEntries(STORE, 'orte');
    assert.deepEqual(filterEntries(all, 'orte', { q: 'lissabon' }), []);
  });
});

describe('Schnitt auf die Dokumentmenge', () => {
  const cut = new Set(['r1']);

  test('nur Eintraege mit einem Dokument im Schnitt bleiben stehen', () => {
    clearEntriesCache();
    const persons = entriesWithRecordsIn(getGridEntries(STORE, 'personen'), cut);
    assert.deepEqual(namesOf(persons), ['Malaniuk, Ira', 'Karajan, Herbert von']);
  });

  test('ohne Schnitt bleibt die Liste unveraendert', () => {
    clearEntriesCache();
    const all = getGridEntries(STORE, 'werke');
    assert.equal(entriesWithRecordsIn(all, null), all);
  });

  test('ein Schnitt ohne Ueberschneidung leert das Register', () => {
    clearEntriesCache();
    assert.deepEqual(entriesWithRecordsIn(getGridEntries(STORE, 'werke'), new Set(['r9'])), []);
  });
});

describe('AgRelOn-Beziehungen', () => {
  test('die Relationen des Personen-Index erreichen den Eintrag', () => {
    clearEntriesCache();
    const karajan = getGridEntries(STORE, 'personen').find(e => e.name === 'Karajan, Herbert von');
    assert.equal(karajan.relations.length, 1,
      'Ohne Durchreichen bleiben die Beziehungsbadges toter Code.');
    assert.equal(karajan.relations[0].type, 'agrelon:HasCorrespondent');
  });

  test('eine Person ohne Beziehungen traegt null statt undefined', () => {
    clearEntriesCache();
    const malaniuk = getGridEntries(STORE, 'personen').find(e => e.name === 'Malaniuk, Ira');
    assert.equal(malaniuk.relations, null);
  });

  test('im ausgelieferten Datenstand werden keine Beziehungen aus Namen erzeugt', async () => {
    const store = await storeFromShipped();
    clearEntriesCache();
    const entries = getGridEntries(store, 'personen');
    const mitRelation = entries.filter(e => e.relations && e.relations.length > 0);
    // Der Datenstand fuehrt 35 solche Personen mit 61 Belegen; die Schwelle
    // faengt den Totalausfall, nicht die normale Drift des Bestands.
    assert.equal(mitRelation.length, 0);
    assert.ok(mitRelation.every(e => e.relations.every(r => r.type && r.recordId)),
      'Jede Relation braucht Typ und Beleg-Record fuer den Badge und seinen Sprung.');
    clearEntriesCache();
  });
});
