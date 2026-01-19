/**
 * Begegnungs-Matrix Visualization
 * Heatmap showing person encounters over time periods
 *
 * IMPROVED:
 * - Better tooltips with document type explanations
 * - Enhanced modal with full document titles
 * - Category colors and icons
 * - Hover highlighting
 */

import { dataLoader } from '../modules/data-loader.js';
import { setupExportHandlers } from '../utils/export.js';

// Category colors and icons
const CATEGORY_CONFIG = {
  'Dirigent': { color: '#C41E3A', icon: '🎼' },
  'Regisseur': { color: '#1565C0', icon: '🎬' },
  'Korrepetitor': { color: '#6A1B9A', icon: '🎹' },
  'Kollege': { color: '#2E7D32', icon: '🎭' },
  'Vermittler': { color: '#E65100', icon: '📋' },
  'Institution': { color: '#37474F', icon: '🏛️' },
  'Korrespondenz': { color: '#795548', icon: '✉️' },
  'Andere': { color: '#757575', icon: '👤' }
};

export async function renderMatrix(container) {
  // Load matrix data
  const matrixData = await dataLoader.loadMatrixData();

  if (!matrixData) {
    container.innerHTML = '<div class="viz-placeholder"><p>Fehler beim Laden der Daten</p></div>';
    return;
  }

  const margin = { top: 80, right: 20, bottom: 80, left: 200 };
  const width = container.clientWidth;
  const cellHeight = 36;
  const cellPadding = 2;

  container.innerHTML = '';

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'viz-fullwidth matrix-viz';
  wrapper.style.position = 'relative';
  container.appendChild(wrapper);

  // Title and info
  const header = document.createElement('div');
  header.className = 'viz-header';
  header.innerHTML = `
    <div>
      <h3>Begegnungs-Matrix</h3>
      <p class="viz-description">Beziehungsintensität zu Personen über Zeitperioden</p>
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

  setupExportHandlers(wrapper, exportToolbar, 'matrix', matrixData);

  // Get data
  const { zeitraeume, personen } = matrixData;
  const cellWidth = (width - margin.left - margin.right) / zeitraeume.length;
  const height = margin.top + margin.bottom + (personen.length * cellHeight);

  // Create SVG
  const svg = d3.select(wrapper)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'matrix-svg');

  // Intensity scale
  const maxIntensity = d3.max(personen, p =>
    d3.max(p.begegnungen || [], b => b.intensitaet)
  ) || 1;

  const colorScale = d3.scaleSequential()
    .domain([0, maxIntensity])
    .interpolator(d3.interpolateYlOrRd);

  // Create tooltip
  const tooltip = d3.select(wrapper)
    .append('div')
    .attr('class', 'matrix-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background', 'rgba(0, 0, 0, 0.9)')
    .style('color', '#fff')
    .style('padding', '10px 14px')
    .style('border-radius', '6px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', '1000')
    .style('max-width', '320px')
    .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)');

  // Add time period headers
  svg.append('g')
    .attr('class', 'period-headers')
    .attr('transform', `translate(${margin.left}, ${margin.top - 15})`)
    .selectAll('text')
    .data(zeitraeume)
    .enter()
    .append('text')
    .attr('x', (d, i) => i * cellWidth + cellWidth / 2)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('class', 'period-label')
    .style('font-size', '11px')
    .style('font-weight', '600')
    .style('fill', '#555')
    .text(d => d);

  // Add person rows
  const rows = svg.append('g')
    .attr('class', 'matrix-rows')
    .attr('transform', `translate(${margin.left}, ${margin.top})`)
    .selectAll('g')
    .data(personen)
    .enter()
    .append('g')
    .attr('class', 'person-row')
    .attr('transform', (d, i) => `translate(0, ${i * cellHeight})`);

  // Category indicator
  rows.append('rect')
    .attr('x', -margin.left + 10)
    .attr('y', cellHeight / 2 - 5)
    .attr('width', 10)
    .attr('height', 10)
    .attr('rx', 2)
    .attr('fill', d => CATEGORY_CONFIG[d.kategorie]?.color || '#757575');

  // Person labels
  rows.append('text')
    .attr('x', -15)
    .attr('y', cellHeight / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .attr('class', 'person-label')
    .style('font-size', '12px')
    .style('font-weight', '500')
    .style('fill', '#333')
    .text(d => d.name);

  // Category text (small)
  rows.append('text')
    .attr('x', -margin.left + 25)
    .attr('y', cellHeight / 2)
    .attr('dy', '0.35em')
    .attr('class', 'category-label')
    .style('font-size', '9px')
    .style('fill', '#888')
    .text(d => d.kategorie);

  // Create cells
  rows.each(function(person) {
    const row = d3.select(this);
    const encountersMap = new Map(
      (person.begegnungen || []).map(b => [b.zeitraum, b])
    );

    zeitraeume.forEach((zeitraum, i) => {
      const encounter = encountersMap.get(zeitraum);
      const intensity = encounter ? encounter.intensitaet : 0;

      const cell = row.append('rect')
        .attr('x', i * cellWidth + cellPadding)
        .attr('y', cellPadding)
        .attr('width', cellWidth - 2 * cellPadding)
        .attr('height', cellHeight - 2 * cellPadding)
        .attr('fill', intensity > 0 ? colorScale(intensity) : '#f8f8f8')
        .attr('stroke', intensity > 0 ? '#fff' : '#eee')
        .attr('stroke-width', 1)
        .attr('rx', 3)
        .attr('class', 'matrix-cell')
        .style('cursor', intensity > 0 ? 'pointer' : 'default')
        .style('transition', 'all 0.2s ease');

      if (encounter) {
        cell
          .on('mouseover', function(event) {
            d3.select(this)
              .attr('stroke', '#333')
              .attr('stroke-width', 2);

            const docTypes = encounter.dokumente.reduce((acc, d) => {
              acc[d.typ] = (acc[d.typ] || 0) + 1;
              return acc;
            }, {});
            const docTypesStr = Object.entries(docTypes)
              .map(([typ, count]) => `${typ}: ${count}`)
              .join(', ');

            tooltip
              .style('visibility', 'visible')
              .html(`
                <strong style="font-size: 13px;">${person.name}</strong>
                <span style="color: ${CATEGORY_CONFIG[person.kategorie]?.color || '#888'}; margin-left: 8px;">${person.kategorie}</span>
                <br><span style="color: #aaa;">${zeitraum}</span>
                <hr style="border: none; border-top: 1px solid #444; margin: 8px 0;">
                <div style="margin-bottom: 4px;">
                  <strong>Intensität:</strong> ${intensity}
                  <span style="color: #888; font-size: 10px;">(Brief=3, Poster/Programm=2, Foto=1)</span>
                </div>
                <div><strong>Dokumente:</strong> ${encounter.anzahl_dokumente || encounter.dokumente.length}</div>
                <div style="color: #aaa; font-size: 10px; margin-top: 4px;">${docTypesStr}</div>
                <div style="color: #6af; font-size: 11px; margin-top: 8px;">Klicken für Details →</div>
              `);
          })
          .on('mousemove', function(event) {
            tooltip
              .style('top', (event.offsetY + 15) + 'px')
              .style('left', (event.offsetX + 15) + 'px');
          })
          .on('mouseout', function() {
            d3.select(this)
              .attr('stroke', '#fff')
              .attr('stroke-width', 1);
            tooltip.style('visibility', 'hidden');
          })
          .on('click', () => {
            showDocumentPanel(person, encounter);
          });
      } else {
        // Empty cell tooltip
        cell.on('mouseover', function(event) {
          tooltip
            .style('visibility', 'visible')
            .html(`
              <strong>${person.name}</strong><br>
              <span style="color: #aaa;">${zeitraum}</span>
              <hr style="border: none; border-top: 1px solid #444; margin: 8px 0;">
              <span style="color: #888;">Keine dokumentierten Begegnungen in diesem Zeitraum</span>
            `);
        })
        .on('mousemove', function(event) {
          tooltip
            .style('top', (event.offsetY + 15) + 'px')
            .style('left', (event.offsetX + 15) + 'px');
        })
        .on('mouseout', function() {
          tooltip.style('visibility', 'hidden');
        });
      }
    });
  });

  // Legend
  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${margin.left}, ${height - 55})`);

  const legendScale = d3.scaleLinear()
    .domain([0, maxIntensity])
    .range([0, 200]);

  const legendAxis = d3.axisBottom(legendScale)
    .ticks(5)
    .tickFormat(d => d.toFixed(0));

  const defs = svg.append('defs');
  const gradient = defs.append('linearGradient')
    .attr('id', 'intensity-gradient')
    .attr('x1', '0%')
    .attr('x2', '100%');

  gradient.selectAll('stop')
    .data([0, 0.25, 0.5, 0.75, 1])
    .enter()
    .append('stop')
    .attr('offset', d => `${d * 100}%`)
    .attr('stop-color', d => colorScale(d * maxIntensity));

  legend.append('rect')
    .attr('width', 200)
    .attr('height', 12)
    .attr('rx', 2)
    .style('fill', 'url(#intensity-gradient)');

  legend.append('g')
    .attr('transform', 'translate(0, 12)')
    .call(legendAxis)
    .selectAll('text')
    .style('font-size', '10px');

  legend.append('text')
    .attr('x', 100)
    .attr('y', -8)
    .attr('text-anchor', 'middle')
    .style('font-size', '11px')
    .style('font-weight', '500')
    .style('fill', '#555')
    .text('Begegnungsintensität');

  // Category legend
  const catLegend = svg.append('g')
    .attr('class', 'category-legend')
    .attr('transform', `translate(${margin.left + 280}, ${height - 55})`);

  const categories = [...new Set(personen.map(p => p.kategorie))];
  categories.forEach((cat, i) => {
    const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['Andere'];
    catLegend.append('rect')
      .attr('x', i * 100)
      .attr('y', 0)
      .attr('width', 10)
      .attr('height', 10)
      .attr('rx', 2)
      .attr('fill', config.color);
    catLegend.append('text')
      .attr('x', i * 100 + 14)
      .attr('y', 9)
      .style('font-size', '10px')
      .style('fill', '#666')
      .text(cat);
  });
}

/**
 * Show document panel for a person-period encounter
 * IMPROVED: Full document titles, clickable signatures, better styling
 */
function showDocumentPanel(person, encounter) {
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

  const categoryConfig = {
    'Dirigent': { color: '#C41E3A', icon: '🎼' },
    'Regisseur': { color: '#1565C0', icon: '🎬' },
    'Korrepetitor': { color: '#6A1B9A', icon: '🎹' },
    'Kollege': { color: '#2E7D32', icon: '🎭' },
    'Vermittler': { color: '#E65100', icon: '📋' },
    'Institution': { color: '#37474F', icon: '🏛️' },
    'Korrespondenz': { color: '#795548', icon: '✉️' },
    'Andere': { color: '#757575', icon: '👤' }
  };

  const config = categoryConfig[person.kategorie] || categoryConfig['Andere'];

  panel.innerHTML = `
    <div style="
      padding: 20px 24px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
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
      <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600;">${person.name}</h3>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="
          background: ${config.color};
          color: #fff;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        ">${config.icon} ${person.kategorie}</span>
        <span style="color: rgba(255,255,255,0.7); font-size: 14px;">${encounter.zeitraum}</span>
      </div>
    </div>

    <div style="
      padding: 16px 24px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      gap: 24px;
      flex-shrink: 0;
    ">
      <div>
        <div style="font-size: 24px; font-weight: 700; color: #333;">${encounter.intensitaet}</div>
        <div style="font-size: 11px; color: #666;">Intensität</div>
      </div>
      <div>
        <div style="font-size: 24px; font-weight: 700; color: #333;">${encounter.anzahl_dokumente || encounter.dokumente.length}</div>
        <div style="font-size: 11px; color: #666;">Dokumente</div>
      </div>
    </div>

    <div style="
      flex: 1;
      overflow-y: auto;
      padding: 16px 24px;
    ">
      <h4 style="margin: 0 0 16px 0; font-size: 13px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">
        Verknüpfte Archivalien
      </h4>
      <div class="document-list" style="display: flex; flex-direction: column; gap: 12px;">
        ${encounter.dokumente.map(doc => `
          <div class="document-item" style="
            background: #fff;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 14px;
            transition: box-shadow 0.2s, border-color 0.2s;
            cursor: pointer;
          " onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.borderColor='#004A8F'" onmouseout="this.style.boxShadow='none'; this.style.borderColor='#e9ecef'">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="
                background: #e3f2fd;
                color: #1565C0;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
              ">${doc.typ}</span>
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
            ">${doc.titel}</p>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="
      padding: 16px 24px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
      flex-shrink: 0;
    ">
      <p style="margin: 0; font-size: 11px; color: #888;">
        <strong>Intensitätsberechnung:</strong> Brief = 3, Poster/Programm/Vertrag = 2, Foto = 1
      </p>
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
