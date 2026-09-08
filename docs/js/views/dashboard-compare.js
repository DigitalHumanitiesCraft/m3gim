import { el, clear } from '../utils/dom.js';
import { aggregateComparison } from './statistik-data.js';
import { svgEl, bindSvgAction, appendAccessibleList, emptyState, setHighlighted } from './dashboard-shared.js';

export function renderComparison(host, context) {
  clear(host);
  if (!context.reference) {
    emptyState(host, 'Für den Vergleich fehlt Referenz A. „Aktuellen Schnitt als A merken“ legt eine unveränderliche Referenz an.');
    return { aggregates: [], destroy() { clear(host); } };
  }
  const dimension = context.config.dimension || 'work';
  const measure = context.config.measure || 'count';
  const model = aggregateComparison(context.store, context.cutIds, context.reference, dimension, measure,
    { placeStatements: context.placeStatements });
  const focused = context.config.focus || null;
  const rows = (focused ? model.rows.filter(row => row.key === focused) : model.rows)
    .slice(0, context.config.expanded ? model.rows.length : 24);
  if (!rows.length) {
    emptyState(host, 'Weder Referenz A noch Auswahl B enthält Werte dieser Dimension.');
    return { aggregates: [], destroy() { clear(host); } };
  }
  const width = 720, rowHeight = 32, labelWidth = 235, height = 35 + rows.length * rowHeight;
  const values = rows.flatMap(row => [row.valueA, row.valueB]).filter(value => value != null);
  const max = Math.max(...values, measure === 'share' ? 1 : 1);
  const x = value => labelWidth + (width - labelWidth - 40) * value / max;
  const svg = svgEl('svg', { class: 'dashboard-svg dashboard-compare', viewBox: `0 0 ${width} ${height}`,
    role: 'group', 'aria-label': `A/B-Vergleich. Referenz A ${model.denominatorA}, Auswahl B ${model.denominatorB} Dokumente.` });
  rows.forEach((row, index) => {
    const y = 27 + index * rowHeight;
    const shortLabel = row.label.length > 34 ? `${row.label.slice(0, 33)}…` : row.label;
    svg.appendChild(svgEl('text', { x: 4, y: y + 4, class: 'dashboard-compare__label',
      'aria-label': row.label }, shortLabel));
    if (row.valueA != null && row.valueB != null) svg.appendChild(svgEl('line', { x1: x(row.valueA), x2: x(row.valueB), y1: y, y2: y,
      stroke: 'var(--line-strong)', 'stroke-width': 2 }));
    const equal = row.valueA != null && row.valueB != null && row.valueA === row.valueB;
    for (const [side, value, aggregate, color] of [['A', row.valueA, row.selectionA, 'var(--cat-2)'], ['B', row.valueB, row.selectionB, 'var(--accent)']]) {
      if (value == null) continue;
      const mark = svgEl('g', { class: 'dashboard-mark dashboard-compare__dot' });
      mark.append(svgEl('circle', { cx: x(value), cy: y, r: equal && side === 'A' ? 8 : equal ? 4 : 6,
        fill: equal && side === 'A' ? 'none' : color, stroke: color, 'stroke-width': equal && side === 'A' ? 3 : 1 }));
      if (!equal) mark.append(svgEl('text', { x: x(value), y: side === 'A' ? y - 9 : y + 17,
        'text-anchor': 'middle', class: 'dashboard-compare__value' },
      measure === 'share' ? `${side} ${Math.round(value * 100)} %` : `${side} ${value}`));
      setHighlighted(mark, aggregate, context.highlightedIds); bindSvgAction(mark, aggregate, context); svg.appendChild(mark);
    }
    if (equal) svg.appendChild(svgEl('text', { x: x(row.valueA), y: y - 11,
      'text-anchor': 'middle', class: 'dashboard-compare__value' },
    measure === 'share' ? `A = B ${Math.round(row.valueA * 100)} %` : `A = B ${row.valueA}`));
  });
  host.appendChild(el('div', { className: 'dashboard-drawing' }, svg));
  host.appendChild(el('p', { className: 'dashboard-note' },
    `Referenz A: ${model.denominatorA} Dokumente. Auswahl B: ${model.denominatorB} Dokumente. Überschneidung: ${model.overlap.length}.`
      + (context.reference.stale ? ' Die Referenz wurde wegen eines geänderten Datenstands neu berechnet.' : '')));
  if (focused) host.appendChild(el('button', { type: 'button', className: 'ui-action dashboard-overview',
    onClick: () => context.onConfig({ focus: null }) }, 'Alle Vergleichswerte'));
  else {
    const focusControls = el('div', { className: 'dashboard-local-focus' });
    const select = el('select', { className: 'ui-select dashboard-panel__select', 'aria-label': 'Kategorie für lokalen Vergleichsfokus' });
    for (const row of model.rows) select.appendChild(el('option', { value: row.key }, row.label));
    focusControls.append(select, el('button', { type: 'button', className: 'ui-action', onClick: () => context.onConfig({ focus: select.value }) }, 'Kategorie lokal fokussieren'));
    host.appendChild(focusControls);
  }
  if (!context.config.expanded && model.rows.length > rows.length) host.appendChild(el('button', { type: 'button',
    className: 'ui-action dashboard-overview', onClick: () => context.onConfig({ expanded: true }) }, `Alle ${model.rows.length} Werte`));
  if (context.config.expanded) host.appendChild(el('button', { type: 'button',
    className: 'ui-action dashboard-overview', onClick: () => context.onConfig({ expanded: false }) }, 'Kompakte Übersicht'));
  const allAggregates = model.rows.flatMap(row => [row.selectionA, row.selectionB, row.selectionOverlap]);
  appendAccessibleList(host, allAggregates, context);
  return { aggregates: allAggregates, destroy() { clear(host); } };
}
