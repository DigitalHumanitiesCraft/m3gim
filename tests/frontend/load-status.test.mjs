/**
 * Lade- und Fehlerzustand des Datenabrufs.
 *
 * Der Zustand haengt an drei Stellen zusammen: `loadArchive` formuliert die
 * Meldung, `docs/index.html` haelt die Live-Region bereit, und `main.js` baut
 * die Fehlerbox aus den Klassen von `components.css`. Geprueft werden die
 * Meldung samt genannter Datei, die Barrierefreiheit der beiden Regionen und
 * die Tokenbindung, also dass kein Inline-Style und kein roher Farbwert
 * zurueckkommt.
 *
 * Lauf: node --test tests/frontend/load-status.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { loadArchive } from '../../docs/js/data/loader.js';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8');
const INDEX_HTML = read('../../docs/index.html');
const MAIN_JS = read('../../docs/js/main.js');
const COMPONENTS_CSS = read('../../docs/css/components.css');

/** Laeuft loadArchive gegen eine gestellte fetch-Antwort und liefert die Meldung. */
async function messageFor(fetchStub) {
  const prev = globalThis.fetch;
  globalThis.fetch = fetchStub;
  try {
    await loadArchive('./data/m3gim.jsonld');
    return null;
  } catch (err) {
    return err.message;
  } finally {
    globalThis.fetch = prev;
  }
}

describe('Fehlermeldung des Ladens', () => {
  const URL_IN_MESSAGE = './data/m3gim.jsonld';

  test('Netzwerkfehler nennt die Datei', async () => {
    const msg = await messageFor(async () => { throw new TypeError('failed to fetch'); });
    assert.ok(msg && msg.includes(URL_IN_MESSAGE), msg);
  });

  test('404 nennt die Datei', async () => {
    const msg = await messageFor(async () => ({ status: 404, ok: false }));
    assert.ok(msg && msg.includes(URL_IN_MESSAGE), msg);
  });

  test('HTTP-Fehler nennt Status und Datei', async () => {
    const msg = await messageFor(async () => ({ status: 500, ok: false }));
    assert.ok(msg && msg.includes('500') && msg.includes(URL_IN_MESSAGE), msg);
  });

  test('kaputtes JSON nennt die Datei', async () => {
    const msg = await messageFor(async () => ({
      status: 200, ok: true, json: async () => { throw new SyntaxError('bad json'); },
    }));
    assert.ok(msg && msg.includes(URL_IN_MESSAGE), msg);
  });
});

describe('Zustandsregionen', () => {
  test('index.html haelt eine hoefliche Live-Region ohne Inline-Style', () => {
    const region = INDEX_HTML.match(/<div class="load-status" id="load-status"[^>]*>/);
    assert.ok(region, 'Region #load-status fehlt');
    assert.match(region[0], /aria-live="polite"/);
    assert.doesNotMatch(region[0], /style=/);
    assert.match(INDEX_HTML, /<div class="load-status__ring"><\/div>/);
    // Der Ring ist die ganze sichtbare Meldung; das Wort steht nur fuer den
    // Screenreader (Designregel 8, kein stehender Erklaertext).
    assert.doesNotMatch(INDEX_HTML, /spinner__text|Lade Archivdaten/);
  });

  test('main.js baut die Fehlerbox als role="alert" mit Neu-laden-Knopf', () => {
    assert.match(MAIN_JS, /className: 'load-error', role: 'alert'/);
    assert.match(MAIN_JS, /'Neu laden'/);
    assert.match(MAIN_JS, /window\.location\.reload\(\)/);
    assert.match(MAIN_JS, /setAttribute\('aria-busy'/);
  });

  test('main.js setzt keinen Inline-Style und keine rohe Farbe mehr', () => {
    assert.doesNotMatch(MAIN_JS, /\bstyle:/);
    assert.doesNotMatch(MAIN_JS, /#[0-9A-Fa-f]{3,8}\b/);
  });

  test('die Zustandsklassen stehen auf Tokens', () => {
    const block = COMPONENTS_CSS.slice(
      COMPONENTS_CSS.indexOf('/* Load status and load error'),
      COMPONENTS_CSS.indexOf('/* Tooltip'),
    );
    assert.ok(block.length > 0, 'Block der Zustandsklassen nicht gefunden');
    for (const cls of ['.load-status', '.load-status__ring', '.load-error',
      '.load-error__title', '.load-error__detail', '.load-error__retry']) {
      assert.ok(block.includes(`${cls} {`) || block.includes(`${cls}:hover {`), cls);
    }
    // Keine Farbe, kein Abstand und keine Textgroesse ausserhalb der Tokens.
    assert.doesNotMatch(block, /#[0-9A-Fa-f]{3,8}\b/);
    assert.match(block, /prefers-reduced-motion/);
  });
});
