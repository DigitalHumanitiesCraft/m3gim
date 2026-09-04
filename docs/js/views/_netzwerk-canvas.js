/**
 * Netzwerk canvas: SVG rendering, zoom and pan, hover highlight.
 *
 * The orchestrator (`netzwerk.js`) owns the state and passes it in read-only;
 * this module reports back only through `actions`.
 *
 * Line type carries the evidence and nothing else does (E-163):
 *   straight  — explicitly annotated AgRelOn relation to the focus
 *   curved    — Ko-Okkurrenz, derived from the documents, both from the focus
 *               and between two neighbours
 *
 * Vertrag:
 *   state    = { layout, coOccurrence }
 *   actions  = { setFocus(node), getHovered?() }
 *   zoomRefs = { behavior: null, svg: null }  — drawCanvas fills the fields,
 *              renderZoomControls reads them on click
 */

/* global d3 */

import { el, clear } from '../utils/dom.js';
import { truncate } from '../utils/format.js';
import { AGRELON_LABELS } from '../data/constants.js';
import { labelGeometry, NODE_TYPE_META } from './_netzwerk-geometry.js';

export const CANVAS_WIDTH = 920;
export const CANVAS_HEIGHT = 740;

export function renderCanvasSlot() {
  return el('div', { className: 'netzwerk__canvas', id: 'netzwerk-canvas' });
}

export function renderDetailSlot() {
  return el('aside', { className: 'netzwerk__detail', id: 'netzwerk-detail' });
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
  group.appendChild(el('button', {
    type: 'button', className: 'nz-zoom-btn nz-zoom-btn--reset',
    dataset: { tip: 'Zoom zurücksetzen', tipPos: 'bottom' },
    'aria-label': 'Zoom zurücksetzen',
    onClick: () => {
      if (zoomRefs.svg && zoomRefs.behavior) {
        zoomRefs.svg.transition().duration(220).call(zoomRefs.behavior.transform, d3.zoomIdentity);
      }
    },
  }, '⊙'));
  return group;
}

// ---------------------------------------------------------------------------
// drawCanvas
// ---------------------------------------------------------------------------

export function drawCanvas({ state, actions, zoomRefs }) {
  const slot = document.getElementById('netzwerk-canvas');
  if (!slot) return;
  clear(slot);
  const layout = state.layout;
  if (!layout || !layout.center) return;

  const svg = d3.create('svg')
    .attr('class', 'netzwerk-svg')
    .attr('viewBox', `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .attr('role', 'img')
    .attr('aria-label', `Netzwerk um ${layout.center.name}`);

  svg.append('rect')
    .attr('class', 'netzwerk-zoom-bg')
    .attr('width', CANVAS_WIDTH).attr('height', CANVAS_HEIGHT)
    .attr('fill', 'transparent');
  const zoomG = svg.append('g').attr('class', 'netzwerk-zoom-group');

  const zoomBehavior = d3.zoom()
    .scaleExtent([0.5, 4])
    .on('zoom', (ev) => zoomG.attr('transform', ev.transform));
  svg.call(zoomBehavior);
  zoomRefs.behavior = zoomBehavior;
  zoomRefs.svg = svg;
  // Doppelklick-Zoom aus: ein Klick auf einen Knoten wechselt den Fokus, ein
  // versehentlicher Doppelklick wuerde sonst gleichzeitig zoomen.
  svg.on('dblclick.zoom', null);

  const cx = layout.center.x;
  const cy = layout.center.y;

  // Orientierungsringe: zwei schwache Kreise, die die Evidenzstufen tragen.
  const ringsG = zoomG.append('g').attr('class', 'netzwerk-rings');
  for (const ring of [1, 2]) {
    if (!layout.nodes.some(n => n.ring === ring)) continue;
    ringsG.append('circle')
      .attr('cx', cx).attr('cy', cy).attr('r', layout.radii[ring])
      .attr('class', `netzwerk-ring netzwerk-ring--${ring}`);
  }

  const byId = new Map(layout.nodes.map(n => [n.id, n]));

  // Geschwungene Kanten: Fokus zu Nachbar ohne annotierte Beziehung, und
  // Nachbar zu Nachbar. Beides ist Ko-Okkurrenz, beides traegt dieselbe Form.
  const coocEdges = [];
  for (const e of layout.edges) {
    if (e.kind !== 'cooc') continue;
    const target = byId.get(e.b);
    if (target) coocEdges.push({ a: '__focus__', b: e.b, shared: e.shared, from: layout.center, to: target });
  }
  for (const e of state.coOccurrence || []) {
    const a = byId.get(e.a);
    const b = byId.get(e.b);
    if (a && b) coocEdges.push({ a: e.a, b: e.b, shared: e.shared, from: a, to: b });
  }

  const edgesG = zoomG.append('g').attr('class', 'netzwerk-cooccurrence');
  const edgeSel = edgesG.selectAll('path')
    .data(coocEdges)
    .enter()
    .append('path')
    .attr('class', 'netzwerk-edge')
    .attr('data-a', d => d.a)
    .attr('data-b', d => d.b)
    .attr('stroke-width', d => Math.min(2.6, 0.6 + Math.sqrt(d.shared) * 0.55))
    .attr('d', d => edgePath(d, cx, cy));
  edgeSel.append('title').text(d =>
    `${nameOf(d.from)}  ↔  ${nameOf(d.to)}\n`
    + `${d.shared} gemeinsame${d.shared === 1 ? 's Dokument' : ' Dokumente'}\n`
    + '(Ko-Okkurrenz, aus den Archivdatensätzen abgeleitet)');
  edgeSel
    .on('mouseenter', function (_ev, d) { applyEdgeHighlight([d.a, d.b], d); })
    .on('mouseleave', function () { applyHighlight(null); });

  // Gerade Radialen: explizit annotierte AgRelOn-Beziehungen zum Fokus.
  const strongNodes = layout.nodes.filter(n => n.evidence === 'strong');
  const linksG = zoomG.append('g').attr('class', 'netzwerk-links');
  const linkSel = linksG.selectAll('line')
    .data(strongNodes)
    .enter()
    .append('line')
    .attr('x1', d => d.x).attr('y1', d => d.y)
    .attr('x2', cx).attr('y2', cy)
    .attr('class', 'netzwerk-link')
    .attr('data-b', d => d.id)
    .attr('stroke-width', 1.6);
  linkSel.append('title').text(d => {
    const types = (d.entry.relations || [])
      .map(r => AGRELON_LABELS[r.type] || String(r.type).replace(/^agrelon:/, ''))
      .filter((v, i, a) => a.indexOf(v) === i);
    return `${layout.center.name}  ↔  ${d.name}\n`
      + `${types.length ? types.join(' · ') : 'AgRelOn-Beziehung'}\n`
      + '(explizit in den Metadaten annotiert, AgRelOn)';
  });
  linkSel
    .on('mouseenter', function (_ev, d) { applyEdgeHighlight(['__focus__', d.id], null); })
    .on('mouseleave', function () { applyHighlight(null); });

  // Knoten.
  const nodesG = zoomG.append('g').attr('class', 'netzwerk-nodes');
  const nodeSel = nodesG.selectAll('g.netzwerk-node')
    .data(layout.nodes, d => d.id)
    .enter()
    .append('g')
    .attr('class', d => `netzwerk-node netzwerk-node--${d.type} netzwerk-node--ring${d.ring}`)
    .attr('transform', d => `translate(${d.x}, ${d.y})`)
    .attr('data-id', d => d.id)
    .attr('role', 'button')
    .attr('tabindex', '0')
    .on('mouseenter', function (_ev, d) { applyHighlight(d); })
    .on('mouseleave', function () { applyHighlight(null); })
    .on('click', function (ev, d) { ev.stopPropagation(); actions.setFocus(d); })
    .on('keydown', function (ev, d) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); actions.setFocus(d); }
    });

  nodeSel.append('circle')
    .attr('r', d => d.r)
    // style() statt attr(): der Wert ist ein var()-Verweis auf die Design-Tokens,
    // den ein SVG-Attribut nicht aufloest.
    .style('fill', d => d.color)
    .attr('class', d => 'netzwerk-node__circle'
      + (d.evidence === 'weak' ? ' netzwerk-node__circle--weak' : ''));

  nodeSel.append('title').text(d =>
    `${NODE_TYPE_META[d.type].label}: ${d.name}\n`
    + `${d.weight} gemeinsame${d.weight === 1 ? 's Dokument' : ' Dokumente'} mit ${layout.center.name}\n`
    + 'Klick setzt den Fokus auf diesen Knoten');

  // Wikidata-Stern oben rechts am Knoten.
  nodeSel.filter(d => d.wikidata && String(d.wikidata).startsWith('wd:'))
    .append('path')
    .attr('class', 'netzwerk-node__qid')
    .attr('d', d => {
      const x = d.r * 0.70;
      const y = -d.r * 0.70;
      return `M ${x},${y - 2.5} L ${x + 2.5},${y + 1.8} L ${x - 2.5},${y + 1.8} Z`;
    });

  // Jedes Label tritt zunaechst als Dauer-Label an; declutterLabels nimmt
  // danach die weg, die sich ueberschneiden. So traegt ein duennes Bild alle
  // Namen und ein dichtes die wichtigsten.
  nodeSel.append('text')
    .attr('class', 'netzwerk-label netzwerk-label--always')
    .attr('text-anchor', d => labelGeometry(d.angle, d.r).anchor)
    .attr('dx', d => labelGeometry(d.angle, d.r).dx)
    .attr('dy', d => labelGeometry(d.angle, d.r).dy)
    .text(d => truncate(d.name, 24));

  // Zentrum zuletzt, damit es ueber den Kanten liegt.
  const centerG = zoomG.append('g').attr('class', 'netzwerk-center')
    .attr('transform', `translate(${cx}, ${cy})`);
  centerG.append('circle')
    .attr('r', layout.center.r)
    .attr('class', 'netzwerk-center__circle');
  // Das Label steht unter dem Zentrum, nicht darin: ein langer Name passt in
  // keinen Kreis, den die Kanten noch als Zentrum lesen lassen.
  centerG.append('text')
    .attr('class', 'netzwerk-center__label')
    .attr('text-anchor', 'middle')
    .attr('dy', layout.center.r + 16)
    .text(truncate(layout.center.name, 32));
  centerG.append('title').text(`Fokus: ${layout.center.name}`);

  slot.appendChild(svg.node());

  // Label-Entzerrung nach dem DOM-Insert: vorher liefert getBBox keine Masse.
  declutterLabels(nodeSel);
}

/**
 * Greedy-Entzerrung der Dauer-Labels: nach Prioritaet (innerer Ring zuerst,
 * dann Dokumentzahl) sortiert, ein Label behaelt seinen --always-Status nur,
 * wenn seine Box keine bereits behaltene schneidet. Positionen sind
 * deterministisch, also ist auch das Ergebnis stabil.
 */
function declutterLabels(nodeSel) {
  const labels = [];
  nodeSel.each(function (d) {
    const textEl = this.querySelector('text.netzwerk-label--always');
    if (!textEl) return;
    let bb;
    try { bb = textEl.getBBox(); } catch (_e) { return; }
    if (!bb || (bb.width === 0 && bb.height === 0)) return;
    labels.push({
      el: textEl,
      priority: (d.ring === 1 ? 10000 : 0) + d.weight,
      box: { x: d.x + bb.x, y: d.y + bb.y, w: bb.width, h: bb.height },
    });
  });
  labels.sort((a, b) => b.priority - a.priority);
  const kept = [];
  const pad = 1.5;
  for (const l of labels) {
    const b = l.box;
    const hit = kept.some(k =>
      b.x < k.x + k.w + pad && b.x + b.w + pad > k.x &&
      b.y < k.y + k.h + pad && b.y + b.h + pad > k.y);
    if (hit) l.el.classList.remove('netzwerk-label--always');
    else kept.push(b);
  }
}

// ---------------------------------------------------------------------------
// Highlight — reine DOM-Mutation
// ---------------------------------------------------------------------------

/** Hover auf einen Knoten: seine Nachbarschaft hervorheben, den Rest daempfen. */
function applyHighlight(node) {
  if (!node) {
    d3.selectAll('.netzwerk-node')
      .classed('netzwerk-node--dim', false)
      .classed('netzwerk-node--hover', false)
      .classed('netzwerk-node--neighbour', false);
    d3.selectAll('.netzwerk-edge')
      .classed('netzwerk-edge--dim', false)
      .classed('netzwerk-edge--active', false);
    d3.selectAll('.netzwerk-link')
      .classed('netzwerk-link--dim', false)
      .classed('netzwerk-link--active', false);
    return;
  }
  const neighbours = new Set([node.id]);
  d3.selectAll('.netzwerk-edge').each(function () {
    const a = this.getAttribute('data-a');
    const b = this.getAttribute('data-b');
    if (a === node.id || b === node.id) { neighbours.add(a); neighbours.add(b); }
  });
  const touches = function () {
    return this.getAttribute('data-a') === node.id || this.getAttribute('data-b') === node.id;
  };
  d3.selectAll('.netzwerk-edge')
    .classed('netzwerk-edge--active', touches)
    .classed('netzwerk-edge--dim', function () { return !touches.call(this); });
  d3.selectAll('.netzwerk-link')
    .classed('netzwerk-link--active', function () { return this.getAttribute('data-b') === node.id; })
    .classed('netzwerk-link--dim', function () { return this.getAttribute('data-b') !== node.id; });
  d3.selectAll('.netzwerk-node')
    .classed('netzwerk-node--dim', n => !neighbours.has(n.id))
    .classed('netzwerk-node--neighbour', n => neighbours.has(n.id) && n.id !== node.id)
    .classed('netzwerk-node--hover', n => n.id === node.id);
}

/**
 * Hover auf eine Kante: genau ihre Endpunkte beleuchten. Unterschied zum
 * Knoten-Hover, wo die ganze Nachbarschaft aufleuchtet — hier soll die eine
 * Verbindung lesbar werden.
 * @param {string[]} endpointIds  Knoten-Ids der Kante ('__focus__' fuer das Zentrum)
 * @param {?{a: string, b: string}} edge  gesetzt bei einer Ko-Okkurrenz-Kante
 */
function applyEdgeHighlight(endpointIds, edge) {
  const focusIds = new Set(endpointIds);
  d3.selectAll('.netzwerk-edge')
    .classed('netzwerk-edge--active', function () {
      return !!edge && this.getAttribute('data-a') === edge.a
        && this.getAttribute('data-b') === edge.b;
    })
    .classed('netzwerk-edge--dim', function () {
      return !(edge && this.getAttribute('data-a') === edge.a
        && this.getAttribute('data-b') === edge.b);
    });
  d3.selectAll('.netzwerk-link')
    .classed('netzwerk-link--active', function () {
      return !edge && focusIds.has(this.getAttribute('data-b'));
    })
    .classed('netzwerk-link--dim', function () {
      return !(!edge && focusIds.has(this.getAttribute('data-b')));
    });
  d3.selectAll('.netzwerk-node')
    .classed('netzwerk-node--hover', n => focusIds.has(n.id))
    .classed('netzwerk-node--neighbour', false)
    .classed('netzwerk-node--dim', n => !focusIds.has(n.id));
}

// ---------------------------------------------------------------------------
// Helfer
// ---------------------------------------------------------------------------

function nameOf(node) {
  return node && node.name ? node.name : '?';
}

/**
 * Quadratischer Bezier zwischen zwei Punkten, Kontrollpunkt 55 Prozent Richtung
 * Zentrum gezogen — sanft gebuendelte Baender statt Diagonalen-Chaos. Die
 * Endpunkte sitzen auf dem Knotenrand, damit keine Linie durch einen Kreis
 * laeuft.
 */
function edgePath(edge, cx, cy) {
  const a = edge.from;
  const b = edge.to;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const controlX = mx + (cx - mx) * 0.55;
  const controlY = my + (cy - my) * 0.55;
  const [ax, ay] = onRim(a, controlX, controlY);
  const [bx, by] = onRim(b, controlX, controlY);
  return `M ${ax} ${ay} Q ${controlX} ${controlY} ${bx} ${by}`;
}

function onRim(node, towardX, towardY) {
  const dx = towardX - node.x;
  const dy = towardY - node.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return [node.x + (dx / len) * node.r, node.y + (dy / len) * node.r];
}
