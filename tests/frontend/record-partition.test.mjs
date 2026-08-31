/**
 * Unit-Tests fuer partitionRecord() aus docs/js/views/archive-inline-detail.js.
 *
 * Lauf:
 *   node --test tests/frontend/record-partition.test.mjs
 *
 * partitionRecord ist die dom-freie Kern-Logik hinter buildRecordBlocks und
 * deckt damit den ansonsten ungetesteten Korb-Pfad ab (views/basket.js rendert
 * ueber dieselbe Partition). Getestet: Agent-Bucketing nach Rolle, AgRelOn-
 * Dedup (kein Doppel-Agent in Bucket + Beziehung), Erwaehnt-Personen aus
 * Subjects, Werk-Erkennung, Aufloesung der Annotationen aus dem Store und die
 * Aufteilung der ortlosen Datierungen auf die beiden Chip-Bloecke.
 *
 * buildRecordBlocks selbst erzeugt DOM (el()) und ist daher hier nicht
 * direkt testbar -- die Chip-Ebene deckt der Playwright-Smoke (Inline-Detail-
 * Anker NIM_004_1) ab.
 *
 * Zwei Strecken wie in datings.test.mjs: synthetische Fixtures fuer die
 * deterministische Logik, ein Anker am Datenstand `data/output/m3gim.jsonld`
 * fuer das reale Ankommen.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { partitionRecord } from '../../docs/js/views/archive-inline-detail.js';
import { loadArchive } from '../../docs/js/data/loader.js';
import { withConcepts } from './_concepts.mjs';
import { DATING_SCOPE } from '../../docs/js/data/constants.js';

/** Verweisknoten einer Rolle, wie die Pipeline ihn schreibt. */
function role(id, prefLabel) {
  return { '@id': `m3gim-vocab:${id}`, 'skos:prefLabel': prefLabel };
}

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

test('partitionRecord: Agenten landen rollenbasiert in Buckets, Erwaehnte aus Subjects', () => {
  const record = {
    '@id': 'm3gim-data:r1',
    'm3gim-ontology:hasAssociatedAgent': [
      // Die Rolle ist ein Verweisknoten. Wer ihn ungefiltert als Schluessel
      // nimmt, bekommt "[object Object]" und schiebt jeden Agenten nach
      // "Weitere" -- deshalb steht der Dirigent hier als Gate.
      { name: 'Karajan', role: role('conductor', 'dirigent') },
      { name: 'Fotograf X', role: role('photographer', 'fotograf') },
    ],
    'rico:hasOrHadSubject': [
      { name: 'Macbeth', '@type': 'm3gim-ontology:MusicalWork' },
      { name: 'Schumann, Karl', '@type': 'rico:Person' },
    ],
  };
  const { bucket, works } = partitionRecord(record, {});

  assert.deepEqual(bucket.produktion.map(a => a.name), ['Karajan']);
  assert.deepEqual(bucket.weitere.map(a => a.name), ['Fotograf X']);
  assert.deepEqual(bucket.erwaehnt.map(p => p.name), ['Schumann, Karl']);
  assert.deepEqual(bucket.mitwirkende, []);
  assert.deepEqual(works.map(w => w.name), ['Macbeth']);
});

test('partitionRecord: Rahmenveranstaltung zaehlt wie das abgeloeste PerformanceEvent zum Werk-Block', () => {
  const record = {
    '@id': 'm3gim-data:r1',
    'rico:hasOrHadSubject': [
      { name: 'Salzburger Festspiele', '@type': 'm3gim-ontology:FramingEvent' },
    ],
  };
  const { works } = partitionRecord(record, {});
  assert.deepEqual(works.map(w => w.name), ['Salzburger Festspiele']);
});

test('partitionRecord: AgRelOn-Dedup unterdrueckt Agent, der schon als Beziehung sichtbar ist', () => {
  const record = {
    '@id': 'm3gim-data:r1',
    'm3gim-ontology:hasAssociatedAgent': [
      { name: 'Böhm', role: role('sender', 'absender') },
    ],
  };
  const store = {
    agentRelations: new Map([
      ['m3gim-data:r1', [{ type: 'agrelon:HasCorrespondent', objectName: 'Böhm' }]],
    ]),
  };
  const { bucket, agentRelations } = partitionRecord(record, store);

  // Böhm darf in keinem Bucket auftauchen (er steht schon unter Beziehungen).
  const allBucketed = [
    ...bucket.produktion, ...bucket.mitwirkende, ...bucket.erwaehnt, ...bucket.weitere,
  ];
  assert.equal(allBucketed.length, 0);
  assert.equal(agentRelations.length, 1);
});

test('partitionRecord: AgRelOn-Rolle OHNE passende Beziehung wird NICHT unterdrueckt', () => {
  const record = {
    '@id': 'm3gim-data:r1',
    'm3gim-ontology:hasAssociatedAgent': [
      { name: 'Unbekannt', role: role('sender', 'absender') },
    ],
  };
  // Keine agentRelations -> kein Dedup. 'absender' ist in ROLE_TO_SECTION als
  // 'mitwirkende' gemappt -> der Agent bleibt dort sichtbar (wird NICHT
  // unterdrueckt, wie es bei vorhandener Korrespondenz-Beziehung passierte).
  const { bucket } = partitionRecord(record, {});
  assert.deepEqual(bucket.mitwirkende.map(a => a.name), ['Unbekannt']);
  assert.deepEqual(bucket.weitere, []);
});

test('partitionRecord: verortete Annotationen werden aus recordToEvents + mobilityEvents aufgeloest', () => {
  const record = { '@id': 'm3gim-data:r2' };
  const store = {
    recordToEvents: new Map([['m3gim-data:r2', ['e1', 'e_missing']]]),
    mobilityEvents: new Map([['e1', { place: 'Wien', date: '1950' }]]),
  };
  const { events } = partitionRecord(record, store);
  assert.equal(events.length, 1);             // e_missing wird ausgefiltert
  assert.equal(events[0].place, 'Wien');
});

test('partitionRecord: Buehnenrollen kommen ueber die Performance-Kette, mit ihrem Qualitaetsflag', () => {
  const record = {
    '@id': 'm3gim-data:r3',
    'm3gim-ontology:hasPerformance': { '@id': 'm3gim-data:perf1' },
  };
  const store = {
    performances: new Map([['m3gim-data:perf1', {
      'm3gim-ontology:hasStageRole': { '@id': 'm3gim-data:sr1' },
      'm3gim-ontology:dataQualityFlag': 'quelle-tippfehler',
    }]]),
    stageRoles: new Map([['m3gim-data:sr1', 'Waltraude']]),
  };
  const { performanceRoles } = partitionRecord(record, store);
  assert.deepEqual(performanceRoles, [{ name: 'Waltraude', qualityFlag: 'quelle-tippfehler' }]);
});

test('partitionRecord: ortlose Datierungen teilen sich auf Erwaehnung und Ereignis auf', async () => {
  const store = await storeFrom({
    '@graph': [
      {
        '@id': 'm3gim-data:r4',
        '@type': 'rico:Record',
        'rico:identifier': 'UAKUG/NIM_x 1',
        'm3gim-ontology:hasAnnotation': [
          { '@id': 'm3gim-data:a_mentioned' },
          { '@id': 'm3gim-data:a_performance' },
          { '@id': 'm3gim-data:a_unfulfilled' },
          { '@id': 'm3gim-data:a_placed' },
        ],
      },
      {
        '@id': 'm3gim-data:a_mentioned',
        '@type': 'm3gim-ontology:Annotation',
        'agrelon:metadataProvenance': { '@id': 'm3gim-data:r4' },
        'm3gim-ontology:atDate': '1872',
        role: role('mentioned', 'erwähnt'),
      },
      {
        '@id': 'm3gim-data:a_performance',
        '@type': 'm3gim-ontology:Annotation',
        'agrelon:metadataProvenance': { '@id': 'm3gim-data:r4' },
        'm3gim-ontology:atDate': '1951-07-30',
        role: role('performance', 'aufführung'),
      },
      {
        // Der Vertragsstatus ist kein Begriff des Vokabulars und traegt die
        // Bezugsebene `unfulfilled`. Er darf nicht stillschweigend wegfallen.
        '@id': 'm3gim-data:a_unfulfilled',
        '@type': 'm3gim-ontology:Annotation',
        'agrelon:metadataProvenance': { '@id': 'm3gim-data:r4' },
        'm3gim-ontology:atDate': '1955-03-01',
        role: 'nicht eingehalten',
      },
      {
        // Verortet -> steht schon im Ort-und-Ereignis-Block, deshalb in keiner
        // der beiden Datierungslisten.
        '@id': 'm3gim-data:a_placed',
        '@type': 'm3gim-ontology:Annotation',
        'agrelon:metadataProvenance': { '@id': 'm3gim-data:r4' },
        'm3gim-ontology:atDate': '1959-10-28',
        'm3gim-ontology:atPlace': { name: 'New York' },
        role: role('dispatch', 'absendung'),
      },
    ],
  });
  const record = store.records.get('m3gim-data:r4');
  const { mentionedDatings, eventDatings, events } = partitionRecord(record, store);

  assert.deepEqual(mentionedDatings.map(d => d.date), ['1872']);
  assert.deepEqual(eventDatings.map(d => d.date), ['1951-07-30', '1955-03-01']);
  assert.deepEqual(events.map(e => e.place), ['New York']);
  // Keine Datierung steht in beiden Listen.
  const ids = new Set(mentionedDatings.map(d => d.id));
  assert.ok(eventDatings.every(d => !ids.has(d.id)));
});

test('partitionRecord: am Datenstand kommt keine verortete Annotation in den Datierungslisten an', async () => {
  const store = await realStore();
  let seenMentioned = 0;
  let seenEvent = 0;
  for (const record of store.allRecords) {
    const { mentionedDatings, eventDatings } = partitionRecord(record, store);
    for (const d of [...mentionedDatings, ...eventDatings]) {
      assert.equal(d.place, null, `verortete Annotation in der Datierungsliste: ${d.id}`);
      assert.ok(d.date, `Datierung ohne Datum: ${d.id}`);
    }
    for (const d of mentionedDatings) assert.equal(d.scope, DATING_SCOPE.mentioned);
    for (const d of eventDatings) assert.notEqual(d.scope, DATING_SCOPE.mentioned);
    seenMentioned += mentionedDatings.length;
    seenEvent += eventDatings.length;
  }
  assert.ok(seenMentioned > 0, 'keine erwaehnte Datierung im Datenstand angekommen');
  assert.ok(seenEvent > 0, 'keine Ereignis-Datierung im Datenstand angekommen');
});

test('partitionRecord: am Datenstand tragen Agenten-Buckets ihre Rollen-Sektion', async () => {
  const store = await realStore();
  const record = store.bySignatur.get('UAKUG/NIM_003 1_1');
  const { bucket } = partitionRecord(record, store);
  // Der Absender ist eine Mitwirkenden-Rolle (Quelle seit E-152: Absender:in
  // statt herausgeber); landete er in "Weitere", waere die Rolle als
  // Verweisknoten ungefiltert durchgereicht worden.
  const namen = bucket.mitwirkende.map(a => a.name);
  assert.ok(namen.includes('Deutsches Musikinstitut für Ausländer'),
    `Absender fehlt im Mitwirkenden-Bucket: ${namen.join(', ')}`);
});

test('partitionRecord: leerer Record liefert leere, aber wohlgeformte Struktur', () => {
  const {
    bucket, works, performanceRoles, events, locations, agentRelations, finances,
    mentionedDatings, eventDatings,
  } = partitionRecord({ '@id': 'x' }, {});
  assert.deepEqual(bucket, { produktion: [], mitwirkende: [], erwaehnt: [], weitere: [] });
  assert.deepEqual(works, []);
  assert.deepEqual(performanceRoles, []);
  assert.deepEqual(events, []);
  assert.deepEqual(locations, []);
  assert.deepEqual(agentRelations, []);
  assert.deepEqual(finances, []);
  assert.deepEqual(mentionedDatings, []);
  assert.deepEqual(eventDatings, []);
});
