/**
 * Erschliessungsstand als Befund, nicht als Fehlermeldung.
 *
 * Der Forschungsrahmen fuehrt fuer die Erschliessungs-Persona den Use Case
 * "Erschliessungsluecken finden" als auszuarbeiten. `aggregateCatalogueGaps`
 * ist seine Datenschicht: sie zaehlt je Erschliessungsachse, wie viele
 * Dokumente sie tragen, und schluesselt das auf die Konvolute auf, damit die
 * Luecke ein Arbeitspaket wird.
 *
 * Der stille Defekt, gegen den diese Datei steht: eine Achse zaehlt einen
 * Teilbeleg als vollen Beleg. Ein Dokument mit einer Datierung ohne Ort
 * erschiene dann als verortet, und die Arbeitsliste liesse genau die Luecke
 * aus, die sie finden soll. Deshalb prueft jeder Fall unten eine Achse einzeln
 * und die Summe gegen den Gesamtbestand.
 *
 * Lauf: node --test tests/frontend/catalogue-gaps.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { aggregateCatalogueGaps } from '../../docs/js/views/statistics-data.js';

/** Minimalstore: nur die Felder, die die Aggregation liest. */
function makeStore(records, konvolute = []) {
  const byId = new Map(records.map((r) => [r['@id'], r]));
  return {
    allRecords: records,
    records: byId,
    konvolute: new Map(konvolute.map((k) => [k.id, { 'rico:identifier': k.label }])),
    childToKonvolut: new Map(
      records.filter((r) => r._konvolut).map((r) => [r['@id'], r._konvolut]),
    ),
    recordDatings: new Map(),
    recordToEvents: new Map(),
  };
}

const NACKT = { '@id': 'r1', 'rico:title': 'Ohne alles' };
const MIT_TYP = { '@id': 'r2', 'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:program' } };
const MIT_DATUM = { '@id': 'r3', 'rico:date': '1953-07-24' };
const MIT_ORT = { '@id': 'r4', 'rico:hasOrHadLocation': [{ name: 'Bayreuth' }] };
const MIT_PERSON = {
  '@id': 'r5',
  'm3gim-ontology:hasAssociatedAgent': [{ name: 'Wagner, Wieland', '@type': 'rico:Person' }],
};
const MIT_INSTITUTION = {
  '@id': 'r6',
  'm3gim-ontology:hasAssociatedAgent': [{ name: 'Oper Graz', '@type': 'rico:CorporateBody' }],
};
const MIT_WERK = {
  '@id': 'r7',
  'rico:hasOrHadSubject': [{ name: 'Aida', '@type': 'm3gim-ontology:MusicalWork' }],
};

const ALLE = [NACKT, MIT_TYP, MIT_DATUM, MIT_ORT, MIT_PERSON, MIT_INSTITUTION, MIT_WERK];

function axis(result, id) {
  const found = result.axes.find((a) => a.id === id);
  assert.ok(found, `Achse ${id} fehlt im Ergebnis`);
  return found;
}

describe('Achsen einzeln', () => {
  const result = aggregateCatalogueGaps(makeStore(ALLE));

  test('jede Achse zaehlt genau ihr eigenes Dokument', () => {
    for (const id of ['typ', 'datum', 'ort', 'person', 'institution', 'werk']) {
      assert.equal(axis(result, id).filled, 1,
        `Achse ${id} zaehlt ${axis(result, id).filled} statt 1 Dokument`);
    }
  });

  test('gefuellt und fehlend ergeben zusammen den Bestand', () => {
    for (const a of result.axes) {
      assert.equal(a.filled + a.missing, result.total,
        `Achse ${a.id}: ${a.filled} + ${a.missing} ist nicht ${result.total}`);
    }
  });

  test('ein Dokument ohne jede Achse wird als solches gezaehlt', () => {
    assert.equal(result.none, 1);
  });
});

describe('Person und Institution bleiben getrennt', () => {
  test('eine Koerperschaft zaehlt nicht als Person', () => {
    const result = aggregateCatalogueGaps(makeStore([MIT_INSTITUTION]));
    assert.equal(axis(result, 'person').filled, 0, (
      'Eine Koerperschaft als Person gezaehlt: die Arbeitsliste haelt ein '
      + 'Dokument fuer personell erschlossen, das es nicht ist.'
    ));
    assert.equal(axis(result, 'institution').filled, 1);
  });
});

describe('Datierung ohne Ort verortet nicht', () => {
  test('eine reine Datierung fuellt die Ortsachse nicht', () => {
    const store = makeStore([MIT_DATUM]);
    store.recordDatings.set('r3', [{ 'm3gim-ontology:atDate': '1953-07-24' }]);
    const result = aggregateCatalogueGaps(store);
    assert.equal(axis(result, 'ort').filled, 0);
    assert.equal(axis(result, 'datum').filled, 1);
  });
});

describe('Aufriss nach Konvolut', () => {
  const records = [
    { ...MIT_TYP, '@id': 'k1a', _konvolut: 'K1' },
    { ...MIT_ORT, '@id': 'k1b', _konvolut: 'K1' },
    { ...NACKT, '@id': 'k2a', _konvolut: 'K2' },
  ];
  const result = aggregateCatalogueGaps(
    makeStore(records, [{ id: 'K1', label: 'Bayreuth' }, { id: 'K2', label: 'Presse' }]),
  );

  test('ein Konvolut steht unter seiner Archivsignatur, nie unter der internen Kennung', () => {
    for (const k of result.byKonvolut) {
      assert.ok(!/^m3gim-data:/.test(k.label), (
        `Nackte Kennung als Beschriftung: ${k.label}`
      ));
    }
  });

  test('jedes Konvolut erscheint mit seiner Dokumentzahl', () => {
    const k1 = result.byKonvolut.find((k) => k.id === 'K1');
    assert.equal(k1.total, 2);
    assert.equal(k1.label, 'Bayreuth');
    assert.equal(result.byKonvolut.find((k) => k.id === 'K2').total, 1);
  });

  test('das leerste Konvolut steht oben', () => {
    assert.equal(result.byKonvolut[0].id, 'K2', (
      'Die Arbeitsliste sortiert nach Erschliessungsgrad; sonst muss das Team '
      + 'die Luecke selbst suchen.'
    ));
  });

  test('die Konvolutsummen ergeben den Bestand', () => {
    const sum = result.byKonvolut.reduce((s, k) => s + k.total, 0);
    assert.equal(sum, result.total);
  });
});
