/**
 * M³GIM Kosmos View — Deterministic concentric repertoire visualization (D3.js).
 * Three rings: Malaniuk (center) → Composers (ring 1) → Works (ring 2).
 * Positions computed analytically — same data always produces the same layout.
 */

import { aggregateKosmos } from '../data/aggregator.js';
import { selectRecord, navigateToIndex, navigateToView } from '../ui/router.js';
import { el, clear } from '../utils/dom.js';

let rendered = false;
let storeRef = null;
let tooltipEl = null;

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function renderKosmos(store, container) {
  if (rendered) return;
  rendered = true;
  storeRef = store;

  const data = aggregateKosmos(store);
  clear(container);

  // Tooltip (floating HTML div over SVG, like Mobilität)
  tooltipEl = el('div', { className: 'kosmos-tooltip' });
  container.appendChild(tooltipEl);

  const svgContainer = el('div', { className: 'kosmos-container' });
  container.appendChild(svgContainer);

  buildVisualization(data, store, svgContainer);

  container.appendChild(buildLegend(data));
}

export function resetKosmos() {
  rendered = false;
  storeRef = null;
}

/* ------------------------------------------------------------------ */
/*  Main visualization builder                                         */
/* ------------------------------------------------------------------ */

function buildVisualization(data, store, svgContainer) {
  const width = svgContainer.clientWidth || 900;
  const height = svgContainer.clientHeight || 600;
  const cx = width / 2;
  const cy = height / 2;

  // Ring radii — proportional to container
  const R1 = Math.min(width, height) * 0.22; // Composer ring
  const R2 = Math.min(width, height) * 0.40; // Work ring

  const svg = d3.select(svgContainer).append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Zoom/Pan
  const zoomGroup = svg.append('g').attr('class', 'kosmos-zoom-group');
  const zoom = d3.zoom()
    .scaleExtent([0.3, 3])
    .on('zoom', (event) => zoomGroup.attr('transform', event.transform));
  svg.call(zoom);

  // Compute deterministic layout
  const { nodes, links } = computeLayout(data, cx, cy, R1, R2);

  // Draw links
  const linkSel = zoomGroup.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', 'kosmos-link')
    .attr('x1', d => d.x1).attr('y1', d => d.y1)
    .attr('x2', d => d.x2).attr('y2', d => d.y2)
    .attr('stroke', d => d.color)
    .attr('stroke-width', d => Math.max(1, Math.sqrt(d.value)))
    .attr('stroke-opacity', 0.4);

  // Draw nodes
  const nodeSel = zoomGroup.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', d => `kosmos-node kosmos-node--${d.type}`)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);

  // Node shapes: circles for Zentrum/Komponist/Oper-Werke, diamonds for Lied-Werke
  nodeSel.each(function(d) {
    const g = d3.select(this);
    if (d.type === 'werk' && !d.istOper) {
      // Diamond (rotated square) for Lied/Konzert
      const s = d.r * 1.4;
      g.append('rect')
        .attr('x', -s / 2).attr('y', -s / 2)
        .attr('width', s).attr('height', s)
        .attr('transform', 'rotate(45)')
        .attr('fill', d.color)
        .attr('opacity', 0.45)
        .attr('rx', 1);
    } else {
      // Circle for everything else
      g.append('circle')
        .attr('r', d.r)
        .attr('fill', d.color)
        .attr('opacity', d.type === 'zentrum' ? 0.9 : d.type === 'komponist' ? 0.85 : 0.65)
        .attr('stroke', d.type === 'zentrum' ? '#003366' : 'none')
        .attr('stroke-width', d.type === 'zentrum' ? 2 : 0);
    }
  });

  // Zentrum label
  nodeSel.filter(d => d.type === 'zentrum')
    .append('text')
    .attr('class', 'kosmos-label kosmos-label--zentrum')
    .attr('text-anchor', 'middle')
    .attr('dy', 5)
    .text('Malaniuk');

  // Composer labels — tangential, flipped on left hemisphere
  nodeSel.filter(d => d.type === 'komponist')
    .append('text')
    .attr('class', 'kosmos-label kosmos-label--komponist')
    .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
    .attr('dx', d => (d.angle > Math.PI ? -(d.r + 6) : d.r + 6))
    .attr('dy', 4)
    .text(d => d.name);

  // Role badges for opera works
  nodeSel.filter(d => d.type === 'werk' && d.rolleHaupt)
    .append('text')
    .attr('class', 'kosmos-role-badge')
    .attr('text-anchor', 'middle')
    .attr('dy', d => -(d.r + 5))
    .text(d => d.rolleHaupt);

  // Permanent labels for top works (>= 3 docs)
  nodeSel.filter(d => d.type === 'werk' && d.docs >= 3)
    .append('text')
    .attr('class', 'kosmos-label kosmos-label--werk')
    .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
    .attr('dx', d => (d.angle > Math.PI ? -(d.r + 4) : d.r + 4))
    .attr('dy', 4)
    .text(d => d.name.length > 22 ? d.name.slice(0, 20) + '\u2026' : d.name);

  // "Andere" label
  nodeSel.filter(d => d.type === 'andere')
    .append('text')
    .attr('class', 'kosmos-label kosmos-label--andere')
    .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
    .attr('dx', d => (d.angle > Math.PI ? -(d.r + 6) : d.r + 6))
    .attr('dy', 4)
    .text(d => `${d.count} weitere`);

  // Interactive states
  setupInteractions(nodeSel, linkSel, nodes, store, svgContainer);

  // Zoom reset button
  svgContainer.appendChild(el('button', {
    className: 'kosmos-zoom-reset',
    title: 'Zoom zur\u00fccksetzen',
    onClick: () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity),
    html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Reset',
  }));
}

/* ------------------------------------------------------------------ */
/*  Deterministic layout computation                                   */
/* ------------------------------------------------------------------ */

function computeLayout(data, cx, cy, R1, R2) {
  const nodes = [];
  const links = [];

  // Node size scales
  const allKomps = [...data.komponisten, ...data.andere];
  const maxCompDocs = d3.max(allKomps, k => k.dokumente_gesamt) || 1;
  const compScale = d3.scaleSqrt().domain([1, maxCompDocs]).range([12, 30]);

  // Zentrum
  nodes.push({
    id: 'zentrum', type: 'zentrum',
    name: data.zentrum.name, x: cx, y: cy,
    r: 35, color: '#004A8F', angle: 0,
  });

  // Total documents for angular proportions
  const andereDocs = data.andere.reduce((s, k) => s + k.dokumente_gesamt, 0);
  const totalDocs = data.totalDocs || (data.komponisten.reduce((s, k) => s + k.dokumente_gesamt, 0) + andereDocs);

  // Angular allocation: each composer gets angle proportional to docs
  // Start from top (angle = 0 = 12 o'clock)
  let cumulativeDocs = 0;

  for (const komp of data.komponisten) {
    const startAngle = (cumulativeDocs / totalDocs) * 2 * Math.PI;
    const endAngle = ((cumulativeDocs + komp.dokumente_gesamt) / totalDocs) * 2 * Math.PI;
    const midAngle = (startAngle + endAngle) / 2;

    const compX = cx + R1 * Math.sin(midAngle);
    const compY = cy - R1 * Math.cos(midAngle);
    const compId = `comp_${komp.name}`;

    nodes.push({
      id: compId, type: 'komponist',
      name: komp.name, x: compX, y: compY,
      r: compScale(komp.dokumente_gesamt),
      color: komp.farbe, docs: komp.dokumente_gesamt,
      angle: midAngle,
    });

    links.push({
      x1: cx, y1: cy, x2: compX, y2: compY,
      color: komp.farbe, value: komp.dokumente_gesamt,
    });

    // Works fan out within composer's angular range
    let workCumulative = 0;
    for (const werk of komp.werke) {
      if (werk.dokumente === 0) continue;
      const workFraction = (workCumulative + werk.dokumente / 2) / komp.dokumente_gesamt;
      const workAngle = startAngle + workFraction * (endAngle - startAngle);
      const werkX = cx + R2 * Math.sin(workAngle);
      const werkY = cy - R2 * Math.cos(workAngle);
      const werkR = Math.max(4, Math.sqrt(werk.dokumente) * 3.5);

      nodes.push({
        id: `werk_${komp.name}_${werk.name}`, type: 'werk',
        name: werk.name, x: werkX, y: werkY,
        r: werkR, color: komp.farbe,
        docs: werk.dokumente, signaturen: werk.signaturen,
        parentKomp: komp.name,
        rolleHaupt: werk.rolleHaupt, istOper: werk.istOper,
        orte: werk.orte, angle: workAngle,
      });

      links.push({
        x1: compX, y1: compY, x2: werkX, y2: werkY,
        color: komp.farbe, value: werk.dokumente,
      });

      workCumulative += werk.dokumente;
    }

    cumulativeDocs += komp.dokumente_gesamt;
  }

  // "Andere" cluster — single meta-node for minor composers
  if (data.andere.length > 0) {
    const startAngle = (cumulativeDocs / totalDocs) * 2 * Math.PI;
    const endAngle = ((cumulativeDocs + andereDocs) / totalDocs) * 2 * Math.PI;
    const midAngle = (startAngle + endAngle) / 2;
    const andereX = cx + R1 * Math.sin(midAngle);
    const andereY = cy - R1 * Math.cos(midAngle);

    nodes.push({
      id: 'andere', type: 'andere',
      name: 'Andere', x: andereX, y: andereY,
      r: 16, color: '#757575', docs: andereDocs,
      count: data.andere.length, children: data.andere,
      angle: midAngle, startAngle, endAngle,
    });

    links.push({
      x1: cx, y1: cy, x2: andereX, y2: andereY,
      color: '#757575', value: andereDocs,
    });
  }

  return { nodes, links };
}

/* ------------------------------------------------------------------ */
/*  Interactions                                                        */
/* ------------------------------------------------------------------ */

function setupInteractions(nodeSel, linkSel, nodes, store, svgContainer) {
  // Cursor
  nodeSel.style('cursor', d => d.type === 'zentrum' ? 'default' : 'pointer');

  // Hover → floating tooltip
  nodeSel
    .on('mouseenter', (event, d) => showTooltip(event, d))
    .on('mousemove', (event) => moveTooltip(event))
    .on('mouseleave', () => hideTooltip());

  // Click
  nodeSel.on('click', (event, d) => {
    event.stopPropagation();
    if (d.type === 'zentrum') return;

    if (d.type === 'komponist') {
      highlightComposer(d.name, nodeSel, linkSel, nodes);
      showKomponistPopup(event, d, svgContainer);
    } else if (d.type === 'werk' && d.signaturen && d.signaturen.length > 0) {
      showWerkPopup(event, d, store, svgContainer);
    } else if (d.type === 'andere') {
      expandAndere(d, nodeSel, linkSel, nodes, svgContainer);
    }
  });

  // Double-click to reset highlight
  d3.select(svgContainer).select('svg')
    .on('dblclick.reset', () => resetHighlight(nodeSel, linkSel));
}

function showTooltip(event, d) {
  if (!tooltipEl) return;
  let html = '';
  if (d.type === 'zentrum') {
    html = '<strong>Ira Malaniuk</strong><br>Mezzosopran, 1919\u20132009';
  } else if (d.type === 'komponist') {
    html = `<strong>${d.name}</strong><br>${d.docs} Dokumente`;
  } else if (d.type === 'andere') {
    html = `<strong>${d.count} weitere Komponisten</strong><br>${d.docs} Dokumente<br><em>Klick zum Aufklappen</em>`;
  } else if (d.type === 'werk') {
    html = `<strong>${d.name}</strong>`;
    if (d.parentKomp) html += `<br>${d.parentKomp}`;
    if (d.rolleHaupt) html += `<br>Rolle: ${d.rolleHaupt}`;
    if (d.orte && d.orte.length > 0) {
      html += '<br>' + d.orte.slice(0, 3).map(o => o.name).join(', ');
    }
    html += `<br>${d.docs} Dok.`;
  }
  tooltipEl.innerHTML = html;
  tooltipEl.classList.add('kosmos-tooltip--visible');
  moveTooltip(event);
}

function moveTooltip(event) {
  if (!tooltipEl) return;
  const container = tooltipEl.parentElement;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  tooltipEl.style.left = `${event.clientX - rect.left + 12}px`;
  tooltipEl.style.top = `${event.clientY - rect.top - 10}px`;
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.classList.remove('kosmos-tooltip--visible');
}

/* ------------------------------------------------------------------ */
/*  Highlight / Reset                                                  */
/* ------------------------------------------------------------------ */

function highlightComposer(name, nodeSel, linkSel, nodes) {
  const related = new Set([`comp_${name}`, 'zentrum']);
  for (const n of nodes) {
    if (n.parentKomp === name) related.add(n.id);
  }

  nodeSel.select('circle')
    .transition().duration(200)
    .attr('opacity', d => related.has(d.id) ? 0.9 : 0.1);
  nodeSel.select('rect')
    .transition().duration(200)
    .attr('opacity', d => related.has(d.id) ? 0.7 : 0.05);
  nodeSel.selectAll('text')
    .transition().duration(200)
    .attr('opacity', d => related.has(d.id) ? 1 : 0.15);

  linkSel.transition().duration(200)
    .attr('stroke-opacity', d => {
      // Links don't have node IDs — match by coordinates
      const compNode = nodes.find(n => n.id === `comp_${name}`);
      if (!compNode) return 0.05;
      const isCompLink = (d.x1 === compNode.x && d.y1 === compNode.y)
        || (d.x2 === compNode.x && d.y2 === compNode.y);
      return isCompLink ? 0.6 : 0.05;
    });
}

function resetHighlight(nodeSel, linkSel) {
  nodeSel.select('circle')
    .transition().duration(200)
    .attr('opacity', d => d.type === 'zentrum' ? 0.9 : d.type === 'komponist' ? 0.85 : 0.65);
  nodeSel.select('rect')
    .transition().duration(200)
    .attr('opacity', 0.45);
  nodeSel.selectAll('text')
    .transition().duration(200)
    .attr('opacity', 1);
  linkSel.transition().duration(200)
    .attr('stroke-opacity', 0.4);
}

/* ------------------------------------------------------------------ */
/*  "Andere" cluster expand/collapse                                   */
/* ------------------------------------------------------------------ */

let andereExpanded = false;

function expandAndere(d, nodeSel, linkSel, nodes, svgContainer) {
  if (andereExpanded) return;
  andereExpanded = true;

  const zoomGroup = d3.select(svgContainer).select('.kosmos-zoom-group');
  const cx = nodes[0].x; // zentrum x
  const cy = nodes[0].y;
  const R1 = Math.sqrt((d.x - cx) ** 2 + (d.y - cy) ** 2);
  const angularRange = d.endAngle - d.startAngle;

  // Add individual nodes
  d.children.forEach((komp, i) => {
    const angle = d.startAngle + ((i + 0.5) / d.children.length) * angularRange;
    const x = cx + R1 * Math.sin(angle);
    const y = cy - R1 * Math.cos(angle);

    const g = zoomGroup.append('g')
      .attr('class', 'kosmos-node kosmos-node--andere-child')
      .attr('transform', `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event) => {
        event.stopPropagation();
        showKomponistPopup(event, { name: komp.name, docs: komp.dokumente_gesamt }, svgContainer);
      })
      .on('mouseenter', (event) => showTooltip(event, { type: 'komponist', name: komp.name, docs: komp.dokumente_gesamt }))
      .on('mousemove', (event) => moveTooltip(event))
      .on('mouseleave', () => hideTooltip());

    g.append('circle')
      .attr('r', 8)
      .attr('fill', komp.farbe)
      .attr('opacity', 0.8);

    g.append('text')
      .attr('class', 'kosmos-label kosmos-label--komponist')
      .attr('text-anchor', angle > Math.PI ? 'end' : 'start')
      .attr('dx', angle > Math.PI ? -12 : 12)
      .attr('dy', 4)
      .attr('opacity', 0)
      .text(komp.name.length > 18 ? komp.name.slice(0, 16) + '\u2026' : komp.name);

    // Animate to position
    g.transition().duration(400).ease(d3.easeCubicOut)
      .attr('transform', `translate(${x}, ${y})`);
    g.select('text').transition().delay(200).duration(300).attr('opacity', 1);
  });

  // Hide original "Andere" node
  nodeSel.filter(n => n.type === 'andere')
    .transition().duration(200)
    .attr('opacity', 0.2);

  // Click anywhere to collapse
  setTimeout(() => {
    d3.select(svgContainer).select('svg').on('click.andere', () => {
      collapseAndere(svgContainer, nodeSel);
    });
  }, 0);
}

function collapseAndere(svgContainer, nodeSel) {
  andereExpanded = false;
  d3.select(svgContainer).selectAll('.kosmos-node--andere-child')
    .transition().duration(300)
    .attr('opacity', 0)
    .remove();
  nodeSel.filter(n => n.type === 'andere')
    .transition().duration(200)
    .attr('opacity', 1);
  d3.select(svgContainer).select('svg').on('click.andere', null);
}

/* ------------------------------------------------------------------ */
/*  Popups (Cross-View Navigation)                                     */
/* ------------------------------------------------------------------ */

function showKomponistPopup(event, d, svgContainer) {
  dismissPopup();
  const popup = el('div', { className: 'kosmos-popup' },
    el('div', { className: 'kosmos-popup__header' }, `${d.name} (${d.docs} Dok.)`),
    el('a', {
      className: 'kosmos-popup__action',
      onClick: (e) => { e.preventDefault(); dismissPopup(); navigateToIndex('personen', d.name); },
    }, '\u2192 Index'),
    el('a', {
      className: 'kosmos-popup__action',
      onClick: (e) => { e.preventDefault(); dismissPopup(); navigateToView('matrix'); },
    }, '\u2192 Matrix'),
  );
  positionPopup(popup, event, svgContainer);
}

function showWerkPopup(event, d, store, svgContainer) {
  dismissPopup();

  const items = d.signaturen.slice(0, 5).map(sig => {
    const record = store.bySignatur.get(sig);
    const title = record ? (record['rico:title'] || sig) : sig;
    return el('a', {
      className: 'kosmos-popup__action',
      onClick: (e) => { e.preventDefault(); dismissPopup(); if (record) selectRecord(record['@id']); },
    }, title.length > 40 ? title.slice(0, 38) + '\u2026' : title);
  });

  const popup = el('div', { className: 'kosmos-popup' },
    el('div', { className: 'kosmos-popup__header' },
      d.rolleHaupt ? `${d.name} \u2014 ${d.rolleHaupt}` : d.name,
      ` (${d.docs} Dok.)`,
    ),
    ...items,
    d.signaturen.length > 5 ? el('span', { className: 'kosmos-popup__more' }, `+${d.signaturen.length - 5} weitere`) : null,
    el('a', {
      className: 'kosmos-popup__action kosmos-popup__action--secondary',
      onClick: (e) => { e.preventDefault(); dismissPopup(); navigateToIndex('werke', d.name); },
    }, '\u2192 Alle im Index'),
  );
  positionPopup(popup, event, svgContainer);
}

function positionPopup(popup, event, svgContainer) {
  const rect = svgContainer.getBoundingClientRect();
  popup.style.left = `${event.clientX - rect.left + 10}px`;
  popup.style.top = `${event.clientY - rect.top - 10}px`;
  svgContainer.appendChild(popup);
  setTimeout(() => document.addEventListener('click', dismissPopup, { once: true }), 0);
}

function dismissPopup() {
  document.querySelectorAll('.kosmos-popup').forEach(p => p.remove());
}

/* ------------------------------------------------------------------ */
/*  Legend                                                              */
/* ------------------------------------------------------------------ */

function buildLegend(data) {
  // Composer color dots
  const colorItems = data.komponisten
    .filter(k => k.dokumente_gesamt > 0)
    .slice(0, 8)
    .map(k =>
      el('span', { className: 'kosmos-legend__item' },
        el('span', { className: 'kosmos-legend__dot', style: `background-color: ${k.farbe}` }),
        `${k.name} (${k.dokumente_gesamt})`
      )
    );

  if (data.andere.length > 0) {
    colorItems.push(el('span', { className: 'kosmos-legend__item' },
      el('span', { className: 'kosmos-legend__dot', style: 'background-color: #757575' }),
      `${data.andere.length} weitere`
    ));
  }

  // Symbol legend: circle = Oper, diamond = Lied
  const symbolLegend = el('span', { className: 'kosmos-legend__symbols' },
    el('span', { className: 'kosmos-legend__symbol-circle' }),
    ' Oper',
    el('span', { className: 'kosmos-legend__sep' }, '\u00b7'),
    el('span', { className: 'kosmos-legend__symbol-diamond' }),
    ' Lied/Konzert',
    el('span', { className: 'kosmos-legend__sep' }, '\u00b7'),
    el('span', { className: 'kosmos-legend__role-sample' }, 'Brang\u00e4ne'),
    ' = Rolle',
  );

  const hint = el('span', { className: 'kosmos-legend__hint' },
    'Klick: Aktionen \u00b7 Doppelklick: zur\u00fccksetzen');

  return el('div', { className: 'kosmos-legend' }, ...colorItems, symbolLegend, hint);
}

/* ------------------------------------------------------------------ */
/*  Cross-view navigation listener (Matrix → Kosmos)                   */
/* ------------------------------------------------------------------ */

let pendingHighlight = null;

window.addEventListener('m3gim:navigate', (event) => {
  const { tab, komponist } = event.detail || {};
  if (tab === 'kosmos' && komponist) {
    pendingHighlight = komponist;
    tryHighlight();
  }
});

function tryHighlight() {
  if (!pendingHighlight || !rendered) return;
  const svg = document.querySelector('.kosmos-container svg');
  if (!svg) return;
  const g = d3.select(svg).select('.kosmos-zoom-group');
  const nodeSel = g.selectAll('.kosmos-node');
  const linkSel = g.selectAll('line.kosmos-link');
  const allNodes = nodeSel.data();
  highlightComposer(pendingHighlight, nodeSel, linkSel, allNodes);
  pendingHighlight = null;
}
