/**
 * Die Registerseite der Indizes (E-226): Sortierung, Umfeld und die belegten
 * Bühnenrollen eines Werks.
 *
 * Diese drei Stücke sind reine Funktionen über dem Store; die Ansicht setzt nur
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
 *   * Der Suchbegriff des geteilten Feldes trifft im Register andere Felder als
 *     die Zeile zeigt.
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
  buildUmfeld, REGISTER_FAMILY, REGISTER_LABELS, REGISTER_KEYS, cutCountOf,
  REGISTER_ENTITY_TYPE, bestandFilterFor, entryYearSpan, entryRoles,
} from '../../docs/js/views/indizes-data.js';
import { recordsFor, baseIds } from '../../docs/js/data/records-for.js';
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

describe('Suche im Register', () => {
  test('die Suche trifft die Felder, die die Zeile zeigt', () => {
    const entries = getGridEntries(store, 'personen');
    const out = filterEntries(entries, 'personen', { q: 'wagner' });
    assert.ok(out.length > 0, 'Der Datenstand fuehrt Wagner; sonst prueft der Test nichts.');
    assert.ok(out.every(e => /wagner/i.test(e.name + ' ' + (e.kategorie || ''))));
  });

  test('ohne Suchbegriff bleibt die Liste unangetastet', () => {
    const entries = getGridEntries(store, 'orte');
    assert.equal(filterEntries(entries, 'orte', {}), entries);
  });
});

describe('Registerbeschriftungen', () => {
  test('jedes Register traegt Beschriftung und Familie', () => {
    // Kopfzeile der Liste und Menue am Indizes-Tab lesen dieselbe Quelle (E-230).
    assert.deepEqual(REGISTER_KEYS, ['personen', 'organisationen', 'orte', 'werke']);
    for (const key of REGISTER_KEYS) {
      assert.ok(REGISTER_LABELS[key], `${key} ohne Beschriftung`);
      assert.ok(REGISTER_FAMILY[key], `${key} ohne Familie`);
    }
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

describe('Der Eintrag als Knotenpunkt (E-252)', () => {
  test('jedes Register nennt den Entitaetstyp, den Facette und Fokus teilen', () => {
    for (const key of REGISTER_KEYS) {
      assert.ok(REGISTER_ENTITY_TYPE[key], `${key} ohne Entitaetstyp`);
    }
    // Die Facettenschluessel des geteilten Filters, nicht der Altname location.
    assert.deepEqual(Object.values(REGISTER_ENTITY_TYPE),
      ['person', 'institution', 'ort', 'werk']);
  });

  test('der Sprung setzt die Facette und bewahrt den Dokument-Suchschnitt', () => {
    const filter = bestandFilterFor('orte', { ort: ['Wien'], search: 'bay' }, 'Bayreuth');
    assert.deepEqual(filter.ort, ['Wien', 'Bayreuth'], 'der Sprung verengt, er ersetzt nicht');
    assert.equal(filter.search, 'bay');
    assert.equal(bestandFilterFor('gibt-es-nicht', {}, 'Bayreuth'), null);
    assert.equal(bestandFilterFor('orte', {}, ''), null);
  });

  test('die Belegzahl der Zeile ist die Zahl, die der Bestand nach dem Sprung zeigt', () => {
    // Der Widerspruch, gegen den diese Zusicherung steht: die Zeile zaehlte im
    // Schnitt, der Sprung fuehrte in einen anders geschnittenen Bestand.
    const base = baseIds(store);
    const entries = entriesWithRecordsIn(getGridEntries(store, 'orte'), base);
    const bayreuth = entries.find(e => e.name === 'Bayreuth');
    assert.ok(bayreuth, 'Bayreuth steht im Ortsregister.');
    const { ids } = recordsFor(store, bestandFilterFor('orte', {}, 'Bayreuth'));
    assert.equal(ids.size, cutCountOf(bayreuth));
  });
});

describe('Zeitspanne der Belege (E-252)', () => {
  test('die Spanne reicht vom ersten bis zum letzten datierten Dokument', () => {
    const bayreuth = getGridEntries(store, 'orte').find(e => e.name === 'Bayreuth');
    const span = entryYearSpan(store, bayreuth);
    assert.ok(span, 'Bayreuth fuehrt datierte Belege.');
    assert.ok(span.from <= span.to);
    assert.ok(span.from >= 1919 && span.to <= 2009, `${span.from}-${span.to}`);
  });

  test('ein Schnitt ohne einen einzigen Beleg hat keine Spanne', () => {
    const bayreuth = getGridEntries(store, 'orte').find(e => e.name === 'Bayreuth');
    assert.equal(entryYearSpan(store, bayreuth, new Set(['gibt-es-nicht'])), null);
  });

  test('der Schnitt verkuerzt die Spanne hoechstens', () => {
    const entry = getGridEntries(store, 'personen').find(e => e.name === 'Wagner, Wieland');
    const full = entryYearSpan(store, entry);
    const half = entryYearSpan(store, entry,
      new Set([...entry.records].slice(0, Math.ceil(entry.records.size / 2))));
    assert.ok(full && half);
    assert.ok(half.from >= full.from && half.to <= full.to);
  });
});

describe('Rollen einer Person (E-252)', () => {
  test('die Rollen kommen aus dem Vokabular der Quelle, mit ihrer Belegzahl', () => {
    const entry = getGridEntries(store, 'personen').find(e => e.name === 'Wagner, Wieland');
    const roles = entryRoles(store, 'personen', entry);
    assert.ok(roles.length > 0, 'Ohne Rollen prueft der Test nichts.');
    for (const role of roles) {
      assert.ok(role.name && role.count >= 1);
      assert.ok(role.count <= entry.count,
        `${role.name} zaehlt ${role.count} Dokumente von ${entry.count}`);
      // Die Rolle steht so, wie die Erschliessung sie gesetzt hat.
      assert.ok(store.persons.get(entry.name).roles.has(role.name));
    }
    for (let i = 1; i < roles.length; i++) {
      assert.ok(roles[i - 1].count >= roles[i].count);
    }
  });

  test('ausserhalb des Schnitts bleibt keine Rolle stehen', () => {
    const entry = getGridEntries(store, 'personen').find(e => e.name === 'Wagner, Wieland');
    assert.deepEqual(entryRoles(store, 'personen', entry, new Set(['gibt-es-nicht'])), []);
  });
});

describe('Das Umfeld als kurze Orientierung (E-252)', () => {
  test('hoechstens fuenf Chips je Familie, der Rest steht als rest bereit', () => {
    const entry = getGridEntries(store, 'personen').find(e => e.name === 'Wagner, Wieland');
    const groups = buildUmfeld(store, 'personen', entry, { limit: 5 });
    assert.ok(groups.length > 0);
    assert.ok(groups.some(g => g.rest.length > 0),
      'Ohne eine abgeschnittene Gruppe prueft der Test den Rest nicht.');
    for (const group of groups) {
      assert.ok(group.items.length <= 5, `${group.key} zeigt ${group.items.length} Chips`);
    }
  });
});
