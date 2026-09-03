/**
 * Die Tab-Leiste als Kopf der Ansicht (E-160).
 *
 * Zwei Dinge stehen hier: die Tastaturbewegung des WAI-ARIA-Tabs-Musters als
 * reine Funktion, und der Auszeichnungskontrakt der ausgelieferten
 * `docs/index.html`. Die stillen Defekte, gegen die die zweite Haelfte steht:
 * ein Tab ohne `aria-controls`-Gegenstueck zeigt auf kein Panel, ein zweiter
 * `tabindex="0"` bricht das Roving, und eine Gruppe ohne `role="none"` schiebt
 * eine Ebene zwischen Tablist und Tab.
 *
 * Lauf: node --test tests/frontend/tabs.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { nextTabIndex, setRovingTabindex } from '../../docs/js/ui/tabs.js';

const html = readFileSync(new URL('../../docs/index.html', import.meta.url), 'utf-8');
const barStart = html.indexOf('<nav class="tab-bar"');
const bar = html.slice(barStart, html.indexOf('</nav>', barStart));
const tabButtons = bar.match(/<button[^>]*role="tab"[\s\S]*?<\/button>/g) ?? [];
const attr = (fragment, name) => (fragment.match(new RegExp(`${name}="([^"]*)"`)) ?? [])[1];

describe('Tastaturbewegung', () => {
  test('Pfeiltasten laufen ueber alle Tabs, auch ueber Gruppengrenzen', () => {
    assert.equal(nextTabIndex('ArrowRight', 1, 7), 2);
    assert.equal(nextTabIndex('ArrowLeft', 3, 7), 2);
  });

  test('die Bewegung laeuft um', () => {
    assert.equal(nextTabIndex('ArrowRight', 6, 7), 0);
    assert.equal(nextTabIndex('ArrowLeft', 0, 7), 6);
  });

  test('Home und End springen an die Enden', () => {
    assert.equal(nextTabIndex('Home', 5, 7), 0);
    assert.equal(nextTabIndex('End', 2, 7), 6);
  });

  test('andere Tasten bleiben unbeantwortet', () => {
    for (const key of ['ArrowUp', 'Tab', 'a', 'Enter']) {
      assert.equal(nextTabIndex(key, 2, 7), null, key);
    }
  });

  test('eine leere Leiste faellt nicht um', () => {
    assert.equal(nextTabIndex('ArrowRight', 0, 0), null);
  });

  test('genau ein Tab bleibt mit Tab erreichbar', () => {
    const tabs = [{}, {}, {}].map(() => ({ tabIndex: 0 }));
    setRovingTabindex(tabs, 2);
    assert.deepEqual(tabs.map(t => t.tabIndex), [-1, -1, 0]);
  });
});

describe('Auszeichnung der ausgelieferten Leiste', () => {
  test('die Leiste ist eine Tablist', () => {
    assert.match(bar, /role="tablist"/);
  });

  test('die Gruppen stehen in der Reihenfolge Material, Perspektiven, Werkzeug', () => {
    const groups = [...bar.matchAll(/data-group="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(groups, ['material', 'perspektiven', 'werkzeug']);
  });

  test('die Tabs stehen in Gruppenreihenfolge', () => {
    assert.deepEqual(tabButtons.map(b => attr(b, 'data-tab')), [
      'bestand', 'indizes',
      'chronik', 'karte', 'netzwerk', 'statistik',
      'korb',
    ]);
  });

  test('die Gruppen sind fuer den Screenreader durchsichtig', () => {
    const groups = bar.match(/<div class="tab-bar__group"[^>]*>/g) ?? [];
    assert.equal(groups.length, 3);
    for (const g of groups) assert.match(g, /role="none"/, g);
  });

  test('jeder Tab traegt ein Symbol, das der Screenreader ueberspringt', () => {
    for (const b of tabButtons) {
      assert.match(b, /<svg[^>]*aria-hidden="true"/, attr(b, 'data-tab'));
      assert.match(b, /stroke="currentColor"/, attr(b, 'data-tab'));
    }
  });

  test('jeder Tab zeigt auf ein vorhandenes Panel', () => {
    for (const b of tabButtons) {
      const panel = attr(b, 'aria-controls');
      assert.ok(panel, `${attr(b, 'data-tab')} ohne aria-controls`);
      assert.ok(html.includes(`id="${panel}"`), `Panel ${panel} fehlt`);
    }
  });

  test('genau ein Tab ist ausgewaehlt und genau einer im Roving erreichbar', () => {
    const selected = tabButtons.filter(b => attr(b, 'aria-selected') === 'true');
    assert.equal(selected.length, 1);
    const reachable = tabButtons.filter(b => attr(b, 'tabindex') === '0');
    assert.equal(reachable.length, 1);
    assert.equal(attr(reachable[0], 'data-tab'), attr(selected[0], 'data-tab'));
  });

  test('der Werkzeug-Tab heisst Korb, nicht Wissenskorb', () => {
    const korb = tabButtons.find(b => attr(b, 'data-tab') === 'korb');
    assert.doesNotMatch(korb, /Wissenskorb/);
    assert.match(korb, />\s*Korb\s*</);
  });
});
