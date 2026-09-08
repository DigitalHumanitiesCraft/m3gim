/**
 * Netzwerk drawing layer: the two-mode overview and the neighbourhood after a
 * click (E-259).
 *
 * The edges lie on a `<canvas>`, the nodes on an `<svg>` above it. The
 * person-to-person projection of the unfiltered fonds carries about nine and a
 * half thousand edges; as SVG that is nine thousand elements whose class
 * updates make every highlight stutter, while one canvas pass stays flat. The
 * nodes stay in SVG because they are the click, focus and label targets.
 *
 * Hit testing on the canvas runs over a d3 quadtree of edge samples: the
 * pointer finds its nearest sample and the candidate edges are then measured
 * exactly. A highlight touches only the elements it changes, the nodes that
 * enter or leave the neighbourhood, plus the one canvas pass.
 *
 * The two layers stand on one measured box: the SVG letterboxes its viewBox by
 * itself, the canvas takes the same fit explicitly, and `measureBox` keeps that
 * fit on the box the browser paints into rather than on the one that stood at
 * the first draw. `debugGeometry` reports both derivations, so a browser test
 * asserts that the layers agree instead of sampling pixels.
 *
 * The orchestrator (`netzwerk.js`) owns the state and passes it in read-only;
 * this module reports back through `actions` only.
 *
 * Contract:
 *   drawGraph({ layout, view, selection, actions, zoomRefs })
 *   applySelection(selection)         after the first drawGraph
 *   debugGeometry(sample)             localhost only, through netzwerk.js
 *   actions = { selectNode(node), selectEdge(edge), clearSelection() }
 */

/* global d3 */

import { el, clear } from '../utils/dom.js';
import { truncate } from '../utils/format.js';
import { setRovingTabindex, nextTabIndex } from '../ui/tabs.js';
import { AGRELON_LABELS } from '../data/constants.js';
import { NODE_TYPE_META } from './_netzwerk-geometry.js';

export const STAGE_WIDTH = 1200;
export const STAGE_HEIGHT = 820;

/** Labels that stand without a selection and without zoom. */
const ALWAYS_LABELLED = 18;
/** From this zoom factor on every node carries its label. */
const LABEL_ZOOM = 2.2;
/** Labels inside one neighbourhood; a hub of two hundred would write it shut. */
const LABEL_CAP = 20;
/** Labels of the second step, which is the larger of the two rings. */
const FAR_LABEL_CAP = 6;
/** Click tolerance around an edge, in layout pixels before the zoom factor. */
const EDGE_HIT = 6;
/** Bounds of the zoom, shared by the wheel and the fit of a neighbourhood. */
const ZOOM_RANGE = [0.15, 8];
/** Margin the neighbourhood fit keeps around its set, in layout pixels. */
const FIT_PAD = 40;
/** Smallest span the neighbourhood fit reads, in layout pixels. A record with
 *  two participants twenty pixels apart would otherwise fill the stage at the
 *  maximum magnification and show nothing around it. */
const FIT_MIN_SPAN = 240;
/** Square side from the node radius. Below the area of the circle of the same
 *  radius, so shape rather than size tells the two node kinds apart. */
const SQUARE_SIDE = 1.6;
/** Vertical arrow keys walk the same order as the horizontal ones. */
const ARROW_ALIAS = { ArrowDown: 'ArrowRight', ArrowUp: 'ArrowLeft' };

export function renderCanvasSlot() {
  return el('div', { className: 'netzwerk__canvas', id: 'netzwerk-canvas' });
}

export function renderZoomControls(zoomRefs) {
  const group = el('div', { className: 'netzwerk__zoom-controls' });
  const zoomBy = (factor) => {
    if (zoomRefs.svg && zoomRefs.behavior) {
      zoomRefs.svg.transition().duration(180).call(zoomRefs.behavior.scaleBy, factor);
    }
  };
  group.appendChild(el('button', {
    type: 'button', className: 'nz-zoom-btn',
    dataset: { tip: 'Hineinzoomen', tipPos: 'bottom' }, 'aria-label': 'Hineinzoomen',
    onClick: () => zoomBy(1.4),
  }, '+'));
  group.appendChild(el('button', {
    type: 'button', className: 'nz-zoom-btn',
    dataset: { tip: 'Herauszoomen', tipPos: 'bottom' }, 'aria-label': 'Herauszoomen',
    onClick: () => zoomBy(1 / 1.4),
  }, '−'));
  // The identity transform is the fit of the whole graph: the layout is laid
  // out into the stage box, so nothing lies outside it.
  group.appendChild(el('button', {
    type: 'button', className: 'nz-zoom-btn nz-zoom-btn--reset',
    dataset: { tip: 'Ansicht zurücksetzen, das ganze Netz einpassen', tipPos: 'bottom' },
    'aria-label': 'Ansicht zurücksetzen',
    onClick: () => {
      if (zoomRefs.svg && zoomRefs.behavior) {
        zoomRefs.svg.transition().duration(220).call(zoomRefs.behavior.transform, d3.zoomIdentity);
      }
    },
  }, '⊙'));
  return group;
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

// The drawn picture, so a selection can touch single elements instead of
// rebuilding the SVG. Reset by every drawGraph.
let _drawn = null;

/**
 * @param {object} args
 * @param {object} args.layout      result of layoutGraph
 * @param {object} args.view        { fadeSingle: boolean }
 * @param {?{kind: string, id: string}} args.selection
 * @param {object} args.actions
 * @param {object} args.zoomRefs    drawGraph fills `svg` and `behavior`
 */
export function drawGraph({ layout, view, selection, actions, zoomRefs }) {
  const slot = document.getElementById('netzwerk-canvas');
  if (!slot) return;
  clear(slot);
  if (_drawn && _drawn.observer) _drawn.observer.disconnect();
  _drawn = null;
  if (!layout || layout.nodes.length === 0) return;

  const plot = el('div', { className: 'netzwerk__plot' });
  const canvas = el('canvas', { className: 'netzwerk__edges', 'aria-hidden': 'true' });
  plot.appendChild(canvas);

  const svg = d3.create('svg')
    .attr('class', 'netzwerk-svg')
    .attr('viewBox', `0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    // A group, not an image: role="img" cuts the whole subtree out of the
    // accessibility tree, and the nodes below are operable controls.
    .attr('role', 'group')
    .attr('aria-label', `Netzwerk aus ${layout.nodes.length} Knoten`);
  plot.appendChild(svg.node());
  slot.appendChild(plot);

  const background = svg.append('rect')
    .attr('class', 'netzwerk-zoom-bg')
    .attr('width', STAGE_WIDTH).attr('height', STAGE_HEIGHT)
    .attr('fill', 'transparent');
  const zoomG = svg.append('g').attr('class', 'netzwerk-zoom-group');

  const nodesG = zoomG.append('g').attr('class', 'netzwerk-nodes');
  const nodeSel = nodesG.selectAll('g.netzwerk-node')
    .data(layout.nodes, d => d.id)
    .enter()
    .append('g')
    .attr('class', d => 'netzwerk-node netzwerk-node--' + d.type
      + (d.kind === 'actor' && view.fadeSingle && d.weight === 1 ? ' netzwerk-node--faint' : '')
      + (d.kind === 'record' && d.year == null ? ' netzwerk-node--faint' : ''))
    .attr('transform', d => `translate(${d.x}, ${d.y})`)
    .attr('data-id', d => d.id)
    .attr('role', 'button')
    .attr('aria-label', d => `${NODE_TYPE_META[d.type].label} ${d.name}`)
    .on('mousemove', (ev, d) => showTip(nodeTip(d), ev))
    .on('mouseleave', () => hideTip())
    .on('click', (ev, d) => { ev.stopPropagation(); actions.selectNode(d); })
    // A double click asks for the neighbourhood itself, so the view zooms to
    // the set the click just highlighted.
    .on('dblclick', (ev, d) => {
      ev.stopPropagation();
      ev.preventDefault();
      actions.selectNode(d);
      zoomToMarked();
    });

  nodeSel.filter(d => d.kind === 'actor')
    .append('circle')
    .attr('class', 'netzwerk-node__circle')
    .attr('r', d => d.r);

  // A record is a square in the accent, sized from the same radius as an actor
  // circle, so the sources carrying the fonds stand out and shape rather than
  // colour tells the two node kinds apart.
  nodeSel.filter(d => d.kind === 'record')
    .append('rect')
    .attr('class', 'netzwerk-node__square')
    .attr('x', d => -d.r * SQUARE_SIDE / 2).attr('y', d => -d.r * SQUARE_SIDE / 2)
    .attr('width', d => d.r * SQUARE_SIDE).attr('height', d => d.r * SQUARE_SIDE);

  // A recorded relation is a mark at the counterpart node, never an edge: its
  // other end is the creator of the fonds, the one entity that is no node. The
  // ring is a hairline and no hover target of its own, so the node tooltip
  // explains it; one hover shows exactly one tooltip (E-90).
  nodeSel.filter(d => d.hasRelation)
    .append('circle')
    .attr('class', 'netzwerk-node__relation')
    .attr('r', d => d.r + 3);

  // The label of a record is its document type and year, not its signature; a
  // signature says nothing about the content and stands in tooltip and detail
  // column instead (Projektleitung, 2026-09-05).
  const labels = nodeSel.append('text')
    .attr('class', 'netzwerk-label')
    .attr('x', d => d.r + 4)
    .attr('y', 3)
    .text(d => truncate(d.label || d.name, 28));

  const ctx = canvas.getContext('2d');
  const quadtree = buildEdgeIndex(layout);
  const nodeEls = new Map();
  nodeSel.each(function (d) { nodeEls.set(d.id, this); });

  // Roving tabindex: the drawing is one tab stop and the arrow keys walk the
  // nodes from the heaviest down. A tab stop per node made the drawing a
  // thousand-step detour through the page. Edges stay pointer-only, because the
  // detail column already lists the neighbours with their shared counts as
  // keyboard-reachable rows.
  const walk = [...layout.nodes]
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, 'de'))
    .map(n => nodeEls.get(n.id));
  setRovingTabindex(walk, 0);
  nodeSel.on('keydown', (ev, d) => {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); actions.selectNode(d); return; }
    if (ev.key === 'Escape') { actions.clearSelection(); return; }
    const from = walk.indexOf(ev.currentTarget);
    const target = nextTabIndex(ARROW_ALIAS[ev.key] || ev.key, Math.max(from, 0), walk.length);
    if (target === null) return;
    ev.preventDefault();
    setRovingTabindex(walk, target);
    walk[target].focus();
  });

  _drawn = {
    layout, ctx, fit: null, nodeEls, labels, zoomG, canvas, plot, svg,
    adjacency: adjacencyOf(layout),
    transform: d3.zoomIdentity,
    marked: emptyMark(),
    accent: cssColour('--accent'),
    quiet: cssColour('--color-text-secondary'),
    observer: null,
  };
  measureBox();

  // The box is measured again on every change, not once at the first draw. The
  // view head fills its coverage line after this call and takes eighteen pixels
  // of height with it, the detail column takes width when it slides in, and the
  // window resizes; a fit computed once left every edge nine pixels above its
  // node and stretched the whole edge layer by two and a half percent.
  if (typeof ResizeObserver === 'function') {
    _drawn.observer = new ResizeObserver(() => { if (measureBox()) paintEdges(); });
    _drawn.observer.observe(plot);
  }

  const zoomBehavior = d3.zoom()
    .scaleExtent(ZOOM_RANGE)
    .on('zoom', (ev) => {
      _drawn.transform = ev.transform;
      zoomG.attr('transform', ev.transform);
      paintEdges();
      paintLabels();
    });
  svg.call(zoomBehavior);
  // The d3 double click zooms on a fixed factor around the pointer. The view
  // has its own answer on a node, the fit of the neighbourhood, and on empty
  // ground a double click should do nothing at all.
  svg.on('dblclick.zoom', null);
  zoomRefs.behavior = zoomBehavior;
  zoomRefs.svg = svg;
  _drawn.behavior = zoomBehavior;

  background.on('click', (ev) => {
    const [px, py] = d3.pointer(ev, svg.node());
    const [lx, ly] = _drawn.transform.invert([px, py]);
    const hit = hitEdge(quadtree, lx, ly, EDGE_HIT / _drawn.transform.k);
    if (hit) actions.selectEdge(hit);
    else actions.clearSelection();
  });
  background.on('mousemove', (ev) => {
    const [px, py] = d3.pointer(ev, svg.node());
    const [lx, ly] = _drawn.transform.invert([px, py]);
    const hit = hitEdge(quadtree, lx, ly, EDGE_HIT / _drawn.transform.k);
    if (hit) showTip(edgeTip(hit), ev); else hideTip();
    background.classed('netzwerk-zoom-bg--over-edge', !!hit);
  });
  background.on('mouseleave', () => hideTip());

  paintLabels();
  applySelection(selection);
}

/** The current selection applied to the drawn picture; only the nodes that
 *  enter or leave the neighbourhood change, plus the one canvas pass. */
export function applySelection(selection) {
  if (!_drawn) return;
  const next = markedFor(_drawn.layout, selection, _drawn.adjacency);
  const prev = _drawn.marked;

  const touched = new Set([...prev.near, ...prev.far, ...next.near, ...next.far]);
  if (prev.focus) touched.add(prev.focus);
  if (next.focus) touched.add(next.focus);
  const wasSel = !!(prev.focus || prev.edgeId);
  const isSel = !!(next.focus || next.edgeId);
  // Entering or leaving a selection also changes the dimming of distant nodes.
  const ids = (wasSel !== isSel) ? _drawn.nodeEls.keys() : touched;

  for (const id of ids) {
    const element = _drawn.nodeEls.get(id);
    if (!element) continue;
    const near = next.near.has(id);
    const far = next.far.has(id);
    element.classList.toggle('netzwerk-node--focus', next.focus === id);
    element.classList.toggle('netzwerk-node--neighbour', near && next.focus !== id);
    element.classList.toggle('netzwerk-node--far', far);
    element.classList.toggle('netzwerk-node--dim', isSel && !near && !far);
  }

  _drawn.marked = next;
  markHalo(prev.focus, next.focus);
  paintEdges();
  paintLabels(false);
}

/**
 * The halo of the selected node, a wide translucent ring under its shape. It
 * lives only at the one node that carries it: as a standing element it would be
 * a second circle at every node of the picture, and a black box around node and
 * label was what it replaces (Projektleitung, 2026-09-05).
 */
function markHalo(previous, current) {
  if (previous === current) return;
  const old = previous && _drawn.nodeEls.get(previous);
  const ring = old && old.querySelector('.netzwerk-node__halo');
  if (ring) ring.remove();
  const element = current && _drawn.nodeEls.get(current);
  if (!element || element.querySelector('.netzwerk-node__halo')) return;
  const node = _drawn.layout.byId.get(current);
  const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  halo.setAttribute('class', 'netzwerk-node__halo');
  halo.setAttribute('r', String(node.r + 7));
  element.insertBefore(halo, element.firstChild);
}

/**
 * Fits the highlighted set into the stage, which is what a double click on a
 * node asks for. Without a selection the set is the whole graph, and that is
 * the identity transform the reset control writes.
 */
function zoomToMarked() {
  if (!_drawn || !_drawn.behavior) return;
  const { layout, marked, svg, behavior } = _drawn;
  const ids = new Set([...marked.near, ...marked.far]);
  const nodes = ids.size > 0 ? layout.nodes.filter(n => ids.has(n.id)) : layout.nodes;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const node of nodes) {
    if (node.x - node.r < minX) minX = node.x - node.r;
    if (node.x + node.r > maxX) maxX = node.x + node.r;
    if (node.y - node.r < minY) minY = node.y - node.r;
    if (node.y + node.r > maxY) maxY = node.y + node.r;
  }
  if (!Number.isFinite(minX)) return;
  const k = Math.max(ZOOM_RANGE[0], Math.min(ZOOM_RANGE[1], Math.min(
    (STAGE_WIDTH - 2 * FIT_PAD) / Math.max(maxX - minX, FIT_MIN_SPAN),
    (STAGE_HEIGHT - 2 * FIT_PAD) / Math.max(maxY - minY, FIT_MIN_SPAN))));
  const transform = d3.zoomIdentity
    .translate(STAGE_WIDTH / 2 - k * (minX + maxX) / 2,
               STAGE_HEIGHT / 2 - k * (minY + maxY) / 2)
    .scale(k);
  svg.transition().duration(280).call(behavior.transform, transform);
}

function emptyMark() {
  return { focus: null, near: new Set(), far: new Set(), edgeId: null };
}

/** Neighbour ids per node, so a neighbourhood costs its own size instead of a
 *  pass over every edge. */
function adjacencyOf(layout) {
  const map = new Map();
  const add = (from, to) => {
    let list = map.get(from);
    if (!list) { list = []; map.set(from, list); }
    list.push(to);
  };
  for (const edge of layout.edges) { add(edge.a, edge.b); add(edge.b, edge.a); }
  return map;
}

/**
 * The marked neighbourhood of a selection.
 *
 * In the two-mode network a click on an actor has two steps, the records of the
 * actor and the actors standing at those records. One step alone answered
 * "which sources" where the question is "with whom". A click on a record has
 * one step, its actors, because the second would be every other source those
 * actors carry. The projection has one step by construction.
 */
function markedFor(layout, selection, adjacency) {
  const mark = emptyMark();
  if (selection && selection.kind === 'node' && layout.byId.has(selection.id)) {
    mark.focus = selection.id;
    for (const id of adjacency.get(mark.focus) || []) mark.near.add(id);
    if (layout.mode === 'twomode' && layout.byId.get(mark.focus).kind === 'actor') {
      for (const recordId of mark.near) {
        for (const id of adjacency.get(recordId) || []) {
          if (id !== mark.focus && !mark.near.has(id)) mark.far.add(id);
        }
      }
    }
    mark.near.add(mark.focus);
  } else if (selection && selection.kind === 'edge') {
    const edge = layout.edges.find(e => e.id === selection.id);
    if (edge) {
      mark.edgeId = edge.id;
      mark.near.add(edge.a);
      mark.near.add(edge.b);
    }
  }
  return mark;
}

function paintLabels(updateGeometry = true) {
  const { labels, marked, transform, layout } = _drawn;
  const showAll = transform.k >= LABEL_ZOOM;
  let named = null;
  if (marked.focus || marked.edgeId) {
    named = heaviest(layout, marked.near, LABEL_CAP);
    if (marked.focus) named.add(marked.focus);
    // The second step is the larger ring; it stays unnamed until the zoom
    // carries the text, except for the few heaviest, which are the answer to
    // "with whom".
    if (showAll) for (const id of marked.far) named.add(id);
    else for (const id of heaviest(layout, marked.far, FAR_LABEL_CAP)) named.add(id);
  } else if (!showAll) {
    named = new Set(layout.nodes.filter(n => n.kind === 'actor')
      .slice(0, ALWAYS_LABELLED).map(n => n.id));
  }
  const scale = Math.max(0.4, transform.k);
  if (updateGeometry) {
    labels
      .style('font-size', (10 / scale).toFixed(2) + 'px')
      // The halo keeps a name readable over edges and follows the zoom.
      .style('stroke-width', (3 / scale).toFixed(2) + 'px')
      .attr('x', d => d.r + 3 / scale);
  }
  labels.classed('netzwerk-label--on',
    d => (showAll && !named) || (named ? named.has(d.id) : true));
}

/** The `cap` heaviest of a set of node ids, or all of them below the cap. */
function heaviest(layout, ids, cap) {
  if (ids.size <= cap) return new Set(ids);
  return new Set(layout.nodes.filter(n => ids.has(n.id))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, cap).map(n => n.id));
}

/**
 * Canvas backing store and letterbox fit against the box the browser actually
 * paints into. The SVG letterboxes its viewBox by itself, the canvas has no
 * such rule and takes the same fit explicitly, so both layers stand on one
 * geometry at every zoom.
 * @returns {boolean} whether the box changed and the edge layer needs a pass
 */
function measureBox() {
  const { canvas, fit } = _drawn;
  const box = canvas.getBoundingClientRect();
  const width = box.width || STAGE_WIDTH;
  const height = box.height || STAGE_HEIGHT;
  if (fit && Math.abs(fit.width - width) < 0.5 && Math.abs(fit.height - height) < 0.5) {
    return false;
  }
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  const scale = Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT);
  _drawn.fit = {
    scale,
    x: (width - STAGE_WIDTH * scale) / 2,
    y: (height - STAGE_HEIGHT * scale) / 2,
    width, height,
    // The backing store holds a whole number of device pixels, the CSS box does
    // not; painting through the exact quotient keeps the edge layer on the node
    // layer instead of letting the rounding stretch it.
    dpx: canvas.width / width,
    dpy: canvas.height / height,
  };
  return true;
}

/** Stroke width of an edge in screen pixels, from the documents it stands on.
 *  Bounded, so a pair with twenty shared documents stays a line and not a band. */
function edgeWidth(weight) {
  return Math.min(3, 0.7 + Math.sqrt(weight || 1) * 0.5);
}

function paintEdges() {
  const { ctx, fit, layout, marked, transform, accent, quiet } = _drawn;
  if (!fit) return;
  ctx.save();
  ctx.setTransform(fit.dpx, 0, 0, fit.dpy, 0, 0);
  ctx.clearRect(0, 0, fit.width, fit.height);
  ctx.translate(fit.x, fit.y);
  ctx.scale(fit.scale, fit.scale);
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.k, transform.k);
  ctx.lineCap = 'round';
  // One screen pixel in layout units, so a line keeps its weight through zoom.
  const unit = 1 / (transform.k * fit.scale);

  const selected = !!(marked.focus || marked.edgeId);
  const active = [];
  const second = [];
  // The ground layer is bucketed by line style and weight, not stroked edge by
  // edge: the projection of the unfiltered fonds carries nine and a half
  // thousand edges, and a state change each made the canvas as slow as the SVG
  // it replaced. Two styles times the handful of distinct weights is what is
  // left of that, a few dozen passes.
  const ground = new Map();
  for (const edge of layout.edges) {
    if (marked.edgeId) {
      if (edge.id === marked.edgeId) { active.push(edge); continue; }
    } else if (marked.focus) {
      if (edge.a === marked.focus || edge.b === marked.focus) { active.push(edge); continue; }
      if (isSecondStep(marked, edge)) { second.push(edge); continue; }
    }
    const weight = edge.weight || 1;
    const key = (edge.bare ? 'b' : 'r') + weight;
    let bucket = ground.get(key);
    if (!bucket) { bucket = { bare: !!edge.bare, weight, edges: [] }; ground.set(key, bucket); }
    bucket.edges.push(edge);
  }

  ctx.strokeStyle = quiet;
  ctx.globalAlpha = selected ? 0.05 : 0.18;
  for (const bucket of ground.values()) {
    strokeClass(ctx, bucket.edges, bucket.bare, edgeWidth(bucket.weight) * unit, unit);
  }

  ctx.strokeStyle = accent;
  // The second step is drawn in the same accent at a third of its weight, so
  // the two rings read as one neighbourhood at two distances.
  for (const [edges, alpha] of [[second, 0.3], [active, 1]]) {
    ctx.globalAlpha = alpha;
    for (const edge of edges) {
      strokeClass(ctx, [edge], edge.bare,
        (edgeWidth(edge.weight) + 0.6) * unit, unit);
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * One pass over a set of edges of the same class. A bare mention is dotted, an
 * active role solid; the role sits on the mention, never on the actor.
 *
 * No arrow head: of the recorded roles only correspondence carries a direction
 * at all (sender against recipient), and a head on every other edge would claim
 * one where the source has none (Projektleitung, 2026-09-05). An arrow would be
 * drawn here, at the `to` end of the segment.
 */
function strokeClass(ctx, edges, bare, width, unit) {
  ctx.setLineDash(bare ? [unit, 3 * unit] : []);
  ctx.lineWidth = width;
  ctx.beginPath();
  for (const edge of edges) {
    ctx.moveTo(edge.from.x, edge.from.y);
    ctx.lineTo(edge.to.x, edge.to.y);
  }
  ctx.stroke();
}

/** An edge from the first step to the second, meaning from a record of the
 *  focus actor to one of the actors standing at it. */
function isSecondStep(marked, edge) {
  if (marked.far.size === 0) return false;
  return (marked.near.has(edge.a) && marked.far.has(edge.b))
    || (marked.near.has(edge.b) && marked.far.has(edge.a));
}

/**
 * Geometry of the drawn picture for the browser test: the current zoom, the
 * screen centre of every node read from the DOM, and the screen endpoints of
 * the edges computed the way the canvas paints them. The two are independent
 * derivations of the same position, so a test can assert that edge layer and
 * node layer stand on the same geometry instead of sampling pixels. The radii
 * and the self-coverage of the picture ride along, so the size rule of the
 * nodes is measured rather than read off the screenshot.
 * @param {?number} sample  edges to report, all of them when null
 */
export function debugGeometry(sample = 20) {
  if (!_drawn || !_drawn.fit) return null;
  const { layout, fit, transform, nodeEls, canvas } = _drawn;
  const box = canvas.getBoundingClientRect();
  const toScreen = (x, y) => [
    box.left + fit.x + (transform.x + x * transform.k) * fit.scale,
    box.top + fit.y + (transform.y + y * transform.k) * fit.scale,
  ];
  const nodes = {};
  for (const [id, element] of nodeEls) {
    // The screen CTM of the node group carries the same chain the browser
    // paints with, viewBox fit included; its origin is the node centre.
    const m = element.getScreenCTM();
    if (m) nodes[id] = [m.e, m.f];
  }
  const edges = (sample == null ? layout.edges : layout.edges.slice(0, sample))
    .map(edge => ({
      id: edge.id, a: edge.a, b: edge.b, bare: !!edge.bare,
      from: toScreen(edge.from.x, edge.from.y),
      to: toScreen(edge.to.x, edge.to.y),
    }));
  return {
    transform: { k: transform.k, x: transform.x, y: transform.y },
    fit: { ...fit },
    canvas: { width: canvas.width, height: canvas.height,
              cssWidth: box.width, cssHeight: box.height },
    nodes, edges,
    radii: Object.fromEntries(layout.nodes.map(n => [n.id, n.r])),
    overlap: overlapOf(layout),
  };
}

/**
 * How much of the picture covers itself, in layout units and therefore
 * independent of the current zoom: the pairs whose shapes touch and the share
 * of the drawn area that lies under another node. Radii, not the drawn square,
 * because the square is inscribed in the circle of the same radius and one
 * measure per pair is what the layout is tuned against (E-274).
 */
function overlapOf(layout) {
  const n = layout.nodes;
  let pairs = 0;
  let covered = 0;
  let total = 0;
  for (const node of n) total += Math.PI * node.r * node.r;
  for (let i = 0; i < n.length; i++) {
    for (let j = i + 1; j < n.length; j++) {
      const d = Math.hypot(n[i].x - n[j].x, n[i].y - n[j].y);
      if (d >= n[i].r + n[j].r) continue;
      pairs++;
      covered += lensArea(d, n[i].r, n[j].r);
    }
  }
  return { pairs, share: total > 0 ? covered / total : 0,
           maxRadius: n.reduce((m, node) => Math.max(m, node.r), 0) };
}

/** Area two circles share at centre distance d. */
function lensArea(d, r1, r2) {
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a1 = Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const a2 = Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  return r1 * r1 * (a1 - Math.sin(2 * a1) / 2) + r2 * r2 * (a2 - Math.sin(2 * a2) / 2);
}

/** A token resolved to a colour; canvas takes no var() reference. Without a
 *  resolved token the pass falls back to the current text colour rather than to
 *  a colour written into the code, so no hue lives outside variables.css. */
function cssColour(token) {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  return style.getPropertyValue(token).trim() || style.color;
}

/** The node label names document type and year; signature and full title stand
 *  here, where there is room for them. */
function nodeTip(d) {
  if (d.kind === 'record') {
    return `${d.label} · ${d.name}`
      + (d.title ? `\n${d.title}` : '')
      + `\n${d.weight} erwähnte Einträge`
      + (d.year == null ? '\nundatiert' : '');
  }
  return `${d.name}\n${NODE_TYPE_META[d.type].label}\n`
    + `${d.weight} Dokument${d.weight === 1 ? '' : 'e'}`
    + (d.hasRelation ? `\nRing · erfasste Beziehung zur Nachlassbildnerin`
      + ` (${relationNames(d)}), Beleg in der Detailspalte` : '');
}

/** The recorded relation kinds of a node, in their display form. The legend in
 *  the view head names the ring, this line says which relation it stands for. */
function relationNames(d) {
  const seen = [];
  for (const rel of d.relations || []) {
    const label = AGRELON_LABELS[rel.type] || String(rel.type).replace(/^agrelon:/, '');
    if (!seen.includes(label)) seen.push(label);
  }
  return seen.join(', ');
}

/** The role of a mention sits on the edge, so the edge tooltip is where it is
 *  read; the two line styles only say whether there is one. */
function edgeTip(edge) {
  const a = edge.from.label || edge.from.name;
  const b = edge.to.label || edge.to.name;
  if (edge.recordId) {
    return `${a} · ${b}\n${edge.roles.length ? edge.roles.join(', ') : 'ohne Rolle'}`;
  }
  const roles = [...new Set([...(edge.rolesA || []), ...(edge.rolesB || [])])];
  return `${a} · ${b}\n${edge.weight} gemeinsame`
    + (edge.weight === 1 ? 's Dokument' : ' Dokumente')
    + (roles.length ? `\n${roles.join(', ')}` : '');
}

// ---------------------------------------------------------------------------
// Tooltip
//
// An SVG node and a canvas carry no pseudo element, so the CSS tooltip of
// `data-tip` cannot sit on them; the drawing keeps one HTML box above itself
// instead (E-36), and one hover shows exactly that one (E-90).
// ---------------------------------------------------------------------------

function tipBox() {
  let box = document.getElementById('netzwerk-tip');
  if (!box) {
    // No live region: the box is rewritten on every mouse move, and the detail
    // column beside it is the accessible form of the same content.
    box = el('div', { className: 'netzwerk__tip', id: 'netzwerk-tip', 'aria-hidden': 'true' });
    box.hidden = true;
    document.body.appendChild(box);
  }
  return box;
}

function showTip(text, ev) {
  const box = tipBox();
  box.textContent = text;
  box.hidden = false;
  const pad = 14;
  const rect = box.getBoundingClientRect();
  const x = Math.min(ev.clientX + pad, window.innerWidth - rect.width - 8);
  const y = Math.min(ev.clientY + pad, window.innerHeight - rect.height - 8);
  box.style.left = Math.max(8, x) + 'px';
  box.style.top = Math.max(8, y) + 'px';
}

function hideTip() {
  const box = document.getElementById('netzwerk-tip');
  if (box) box.hidden = true;
}

// ---------------------------------------------------------------------------
// Edge hit testing
// ---------------------------------------------------------------------------

/** Quadtree over samples along every edge. A midpoint index alone missed a long
 *  edge whose middle lies far from the pointer. */
function buildEdgeIndex(layout) {
  const samples = [];
  for (const edge of layout.edges) {
    const dx = edge.to.x - edge.from.x;
    const dy = edge.to.y - edge.from.y;
    const len = Math.hypot(dx, dy);
    const steps = Math.max(2, Math.min(10, Math.ceil(len / 40)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      samples.push({ x: edge.from.x + dx * t, y: edge.from.y + dy * t, edge });
    }
  }
  return d3.quadtree().x(d => d.x).y(d => d.y).addAll(samples);
}

function hitEdge(quadtree, px, py, tolerance) {
  const candidates = new Set();
  const radius = Math.max(tolerance, 24);
  quadtree.visit((node, x0, y0, x1, y1) => {
    if (!node.length) {
      let leaf = node;
      do { candidates.add(leaf.data.edge); } while ((leaf = leaf.next));
    }
    return x0 > px + radius || x1 < px - radius || y0 > py + radius || y1 < py - radius;
  });
  let best = null;
  let bestDist = tolerance;
  for (const edge of candidates) {
    const d = pointToSegment(px, py, edge.from.x, edge.from.y, edge.to.x, edge.to.y);
    if (d < bestDist) { bestDist = d; best = edge; }
  }
  return best;
}

function pointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
