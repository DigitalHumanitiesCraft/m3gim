/**
 * Netzwerk-Canvas: SVG-Rendering, Zoom-Controls, Hover-/Highlight-Logik.
 *
 * Extrahiert aus network.js (E-93, Session 47). Der Haupt-View bleibt
 * Eigentuemer des Zustands (`state.layout`, `state.coOccurrence`,
 * `state.svgSize`, `state.selected`), Canvas liest diesen lesend und
 * kommuniziert Aenderungen nur ueber `actions`-Callbacks.
 *
 * Exporte:
 *   renderCanvasSlot()   — leerer Container, drawCanvas rendert hinein
 *   renderDetailSlot()   — leerer Container, network.js::drawDetail rendert hinein
 *   renderZoomControls(zoomRefs)  — +/−/⊙-Buttons, lesen zoomRefs bei Click
 *   drawCanvas({ state, actions, zoomRefs }) — Hauptroutine
 *   applyHighlight(node|null)     — DOM-Mutation: Nachbarn hervorheben / Reset
 *   applyEdgeHighlight(kind, data)— DOM-Mutation: eine Kante + Endpunkte fokussieren
 *
 * Vertrag des `state`-Objekts:
 *   state = { layout, coOccurrence, svgSize }
 *
 * Vertrag des `actions`-Objekts:
 *   getSelected() -> node|null     — aktueller Pin-Zustand (fuer Hover-Gating)
 *   setSelected(node|null)         — Pin setzen; Orchestrator aktualisiert
 *                                    _selected und ruft drawDetail()
 *
 * Vertrag des `zoomRefs`-Objekts:
 *   zoomRefs = { behavior: null, svg: null }
 *   drawCanvas mutiert die Felder nach der Zoom-Initialisierung.
 *   renderZoomControls liest sie bei Click (nach drawCanvas garantiert gesetzt).
 */

/* global d3 */

import { el, clear } from '../utils/dom.js';
import { AGRELON_LABELS } from '../data/constants.js';
import { labelGeometry } from './_network-geometry.js';

// ---------------------------------------------------------------------------
// Slot-Renderer — liefern leere Container, die drawCanvas/drawDetail fuellen.
// ---------------------------------------------------------------------------

export function renderCanvasSlot() {
  return el('div', { className: 'netzwerk__canvas-container', id: 'netzwerk-canvas' });
}

export function renderDetailSlot() {
  return el('aside', { className: 'netzwerk__detail netzwerk__detail--hidden', id: 'netzwerk-detail' });
}

export function renderZoomControls(zoomRefs) {
  const group = el('div', { className: 'netzwerk__zoom-controls' });
  const zoomBy = (factor) => {
    if (zoomRefs.svg && zoomRefs.behavior) {
      zoomRefs.svg.transition().duration(180).call(zoomRefs.behavior.scaleBy, factor);
    }
  };
  group.appendChild(el('button', {
    type: 'button', className: 'nz-zoom-btn', title: 'Hineinzoomen',
    onClick: () => zoomBy(1.4),
  }, '+'));
  group.appendChild(el('button', {
    type: 'button', className: 'nz-zoom-btn', title: 'Herauszoomen',
    onClick: () => zoomBy(1 / 1.4),
  }, '−'));
  group.appendChild(el('button', {
    type: 'button', className: 'nz-zoom-btn nz-zoom-btn--reset', title: 'Zoom zurücksetzen',
    onClick: () => {
      if (zoomRefs.svg && zoomRefs.behavior) {
        zoomRefs.svg.transition().duration(220).call(zoomRefs.behavior.transform, d3.zoomIdentity);
      }
    },
  }, '⊙'));
  return group;
}

// ---------------------------------------------------------------------------
// drawCanvas — Haupt-Rendering
// ---------------------------------------------------------------------------

export function drawCanvas({ state, actions, zoomRefs }) {
  const slot = document.getElementById('netzwerk-canvas');
  if (!slot || !state.layout) return;
  clear(slot);

  const { w, h } = state.svgSize;
  const svg = d3.create('svg')
    .attr('class', 'netzwerk-svg')
    .attr('viewBox', `0 0 ${w} ${h}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Zoom-Wrapper: alle Inhalte kommen in eine Group, die via d3.zoom
  // transformiert wird. Background-Rect fuer Pan-Erkennung.
  svg.append('rect')
    .attr('class', 'netzwerk-zoom-bg')
    .attr('width', w).attr('height', h)
    .attr('fill', 'transparent');
  const zoomG = svg.append('g').attr('class', 'netzwerk-zoom-group');

  const zoomBehavior = d3.zoom()
    .scaleExtent([0.5, 4])
    .on('zoom', (ev) => zoomG.attr('transform', ev.transform));
  svg.call(zoomBehavior);
  // zoomRefs ans Orchestrator-Objekt ruecksignalisieren, damit die Zoom-
  // Control-Buttons via Closure darauf zugreifen.
  zoomRefs.behavior = zoomBehavior;
  zoomRefs.svg = svg;
  // Doppelklick-Zoom abschalten (Doppelklick waere sonst ein Konflikt
  // mit unserem Pin-Toggle).
  svg.on('dblclick.zoom', null);

  const cx = state.layout.center.x;
  const cy = state.layout.center.y;

  // Lookup-Map fuer Edge-Rendering (Name -> Node), lokal zu diesem Render-Pass.
  const nodeByName = new Map();
  for (const n of state.layout.nodes) nodeByName.set(n.name, n);

  // Hintergrund-Ringe (schwach, nur als Orientierungslinien).
  const ringsG = zoomG.append('g').attr('class', 'netzwerk-rings');
  for (const [i, node] of [[1, state.layout.nodes.find(n => n.ring === 1)], [2, state.layout.nodes.find(n => n.ring === 2)]]) {
    if (!node) continue;
    const R = Math.sqrt((node.x - cx) ** 2 + (node.y - cy) ** 2);
    ringsG.append('circle')
      .attr('cx', cx).attr('cy', cy).attr('r', R)
      .attr('class', `netzwerk-ring netzwerk-ring--${i}`);
  }

  // Ko-Okkurrenz-Kanten zwischen Knoten: wer tauchte mit wem in denselben
  // Dokumenten auf? Quadratische Beziers mit Kontrollpunkt nahe am Zentrum
  // — die Kurven buendeln sich sanft in Richtung Malaniuk, ohne das
  // Hub-Sternchen wieder zu erzeugen.
  const edgesG = zoomG.append('g').attr('class', 'netzwerk-cooccurrence');
  const edgeSel = edgesG.selectAll('path')
    .data(state.coOccurrence)
    .enter()
    .append('path')
    .attr('class', 'netzwerk-edge')
    .attr('data-a', d => d.a)
    .attr('data-b', d => d.b)
    .attr('stroke-width', d => Math.min(2.6, 0.6 + Math.sqrt(d.shared) * 0.55))
    .attr('d', d => edgePath(d, nodeByName, cx, cy));
  // Native SVG-Tooltip: erklaert, warum die Kante da ist.
  edgeSel.append('title')
    .text(d => `${d.a}  ↔  ${d.b}\n${d.shared} gemeinsame Dokument${d.shared === 1 ? '' : 'e'}\n(Ko-Okkurrenz, aus den Archivdatensätzen abgeleitet)`);
  // Hover: beide Endpunkt-Knoten fokussieren, Rest dimmen.
  edgeSel
    .on('mouseenter', function (_ev, d) {
      if (actions.getSelected()) return;
      applyEdgeHighlight('cooc', d);
    })
    .on('mouseleave', function () {
      if (actions.getSelected()) return;
      applyHighlight(null);
    });

  // Schwache Radial-Linien fuer die AgRelOn-strukturierten Knoten — die
  // expliziten Malaniuk-Beziehungen sichtbar halten.
  const strongG = zoomG.append('g').attr('class', 'netzwerk-links');
  const strongSel = strongG.selectAll('line')
    .data(state.layout.nodes.filter(n => n.evidence === 'strong'))
    .enter()
    .append('line')
    .attr('x1', d => d.x).attr('y1', d => d.y)
    .attr('x2', cx).attr('y2', cy)
    .attr('class', 'netzwerk-link netzwerk-link--strong')
    .attr('stroke-width', 1.6);
  strongSel.append('title')
    .text(d => {
      const types = (d.entry.relations || [])
        .map(r => AGRELON_LABELS[r.type] || String(r.type).replace(/^agrelon:/, ''))
        .filter((v, i, a) => a.indexOf(v) === i);
      const typeLine = types.length ? types.join(' · ') : 'AgRelOn-Beziehung';
      return `Malaniuk, Ira  ↔  ${d.name}\n${typeLine}\n(explizit in den Metadaten annotiert, AgRelOn)`;
    });
  strongSel
    .on('mouseenter', function (_ev, d) {
      if (actions.getSelected()) return;
      applyEdgeHighlight('agrelon', d);
    })
    .on('mouseleave', function () {
      if (actions.getSelected()) return;
      applyHighlight(null);
    });

  // Knoten-Gruppen (Kreis + optional Stern + Label).
  const nodesG = zoomG.append('g').attr('class', 'netzwerk-nodes');
  const nodeSel = nodesG.selectAll('g.netzwerk-node')
    .data(state.layout.nodes, d => d.name)
    .enter()
    .append('g')
    .attr('class', d => `netzwerk-node netzwerk-node--ring${d.ring} netzwerk-node--${d.evidence}`)
    .attr('transform', d => `translate(${d.x}, ${d.y})`)
    .attr('data-name', d => d.name)
    .on('mouseenter', function (_ev, d) {
      if (actions.getSelected()) return;
      applyHighlight(d);
    })
    .on('mouseleave', function () {
      if (actions.getSelected()) return;
      applyHighlight(null);
    })
    .on('click', function (ev, d) {
      ev.stopPropagation();
      const current = actions.getSelected();
      const next = (current && current.name === d.name) ? null : d;
      actions.setSelected(next);
      // Klassenwechsel + Highlight-Pin in einem.
      d3.selectAll('.netzwerk-node').classed('netzwerk-node--selected', false);
      if (next) {
        d3.selectAll('.netzwerk-node').filter(n => n.name === next.name).classed('netzwerk-node--selected', true);
        applyHighlight(next);
      } else {
        applyHighlight(null);
      }
    });

  nodeSel.append('circle')
    .attr('r', d => d.r)
    // style() statt attr(): der Wert ist `var(--color-netzwerk-*)`
    // aus den Design-Tokens, SVG-Attribute wuerden var() nicht aufloesen.
    .style('fill', d => d.color)
    .attr('class', d => d.evidence === 'weak' ? 'netzwerk-node__circle netzwerk-node__circle--weak' : 'netzwerk-node__circle');

  // Wikidata-Stern oben rechts — nur Ring 1+2, kleiner als die Knoten selbst.
  nodeSel.filter(d => d.ring !== 3 && d.entry.wikidata && String(d.entry.wikidata).startsWith('wd:'))
    .append('path')
    .attr('class', 'netzwerk-node__qid')
    .attr('d', d => {
      const r = d.r;
      const x = r * 0.70;
      const y = -r * 0.70;
      return `M ${x},${y - 2.5} L ${x + 2.5},${y + 1.8} L ${x - 2.5},${y + 1.8} Z`;
    });

  // Labels: an jeden Knoten appendet, aber per CSS gesteuert, welche immer
  // sichtbar sind (Ring 1; Ring 2 ab >=3 Records).
  nodeSel.append('text')
    .attr('class', d => {
      let cls = 'netzwerk-label';
      if (d.ring === 1) cls += ' netzwerk-label--always';
      else if (d.ring === 2 && d.entry.records.size >= 3) cls += ' netzwerk-label--always';
      return cls;
    })
    .attr('text-anchor', d => labelGeometry(d.labelAngle, d.r).anchor)
    .attr('dx', d => labelGeometry(d.labelAngle, d.r).dx)
    .attr('dy', d => labelGeometry(d.labelAngle, d.r).dy)
    .text(d => shortenLabel(d.name));

  // Zentrum zuletzt, damit es ueber den Ring-Kanten liegt.
  const centerG = zoomG.append('g').attr('class', 'netzwerk-center')
    .attr('transform', `translate(${cx}, ${cy})`);
  centerG.append('circle')
    .attr('r', state.layout.center.r)
    .attr('class', 'netzwerk-center__circle');
  centerG.append('text')
    .attr('class', 'netzwerk-center__label')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .text('Malaniuk, Ira');

  // Reset-Klick aufs leere Canvas (nur wenn das SVG selbst getroffen wird,
  // nicht ein Child — sonst werden Node-Klicks geschluckt).
  svg.on('click', function (ev) {
    if (ev.target !== this) return;
    actions.setSelected(null);
    d3.selectAll('.netzwerk-node').classed('netzwerk-node--selected', false);
    applyHighlight(null);
  });

  slot.appendChild(svg.node());
}

// ---------------------------------------------------------------------------
// Highlight-Routinen — reine DOM-Mutation, werden auch vom Detail-Panel
// aus network.js aus aufgerufen (Close-Button).
// ---------------------------------------------------------------------------

export function applyHighlight(node) {
  if (!node) {
    d3.selectAll('.netzwerk-node')
      .classed('netzwerk-node--dim', false)
      .classed('netzwerk-node--hover', false)
      .classed('netzwerk-node--neighbour', false);
    d3.selectAll('.netzwerk-edge')
      .classed('netzwerk-edge--dim', false)
      .classed('netzwerk-edge--active', false);
    d3.selectAll('.netzwerk-link')
      .classed('netzwerk-link--active', false);
    return;
  }
  // Nachbarschaft aus den Ko-Okkurrenz-Kanten ableiten.
  const neighbours = new Set([node.name]);
  d3.selectAll('.netzwerk-edge').each(function () {
    const a = this.getAttribute('data-a');
    const b = this.getAttribute('data-b');
    if (a === node.name || b === node.name) { neighbours.add(a); neighbours.add(b); }
  });
  d3.selectAll('.netzwerk-edge').classed('netzwerk-edge--dim', function () {
    const a = this.getAttribute('data-a');
    const b = this.getAttribute('data-b');
    return !(a === node.name || b === node.name);
  }).classed('netzwerk-edge--active', function () {
    const a = this.getAttribute('data-a');
    const b = this.getAttribute('data-b');
    return a === node.name || b === node.name;
  });
  d3.selectAll('.netzwerk-node')
    .classed('netzwerk-node--dim', n => !neighbours.has(n.name))
    .classed('netzwerk-node--neighbour', n => neighbours.has(n.name) && n.name !== node.name);
  d3.selectAll('.netzwerk-node').filter(n => n.name === node.name).classed('netzwerk-node--hover', true);
}

/**
 * Kanten-Hover-Highlight: zeigt genau die beiden Endpunkte einer
 * Ko-Okkurrenz-Kante bzw. den Endpunkt einer AgRelOn-Radiallinie.
 *
 * Unterschied zu applyHighlight (Knoten-Hover): dort werden *alle*
 * Nachbarn eines Knotens beleuchtet; hier nur die eine Kante und ihre
 * 1-2 Endpunkte. So wird die konkrete Verbindung klar lesbar.
 *
 * @param {'cooc'|'agrelon'} kind
 * @param {{a?:string, b?:string, name?:string}} data
 */
export function applyEdgeHighlight(kind, data) {
  const focusNames = new Set();
  if (kind === 'cooc') { focusNames.add(data.a); focusNames.add(data.b); }
  else if (kind === 'agrelon') { focusNames.add(data.name); }

  d3.selectAll('.netzwerk-edge')
    .classed('netzwerk-edge--active', function () {
      if (kind !== 'cooc') return false;
      return this.getAttribute('data-a') === data.a
          && this.getAttribute('data-b') === data.b;
    })
    .classed('netzwerk-edge--dim', function () {
      if (kind !== 'cooc') return true;
      return !(this.getAttribute('data-a') === data.a
            && this.getAttribute('data-b') === data.b);
    });

  d3.selectAll('.netzwerk-link')
    .classed('netzwerk-link--active', function (d) {
      return kind === 'agrelon' && d && d.name === data.name;
    });

  d3.selectAll('.netzwerk-node')
    .classed('netzwerk-node--hover', n => focusNames.has(n.name))
    .classed('netzwerk-node--neighbour', false)
    .classed('netzwerk-node--dim', n => !focusNames.has(n.name));
}

// ---------------------------------------------------------------------------
// Module-interne Helfer (nicht exportiert)
// ---------------------------------------------------------------------------

/**
 * Quadratischer Bezier-Pfad zwischen zwei Knoten. Kontrollpunkt liegt 55%
 * zum Zentrum gezogen — sanft gebuendelte Baender statt Diagonalen-Chaos.
 * Endpunkte werden auf die Knoten-Boundary geschoben (kein Durchschneiden).
 */
function edgePath(edge, nodeByName, cx, cy) {
  const a = nodeByName.get(edge.a);
  const b = nodeByName.get(edge.b);
  if (!a || !b) return '';
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const controlX = mx + (cx - mx) * 0.55;
  const controlY = my + (cy - my) * 0.55;
  const ax = a.x + unit(controlX - a.x, controlY - a.y) * a.r;
  const ay = a.y + unitY(controlX - a.x, controlY - a.y) * a.r;
  const bx = b.x + unit(controlX - b.x, controlY - b.y) * b.r;
  const by = b.y + unitY(controlX - b.x, controlY - b.y) * b.r;
  return `M ${ax} ${ay} Q ${controlX} ${controlY} ${bx} ${by}`;
}

function unit(dx, dy) {
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return dx / len;
}
function unitY(dx, dy) {
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return dy / len;
}

/** Label-Kuerzung: max. 22 Zeichen, sonst Nachname + Vorname-Initial. */
function shortenLabel(name) {
  if (!name) return '';
  if (name.length <= 22) return name;
  const parts = name.split(',');
  if (parts.length >= 2) {
    const last = parts[0].trim();
    const firstInitial = parts[1].trim().charAt(0);
    return `${last}, ${firstInitial}.`;
  }
  return name.slice(0, 20) + '…';
}
