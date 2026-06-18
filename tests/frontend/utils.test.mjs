/**
 * Unit-Tests fuer die reinen Utility-Module des Frontends (Tier-Test P1).
 *
 * Lauf:
 *   node --test tests/frontend/utils.test.mjs
 *
 * Deckt die zuvor ungetestete Logik in docs/js/utils/date-parser.js und
 * docs/js/utils/format.js ab (inkl. der in dieser Refactor-Runde neu
 * hinzugekommenen Helfer asWikidataId / isWikidataId / entityName /
 * resolveRecords). Dom-frei: ausschliesslich node:test + node:assert/strict.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractYear, formatDate } from '../../docs/js/utils/date-parser.js';
import {
  formatSignatur,
  formatChildSignatur,
  getDocTypeId,
  formatDocType,
  ensureArray,
  countLinks,
  truncate,
  asWikidataId,
  isWikidataId,
  entityName,
  resolveRecords,
  expandDftFilter,
} from '../../docs/js/utils/format.js';

// ---------------------------------------------------------------------------
// extractYear
// ---------------------------------------------------------------------------

test('extractYear: leere/fehlende Eingabe -> null', () => {
  assert.equal(extractYear(null), null);
  assert.equal(extractYear(''), null);
  assert.equal(extractYear('ohne Jahr'), null);
});

test('extractYear: einfaches Jahr und ISO-Datum', () => {
  assert.equal(extractYear('1958'), 1958);
  assert.equal(extractYear('1958-04-06'), 1958);
});

test('extractYear: Range nimmt den Start-Teil vor dem /', () => {
  assert.equal(extractYear('1958-04-06/1959-01-01'), 1958);
});

test('extractYear: erste vierstellige Zahl aus Freitext', () => {
  assert.equal(extractYear('circa 1950, evtl. spaeter'), 1950);
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

test('formatDate: leer -> leerer String', () => {
  assert.equal(formatDate(''), '');
  assert.equal(formatDate(null), '');
});

test('formatDate: reines Jahr bleibt Jahr', () => {
  assert.equal(formatDate('1999'), '1999');
});

test('formatDate: ISO-Tagdatum -> deutsches Format', () => {
  assert.equal(formatDate('1958-04-06'), '6. Apr. 1958');
});

test('formatDate: Excel-Zeitartefakt wird abgeschnitten', () => {
  assert.equal(formatDate('1958-04-06 00:00:00'), '6. Apr. 1958');
});

test('formatDate: Voll-Jahr-Range (01-01/12-31) -> einzelnes Jahr', () => {
  assert.equal(formatDate('1999-01-01/1999-12-31'), '1999');
});

test('formatDate: Mehrjahres-Voll-Range -> "Jahr - Jahr"', () => {
  assert.equal(formatDate('1950-01-01/1960-12-31'), '1950 – 1960');
});

test('formatDate: Tagesspanne im selben Monat', () => {
  assert.equal(formatDate('1958-04-06/1958-04-12'), '6. – 12. Apr. 1958');
});

test('formatDate: voller Monat -> "Monat Jahr"', () => {
  assert.equal(formatDate('1955-05-01/1955-05-31'), 'Mai 1955');
});

// ---------------------------------------------------------------------------
// formatSignatur / formatChildSignatur
// ---------------------------------------------------------------------------

test('formatSignatur: strippt UAKUG/-Prefix', () => {
  assert.equal(formatSignatur('UAKUG/NIM_003 1_1'), 'NIM_003 1_1');
  assert.equal(formatSignatur(''), '');
  assert.equal(formatSignatur(null), '');
});

test('formatChildSignatur: zeigt nur die Stueck-Nummer', () => {
  assert.equal(formatChildSignatur('UAKUG/NIM_003 1_1', 'UAKUG/NIM_003'), 'Nr. 1.1');
});

test('formatChildSignatur: ohne Parent faellt auf formatSignatur zurueck', () => {
  assert.equal(formatChildSignatur('UAKUG/NIM_003 1_1', null), 'NIM_003 1_1');
});

// ---------------------------------------------------------------------------
// getDocTypeId / formatDocType
// ---------------------------------------------------------------------------

test('getDocTypeId: aus Objekt- und String-Form', () => {
  assert.equal(getDocTypeId({ 'rico:hasDocumentaryFormType': { '@id': 'm3gim-dft:brief' } }), 'brief');
  assert.equal(getDocTypeId({ 'rico:hasDocumentaryFormType': 'm3gim-dft:brief' }), 'brief');
  assert.equal(getDocTypeId({}), null);
});

test('formatDocType: unbekannter Typ faellt auf die ID zurueck', () => {
  assert.equal(formatDocType({ 'rico:hasDocumentaryFormType': 'm3gim-dft:xyztype' }), 'xyztype');
  assert.equal(formatDocType({}), '');
});

// ---------------------------------------------------------------------------
// ensureArray / countLinks / truncate
// ---------------------------------------------------------------------------

test('ensureArray: normalisiert null/Skalar/Array', () => {
  assert.deepEqual(ensureArray(null), []);
  assert.deepEqual(ensureArray(undefined), []);
  assert.deepEqual(ensureArray(5), [5]);
  assert.deepEqual(ensureArray([1, 2]), [1, 2]);
});

test('countLinks: summiert ueber alle Verknuepfungs-Felder', () => {
  const record = {
    'm3gim:hasAssociatedAgent': [{}, {}],
    'rico:hasOrHadLocation': {},          // Skalar -> 1
    'rico:hasOrHadSubject': [{}],
    'm3gim:hasDatedEvent': [],
    'm3gim:hasPerformance': [{}, {}],
  };
  assert.equal(countLinks(record), 6);
  assert.equal(countLinks({}), 0);
});

test('truncate: kuerzt mit Ellipsis, laesst Kurztext unveraendert', () => {
  assert.equal(truncate('kurz', 80), 'kurz');
  assert.equal(truncate('', 80), '');
  assert.equal(truncate(null), '');
  const out = truncate('a'.repeat(100), 10);
  assert.equal(out.length, 10);
  assert.ok(out.endsWith('…'));
});

// ---------------------------------------------------------------------------
// asWikidataId / isWikidataId / entityName / resolveRecords (neue Helfer)
// ---------------------------------------------------------------------------

test('asWikidataId: nur wd:-Praefix wird durchgereicht', () => {
  assert.equal(asWikidataId('wd:Q42'), 'wd:Q42');
  assert.equal(asWikidataId('Q42'), null);
  assert.equal(asWikidataId(null), null);
});

test('isWikidataId: boolesche Variante', () => {
  assert.equal(isWikidataId('wd:Q1'), true);
  assert.equal(isWikidataId(''), false);
  assert.equal(isWikidataId(undefined), false);
});

test('entityName: name -> prefLabel -> fallback (kein @id automatisch)', () => {
  assert.equal(entityName({ name: 'A' }), 'A');
  assert.equal(entityName({ 'skos:prefLabel': 'P' }), 'P');
  assert.equal(entityName({ '@id': 'wd:Q1' }), '');
  assert.equal(entityName({ '@id': 'wd:Q1' }, '?'), '?');
  assert.equal(entityName(null, 'fb'), 'fb');
});

test('resolveRecords: loest IDs auf, filtert Fehlende', () => {
  const store = { records: new Map([['a', { '@id': 'a' }], ['b', { '@id': 'b' }]]) };
  const out = resolveRecords(store, ['a', 'fehlt', 'b']);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map(r => r['@id']), ['a', 'b']);
});

// ---------------------------------------------------------------------------
// expandDftFilter
// ---------------------------------------------------------------------------

test('expandDftFilter: ohne Hierarchie -> nur die Eingabe', () => {
  assert.deepEqual([...expandDftFilter(null, 'brief')], ['brief']);
  assert.deepEqual([...expandDftFilter({}, 'brief')], ['brief']);
  assert.deepEqual([...expandDftFilter({ dftHierarchy: new Map() }, 'brief')], ['brief']);
});

test('expandDftFilter: Oberbegriff matcht transitiv die Kinder', () => {
  const store = {
    dftHierarchy: new Map([
      ['m3gim-dft:korrespondenz', { prefLabel: 'Korrespondenz', children: ['m3gim-dft:brief', 'm3gim-dft:postkarte'] }],
      ['m3gim-dft:brief', { prefLabel: 'Brief', children: [] }],
      ['m3gim-dft:postkarte', { prefLabel: 'Postkarte', children: [] }],
    ]),
  };
  const out = expandDftFilter(store, 'korrespondenz');
  assert.ok(out.has('korrespondenz'));
  assert.ok(out.has('brief'));
  assert.ok(out.has('postkarte'));
  assert.equal(out.size, 3);
});

test('expandDftFilter: leere Eingabe -> leeres Set', () => {
  assert.equal(expandDftFilter({}, '').size, 0);
});
