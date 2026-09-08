import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartCoverageSummary } from '../../docs/js/views/dashboard-coverage.js';

test('coverage counts distinct documents in B despite duplicate cells and reference-only A records', () => {
  const result = chartCoverageSummary({ cutIds: ['r1', 'r2'], aggregates: [
    { recordIds: ['r1', 'reference'] }, { recordIds: ['r1'] },
  ] }, ['reference']);
  assert.match(result.overview, /^1 von 2 Dokumente/);
  assert.match(result.selection, /1 Dokument außerhalb des aktuellen Filters/);
  assert.match(result.selection, /^Auswahl: 1 von 1 Dokument in dieser Auswertung/);
  assert.doesNotMatch(result.selection, /ohne Eintrag/);
});

test('missing work, missing pair binding and local paging have distinct explanations', () => {
  const model = { cutIds: ['no-work', 'unbound', 'paged', 'shown'],
    aggregates: [{ recordIds: ['paged', 'shown'] }],
    coverage: { dimensions: [{ label: 'Werkangabe', recordIds: ['unbound', 'paged', 'shown'] }],
      visibleRecordIds: ['shown'] } };
  assert.match(chartCoverageSummary(model, ['no-work']).selection, /1 Dokument ohne Werkangabe/);
  assert.match(chartCoverageSummary(model, ['unbound']).selection, /keine passende Verbindung/);
  const paging = chartCoverageSummary(model, ['paged']).selection;
  assert.match(paging, /außerhalb der angezeigten Zeilen oder Spalten/);
  assert.doesNotMatch(paging, /ohne Werkangabe|keine passende Verbindung/);
  assert.equal(chartCoverageSummary(model, []).selection, '');
});
