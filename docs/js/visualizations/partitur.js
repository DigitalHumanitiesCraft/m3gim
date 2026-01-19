/**
 * Mobilitäts-Partitur Visualization (ES6 Module)
 * Multi-layer timeline showing life phases, locations, mobility, network, repertoire, documents
 *
 * IMPROVED:
 * - Uses pre-computed partitur.json view data
 * - Rich tooltips with context
 * - Netzwerk track from period intensities
 * - Repertoire track with composer colors
 * - Click interactions for document panel
 * - Zoomable with navigator
 */

import { dataLoader } from '../modules/data-loader.js';
import { setupExportHandlers } from '../utils/export.js';

// Track configuration
const TRACKS = [
  { id: 'lebensphasen', label: 'Lebensphasen', height: 50 },
  { id: 'orte', label: 'Orte', height: 45 },
  { id: 'mobilitaet', label: 'Mobilität', height: 40 },
  { id: 'netzwerk', label: 'Netzwerk', height: 50 },
  { id: 'repertoire', label: 'Repertoire', height: 55 },
  { id: 'dokumente', label: 'Dokumente', height: 50 }
];

// Life phase colors (gradient from yellow to purple)
const LP_COLORS = {
  'LP1': '#FFCA28', 'LP2': '#FFA726', 'LP3': '#FF7043',
  'LP4': '#EF5350', 'LP5': '#EC407A', 'LP6': '#AB47BC', 'LP7': '#7E57C2'
};

// Location colors
const ORT_COLORS = d3.scaleOrdinal()
  .domain(['Lemberg', 'Wien', 'Graz', 'München', 'Bayreuth', 'Zürich', 'Salzburg'])
  .range(['#8B4513', '#C41E3A', '#2E7D32', '#1565C0', '#6A1B9A', '#E65100', '#B71C1C']);

// Mobility form colors
const MOBILITY_COLORS = {
  erzwungen: '#D32F2F',
  geografisch: '#2E7D32',
  bildung: '#E65100',
  lebensstil: '#6A1B9A'
};

// Mobility form labels
const MOBILITY_LABELS = {
  erzwungen: 'Erzwungene Migration',
  geografisch: 'Geografische Mobilität',
  bildung: 'Bildungsmobilität',
  lebensstil: 'Lebensstilmobilität'
};

export async function renderPartitur(container) {
  // Load partitur data
  const data = await dataLoader.loadPartiturData();

  if (!data) {
    container.innerHTML = '<div class="viz-placeholder"><p>Fehler beim Laden der Daten</p></div>';
    return;
  }

  const width = container.clientWidth;
  const margin = { top: 40, right: 30, bottom: 80, left: 110 };
  const trackGap = 8;

  // Calculate total height
  const totalTrackHeight = TRACKS.reduce((sum, t) => sum + t.height + trackGap, 0);
  const detailHeight = margin.top + totalTrackHeight + 20;
  const contextHeight = 55;
  const totalHeight = detailHeight + contextHeight + 10;

  container.innerHTML = '';

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'viz-fullwidth partitur-viz';
  container.appendChild(wrapper);

  // Header with title
  const header = document.createElement('div');
  header.className = 'viz-header';
  header.innerHTML = `
    <div>
      <h3>Mobilitäts-Partitur</h3>
      <p class="viz-description">Biografie als Partitur: Lebensphasen, Orte, Mobilität, Netzwerk, Repertoire, Archivalien</p>
    </div>
  `;
  wrapper.appendChild(header);

  // Export buttons
  const exportToolbar = document.createElement('div');
  exportToolbar.className = 'export-toolbar';
  exportToolbar.innerHTML = `
    <button class="export-btn" data-format="svg" title="Als SVG exportieren">SVG</button>
    <button class="export-btn" data-format="png" title="Als PNG exportieren">PNG</button>
  `;
  header.appendChild(exportToolbar);
  setupExportHandlers(wrapper, exportToolbar, 'partitur', data);

  // Detail view container
  const detailContainer = document.createElement('div');
  detailContainer.className = 'partitur-detail';
  detailContainer.style.cssText = 'position: relative; background: #FAFAFA; border-radius: 6px; margin-bottom: 8px;';
  wrapper.appendChild(detailContainer);

  // Zoom controls
  const zoomControls = document.createElement('div');
  zoomControls.className = 'partitur-zoom-controls';
  zoomControls.innerHTML = `
    <button class="zoom-btn" id="zoom-out" title="Herauszoomen">−</button>
    <span class="zoom-level" id="zoom-level">100%</span>
    <button class="zoom-btn" id="zoom-in" title="Hineinzoomen">+</button>
    <button class="zoom-btn" id="zoom-reset" title="Zurücksetzen">⟲</button>
  `;
  detailContainer.appendChild(zoomControls);

  // Create SVG for detail view
  const svg = d3.select(detailContainer)
    .append('svg')
    .attr('width', width)
    .attr('height', detailHeight)
    .attr('class', 'partitur-svg');

  // Scales
  const minYear = 1919, maxYear = 2009;
  const xScaleBase = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([margin.left, width - margin.right]);

  let xScale = xScaleBase.copy();

  // Clip path
  svg.append('defs')
    .append('clipPath')
    .attr('id', 'partitur-clip')
    .append('rect')
    .attr('x', margin.left)
    .attr('y', 0)
    .attr('width', width - margin.left - margin.right)
    .attr('height', detailHeight);

  // Track labels (fixed)
  const labelsGroup = svg.append('g').attr('class', 'partitur-labels');
  let yOffset = margin.top;
  TRACKS.forEach(track => {
    labelsGroup.append('text')
      .attr('x', margin.left - 10)
      .attr('y', yOffset + track.height / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', '#4A4A4A')
      .text(track.label);
    yOffset += track.height + trackGap;
  });

  // Content group (clipped)
  const contentGroup = svg.append('g')
    .attr('class', 'partitur-content')
    .attr('clip-path', 'url(#partitur-clip)');

  // Axis group
  const axisGroup = svg.append('g').attr('class', 'partitur-axis');

  // Tooltip
  const tooltip = d3.select(wrapper)
    .append('div')
    .attr('class', 'partitur-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background', 'rgba(0, 0, 0, 0.9)')
    .style('color', '#fff')
    .style('padding', '10px 14px')
    .style('border-radius', '6px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', '1000')
    .style('max-width', '280px')
    .style('line-height', '1.4');

  function showTooltip(event, title, content) {
    tooltip
      .style('visibility', 'visible')
      .html(`<strong>${title}</strong><br>${content.replace(/\n/g, '<br>')}`);
  }

  function moveTooltip(event) {
    const rect = wrapper.getBoundingClientRect();
    tooltip
      .style('top', (event.clientY - rect.top + 15) + 'px')
      .style('left', (event.clientX - rect.left + 15) + 'px');
  }

  function hideTooltip() {
    tooltip.style('visibility', 'hidden');
  }

  // Document panel (consistent with matrix/kosmos/sankey)
  function showDocumentPanel(title, dokumente) {
    // Remove existing panel
    const existing = document.querySelector('.partitur-document-panel');
    if (existing) existing.remove();
    const existingOverlay = document.querySelector('.partitur-panel-overlay');
    if (existingOverlay) existingOverlay.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'partitur-panel-overlay';
    document.body.appendChild(overlay);

    // Create panel
    const panel = document.createElement('div');
    panel.className = 'partitur-document-panel';

    // Deduplicate by signatur
    const uniqueDocs = [];
    const seen = new Set();
    dokumente.forEach(doc => {
      if (!seen.has(doc.signatur)) {
        seen.add(doc.signatur);
        uniqueDocs.push(doc);
      }
    });

    panel.innerHTML = `
      <div class="doc-panel-header">
        <span class="doc-panel-title">${title}</span>
        <span class="doc-panel-count">${uniqueDocs.length} Dokument${uniqueDocs.length !== 1 ? 'e' : ''}</span>
        <button class="doc-panel-close">&times;</button>
      </div>
      <div class="doc-panel-content">
        ${uniqueDocs.map(doc => `
          <div class="doc-panel-item">
            <div class="doc-item-signatur">${doc.signatur}</div>
            <div class="doc-item-titel">${doc.titel || 'Ohne Titel'}</div>
            <span class="doc-item-typ">${doc.typ || 'Unbekannt'}</span>
          </div>
        `).join('')}
      </div>
    `;

    document.body.appendChild(panel);

    // Close handlers
    const closePanel = () => {
      panel.classList.remove('visible');
      overlay.classList.remove('visible');
      setTimeout(() => {
        panel.remove();
        overlay.remove();
      }, 300);
      document.removeEventListener('keydown', escHandler);
    };

    const escHandler = (e) => {
      if (e.key === 'Escape') closePanel();
    };

    panel.querySelector('.doc-panel-close').addEventListener('click', closePanel);
    overlay.addEventListener('click', closePanel);
    document.addEventListener('keydown', escHandler);

    // Animate in
    requestAnimationFrame(() => {
      panel.classList.add('visible');
      overlay.classList.add('visible');
    });
  }

  // Draw functions
  function drawTracks() {
    contentGroup.selectAll('*').remove();
    const domain = xScale.domain();
    let y = margin.top;

    // Track backgrounds
    TRACKS.forEach((track, i) => {
      contentGroup.append('rect')
        .attr('x', margin.left)
        .attr('y', y)
        .attr('width', width - margin.left - margin.right)
        .attr('height', track.height)
        .attr('fill', i % 2 === 0 ? '#FFFFFF' : '#F8F6F2')
        .attr('rx', 2);
      y += track.height + trackGap;
    });

    y = margin.top;

    // Lebensphasen
    drawLebensphasen(contentGroup, data.lebensphasen, xScale, y, TRACKS[0].height, domain);
    y += TRACKS[0].height + trackGap;

    // Orte
    drawOrte(contentGroup, data.orte, xScale, y, TRACKS[1].height, domain);
    y += TRACKS[1].height + trackGap;

    // Mobilität
    drawMobilitaet(contentGroup, data.mobilitaet, xScale, y, TRACKS[2].height, domain);
    y += TRACKS[2].height + trackGap;

    // Netzwerk
    drawNetzwerk(contentGroup, data.netzwerk, xScale, y, TRACKS[3].height, domain);
    y += TRACKS[3].height + trackGap;

    // Repertoire
    drawRepertoire(contentGroup, data.repertoire, xScale, y, TRACKS[4].height, domain);
    y += TRACKS[4].height + trackGap;

    // Dokumente
    drawDokumente(contentGroup, data.dokumente, xScale, y, TRACKS[5].height, domain);
  }

  function drawLebensphasen(g, phasen, scale, y, h, domain) {
    if (!phasen) return;

    const visible = phasen.filter(p => p.bis >= domain[0] && p.von <= domain[1]);

    visible.forEach(p => {
      const x1 = Math.max(scale(p.von), scale.range()[0]);
      const x2 = Math.min(scale(p.bis), scale.range()[1]);
      const w = Math.max(0, x2 - x1);

      g.append('rect')
        .attr('x', x1)
        .attr('y', y + 4)
        .attr('width', w)
        .attr('height', h - 8)
        .attr('rx', 4)
        .attr('fill', LP_COLORS[p.id] || '#9E9E9E')
        .attr('fill-opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          showTooltip(event, p.label, `${p.von}–${p.bis}\n${p.ort}\n${p.beschreibung}`);
        })
        .on('mousemove', moveTooltip)
        .on('mouseout', hideTooltip);

      // Label if space
      if (w > 70) {
        g.append('text')
          .attr('x', (x1 + x2) / 2)
          .attr('y', y + h / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '500')
          .attr('fill', '#fff')
          .attr('pointer-events', 'none')
          .text(p.label);
      }
    });
  }

  function drawOrte(g, orte, scale, y, h, domain) {
    if (!orte) return;

    const visible = orte.filter(o => o.bis >= domain[0] && o.von <= domain[1]);

    visible.forEach(o => {
      const x1 = Math.max(scale(o.von), scale.range()[0]);
      const x2 = Math.min(scale(o.bis), scale.range()[1]);
      const w = Math.max(4, x2 - x1);

      const isWohnort = o.typ === 'wohnort';
      const barY = isWohnort ? y + 4 : y + h / 2;
      const barH = isWohnort ? h - 8 : h / 2 - 4;

      g.append('rect')
        .attr('x', x1)
        .attr('y', barY)
        .attr('width', w)
        .attr('height', barH)
        .attr('rx', 3)
        .attr('fill', ORT_COLORS(o.ort))
        .attr('fill-opacity', isWohnort ? 0.9 : 0.5)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          const typLabel = isWohnort ? 'Wohnort' : 'Aufführungsort';
          showTooltip(event, `${o.ort}`, `${typLabel}\n${o.von}–${o.bis}`);
        })
        .on('mousemove', moveTooltip)
        .on('mouseout', hideTooltip);

      // Label if space
      if (w > 40 && isWohnort) {
        g.append('text')
          .attr('x', x1 + 4)
          .attr('y', barY + barH / 2)
          .attr('dy', '0.35em')
          .attr('font-size', '9px')
          .attr('fill', '#fff')
          .attr('pointer-events', 'none')
          .text(o.ort);
      }
    });
  }

  function drawMobilitaet(g, events, scale, y, h, domain) {
    if (!events) return;

    const visible = events.filter(m => m.jahr >= domain[0] && m.jahr <= domain[1]);

    visible.forEach((m, i) => {
      const x = scale(m.jahr);
      const cy = y + 10 + (i % 2) * 15;

      // Connection line
      g.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', y)
        .attr('y2', cy - 6)
        .attr('stroke', MOBILITY_COLORS[m.form] || '#757575')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      // Circle marker
      g.append('circle')
        .attr('cx', x)
        .attr('cy', cy)
        .attr('r', 6)
        .attr('fill', MOBILITY_COLORS[m.form] || '#757575')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          showTooltip(event,
            `${MOBILITY_LABELS[m.form] || m.form}`,
            `${m.jahr}\n${m.von} → ${m.nach}\n${m.beschreibung}`
          );
        })
        .on('mousemove', moveTooltip)
        .on('mouseout', hideTooltip);

      // Arrow indicator
      g.append('text')
        .attr('x', x)
        .attr('y', cy + 18)
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .attr('fill', '#666')
        .attr('pointer-events', 'none')
        .text('→');
    });
  }

  function drawNetzwerk(g, netzwerk, scale, y, h, domain) {
    if (!netzwerk || netzwerk.length === 0) return;

    // Parse period data into yearly bars
    const maxIntensity = d3.max(netzwerk, n => n.intensitaet) || 1;

    netzwerk.forEach(n => {
      const [startYear, endYear] = n.periode.split('-').map(Number);
      const midYear = (startYear + endYear) / 2;

      if (endYear < domain[0] || startYear > domain[1]) return;

      const x = scale(midYear);
      const barWidth = Math.abs(scale(endYear) - scale(startYear)) * 0.8;
      const barH = (n.intensitaet / maxIntensity) * (h - 10);

      g.append('rect')
        .attr('x', x - barWidth / 2)
        .attr('y', y + h - 4 - barH)
        .attr('width', barWidth)
        .attr('height', barH)
        .attr('rx', 2)
        .attr('fill', '#1565C0')
        .attr('fill-opacity', 0.6)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          showTooltip(event,
            `Netzwerk-Intensität`,
            `${n.periode}\nIntensitätswert: ${n.intensitaet}\n(basierend auf Korrespondenz & Begegnungen)`
          );
        })
        .on('mousemove', moveTooltip)
        .on('mouseout', hideTooltip);
    });
  }

  function drawRepertoire(g, repertoire, scale, y, h, domain) {
    if (!repertoire) return;

    const visible = repertoire.filter(r => r.bis >= domain[0] && r.von <= domain[1]);

    visible.forEach((r, i) => {
      const x1 = Math.max(scale(r.von), scale.range()[0]);
      const x2 = Math.min(scale(r.bis), scale.range()[1]);
      const w = Math.max(4, x2 - x1);
      const barH = 16;
      const barY = y + 4 + (i % 3) * (barH + 3);

      g.append('rect')
        .attr('x', x1)
        .attr('y', barY)
        .attr('width', w)
        .attr('height', barH)
        .attr('rx', 3)
        .attr('fill', r.farbe || '#708090')
        .attr('fill-opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          showTooltip(event,
            r.komponist,
            `${r.von}–${r.bis}\n${r.dokumente} Dokumente\n\nKlicken für Details`
          );
        })
        .on('mousemove', moveTooltip)
        .on('mouseout', hideTooltip)
        .on('click', () => {
          // Use dokumente_liste (full refs) if available, fallback to signaturen
          const docs = r.dokumente_liste || (r.signaturen || []).map(s => ({signatur: s, titel: '', typ: 'Unknown'}));
          if (docs.length > 0) {
            showDocumentPanel(`${r.komponist} (${r.von}–${r.bis})`, docs);
          }
        });

      // Label if space
      if (w > 50) {
        g.append('text')
          .attr('x', x1 + 4)
          .attr('y', barY + barH / 2)
          .attr('dy', '0.35em')
          .attr('font-size', '9px')
          .attr('font-weight', '500')
          .attr('fill', '#fff')
          .attr('pointer-events', 'none')
          .text(r.komponist);
      }
    });
  }

  function drawDokumente(g, dokumente, scale, y, h, domain) {
    if (!dokumente) return;

    const visible = dokumente.filter(d => d.jahr >= domain[0] && d.jahr <= domain[1] && d.anzahl > 0);
    const maxCount = d3.max(dokumente, d => d.anzahl) || 1;

    const barWidth = Math.max(2, (scale.range()[1] - scale.range()[0]) / (domain[1] - domain[0]) * 0.6);

    visible.forEach(d => {
      const x = scale(d.jahr);
      const barH = (d.anzahl / maxCount) * (h - 10);

      g.append('rect')
        .attr('x', x - barWidth / 2)
        .attr('y', y + h - 4 - barH)
        .attr('width', barWidth)
        .attr('height', barH)
        .attr('rx', 1)
        .attr('fill', '#6A1B9A')
        .attr('fill-opacity', 0.6)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          showTooltip(event, `${d.jahr}`, `${d.anzahl} Archivalien`);
        })
        .on('mousemove', moveTooltip)
        .on('mouseout', hideTooltip);
    });
  }

  function drawAxis() {
    axisGroup.selectAll('*').remove();

    const xAxis = d3.axisTop(xScale)
      .tickFormat(d3.format('d'))
      .ticks(Math.max(5, Math.floor(width / 100)));

    axisGroup.append('g')
      .attr('transform', `translate(0, ${margin.top - 5})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#757575');

    // Grid lines
    const domain = xScale.domain();
    const step = (domain[1] - domain[0]) > 40 ? 10 : 5;
    const startYear = Math.ceil(domain[0] / step) * step;
    const years = d3.range(startYear, domain[1], step);

    axisGroup.selectAll('.grid-line')
      .data(years)
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', margin.top)
      .attr('y2', detailHeight - 20)
      .attr('stroke', '#E8E4DC')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,4');
  }

  function updateZoomLevel() {
    const fullRange = maxYear - minYear;
    const currentDomain = xScale.domain();
    const currentRange = currentDomain[1] - currentDomain[0];
    const percent = Math.round((fullRange / currentRange) * 100);
    document.getElementById('zoom-level').textContent = `${percent}%`;
  }

  // === Navigator (context) view ===
  const contextContainer = document.createElement('div');
  contextContainer.className = 'partitur-context';
  contextContainer.innerHTML = `<div class="context-label">Navigator – Ziehen zum Auswählen</div>`;
  wrapper.appendChild(contextContainer);

  const contextSvg = d3.select(contextContainer)
    .append('svg')
    .attr('width', width)
    .attr('height', contextHeight);

  // Context background
  contextSvg.append('rect')
    .attr('x', margin.left)
    .attr('y', 5)
    .attr('width', width - margin.left - margin.right)
    .attr('height', 30)
    .attr('fill', '#F0EDE8')
    .attr('rx', 4);

  // Mini life phases
  if (data.lebensphasen) {
    contextSvg.selectAll('.mini-phase')
      .data(data.lebensphasen)
      .enter()
      .append('rect')
      .attr('x', d => xScaleBase(d.von))
      .attr('y', 10)
      .attr('width', d => Math.max(2, xScaleBase(d.bis) - xScaleBase(d.von)))
      .attr('height', 15)
      .attr('rx', 2)
      .attr('fill', d => LP_COLORS[d.id] || '#999')
      .attr('fill-opacity', 0.5);
  }

  // Mini document density
  if (data.dokumente) {
    const maxDoc = d3.max(data.dokumente, d => d.anzahl) || 1;
    const areaScale = d3.scaleLinear().domain([0, maxDoc]).range([0, 10]);

    const area = d3.area()
      .x(d => xScaleBase(d.jahr))
      .y0(30)
      .y1(d => 30 - areaScale(d.anzahl))
      .curve(d3.curveMonotoneX);

    contextSvg.append('path')
      .datum(data.dokumente.filter(d => d.anzahl > 0))
      .attr('fill', '#6A1B9A')
      .attr('fill-opacity', 0.3)
      .attr('d', area);
  }

  // Mini axis
  const contextAxis = d3.axisBottom(xScaleBase)
    .tickFormat(d => d % 20 === 0 ? d : '')
    .ticks(6);

  contextSvg.append('g')
    .attr('transform', `translate(0, ${contextHeight - 12})`)
    .call(contextAxis)
    .selectAll('text')
    .attr('font-size', '9px')
    .attr('fill', '#757575');

  // Brush for navigation
  const brush = d3.brushX()
    .extent([[margin.left, 5], [width - margin.right, 35]])
    .on('brush end', brushed);

  const brushGroup = contextSvg.append('g')
    .attr('class', 'partitur-brush')
    .call(brush);

  brushGroup.selectAll('.selection')
    .attr('fill', '#004A8F')
    .attr('fill-opacity', 0.15)
    .attr('stroke', '#004A8F')
    .attr('stroke-width', 2)
    .attr('rx', 3);

  brushGroup.call(brush.move, [margin.left, width - margin.right]);

  function brushed(event) {
    if (!event.selection) return;
    if (event.sourceEvent && event.sourceEvent.type === 'zoom') return;

    const [x0, x1] = event.selection;
    xScale.domain([xScaleBase.invert(x0), xScaleBase.invert(x1)]);

    drawTracks();
    drawAxis();
    updateZoomLevel();
  }

  // Zoom behavior for detail view
  const zoom = d3.zoom()
    .scaleExtent([1, 15])
    .translateExtent([[margin.left, 0], [width - margin.right, detailHeight]])
    .extent([[margin.left, 0], [width - margin.right, detailHeight]])
    .on('zoom', zoomed);

  svg.append('rect')
    .attr('class', 'zoom-rect')
    .attr('x', margin.left)
    .attr('y', margin.top)
    .attr('width', width - margin.left - margin.right)
    .attr('height', detailHeight - margin.top - 20)
    .attr('fill', 'transparent')
    .style('cursor', 'grab')
    .call(zoom);

  function zoomed(event) {
    if (event.sourceEvent && event.sourceEvent.type === 'brush') return;

    const newXScale = event.transform.rescaleX(xScaleBase);
    xScale.domain(newXScale.domain());

    drawTracks();
    drawAxis();
    updateZoomLevel();

    // Sync brush
    const x0 = xScaleBase(xScale.domain()[0]);
    const x1 = xScaleBase(xScale.domain()[1]);
    brushGroup.call(brush.move, [x0, x1]);
  }

  // Zoom button handlers
  document.getElementById('zoom-in')?.addEventListener('click', () => {
    svg.select('.zoom-rect').transition().duration(300).call(zoom.scaleBy, 1.5);
  });

  document.getElementById('zoom-out')?.addEventListener('click', () => {
    svg.select('.zoom-rect').transition().duration(300).call(zoom.scaleBy, 0.67);
  });

  document.getElementById('zoom-reset')?.addEventListener('click', () => {
    svg.select('.zoom-rect').transition().duration(300).call(zoom.transform, d3.zoomIdentity);
  });

  // Initial draw
  drawTracks();
  drawAxis();
  updateZoomLevel();

  // Add styles
  addPartiturStyles();
}

function addPartiturStyles() {
  if (document.getElementById('partitur-module-styles')) return;

  const style = document.createElement('style');
  style.id = 'partitur-module-styles';
  style.textContent = `
    .partitur-viz {
      font-family: 'Source Sans Pro', sans-serif;
    }

    .partitur-zoom-controls {
      position: absolute;
      top: 8px;
      right: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      z-index: 10;
    }

    .zoom-btn {
      width: 28px;
      height: 28px;
      background: #fff;
      border: 1px solid #D4CFC5;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      color: #4A4A4A;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .zoom-btn:hover {
      background: #004A8F;
      border-color: #004A8F;
      color: #fff;
    }

    .zoom-level {
      font-size: 11px;
      font-weight: 600;
      color: #004A8F;
      padding: 4px 8px;
      background: #E3EDF7;
      border-radius: 4px;
      min-width: 42px;
      text-align: center;
    }

    .partitur-context {
      background: #FAF8F5;
      border-radius: 6px;
      padding: 4px;
    }

    .context-label {
      font-size: 10px;
      color: #757575;
      padding: 2px 8px;
      margin-bottom: 2px;
    }

    .partitur-tooltip {
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .zoom-rect:active {
      cursor: grabbing;
    }

    /* Document panel (consistent with matrix/kosmos/sankey) */
    .partitur-panel-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      z-index: 999;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .partitur-panel-overlay.visible {
      opacity: 1;
    }

    .partitur-document-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      width: 90%;
      max-width: 500px;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      opacity: 0;
      transition: all 0.3s ease;
    }

    .partitur-document-panel.visible {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }

    .doc-panel-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: linear-gradient(135deg, #004A8F, #1565C0);
      border-radius: 12px 12px 0 0;
      color: #fff;
    }

    .doc-panel-title {
      font-size: 16px;
      font-weight: 600;
      flex: 1;
    }

    .doc-panel-count {
      font-size: 12px;
      background: rgba(255,255,255,0.2);
      padding: 4px 10px;
      border-radius: 12px;
    }

    .doc-panel-close {
      background: none;
      border: none;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      padding: 0 4px;
      opacity: 0.8;
      transition: opacity 0.2s;
    }

    .doc-panel-close:hover {
      opacity: 1;
    }

    .doc-panel-content {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
    }

    .doc-panel-item {
      padding: 12px;
      margin-bottom: 10px;
      background: #F8F6F2;
      border-radius: 8px;
      border-left: 4px solid #004A8F;
    }

    .doc-panel-item:last-child {
      margin-bottom: 0;
    }

    .doc-item-signatur {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #004A8F;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .doc-item-titel {
      font-size: 13px;
      color: #4A4A4A;
      line-height: 1.4;
      margin-bottom: 6px;
    }

    .doc-item-typ {
      display: inline-block;
      font-size: 10px;
      background: #E3EDF7;
      color: #004A8F;
      padding: 2px 8px;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  `;
  document.head.appendChild(style);
}
