/**
 * Begegnungs-Matrix Visualization
 * Heatmap showing person encounters over time periods
 */

import { dataLoader } from '../modules/data-loader.js';
import { setupExportHandlers } from '../utils/export.js';

export async function renderMatrix(container) {
  // Load matrix data
  const matrixData = await dataLoader.loadMatrixData();

  if (!matrixData) {
    container.innerHTML = '<div class="viz-placeholder"><p>Fehler beim Laden der Daten</p></div>';
    return;
  }

  const margin = { top: 80, right: 20, bottom: 60, left: 160 };
  const width = container.clientWidth;
  const cellHeight = 30;
  const cellPadding = 2;

  container.innerHTML = '';

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'viz-fullwidth matrix-viz';
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

  // Add time period headers
  svg.append('g')
    .attr('class', 'period-headers')
    .attr('transform', `translate(${margin.left}, ${margin.top - 10})`)
    .selectAll('text')
    .data(zeitraeume)
    .enter()
    .append('text')
    .attr('x', (d, i) => i * cellWidth + cellWidth / 2)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .attr('class', 'period-label')
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

  // Person labels
  rows.append('text')
    .attr('x', -10)
    .attr('y', cellHeight / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .attr('class', 'person-label')
    .text(d => d.name)
    .append('title')
    .text(d => `${d.name} (${d.kategorie}) - ${d.gesamt_intensitaet} Begegnungen`);

  // Category indicator
  rows.append('rect')
    .attr('x', -margin.left + 10)
    .attr('y', cellHeight / 2 - 4)
    .attr('width', 8)
    .attr('height', 8)
    .attr('class', d => `category-${d.kategorie.toLowerCase()}`);

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
        .attr('fill', intensity > 0 ? colorScale(intensity) : '#f5f5f5')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('class', 'matrix-cell')
        .style('cursor', intensity > 0 ? 'pointer' : 'default');

      if (encounter) {
        cell.append('title')
          .text(`${person.name} - ${zeitraum}\nIntensität: ${intensity}\nDokumente: ${encounter.dokumente.length}`);

        cell.on('click', () => {
          showDocumentPanel(person, encounter);
        });
      }
    });
  });

  // Legend
  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${margin.left}, ${height - 40})`);

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
    .attr('height', 15)
    .style('fill', 'url(#intensity-gradient)');

  legend.append('g')
    .attr('transform', 'translate(0, 15)')
    .call(legendAxis);

  legend.append('text')
    .attr('x', 100)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .text('Begegnungsintensität');
}

/**
 * Show document panel for a person-period encounter
 */
function showDocumentPanel(person, encounter) {
  let panel = document.getElementById('document-panel');

  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'document-panel';
    panel.className = 'document-panel';
    document.body.appendChild(panel);
  }

  panel.innerHTML = `
    <div class="document-panel__header">
      <h3>${person.name} - ${encounter.zeitraum}</h3>
      <button class="document-panel__close">&times;</button>
    </div>
    <div class="document-panel__content">
      <p><strong>Intensität:</strong> ${encounter.intensitaet}</p>
      <h4>Verknüpfte Dokumente (${encounter.dokumente.length}):</h4>
      <ul class="document-list">
        ${encounter.dokumente.map(doc => `
          <li class="document-item">
            <span class="doc-type">${doc.typ}</span>
            <span class="doc-signature">${doc.signatur}</span>
            <p class="doc-title">${doc.titel}</p>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  panel.classList.add('visible');

  panel.querySelector('.document-panel__close').addEventListener('click', () => {
    panel.classList.remove('visible');
  });
}
