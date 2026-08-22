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
 * Der Gate ist lexikalisch und ohne Ermessen entscheidbar: wer eine
 * Sidebar-Sektion `title: 'Zeitraum'` baut, muss den geteilten State lesen
 * (subscribe) und zurueckschreiben (setFilter).
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

const TIME_SECTION = /title:\s*'Zeitraum'/;

function viewSources() {
  return readdirSync(VIEWS)
    .filter(n => n.endsWith('.js'))
    .map(n => ({ name: n, text: readFileSync(join(VIEWS, n), 'utf8') }));
}

describe('Geteilter Filter erreicht jede Ansicht mit Zeitregler', () => {
  const withTime = viewSources().filter(v => TIME_SECTION.test(v.text));

  test('mindestens eine Ansicht baut einen Zeitregler', () => {
    assert.ok(withTime.length > 0, (
      'Keine Ansicht mit Zeitregler gefunden — der Gate verliert seinen '
      + 'Gegenstand und ist zu pruefen.'
    ));
  });

  test('jede Ansicht mit Zeitregler liest den geteilten Filter', () => {
    const offenders = withTime
      .filter(v => !/subscribe\s*\(/.test(v.text))
      .map(v => v.name);
    assert.deepEqual(offenders, [], (
      'Diese Ansichten bauen einen Zeitregler, ohne den geteilten Filter zu '
      + 'abonnieren. Ein Schnitt aus einer anderen Ansicht kommt dort nicht '
      + 'an: ' + offenders.join(', ')
    ));
  });

  test('jede Ansicht mit Zeitregler schreibt ihren Schnitt zurueck', () => {
    const offenders = withTime
      .filter(v => !/setFilter\s*\(/.test(v.text))
      .map(v => v.name);
    assert.deepEqual(offenders, [], (
      'Diese Ansichten schneiden die Zeit nur lokal. Der Schnitt bleibt im '
      + 'Tab stehen und gilt nirgendwo sonst: ' + offenders.join(', ')
    ));
  });
});
