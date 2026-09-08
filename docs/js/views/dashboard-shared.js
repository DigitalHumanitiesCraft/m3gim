import { el, clear } from '../utils/dom.js';

export const SVG_NS = 'http://www.w3.org/2000/svg';
export const CHART_COLORS = Object.freeze([
  'var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)',
  'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)',
]);

export function svgEl(tag, attrs = {}, text = '') {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (tag === 'svg' && attrs.role === 'group' && attrs.tabindex == null) {
    node.setAttribute('tabindex', '0');
    if (attrs['aria-label']) node.setAttribute('aria-label',
      `${attrs['aria-label']} Alle Werte sind in der Liste unter dem Diagramm per Tastatur auswählbar.`);
  }
  if (text) node.textContent = text;
  return node;
}

export function emptyState(host, text) {
  clear(host);
  host.appendChild(el('p', { className: 'dashboard-empty' }, text));
}

export function bindSvgAction(node, aggregate, callbacks) {
  node._dashboardAggregate = aggregate;
  node.setAttribute('role', 'button');
  node.setAttribute('tabindex', '-1');
  node.setAttribute('aria-label', `${aggregate.label}: ${aggregate.count} ${unitLabel(aggregate.unit, aggregate.count)}`);
  const activate = event => {
    event.preventDefault();
    callbacks.onSelect(aggregate, node);
  };
  node.addEventListener('click', activate);
  node.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') activate(event);
  });
  node.addEventListener('mouseenter', () => callbacks.onPreview?.(aggregate));
  node.addEventListener('focus', () => callbacks.onPreview?.(aggregate));
  node.addEventListener('mouseleave', () => callbacks.onPreview?.(null));
  node.addEventListener('blur', () => callbacks.onPreview?.(null));
}

export function unitLabel(unit, count) {
  if (unit === 'statements') return count === 1 ? 'Aussage' : 'Aussagen';
  return count === 1 ? 'Dokument' : 'Dokumente';
}

export function appendAccessibleList(host, aggregates, callbacks) {
  const details = el('details', { className: 'dashboard-values' });
  details.appendChild(el('summary', {}, `Werte als Liste (${aggregates.length})`));
  const list = el('ul', { className: 'dashboard-values__list' });
  for (const aggregate of aggregates) {
    const select = el('button', { type: 'button', className: 'ui-action dashboard-values__select',
      onClick: () => callbacks.onSelect(aggregate, select) },
    `${aggregate.label} · ${aggregate.count} ${unitLabel(aggregate.unit, aggregate.count)}`);
    const add = el('button', { type: 'button', className: 'ui-action dashboard-values__add',
      'aria-label': `${aggregate.label} zur Belegauswahl hinzufügen`,
      onClick: () => callbacks.onAdd(aggregate, add) }, '+');
    list.appendChild(el('li', {}, select, add));
  }
  details.appendChild(list); host.appendChild(details);
}

export function selectionIntersects(aggregate, highlightedIds) {
  if (!(highlightedIds instanceof Set) || highlightedIds.size === 0) return false;
  return (aggregate.recordIds || []).some(id => highlightedIds.has(id));
}

export function setHighlighted(node, aggregate, highlightedIds) {
  node.classList.toggle('dashboard-mark--highlighted', selectionIntersects(aggregate, highlightedIds));
}

export function downloadCsv(filename, rows) {
  const columns = rows.length ? Object.keys(rows[0]) : ['key', 'label'];
  const csv = [columns, ...rows.map(row => columns.map(column => row[column] ?? ''))]
    .map(row => row.map(csvCell).join(',')).join('\r\n');
  download(filename, 'text/csv;charset=utf-8', `\uFEFF${csv}`);
}

export function downloadJson(filename, value) {
  download(filename, 'application/json;charset=utf-8', JSON.stringify(value, null, 2));
}

function csvCell(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function download(filename, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = el('a', { href: url, download: filename });
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function chartStatus(text) {
  return el('p', { className: 'dashboard-chart-status', 'aria-live': 'polite' }, text);
}
