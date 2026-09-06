/**
 * Die Facetten tragen am ausgelieferten Datensatz, und die Spalte fuehrt genau
 * die, die es gibt.
 *
 * Eine Facette ohne Deckung ist ein toter Regler: sie steht in der Sidebar,
 * liefert aber nichts, und der Betrachter haelt die leere Auswahl fuer ein
 * Datenurteil. Diese Datei misst die Deckung der Achsen gegen
 * `docs/data/m3gim.jsonld`, mit Mindestvorkommen statt Nulltoleranz, und haelt
 * das Inventar der Spalte fest: welche Facetten es gibt und welche
 * ausdruecklich nicht mehr.
 *
 * Die duenne Ensemble-Deckung wird ausdruecklich festgehalten, damit ihr
 * Wachstum beim naechsten Datenstand auffaellt.
 *
 * Lauf: node --test tests/frontend/facet-inventory.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';

import {
  facetInventory, facetCounts, linkGroups, recordsFor, countryByCity, FACET_KEYS,
} from '../../docs/js/data/records-for.js';
import { SHARED_FACETS, FACET_META } from '../../docs/js/ui/sidebar.js';
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

  test('Die Ereignisrolle hat einen Record-Index', () => {
    assert.ok(store.eventsByRole instanceof Map && store.eventsByRole.size > 0);
    for (const [, ids] of store.eventsByRole) assert.ok(ids instanceof Set && ids.size > 0);
  });
});

describe('facetInventory am ausgelieferten Datensatz', () => {
  test('Ereignis: mindestens 15 Rollen, Auffuehrung traegt am staerksten mit', () => {
    const inv = facetInventory(store, 'ereignis');
    assert.ok(inv.length >= 15, `nur ${inv.length} Ereignisrollen`);
    const perf = valueOf(inv, 'm3gim-vocab:performance');
    assert.ok(perf && perf.count >= 30, `Auffuehrung deckt nur ${perf ? perf.count : 0} Dokumente`);
  });

  test('jede Rolle traegt ein Anzeigelabel aus store.roleVocab (E-143)', () => {
    for (const key of ['ereignis']) {
      for (const entry of facetInventory(store, key)) {
        assert.ok(entry.label && entry.label !== entry.value, (
          `Die Rolle ${entry.value} steht ohne Anzeigeform im Inventar der `
          + `Facette ${key}; ohne Label gehoert sie nicht hinein.`
        ));
      }
    }
  });

  test('Rollenlabels erscheinen grossgeschrieben, das Vokabular bleibt unberuehrt (E-184)', () => {
    // `facetInventory` ist die einzige Stelle, an der die Anzeigeform der
    // Rollen entsteht; alle Anzeigepfade laufen darueber.
    for (const key of ['ereignis']) {
      for (const entry of facetInventory(store, key)) {
        const first = entry.label[0];
        assert.equal(first, first.toLocaleUpperCase('de-DE'), (
          `Das Anzeigelabel "${entry.label}" der Facette ${key} beginnt klein.`
        ));
        const vocab = store.roleVocab.get(entry.value);
        assert.equal(vocab.label.slice(1), entry.label.slice(1), (
          `Nur der erste Buchstabe wird angehoben; "${vocab.label}" und `
          + `"${entry.label}" weichen dahinter ab.`
        ));
      }
    }
    assert.equal(store.roleVocab.get('m3gim-vocab:conductor').label, 'dirigent',
      'Das Vokabular selbst bleibt kleingeschrieben.');
  });

  test('Land: die Reichweite des Bestands, absteigend gezaehlt', () => {
    const inv = facetInventory(store, 'land');
    assert.ok(inv.length >= 8, `nur ${inv.length} Laender`);
    assert.equal(inv[0].value, 'Deutschland', 'Deutschland traegt am meisten');
    for (let i = 1; i < inv.length; i++) {
      assert.ok(inv[i - 1].count >= inv[i].count, 'die Liste ist nicht sortiert');
    }
    // Aufgabe 3 des Aufgabensatzes liest das duennste Land als letzte Zeile.
    assert.ok(inv[inv.length - 1].count >= 1);
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

// --- Das Inventar der Spalte ----------------------------------------------

const read = (rel) => readFileSync(new URL(`../../docs/js/${rel}`, import.meta.url), 'utf-8');

/** Die Ansichten, die die geteilte Spalte bauen. */
const VIEWS = ['bestand', 'chronik', 'indizes', 'karte', 'netzwerk', 'statistik'];

describe('Welche Facetten die Spalte fuehrt', () => {
  test('jede Ansicht traegt dieselben sieben geteilten Facetten', () => {
    assert.deepEqual([...SHARED_FACETS],
      ['docType', 'person', 'ort', 'land', 'werk', 'institution', 'verknuepfung']);
    // Keine Ansicht bringt eine eigene Auswahl mit; ohne `facets:` nimmt jede
    // die geteilte Liste, und damit ist das Inventar je Ansicht dasselbe.
    for (const view of VIEWS) {
      assert.doesNotMatch(read(`views/${view}.js`), /\bfacets:/,
        `${view} setzt eine eigene Facettenliste und weicht damit ab`);
    }
    // Jede gefuehrte Facette traegt eine Anzeigeform, und jede Anzeigeform
    // gehoert zu einer gefuehrten Facette.
    assert.deepEqual(Object.keys(FACET_META).sort(), [...SHARED_FACETS].sort());
  });

  test('der Erschliessungsstand und die Sicht sind ueberall fort', () => {
    for (const gone of ['stand', 'sicht']) {
      assert.ok(!SHARED_FACETS.includes(gone), `${gone} steht noch in der Spalte`);
      assert.ok(!(gone in FACET_META), `${gone} traegt noch eine Anzeigeform`);
      assert.ok(!FACET_KEYS.includes(gone), `${gone} ist noch eine Achse`);
    }
    const column = ['ui/sidebar.js', 'ui/sidebar-facets.js', 'ui/sidebar-status.js',
      'ui/sidebar-strip.js'].map(read).join('\n');
    assert.doesNotMatch(column, /standSection|standInventory|Erschließungsstand/,
      'Kein Bedienelement der Spalte nennt den Erschliessungsstand mehr (E-262).');
    assert.doesNotMatch(read('views/statistik.js'), /Erschließungsstand|buildErschliessung/,
      'Die Statistik fuehrt keine Erschliessungs-Sektion mehr (E-262).');
  });

  test('die Mobilitaetssichten sind aus jedem Verbraucher fort (F1)', () => {
    // Die Sicht war Farb- und Aufschluesselungsachse von Karte, Chronik und
    // Statistik. Bleibt sie irgendwo stehen, zeigen zwei Ansichten dieselbe
    // Menge nach zwei verschiedenen Achsen.
    for (const module of ['views/statistik-data.js', 'views/chronik-data.js',
      'views/chronik.js', 'views/karte-data.js', 'views/karte-map.js', 'views/karte.js']) {
      assert.doesNotMatch(read(module), /SICHTEN|SICHT_COLOR|sichtForRecord|breakdownByView/,
        `${module} nennt die Mobilitaetssicht noch.`);
    }
  });

  test('jede Ansicht baut ihre Spalte aus demselben Geruest', () => {
    // Ohne createSidebar brauchte eine Ansicht ihren eigenen Filterort, und das
    // Inventar der Facetten fiele je Ansicht auseinander.
    for (const view of VIEWS) {
      assert.match(read(`views/${view}.js`), /createSidebar\(store, \{/,
        `${view} baut die Filterspalte nicht aus dem geteilten Geruest`);
    }
  });

  test('Land und Verknuepfung starten zugeklappt, die uebrigen offen', () => {
    const src = read('ui/sidebar-facets.js');
    const folded = src.slice(src.indexOf('const startsFolded'));
    assert.match(folded.slice(0, 120), /collapsible: true, collapsed: \(\) => true/);
    for (const section of ['function landSection', 'function linkSection']) {
      const block = folded.slice(folded.indexOf(section));
      assert.match(block.slice(0, 900), /\.\.\.startsFolded,/,
        `${section} startet nicht zugeklappt und laesst die Spalte scrollen`);
    }
  });

  test('jede Ansicht nennt ihren Datenstand an derselben Stelle (F6)', () => {
    const src = read('ui/sidebar-status.js');
    assert.match(src, /function dataState\(store\)/);
    assert.match(src, /`Datenstand \$\{String\(raw\)\.slice\(0, 10\)\}`/);
    assert.match(src, /tip: \[cut, stand\]\.filter\(Boolean\)\.join\('\\n'\)/,
      'Der Datenstand haengt im Tooltip der Ergebniszeile, die jede Ansicht baut.');
  });
});

describe('Der Baum der Verknuepfungen', () => {
  test('acht Typen mit ihren Rollen darunter, absteigend gezaehlt', () => {
    const groups = linkGroups(store);
    assert.deepEqual(groups.map(g => g.value),
      ['person', 'institution', 'ort', 'datum', 'werk', 'ereignis', 'finanz', 'ensemble'],
      'Die acht Typen der Verknuepfungstabelle, der ergiebigste zuerst.');
    for (let i = 1; i < groups.length; i++) {
      assert.ok(groups[i - 1].count >= groups[i].count);
    }
    for (const group of groups) {
      assert.ok(group.children.length > 0, `${group.value} traegt keine Rolle`);
      for (let i = 1; i < group.children.length; i++) {
        assert.ok(group.children[i - 1].count >= group.children[i].count);
      }
    }
  });

  test('jede Rolle traegt eine Anzeigeform, keine nackte Concept-Id (E-143)', () => {
    for (const group of linkGroups(store)) {
      for (const child of group.children) {
        assert.ok(child.label && !child.label.startsWith('m3gim-vocab:'), (
          `Die Rolle ${child.value} stuende als nackte Kennung in der Spalte.`
        ));
        assert.match(child.value, new RegExp(`^${group.value}:`),
          'Der Wert einer Rolle traegt ihren Typ, sonst schnitte sie typuebergreifend.');
      }
    }
  });

  test('der Typ zaehlt die Dokumente mit einer Verknuepfung dieses Typs', () => {
    // Die Zahl des Typs ist nicht die Summe seiner Rollen: ein Dokument mit
    // zwei Rollen desselben Typs zaehlt in beiden Zeilen und einmal oben.
    const groups = linkGroups(store);
    for (const group of groups) {
      const sum = group.children.reduce((n, c) => n + c.count, 0);
      assert.ok(sum >= group.count, (
        `${group.value}: die Rollen zaehlen ${sum}, der Typ ${group.count}; `
        + 'die Summe der Rollen kann den Typ nicht unterbieten.'
      ));
      assert.ok(group.children.every(c => c.count <= group.count),
        `${group.value}: eine Rolle traegt mehr Dokumente als ihr Typ`);
    }
    // Der Baum reicht seinen Tooltip leer nach unten; die Regel steht am Kopf.
    assert.ok(groups.every(g => g.tip === ''));
  });

  test('der Schnitt auf einen Typ ist die Vereinigung seiner Rollen', () => {
    const ort = linkGroups(store).find(g => g.value === 'ort');
    const alleRollen = recordsFor(store, { verknuepfung: ort.children.map(c => c.value) });
    const nurTyp = recordsFor(store, { verknuepfung: ['ort'] });
    // Gleich bis auf die Verknuepfungen ohne Rolle, die nur der Typ traegt.
    for (const id of alleRollen.ids) assert.ok(nurTyp.ids.has(id));
    assert.ok(nurTyp.ids.size >= alleRollen.ids.size);
  });
});

describe('Die Zaehlregel der Laender-Facette', () => {
  test('sie zaehlt jede Ortsrolle, nicht nur den Aufenthalt', () => {
    // Gegen E-224: die alte Laender-Reichweite der Karte zaehlte nur Auftritt,
    // Gastspiel und Spielzeit. Die geteilte Facette schliesst keine Rolle aus,
    // also muss sie mindestens so viele Dokumente je Land tragen wie die Menge
    // der Dokumente mit einer Aufenthaltsrolle in diesem Land.
    const perLand = new Map(facetInventory(store, 'land').map(e => [e.value, e.count]));
    const cityLand = countryByCity(store);
    const stay = new Set(['m3gim-vocab:guestPerformance', 'm3gim-vocab:performancePlace',
      'm3gim-vocab:season', 'm3gim-vocab:residencePlace', 'm3gim-vocab:contractPlace']);
    const perLandStay = new Map();
    for (const record of store.allRecords) {
      const locs = record['rico:hasOrHadLocation'];
      for (const loc of (Array.isArray(locs) ? locs : locs ? [locs] : [])) {
        const role = loc.role && loc.role['@id'];
        if (!stay.has(role)) continue;
        const land = loc['m3gim-ontology:country']
          || cityLand.get(String(loc.name || '').split(',')[0].trim().toLowerCase());
        if (!land) continue;
        if (!perLandStay.has(land)) perLandStay.set(land, new Set());
        perLandStay.get(land).add(record['@id']);
      }
    }
    assert.ok(perLandStay.size > 0, 'der Test hat keinen Gegenstand');
    for (const [land, ids] of perLandStay) {
      assert.ok((perLand.get(land) || 0) >= ids.size, (
        `${land}: die Facette traegt ${perLand.get(land)}, die Aufenthaltsbelege `
        + `allein schon ${ids.size}.`
      ));
    }
    assert.ok(perLand.get('Deutschland') > perLandStay.get('Deutschland').size, (
      'Ohne den Rollenausschluss muss Deutschland mehr Dokumente tragen als die '
      + 'Aufenthaltsbelege allein.'
    ));
  });

  test('die Zahl neben einem Wert zaehlt gegen den Schnitt der uebrigen Facetten', () => {
    const werte = facetInventory(store, 'land').map(e => e.value);
    const frei = facetCounts(store, {}, 'land', werte);
    for (const e of facetInventory(store, 'land')) {
      assert.equal(frei.get(e.value), e.count, (
        `${e.value}: ohne Schnitt muessen Inventar und Zaehlung gleich sein.`
      ));
    }
    const imSchnitt = facetCounts(store, { ort: ['Bayreuth'] }, 'land', werte);
    assert.ok(imSchnitt.get('Deutschland') < frei.get('Deutschland'), (
      'Ein Ortsschnitt muss die Laenderzahlen senken, sonst zaehlt die Facette '
      + 'gegen den Bestand statt gegen den Schnitt.'
    ));
  });
});
