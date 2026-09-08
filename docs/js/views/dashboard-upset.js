import { el, clear } from '../utils/dom.js';
import { aggregateUpSet } from './statistik-data.js';
import { svgEl, bindSvgAction, appendAccessibleList, emptyState, setHighlighted } from './dashboard-shared.js';

export function defaultUpSetDefinitions(store, cutIds) {
  return [...(store.works || new Map())]
    .map(([value, entry]) => ({ facet: 'werk', value, label: value,
      count: [...entry.records].filter(id => cutIds.has(id)).length }))
    .filter(value => value.count).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'))
    .slice(0, 3).map(({ count, ...definition }) => definition);
}

export function renderUpSet(host, context) {
  clear(host);
  const definitions = Array.isArray(context.config.sets) ? context.config.sets
    : defaultUpSetDefinitions(context.store, context.cutIds);
  const mode = context.config.mode || 'inclusive';
  const model = aggregateUpSet(context.store, context.cutIds, definitions, mode);
  if (!model.intersections.length) {
    emptyState(host, 'Füge im Panelkopf Mengen hinzu, um ihre Überschneidungen zu untersuchen.');
    return { aggregates: [], destroy() { clear(host); } };
  }
  const focus = context.config.focus || null;
  const intersections = focus ? model.intersections.filter(item => item.key === focus)
    : model.intersections.slice(0, context.config.expanded ? model.intersections.length : 24);
  const familyLabels = { werk: 'Werk', person: 'Person', institution: 'Institution',
    ort: 'Ort', docType: 'Dokumenttyp', verknuepfung: 'Verknüpfung' };
  const legend = el('ol', { className: 'dashboard-note dashboard-upset__sets', 'aria-label': 'Dargestellte Mengen' });
  for (const set of model.sets) legend.appendChild(el('li', {},
    `${familyLabels[set.facet] || 'Menge'}: ${set.label} · ${set.ids.size} Dokumente`));
  host.appendChild(legend);
  const width = 720, rowHeight = 31, barStart = 195;
  const height = 53 + intersections.length * rowHeight;
  const svg = svgEl('svg', { class: 'dashboard-svg dashboard-upset', viewBox: `0 0 ${width} ${height}`,
    role: 'group', 'aria-label': `Mengenschnittdiagramm. ${intersections.length} Kombinationen. Gefüllte Punkte gehören zum Schnitt. Die vollständige Werteliste darunter ist mit der Tastatur bedienbar.` });
  svg.appendChild(svgEl('text', { x: 12, y: 14, class: 'dashboard-upset__label' }, 'Mengen'));
  svg.appendChild(svgEl('text', { x: barStart, y: 14, class: 'dashboard-upset__label' }, 'Dokumente im Schnitt'));
  const setX = index => 24 + index * 32;
  model.sets.forEach((set, index) => svg.appendChild(svgEl('text', {
    x: setX(index), y: 33, 'text-anchor': 'middle', class: 'dashboard-upset__label',
  }, String(index + 1))));
  const max = Math.max(...intersections.map(item => item.count), 1);
  intersections.forEach((item, index) => {
    const y = 54 + index * rowHeight;
    const group = svgEl('g', { class: 'dashboard-mark dashboard-upset__row' });
    const included = model.sets.map((set, setIndex) => item.include.includes(set.key) ? setIndex : null)
      .filter(setIndex => setIndex !== null);
    if (included.length > 1) group.append(svgEl('line', {
      x1: setX(included[0]), x2: setX(included.at(-1)), y1: y - 3, y2: y - 3,
      stroke: 'var(--accent-dark)', 'stroke-width': 2,
    }));
    model.sets.forEach((set, setIndex) => group.append(svgEl('circle', {
      class: 'dashboard-upset__membership', 'data-set-key': set.key,
      'data-included': String(included.includes(setIndex)),
      cx: setX(setIndex), cy: y - 3, r: 5,
      fill: included.includes(setIndex) ? 'var(--accent-dark)' : 'var(--surface-3)',
      stroke: included.includes(setIndex) ? 'var(--accent-dark)' : 'var(--line-strong)',
    })));
    group.append(svgEl('rect', { x: barStart, y: y - 12, width: (width - barStart - 45) * item.count / max,
      height: 18, fill: 'var(--accent-muted)' }));
    group.append(svgEl('text', { x: width - 8, y, 'text-anchor': 'end', class: 'dashboard-upset__count' }, String(item.count)));
    setHighlighted(group, item, context.highlightedIds); bindSvgAction(group, item, context); svg.appendChild(group);
  });
  host.appendChild(el('div', { className: 'dashboard-drawing' }, svg));
  if (!focus && model.intersections.length > 24) host.appendChild(el('button', {
    type: 'button', className: 'ui-action dashboard-overview',
    onClick: () => context.onConfig({ expanded: !context.config.expanded }),
  }, context.config.expanded ? 'Kompakte Übersicht' : `Alle ${model.intersections.length} Kombinationen`));
  if (focus) host.appendChild(el('button', { type: 'button', className: 'ui-action dashboard-overview',
    onClick: () => context.onConfig({ focus: null }) }, 'Alle Kombinationen'));
  else {
    const focusControls = el('div', { className: 'dashboard-local-focus' });
    const select = el('select', { className: 'ui-select dashboard-panel__select', 'aria-label': 'Mengenkombination für lokalen Fokus' });
    for (const item of model.intersections) select.appendChild(el('option', { value: item.key }, `${item.label} · ${item.count}`));
    focusControls.append(select, el('button', { type: 'button', className: 'ui-action', onClick: () => context.onConfig({ focus: select.value }) }, 'Kombination lokal fokussieren'));
    host.appendChild(focusControls);
  }
  host.appendChild(el('p', { className: 'dashboard-note' }, mode === 'exclusive'
    ? 'Exklusiv: Dokumente gehören genau zu den markierten Mengen unter den dargestellten Mengen.'
    : 'Inklusiv: Dokumente gehören mindestens zu allen markierten Mengen; weitere Zugehörigkeiten sind möglich.'));
  appendAccessibleList(host, model.intersections, context);
  return { aggregates: model.intersections, destroy() { clear(host); } };
}
