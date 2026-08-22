/**
 * Statistik-Datenschicht: Dokumenttyp-Aggregation zeigt Anzeigelabels.
 *
 * Der Aufriss schluesselt auf die kurze Kennung, waehrend store.dftHierarchy
 * auf die praefigierte schluesselt. Ohne die gemeinsame Aufloesungshilfe faellt
 * die Aggregation stumm auf die technische Kennung zurueck und wird damit
 * blind gegen jede Vokabularentscheidung, etwa die Umbenennung des
 * kanonischen Dokumenttyps auf Programm (E-131).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { aggregateDocTypes } from '../../docs/js/views/statistics-data.js';

function makeStore(records, concepts) {
  return {
    allRecords: records,
    dftHierarchy: new Map(concepts.map((c) => [c.id, { prefLabel: c.prefLabel }])),
  };
}

const RECORDS = [
  { 'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:program' } },
  { 'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:program' } },
  { 'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:review' } },
  {},
];

const CONCEPTS = [
  { id: 'm3gim-vocab:program', prefLabel: 'Programm' },
  { id: 'm3gim-vocab:review', prefLabel: 'Rezension' },
];

test('aggregateDocTypes liefert das Anzeigelabel statt der technischen Kennung', () => {
  const rows = aggregateDocTypes(makeStore(RECORDS, CONCEPTS));
  const programm = rows.find((r) => r.id === 'program');
  assert.equal(programm.label, 'Programm');
  assert.equal(programm.count, 2);
  const rezension = rows.find((r) => r.id === 'review');
  assert.equal(rezension.label, 'Rezension');
});

test('aggregateDocTypes faellt nur dort auf die Kennung zurueck, wo kein Concept existiert', () => {
  const rows = aggregateDocTypes(makeStore(RECORDS, [CONCEPTS[0]]));
  assert.equal(rows.find((r) => r.id === 'program').label, 'Programm');
  assert.equal(rows.find((r) => r.id === 'review').label, 'review');
});

test('aggregateDocTypes zaehlt Records ohne Dokumenttyp gesondert', () => {
  const rows = aggregateDocTypes(makeStore(RECORDS, CONCEPTS));
  const ohne = rows.find((r) => r.id === null);
  assert.equal(ohne.label, 'ohne Typ');
  assert.equal(ohne.count, 1);
});

/**
 * Sicht-Ableitung ueber die Mobilitaetssicht am Annotationsknoten.
 *
 * Im zusammengefuehrten Modell traegt die Annotation ihre Sicht selbst
 * (`cluster`), abgeleitet aus der stabilen Concept-Id. Die Rohform der Rolle
 * (`role`) ist die Anzeige- und Aggregationsform aus den Daten und taugt nicht
 * mehr als Schluessel: `mobilityClusterFor('absendung')` findet nichts, weil
 * die Tabelle auf `m3gim-vocab:dispatch` schluesselt. Wer die Sicht aus der
 * Rohform ableitet, schiebt jede Korrespondenz-Annotation nach "Nicht
 * klassifiziert" -- das ist die eingespielte Verletzung hier.
 */

import {
  aggregateSichten, aggregateEventRoles, aggregateDecadesBySicht, filterStore,
} from '../../docs/js/views/statistics-data.js';
import { sichtForRecord } from '../../docs/js/views/chronik-data.js';

function annotation(role, cluster, extra = {}) {
  return { role, roleLabel: role, cluster, place: 'Wien', ...extra };
}

const EVENTS = [
  annotation('absendung', 'korrespondenz', { date: '1959-10-28', recordId: 'r1' }),
  annotation('aufführung', 'performativ', { date: '1951-07-30', recordId: 'r1' }),
  annotation('aufführung', 'performativ', { date: '1961-02-03', recordId: 'r2' }),
  annotation('erwähnt', null, { date: '1872-04-01', recordId: 'r2' }),
];

function eventStore(events = EVENTS) {
  return {
    allRecords: [
      { '@id': 'r1', 'rico:date': '1959-10-28' },
      { '@id': 'r2', 'rico:date': '1961-02-03' },
    ],
    mobilityEvents: new Map(events.map((e, i) => [`e${i}`, e])),
    agentRelations: new Map(),
    finances: new Map(),
    persons: new Map(),
    works: new Map(),
  };
}

test('aggregateSichten zaehlt ueber die Sicht am Knoten, nicht ueber die Rohform der Rolle', () => {
  const rows = aggregateSichten(eventStore());
  assert.equal(rows.find(r => r.id === 'korrespondenz').count, 1);
  assert.equal(rows.find(r => r.id === 'performativ').count, 2);
  // Nur die ausdruecklich sichtlose Rolle bleibt im Residual.
  const residual = rows.find(r => r.id === 'neutral');
  assert.equal(residual.count, 1);
  assert.ok(residual.desc.includes('erwähnt'));
});

test('aggregateEventRoles beschriftet mit der Anzeigeform und faerbt nach der Sicht am Knoten', () => {
  const rows = aggregateEventRoles(eventStore());
  const absendung = rows.find(r => r.role === 'absendung');
  assert.equal(absendung.label, 'absendung');
  assert.equal(absendung.sicht, 'korrespondenz');
  assert.equal(absendung.count, 1);
  assert.equal(rows.find(r => r.role === 'aufführung').sicht, 'performativ');
  assert.equal(rows.find(r => r.role === 'erwähnt').sicht, 'neutral');
});

test('aggregateDecadesBySicht stapelt nach der Sicht am Knoten', () => {
  const { rows } = aggregateDecadesBySicht(eventStore());
  const d1950 = rows.find(r => r.decade === 1950);
  assert.deepEqual(d1950.bySicht, { korrespondenz: 1, performativ: 1 });
  const d1960 = rows.find(r => r.decade === 1960);
  assert.deepEqual(d1960.bySicht, { performativ: 1 });
});

test('filterStore schneidet die Sicht-Facette an der Sicht am Knoten', () => {
  const store = eventStore();
  const sub = filterStore(store, {
    lo: 1900, hi: 2000, sichten: new Set(['korrespondenz']),
  });
  assert.equal(sub.mobilityEvents.size, 1);
  assert.equal([...sub.mobilityEvents.values()][0].role, 'absendung');
});

test('sichtForRecord leitet die dominante Sicht aus der Sicht am Knoten ab', () => {
  // chronik-data spiegelt den statistics-data-Split; die Sicht-Ableitung je
  // Record laeuft ueber dieselbe Eigenschaft des Annotationsknotens.
  const store = {
    recordToEvents: new Map([['r1', ['e0', 'e1']], ['r2', ['e3']]]),
    mobilityEvents: new Map(EVENTS.map((e, i) => [`e${i}`, e])),
  };
  const r1 = sichtForRecord(store, 'r1');
  assert.equal(r1.hasSte, true);
  assert.equal(r1.divergent, true);
  assert.deepEqual([...r1.sichten].sort(), ['korrespondenz', 'performativ']);
  // Ein Record, dessen einzige Annotation ausdruecklich keine Sicht traegt,
  // bleibt neutral statt eine Sicht zu erfinden.
  assert.equal(sichtForRecord(store, 'r2').sicht, 'neutral');
});
