/**
 * Unit-Tests der reinen Auftritt-Helfer aus docs/js/views/record-detail-data.js.
 *
 * Lauf:
 *   node --test tests/frontend/auftritt-grouping.test.mjs
 *
 * Getestet: Datumsordnung der Datierungen, Buendelung der Auffuehrungen unter
 * ihrer Spielzeit und die Zuordnung Buehnenrolle -> Werk. Alle Fixtures tragen
 * echte Werte aus `docs/data/m3gim.jsonld` (UAKUG/NIM_022 1_1 und
 * UAKUG/NIM_139 104), dazu je ein Anker am erzeugten Datenstand.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  sortDatingsByDate, groupPerformanceDatings, groupRolesByWork, partitionRecord,
} from '../../docs/js/views/record-detail-data.js';
import { loadArchive } from '../../docs/js/data/loader.js';
import { withConcepts } from './_concepts.mjs';

/** Datierung in der Form, die der Loader liefert. */
function dating(roleId, date, row, roleLabel) {
  return { roleId, date, rawDate: date, roleLabel, xlsxSource: { sheet: 'Box 2', row, datenpunkt: 1 } };
}

// Die Spielzeit und die vierzehn Auffuehrungen von UAKUG/NIM_022 1_1,
// Quellzeilen 5 bis 19 aus Box 2, in Quellreihenfolge.
const NIM_022_DATINGS = [
  dating('m3gim-vocab:season', '1952-06-22/1952-08-25', 5, 'spielzeit'),
  dating('m3gim-vocab:performance', '1952-07-30', 6, 'aufführung'),
  dating('m3gim-vocab:performance', '1952-08-03', 7, 'aufführung'),
  dating('m3gim-vocab:performance', '1952-08-06', 8, 'aufführung'),
  dating('m3gim-vocab:performance', '1952-08-09', 9, 'aufführung'),
  dating('m3gim-vocab:performance', '1952-08-17', 10, 'aufführung'),
  dating('m3gim-vocab:performance', '1952-08-21', 11, 'aufführung'),
  dating('m3gim-vocab:performance', '1952-08-24', 12, 'aufführung'),
  dating('m3gim-vocab:performance', '1952-07-23', 13, 'aufführung'),
  dating('m3gim-vocab:performance', '1952-08-02', 14, 'aufführung'),
  dating('m3gim-vocab:performance', '1952-08-07', 15, 'aufführung'),
  dating('m3gim-vocab:performance', '1952-08-20', 16, 'aufführung'),
  dating('m3gim-vocab:performance', '1952-08-25', 17, 'aufführung'),
  dating('m3gim-vocab:performance', '1952-07-24', 18, 'aufführung'),
  dating('m3gim-vocab:performance', '1952-08-12', 19, 'aufführung'),
];

async function storeFrom(jsonld) {
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 200, ok: true, json: async () => withConcepts(jsonld) });
  try {
    return await loadArchive('mock://data');
  } finally {
    globalThis.fetch = prevFetch;
  }
}

let outputStore = null;
async function realStore() {
  if (!outputStore) {
    const url = new URL('../../data/output/m3gim.jsonld', import.meta.url);
    outputStore = await storeFrom(JSON.parse(readFileSync(url, 'utf-8')));
  }
  return outputStore;
}

test('sortDatingsByDate: aufsteigend, Undatiertes zuletzt, Gleichstand in Quellreihenfolge', () => {
  const sorted = sortDatingsByDate([
    dating('m3gim-vocab:performance', '1952-08-24', 12),
    dating('m3gim-vocab:performance', '1952-07-23', 13),
    dating('m3gim-vocab:performance', null, 20),
    dating('m3gim-vocab:performance', '1952-07-23', 21),
  ]);
  assert.deepEqual(sorted.map(d => d.xlsxSource.row), [13, 21, 12, 20]);
});

test('sortDatingsByDate: eine Spanne ordnet nach ihrem Beginn', () => {
  const sorted = sortDatingsByDate([
    dating('m3gim-vocab:performance', '1952-07-30', 6),
    dating('m3gim-vocab:season', '1952-06-22/1952-08-25', 5),
  ]);
  assert.deepEqual(sorted.map(d => d.xlsxSource.row), [5, 6]);
});

test('groupPerformanceDatings: NIM_022 1_1 buendelt vierzehn Auffuehrungen unter einer Spielzeit', () => {
  const { seasons, rest } = groupPerformanceDatings(NIM_022_DATINGS);
  assert.equal(seasons.length, 1);
  assert.equal(rest.length, 0, 'keine Datierung bleibt uebrig');
  assert.equal(seasons[0].season.xlsxSource.row, 5);
  assert.equal(seasons[0].dates.length, 14);
  // Datumsordnung: 23. Juli steht vor dem 24. August, anders als in der Quelle.
  assert.deepEqual(seasons[0].dates.slice(0, 4).map(d => d.date),
    ['1952-07-23', '1952-07-24', '1952-07-30', '1952-08-02']);
  assert.equal(seasons[0].dates.at(-1).date, '1952-08-25');
  // Jede Auffuehrung behaelt ihre Quellzeile fuer den Tooltip.
  assert.ok(seasons[0].dates.every(d => d.xlsxSource && d.xlsxSource.row));
});

test('groupPerformanceDatings: eine Auffuehrung ausserhalb der Spanne bleibt eigenstaendig', () => {
  const { seasons, rest } = groupPerformanceDatings([
    ...NIM_022_DATINGS,
    dating('m3gim-vocab:performance', '1953-01-05', 99),
  ]);
  assert.equal(seasons[0].dates.length, 14);
  assert.deepEqual(rest.map(d => d.xlsxSource.row), [99]);
});

test('groupPerformanceDatings: ohne Spielzeit bleibt alles flach und nur datumssortiert', () => {
  const flat = NIM_022_DATINGS.filter(d => d.roleId !== 'm3gim-vocab:season');
  const { seasons, rest } = groupPerformanceDatings(flat);
  assert.equal(seasons.length, 0);
  assert.equal(rest.length, 14);
  assert.equal(rest[0].date, '1952-07-23');
});

test('groupPerformanceDatings: eine Spielzeit ohne Auffuehrungen bleibt ein einfacher Chip', () => {
  const { seasons, rest } = groupPerformanceDatings([
    dating('m3gim-vocab:season', '1952-06-22/1952-08-25', 5, 'spielzeit'),
  ]);
  assert.equal(seasons.length, 0);
  assert.deepEqual(rest.map(d => d.roleId), ['m3gim-vocab:season']);
});

// Die drei Werke von UAKUG/NIM_022 1_1 mit ihrer gesungenen Partie, Box 2
// Zeilen 22 bis 24; die Schreibweise "Magdalene" weicht von der Buehnenrolle
// "Magdalena" (Zeile 25) ab, das ist der Quellbefund.
const NIM_022_WORKS = [
  { '@type': 'm3gim-ontology:MusicalWork', name: 'Die Meistersinger von Nürnberg', 'm3gim-ontology:sungPart': 'Magdalene' },
  { '@type': 'm3gim-ontology:MusicalWork', name: 'Tristan und Isolde', 'm3gim-ontology:sungPart': 'Brangäne' },
  { '@type': 'm3gim-ontology:MusicalWork', name: 'Das Rheingold', 'm3gim-ontology:sungPart': 'Fricka' },
];

test('groupRolesByWork: mehrere Werke loesen ueber die gesungene Partie auf', () => {
  const roles = [{ name: 'Magdalena' }, { name: 'Brangäne' }, { name: 'Fricka' }];
  const { groups, looseRoles } = groupRolesByWork(NIM_022_WORKS, roles);
  assert.deepEqual(groups.map(g => [g.work.name, g.roles.map(r => r.name)]), [
    ['Die Meistersinger von Nürnberg', []],
    ['Tristan und Isolde', ['Brangäne']],
    ['Das Rheingold', ['Fricka']],
  ]);
  // Magdalena bleibt frei, weil die Quelle die Partie "Magdalene" schreibt.
  assert.deepEqual(looseRoles.map(r => r.name), ['Magdalena']);
});

test('groupRolesByWork: ein einziges Werk nimmt die ganze Besetzung auf', () => {
  const works = [{ '@type': 'm3gim-ontology:MusicalWork', name: 'Tristan und Isolde', 'm3gim-ontology:sungPart': 'Brangäne' }];
  const roles = [{ name: 'Tristan' }, { name: 'Isolde' }, { name: 'König Marke' }];
  const { groups, looseRoles } = groupRolesByWork(works, roles);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].roles.map(r => r.name), ['Tristan', 'Isolde', 'König Marke']);
  assert.equal(looseRoles.length, 0);
});

test('groupRolesByWork: eine Partie mit zwei Namen bindet beide Rollen', () => {
  // UAKUG/NIM_004_10 fuehrt "Waltraute/Zweite Norn" als eine sungPart-Zelle.
  const works = [
    { '@type': 'm3gim-ontology:MusicalWork', name: 'Götterdämmerung', 'm3gim-ontology:sungPart': 'Waltraute/Zweite Norn' },
    { '@type': 'm3gim-ontology:MusicalWork', name: 'Tristan und Isolde', 'm3gim-ontology:sungPart': 'Brangäne' },
  ];
  const { groups, looseRoles } = groupRolesByWork(works, [
    { name: 'Waltraute' }, { name: 'Zweite Norn' }, { name: 'Hagen' },
  ]);
  assert.deepEqual(groups[0].roles.map(r => r.name), ['Waltraute', 'Zweite Norn']);
  // Die uebrige Besetzung bleibt frei, die Quelle verknuepft sie mit keinem Werk.
  assert.deepEqual(looseRoles.map(r => r.name), ['Hagen']);
});

test('groupRolesByWork: ohne Werk bleibt jede Rolle frei', () => {
  const { groups, looseRoles } = groupRolesByWork([], [{ name: 'Fricka' }]);
  assert.equal(groups.length, 0);
  assert.deepEqual(looseRoles.map(r => r.name), ['Fricka']);
});

test('Datenstand: NIM_022 1_1 traegt eine Spielzeit mit vierzehn Auffuehrungen', async () => {
  const store = await realStore();
  const record = store.bySignatur.get('UAKUG/NIM_022 1_1');
  assert.ok(record, 'Anker-Record UAKUG/NIM_022 1_1 nicht im Store');
  const { eventDatings, works, performanceRoles } = partitionRecord(record, store);
  const { seasons, rest } = groupPerformanceDatings(eventDatings);
  assert.equal(seasons.length, 1);
  assert.equal(seasons[0].dates.length, 14);
  assert.equal(rest.length, 0);

  const { groups, looseRoles } = groupRolesByWork(works, performanceRoles);
  const rheingold = groups.find(g => g.work.name === 'Das Rheingold');
  assert.ok(rheingold, 'Das Rheingold fehlt unter den Werken');
  assert.deepEqual(rheingold.roles.map(r => r.name), ['Fricka']);
  assert.deepEqual(looseRoles.map(r => r.name), ['Magdalena']);
});

test('Datenstand: NIM_139 104 haengt die ganze Besetzung an Tristan und Isolde', async () => {
  const store = await realStore();
  const record = store.bySignatur.get('UAKUG/NIM_139 104');
  assert.ok(record, 'Anker-Record UAKUG/NIM_139 104 nicht im Store');
  const { works, performanceRoles } = partitionRecord(record, store);
  const { groups, looseRoles } = groupRolesByWork(works, performanceRoles);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].work.name, 'Tristan und Isolde');
  assert.equal(groups[0].roles.length, 9);
  assert.equal(looseRoles.length, 0);
  // Jede Rolle traegt ihre Quellzeile und ihre Besetzung aus der Performance.
  assert.ok(groups[0].roles.every(r => r.xlsxSource && r.xlsxSource.row),
    'Rolle ohne Quellzeile — die Provenance-Pille fiele aus');
  const isolde = groups[0].roles.find(r => r.name === 'Isolde');
  assert.deepEqual(isolde.performers, ['Birgit Nilsson']);
});
