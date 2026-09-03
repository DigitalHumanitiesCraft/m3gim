/**
 * Ein Zeitschnitt gilt in jeder Ansicht (Frontend-Vertrag, Cross-View-Filter).
 *
 * `docs/js/ui/filter-state.js` haelt genau einen Filter-State fuer alle
 * filterbaren Ansichten. Eine Ansicht, die einen eigenen Zeitregler baut, ohne
 * daran zu haengen, erzeugt den stillen Defekt, gegen den diese Datei steht:
 * der Operator schneidet in der Chronik auf ein Jahrzehnt, wechselt in die
 * Statistik und sieht dort den vollen Bestand, ohne dass irgendetwas meldet,
 * dass zwei verschiedene Mengen nebeneinander stehen.
 *
 * Seit dem Sidebar-Geruest (E-158) baut den Zeitregler genau eine Stelle,
 * `docs/js/ui/sidebar.js`. Der Gate ist deshalb zweiteilig und ohne Ermessen
 * entscheidbar: das Geruest liest den geteilten State (subscribe) und schreibt
 * ihn zurueck (setFilter), und keine Ansicht baut daneben einen eigenen.
 *
 * Lauf: node --test tests/frontend/shared-filter-reach.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIEWS = join(HERE, '..', '..', 'docs', 'js', 'views');
const SCAFFOLD = join(HERE, '..', '..', 'docs', 'js', 'ui', 'sidebar.js');

const TIME_SECTION = /title:\s*'Zeitraum'/;

function viewSources() {
  return readdirSync(VIEWS)
    .filter(n => n.endsWith('.js'))
    .map(n => ({ name: n, text: readFileSync(join(VIEWS, n), 'utf8') }));
}

describe('Der Zeitregler wohnt im Geruest und haengt am geteilten Filter', () => {
  const scaffold = readFileSync(SCAFFOLD, 'utf8');

  test('das Geruest baut den Zeitregler (der Gate hat seinen Gegenstand)', () => {
    assert.ok(TIME_SECTION.test(scaffold), (
      'Kein Zeitregler in ui/sidebar.js gefunden — der Gate verliert seinen '
      + 'Gegenstand und ist zu pruefen.'
    ));
  });

  test('das Geruest liest den geteilten Filter', () => {
    assert.ok(/subscribe\s*\(/.test(scaffold));
  });

  test('das Geruest schreibt seinen Schnitt zurueck', () => {
    assert.ok(/setFilter\s*\(/.test(scaffold));
  });

  test('keine Ansicht baut einen zweiten Zeitregler daneben', () => {
    const offenders = viewSources()
      .filter(v => TIME_SECTION.test(v.text))
      .map(v => v.name);
    assert.deepEqual(offenders, [], (
      'Diese Ansichten bauen ihren eigenen Zeitregler neben dem Geruest. Zwei '
      + 'Regler auf derselben Achse laufen auseinander: ' + offenders.join(', ')
    ));
  });
});
