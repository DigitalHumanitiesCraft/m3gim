/**
 * Ergaenztes ist markiert (Projektleitung, 2026-09-04).
 *
 * Alles, was die Pipeline oder das Frontend abgeleitet, geerbt oder ergaenzt
 * hat, statt es aus der Quellzeile zu lesen, traegt genau eine Marke: die
 * gepunktete Unterlinie der Klasse `mark-derived` plus einen `data-tip`, dessen
 * Text mit „ergänzt: “ beginnt und die Herkunft nennt. Zweitfarben, Symbole und
 * Kursivstellung sind an dieser Stelle ausgeschlossen, und die frueheren
 * Einzelformen sind damit abgeloest.
 *
 * Der Test liest den ausgelieferten Code lexikalisch, weil die fuenf Stellen in
 * fuenf Ansichten stehen und ein Rendering-Test jede von ihnen mit ihrem
 * Datenfall aufbauen muesste. Er faellt, sobald eine Stelle die Marke verliert,
 * ihren Tooltip anders beginnt oder die abgeloeste Einzelform zurueckkehrt.
 *
 * Nicht markiert sind Abwesenheit („o. D.“, „ohne Typ“) und Quellenprovenienz
 * (Beleg-Zeile, Provenienzpille): beides ist kein ergaenzter Wert.
 *
 * Lauf: node --test tests/frontend/derived-mark.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Die Quelldateien schreiben deutsche Literale teils als Unicode-Escape; der
 *  lexikalische Blick loest sie auf, damit er den Text und nicht die
 *  Schreibweise prueft. */
const read = (rel) =>
  readFileSync(fileURLToPath(new URL(`../../docs/${rel}`, import.meta.url)), 'utf8')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

/** Die fuenf Stellen, an denen ein ergaenzter Wert an der Oberflaeche steht. */
const SITES = [
  {
    name: 'Bestand: Jahr aus dem abgeleiteten Datierungsanker',
    file: 'js/views/bestand.js',
    tip: 'ergänzt: Jahr aus der Datierung',
  },
  {
    name: 'Bestand: Titel des Konvoluts in der flachen Liste',
    file: 'js/views/bestand.js',
    tip: 'ergänzt: Titel des Konvoluts',
  },
  {
    name: 'Bestand: erster Beteiligter statt des Sammeltitels',
    file: 'js/views/bestand.js',
    tip: 'ergänzt: erster Beteiligter statt des ererbten Sammeltitels',
  },
  {
    name: 'Chronik: Jahr aus einer sekundaeren Datierung',
    file: 'js/views/chronik.js',
    tip: 'ergänzt: Jahr aus ',
  },
  {
    name: 'Indizes: Untertitel aus der Wikidata-Anreicherung',
    file: 'js/views/indizes.js',
    tip: 'ergänzt: aus Wikidata',
  },
];

describe('Marke des Ergaenzten', () => {
  test('die Klasse ist genau einmal definiert, mit gepunkteter Unterlinie', () => {
    const css = read('css/components.css');
    const blocks = css.match(/^\.mark-derived\s*\{[^}]*\}/gm) || [];
    assert.equal(blocks.length, 1, '.mark-derived gehoert genau einmal in components.css');
    assert.match(blocks[0], /text-decoration:\s*underline dotted/);
    assert.match(blocks[0], /text-underline-offset/);
    assert.doesNotMatch(blocks[0], /font-style/, 'keine Kursivstellung als zweite Form');
  });

  for (const site of SITES) {
    test(`${site.name} traegt Marke und Herkunfts-Tooltip`, () => {
      const source = read(site.file);
      assert.ok(source.includes('mark-derived'), `${site.file} setzt mark-derived`);
      assert.ok(source.includes(site.tip),
        `${site.file} nennt die Herkunft mit „${site.tip}…“`);
    });
  }

  test('jeder Tooltip einer markierten Stelle beginnt mit der Ansage', () => {
    for (const site of new Set(SITES.map(s => s.file))) {
      const source = read(site);
      // Jede Marke gehoert zu einem Element, dessen dataset einen mit
      // „ergänzt: “ beginnenden Tooltip traegt. Geprueft wird das Fenster um die
      // Fundstelle, weil das Attributobjekt mehrzeilig steht.
      let from = 0;
      for (;;) {
        const at = source.indexOf('mark-derived', from);
        if (at === -1) break;
        from = at + 1;
        const near = source.slice(Math.max(0, at - 300), at + 300);
        assert.ok(near.includes('tip') && near.includes('ergänzt: '),
          `${site}: eine Marke steht ohne Herkunfts-Tooltip`);
      }
    }
  });

  test('die abgeloesten Einzelformen sind fort', () => {
    const bestand = read('js/views/bestand.js');
    assert.ok(!bestand.includes('archiv-datum--derived'),
      'die eigene Datumsklasse ist durch mark-derived abgeloest');
    const chronik = read('js/views/chronik.js');
    assert.ok(!chronik.includes('chronik-point--secondary'),
      'der gestrichelte Chip ist durch mark-derived abgeloest');
  });

  test('Abwesenheit bleibt Abwesenheit und wird nicht als ergaenzt markiert', () => {
    const bestand = read('js/views/bestand.js');
    assert.ok(bestand.includes('archiv-datum--undated'),
      '„o. D.“ behaelt seine eigene Form');
    assert.ok(bestand.includes('ohne Datierung in der Quelle'));
  });
});
