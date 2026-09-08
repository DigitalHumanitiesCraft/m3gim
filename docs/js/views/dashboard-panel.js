import { el, clear } from '../utils/dom.js';
import { getFilter } from '../ui/filter-state.js';
import { facetInventory } from '../data/records-for.js';
import { linkRoleInventory } from '../data/query-evidence.js';
import { MATRIX_PAIRS, aggregateExportRows, idsForSet } from './statistik-data.js';
import { downloadCsv, chartStatus } from './dashboard-shared.js';
import { renderTreemap } from './dashboard-treemap.js';
import { renderMatrix } from './dashboard-matrix.js';
import { renderTime } from './dashboard-time.js';
import { renderSankey } from './dashboard-sankey.js';
import { renderUpSet } from './dashboard-upset.js';
import { renderComparison } from './dashboard-compare.js';
import { renderPlaceMap } from './dashboard-map.js';

export const CHARTS = Object.freeze([
  { id: 'treemap', label: 'Dokumenttypen-Treemap', render: renderTreemap, unit: 'Dokumente' },
  { id: 'matrix', label: 'Matrix', render: renderMatrix, unit: 'Dokumente' },
  { id: 'time', label: 'Zeitverteilung', render: renderTime, unit: 'Dokumente' },
  { id: 'sankey', label: 'Ortsaussagen-Sankey', render: renderSankey, unit: 'Ortsaussagen' },
  { id: 'upset', label: 'Mengenschnitte (UpSet)', render: renderUpSet, unit: 'Dokumente' },
  { id: 'comparison', label: 'A/B-Vergleich', render: renderComparison, unit: 'Dokumente oder Anteil' },
  { id: 'map', label: 'Ortskarte', render: renderPlaceMap, unit: 'Dokumente' },
]);

const DEFAULTS = Object.freeze({
  treemap: { path: [] }, matrix: { pair: 'doctype-work', measure: 'count', sort: 'count', page: 0, columnPage: 0, rows: [], columns: [], swapped: false },
  time: { grouping: 'year', range: null }, sankey: { focus: null },
  upset: { mode: 'inclusive', sets: [
    { facet: 'verknuepfung', value: 'person', label: 'Personenverknüpfung' },
    { facet: 'verknuepfung', value: 'institution', label: 'Institutionsverknüpfung' },
    { facet: 'verknuepfung', value: 'werk', label: 'Werkverknüpfung' },
  ] }, comparison: { dimension: 'work', measure: 'count', expanded: false }, map: {},
});

export function normalizePanelConfig(value, fallbackChart) {
  const chart = CHARTS.some(item => item.id === value?.chart) ? value.chart : fallbackChart;
  return { chart, config: { ...DEFAULTS[chart], ...(value?.config || {}) } };
}

function selectControl(label, value, values, onChange) {
  const select = el('select', { className: 'dashboard-panel__select', 'aria-label': label,
    onChange: event => onChange(event.currentTarget.value) });
  for (const item of values) {
    const option = el('option', { value: item.id }, item.label);
    option.selected = item.id === value; select.appendChild(option);
  }
  return select;
}

function specificControls(panel, state, context) {
  const controls = [];
  const change = patch => panel.setConfig({ ...state.config, ...patch });
  if (state.chart === 'matrix') {
    controls.push(selectControl('Dimensionspaar', state.config.pair, MATRIX_PAIRS,
      pair => change({ pair, page: 0, columnPage: 0, rows: [], columns: [] })));
    controls.push(selectControl('Matrixmaß', state.config.measure, [
      { id: 'count', label: 'Anzahl' }, { id: 'row-share', label: 'Zeilenanteil' },
    ], measure => change({ measure })));
    controls.push(selectControl('Matrixsortierung', state.config.sort, [
      { id: 'count', label: 'Nach Anzahl' }, { id: 'label', label: 'Alphabetisch' },
    ], sort => change({ sort })));
    controls.push(el('button', { type: 'button', className: 'dashboard-panel__action',
      onClick: () => change({ swapped: !state.config.swapped, page: 0, columnPage: 0, rows: [], columns: [] }) }, 'Achsen tauschen'));
  }
  if (state.chart === 'time') {
    controls.push(selectControl('Zeitgruppierung', state.config.grouping, [
      { id: 'year', label: 'Jahr' }, { id: 'five', label: 'Fünf Jahre' }, { id: 'decade', label: 'Jahrzehnt' },
    ], grouping => change({ grouping, range: null })));
    controls.push(selectControl('Zeitaufteilung', state.config.stack || 'none', [
      { id: 'none', label: 'Gesamt' }, { id: 'doctype', label: 'Nach Dokumenttyp' },
    ], stack => change({ stack: stack === 'none' ? null : stack })));
  }
  if (state.chart === 'upset') {
    controls.push(selectControl('Schnittmodus', state.config.mode, [
      { id: 'inclusive', label: 'Inklusiv' }, { id: 'exclusive', label: 'Exklusiv' },
    ], mode => change({ mode })));
    const family = state.config.setFacet || 'werk';
    const familyControl = selectControl('Familie der neuen Mengenbedingung', family, [
      { id: 'werk', label: 'Werke' }, { id: 'person', label: 'Personen' },
      { id: 'institution', label: 'Institutionen' }, { id: 'ort', label: 'Orte' },
      { id: 'docType', label: 'Dokumenttypen' }, { id: 'verknuepfung', label: 'Linkarten' },
    ], next => change({ setFacet: next }));
    controls.push(familyControl);
    let options = family === 'verknuepfung'
      ? linkRoleInventory(context.store, context.cutIds).map(item => ({
        name: item.value, label: `${item.type} · ${item.label}`, count: item.count,
      }))
      : facetInventory(context.store, family).map(item => ({
        name: item.value, label: item.label,
        count: idsForSet(context.store, { facet: family, value: item.value }, context.cutIds).size,
      }));
    options = options.filter(item => item.count);
    options.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'));
    const valueSelect = el('select', { className: 'dashboard-panel__sets',
      'aria-label': 'Wert der neuen Mengenbedingung' });
    for (const item of options) valueSelect.appendChild(el('option', { value: item.name }, `${item.label} · ${item.count}`));
    const addSet = el('button', { type: 'button', className: 'dashboard-panel__action', onClick: () => {
        const sets = state.config.sets || [];
        if (sets.length >= 5 || sets.some(item => item.facet === family && item.value === valueSelect.value)) return;
        const label = options.find(item => item.name === valueSelect.value)?.label || valueSelect.value;
        change({ sets: [...sets, { facet: family, value: valueSelect.value, label }] });
      } }, 'Menge hinzufügen');
    addSet.disabled = options.length === 0;
    controls.push(valueSelect, addSet);
    for (const [index, item] of (state.config.sets || []).entries()) controls.push(el('button', {
      type: 'button', className: 'dashboard-panel__set-chip',
      'aria-label': `${item.label || item.value} aus den Mengen entfernen`,
      onClick: () => change({ sets: state.config.sets.filter((_, itemIndex) => itemIndex !== index) }),
    }, `${item.label || item.value} ×`));
  }
  if (state.chart === 'comparison') {
    controls.push(selectControl('Vergleichsdimension', state.config.dimension, [
      { id: 'work', label: 'Werke' }, { id: 'composer', label: 'Komponisten' },
      { id: 'place', label: 'Orte' }, { id: 'institution', label: 'Institutionen' },
      { id: 'doctype', label: 'Dokumenttypen' },
    ], dimension => change({ dimension })));
    controls.push(selectControl('Vergleichsmaß', state.config.measure, [
      { id: 'count', label: 'Anzahl' }, { id: 'share', label: 'Anteil' },
    ], measure => change({ measure })));
    controls.push(el('button', { type: 'button', className: 'dashboard-panel__action', onClick: context.pinReference },
      context.reference ? 'Referenz A ersetzen' : 'Aktuellen Schnitt als A merken'));
    if (context.reference) controls.push(
      el('button', { type: 'button', className: 'dashboard-panel__action', onClick: context.applyReference }, 'Referenz A als aktiven Filter setzen'),
      el('button', { type: 'button', className: 'dashboard-panel__action', onClick: context.clearReference }, 'Referenz A löschen'));
  }
  return controls;
}

export function createDashboardPanel({ id, host, initial, context, onState }) {
  let state = normalizePanelConfig(initial, id === 'a' ? 'treemap' : 'matrix');
  let current = null;
  const section = el('section', { className: 'dashboard-panel', tabindex: '-1', dataset: { panelId: id } });
  host.appendChild(section);

  const panel = {
    setConfig(config) { state = normalizePanelConfig({ chart: state.chart, config }, state.chart); onState(state); draw(); },
    setState(next) { state = normalizePanelConfig(next, id === 'a' ? 'treemap' : 'matrix'); draw(); },
    highlight(ids) {
      current?.highlight?.(ids);
      for (const node of section.querySelectorAll('.dashboard-mark, .dashboard-matrix__cell')) {
        const aggregate = node._dashboardAggregate;
        node.classList.toggle('dashboard-mark--highlighted', !!aggregate
          && (aggregate.recordIds || []).some(recordId => ids.has(recordId)));
      }
    },
    draw,
    destroy() { current?.destroy(); section.remove(); },
    get state() { return state; },
  };

  function draw() {
    context.retargetSelection?.(section);
    current?.destroy(); clear(section);
    const chart = CHARTS.find(item => item.id === state.chart) || CHARTS[0];
    const header = el('header', { className: 'dashboard-panel__head' });
    header.appendChild(selectControl(`Diagramm in Panel ${id.toUpperCase()}`, chart.id, CHARTS, next => {
      state = normalizePanelConfig({ chart: next, config: DEFAULTS[next] }, next); onState(state); draw();
      section.querySelector('.dashboard-panel__select')?.focus({ preventScroll: true });
    }));
    for (const control of specificControls(panel, state, context)) header.appendChild(control);
    header.appendChild(el('span', { className: 'dashboard-panel__unit' }, `Einheit: ${chart.unit}`));
    const reset = el('button', { type: 'button', className: 'dashboard-panel__action',
      onClick: () => { state = normalizePanelConfig({ chart: state.chart, config: DEFAULTS[state.chart] }, state.chart); onState(state); draw(); } }, 'Ansicht zurücksetzen');
    header.appendChild(reset);
    const body = el('div', { className: 'dashboard-panel__body' });
    section.append(header, body);
    current = chart.render(body, { ...context, config: state.config,
      highlightedIds: context.getHighlighted(), onConfig: patch => panel.setConfig({ ...state.config, ...patch }) });
    const aggregates = current.aggregates || [];
    const exportButton = el('button', { type: 'button', className: 'dashboard-panel__action',
      onClick: () => downloadCsv(`m3gim-dashboard-panel-${id}.csv`,
        aggregateExportRows(aggregates, { filter: getFilter(), fingerprint: context.fingerprint })) }, 'Aggregat CSV');
    exportButton.disabled = aggregates.length === 0; header.appendChild(exportButton);
    body.prepend(chartStatus(`${aggregates.length} auswählbare Werte im aktuellen Schnitt.`));
  }

  draw();
  return panel;
}
