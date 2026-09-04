/**
 * Unit-Tests der Sidebar-Spalte aus docs/js/ui/sidebar.js.
 *
 * Lauf:
 *   node --test tests/frontend/sidebar-column.test.mjs
 *
 * Die Spalte selbst rendert DOM, den es im Node-Lauf nicht gibt; geprueft sind
 * deshalb die reinen Beschriftungsfunktionen und die Konfiguration, die die
 * Ansichten an createSidebar uebergeben. Das gerenderte Bild deckt der
 * Playwright-Smoke ab.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  countLabel, FACET_META, SHARED_FACETS,
} from '../../docs/js/ui/sidebar.js';

const read = (rel) => readFileSync(new URL(`../../docs/js/${rel}`, import.meta.url), 'utf-8');

describe('Ergebniszeile als Wurzel des Dokumenttyp-Baums', () => {
  test('ohne Filter steht die Grundmenge allein, mit Filter der Anteil', () => {
    assert.equal(countLabel(187, 187), '187');
    assert.equal(countLabel(161, 187), '161 von 187');
    assert.equal(countLabel(0, 187), '0 von 187');
  });

  test('die Zeile traegt das Wort Dokumente und die Zahl in einer Zeile', () => {
    const src = read('ui/sidebar.js');
    assert.match(src, /'fs-option__label', id: labelId \}, 'Dokumente'\)/,
      'Die Wurzelzeile heisst Dokumente und liegt in der Zeilenform der Typzeilen.');
    assert.doesNotMatch(src, /Dokumente`/,
      'Der alte Statusblock mit "187 Dokumente" ist abgeloest.');
  });

  test('Chips und Zuruecksetzen haengen nicht mehr an der Wurzelzeile', () => {
    const src = read('ui/sidebar.js');
    const root = src.slice(src.indexOf('function paintRoot'), src.indexOf('function filterStrip'));
    assert.doesNotMatch(root, /removeChip|resetFilter/,
      'Die Spalte darf ihre Hoehe nicht aendern, wenn ein Filter dazukommt.');
  });
});

describe('Erschliessungsstand als eigene Facette', () => {
  test('er steht in der Facettenreihenfolge direkt hinter dem Dokumenttyp', () => {
    const keys = Object.keys(FACET_META);
    assert.equal(keys.indexOf('stand'), keys.indexOf('docType') + 1);
    assert.equal(FACET_META.stand.title, 'Erschließungsstand');
    // Er ist keine offene Wertemenge mit Suchfeld, sondern eine geschlossene
    // Liste, und laeuft deshalb nicht ueber SHARED_FACETS.
    assert.ok(!SHARED_FACETS.includes('stand'));
  });

  test('die Spalte baut ihn als offene Zeilenliste hinter dem Baum', () => {
    const src = read('ui/sidebar.js');
    assert.match(src, /standSection\(store, inventories\.get\('stand'\)\),/);
    const section = src.slice(src.indexOf('function standSection'),
      src.indexOf('function filterStrip'));
    assert.match(section, /kind: 'optionList', key: 'stand'/);
    assert.match(section, /facetCounts\(store, getFilter\(\), 'stand'/,
      'Die Zahlen sind relativ zum Schnitt, wie im Baum.');
    assert.match(section, /setFilter\(\{ stand: values \}\)/);
    assert.doesNotMatch(src, /standChipLabel|STAND_TITLE/,
      'Der negativ formulierte Chip ist abgeloest.');
  });

  test('die Werte stehen in der Lesereihenfolge, nicht nach Belegzahl', () => {
    const src = read('ui/sidebar.js');
    assert.match(src, /STAND_VALUES\.indexOf\(a\.value\) - STAND_VALUES\.indexOf\(b\.value\)/);
  });
});

describe('Filterstreifen ueber den Daten', () => {
  test('jede Ansicht haengt ihn oben in den Hauptbereich', () => {
    const mounts = {
      'views/bestand.js': 'main.insertBefore(sidebar.strip, main.firstChild);',
      'views/chronik.js': 'main.insertBefore(sidebar.strip, main.firstChild);',
      'views/netzwerk.js': 'main.insertBefore(_sidebar.strip, main.firstChild);',
      'views/statistik.js': 'main.insertBefore(sidebar.strip, main.firstChild);',
      'views/indizes.js': 'wrapper.insertBefore(sidebar.strip, wrapper.firstChild);',
      'views/karte.js': "sidebar.strip, el('div', { className: 'view-main__stage' }, mapCell)",
    };
    for (const [file, line] of Object.entries(mounts)) {
      assert.ok(read(file).includes(line), `${file} montiert den Streifen`);
    }
  });

  test('leer nimmt er keinen Platz, und er traegt weder Grund noch Rahmen', () => {
    const css = readFileSync(new URL('../../docs/css/sidebar.css', import.meta.url), 'utf-8');
    const block = css.slice(css.indexOf('.filter-strip {'), css.indexOf('.filter-strip:empty'));
    assert.doesNotMatch(block, /background|border/);
    assert.match(css, /\.filter-strip:empty \{ display: none; \}/);
  });

  test('der Streifen gruppiert je Facette und schliesst mit dem Link', () => {
    const src = read('ui/sidebar.js');
    const strip = src.slice(src.indexOf('function filterStrip'),
      src.indexOf('/** Count of the cut in the root row'));
    assert.match(strip, /if \(!isFilterActive\(\)\) \{\s*element\.appendChild\(emptyHint\(\)\);/,
      'neutral traegt er den Platzhalter statt einer leeren Zeile');
    assert.match(strip, /Object\.entries\(FACET_META\)/, 'Facettenreihenfolge');
    assert.match(strip, /stripGroup\(meta\.title, chips\)/,
      'Der Facettenname steht einmal vor seinen Werten.');
    assert.match(strip, /stripGroup\('Zeitraum',/);
    assert.match(strip, /stripGroup\('Suche',/);
    assert.ok(strip.indexOf("'alle zurücksetzen'") > strip.lastIndexOf('removeChip('),
      'Der Link steht hinter den Chips.');
  });

  test('der Platzhalter ist eine ruhige Zeile, kein Chip und kein Knopf', () => {
    // Designregel 8 ist hier bewusst ausgesetzt (Projektleitung, 2026-09-04):
    // ein leerer Streifen liest sich als kaputtes Bedienelement.
    const src = read('ui/sidebar.js');
    const hint = src.slice(src.indexOf('function emptyHint'), src.indexOf('const FILTER_GLYPH'));
    assert.match(hint, /className: 'filter-strip__empty'/);
    assert.match(hint, /'kein Filter aktiv'/);
    assert.match(hint, /tip: 'Die Filter stehen in der linken Spalte\.'/,
      'Der Hinweis auf die Spalte steht im Tooltip, nicht in der Zeile.');
    assert.ok(hint.includes("el('span'"), 'ein span, kein button');
    assert.ok(!hint.includes("el('button'"), 'der Platzhalter ist kein Bedienelement');

    const css = readFileSync(new URL('../../docs/css/sidebar.css', import.meta.url), 'utf-8');
    const block = css.slice(css.indexOf('.filter-strip__empty {'),
      css.indexOf('.filter-strip__empty-icon'));
    assert.match(block, /color: var\(--color-text-tertiary\)/);
    assert.match(block, /font-size: var\(--text-xs\)/);
    assert.doesNotMatch(block, /background|border/, 'kein Chip-Aussehen');
  });

  test('der Zuruecksetzen-Link traegt ein Zeichen und bleibt ein Textlink', () => {
    const src = read('ui/sidebar.js');
    assert.match(src, /const RESET_GLYPH = '<svg class="vs-status__reset-icon" width="14"/);
    assert.match(src, /className: 'vs-status__reset'[\s\S]{0,120}html: RESET_GLYPH,/);
    const css = readFileSync(new URL('../../docs/css/sidebar.css', import.meta.url), 'utf-8');
    const block = css.slice(css.indexOf('.vs-status__reset {'), css.indexOf('.vs-status__reset:hover'));
    assert.doesNotMatch(block, /background: var|border: 1px/, 'kein Knopf-Aussehen');
    assert.match(css, /\.vs-status__reset > span \{ text-decoration: underline; \}/);
  });

  test('der Chip traegt nur den Wert, die Semantik haengt am Gruppentitel', () => {
    const src = read('ui/sidebar.js');
    assert.match(src, /removeChip\(labelIn\(inventory, value\),/,
      'Kein "Facette: Wert" mehr im Chip selbst.');
    const group = src.slice(src.indexOf('const STRIP_TIP'),
      src.indexOf('/** Count of the cut in the root row'));
    assert.match(group, /einer genügt \(oder\)/);
    assert.match(group, /alle müssen zutreffen \(und\)/);
    assert.match(group, /'data-tip': STRIP_TIP/, 'Tooltip statt stehendem Erklaertext.');

    const css = readFileSync(new URL('../../docs/css/sidebar.css', import.meta.url), 'utf-8');
    assert.match(css, /\.filter-strip__group \{/);
    assert.match(css, /\.filter-strip__key \{/);
  });
});

describe('Platzhalter', () => {
  test('das Facettenfeld traegt eine ruhige Aufforderung mit dem Facettennamen', () => {
    const src = read('ui/sidebar.js');
    assert.match(src, /placeholder: `\$\{meta\.title\} filtern…`,/,
      'Projektleitung 2026-09-03: "Person filtern…" statt des groessten Werts mit Zahl.');
    assert.doesNotMatch(src, /placeholderFor/);
  });

  test('die Ansichten nennen ihre durchsuchten Felder im Freitextfeld', () => {
    const expected = {
      'views/bestand.js': "search: { placeholder: 'Signatur, Titel, Typ oder Datum' },",
      'views/chronik.js': "search: { placeholder: 'Signatur oder Titel' },",
      'views/netzwerk.js': "search: { placeholder: 'Name' },",
    };
    for (const [file, line] of Object.entries(expected)) {
      assert.ok(read(file).includes(line), `${file} setzt seinen Platzhalter`);
    }
  });

  test('eine Ansicht ohne Textschnitt fuehrt kein Freitextfeld', () => {
    // recordsFor wertet den Freitext nicht aus; Karte und Statistik haetten ein
    // Feld ohne Wirkung.
    for (const file of ['views/karte.js', 'views/statistik.js']) {
      assert.ok(read(file).includes('search: false,'), `${file} laesst die Suche weg`);
      assert.doesNotMatch(read(file), /getFilter\(\)\.search/);
    }
  });
});

describe('Offene Facette als eine Zeile', () => {
  test('jede Sektion mit Facettenfeld wird zur zweispaltigen Zeile', () => {
    assert.match(read('ui/sidebar.js'),
      /\(spec\.controls \|\| \[\]\)\.some\(c => c && c\.kind === 'facet'\)/,
      'Auch die view-eigenen Facetten von Karte und Netzwerk nutzen dieselbe Zeile.');
  });

  test('die Facette zeigt gewaehlte Werte nicht nochmals unter dem Feld', () => {
    const src = read('ui/sidebar.js');
    assert.match(src, /'fs-facet__field' \}, input, list\)/);
    assert.match(src, /'fs-facet' \}, field\)/);
    assert.doesNotMatch(src, /chosenWrap|chosenRow|fs-selected|fs-chosen/,
      'Gewaehlte Werte bleiben allein in der Chip-Zeile ueber den Daten.');
    const css = readFileSync(new URL('../../docs/css/sidebar.css', import.meta.url), 'utf-8');
    assert.match(css, /\.fs-facet__field \{\n  position: relative;/);
    assert.match(css, /grid-template-columns: 96px minmax\(0, 1fr\);/);
  });

  test('Titel bleibt ohne Zahl, die Vorschlagsliste zeigt die Wahl mit Haken', () => {
    const src = read('ui/sidebar.js');
    const section = src.slice(src.indexOf('function sharedFacetSection'),
      src.indexOf('/** Every selectable value'));
    assert.match(section, /title: meta\.title,/);
    assert.doesNotMatch(section, /meta\.title.*selected|selected.*meta\.title/,
      'Die Zahl der Wahl darf nicht im Facettentitel wiederholt werden.');

    const control = src.slice(src.indexOf('function facetControl'),
      src.indexOf('/** One suggestion row'));
    assert.doesNotMatch(control, /if \(chosen\.includes\(entry\.value\)\) continue/,
      'Gewaehlte Werte bleiben in der Vorschlagsliste erreichbar.');
    assert.match(control, /const on = chosen\.includes\(entry\.value\);/);
    assert.match(src, /className: 'fs-option__check'.*on \? '✓' : ''/s,
      'Die Optionszeile traegt einen eigenen Hakenplatz.');
  });
});

describe('Dokumenttyp-Baum', () => {
  test('der Baum fuehrt kein Eingabefeld mehr', () => {
    const src = read('ui/sidebar.js');
    const tree = src.slice(src.indexOf('function facetTreeControl'), src.indexOf('function groupRow'));
    assert.doesNotMatch(tree, /el\('input'|fs-search|matchesQuery/,
      'Chevrons und "mehr …" erreichen jeden Wert der geschlossenen Menge.');
    assert.match(tree, /fs-more--button/);
  });

  test('gewaehlt zeigt der Haken, die Flaeche gehoert dem Zeiger', () => {
    const css = readFileSync(new URL('../../docs/css/sidebar.css', import.meta.url), 'utf-8');
    const on = css.slice(css.indexOf('.fs-option--on {'), css.indexOf('.fs-option__check {'));
    assert.doesNotMatch(on, /background/,
      'Die gewaehlte Zeile traegt keine Fuellung, sonst ist sie von Hover nicht zu trennen.');
    assert.match(css, /\.fs-option:focus-visible \{\s+background: var\(--accent-soft\);/);
    assert.match(css, /\.fs-option--active \{\s+background: var\(--surface-3\);/,
      'Der Tastaturcursor bleibt von Hover unterscheidbar.');
    assert.match(css, /\.fs-option__check--implied \{\s+color: var\(--color-text-tertiary\);/);

    const src = read('ui/sidebar.js');
    const group = src.slice(src.indexOf('function groupRow'), src.indexOf('export function impliedByGroup'));
    assert.match(group, /className: 'fs-option__check'/, 'Auch die Gruppenzeile traegt den Haken.');
  });

  test('der Chevron ist ein eigenes Ziel und schaltet keine Auswahl', () => {
    const src = read('ui/sidebar.js');
    const group = src.slice(src.indexOf('function groupRow'), src.indexOf('export function impliedByGroup'));
    assert.match(group, /'aria-expanded': String\(isOpen\)/);
    assert.match(group, /'Untertypen ausblenden' : 'Untertypen einblenden'/);
    assert.match(group, /e\.stopPropagation\(\); onOpen\(\);/,
      'Ein Klick auf den Chevron darf die Zeile nicht mitwaehlen.');

    const css = readFileSync(new URL('../../docs/css/sidebar.css', import.meta.url), 'utf-8');
    const chevron = css.slice(css.indexOf('.fs-tree__chevron {'), css.indexOf('.fs-tree__chevron--open'));
    assert.match(chevron, /align-self: stretch;/);
    assert.match(css, /\.fs-tree__chevron:focus-visible \{\s+background: var\(--surface-3\);/);
  });
});

describe('Farbpunkt der Inhaltsfamilie am Facettentitel', () => {
  test('jede Entitaetsfacette traegt den Punkt ihrer eigenen Familie', () => {
    const withFamily = Object.entries(FACET_META)
      .filter(([, meta]) => meta.family).map(([key]) => key);
    assert.deepEqual(withFamily.sort(), ['institution', 'ort', 'person', 'werk']);
    for (const key of ['institution', 'ort', 'person', 'werk']) {
      assert.equal(FACET_META[key].family, key);
    }
  });

  test('das Symbol ist dasselbe wie am Blocktitel des Detail und in den Indizes', () => {
    const src = read('ui/sidebar.js');
    assert.match(src, /familyIcon\(spec\.family, \{ size: 14, className: `fam-mark fam-mark--\$\{spec\.family\}` \}\)/,
      'Geteiltes Symbolmodul (E-212), keine eigene Farbe.');
    assert.ok(!src.includes('ersch-dot'), 'Das Farbquadrat ist abgelöst.');
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,6}/, 'Keine Farbliterale in der Spalte.');
  });
});
