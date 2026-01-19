/**
 * Karriere-Fluss (Sankey) Visualization
 * Shows career flow: phases → repertoire → locations
 *
 * IMPROVED:
 * - Only shows nodes that have flows (no orphan nodes)
 * - Chronological ordering of career phases
 * - Better tooltips with document counts
 * - Hover interactions for highlighting flows
 * - Click on flows/nodes to see linked documents
 */

import { dataLoader } from '../modules/data-loader.js';
import { setupExportHandlers } from '../utils/export.js';

export async function renderSankey(container) {
  // Load sankey data
  const sankeyData = await dataLoader.loadSankeyData();

  if (!sankeyData) {
    container.innerHTML = '<div class="viz-placeholder"><p>Fehler beim Laden der Daten</p></div>';
    return;
  }

  const width = container.clientWidth;
  const height = 500;
  const margin = { top: 50, right: 120, bottom: 40, left: 120 };

  container.innerHTML = '';

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'viz-fullwidth sankey-viz';
  wrapper.style.position = 'relative';
  container.appendChild(wrapper);

  // Title and info
  const header = document.createElement('div');
  header.className = 'viz-header';
  header.innerHTML = `
    <div>
      <h3>Karriere-Fluss</h3>
      <p class="viz-description">Repertoire-Schwerpunkte und geografische Zentren über Karrierephasen</p>
    </div>
  `;
  wrapper.appendChild(header);

  // Add export buttons to header
  const exportToolbar = document.createElement('div');
  exportToolbar.className = 'export-toolbar';
  exportToolbar.innerHTML = `
    <button class="export-btn" data-format="svg" title="Als SVG exportieren">SVG</button>
    <button class="export-btn" data-format="png" title="Als PNG exportieren">PNG</button>
  `;
  header.appendChild(exportToolbar);

  setupExportHandlers(wrapper, exportToolbar, 'sankey', sankeyData);

  // Collect all node IDs that are actually used in flows
  const usedNodeIds = new Set();
  sankeyData.flows.forEach(flow => {
    usedNodeIds.add(flow.source);
    usedNodeIds.add(flow.target);
  });

  // Build nodes - only include nodes that have flows
  const nodes = [];
  const nodeMap = new Map();
  let nodeIndex = 0;

  // Add phase nodes (left column) - only if they have flows
  // Sort chronologically by 'von' year
  const sortedPhasen = [...sankeyData.phasen].sort((a, b) => a.von - b.von);
  sortedPhasen.forEach(phase => {
    if (usedNodeIds.has(phase.id)) {
      const node = {
        id: phase.id,
        name: phase.label,
        type: 'phase',
        column: 0,
        zeitraum: `${phase.von}-${phase.bis}`,
        index: nodeIndex++
      };
      nodes.push(node);
      nodeMap.set(phase.id, node);
    }
  });

  // Add repertoire nodes (middle column) - only if they have flows
  sankeyData.repertoire.forEach(rep => {
    if (usedNodeIds.has(rep.id)) {
      const node = {
        id: rep.id,
        name: rep.label,
        type: 'repertoire',
        column: 1,
        farbe: rep.farbe,
        index: nodeIndex++
      };
      nodes.push(node);
      nodeMap.set(rep.id, node);
    }
  });

  // Add location nodes (right column) - only if they have flows
  sankeyData.orte.forEach(ort => {
    if (usedNodeIds.has(ort.id)) {
      const node = {
        id: ort.id,
        name: ort.label,
        type: 'ort',
        column: 2,
        index: nodeIndex++
      };
      nodes.push(node);
      nodeMap.set(ort.id, node);
    }
  });

  // Build links from flows - only valid links where both nodes exist
  // Also keep reference to original flow for document access
  const links = sankeyData.flows
    .filter(flow => nodeMap.has(flow.source) && nodeMap.has(flow.target))
    .map(flow => ({
      source: nodeMap.get(flow.source).index,
      target: nodeMap.get(flow.target).index,
      value: flow.value,
      sourceName: nodeMap.get(flow.source).name,
      targetName: nodeMap.get(flow.target).name,
      dokumente: flow.dokumente || []
    }));

  // Create Sankey generator
  const sankey = d3.sankey()
    .nodeId(d => d.index)
    .nodeWidth(20)
    .nodePadding(20)
    .nodeSort((a, b) => {
      // Sort by column first, then by name within column
      if (a.column !== b.column) return a.column - b.column;
      return a.name.localeCompare(b.name);
    })
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

  // Create tooltip
  const tooltip = d3.select(wrapper)
    .append('div')
    .attr('class', 'sankey-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background', 'rgba(0, 0, 0, 0.9)')
    .style('color', '#fff')
    .style('padding', '10px 14px')
    .style('border-radius', '6px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', '1000')
    .style('max-width', '300px')
    .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');

  // Draw links
  const linkGroup = svg.append('g')
    .attr('class', 'links')
    .selectAll('path')
    .data(sankeyLinks)
    .enter()
    .append('path')
    .attr('class', 'sankey-link')
    .attr('d', d3.sankeyLinkHorizontal())
    .attr('stroke', d => {
      const sourceNode = sankeyNodes[d.source.index];
      const targetNode = sankeyNodes[d.target.index];
      if (targetNode.type === 'repertoire') {
        return targetNode.farbe || '#999';
      }
      if (sourceNode.type === 'repertoire') {
        return sourceNode.farbe || '#999';
      }
      return '#8B7355';
    })
    .attr('stroke-width', d => Math.max(2, d.width))
    .attr('fill', 'none')
    .attr('opacity', 0.5)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      // Highlight this link
      d3.select(this).attr('opacity', 0.8);

      // Show tooltip
      const hasDocuments = d.dokumente && d.dokumente.length > 0;
      tooltip
        .style('visibility', 'visible')
        .html(`
          <strong>${d.sourceName} → ${d.targetName}</strong><br>
          ${d.value} Dokument${d.value !== 1 ? 'e' : ''}
          ${hasDocuments ? '<div style="color: #6af; font-size: 11px; margin-top: 6px;">Klicken für Details →</div>' : ''}
        `);
    })
    .on('mousemove', function(event) {
      const rect = wrapper.getBoundingClientRect();
      tooltip
        .style('top', (event.clientY - rect.top + 15) + 'px')
        .style('left', (event.clientX - rect.left + 15) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.5);
      tooltip.style('visibility', 'hidden');
    })
    .on('click', function(event, d) {
      if (d.dokumente && d.dokumente.length > 0) {
        showFlowDocuments(d.sourceName, d.targetName, d.dokumente);
      }
    });

  // Draw nodes
  const nodeGroup = svg.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(sankeyNodes)
    .enter()
    .append('g')
    .attr('class', d => `sankey-node sankey-node-${d.type}`)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      // Highlight connected links
      linkGroup.attr('opacity', link =>
        link.source.index === d.index || link.target.index === d.index ? 0.8 : 0.15
      );

      // Calculate totals
      const incoming = d.targetLinks ? d.targetLinks.reduce((sum, l) => sum + l.value, 0) : 0;
      const outgoing = d.sourceLinks ? d.sourceLinks.reduce((sum, l) => sum + l.value, 0) : 0;

      let tooltipContent = `<strong>${d.name}</strong>`;
      if (d.zeitraum) tooltipContent += `<br><span style="color:#aaa">${d.zeitraum}</span>`;
      if (d.type === 'phase') {
        tooltipContent += `<br>${outgoing} Dokumente zu Komponisten`;
      } else if (d.type === 'repertoire') {
        tooltipContent += `<br>${incoming} aus Karrierephasen<br>${outgoing} zu Aufführungsorten`;
      } else if (d.type === 'ort') {
        tooltipContent += `<br>${incoming} Dokumente von Komponisten`;
      }
      tooltipContent += '<div style="color: #6af; font-size: 11px; margin-top: 6px;">Klicken für alle Dokumente →</div>';

      tooltip
        .style('visibility', 'visible')
        .html(tooltipContent);
    })
    .on('mousemove', function(event) {
      const rect = wrapper.getBoundingClientRect();
      tooltip
        .style('top', (event.clientY - rect.top + 15) + 'px')
        .style('left', (event.clientX - rect.left + 15) + 'px');
    })
    .on('mouseout', function() {
      linkGroup.attr('opacity', 0.5);
      tooltip.style('visibility', 'hidden');
    })
    .on('click', function(event, d) {
      // Collect all documents from connected flows
      const allDocs = [];
      const connectedLinks = sankeyLinks.filter(link =>
        link.source.index === d.index || link.target.index === d.index
      );
      connectedLinks.forEach(link => {
        if (link.dokumente) {
          allDocs.push(...link.dokumente);
        }
      });

      if (allDocs.length > 0) {
        showNodeDocuments(d, allDocs);
      }
    });

  // Node rectangles
  nodeGroup.append('rect')
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('height', d => Math.max(d.y1 - d.y0, 8))
    .attr('width', d => d.x1 - d.x0)
    .attr('fill', d => {
      if (d.type === 'phase') return '#8B7355';
      if (d.type === 'repertoire') return d.farbe || '#4A5A7A';
      if (d.type === 'ort') return '#2C5C3F';
      return '#999';
    })
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .attr('rx', 2);

  // Node labels
  nodeGroup.append('text')
    .attr('x', d => d.type === 'phase' ? d.x0 - 8 : (d.type === 'ort' ? d.x1 + 8 : (d.y1 + d.y0) / 2))
    .attr('y', d => (d.y1 + d.y0) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', d => d.type === 'phase' ? 'end' : (d.type === 'ort' ? 'start' : 'middle'))
    .text(d => d.name)
    .attr('class', 'sankey-label')
    .style('font-size', '12px')
    .style('font-weight', d => d.type === 'phase' ? '600' : '500')
    .style('fill', '#333');

  // Add column headers
  const phaseX = sankeyNodes.filter(n => n.type === 'phase')[0]?.x0 || margin.left;
  const repNodes = sankeyNodes.filter(n => n.type === 'repertoire');
  const repX = repNodes.length > 0 ? (repNodes[0].x0 + repNodes[0].x1) / 2 : width / 2;
  const ortNodes = sankeyNodes.filter(n => n.type === 'ort');
  const ortX = ortNodes.length > 0 ? ortNodes[0].x1 : width - margin.right;

  const columnHeaders = [
    { x: phaseX - 8, label: 'KARRIEREPHASEN', anchor: 'end' },
    { x: repX, label: 'REPERTOIRE', anchor: 'middle' },
    { x: ortX + 8, label: 'AUFFÜHRUNGSORTE', anchor: 'start' }
  ];

  svg.selectAll('.column-header')
    .data(columnHeaders)
    .enter()
    .append('text')
    .attr('x', d => d.x)
    .attr('y', 25)
    .attr('text-anchor', d => d.anchor)
    .attr('class', 'column-header')
    .style('font-size', '10px')
    .style('font-weight', '600')
    .style('fill', '#666')
    .style('letter-spacing', '0.5px')
    .text(d => d.label);

  // Add legend for flow width
  const legendY = height - 15;
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', legendY)
    .attr('text-anchor', 'middle')
    .style('font-size', '10px')
    .style('fill', '#999')
    .text('Flussbreite = Anzahl Dokumente · Klicken für Details');
}

/**
 * Show document panel for a flow connection
 */
function showFlowDocuments(sourceName, targetName, dokumente) {
  showDocumentPanel(
    `${sourceName} → ${targetName}`,
    `Verbindung im Karriere-Fluss`,
    dokumente
  );
}

/**
 * Show document panel for a node (all connected documents)
 */
function showNodeDocuments(node, dokumente) {
  let subtitle = '';
  if (node.type === 'phase') {
    subtitle = `Karrierephase ${node.zeitraum}`;
  } else if (node.type === 'repertoire') {
    subtitle = 'Komponist/Repertoire';
  } else if (node.type === 'ort') {
    subtitle = 'Aufführungsort';
  }

  showDocumentPanel(node.name, subtitle, dokumente);
}

/**
 * Generic document panel (same style as matrix/kosmos)
 */
function showDocumentPanel(title, subtitle, dokumente) {
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

  // Unique documents (remove duplicates by signatur)
  const uniqueDocs = [];
  const seenSignaturen = new Set();
  dokumente.forEach(doc => {
    if (!seenSignaturen.has(doc.signatur)) {
      seenSignaturen.add(doc.signatur);
      uniqueDocs.push(doc);
    }
  });

  panel.innerHTML = `
    <div style="
      padding: 20px 24px;
      background: linear-gradient(135deg, #2C5C3F 0%, #1a3a28 100%);
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
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">&times;</button>
      <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600;">${title}</h3>
      <div style="color: rgba(255,255,255,0.7); font-size: 13px;">${subtitle}</div>
    </div>

    <div style="
      padding: 16px 24px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      flex-shrink: 0;
    ">
      <div style="font-size: 24px; font-weight: 700; color: #333;">${uniqueDocs.length}</div>
      <div style="font-size: 11px; color: #666;">Verknüpfte Archivalien</div>
    </div>

    <div style="
      flex: 1;
      overflow-y: auto;
      padding: 16px 24px;
    ">
      <div class="document-list" style="display: flex; flex-direction: column; gap: 12px;">
        ${uniqueDocs.map(doc => `
          <div class="document-item" style="
            background: #fff;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 14px;
            transition: box-shadow 0.2s, border-color 0.2s;
            cursor: pointer;
          " onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.borderColor='#2C5C3F'" onmouseout="this.style.boxShadow='none'; this.style.borderColor='#e9ecef'">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="
                background: #e8f5e9;
                color: #2e7d32;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
              ">${doc.typ || 'Dokument'}</span>
              <code style="
                font-family: 'JetBrains Mono', monospace;
                font-size: 11px;
                color: #004A8F;
                background: #f0f4f8;
                padding: 2px 6px;
                border-radius: 3px;
              ">${doc.signatur}</code>
            </div>
            <p style="
              margin: 0;
              font-size: 13px;
              line-height: 1.5;
              color: #333;
            ">${doc.titel || '—'}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;

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
