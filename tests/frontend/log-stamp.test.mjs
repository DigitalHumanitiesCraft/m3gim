/**
 * Der Zustands-Stempel der Ansichten.
 *
 * Jede Ansicht schreibt am Ende ihres Renderns eine Zeile
 * `[view] key:val | key:val | …`. Playwright liest sie im Smoke-Test, und beim
 * Debuggen ist sie der einzige Blick auf den gerenderten Schnitt. Die Reihenfolge
 * ist deshalb die des Aufrufers und nicht die eines Objekts, dessen Schlüssel
 * still umsortieren; leere Werte fallen weg, statt als `key:` zu erscheinen.
 *
 * Der stille Defekt, gegen den diese Datei steht: eine 0 gilt als Wert und darf
 * nicht mit dem leeren String zusammenfallen. "0 Treffer" ist ein Befund,
 * "kein Wert" ist keiner.
 *
 * Lauf: node --test tests/frontend/log-stamp.test.mjs
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// IS_DEV wird beim Modulimport aus location.hostname bestimmt; ohne den Stub
// bliebe logStamp still und der Test ohne Gegenstand.
globalThis.location = { hostname: 'localhost' };
const { logStamp, IS_DEV } = await import('../../docs/js/utils/env.js');

let lines = [];
const realLog = console.log;
beforeEach(() => { lines = []; console.log = (msg) => lines.push(msg); });
afterEach(() => { console.log = realLog; });

describe('logStamp', () => {
  test('lokal ist der Stempel aktiv', () => {
    assert.equal(IS_DEV, true);
  });

  test('Form und Reihenfolge stehen wie uebergeben', () => {
    logStamp('bestand', [
      ['konvolute', 9],
      ['records', 412],
      ['stand', 'alle'],
    ]);
    assert.deepEqual(lines, ['[bestand] konvolute:9 | records:412 | stand:alle']);
  });

  test('die Reihenfolge folgt dem Aufrufer, nicht dem Alphabet', () => {
    logStamp('karte', [['zzz', 1], ['aaa', 2]]);
    assert.equal(lines[0], '[karte] zzz:1 | aaa:2');
  });

  test('leere Werte fallen weg, die Null bleibt', () => {
    logStamp('indizes', [
      ['leer', ''],
      ['fehlt', null],
      ['undef', undefined],
      ['treffer', 0],
    ]);
    assert.equal(lines[0], '[indizes] treffer:0',
      'Eine 0 ist ein Befund und darf nicht mit dem leeren Wert zusammenfallen.');
  });

  test('ohne Teile bleibt der Ansichtsname stehen', () => {
    logStamp('korb', []);
    assert.equal(lines[0], '[korb] ');
  });
});
