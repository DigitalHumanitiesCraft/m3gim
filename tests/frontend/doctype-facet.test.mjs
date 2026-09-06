/**
 * Der Dokumenttyp als geteilte Facette (Sidebar-Umbau Bestand/Chronik).
 *
 * Die Facette loest ueber recordsFor auf, dieselbe Stelle wie Person/Ort/Werk.
 * Ein gewaehlter Blattwert schneidet auf seinen Typ, ein gewaehlter Oberbegriff
 * der DFT-Hierarchie loest ueber expandDftFilter auf alle seine Blaetter auf
 * (ODER). docTypeGroups liefert die Baumgruppen als gruppierte Vorschlaege mit
 * per-Wert-Zaehlern, damit die Sidebar die Facette wie die uebrigen bedient.
 *
 * Lauf: node --test tests/frontend/doctype-facet.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { recordsFor, docTypeGroups, facetInventory, baseIds } from '../../docs/js/data/records-for.js';
import { aggregateDocTypes } from '../../docs/js/views/statistik-data.js';
import { getDocTypeId } from '../../docs/js/utils/format.js';
import { storeFromShipped } from './_shipped.mjs';
import { impliedByGroup, groupTip } from '../../docs/js/ui/sidebar.js';

// Miniatur-Store mit einer DFT-Hierarchie: Oberbegriff schriftgut -> {brief,
// rezension}, dazu ein freistehender Typ plakat. getDocTypeId liest
// rico:hasDocumentaryFormType als Kurz-Id.
function makeStore() {
  const rec = (id, type) => ({
    '@id': id,
    'm3gim-ontology:processingStatus': 'abgeschlossen',
    'rico:hasDocumentaryFormType': { '@id': `m3gim-vocab:${type}` },
  });
  const records = new Map([
    ['r1', rec('r1', 'brief')],
    ['r2', rec('r2', 'brief')],
    ['r3', rec('r3', 'rezension')],
    ['r4', rec('r4', 'plakat')],
  ]);
  const dftHierarchy = new Map([
    ['m3gim-vocab:schriftgut', { id: 'm3gim-vocab:schriftgut', prefLabel: 'Schriftgut', broader: null, children: ['m3gim-vocab:brief', 'm3gim-vocab:rezension'] }],
    ['m3gim-vocab:brief', { id: 'm3gim-vocab:brief', prefLabel: 'Brief', broader: 'm3gim-vocab:schriftgut', children: [] }],
    ['m3gim-vocab:rezension', { id: 'm3gim-vocab:rezension', prefLabel: 'Rezension', broader: 'm3gim-vocab:schriftgut', children: [] }],
    ['m3gim-vocab:plakat', { id: 'm3gim-vocab:plakat', prefLabel: 'Plakat', broader: null, children: [] }],
  ]);
  const byDocType = new Map([['brief', new Set(['r1', 'r2'])], ['rezension', new Set(['r3'])], ['plakat', new Set(['r4'])]]);
  return {
    records,
    allRecords: [...records.values()],
    persons: new Map(), locations: new Map(), works: new Map(),
    organizations: new Map(), ensembles: new Map(),
    recordsByAgentRole: new Map(), eventsByRole: new Map(),
    recordToAnnotations: new Map(), annotations: new Map(),
    recordToEvents: new Map(), recordToPerformances: new Map(),
    finances: new Map(), roleVocab: new Map(),
    recordDatings: new Map(),
    dftHierarchy, byDocType,
  };
}

const idsOf = (store, filter) => [...recordsFor(store, filter).ids].sort();

describe('docType schneidet ueber recordsFor', () => {
  test('ein Blattwert schneidet auf seinen Typ', () => {
    assert.deepEqual(idsOf(makeStore(), { docType: ['brief'] }), ['r1', 'r2']);
  });

  test('ein Oberbegriff loest auf alle Blaetter auf (ODER)', () => {
    assert.deepEqual(idsOf(makeStore(), { docType: ['schriftgut'] }), ['r1', 'r2', 'r3']);
  });

  test('zwei Blattwerte vereinigen sich (ODER innerhalb der Facette)', () => {
    assert.deepEqual(idsOf(makeStore(), { docType: ['brief', 'plakat'] }), ['r1', 'r2', 'r4']);
  });

  test('docType und eine zweite Facette bleiben UND-verknuepft', () => {
    // Es gibt keine Person, also schneidet die zweite Facette auf leer.
    const store = makeStore();
    store.persons = new Map([['X', { records: new Set(['r1']) }]]);
    assert.deepEqual(idsOf(store, { docType: ['schriftgut'], person: ['X'] }), ['r1']);
  });
});

describe('docTypeGroups liefert die Baumgruppen als Vorschlaege', () => {
  test('Gruppe traegt Kinder mit eigenen Zaehlern', () => {
    const groups = docTypeGroups(makeStore());
    const schriftgut = groups.find(g => g.value === 'schriftgut');
    assert.ok(schriftgut, 'Oberbegriff Schriftgut erscheint als Gruppe');
    assert.equal(schriftgut.count, 3, 'die Gruppe zaehlt die Summe ihrer Blaetter');
    const kinder = schriftgut.children.map(c => `${c.value}:${c.count}`).sort();
    assert.deepEqual(kinder, ['brief:2', 'rezension:1']);
  });

  test('nur belegte Werte erscheinen', () => {
    const store = makeStore();
    // rezension leeren -> das Kind faellt weg, Gruppe bleibt (brief traegt sie).
    store.allRecords = store.allRecords.filter(r => r['@id'] !== 'r3');
    const groups = docTypeGroups(store);
    const schriftgut = groups.find(g => g.value === 'schriftgut');
    assert.deepEqual(schriftgut.children.map(c => c.value), ['brief']);
  });
});

describe('facetInventory kennt docType mit Anzeigelabel', () => {
  test('die Blaetter tragen ihr prefLabel', () => {
    const inv = facetInventory(makeStore(), 'docType');
    const brief = inv.find(e => e.value === 'brief');
    assert.equal(brief.label, 'Brief');
    assert.equal(brief.count, 2);
  });
});

describe('Der Baum zeigt, was der Schnitt mitnimmt', () => {
  test('ein Kind eines gewaehlten Oberbegriffs traegt den mitgemeinten Haken', () => {
    // Der Haken ist nur ehrlich, solange die Gruppe ihre Blaetter mitschneidet.
    assert.deepEqual(idsOf(makeStore(), { docType: ['schriftgut'] }), ['r1', 'r2', 'r3']);
    assert.equal(impliedByGroup(['schriftgut'], 'schriftgut', 'brief', false), true);
  });

  test('ein selbst gewaehltes Kind ist gewaehlt, nicht mitgemeint', () => {
    assert.equal(impliedByGroup(['schriftgut', 'brief'], 'schriftgut', 'brief', false), false);
    assert.equal(impliedByGroup([], 'schriftgut', 'brief', false), false);
  });

  test('eine synthetische Gruppe schreibt ihre Blaetter selbst in die Wahl', () => {
    assert.equal(impliedByGroup(['brief'], 'sonstige', 'brief', true), false);
  });

  test('das mitgemeinte Blatt ist Information, kein Ziel', () => {
    const src = readFileSync(new URL('../../docs/js/ui/sidebar-options.js', import.meta.url), 'utf-8');
    const row = src.slice(src.indexOf('function optionRow'), src.indexOf('function groupRow'));
    assert.match(row, /implied \? \{ 'aria-disabled': 'true' \} : \{ onClick \}/,
      'Ohne Klick, weil die Wahl nichts hinzufuegt, was der Oberbegriff nicht traegt.');
    const facets = readFileSync(new URL('../../docs/js/ui/sidebar-facets.js', import.meta.url), 'utf-8');
    assert.match(facets, /implied \? null : \(\) => toggle\(child\.value\)/);
    const css = readFileSync(new URL('../../docs/css/sidebar.css', import.meta.url), 'utf-8');
    assert.match(css, /\.fs-option--implied \{\s+color: var\(--color-text-tertiary\);\s+cursor: default;/);
  });

  test('der gewaehlte Oberbegriff verwirft das redundante Kind aus der Wahl', () => {
    const src = readFileSync(new URL('../../docs/js/ui/sidebar-facets.js', import.meta.url), 'utf-8');
    const tree = src.slice(src.indexOf('function facetTreeControl'), src.indexOf('function optionListControl'));
    assert.match(tree, /chosen\.filter\(v => !kidValues\.includes\(v\)\), entry\.value\]/,
      'Sonst stuende "Autobiografie" im Streifen neben "Biographisch".');
  });
});

describe('Tooltip der Gruppenzeile', () => {
  test('er trennt die direkt getypten von den in Untertypen liegenden Dokumenten', () => {
    const groups = docTypeGroups(makeStore());
    const schriftgut = groups.find(g => g.value === 'schriftgut');
    const kidTotal = schriftgut.children.reduce((n, c) => n + c.count, 0);
    // Kein Datensatz ist direkt als schriftgut getypt: 3 minus 3 ist 0.
    assert.equal(groupTip(schriftgut.count, kidTotal), '0 direkt · 3 in Untertypen');
    assert.equal(groupTip(7, 3), '4 direkt · 3 in Untertypen');
  });

  test('er wird nie negativ, auch wenn die Zaehler auseinanderlaufen', () => {
    assert.equal(groupTip(2, 3), '0 direkt · 3 in Untertypen');
  });
});

describe('Ohne Typ bleibt ohne erfundene Facette belegbar', () => {
  // No type facet can select an untyped record; its evidence uses record IDs.
  function storeMitUngetyptem() {
    const store = makeStore();
    store.records.set('r5', { '@id': 'r5', 'm3gim-ontology:processingStatus': 'abgeschlossen' });
    store.allRecords = [...store.records.values()];
    return store;
  }

  test('das Aggregat kennt die Zeile, die Facette erreicht sie nicht', () => {
    const store = storeMitUngetyptem();
    const ohneTyp = aggregateDocTypes(store, baseIds(store)).find(row => row.id === null);
    assert.equal(ohneTyp.count, 1, 'die Zeile zaehlt den ungetypten Datensatz');
    assert.deepEqual(ohneTyp.recordIds, ['r5'], 'die Belegliste erreicht genau diesen Datensatz');
    // Alle angebotenen Werte plus der frueher gesetzte Platzhalter.
    const werte = ['schriftgut', 'brief', 'rezension', 'plakat', '__none__', 'ohne-typ'];
    for (const wert of werte) {
      assert.ok(!recordsFor(store, { docType: [wert] }).ids.has('r5'),
        `docType=${wert} erreicht den ungetypten Datensatz nicht`);
    }
  });

  test('im ausgelieferten Datensatz erreicht kein Typwert die ungetypten Dokumente', async () => {
    const store = await storeFromShipped();
    const ungetypt = store.allRecords.filter(r => !getDocTypeId(r)).map(r => r['@id']);
    assert.ok(ungetypt.length >= 100,
      `der Datensatz traegt ${ungetypt.length} Dokumente ohne Dokumenttyp`);
    const base = baseIds(store);
    const imBestand = new Set(ungetypt.filter(id => base.has(id)));
    const angeboten = [];
    for (const gruppe of docTypeGroups(store)) {
      angeboten.push(gruppe.value, ...gruppe.children.map(k => k.value));
    }
    const erreicht = recordsFor(store, { docType: angeboten }).ids;
    for (const id of imBestand) {
      assert.ok(!erreicht.has(id), `${id} bleibt fuer jeden Typwert unerreichbar`);
    }
  });
});
