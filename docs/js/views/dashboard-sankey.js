import { el, clear } from '../utils/dom.js';
import { aggregatePlaceSankey } from './statistik-data.js';
import { CHART_COLORS, svgEl, bindSvgAction, appendAccessibleList, emptyState, setHighlighted } from './dashboard-shared.js';

const PIXELS_PER_STATEMENT = 1.25;
const NODE_GAP = 17;

function unique(values, keyOf) {
  return [...new Map(values.map(value => [keyOf(value), value])).values()];
}

function aggregatePaths(paths, denominator, key, label, extra = {}) {
  const witnesses = unique(paths.map(path => path.witness), item => item.id || item.key);
  const sourceRefs = unique(paths.filter(path => path.source).map(path => ({
    ...path.source, recordId: path.recordId,
  })), item => JSON.stringify([item.recordId, item.sheet, item.row, item.datenpunkt]));
  const recordIds = [...new Set(paths.map(path => path.recordId))].sort();
  return { key, label, recordIds, count: paths.length, statementCount: paths.length,
    unit: 'statements', denominator, witnesses, sourceRefs,
    descriptor: { type: 'records', ids: recordIds }, ...extra };
}

function sankeyForPaths(base, paths) {
  const denominator = base.statementCount;
  const stages = ['type', 'role', 'place'].map((stage, stageIndex) => {
    const groups = new Map();
    for (const path of paths) {
      if (!groups.has(path[stage].key)) groups.set(path[stage].key, []);
      groups.get(path[stage].key).push(path);
    }
    return { stage, stageIndex, nodes: [...groups].map(([key, members]) => aggregatePaths(
      members, denominator, `${stage}:${key}`, members[0][stage].label, { stage },
    )) };
  });
  const links = [];
  for (const [leftStage, rightStage] of [['type', 'role'], ['role', 'place']]) {
    const groups = new Map();
    for (const path of paths) {
      const key = JSON.stringify([leftStage, path[leftStage].key, rightStage, path[rightStage].key]);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(path);
    }
    for (const [key, members] of groups) links.push(aggregatePaths(members, denominator, key,
      `${members[0][leftStage].label} → ${members[0][rightStage].label}`,
      { left: members[0][leftStage], right: members[0][rightStage], leftStage, rightStage }));
  }
  const pathAggregates = paths.map(path => aggregatePaths([path], denominator,
    `path:${path.statementKey}`, `${path.type.label} → ${path.role.label} → ${path.place.label}`, {
      dimensions: { doctype: path.type.label, placerole: path.role.label, place: path.place.label },
    }));
  return { ...base, paths, stages, links, pathAggregates, statementCount: paths.length,
    recordIds: [...new Set(paths.map(path => path.recordId))] };
}

function layout(model, width) {
  const stageX = [18, width / 2 - 9, width - 36];
  const laid = new Map();
  model.stages.forEach((stage, stageIndex) => {
    const sorted = [...stage.nodes].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'));
    let cursor = 0;
    for (const node of sorted) {
      const h = node.statementCount * PIXELS_PER_STATEMENT;
      laid.set(`${stage.stage}:${node.key.replace(`${stage.stage}:`, '')}`, { ...node, x: stageX[stageIndex], y: cursor, h, w: 18 });
      cursor += h + NODE_GAP;
    }
  });
  return laid;
}

export function renderSankey(host, context) {
  clear(host);
  const complete = aggregatePlaceSankey(context.store, context.cutIds, context.placeStatements);
  let model = complete;
  if (!model.statementCount) {
    emptyState(host, 'Der aktuelle Schnitt enthält keine Ortsaussagen für dieses Diagramm.');
    return { aggregates: [], destroy() { clear(host); } };
  }
  const focus = context.config.focus || null;
  if (focus) {
    const separator = focus.indexOf(':');
    const stage = focus.slice(0, separator), key = focus.slice(separator + 1);
    const paths = complete.paths.filter(path => path[stage]?.key === key);
    model = sankeyForPaths(complete, paths);
  } else model = sankeyForPaths(complete, complete.paths);
  const links = model.links;
  const width = 760;
  const height = Math.max(300, ...model.stages.map(stage => (
    model.statementCount * PIXELS_PER_STATEMENT + Math.max(0, stage.nodes.length - 1) * NODE_GAP
  )));
  const svg = svgEl('svg', { class: 'dashboard-svg dashboard-sankey', viewBox: `0 0 ${width} ${height}`,
    role: 'group', 'aria-label': `Sankey der Ortsaussagen. ${model.statementCount} Aussagen in ${model.recordIds.length} Dokumenten.` });
  const nodes = layout(model, width);
  const linkOffsets = new Map();
  for (const link of links) {
    const leftStage = link.leftStage;
    const rightStage = link.rightStage;
    const left = nodes.get(`${leftStage}:${link.left.key}`), right = nodes.get(`${rightStage}:${link.right.key}`);
    if (!left || !right) continue;
    const lk = `${leftStage}:${link.left.key}:out`, rk = `${rightStage}:${link.right.key}:in`;
    const lo = linkOffsets.get(lk) || 0, ro = linkOffsets.get(rk) || 0;
    const lh = link.statementCount * PIXELS_PER_STATEMENT;
    const rh = lh;
    linkOffsets.set(lk, lo + lh); linkOffsets.set(rk, ro + rh);
    const x0 = left.x + left.w, x1 = right.x, y0 = left.y + lo + lh / 2, y1 = right.y + ro + rh / 2;
    const path = svgEl('path', { class: 'dashboard-mark dashboard-sankey__link',
      d: `M${x0},${y0} C${(x0 + x1) / 2},${y0} ${(x0 + x1) / 2},${y1} ${x1},${y1}`,
      fill: 'none', stroke: 'var(--accent-muted)', 'stroke-width': lh, opacity: 0.45 });
    setHighlighted(path, link, context.highlightedIds); bindSvgAction(path, link, context); svg.appendChild(path);
  }
  model.stages.forEach((stage, stageIndex) => {
    for (const item of stage.nodes) {
      const node = nodes.get(`${stage.stage}:${item.key.replace(`${stage.stage}:`, '')}`);
      if (!node) continue;
      const group = svgEl('g', { class: 'dashboard-mark dashboard-sankey__node' });
      group.append(svgEl('rect', { x: node.x, y: node.y, width: node.w, height: node.h,
        fill: CHART_COLORS[stageIndex] }));
      const anchor = stageIndex === 2 ? 'end' : 'start';
      const tx = stageIndex === 2 ? node.x - 5 : node.x + node.w + 5;
      group.append(svgEl('text', { x: tx, y: node.y + Math.min(node.h - 1, 11),
        'text-anchor': anchor, class: 'dashboard-sankey__label' }, `${item.label} · ${item.statementCount}`));
      setHighlighted(group, item, context.highlightedIds); bindSvgAction(group, item, context); svg.appendChild(group);
    }
  });
  host.appendChild(el('div', { className: 'dashboard-drawing' }, svg));
  const controls = el('div', { className: 'dashboard-local-focus' });
  if (focus) controls.appendChild(el('button', { type: 'button', onClick: () => context.onConfig({ focus: null }) }, 'Gesamten Fluss zeigen'));
  else {
    const select = el('select', { className: 'dashboard-panel__select', 'aria-label': 'Sankey-Zweig für lokalen Fokus' });
    for (const node of model.stages.flatMap(stage => stage.nodes)) select.appendChild(el('option', { value: node.key }, node.label));
    controls.append(select, el('button', { type: 'button', onClick: () => context.onConfig({ focus: select.value }) }, 'Zweig lokal fokussieren'));
  }
  host.append(controls, el('p', { className: 'dashboard-note' },
    `${model.statementCount} konkrete Ortsaussagen in ${model.recordIds.length} Dokumenten. Die Bänder beschreiben Quellenbelege zwischen Dokumenttyp, Ortsrolle und Ort.`));
  const aggregates = [...model.stages.flatMap(stage => stage.nodes), ...model.links, ...model.pathAggregates];
  appendAccessibleList(host, aggregates, context);
  return { aggregates, destroy() { clear(host); } };
}
