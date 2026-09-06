/**
 * Blattpaginierung: ein Folio ist eine Zeile, seine Seiten sind das Detail.
 *
 * Die Quelle erfasst die Seiten eines Blattes als eigene Objektzeilen (`1_1`,
 * `1_2`); seit B2 haengen sie an einem Datensatz des Folios. Im Bestand steht
 * das Blatt als eine Zeile mit seiner Seitenzahl, und das Detail blaettert
 * durch die Seiten, ohne die Zeile zu verlassen (F8, Aufgabe 7 des
 * Aufgabensatzes in knowledge/research-framework.md § Evaluation).
 *
 * Geprueft werden die drei dom-freien Schichten dahinter: der Seitenindex, das
 * Zeilenmodell der Tabelle und das Navigationsmodell der Steuerung. Die
 * Mindestvorkommen stammen aus dem ausgelieferten Datenstand, damit kein Test
 * leer durchlaeuft.
 *
 * Lauf: node --test tests/frontend/folio-paging.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import {
  folioPages, folioOfPage, isFolioPage, pageNeighbours,
} from '../../docs/js/views/record-detail-data.js';
import {
  getOrderedItems, familiesForRecord, folioRowFacts, rowRecords, isUndatedItem,
} from '../../docs/js/views/bestand-data.js';
import { baseIds, recordsFor } from '../../docs/js/data/records-for.js';
import { countLinks } from '../../docs/js/utils/format.js';
import { primaryYear } from '../../docs/js/data/loader.js';
import { storeFromShipped } from './_shipped.mjs';

let store;
let items;
let folioRows;
before(async () => {
  store = await storeFromShipped();
  items = getOrderedItems(store);
  folioRows = items.filter(item => !item.isKonvolut && item.pages.length > 0);
});

/** Die Seitenstufe einer Signatur, also der Teil hinter dem letzten `_`. */
function pageNumber(identifier) {
  const folio = String(identifier || '').split(' ')[1] || '';
  return Number(folio.split('_').pop());
}

describe('Seitenindex am ausgelieferten Datenstand', () => {
  test('der Bestand fuehrt Blaetter mit Seiten', () => {
    // Mindestvorkommen aus dem Datenstand: 19 Blattzeilen mit zusammen 381
    // Seiten, dazu zwei Folios, die selbst Seite eines Blattes sind.
    assert.ok(folioRows.length >= 15,
      `nur ${folioRows.length} Blattzeilen, der Test liefe leer`);
    const pages = folioRows.reduce((sum, item) => sum + item.pages.length, 0);
    assert.ok(pages >= 370, `nur ${pages} Seiten unter den Blattzeilen`);
  });

  test('ein Blatt fuehrt seine Seiten in Seitenfolge', () => {
    const record = store.bySignatur.get('UAKUG/NIM_003 1');
    assert.ok(record, 'UAKUG/NIM_003 1 steht im ausgelieferten Datensatz');
    assert.deepEqual(
      folioPages(store, record).map(p => p['rico:identifier']),
      Array.from({ length: 10 }, (_, i) => `UAKUG/NIM_003 1_${i + 1}`),
      'die Reihenfolge traegt die Blaetterrichtung des Details'
    );
  });

  test('jede Stufe eines Blattes steigt in der Seitenfolge', () => {
    // Geprueft wird je Stufe, nicht ueber die abgeflachte Liste: die enthaelt
    // bei geschachtelten Blaettern die Unterseiten zwischen den Seiten und
    // stiege dort zwangslaeufig nicht.
    const stufen = [...folioRows.map(i => i.record),
      store.bySignatur.get('UAKUG/NIM_073 33_1')];
    for (const record of stufen) {
      const teile = [].concat(record['rico:hasOrHadPart'] || [])
        .map(part => store.records.get(part['@id']))
        .filter(Boolean)
        .map(child => pageNumber(child['rico:identifier']));
      assert.deepEqual(teile, [...teile].sort((a, b) => a - b),
        `${record['rico:identifier']} haelt seine Seiten nicht in Seitenfolge`);
    }
  });

  test('eine Seite einer Seite steht in der Liste ihres Blattes', () => {
    // UAKUG/NIM_073 33 traegt vier Seiten, davon tragen 33_1 und 33_3 je vier
    // eigene. Die Zwischenstufe faellt nicht heraus, sonst verloere die
    // Anwendung zwei erschlossene Datensaetze.
    const record = store.bySignatur.get('UAKUG/NIM_073 33');
    assert.deepEqual(
      folioPages(store, record).map(p => p['rico:identifier']),
      [
        'UAKUG/NIM_073 33_1',
        'UAKUG/NIM_073 33_1_1', 'UAKUG/NIM_073 33_1_2',
        'UAKUG/NIM_073 33_1_3', 'UAKUG/NIM_073 33_1_4',
        'UAKUG/NIM_073 33_2',
        'UAKUG/NIM_073 33_3',
        'UAKUG/NIM_073 33_3_1', 'UAKUG/NIM_073 33_3_2',
        'UAKUG/NIM_073 33_3_3', 'UAKUG/NIM_073 33_3_4',
        'UAKUG/NIM_073 33_4',
      ]
    );
  });

  test('folioOfPage fuehrt bis zur Zeile, nicht bis zur naechsten Stufe', () => {
    const nested = store.bySignatur.get('UAKUG/NIM_073 33_1_2');
    assert.equal(folioOfPage(store, nested['@id']),
      store.bySignatur.get('UAKUG/NIM_073 33')['@id'],
      'ein Deep Link auf eine Unterseite oeffnet die Zeile des ganzen Blattes');
    const plain = store.bySignatur.get('UAKUG/NIM_004 10');
    assert.equal(folioOfPage(store, plain['@id']), null);
    assert.equal(isFolioPage(store, plain['@id']), false);
    assert.equal(isFolioPage(store, nested['@id']), true);
  });
});

describe('Zeilenmodell des Bestands', () => {
  test('keine Seite steht als eigene Zeile', () => {
    const pageRows = items.filter(
      item => !item.isKonvolut && isFolioPage(store, item.record['@id']));
    assert.deepEqual(pageRows.map(i => i.record['rico:identifier']), [],
      'eine Seite als Zeile zeigte dasselbe Blatt zweimal, ganz und seitenweise'
    );
  });

  test('jedes Blatt steht genau einmal', () => {
    const signaturen = folioRows.map(i => i.record['rico:identifier']);
    assert.equal(new Set(signaturen).size, signaturen.length);
    for (const sig of ['UAKUG/NIM_003 1', 'UAKUG/NIM_022 1', 'UAKUG/NIM_135 2']) {
      assert.ok(signaturen.includes(sig), `${sig} fehlt als Zeile`);
    }
  });

  test('die Zeilen stehen in Signaturordnung wie jede andere', () => {
    const konvolut = folioRows[0].konvolutId;
    const geschwister = items
      .filter(i => i.isChild && i.konvolutId === konvolut)
      .map(i => i.record['rico:identifier'] || '');
    const sortiert = [...geschwister].sort(
      (a, b) => a.localeCompare(b, 'de-DE', { numeric: true, sensitivity: 'base' }));
    assert.deepEqual(geschwister, sortiert);
  });

  test('die Familienzahlen der Zeile sind die ihrer Seiten zusammen', () => {
    // UAKUG/NIM_022 1 traegt selbst keine Verknuepfung; die drei Seiten
    // zusammen nennen drei Personen, eine Institution, einen Ort und drei
    // Werke. Von Hand am ausgelieferten Datenstand geprueft.
    const record = store.bySignatur.get('UAKUG/NIM_022 1');
    assert.equal(folioPages(store, record).length, 3);
    assert.deepEqual(
      familiesForRecord(record, store).map(f => `${f.key}=${f.count}`),
      ['person=3', 'institution=1', 'ort=1', 'werk=3'],
      'ohne die Zusammenfassung stuende die Zeile mit vier leeren Zeichen da'
    );
  });

  test('eine Entitaet auf mehreren Seiten zaehlt einmal', () => {
    // Die drei Seiten von UAKUG/NIM_022 1 nennen dieselben Beteiligten; die
    // Summe der Seitenzahlen laege hoeher als die Zahl der Personen.
    const record = store.bySignatur.get('UAKUG/NIM_022 1');
    const pages = folioPages(store, record);
    const einzeln = pages.reduce(
      (sum, p) => sum + familiesForRecord(p, store).find(f => f.key === 'person').count, 0);
    const zusammen = familiesForRecord(record, store).find(f => f.key === 'person').count;
    assert.ok(zusammen < einzeln,
      `die Zeile zaehlt Entitaeten (${zusammen}), nicht Seitenzahlen (${einzeln})`);
  });

  test('ein Blatt ohne eigene Erschliessung nimmt sie von seinen Seiten', () => {
    const record = store.bySignatur.get('UAKUG/NIM_003 1');
    const item = folioRows.find(i => i.record['@id'] === record['@id']);
    const facts = folioRowFacts(store, item);
    assert.equal(facts.date, '1944-01-01/1944-12-31');
    assert.equal(facts.docType, 'program');
    assert.match(facts.title, /^Deutsches Musikinstitut/);
  });

  test('wo die Seiten uneins sind, ergaenzt die Zeile nichts', () => {
    // UAKUG/NIM_073 30 traegt zwei Seiten mit verschiedenen Titeln und
    // Datierungen; eine davon zu waehlen erfaende eine Angabe.
    const record = store.bySignatur.get('UAKUG/NIM_073 30');
    const item = folioRows.find(i => i.record['@id'] === record['@id']);
    const facts = folioRowFacts(store, item);
    assert.equal(facts.title, null);
    assert.equal(facts.date, null);
    assert.equal(facts.docType, 'program', 'im Typ sind sich beide Seiten einig');
    // Datiert sind beide Seiten, nur verschieden genau. Bliebe die Zelle leer,
    // stuende dort "o. D." und behauptete das Gegenteil des Materials.
    assert.equal(facts.dateSpan, '1953');
    assert.equal(isUndatedItem(item, store), false);
  });

  test('uneinige Seiten geben der Zeile ihre Spanne', () => {
    // UAKUG/NIM_007 5 traegt acht verschieden datierte Seiten ueber zwei Jahre,
    // UAKUG/NIM_137 12 elf auf 1953 datierte und einunddreissig undatierte,
    // UAKUG/NIM_139 109 keine einzige mit rico:date, aber Seiten mit ankernder
    // Datierung. Keines der drei Blaetter ist undatiert.
    for (const [sig, span] of [['UAKUG/NIM_007 5', '1957 – 1958'],
      ['UAKUG/NIM_137 12', '1953'], ['UAKUG/NIM_139 109', '1956']]) {
      const item = folioRows.find(i => i.record['rico:identifier'] === sig);
      const facts = folioRowFacts(store, item);
      assert.equal(facts.date, null, `${sig}: die Seiten nennen kein gemeinsames Datum`);
      assert.equal(facts.dateSpan, span);
      assert.equal(isUndatedItem(item, store), false);
    }
  });

  test('die Spanne nimmt das Jahr des Ankers, nicht das Feld', () => {
    // UAKUG/NIM_023 1_1 traegt rico:date 1952, seine Auffuehrung datiert es auf
    // 1953; die Spanne des Blattes reicht deshalb ueber zwei Jahre, obwohl alle
    // drei Seiten dasselbe rico:date fuehren. Ohne den Anker sagte die Zeile
    // ein anderes Jahr als die Chronik.
    const item = folioRows.find(i => i.record['rico:identifier'] === 'UAKUG/NIM_023 1');
    assert.equal(new Set(item.pages.map(p => p['rico:date'])).size, 1);
    assert.equal(primaryYear(store, item.pages[0]).year, 1953);
    assert.equal(folioRowFacts(store, item).dateSpan, '1952 – 1953');
  });

  test('ein Blatt mit eigener Erschliessung behaelt sie', () => {
    const record = store.bySignatur.get('UAKUG/NIM_135 2');
    const item = folioRows.find(i => i.record['@id'] === record['@id']);
    assert.ok(record['rico:title'] && record['rico:date']);
    const facts = folioRowFacts(store, item);
    assert.equal(facts.title, null, 'nichts wird ergaenzt, wo die Zeile selbst spricht');
    assert.equal(facts.date, null);
  });

  test('eine Zeile ohne Seiten bleibt unberuehrt', () => {
    const plain = items.find(i => !i.isKonvolut && i.pages.length === 0);
    assert.ok(plain, 'der Bestand fuehrt Zeilen ohne Seiten');
    assert.deepEqual(folioRowFacts(store, plain),
      { title: null, date: null, dateSpan: null, docType: null });
  });

  test('ein Blatt steht im Schnitt, solange eine seiner Seiten darin steht', () => {
    // Derselbe Aufbau wie in updateBestandView: der Schnitt laeuft ueber die
    // Dokumente, fuer die eine Zeile steht, und die Zeile ueberlebt ihn genau
    // so lange wie eines dieser Dokumente. Ohne das fiele ein Blatt aus jedem
    // Schnitt heraus, in dem seine Seiten stehen, denn es traegt selbst keine
    // Verknuepfung.
    const row = items.find(i => i.record['rico:identifier'] === 'UAKUG/NIM_022 1');
    assert.equal(countLinks(row.record), 0, 'das Blatt selbst traegt keine Verknuepfung');
    const base = baseIds(store);
    const stands = [];
    for (const item of items) {
      if (item.isKonvolut) continue;
      for (const record of rowRecords(item)) {
        if (base.has(record['@id'])) stands.push({ record, item });
      }
    }
    const cut = { person: ['Wagner, Wolfgang'] };
    const passingIds = recordsFor(store, cut, {
      base: new Set(stands.map(s => s.record['@id'])),
    }).ids;
    const passing = stands.filter(s => passingIds.has(s.record['@id']));
    const rows = new Set(passing.map(s => s.item));
    assert.ok(rows.has(row), 'das Blatt faellt aus dem Schnitt seiner Seiten');
    assert.ok(passing.length >= 10, `nur ${passing.length} Treffer, der Test liefe leer`);
    assert.ok(!rows.has(items.find(i => i.record['rico:identifier'] === 'UAKUG/NIM_003 1')),
      'der Schnitt trifft nicht jedes Blatt, er schneidet also wirklich');
  });

  test('der Konvolut-Kopf beziffert die Zeilen, nicht die Seiten', () => {
    const kopf = items.find(i => i.isKonvolut && i.konvolutId === folioRows[0].konvolutId);
    const kinder = items.filter(i => i.isChild && i.konvolutId === kopf.konvolutId);
    assert.equal(kopf.totalChildCount, kinder.length,
      'sonst verspricht der Kopf Objekte, die die Tabelle nie als Zeile zeigt');
  });
});

describe('Navigationsmodell der Seitensteuerung', () => {
  const pages = ['a', 'b', 'c'].map(id => ({ '@id': id }));

  test('die Mitte hat beide Nachbarn', () => {
    const at = pageNeighbours(pages, 'b');
    assert.equal(at.index, 1);
    assert.equal(at.total, 3);
    assert.equal(at.prev['@id'], 'a');
    assert.equal(at.next['@id'], 'c');
  });

  test('die Enden halten an, sie laufen nicht um', () => {
    // Ein umlaufender Schritt machte die Angabe „1 / 3" unbrauchbar: sie sagte
    // nichts mehr darueber, wie weit der Lesende im Blatt gekommen ist. Die
    // Steuerung schaltet den Knopf am Ende ab.
    const first = pageNeighbours(pages, 'a');
    assert.equal(first.prev, null);
    assert.equal(first.next['@id'], 'b');
    const last = pageNeighbours(pages, 'c');
    assert.equal(last.prev['@id'], 'b');
    assert.equal(last.next, null);
  });

  test('eine Seite ausserhalb der Liste traegt keine Steuerung', () => {
    const off = pageNeighbours(pages, 'z');
    assert.equal(off.index, -1);
    assert.equal(off.prev, null);
    assert.equal(off.next, null);
    assert.equal(pageNeighbours(undefined, 'a').total, 0);
  });

  test('am echten Blatt reicht die Kette von der ersten bis zur letzten Seite', () => {
    const record = store.bySignatur.get('UAKUG/NIM_003 1');
    const list = folioPages(store, record);
    let at = list[0];
    const walked = [at['rico:identifier']];
    for (;;) {
      const { next } = pageNeighbours(list, at['@id']);
      if (!next) break;
      at = next;
      walked.push(at['rico:identifier']);
    }
    assert.equal(walked.length, list.length, 'kein Schritt bleibt haengen');
    assert.equal(walked[walked.length - 1], 'UAKUG/NIM_003 1_10');
    // und zurueck
    let back = at;
    let steps = 0;
    for (;;) {
      const { prev } = pageNeighbours(list, back['@id']);
      if (!prev) break;
      back = prev;
      steps += 1;
    }
    assert.equal(steps, list.length - 1);
    assert.equal(back['rico:identifier'], 'UAKUG/NIM_003 1_1');
  });
});
