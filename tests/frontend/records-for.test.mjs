/**
 * `recordsFor` ist die einzige Aufloesung von Filter zu Dokumentmenge.
 *
 * Vor diesem Schritt loeste jede Ansicht ihre Facetten selbst auf, in fuenf
 * getrennten Fassungen (Bestand/Chronik, Verknuepfungen, Statistik, Karte,
 * Netzwerk). Die stillen Defekte, gegen die diese Datei steht:
 *
 *   * Zwei Ansichten zeigen zum selben Filter verschiedene Mengen, weil ihre
 *     Aufloesungen auseinandergelaufen sind.
 *   * Die Mehrfachauswahl schneidet statt zu vereinigen.
 *   * Das Zeitfenster tilgt die undatierten Dokumente, statt sie stehen zu
 *     lassen (E-88).
 *   * Der enge Schaerfegrad wird angewendet, ohne die Differenz zu nennen.
 *
 * Der lexikalische Gate am Ende haelt die fuenf Eigenaufloesungen fern: kein
 * Modul unter `docs/js/views/` darf eine Entitaetsfacette noch selbst ueber
 * `store.persons.get(` und Geschwister aufloesen.
 *
 * Lauf: node --test tests/frontend/records-for.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { recordsFor, facetIndex, facetInventory } from '../../docs/js/data/records-for.js';
import { storeFromShipped } from './_shipped.mjs';

// --- Miniatur-Store -------------------------------------------------------

function S(...ids) { return new Set(ids); }

/**
 * Vier Records: r1 (1952, Bayreuth, Tristan, ereignisbelegt), r2 (1953,
 * Bayreuth), r3 (1960, Wien), r4 (undatiert, ohne Entitaet).
 */
function makeStore() {
  const rec = (id, date) => (date ? { '@id': id, 'rico:date': date } : { '@id': id });
  const records = new Map([
    ['r1', rec('r1', '1952-07-25')],
    ['r2', rec('r2', '1953')],
    ['r3', rec('r3', '1960')],
    ['r4', rec('r4', null)],
  ]);
  return {
    records,
    allRecords: [...records.values()],
    recordDatings: new Map(),
    persons: new Map([
      ['Malaniuk, Ira', { records: S('r1', 'r2', 'r3'), roles: S() }],
      ['Wagner, Wieland', { records: S('r1', 'r2'), roles: S() }],
      ['Spaetling, Egon', { records: S('r3'), roles: S() }],
    ]),
    locations: new Map([
      ['Bayreuth', { records: S('r1', 'r2'), roles: S() }],
      ['Wien', { records: S('r3'), roles: S() }],
    ]),
    works: new Map([
      ['Tristan und Isolde', { records: S('r1'), komponist: 'Wagner, Richard' }],
    ]),
    organizations: new Map([
      ['Bayreuther Festspiele', { records: S('r2'), roles: S() }],
    ]),
    ensembles: new Map([
      ['Der Festspielchor', { records: S('r2'), wikidata: null }],
    ]),
    recordsByAgentRole: new Map([
      ['m3gim-vocab:singer', S('r1', 'r2')],
      ['m3gim-vocab:mentioned', S('r3')],
    ]),
    eventsByRole: new Map([['m3gim-vocab:performance', S('r1')]]),
    recordToAnnotations: new Map([['r1', ['a1']]]),
    annotations: new Map([['a1', { id: 'a1', cluster: 'performativ' }]]),
    recordToEvents: new Map([['r1', ['a1']]]),
    recordToPerformances: new Map(),
    finances: new Map(),
    roleVocab: new Map([
      ['m3gim-vocab:singer', { id: 'm3gim-vocab:singer', label: 'sänger' }],
      ['m3gim-vocab:mentioned', { id: 'm3gim-vocab:mentioned', label: 'erwähnt' }],
      ['m3gim-vocab:performance', { id: 'm3gim-vocab:performance', label: 'aufführung' }],
    ]),
  };
}

const idsOf = (res) => [...res.ids].sort();

// --- Schnitt --------------------------------------------------------------

describe('recordsFor (eine Auflösung fuer alle Ansichten)', () => {
  test('ohne Filter bleibt der ganze Bestand', () => {
    const r = recordsFor(makeStore(), {});
    assert.deepEqual(idsOf(r), ['r1', 'r2', 'r3', 'r4']);
    assert.equal(r.weit, 4);
  });

  test('eine Facette schneidet', () => {
    const r = recordsFor(makeStore(), { ort: ['Bayreuth'] });
    assert.deepEqual(idsOf(r), ['r1', 'r2']);
  });

  test('zwei Werte einer Facette wirken als ODER', () => {
    const r = recordsFor(makeStore(), { ort: ['Bayreuth', 'Wien'] });
    assert.deepEqual(idsOf(r), ['r1', 'r2', 'r3'], (
      'Die Mehrfachauswahl vereinigt; zwei Orte duerfen nicht weniger ergeben '
      + 'als jeder einzelne.'
    ));
  });

  test('zwei Facetten wirken als UND', () => {
    const r = recordsFor(makeStore(), { ort: ['Bayreuth'], werk: ['Tristan und Isolde'] });
    assert.deepEqual(idsOf(r), ['r1']);
  });

  test('ein unbekannter Wert entwertet die Facette nicht', () => {
    const r = recordsFor(makeStore(), { ort: ['Bayreuth', 'Atlantis'] });
    assert.deepEqual(idsOf(r), ['r1', 'r2']);
  });

  test('ausschliesslich unbekannte Werte ergeben die leere Menge', () => {
    const r = recordsFor(makeStore(), { ort: ['Atlantis'] });
    assert.deepEqual(idsOf(r), [], (
      'Eine Facette, deren Werte nichts treffen, muss leer liefern statt alles '
      + 'durchzulassen.'
    ));
  });

  test('ein String aus einer Altstelle wirkt wie die einelementige Liste', () => {
    const r = recordsFor(makeStore(), { ort: 'Bayreuth' });
    assert.deepEqual(idsOf(r), ['r1', 'r2']);
  });

  test('das Zeitfenster laesst undatierte Records durch (E-88)', () => {
    const r = recordsFor(makeStore(), { zeitfenster: [1950, 1955] });
    assert.deepEqual(idsOf(r), ['r1', 'r2', 'r4']);
    assert.equal(r.undatiert, 1, 'die undatierte Menge wird beziffert, nicht getilgt');
  });

  test('schaerfe eng schneidet auf die belegten Records und nennt die Differenz', () => {
    const weit = recordsFor(makeStore(), {});
    assert.equal(weit.eng, 1, 'auch im weiten Modus steht die enge Zahl daneben');
    const eng = recordsFor(makeStore(), { schaerfe: 'eng' });
    assert.deepEqual(idsOf(eng), ['r1']);
    assert.equal(eng.weit, 4);
    assert.equal(eng.eng, 1);
  });

  test('opts.base engt die Startmenge ein', () => {
    const r = recordsFor(makeStore(), {}, { base: new Set(['r1', 'r3']) });
    assert.deepEqual(idsOf(r), ['r1', 'r3']);
  });

  test('byFacet beziffert jede aktive Facette einzeln', () => {
    const r = recordsFor(makeStore(), { ort: ['Bayreuth'], werk: ['Tristan und Isolde'] });
    assert.equal(r.byFacet.ort, 2, 'Ort allein traegt zwei Dokumente');
    assert.equal(r.byFacet.werk, 1);
    assert.equal(r.byFacet.person, undefined, 'inaktive Facetten erscheinen nicht');
  });

  test('Rolle und Ereignis schneiden ueber die neuen Indizes', () => {
    assert.deepEqual(idsOf(recordsFor(makeStore(), { rolle: ['m3gim-vocab:singer'] })),
      ['r1', 'r2']);
    assert.deepEqual(idsOf(recordsFor(makeStore(), { ereignis: ['m3gim-vocab:performance'] })),
      ['r1']);
    assert.deepEqual(idsOf(recordsFor(makeStore(), { institution: ['Bayreuther Festspiele'] })),
      ['r2']);
    assert.deepEqual(idsOf(recordsFor(makeStore(), { ensemble: ['Der Festspielchor'] })),
      ['r2']);
    assert.deepEqual(idsOf(recordsFor(makeStore(), { sicht: ['performativ'] })), ['r1']);
  });
});

describe('facetIndex / facetInventory', () => {
  test('facetIndex liefert Wert -> Record-Ids', () => {
    const idx = facetIndex(makeStore(), 'ort');
    assert.deepEqual([...idx.get('Bayreuth')].sort(), ['r1', 'r2']);
  });

  test('eine unbekannte Facette liefert eine leere Map statt zu werfen', () => {
    assert.equal(facetIndex(makeStore(), 'gibtsnicht').size, 0);
    assert.deepEqual(facetInventory(makeStore(), 'gibtsnicht'), []);
  });

  test('facetInventory sortiert absteigend und zaehlt groesser null', () => {
    const inv = facetInventory(makeStore(), 'person');
    assert.deepEqual(inv.map(e => e.value), ['Malaniuk, Ira', 'Wagner, Wieland', 'Spaetling, Egon']);
    assert.ok(inv.every(e => e.count > 0));
    assert.ok(inv.every(e => typeof e.label === 'string' && e.label.length > 0));
  });

  test('Rollen tragen ihr Anzeigelabel aus dem Vokabular (E-143)', () => {
    const inv = facetInventory(makeStore(), 'rolle');
    const singer = inv.find(e => e.value === 'm3gim-vocab:singer');
    assert.equal(singer.label, 'sänger');
  });
});

// --- Fixture-Strecke ------------------------------------------------------

describe('recordsFor am ausgelieferten Datensatz', () => {
  test('1954 und Bayreuth und Tristan liefert den Beispielschnitt', async () => {
    const store = await storeFromShipped();
    const cut = recordsFor(store, {
      zeitfenster: [1954, 1954],
      ort: ['Bayreuth'],
      werk: ['Tristan und Isolde'],
    });
    assert.ok(cut.ids.size >= 5, (
      `Der Beispielschnitt traegt nicht mehr; gefunden ${cut.ids.size} Dokumente.`
    ));
    const mitwirkende = new Set();
    for (const [name, entry] of store.persons) {
      for (const id of cut.ids) if (entry.records.has(id)) { mitwirkende.add(name); break; }
    }
    assert.ok(mitwirkende.has('Malaniuk, Ira'));
    assert.ok(mitwirkende.has('Wagner, Wieland'));
  });

  test('ohne Jahresfacette bleibt der Schnitt echt groesser', async () => {
    const store = await storeFromShipped();
    const eng = recordsFor(store, {
      zeitfenster: [1954, 1954], ort: ['Bayreuth'], werk: ['Tristan und Isolde'],
    });
    const weit = recordsFor(store, { ort: ['Bayreuth'], werk: ['Tristan und Isolde'] });
    assert.ok(weit.ids.size > eng.ids.size);
  });
});

// --- Lexikalischer Gate ---------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const VIEWS = join(HERE, '..', '..', 'docs', 'js', 'views');

// Die drei Entitaets-Maps, deren Direktzugriff eine zweite Facettenaufloesung
// bedeutet. `store.persons.get(` in einem View heisst: dort entsteht wieder
// eine eigene Filterlogik neben recordsFor.
const OWN_RESOLUTION = /store\.(persons|locations|works|organizations)\.get\(/;

describe('Kein View loest eine Entitaetsfacette selbst auf', () => {
  const sources = readdirSync(VIEWS)
    .filter(n => n.endsWith('.js'))
    .map(n => ({ name: n, text: readFileSync(join(VIEWS, n), 'utf8') }));

  test('die Ansichten sind auffindbar (der Gate hat seinen Gegenstand)', () => {
    assert.ok(sources.length > 5);
  });

  test('kein View greift direkt in eine Entitaets-Map', () => {
    const offenders = sources
      .filter(v => OWN_RESOLUTION.test(v.text))
      .map(v => v.name);
    assert.deepEqual(offenders, [], (
      'Diese Module loesen eine Entitaetsfacette selbst auf, statt recordsFor '
      + 'zu nutzen. Damit kehrt die Lage zurueck, in der zwei Ansichten zum '
      + 'selben Filter verschiedene Mengen zeigen: ' + offenders.join(', ')
    ));
  });
});
