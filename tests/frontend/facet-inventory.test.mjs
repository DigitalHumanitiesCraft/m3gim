/**
 * Die Facetten tragen am ausgelieferten Datensatz.
 *
 * Eine Facette ohne Deckung ist ein toter Regler: sie steht in der Sidebar,
 * liefert aber nichts, und der Betrachter haelt die leere Auswahl fuer ein
 * Datenurteil. Diese Datei misst die Deckung der vier neuen Achsen (Ereignis,
 * Akteursrolle, Sicht, Ensemble) und der Waehrungsachse gegen
 * `docs/data/m3gim.jsonld`, mit Mindestvorkommen statt Nulltoleranz.
 *
 * Die duenne Ensemble-Deckung wird ausdruecklich festgehalten, damit ihr
 * Wachstum beim naechsten Datenstand auffaellt.
 *
 * Lauf: node --test tests/frontend/facet-inventory.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import { facetInventory } from '../../docs/js/data/records-for.js';
import { storeFromShipped } from './_shipped.mjs';

let store;
before(async () => { store = await storeFromShipped(); });

const valueOf = (inv, value) => inv.find(e => e.value === value);

describe('Die neuen Store-Indizes sind da', () => {
  test('Ensemble steht getrennt neben der Institution', () => {
    assert.ok(store.ensembles instanceof Map, 'store.ensembles fehlt');
    assert.ok(store.ensembles.size > 0, 'kein rico:Group im Datensatz angekommen');
    for (const name of store.ensembles.keys()) {
      assert.ok(store.organizations.has(name), (
        `Ensemble ${name} muss zusaetzlich in store.organizations stehen, damit `
        + 'Karte, Verknuepfungen und Indizes unveraendert weiterlaufen.'
      ));
    }
  });

  test('Ereignis- und Akteursrolle haben je einen Record-Index', () => {
    assert.ok(store.eventsByRole instanceof Map && store.eventsByRole.size > 0);
    assert.ok(store.recordsByAgentRole instanceof Map && store.recordsByAgentRole.size > 0);
    for (const [, ids] of store.eventsByRole) assert.ok(ids instanceof Set && ids.size > 0);
    for (const [, ids] of store.recordsByAgentRole) assert.ok(ids instanceof Set && ids.size > 0);
  });
});

describe('facetInventory am ausgelieferten Datensatz', () => {
  test('Ereignis: mindestens 15 Rollen, Auffuehrung traegt am staerksten mit', () => {
    const inv = facetInventory(store, 'ereignis');
    assert.ok(inv.length >= 15, `nur ${inv.length} Ereignisrollen`);
    const perf = valueOf(inv, 'm3gim-vocab:performance');
    assert.ok(perf && perf.count >= 30, `Auffuehrung deckt nur ${perf ? perf.count : 0} Dokumente`);
  });

  test('Akteursrolle: mindestens 20 Rollen, Saenger traegt am staerksten mit', () => {
    const inv = facetInventory(store, 'rolle');
    assert.ok(inv.length >= 20, `nur ${inv.length} Akteursrollen`);
    const singer = valueOf(inv, 'm3gim-vocab:singer');
    assert.ok(singer && singer.count >= 40, `Saenger deckt nur ${singer ? singer.count : 0} Dokumente`);
  });

  test('jede Rolle traegt ein Anzeigelabel aus store.roleVocab (E-143)', () => {
    for (const key of ['rolle', 'ereignis']) {
      for (const entry of facetInventory(store, key)) {
        assert.ok(entry.label && entry.label !== entry.value, (
          `Die Rolle ${entry.value} steht ohne Anzeigeform im Inventar der `
          + `Facette ${key}; ohne Label gehoert sie nicht hinein.`
        ));
      }
    }
  });

  test('Sicht: die fuenf Mobilitaetssichten plus der Kontext-Eimer', () => {
    const inv = facetInventory(store, 'sicht');
    const ids = new Set(inv.map(e => e.value));
    for (const id of ['performativ', 'institutionell', 'korrespondenz',
      'diskursiv', 'biografisch', 'kontext']) {
      assert.ok(ids.has(id), `Sicht ${id} fehlt im Inventar`);
    }
  });

  test('Ensemble: belegt, aber duenn — der Stand wird ausdruecklich festgehalten', () => {
    const inv = facetInventory(store, 'ensemble');
    assert.ok(inv.length > 0, 'Ensemble-Facette ohne jede Deckung');
    assert.ok(inv.length < 20, (
      `Die Ensemble-Achse traegt inzwischen ${inv.length} Werte. Die Schreib`
      + 'varianten sind womoeglich zusammengefuehrt; die Zurueckstellung der '
      + 'Facette ist neu zu bewerten.'
    ));
  });

  test('Finanzen: die Waehrungen, keine erfundene Rollenachse', () => {
    const inv = facetInventory(store, 'finanzen');
    assert.ok(inv.length >= 5, `nur ${inv.length} Waehrungen`);
    assert.ok(valueOf(inv, 'DM'), 'DM fehlt');
    for (const entry of inv) {
      assert.ok(!String(entry.value).startsWith('m3gim-vocab:'), (
        'Die Finanzachse traegt heute nur Vorhandensein und Waehrung; '
        + '`detailRole` ist in allen Belegen leer. Eine Rollenachse waere erfunden.'
      ));
    }
  });

  test('Person, Ort, Werk und Institution bleiben absteigend gezaehlt', () => {
    for (const key of ['person', 'ort', 'werk', 'institution']) {
      const inv = facetInventory(store, key);
      assert.ok(inv.length > 10, `Facette ${key} traegt nur ${inv.length} Werte`);
      for (let i = 1; i < inv.length; i++) {
        assert.ok(inv[i - 1].count >= inv[i].count, `Facette ${key} ist nicht sortiert`);
      }
      assert.ok(inv.every(e => e.count > 0));
    }
  });
});
