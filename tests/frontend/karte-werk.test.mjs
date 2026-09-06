/**
 * Das Werk als dritte wählbare Entität der Karte.
 *
 * Die Karte war auf Organisation und Person beschränkt, obwohl die Orte eines
 * Werks aus derselben Rechnung folgen: die Orte der Dokumente, die das Werk
 * nennen. Die stillen Defekte, gegen die diese Datei steht:
 *
 *   * Ein Werk steht in der Wahl, obwohl kein Dokument es belegt; die Karte
 *     bleibt nach der Wahl leer.
 *   * Die Record-Menge des Werks ist nicht die des Stores, der Punkt-Schnitt
 *     zeigt dann Orte fremder Dokumente.
 *   * Der Sprung-Wächter der Indizes (`karteSelectableNames`) kennt nur Person
 *     und Organisation, der Knopf fehlt am Werk mit verortetem Beleg.
 *
 * Lauf: node --test tests/frontend/karte-werk.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { buildEntities, buildOccurrences, hasGeo, ENTITY_FAMILY }
  from '../../docs/js/views/karte-data.js';
import { entitySection } from '../../docs/js/views/karte-picker.js';
import { karteSelectableNames } from '../../docs/js/views/indizes-data.js';
import { familyIconSvg } from '../../docs/js/ui/family-icons.js';
import { storeFromShipped } from './_shipped.mjs';

const S = (...ids) => new Set(ids);

/**
 * Fixture in der Form des Loaders. Die Werte stammen aus dem ausgelieferten
 * Datenstand: „Tristan und Isolde“ ist das ergiebigste Werk mit verorteten
 * Belegen, „Das Rheingold“ ein weiteres; das dritte Werk trägt kein Dokument.
 */
function makeStore() {
  const rec = (id, date, place, lat, lon) => ({
    '@id': id,
    'rico:date': date,
    'm3gim-ontology:processingStatus': 'abgeschlossen',
    'rico:hasOrHadLocation': [{
      name: place, role: 'auffuehrungsort', 'geo:lat': lat, 'geo:long': lon,
    }],
  });
  const records = new Map([
    ['r1', rec('r1', '1952-07-25', 'Bayreuth', 49.94, 11.58)],
    ['r2', rec('r2', '1953', 'Wien', 48.21, 16.37)],
    ['r3', rec('r3', '1960', 'Graz', 47.07, 15.44)],
  ]);
  return {
    records,
    allRecords: [...records.values()],
    unprocessedIds: new Set(),
    recordDatings: new Map(),
    mobilityEvents: new Map(),
    persons: new Map([['Malaniuk, Ira', { records: S('r1', 'r2', 'r3'), roles: S() }]]),
    organizations: new Map([['Bayreuther Festspiele', { records: S('r1'), roles: S() }]]),
    works: new Map([
      ['Tristan und Isolde', { records: S('r1', 'r2'), komponist: 'Wagner, Richard', wikidata: 'wd:Q182865' }],
      ['Das Rheingold', { records: S('r3'), komponist: 'Wagner, Richard', wikidata: null }],
      ['Ohne Beleg', { records: S(), komponist: null, wikidata: null }],
    ]),
    locations: new Map(),
    ensembles: new Map(),
    eventsByRole: new Map(),
    recordToAnnotations: new Map(),
    annotations: new Map(),
    recordToEvents: new Map(),
    recordToPerformances: new Map(),
    concepts: new Map(),
    performances: new Map(),
  };
}

describe('buildEntities: Werk als dritte Familie', () => {
  const entities = buildEntities(makeStore());
  const byId = new Map(entities.map(e => [e.id, e]));

  test('Werke stehen neben Person und Organisation', () => {
    assert.ok(byId.has('werk:Tristan und Isolde'));
    assert.ok(byId.has('werk:Das Rheingold'));
    assert.ok(byId.has('person:Malaniuk, Ira'));
    assert.ok(byId.has('org:Bayreuther Festspiele'));
  });

  test('ein Werk ohne Dokument wird nicht angeboten', () => {
    assert.equal(byId.has('werk:Ohne Beleg'), false);
  });

  test('das Werk trägt Art, Inhaltsfamilie und seine Record-Menge', () => {
    const w = byId.get('werk:Tristan und Isolde');
    assert.equal(w.kind, 'werk');
    assert.equal(w.family, 'werk');
    assert.equal(w.family, ENTITY_FAMILY.werk);
    assert.deepEqual([...w.records].sort(), ['r1', 'r2']);
    assert.equal(w.wikidata, 'wd:Q182865');
  });

  test('Person und Organisation behalten Art und Familie', () => {
    assert.equal(byId.get('person:Malaniuk, Ira').family, 'person');
    assert.equal(byId.get('org:Bayreuther Festspiele').family, 'institution');
  });

  test('die Punkte des Werks sind die Orte seiner Dokumente', () => {
    const store = makeStore();
    const w = buildEntities(store).find(e => e.id === 'werk:Tristan und Isolde');
    const places = buildOccurrences(store)
      .filter(o => w.records.has(o.recordId))
      .map(o => o.place).sort();
    assert.deepEqual(places, ['Bayreuth', 'Wien']);
  });
});

describe('entitySection: die Wahl benennt die Familie', () => {
  const state = { entity: null };
  const entities = buildEntities(makeStore());
  const spec = entitySection(entities, state, () => {});
  const options = spec.controls[0].options();
  const optionOf = id => options.find(o => o.value === id) || {};

  // E-241: das Familiensymbol der Vorschlagszeile unterscheidet die drei
  // Familien, das frühere Textpräfix ist entfallen.
  test('die Beschriftung ist der blanke Name, ohne Präfix', () => {
    assert.equal(optionOf('werk:Tristan und Isolde').label, 'Tristan und Isolde');
    assert.equal(optionOf('person:Malaniuk, Ira').label, 'Malaniuk, Ira');
    assert.equal(optionOf('org:Bayreuther Festspiele').label, 'Bayreuther Festspiele');
    for (const o of options) assert.doesNotMatch(o.label, / · /);
  });

  test('jede Zeile trägt ihre Inhaltsfamilie als Symbol und als Wort', () => {
    assert.equal(optionOf('werk:Tristan und Isolde').family, 'werk');
    assert.equal(optionOf('person:Malaniuk, Ira').family, 'person');
    assert.equal(optionOf('org:Bayreuther Festspiele').family, 'institution');
    // Das Symbol ist aria-hidden, der Name der Zeile braucht das Wort.
    assert.equal(optionOf('org:Bayreuther Festspiele').familyLabel, 'Organisation');
    assert.equal(optionOf('person:Malaniuk, Ira').familyLabel, 'Person');
    for (const o of options) {
      assert.ok(familyIconSvg(o.family).startsWith('<svg '),
        `keine Familie am Vorschlag ${o.value}`);
    }
  });

  test('die Sektion startet zugeklappt, damit die geteilten Filter stehen bleiben', () => {
    assert.equal(spec.collapsible, true);
    assert.equal(spec.collapsed(), true);
  });

  test('die Wahl setzt genau eine Entität und meldet sie', () => {
    let called = 0;
    const s2 = { entity: null };
    const sec = entitySection(entities, s2, () => { called++; });
    sec.controls[0].onSelect(['werk:Das Rheingold']);
    assert.equal(s2.entity.name, 'Das Rheingold');
    assert.equal(s2.entity.kind, 'werk');
    assert.equal(called, 1);
    assert.deepEqual(sec.controls[0].selected(), ['werk:Das Rheingold']);
    sec.controls[0].onSelect([]);
    assert.equal(s2.entity, null);
  });
});

describe('Datenstand: Werke mit verortetem Beleg', () => {
  test('der Sprung-Wächter führt Werke mit verortetem Beleg und keines ohne', async () => {
    const store = await storeFromShipped();
    const located = new Set();
    for (const o of buildOccurrences(store)) {
      if (hasGeo(o) && o.recordId) located.add(o.recordId);
    }
    const expected = new Set();
    for (const [name, data] of store.works) {
      for (const id of data.records) {
        if (located.has(id)) { expected.add(name); break; }
      }
    }
    // Der Datenstand trägt Werke mit verortetem Beleg; ohne diese Schranke
    // bestünde der Test auch über einer leeren Menge.
    assert.ok(expected.size > 50, `zu wenige verortete Werke: ${expected.size}`);
    assert.ok(expected.has('Tristan und Isolde'));

    const selectable = karteSelectableNames(store);
    for (const name of expected) {
      assert.ok(selectable.has(name), `Werk fehlt im Wächter: ${name}`);
    }
    // Ein Werk ohne verorteten Beleg darf nur dann im Wächter stehen, wenn eine
    // Person oder Organisation denselben Namen trägt.
    for (const [name] of store.works) {
      if (expected.has(name)) continue;
      if (store.persons.has(name) || store.organizations.has(name)) continue;
      assert.equal(selectable.has(name), false, `Werk ohne Ort im Wächter: ${name}`);
    }
  });
});
