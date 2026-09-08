/**
 * Der Beleg in den vier Ausfuhren des Korbs (F7).
 *
 * Wer eine Auswahl exportiert, soll daraus zitieren koennen, ohne die Anwendung
 * noch einmal zu oeffnen. Jedes Format traegt deshalb die Quellzelle des
 * Records und die Quellzelle jedes Datenpunkts seiner Verknuepfungen.
 *
 * Die stillen Defekte, gegen die diese Datei steht:
 *
 *   * Die CSV nennt Namen ohne ihre Zeile, und der Record selbst steht ohne
 *     seine Objektzeile in der Datei.
 *   * Der BibTeX-Eintrag fuehrt nur die Signatur, und der Beleg endet an der
 *     Objektebene.
 *   * Die GEXF-Kante traegt die Rolle, aber nicht die Zeile, aus der die
 *     Nennung stammt; im Graphwerkzeug ist die Kante dann unbelegt.
 *   * Zwei Nennungen derselben Entitaet in derselben Rolle auf zwei Zeilen
 *     fallen zu einer Kante zusammen und eine Quellzelle geht verloren.
 *   * Das JSON-LD kopiert die Records, verliert dabei aber die eingebetteten
 *     `m3gim-ontology:xlsxSource` oder die referenzierten Annotationsknoten.
 *
 * Lauf: node --test tests/frontend/korb-evidence.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import { buildBibTeX, buildCSVRows, buildGEXF, buildJSONLD } from '../../docs/js/views/korb.js';
import { storeFromShipped, shippedGraph } from './_shipped.mjs';

/**
 * Der Pruefdatensatz. Ausgewaehlt ueber den ausgelieferten Stand als der
 * kompakte Record, der jede Familie des Belegs genau einmal traegt (Person,
 * Institution, Ort, Datierung, Werk, Beziehung, Finanz) und jeden Datenpunkt
 * auf einer eigenen Zeile der Verknuepfungstabelle. Faellt in einem Format eine
 * Quellzelle aus, zeigt sich das hier und nicht erst an einem Record, in dem
 * mehrere Datenpunkte dieselbe Zeile teilen.
 */
const ID = 'm3gim-data:NIM_016_13';

/** Die erwarteten Quellzellen, aus dem ausgelieferten Datensatz gelesen. */
const RECORD_SHEET = 'Objekte';
const RECORD_ROW = 228;
const PERSON = { name: 'Rüger', sheet: 'Box 2', row: 331 };
const ORT = { name: 'Zürich, Zürichbergstrasse 104', sheet: 'Box 2', row: 334 };
const WERK = { name: 'Requiem', sheet: 'Box 2', row: 335 };

/**
 * Ein Record mit einer Datenpunkt-Nummer an einem Ort: eine Zeile der
 * Verknuepfungstabelle buendelt dort zwei Auffuehrungsorte, und die Nummer ist
 * der Teil der Quellzelle, der sie auseinanderhaelt.
 */
const DATENPUNKT_ID = 'm3gim-data:NIM_003_1_1';
const DATENPUNKT_ORT = { name: 'Potsdam', sheet: 'Box 1', row: 4, datenpunkt: 1 };

let store;
before(async () => { store = await storeFromShipped(); });

/** Index einer CSV-Spalte ueber ihr Label; dahinter steht der Formathinweis. */
function column(rows, label) {
  const index = rows[0].findIndex(head => head === label || head.startsWith(label + ' ('));
  assert.notEqual(index, -1, `Spalte ${label} fehlt: ${rows[0].join(' | ')}`);
  return index;
}

/** Die Kanten eines GEXF-Dokuments als einzelne Bloecke. */
function gexfEdges(gexf) {
  return [...gexf.matchAll(/<edge [^]*?<\/edge>/g)].map(m => m[0]);
}

/** Jede Quellzelle irgendwo in einem Knoten, als "Blatt Zeile". */
function sourceCells(value, acc = []) {
  if (Array.isArray(value)) {
    for (const item of value) sourceCells(item, acc);
    return acc;
  }
  if (!value || typeof value !== 'object') return acc;
  const src = value['m3gim-ontology:xlsxSource'];
  if (src && src['m3gim-ontology:xlsxRow']) {
    acc.push(`${src['m3gim-ontology:xlsxSheet'] || ''} ${src['m3gim-ontology:xlsxRow']}`.trim());
  }
  for (const inner of Object.values(value)) sourceCells(inner, acc);
  return acc;
}

describe('Belegte Korb-Ausfuhr', () => {
  test('der Pruefdatensatz traegt die erwarteten Quellzellen im ausgelieferten Stand', () => {
    const record = store.records.get(ID);
    assert.ok(record, `${ID} fehlt im Datensatz`);
    const src = record['m3gim-ontology:xlsxSource'];
    assert.equal(src['m3gim-ontology:xlsxSheet'], RECORD_SHEET);
    assert.equal(src['m3gim-ontology:xlsxRow'], RECORD_ROW);

    const cells = new Set(sourceCells(record));
    for (const dp of [PERSON, ORT, WERK]) {
      assert.ok(cells.has(`${dp.sheet} ${dp.row}`),
        `Quellzelle von ${dp.name} steht nicht mehr auf ${dp.sheet} ${dp.row}`);
    }
  });

  test('die CSV fuehrt die Quellzelle des Records in eigenen Spalten', () => {
    const rows = buildCSVRows([ID], store);
    assert.equal(rows[1][column(rows, 'Quelle Blatt')], RECORD_SHEET);
    assert.equal(rows[1][column(rows, 'Quelle Zeile')], String(RECORD_ROW));
  });

  test('die CSV nennt zu Person, Ort und Werk die Quellzelle des Datenpunkts', () => {
    const rows = buildCSVRows([ID], store);
    assert.equal(rows[1][column(rows, 'Personen')],
      'adressat: Malaniuk, Ira [Box 2 Zeile 330]; verfasser: Rüger [Box 2 Zeile 331]');
    assert.equal(rows[1][column(rows, 'Orte')],
      'empfangnahme: Zürich, Zürichbergstrasse 104 [Box 2 Zeile 334]');
    assert.equal(rows[1][column(rows, 'Werke')],
      'ausstrahlung: Requiem [Box 2 Zeile 335]');
  });

  test('die CSV verliert keine Familie: Institution, Datierung und Finanz haben eine Spalte', () => {
    const rows = buildCSVRows([ID], store);
    assert.equal(rows[1][column(rows, 'Institutionen')],
      'absender: Süddeutscher Rundfunk [Box 2 Zeile 333]');
    // formatDate setzt zwischen Tag und Monat ein schmales Leerzeichen.
    assert.equal(rows[1][column(rows, 'Datierungen')],
      'absendung: 9. Oktober 1958 [Box 2 Zeile 332]');
    assert.equal(rows[1][column(rows, 'Finanzen')],
      'einnahmen: 125 DM (abspielhonorar) [Box 2 Zeile 336]');
  });

  test('die Datenpunkt-Nummer steht in der Quellzelle, wo die Zeile buendelt', () => {
    const rows = buildCSVRows([DATENPUNKT_ID], store);
    const { name, sheet, row, datenpunkt } = DATENPUNKT_ORT;
    assert.ok(
      rows[1][column(rows, 'Orte')].includes(`${name} [${sheet} Zeile ${row} Datenpunkt ${datenpunkt}]`),
      rows[1][column(rows, 'Orte')],
    );
  });

  test('das Dokumentjahr bleibt der Objektquelle zugeordnet', () => {
    const rows = buildCSVRows([ID], store);
    assert.equal(rows[1][column(rows, 'Dokumentjahr [Quelle]')], '1958');
    assert.equal(rows[1][column(rows, 'Quelle Blatt')], 'Objekte');
    assert.equal(rows[1][column(rows, 'Quelle Zeile')], '228');
  });

  test('eine reine Objektdatierung erreicht das Dokumentjahr', () => {
    const rows = buildCSVRows(['m3gim-data:NIM_PL_01'], store);
    assert.equal(rows[1][column(rows, 'Dokumentjahr [Quelle]')], '1960');
  });

  test('ein Inhaltsdatum füllt kein fehlendes Dokumentjahr', () => {
    const id = 'm3gim-data:NIM_004_24';
    const rows = buildCSVRows([id], store);
    assert.equal(rows[1][column(rows, 'Datierung')], '');
    assert.equal(rows[1][column(rows, 'Dokumentjahr [Quelle]')], '');
    const exported = buildJSONLD([id], store);
    assert.ok(exported['@graph'].some(node => node['m3gim-ontology:atDate'] === '1947/1952'),
      'the source content dating must remain in the export');
  });

  test('die note des BibTeX-Eintrags traegt Objektzeile und die Zeilen der Verknuepfungen', () => {
    const bib = buildBibTeX([ID], store);
    const note = bib.split('\n').find(line => line.trimStart().startsWith('note'));
    assert.ok(note, bib);
    assert.ok(note.includes(`Quelle: ${RECORD_SHEET} Zeile ${RECORD_ROW}`), note);
    assert.ok(!note.includes('Zeitanker: absendung'), note);
    assert.ok(note.includes('Box 2 Zeilen 330, 331, 332, 333, 334, 335, 336'), note);
  });

  test('das JSON-LD gibt die Quellzellen der eingebetteten und referenzierten Knoten mit', () => {
    const out = buildJSONLD([ID], store);
    const cells = new Set(sourceCells(out['@graph']));
    assert.ok(cells.has(`${RECORD_SHEET} ${RECORD_ROW}`), [...cells].join(' | '));
    for (const dp of [PERSON, ORT, WERK]) {
      assert.ok(cells.has(`${dp.sheet} ${dp.row}`),
        `Quellzelle von ${dp.name} fehlt im JSON-LD: ${[...cells].join(' | ')}`);
    }
    // Der Ort haengt am Annotationsknoten, der nur per @id referenziert ist;
    // ohne den aufgeloesten Knoten waere seine Zeile nicht im Dokument.
    const annotations = out['@graph'].filter(n => n['@type'] === 'm3gim-ontology:Annotation');
    assert.ok(annotations.length > 0, 'keine Annotation mitgegeben');
  });

  test('der Record-Knoten des GEXF traegt seine eigene Quellzelle', () => {
    const gexf = buildGEXF([ID], store, '2026-09-05');
    const node = gexf.split('</node>').find(part => part.includes('id="record:NIM_016 13"'));
    assert.ok(node, gexf);
    assert.ok(node.includes(`<attvalue for="sheet" value="${RECORD_SHEET}"/>`), node);
    assert.ok(node.includes(`<attvalue for="row" value="${RECORD_ROW}"/>`), node);
  });

  test('jede GEXF-Kante traegt die Quellzelle ihrer Nennung', () => {
    const gexf = buildGEXF([ID], store, '2026-09-05');
    for (const dp of [PERSON, ORT, WERK]) {
      const edge = gexfEdges(gexf).find(part => part.includes(`:${dp.name}"`));
      assert.ok(edge, `keine Kante auf ${dp.name}: ${gexf}`);
      assert.ok(edge.includes(`<attvalue for="sheet" value="${dp.sheet}"/>`), edge);
      assert.ok(edge.includes(`<attvalue for="row" value="${dp.row}"/>`), edge);
    }
  });

  test('die GEXF-Kante nennt die Datenpunkt-Nummer, wo die Zeile buendelt', () => {
    const gexf = buildGEXF([DATENPUNKT_ID], store, '2026-09-05');
    const edge = gexfEdges(gexf).find(part => part.includes(`target="ort:${DATENPUNKT_ORT.name}"`));
    assert.ok(edge, gexf);
    assert.ok(edge.includes(`<attvalue for="row" value="${DATENPUNKT_ORT.row}"/>`), edge);
    assert.ok(edge.includes(`<attvalue for="datapoint" value="${DATENPUNKT_ORT.datenpunkt}"/>`), edge);
  });

  test('die Quellzelle des Records steht in allen vier Ausfuhren', () => {
    const cell = `${RECORD_SHEET} Zeile ${RECORD_ROW}`;
    const rows = buildCSVRows([ID], store);
    assert.equal(
      `${rows[1][column(rows, 'Quelle Blatt')]} Zeile ${rows[1][column(rows, 'Quelle Zeile')]}`,
      cell);
    assert.ok(buildBibTeX([ID], store).includes(cell));
    const jsonld = buildJSONLD([ID], store);
    const record = jsonld['@graph'].find(n => n['@id'] === ID);
    assert.equal(record['m3gim-ontology:xlsxSource']['m3gim-ontology:xlsxRow'], RECORD_ROW);
    const gexf = buildGEXF([ID], store, '2026-09-05');
    assert.ok(gexf.includes(`<attvalue for="row" value="${RECORD_ROW}"/>`), gexf);
  });
});

describe('Beleg der Nennung im Graphen', () => {
  test('zwei Nennungen auf zwei Zeilen bleiben zwei Kanten mit je ihrer Zeile', () => {
    // Derselbe Ort in derselben Rolle auf zwei Zeilen: ein Zusammenfassen zu
    // einer Kante wuerfe eine der beiden Quellzellen weg.
    const fake = {
      records: new Map([['x', {
        '@id': 'x',
        'rico:identifier': 'UAKUG/NIM_x',
        'rico:hasOrHadLocation': [
          { name: 'Wien', role: 'zielort', 'm3gim-ontology:xlsxSource': { 'm3gim-ontology:xlsxSheet': 'Box 1', 'm3gim-ontology:xlsxRow': 10 } },
          { name: 'Wien', role: 'zielort', 'm3gim-ontology:xlsxSource': { 'm3gim-ontology:xlsxSheet': 'Box 1', 'm3gim-ontology:xlsxRow': 11 } },
        ],
      }]]),
      recordToEvents: new Map(),
      mobilityEvents: new Map(),
    };
    const gexf = buildGEXF(['x'], fake, '2026-09-05');
    const rows = [...gexf.matchAll(/<attvalue for="row" value="(\d+)"\/>/g)].map(m => m[1]);
    assert.deepEqual(rows.sort(), ['10', '11']);
    assert.equal([...gexf.matchAll(/<node id="/g)].length, 2);
  });

  test('eine Nennung, die auf einer Zeile doppelt erfasst ist, bleibt eine Kante', () => {
    // Ort und Annotation stehen im Datensatz auf derselben Zeile; ohne die
    // Zusammenfassung stuende die Nennung zweimal im Graphen.
    const gexf = buildGEXF([ID], store, '2026-09-05');
    const edges = [...gexf.matchAll(/target="ort:[^"]*"/g)].map(m => m[0]);
    assert.deepEqual(edges, [`target="ort:${ORT.name}"`]);
  });
});
