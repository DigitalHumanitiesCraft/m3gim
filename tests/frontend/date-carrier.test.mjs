/**
 * Praesenzpruefungen auf den Zeitanker `rico:date` und auf den Datierungs-
 * traeger `m3gim-ontology:hasAnnotation`.
 *
 * Vier Stellen des Frontends pruefen die Anwesenheit eines fest verdrahteten
 * Feldnamens und liefern ohne Ausnahme ein leeres oder falsches Ergebnis,
 * sobald der Name verschwindet. Keine dieser Stellen wirft, keine meldet, und
 * drei von ihnen waren vor diesem Test ueberhaupt nicht pruefbar, weil die
 * Logik im DOM-Pfad der Views eingeschlossen war.
 *
 *   A  data/records-for.js    Zeitanker des Netzwerk-Schnitts. Ohne Traeger
 *                             traegt kein Record ein Jahr, und das Zeitfenster
 *                             des Netzwerks schneidet nur noch undatierte
 *                             Dokumente heraus, ohne Fehlermeldung.
 *   B  views/bestand.js  Undatiert-Markierung der Bestandszeile. Ohne
 *                             Traeger traegt jeder Record die Markierung und
 *                             die Datum-Spalte zeigt durchgehend "o. D.".
 *   C  views/karte-data.js   Datum eines Ortsbelegs. Ohne Traeger fallen
 *                             die Record-Belege aus jeder Zeitfenster-Aussage
 *                             heraus, bleiben aber sichtbar, weil `inWindow`
 *                             undatierte Belege durchlaesst.
 *   D  utils/format.js        Verknuepfungszaehler. Ohne den Traeger
 *                             `m3gim-ontology:hasAnnotation` saenken die
 *                             Links-Zahlen, und ein Record, dessen einzige
 *                             Verknuepfung eine Datierung ist, verschwaende aus
 *                             dem Default-Modus des Bestands und aus der
 *                             Chronik. Der Traeger deckt seit der Zusammen-
 *                             fuehrung auch die Verortungen ab, die der
 *                             Zaehler zuvor uebersah.
 *
 * Jede Stelle wird zweifach gehalten. Eine synthetische Fixture bindet den
 * Traegernamen (faellt er weg, kippt der Positivfall), und ein Anker am echten
 * Datenstand belegt, dass die Stelle heute wirklich auf diesem Traeger laeuft.
 * Der jeweils mitgefuehrte Negativfall haelt das stille Ausfallverhalten als
 * benannte Zusicherung fest, damit es beim Umbau als Befund sichtbar wird.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { loadArchive, primaryYear } from '../../docs/js/data/loader.js';
import { storeFromShipped } from './_shipped.mjs';
import { countLinks } from '../../docs/js/utils/format.js';
import { buildOccurrences } from '../../docs/js/views/karte-data.js';
import { isUndatedItem } from '../../docs/js/views/bestand-data.js';
import { yearOf, recordsFor } from '../../docs/js/data/records-for.js';
import { buildGraph } from '../../docs/js/views/_netzwerk-geometry.js';
import { withConcepts } from './_concepts.mjs';

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

/** Ein Record mit Ort und Person, dessen Datierung wahlweise gesetzt ist. */
function graphWithDate(date) {
  const record = {
    '@id': 'm3gim-data:TEST_1', '@type': 'rico:Record',
    'rico:identifier': 'TEST/1', 'rico:title': 'Testobjekt',
    'rico:hasOrHadLocation': { name: 'Graz', '@id': 'wd:Q13298',
      'geo:lat': 47.07, 'geo:long': 15.44,
      role: { '@id': 'm3gim-vocab:performancePlace',
        'skos:prefLabel': 'auffuehrungsort' } },
    'm3gim-ontology:hasAssociatedAgent': [
      { name: 'Malaniuk, Ira', '@type': 'rico:Person',
        role: { '@id': 'm3gim-vocab:singer', 'skos:prefLabel': 'sänger' } },
    ],
  };
  if (date) record['rico:date'] = date;
  return { '@graph': [record] };
}

describe('A Netzwerk: das Zeitfenster haengt am Record-Datum', () => {
  test('mit rico:date traegt der Record sein Jahr', async () => {
    const store = await storeFrom(graphWithDate('1956-05-01'));
    assert.equal(yearOf(store, store.records.get('m3gim-data:TEST_1')), 1956,
      'Jahr des Records kommt nicht aus rico:date');
  });

  test('ohne rico:date bleibt der Record undatiert und ueberlebt das Fenster (E-88)', async () => {
    const store = await storeFrom(graphWithDate(null));
    const record = store.records.get('m3gim-data:TEST_1');
    assert.equal(yearOf(store, record), null, 'Record ohne Traeger gilt als datiert');
    // Das stille Ausfallverhalten, festgehalten: ein undatierter Record faellt
    // nicht aus dem Zeitfenster, er wird nur als undatiert mitgezaehlt.
    const cut = recordsFor(store, { zeitfenster: [1950, 1960] },
      { base: new Set(['m3gim-data:TEST_1']) });
    assert.equal(cut.ids.has('m3gim-data:TEST_1'), true);
    assert.equal(cut.undatiert, 1);
  });

  test('Anker am Datenstand: das Zeitfenster verkleinert den Graphen wirklich', async () => {
    const store = await realStore();
    const weit = buildGraph(store, { records: recordsFor(store, {}).ids, topN: 500 });
    const eng = buildGraph(store, {
      records: recordsFor(store, { zeitfenster: [1950, 1955] }).ids, topN: 500,
    });
    assert.ok(weit.nodes.length > 0, 'der ungefilterte Graph ist leer');
    assert.ok(eng.stats.records < weit.stats.records,
      'das Zeitfenster schneidet keine Dokumente weg — der Zeitanker kommt nicht an');
  });
});

describe('B Bestand: Undatiert-Markierung haengt am Record-Datum', () => {
  test('ein datierter Record ist nicht undatiert, ein undatierter schon', async () => {
    const dated = await storeFrom(graphWithDate('1956-05-01'));
    const undated = await storeFrom(graphWithDate(null));
    assert.equal(isUndatedItem({ record: dated.records.get('m3gim-data:TEST_1') }), false,
      'datierter Record faelschlich als undatiert markiert');
    assert.equal(isUndatedItem({ record: undated.records.get('m3gim-data:TEST_1') }), true,
      'undatierter Record nicht markiert');
  });

  test('ein Konvolut-Header wird nie als undatiert markiert', async () => {
    const store = await storeFrom(graphWithDate(null));
    assert.equal(
      isUndatedItem({ record: store.records.get('m3gim-data:TEST_1'), isKonvolut: true }),
      false, 'Konvolut-Header traegt die Undatiert-Markierung');
  });

  /**
   * Ohne `rico:date` faellt die Zeile auf den abgeleiteten Zeitanker der
   * Datenschicht zurueck (Kontrakt A4, primaryYear). Ein Objekt, das nur ueber
   * eine annotierte Auffuehrung datiert ist, zeigt damit sein Jahr, statt als
   * undatiert zu lesen; erst ohne jeden Anker steht "o. D.".
   */
  test('Anker am Datenstand: eine abgeleitete Datierung datiert die Zeile', async () => {
    const store = await storeFromShipped();
    const withAnchor = store.records.get('m3gim-data:NIM_139_104');
    const without = store.records.get('m3gim-data:NIM_139_109_12');
    assert.ok(withAnchor && without, 'Ankerdatensaetze fehlen im Datenstand');
    assert.equal(withAnchor['rico:date'], undefined,
      'UAKUG/NIM_139 104 traegt inzwischen ein rico:date — der Fall traegt nicht mehr');
    assert.equal(primaryYear(store, withAnchor).year, 1956,
      'die annotierte Auffuehrung datiert UAKUG/NIM_139 104 nicht auf 1956');
    assert.equal(isUndatedItem({ record: withAnchor }, store), false,
      'UAKUG/NIM_139 104 gilt trotz abgeleitetem Jahr als undatiert');
    assert.equal(isUndatedItem({ record: without }, store), true,
      'UAKUG/NIM_139 109_12 gilt ohne jeden Anker als datiert');
  });

  test('Anker am Datenstand: die Markierung trennt wirklich', async () => {
    const store = await realStore();
    const items = store.allRecords.map(record => ({ record }));
    const undated = items.filter(item => isUndatedItem(item, store)).length;
    assert.ok(undated > 0, 'kein einziger Record als undatiert erkannt');
    assert.ok(undated < items.length,
      'jeder Record gilt als undatiert, der Traeger kommt nicht an');
    assert.ok(items.length - undated >= 400,
      `nur ${items.length - undated} datierte Records erkannt`);
  });
});

describe('C Karte: Datum des Ortsbelegs haengt am Record-Datum', () => {
  test('der Ortsbeleg erbt das Record-Datum', async () => {
    const store = await storeFrom(graphWithDate('1956-05-01'));
    const belege = buildOccurrences(store).filter(o => o.source === 'loc');
    assert.equal(belege.length, 1, 'Ortsbeleg nicht gebildet');
    assert.equal(belege[0].date, '1956-05-01',
      'Ortsbeleg traegt das Record-Datum nicht');
  });

  test('ohne Record-Datum bleibt der Beleg sichtbar und datumslos', async () => {
    const store = await storeFrom(graphWithDate(null));
    const belege = buildOccurrences(store).filter(o => o.source === 'loc');
    assert.equal(belege.length, 1, 'datumsloser Beleg faellt weg statt sichtbar zu bleiben');
    assert.equal(belege[0].date, null);
  });

  test('Anker am Datenstand: Record-Belege tragen real ein Datum', async () => {
    const belege = buildOccurrences(await realStore()).filter(o => o.source === 'loc');
    const datiert = belege.filter(o => o.date).length;
    assert.ok(datiert >= 100, `nur ${datiert} datierte Record-Ortsbelege`);
  });
});

describe('D Verknuepfungszaehler: die Datierung zaehlt als Verknuepfung', () => {
  test('m3gim-ontology:hasAnnotation erhoeht den Zaehler', () => {
    const record = {
      '@id': 'm3gim-data:TEST_DE', '@type': 'rico:Record',
      'm3gim-ontology:hasAnnotation': [{ '@id': 'm3gim-data:ev_TEST_DE' }],
    };
    assert.equal(countLinks(record), 1,
      'die Datierung zaehlt nicht als Verknuepfung');
    const ohne = { '@id': 'm3gim-data:TEST_DE', '@type': 'rico:Record' };
    assert.equal(countLinks(ohne), 0);
  });

  test('Anker am Datenstand: der Traeger ist real belegt und zaehlt mit', async () => {
    const store = await realStore();
    const traeger = store.allRecords.filter(r => r['m3gim-ontology:hasAnnotation']);
    assert.ok(traeger.length >= 20,
      `nur ${traeger.length} Records mit m3gim-ontology:hasAnnotation`);
    for (const r of traeger) {
      assert.ok(countLinks(r) > 0, `${r['@id']}: Datierung zaehlt nicht mit`);
      assert.ok(!store.unprocessedIds.has(r['@id']),
        `${r['@id']}: gilt trotz Datierung als unerschlossen`);
    }
  });
});
