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
  aggregateStageRoles, aggregateComposers,
} from '../../docs/js/views/statistik-data.js';

function makeStore(records, concepts) {
  return {
    allRecords: records,
    recordDatings: new Map(),
    dftHierarchy: new Map(concepts.map((c) => [c.id, {
      prefLabel: c.prefLabel, children: c.children || [],
    }])),
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
    assert.deepEqual(ohne.recordIds, ['r4'],
      'die Erschliessungsluecke bleibt ohne erfundenen Facettenwert erreichbar');
  });

  test('aggregateDocTypes zaehlt nur im Schnitt', () => {
    const rows = aggregateDocTypes(makeStore(RECORDS, CONCEPTS), new Set(['r1', 'r3']));
    assert.equal(rows.find((r) => r.id === 'program').count, 1);
    assert.equal(rows.find((r) => r.id === null), undefined,
      'Der Record ohne Typ liegt ausserhalb des Schnitts und darf nicht zaehlen.');
  });

  test('Oberbegriffe zaehlen denselben distinkten Unterbaum wie ihre Facette', () => {
    const concepts = [
      { id: 'm3gim-vocab:correspondence', prefLabel: 'Korrespondenz',
        children: ['m3gim-vocab:letter'] },
      { id: 'm3gim-vocab:letter', prefLabel: 'Brief' },
    ];
    const records = [
      { '@id': 'direct', 'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:correspondence' } },
      { '@id': 'child', 'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:letter' } },
    ];
    const rows = aggregateDocTypes(makeStore(records, concepts));
    const parent = rows.find(row => row.id === 'correspondence');
    assert.equal(parent.count, 2);
    assert.deepEqual(parent.recordIds.sort(), ['child', 'direct']);
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
    assert.deepEqual(rows[0].recordIds.sort(), ['r1', 'r2'],
      'die Rangzeile führt ihre konkreten Belege für den Drilldown');
  });

  test('aggregateStageRoles zaehlt Dokumente je Partie, nicht Auffuehrungen', () => {
    const rows = aggregateStageRoles(entityStore(), cut);
    assert.deepEqual(rows.map((r) => [r.label, r.count]), [['Brangäne', 2], ['Isolde', 1]]);
    assert.deepEqual(rows[0].recordIds.sort(), ['r1', 'r2']);
  });

  test('aggregateComposers zaehlt ein Dokument mit zwei Werken desselben Komponisten einmal', () => {
    const store = entityStore();
    store.works.set('Tristan', { records: new Set(['r1']), komponist: 'Wagner, Richard' });
    const rows = aggregateComposers(store, cut);
    assert.deepEqual(rows.map((r) => [r.label, r.count]),
      [['Wagner, Richard', 2], ['Bizet, Georges', 1]]);
    assert.deepEqual(rows[0].recordIds.sort(), ['r1', 'r2'],
      'die Komponistenzeile führt alle distinkt gezählten Dokumente');
  });
});

// ---------------------------------------------------------------------------
// Die geteilte Farbskala der Rollen (F1: die Mobilitaetssichten sind fort)
// ---------------------------------------------------------------------------

import { rankedRoleScale, REST_COLOR } from '../../docs/js/views/statistik-data.js';
import * as statistikData from '../../docs/js/views/statistik-data.js';

describe('rankedRoleScale', () => {
  const entries = [
    { key: 'a', label: 'absendung', count: 3 },
    { key: 'b', label: 'aufführung', count: 9 },
    { key: 'c', label: 'entstehung', count: 5 },
    { key: 'd', label: 'gastspiel', count: 2 },
    { key: 'e', label: 'premiere', count: 2 },
    { key: 'f', label: 'probe', count: 1 },
    { key: 'g', label: 'spielzeit', count: 1 },
    { key: 'h', label: 'wohnort', count: 1 },
  ];

  test('die Rangfolge steht nach Haeufigkeit, bei Gleichstand alphabetisch', () => {
    assert.deepEqual([...rankedRoleScale(entries).keys()],
      ['b', 'c', 'a', 'd', 'e', 'f', 'g', 'h']);
  });

  test('die sechs haeufigsten Rollen tragen je eine der sechs Kategorienfarben', () => {
    const scale = rankedRoleScale(entries);
    const coloured = [...scale.values()].filter(e => e.color !== REST_COLOR);
    assert.equal(coloured.length, 6, 'die Farbpalette der Tokens hat sechs Toene');
    assert.deepEqual(coloured.map(e => e.color),
      ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)',
        'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)']);
    // Der lange Schwanz teilt sich den Grauton, statt eine Farbe zu wiederholen
    // und damit zwei Rollen als dieselbe zu zeigen.
    assert.deepEqual([...scale.values()].filter(e => e.color === REST_COLOR).map(e => e.key),
      ['g', 'h']);
  });

  test('die Anzeigeform wird grossgeschrieben, das Vokabular bleibt klein', () => {
    assert.equal(rankedRoleScale(entries).get('b').label, 'Aufführung');
  });

  test('die Mobilitaetssichten sind aus der geteilten Datenschicht fort (F1)', () => {
    // Sie waren hier die geteilte Quelle fuer Karte und Chronik; ein
    // uebriggebliebener Export brauchte einen Verbraucher, den es nicht gibt.
    assert.equal(statistikData.SICHTEN, undefined);
    assert.equal(statistikData.SICHT_COLOR, undefined);
  });
});
