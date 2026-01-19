/**
 * Rollen-Kosmos Visualization
 * Force-directed graph showing composer-work-role relationships
 */

import { dataLoader } from '../modules/data-loader.js';

export async function renderKosmos(container) {
  // Load kosmos data
  const kosmosData = await dataLoader.loadKosmosData();

  if (!kosmosData) {
    container.innerHTML = '<div class="viz-placeholder"><p>Fehler beim Laden der Daten</p></div>';
    return;
  }

  const width = container.clientWidth;
  const height = 600;

  container.innerHTML = '';

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'viz-fullwidth kosmos-viz';
  container.appendChild(wrapper);

  // Title and info
  const header = document.createElement('div');
  header.className = 'viz-header';
  header.innerHTML = `
    <h3>Rollen-Kosmos</h3>
    <p class="viz-description">Radiale Darstellung des künstlerischen Universums</p>
  `;
  wrapper.appendChild(header);

  // Create SVG
  const svg = d3.select(wrapper)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'kosmos-svg');

  const g = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  // Build node and link data
  const nodes = [];
  const links = [];

  // Center node
  const zentrum = kosmosData.zentrum;
  nodes.push({
    id: 'zentrum',
    name: zentrum.name,
    type: 'zentrum',
    radius: 20
  });

  // Add composer and work nodes
  kosmosData.komponisten.forEach(komponist => {
    const komponistId = `komponist-${komponist.name}`;

    nodes.push({
      id: komponistId,
      name: komponist.name,
      type: 'komponist',
      farbe: komponist.farbe,
      dokumente: komponist.dokumente_gesamt,
      radius: 12
    });

    links.push({
      source: 'zentrum',
      target: komponistId,
      value: komponist.dokumente_gesamt
    });

    // Add works
    komponist.werke.forEach(werk => {
      const werkId = `werk-${komponist.name}-${werk.name}`;

      nodes.push({
        id: werkId,
        name: werk.name,
        type: 'werk',
        komponist: komponist.name,
        dokumente: werk.dokumente,
        orte: werk.orte,
        rollen: werk.rollen,
        radius: 6 + (werk.dokumente * 0.5)
      });

      links.push({
        source: komponistId,
        target: werkId,
        value: werk.dokumente
      });
    });
  });

  // Create force simulation
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(d => {
      if (d.source.id === 'zentrum') return 120;
      return 60;
    }))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(0, 0))
    .force('collision', d3.forceCollide().radius(d => d.radius + 5));

  // Draw links
  const link = g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.3)
    .attr('stroke-width', d => Math.sqrt(d.value));

  // Draw nodes
  const node = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', d => `node node-${d.type}`)
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));

  // Node circles
  node.append('circle')
    .attr('r', d => d.radius)
    .attr('fill', d => {
      if (d.type === 'zentrum') return '#8B4513';
      if (d.type === 'komponist') return d.farbe;
      return '#ccc';
    })
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);

  // Node labels
  node.append('text')
    .attr('dx', d => d.radius + 5)
    .attr('dy', '0.35em')
    .text(d => {
      if (d.type === 'zentrum' || d.type === 'komponist') return d.name;
      return '';
    })
    .attr('class', 'node-label')
    .style('font-size', d => {
      if (d.type === 'zentrum') return '14px';
      if (d.type === 'komponist') return '12px';
      return '10px';
    });

  // Tooltips
  node.append('title')
    .text(d => {
      if (d.type === 'zentrum') {
        return `${d.name}\n${zentrum.fach} (${zentrum.lebensdaten})`;
      }
      if (d.type === 'komponist') {
        return `${d.name}\n${d.dokumente} Dokumente`;
      }
      if (d.type === 'werk') {
        let text = `${d.name}\n${d.dokumente} Dokumente`;
        if (d.orte && d.orte.length > 0) {
          text += `\nOrte: ${d.orte.map(o => o.name).join(', ')}`;
        }
        if (d.rollen && d.rollen.length > 0) {
          text += `\nRollen: ${d.rollen.map(r => r.name).join(', ')}`;
        }
        return text;
      }
      return d.name;
    });

  // Click handler for works
  node.filter(d => d.type === 'werk')
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      showWorkDetails(d);
    });

  // Update positions on simulation tick
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node
      .attr('transform', d => `translate(${d.x}, ${d.y})`);
  });

  // Drag functions
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  // Add legend
  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', 'translate(20, 20)');

  const legendData = [
    { type: 'zentrum', label: zentrum.name, color: '#8B4513' },
    ...kosmosData.komponisten.map(k => ({
      type: 'komponist',
      label: k.name,
      color: k.farbe
    }))
  ];

  const legendItems = legend.selectAll('g')
    .data(legendData)
    .enter()
    .append('g')
    .attr('transform', (d, i) => `translate(0, ${i * 20})`);

  legendItems.append('circle')
    .attr('r', 6)
    .attr('fill', d => d.color);

  legendItems.append('text')
    .attr('x', 15)
    .attr('y', 4)
    .text(d => d.label)
    .style('font-size', '11px');
}

/**
 * Show work details panel
 */
function showWorkDetails(werk) {
  let panel = document.getElementById('document-panel');

  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'document-panel';
    panel.className = 'document-panel';
    document.body.appendChild(panel);
  }

  const orteText = werk.orte && werk.orte.length > 0
    ? werk.orte.map(o => `${o.name} (${o.count})`).join(', ')
    : 'Keine Orte verknüpft';

  const rollenText = werk.rollen && werk.rollen.length > 0
    ? werk.rollen.map(r => `${r.name} (${r.count})`).join(', ')
    : 'Keine Rollen verknüpft';

  panel.innerHTML = `
    <div class="document-panel__header">
      <h3>${werk.name}</h3>
      <button class="document-panel__close">&times;</button>
    </div>
    <div class="document-panel__content">
      <p><strong>Komponist:</strong> ${werk.komponist}</p>
      <p><strong>Dokumente:</strong> ${werk.dokumente}</p>
      <p><strong>Orte:</strong> ${orteText}</p>
      <p><strong>Rollen:</strong> ${rollenText}</p>
      ${werk.signaturen && werk.signaturen.length > 0 ? `
        <h4>Archiv-Signaturen:</h4>
        <ul class="signature-list">
          ${werk.signaturen.map(sig => `<li>${sig}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;

  panel.classList.add('visible');

  panel.querySelector('.document-panel__close').addEventListener('click', () => {
    panel.classList.remove('visible');
  });
}
