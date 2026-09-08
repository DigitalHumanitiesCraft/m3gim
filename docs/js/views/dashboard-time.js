import { el, clear } from '../utils/dom.js';
import { setFilter } from '../ui/filter-state.js';
import { facetInventory } from '../data/records-for.js';
import { aggregateTime } from './statistik-data.js';
import {
  CHART_COLORS, svgEl, bindSvgAction, appendAccessibleList, emptyState, setHighlighted,
} from './dashboard-shared.js';

function spanOf(grouping) {
  return grouping === 'decade' ? 10 : grouping === 'five' ? 5 : 1;
}

function stableColorScale(store) {
  const keys = facetInventory(store, 'docType').map(item => String(item.value))
    .concat('__missing__').filter((key, index, values) => values.indexOf(key) === index)
    .sort((a, b) => a.localeCompare(b, 'de'));
  return key => {
    const index = Math.max(0, keys.indexOf(String(key)));
    const base = CHART_COLORS[index % CHART_COLORS.length];
    const variant = Math.floor(index / CHART_COLORS.length) % 3;
    if (variant === 1) return `color-mix(in srgb, ${base} 68%, var(--surface))`;
    if (variant === 2) return `color-mix(in srgb, ${base} 72%, var(--color-text-primary))`;
    return base;
  };
}

function boundedRange(value, minimum, maximum) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const raw = value.map(Number);
  if (!raw.every(Number.isFinite)) return null;
  const low = Math.min(...raw), high = Math.max(...raw);
  if (high < minimum || low > maximum) return null;
  return [Math.max(minimum, Math.floor(low)), Math.min(maximum, Math.ceil(high))];
}

function stackKey(bin, part) {
  const prefix = `${bin.key}:`;
  return String(part.key).startsWith(prefix) ? String(part.key).slice(prefix.length) : String(part.key);
}

export function renderTime(host, context) {
  clear(host);
  const grouping = context.config.grouping || 'year';
  const stack = context.config.stack || null;
  const colorFor = stableColorScale(context.store);
  const all = aggregateTime(context.store, context.cutIds, grouping, { stack });
  const dated = all.filter(bin => bin.key !== '__undated__');
  const undated = all.find(bin => bin.key === '__undated__');
  if (!dated.length) {
    emptyState(host, `Der aktuelle Schnitt enthält keine datierten Primäranker${undated ? `; ${undated.count} Dokumente sind undatiert` : ''}.`);
    if (undated) appendAccessibleList(host, [undated], context);
    return { aggregates: all, destroy() { clear(host); } };
  }
  const step = spanOf(grouping);
  const fullRange = [+dated[0].key, +dated.at(-1).key + step - 1];
  const fullDomain = [fullRange[0], fullRange[1] + 1];
  const requestedRange = context.config.range;
  const range = boundedRange(requestedRange, ...fullRange);
  const staleRange = Array.isArray(requestedRange) && !range;
  const domain = range ? [range[0], range[1] + 1] : fullDomain;
  const shown = dated.filter(bin => +bin.key + step > domain[0] && +bin.key < domain[1]);
  const width = 720, height = 330, margin = { top: 16, right: 16, bottom: 62, left: 42 };
  const svg = svgEl('svg', { class: 'dashboard-svg', viewBox: `0 0 ${width} ${height}`,
    role: 'group', 'aria-label': `Zeitverteilung nach Primäranker. ${dated.length} Zeitgruppen über einer kontinuierlichen Jahresachse.` });
  const x = d3.scaleLinear().domain(domain).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, d3.max(shown, bin => bin.count) || 1]).nice().range([height - margin.bottom, margin.top]);
  d3.select(svg).append('g').attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')));
  d3.select(svg).append('g').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5));
  const marks = svgEl('g'); svg.appendChild(marks);
  for (const bin of shown) {
    const x0 = x(+bin.key), x1 = x(+bin.key + step);
    if (stack === 'doctype' && bin.stacks?.length) {
      let total = 0;
      bin.stacks.forEach((part) => {
        const group = svgEl('g', { class: 'dashboard-mark dashboard-time__mark' });
        group.append(svgEl('rect', { x: x0 + 1, y: y(total + part.count), width: Math.max(2, x1 - x0 - 2),
          height: y(total) - y(total + part.count), fill: colorFor(stackKey(bin, part)) }));
        total += part.count; setHighlighted(group, part, context.highlightedIds);
        bindSvgAction(group, part, context); marks.appendChild(group);
      });
    } else {
      const group = svgEl('g', { class: 'dashboard-mark dashboard-time__mark' });
      group.append(svgEl('rect', { x: x0 + 1, y: y(bin.count), width: Math.max(2, x1 - x0 - 2),
        height: y(0) - y(bin.count), fill: 'var(--accent-muted)' }));
      setHighlighted(group, bin, context.highlightedIds); bindSvgAction(group, bin, context); marks.appendChild(group);
    }
  }
  const brush = d3.brushX().extent([[margin.left, height - margin.bottom + 23], [width - margin.right, height - 14]])
    .on('end', event => {
      if (!event.sourceEvent || !event.selection) return;
      const [a, b] = event.selection.map(x.invert);
      const next = boundedRange([Math.floor(a), Math.ceil(b) - 1], ...fullRange);
      if (next) context.onConfig({ range: next });
    });
  d3.select(svg).append('g').attr('class', 'dashboard-time__brush').call(brush);
  host.appendChild(el('div', { className: 'dashboard-drawing' }, svg));
  if (stack === 'doctype') {
    const categories = new Map();
    for (const bin of all) for (const part of bin.stacks || []) {
      const key = stackKey(bin, part);
      if (!categories.has(key)) categories.set(key, part.label.replace(/^.* · /, ''));
    }
    const legend = el('ul', { className: 'dashboard-time__legend', 'aria-label': 'Farben der Dokumenttypen' });
    for (const [key, label] of categories) legend.appendChild(el('li', {},
      el('span', { className: 'dashboard-time__legend-swatch', dataset: { stackKey: key },
        style: `--stack-color:${colorFor(key)}` }), label));
    host.appendChild(legend);
  }
  host.appendChild(el('p', { className: 'dashboard-note dashboard-time__brush-note' },
    'Im grauen Streifen unter der Achse ziehen, um einen lokalen Zeitraum zu wählen.'));
  const validation = el('span', { className: 'dashboard-time-range__validation', role: 'status', 'aria-live': 'polite' });
  const rangeControls = el('div', { className: 'dashboard-time-range' },
    el('label', {}, 'Von ', el('input', { type: 'number', value: range?.[0] ?? fullRange[0],
      min: fullRange[0], max: fullRange[1], dataset: { rangeFrom: '' } })),
    el('label', {}, 'Bis ', el('input', { type: 'number', value: range?.[1] ?? fullRange[1],
      min: fullRange[0], max: fullRange[1], dataset: { rangeTo: '' } })),
    el('button', { type: 'button', onClick: event => {
      const wrapper = event.currentTarget.parentElement;
      const fromInput = wrapper.querySelector('[data-range-from]');
      const toInput = wrapper.querySelector('[data-range-to]');
      const from = fromInput.value === '' ? NaN : Number(fromInput.value);
      const to = toInput.value === '' ? NaN : Number(toInput.value);
      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        validation.textContent = 'Bitte zwei gültige Jahreszahlen eingeben.';
        return;
      }
      const next = boundedRange([from, to], ...fullRange);
      if (!next) {
        validation.textContent = `Das Zeitfenster muss ${fullRange[0]} bis ${fullRange[1]} berühren.`;
        return;
      }
      validation.textContent = '';
      context.onConfig({ range: next });
    } }, 'Lokal fokussieren'), validation);
  if (range) {
    rangeControls.append(
      el('button', { type: 'button', onClick: () => setFilter({ zeitfenster: range }) }, 'Zeitfenster als Filter anwenden'),
      el('button', { type: 'button', onClick: () => context.onConfig({ range: null }) }, 'Zur gesamten Zeitachse'));
  }
  host.append(rangeControls, el('p', { className: 'dashboard-note' },
    staleRange ? 'Das gespeicherte lokale Zeitfenster liegt außerhalb des aktuellen Schnitts; die gesamte verfügbare Zeitachse wird gezeigt. ' : '',
    `${dated.reduce((sum, bin) => sum + bin.count, 0)} datierte und ${undated?.count || 0} undatierte Dokumente. `
      + 'Die Achse bewahrt zeitliche Lücken. Ein angewandtes Zeitfenster lässt undatierte Dokumente gemäß dem gemeinsamen Filtervertrag im Schnitt und benennt sie weiterhin separat.'));
  appendAccessibleList(host, stack === 'doctype' ? all.flatMap(bin => bin.stacks?.length ? bin.stacks : [bin]) : all, context);
  return { aggregates: stack === 'doctype' ? all.flatMap(bin => bin.stacks?.length ? bin.stacks : [bin]) : all,
    destroy() { clear(host); } };
}
