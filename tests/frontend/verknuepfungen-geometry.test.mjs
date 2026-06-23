/**
 * Unit-Tests fuer das Verknuepfungen-Geometrie-Modul (reine Funktionen) und den
 * geteilten Filter-State. Kein DOM, kein Datenstand — synthetischer Store.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGraph, computeLayout, nodeId, NODE_TYPES, DEFAULT_FOCUS,
} from '../../docs/js/views/_verknuepfungen-geometry.js';
import {
  getFilter, setFilter, resetFilter, subscribe, isFilterActive,
} from '../../docs/js/ui/filter-state.js';

// --- Synthetischer Store --------------------------------------------------

function S(...ids) { return new Set(ids); }

function makeStore() {
  return {
    persons: new Map([
      ['Malaniuk, Ira', { records: S('r1', 'r2', 'r3'), roles: S('sänger'),
        note: 'Mezzosopranistin', lifespan: '1919-2009' }],
      ['Wagner, Wieland', { records: S('r1', 'r2'), roles: S('regisseur'), note: 'Regisseur' }],
      ['Spaetling, Egon', { records: S('r3'), roles: S('erwähnt') }], // nur 1960
    ]),
    works: new Map([
      ['Tristan und Isolde', { records: S('r1'), partie: 'Brangäne', komponist: 'Wagner, Richard' }],
    ]),
    organizations: new Map([
      ['Bayreuther Festspiele', { records: S('r2'), roles: S('veranstalter'), sitz: 'Bayreuth' }],
    ]),
    locations: new Map([
      ['Bayreuth', { records: S('r1', 'r2'), roles: S('auffuehrungsort') }],
    ]),
    byYear: new Map([
      [1952, [{ '@id': 'r1' }]],
      [1953, [{ '@id': 'r2' }]],
      [1960, [{ '@id': 'r3' }]],
    ]),
    recordToEvents: new Map([['r1', ['ste_r1']]]),
    recordToPerformances: new Map([['r1', [{ id: 'p1', work: { name: 'Tristan und Isolde' } }]]]),
  };
}

// --- buildGraph -----------------------------------------------------------

describe('buildGraph (weit/eng, Fokus, Filter)', () => {
  test('Default-Fokus Malaniuk: getypte Nachbarn aus geteilten Records', () => {
    const g = buildGraph(makeStore());
    assert.equal(g.center.name, 'Malaniuk, Ira');
    const names = g.nodes.map(n => n.name);
    assert.ok(names.includes('Wagner, Wieland'));
    assert.ok(names.includes('Tristan und Isolde'));
    assert.ok(names.includes('Bayreuther Festspiele'));
    assert.ok(names.includes('Bayreuth'));
    assert.ok(!names.includes('Malaniuk, Ira'), 'Fokus darf nicht als Nachbar erscheinen');
    // Gewicht = geteilte Records: Wagner (r1,r2) -> 2, Tristan (r1) -> 1
    assert.equal(g.nodes.find(n => n.name === 'Wagner, Wieland').weight, 2);
    assert.equal(g.nodes.find(n => n.name === 'Tristan und Isolde').weight, 1);
  });

  test('Determinismus: zwei Laeufe ergeben identische Knoten/Kanten', () => {
    const a = buildGraph(makeStore());
    const b = buildGraph(makeStore());
    assert.deepEqual(a.nodes.map(nodeId), b.nodes.map(nodeId));
    assert.deepEqual(a.edges, b.edges);
  });

  test('Kanten gehen vom Fokus zu jedem Nachbarn', () => {
    const g = buildGraph(makeStore());
    assert.equal(g.edges.length, g.nodes.length);
    assert.ok(g.edges.every(e => e.a === '__focus__' && e.kind === 'focus'));
  });

  test('Zeitfenster filtert Records (1960er-Person faellt raus)', () => {
    const wide = buildGraph(makeStore());
    assert.ok(wide.nodes.some(n => n.name === 'Spaetling, Egon'));
    const cut = buildGraph(makeStore(), { filter: { zeitfenster: [1950, 1955] } });
    assert.ok(!cut.nodes.some(n => n.name === 'Spaetling, Egon'),
      'Person nur aus 1960 darf im Fenster 1950-1955 nicht erscheinen');
  });

  test('Ort-Filter schraenkt auf Records des Orts ein', () => {
    const g = buildGraph(makeStore(), { filter: { ort: 'Bayreuth' } });
    // Bayreuth deckt r1,r2 — Spaetling (nur r3) faellt raus.
    assert.ok(!g.nodes.some(n => n.name === 'Spaetling, Egon'));
    assert.ok(g.nodes.some(n => n.name === 'Wagner, Wieland'));
  });

  test('Enger Schaerfegrad: nur ereignis-/auffuehrungs-belegte Records (r1)', () => {
    const g = buildGraph(makeStore(), { schaerfe: 'eng' });
    // Nur r1 ist STE/Performance-belegt. Wagner ist in r1 -> bleibt;
    // Bayreuther Festspiele nur in r2 -> faellt weg.
    const names = g.nodes.map(n => n.name);
    assert.ok(names.includes('Wagner, Wieland'));
    assert.ok(names.includes('Tristan und Isolde'));
    assert.ok(!names.includes('Bayreuther Festspiele'),
      'eng: Institution nur aus r2 (ohne Event) darf nicht erscheinen');
    assert.ok(g.stats.recordsEng <= g.stats.recordsWeit);
  });

  test('Knotentyp-Toggle blendet einen Typ aus', () => {
    const g = buildGraph(makeStore(), { types: { ort: false } });
    assert.ok(!g.nodes.some(n => n.type === 'ort'));
    assert.ok(g.nodes.some(n => n.type === 'person'));
  });

  test('topN kappt je Typ und meldet die Differenz (kein stiller Cap)', () => {
    const g = buildGraph(makeStore(), { topN: 1 });
    // 2 Personen-Nachbarn (Wagner, Spaetling) -> 1 gekappt.
    assert.equal(g.nodes.filter(n => n.type === 'person').length, 1);
    assert.equal(g.stats.truncated.person, 1);
  });

  test('Institution traegt den Sitz (auswaerts/am-Haus-Datengrundlage)', () => {
    const g = buildGraph(makeStore());
    const inst = g.nodes.find(n => n.type === 'institution');
    assert.equal(inst.meta.sitz, 'Bayreuth');
  });

  test('unbekannter Fokus -> leerer Graph statt Crash', () => {
    const g = buildGraph(makeStore(), { focus: { type: 'person', name: 'Niemand' } });
    assert.equal(g.center, null);
    assert.equal(g.nodes.length, 0);
  });
});

// --- computeLayout --------------------------------------------------------

describe('computeLayout (deterministisch, typ-partitioniert)', () => {
  test('Zentrum sitzt auf (cx,cy), Knoten haben endliche Positionen', () => {
    const g = buildGraph(makeStore());
    const L = computeLayout(g, { cx: 400, cy: 300, radius: 200 });
    assert.equal(L.center.x, 400);
    assert.equal(L.center.y, 300);
    for (const n of L.nodes) {
      assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
      assert.ok(n.r >= 7);
    }
  });

  test('Determinismus: identische Positionen ueber zwei Laeufe', () => {
    const L1 = computeLayout(buildGraph(makeStore()), { cx: 0, cy: 0, radius: 100 });
    const L2 = computeLayout(buildGraph(makeStore()), { cx: 0, cy: 0, radius: 100 });
    assert.deepEqual(L1.nodes.map(n => [n.id, n.x, n.y]), L2.nodes.map(n => [n.id, n.x, n.y]));
  });

  test('Person-Sektor liegt oben (negatives y), Institution unten', () => {
    const L = computeLayout(buildGraph(makeStore()), { cx: 0, cy: 0, radius: 100 });
    const person = L.nodes.find(n => n.type === 'person');
    const inst = L.nodes.find(n => n.type === 'institution');
    assert.ok(person.y < 0, 'Person-Sektor oben (y<0)');
    assert.ok(inst.y > 0, 'Institution-Sektor unten (y>0)');
  });
});

// --- filter-state ---------------------------------------------------------

describe('filter-state (geteilter Schnitt)', () => {
  test('Default-State: weit, alle Facetten leer', () => {
    resetFilter();
    const f = getFilter();
    assert.equal(f.schaerfe, 'weit');
    assert.equal(f.ort, '');
    assert.equal(f.zeitfenster, null);
    assert.equal(isFilterActive(), false);
  });

  test('setFilter merged Patch, isFilterActive erkennt Aktivitaet', () => {
    resetFilter();
    setFilter({ ort: 'Bayreuth' });
    assert.equal(getFilter().ort, 'Bayreuth');
    assert.equal(isFilterActive(), true);
    resetFilter();
    assert.equal(isFilterActive(), false);
  });

  test('subscribe wird bei Aenderung benachrichtigt (window gemockt)', () => {
    const prev = globalThis.window;
    globalThis.window = new EventTarget();
    try {
      resetFilter();
      let calls = 0;
      let last = null;
      const off = subscribe((s) => { calls++; last = s; }, { immediate: false });
      setFilter({ person: 'Wagner, Wieland' });
      assert.equal(calls, 1);
      assert.equal(last.person, 'Wagner, Wieland');
      off();
      setFilter({ person: 'X' });
      assert.equal(calls, 1, 'nach Abmeldung keine weitere Benachrichtigung');
    } finally {
      globalThis.window = prev;
      resetFilter();
    }
  });
});
