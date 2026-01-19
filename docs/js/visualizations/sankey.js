/**
 * Karriere-Fluss (Sankey) Visualization
 * Shows career flow: phases → repertoire → locations
 */

import { dataLoader } from '../modules/data-loader.js';

export async function renderSankey(container) {
  // Load sankey data
  const sankeyData = await dataLoader.loadSankeyData();

  if (!sankeyData) {
    container.innerHTML = '<div class="viz-placeholder"><p>Fehler beim Laden der Daten</p></div>';
    return;
  }

  const width = container.clientWidth;
  const height = 500;
  const margin = { top: 40, right: 40, bottom: 40, left: 40 };

  container.innerHTML = '';

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'viz-fullwidth sankey-viz';
  container.appendChild(wrapper);

  // Title and info
  const header = document.createElement('div');
  header.className = 'viz-header';
  header.innerHTML = `
    <h3>Karriere-Fluss</h3>
    <p class="viz-description">Repertoire-Schwerpunkte und geografische Zentren über Karrierephasen</p>
  `;
  wrapper.appendChild(header);

  // Build nodes
  const nodes = [];
  const nodeMap = new Map();
  let nodeIndex = 0;

  // Add phase nodes (left column)
  sankeyData.phasen.forEach(phase => {
    const node = {
      id: phase.id,
      name: phase.label,
      type: 'phase',
      index: nodeIndex++
    };
    nodes.push(node);
    nodeMap.set(phase.id, node);
  });

  // Add repertoire nodes (middle column)
  sankeyData.repertoire.forEach(rep => {
    const node = {
      id: rep.id,
      name: rep.label,
      type: 'repertoire',
      farbe: rep.farbe,
      index: nodeIndex++
    };
    nodes.push(node);
    nodeMap.set(rep.id, node);
  });

  // Add location nodes (right column)
  sankeyData.orte.forEach(ort => {
    const node = {
      id: ort.id,
      name: ort.label,
      type: 'ort',
      index: nodeIndex++
    };
    nodes.push(node);
    nodeMap.set(ort.id, node);
  });

  // Build links from flows
  const links = sankeyData.flows.map(flow => ({
    source: nodeMap.get(flow.source).index,
    target: nodeMap.get(flow.target).index,
    value: flow.value
  }));

  // Create Sankey generator
  const sankey = d3.sankey()
    .nodeId(d => d.index)
    .nodeWidth(20)
    .nodePadding(15)
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

  // Generate sankey layout
  const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
    nodes: nodes.map(d => Object.assign({}, d)),
    links: links.map(d => Object.assign({}, d))
  });

  // Create SVG
  const svg = d3.select(wrapper)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'sankey-svg');

  // Draw links
  svg.append('g')
    .attr('class', 'links')
    .selectAll('path')
    .data(sankeyLinks)
    .enter()
    .append('path')
    .attr('class', 'sankey-link')
    .attr('d', d3.sankeyLinkHorizontal())
    .attr('stroke', d => {
      const sourceNode = nodes[d.source.index];
      const targetNode = nodes[d.target.index];
      if (targetNode.type === 'repertoire') {
        return targetNode.farbe || '#999';
      }
      if (sourceNode.type === 'repertoire') {
        return sourceNode.farbe || '#999';
      }
      return '#999';
    })
    .attr('stroke-width', d => Math.max(1, d.width))
    .attr('fill', 'none')
    .attr('opacity', 0.5)
    .append('title')
    .text(d => {
      const source = nodes[d.source.index];
      const target = nodes[d.target.index];
      return `${source.name} → ${target.name}\n${d.value} Dokumente`;
    });

  // Draw nodes
  const node = svg.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(sankeyNodes)
    .enter()
    .append('g')
    .attr('class', d => `sankey-node sankey-node-${d.type}`);

  // Node rectangles
  node.append('rect')
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('height', d => d.y1 - d.y0)
    .attr('width', d => d.x1 - d.x0)
    .attr('fill', d => {
      if (d.type === 'phase') return '#8B7355';
      if (d.type === 'repertoire') return d.farbe || '#4A5A7A';
      if (d.type === 'ort') return '#2C5C3F';
      return '#999';
    })
    .attr('stroke', '#fff')
    .attr('stroke-width', 1);

  // Node labels
  node.append('text')
    .attr('x', d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    .attr('y', d => (d.y1 + d.y0) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
    .text(d => d.name)
    .attr('class', 'sankey-label')
    .style('font-size', '11px')
    .style('font-weight', d => d.type === 'phase' ? 'bold' : 'normal');

  // Tooltips
  node.append('title')
    .text(d => {
      const incoming = d.targetLinks ? d.targetLinks.reduce((sum, l) => sum + l.value, 0) : 0;
      const outgoing = d.sourceLinks ? d.sourceLinks.reduce((sum, l) => sum + l.value, 0) : 0;
      const total = Math.max(incoming, outgoing);
      return `${d.name}\n${total} Dokumente`;
    });

  // Add column headers
  const columnHeaders = [
    { x: margin.left, label: 'Karrierephasen' },
    { x: width / 2, label: 'Repertoire' },
    { x: width - margin.right - 20, label: 'Aufführungsorte' }
  ];

  svg.selectAll('.column-header')
    .data(columnHeaders)
    .enter()
    .append('text')
    .attr('x', d => d.x)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .attr('class', 'column-header')
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('fill', '#666')
    .text(d => d.label);
}
