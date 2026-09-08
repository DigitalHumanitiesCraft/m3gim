import { el, clear } from '../utils/dom.js';
import { aggregateTreemap } from './statistik-data.js';
import {
  CHART_COLORS, svgEl, bindSvgAction, appendAccessibleList, emptyState, setHighlighted,
} from './dashboard-shared.js';

function findNode(root, path) {
  let node = root;
  for (const key of path || []) {
    const next = (node.children || []).find(child => child.key === key);
    if (!next) return root;
    node = next;
  }
  return node;
}

function stableColor(key) {
  let hash = 0;
  for (const char of String(key)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return CHART_COLORS[Math.abs(hash) % CHART_COLORS.length];
}

export function renderTreemap(host, context) {
  clear(host);
  const root = aggregateTreemap(context.store, context.cutIds);
  if (!root.count) return { aggregates: [], destroy() { clear(host); } };
  const path = Array.isArray(context.config.path) ? context.config.path : [];
  const focus = findNode(root, path);
  const crumbs = el('nav', { className: 'dashboard-breadcrumb', 'aria-label': 'Treemap-Pfad' });
  const rootButton = el('button', { type: 'button', className: 'ui-action', onClick: () => context.onConfig({ path: [] }) }, 'Alle Dokumenttypen');
  crumbs.appendChild(rootButton);
  let current = root;
  path.forEach((key, index) => {
    current = (current.children || []).find(child => child.key === key) || current;
    crumbs.append(' / ', el('button', { type: 'button', className: 'ui-action',
      onClick: () => context.onConfig({ path: path.slice(0, index + 1) }) }, current.label));
  });
  host.appendChild(crumbs);
  const drawing = el('div', { className: 'dashboard-drawing dashboard-treemap' });
  host.appendChild(drawing);
  const width = Math.max(420, drawing.clientWidth || 720), height = 330;
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'dashboard-svg',
    role: 'group', 'aria-label': `Treemap der Dokumenttypen. ${focus.count} Dokumente.` });
  drawing.appendChild(svg);
  const data = { ...focus, children: focus.children?.length ? focus.children : [focus] };
  const hierarchy = d3.hierarchy(data).sum(node => node.children?.length ? 0 : node.count)
    .sort((a, b) => b.value - a.value);
  d3.treemap().size([width, height]).paddingInner(2).paddingOuter(1)(hierarchy);
  const leaves = hierarchy.leaves();
  leaves.forEach((leaf) => {
    const item = leaf.data;
    const markWidth = leaf.x1 - leaf.x0, markHeight = leaf.y1 - leaf.y0;
    const group = svgEl('g', { class: 'dashboard-mark dashboard-treemap__mark' });
    const rect = svgEl('rect', { x: leaf.x0, y: leaf.y0, width: Math.max(0, leaf.x1 - leaf.x0),
      height: Math.max(0, leaf.y1 - leaf.y0), fill: stableColor(item.path?.[0] || item.key) });
    group.appendChild(rect);
    if (markWidth >= 86 && markHeight >= 35) {
      const label = svgEl('text', { x: leaf.x0 + 7, y: leaf.y0 + 17, class: 'dashboard-treemap__label' });
      const available = Math.max(5, Math.floor((markWidth - 14) / 7));
      const short = item.label.length > available ? `${item.label.slice(0, available - 1)}…` : item.label;
      label.append(svgEl('tspan', {}, short), svgEl('tspan', { x: leaf.x0 + 7, dy: 15 }, String(item.count)));
      group.appendChild(label);
    }
    setHighlighted(group, item, context.highlightedIds);
    bindSvgAction(group, item, context); svg.appendChild(group);
  });
  if ((focus.children || []).length) {
    const branches = focus.children.filter(child => child.children?.length);
    if (branches.length) {
      const zooms = el('div', { className: 'dashboard-local-focus' }, 'Vertiefen: ');
      for (const branch of branches) zooms.appendChild(el('button', { type: 'button', className: 'ui-action',
        onClick: () => context.onConfig({ path: [...path, branch.key] }) }, branch.label));
      host.appendChild(zooms);
    }
  }
  const values = leaves.map(leaf => leaf.data);
  appendAccessibleList(host, values, context);
  return { aggregates: values, destroy() { clear(host); } };
}
