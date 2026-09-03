/**
 * Statistik-Datenschicht: Anzeigelabels und der Schnitt als Zaehlgrundlage.
 *
 * Zwei Defekte stehen hinter dieser Datei. Der erste: der Aufriss der
 * Dokumenttypen schluesselt auf die kurze Kennung, waehrend store.dftHierarchy
 * auf die praefigierte schluesselt; ohne die gemeinsame Aufloesungshilfe faellt
 * die Aggregation stumm auf die technische Kennung zurueck und wird damit blind
 * gegen jede Vokabularentscheidung, etwa die Umbenennung des kanonischen
 * Dokumenttyps auf Programm (E-131).
 *
 * Der zweite: seit E-160 zeigt die Statistik den Bestand in Zahlen, und der
 * geteilte Schnitt muss sie schneiden. Jede Aggregation nimmt die
 * Dokumentmenge des Schnitts und zaehlt darin; zaehlte eine am Schnitt vorbei,
 * zeigte die Ansicht Zahlen einer anderen Menge als die Ergebniszeile daneben.
 *
 * Lauf: node --test tests/frontend/statistik-data.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateDocTypes, aggregateEntities, aggregateAgentRoles,
  aggregateStageRoles, aggregateComposers, aggregateCatalogueGaps,
} from '../../docs/js/views/statistik-data.js';

function makeStore(records, concepts) {
  return {
    allRecords: records,
    recordDatings: new Map(),
    dftHierarchy: new Map(concepts.map((c) => [c.id, { prefLabel: c.prefLabel }])),
  };
}

const RECORDS = [
  { '@id': 'r1', 'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:program' } },
  { '@id': 'r2', 'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:program' } },
  { '@id': 'r3', 'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:review' } },
  { '@id': 'r4' },
];

const CONCEPTS = [
  { id: 'm3gim-vocab:program', prefLabel: 'Programm' },
  { id: 'm3gim-vocab:review', prefLabel: 'Rezension' },
];

describe('Dokumenttypen', () => {
  test('aggregateDocTypes liefert das Anzeigelabel statt der technischen Kennung', () => {
    const rows = aggregateDocTypes(makeStore(RECORDS, CONCEPTS));
    const programm = rows.find((r) => r.id === 'program');
    assert.equal(programm.label, 'Programm');
    assert.equal(programm.count, 2);
    assert.equal(rows.find((r) => r.id === 'review').label, 'Rezension');
  });

  test('aggregateDocTypes faellt nur dort auf die Kennung zurueck, wo kein Concept existiert', () => {
    const rows = aggregateDocTypes(makeStore(RECORDS, [CONCEPTS[0]]));
    assert.equal(rows.find((r) => r.id === 'program').label, 'Programm');
    assert.equal(rows.find((r) => r.id === 'review').label, 'review');
  });

  test('aggregateDocTypes zaehlt Records ohne Dokumenttyp gesondert', () => {
    const ohne = aggregateDocTypes(makeStore(RECORDS, CONCEPTS)).find((r) => r.id === null);
    assert.equal(ohne.label, 'ohne Typ');
    assert.equal(ohne.count, 1);
  });

  test('aggregateDocTypes zaehlt nur im Schnitt', () => {
    const rows = aggregateDocTypes(makeStore(RECORDS, CONCEPTS), new Set(['r1', 'r3']));
    assert.equal(rows.find((r) => r.id === 'program').count, 1);
    assert.equal(rows.find((r) => r.id === null), undefined,
      'Der Record ohne Typ liegt ausserhalb des Schnitts und darf nicht zaehlen.');
  });
});

// --- Entitaeten, Rollen, Repertoire ---------------------------------------

function entityStore() {
  return {
    allRecords: RECORDS,
    persons: new Map([
      ['Malaniuk, Ira', { records: new Set(['r1', 'r2', 'r3']) }],
      ['Wagner, Wieland', { records: new Set(['r4']) }],
    ]),
    organizations: new Map([
      ['Bayreuther Festspiele', { records: new Set(['r1', 'r4']) }],
    ]),
    works: new Map([
      ['Tristan und Isolde', { records: new Set(['r1', 'r2']), komponist: 'Wagner, Richard' }],
      ['Walküre', { records: new Set(['r4']), komponist: 'Wagner, Richard' }],
      ['Carmen', { records: new Set(['r3']), komponist: 'Bizet, Georges' }],
    ]),
    recordsByAgentRole: new Map([
      ['m3gim-vocab:singer', new Set(['r1', 'r2'])],
      ['m3gim-vocab:namenlos', new Set(['r1'])],
    ]),
    roleVocab: new Map([
      ['m3gim-vocab:singer', { id: 'm3gim-vocab:singer', label: 'sänger' }],
      ['m3gim-vocab:namenlos', { id: 'm3gim-vocab:namenlos' }],
    ]),
    recordToPerformances: new Map([
      ['r1', [{ stageRoles: ['Brangäne', 'Isolde'] }]],
      ['r2', [{ stageRoles: ['Brangäne'] }]],
      ['r4', [{ stageRoles: ['Fricka'] }]],
    ]),
  };
}

describe('Entitaeten und Repertoire im Schnitt', () => {
  const cut = new Set(['r1', 'r2', 'r3']);

  test('aggregateEntities zaehlt die Dokumente des Schnitts, absteigend', () => {
    const rows = aggregateEntities(entityStore(), 'persons', cut);
    assert.deepEqual(rows.map((r) => [r.value, r.count]), [['Malaniuk, Ira', 3]]);
    assert.equal(rows[0].label, 'Malaniuk, Ira',
      'Der Facettenwert ist zugleich die Beschriftung, sonst fuehrt die Zeile ins Leere.');
  });

  test('aggregateEntities laesst Eintraege ohne Dokument im Schnitt weg', () => {
    const rows = aggregateEntities(entityStore(), 'organizations', new Set(['r2', 'r3']));
    assert.deepEqual(rows, []);
  });

  test('aggregateAgentRoles nimmt nur Rollen mit Anzeigeform (E-143)', () => {
    const rows = aggregateAgentRoles(entityStore(), cut);
    assert.deepEqual(rows.map((r) => [r.value, r.label, r.count]),
      [['m3gim-vocab:singer', 'sänger', 2]]);
  });

  test('aggregateStageRoles zaehlt Dokumente je Partie, nicht Auffuehrungen', () => {
    const rows = aggregateStageRoles(entityStore(), cut);
    assert.deepEqual(rows.map((r) => [r.label, r.count]), [['Brangäne', 2], ['Isolde', 1]]);
  });

  test('aggregateComposers zaehlt ein Dokument mit zwei Werken desselben Komponisten einmal', () => {
    const store = entityStore();
    store.works.set('Tristan', { records: new Set(['r1']), komponist: 'Wagner, Richard' });
    const rows = aggregateComposers(store, cut);
    assert.deepEqual(rows.map((r) => [r.label, r.count]),
      [['Wagner, Richard', 2], ['Bizet, Georges', 1]]);
  });
});

// --- Erschliessungsstand ---------------------------------------------------

test('aggregateCatalogueGaps rechnet ueber den Schnitt', () => {
  const store = makeStore(RECORDS, CONCEPTS);
  const gaps = aggregateCatalogueGaps(store, new Set(['r1', 'r4']));
  assert.equal(gaps.total, 2);
  assert.equal(gaps.axes.find((a) => a.id === 'typ').filled, 1);
  assert.equal(gaps.axes.find((a) => a.id === 'typ').missing, 1);
  assert.equal(gaps.none, 1, 'r4 traegt keine einzige Erschliessungsachse');
});

// --- Sicht am Knoten -------------------------------------------------------

/**
 * Die Sicht steht am Annotationsknoten (`cluster`), abgeleitet aus der stabilen
 * Concept-Id. Die Rohform der Rolle taugt nicht als Schluessel:
 * `mobilityClusterFor('absendung')` findet nichts, weil die Tabelle auf
 * `m3gim-vocab:dispatch` schluesselt. Wer die Sicht aus der Rohform ableitet,
 * schiebt jede Korrespondenz-Annotation nach "Nicht klassifiziert".
 */
import { sichtForRecord } from '../../docs/js/views/chronik-data.js';

const ANNOTATIONS = [
  { role: 'absendung', roleLabel: 'absendung', cluster: 'korrespondenz', date: '1959-10-28', recordId: 'r1' },
  { role: 'aufführung', roleLabel: 'aufführung', cluster: 'performativ', date: '1951-07-30', recordId: 'r1' },
  { role: 'erwähnt', roleLabel: 'erwähnt', cluster: null, date: '1872-04-01', recordId: 'r2' },
];

test('sichtForRecord leitet die dominante Sicht aus der Sicht am Knoten ab', () => {
  const store = {
    recordToEvents: new Map([['r1', ['e0', 'e1']], ['r2', ['e2']]]),
    mobilityEvents: new Map(ANNOTATIONS.map((a, i) => [`e${i}`, a])),
  };
  const r1 = sichtForRecord(store, 'r1');
  assert.equal(r1.hasSte, true);
  assert.equal(r1.divergent, true);
  assert.deepEqual([...r1.sichten].sort(), ['korrespondenz', 'performativ']);
  // Ein Record, dessen einzige Annotation ausdruecklich keine Sicht traegt,
  // bleibt neutral statt eine Sicht zu erfinden.
  assert.equal(sichtForRecord(store, 'r2').sicht, 'neutral');
});
