/**
 * Provenance-Extraktion aus einem JSON-LD-Knoten.
 *
 * `extractXlsxSource` ist die eine Stelle, an der das Format des
 * `m3gim-ontology:xlsxSource`-Subobjekts gelesen wird (E-91). Loader,
 * Inline-Detail und Korb hängen daran: der Loader legt die kompakte Form an
 * store-abgeleitete Einträge, das Detail zieht sie am rohen Record und an jedem
 * verschachtelten Knoten, der Korb wiederum am Detail.
 *
 * Der stille Defekt, gegen den diese Datei steht: ein Knoten ohne Zeilennummer
 * darf keine Quellenangabe erzeugen. Käme statt null ein Objekt mit
 * `row: undefined` zurück, trüge jeder unbelegte Chip eine Provenance-Pille
 * ohne Beleg dahinter, und die Belegkette im Fuß des Detail-Panels zählte
 * Zeilen, die es nicht gibt.
 *
 * Lauf: node --test tests/frontend/provenance.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { extractXlsxSource } from '../../docs/js/utils/provenance.js';

const node = (src) => ({ '@id': 'm3gim-data:X', 'm3gim-ontology:xlsxSource': src });

describe('extractXlsxSource liefert die kompakte Form', () => {
  test('Blatt, Zeile und Datenpunkt kommen durch', () => {
    const out = extractXlsxSource(node({
      'm3gim-ontology:xlsxSheet': 'Box_4',
      'm3gim-ontology:xlsxRow': 27,
      'm3gim-ontology:dataPointId': 415,
    }));
    assert.deepEqual(out, { sheet: 'Box_4', row: 27, datenpunkt: 415 });
  });

  test('ohne Blatt und Datenpunkt bleibt die Zeile allein stehen', () => {
    // Die Verknuepfungsblaetter tragen das Blatt, die Objekt-Tabelle nicht.
    const out = extractXlsxSource(node({ 'm3gim-ontology:xlsxRow': 3 }));
    assert.deepEqual(out, { sheet: null, row: 3, datenpunkt: null });
  });
});

describe('extractXlsxSource ohne belastbare Angabe', () => {
  test('ohne Zeilennummer entsteht keine Quellenangabe', () => {
    assert.equal(extractXlsxSource(node({ 'm3gim-ontology:xlsxSheet': 'Box_4' })), null,
      'Ein Blatt ohne Zeile belegt nichts und darf keine Provenance-Pille erzeugen.');
  });

  test('Zeile 0 gilt nicht als Beleg', () => {
    // Die Quelltabellen zaehlen ab 1; eine 0 ist ein Erfassungs- oder
    // Pipeline-Artefakt und kein zitierbarer Ort.
    assert.equal(extractXlsxSource(node({ 'm3gim-ontology:xlsxRow': 0 })), null);
  });

  test('fehlendes, leeres oder skalares Subobjekt faellt auf null', () => {
    assert.equal(extractXlsxSource({ '@id': 'm3gim-data:X' }), null);
    assert.equal(extractXlsxSource(node(null)), null);
    assert.equal(extractXlsxSource(node('Box_4, Zeile 27')), null);
  });

  test('kein Knoten faellt nicht um', () => {
    assert.equal(extractXlsxSource(null), null);
    assert.equal(extractXlsxSource(undefined), null);
  });
});
