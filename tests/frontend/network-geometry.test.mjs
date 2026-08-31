/**
 * Unit-Tests fuer docs/js/views/_network-geometry.js (E-93, Session 47).
 *
 * Lauf:
 *   node --test tests/frontend/netzwerk-geometry.test.mjs
 *
 * Ziel: Pure Functions des Netzwerk-Tabs (Ring-Klassifikation, Kategorie-
 * Ableitung, Layout, Ko-Okkurrenz, Label-Geometrie, Malaniuk-Erkennung,
 * Komponisten-Filter) gegen ihre Invarianten schuetzen. Der JS-Teil des
 * Projekts hat sonst keine Unit-Test-Infrastruktur; dieses File verlaesst
 * sich ausschliesslich auf Node 18+ Built-in `node:test` + `node:assert/strict`
 * und die `"type":"module"`-Markierung in `docs/js/package.json`.
 *
 * Bewusst KEIN Browser, kein DOM, kein D3: die getestete Modul-Ebene ist
 * per Design dom-frei (frontend-architecture.md § Netzwerk, E-93).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyRing,
  nodeEvidence,
  nodeColor,
  isMalaniuk,
  isPureComposer,
  derivePersonKategorie,
  computeLayout,
  computeCoOccurrence,
  labelGeometry,
  NETZWERK_KATEGORIEN,
  RING_THRESHOLDS,
} from '../../docs/js/views/_network-geometry.js';
import {
  personYearsIndex,
  personInTimeRange,
} from '../../docs/js/views/network.js';
import { DATING_SCOPE } from '../../docs/js/data/constants.js';
import { getPersonKategorie } from '../../docs/js/utils/normalize.js';
import { storeFromShipped } from './_shipped.mjs';

// ---------------------------------------------------------------------------
// Mini-Faktory fuer Person-Entries (spiegelt die im Loader gebaute Shape).
// ---------------------------------------------------------------------------

function person({
  records = [],
  relations = [],
  wikidata = null,
  roles = [],
  kategorie = 'Andere',
} = {}) {
  return {
    records: new Set(records),
    relations,
    wikidata,
    roles: new Set(roles),
    kategorie,
  };
}

// ---------------------------------------------------------------------------
// classifyRing — Ring-Klassifikation nach Evidenzstaerke
// ---------------------------------------------------------------------------

test('classifyRing: AgRelOn-Partner landet in Ring 1 (harte Beziehung)', () => {
  const e = person({ records: ['r1'], relations: [{ type: 'agrelon:HasColleague' }] });
  assert.equal(classifyRing(e), 1);
});

test('classifyRing: Wikidata + >=5 Records → Ring 1', () => {
  const e = person({
    records: ['a', 'b', 'c', 'd', 'e'],
    wikidata: 'wd:Q42',
  });
  assert.equal(classifyRing(e), 1);
});

test('classifyRing: Wikidata + 4 Records (unter Schwelle) → Ring 2', () => {
  const e = person({ records: ['a', 'b', 'c', 'd'], wikidata: 'wd:Q42' });
  assert.equal(classifyRing(e), 2);
});

test('classifyRing: >=2 Records ohne Wikidata → Ring 2 (Umfeld)', () => {
  const e = person({ records: ['a', 'b'] });
  assert.equal(classifyRing(e), 2);
});

test('classifyRing: 1 Record, kategorie "Andere" → Ring 3 (wird von computeLayout gefiltert)', () => {
  const e = person({ records: ['a'], kategorie: 'Andere' });
  assert.equal(classifyRing(e), 3);
});

test('classifyRing: 1 Record, aber explizit kategorisiert (Dirigent) → Ring 2', () => {
  const e = person({ records: ['a'], kategorie: 'Dirigent' });
  assert.equal(classifyRing(e), 2);
});

test('classifyRing: Schwellwerte sind exportiert und konsistent geordnet', () => {
  // Invariante statt Magic-Number-Tautologie: beide Schwellen sind positive
  // Ganzzahlen und die harte Schwelle ist strenger als die mittlere. Bleibt
  // bei bewusster Justierung gruen, schlaegt bei unsinniger Konfiguration an.
  const { HARD_MIN_RECORDS_WITH_QID: hard, MID_MIN_RECORDS: mid } = RING_THRESHOLDS;
  assert.ok(Number.isInteger(hard) && hard > 0);
  assert.ok(Number.isInteger(mid) && mid > 0);
  assert.ok(hard > mid, 'harte Schwelle muss strenger als die mittlere sein');
});

// ---------------------------------------------------------------------------
// isMalaniuk — Zentrum-Erkennung
// ---------------------------------------------------------------------------

test('isMalaniuk: erkennt ueber Q-ID (Q94208)', () => {
  assert.equal(isMalaniuk('irgendwas', { wikidata: 'wd:Q94208' }), true);
});

test('isMalaniuk: Name-Regex als Fallback', () => {
  assert.equal(isMalaniuk('Malaniuk, Ira', {}), true);
  assert.equal(isMalaniuk('malaniuk', {}), true);
});

test('isMalaniuk: andere Person mit anderer Q-ID → false', () => {
  assert.equal(isMalaniuk('Wagner, Wieland', { wikidata: 'wd:Q76123' }), false);
});

// ---------------------------------------------------------------------------
// isPureComposer — reine Werk-Komponisten filtern
// ---------------------------------------------------------------------------

test('isPureComposer: Wagner, Richard (kategorie Komponist) → true', () => {
  assert.equal(isPureComposer('Wagner, Richard', { kategorie: 'Komponist' }), true);
});

test('isPureComposer: Wagner, Wieland (kategorie Regisseur) → false', () => {
  // Wieland Wagner war Regisseur, nicht Komponist — bleibt im Personen-Netzwerk.
  assert.equal(isPureComposer('Wagner, Wieland', { kategorie: 'Regisseur' }), false);
});

test('isPureComposer: Name ohne Komponisten-Nachnamen → false', () => {
  assert.equal(isPureComposer('Meier, Anna', { kategorie: 'Andere' }), false);
});

test('isPureComposer: Malaniuk wird nicht als Komponistin markiert', () => {
  assert.equal(isPureComposer('Malaniuk, Ira', { kategorie: 'Andere' }), false);
});

// ---------------------------------------------------------------------------
// derivePersonKategorie — rollenbasierte Kategorie mit Prioritaet
// ---------------------------------------------------------------------------

test('derivePersonKategorie: Prioritaet Produktion > Buehne (Dirigent + Saenger → Produktion)', () => {
  const e = person({ roles: ['dirigent', 'sänger'] });
  assert.equal(derivePersonKategorie(e), 'Produktion');
});

test('derivePersonKategorie: Adressat → Korrespondenz', () => {
  const e = person({ roles: ['adressat'] });
  assert.equal(derivePersonKategorie(e), 'Korrespondenz');
});

test('derivePersonKategorie: Verfasser → Presse', () => {
  const e = person({ roles: ['verfasser'] });
  assert.equal(derivePersonKategorie(e), 'Presse');
});

test('derivePersonKategorie: nur "erwähnt" → Erwähnt (nicht Andere)', () => {
  const e = person({ roles: ['erwähnt'] });
  assert.equal(derivePersonKategorie(e), 'Erwähnt');
});

test('derivePersonKategorie: leere Rollen → Andere', () => {
  const e = person();
  assert.equal(derivePersonKategorie(e), 'Andere');
});

test('derivePersonKategorie: gender-neutrale Form "sängerin" → Buehne', () => {
  const e = person({ roles: ['sängerin'] });
  assert.equal(derivePersonKategorie(e), 'Bühne');
});

test('derivePersonKategorie: unbekannte Rolle → Andere (kein stilles Fehlverhalten)', () => {
  const e = person({ roles: ['allerleirauh'] });
  assert.equal(derivePersonKategorie(e), 'Andere');
});

test('derivePersonKategorie: alle NETZWERK_KATEGORIEN-Keys haben eine Farbe', () => {
  for (const key of Object.keys(NETZWERK_KATEGORIEN)) {
    const col = NETZWERK_KATEGORIEN[key];
    assert.ok(typeof col === 'string' && col.length > 0, `Kategorie ${key} hat keine Farbe`);
  }
});

// ---------------------------------------------------------------------------
// nodeEvidence + nodeColor
// ---------------------------------------------------------------------------

test('nodeEvidence: AgRelOn-Relation → strong', () => {
  const e = person({ relations: [{ type: 'agrelon:HasColleague' }] });
  assert.equal(nodeEvidence(e), 'strong');
});

test('nodeEvidence: keine Relation → weak', () => {
  assert.equal(nodeEvidence(person()), 'weak');
});

test('nodeColor: ist ein NETZWERK_KATEGORIEN-Wert', () => {
  const e = person({ roles: ['dirigent'] });
  const col = nodeColor(e);
  assert.ok(Object.values(NETZWERK_KATEGORIEN).includes(col));
});

// ---------------------------------------------------------------------------
// computeLayout
// ---------------------------------------------------------------------------

test('computeLayout: Malaniuk landet ins Zentrum, Rest auf Ringen', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ records: ['r1'], wikidata: 'wd:Q94208' })],
    [
      'Karajan, Herbert',
      person({
        records: ['r1', 'r2', 'r3', 'r4', 'r5'],
        wikidata: 'wd:Q7326',
      }),
    ],
    ['Meier, Anna', person({ records: ['r1', 'r2'] })],
  ]);
  const layout = computeLayout(persons.entries(), {
    cx: 500, cy: 400, radii: [100, 200],
  });
  assert.equal(layout.center.name, 'Malaniuk, Ira');
  assert.equal(layout.nodes.length, 2);
  assert.equal(layout.ringCounts[1] + layout.ringCounts[2], 2);
});

test('computeLayout: reine Werk-Komponisten werden ausgefiltert', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ wikidata: 'wd:Q94208' })],
    ['Wagner, Richard', person({ records: ['r1', 'r2'], kategorie: 'Komponist' })],
    ['Meier, Anna', person({ records: ['r1', 'r2'] })],
  ]);
  const layout = computeLayout(persons.entries(), {
    cx: 500, cy: 400, radii: [100, 200],
  });
  assert.equal(layout.nodes.length, 1);
  assert.equal(layout.nodes[0].name, 'Meier, Anna');
});

test('computeLayout: Ring 3 (einmalige Nennungen ohne Kategorie) wird weggeworfen', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ wikidata: 'wd:Q94208' })],
    ['Einmalig, Hans', person({ records: ['r1'], kategorie: 'Andere' })],
    ['Zweimal, Eva', person({ records: ['r1', 'r2'] })],
  ]);
  const layout = computeLayout(persons.entries(), {
    cx: 500, cy: 400, radii: [100, 200],
  });
  assert.equal(layout.nodes.length, 1);
  assert.equal(layout.nodes[0].name, 'Zweimal, Eva');
});

test('computeLayout: Determinismus — zwei Laeufe liefern identische Positionen', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ wikidata: 'wd:Q94208' })],
    ['C, X', person({ records: ['r1', 'r2'] })],
    ['A, Y', person({ records: ['r1', 'r2'] })],
    ['B, Z', person({ records: ['r1', 'r2'] })],
  ]);
  const l1 = computeLayout(persons.entries(), {
    cx: 500, cy: 400, radii: [100, 200],
  });
  const l2 = computeLayout(persons.entries(), {
    cx: 500, cy: 400, radii: [100, 200],
  });
  const coords1 = l1.nodes.map(n => [n.name, n.x, n.y]);
  const coords2 = l2.nodes.map(n => [n.name, n.x, n.y]);
  assert.deepEqual(coords1, coords2);
});

test('computeLayout: alphabetische Winkel-Reihenfolge pro Ring', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ wikidata: 'wd:Q94208' })],
    ['C, X', person({ records: ['r1', 'r2'] })],
    ['A, Y', person({ records: ['r1', 'r2'] })],
    ['B, Z', person({ records: ['r1', 'r2'] })],
  ]);
  const layout = computeLayout(persons.entries(), {
    cx: 0, cy: 0, radii: [100, 200],
  });
  const names = layout.nodes.map(n => n.name);
  assert.deepEqual(names, ['A, Y', 'B, Z', 'C, X']);
});

test('computeLayout: Umlaut-Normalisierung im SortKey (ü→u, ä→a, ö→o)', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ wikidata: 'wd:Q94208' })],
    ['Zweibach, A', person({ records: ['r1', 'r2'] })],
    ['Ärmel, B', person({ records: ['r1', 'r2'] })],
    ['Übel, C', person({ records: ['r1', 'r2'] })],
  ]);
  const layout = computeLayout(persons.entries(), {
    cx: 0, cy: 0, radii: [100, 200],
  });
  const names = layout.nodes.map(n => n.name);
  // aermel < uebel < zweibach
  assert.deepEqual(names, ['Ärmel, B', 'Übel, C', 'Zweibach, A']);
});

test('computeLayout: Knoten-Radius skaliert mit Record-Count, gedeckelt bei 28', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ wikidata: 'wd:Q94208' })],
    [
      'Fleißig, P',
      person({ records: Array.from({ length: 100 }, (_, i) => `r${i}`) }),
    ],
  ]);
  const layout = computeLayout(persons.entries(), {
    cx: 0, cy: 0, radii: [100, 200],
  });
  assert.equal(layout.nodes.length, 1);
  assert.ok(layout.nodes[0].r <= 28, `r=${layout.nodes[0].r} > 28 cap`);
  assert.ok(layout.nodes[0].r >= 6, `r=${layout.nodes[0].r} < min 6`);
});

// ---------------------------------------------------------------------------
// computeCoOccurrence
// ---------------------------------------------------------------------------

test('computeCoOccurrence: Paare in gemeinsamen Records, korrekte Shared-Zahlen', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ records: ['r1'], wikidata: 'wd:Q94208' })],
    ['A', person({ records: ['r1', 'r2', 'r3'] })],
    ['B', person({ records: ['r1', 'r2'] })],
    ['C', person({ records: ['r3'] })],
  ]);
  const pairs = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 10 });
  const ab = pairs.find(p => p.a === 'A' && p.b === 'B');
  const ac = pairs.find(p => p.a === 'A' && p.b === 'C');
  assert.ok(ab, 'A-B Paar muss existieren');
  assert.equal(ab.shared, 2);
  assert.ok(ac, 'A-C Paar muss existieren');
  assert.equal(ac.shared, 1);
});

test('computeCoOccurrence: Malaniuk ist KEIN Endpunkt (wird ausgefiltert)', () => {
  const persons = new Map([
    ['Malaniuk, Ira', person({ records: ['r1', 'r2'], wikidata: 'wd:Q94208' })],
    ['A', person({ records: ['r1', 'r2'] })],
    ['B', person({ records: ['r1'] })],
  ]);
  const pairs = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 10 });
  for (const p of pairs) {
    assert.notEqual(p.a, 'Malaniuk, Ira');
    assert.notEqual(p.b, 'Malaniuk, Ira');
  }
});

test('computeCoOccurrence: reine Komponisten werden ausgefiltert', () => {
  const persons = new Map([
    ['Wagner, Richard', person({ records: ['r1'], kategorie: 'Komponist' })],
    ['A', person({ records: ['r1'] })],
  ]);
  const pairs = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 10 });
  assert.equal(pairs.length, 0);
});

test('computeCoOccurrence: minShared-Threshold kappt Paare unter Schwelle', () => {
  const persons = new Map([
    ['A', person({ records: ['r1'] })],
    ['B', person({ records: ['r1'] })],
  ]);
  const pairs = computeCoOccurrence(persons.entries(), { minShared: 2, maxEdges: 10 });
  assert.equal(pairs.length, 0);
});

test('computeCoOccurrence: maxEdges kappt globale Paarzahl', () => {
  const persons = new Map();
  for (let i = 0; i < 10; i++) persons.set(`P${i}`, person({ records: ['r1'] }));
  const pairs = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 5 });
  assert.equal(pairs.length, 5);
});

test('computeCoOccurrence: Determinismus (stabile Reihenfolge bei Ties)', () => {
  const persons = new Map([
    ['A', person({ records: ['r1', 'r2'] })],
    ['B', person({ records: ['r1', 'r2'] })],
    ['C', person({ records: ['r1'] })],
  ]);
  const p1 = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 10 });
  const p2 = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 10 });
  assert.deepEqual(p1, p2);
});

test('computeCoOccurrence: Sortierung primaer nach shared desc, sekundaer alphabetisch', () => {
  const persons = new Map([
    ['A', person({ records: ['r1', 'r2'] })],
    ['B', person({ records: ['r1', 'r2'] })],
    ['C', person({ records: ['r1'] })],
    ['D', person({ records: ['r1'] })],
  ]);
  const pairs = computeCoOccurrence(persons.entries(), { minShared: 1, maxEdges: 10 });
  // A-B hat shared=2 und muss vor C-D (shared=1) kommen.
  assert.equal(pairs[0].a, 'A');
  assert.equal(pairs[0].b, 'B');
  assert.equal(pairs[0].shared, 2);
});

// ---------------------------------------------------------------------------
// labelGeometry
// ---------------------------------------------------------------------------

test('labelGeometry: rechte Halbebene (angle < π) → anchor start, positives dx', () => {
  const g = labelGeometry(Math.PI / 2, 10);
  assert.equal(g.anchor, 'start');
  assert.ok(g.dx > 0);
});

test('labelGeometry: linke Halbebene (angle > π) → anchor end, negatives dx', () => {
  const g = labelGeometry(Math.PI * 1.5, 10);
  assert.equal(g.anchor, 'end');
  assert.ok(g.dx < 0);
});

test('labelGeometry: gap-Parameter wirkt additiv auf dx-Betrag', () => {
  const gSmall = labelGeometry(Math.PI / 2, 10, 2);
  const gBig = labelGeometry(Math.PI / 2, 10, 10);
  assert.ok(Math.abs(gBig.dx) > Math.abs(gSmall.dx));
});

// ---------------------------------------------------------------------------
// personYearsIndex / personInTimeRange — Zeitanker des Netzwerk-Tabs
//
// Die Jahre kommen aus primaryYear(store, record) der Datenschicht:
// `rico:date` hat Vorrang, sonst datiert die ranghoechste Datierung einer
// ankernden Bezugsebene. Ein Record, der sein Jahr nur ueber eine Annotation
// traegt, blieb der frueheren Regex auf `rico:date` unsichtbar.
// ---------------------------------------------------------------------------

function dating({ year, scope, rank = 0, roleId = 'm3gim-vocab:performance', label = 'aufführung' }) {
  return {
    id: null, place: null, date: String(year), rawDate: String(year), qualifier: null,
    year, role: label, roleId, roleLabel: label, derivedFromRole: null,
    scope, rank, cluster: null, origin: 'annotation',
  };
}

function yearStore() {
  return {
    records: new Map([
      ['rAnker', { '@id': 'rAnker', 'rico:date': '1952-08-26' }],
      ['rAbgeleitet', { '@id': 'rAbgeleitet' }],
      ['rErwaehnt', { '@id': 'rErwaehnt' }],
      ['rBeides', { '@id': 'rBeides', 'rico:date': '1955' }],
    ]),
    recordDatings: new Map([
      ['rAbgeleitet', [dating({ year: 1958, scope: DATING_SCOPE.attested })]],
      ['rErwaehnt', [dating({
        year: 1872, scope: DATING_SCOPE.mentioned, roleId: 'm3gim-vocab:mentioned', label: 'erwähnt',
      })]],
      ['rBeides', [dating({ year: 1961, scope: DATING_SCOPE.attested })]],
    ]),
    persons: new Map([
      ['Anker, A', person({ records: ['rAnker'] })],
      ['Abgeleitet, B', person({ records: ['rAbgeleitet'] })],
      ['Erwaehnt, C', person({ records: ['rErwaehnt'] })],
      ['Beides, D', person({ records: ['rBeides'] })],
    ]),
  };
}

test('personYearsIndex: rico:date traegt das Jahr der Person', () => {
  const { personYears } = personYearsIndex(yearStore());
  assert.deepEqual([...personYears.get('Anker, A')], [1952]);
});

test('personYearsIndex: Record ohne rico:date datiert ueber seine ankernde Annotation', () => {
  const { personYears } = personYearsIndex(yearStore());
  assert.deepEqual([...personYears.get('Abgeleitet, B')], [1958]);
});

test('personYearsIndex: eine Erwaehnung datiert den Record nicht', () => {
  const { personYears } = personYearsIndex(yearStore());
  assert.equal(personYears.has('Erwaehnt, C'), false);
});

test('personYearsIndex: rico:date hat Vorrang vor der abgeleiteten Datierung', () => {
  const { personYears } = personYearsIndex(yearStore());
  assert.deepEqual([...personYears.get('Beides, D')], [1955]);
});

test('personYearsIndex: Gesamtspanne umfasst auch die abgeleiteten Jahre', () => {
  const { yearRange } = personYearsIndex(yearStore());
  assert.deepEqual(yearRange, { min: 1952, max: 1958 });
});

test('personYearsIndex: Store ohne datierte Records liefert keine Spanne', () => {
  const empty = { records: new Map(), recordDatings: new Map(), persons: new Map() };
  const { personYears, yearRange } = personYearsIndex(empty);
  assert.equal(personYears.size, 0);
  assert.equal(yearRange, null);
});

test('personInTimeRange: ohne Fenster ist jede Person sichtbar', () => {
  const { personYears, yearRange } = personYearsIndex(yearStore());
  assert.equal(personInTimeRange(personYears, yearRange, 'Erwaehnt, C', {}), true);
});

test('personInTimeRange: abgeleitet datierte Person liegt im passenden Fenster', () => {
  const { personYears, yearRange } = personYearsIndex(yearStore());
  const fenster = { yearFrom: 1957, yearTo: 1959 };
  assert.equal(personInTimeRange(personYears, yearRange, 'Abgeleitet, B', fenster), true);
  assert.equal(personInTimeRange(personYears, yearRange, 'Anker, A', fenster), false);
});

test('personInTimeRange: undatierte Person faellt bei aktivem Fenster heraus', () => {
  const { personYears, yearRange } = personYearsIndex(yearStore());
  const fenster = { yearFrom: 1800, yearTo: 2000 };
  assert.equal(personInTimeRange(personYears, yearRange, 'Erwaehnt, C', fenster), false);
});

// ---------------------------------------------------------------------------
// Echte Kette getPersonKategorie -> isPureComposer
//
// Die Tests weiter oben setzen `kategorie` von Hand und pruefen damit nur die
// Filterlogik, nicht ihre Speisung. Genau dort sass der Defekt: die Ausnahmen
// der Wagner-Familie standen in PERSONEN_KATEGORIEN in der Form
// "wieland wagner", waehrend der Datensatz "Wagner, Wieland" fuehrt. Der
// includes-Vergleich in getPersonKategorie traf nie, beide Regisseure wurden
// "Komponist" und fielen aus dem Netzwerk. Die folgenden Tests fuehren die
// Kette in der Reihenfolge, in der der Loader sie fuehrt.
// ---------------------------------------------------------------------------

const NAMEN_AUS_DEM_DATENSATZ = {
  regie: ['Wagner, Wieland', 'Wagner, Wolfgang', 'Wagner, WIeland', 'Wagner, Wieland Gottfried'],
  komponist: ['Wagner, Richard', 'Strauss, Richard'],
};

test('Kette: Regie-Ausnahmen der Wagner-Familie bleiben im Netzwerk', () => {
  for (const name of NAMEN_AUS_DEM_DATENSATZ.regie) {
    const entry = { kategorie: getPersonKategorie(name), records: new Set(['r1']), roles: new Set(['regisseur']) };
    assert.equal(entry.kategorie, 'Regisseur',
      `getPersonKategorie('${name}') liefert '${entry.kategorie}' statt 'Regisseur'`);
    assert.equal(isPureComposer(name, entry), false,
      `'${name}' wird als reiner Komponist aus dem Netzwerk gefiltert`);
  }
});

test('Kette: Werk-Komponisten bleiben gefiltert', () => {
  for (const name of NAMEN_AUS_DEM_DATENSATZ.komponist) {
    const entry = { kategorie: getPersonKategorie(name), records: new Set(['r1']), roles: new Set(['komponist']) };
    assert.equal(entry.kategorie, 'Komponist',
      `getPersonKategorie('${name}') liefert '${entry.kategorie}' statt 'Komponist'`);
    assert.equal(isPureComposer(name, entry), true,
      `'${name}' bleibt faelschlich im Personen-Netzwerk`);
  }
});

test('Kette am erzeugten Datensatz: Wieland und Wolfgang Wagner sind Knoten, Richard nicht', async () => {
  const store = await storeFromShipped();
  const layout = computeLayout(store.persons, { cx: 0, cy: 0, radii: [100, 200] });
  const namen = new Set(layout.nodes.map((n) => n.name));
  for (const name of ['Wagner, Wieland', 'Wagner, Wolfgang']) {
    assert.ok(store.persons.has(name), `'${name}' fehlt im Personen-Index`);
    assert.ok(namen.has(name), `'${name}' fehlt als Knoten im Netzwerk-Layout`);
  }
  assert.equal(namen.has('Wagner, Richard'), false,
    'Richard Wagner ist reiner Werk-Komponist und gehoert nicht ins Personen-Netzwerk');
});

// Zweite Ursache derselben Ausblendung: isPureComposer verglich mit includes
// ohne Wortgrenze. Der Listeneintrag 'wolf' traf damit jedes 'Wolfgang' und
// 'Wolfram', 'verdi' das 'Monteverdi'. Und ein geteilter Nachname genuegte:
// die Saenger 'Weber, Ludiwig' und 'Schubert, Erika' fielen aus dem Netzwerk,
// obwohl sie im Bestand nie als Komponist auftreten. Der Rollenbeleg der
// Person entscheidet, sobald er vorliegt.

test('isPureComposer: Vorname Wolfgang ist kein Komponisten-Nachname', () => {
  const entry = { kategorie: 'Andere', records: new Set(['r1']), roles: new Set(['sänger']) };
  assert.equal(isPureComposer('Witte, Wolfgang', entry), false);
  assert.equal(isPureComposer('Zimmermann, Wolfram', entry), false);
});

test('isPureComposer: geteilter Nachname ohne Komponisten-Rolle bleibt drin', () => {
  const saenger = { kategorie: 'Andere', records: new Set(['r1']), roles: new Set(['sänger']) };
  assert.equal(isPureComposer('Weber, Ludiwig', saenger), false);
  assert.equal(isPureComposer('Schubert, Erika', saenger), false);
});

test('isPureComposer: derselbe Nachname mit Komponisten-Rolle faellt heraus', () => {
  const komponist = { kategorie: 'Komponist', records: new Set(['r1']), roles: new Set(['komponist', 'erwähnt']) };
  assert.equal(isPureComposer('Schubert, Franz', komponist), true);
  assert.equal(isPureComposer('Wagner, Richard', komponist), true);
});

test('Kette am erzeugten Datensatz: nur belegte Komponisten fallen aus dem Netzwerk', async () => {
  const store = await storeFromShipped();
  const zuUnrecht = [];
  for (const [name, entry] of store.persons) {
    if (isMalaniuk(name, entry)) continue;
    if (!isPureComposer(name, entry)) continue;
    const rollen = [...entry.roles].map((r) => String(r).toLowerCase().trim());
    if (rollen.includes('komponist')) continue;
    zuUnrecht.push(`${name} (${entry.records.size} Records, ${rollen.join('/') || 'ohne Rolle'})`);
  }
  assert.deepEqual(zuUnrecht, [],
    'ohne Komponisten-Rolle aus dem Netzwerk gefiltert: ' + zuUnrecht.join(' | '));
});

test('isPureComposer: kuratierte Nicht-Komponisten-Kategorie schuetzt trotz Komponisten-Rolle', () => {
  // Hindemith dirigierte im Bestand und komponierte; die kuratierte
  // Kategorie 'Dirigent' haelt ihn im Netzwerk.
  const entry = { kategorie: 'Dirigent', records: new Set(['r1']), roles: new Set(['dirigent', 'komponist']) };
  assert.equal(isPureComposer('Hindemith, Paul', entry), false);
});

test('Kette am erzeugten Datensatz: kuratierte Kategorien bleiben im Netzwerk', async () => {
  const store = await storeFromShipped();
  const KURATIERT = new Set(['Dirigent', 'Regisseur', 'Kollege', 'Korrepetitor', 'Vermittler', 'Archivsubjekt']);
  const verloren = [];
  for (const [name, entry] of store.persons) {
    if (!KURATIERT.has(entry.kategorie)) continue;
    if (isPureComposer(name, entry)) verloren.push(`${name} (${entry.kategorie})`);
  }
  assert.deepEqual(verloren, [],
    'kuratierte Nicht-Komponisten aus dem Netzwerk gefiltert: ' + verloren.join(' | '));
});
