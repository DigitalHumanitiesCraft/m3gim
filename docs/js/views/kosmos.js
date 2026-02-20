/**
 * M³GIM Kosmos View — Radial force-directed graph (D3.js).
 */

import { aggregateKosmos } from '../data/aggregator.js';
import { KOMPONISTEN_FARBEN } from '../data/constants.js';
import { selectRecord } from '../ui/router.js';
import { el, clear } from '../utils/dom.js';

let rendered = false;

export function renderKosmos(store, container) {
  if (rendered) return;
  rendered = true;

  const data = aggregateKosmos(store);
  clear(container);

  const svgContainer = el('div', { className: 'kosmos-container' });
  container.appendChild(svgContainer);

  container.appendChild(buildLegend(data));

  const width = svgContainer.clientWidth || 900;
  const height = svgContainer.clientHeight || 600;

  const svg = d3.select(svgContainer).append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Build nodes and links
  const nodes = [];
  const links = [];

  // Center node
  nodes.push({
    id: 'zentrum',
    type: 'zentrum',
    name: data.zentrum.name,
    r: 35,
    color: '#004A8F',
  });

  // Composer nodes
  const maxCompDocs = d3.max(data.komponisten, k => k.dokumente_gesamt) || 1;
  const compScale = d3.scaleSqrt().domain([1, maxCompDocs]).range([12, 30]);

  for (const komp of data.komponisten) {
    if (komp.dokumente_gesamt === 0) continue;
    const nodeId = `comp_${komp.name}`;
    nodes.push({
      id: nodeId,
      type: 'komponist',
      name: komp.name,
      r: compScale(komp.dokumente_gesamt),
      color: komp.farbe,
      docs: komp.dokumente_gesamt,
    });
    links.push({
      source: 'zentrum',
      target: nodeId,
      value: komp.dokumente_gesamt,
    });

    // Work nodes
    for (const werk of komp.werke) {
      if (werk.dokumente === 0) continue;
      const werkId = `werk_${komp.name}_${werk.name}`;
      nodes.push({
        id: werkId,
        type: 'werk',
        name: werk.name,
        r: Math.max(5, Math.sqrt(werk.dokumente) * 4),
        color: komp.farbe,
        docs: werk.dokumente,
        signaturen: werk.signaturen,
        parentKomp: komp.name,
      });
      links.push({
        source: nodeId,
        target: werkId,
        value: werk.dokumente,
      });
    }
  }

  // Force simulation
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(d => {
      if (d.source.type === 'zentrum' || d.target.type === 'zentrum') return 120;
      return 70;
    }))
    .force('charge', d3.forceManyBody().strength(d => d.type === 'zentrum' ? -300 : -80))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => d.r + 4))
    .force('radial', d3.forceRadial(d => {
      if (d.type === 'zentrum') return 0;
      if (d.type === 'komponist') return 160;
      return 280;
    }, width / 2, height / 2).strength(0.6));

  // Links
  const link = svg.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', 'kosmos-link')
    .attr('stroke', d => {
      const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
      return target?.color || '#ccc';
    })
    .attr('stroke-width', d => Math.max(1, Math.sqrt(d.value)));

  // Nodes
  const node = svg.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', d => `kosmos-node--${d.type}`)
    .call(d3.drag()
      .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
    );

  node.append('circle')
    .attr('r', d => d.r)
    .attr('fill', d => d.color)
    .attr('opacity', d => d.type === 'werk' ? 0.6 : 0.85)
    .attr('stroke', d => d.type === 'zentrum' ? '#003366' : 'none')
    .attr('stroke-width', d => d.type === 'zentrum' ? 2 : 0)
    .style('cursor', d => d.type === 'zentrum' ? 'default' : 'pointer')
    .on('click', (event, d) => {
      if (d.type === 'werk' && d.signaturen && d.signaturen.length > 0) {
        const record = store.bySignatur.get(d.signaturen[0]);
        if (record) selectRecord(record['@id']);
      } else if (d.type === 'komponist') {
        highlightComposer(d.name, node, link, nodes);
      }
    });

  // Labels
  node.append('text')
    .attr('class', d => `kosmos-label kosmos-label--${d.type}`)
    .attr('dx', d => d.r + 4)
    .attr('dy', 4)
    .attr('opacity', d => {
      if (d.type === 'zentrum') return 0;
      if (d.type === 'werk') return d.docs > 1 ? 0.8 : 0;
      return 1;
    })
    .text(d => {
      if (d.type === 'zentrum') return '';
      if (d.type === 'werk') return d.name.length > 20 ? d.name.slice(0, 18) + '\u2026' : d.name;
      return d.name;
    });

  // Show werk labels on hover
  node.filter(d => d.type === 'werk')
    .on('mouseenter', function(event, d) {
      d3.select(this).select('text').attr('opacity', 1);
      d3.select(this).select('circle').attr('opacity', 0.9);
    })
    .on('mouseleave', function(event, d) {
      d3.select(this).select('text').attr('opacity', d.docs > 1 ? 0.8 : 0);
      d3.select(this).select('circle').attr('opacity', 0.6);
    });

  // Center label (special positioning)
  node.filter(d => d.type === 'zentrum')
    .append('text')
    .attr('class', 'kosmos-label kosmos-label--zentrum')
    .attr('text-anchor', 'middle')
    .attr('dy', 5)
    .text('Malaniuk');

  // Tooltips
  node.append('title')
    .text(d => {
      if (d.type === 'zentrum') return `${d.name}\nMezzosopran, 1919\u20132009`;
      if (d.type === 'komponist') return `${d.name}\n${d.docs} Dokumente`;
      return `${d.name}\n${d.docs} Dok.${d.parentKomp ? ' (' + d.parentKomp + ')' : ''}`;
    });

  // Tick — keep nodes within bounds
  const pad = 40;
  simulation.on('tick', () => {
    // Constrain to viewport
    for (const d of nodes) {
      d.x = Math.max(pad + d.r, Math.min(width - pad - d.r, d.x));
      d.y = Math.max(pad + d.r, Math.min(height - pad - d.r, d.y));
    }

    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node.attr('transform', d => `translate(${d.x}, ${d.y})`);
  });
}

function highlightComposer(name, node, link, nodes) {
  const related = new Set([`comp_${name}`]);
  nodes.forEach(n => {
    if (n.parentKomp === name) related.add(n.id);
  });
  related.add('zentrum');

  node.select('circle')
    .attr('opacity', d => related.has(d.id) ? 0.9 : 0.15);
  node.select('text')
    .attr('opacity', d => related.has(d.id) ? 1 : 0.2);
  link
    .attr('stroke-opacity', d => {
      const sid = typeof d.source === 'object' ? d.source.id : d.source;
      const tid = typeof d.target === 'object' ? d.target.id : d.target;
      return related.has(sid) && related.has(tid) ? 0.6 : 0.05;
    });

  // Double-click to reset
  d3.select(node.node().parentNode.parentNode)
    .on('dblclick.reset', () => {
      node.select('circle').attr('opacity', d => d.type === 'werk' ? 0.6 : 0.85);
      node.select('text').attr('opacity', 1);
      link.attr('stroke-opacity', 0.4);
    });
}

function buildLegend(data) {
  const items = data.komponisten
    .filter(k => k.dokumente_gesamt > 0)
    .slice(0, 8)
    .map(k =>
      el('span', { className: 'kosmos-legend__item' },
        el('span', { className: 'kosmos-legend__dot', style: `background-color: ${k.farbe}` }),
        `${k.name} (${k.dokumente_gesamt})`
      )
    );
  const hint = el('span', { className: 'kosmos-legend__hint' }, 'Klick auf Komponist: filtern · Doppelklick: zurücksetzen');
  return el('div', { className: 'kosmos-legend' }, ...items, hint);
}

export function resetKosmos() {
  rendered = false;
}
