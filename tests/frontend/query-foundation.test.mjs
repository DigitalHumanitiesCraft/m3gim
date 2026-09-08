/** Typed query predicates, source witnesses and committed filter history. */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { storeFromShipped } from './_shipped.mjs';
import { recordsFor, facetCounts, linkGroups } from '../../docs/js/data/records-for.js';
import {
  PREDICATE_TYPES, normalizePredicates, predicateKey,
} from '../../docs/js/data/query-predicates.js';
import {
  getFilter, setFilter, replaceFilter, buildFacetSelectionPatch,
  facetSelectionValues, undoFilter, redoFilter, filterHistoryStatus,
} from '../../docs/js/ui/filter-state.js';
import { serializeFilter, parseFilterQuery } from '../../docs/js/ui/filter-url.js';
import { buildOccurrences, groupPlaces } from '../../docs/js/data/place-evidence.js';
import { linkRoleInventory, MISSING_ROLE } from '../../docs/js/data/query-evidence.js';

const entityRole = (family, entities, roles) => ({
  type: PREDICATE_TYPES.ENTITY_ROLE, family, entities, roles,
});

describe('kanonische Prädikate und URL', () => {
  test('Reihenfolge und Dubletten ändern die Identität nicht', () => {
    const a = normalizePredicates([entityRole(
      'ort', ['Zürich', 'Zürich'], ['m3gim-vocab:receiving', 'm3gim-vocab:dispatch'],
    )]);
    const b = normalizePredicates([entityRole(
      'ort', ['Zürich'], ['m3gim-vocab:dispatch', 'm3gim-vocab:receiving'],
    )]);
    assert.equal(predicateKey(a[0]), predicateKey(b[0]));
    assert.ok(Object.isFrozen(a) && Object.isFrozen(a[0]) && Object.isFrozen(a[0].roles));
  });

  test('alle drei Typen laufen deterministisch durch die URL', () => {
    const predicates = [
      entityRole('ort', ['Zürich'], ['m3gim-vocab:receiving']),
      { type: PREDICATE_TYPES.RECORDS, ids: ['m3gim-data:NIM_023_5'] },
      { type: PREDICATE_TYPES.SET_MEMBERSHIP,
        include: [{ facet: 'verknuepfung', value: 'person' }],
        exclude: [{ facet: 'verknuepfung', value: 'werk' }] },
    ];
    const query = serializeFilter({ predicates });
    assert.match(query, /praedikat=/);
    assert.deepEqual(parseFilterQuery(query).predicates, normalizePredicates(predicates));
    assert.equal(serializeFilter(parseFilterQuery(query)), query);
  });

  test('ein beschädigtes URL-Prädikat bleibt sichtbar und schließt fail-closed', async () => {
    const store = await storeFromShipped();
    const filter = parseFilterQuery('praedikat=%7Bkaputt');
    const result = recordsFor(store, filter);
    assert.equal(filter.predicates[0].type, PREDICATE_TYPES.INVALID);
    assert.equal(result.valid, false);
    assert.equal(result.ids.size, 0);
    assert.equal(result.invalidPredicates.length, 1);
  });
});

describe('reale Quellmengen', () => {
  test('Zürich trennt Freitext, Entität und gebundene Ortsrolle', async () => {
    const store = await storeFromShipped();
    assert.equal(recordsFor(store, { search: 'Zürich' }).ids.size, 45);
    assert.equal(recordsFor(store, { ort: ['Zürich'] }).ids.size, 42);

    const coMention = recordsFor(store, {
      ort: ['Zürich'],
      verknuepfung: ['ort:m3gim-vocab:performancePlace'],
    });
    const boundPerformance = recordsFor(store, { predicates: [entityRole(
      'ort', ['Zürich'], ['m3gim-vocab:performancePlace'],
    )] });
    const boundReceiving = recordsFor(store, { predicates: [entityRole(
      'ort', ['Zürich'], ['m3gim-vocab:receiving'],
    )] });
    assert.equal(coMention.ids.size, 2, 'Dokument-Co-Mention bleibt ihre alte Bedeutung');
    assert.equal(boundPerformance.ids.size, 0, 'kein Quellstatement bindet beide Werte');
    assert.equal(boundReceiving.ids.size, 13);
    assert.equal(new Set(boundReceiving.witnesses.map(item => item.recordId)).size, 13);
  });

  test('eine exakte Dokumentauswahl schneidet auf stabile Record-IDs', async () => {
    const store = await storeFromShipped();
    const id = 'm3gim-data:NIM_023_5';
    const result = recordsFor(store, { predicates: [{
      type: PREDICATE_TYPES.RECORDS, ids: [id],
    }] });
    assert.deepEqual([...result.ids], [id]);
    assert.equal(result.witnesses[0].recordId, id);
    assert.equal(result.evidence.contextRecordIds.has(id), true);
  });

  test('Mengenprädikat bildet AND und Exklusion über denselben Facettenindizes', async () => {
    const store = await storeFromShipped();
    const values = ['person', 'institution', 'werk'];
    assert.equal(recordsFor(store, { verknuepfung: values }).ids.size, 184);
    const intersection = recordsFor(store, { predicates: [{
      type: PREDICATE_TYPES.SET_MEMBERSHIP,
      include: values.map(value => ({ facet: 'verknuepfung', value })),
      exclude: [],
    }] });
    assert.equal(intersection.ids.size, 106);

    const withoutWork = recordsFor(store, { predicates: [{
      type: PREDICATE_TYPES.SET_MEMBERSHIP,
      include: [{ facet: 'verknuepfung', value: 'person' }],
      exclude: [{ facet: 'verknuepfung', value: 'werk' }],
    }] });
    for (const id of withoutWork.ids) {
      assert.ok(!recordsFor(store, { verknuepfung: ['werk'] }).ids.has(id));
    }
  });

  test('Facettenzahlen bewahren die andere Hälfte gebundener und kombinierter Bedingungen', async () => {
    const store = await storeFromShipped();
    const bound = { predicates: [entityRole(
      'ort', ['Zürich'], ['m3gim-vocab:receiving'],
    )] };
    assert.equal(facetCounts(store, bound, 'ort', ['Zürich']).get('Zürich'), 13);
    const roleCounts = facetCounts(store, bound, 'verknuepfung', [
      'ort:m3gim-vocab:receiving', 'ort:m3gim-vocab:performancePlace',
    ]);
    assert.equal(roleCounts.get('ort:m3gim-vocab:receiving'), 13);
    assert.equal(roleCounts.get('ort:m3gim-vocab:performancePlace'), 0);

    const combined = { predicates: [{
      type: PREDICATE_TYPES.SET_MEMBERSHIP,
      include: [
        { facet: 'ort', value: 'Zürich' },
        { facet: 'verknuepfung', value: 'ort:m3gim-vocab:receiving' },
      ],
      exclude: [{ facet: 'werk', value: 'Tristan und Isolde' }],
    }] };
    const expected = recordsFor(store, {
      ort: ['Zürich'],
      predicates: [{ type: PREDICATE_TYPES.SET_MEMBERSHIP,
        include: [{ facet: 'verknuepfung', value: 'ort:m3gim-vocab:receiving' }],
        exclude: [{ facet: 'werk', value: 'Tristan und Isolde' }] }],
    }).ids.size;
    assert.equal(facetCounts(store, combined, 'ort', ['Zürich']).get('Zürich'), expected);
  });

  test('Ortsquelle bewahrt 652 Statements, 102 Registeridentitäten und 91 Gruppen', async () => {
    const store = await storeFromShipped();
    const statements = buildOccurrences(store);
    assert.equal(statements.length, 652);
    assert.equal(store.locations.size, 102);
    assert.equal(groupPlaces(statements).length, 91);
  });

  test('das Rollenregister umfasst jede Quellenfamilie und fehlende Rollen explizit', async () => {
    const store = await storeFromShipped();
    const inventory = linkRoleInventory(store);
    assert.deepEqual([...new Set(inventory.map(group => group.type))], [
      'datum', 'ensemble', 'ereignis', 'finanz', 'institution', 'ort', 'person', 'werk',
    ]);
    assert.ok(inventory.some(group => group.value.endsWith(`:${MISSING_ROLE}`)));
    assert.ok(inventory.every(group => group.label && group.recordIds.size === group.count));
    assert.ok(inventory.every(group => group.witnesses.length > 0));

    const missing = linkGroups(store).flatMap(group => group.children)
      .filter(child => child.value.endsWith(`:${MISSING_ROLE}`));
    assert.ok(missing.length > 0, 'die gemeinsame Facette muss die Quellenlücke anbieten');
    for (const child of missing) {
      const result = recordsFor(store, { verknuepfung: [child.value] });
      assert.equal(result.ids.size, child.count);
      assert.ok(result.witnesses.length >= result.ids.size,
        `${child.value} verliert seine Quellenbelege`);
    }
    for (const group of linkGroups(store)) {
      const union = recordsFor(store, {
        verknuepfung: group.children.map(child => child.value),
      }).ids;
      assert.deepEqual(union, recordsFor(store, { verknuepfung: [group.value] }).ids,
        `${group.value} verliert Rollenquellen zwischen Typ und Kindern`);
    }
  });
});

describe('Bindungsübergänge und Filter-History', () => {
  test('Wahlreihenfolge bindet gleich; Entfernen stellt die übrige Achse wieder her', () => {
    const role = 'ort:m3gim-vocab:receiving';
    let filter = { ort: ['Zürich'], verknuepfung: [], predicates: [] };
    filter = { ...filter, ...buildFacetSelectionPatch(filter, 'verknuepfung', [role]) };
    assert.deepEqual(filter.ort, []);
    assert.deepEqual(facetSelectionValues(filter, 'ort'), ['Zürich']);
    assert.deepEqual(facetSelectionValues(filter, 'verknuepfung'), [role]);

    const removeRole = { ...filter,
      ...buildFacetSelectionPatch(filter, 'verknuepfung', []) };
    assert.deepEqual(removeRole.ort, ['Zürich']);
    assert.deepEqual(removeRole.verknuepfung, []);
    assert.deepEqual(removeRole.predicates, []);

    const removeEntity = { ...filter,
      ...buildFacetSelectionPatch(filter, 'ort', []) };
    assert.deepEqual(removeEntity.ort, []);
    assert.deepEqual(removeEntity.verknuepfung, [role]);
    assert.deepEqual(removeEntity.predicates, []);

    let reverse = { ort: [], verknuepfung: [role], predicates: [] };
    reverse = { ...reverse, ...buildFacetSelectionPatch(reverse, 'ort', ['Zürich']) };
    assert.deepEqual(reverse.predicates, filter.predicates);
  });

  test('nur semantische Commits erzeugen Schritte; Replay dispatcht einmal', () => {
    const previousWindow = globalThis.window;
    globalThis.window = new EventTarget();
    try {
      replaceFilter({}, { history: false });
      replaceFilter({ ort: ['Wien'] }, { history: false });
      assert.equal(filterHistoryStatus().canUndo, false,
        'URL-Wiederherstellung und Ansichtsdefaults sind kein Filter-Commit');
      replaceFilter({}, { history: false });
      let dispatches = 0;
      globalThis.window.addEventListener('m3gim:filter', () => { dispatches += 1; });
      setFilter({ predicates: [entityRole(
        'ort', ['Zürich'], ['m3gim-vocab:receiving', 'm3gim-vocab:dispatch'],
      )] });
      setFilter({ predicates: [entityRole(
        'ort', ['Zürich', 'Zürich'], ['m3gim-vocab:dispatch', 'm3gim-vocab:receiving'],
      )] });
      assert.equal(dispatches, 1);
      assert.equal(filterHistoryStatus().canUndo, true);
      assert.equal(undoFilter(), true);
      assert.equal(dispatches, 2);
      assert.deepEqual(getFilter().predicates, []);
      assert.equal(filterHistoryStatus().canRedo, true);
      assert.equal(redoFilter(), true);
      assert.equal(dispatches, 3);
      assert.equal(getFilter().predicates.length, 1);
    } finally {
      replaceFilter({}, { history: false });
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    }
  });
});
