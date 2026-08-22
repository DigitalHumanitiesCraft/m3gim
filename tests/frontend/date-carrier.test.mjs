/**
 * Praesenzpruefungen auf den Zeitanker `rico:date` und auf den Datierungs-
 * traeger `m3gim:hasDatedEvent`.
 *
 * Vier Stellen des Frontends pruefen die Anwesenheit eines fest verdrahteten
 * Feldnamens und liefern ohne Ausnahme ein leeres oder falsches Ergebnis,
 * sobald der Name verschwindet. Keine dieser Stellen wirft, keine meldet, und
 * drei von ihnen waren vor diesem Test ueberhaupt nicht pruefbar, weil die
 * Logik im DOM-Pfad der Views eingeschlossen war.
 *
 *   A  views/network.js       Personen-zu-Jahre-Index. Ohne Traeger bleibt die
 *                             Map leer, und `personInTimeRange` blendet bei
 *                             aktivem Zeitfilter jede Person aus. Der
 *                             Netzwerk-Tab waere leer, ohne Fehlermeldung.
 *   B  views/archive-holdings.js  Undatiert-Markierung der Bestandszeile. Ohne
 *                             Traeger traegt jeder Record die Markierung und
 *                             die Datum-Spalte zeigt durchgehend "o. D.".
 *   C  views/entity-map-data.js   Datum eines Ortsbelegs. Ohne Traeger fallen
 *                             die Record-Belege aus jeder Zeitfenster-Aussage
 *                             heraus, bleiben aber sichtbar, weil `inWindow`
 *                             undatierte Belege durchlaesst.
 *   D  utils/format.js        Verknuepfungszaehler. Ohne den Traeger
 *                             `m3gim:hasDatedEvent` saenken die Links-Zahlen,
 *                             und ein Record, dessen einzige Verknuepfung eine
 *                             Datierung ist, verschwaende aus dem Default-Modus
 *                             des Bestands und aus der Chronik.
 *
 * Jede Stelle wird zweifach gehalten. Eine synthetische Fixture bindet den
 * Traegernamen (faellt er weg, kippt der Positivfall), und ein Anker am echten
 * Datenstand belegt, dass die Stelle heute wirklich auf diesem Traeger laeuft.
 * Der jeweils mitgefuehrte Negativfall haelt das stille Ausfallverhalten als
 * benannte Zusicherung fest, damit es beim Umbau als Befund sichtbar wird.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { loadArchive } from '../../docs/js/data/loader.js';
import { countLinks } from '../../docs/js/utils/format.js';
import { buildOccurrences } from '../../docs/js/views/entity-map-data.js';
import { personYearsIndex, personInTimeRange } from '../../docs/js/views/network.js';

// archive-holdings.js zieht ueber ui/events.js einen window-Listener auf
// Modulebene. Der Stub haelt den Import in Node offen, ohne die View zu
// beruehren; das Modul wird erst nach dem Stub geladen.
globalThis.window = globalThis.window || {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
};
let isUndatedItem;
before(async () => {
  ({ isUndatedItem } = await import('../../docs/js/views/archive-holdings.js'));
});

async function storeFrom(jsonld) {
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 200, ok: true, json: async () => jsonld });
  try {
    return await loadArchive('mock://data');
  } finally {
    globalThis.fetch = prevFetch;
  }
}

let docsStore = null;
async function realStore() {
  if (!docsStore) {
    const url = new URL('../../docs/data/m3gim.jsonld', import.meta.url);
    docsStore = await storeFrom(JSON.parse(readFileSync(url, 'utf-8')));
  }
  return docsStore;
}

/** Ein Record mit Ort und Person, dessen Datierung wahlweise gesetzt ist. */
function graphWithDate(date) {
  const record = {
    '@id': 'm3gim:TEST_1', '@type': 'rico:Record',
    'rico:identifier': 'TEST/1', 'rico:title': 'Testobjekt',
    'rico:hasOrHadLocation': { name: 'Graz', '@id': 'wd:Q13298',
      'geo:lat': 47.07, 'geo:long': 15.44, role: 'auffuehrungsort' },
    'm3gim:hasAssociatedAgent': [
      { name: 'Malaniuk, Ira', '@type': 'rico:Person', role: 'saenger' },
    ],
  };
  if (date) record['rico:date'] = date;
  return { '@graph': [record] };
}

describe('A Netzwerk: Personen-zu-Jahre-Index haengt am Record-Datum', () => {
  test('mit rico:date traegt die Person eine Jahresmenge', async () => {
    const store = await storeFrom(graphWithDate('1956-05-01'));
    const { personYears, yearRange } = personYearsIndex(store);
    assert.deepEqual([...(personYears.get('Malaniuk, Ira') || [])], [1956],
      'Jahresmenge der Person kommt nicht aus rico:date');
    assert.deepEqual(yearRange, { min: 1956, max: 1956 });
    assert.equal(
      personInTimeRange(personYears, yearRange, 'Malaniuk, Ira',
        { yearFrom: 1950, yearTo: 1960 }),
      true, 'Person faellt aus dem eigenen Zeitfenster');
  });

  test('ohne rico:date bleibt die Person bei aktivem Zeitfilter unsichtbar', async () => {
    const store = await storeFrom(graphWithDate(null));
    const { personYears, yearRange } = personYearsIndex(store);
    assert.equal(personYears.size, 0, 'Jahresmenge ohne Traeger nicht leer');
    assert.equal(yearRange, null, 'Jahresspanne ohne Traeger nicht null');
    // Das stille Ausfallverhalten, festgehalten. Ohne Jahresmenge blendet der
    // Zeitfilter aus, ohne Zeitfilter bleibt die Person sichtbar.
    const fallback = { min: 1919, max: 2009 };
    assert.equal(
      personInTimeRange(personYears, fallback, 'Malaniuk, Ira',
        { yearFrom: 1950, yearTo: 1960 }),
      false);
    assert.equal(
      personInTimeRange(personYears, fallback, 'Malaniuk, Ira',
        { yearFrom: null, yearTo: null }),
      true);
  });

  test('Anker am Datenstand: der Index ist real befuellt', async () => {
    const { personYears, yearRange } = personYearsIndex(await realStore());
    assert.ok(personYears.size >= 300,
      `nur ${personYears.size} Personen mit Jahresmenge`);
    assert.ok(yearRange && yearRange.min < yearRange.max,
      'keine belastbare Jahresspanne aus dem Datenstand');
  });
});

describe('B Bestand: Undatiert-Markierung haengt am Record-Datum', () => {
  test('ein datierter Record ist nicht undatiert, ein undatierter schon', async () => {
    const dated = await storeFrom(graphWithDate('1956-05-01'));
    const undated = await storeFrom(graphWithDate(null));
    assert.equal(isUndatedItem({ record: dated.records.get('m3gim:TEST_1') }), false,
      'datierter Record faelschlich als undatiert markiert');
    assert.equal(isUndatedItem({ record: undated.records.get('m3gim:TEST_1') }), true,
      'undatierter Record nicht markiert');
  });

  test('ein Konvolut-Header wird nie als undatiert markiert', async () => {
    const store = await storeFrom(graphWithDate(null));
    assert.equal(
      isUndatedItem({ record: store.records.get('m3gim:TEST_1'), isKonvolut: true }),
      false, 'Konvolut-Header traegt die Undatiert-Markierung');
  });

  test('Anker am Datenstand: die Markierung trennt wirklich', async () => {
    const store = await realStore();
    const items = store.allRecords.map(record => ({ record }));
    const undated = items.filter(isUndatedItem).length;
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
  test('m3gim:hasDatedEvent erhoeht den Zaehler', () => {
    const record = {
      '@id': 'm3gim:TEST_DE', '@type': 'rico:Record',
      'm3gim:hasDatedEvent': [
        { '@type': 'm3gim:DatedEvent', 'm3gim:dateValue': '1872',
          'm3gim:dateRole': 'erwaehnt' },
      ],
    };
    assert.equal(countLinks(record), 1,
      'die Datierung zaehlt nicht als Verknuepfung');
    const ohne = { '@id': 'm3gim:TEST_DE', '@type': 'rico:Record' };
    assert.equal(countLinks(ohne), 0);
  });

  test('Anker am Datenstand: der Traeger ist real belegt und zaehlt mit', async () => {
    const store = await realStore();
    const traeger = store.allRecords.filter(r => r['m3gim:hasDatedEvent']);
    assert.ok(traeger.length >= 20,
      `nur ${traeger.length} Records mit m3gim:hasDatedEvent`);
    for (const r of traeger) {
      assert.ok(countLinks(r) > 0, `${r['@id']}: Datierung zaehlt nicht mit`);
      assert.ok(!store.unprocessedIds.has(r['@id']),
        `${r['@id']}: gilt trotz Datierung als unerschlossen`);
    }
  });
});
