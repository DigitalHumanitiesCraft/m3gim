/**
 * Der Textabgleich der Facetten-Autovervollstaendigung.
 *
 * Die Namensform des Bestands ist `Nachname, Vorname` mit Umlauten und
 * Akzenten. Wer tippt, tippt weder das Komma noch die Diakritika mit. Die
 * Faltung und die wortweise Suche sind deshalb kein Komfort, sondern die
 * Bedingung dafuer, dass ein Wert ueberhaupt erreichbar ist.
 *
 * Lauf: node --test tests/frontend/text-match.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { foldText, matchesQuery, matchRanges } from '../../docs/js/utils/normalize.js';

describe('foldText', () => {
  test('faltet Umlaute, Akzente und das Eszett', () => {
    assert.equal(foldText('Böhm, Karl'), 'bohm, karl');
    assert.equal(foldText('Ančerl'), 'ancerl');
    assert.equal(foldText('Großmann'), 'grossmann');
    assert.equal(foldText(null), '');
  });
});

describe('matchesQuery', () => {
  test('jedes Wort der Anfrage zaehlt, die Reihenfolge nicht', () => {
    assert.ok(matchesQuery('Karajan, Herbert von', 'herbert karajan'));
    assert.ok(matchesQuery('Karajan, Herbert von', 'karajan herbert'));
    assert.ok(!matchesQuery('Karajan, Herbert von', 'herbert wagner'));
  });

  test('ohne Diakritika getippt trifft trotzdem', () => {
    assert.ok(matchesQuery('Böhm, Karl', 'bohm'));
    assert.ok(matchesQuery('Böhm, Karl', 'böhm'));
  });

  test('ein Teilwort trifft an jeder Stelle des Labels', () => {
    assert.ok(matchesQuery('Bayreuther Festspiele', 'reuth'));
  });

  test('die leere Anfrage trifft alles', () => {
    assert.ok(matchesQuery('Wien', '  '));
  });
});

describe('matchRanges', () => {
  test('nennt die Stellen im Originaltext, nicht in der Faltung', () => {
    assert.deepEqual(matchRanges('Böhm, Karl', 'bohm'), [[0, 4]]);
    assert.deepEqual(matchRanges('Karajan, Herbert von', 'herbert karajan'),
      [[0, 7], [9, 16]]);
  });

  test('eine Faltung, die den Text verlaengert, schneidet kein Zeichen an', () => {
    // "Großmann" faltet zu "grossmann"; der Treffer "gross" endet mitten in der
    // Expansion des Eszetts und muss das Zeichen ganz nehmen.
    assert.deepEqual(matchRanges('Großmann', 'gross'), [[0, 4]]);
  });

  test('ueberlappende Treffer werden zusammengefasst', () => {
    assert.deepEqual(matchRanges('Wiener Staatsoper', 'wien wiener'), [[0, 6]]);
  });

  test('ohne Anfrage gibt es keine Markierung', () => {
    assert.deepEqual(matchRanges('Wien', ''), []);
  });
});
