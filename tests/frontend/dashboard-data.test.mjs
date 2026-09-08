import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateTreemap, aggregateMatrix, aggregateTime, aggregatePlaceSankey,
  aggregateUpSet, aggregateComparison, aggregateExportRows, datasetFingerprint,
  idsForSet,
} from '../../docs/js/views/statistik-data.js';

const source = (sheet, row) => ({ 'm3gim-ontology:xlsxSource': {
  'm3gim-ontology:xlsxSheet': sheet, 'm3gim-ontology:xlsxRow': row,
} });
const records = [
  { '@id': 'r1', 'rico:identifier': 'R1', 'rico:date': '1951',
    'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:correspondence' },
    'rico:hasOrHadSubject': [{ '@type': 'm3gim-ontology:MusicalWork', name: 'Tristan', composer: 'Wagner', ...source('Links', 1) }] },
  { '@id': 'r2', 'rico:identifier': 'R2', 'rico:date': '1955',
    'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:letter' },
    'rico:hasOrHadSubject': [{ '@type': 'm3gim-ontology:MusicalWork', name: 'Tristan', composer: 'Wagner', ...source('Links', 2) }] },
  { '@id': 'r3', 'rico:identifier': 'R3',
    'rico:hasDocumentaryFormType': { '@id': 'm3gim-vocab:review' },
    'rico:hasOrHadSubject': [{ '@type': 'm3gim-ontology:MusicalWork', name: 'Walküre', composer: 'Wagner', ...source('Links', 3) }] },
  { '@id': 'r4', 'rico:identifier': 'R4' },
];

function store() {
  const byDocType = new Map();
  for (const record of records) {
    const type = record['rico:hasDocumentaryFormType']?.['@id']?.replace('m3gim-vocab:', '');
    if (type) byDocType.set(type, [...(byDocType.get(type) || []), record]);
  }
  return {
    allRecords: records, records: new Map(records.map(record => [record['@id'], record])), byDocType,
    recordDatings: new Map(), annotations: new Map(), roleVocab: new Map(), recordToPerformances: new Map(),
    dftHierarchy: new Map([
      ['m3gim-vocab:correspondence', { prefLabel: 'Korrespondenz', children: ['m3gim-vocab:letter'] }],
      ['m3gim-vocab:letter', { prefLabel: 'Brief', children: [] }],
      ['m3gim-vocab:review', { prefLabel: 'Rezension', children: [] }],
    ]),
    works: new Map([
      ['Tristan', { records: new Set(['r1', 'r2']), komponist: 'Wagner' }],
      ['Walküre', { records: new Set(['r3']), komponist: 'Wagner' }],
    ]),
    persons: new Map(), organizations: new Map(), locations: new Map(),
  };
}

describe('Treemap partition', () => {
  test('parent direct assignments occupy a residual leaf and every record occurs once', () => {
    const tree = aggregateTreemap(store(), new Set(records.map(record => record['@id'])));
    const correspondence = tree.children.find(node => node.key === 'correspondence');
    assert.equal(correspondence.count, 2);
    assert.deepEqual(correspondence.children.map(node => [node.key, node.count]),
      [['correspondence:direct', 1], ['letter', 1]]);
    const leaves = tree.children.flatMap(node => node.children?.length ? node.children : [node]);
    assert.deepEqual([...new Set(leaves.flatMap(node => node.recordIds))].sort(), ['r1', 'r2', 'r3', 'r4']);
    assert.equal(leaves.reduce((sum, node) => sum + node.count, 0), 4);
  });
});

describe('Matrix evidence', () => {
  test('co-mention cells carry both witnesses without fabricating a joint source', () => {
    const matrix = aggregateMatrix(store(), new Set(['r1', 'r2']), 'doctype-work');
    const cell = matrix.cells.find(value => value.row.key === 'correspondence' && value.column.key === 'Tristan');
    assert.deepEqual(cell.recordIds, ['r1']);
    assert.equal(cell.binding, 'co-mention');
    assert.deepEqual(new Set(cell.witnesses.map(value => value.kind)), new Set(['doctype', 'work']));
    assert.deepEqual(cell.sourceRefs, [{ sheet: 'Links', row: 1, recordId: 'r1' }]);
    assert.deepEqual(cell.dimensions, {
      pair: 'doctype-work', binding: 'co-mention',
      row: { family: 'doctype', key: 'correspondence', label: 'Korrespondenz' },
      column: { family: 'work', key: 'Tristan', label: 'Tristan' },
    });
    const [exported] = aggregateExportRows([cell]);
    assert.deepEqual(JSON.parse(exported.dimensions), cell.dimensions);
    const visuallySwapped = { ...cell, row: cell.column, column: cell.row };
    assert.equal(visuallySwapped.dimensions.row.family, 'doctype');
    assert.equal(visuallySwapped.dimensions.column.family, 'work');
  });

  test('place and role bind only inside the same source statement', () => {
    const statements = [
      { id: 's1', recordId: 'r1', place: 'Zürich', role: 'mention', roleLabel: 'Erwähnung', xlsxSource: { sheet: 'Links', row: 11 } },
      { id: 's2', recordId: 'r1', place: 'Bayreuth', role: 'performance', roleLabel: 'Aufführungsort', xlsxSource: { sheet: 'Links', row: 12 } },
    ];
    const matrix = aggregateMatrix(store(), new Set(['r1']), 'place-placerole', { placeStatements: statements });
    assert.equal(matrix.cells.some(cell => cell.row.key === 'Zürich' && cell.column.key === 'performance'), false);
    assert.equal(matrix.cells.find(cell => cell.row.key === 'Zürich').count, 1);
  });
});

test('agent-role cells retain the original row and expose missing roles', () => {
  const s = store();
  const alice = { '@type': 'rico:Person', name: 'Alice', role: { '@id': 'm3gim-vocab:composer', 'skos:prefLabel': 'Komponistin' }, ...source('Links', 20) };
  const bob = { '@type': 'rico:Person', name: 'Bob', ...source('Links', 21) };
  s.records.get('r1')['m3gim-ontology:hasAssociatedAgent'] = [alice, bob];
  s.persons = new Map([
    ['Alice', { records: new Set(['r1']) }], ['Bob', { records: new Set(['r1']) }],
  ]);
  const matrix = aggregateMatrix(s, new Set(['r1']), 'agent-agentrole');
  const composer = matrix.cells.find(cell => cell.row.key === 'person:Alice');
  const missing = matrix.cells.find(cell => cell.row.key === 'person:Bob');
  assert.equal(composer.column.key, 'm3gim-vocab:composer');
  assert.deepEqual(composer.sourceRefs, [{ sheet: 'Links', row: 20, recordId: 'r1' }]);
  assert.equal(missing.column.key, '__missing__');
  assert.equal(missing.column.label, 'Ohne erfasste Rolle');
  assert.deepEqual(missing.sourceRefs, [{ sheet: 'Links', row: 21, recordId: 'r1' }]);
});

test('relation matrix keeps explicit relations separate from document co-mentions', () => {
  const s = store();
  const malaniuk = { '@type': 'rico:Person', name: 'Malaniuk, Ira', ...source('Links', 30) };
  const rueger = { '@type': 'rico:Person', name: 'Rüger, Hans', ...source('Links', 31) };
  s.records.get('r1')['m3gim-ontology:hasAssociatedAgent'] = [malaniuk, rueger];
  s.agentRelations = new Map([['r1', [{ type: 'agrelon:HasCorrespondent', objectName: 'Rüger, Hans', ...source('Links', 32) }]]]);
  const matrix = aggregateMatrix(s, new Set(['r1']), 'agent-relation');
  const coMention = matrix.cells.find(cell => cell.binding === 'co-mention');
  const relationship = matrix.cells.find(cell => cell.binding === 'relationship');
  assert.deepEqual(coMention.recordIds, ['r1']);
  assert.equal(coMention.witnesses.length, 2);
  assert.match(relationship.column.label, /explizite Beziehung/);
  assert.deepEqual(relationship.sourceRefs, [{ sheet: 'Links', row: 32, recordId: 'r1' }]);
});

test('time groups each document by one primary anchor and retains undated', () => {
  const bins = aggregateTime(store(), new Set(['r1', 'r2', 'r3']), 'five');
  assert.deepEqual(bins.map(bin => [bin.key, bin.count]), [['1950', 1], ['1955', 1], ['__undated__', 1]]);
});

test('time witnesses point to the selected primary-anchor row', () => {
  const s = store();
  s.recordDatings.set('r1', [{ year: 1951, date: '1951', roleId: 'm3gim-vocab:performance',
    scope: 'm3gim-vocab:attestedDating', rank: 1, origin: 'annotation', ...source('Dates', 9) }]);
  const bin = aggregateTime(s, new Set(['r1'])).find(value => value.key === '1951');
  assert.deepEqual(bin.witnesses[0].source, { sheet: 'Dates', row: 9, recordId: 'r1' });
  assert.deepEqual(bin.sourceRefs, [{ sheet: 'Dates', row: 9, recordId: 'r1' }]);
});

test('Sankey conserves distinct source statements at both stages', () => {
  const statements = [
    { id: 'a', recordId: 'r1', place: 'Wien', role: 'mention', roleLabel: 'Erwähnung', xlsxSource: { sheet: 'Links', row: 10 } },
    { id: 'a-mirror', recordId: 'r1', place: 'Wien', role: 'mention', roleLabel: 'Erwähnung', xlsxSource: { sheet: 'Links', row: 10 } },
    { id: 'b', recordId: 'r2', place: 'Wien', role: 'mention', roleLabel: 'Erwähnung', xlsxSource: { sheet: 'Links', row: 11 } },
  ];
  const model = aggregatePlaceSankey(store(), new Set(['r1', 'r2']), statements);
  assert.equal(model.statementCount, 2);
  const firstStage = model.links.filter(link => link.right.key === 'mention');
  const secondStage = model.links.filter(link => link.left.key === 'mention');
  assert.equal(firstStage.reduce((sum, link) => sum + link.count, 0), 2);
  assert.equal(secondStage.reduce((sum, link) => sum + link.count, 0), 2);
  assert.deepEqual(new Set(model.links.flatMap(link => link.sourceRefs.map(ref => ref.row))), new Set([10, 11]));
});

test('UpSet distinguishes inclusive and exact displayed-set membership', () => {
  const definitions = [
    { facet: 'werk', value: 'Tristan', label: 'Tristan' },
    { facet: 'werk', value: 'Walküre', label: 'Walküre' },
  ];
  const s = store();
  s.works.get('Walküre').records.add('r2');
  const inclusive = aggregateUpSet(s, new Set(['r1', 'r2', 'r3']), definitions, 'inclusive');
  const exclusive = aggregateUpSet(s, new Set(['r1', 'r2', 'r3']), definitions, 'exclusive');
  assert.deepEqual(inclusive.intersections.find(row => row.include.length === 1 && row.include[0].endsWith('Tristan')).recordIds, ['r1', 'r2']);
  assert.deepEqual(exclusive.intersections.find(row => row.include.length === 1 && row.include[0].endsWith('Tristan')).recordIds, ['r1']);
  assert.deepEqual(exclusive.intersections.find(row => row.include.length === 2).recordIds, ['r2']);
  assert.equal(exclusive.intersections.length, 3);
});

test('UpSet retains zero-result combinations', () => {
  const definitions = [
    { facet: 'werk', value: 'Tristan', label: 'Tristan' },
    { facet: 'werk', value: 'Missing', label: 'Missing' },
  ];
  const result = aggregateUpSet(store(), new Set(['r1', 'r2', 'r3']), definitions, 'exclusive');
  assert.equal(result.intersections.length, 3);
  assert.equal(result.intersections.filter(row => row.count === 0).length, 2);
});

test('UpSet set resolution supports shared link-kind facets', () => {
  const s = store();
  s.records.get('r1')['rico:hasOrHadSubject'][0].role = null;
  assert.deepEqual([...idsForSet(s, { facet: 'verknuepfung', value: 'werk:__missing__' },
    new Set(['r1', 'r2']))], ['r1', 'r2']);
});

test('A/B comparison reports denominators, overlap and unavailable empty shares', () => {
  const comparison = aggregateComparison(store(), new Set(['r2', 'r3']), { recordIds: ['r1', 'r2'] }, 'work', 'share');
  assert.equal(comparison.denominatorA, 2); assert.equal(comparison.denominatorB, 2);
  assert.deepEqual(comparison.overlap, ['r2']);
  const empty = aggregateComparison(store(), new Set(), { recordIds: [] }, 'work', 'share');
  assert.equal(empty.rows.length, 0);
});

test('A/B comparison rejects IDs outside the shared frontend universe and keeps witnesses', () => {
  const s = store();
  s.unprocessedIds = new Set(['r4']);
  const comparison = aggregateComparison(s, new Set(['r2', 'r4']),
    { filter: { werk: ['Tristan'] }, recordIds: ['r1', 'r4'] }, 'work', 'count');
  assert.equal(comparison.denominatorA, 1);
  assert.equal(comparison.denominatorB, 1);
  const tristan = comparison.rows.find(row => row.key === 'Tristan');
  assert.deepEqual(tristan.selectionA.sourceRefs, [{ sheet: 'Links', row: 1, recordId: 'r1' }]);
  assert.equal(tristan.selectionA.comparisonSide, 'A');
  assert.deepEqual(tristan.selectionA.referenceFilter, { werk: ['Tristan'] });
});

test('new dashboard aggregates fail closed without an explicit cut', () => {
  const s = store();
  assert.equal(aggregateTreemap(s).count, 0);
  assert.equal(aggregateMatrix(s).cells.length, 0);
  assert.equal(aggregateTime(s).length, 0);
  assert.equal(aggregatePlaceSankey(s, null, [{ recordId: 'r1', place: 'Wien' }]).statementCount, 0);
  assert.equal(aggregateUpSet(s, null, [{ facet: 'werk', value: 'Tristan' }]).denominator, 0);
  assert.equal(aggregateComparison(s, null, { recordIds: ['r1'] }).denominatorA, 0);
});

test('dataset fingerprint changes when content changes without changing record IDs', () => {
  const s = store();
  const before = datasetFingerprint(s);
  s.records.get('r1')['rico:title'] = 'Changed title';
  assert.notEqual(datasetFingerprint(s), before);
});

test('aggregate export repeats complete source references with declared unit and denominator', () => {
  const rows = aggregateExportRows([{ key: 'x', label: 'X', unit: 'statements', count: 2,
    denominator: 5, recordIds: ['r1'], descriptor: { type: 'records', ids: ['r1'] },
    row: { key: 'work', label: 'Werk' }, binding: 'co-mention', comparisonSide: 'A',
    denominatorA: 5, denominatorB: 3, referenceFilter: { werk: ['Tristan'] },
    witnesses: [{ kind: 'work', key: 'Tristan', label: 'Tristan', recordId: 'r1',
      source: { sheet: 'Links', row: 1, recordId: 'r1' }, sourceKey: '["Links",1,null]' }],
    sourceRefs: [{ sheet: 'Links', row: 1, recordId: 'r1' }, { sheet: 'Links', row: 2, recordId: 'r1' }] }],
  { filter: { ort: ['Wien'] }, fingerprint: '4-abcd' });
  assert.deepEqual(rows.map(row => row.sourceRow), [1, 2]);
  assert.ok(rows.every(row => row.unit === 'statements' && row.numerator === 2 && row.denominator === 5));
  assert.ok(rows.every(row => row.dataset === '4-abcd' && row.filter.includes('Wien')));
  assert.equal(rows[0].witnessRecordId, 'r1');
  assert.equal(rows[0].sourceRecordId, 'r1');
  assert.match(rows[0].descriptor, /records/);
  assert.match(rows[0].dimensions, /co-mention/);
  assert.equal(rows[0].comparisonSide, 'A');
  assert.match(rows[0].referenceFilter, /Tristan/);
  assert.equal(rows[0].denominatorA, 5);
});
