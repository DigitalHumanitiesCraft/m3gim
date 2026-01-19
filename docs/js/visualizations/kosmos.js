/**
 * Rollen-Kosmos Visualization
 * Force-directed graph showing composer-work-role relationships
 *
 * IMPROVED:
 * - Shows work nodes with labels
 * - Node size reflects document count
 * - Better hover tooltips
 * - Click to expand/show details
 * - Highlight connections on hover
 */

import { dataLoader } from '../modules/data-loader.js';
import { setupExportHandlers } from '../utils/export.js';

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
  wrapper.style.position = 'relative';
  container.appendChild(wrapper);

  // Title and info
  const header = document.createElement('div');
  header.className = 'viz-header';
  header.innerHTML = `
    <div>
      <h3>Rollen-Kosmos</h3>
      <p class="viz-description">Radiale Darstellung des künstlerischen Universums</p>
    </div>
  `;
  wrapper.appendChild(header);

  // Add export buttons to header
  const exportToolbar = document.createElement('div');
  exportToolbar.className = 'export-toolbar';
  exportToolbar.innerHTML = `
    <button class="export-btn" data-format="svg" title="Als SVG exportieren">SVG</button>
    <button class="export-btn" data-format="png" title="Als PNG exportieren">PNG</button>
    <button class="export-btn" data-format="csv" title="Als CSV exportieren">CSV</button>
  `;
  header.appendChild(exportToolbar);

  setupExportHandlers(wrapper, exportToolbar, 'kosmos', kosmosData);

  // Create tooltip
  const tooltip = d3.select(wrapper)
    .append('div')
    .attr('class', 'kosmos-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background', 'rgba(0, 0, 0, 0.9)')
    .style('color', '#fff')
    .style('padding', '12px 16px')
    .style('border-radius', '8px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', '1000')
    .style('max-width', '300px')
    .style('box-shadow', '0 4px 20px rgba(0,0,0,0.3)');

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
    fach: zentrum.fach,
    lebensdaten: zentrum.lebensdaten,
    radius: 30
  });

  // Add composer and work nodes
  kosmosData.komponisten.forEach(komponist => {
    const komponistId = `komponist-${komponist.name}`;

    // Composer node - size based on document count
    const kompRadius = 12 + Math.sqrt(komponist.dokumente_gesamt) * 2;
    nodes.push({
      id: komponistId,
      name: komponist.name,
      type: 'komponist',
      farbe: komponist.farbe,
      dokumente: komponist.dokumente_gesamt,
      werkeCount: komponist.werke.length,
      radius: kompRadius
    });

    links.push({
      source: 'zentrum',
      target: komponistId,
      value: komponist.dokumente_gesamt
    });

    // Add works
    komponist.werke.forEach(werk => {
      const werkId = `werk-${komponist.name}-${werk.name}`;
      const werkRadius = 6 + Math.sqrt(werk.dokumente) * 2;

      nodes.push({
        id: werkId,
        name: werk.name,
        type: 'werk',
        komponist: komponist.name,
        komponistFarbe: komponist.farbe,
        dokumente: werk.dokumente,
        signaturen: werk.signaturen,
        orte: werk.orte,
        rollen: werk.rollen,
        radius: werkRadius
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
      if (d.source.id === 'zentrum') return 150;
      return 80;
    }).strength(0.8))
    .force('charge', d3.forceManyBody().strength(d => {
      if (d.type === 'zentrum') return -300;
      if (d.type === 'komponist') return -150;
      return -50;
    }))
    .force('center', d3.forceCenter(0, 0))
    .force('collision', d3.forceCollide().radius(d => d.radius + 8));

  // Draw links
  const link = g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('stroke', d => {
      const targetNode = nodes.find(n => n.id === (typeof d.target === 'object' ? d.target.id : d.target));
      if (targetNode && targetNode.komponistFarbe) return targetNode.komponistFarbe;
      if (targetNode && targetNode.farbe) return targetNode.farbe;
      return '#999';
    })
    .attr('stroke-opacity', 0.4)
    .attr('stroke-width', d => Math.max(1, Math.sqrt(d.value)));

  // Draw nodes
  const node = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', d => `node node-${d.type}`)
    .style('cursor', 'pointer')
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
      // Works get a lighter version of composer color
      return d.komponistFarbe ? d3.color(d.komponistFarbe).brighter(0.5) : '#ddd';
    })
    .attr('stroke', d => {
      if (d.type === 'zentrum') return '#5D2E0E';
      if (d.type === 'komponist') return d3.color(d.farbe).darker(0.5);
      return d.komponistFarbe || '#999';
    })
    .attr('stroke-width', d => d.type === 'zentrum' ? 3 : 2)
    .style('transition', 'all 0.2s ease');

  // Node labels - show all
  node.append('text')
    .attr('dx', d => d.radius + 6)
    .attr('dy', '0.35em')
    .text(d => d.name)
    .attr('class', 'node-label')
    .style('font-size', d => {
      if (d.type === 'zentrum') return '14px';
      if (d.type === 'komponist') return '13px';
      return '11px';
    })
    .style('font-weight', d => d.type === 'zentrum' || d.type === 'komponist' ? '600' : '400')
    .style('fill', d => d.type === 'werk' ? '#666' : '#333')
    .style('pointer-events', 'none');

  // Hover handlers
  node.on('mouseover', function(event, d) {
    // Highlight this node
    d3.select(this).select('circle')
      .attr('stroke-width', d.type === 'zentrum' ? 4 : 3)
      .attr('filter', 'drop-shadow(0 0 8px rgba(0,0,0,0.3))');

    // Highlight connected links
    link.attr('stroke-opacity', l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return sourceId === d.id || targetId === d.id ? 0.8 : 0.1;
    }).attr('stroke-width', l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return sourceId === d.id || targetId === d.id ? Math.sqrt(l.value) * 2 : Math.sqrt(l.value);
    });

    // Dim unconnected nodes
    node.style('opacity', n => {
      if (n.id === d.id) return 1;
      const isConnected = links.some(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return (sourceId === d.id && targetId === n.id) || (targetId === d.id && sourceId === n.id);
      });
      return isConnected ? 1 : 0.3;
    });

    // Build tooltip
    let tooltipHtml = '';
    if (d.type === 'zentrum') {
      tooltipHtml = `
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">${d.name}</div>
        <div style="color: #aaa;">${d.fach}</div>
        <div style="color: #888; font-size: 11px;">${d.lebensdaten}</div>
      `;
    } else if (d.type === 'komponist') {
      tooltipHtml = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="width: 12px; height: 12px; background: ${d.farbe}; border-radius: 50%;"></span>
          <span style="font-size: 15px; font-weight: 600;">${d.name}</span>
        </div>
        <div><strong>${d.dokumente}</strong> Dokumente</div>
        <div style="color: #aaa;">${d.werkeCount} Werke</div>
        <div style="color: #6af; font-size: 11px; margin-top: 8px;">Klicken für Details</div>
      `;
    } else if (d.type === 'werk') {
      let orteStr = d.orte?.length > 0 ? d.orte.map(o => o.name).join(', ') : '—';
      let rollenStr = d.rollen?.length > 0 ? d.rollen.map(r => `${r.name} (${r.count}×)`).join(', ') : '—';
      tooltipHtml = `
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">${d.name}</div>
        <div style="color: ${d.komponistFarbe}; font-size: 12px; margin-bottom: 8px;">${d.komponist}</div>
        <div><strong>${d.dokumente}</strong> Dokumente</div>
        <div style="margin-top: 8px;">
          <div style="color: #aaa; font-size: 10px;">AUFFÜHRUNGSORTE</div>
          <div style="font-size: 12px;">${orteStr}</div>
        </div>
        <div style="margin-top: 6px;">
          <div style="color: #aaa; font-size: 10px;">ROLLEN</div>
          <div style="font-size: 12px;">${rollenStr}</div>
        </div>
        <div style="color: #6af; font-size: 11px; margin-top: 8px;">Klicken für Archiv-Signaturen</div>
      `;
    }

    tooltip
      .style('visibility', 'visible')
      .html(tooltipHtml);
  })
  .on('mousemove', function(event) {
    const svgRect = svg.node().getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    tooltip
      .style('top', (event.clientY - wrapperRect.top + 15) + 'px')
      .style('left', (event.clientX - wrapperRect.left + 15) + 'px');
  })
  .on('mouseout', function() {
    d3.select(this).select('circle')
      .attr('stroke-width', d => d.type === 'zentrum' ? 3 : 2)
      .attr('filter', null);

    link.attr('stroke-opacity', 0.4)
        .attr('stroke-width', d => Math.max(1, Math.sqrt(d.value)));

    node.style('opacity', 1);

    tooltip.style('visibility', 'hidden');
  });

  // Click handler
  node.on('click', (event, d) => {
    if (d.type === 'werk' || d.type === 'komponist') {
      showWorkDetails(d, kosmosData);
    }
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
      label: `${k.name} (${k.dokumente_gesamt})`,
      color: k.farbe
    }))
  ];

  const legendItems = legend.selectAll('g')
    .data(legendData)
    .enter()
    .append('g')
    .attr('transform', (d, i) => `translate(0, ${i * 22})`);

  legendItems.append('circle')
    .attr('r', 7)
    .attr('fill', d => d.color)
    .attr('stroke', d => d3.color(d.color).darker(0.5))
    .attr('stroke-width', 1.5);

  legendItems.append('text')
    .attr('x', 16)
    .attr('y', 4)
    .text(d => d.label)
    .style('font-size', '12px')
    .style('font-weight', '500')
    .style('fill', '#333');

  // Add size legend
  const sizeLegend = svg.append('g')
    .attr('transform', `translate(20, ${legendData.length * 22 + 50})`);

  sizeLegend.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .style('font-size', '10px')
    .style('fill', '#888')
    .style('font-weight', '600')
    .text('KNOTENGRÖSSE = ANZAHL DOKUMENTE');
}

/**
 * Show work/composer details panel
 * IMPROVED: Better styling, shows all related data
 */
function showWorkDetails(item, kosmosData) {
  let panel = document.getElementById('document-panel');
  let overlay = document.getElementById('panel-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'panel-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 999;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(overlay);
  }

  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'document-panel';
    panel.className = 'document-panel';
    panel.style.cssText = `
      position: fixed;
      right: -450px;
      top: 0;
      width: 420px;
      max-width: 90vw;
      height: 100vh;
      background: #fff;
      box-shadow: -4px 0 20px rgba(0,0,0,0.2);
      z-index: 1000;
      transition: right 0.3s ease;
      display: flex;
      flex-direction: column;
      font-family: 'Inter', -apple-system, sans-serif;
    `;
    document.body.appendChild(panel);
  }

  const isKomponist = item.type === 'komponist';
  const farbe = item.farbe || item.komponistFarbe || '#666';

  // Get composer data if it's a work
  let komponistData = null;
  if (!isKomponist && kosmosData) {
    komponistData = kosmosData.komponisten.find(k => k.name === item.komponist);
  }

  // Build content
  let contentHtml = '';

  if (isKomponist) {
    // Composer detail view
    const kompData = kosmosData.komponisten.find(k => k.name === item.name);
    contentHtml = `
      <div style="
        padding: 20px 24px;
        background: linear-gradient(135deg, ${farbe} 0%, ${d3.color(farbe).darker(0.5)} 100%);
        color: #fff;
        flex-shrink: 0;
      ">
        <button class="document-panel__close" style="
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: #fff;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
        ">&times;</button>
        <h3 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 600;">${item.name}</h3>
        <div style="color: rgba(255,255,255,0.8);">Komponist</div>
      </div>

      <div style="padding: 16px 24px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; display: flex; gap: 24px;">
        <div>
          <div style="font-size: 28px; font-weight: 700; color: #333;">${item.dokumente}</div>
          <div style="font-size: 11px; color: #666;">Dokumente</div>
        </div>
        <div>
          <div style="font-size: 28px; font-weight: 700; color: #333;">${item.werkeCount}</div>
          <div style="font-size: 11px; color: #666;">Werke</div>
        </div>
      </div>

      <div style="flex: 1; overflow-y: auto; padding: 16px 24px;">
        <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #666; text-transform: uppercase;">Werke im Archiv</h4>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${kompData && kompData.werke ? kompData.werke.map(werk => `
            <div style="
              background: #fff;
              border: 1px solid #e9ecef;
              border-left: 3px solid ${farbe};
              border-radius: 6px;
              padding: 12px;
            ">
              <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${werk.name}</div>
              <div style="font-size: 12px; color: #666;">${werk.dokumente} Dokumente</div>
              ${werk.rollen && werk.rollen.length > 0 ? `
                <div style="font-size: 11px; color: #888; margin-top: 4px;">
                  Rollen: ${werk.rollen.map(r => r.name).join(', ')}
                </div>
              ` : ''}
            </div>
          `).join('') : '<p style="color: #888;">Keine Werke gefunden</p>'}
        </div>
      </div>
    `;
  } else {
    // Work detail view
    const orteHtml = item.orte && item.orte.length > 0
      ? item.orte.map(o => `
          <span style="
            background: #e8f5e9;
            color: #2e7d32;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
          ">${o.name} (${o.count})</span>
        `).join('')
      : '<span style="color: #888;">—</span>';

    const rollenHtml = item.rollen && item.rollen.length > 0
      ? item.rollen.map(r => `
          <span style="
            background: #fff3e0;
            color: #e65100;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
          ">${r.name} (${r.count}×)</span>
        `).join('')
      : '<span style="color: #888;">—</span>';

    contentHtml = `
      <div style="
        padding: 20px 24px;
        background: linear-gradient(135deg, ${farbe} 0%, ${d3.color(farbe).darker(0.5)} 100%);
        color: #fff;
        flex-shrink: 0;
      ">
        <button class="document-panel__close" style="
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255,255,255,0.1);
          border: none;
          color: #fff;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
        ">&times;</button>
        <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 4px;">${item.komponist}</div>
        <h3 style="margin: 0; font-size: 20px; font-weight: 600;">${item.name}</h3>
      </div>

      <div style="padding: 16px 24px; background: #f8f9fa; border-bottom: 1px solid #e9ecef;">
        <div style="font-size: 28px; font-weight: 700; color: #333;">${item.dokumente}</div>
        <div style="font-size: 11px; color: #666;">Dokumente im Archiv</div>
      </div>

      <div style="flex: 1; overflow-y: auto; padding: 16px 24px;">
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Aufführungsorte</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${orteHtml}
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Gesungene Rollen</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${rollenHtml}
          </div>
        </div>

        ${item.signaturen && item.signaturen.length > 0 ? `
          <div>
            <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase;">Archiv-Signaturen</h4>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${item.signaturen.map(sig => `
                <code style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 12px;
                  color: #004A8F;
                  background: #f0f4f8;
                  padding: 6px 10px;
                  border-radius: 4px;
                  display: block;
                ">${sig}</code>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  panel.innerHTML = contentHtml;

  // Show panel with animation
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    panel.style.right = '0';
  });

  // Close handlers
  const closePanel = () => {
    panel.style.right = '-450px';
    overlay.style.opacity = '0';
  };

  panel.querySelector('.document-panel__close').addEventListener('click', closePanel);
  overlay.addEventListener('click', closePanel);

  // ESC key to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closePanel();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}
