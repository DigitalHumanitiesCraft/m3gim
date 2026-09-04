/**
 * Die Karte schneidet mit dem geteilten Filter.
 *
 * Der stille Defekt, gegen den diese Datei steht: die Karte las aus dem
 * geteilten Filter nur Zeitfenster und Ort und zeichnete zu einem Personen-,
 * Dokumenttyp- oder Sicht-Schnitt unveraendert dieselben Punkte, waehrend die
 * Filterleiste den Chip fuehrte. Die Ansicht behauptete damit einen Schnitt,
 * den sie nicht anwendete (Frontend-Audit 2026-09-04).
 *
 * Lauf: node --test tests/frontend/karte-data.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOccurrences, occurrencesInCut, isStayRole, aggregateCountries, sortOcc,
} from '../../docs/js/views/karte-data.js';

function S(...ids) { return new Set(ids); }

/**
 * Drei Records mit je einem Ortsbeleg: r1 (1952, Bayreuth, Wagner), r2 (1953,
 * Wien, Malaniuk), r3 (1960, Graz, Malaniuk).
 */
function makeStore() {
  const rec = (id, date, place) => ({
    '@id': id,
    'rico:date': date,
    'm3gim-ontology:processingStatus': 'abgeschlossen',
    'rico:hasOrHadLocation': [{ name: place, role: 'auffuehrungsort' }],
  });
  const records = new Map([
    ['r1', rec('r1', '1952-07-25', 'Bayreuth')],
    ['r2', rec('r2', '1953', 'Wien')],
    ['r3', rec('r3', '1960', 'Graz')],
  ]);
  return {
    records,
    allRecords: [...records.values()],
    unprocessedIds: new Set(),
    recordDatings: new Map(),
    mobilityEvents: new Map(),
    persons: new Map([
      ['Malaniuk, Ira', { records: S('r2', 'r3'), roles: S() }],
      ['Wagner, Wieland', { records: S('r1'), roles: S() }],
    ]),
    locations: new Map([
      ['Bayreuth', { records: S('r1'), roles: S() }],
      ['Wien', { records: S('r2'), roles: S() }],
      ['Graz', { records: S('r3'), roles: S() }],
    ]),
    works: new Map(),
    organizations: new Map(),
    ensembles: new Map(),
    eventsByRole: new Map(),
    recordToAnnotations: new Map(),
    annotations: new Map(),
    recordToEvents: new Map(),
    recordToPerformances: new Map(),
    finances: new Map(),
    roleVocab: new Map(),
  };
}

const placesOf = (occ) => occ.map(o => o.place).sort();

describe('occurrencesInCut', () => {
  test('der Fixture traegt einen Beleg je Record (der Test hat seinen Gegenstand)', () => {
    assert.deepEqual(placesOf(buildOccurrences(makeStore())), ['Bayreuth', 'Graz', 'Wien']);
  });

  test('ohne Filter bleiben alle Belege', () => {
    const store = makeStore();
    assert.deepEqual(placesOf(occurrencesInCut(store, buildOccurrences(store), {})),
      ['Bayreuth', 'Graz', 'Wien']);
  });

  test('eine Personenfacette schneidet die Belege mit', () => {
    const store = makeStore();
    const occ = buildOccurrences(store);
    assert.deepEqual(placesOf(occurrencesInCut(store, occ, { person: ['Wagner, Wieland'] })),
      ['Bayreuth'], (
        'Die Karte zeichnet sonst zu einem Personenschnitt unveraendert alle '
        + 'Orte, waehrend die Filterleiste den Chip fuehrt.'
      ));
    assert.deepEqual(placesOf(occurrencesInCut(store, occ, { person: ['Malaniuk, Ira'] })),
      ['Graz', 'Wien']);
  });

  test('zwei Facetten wirken als UND', () => {
    const store = makeStore();
    const occ = buildOccurrences(store);
    assert.deepEqual(
      placesOf(occurrencesInCut(store, occ, { person: ['Malaniuk, Ira'], ort: ['Wien'] })),
      ['Wien']);
  });

  test('das Zeitfenster bleibt aus dem Schnitt heraus', () => {
    // Die Karte schneidet die Zeit am Datum des Belegs, nicht am Zeitanker
    // seines Dokuments; sonst fiele eine im Fenster datierte Annotation mit
    // ihrem ausserhalb datierten Dokument weg.
    const store = makeStore();
    const occ = buildOccurrences(store);
    assert.deepEqual(placesOf(occurrencesInCut(store, occ, { zeitfenster: [1900, 1901] })),
      ['Bayreuth', 'Graz', 'Wien']);
  });
});

// ---------------------------------------------------------------------------
// E-224: Reichweite zaehlt Aufenthalte, keine Nennungen
// ---------------------------------------------------------------------------

describe('isStayRole', () => {
  test('performative und institutionelle Rollen belegen einen Aufenthalt', () => {
    for (const role of ['m3gim-vocab:performance', 'm3gim-vocab:guestPerformance',
      'm3gim-vocab:performancePlace', 'm3gim-vocab:premiere', 'm3gim-vocab:rehearsal',
      'm3gim-vocab:dressRehearsal', 'm3gim-vocab:season']) {
      assert.equal(isStayRole(role), true, role);
    }
  });

  test('Wohnort und Vertragsort zaehlen als Aufenthalt, in beiden Schreibformen', () => {
    for (const role of ['m3gim-vocab:residencePlace', 'wohnort',
      'm3gim-vocab:contractPlace', 'vertragsort']) {
      assert.equal(isStayRole(role), true, role);
    }
  });

  test('Nennung, Korrespondenz, Entstehung und rollenlose Belege nicht', () => {
    for (const role of ['m3gim-vocab:mentioned', 'm3gim-vocab:dispatch',
      'm3gim-vocab:receiving', 'm3gim-vocab:departure', 'm3gim-vocab:destinationPlace',
      'm3gim-vocab:creation', 'm3gim-vocab:framingEvent',
      'm3gim-vocab:publicationDate', null]) {
      assert.equal(isStayRole(role), false, String(role));
    }
  });
});

describe('aggregateCountries', () => {
  const cityCountry = new Map([['bayreuth', 'DE'], ['wien', 'AT'], ['madrid', 'ES']]);
  const occ = [
    { place: 'Bayreuth', recordId: 'r1', roleId: 'm3gim-vocab:guestPerformance' },
    { place: 'Wien', recordId: 'r2', roleId: 'm3gim-vocab:season' },
    { place: 'Madrid', recordId: 'r3', roleId: 'm3gim-vocab:mentioned' },
    { place: 'Madrid', recordId: 'r4', roleId: 'm3gim-vocab:dispatch' },
  ];

  test('ein nur genanntes Land faellt aus der Reichweite', () => {
    const codes = aggregateCountries(occ, cityCountry).map(r => r.code);
    assert.deepEqual(codes, ['AT', 'DE'], (
      'Erwaehnung und Absendung sind kein Aufenthalt; Spanien stuende sonst in '
      + 'der Reichweite, ohne dass jemand dort war (E-224).'
    ));
  });

  test('Gastspiel und Spielzeit bleiben mit ihrer Dokumentzahl', () => {
    const rows = aggregateCountries(occ, cityCountry);
    assert.deepEqual(rows.map(r => [r.code, r.count]), [['AT', 1], ['DE', 1]]);
  });

  test('ohne Aufenthaltsbeleg bleibt die Liste leer statt der Nennungen', () => {
    assert.deepEqual(aggregateCountries(occ.slice(2), cityCountry), []);
  });
});

// ---------------------------------------------------------------------------
// E-225: datierte und undatierte Belege im Zeitfenster
// ---------------------------------------------------------------------------

describe('datiert und undatiert im Zeitfenster', () => {
  const inWindow = (from, to) => o => {
    const y = o.date ? Number(String(o.date).slice(0, 4)) : null;
    return y == null || (y >= from && y <= to);
  };
  const dated = o => o.date != null;
  const occ = [
    { place: 'Zürich', date: '1952', recordId: 'r1' },
    { place: 'Zürich', date: null, recordId: 'r2' },
    { place: 'Zürich', date: null, recordId: 'r3' },
    { place: 'Linz', date: null, recordId: 'r4' },
    { place: 'Linz', date: '1970', recordId: 'r5' },
  ];

  test('das Fenster traegt die undatierten Belege mit (E-88), zaehlt sie aber getrennt', () => {
    const win = occ.filter(inWindow(1950, 1955));
    assert.equal(win.length, 4, 'die undatierten bleiben im Fenster');
    assert.equal(win.filter(dated).length, 1);
    assert.equal(win.filter(o => !dated(o)).length, 3);
  });

  test('ein Ort ohne datierten Beleg im Fenster ist gedaempft', () => {
    const linz = occ.filter(o => o.place === 'Linz').filter(inWindow(1950, 1955));
    assert.equal(linz.length, 1);
    assert.equal(linz.filter(dated).length, 0, (
      'Linz traegt im Fenster nur einen undatierten Beleg und darf deshalb '
      + 'nicht als Aufenthalt hervorgehoben werden (E-225).'
    ));
  });

  test('die Beleg-Liste eines Orts stellt die datierten voran', () => {
    const order = sortOcc(occ.filter(o => o.place === 'Zürich')).map(o => o.recordId);
    assert.deepEqual(order, ['r1', 'r2', 'r3']);
  });
});
