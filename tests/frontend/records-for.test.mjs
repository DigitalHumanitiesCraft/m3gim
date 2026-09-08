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
 *   * Die raumzeitlich belegte Teilmenge wird als Schnitt angewendet, statt
 *     bloss beziffert zu werden (der Umschalter ist mit E-163 entfallen).
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

import {
  recordsFor, facetInventory, yearBounds, yearOf, baseRecords, FACET_KEYS,
} from '../../docs/js/data/records-for.js';
import { storeFromShipped } from './_shipped.mjs';

// --- Miniatur-Store -------------------------------------------------------

function S(...ids) { return new Set(ids); }

/**
 * Vier Records: r1 (1952, Bayreuth, Tristan, ereignisbelegt), r2 (1953,
 * Bayreuth), r3 (1960, Wien), r4 (undatiert, ohne Entitaet).
 */
function makeStore() {
  // Die Dokumentbasis haengt seit E-165 an der Verknuepfung, also an
  // unprocessedIds. Die Verknuepfungsformen am Record sind die des echten
  // Datensatzes, weil die Facette Verknuepfung sie an ihrer Gestalt erkennt.
  const place = (name, role, land) => ({
    name, '@type': 'rico:Place', role: { '@id': role },
    ...(land ? { 'm3gim-ontology:country': land } : {}),
  });
  const rec = (id, date, extra) => ({
    '@id': id, 'rico:identifier': id.toUpperCase(),
    ...(date ? { 'rico:date': date } : {}), ...extra,
  });
  const records = new Map([
    ['r1', rec('r1', '1952-07-25', {
      'rico:title': 'Böhm dirigiert Tristan',
      'rico:hasOrHadLocation': place('Bayreuth', 'm3gim-vocab:guestPerformance', 'Deutschland'),
      'rico:hasOrHadSubject': { name: 'Tristan und Isolde',
        '@type': 'm3gim-ontology:MusicalWork', role: { '@id': 'm3gim-vocab:performance' } },
      'm3gim-ontology:hasAssociatedAgent': { name: 'Wagner, Wieland',
        '@type': 'rico:Person', role: { '@id': 'm3gim-vocab:director' } },
    })],
    ['r2', rec('r2', '1953', {
      'rico:title': 'Festspielkorrespondenz',
      'rico:hasOrHadLocation': place('Bayreuth', 'm3gim-vocab:mentioned', 'Deutschland'),
      'm3gim-ontology:hasAssociatedAgent': { name: 'Bayreuther Festspiele',
        '@type': 'rico:CorporateBody', role: { '@id': 'm3gim-vocab:organizer' } },
    })],
    ['r3', rec('r3', '1960', {
      'rico:hasOrHadLocation': place('Wien', 'm3gim-vocab:dispatch', 'Österreich'),
    })],
    ['r4', rec('r4', null, {})],
  ]);
  return {
    records,
    allRecords: [...records.values()],
    unprocessedIds: new Set(),
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
    conceptDefinitions: new Map(),
    roleVocab: new Map([
      ['m3gim-vocab:singer', { id: 'm3gim-vocab:singer', label: 'sänger' }],
      ['m3gim-vocab:mentioned', { id: 'm3gim-vocab:mentioned', label: 'erwähnt' }],
      ['m3gim-vocab:performance', { id: 'm3gim-vocab:performance', label: 'aufführung' }],
      ['m3gim-vocab:guestPerformance', { id: 'm3gim-vocab:guestPerformance', label: 'gastspiel' }],
      ['m3gim-vocab:dispatch', { id: 'm3gim-vocab:dispatch', label: 'absendeort' }],
      ['m3gim-vocab:director', { id: 'm3gim-vocab:director', label: 'regisseur' }],
      ['m3gim-vocab:organizer', { id: 'm3gim-vocab:organizer', label: 'veranstalter' }],
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

  test('Suche und Facetten schneiden dieselbe Dokumentmenge', () => {
    assert.deepEqual(idsOf(recordsFor(makeStore(), { search: 'bohm tristan' })), ['r1']);
    assert.deepEqual(idsOf(recordsFor(makeStore(), {
      search: 'festspiel', ort: ['Bayreuth'], zeitfenster: [1950, 1955],
    })), ['r2']);
  });

  test('Suche erreicht Signatur und Datum', () => {
    assert.deepEqual(idsOf(recordsFor(makeStore(), { search: 'R3' })), ['r3']);
    assert.deepEqual(idsOf(recordsFor(makeStore(), { search: '1952-07' })), ['r1']);
  });

  test('Suche erreicht verknüpfte Entitätsnamen', () => {
    assert.deepEqual(idsOf(recordsFor(makeStore(), { search: 'wieland wagner' })), ['r1', 'r2']);
    assert.deepEqual(idsOf(recordsFor(makeStore(), { search: 'festspiele' })), ['r2']);
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

  test('die belegte Teilmenge wird beziffert, nicht geschnitten', () => {
    const r = recordsFor(makeStore(), {});
    assert.equal(r.weit, 4);
    assert.equal(r.eng, 1, 'die raumzeitlich belegte Zahl steht daneben');
    assert.deepEqual(idsOf(r), ['r1', 'r2', 'r3', 'r4'], (
      'Seit E-163 engt der Schaerfegrad nichts mehr ein; er bleibt eine Angabe.'
    ));
  });

  test('der Erschliessungsstand schneidet nicht mehr (E-262)', () => {
    const store = makeStore();
    store.records.get('r2')['m3gim-ontology:processingStatus'] = 'begonnen';
    assert.deepEqual(idsOf(recordsFor(store, { stand: ['abgeschlossen'] })),
      ['r1', 'r2', 'r3', 'r4'],
      'Der Bearbeitungsstand ist keine Achse des Filters mehr.');
    assert.ok(!FACET_KEYS.includes('stand'));
    assert.deepEqual(facetInventory(store, 'stand'), []);
  });

  test('ein Record ohne Verknuepfung liegt ausserhalb jeder Dokumentmenge', () => {
    // E-165: die Basis ist die Verknuepfung. Ein Record ohne jede Verknuepfung
    // wird nicht ausgegraut gezeigt, er kommt in keiner Ansicht und in keinem
    // Zaehlstand vor.
    const store = makeStore();
    store.unprocessedIds = new Set(['r3']);
    assert.deepEqual(idsOf(recordsFor(store, {})), ['r1', 'r2', 'r4']);
    assert.deepEqual(baseRecords(store).map(r => r['@id']), ['r1', 'r2', 'r4']);
    assert.ok(!facetInventory(store, 'ort').some(e => e.value === 'Wien'), (
      'Ein Wert, den nur ein Record ausserhalb der Basis traegt, ist keine Facette.'
    ));
  });

  test('Verknuepfungstyp und Rolle schneiden ueber dieselbe Achse', () => {
    const store = makeStore();
    assert.deepEqual(idsOf(recordsFor(store, { verknuepfung: ['ort'] })),
      ['r1', 'r2', 'r3'], 'Der Typ meint jede seiner Rollen.');
    assert.deepEqual(idsOf(recordsFor(store,
      { verknuepfung: ['ort:m3gim-vocab:guestPerformance'] })), ['r1']);
    assert.deepEqual(idsOf(recordsFor(store,
      { verknuepfung: ['ort:m3gim-vocab:guestPerformance', 'ort:m3gim-vocab:dispatch'] })),
      ['r1', 'r3'], 'Zwei Rollen wirken als ODER wie in jeder Facette.');
    assert.deepEqual(idsOf(recordsFor(store, { verknuepfung: ['institution'] })), ['r2']);
    assert.deepEqual(idsOf(recordsFor(store, { verknuepfung: ['werk'] })), ['r1']);
  });

  test('das Land schneidet ueber die verorteten Orte, jede Rolle zaehlt', () => {
    const store = makeStore();
    assert.deepEqual(idsOf(recordsFor(store, { land: ['Deutschland'] })), ['r1', 'r2'], (
      'r2 nennt Bayreuth nur, und die Nennung zaehlt mit: die Facette schliesst '
      + 'keine Ortsrolle still aus.'
    ));
    assert.deepEqual(idsOf(recordsFor(store, { land: ['Österreich'] })), ['r3']);
    assert.deepEqual(idsOf(recordsFor(store, { land: ['Deutschland', 'Österreich'] })),
      ['r1', 'r2', 'r3']);
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

  test('Ereignis, Institution und Ensemble schneiden ueber ihre Indizes', () => {
    assert.deepEqual(idsOf(recordsFor(makeStore(), { ereignis: ['m3gim-vocab:performance'] })),
      ['r1']);
    assert.deepEqual(idsOf(recordsFor(makeStore(), { institution: ['Bayreuther Festspiele'] })),
      ['r2']);
    assert.deepEqual(idsOf(recordsFor(makeStore(), { ensemble: ['Der Festspielchor'] })),
      ['r2']);
  });

  test('die Mobilitaetssicht ist keine Achse des Filters mehr', () => {
    assert.ok(!FACET_KEYS.includes('sicht'));
    assert.deepEqual(idsOf(recordsFor(makeStore(), { sicht: ['performativ'] })),
      ['r1', 'r2', 'r3', 'r4'], 'Ein Schluessel ohne Achse schneidet nichts.');
  });
});

describe('yearBounds / yearOf', () => {
  test('die Spanne folgt den expliziten Dokumentdaten der Basis', () => {
    const store = makeStore();
    store.records.get('r1')['rico:date'] = '1947/1952';
    store.records.get('r3')['rico:date'] = 'ab 1968';
    assert.deepEqual(yearBounds(store), { min: 1947, max: 1968 });
  });

  test('das Datum eines Records ausserhalb der Dokumentbasis weitet die Spanne nicht', () => {
    const store = makeStore();
    const fremd = { '@id': 'rX', 'rico:date': '1912' };
    store.allRecords = [...store.allRecords, fremd];
    store.unprocessedIds = new Set(['rX']);
    assert.deepEqual(yearBounds(store), { min: 1952, max: 1960 });
  });

  test('ohne datierte Records bleibt die Spanne unbestimmt', () => {
    assert.deepEqual(yearBounds({ byYear: new Map() }), { min: null, max: null });
    assert.deepEqual(yearBounds(null), { min: null, max: null });
  });

  test('yearOf nimmt rico:date, null bei undatiert und ohne Record', () => {
    const store = makeStore();
    assert.equal(yearOf(store, store.records.get('r1')), 1952);
    assert.equal(yearOf(store, store.records.get('r4')), null);
    assert.equal(yearOf(store, null), null);
  });
});

describe('facetInventory', () => {
  test('ein Wert traegt die Zahl seiner Records', () => {
    const bayreuth = facetInventory(makeStore(), 'ort').find(e => e.value === 'Bayreuth');
    assert.equal(bayreuth.count, 2);
  });

  test('eine unbekannte Facette liefert eine leere Liste statt zu werfen', () => {
    assert.deepEqual(facetInventory(makeStore(), 'gibtsnicht'), []);
  });

  test('das Land traegt seinen Namen als Wert und als Anzeigeform', () => {
    const inv = facetInventory(makeStore(), 'land');
    assert.deepEqual(inv.map(e => [e.value, e.count]),
      [['Deutschland', 2], ['Österreich', 1]]);
    assert.ok(inv.every(e => e.label === e.value));
  });

  test('facetInventory sortiert absteigend und zaehlt groesser null', () => {
    const inv = facetInventory(makeStore(), 'person');
    assert.deepEqual(inv.map(e => e.value), ['Malaniuk, Ira', 'Wagner, Wieland', 'Spaetling, Egon']);
    assert.ok(inv.every(e => e.count > 0));
    assert.ok(inv.every(e => typeof e.label === 'string' && e.label.length > 0));
  });

  test('Vokabular-Facetten tragen ihr Anzeigelabel mit grossem Anfang, das Vokabular bleibt roh', () => {
    const store = makeStore();
    const inv = facetInventory(store, 'ereignis');
    const auffuehrung = inv.find(e => e.value === 'm3gim-vocab:performance');
    assert.equal(auffuehrung.label, 'Aufführung');
    assert.equal(store.roleVocab.get('m3gim-vocab:performance').label, 'aufführung');
  });
});

// --- Fixture-Strecke ------------------------------------------------------

describe('recordsFor am ausgelieferten Datensatz', () => {
  test('die gemeinsame Signatursuche liefert den bekannten Dokument-Cut', async () => {
    const store = await storeFromShipped();
    assert.equal(recordsFor(store, { search: 'nim_004' }).ids.size, 32);
  });

  test('die Basis ist genau die Menge der verknuepften Objekte', async () => {
    const store = await storeFromShipped();
    const erwartet = store.allRecords.filter(r => !store.unprocessedIds.has(r['@id']));
    assert.ok(erwartet.length > 100, 'Datenstand unplausibel klein, Lauf pruefen');
    assert.equal(baseRecords(store).length, erwartet.length);
    assert.equal(recordsFor(store, {}).ids.size, erwartet.length);
  });

  test('ein reiner Verguetungsbeleg gehoert zur ausgelieferten Basis', async () => {
    const store = await storeFromShipped();
    const id = 'm3gim-data:NIM_023_1_3';
    const record = store.records.get(id);
    assert.ok(record?.['m3gim-ontology:hasDetail'],
      'Der Quellfall aus Box 2 Zeile 82 traegt keinen Detailbeleg mehr');
    assert.equal(store.finances.get(id)?.[0]?.amount, 8600,
      'Die Gesamtverguetung des Quellfalls hat sich geaendert');
    assert.ok(baseRecords(store).some(item => item['@id'] === id),
      'Der reine Finanzbeleg faellt als vermeintlich unerschlossen aus der Basis');
    assert.ok(recordsFor(store, {}).ids.has(id),
      'Der reine Finanzbeleg fehlt in der gemeinsamen Treffermenge');
    assert.equal(baseRecords(store).length, 188,
      'Frontendbasis umfasst alle inhaltlich belegten Quellenangaben');
  });

  test('Land und Verknuepfung schneiden am ausgelieferten Datensatz', async () => {
    const store = await storeFromShipped();
    const basis = recordsFor(store, {}).ids.size;
    const de = recordsFor(store, { land: ['Deutschland'] }).ids.size;
    assert.ok(de > 0 && de < basis, `Deutschland traegt ${de} von ${basis}`);
    const orte = recordsFor(store, { verknuepfung: ['ort'] }).ids.size;
    const gastspiel = recordsFor(store,
      { verknuepfung: ['ort:m3gim-vocab:guestPerformance'] }).ids.size;
    assert.ok(gastspiel > 0 && gastspiel < orte, (
      'Die Rolle Gastspiel muss eine echte Teilmenge der Ortsverknuepfungen sein.'
    ));
  });

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
