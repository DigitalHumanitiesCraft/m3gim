/**
 * Ein Zaehlweg fuer datierte Ereignisse (Anschluss an year-anchor.test.mjs).
 *
 * Der Zeitanker eines Records laeuft seit E-150 ueber primaryYear, und der
 * Loader legt zu jeder Annotation das aufgeloeste Jahr als `year` ab
 * (`extractYear` auf den qualifierfreien Wert). Wer daran vorbei ein zweites
 * Mal ein Jahr bestimmt, etwa mit einem Vierstellen-Regex irgendwo im Wert
 * oder mit dem Abschnitt der ersten vier Zeichen, liest aus der Monats-Tages-
 * Angabe `06-09` (NIM_004_34) die Jahreszahl 6. Genau diese beiden Muster
 * sucht der lexikalische Gate unten in allen Frontend-Modulen.
 *
 * Die frueher hier gepruefte Jahrzehnt-Achse der Statistik ist mit E-160
 * entfallen; die Dekaden der Chronik zaehlen ueber das vom Loader aufgeloeste
 * Jahr und leiten selbst keines mehr ab.
 *
 * Der zweite Teil sichert die Jahresangabe im BibTeX-Export.
 *
 * Lauf: node --test tests/frontend/event-year-count.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildBibTeX } from '../../docs/js/views/korb.js';
import { primaryYear } from '../../docs/js/data/loader.js';
import { storeFromShipped } from './_shipped.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

/** Alle Frontend-Module ausser dem Datumsparser selbst. */
function moduleSources() {
  const out = [];
  for (const rel of ['docs/js', 'docs/js/views', 'docs/js/ui', 'docs/js/data', 'docs/js/utils']) {
    for (const entry of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
      const path = `${rel}/${entry.name}`;
      if (path === 'docs/js/utils/date-parser.js') continue;
      out.push({ name: path, text: readFileSync(join(ROOT, path), 'utf8') });
    }
  }
  return out;
}

describe('Jahresaufloesung an Ereignisdatierungen', () => {
  test('kein Modul leitet ein Jahr selbst aus einem Datumswert ab', () => {
    // Ein `date`-Wert plus eigener Vierstellen-Regex oder slice(0,4) ist die
    // Umgehung des Parsers. `birthDate`/`deathDate` sind nicht gemeint, dort
    // formatiert der Aufrufer eine Lebensspanne und zaehlt nichts.
    const offenders = [];
    for (const { name, text } of moduleSources()) {
      text.split('\n').forEach((line, i) => {
        if (!/(?:^|[^A-Za-z])date\b/.test(line)) return;
        const vierstellig = line.indexOf('/' + String.fromCharCode(92) + 'd{4}/') !== -1;
        if (vierstellig || /\.\s*slice\s*\(\s*0\s*,\s*4\s*\)/.test(line)) {
          offenders.push(`${name}:${i + 1}`);
        }
      });
    }
    assert.deepEqual(offenders, [], (
      'Diese Stellen bestimmen ein Jahr am Datumsparser vorbei. Das vom Loader '
      + 'aufgeloeste `year` oder extractYear(value) verwenden: ' + offenders.join(', ')
    ));
  });
});

describe('Jahresangabe im BibTeX-Export', () => {
  // Der Export las sein Jahr aus dem gerenderten Anzeigedatum von rico:date.
  // Ein Record ohne rico:date, dessen Jahr an einer Datierung haengt, verlor
  // damit die Jahresangabe, obwohl der Zeitanker sie fuehrt (Vertrag A4,
  // year-anchor.test.mjs).
  test('ein Record mit abgeleitetem Jahr exportiert dieses Jahr', async () => {
    const store = await storeFromShipped();
    const abgeleitet = [...store.allRecords]
      .filter((r) => !r['rico:date'] && primaryYear(store, r).year != null);
    assert.ok(abgeleitet.length > 0, (
      'Kein Record mit abgeleitetem Jahr im Datenstand — der Test verliert '
      + 'seinen Gegenstand und ist zu pruefen.'
    ));
    const fehlend = [];
    for (const rec of abgeleitet) {
      const jahr = primaryYear(store, rec).year;
      const bib = buildBibTeX([rec['@id']], store);
      if (!bib.includes(`year      = {${jahr}}`)) {
        fehlend.push(`${rec['rico:identifier']} (erwartet ${jahr})`);
      }
    }
    assert.deepEqual(fehlend, [],
      'BibTeX-Eintraege ohne ihr Ankerjahr: ' + fehlend.join(', '));
  });

  test('ein Record mit eigenem rico:date behaelt sein Jahr', async () => {
    const store = await storeFromShipped();
    const rec = store.allRecords.find((r) => /^\d{4}/.test(String(r['rico:date'] || '')));
    assert.ok(rec, 'kein Record mit ISO-Datierung');
    const jahr = String(rec['rico:date']).slice(0, 4);
    assert.ok(buildBibTeX([rec['@id']], store).includes(`year      = {${jahr}}`),
      `BibTeX-Eintrag von ${rec['rico:identifier']} ohne Jahr ${jahr}`);
  });
});
