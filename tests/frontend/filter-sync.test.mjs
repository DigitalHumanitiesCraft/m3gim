/**
 * Unit-Tests fuer die Cross-View-Filter-Kopplung (M4, E-117).
 *
 * Zwei Schichten, beide dom-frei:
 *   1. Reine Projektions-/Faltungsfunktionen aus filter-sync.js (shared <-> view).
 *   2. Loop-Guard + filter-state-Integration mit window als gemocktem
 *      EventTarget: setFilter dispatcht genau einmal pro echter Aenderung, und
 *      der Guard verhindert die setFacet<->setFilter-Endlosschleife.
 *
 * Lauf: node --test tests/frontend/filter-sync.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import {
  sharedToToolbarState, toolbarStateToShared, engRecordSet, applySchaerfeEng,
  applyZeitfenster, recordYear, makeSyncGuard, sichtToActiveSet, activeSetToSicht,
  zeitfensterToYearRange, yearRangeToZeitfenster,
} from '../../docs/js/ui/filter-sync.js';

// --- Schicht 1: reine Projektionen ----------------------------------------

describe('sharedToToolbarState / toolbarStateToShared (ort<->location)', () => {
  test('shared.ort projiziert auf toolbar.location, person/werk 1:1', () => {
    const t = sharedToToolbarState({ ort: 'Bayreuth', person: 'Malaniuk, Ira', werk: 'Tristan' });
    assert.deepEqual(t, { person: 'Malaniuk, Ira', location: 'Bayreuth', werk: 'Tristan' });
  });
  test('Leerwerte bleiben leer (Facette inaktiv)', () => {
    assert.deepEqual(sharedToToolbarState({}), { person: '', location: '', werk: '' });
  });
  test('Rueckprojektion location -> ort, Roundtrip stabil', () => {
    const shared = { ort: 'Wien', person: 'X', werk: '' };
    const back = toolbarStateToShared(sharedToToolbarState(shared));
    assert.deepEqual(back, { person: 'X', ort: 'Wien', werk: '' });
  });
});

describe('engRecordSet / applySchaerfeEng (Schaerfegrad)', () => {
  const store = {
    recordToEvents: new Map([['r1', ['ste1']], ['r2', []]]),
    recordToPerformances: new Map([['r3', [{}]]]),
  };
  test('eng-Menge ist Vereinigung aus STE- und Performance-Records', () => {
    const set = engRecordSet(store);
    assert.ok(set.has('r1') && set.has('r2') && set.has('r3'));
    assert.equal(set.size, 3);
  });
  test('applySchaerfeEng filtert auf belegte Records und nennt die Differenz', () => {
    const items = [{ '@id': 'r1' }, { '@id': 'r3' }, { '@id': 'r9' }];
    const r = applySchaerfeEng(items, store, (it) => it);
    assert.equal(r.total, 3);
    assert.equal(r.eng, 2);
    assert.deepEqual(r.items.map(i => i['@id']), ['r1', 'r3']);
  });
});

describe('applyZeitfenster (undatierte bleiben sichtbar)', () => {
  const items = [
    { '@id': 'a', 'rico:date': '1951-08-26' },
    { '@id': 'b', 'rico:date': '1960' },
    { '@id': 'c' }, // undatiert
  ];
  test('null-Fenster laesst alles durch', () => {
    assert.equal(applyZeitfenster(items, null, (it) => it).length, 3);
  });
  test('Fenster filtert datierte aus, undatierte bleiben (E-88)', () => {
    const out = applyZeitfenster(items, [1950, 1953], (it) => it).map(i => i['@id']);
    assert.deepEqual(out, ['a', 'c']);
  });
  test('recordYear liest rico:date, null bei undatiert', () => {
    assert.equal(recordYear({ 'rico:date': '1952-01' }), 1952);
    assert.equal(recordYear({}), null);
  });
});

describe('sicht <-> active-Set (Karte)', () => {
  const ids = ['performativ', 'institutionell', 'korrespondenz', 'diskursiv', 'biografisch', 'kontext'];
  test('Leerwert => alle Sichten aktiv', () => {
    assert.equal(sichtToActiveSet('', ids).size, ids.length);
  });
  test('gesetzte Sicht => genau diese eine', () => {
    const set = sichtToActiveSet('performativ', ids);
    assert.deepEqual([...set], ['performativ']);
  });
  test('activeSetToSicht: genau eine aktiv => Id, alle aktiv => leer', () => {
    assert.equal(activeSetToSicht(new Set(['diskursiv']), ids), 'diskursiv');
    assert.equal(activeSetToSicht(new Set(ids), ids), '');
    assert.equal(activeSetToSicht(new Set(['a', 'b']), ids), '');
  });
});

describe('zeitfenster <-> yearRange (volle Spanne faltet zu null)', () => {
  const span = { min: 1940, max: 1980 };
  test('null-Fenster => null/null', () => {
    assert.deepEqual(zeitfensterToYearRange(null), { yearFrom: null, yearTo: null });
  });
  test('Fenster => Grenzen', () => {
    assert.deepEqual(zeitfensterToYearRange([1951, 1953]), { yearFrom: 1951, yearTo: 1953 });
  });
  test('volle Spanne faltet zu null (Filter inaktiv)', () => {
    assert.equal(yearRangeToZeitfenster(1940, 1980, span), null);
    assert.equal(yearRangeToZeitfenster(null, null, span), null);
  });
  test('Teilspanne bleibt erhalten', () => {
    assert.deepEqual(yearRangeToZeitfenster(1951, 1953, span), [1951, 1953]);
  });
});

// --- Schicht 2: Loop-Guard (rein) -----------------------------------------

describe('makeSyncGuard', () => {
  test('run setzt das Flag waehrend fn und raeumt im finally ab', () => {
    const g = makeSyncGuard();
    let seen = null;
    assert.equal(g.isActive(), false);
    g.run(() => { seen = g.isActive(); });
    assert.equal(seen, true);
    assert.equal(g.isActive(), false);
  });
  test('reentranter run wird unterdrueckt (kein zweites fn)', () => {
    const g = makeSyncGuard();
    let inner = 0;
    g.run(() => { g.run(() => { inner += 1; }); });
    assert.equal(inner, 0, 'innerer run darf nicht laufen, solange der aeussere haelt');
  });
  test('Flag wird auch bei Ausnahme abgeraeumt', () => {
    const g = makeSyncGuard();
    assert.throws(() => g.run(() => { throw new Error('x'); }));
    assert.equal(g.isActive(), false);
  });
});

// --- Schicht 2: filter-state + Guard gegen die Endlosschleife --------------

describe('filter-state Dispatch + Loop-Guard (window gemockt)', () => {
  let filterState;

  before(async () => {
    // window als EventTarget mocken, bevor filter-state.js es nutzt.
    if (typeof globalThis.window === 'undefined') {
      globalThis.window = new EventTarget();
    }
    filterState = await import('../../docs/js/ui/filter-state.js');
  });

  test('setFilter dispatcht genau einmal pro echter Aenderung, idempotent bei No-Op', () => {
    const { setFilter, resetFilter } = filterState;
    resetFilter();
    let dispatches = 0;
    const handler = () => { dispatches += 1; };
    globalThis.window.addEventListener('m3gim:filter', handler);

    setFilter({ ort: 'Bayreuth' });        // echte Aenderung -> 1
    setFilter({ ort: 'Bayreuth' });        // No-Op -> kein Dispatch
    setFilter({ person: 'Malaniuk, Ira' }); // echte Aenderung -> 2

    globalThis.window.removeEventListener('m3gim:filter', handler);
    assert.equal(dispatches, 2);
    resetFilter();
  });

  test('Guard verhindert die setFacet<->setFilter-Schleife', () => {
    const { setFilter, getFilter, subscribe, resetFilter } = filterState;
    resetFilter();
    const guard = makeSyncGuard();

    // Simuliert einen View: subscribe spiegelt den geteilten ort in einen
    // lokalen "Toolbar"-State und schreibt ihn — innerhalb des Guards — zurueck.
    // Ohne Guard riefe der Rueckschreib-setFilter den Subscriber erneut.
    const toolbar = { location: '' };
    let writeBacks = 0;
    const unsub = subscribe((shared) => {
      if (guard.isActive()) return;
      guard.run(() => {
        toolbar.location = sharedToToolbarState(shared).location;
        // Rueckschreiben des projizierten Werts (No-Op-Aenderung an sich, aber
        // bei abweichender Projektion koennte es feuern -> Guard schuetzt).
        setFilter(toolbarStateToShared(toolbar));
        writeBacks += 1;
      });
    }, { immediate: false });

    setFilter({ ort: 'Wien' });
    assert.equal(toolbar.location, 'Wien', 'View hat den geteilten Wert gespiegelt');
    assert.equal(writeBacks, 1, 'genau ein Write-Back, keine Schleife');
    assert.equal(getFilter().ort, 'Wien');

    unsub();
    resetFilter();
  });

  test('zwei Views mit gegenseitiger Spiegelung konvergieren (kein Endlos-Dispatch)', () => {
    const { setFilter, getFilter, subscribe, resetFilter } = filterState;
    resetFilter();
    // Jeder View spiegelt ort in seinen lokalen State und schreibt den
    // projizierten Wert per eigenem Guard zurueck. Idempotente Projektion ->
    // der zweite Dispatch ist ein No-Op und stirbt, statt zu oszillieren.
    let total = 0;
    const makeView = () => {
      const g = makeSyncGuard();
      const local = { location: '' };
      return subscribe((shared) => {
        if (g.isActive()) return;
        g.run(() => {
          local.location = sharedToToolbarState(shared).location;
          total += 1;
          setFilter(toolbarStateToShared(local));
        });
      }, { immediate: false });
    };
    const u1 = makeView();
    const u2 = makeView();

    setFilter({ ort: 'Bayreuth' });
    // Beide Views reagieren genau einmal; setFilter terminiert (No-Op-Konvergenz).
    assert.equal(getFilter().ort, 'Bayreuth');
    assert.ok(total <= 4, `Dispatch konvergiert, kein Lauf (total=${total})`);

    u1(); u2();
    resetFilter();
  });
});
