/**
 * Die Registerseite der Indizes (E-226): Sortierung, Reconciliation-Liste,
 * Umfeld und die belegten Bühnenrollen eines Werks.
 *
 * Diese vier Stücke sind reine Funktionen über dem Store; die Ansicht setzt nur
 * Symbole und Chips darauf. Geprüft wird gegen den ausgelieferten Datenstand,
 * damit die Aussagen an den echten Namen hängen und nicht an einer Fixture, die
 * sich selbst bestätigt.
 *
 * Die stillen Defekte, gegen die diese Datei steht:
 *
 *   * Die Sortierung mutiert die memoisierte Liste, und die Belegzahl-Reihung
 *     ist nach einem Wechsel auf alphabetisch dauerhaft verloren.
 *   * Die Zeile zählt über den ganzen Teilnachlass und widerspricht der Sidebar,
 *     und die Sortierung nach Belegzahl ordnet nach einer Zahl, die nirgends
 *     steht.
 *   * Die Reconciliation-Liste zeigt dieselben Einträge wie „Nur mit Wikidata",
 *     weil beide Schalter zugleich greifen.
 *   * Das Umfeld führt den Eintrag selbst als seinen eigenen Nachbarn.
 *   * Die Bühnenrollen eines Werks werden aus Dokumenten mit mehreren Rollen
 *     geraten, und ein Werk bekommt Partien aus anderen Opern zugeschrieben.
 *
 * Lauf: node --test tests/frontend/indizes-register.test.mjs
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

import {
  getGridEntries, clearEntriesCache, entriesWithRecordsIn, filterEntries, sortEntries,
  hasWikidata, buildUmfeld, workStageRoles, REGISTER_FAMILY, cutCountOf,
} from '../../docs/js/views/indizes-data.js';
import { storeFromShipped } from './_shipped.mjs';

let store = null;

before(async () => {
  store = await storeFromShipped();
  clearEntriesCache();
});

describe('Sortierung', () => {
  test('Belegzahl ordnet absteigend und laesst die Vorlage unberuehrt', () => {
    const entries = getGridEntries(store, 'werke');
    const before = entries.map(e => e.name);
    const sorted = sortEntries(entries, 'count');
    assert.notEqual(sorted, entries, 'Die memoisierte Liste darf nicht in-place sortiert werden.');
    assert.deepEqual(entries.map(e => e.name), before);
    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i - 1].count >= sorted[i].count);
    }
  });

  test('alphabetisch ordnet nach deutscher Kollation', () => {
    const sorted = sortEntries(getGridEntries(store, 'orte'), 'alpha');
    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i - 1].name.localeCompare(sorted[i].name, 'de-DE') <= 0,
        `${sorted[i - 1].name} steht vor ${sorted[i].name}`);
    }
  });

  test('beide Sortierungen zeigen dieselbe Menge', () => {
    const entries = getGridEntries(store, 'personen');
    const a = new Set(sortEntries(entries, 'count').map(e => e.name));
    const b = new Set(sortEntries(entries, 'alpha').map(e => e.name));
    assert.equal(a.size, entries.length);
    assert.deepEqual([...a].sort(), [...b].sort());
  });
});

describe('Belegzahl des Schnitts (E-227)', () => {
  // Ein echter Schnitt: die Dokumente eines Ortes. Die Personen darin führen
  // fast alle mehr Belege im Teilnachlass als in diesem Ausschnitt.
  const cut = () => new Set(store.locations.get('Bayreuth').records);

  test('der Schnitt haengt seine Zahl an und laesst die memoisierte Liste unberuehrt', () => {
    const entries = getGridEntries(store, 'personen');
    const cutIds = cut();
    const inCut = entriesWithRecordsIn(entries, cutIds);
    assert.ok(inCut.length > 0 && inCut.length < entries.length);
    assert.ok(entries.every(e => e.cutCount === undefined),
      'Die Vorlage darf keine Schnittzahl tragen, sie ueberlebt den naechsten Filter.');
    for (const e of inCut) {
      const shared = [...e.records].filter(id => cutIds.has(id)).length;
      assert.equal(cutCountOf(e), shared);
      assert.ok(shared >= 1 && shared <= e.count);
    }
  });

  test('die Sortierung nach Belegzahl ordnet nach der Zahl des Schnitts', () => {
    const inCut = entriesWithRecordsIn(getGridEntries(store, 'personen'), cut());
    const sorted = sortEntries(inCut, 'count');
    for (let i = 1; i < sorted.length; i++) {
      assert.ok(cutCountOf(sorted[i - 1]) >= cutCountOf(sorted[i]));
    }
    // Ohne diesen Nachweis pruefte der Test nur die alte Sortierung mit: im
    // Schnitt muss mindestens ein Paar anders stehen als nach dem Gesamtstand.
    assert.ok(sorted.some((e, i) => i > 0 && sorted[i - 1].count < e.count),
      'Der gewaehlte Schnitt dreht kein Paar um; der Test behauptet dann nichts.');
  });

  test('ohne Schnitt bleibt die Belegzahl der Gesamtstand', () => {
    const entries = getGridEntries(store, 'orte');
    assert.equal(entriesWithRecordsIn(entries, null), entries);
    assert.equal(cutCountOf(entries[0]), entries[0].count);
  });
});

describe('Reconciliation-Liste', () => {
  test('ohne Wikidata ist das Gegenstueck zu mit Wikidata', () => {
    const entries = getGridEntries(store, 'werke');
    const mit = filterEntries(entries, 'werke', { withWikidata: true });
    const ohne = filterEntries(entries, 'werke', { withoutWikidata: true });
    assert.ok(ohne.length > 0, 'Der Datenstand fuehrt offene Werke; sonst prueft der Test nichts.');
    assert.equal(mit.length + ohne.length, entries.length);
    assert.ok(ohne.every(e => !hasWikidata(e)));
    assert.ok(mit.every(e => hasWikidata(e)));
  });

  test('der Schalter mit Wikidata gewinnt, wenn beide gesetzt sind', () => {
    const entries = getGridEntries(store, 'orte');
    const out = filterEntries(entries, 'orte', { withWikidata: true, withoutWikidata: true });
    assert.ok(out.length > 0);
    assert.ok(out.every(e => hasWikidata(e)),
      'Ein widerspruechliches Paar darf das Register nicht still leeren.');
  });

  test('die Suche greift auf der Reconciliation-Liste weiter', () => {
    const entries = getGridEntries(store, 'personen');
    const out = filterEntries(entries, 'personen', { withoutWikidata: true, q: 'wagner' });
    assert.ok(out.every(e => !hasWikidata(e) && /wagner/i.test(e.name + ' ' + (e.kategorie || ''))));
  });
});

describe('Umfeld', () => {
  const wagner = () => getGridEntries(store, 'personen').find(e => e.name === 'Wagner, Wieland');

  test('die vier Familiengruppen stehen in Lesereihenfolge', () => {
    const groups = buildUmfeld(store, 'personen', wagner());
    assert.deepEqual(groups.map(g => g.key),
      ['personen', 'organisationen', 'orte', 'werke']);
    assert.deepEqual(groups.map(g => g.family),
      groups.map(g => REGISTER_FAMILY[g.key]));
  });

  test('der Eintrag selbst steht nicht in seinem eigenen Umfeld', () => {
    const groups = buildUmfeld(store, 'personen', wagner());
    const personen = groups.find(g => g.key === 'personen');
    assert.ok(![...personen.items, ...personen.rest].some(i => i.name === 'Wagner, Wieland'));
  });

  test('die Ko-Okkurrenz zaehlt die gemeinsamen Dokumente', () => {
    const entry = wagner();
    const groups = buildUmfeld(store, 'personen', entry);
    const orte = groups.find(g => g.key === 'orte');
    const bayreuth = orte.items.find(i => i.name === 'Bayreuth');
    assert.ok(bayreuth, 'Bayreuth gehoert zum Umfeld des Bayreuther Regisseurs.');
    const shared = [...store.locations.get('Bayreuth').records]
      .filter(id => entry.records.has(id)).length;
    assert.equal(bayreuth.count, shared);
  });

  test('jede Gruppe ist nach Ko-Okkurrenz sortiert und beim Limit geschnitten', () => {
    const groups = buildUmfeld(store, 'personen', wagner(), { limit: 3 });
    for (const group of groups) {
      assert.ok(group.items.length <= 3);
      for (let i = 1; i < group.items.length; i++) {
        assert.ok(group.items[i - 1].count >= group.items[i].count);
      }
      if (group.rest.length > 0) {
        assert.equal(group.items.length, 3);
        assert.ok(group.items[2].count >= group.rest[0].count);
      }
    }
  });

  test('ein Schnitt auf eine fremde Dokumentmenge laesst kein Umfeld stehen', () => {
    const groups = buildUmfeld(store, 'personen', wagner(), { recordIds: new Set(['gibt-es-nicht']) });
    assert.deepEqual(groups, []);
  });

  test('leere Gruppen fallen weg', () => {
    // Ein Ort, dessen Dokumente kein Werk nennen, fuehrt keine Werk-Gruppe.
    const orte = getGridEntries(store, 'orte');
    const groups = orte
      .map(e => buildUmfeld(store, 'orte', e))
      .find(g => g.length < 4);
    assert.ok(groups, 'Im Datenstand gibt es Eintraege ohne alle vier Familien.');
    assert.ok(groups.every(g => g.items.length > 0));
  });
});

describe('Buehnenrollen je Werk', () => {
  test('nur eindeutige Belege binden eine Rolle an ihr Werk', () => {
    const roles = workStageRoles(store);
    assert.ok(roles.size > 0, 'Ohne Treffer prueft der Test nichts.');
    const isolde = roles.get('Tristan und Isolde');
    assert.ok(isolde, 'Das belegteste Werk fuehrt seine Rolle.');
    assert.ok(isolde.some(r => r.name === 'Brangäne'),
      'Die Partie Malaniuks in Tristan und Isolde ist Brangäne.');
    // Der weite Schluss (jedes Dokument mit genau einem Werk) schrieb Aida
    // Partien aus anderen Opern zu; die enge Fassung darf das nicht tun.
    for (const [work, list] of roles) {
      assert.ok(list.length > 0, `${work} fuehrt eine leere Rollenliste.`);
      for (const role of list) {
        assert.ok(role.name && role.count >= 1);
      }
    }
    assert.ok(!(roles.get('Aida') || []).some(r => r.name === 'Brangäne'),
      'Eine Rolle aus einer anderen Oper darf nicht an Aida haengen.');
  });

  test('die Rollen eines Werks sind nach Belegzahl sortiert', () => {
    for (const list of workStageRoles(store).values()) {
      for (let i = 1; i < list.length; i++) {
        assert.ok(list[i - 1].count >= list[i].count);
      }
    }
  });

  test('die kuratierte Partie steht am Werk-Eintrag', () => {
    const werke = getGridEntries(store, 'werke');
    const mitPartie = werke.filter(e => e.partie);
    assert.ok(mitPartie.length >= 20,
      `Nur ${mitPartie.length} Werke mit kuratierter Partie; der Werk-Index scheint nicht anzukommen.`);
    const carmen = werke.find(e => e.name === 'Carmen');
    assert.equal(carmen && carmen.partie, 'Carmen');
  });
});
