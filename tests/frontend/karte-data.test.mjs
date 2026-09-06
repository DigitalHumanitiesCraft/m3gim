/**
 * Die Karte schneidet mit dem geteilten Filter.
 *
 * Der stille Defekt, gegen den diese Datei steht: die Karte las aus dem
 * geteilten Filter nur Zeitfenster und Ort und zeichnete zu einem Personen-
 * oder Dokumenttyp-Schnitt unveraendert dieselben Punkte, waehrend die
 * Filterleiste den Chip fuehrte. Die Ansicht behauptete damit einen Schnitt,
 * den sie nicht anwendete (Frontend-Audit 2026-09-04).
 *
 * Lauf: node --test tests/frontend/karte-data.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOccurrences, occurrencesInCut, placeRolesOf, sortOcc,
  placeRoleScale, breakdownByRole, NO_ROLE,
} from '../../docs/js/views/karte-data.js';
import { REST_COLOR } from '../../docs/js/views/statistik-data.js';
import { storeFromShipped } from './_shipped.mjs';

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
    'rico:hasOrHadLocation': [{ name: place, role: { '@id': 'm3gim-vocab:performancePlace' } }],
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
// Die Ortsrollen der Verknuepfungs-Facette schneiden die Belege
// ---------------------------------------------------------------------------

describe('placeRolesOf', () => {
  test('nur die Ortsrollen zaehlen, der blosse Typ nennt keine', () => {
    assert.equal(placeRolesOf({}), null);
    assert.equal(placeRolesOf({ verknuepfung: ['ort'] }), null,
      'Der Typ ort allein nennt keine Rolle und laesst jeden Beleg stehen.');
    assert.equal(placeRolesOf({ verknuepfung: ['person:m3gim-vocab:singer'] }), null,
      'Eine Personenrolle sagt nichts ueber die Orte eines Dokuments.');
    assert.deepEqual([...placeRolesOf({ verknuepfung: [
      'ort:m3gim-vocab:guestPerformance', 'person:m3gim-vocab:singer',
      'ort:m3gim-vocab:dispatch'] })],
      ['m3gim-vocab:guestPerformance', 'm3gim-vocab:dispatch']);
  });
});

describe('occurrencesInCut mit gewaehlter Ortsrolle', () => {
  // Aufgabe 2 des Aufgabensatzes: nur die Orte mit der Rolle des Gastspiels.
  // Ohne diesen Schnitt zeichnete die Karte zusaetzlich den Absendeort
  // desselben Dokuments und die Aufgabe waere nicht loesbar.
  function roleStore() {
    const store = makeStore();
    store.records.get('r1')['rico:hasOrHadLocation'] = [
      { name: 'Bayreuth', role: { '@id': 'm3gim-vocab:guestPerformance' } },
      { name: 'Wien', role: { '@id': 'm3gim-vocab:dispatch' } },
    ];
    store.locations.get('Wien').records.add('r1');
    return store;
  }

  test('die gewaehlte Rolle laesst nur ihre Belege stehen', () => {
    const store = roleStore();
    const occ = buildOccurrences(store);
    assert.deepEqual(placesOf(occurrencesInCut(store, occ,
      { verknuepfung: ['ort:m3gim-vocab:guestPerformance'] })), ['Bayreuth']);
  });

  test('ohne Rollenwahl bleiben alle Belege der Dokumente im Schnitt', () => {
    const store = roleStore();
    const occ = buildOccurrences(store);
    assert.deepEqual(placesOf(occurrencesInCut(store, occ, { verknuepfung: ['ort'] })),
      ['Bayreuth', 'Graz', 'Wien', 'Wien']);
  });

  test('zwei Rollen wirken als ODER', () => {
    const store = roleStore();
    const occ = buildOccurrences(store);
    assert.deepEqual(placesOf(occurrencesInCut(store, occ, {
      verknuepfung: ['ort:m3gim-vocab:guestPerformance', 'ort:m3gim-vocab:dispatch'],
    })), ['Bayreuth', 'Wien']);
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

// ---------------------------------------------------------------------------
// F3: the Zeitanker of the Datenschicht dates a place Beleg
// ---------------------------------------------------------------------------

describe('Zeitanker des Ortsbelegs am ausgelieferten Datensatz', () => {
  test('das Verknuepfungsdatum geht der Quellendatierung vor', async () => {
    const store = await storeFromShipped();
    const occ = buildOccurrences(store);
    // UAKUG/NIM_007 11 traegt die Quellendatierung 1968-11-18 und den Anker
    // 1959-09-05. Nach rico:date datiert, schnitte die Karte den Record neun
    // Jahre neben Chronik und Netzwerk.
    const rec = store.records.get('m3gim-data:NIM_007_11');
    assert.ok(rec, 'der Pruefrecord fehlt im Datenstand');
    assert.equal(rec['rico:date'], '1968-11-18');
    const belege = occ.filter(o => o.recordId === 'm3gim-data:NIM_007_11'
      && o.source === 'loc');
    assert.ok(belege.length > 0, 'der Pruefrecord traegt keinen Ortsbeleg');
    for (const o of belege) {
      assert.equal(String(o.date).slice(0, 4), '1959',
        `${o.place} datiert auf ${o.date} statt auf den Anker 1959`);
    }
  });
});

// ---------------------------------------------------------------------------
// F1: der Knoten schluesselt nach Ortsrolle auf, nicht mehr nach Sicht
// ---------------------------------------------------------------------------

describe('placeRoleScale', () => {
  test('die Rangfolge steht ueber dem ganzen Bestand, die sechs Farben vorne', async () => {
    const store = await storeFromShipped();
    const scale = placeRoleScale(buildOccurrences(store));
    const coloured = [...scale.values()].filter(e => e.color !== REST_COLOR);
    assert.equal(coloured.length, 6, 'die Tokens geben sechs Kategorienfarben her');
    assert.equal(coloured[0].label, 'Vertragsort',
      'die haeufigste Ortsrolle des ausgelieferten Datensatzes fuehrt die Skala an');
    for (let i = 1; i < coloured.length; i++) {
      assert.ok(coloured[i - 1].count >= coloured[i].count, 'die Skala ist nicht sortiert');
    }
    assert.equal(new Set(coloured.map(e => e.color)).size, 6,
      'zwei Rollen in derselben Farbe waeren als dieselbe zu lesen');
  });

  test('ein Beleg ohne Rolle nimmt den Grauton, keine der sechs Farben', async () => {
    // Abwesenheit ist keine Kategorie (Designregel 4).
    const store = await storeFromShipped();
    const scale = placeRoleScale(buildOccurrences(store));
    const none = scale.get(NO_ROLE);
    assert.ok(none && none.count > 0, 'der Test hat keinen Gegenstand');
    assert.equal(none.color, REST_COLOR);
    assert.equal(none.label, 'ohne Rolle');
  });
});

describe('breakdownByRole', () => {
  const occ = [
    { roleId: 'm3gim-vocab:guestPerformance', roleLabel: 'gastspiel' },
    { roleId: 'm3gim-vocab:guestPerformance', roleLabel: 'gastspiel' },
    { roleId: 'm3gim-vocab:dispatch', roleLabel: 'absendung' },
    { roleId: null, role: null, roleLabel: '' },
  ];

  test('jede Rolle behaelt ihre Zeile, auch jenseits der sechs Farben', () => {
    // Aufgabe 2 fragt, welche Rollen die uebrigen Orte tragen; eine Rolle, die
    // in einen Sammelposten faellt, waere dort nicht mehr zu benennen.
    const scale = placeRoleScale(occ);
    const rows = breakdownByRole(occ, scale);
    assert.deepEqual(rows.map(r => [r.label, r.count]),
      [['Gastspiel', 2], ['Absendung', 1], ['ohne Rolle', 1]]);
  });

  test('ohne Skala faellt jede Zeile auf den Grauton zurueck statt zu fehlen', () => {
    const rows = breakdownByRole(occ, null);
    assert.equal(rows.length, 3);
    assert.ok(rows.every(r => r.color === REST_COLOR));
  });
});
