/**
 * Unit-Tests fuer docs/js/views/_netzwerk-geometry.js, das reine Modul des
 * zusammengefuehrten Netzwerk-Tabs (E-160), und fuer sein Zusammenspiel mit
 * dem geteilten Filter.
 *
 * Lauf:
 *   node --test tests/frontend/netzwerk-geometry.test.mjs
 *
 * Bewusst kein Browser, kein DOM, kein D3: die getestete Modulebene ist per
 * Design dom-frei. Den Schnitt loest das Modul nicht selbst, `buildGraph` nimmt
 * die fertige Dokumentmenge aus `recordsFor` als `opts.records` entgegen.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGraph,
  computeLayout,
  computeCoOccurrence,
  nodeId,
  nodeRing,
  nodeEvidence,
  nodeColor,
  isMalaniuk,
  isPureComposer,
  derivePersonKategorie,
  labelGeometry,
  focusRecords,
  NODE_TYPES,
  NODE_TYPE_META,
  NETZWERK_KATEGORIEN,
  RING_THRESHOLDS,
  DEFAULT_FOCUS,
} from '../../docs/js/views/_netzwerk-geometry.js';
import {
  getFilter, setFilter, resetFilter, subscribe, isFilterActive,
  applyViewDefault, deviatingKeys,
} from '../../docs/js/ui/filter-state.js';
import { DATING_SCOPE } from '../../docs/js/data/constants.js';
import { recordsFor } from '../../docs/js/data/records-for.js';
import { getPersonKategorie } from '../../docs/js/utils/normalize.js';
import { storeFromShipped } from './_shipped.mjs';

// ---------------------------------------------------------------------------
// Mini-Faktory fuer Person-Entries (spiegelt die im Loader gebaute Shape).
// ---------------------------------------------------------------------------

function person({
  records = [], relations = [], wikidata = null, roles = [], kategorie = 'Andere',
} = {}) {
  return { records: new Set(records), relations, wikidata, roles: new Set(roles), kategorie };
}

function S(...ids) { return new Set(ids); }

// Ohne Erschliessungsstand liegt ein Record ausserhalb der Dokumentbasis.
const STAND = { 'm3gim-ontology:processingStatus': 'abgeschlossen' };

function makeStore() {
  return {
    persons: new Map([
      ['Malaniuk, Ira', { records: S('r1', 'r2', 'r3'), roles: S('sänger'), relations: [],
        wikidata: 'wd:Q94208', note: 'Mezzosopranistin', lifespan: '1919-2009' }],
      ['Wagner, Wieland', { records: S('r1', 'r2'), roles: S('regisseur'), relations: [],
        kategorie: 'Regisseur', note: 'Regisseur' }],
      ['Spaetling, Egon', { records: S('r3'), roles: S('erwähnt'), relations: [] }], // nur 1960
    ]),
    works: new Map([
      ['Tristan und Isolde', { records: S('r1'), partie: 'Brangäne', komponist: 'Wagner, Richard' }],
    ]),
    organizations: new Map([
      ['Bayreuther Festspiele', { records: S('r2'), roles: S('veranstalter'), sitz: 'Bayreuth' }],
    ]),
    locations: new Map([
      ['Bayreuth', { records: S('r1', 'r2'), roles: S('auffuehrungsort') }],
    ]),
    records: new Map([
      ['r1', { '@id': 'r1', 'rico:date': '1952-07-25', ...STAND }],
      ['r2', { '@id': 'r2', 'rico:date': '1953', ...STAND }],
      ['r3', { '@id': 'r3', 'rico:date': '1960', ...STAND }],
    ]),
    allRecords: [
      { '@id': 'r1', 'rico:date': '1952-07-25', ...STAND },
      { '@id': 'r2', 'rico:date': '1953', ...STAND },
      { '@id': 'r3', 'rico:date': '1960', ...STAND },
    ],
    recordDatings: new Map(),
    byYear: new Map([
      [1952, [{ '@id': 'r1' }]],
      [1953, [{ '@id': 'r2' }]],
      [1960, [{ '@id': 'r3' }]],
    ]),
    recordToEvents: new Map([['r1', ['ste_r1']]]),
    recordToPerformances: new Map([['r1', [{ id: 'p1', work: { name: 'Tristan und Isolde' } }]]]),
  };
}

/** Die Dokumentmenge, wie der View sie dem Graph reicht. */
function scopeFor(store, filter) {
  return recordsFor(store, filter).ids;
}

/** Datierung, wie der Loader sie ablegt: ankernde Bezugsebene. */
function annotationDating(year) {
  return {
    id: null, place: null, date: String(year), rawDate: String(year), qualifier: null,
    year, role: 'aufführung', roleId: 'm3gim-vocab:performance',
    roleLabel: 'aufführung', scope: DATING_SCOPE.attested, rank: 0,
    cluster: 'performativ', origin: 'annotation',
  };
}

// ---------------------------------------------------------------------------
// buildGraph — getypte Nachbarschaft
// ---------------------------------------------------------------------------

describe('buildGraph (Fokus, Typen, Schnitt)', () => {
  test('Default-Fokus Malaniuk: getypte Nachbarn aus geteilten Records', () => {
    const g = buildGraph(makeStore());
    assert.equal(g.center.name, 'Malaniuk, Ira');
    const names = g.nodes.map(n => n.name);
    assert.ok(names.includes('Wagner, Wieland'));
    assert.ok(names.includes('Tristan und Isolde'));
    assert.ok(names.includes('Bayreuther Festspiele'));
    assert.ok(names.includes('Bayreuth'));
    assert.ok(!names.includes('Malaniuk, Ira'), 'Fokus darf nicht als Nachbar erscheinen');
    assert.equal(g.nodes.find(n => n.name === 'Wagner, Wieland').weight, 2);
    assert.equal(g.nodes.find(n => n.name === 'Tristan und Isolde').weight, 1);
  });

  test('Determinismus: zwei Laeufe ergeben identische Knoten und Kanten', () => {
    const a = buildGraph(makeStore());
    const b = buildGraph(makeStore());
    assert.deepEqual(a.nodes.map(nodeId), b.nodes.map(nodeId));
    assert.deepEqual(a.edges, b.edges);
  });

  test('jede Kante geht vom Fokus zu einem Nachbarn und nennt ihre Evidenzart', () => {
    const g = buildGraph(makeStore());
    assert.equal(g.edges.length, g.nodes.length);
    assert.ok(g.edges.every(e => e.a === '__focus__'));
    assert.ok(g.edges.every(e => e.kind === 'cooc' || e.kind === 'agrelon'));
  });

  test('eine annotierte AgRelOn-Beziehung macht die Kante gerade', () => {
    const store = makeStore();
    store.persons.get('Wagner, Wieland').relations = [{ type: 'agrelon:HasColleague' }];
    const g = buildGraph(store);
    const node = g.nodes.find(n => n.name === 'Wagner, Wieland');
    assert.equal(node.evidence, 'strong');
    assert.equal(g.edges.find(e => e.b === node.id).kind, 'agrelon');
    assert.equal(g.stats.agrelon, 1);
  });

  test('bei fremdem Fokus gibt es keine geraden Linien, AgRelOn haengt am Nachlass-Subjekt', () => {
    const store = makeStore();
    store.persons.get('Wagner, Wieland').relations = [{ type: 'agrelon:HasColleague' }];
    const g = buildGraph(store, { focus: { type: 'ort', name: 'Bayreuth' } });
    assert.ok(g.nodes.length > 0);
    assert.ok(g.nodes.every(n => n.evidence === 'weak'));
    assert.equal(g.stats.agrelon, 0);
  });

  test('Zeitfenster filtert Records (1960er-Person faellt raus)', () => {
    const wide = buildGraph(makeStore());
    assert.ok(wide.nodes.some(n => n.name === 'Spaetling, Egon'));
    const store = makeStore();
    const cut = buildGraph(store, { records: scopeFor(store, { zeitfenster: [1950, 1955] }) });
    assert.ok(!cut.nodes.some(n => n.name === 'Spaetling, Egon'),
      'Person nur aus 1960 darf im Fenster 1950-1955 nicht erscheinen');
  });

  test('Zeitfenster nimmt den Zeitanker der Datenschicht (Annotation datiert den Record)', () => {
    const store = makeStore();
    // r2 traegt sein Jahr nur ueber eine ankernde Annotation, nicht ueber
    // rico:date; der Jahres-Index store.byYear kennt es deshalb nicht.
    store.records.set('r2', { '@id': 'r2', ...STAND });
    store.recordDatings.set('r2', [annotationDating(1953)]);
    store.byYear = new Map([
      [1952, [{ '@id': 'r1' }]],
      [1960, [{ '@id': 'r3' }]],
    ]);
    store.allRecords = [...store.records.values()];
    const g = buildGraph(store, { records: scopeFor(store, { zeitfenster: [1953, 1953] }) });
    const names = g.nodes.map(n => n.name);
    assert.ok(names.includes('Bayreuther Festspiele'),
      'Institution nur aus r2 muss im Fenster 1953 erscheinen');
    assert.ok(!names.includes('Spaetling, Egon'));
  });

  test('Ort-Filter schraenkt auf Records des Orts ein', () => {
    const store = makeStore();
    const g = buildGraph(store, { records: scopeFor(store, { ort: ['Bayreuth'] }) });
    assert.ok(!g.nodes.some(n => n.name === 'Spaetling, Egon'));
    assert.ok(g.nodes.some(n => n.name === 'Wagner, Wieland'));
  });

  test('zwei Orte vereinigen ihre Dokumente (ODER innerhalb der Facette)', () => {
    const store = makeStore();
    store.locations.set('Wien', { records: S('r3'), roles: S() });
    const g = buildGraph(store, { records: scopeFor(store, { ort: ['Bayreuth', 'Wien'] }) });
    assert.ok(g.nodes.some(n => n.name === 'Spaetling, Egon'),
      'Der zweite Ort muss seine Dokumente hinzufuegen, nicht wegnehmen.');
  });

  test('der Graph liest die weite Menge, die belegte steht als Zahl daneben', () => {
    const store = makeStore();
    const g = buildGraph(store, { records: scopeFor(store, {}) });
    // Seit E-163 gibt es keinen Umschalter mehr: Ko-Okkurrenz ist die Aussage
    // des Graphen, die raumzeitliche Belegung bleibt eine Angabe.
    assert.ok(g.stats.eng <= g.stats.records);
  });

  test('stats beziffern den Schnitt, ohne ihn zu glaetten', () => {
    const store = makeStore();
    const g = buildGraph(store, { records: scopeFor(store, { ort: ['Bayreuth'] }) });
    assert.equal(g.stats.recordsBase, 3, 'Fokus-Records vor dem Schnitt');
    assert.equal(g.stats.records, 2, 'Fokus-Records im Schnitt');
    assert.equal(g.stats.eng, 1, 'davon raumzeitlich/auffuehrungs-belegt');
  });

  test('candidates nennt die Zahl vor der Kappung', () => {
    const g = buildGraph(makeStore(), { topN: 1 });
    assert.equal(g.stats.byType.person, 1, 'gezeigt wird nur der staerkste');
    assert.equal(g.stats.candidates.person, 2,
      'die Kappung nennt, wie viele Kandidaten es gab, statt stumm zu bleiben');
    assert.equal(g.stats.truncated.person, 1);
  });

  test('eine annotierte Beziehung ueberlebt die Kappung', () => {
    const store = makeStore();
    // Spaetling traegt eine Beziehung, hat aber weniger gemeinsame Dokumente
    // als Wieland Wagner. Er muss die Kappung auf einen Knoten trotzdem halten.
    store.persons.get('Spaetling, Egon').relations = [{ type: 'agrelon:HasColleague' }];
    const g = buildGraph(store, { topN: 1 });
    const persons = g.nodes.filter(n => n.type === 'person');
    assert.equal(persons.length, 1);
    assert.equal(persons[0].name, 'Spaetling, Egon');
  });

  test('Knotentyp-Schalter blendet einen Typ aus', () => {
    const g = buildGraph(makeStore(), { types: { ort: false } });
    assert.ok(!g.nodes.some(n => n.type === 'ort'));
    assert.ok(g.nodes.some(n => n.type === 'person'));
  });

  test('Institution traegt den Sitz (datengedeckte Zusatzangabe)', () => {
    const g = buildGraph(makeStore());
    assert.equal(g.nodes.find(n => n.type === 'institution').meta.sitz, 'Bayreuth');
  });

  test('unbekannter Fokus -> leerer Graph statt Crash', () => {
    const g = buildGraph(makeStore(), { focus: { type: 'person', name: 'Niemand' } });
    assert.equal(g.center, null);
    assert.equal(g.nodes.length, 0);
  });

  test('focusRecords loest denselben Fokus auf wie buildGraph', () => {
    const store = makeStore();
    assert.equal(focusRecords(store, DEFAULT_FOCUS).size, 3);
    assert.equal(focusRecords(store, { type: 'person', name: 'Niemand' }).size, 0);
  });

  test('jeder Knotentyp traegt Label und Farbtoken', () => {
    for (const t of NODE_TYPES) {
      assert.ok(NODE_TYPE_META[t].label);
      assert.match(NODE_TYPE_META[t].color, /^var\(--/);
    }
  });
});

// ---------------------------------------------------------------------------
// Evidenz: Ring und Linienart
// ---------------------------------------------------------------------------

describe('Evidenz', () => {
  test('nodeEvidence: AgRelOn-Relation -> strong, ohne Relation -> weak', () => {
    assert.equal(nodeEvidence(person({ relations: [{ type: 'agrelon:HasColleague' }] })), 'strong');
    assert.equal(nodeEvidence(person()), 'weak');
  });

  test('nodeRing: annotierte Beziehung liegt innen', () => {
    assert.equal(nodeRing({ evidence: 'strong', weight: 1, wikidata: null }), 1);
  });

  test('nodeRing: Wikidata plus Dokumentdichte liegt innen', () => {
    const w = RING_THRESHOLDS.HARD_MIN_RECORDS_WITH_QID;
    assert.equal(nodeRing({ evidence: 'weak', weight: w, wikidata: 'wd:Q42' }), 1);
    assert.equal(nodeRing({ evidence: 'weak', weight: w - 1, wikidata: 'wd:Q42' }), 2);
  });

  test('nodeRing: blosse Ko-Praesenz liegt aussen', () => {
    assert.equal(nodeRing({ evidence: 'weak', weight: 9, wikidata: null }), 2);
  });

  test('die Schwelle ist eine positive Ganzzahl', () => {
    const { HARD_MIN_RECORDS_WITH_QID: hard } = RING_THRESHOLDS;
    assert.ok(Number.isInteger(hard) && hard > 0);
  });
});

// ---------------------------------------------------------------------------
// isMalaniuk
// ---------------------------------------------------------------------------

describe('isMalaniuk', () => {
  test('erkennt ueber Q-ID (Q94208)', () => {
    assert.equal(isMalaniuk('irgendwas', { wikidata: 'wd:Q94208' }), true);
  });

  test('Name-Regex als Fallback', () => {
    assert.equal(isMalaniuk('Malaniuk, Ira', {}), true);
    assert.equal(isMalaniuk('malaniuk', {}), true);
  });

  test('andere Person mit anderer Q-ID -> false', () => {
    assert.equal(isMalaniuk('Wagner, Wieland', { wikidata: 'wd:Q76123' }), false);
  });
});

// ---------------------------------------------------------------------------
// isPureComposer — reine Werk-Komponisten filtern
// ---------------------------------------------------------------------------

describe('isPureComposer', () => {
  test('Wagner, Richard (kategorie Komponist, Rolle komponist) -> true', () => {
    // Seit der NIM_005-Feinerschliessung braucht die Ausfilterung Rollen-
    // Evidenz: die Kategorie allein ist eine Namensheuristik, kein Beleg.
    assert.equal(isPureComposer('Wagner, Richard',
      { kategorie: 'Komponist', roles: new Set(['komponist']) }), true);
  });

  test('Wagner, Wieland (kategorie Regisseur) -> false', () => {
    assert.equal(isPureComposer('Wagner, Wieland', { kategorie: 'Regisseur' }), false);
  });

  test('Name ohne Komponisten-Nachnamen -> false', () => {
    assert.equal(isPureComposer('Meier, Anna', { kategorie: 'Andere' }), false);
  });

  test('Malaniuk wird nicht als Komponistin markiert', () => {
    assert.equal(isPureComposer('Malaniuk, Ira', { kategorie: 'Andere' }), false);
  });

  test('Vorname Wolfgang ist kein Komponisten-Nachname', () => {
    const entry = { kategorie: 'Andere', records: new Set(['r1']), roles: new Set(['sänger']) };
    assert.equal(isPureComposer('Witte, Wolfgang', entry), false);
    assert.equal(isPureComposer('Zimmermann, Wolfram', entry), false);
  });

  test('geteilter Nachname ohne Komponisten-Rolle bleibt drin', () => {
    const saenger = { kategorie: 'Andere', records: new Set(['r1']), roles: new Set(['sänger']) };
    assert.equal(isPureComposer('Weber, Ludiwig', saenger), false);
    assert.equal(isPureComposer('Schubert, Erika', saenger), false);
  });

  test('derselbe Nachname mit Komponisten-Rolle faellt heraus', () => {
    const komponist = { kategorie: 'Komponist', records: new Set(['r1']),
      roles: new Set(['komponist', 'erwähnt']) };
    assert.equal(isPureComposer('Schubert, Franz', komponist), true);
    assert.equal(isPureComposer('Wagner, Richard', komponist), true);
  });

  test('kuratierte Nicht-Komponisten-Kategorie schuetzt trotz Komponisten-Rolle', () => {
    // Hindemith dirigierte im Bestand und komponierte; die kuratierte
    // Kategorie 'Dirigent' haelt ihn im Netzwerk.
    const entry = { kategorie: 'Dirigent', records: new Set(['r1']),
      roles: new Set(['dirigent', 'komponist']) };
    assert.equal(isPureComposer('Hindemith, Paul', entry), false);
  });
});

// ---------------------------------------------------------------------------
// derivePersonKategorie + nodeColor
// ---------------------------------------------------------------------------

describe('derivePersonKategorie', () => {
  test('Prioritaet Produktion vor Buehne (Dirigent + Saenger -> Produktion)', () => {
    assert.equal(derivePersonKategorie(person({ roles: ['dirigent', 'sänger'] })), 'Produktion');
  });

  test('Adressat -> Korrespondenz, Verfasser -> Presse', () => {
    assert.equal(derivePersonKategorie(person({ roles: ['adressat'] })), 'Korrespondenz');
    assert.equal(derivePersonKategorie(person({ roles: ['verfasser'] })), 'Presse');
  });

  test('nur "erwähnt" -> Erwähnt, leere Rollen -> Andere', () => {
    assert.equal(derivePersonKategorie(person({ roles: ['erwähnt'] })), 'Erwähnt');
    assert.equal(derivePersonKategorie(person()), 'Andere');
  });

  test('gender-neutrale Form "sängerin" -> Buehne', () => {
    assert.equal(derivePersonKategorie(person({ roles: ['sängerin'] })), 'Bühne');
  });

  test('unbekannte Rolle -> Andere (kein stilles Fehlverhalten)', () => {
    assert.equal(derivePersonKategorie(person({ roles: ['allerleirauh'] })), 'Andere');
  });

  test('alle NETZWERK_KATEGORIEN-Keys haben eine Farbe', () => {
    for (const key of Object.keys(NETZWERK_KATEGORIEN)) {
      assert.match(NETZWERK_KATEGORIEN[key], /^var\(--/, `Kategorie ${key} ohne Farbtoken`);
    }
  });

  test('nodeColor liefert einen NETZWERK_KATEGORIEN-Wert', () => {
    assert.ok(Object.values(NETZWERK_KATEGORIEN).includes(nodeColor(person({ roles: ['dirigent'] }))));
  });

  test('ein Personenknoten traegt die Kategoriefarbe, andere Typen die Familienfarbe', () => {
    const g = buildGraph(makeStore());
    const p = g.nodes.find(n => n.type === 'person');
    assert.ok(Object.values(NETZWERK_KATEGORIEN).includes(p.color));
    assert.equal(g.nodes.find(n => n.type === 'werk').color, NODE_TYPE_META.werk.color);
  });
});

// ---------------------------------------------------------------------------
// computeLayout
// ---------------------------------------------------------------------------

describe('computeLayout (deterministisch, typ-partitioniert)', () => {
  test('Zentrum sitzt auf (cx,cy), Knoten haben endliche Positionen', () => {
    const L = computeLayout(buildGraph(makeStore()), { cx: 400, cy: 300, radius: 200 });
    assert.equal(L.center.x, 400);
    assert.equal(L.center.y, 300);
    for (const n of L.nodes) {
      assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
      assert.ok(n.r >= 6 && n.r <= 20);
    }
  });

  test('Determinismus: identische Positionen ueber zwei Laeufe', () => {
    const L1 = computeLayout(buildGraph(makeStore()), { cx: 0, cy: 0, radius: 100 });
    const L2 = computeLayout(buildGraph(makeStore()), { cx: 0, cy: 0, radius: 100 });
    assert.deepEqual(L1.nodes.map(n => [n.id, n.x, n.y]), L2.nodes.map(n => [n.id, n.x, n.y]));
  });

  test('Person-Sektor liegt oben, Institution unten', () => {
    const L = computeLayout(buildGraph(makeStore()), { cx: 0, cy: 0, radius: 100 });
    assert.ok(L.nodes.find(n => n.type === 'person').y < 0, 'Person-Sektor oben (y<0)');
    assert.ok(L.nodes.find(n => n.type === 'institution').y > 0, 'Institution-Sektor unten (y>0)');
  });

  test('der innere Ring liegt naeher am Zentrum als der aeussere', () => {
    const L = computeLayout(buildGraph(makeStore()), { cx: 0, cy: 0, radius: 100 });
    assert.ok(L.radii[1] < L.radii[2]);
  });

  test('innerhalb eines Sektors steht die alphabetische Ordnung, mit Umlautausgleich', () => {
    const store = makeStore();
    store.persons = new Map([
      ['Malaniuk, Ira', person({ records: ['r1'], wikidata: 'wd:Q94208' })],
      ['Zweibach, A', person({ records: ['r1'] })],
      ['Ärmel, B', person({ records: ['r1'] })],
      ['Übel, C', person({ records: ['r1'] })],
    ]);
    const g = buildGraph(store, { types: { werk: false, institution: false, ort: false } });
    const L = computeLayout(g, { cx: 0, cy: 0, radius: 100 });
    // aermel < uebel < zweibach
    assert.deepEqual(L.nodes.map(n => n.name), ['Ärmel, B', 'Übel, C', 'Zweibach, A']);
  });
});

// ---------------------------------------------------------------------------
// computeCoOccurrence — Kanten unter den Nachbarn
// ---------------------------------------------------------------------------

describe('computeCoOccurrence', () => {
  const nodes = [
    { id: 'person:A', records: S('r1', 'r2', 'r3') },
    { id: 'person:B', records: S('r1', 'r2') },
    { id: 'person:C', records: S('r3') },
  ];
  const scope = S('r1', 'r2', 'r3');

  test('Paare in gemeinsamen Records, korrekte Shared-Zahlen', () => {
    const pairs = computeCoOccurrence(nodes, scope, { minShared: 1, maxEdges: 10 });
    assert.equal(pairs.find(p => p.a === 'person:A' && p.b === 'person:B').shared, 2);
    assert.equal(pairs.find(p => p.a === 'person:A' && p.b === 'person:C').shared, 1);
  });

  test('der Schnitt begrenzt die Kanten: ausserhalb liegende Records zaehlen nicht', () => {
    const pairs = computeCoOccurrence(nodes, S('r3'), { minShared: 1, maxEdges: 10 });
    assert.deepEqual(pairs.map(p => [p.a, p.b]), [['person:A', 'person:C']]);
  });

  test('minShared kappt Paare unter der Schwelle', () => {
    assert.equal(computeCoOccurrence(nodes, scope, { minShared: 3, maxEdges: 10 }).length, 0);
  });

  test('maxEdges kappt die globale Paarzahl', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: `person:P${i}`, records: S('r1') }));
    assert.equal(computeCoOccurrence(many, S('r1'), { minShared: 1, maxEdges: 5 }).length, 5);
  });

  test('Determinismus und Sortierung nach shared, dann alphabetisch', () => {
    const p1 = computeCoOccurrence(nodes, scope, { minShared: 1, maxEdges: 10 });
    const p2 = computeCoOccurrence(nodes, scope, { minShared: 1, maxEdges: 10 });
    assert.deepEqual(p1, p2);
    assert.equal(p1[0].shared, 2);
  });
});

// ---------------------------------------------------------------------------
// labelGeometry
// ---------------------------------------------------------------------------

describe('labelGeometry', () => {
  test('rechte Halbebene (angle < pi) -> anchor start, positives dx', () => {
    const g = labelGeometry(Math.PI / 2, 10);
    assert.equal(g.anchor, 'start');
    assert.ok(g.dx > 0);
  });

  test('linke Halbebene (angle > pi) -> anchor end, negatives dx', () => {
    const g = labelGeometry(Math.PI * 1.5, 10);
    assert.equal(g.anchor, 'end');
    assert.ok(g.dx < 0);
  });

  test('ein negativer Winkel wird normalisiert (Sektor Ort liegt links)', () => {
    assert.equal(labelGeometry(-Math.PI / 2, 10).anchor, 'end');
  });

  test('gap wirkt additiv auf den dx-Betrag', () => {
    assert.ok(Math.abs(labelGeometry(Math.PI / 2, 10, 10).dx)
      > Math.abs(labelGeometry(Math.PI / 2, 10, 2).dx));
  });
});

// ---------------------------------------------------------------------------
// Echte Kette getPersonKategorie -> isPureComposer am ausgelieferten Datensatz
//
// Die Tests oben setzen `kategorie` von Hand und pruefen damit nur die
// Filterlogik, nicht ihre Speisung. Genau dort sass der Defekt: die Ausnahmen
// der Wagner-Familie standen in PERSONEN_KATEGORIEN als "wieland wagner",
// waehrend der Datensatz "Wagner, Wieland" fuehrt.
// ---------------------------------------------------------------------------

const NAMEN_AUS_DEM_DATENSATZ = {
  regie: ['Wagner, Wieland', 'Wagner, Wolfgang', 'Wagner, WIeland', 'Wagner, Wieland Gottfried'],
  komponist: ['Wagner, Richard', 'Strauss, Richard'],
};

describe('Kette Kategorie -> Komponistenfilter', () => {
  test('Regie-Ausnahmen der Wagner-Familie bleiben im Netzwerk', () => {
    for (const name of NAMEN_AUS_DEM_DATENSATZ.regie) {
      const entry = { kategorie: getPersonKategorie(name), records: new Set(['r1']),
        roles: new Set(['regisseur']) };
      assert.equal(entry.kategorie, 'Regisseur',
        `getPersonKategorie('${name}') liefert '${entry.kategorie}' statt 'Regisseur'`);
      assert.equal(isPureComposer(name, entry), false,
        `'${name}' wird als reiner Komponist aus dem Netzwerk gefiltert`);
    }
  });

  test('Werk-Komponisten bleiben gefiltert', () => {
    for (const name of NAMEN_AUS_DEM_DATENSATZ.komponist) {
      const entry = { kategorie: getPersonKategorie(name), records: new Set(['r1']),
        roles: new Set(['komponist']) };
      assert.equal(entry.kategorie, 'Komponist');
      assert.equal(isPureComposer(name, entry), true,
        `'${name}' bleibt faelschlich im Personen-Netzwerk`);
    }
  });

  test('am erzeugten Datensatz: Wieland und Wolfgang Wagner sind Knoten, Richard nicht', async () => {
    const store = await storeFromShipped();
    const g = buildGraph(store, {
      types: { person: true, werk: false, institution: false, ort: false },
      topN: 500,
    });
    const namen = new Set(g.nodes.map(n => n.name));
    for (const name of ['Wagner, Wieland', 'Wagner, Wolfgang']) {
      assert.ok(store.persons.has(name), `'${name}' fehlt im Personen-Index`);
      assert.ok(namen.has(name), `'${name}' fehlt als Knoten im Netzwerk`);
    }
    assert.equal(namen.has('Wagner, Richard'), false,
      'Richard Wagner ist reiner Werk-Komponist und gehoert nicht ins Personen-Netzwerk');
  });

  test('am erzeugten Datensatz: nur belegte Komponisten fallen aus dem Netzwerk', async () => {
    const store = await storeFromShipped();
    const zuUnrecht = [];
    for (const [name, entry] of store.persons) {
      if (isMalaniuk(name, entry)) continue;
      if (!isPureComposer(name, entry)) continue;
      const rollen = [...entry.roles].map(r => String(r).toLowerCase().trim());
      if (rollen.includes('komponist')) continue;
      zuUnrecht.push(`${name} (${entry.records.size} Records, ${rollen.join('/') || 'ohne Rolle'})`);
    }
    assert.deepEqual(zuUnrecht, [],
      'ohne Komponisten-Rolle aus dem Netzwerk gefiltert: ' + zuUnrecht.join(' | '));
  });

  test('am erzeugten Datensatz: kuratierte Kategorien bleiben im Netzwerk', async () => {
    const store = await storeFromShipped();
    const KURATIERT = new Set(['Dirigent', 'Regisseur', 'Kollege', 'Korrepetitor',
      'Vermittler', 'Archivsubjekt']);
    const verloren = [];
    for (const [name, entry] of store.persons) {
      if (!KURATIERT.has(entry.kategorie)) continue;
      if (isPureComposer(name, entry)) verloren.push(`${name} (${entry.kategorie})`);
    }
    assert.deepEqual(verloren, [],
      'kuratierte Nicht-Komponisten aus dem Netzwerk gefiltert: ' + verloren.join(' | '));
  });

  test('am erzeugten Datensatz: die Personenansicht traegt gerade Linien', async () => {
    const store = await storeFromShipped();
    const g = buildGraph(store, {
      types: { person: true, werk: false, institution: false, ort: false },
      topN: 500,
    });
    assert.ok(g.stats.agrelon > 0,
      'ohne AgRelOn-Knoten faellt die Unterscheidung der Linienarten in sich zusammen');
    assert.ok(g.stats.ringCounts[1] > 0 && g.stats.ringCounts[2] > 0,
      'beide Evidenzringe muessen im echten Datenstand besetzt sein');
  });
});

// ---------------------------------------------------------------------------
// filter-state — der geteilte Schnitt
// ---------------------------------------------------------------------------

describe('filter-state (geteilter Schnitt)', () => {
  test('Default-State: alle Facetten leer', () => {
    resetFilter();
    const f = getFilter();
    assert.deepEqual(f.stand, []);
    assert.deepEqual(f.ort, []);
    assert.equal(f.zeitfenster, null);
    assert.equal(isFilterActive(), false);
  });

  test('setFilter merged Patch, isFilterActive erkennt Aktivitaet', () => {
    resetFilter();
    setFilter({ ort: 'Bayreuth' });
    assert.deepEqual(getFilter().ort, ['Bayreuth'],
      'Ein einzelner Wert wird zur einelementigen Liste (E-151).');
    assert.equal(isFilterActive(), true);
    resetFilter();
    assert.equal(isFilterActive(), false);
  });

  test('die Voreinstellung einer Ansicht ist ein sichtbarer Filter', () => {
    // Der Bestand oeffnet auf abgeschlossen + begonnen und haelt damit die
    // zurueckgestellten Objekte zurueck. Das ist ein Filter wie jeder andere
    // (Projektleitung, 2026-09-03): er traegt Chip und Zuruecksetzen-Link, und
    // Zuruecksetzen fuehrt auf die volle Grundmenge, nicht auf die Vorauswahl.
    resetFilter();
    applyViewDefault({ stand: ['abgeschlossen', 'begonnen'] });
    assert.deepEqual(getFilter().stand, ['abgeschlossen', 'begonnen']);
    assert.equal(isFilterActive(), true);
    assert.deepEqual(deviatingKeys(), ['stand']);
    resetFilter();
    assert.deepEqual(getFilter().stand, []);
    assert.equal(isFilterActive(), false);
  });

  test('subscribe wird bei Aenderung benachrichtigt (window gemockt)', () => {
    const prev = globalThis.window;
    globalThis.window = new EventTarget();
    try {
      resetFilter();
      let calls = 0;
      let last = null;
      const off = subscribe((s) => { calls++; last = s; }, { immediate: false });
      setFilter({ person: 'Wagner, Wieland' });
      assert.equal(calls, 1);
      assert.deepEqual(last.person, ['Wagner, Wieland']);
      off();
      setFilter({ person: 'X' });
      assert.equal(calls, 1, 'nach Abmeldung keine weitere Benachrichtigung');
    } finally {
      globalThis.window = prev;
      resetFilter();
    }
  });
});
