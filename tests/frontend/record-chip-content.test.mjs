/**
 * Inhalt der Chips des Inline-Details: Komponist, Felder im Tooltip, Anmerkung.
 *
 * Geprueft werden die drei reinen Funktionen aus
 * docs/js/views/record-detail-data.js, die record-chips.js in DOM uebersetzt,
 * dazu je ein Anker am erzeugten Datenstand. Die Fixtures sind woertliche
 * Knoten aus `data/output/m3gim.jsonld` (UAKUG/NIM_004 10, UAKUG/NIM_023 11).
 *
 * Die drei Befunde, gegen die der Test faellt:
 *   1. Das Werk im Record traegt den Komponisten unter dem @context-Alias
 *      `composer`, der Store unter `komponist`; wer nur eine Schreibweise
 *      liest, zeigt keinen Komponisten.
 *   2. Die modellierten Felder eines Knotens (Beruf, Lebensdaten, Indexnotiz,
 *      Koordinaten, Land) standen nirgends im Detail.
 *   3. `rico:generalDescription` einer Datierung oder Auffuehrung, etwa
 *      „Vertrag nicht eingehalten“, war unsichtbar; die Auffuehrung las sich
 *      als stattgefunden.
 *
 * Lauf: node --test tests/frontend/record-chip-content.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  workComposer, nodeTipLines, qualityTipLines, partitionRecord,
} from '../../docs/js/views/record-detail-data.js';
import { loadArchive } from '../../docs/js/data/loader.js';
import { withConcepts } from './_concepts.mjs';

const OUTPUT_URL = new URL('../../data/output/m3gim.jsonld', import.meta.url);

let outputStore = null;
async function realStore() {
  if (!outputStore) {
    const jsonld = JSON.parse(readFileSync(OUTPUT_URL, 'utf-8'));
    const prevFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ status: 200, ok: true, json: async () => withConcepts(jsonld) });
    try { outputStore = await loadArchive('mock://data'); } finally { globalThis.fetch = prevFetch; }
  }
  return outputStore;
}

// --- Komponist -----------------------------------------------------------

test('workComposer liest beide Schreibweisen des Feldes', () => {
  assert.equal(workComposer({ composer: 'Wagner, Richard' }), 'Wagner, Richard');
  assert.equal(workComposer({ komponist: 'Wagner, Richard' }), 'Wagner, Richard');
  assert.equal(workComposer({ 'm3gim-ontology:composer': 'Wagner, Richard' }), 'Wagner, Richard');
  assert.equal(workComposer({ name: 'Tristan und Isolde' }), '');
  assert.equal(workComposer(null), '');
});

test('Datenstand: das Werk im Record traegt den Komponisten als `composer`', async () => {
  const store = await realStore();
  const record = store.bySignatur.get('UAKUG/NIM_004 10');
  assert.ok(record, 'Anker-Record UAKUG/NIM_004 10 nicht im Store');
  const { works } = partitionRecord(record, store);
  const goetter = works.find(w => w.name === 'Götterdämmerung');
  assert.ok(goetter, 'Götterdämmerung fehlt unter den Werken');
  assert.equal(goetter.komponist, undefined,
    'der Werkknoten im Record traegt `komponist` doch, der Alias ist nachzuziehen');
  assert.equal(workComposer(goetter), 'Wagner, Richard');
});

// --- Felder im Tooltip ---------------------------------------------------

// Der Agent-Knoten aus UAKUG/NIM_004 10, Box 1 Zeile 219, woertlich.
const WIELAND_WAGNER = {
  name: 'Wagner, Wieland',
  '@id': 'wd:Q60465',
  'gndo:professionOrOccupationAsLiteral': ['Bühnenregisseur', 'Komponist'],
  'schema:birthDate': '1917-01-05',
  'schema:deathDate': '1966-10-17',
  'schema:birthPlace': 'Bayreuth',
  'schema:deathPlace': 'München',
  'm3gim-ontology:indexNote': 'Regisseur',
  '@type': 'rico:Person',
};

test('nodeTipLines: Quellfelder zuerst, Wikidata-Ergaenzung unter ihrer Marke', () => {
  const lines = nodeTipLines(WIELAND_WAGNER);
  assert.deepEqual(lines, [
    'Indexnotiz: Regisseur',
    'ergänzt: aus Wikidata Q60465',
    'Beruf: Bühnenregisseur, Komponist',
    'Geburt: 1917-01-05, Bayreuth',
    'Tod: 1966-10-17, München',
  ]);
});

test('nodeTipLines: fehlende Felder fallen weg, ohne Ergaenzung keine Marke', () => {
  assert.deepEqual(nodeTipLines({ name: 'Resnik' }), []);
  assert.deepEqual(nodeTipLines({ 'm3gim-ontology:indexNote': 'Sängerin' }),
    ['Indexnotiz: Sängerin']);
  assert.deepEqual(nodeTipLines(null), []);
});

test('nodeTipLines: Ort traegt Land und Koordinaten woertlich', () => {
  const lines = nodeTipLines({
    name: 'Bayreuth',
    '@id': 'wd:Q3923',
    'geo:lat': 49.948055555556,
    'geo:long': 11.578333333333,
    'm3gim-ontology:country': 'Deutschland',
  });
  assert.deepEqual(lines, [
    'ergänzt: aus Wikidata Q3923',
    'Land: Deutschland',
    'Koordinaten: 49.948055555556, 11.578333333333',
  ]);
});

test('Datenstand: NIM_004 10 zeigt jedes modellierte Feld seiner Knoten', async () => {
  const store = await realStore();
  const record = store.bySignatur.get('UAKUG/NIM_004 10');
  const { bucket, works, locations } = partitionRecord(record, store);
  const all = [...bucket.produktion, ...bucket.mitwirkende, ...bucket.institutionen,
    ...bucket.erwaehnt, ...bucket.weitere];

  const wieland = all.find(a => a.name === 'Wagner, Wieland');
  assert.ok(nodeTipLines(wieland).includes('Geburt: 1917-01-05, Bayreuth'));

  const festspiele = all.find(a => a.name === 'Bayreuther Festspiele');
  assert.deepEqual(nodeTipLines(festspiele), [
    'Sitz: Bayreuth',
    'Kontakt: Wagner, Wolfgang; Klebe, Carl-Heinz',
  ]);

  // Der Erwaehnte traegt eine Indexnotiz neben seinem Qualitaetsflag; beides
  // war unsichtbar, obwohl der Flag als Symbol schon stand.
  const eberhardt = all.find(a => a.name === 'Eberhardt, Paul');
  assert.deepEqual(nodeTipLines(eberhardt),
    ["Indexnotiz: Beleuchtungsassistent, Unsicher: im Original: directeur de l'éclairage"]);

  const tristan = works.find(w => w.name === 'Tristan und Isolde');
  const workLines = nodeTipLines(tristan);
  assert.ok(workLines.includes('Partie: Brangäne'));
  assert.ok(workLines.includes('Gattung: Oper'));
  assert.ok(workLines.includes('Uraufführung: 1865-06-10'));
  assert.equal(tristan.role['skos:prefLabel'], 'premiere',
    'die Rolle des Werks traegt das Chip-Praefix');

  const bayreuth = locations.find(l => l.name === 'Bayreuth');
  assert.ok(nodeTipLines(bayreuth).includes('Land: Deutschland'));
});

// --- Anmerkung -----------------------------------------------------------

test('qualityTipLines: Flag und Anmerkung woertlich, jedes fuer sich', () => {
  assert.deepEqual(qualityTipLines('rolle-unsicher', null), ['Datenqualität: rolle-unsicher']);
  assert.deepEqual(qualityTipLines(null, 'Vertrag nicht eingehalten'),
    ['Anmerkung: Vertrag nicht eingehalten']);
  assert.deepEqual(qualityTipLines('vorname-fehlt', 'sic!'),
    ['Datenqualität: vorname-fehlt', 'Anmerkung: sic!']);
  assert.deepEqual(qualityTipLines(null, null), []);
});

test('Datenstand: NIM_023 11 traegt „Vertrag nicht eingehalten“ an Datierung und Auffuehrung', async () => {
  const store = await realStore();
  const record = store.bySignatur.get('UAKUG/NIM_023 11');
  assert.ok(record, 'Anker-Record UAKUG/NIM_023 11 nicht im Store');
  const { eventDatings, performanceRoles, events } = partitionRecord(record, store);

  const auffuehrungen = eventDatings.filter(d => d.roleId === 'm3gim-vocab:performance');
  assert.equal(auffuehrungen.length, 2);
  for (const d of auffuehrungen) {
    assert.equal(d.description, 'Vertrag nicht eingehalten');
  }
  // Auch der verorteten Annotation und der Buehnenrolle haengt der Vorbehalt an.
  assert.ok(events.every(e => e.description === 'Vertrag nicht eingehalten'));
  assert.deepEqual(performanceRoles.map(r => r.description), ['Vertrag nicht eingehalten']);
});
