import { el, clear } from '../utils/dom.js';
import { aggregateMatrix, MATRIX_PAIRS } from './statistik-data.js';
import { appendAccessibleList, emptyState, selectionIntersects, unitLabel } from './dashboard-shared.js';

const PAGE = 14;
const DIMENSION_LABELS = Object.freeze({
  doctype: 'Dokumenttyp', time: 'Zeit', work: 'Werk', composer: 'Komponist',
  stagepart: 'Bühnenrolle', person: 'Person', institution: 'Institution',
  place: 'Ort', country: 'Land', placerole: 'Ortsrolle', agent: 'Akteur', agentrole: 'Akteursrolle',
  counterpart: 'Gegenüber und Bindungsart',
});
const MISSING_LABELS = Object.freeze({
  doctype: 'Dokumenttyp', time: 'Zeitangabe', work: 'Werkangabe', composer: 'Komponistenangabe',
  stagepart: 'Bühnenrolle', person: 'Personenangabe', institution: 'Institutionsangabe',
  place: 'Ortsangabe', country: 'Landesangabe', placerole: 'Ortsrolle',
});

function axisAggregate(cells, axis, value, denominator, pair) {
  const selected = cells.filter(cell => cell[axis].key === value.key);
  const recordIds = [...new Set(selected.flatMap(cell => cell.recordIds))].sort();
  const witnesses = selected.flatMap(cell => cell.witnesses || []);
  const sourceRefs = selected.flatMap(cell => cell.sourceRefs || []);
  return { key: `${axis}:${value.key}`, label: value.label, recordIds, count: recordIds.length,
    unit: 'documents', denominator, witnesses, sourceRefs, descriptor: { type: 'records', ids: recordIds },
    dimensions: { pair: pair.id, binding: pair.binding, [pair[axis]]: value.key } };
}

export function renderMatrix(host, context) {
  clear(host);
  const pairId = context.config.pair || MATRIX_PAIRS[0].id;
  const data = aggregateMatrix(context.store, context.cutIds, pairId,
    { placeStatements: context.placeStatements });
  const coverage = { dimensions: data.dimensions.map(item => ({
    label: MISSING_LABELS[item.dimension], recordIds: item.recordIds,
  })) };
  if (!data.cells.length) {
    emptyState(host, 'Für dieses Dimensionspaar liegen im aktuellen Schnitt keine belegten Zellen vor.');
    return { aggregates: [], coverage, destroy() { clear(host); } };
  }
  if (context.config.swapped) {
    data.cells = data.cells.map(cell => ({ ...cell, row: cell.column, column: cell.row }));
    [data.rows, data.columns] = [data.columns, data.rows];
    data.pair = { ...data.pair, row: data.pair.column, column: data.pair.row };
  }
  for (const cell of data.cells) cell.dimensions ||= {
    pair: data.pair.id, binding: cell.binding,
    [data.pair.row]: cell.row.key, [data.pair.column]: cell.column.key,
  };
  const rowRecords = new Map(), colRecords = new Map();
  for (const cell of data.cells) {
    if (!rowRecords.has(cell.row.key)) rowRecords.set(cell.row.key, new Set());
    if (!colRecords.has(cell.column.key)) colRecords.set(cell.column.key, new Set());
    cell.recordIds.forEach(id => { rowRecords.get(cell.row.key).add(id); colRecords.get(cell.column.key).add(id); });
  }
  const rowTotals = new Map([...rowRecords].map(([key, ids]) => [key, ids.size]));
  const colTotals = new Map([...colRecords].map(([key, ids]) => [key, ids.size]));
  const sort = context.config.sort || 'count';
  const sorter = totals => (a, b) => sort === 'label'
    ? a.label.localeCompare(b.label, 'de') : (totals.get(b.key) - totals.get(a.key)) || a.label.localeCompare(b.label, 'de');
  const rows = [...data.rows].sort(sorter(rowTotals));
  const columns = [...data.columns].sort(sorter(colTotals));
  const page = Math.max(0, Math.min(Math.floor(Number(context.config.page) || 0), Math.ceil(rows.length / PAGE) - 1));
  const columnPage = Math.max(0, Math.min(Math.floor(Number(context.config.columnPage) || 0), Math.ceil(columns.length / PAGE) - 1));
  const focusedRows = Array.isArray(context.config.rows) ? context.config.rows : [];
  const shownRows = focusedRows.length ? rows.filter(row => focusedRows.includes(row.key)) : rows.slice(page * PAGE, (page + 1) * PAGE);
  const focusedColumns = Array.isArray(context.config.columns) ? context.config.columns : [];
  const shownColumns = focusedColumns.length ? columns.filter(column => focusedColumns.includes(column.key))
    : columns.slice(columnPage * PAGE, (columnPage + 1) * PAGE);
  const rowKeys = new Set(shownRows.map(row => row.key));
  const columnKeys = new Set(shownColumns.map(column => column.key));
  coverage.visibleRecordIds = [...new Set(data.cells.filter(cell => rowKeys.has(cell.row.key)
    && columnKeys.has(cell.column.key)).flatMap(cell => cell.recordIds))];
  const measure = context.config.measure || 'count';
  const table = el('table', { className: 'dashboard-matrix' });
  const head = el('tr', {}, el('th', { scope: 'col' }, DIMENSION_LABELS[data.pair.row] || data.pair.row));
  shownColumns.forEach(column => {
    const aggregate = axisAggregate(data.cells, 'column', column, data.denominator, data.pair);
    const button = el('button', { type: 'button', className: 'dashboard-matrix__axis',
      dataset: { tip: `${column.label}: ${aggregate.count} ${unitLabel('documents', aggregate.count)}`, tipWrap: '' },
      'aria-label': `${column.label}: ${aggregate.count} ${unitLabel('documents', aggregate.count)}`, onClick: () => context.onSelect(aggregate, button) }, column.label);
    button._dashboardAggregate = aggregate;
    head.appendChild(el('th', { scope: 'col' }, button,
      el('button', { type: 'button', className: 'dashboard-matrix__focus',
        'aria-label': `${column.label} lokal fokussieren`, onClick: () => context.onConfig({ columns: [column.key], columnPage: 0 }) }, '↘')));
  });
  table.appendChild(el('thead', {}, head));
  const body = el('tbody');
  for (const row of shownRows) {
    const aggregate = axisAggregate(data.cells, 'row', row, data.denominator, data.pair);
    const axisButton = el('button', { type: 'button', className: 'dashboard-matrix__axis',
      dataset: { tip: `${row.label}: ${aggregate.count} ${unitLabel('documents', aggregate.count)}`, tipWrap: '' },
      'aria-label': `${row.label}: ${aggregate.count} ${unitLabel('documents', aggregate.count)}`, onClick: () => context.onSelect(aggregate, axisButton) }, row.label);
    axisButton._dashboardAggregate = aggregate;
    const tr = el('tr', {}, el('th', { scope: 'row' }, axisButton,
      el('button', { type: 'button', className: 'dashboard-matrix__focus',
        'aria-label': `${row.label} lokal fokussieren`, onClick: () => context.onConfig({ rows: [row.key], page: 0 }) }, '↘')));
    for (const column of shownColumns) {
      const cell = data.cells.find(value => value.row.key === row.key && value.column.key === column.key);
      if (!cell) { tr.appendChild(el('td', { className: 'dashboard-matrix__empty' }, '–')); continue; }
      const value = measure === 'row-share' ? cell.count / Math.max(1, rowTotals.get(row.key)) : cell.count;
      const text = measure === 'row-share' ? `${Math.round(value * 100)} %` : String(value);
      const maxCell = Math.max(...data.cells.map(item => item.count), 1);
      const quantile = Math.max(1, Math.ceil(5 * cell.count / maxCell));
      const button = el('button', { type: 'button', className: `dashboard-matrix__cell dashboard-matrix__cell--q${quantile}`,
        dataset: { tip: `${cell.label}; ${cell.binding === 'co-mention' ? 'Dokument-Co-Mention' : cell.binding}`, tipWrap: '' },
        'aria-label': `${cell.label}: ${text}`,
        onClick: () => context.onSelect(cell, button) }, text);
      button._dashboardAggregate = cell;
      if (selectionIntersects(cell, context.highlightedIds)) button.classList.add('dashboard-mark--highlighted');
      tr.appendChild(el('td', {}, button));
    }
    body.appendChild(tr);
  }
  table.appendChild(body);
  host.appendChild(el('div', { className: 'dashboard-matrix-wrap' }, table));
  const controls = el('div', { className: 'dashboard-local-focus' });
  if (!focusedRows.length && page > 0) controls.appendChild(el('button', { type: 'button', className: 'ui-action', onClick: () => context.onConfig({ page: page - 1 }) }, 'Vorige Zeilen'));
  if (!focusedRows.length && (page + 1) * PAGE < rows.length) controls.appendChild(el('button', { type: 'button', className: 'ui-action', onClick: () => context.onConfig({ page: page + 1 }) }, 'Weitere Zeilen'));
  if (!focusedColumns.length && columnPage > 0) controls.appendChild(el('button', { type: 'button', className: 'ui-action', onClick: () => context.onConfig({ columnPage: columnPage - 1 }) }, 'Vorige Spalten'));
  if (!focusedColumns.length && (columnPage + 1) * PAGE < columns.length) controls.appendChild(el('button', { type: 'button', className: 'ui-action', onClick: () => context.onConfig({ columnPage: columnPage + 1 }) }, 'Weitere Spalten'));
  if (focusedRows.length) controls.appendChild(el('button', { type: 'button', className: 'ui-action', onClick: () => context.onConfig({ rows: [] }) }, 'Alle Zeilen'));
  if (focusedColumns.length) controls.appendChild(el('button', { type: 'button', className: 'ui-action', onClick: () => context.onConfig({ columns: [] }) }, 'Alle Spalten'));
  if (controls.childNodes.length) host.appendChild(controls);
  const bindingNote = data.pair.binding === 'co-mention'
    ? 'Die Zellen verbinden getrennt belegte Dimensionen innerhalb desselben Dokuments.'
    : data.pair.binding === 'explicit-vs-co-mention'
      ? 'Explizite Beziehungen und Dokument-Co-Mentionen historisch belegter Akteurspaare bleiben als getrennte Spalten sichtbar.'
      : 'Die Zellen beruhen auf der angegebenen Bindung; abgeleitete Werk-Partie-Zuordnungen sind in den Belegen gekennzeichnet.';
  host.appendChild(el('p', { className: 'dashboard-note' }, bindingNote));
  const axes = [...rows.map(row => axisAggregate(data.cells, 'row', row, data.denominator, data.pair)),
    ...columns.map(column => axisAggregate(data.cells, 'column', column, data.denominator, data.pair))];
  appendAccessibleList(host, [...axes, ...data.cells], context);
  return { aggregates: [...axes, ...data.cells], coverage, destroy() { clear(host); } };
}
