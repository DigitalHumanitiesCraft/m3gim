/**
 * Lexikalische Sperre: das Frontend kennt genau ein Tooltip-System.
 *
 * Tooltips laufen ueber das Attribut `data-tip` (docs/css/components.css
 * § Tooltip). Das native `title` traegt daneben ein zweites, anders gestaltetes
 * und anders getimtes Popup, das sich mit dem eigenen ueberlagert (E-90, ein
 * Hover zeigt genau einen Tooltip) und auf Touch gar nicht erscheint. Der Test
 * liest den ausgelieferten Code unter `docs/js` und faellt, sobald `title` dort
 * wieder als DOM-Attribut gesetzt wird.
 *
 * Geprueft werden die drei Wege, auf denen das Attribut in den Baum kommt:
 * das Property-Objekt eines `el(...)`-Aufrufs, die Zuweisung an `.title` und
 * `title="..."` in einem HTML-String. Nicht getroffen sind Section- und
 * Spec-Titel (`title:` in Sidebar-, Legenden- und Block-Objekten), das SVG-
 * Element `<title>` und `document.title`.
 *
 * Lauf:
 *   node --test tests/frontend/tooltip-system.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const JS_ROOT = fileURLToPath(new URL('../../docs/js', import.meta.url));

function jsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsFiles(path));
    else if (entry.name.endsWith('.js')) out.push(path);
  }
  return out.sort();
}

const lineOf = (source, index) => source.slice(0, index).split('\n').length;

/**
 * Das Property-Objekt eines `el(...)`-Aufrufs: ab der ersten `{` nach dem
 * Aufruf bis zur passenden `}`. Der Scanner ueberspringt Strings und Template
 * Literals, damit eine Klammer im Text die Bilanz nicht kippt; verschachtelte
 * Aufrufe im Objekt liegen innerhalb und werden mitgelesen, was die Sperre
 * hoechstens strenger macht.
 */
function elAttributeBlocks(source) {
  const blocks = [];
  const call = /\bel\(\s*(['"`])[^'"`]*\1\s*,\s*\{/g;
  let hit;
  while ((hit = call.exec(source)) !== null) {
    const start = source.indexOf('{', hit.index + hit[0].length - 1);
    let depth = 0;
    let quote = null;
    for (let i = start; i < source.length; i += 1) {
      const c = source[i];
      if (quote) {
        if (c === '\\') { i += 1; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '\'' || c === '"' || c === '`') { quote = c; continue; }
      if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (depth === 0) {
          blocks.push({ start, text: source.slice(start, i + 1) });
          break;
        }
      }
    }
  }
  return blocks;
}

/** Die drei Schreibweisen, mit denen `title` ins DOM gelangt. */
export function nativeTitleUses(source) {
  const found = [];
  for (const block of elAttributeBlocks(source)) {
    const inObject = /(^|[{,\s])(['"]?)title\2\s*:/.exec(block.text);
    if (inObject) {
      found.push({ index: block.start + inObject.index, kind: 'el()-Attribut' });
    }
  }
  for (const m of source.matchAll(/\.title\s*=[^=]/g)) {
    // document.title ist der Dokumenttitel, kein Tooltip.
    if (/document\.title\s*=/.test(source.slice(Math.max(0, m.index - 9), m.index + 8))) continue;
    found.push({ index: m.index, kind: '.title-Zuweisung' });
  }
  for (const m of source.matchAll(/(^|[\s>"'])title=["']/g)) {
    found.push({ index: m.index, kind: 'title= im HTML-String' });
  }
  return found;
}

describe('Ein Tooltip-System: data-tip statt title', () => {
  test('kein natives title-Attribut im ausgelieferten docs/js', () => {
    const hits = [];
    for (const file of jsFiles(JS_ROOT)) {
      const source = readFileSync(file, 'utf-8');
      for (const use of nativeTitleUses(source)) {
        hits.push(`${relative(JS_ROOT, file)}:${lineOf(source, use.index)} — ${use.kind}`);
      }
    }
    assert.deepEqual(hits, [],
      'natives title gefunden; das Frontend kennt nur data-tip (docs/css/components.css § Tooltip):\n'
      + hits.join('\n'));
  });

  test('der Scanner trifft die drei Schreibweisen und nur sie', () => {
    const bad = "el('span', { className: 'x', title: 'Hinweis' }, 'A')";
    assert.equal(nativeTitleUses(bad).length, 1, 'title im el()-Objekt nicht erkannt');
    assert.equal(nativeTitleUses("btn.title = 'Hinweis';").length, 1,
      'Zuweisung an .title nicht erkannt');
    assert.equal(nativeTitleUses('const s = `<span title="Hinweis"></span>`;').length, 1,
      'title im HTML-String nicht erkannt');

    // Falschtreffer, die die Sperre nicht ausloesen duerfen.
    const specTitle = "const section = { title: 'Dokumenttyp', controls: [] };";
    assert.deepEqual(nativeTitleUses(specTitle), [], 'Spec-Titel faelschlich getroffen');
    const svgTitle = "sel.append('title').text(d => d.name);";
    assert.deepEqual(nativeTitleUses(svgTitle), [], 'SVG-<title> faelschlich getroffen');
    const dataTip = "el('span', { dataset: { tip: 'Hinweis' } }, 'A')";
    assert.deepEqual(nativeTitleUses(dataTip), [], 'data-tip faelschlich getroffen');
    assert.deepEqual(nativeTitleUses("document.title = 'M3GIM';"), [],
      'Dokumenttitel faelschlich getroffen');
  });
});
