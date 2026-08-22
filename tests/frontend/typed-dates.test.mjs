/**
 * Typisierte Datumsproperties: das Namensregister des Frontends gegen den
 * Datenstand.
 *
 * `TYPED_DATE_PROPS` in `data/loader.js` ist der einzige Zugang des Frontends
 * zur flachen typisierten Datumsfamilie. Eine Property, die im Datenstand
 * vorkommt und in der Liste fehlt, ist fuer das Frontend nicht vorhanden, ohne
 * Fehler und ohne Anzeige. Genau so ist `m3gim:erstelldatum` seit seiner
 * Einfuehrung durchgefallen, unsichtbar deshalb, weil alle Traeger-Records
 * zusaetzlich ein `rico:date` haben und der typisierte Fallback nie greift.
 *
 * Gegenstueck zu `tests/test_25_chronik_mobility_cluster.py`, das dasselbe fuer
 * die Rollen von `EVENT_ROLE_TO_MOBILITY_CLUSTER` leistet. Die erwartete Menge
 * leitet der Abgleich hier aus dem Datenstand selbst ab. Sie umfasst jede
 * Record-Property im `m3gim:`-Namensraum, deren saemtliche Werte datumsfoermig
 * sind (ISO, TimeSpan, oder mit circa:/vor:/nach: qualifiziert). Damit
 * schlaegt der Test beim naechsten Modellumbau in beide Richtungen an, sowohl
 * wenn eine Property verschwindet als auch wenn eine hinzukommt.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { loadArchive, TYPED_DATE_PROPS } from '../../docs/js/data/loader.js';

async function storeFrom(jsonld) {
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 200, ok: true, json: async () => jsonld });
  try {
    return await loadArchive('mock://data');
  } finally {
    globalThis.fetch = prevFetch;
  }
}

function loadDocsData() {
  const url = new URL('../../docs/data/m3gim.jsonld', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf-8'));
}

// Datums-Routing aus knowledge/data.md § 7: ISO-Datum, TimeSpan (YYYY/YYYY),
// jeweils optional mit circa:/vor:/nach:-Qualifier.
const DATE_SHAPE =
  /^(circa:|vor:|nach:)?\d{4}(-\d{2}(-\d{2})?)?(\/\d{4}(-\d{2}(-\d{2})?)?)?$/;

/**
 * Die im Datenstand tatsaechlich belegten typisierten Datumsproperties.
 * Namensunabhaengig abgeleitet (keine Endungs-Heuristik auf "datum"), damit
 * eine umbenannte oder neu eingefuehrte Property mitgefunden wird.
 * `rico:date` bleibt aussen vor, es ist der einwertige Zeitanker und gehoert
 * der typisierten Familie nicht an.
 */
function typedDatePropsInData(jsonld) {
  const found = new Set();
  for (const node of jsonld['@graph'] || []) {
    if (node['@type'] !== 'rico:Record') continue;
    for (const [key, value] of Object.entries(node)) {
      if (!key.startsWith('m3gim:')) continue;
      const values = Array.isArray(value) ? value : [value];
      if (values.length === 0) continue;
      if (values.every(v => typeof v === 'string' && DATE_SHAPE.test(v))) found.add(key);
    }
  }
  return found;
}

describe('TYPED_DATE_PROPS gegen den Datenstand', () => {
  test('die Liste ist wohlgeformt (praefigiert, dublettenfrei)', () => {
    for (const prop of TYPED_DATE_PROPS) {
      assert.ok(prop.startsWith('m3gim:'), `${prop} traegt kein m3gim:-Praefix`);
    }
    assert.equal(new Set(TYPED_DATE_PROPS).size, TYPED_DATE_PROPS.length,
      'Dublette in TYPED_DATE_PROPS');
  });

  test('keine im Datenstand belegte Datumsproperty fehlt in der Liste', () => {
    const inData = typedDatePropsInData(loadDocsData());
    const known = new Set(TYPED_DATE_PROPS);
    const missing = [...inData].filter(p => !known.has(p)).sort();
    assert.deepEqual(missing, [],
      `im Datenstand belegt, im Frontend unsichtbar: ${missing.join(', ')}`);
  });

  test('keine Property der Liste ist im Datenstand verschwunden', () => {
    const inData = typedDatePropsInData(loadDocsData());
    const stale = TYPED_DATE_PROPS.filter(p => !inData.has(p)).sort();
    assert.deepEqual(stale, [],
      `in der Liste gefuehrt, im Datenstand nicht mehr belegt: ${stale.join(', ')}`);
  });
});

describe('typisierter Fallback des Jahresindex', () => {
  // Ein Record ohne rico:date, dessen einzige Datierung eine typisierte
  // Property ist. Genau dieser Fall bringt eine fehlende Property ans Licht.
  const FIXTURE = {
    '@graph': [
      { '@id': 'm3gim:TEST_ERSTELL', '@type': 'rico:Record',
        'rico:identifier': 'TEST/ERSTELL', 'rico:title': 'Nur Erstelldatum',
        'm3gim:erstelldatum': '1954-11-02' },
    ],
  };

  test('m3gim:erstelldatum traegt den Jahresindex, wenn rico:date fehlt', async () => {
    const store = await storeFrom(FIXTURE);
    const record = store.records.get('m3gim:TEST_ERSTELL');
    assert.ok(record, 'Record nicht im Store');
    assert.ok(store.byYear.has(1954),
      'kein Jahresindex-Eintrag 1954 aus m3gim:erstelldatum');
    assert.ok(store.byYear.get(1954).includes(record),
      'Record haengt nicht am Jahr seines Erstelldatums');
  });

  test('jede gefuehrte Property traegt den Jahresindex allein', async () => {
    for (const prop of TYPED_DATE_PROPS) {
      const store = await storeFrom({
        '@graph': [
          { '@id': 'm3gim:TEST_SOLO', '@type': 'rico:Record', [prop]: '1961-03-04' },
        ],
      });
      assert.ok(store.byYear.has(1961), `${prop} erreicht den Jahresindex nicht`);
    }
  });
});
