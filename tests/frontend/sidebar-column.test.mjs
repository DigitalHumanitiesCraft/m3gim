/**
 * Unit-Tests der Sidebar-Spalte aus docs/js/ui/sidebar.js und ihren Bauteilen.
 *
 * Lauf:
 *   node --test tests/frontend/sidebar-column.test.mjs
 *
 * Die Spalte selbst rendert DOM, den es im Node-Lauf nicht gibt; geprueft sind
 * deshalb die reinen Beschriftungsfunktionen und die Konfiguration, die die
 * Ansichten an createSidebar uebergeben. Das gerenderte Bild deckt der
 * Playwright-Smoke ab.
 *
 * Seit dem Schnitt in Bauteile (E-250) liest eine Quelltextpruefung das Modul,
 * in dem die gepruefte Stelle steht; `sidebar.js` bleibt der Komponist und die
 * eine Importadresse der Ansichten.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as sidebar from '../../docs/js/ui/sidebar.js';
import {
  countLabel, coveredBand, FACET_META, SHARED_FACETS,
} from '../../docs/js/ui/sidebar.js';

const read = (rel) => readFileSync(new URL(`../../docs/js/${rel}`, import.meta.url), 'utf-8');

/** Die Module, die zusammen die Spalte bilden. */
const COLUMN_MODULES = [
  'ui/sidebar.js', 'ui/sidebar-status.js', 'ui/sidebar-facets.js', 'ui/sidebar-options.js',
  'ui/sidebar-range.js', 'ui/sidebar-strip.js', 'ui/sidebar-controls.js',
];

describe('Das Gerüst bleibt die eine Importadresse (E-250)', () => {
  test('jeder öffentliche Name der Spalte ist über sidebar.js erreichbar', () => {
    for (const name of ['createSidebar', 'viewShell', 'FACET_META', 'SHARED_FACETS',
      'countLabel', 'coveredBand', 'impliedByGroup', 'groupTip']) {
      assert.ok(name in sidebar, `${name} fehlt in der Re-Export-Flaeche von sidebar.js`);
    }
    // Die Ansichten hängen an genau zwei davon; ein Bauteil importieren sie nicht.
    for (const view of ['bestand', 'chronik', 'indizes', 'karte', 'netzwerk', 'statistik']) {
      assert.match(read(`views/${view}.js`), /from '\.\.\/ui\/sidebar\.js'/);
    }
  });
});

describe('Ergebniszeile als Wurzel des Dokumenttyp-Baums', () => {
  test('ohne Filter steht die Grundmenge allein, mit Filter der Anteil', () => {
    assert.equal(countLabel(187, 187), '187');
    assert.equal(countLabel(161, 187), '161 von 187');
    assert.equal(countLabel(0, 187), '0 von 187');
  });

  test('die Zeile traegt das Wort Dokumente und die Zahl in einer Zeile', () => {
    const src = read('ui/sidebar-status.js');
    assert.match(src, /'fs-option__label', id: labelId \}, 'Dokumente'\)/,
      'Die Wurzelzeile heisst Dokumente und liegt in der Zeilenform der Typzeilen.');
    assert.doesNotMatch(src, /Dokumente`/,
      'Der alte Statusblock mit "187 Dokumente" ist abgeloest.');
  });

  test('Chips und Zuruecksetzen haengen nicht mehr an der Wurzelzeile', () => {
    const src = read('ui/sidebar-status.js');
    const root = src.slice(src.indexOf('function paintRoot'));
    assert.doesNotMatch(root, /removeChip|resetFilter/,
      'Die Spalte darf ihre Hoehe nicht aendern, wenn ein Filter dazukommt.');
  });
});

describe('Land und Verknuepfung als geschlossene Facetten', () => {
  test('das Land steht neben dem Ort, die Verknuepfung am Ende', () => {
    const keys = Object.keys(FACET_META);
    assert.equal(keys.indexOf('land'), keys.indexOf('ort') + 1,
      'Das Land liest sich nur neben dem Ort.');
    assert.equal(keys[keys.length - 1], 'verknuepfung');
    assert.equal(FACET_META.land.title, 'Land');
    assert.equal(FACET_META.verknuepfung.title, 'Verknüpfung');
    // Beide sind geschlossene Mengen, laufen aber wie jede andere Facette ueber
    // SHARED_FACETS: das Geruest waehlt die Zeilenform am Schluessel.
    assert.ok(SHARED_FACETS.includes('land') && SHARED_FACETS.includes('verknuepfung'));
  });

  test('das Geruest waehlt die Zeilenform am Schluessel, ohne Sonderfall im Aufbau', () => {
    const sidebar = read('ui/sidebar.js');
    assert.match(sidebar, /for \(const key of facets\) inventories\.set\(key, inventoryFor\(store, key\)\);/);
    assert.match(sidebar, /if \(key === 'verknuepfung'\) return linkGroups\(store\);/);
    const src = read('ui/sidebar-facets.js');
    const dispatch = src.slice(src.indexOf('export function sharedFacetSection'));
    assert.match(dispatch.slice(0, 260), /if \(key === 'land'\) return landSection/);
    assert.match(dispatch.slice(0, 260), /if \(key === 'verknuepfung'\) return linkSection/);
  });

  test('das Land ist eine Zeilenliste, die Verknuepfung der Baum', () => {
    const src = read('ui/sidebar-facets.js');
    const land = src.slice(src.indexOf('export function landSection'),
      src.indexOf('export function linkSection'));
    assert.match(land, /kind: 'optionList', key: 'land'/);
    assert.match(land, /facetCounts\(store, getFilter\(\), 'land'/,
      'Die Zahlen sind relativ zum Schnitt, wie im Baum.');
    assert.match(land, /Jede Ortsrolle zählt/,
      'Der Kopf nennt die Zaehlregel, statt eine Rolle still auszuschliessen.');
    const link = src.slice(src.indexOf('export function linkSection'),
      src.indexOf('export function flatValues'));
    assert.match(link, /kind: 'facetTree', key: 'verknuepfung'/,
      'Die Rollen haengen im Baumcontrol des Dokumenttyps.');
    assert.match(link, /buildFacetSelectionPatch\(getFilter\(\), 'verknuepfung', values\)/);
  });

  test('kein Bauteil der Spalte kennt den Erschliessungsstand noch (E-262)', () => {
    const all = COLUMN_MODULES.map(read).join('\n');
    assert.doesNotMatch(all, /standSection|standInventory|STAND_VALUES|Erschließungsstand/,
      'Facette, Inventar und Anzeigeform des Bearbeitungsstands sind fort.');
  });
});

describe('Filterstreifen ueber den Daten', () => {

  test('leer nimmt er keinen Platz, und er traegt weder Grund noch Rahmen', () => {
    const css = readFileSync(new URL('../../docs/css/sidebar.css', import.meta.url), 'utf-8');
    const block = css.slice(css.indexOf('\n.filter-strip {'), css.indexOf('.filter-strip:empty'));
    assert.doesNotMatch(block, /background|border/);
    assert.match(css, /\.filter-strip:empty \{ display: none; \}/);
  });

  test('der Streifen gruppiert je Facette und schliesst mit dem Link', () => {
    const src = read('ui/sidebar-strip.js');
    const strip = src.slice(src.indexOf('function filterStrip'),
      src.indexOf('/** Circular arrow before the reset link'));
    assert.match(strip, /if \(!isFilterActive\(\) && local\.length === 0\) \{\s*element\.appendChild\(emptyHint\(\)\);/,
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
    const src = read('ui/sidebar-strip.js');
    const hint = src.slice(src.indexOf('function emptyHint'), src.indexOf('const FILTER_GLYPH'));
    assert.match(hint, /className: 'filter-strip__empty'/);
    assert.match(hint, /'kein Filter aktiv'/);
    assert.match(hint, /tip: 'Die gemeinsame Suche und die linke Filterspalte wählen Dokumente aus\.'/,
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
    const src = read('ui/sidebar-strip.js');
    assert.match(src, /const RESET_GLYPH = '<svg class="vs-status__reset-icon" width="14"/);
    assert.match(src, /className: 'vs-status__reset'[\s\S]{0,220}html: RESET_GLYPH,/);
    const css = readFileSync(new URL('../../docs/css/sidebar.css', import.meta.url), 'utf-8');
    const block = css.slice(css.indexOf('.vs-status__reset {'), css.indexOf('.vs-status__reset:hover'));
    assert.doesNotMatch(block, /background: var|border: 1px/, 'kein Knopf-Aussehen');
    assert.match(css, /\.vs-status__reset > span \{ text-decoration: underline; \}/);
  });

  test('die Gruppentitel erklären weiterhin die Oder-/Und-Semantik', () => {
    const src = read('ui/sidebar-strip.js');
    const group = src.slice(src.indexOf('const STRIP_TIP'),
      src.indexOf('function removeChip'));
    assert.match(group, /einer genügt \(oder\)/);
    assert.match(group, /alle müssen zutreffen \(und\)/);
    assert.match(group, /'data-tip': STRIP_TIP/, 'Tooltip statt stehendem Erklaertext.');

    const css = readFileSync(new URL('../../docs/css/sidebar.css', import.meta.url), 'utf-8');
    assert.match(css, /\.filter-strip__group \{/);
    assert.match(css, /\.filter-strip__key \{/);
  });
});


describe('Facetten als geschlossene Wertelisten', () => {
  test('Titel bleibt ohne Zahl, die Werteliste zeigt die Wahl mit Haken', () => {
    const src = read('ui/sidebar-facets.js');
    const section = src.slice(src.indexOf('function sharedFacetSection'),
      src.indexOf('/** Every selectable value'));
    assert.match(section, /title: meta\.title,/);
    assert.doesNotMatch(section, /meta\.title.*selected|selected.*meta\.title/,
      'Die Zahl der Wahl darf nicht im Facettentitel wiederholt werden.');

    const control = src.slice(src.indexOf('function optionListControl'));
    assert.match(control, /chosen\.includes\(entry\.value\)/,
      'Gewaehlte Werte bleiben in der Liste erreichbar.');
    assert.match(read('ui/sidebar-options.js'), /className: 'fs-option__check'.*on \? '✓' : ''/s,
      'Die Optionszeile traegt einen eigenen Hakenplatz.');
  });
});

describe('Dokumenttyp-Baum', () => {
  test('der Baum fuehrt kein Eingabefeld mehr', () => {
    const src = read('ui/sidebar-facets.js');
    const tree = src.slice(src.indexOf('function facetTreeControl'),
      src.indexOf('function optionListControl'));
    assert.doesNotMatch(tree, /el\('input'|fs-search|matchesQuery/,
      'Chevrons und "mehr …" erreichen jeden Wert der geschlossenen Menge.');
    assert.match(tree, /fs-more--button/);
  });

  test('auch die Blaetter einer offenen Gruppe sind gedeckelt', () => {
    // Der Verknuepfungstyp Person traegt 36 Rollen. Ohne Deckel auf der zweiten
    // Ebene laesst ein einziger geoeffneter Typ die Spalte scrollen, was
    // Designregel 2 verbietet; gemessen wurden 511px Ueberhang bei 1080px.
    const src = read('ui/sidebar-facets.js');
    const tree = src.slice(src.indexOf('function facetTreeControl'),
      src.indexOf('function optionListControl'));
    assert.match(tree, /leaves\.slice\(0, OPTION_LIMIT\)/,
      'Die Blaetter einer Gruppe stehen ungedeckelt in der Spalte.');
    assert.match(tree, /fs-more--button fs-more--child/,
      'Der Rest der Blaetter braucht sein eigenes "mehr …".');
    assert.match(tree, /full \? 'weniger' : `mehr … \(\$\{restLeaves\}\)`/,
      'Der Deckel muss sich auch wieder oeffnen lassen.');
    const css = readFileSync(new URL('../../docs/css/sidebar.css', import.meta.url), 'utf-8');
    assert.match(css, /\.fs-more--child \{ margin-inline-start: 22px; \}/,
      'Das "mehr …" der Blaetter steht auf ihrer Einrueckung.');
  });

  test('gewaehlt zeigt der Haken, die Flaeche gehoert dem Zeiger', () => {
    const css = readFileSync(new URL('../../docs/css/sidebar.css', import.meta.url), 'utf-8');
    const on = css.slice(css.indexOf('.fs-option--on {'), css.indexOf('.fs-option__check {'));
    assert.doesNotMatch(on, /background/,
      'Die gewaehlte Zeile traegt keine Fuellung, sonst ist sie von Hover nicht zu trennen.');
    assert.match(css, /\.fs-option:focus-visible \{\s+background: var\(--accent-soft\);/);
    assert.match(css, /\.fs-option__check--implied \{\s+color: var\(--color-text-tertiary\);/);

    const src = read('ui/sidebar-options.js');
    const group = src.slice(src.indexOf('function groupRow'));
    assert.match(group, /className: 'fs-option__check'/, 'Auch die Gruppenzeile traegt den Haken.');
  });

  test('der Chevron ist ein eigenes Ziel und schaltet keine Auswahl', () => {
    const src = read('ui/sidebar-options.js');
    const group = src.slice(src.indexOf('function groupRow'));
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
    const all = COLUMN_MODULES.map(read).join('\n');
    assert.ok(!all.includes('ersch-dot'), 'Das Farbquadrat ist abgelöst.');
    assert.doesNotMatch(all, /#[0-9a-fA-F]{3,6}/, 'Keine Farbliterale in der Spalte.');
  });
});

describe('Ansichtslokale Chips im Streifen (E-223)', () => {
  test('createSidebar nimmt sie entgegen und der Streifen zeichnet sie hinter den geteilten Gruppen', () => {
    const src = read('ui/sidebar.js');
    assert.match(src, /localChips = \(\) => \[\],/, 'Option mit leerem Default');
    assert.match(src, /filterStrip\(inventories, localChips\)/);
    const stripSrc = read('ui/sidebar-strip.js');
    const strip = stripSrc.slice(stripSrc.indexOf('function filterStrip'),
      stripSrc.indexOf('/** Circular arrow before the reset link'));
    assert.ok(strip.indexOf('stripGroup(group.title') > strip.indexOf("stripGroup('Suche'"),
      'Die lokalen Gruppen stehen hinter Facetten, Zeitraum und Suche.');
    assert.ok(strip.indexOf("'alle zurücksetzen'") > strip.indexOf('stripGroup(group.title'),
      'Der Link bleibt am Ende.');
    assert.match(strip, /for \(const g of local\) for \(const c of g\.chips\) c\.onRemove\(\)/,
      'Zuruecksetzen loest auch die ansichtslokale Verengung.');
  });

});

describe('Einheitliche Spalte über alle Ansichten (E-237 bis E-240)', () => {
  // Die Wurzelzeile nennt den Schnitt der Ansicht, nicht die Grundmenge; ohne
  // getCount rechnet das Gerüst zwar dasselbe, aber ein zweites Mal, und eine
  // Ansicht mit eigener Schnittzahl könnte auseinanderlaufen.
  test('jede Ansicht mit Gerüst übergibt getCount und eine Jahresspanne', () => {
    for (const view of ['bestand', 'indizes', 'statistik', 'karte', 'netzwerk']) {
      const src = read(`views/${view}.js`);
      const call = src.slice(src.indexOf('createSidebar(store, {'));
      const head = call.slice(0, call.indexOf('onChange:'));
      assert.match(head, /getCount:/, `${view} übergibt seine Schnittzahl nicht`);
      assert.match(head, /yearSpan:/, `${view} übergibt keine Jahresspanne`);
    }
  });

  test('die Jahresspanne kommt überall aus yearBounds, nicht aus eigenen Zahlen', () => {
    for (const view of ['bestand', 'indizes', 'statistik', 'karte', 'netzwerk']) {
      const src = read(`views/${view}.js`);
      assert.match(src, /yearBounds/, `${view} leitet seine Jahre nicht aus dem Bestand ab`);
    }
    // Die Karte lief bis E-239 über die Jahre ihrer verorteten Belege.
    const karte = read('views/karte.js');
    assert.match(karte, /yearSpan: yearBounds\(store\)/);
  });

  test('die view-eigenen Sektionen von Karte und Netzwerk starten zugeklappt', () => {
    const netzwerk = read('views/netzwerk.js');
    assert.match(netzwerk, /const startsCollapsed = \{ collapsible: true, collapsed: \(\) => true \};/);
    // Die eine view-eigene Sektion Knoten mit ihren zwei Schaltern (F2).
    assert.equal((netzwerk.match(/\.\.\.startsCollapsed,/g) || []).length, 1);
    const karte = read('views/karte.js');
    assert.ok(!karte.includes('Länder-Reichweite'),
      'Die karteneigene Laenderliste ist in die geteilte Facette Land gewandert.');
  });
});

describe('Das Band der belegten Jahre auf der Zeitraum-Schiene (E-239)', () => {
  const span = { min: 1919, max: 2009 };

  test('es liegt anteilig auf der Schiene', () => {
    const band = coveredBand(span, { min: 1944, max: 1968 });
    assert.equal(band.from, '27.78%');
    assert.equal(band.to, '54.44%');
  });

  test('ohne Aussage entsteht kein Band', () => {
    assert.equal(coveredBand(span, null), null);
    assert.equal(coveredBand(span, { min: 1919, max: 2009 }), null,
      'Deckt es die ganze Schiene, sagt es nichts.');
    assert.equal(coveredBand(span, { min: 1950, max: 1950 }), null,
      'Ein einzelnes Jahr hat keine Breite.');
    assert.equal(coveredBand({ min: 1950, max: 1950 }, { min: 1950, max: 1950 }), null);
  });

  test('es bleibt innerhalb der Schiene, auch wenn es über sie hinausreicht', () => {
    const band = coveredBand(span, { min: 1900, max: 1950 });
    assert.equal(band.from, '0.00%');
    assert.equal(band.to, '34.44%');
  });

  test('die Spalte setzt es über Custom Properties und gibt ihm einen Tooltip', () => {
    const src = read('ui/sidebar-range.js');
    const range = src.slice(src.indexOf('function rangeControl'));
    assert.match(range, /setProperty\('--covered-from', band\.from\)/);
    assert.match(range, /setProperty\('--covered-to', band\.to\)/);
    assert.match(range, /dataset: \{ tip: bandTip/, 'Der Tooltip nennt die belegten Jahre.');
    assert.doesNotMatch(range, /title:/, 'Tooltips laufen über data-tip, nie über title.');
  });
});

describe('Familiensymbol an der Vorschlagszeile (E-241)', () => {
  test('optionRow zeichnet es aus entry.family mit dem geteilten Symbolsatz', () => {
    const src = read('ui/sidebar-options.js');
    const row = src.slice(src.indexOf('function optionRow'), src.indexOf('function groupRow'));
    assert.match(row, /entry\.family/);
    assert.match(row, /familyIcon\(entry\.family,/, 'Geteiltes Symbolmodul, kein eigenes SVG.');
    assert.match(row, /fam-mark fam-mark--\$\{entry\.family\}/);
    assert.match(row, /entry\.familyLabel/,
      'Das Symbol ist aria-hidden, der Name der Zeile trägt die Familie als Wort.');
  });

  test('die Zeile ohne Familie bleibt, wie sie war', () => {
    const src = read('ui/sidebar-options.js');
    const row = src.slice(src.indexOf('function optionRow'), src.indexOf('function groupRow'));
    assert.match(row, /\? familyIcon/, 'Ohne Familie entsteht kein Symbolplatz.');
    assert.match(row, /: null;/);
  });
});
