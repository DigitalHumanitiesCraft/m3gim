/**
 * Unit-Tests fuer die Cross-View-Filter-Kopplung (M4, E-117).
 *
 * Zwei Schichten, beide dom-frei:
 *   1. Reine Anwend-/Faltungsfunktionen aus filter-sync.js.
 *   2. Loop-Guard + filter-state-Integration mit window als gemocktem
 *      EventTarget: setFilter dispatcht genau einmal pro echter Aenderung, und
 *      der Guard verhindert die setFacet<->setFilter-Endlosschleife.
 *
 * Lauf: node --test tests/frontend/filter-sync.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyZeitfenster, makeSyncGuard,
  zeitfensterToYearRange, yearRangeToZeitfenster,
} from '../../docs/js/ui/filter-sync.js';
import { yearOf } from '../../docs/js/data/records-for.js';
import { DATING_SCOPE } from '../../docs/js/data/constants.js';

// --- Schicht 1: reine Funktionen ------------------------------------------

describe('applyZeitfenster (undatierte bleiben sichtbar)', () => {
  const items = [
    { '@id': 'a', 'rico:date': '1951-08-26' },
    { '@id': 'b', 'rico:date': '1960' },
    { '@id': 'c' }, // undatiert
  ];
  // Die Jahresaufloesung liegt seit dem Zeitanker-Nachzug in der Datenschicht.
  // Ein Stub-Store ohne Datierungen laesst genau den rico:date-Pfad uebrig.
  const stub = { recordDatings: new Map() };
  test('null-Fenster laesst alles durch', () => {
    assert.equal(applyZeitfenster(items, null, (it) => it, stub).length, 3);
  });
  test('Fenster filtert datierte aus, undatierte bleiben (E-88)', () => {
    const out = applyZeitfenster(items, [1950, 1953], (it) => it, stub).map(i => i['@id']);
    assert.deepEqual(out, ['a', 'c']);
  });
  test('yearOf nimmt rico:date, null bei undatiert', () => {
    assert.equal(yearOf(stub, { 'rico:date': '1952-01' }), 1952);
    assert.equal(yearOf(stub, {}), null);
  });
  test('yearOf nimmt die ankernde Datierung, wenn rico:date fehlt', () => {
    const withDating = {
      recordDatings: new Map([['x', [{ year: 1949, scope: DATING_SCOPE.attested, rank: 1 }]]]),
    };
    assert.equal(yearOf(withDating, { '@id': 'x' }), 1949);
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
    // lokalen State und schreibt ihn — innerhalb des Guards — zurueck.
    // Ohne Guard riefe der Rueckschreib-setFilter den Subscriber erneut.
    const toolbar = { location: [] };
    let writeBacks = 0;
    const unsub = subscribe((shared) => {
      if (guard.isActive()) return;
      guard.run(() => {
        toolbar.location = [...(shared.ort || [])];
        // Rueckschreiben des gespiegelten Werts (No-Op-Aenderung an sich, aber
        // bei abweichender Spiegelung koennte es feuern -> Guard schuetzt).
        setFilter({ ort: toolbar.location });
        writeBacks += 1;
      });
    }, { immediate: false });

    setFilter({ ort: 'Wien' });
    assert.deepEqual(toolbar.location, ['Wien'], 'View hat den geteilten Wert gespiegelt');
    assert.equal(writeBacks, 1, 'genau ein Write-Back, keine Schleife');
    assert.deepEqual(getFilter().ort, ['Wien']);

    unsub();
    resetFilter();
  });

  test('zwei Views mit gegenseitiger Spiegelung konvergieren (kein Endlos-Dispatch)', () => {
    const { setFilter, getFilter, subscribe, resetFilter } = filterState;
    resetFilter();
    // Jeder View spiegelt ort in seinen lokalen State und schreibt den
    // gespiegelten Wert per eigenem Guard zurueck. Idempotente Spiegelung ->
    // der zweite Dispatch ist ein No-Op und stirbt, statt zu oszillieren.
    let total = 0;
    const makeView = () => {
      const g = makeSyncGuard();
      const local = { location: [] };
      return subscribe((shared) => {
        if (g.isActive()) return;
        g.run(() => {
          local.location = [...(shared.ort || [])];
          total += 1;
          setFilter({ ort: local.location });
        });
      }, { immediate: false });
    };
    const u1 = makeView();
    const u2 = makeView();

    setFilter({ ort: 'Bayreuth' });
    // Beide Views reagieren genau einmal; setFilter terminiert (No-Op-Konvergenz).
    assert.deepEqual(getFilter().ort, ['Bayreuth']);
    assert.ok(total <= 4, `Dispatch konvergiert, kein Lauf (total=${total})`);

    u1(); u2();
    resetFilter();
  });
});
