/**
 * Die typisierte Erschliessungsanzeige der Bestand-Tabelle (E-158).
 *
 * `familiesForRecord` ist die dom-freie Kern-Logik hinter den vier Punkten je
 * Objektzeile: sie zaehlt aus derselben Partition, aus der das Inline-Detail
 * seine Bloecke baut, und liefert die Familien in CONTENT_FAMILIES-Reihenfolge.
 * Bricht diese Reihenfolge oder eine Zuordnung, tragen Tabelle und Detail
 * unterschiedliche Farben fuer dieselbe Sache, und die Legende aus Naehe
 * (design.md Regel 2) faellt in sich zusammen.
 *
 * Lauf: node --test tests/frontend/bestand-families.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import { CONTENT_FAMILIES, familyOfBlock } from '../../docs/js/data/constants.js';
import {
  annotateKonvolutHeadTips, familiesForRecord, getOrderedItems,
  konvolutFamilyTip, pruneEmptyKonvolute,
} from '../../docs/js/views/bestand-data.js';
import { partitionRecord } from '../../docs/js/views/record-detail-data.js';
import { storeFromShipped } from './_shipped.mjs';

let store;
before(async () => {
  store = await storeFromShipped();
});

const BAYREUTH_1953 = 'm3gim-data:NIM_004_10';

describe('familiesForRecord am ausgelieferten Datenstand', () => {
  test('liefert die vier Familien in CONTENT_FAMILIES-Reihenfolge', () => {
    const record = store.records.get(BAYREUTH_1953);
    assert.ok(record, `${BAYREUTH_1953} muss im ausgelieferten Datensatz stehen`);
    const families = familiesForRecord(record, store);
    assert.deepEqual(
      families.map(f => f.key),
      CONTENT_FAMILIES.map(f => f.key),
      'Die Reihenfolge traegt die Farbzuordnung zwischen Tabelle und Detail.'
    );
    assert.deepEqual(families.map(f => f.label), CONTENT_FAMILIES.map(f => f.label));
  });

  test('die Bayreuther Rezension von 1953 traegt einen Ortsbezug', () => {
    const families = familiesForRecord(store.records.get(BAYREUTH_1953), store);
    const ort = families.find(f => f.key === 'ort');
    assert.ok(ort.count > 0, (
      'Ein raumzeitlich erschlossener Record muss die Ort-Familie gefuellt zeigen, '
      + 'sonst bleibt die Anzeige hinter dem Detail zurueck.'
    ));
    const person = families.find(f => f.key === 'person');
    assert.ok(person.count > 0, 'die beteiligten Personen stehen ebenfalls am Record');
  });

  test('die vier Familien sind die vier Entitaetstypen', () => {
    assert.deepEqual(CONTENT_FAMILIES.map(f => f.key), ['person', 'institution', 'ort', 'werk']);
    assert.deepEqual(CONTENT_FAMILIES.map(f => f.label),
      ['Personen', 'Institutionen', 'Orte', 'Werke'],
      'Die Legendenbeschriftung ist je ein Wort.');
    const person = CONTENT_FAMILIES.find(f => f.key === 'person');
    assert.ok(person.blocks.includes('beziehungen'),
      'Eine Beziehung ohne Person ist ein Promille-Fall und bekommt keinen eigenen Punkt.');
    const assigned = CONTENT_FAMILIES.flatMap(f => f.blocks);
    for (const blockKey of ['genannte-daten', 'finanzen']) {
      assert.ok(!assigned.includes(blockKey),
        `${blockKey} ist familienneutral und traegt keinen Farbpunkt.`);
    }
  });

  test('familyOfBlock gibt den Bloecken ohne Familie neutral zurueck', () => {
    assert.equal(familyOfBlock('institutionen'), 'institution');
    assert.equal(familyOfBlock('werk'), 'werk');
    assert.equal(familyOfBlock('finanzen'), 'neutral',
      'Finanzen ist eine Feldgruppe des Details, kein Entitaetstyp.');
    assert.equal(familyOfBlock('genannte-daten'), 'neutral');
  });

  test('Institutionen zaehlen getrennt von den Personen', () => {
    // Ein Record mit einer Koerperschaft belegt den Institutionen-Punkt und
    // zaehlt sie nicht zugleich unter den Personen mit.
    const withInstitution = [...store.records.values()].find(r => {
      const fams = familiesForRecord(r, store);
      return fams.find(f => f.key === 'institution').count > 0;
    });
    assert.ok(withInstitution, 'der Datenstand fuehrt Records mit Koerperschaften');
    const partition = partitionRecord(withInstitution, store);
    for (const agent of partition.bucket.institutionen) {
      assert.ok(['rico:CorporateBody', 'rico:Group'].includes(agent['@type']),
        'nur Koerperschaften und Gruppen stehen im Institutionen-Bucket');
    }
    for (const key of ['produktion', 'mitwirkende', 'erwaehnt', 'weitere']) {
      assert.ok(partition.bucket[key].every(a => a['@type'] !== 'rico:CorporateBody'),
        `keine Koerperschaft bleibt in ${key} zurueck`);
    }
  });

  test('ein unerschlossener Record zeigt durchgehend leere Familien', () => {
    const id = [...store.unprocessedIds].find(rid => store.records.has(rid));
    assert.ok(id, 'der Datenstand fuehrt unerschlossene Records');
    const families = familiesForRecord(store.records.get(id), store);
    assert.deepEqual(families.map(f => f.count), [0, 0, 0, 0], (
      'Ohne Verknuepfungen bleibt jeder Punkt leer -- die Anzeige darf keinen '
      + 'Erschliessungsstand behaupten, den die Daten nicht tragen.'
    ));
  });
});

describe('pruneEmptyKonvolute haelt die Hierarchie ehrlich', () => {
  const rec = (id, links) => ({
    '@id': id,
    'm3gim-ontology:hasAssociatedAgent': links ? [{ name: 'X' }] : [],
  });
  const items = [
    { record: rec('k1', false), isKonvolut: true, konvolutId: 'K1', visibleChildCount: 9 },
    { record: rec('a', true), isChild: true, konvolutId: 'K1' },
    { record: rec('b', false), isChild: true, konvolutId: 'K1' },
    { record: rec('k2', false), isKonvolut: true, konvolutId: 'K2', visibleChildCount: 4 },
    { record: rec('c', true) },
  ];

  test('ein Konvolut ohne uebrig gebliebenes Kind faellt mit seinem Kopf weg', () => {
    const out = pruneEmptyKonvolute(items);
    assert.deepEqual(out.map(i => i.record['@id']), ['k1', 'a', 'b', 'c'], (
      'Ein Kopf ohne Kinder verspricht Zeilen, die die Tabelle nicht zeigt.'
    ));
  });

  test('der Kopf beziffert die tatsaechlich sichtbaren Kinder', () => {
    const head = pruneEmptyKonvolute(items)[0];
    assert.equal(head.visibleChildCount, 2);
    assert.equal(head.linkedChildCount, 1);
  });
});

describe('Familienzahlen des Konvolut-Kopfs', () => {
  test('stehen als vier Zeilen im Tooltip statt als familyCounts am Kopf', () => {
    const items = getOrderedItems(store);
    const head = items.find(item => item.isKonvolut);
    assert.ok(head, 'der ausgelieferte Datenstand fuehrt mindestens ein Konvolut');
    const children = items.filter(item => item.isChild && item.konvolutId === head.konvolutId);
    const tip = konvolutFamilyTip(store, children);
    assert.deepEqual(tip.split('\n').map(line => line.split(' ')[0]),
      ['Personen', 'Institutionen', 'Orte', 'Werke']);
    assert.ok(tip.split('\n').every(line => line.endsWith(`von ${children.length}`)),
      'jede Familienzahl nennt dieselbe sichtbare Kindmenge als Bezugswert');

    const annotated = annotateKonvolutHeadTips(store, items)
      .find(item => item.konvolutId === head.konvolutId && item.isKonvolut);
    assert.equal(annotated.familyTip, tip);
    assert.equal('familyCounts' in annotated, false,
      'der Kopf traegt keine Darstellungsvorlage fuer entfernte Quadrate mehr');
  });
});
