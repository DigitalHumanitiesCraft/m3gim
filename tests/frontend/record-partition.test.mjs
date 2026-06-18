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
 * Subjects, Werk-Erkennung, Event-Aufloesung aus dem Store.
 *
 * buildRecordBlocks selbst erzeugt DOM (el()) und ist daher hier nicht
 * direkt testbar -- die Chip-Ebene deckt der Playwright-Smoke (Inline-Detail-
 * Anker NIM_004_1) ab.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { partitionRecord } from '../../docs/js/views/archive-inline-detail.js';
import { steChipPrefix } from '../../docs/js/data/constants.js';

test('partitionRecord: Agenten landen rollenbasiert in Buckets, Erwaehnte aus Subjects', () => {
  const record = {
    '@id': 'r1',
    'm3gim:hasAssociatedAgent': [
      { name: 'Karajan', role: 'dirigent' },   // -> produktion (ROLE_TO_SECTION)
      { name: 'Fotograf X', role: 'fotograf' }, // unbekannte Rolle -> weitere
    ],
    'rico:hasOrHadSubject': [
      { name: 'Macbeth', '@type': 'm3gim:MusicalWork' },
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

test('partitionRecord: AgRelOn-Dedup unterdrueckt Agent, der schon als Beziehung sichtbar ist', () => {
  const record = {
    '@id': 'r1',
    'm3gim:hasAssociatedAgent': [{ name: 'Böhm', role: 'absender' }],
  };
  const store = {
    agentRelations: new Map([
      ['r1', [{ type: 'agrelon:HasCorrespondent', objectName: 'Böhm' }]],
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
    '@id': 'r1',
    'm3gim:hasAssociatedAgent': [{ name: 'Unbekannt', role: 'absender' }],
  };
  // Keine agentRelations -> kein Dedup. 'absender' ist in ROLE_TO_SECTION als
  // 'mitwirkende' gemappt -> der Agent bleibt dort sichtbar (wird NICHT
  // unterdrueckt, wie es bei vorhandener Korrespondenz-Beziehung passierte).
  const { bucket } = partitionRecord(record, {});
  assert.deepEqual(bucket.mitwirkende.map(a => a.name), ['Unbekannt']);
  assert.deepEqual(bucket.weitere, []);
});

test('partitionRecord: Events werden aus recordToEvents + mobilityEvents aufgeloest', () => {
  const record = { '@id': 'r2' };
  const store = {
    recordToEvents: new Map([['r2', ['e1', 'e_missing']]]),
    mobilityEvents: new Map([['e1', { place: 'Wien', date: '1950' }]]),
  };
  const { events } = partitionRecord(record, store);
  assert.equal(events.length, 1);             // e_missing wird ausgefiltert
  assert.equal(events[0].place, 'Wien');
});

test('steChipPrefix: E-97-Mobilitaets-Ortsrollen werden zum Uppercase-Prefix', () => {
  // Diese drei sind nicht in STE_ROLE_DISPLAY gelistet -> Fallback Uppercase.
  // Sichert den ZIELORT/ABSENDEORT/ABREISEORT-Prefix der datumslosen Chips ab.
  assert.equal(steChipPrefix('zielort'), 'ZIELORT');
  assert.equal(steChipPrefix('absendeort'), 'ABSENDEORT');
  assert.equal(steChipPrefix('abreiseort'), 'ABREISEORT');
  // Datumsrollen werden hingegen auf Orts-/Ereignisrollen gemappt.
  assert.equal(steChipPrefix('absendedatum'), 'ABSENDEORT');
  assert.equal(steChipPrefix('auffuehrungsdatum'), 'AUFFÜHRUNG');
  // Leerwert faellt auf den generischen EREIGNIS-Prefix.
  assert.equal(steChipPrefix(null), 'EREIGNIS');
});

test('partitionRecord: leerer Record liefert leere, aber wohlgeformte Struktur', () => {
  const { bucket, works, performanceRoles, events, locations, agentRelations, finances } =
    partitionRecord({ '@id': 'x' }, {});
  assert.deepEqual(bucket, { produktion: [], mitwirkende: [], erwaehnt: [], weitere: [] });
  assert.deepEqual(works, []);
  assert.deepEqual(performanceRoles, []);
  assert.deepEqual(events, []);
  assert.deepEqual(locations, []);
  assert.deepEqual(agentRelations, []);
  assert.deepEqual(finances, []);
});
