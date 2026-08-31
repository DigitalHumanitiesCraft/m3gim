/**
 * Ein Zaehlweg fuer datierte Ereignisse (Anschluss an year-anchor.test.mjs).
 *
 * Der Zeitanker eines Records laeuft seit E-150 ueber primaryYear, und der
 * Loader legt zu jeder Annotation das aufgeloeste Jahr als `year` ab
 * (`extractYear` auf den qualifierfreien Wert). Zwei Stellen bestimmen das
 * Jahr daran vorbei ein zweites Mal: die Tab-Diagnostik in `docs/js/main.js`
 * prueft mit `/\d{4}/` irgendwo im Wert, die Statistik in
 * `docs/js/views/statistics-data.js` schneidet die ersten vier Zeichen ab und
 * gibt sie an parseInt.
 *
 * Der in handoff.md notierte Belegfall `nach:1956` (NIM_004_24, NIM_004_29)
 * faellt heute nicht mehr auseinander, weil `splitQualifier` im Loader den
 * Qualifier abtrennt, bevor eine Ansicht den Wert sieht. Reproduzierbar
 * bleibt der zweite Fall, die Monats-Tages-Angabe `06-09` an NIM_004_34: der
 * Abschnitt liefert `06-0`, parseInt daraus die Zahl 6, und die Statistik
 * bucht ein Jahrzehnt 0. Die Jahrzehnt-Achse fuellt die Luecken zwischen
 * kleinstem und groesstem Wert auf und traegt damit zweihundert leere Zeilen.
 * Dass die Ansicht das heute nicht zeigt, liegt allein daran, dass die beiden
 * betroffenen Annotationen keinen Ort tragen und deshalb nicht in
 * store.mobilityEvents stehen.
 *
 * Lauf: node --test tests/frontend/event-year-count.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { aggregateDecadesBySicht } from '../../docs/js/views/statistics-data.js';
import { buildBibTeX } from '../../docs/js/views/basket.js';
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

describe('Jahrzehnte am ausgelieferten Datensatz', () => {
  // aggregateDecadesBySicht liest allein `.mobilityEvents`. Geprueft wird sie
  // hier ueber die vollstaendige Annotationsmenge desselben Ladelaufs, weil
  // die verorteten Annotationen den jahrlosen Fall heute nicht enthalten und
  // die Pruefung sonst an einem Zufall des Datenstands haengt.
  test('die Statistik zaehlt genau die Datierungen mit aufgeloestem Jahr', async () => {
    const store = await storeFromShipped();
    const alle = [...store.annotations.values()];
    const jahrlos = alle.filter((a) => a.date && a.year == null);
    assert.ok(jahrlos.length > 0, (
      'Keine Datierung ohne aufloesbares Jahr im Datenstand — der Test '
      + 'verliert seinen Gegenstand und ist zu pruefen.'
    ));
    const mitJahr = alle.filter((a) => a.year != null).length;
    const agg = aggregateDecadesBySicht({ mobilityEvents: store.annotations });
    assert.equal(agg.dated, mitJahr, (
      `Die Statistik zaehlt ${agg.dated} datierte Ereignisse, der Loader loest `
      + `${mitJahr} Jahre auf. Differenz: ${jahrlos.map((a) => a.date).join(', ')}`
    ));
  });

  // Die Achse fuellt die Luecke zwischen kleinstem und groesstem Jahrzehnt auf.
  // Eine einzige falsch gelesene Jahreszahl verlaengert sie deshalb um alle
  // Jahrzehnte dazwischen, statt nur eine falsche Zeile zu erzeugen.
  test('die Jahrzehnt-Achse beginnt am kleinsten aufgeloesten Jahr', async () => {
    const store = await storeFromShipped();
    const jahre = [...store.annotations.values()].map((a) => a.year).filter((y) => y != null);
    assert.ok(jahre.length > 0, 'keine aufgeloesten Jahre im Datenstand');
    const erwartet = Math.floor(Math.min(...jahre) / 10) * 10;
    const agg = aggregateDecadesBySicht({ mobilityEvents: store.annotations });
    assert.equal(agg.rows[0].decade, erwartet, (
      `Die Achse beginnt bei ${agg.rows[0].decade}, das kleinste aufgeloeste Jahr `
      + `liegt im Jahrzehnt ${erwartet}. Eine Datierung ohne Jahr ist als `
      + 'Jahreszahl gebucht worden.'
    ));
    assert.equal(agg.rows[agg.rows.length - 1].decade, Math.floor(Math.max(...jahre) / 10) * 10);
  });

  test('die verortete Teilmenge zaehlt genauso', async () => {
    const store = await storeFromShipped();
    const mitJahr = [...store.mobilityEvents.values()].filter((e) => e.year != null).length;
    assert.ok(mitJahr > 0, 'keine datierten Mobilitaets-Ereignisse');
    assert.equal(aggregateDecadesBySicht(store).dated, mitJahr);
  });
});

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
