/**
 * M³GIM - Mobilitäts-Partitur Visualization
 *
 * Multi-Layer Timeline showing:
 * - Lebensphasen (life phases)
 * - Orte (locations over time)
 * - Mobilität (mobility events with forms)
 * - Netzwerk (network density)
 * - Repertoire (roles/works)
 * - Dokumente (document distribution)
 *
 * Addresses all four research questions (FF1-FF4)
 */

(function() {
  'use strict';

  // Configuration - improved aesthetics with more whitespace
  const CONFIG = {
    syntheticDataUrl: 'data/synthetic-data.json',
    margin: { top: 50, right: 40, bottom: 60, left: 110 },
    trackHeight: 55,
    trackPadding: 18,
    minYear: 1919,
    maxYear: 2009
  };

  // Track definitions
  const TRACKS = [
    { id: 'lebensphasen', label: 'Lebensphasen', ff: ['FF4'] },
    { id: 'orte', label: 'Orte', ff: ['FF4'] },
    { id: 'mobilitaet', label: 'Mobilität', ff: ['FF4'] },
    { id: 'netzwerk', label: 'Netzwerk', ff: ['FF1', 'FF3'] },
    { id: 'repertoire', label: 'Repertoire', ff: ['FF2'] },
    { id: 'dokumente', label: 'Dokumente', ff: ['FF1', 'FF2', 'FF3', 'FF4'] }
  ];

  // Visualization metadata for all viz types
  const VIZ_METADATA = {
    partitur: {
      title: 'Mobilitäts-Partitur',
      description: 'Parallele Darstellung aller Dimensionen wie eine Orchesterpartitur – synchrone und diachrone Lesart.',
      ff: ['FF1', 'FF2', 'FF3', 'FF4']
    },
    matrix: {
      title: 'Begegnungs-Matrix',
      description: 'Beziehungsintensität zu Personen über Zeitperioden – wer war wann wichtig?',
      ff: ['FF1', 'FF3']
    },
    kosmos: {
      title: 'Rollen-Kosmos',
      description: 'Radiale Darstellung des künstlerischen Universums – Komponisten, Rollen, Aufführungsorte.',
      ff: ['FF2']
    },
    sankey: {
      title: 'Karriere-Fluss',
      description: 'Alluviales Diagramm: Wie veränderten sich Repertoire-Schwerpunkte und geografische Zentren über die Karrierephasen?',
      ff: ['FF2', 'FF4']
    }
  };

  // State
  let syntheticData = null;
  let currentViz = 'partitur';
  let focusYear = 1958;
  let visibleTracks = new Set(['lebensphasen', 'orte', 'mobilitaet', 'netzwerk', 'repertoire', 'dokumente']);

  // Archive document lookup for quick access
  let archiveDocuments = {};

  // Color scales
  const ortColors = d3.scaleOrdinal()
    .domain(['Lemberg', 'Wien', 'Graz', 'München', 'Bayreuth', 'Zürich', 'London', 'Salzburg'])
    .range(['#8B4513', '#C41E3A', '#2E7D32', '#1565C0', '#6A1B9A', '#E65100', '#37474F', '#B71C1C']);

  /**
   * Initialize the visualization module
   */
  async function init() {
    try {
      await loadSyntheticData();
      setupEventListeners();

      // Check if we're on the analyse view
      const analyseContent = document.getElementById('content-analyse');
      if (analyseContent && !analyseContent.classList.contains('content--hidden')) {
        renderVisualization();
      }
    } catch (error) {
      console.error('Partitur init error:', error);
    }
  }

  /**
   * Load data - prefer real extracted data from 436 archive records, fallback to synthetic
   */
  async function loadSyntheticData() {
    try {
      // Try to use the Data Extractor for real archive data (436 records)
      if (window.M3GIMDataExtractor) {
        console.log('M³GIM: Using Data Extractor for real archive data...');
        const realData = await window.M3GIMDataExtractor.loadAndTransform();
        if (realData && realData.archivalien?.dokumente?.length > 0) {
          syntheticData = realData;
          window.m3gimData = syntheticData; // Debug access
          console.log(`M³GIM: Loaded ${syntheticData.archivalien.dokumente.length} real archive records`);

          // Build archive document lookup table
          syntheticData.archivalien.dokumente.forEach(doc => {
            archiveDocuments[doc.id] = doc;
          });
          return;
        }
      }

      // Fallback to synthetic data file
      console.log('M³GIM: Falling back to synthetic data...');
      const response = await fetch(CONFIG.syntheticDataUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      syntheticData = await response.json();
      window.m3gimData = syntheticData; // Debug access

      // Build archive document lookup table
      if (syntheticData.archivalien?.dokumente) {
        syntheticData.archivalien.dokumente.forEach(doc => {
          archiveDocuments[doc.id] = doc;
        });
      }
    } catch (error) {
      console.warn('Could not load data:', error);
      // Use embedded fallback data
      syntheticData = getFallbackData();
    }
  }

  /* ==========================================================================
     DOCUMENT PANEL - Shared component for showing linked archive documents
     ========================================================================== */

  /**
   * Create or get the document panel container
   */
  function getDocumentPanel() {
    let panel = document.getElementById('document-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'document-panel';
      panel.className = 'document-panel';
      panel.innerHTML = `
        <div class="document-panel__header">
          <h3 class="document-panel__title">Verknüpfte Archivalien</h3>
          <button class="document-panel__close" aria-label="Schließen">&times;</button>
        </div>
        <div class="document-panel__content"></div>
      `;

      // Add close handler
      panel.querySelector('.document-panel__close').addEventListener('click', hideDocumentPanel);

      // Add styles if not already present
      if (!document.getElementById('document-panel-styles')) {
        const style = document.createElement('style');
        style.id = 'document-panel-styles';
        style.textContent = `
          .document-panel {
            position: fixed;
            right: -400px;
            top: 80px;
            width: 380px;
            max-height: calc(100vh - 100px);
            background: #fff;
            border-radius: 8px 0 0 8px;
            box-shadow: -4px 0 20px rgba(0,0,0,0.15);
            z-index: 1000;
            transition: right 0.3s ease;
            font-family: 'Source Sans Pro', sans-serif;
          }
          .document-panel--visible {
            right: 0;
          }
          .document-panel__header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #E8E4DC;
            background: #FAF8F5;
            border-radius: 8px 0 0 0;
          }
          .document-panel__title {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            color: #004A8F;
            letter-spacing: 0.02em;
          }
          .document-panel__close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #757575;
            padding: 0 4px;
            line-height: 1;
          }
          .document-panel__close:hover {
            color: #C41E3A;
          }
          .document-panel__content {
            padding: 16px 20px;
            overflow-y: auto;
            max-height: calc(100vh - 180px);
          }
          .document-panel__context {
            font-size: 13px;
            color: #4A4A4A;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #E8E4DC;
          }
          .document-panel__count {
            font-size: 12px;
            color: #757575;
            margin-bottom: 12px;
          }
          .document-panel__list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .document-panel__item {
            padding: 12px;
            margin-bottom: 8px;
            background: #FAF8F5;
            border-radius: 6px;
            border-left: 3px solid #004A8F;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .document-panel__item:hover {
            background: #F0EDE8;
            transform: translateX(2px);
          }
          .document-panel__item-type {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #757575;
            margin-bottom: 4px;
          }
          .document-panel__item-title {
            font-size: 13px;
            font-weight: 500;
            color: #1A1A1A;
            margin-bottom: 4px;
          }
          .document-panel__item-meta {
            font-size: 11px;
            color: #757575;
          }
          .document-panel__item-id {
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            color: #004A8F;
            margin-top: 4px;
          }
          .document-panel__empty {
            font-size: 13px;
            color: #757575;
            font-style: italic;
            text-align: center;
            padding: 20px;
          }
        `;
        document.head.appendChild(style);
      }

      document.body.appendChild(panel);
    }
    return panel;
  }

  /**
   * Show documents in the panel
   * @param {string} contextTitle - Title describing what was clicked
   * @param {string[]} documentIds - Array of document IDs to display
   */
  function showDocumentPanel(contextTitle, documentIds) {
    const panel = getDocumentPanel();
    const content = panel.querySelector('.document-panel__content');

    // Resolve document IDs to full document objects
    const documents = documentIds
      .map(id => archiveDocuments[id])
      .filter(doc => doc !== undefined);

    let html = `<div class="document-panel__context">${contextTitle}</div>`;

    if (documents.length === 0) {
      html += '<div class="document-panel__empty">Keine verknüpften Archivalien gefunden.</div>';
    } else {
      html += `<div class="document-panel__count">${documents.length} Archivalien</div>`;
      html += '<ul class="document-panel__list">';
      documents.forEach(doc => {
        html += `
          <li class="document-panel__item" data-id="${doc.id}">
            <div class="document-panel__item-type">${doc.typ}</div>
            <div class="document-panel__item-title">${doc.titel}</div>
            <div class="document-panel__item-meta">${doc.datum || 'o.D.'} · ${doc.ort || 'o.O.'}</div>
            <div class="document-panel__item-id">UAKUG/${doc.id}</div>
          </li>
        `;
      });
      html += '</ul>';
    }

    content.innerHTML = html;

    // Add click handlers to items
    content.querySelectorAll('.document-panel__item').forEach(item => {
      item.addEventListener('click', () => {
        const docId = item.dataset.id;
        // Navigate to catalog with this document (if implemented)
        if (window.M3GIMCatalog?.filterBySignature) {
          window.M3GIMCatalog.filterBySignature(docId);
        } else {
          // Fallback: show alert with document info
          alert(`Öffne Archiveintrag: UAKUG/${docId}\n\n(In der finalen Version wird hier zur Katalogansicht navigiert)`);
        }
      });
    });

    // Show panel
    panel.classList.add('document-panel--visible');
  }

  /**
   * Hide the document panel
   */
  function hideDocumentPanel() {
    const panel = document.getElementById('document-panel');
    if (panel) {
      panel.classList.remove('document-panel--visible');
    }
  }

  /**
   * Collect all document IDs from a data item (handles nested structures)
   */
  function collectDocumentIds(item, ...additionalArrays) {
    const ids = new Set();

    // Direct dokumente array
    if (item.dokumente && Array.isArray(item.dokumente)) {
      item.dokumente.forEach(id => ids.add(id));
    }

    // Nested zeitraeume with dokumente
    if (item.zeitraeume && Array.isArray(item.zeitraeume)) {
      item.zeitraeume.forEach(z => {
        if (z.dokumente && Array.isArray(z.dokumente)) {
          z.dokumente.forEach(id => ids.add(id));
        }
      });
    }

    // Nested rollen with dokumente
    if (item.rollen && Array.isArray(item.rollen)) {
      item.rollen.forEach(r => {
        if (r.dokumente && Array.isArray(r.dokumente)) {
          r.dokumente.forEach(id => ids.add(id));
        }
      });
    }

    // Nested begegnungen with dokumente
    if (item.begegnungen && Array.isArray(item.begegnungen)) {
      item.begegnungen.forEach(b => {
        if (b.dokumente && Array.isArray(b.dokumente)) {
          b.dokumente.forEach(id => ids.add(id));
        }
      });
    }

    // Additional arrays passed as arguments
    additionalArrays.forEach(arr => {
      if (Array.isArray(arr)) {
        arr.forEach(id => ids.add(id));
      }
    });

    return Array.from(ids);
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Visualization selector buttons (both old .viz-btn and new .viz-tab)
    document.querySelectorAll('.viz-btn, .viz-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        switchVisualization(btn.dataset.viz);
      });
    });

    // Toolbar chip toggle visual state
    document.querySelectorAll('.toolbar-chip input').forEach(input => {
      input.addEventListener('change', () => {
        const chip = input.closest('.toolbar-chip');
        if (chip) {
          chip.classList.toggle('toolbar-chip--active', input.checked);
        }
      });
    });

    // Partitur year slider
    const yearSlider = document.getElementById('partitur-year');
    if (yearSlider) {
      yearSlider.addEventListener('input', (e) => {
        focusYear = parseInt(e.target.value);
        document.getElementById('partitur-year-value').textContent = focusYear;
        updateFocusLine();
      });
    }

    // Track visibility checkboxes
    const spurenFilter = document.getElementById('filter-spuren');
    if (spurenFilter) {
      spurenFilter.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
          if (input.checked) {
            visibleTracks.add(input.value);
          } else {
            visibleTracks.delete(input.value);
          }
          renderVisualization();
        });
      });
    }

    // Listen for view switches
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.dataset.view === 'analyse') {
          setTimeout(() => renderVisualization(), 100);
        }
      });
    });

    // Window resize
    window.addEventListener('resize', debounce(() => {
      if (currentViz === 'partitur') {
        renderVisualization();
      }
    }, 250));

    // Matrix category filter
    const matrixCategoryFilter = document.getElementById('filter-matrix-kategorie');
    if (matrixCategoryFilter) {
      matrixCategoryFilter.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
          if (currentViz === 'matrix') {
            renderVisualization();
          }
        });
      });
    }

    // Matrix time period filter (Zeitfilter)
    const matrixZeitFilter = document.getElementById('filter-matrix-zeit');
    if (matrixZeitFilter) {
      matrixZeitFilter.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
          if (currentViz === 'matrix') {
            renderVisualization();
          }
        });
      });
    }

    // Matrix sort options
    const matrixSortFilter = document.getElementById('filter-matrix-sort');
    if (matrixSortFilter) {
      matrixSortFilter.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
          if (currentViz === 'matrix') {
            renderVisualization();
          }
        });
      });
    }

    // Kosmos composer filter
    const kosmosComposerFilter = document.querySelector('#controls-kosmos .filter-group__options');
    if (kosmosComposerFilter) {
      kosmosComposerFilter.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
          if (currentViz === 'kosmos') {
            renderVisualization();
          }
        });
      });
    }

    // Close document panel when clicking outside
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('document-panel');
      if (panel && panel.classList.contains('document-panel--visible')) {
        if (!panel.contains(e.target) && !e.target.closest('.partitur__lebensphase, .partitur__ort-bar, .partitur__mobility-marker, .partitur__role-bar, .matrix__cell, .kosmos__node, .karriere-fluss__node, .karriere-fluss__flow')) {
          hideDocumentPanel();
        }
      }
    });
  }

  /**
   * Switch visualization type
   */
  function switchVisualization(viz) {
    currentViz = viz;

    // Update buttons (both old .viz-btn and new .viz-tab)
    document.querySelectorAll('.viz-btn, .viz-tab').forEach(btn => {
      const isActive = btn.dataset.viz === viz;
      btn.classList.toggle('viz-btn--active', isActive);
      btn.classList.toggle('viz-tab--active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });

    // Update controls visibility (both old .viz-controls and new .toolbar-controls)
    document.querySelectorAll('.viz-controls, .toolbar-controls').forEach(ctrl => {
      ctrl.classList.add('viz-controls--hidden');
      ctrl.classList.add('toolbar-controls--hidden');
    });
    const activeControls = document.getElementById(`controls-${viz}`);
    if (activeControls) {
      activeControls.classList.remove('viz-controls--hidden');
      activeControls.classList.remove('toolbar-controls--hidden');
    }

    // Update header
    const meta = VIZ_METADATA[viz];
    const vizTitle = document.getElementById('viz-title');
    const vizDesc = document.getElementById('viz-description');
    if (vizTitle && meta) vizTitle.textContent = meta.title;
    if (vizDesc && meta) vizDesc.textContent = meta.description;

    // Update FF badges
    updateFFBadges(meta?.ff || []);

    // Render
    renderVisualization();
  }

  /**
   * Update FF badges in sidebar
   */
  function updateFFBadges(activeFF) {
    const badges = document.querySelectorAll('.ff-badge');
    badges.forEach(badge => {
      const ff = badge.textContent.trim();
      badge.classList.toggle('ff-badge--active', activeFF.includes(ff));
    });
  }

  /**
   * Main render function
   */
  function renderVisualization() {
    const container = document.getElementById('viz-container');
    if (!container) return;

    switch (currentViz) {
      case 'partitur':
        renderPartitur(container);
        break;
      case 'matrix':
        renderMatrix(container);
        break;
      case 'kosmos':
        renderKosmos(container);
        break;
      case 'sankey':
        renderSankey(container);
        break;
    }

    // Re-initialize lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Zoom state for Partitur
  let partiturZoom = null;
  let currentZoomTransform = d3.zoomIdentity;

  /**
   * OPTION C: Split-View Layout for Mobilitäts-Partitur
   *
   * - Full-width detail view at top (zoomable, pannable)
   * - Compact context/navigator bar at bottom
   * - Floating zoom controls
   * - Inspired by audio editor layouts (Audacity, etc.)
   */
  function renderPartitur(container) {
    if (!syntheticData) {
      container.innerHTML = '<div class="viz-placeholder"><p>Lade Daten...</p></div>';
      return;
    }

    // Add Split-View styles
    addSplitViewStyles();

    const width = container.clientWidth;
    const activeTracksArray = TRACKS.filter(t => visibleTracks.has(t.id));

    // Layout dimensions - optimized for split view
    const labelWidth = 90;  // Fixed width for track labels
    const detailMargin = { top: 35, right: 20, bottom: 25, left: labelWidth };
    const trackHeight = 50;
    const trackGap = 12;
    const detailHeight = detailMargin.top + detailMargin.bottom +
                         activeTracksArray.length * (trackHeight + trackGap);
    const contextHeight = 60;
    const controlsHeight = 40;
    const totalHeight = detailHeight + contextHeight + controlsHeight + 20;

    // Clear container
    container.innerHTML = '';

    // === CREATE SPLIT-VIEW CONTAINER ===
    const splitView = document.createElement('div');
    splitView.className = 'partitur-split-view';
    container.appendChild(splitView);

    // === DETAIL VIEW (TOP) ===
    const detailContainer = document.createElement('div');
    detailContainer.className = 'partitur-detail';
    splitView.appendChild(detailContainer);

    // Floating zoom controls (top-right corner)
    const zoomControls = document.createElement('div');
    zoomControls.className = 'partitur-floating-controls';
    zoomControls.innerHTML = `
      <button class="pfc-btn" id="partitur-zoom-out" title="Herauszoomen (−)">−</button>
      <span class="pfc-zoom-level" id="partitur-zoom-info">100%</span>
      <button class="pfc-btn" id="partitur-zoom-in" title="Hineinzoomen (+)">+</button>
      <button class="pfc-btn pfc-btn--reset" id="partitur-zoom-reset" title="Zurücksetzen">⟲</button>
    `;
    detailContainer.appendChild(zoomControls);

    // Time range indicator
    const timeRange = document.createElement('div');
    timeRange.className = 'partitur-time-range';
    timeRange.id = 'partitur-time-range';
    timeRange.innerHTML = '<span>1919</span> – <span>2009</span>';
    detailContainer.appendChild(timeRange);

    // Detail SVG
    const detailSvg = d3.select(detailContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', detailHeight)
      .attr('class', 'partitur-detail__svg');

    // === CONTEXT/NAVIGATOR (BOTTOM) ===
    const contextContainer = document.createElement('div');
    contextContainer.className = 'partitur-context';
    splitView.appendChild(contextContainer);

    // Context label
    const contextLabel = document.createElement('div');
    contextLabel.className = 'partitur-context__label';
    contextLabel.innerHTML = '<span class="pcl-icon">◉</span> Navigator <span class="pcl-hint">Ziehen zum Auswählen</span>';
    contextContainer.appendChild(contextLabel);

    // Context SVG
    const contextSvg = d3.select(contextContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', contextHeight)
      .attr('class', 'partitur-context__svg');

    // === SCALES ===
    const xScaleBase = d3.scaleLinear()
      .domain([CONFIG.minYear, CONFIG.maxYear])
      .range([detailMargin.left, width - detailMargin.right]);

    let xScale = xScaleBase.copy();

    // === CLIP PATH FOR DETAIL ===
    detailSvg.append('defs')
      .append('clipPath')
      .attr('id', 'detail-clip')
      .append('rect')
      .attr('x', detailMargin.left)
      .attr('y', 0)
      .attr('width', width - detailMargin.left - detailMargin.right)
      .attr('height', detailHeight);

    // === DETAIL: TRACK LABELS (fixed, outside clip) ===
    const labelsGroup = detailSvg.append('g')
      .attr('class', 'partitur-labels');

    activeTracksArray.forEach((track, i) => {
      const y = detailMargin.top + i * (trackHeight + trackGap) + trackHeight / 2;
      labelsGroup.append('text')
        .attr('class', 'partitur-label')
        .attr('x', detailMargin.left - 10)
        .attr('y', y)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('fill', '#4A4A4A')
        .text(track.label);
    });

    // === DETAIL: CONTENT GROUP (clipped) ===
    const contentGroup = detailSvg.append('g')
      .attr('class', 'partitur-content')
      .attr('clip-path', 'url(#detail-clip)');

    // === DETAIL: AXIS GROUP ===
    const axisGroup = detailSvg.append('g')
      .attr('class', 'partitur-axis');

    // === DETAIL: FOCUS LINE GROUP ===
    const focusGroup = detailSvg.append('g')
      .attr('class', 'partitur-focus');

    // === DRAW FUNCTIONS ===
    function drawDetailTracks() {
      contentGroup.selectAll('*').remove();

      // Background stripes for tracks
      activeTracksArray.forEach((track, i) => {
        const y = detailMargin.top + i * (trackHeight + trackGap);
        contentGroup.append('rect')
          .attr('class', 'partitur-track-bg')
          .attr('x', detailMargin.left)
          .attr('y', y)
          .attr('width', width - detailMargin.left - detailMargin.right)
          .attr('height', trackHeight)
          .attr('fill', i % 2 === 0 ? '#FAFAFA' : '#F5F3EF')
          .attr('rx', 2);
      });

      // Draw track content
      activeTracksArray.forEach((track, i) => {
        const y = detailMargin.top + i * (trackHeight + trackGap);
        drawTrackContent(contentGroup, track, xScale, y, trackHeight);
      });
    }

    function drawDetailAxis() {
      axisGroup.selectAll('*').remove();

      const xAxis = d3.axisTop(xScale)
        .tickFormat(d3.format('d'))
        .ticks(Math.max(5, Math.floor(width / 80)));

      axisGroup.append('g')
        .attr('transform', `translate(0, ${detailMargin.top - 5})`)
        .call(xAxis)
        .selectAll('text')
        .attr('font-size', '10px')
        .attr('fill', '#757575');

      // Grid lines
      const domain = xScale.domain();
      const step = (domain[1] - domain[0]) > 30 ? 10 : 5;
      const startYear = Math.ceil(domain[0] / step) * step;
      const years = d3.range(startYear, domain[1], step);

      axisGroup.selectAll('.grid-line')
        .data(years)
        .enter()
        .append('line')
        .attr('class', 'grid-line')
        .attr('x1', d => xScale(d))
        .attr('x2', d => xScale(d))
        .attr('y1', detailMargin.top)
        .attr('y2', detailHeight - detailMargin.bottom)
        .attr('stroke', '#E8E4DC')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,4');
    }

    function drawDetailFocus() {
      focusGroup.selectAll('*').remove();
      const x = xScale(focusYear);
      if (x >= detailMargin.left && x <= width - detailMargin.right) {
        focusGroup.append('line')
          .attr('x1', x)
          .attr('x2', x)
          .attr('y1', detailMargin.top - 5)
          .attr('y2', detailHeight - detailMargin.bottom)
          .attr('stroke', '#004A8F')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '4,2');

        focusGroup.append('text')
          .attr('x', x)
          .attr('y', detailMargin.top - 12)
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .attr('fill', '#004A8F')
          .text(focusYear);
      }
    }

    function updateTimeRangeDisplay() {
      const domain = xScale.domain();
      const rangeEl = document.getElementById('partitur-time-range');
      if (rangeEl) {
        rangeEl.innerHTML = `<span>${Math.round(domain[0])}</span> – <span>${Math.round(domain[1])}</span>`;
      }
    }

    function updateZoomInfo(domain) {
      const fullRange = CONFIG.maxYear - CONFIG.minYear;
      const currentRange = domain[1] - domain[0];
      const zoomPercent = Math.round((fullRange / currentRange) * 100);
      const infoEl = document.getElementById('partitur-zoom-info');
      if (infoEl) {
        infoEl.textContent = `${zoomPercent}%`;
      }
      updateTimeRangeDisplay();
    }

    // === CONTEXT: DRAW ===
    const contextMargin = { left: detailMargin.left, right: detailMargin.right };

    // Background
    contextSvg.append('rect')
      .attr('x', contextMargin.left)
      .attr('y', 5)
      .attr('width', width - contextMargin.left - contextMargin.right)
      .attr('height', contextHeight - 20)
      .attr('fill', '#F0EDE8')
      .attr('rx', 4);

    // Mini-timeline axis
    const contextAxis = d3.axisBottom(xScaleBase)
      .tickFormat(d => d % 20 === 0 ? d : '')
      .ticks(10);

    contextSvg.append('g')
      .attr('transform', `translate(0, ${contextHeight - 12})`)
      .call(contextAxis)
      .selectAll('text')
      .attr('font-size', '9px')
      .attr('fill', '#757575');

    // Draw compressed life phases
    const phasen = syntheticData.lebensphasen || [];
    contextSvg.selectAll('.context-phase')
      .data(phasen)
      .enter()
      .append('rect')
      .attr('class', 'context-phase')
      .attr('x', d => xScaleBase(parseInt(d.von)))
      .attr('y', 10)
      .attr('width', d => Math.max(2, xScaleBase(parseInt(d.bis)) - xScaleBase(parseInt(d.von))))
      .attr('height', 20)
      .attr('rx', 2)
      .attr('fill', '#004A8F')
      .attr('fill-opacity', 0.4);

    // Draw document density as area
    const dokumente = syntheticData.archivalien?.dokumente || [];
    const docsByYear = {};
    dokumente.forEach(doc => {
      const year = doc.datum ? parseInt(doc.datum.substring(0, 4)) : null;
      if (year && year >= CONFIG.minYear && year <= CONFIG.maxYear) {
        docsByYear[year] = (docsByYear[year] || 0) + 1;
      }
    });

    const docData = Object.entries(docsByYear).map(([year, count]) => ({ year: +year, count })).sort((a, b) => a.year - b.year);
    if (docData.length > 0) {
      const maxCount = d3.max(docData, d => d.count);
      const areaScale = d3.scaleLinear().domain([0, maxCount]).range([0, 12]);

      const area = d3.area()
        .x(d => xScaleBase(d.year))
        .y0(32)
        .y1(d => 32 - areaScale(d.count))
        .curve(d3.curveMonotoneX);

      contextSvg.append('path')
        .datum(docData)
        .attr('fill', '#6A1B9A')
        .attr('fill-opacity', 0.3)
        .attr('d', area);

      // === CLUSTER INDICATORS ===
      // Find dense clusters (years with >5 documents)
      const clusterThreshold = 5;
      const clusters = [];
      let currentCluster = null;

      docData.forEach(d => {
        if (d.count >= clusterThreshold) {
          if (!currentCluster) {
            currentCluster = { startYear: d.year, endYear: d.year, totalDocs: d.count, peakCount: d.count };
          } else if (d.year - currentCluster.endYear <= 2) {
            currentCluster.endYear = d.year;
            currentCluster.totalDocs += d.count;
            currentCluster.peakCount = Math.max(currentCluster.peakCount, d.count);
          } else {
            clusters.push(currentCluster);
            currentCluster = { startYear: d.year, endYear: d.year, totalDocs: d.count, peakCount: d.count };
          }
        } else if (currentCluster) {
          clusters.push(currentCluster);
          currentCluster = null;
        }
      });
      if (currentCluster) clusters.push(currentCluster);

      // Draw cluster markers (triangles pointing up)
      clusters.forEach(cluster => {
        const centerYear = (cluster.startYear + cluster.endYear) / 2;
        const x = xScaleBase(centerYear);
        const triangleSize = Math.min(8, 4 + cluster.peakCount / 5);

        // Triangle marker
        contextSvg.append('path')
          .attr('class', 'navigator-cluster')
          .attr('d', `M${x},${40 - triangleSize} L${x - triangleSize},${40} L${x + triangleSize},${40} Z`)
          .attr('fill', '#9A7B4F')
          .attr('fill-opacity', 0.9)
          .style('cursor', 'pointer')
          .on('mouseover', function(event) {
            d3.select(this).attr('fill', '#004A8F');
            showTooltip(event, `📊 Daten-Cluster`,
              `${cluster.startYear}–${cluster.endYear}\n${cluster.totalDocs} Archivalien\nKlicken zum Zoomen`);
          })
          .on('mouseout', function() {
            d3.select(this).attr('fill', '#9A7B4F');
            hideTooltip();
          })
          .on('click', function() {
            // Zoom to this cluster
            const padding = 5;
            const newDomain = [cluster.startYear - padding, cluster.endYear + padding];
            xScale.domain(newDomain);
            brushGroup.call(brush.move, [xScaleBase(newDomain[0]), xScaleBase(newDomain[1])]);
          });
      });
    }

    // === BRUSH ===
    const brush = d3.brushX()
      .extent([[contextMargin.left, 5], [width - contextMargin.right, contextHeight - 15]])
      .on('brush end', brushed);

    const brushGroup = contextSvg.append('g')
      .attr('class', 'navigator-brush')
      .call(brush);

    // Style brush
    brushGroup.selectAll('.selection')
      .attr('fill', '#004A8F')
      .attr('fill-opacity', 0.15)
      .attr('stroke', '#004A8F')
      .attr('stroke-width', 2)
      .attr('rx', 3);

    brushGroup.selectAll('.handle')
      .attr('fill', '#004A8F')
      .attr('rx', 2);

    // Initial brush (full range)
    brushGroup.call(brush.move, [contextMargin.left, width - contextMargin.right]);

    function brushed(event) {
      if (!event.selection) return;
      if (event.sourceEvent && event.sourceEvent.type === 'zoom') return;

      const [x0, x1] = event.selection;
      const newDomain = [xScaleBase.invert(x0), xScaleBase.invert(x1)];

      xScale.domain(newDomain);

      drawDetailTracks();
      drawDetailAxis();
      drawDetailFocus();
      updateZoomInfo(newDomain);
    }

    // === ZOOM ===
    partiturZoom = d3.zoom()
      .scaleExtent([1, 15])
      .translateExtent([[detailMargin.left, 0], [width - detailMargin.right, detailHeight]])
      .extent([[detailMargin.left, 0], [width - detailMargin.right, detailHeight]])
      .on('zoom', zoomed);

    // Zoom interaction area
    detailSvg.append('rect')
      .attr('class', 'zoom-rect')
      .attr('x', detailMargin.left)
      .attr('y', detailMargin.top)
      .attr('width', width - detailMargin.left - detailMargin.right)
      .attr('height', detailHeight - detailMargin.top - detailMargin.bottom)
      .attr('fill', 'transparent')
      .style('cursor', 'grab')
      .call(partiturZoom);

    function zoomed(event) {
      if (event.sourceEvent && event.sourceEvent.type === 'brush') return;

      currentZoomTransform = event.transform;
      const newXScale = event.transform.rescaleX(xScaleBase);
      xScale.domain(newXScale.domain());

      drawDetailTracks();
      drawDetailAxis();
      drawDetailFocus();
      updateBrushFromZoom(newXScale.domain());
      updateZoomInfo(newXScale.domain());
    }

    function updateBrushFromZoom(domain) {
      const x0 = xScaleBase(domain[0]);
      const x1 = xScaleBase(domain[1]);
      brushGroup.call(brush.move, [x0, x1]);
    }

    // Initial draw
    drawDetailTracks();
    drawDetailAxis();
    drawDetailFocus();
    updateZoomInfo(xScale.domain());

    // Add tooltip
    addTooltip(container);

    // === ZOOM BUTTON HANDLERS ===
    document.getElementById('partitur-zoom-in')?.addEventListener('click', () => {
      detailSvg.select('.zoom-rect').transition().duration(300)
        .call(partiturZoom.scaleBy, 1.5);
    });

    document.getElementById('partitur-zoom-out')?.addEventListener('click', () => {
      detailSvg.select('.zoom-rect').transition().duration(300)
        .call(partiturZoom.scaleBy, 0.67);
    });

    document.getElementById('partitur-zoom-reset')?.addEventListener('click', () => {
      detailSvg.select('.zoom-rect').transition().duration(300)
        .call(partiturZoom.transform, d3.zoomIdentity);
    });
  }

  /**
   * Draw track content (used by split-view)
   */
  function drawTrackContent(group, track, xScale, y, height) {
    const domain = xScale.domain();

    switch (track.id) {
      case 'lebensphasen':
        drawLebensphasenContent(group, xScale, y, height, domain);
        break;
      case 'orte':
        drawOrteContent(group, xScale, y, height, domain);
        break;
      case 'mobilitaet':
        drawMobilitaetContent(group, xScale, y, height, domain);
        break;
      case 'netzwerk':
        drawNetzwerkContent(group, xScale, y, height, domain);
        break;
      case 'repertoire':
        drawRepertoireContent(group, xScale, y, height, domain);
        break;
      case 'dokumente':
        drawDokumenteContent(group, xScale, y, height, domain);
        break;
    }
  }

  // === TRACK CONTENT DRAWING FUNCTIONS ===

  function drawLebensphasenContent(group, xScale, y, height, domain) {
    const phasen = (syntheticData.lebensphasen || []).filter(d => {
      const von = parseInt(d.von), bis = parseInt(d.bis);
      return bis >= domain[0] && von <= domain[1];
    });

    phasen.forEach(d => {
      const x1 = Math.max(xScale(parseInt(d.von)), xScale.range()[0]);
      const x2 = Math.min(xScale(parseInt(d.bis)), xScale.range()[1]);
      const w = Math.max(0, x2 - x1);

      group.append('rect')
        .attr('x', x1)
        .attr('y', y + 5)
        .attr('width', w)
        .attr('height', height - 10)
        .attr('rx', 3)
        .attr('fill', getLPColor(d.id))
        .attr('fill-opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => showTooltip(event, d.label, `${d.von}–${d.bis}\n${d.beschreibung}`))
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Lebensphase: ${d.label}`, collectDocumentIds(d));
        });

      if (w > 60) {
        group.append('text')
          .attr('x', (x1 + x2) / 2)
          .attr('y', y + height / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '500')
          .attr('fill', '#fff')
          .attr('pointer-events', 'none')
          .text(d.label);
      }
    });
  }

  function getLPColor(id) {
    const colors = {
      'LP1': '#FFCA28', 'LP2': '#FFA726', 'LP3': '#FF7043',
      'LP4': '#EF5350', 'LP5': '#EC407A', 'LP6': '#AB47BC', 'LP7': '#7E57C2'
    };
    return colors[id] || '#9E9E9E';
  }

  function drawOrteContent(group, xScale, y, height, domain) {
    const orte = syntheticData.orte || [];
    const wohnorte = [];

    orte.forEach(ort => {
      (ort.zeitraeume || []).forEach(zeit => {
        const von = parseInt(zeit.von), bis = parseInt(zeit.bis);
        if (bis >= domain[0] && von <= domain[1] && zeit.typ === 'wohnort') {
          wohnorte.push({ name: ort.name, von, bis, dokumente: zeit.dokumente || [] });
        }
      });
    });

    wohnorte.forEach(w => {
      const x1 = Math.max(xScale(w.von), xScale.range()[0]);
      const x2 = Math.min(xScale(w.bis), xScale.range()[1]);

      group.append('rect')
        .attr('x', x1)
        .attr('y', y + 8)
        .attr('width', Math.max(x2 - x1, 4))
        .attr('height', height - 16)
        .attr('rx', 3)
        .attr('fill', ortColors(w.name))
        .style('cursor', 'pointer')
        .on('mouseover', (event) => showTooltip(event, `🏠 ${w.name}`, `${w.von}–${w.bis}`))
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Wohnort: ${w.name}`, w.dokumente);
        });

      if (x2 - x1 > 50) {
        group.append('text')
          .attr('x', x1 + 5)
          .attr('y', y + height / 2)
          .attr('dy', '0.35em')
          .attr('font-size', '9px')
          .attr('fill', '#fff')
          .attr('pointer-events', 'none')
          .text(w.name);
      }
    });
  }

  function drawMobilitaetContent(group, xScale, y, height, domain) {
    const mobilitaet = (syntheticData.mobilitaet || []).filter(m => {
      const jahr = parseInt(m.jahr);
      return jahr >= domain[0] && jahr <= domain[1];
    });

    const colors = { erzwungen: '#D32F2F', geografisch: '#2E7D32', bildung: '#E65100', lebensstil: '#6A1B9A' };

    mobilitaet.forEach((m, i) => {
      const x = xScale(parseInt(m.jahr));
      const markerY = y + 8 + (i % 3) * 12;

      group.append('circle')
        .attr('cx', x)
        .attr('cy', markerY)
        .attr('r', 5)
        .attr('fill', colors[m.form] || '#757575')
        .style('cursor', 'pointer')
        .on('mouseover', (event) => showTooltip(event, `${m.form} (${m.jahr})`, `${m.von} → ${m.nach}\n${m.grund}`))
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Mobilität ${m.jahr}`, m.dokumente || []);
        });
    });
  }

  function drawNetzwerkContent(group, xScale, y, height, domain) {
    const netzwerk = (syntheticData.netzwerk_dichte || []).filter(n => {
      const jahr = parseInt(n.jahr);
      return jahr >= domain[0] && jahr <= domain[1];
    });

    const maxDichte = d3.max(syntheticData.netzwerk_dichte || [], d => d.anzahl_kontakte) || 1;
    const barWidth = Math.max(2, (xScale.range()[1] - xScale.range()[0]) / (domain[1] - domain[0]) * 0.7);

    netzwerk.forEach(n => {
      const x = xScale(parseInt(n.jahr));
      const barH = (n.anzahl_kontakte / maxDichte) * (height - 12);

      group.append('rect')
        .attr('x', x - barWidth / 2)
        .attr('y', y + height - 4 - barH)
        .attr('width', barWidth)
        .attr('height', barH)
        .attr('fill', '#1565C0')
        .attr('fill-opacity', 0.6)
        .attr('rx', 1)
        .on('mouseover', (event) => showTooltip(event, `Netzwerk ${n.jahr}`, `${n.anzahl_kontakte} Kontakte`))
        .on('mouseout', hideTooltip);
    });
  }

  function drawRepertoireContent(group, xScale, y, height, domain) {
    const repertoire = syntheticData.repertoire || [];
    const kompColors = {
      'Richard Wagner': '#8B0000', 'Giuseppe Verdi': '#006400', 'Richard Strauss': '#4B0082',
      'Christoph Willibald Gluck': '#B8860B', 'Georg Friedrich Händel': '#2F4F4F'
    };

    repertoire.forEach(werk => {
      (werk.rollen || []).forEach(rolle => {
        const von = parseInt(rolle.erste_auffuehrung || rolle.von || 0);
        const bis = parseInt(rolle.letzte_auffuehrung || rolle.bis || von + 5);

        if (bis >= domain[0] && von <= domain[1]) {
          const x1 = Math.max(xScale(von), xScale.range()[0]);
          const x2 = Math.min(xScale(bis), xScale.range()[1]);

          let color = '#708090';
          for (const [k, c] of Object.entries(kompColors)) {
            if (werk.komponist?.includes(k) || k.includes(werk.komponist || '')) { color = c; break; }
          }

          group.append('rect')
            .attr('x', x1)
            .attr('y', y + 6)
            .attr('width', Math.max(x2 - x1, 3))
            .attr('height', height - 12)
            .attr('rx', 2)
            .attr('fill', color)
            .attr('fill-opacity', 0.7)
            .style('cursor', 'pointer')
            .on('mouseover', (event) => showTooltip(event, rolle.name, `${werk.werk} (${werk.komponist})`))
            .on('mouseout', hideTooltip)
            .on('click', (event) => {
              event.stopPropagation();
              showDocumentPanel(`${rolle.name}`, rolle.dokumente || []);
            });
        }
      });
    });
  }

  function drawDokumenteContent(group, xScale, y, height, domain) {
    const dokumente = syntheticData.archivalien?.dokumente || [];
    const byYear = {};

    dokumente.forEach(doc => {
      const year = doc.datum ? parseInt(doc.datum.substring(0, 4)) : null;
      if (year && year >= domain[0] && year <= domain[1]) {
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(doc);
      }
    });

    const maxCount = Math.max(...Object.values(byYear).map(arr => arr.length), 1);
    const barWidth = Math.max(2, (xScale.range()[1] - xScale.range()[0]) / (domain[1] - domain[0]) * 0.5);

    Object.entries(byYear).forEach(([year, docs]) => {
      const x = xScale(parseInt(year));
      const barH = (docs.length / maxCount) * (height - 12);

      group.append('rect')
        .attr('x', x - barWidth / 2)
        .attr('y', y + height - 4 - barH)
        .attr('width', barWidth)
        .attr('height', barH)
        .attr('fill', '#6A1B9A')
        .attr('fill-opacity', 0.5)
        .attr('rx', 1)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => showTooltip(event, `${year}`, `${docs.length} Dokumente`))
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Dokumente ${year}`, docs.map(d => d.id));
        });
    });
  }

  /**
   * Add Split-View styles
   */
  function addSplitViewStyles() {
    // Premium styles are now loaded from visualization-premium.css
    // This function ensures backward compatibility and adds only essential overrides
    if (document.getElementById('split-view-styles')) return;

    const style = document.createElement('style');
    style.id = 'split-view-styles';
    style.textContent = `
      /* Minimal overrides - main styles in visualization-premium.css */
      .zoom-rect:active {
        cursor: grabbing;
      }
      .partitur-label {
        user-select: none;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Add Fullwidth styles for Matrix and Kosmos (Option A)
   */
  function addFullwidthStyles() {
    // Premium styles are now loaded from visualization-premium.css
    // This function is kept for backward compatibility
    if (document.getElementById('fullwidth-styles')) return;

    const style = document.createElement('style');
    style.id = 'fullwidth-styles';
    style.textContent = `
      /* Minimal overrides - main styles in visualization-premium.css */
    `;
    document.head.appendChild(style);
  }

  /**
   * Draw tracks inside a group (for zoom/clip)
   */
  function drawTrackInGroup(group, track, xScale, y) {
    // Track label (outside clip would be better, but simplified here)
    group.append('text')
      .attr('class', 'partitur__track-label')
      .attr('x', 10)
      .attr('y', y + CONFIG.trackHeight / 2)
      .attr('dy', '0.35em')
      .text(track.label);

    // Track separator
    group.append('line')
      .attr('class', 'partitur__track-separator')
      .attr('x1', CONFIG.margin.left)
      .attr('x2', xScale.range()[1])
      .attr('y1', y + CONFIG.trackHeight + CONFIG.trackPadding / 2)
      .attr('y2', y + CONFIG.trackHeight + CONFIG.trackPadding / 2);

    // Render track content
    switch (track.id) {
      case 'lebensphasen':
        drawLebensphasenTrackZoom(group, xScale, y);
        break;
      case 'orte':
        drawOrteTrackZoom(group, xScale, y);
        break;
      case 'mobilitaet':
        drawMobilitaetTrackZoom(group, xScale, y);
        break;
      case 'netzwerk':
        drawNetzwerkTrackZoom(group, xScale, y);
        break;
      case 'repertoire':
        drawRepertoireTrackZoom(group, xScale, y);
        break;
      case 'dokumente':
        drawDokumenteTrackZoom(group, xScale, y);
        break;
    }
  }

  /**
   * Zoomable time axis
   */
  function drawTimeAxisZoomable(group, xScale, height, width) {
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.format('d'))
      .ticks(Math.max(5, Math.floor(width / 100)));

    group.append('g')
      .attr('class', 'partitur__axis')
      .attr('transform', `translate(0, ${height - CONFIG.margin.bottom})`)
      .call(xAxis);

    // Grid lines for visible domain
    const domain = xScale.domain();
    const startDecade = Math.ceil(domain[0] / 10) * 10;
    const endDecade = Math.floor(domain[1] / 10) * 10;
    const decades = d3.range(startDecade, endDecade + 1, 10);

    group.selectAll('.partitur__grid-line')
      .data(decades)
      .enter()
      .append('line')
      .attr('class', 'partitur__grid-line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', CONFIG.margin.top)
      .attr('y2', height - CONFIG.margin.bottom)
      .attr('stroke', '#E8E4DC')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,6')
      .attr('stroke-opacity', 0.7);

    // Decade labels
    group.selectAll('.partitur__decade-label')
      .data(decades)
      .enter()
      .append('text')
      .attr('class', 'partitur__decade-label')
      .attr('x', d => xScale(d))
      .attr('y', CONFIG.margin.top - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#A0A0A0')
      .text(d => d + 'er');
  }

  /**
   * Add zoom control styles
   */
  function addZoomControlStyles() {
    if (document.getElementById('partitur-zoom-styles')) return;

    const style = document.createElement('style');
    style.id = 'partitur-zoom-styles';
    style.textContent = `
      .partitur-zoom-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        padding: 8px 12px;
        background: #FAF8F5;
        border-radius: 6px;
        border: 1px solid #E8E4DC;
      }
      .partitur-zoom-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: #fff;
        border: 1px solid #D4CFC5;
        border-radius: 4px;
        cursor: pointer;
        color: #4A4A4A;
        transition: all 0.15s ease;
      }
      .partitur-zoom-btn:hover {
        background: #004A8F;
        border-color: #004A8F;
        color: #fff;
      }
      .partitur-zoom-info {
        font-size: 12px;
        font-weight: 600;
        color: #004A8F;
        padding: 4px 8px;
        background: #E3EDF7;
        border-radius: 4px;
        min-width: 45px;
        text-align: center;
      }
      .partitur__zoom-rect:active {
        cursor: grabbing;
      }
      .partitur__brush .handle {
        fill: #004A8F;
      }
      .partitur__context text {
        user-select: none;
      }
      .partitur-zoom-hint {
        font-size: 11px;
        color: #757575;
        margin-left: 12px;
        padding-left: 12px;
        border-left: 1px solid #D4CFC5;
      }
    `;
    document.head.appendChild(style);
  }

  // === ZOOMABLE TRACK DRAWING FUNCTIONS ===

  /**
   * Draw Lebensphasen track (zoomable version)
   */
  function drawLebensphasenTrackZoom(group, xScale, y) {
    const phasen = syntheticData.lebensphasen || [];
    const domain = xScale.domain();

    // Filter to visible range
    const visiblePhasen = phasen.filter(d => {
      const von = parseInt(d.von);
      const bis = parseInt(d.bis);
      return bis >= domain[0] && von <= domain[1];
    });

    group.selectAll('.partitur__lebensphase')
      .data(visiblePhasen)
      .enter()
      .append('rect')
      .attr('class', 'partitur__lebensphase')
      .attr('x', d => Math.max(xScale(parseInt(d.von)), xScale.range()[0]))
      .attr('y', y + 5)
      .attr('width', d => {
        const x1 = Math.max(xScale(parseInt(d.von)), xScale.range()[0]);
        const x2 = Math.min(xScale(parseInt(d.bis)), xScale.range()[1]);
        return Math.max(0, x2 - x1);
      })
      .attr('height', CONFIG.trackHeight - 10)
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const docCount = (d.dokumente || []).length;
        showTooltip(event, d.label, `${d.von}–${d.bis}: ${d.beschreibung}\n📄 ${docCount} Archivalien`);
      })
      .on('mouseout', hideTooltip)
      .on('click', (event, d) => {
        event.stopPropagation();
        const docIds = collectDocumentIds(d);
        showDocumentPanel(`Lebensphase: ${d.label} (${d.von}–${d.bis})`, docIds);
      });

    // Labels
    group.selectAll('.partitur__lebensphase-label')
      .data(visiblePhasen)
      .enter()
      .append('text')
      .attr('class', 'partitur__lebensphase-label')
      .attr('x', d => {
        const x1 = Math.max(xScale(parseInt(d.von)), xScale.range()[0]);
        const x2 = Math.min(xScale(parseInt(d.bis)), xScale.range()[1]);
        return (x1 + x2) / 2;
      })
      .attr('y', y + CONFIG.trackHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .text(d => {
        const x1 = Math.max(xScale(parseInt(d.von)), xScale.range()[0]);
        const x2 = Math.min(xScale(parseInt(d.bis)), xScale.range()[1]);
        const width = x2 - x1;
        return width > 80 ? d.label : '';
      });
  }

  /**
   * Draw Orte track (zoomable version)
   */
  function drawOrteTrackZoom(group, xScale, y) {
    const orte = syntheticData.orte || [];
    const domain = xScale.domain();

    const wohnorte = [];
    const auffuehrungsorte = [];

    orte.forEach(ort => {
      (ort.zeitraeume || []).forEach(zeit => {
        const von = parseInt(zeit.von);
        const bis = parseInt(zeit.bis);
        if (bis >= domain[0] && von <= domain[1]) {
          const item = {
            name: ort.name,
            von, bis,
            typ: zeit.typ,
            dokumente: zeit.dokumente || []
          };
          if (zeit.typ === 'wohnort') {
            wohnorte.push(item);
          } else if (zeit.typ === 'auffuehrungsort') {
            auffuehrungsorte.push(item);
          }
        }
      });
    });

    const wohnortY = y + 5;
    const wohnortHeight = 16;

    wohnorte.forEach(w => {
      const x1 = Math.max(xScale(w.von), xScale.range()[0]);
      const x2 = Math.min(xScale(w.bis), xScale.range()[1]);

      group.append('rect')
        .attr('class', 'partitur__ort-bar partitur__ort-bar--wohnort')
        .attr('x', x1)
        .attr('y', wohnortY)
        .attr('width', Math.max(x2 - x1, 4))
        .attr('height', wohnortHeight)
        .attr('rx', 3)
        .attr('fill', ortColors(w.name))
        .attr('fill-opacity', 0.9)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          showTooltip(event, `🏠 ${w.name}`, `Wohnort ${w.von}–${w.bis}\n📄 ${(w.dokumente || []).length} Archivalien`);
        })
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Wohnort: ${w.name} (${w.von}–${w.bis})`, w.dokumente || []);
        });

      const width = x2 - x1;
      if (width > 40) {
        group.append('text')
          .attr('x', x1 + 4)
          .attr('y', wohnortY + wohnortHeight / 2)
          .attr('dy', '0.35em')
          .attr('font-size', '9px')
          .attr('font-weight', '500')
          .attr('fill', '#fff')
          .text(w.name);
      }
    });

    // Aufführungsorte as smaller dots/bars
    const auffuehrungsortY = y + 28;
    auffuehrungsorte.forEach(a => {
      const x = xScale((a.von + a.bis) / 2);
      if (x >= xScale.range()[0] && x <= xScale.range()[1]) {
        group.append('circle')
          .attr('class', 'partitur__ort-dot')
          .attr('cx', x)
          .attr('cy', auffuehrungsortY + 8)
          .attr('r', 4)
          .attr('fill', ortColors(a.name))
          .attr('fill-opacity', 0.7)
          .style('cursor', 'pointer')
          .on('mouseover', (event) => {
            showTooltip(event, `🎭 ${a.name}`, `Aufführungsort ${a.von}–${a.bis}`);
          })
          .on('mouseout', hideTooltip);
      }
    });
  }

  /**
   * Draw Mobilität track (zoomable version)
   */
  function drawMobilitaetTrackZoom(group, xScale, y) {
    const mobilitaet = syntheticData.mobilitaet || [];
    const domain = xScale.domain();

    const mobilitaetColors = {
      erzwungen: '#D32F2F',
      geografisch: '#2E7D32',
      bildung: '#E65100',
      lebensstil: '#6A1B9A'
    };

    const visibleMob = mobilitaet.filter(m => {
      const jahr = parseInt(m.jahr);
      return jahr >= domain[0] && jahr <= domain[1];
    });

    visibleMob.forEach((m, i) => {
      const x = xScale(parseInt(m.jahr));
      const markerY = y + 10 + (i % 3) * 14;

      group.append('circle')
        .attr('class', 'partitur__mobility-marker')
        .attr('cx', x)
        .attr('cy', markerY)
        .attr('r', 6)
        .attr('fill', mobilitaetColors[m.form] || '#757575')
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          showTooltip(event, `${m.form.charAt(0).toUpperCase() + m.form.slice(1)} (${m.jahr})`,
            `${m.von} → ${m.nach}\n${m.grund}\n📄 ${(m.dokumente || []).length} Archivalien`);
        })
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Mobilität ${m.jahr}: ${m.von} → ${m.nach}`, m.dokumente || []);
        });

      // Direction arrow
      group.append('text')
        .attr('x', x)
        .attr('y', markerY)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .attr('fill', '#fff')
        .attr('pointer-events', 'none')
        .text('→');
    });
  }

  /**
   * Draw Netzwerk track (zoomable version)
   */
  function drawNetzwerkTrackZoom(group, xScale, y) {
    const netzwerk = syntheticData.netzwerk_dichte || [];
    const domain = xScale.domain();

    const visibleNet = netzwerk.filter(n => {
      const jahr = parseInt(n.jahr);
      return jahr >= domain[0] && jahr <= domain[1];
    });

    const maxDichte = d3.max(netzwerk, d => d.anzahl_kontakte) || 1;
    const barWidth = Math.max(2, (xScale.range()[1] - xScale.range()[0]) / (domain[1] - domain[0]) * 0.8);

    visibleNet.forEach(n => {
      const x = xScale(parseInt(n.jahr));
      const barHeight = (n.anzahl_kontakte / maxDichte) * (CONFIG.trackHeight - 15);

      group.append('rect')
        .attr('x', x - barWidth / 2)
        .attr('y', y + CONFIG.trackHeight - 5 - barHeight)
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('fill', '#1565C0')
        .attr('fill-opacity', 0.6)
        .attr('rx', 1)
        .on('mouseover', (event) => {
          showTooltip(event, `Netzwerk ${n.jahr}`, `${n.anzahl_kontakte} Kontakte`);
        })
        .on('mouseout', hideTooltip);
    });
  }

  /**
   * Draw Repertoire track (zoomable version)
   */
  function drawRepertoireTrackZoom(group, xScale, y) {
    const repertoire = syntheticData.repertoire || [];
    const domain = xScale.domain();

    const komponistColors = {
      'Richard Wagner': '#8B0000',
      'Giuseppe Verdi': '#006400',
      'Richard Strauss': '#4B0082',
      'Christoph Willibald Gluck': '#B8860B',
      'Georg Friedrich Händel': '#2F4F4F'
    };

    repertoire.forEach(werk => {
      const rollen = werk.rollen || [];
      rollen.forEach(rolle => {
        const von = parseInt(rolle.erste_auffuehrung || rolle.von || 0);
        const bis = parseInt(rolle.letzte_auffuehrung || rolle.bis || von + 5);

        if (bis >= domain[0] && von <= domain[1]) {
          const x1 = Math.max(xScale(von), xScale.range()[0]);
          const x2 = Math.min(xScale(bis), xScale.range()[1]);
          const width = Math.max(x2 - x1, 3);

          let color = '#708090';
          for (const [komponist, c] of Object.entries(komponistColors)) {
            if (werk.komponist?.includes(komponist) || komponist.includes(werk.komponist || '')) {
              color = c;
              break;
            }
          }

          group.append('rect')
            .attr('class', 'partitur__role-bar')
            .attr('x', x1)
            .attr('y', y + 8)
            .attr('width', width)
            .attr('height', CONFIG.trackHeight - 20)
            .attr('rx', 3)
            .attr('fill', color)
            .attr('fill-opacity', 0.7)
            .style('cursor', 'pointer')
            .on('mouseover', (event) => {
              showTooltip(event, rolle.name,
                `${werk.werk} (${werk.komponist})\n${rolle.auffuehrungen || '?'} Aufführungen\n📄 ${(rolle.dokumente || []).length} Archivalien`);
            })
            .on('mouseout', hideTooltip)
            .on('click', (event) => {
              event.stopPropagation();
              showDocumentPanel(`${rolle.name} in "${werk.werk}"`, rolle.dokumente || []);
            });
        }
      });
    });
  }

  /**
   * Draw Dokumente track (zoomable version)
   */
  function drawDokumenteTrackZoom(group, xScale, y) {
    const dokumente = syntheticData.archivalien?.dokumente || [];
    const domain = xScale.domain();

    // Group by year
    const byYear = {};
    dokumente.forEach(doc => {
      const year = doc.datum ? parseInt(doc.datum.substring(0, 4)) : null;
      if (year && year >= domain[0] && year <= domain[1]) {
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(doc);
      }
    });

    const maxCount = Math.max(...Object.values(byYear).map(arr => arr.length), 1);
    const barWidth = Math.max(2, (xScale.range()[1] - xScale.range()[0]) / (domain[1] - domain[0]) * 0.6);

    Object.entries(byYear).forEach(([year, docs]) => {
      const x = xScale(parseInt(year));
      const barHeight = (docs.length / maxCount) * (CONFIG.trackHeight - 15);

      group.append('rect')
        .attr('x', x - barWidth / 2)
        .attr('y', y + CONFIG.trackHeight - 5 - barHeight)
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('fill', '#6A1B9A')
        .attr('fill-opacity', 0.5)
        .attr('rx', 1)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          showTooltip(event, `Dokumente ${year}`, `${docs.length} Archivalien\nKlick zum Anzeigen`);
        })
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Dokumente aus ${year}`, docs.map(d => d.id));
        });
    });
  }

  /**
   * Draw Partitur legend
   */
  function drawPartiturLegend(svg, width, height) {
    const legend = svg.append('g')
      .attr('class', 'partitur__legend')
      .attr('transform', `translate(${width - 200}, 10)`);

    // Repertoire colors
    const repertoireColors = [
      { label: 'Wagner', color: '#8B0000' },
      { label: 'Verdi', color: '#006400' },
      { label: 'Strauss', color: '#4B0082' },
      { label: 'Gluck/Händel', color: '#B8860B' }
    ];

    legend.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .attr('fill', '#757575')
      .text('REPERTOIRE');

    repertoireColors.forEach((item, i) => {
      legend.append('rect')
        .attr('x', 0)
        .attr('y', 10 + i * 14)
        .attr('width', 10)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', item.color)
        .attr('fill-opacity', 0.7);

      legend.append('text')
        .attr('x', 15)
        .attr('y', 18 + i * 14)
        .attr('font-size', '9px')
        .attr('fill', '#4A4A4A')
        .text(item.label);
    });

    // Mobility colors
    const mobilityColors = [
      { label: 'Erzwungen', color: '#D32F2F' },
      { label: 'Geografisch', color: '#2E7D32' },
      { label: 'Lebensstil', color: '#6A1B9A' }
    ];

    legend.append('text')
      .attr('x', 80)
      .attr('y', 0)
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .attr('fill', '#757575')
      .text('MOBILITÄT');

    mobilityColors.forEach((item, i) => {
      legend.append('circle')
        .attr('cx', 85)
        .attr('cy', 15 + i * 14)
        .attr('r', 5)
        .attr('fill', item.color);

      legend.append('text')
        .attr('x', 95)
        .attr('y', 18 + i * 14)
        .attr('font-size', '9px')
        .attr('fill', '#4A4A4A')
        .text(item.label);
    });
  }

  /**
   * Draw time axis
   */
  function drawTimeAxis(svg, xScale, height) {
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.format('d'))
      .ticks(10);

    svg.append('g')
      .attr('class', 'partitur__axis')
      .attr('transform', `translate(0, ${height - CONFIG.margin.bottom})`)
      .call(xAxis);

    // Add decade grid lines - softer, more subtle
    const decades = d3.range(1920, 2010, 10);
    svg.selectAll('.partitur__grid-line')
      .data(decades)
      .enter()
      .append('line')
      .attr('class', 'partitur__grid-line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', CONFIG.margin.top)
      .attr('y2', height - CONFIG.margin.bottom)
      .attr('stroke', '#E8E4DC')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,6')
      .attr('stroke-opacity', 0.7);

    // Add subtle decade labels at top
    svg.selectAll('.partitur__decade-label')
      .data(decades)
      .enter()
      .append('text')
      .attr('class', 'partitur__decade-label')
      .attr('x', d => xScale(d))
      .attr('y', CONFIG.margin.top - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#A0A0A0')
      .text(d => d + 'er');
  }

  /**
   * Draw a single track
   */
  function drawTrack(svg, track, xScale, y) {
    // Track label
    svg.append('text')
      .attr('class', 'partitur__track-label')
      .attr('x', 10)
      .attr('y', y + CONFIG.trackHeight / 2)
      .attr('dy', '0.35em')
      .text(track.label);

    // Track separator
    svg.append('line')
      .attr('class', 'partitur__track-separator')
      .attr('x1', CONFIG.margin.left)
      .attr('x2', xScale(CONFIG.maxYear))
      .attr('y1', y + CONFIG.trackHeight + CONFIG.trackPadding / 2)
      .attr('y2', y + CONFIG.trackHeight + CONFIG.trackPadding / 2);

    // Render track content
    switch (track.id) {
      case 'lebensphasen':
        drawLebensphasenTrack(svg, xScale, y);
        break;
      case 'orte':
        drawOrteTrack(svg, xScale, y);
        break;
      case 'mobilitaet':
        drawMobilitaetTrack(svg, xScale, y);
        break;
      case 'netzwerk':
        drawNetzwerkTrack(svg, xScale, y);
        break;
      case 'repertoire':
        drawRepertoireTrack(svg, xScale, y);
        break;
      case 'dokumente':
        drawDokumenteTrack(svg, xScale, y);
        break;
    }
  }

  /**
   * Draw Lebensphasen track
   */
  function drawLebensphasenTrack(svg, xScale, y) {
    const phasen = syntheticData.lebensphasen || [];

    svg.selectAll('.partitur__lebensphase')
      .data(phasen)
      .enter()
      .append('rect')
      .attr('class', 'partitur__lebensphase')
      .attr('x', d => xScale(parseInt(d.von)))
      .attr('y', y + 5)
      .attr('width', d => xScale(parseInt(d.bis)) - xScale(parseInt(d.von)))
      .attr('height', CONFIG.trackHeight - 10)
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const docCount = (d.dokumente || []).length;
        showTooltip(event, d.label, `${d.von}–${d.bis}: ${d.beschreibung}\n📄 ${docCount} Archivalien (Klick zum Anzeigen)`);
      })
      .on('mouseout', hideTooltip)
      .on('click', (event, d) => {
        event.stopPropagation();
        const docIds = collectDocumentIds(d);
        showDocumentPanel(`Lebensphase: ${d.label} (${d.von}–${d.bis})`, docIds);
      });

    // Labels
    svg.selectAll('.partitur__lebensphase-label')
      .data(phasen)
      .enter()
      .append('text')
      .attr('class', 'partitur__lebensphase-label')
      .attr('x', d => (xScale(parseInt(d.von)) + xScale(parseInt(d.bis))) / 2)
      .attr('y', y + CONFIG.trackHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .text(d => {
        const width = xScale(parseInt(d.bis)) - xScale(parseInt(d.von));
        return width > 80 ? d.label : '';
      });
  }

  /**
   * Draw Orte track - Swimlane layout with dedicated rows per location
   */
  function drawOrteTrack(svg, xScale, y) {
    const orte = syntheticData.orte || [];

    // Group locations: first wohnorte, then aufführungsorte
    const wohnorte = [];
    const auffuehrungsorte = [];

    orte.forEach(ort => {
      (ort.zeitraeume || []).forEach(zeit => {
        const item = {
          name: ort.name,
          von: parseInt(zeit.von),
          bis: parseInt(zeit.bis),
          typ: zeit.typ,
          dokumente: zeit.dokumente || []
        };
        if (zeit.typ === 'wohnort') {
          wohnorte.push(item);
        } else if (zeit.typ === 'auffuehrungsort') {
          auffuehrungsorte.push(item);
        }
      });
    });

    // Sort by start year
    wohnorte.sort((a, b) => a.von - b.von);
    auffuehrungsorte.sort((a, b) => a.von - b.von);

    const trackHeight = CONFIG.trackHeight;
    const wohnortHeight = 16;
    const auffuehrungsortHeight = 8;
    const wohnortY = y + 5;
    const auffuehrungsortBaseY = y + 28;

    // Draw wohnorte as main lane (larger bars)
    wohnorte.forEach(w => {
      svg.append('rect')
        .attr('class', 'partitur__ort-bar partitur__ort-bar--wohnort')
        .attr('x', xScale(w.von))
        .attr('y', wohnortY)
        .attr('width', Math.max(xScale(w.bis) - xScale(w.von), 4))
        .attr('height', wohnortHeight)
        .attr('rx', 3)
        .attr('fill', ortColors(w.name))
        .attr('fill-opacity', 0.9)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          const docCount = (w.dokumente || []).length;
          showTooltip(event, `🏠 ${w.name}`, `Wohnort ${w.von}–${w.bis}\n📄 ${docCount} Archivalien`);
        })
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Wohnort: ${w.name} (${w.von}–${w.bis})`, w.dokumente || []);
        });

      // Label for wohnort
      const width = xScale(w.bis) - xScale(w.von);
      if (width > 40) {
        svg.append('text')
          .attr('x', xScale(w.von) + 4)
          .attr('y', wohnortY + wohnortHeight / 2)
          .attr('dy', '0.35em')
          .attr('font-size', '9px')
          .attr('font-weight', '500')
          .attr('fill', '#fff')
          .text(w.name);
      }
    });

    // Draw aufführungsorte as secondary lanes (smaller bars, stacked if needed)
    const usedSlots = []; // Track occupied time ranges per slot

    auffuehrungsorte.forEach(a => {
      // Find first available slot
      let slotIndex = 0;
      while (slotIndex < 4) {
        const slot = usedSlots[slotIndex] || [];
        const conflict = slot.some(range => !(a.bis <= range.von || a.von >= range.bis));
        if (!conflict) {
          usedSlots[slotIndex] = usedSlots[slotIndex] || [];
          usedSlots[slotIndex].push({ von: a.von, bis: a.bis });
          break;
        }
        slotIndex++;
      }

      const slotY = auffuehrungsortBaseY + slotIndex * (auffuehrungsortHeight + 2);

      svg.append('rect')
        .attr('class', 'partitur__ort-bar partitur__ort-bar--auffuehrung')
        .attr('x', xScale(a.von))
        .attr('y', slotY)
        .attr('width', Math.max(xScale(a.bis) - xScale(a.von), 4))
        .attr('height', auffuehrungsortHeight)
        .attr('rx', 2)
        .attr('fill', ortColors(a.name))
        .attr('fill-opacity', 0.5)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          const docCount = (a.dokumente || []).length;
          showTooltip(event, `🎭 ${a.name}`, `Aufführungsort ${a.von}–${a.bis}\n📄 ${docCount} Archivalien`);
        })
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Aufführungsort: ${a.name} (${a.von}–${a.bis})`, a.dokumente || []);
        });
    });

    // Add legend labels
    svg.append('text')
      .attr('x', CONFIG.margin.left - 5)
      .attr('y', wohnortY + wohnortHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', '8px')
      .attr('fill', '#757575')
      .text('Wohnort');

    svg.append('text')
      .attr('x', CONFIG.margin.left - 5)
      .attr('y', auffuehrungsortBaseY + 8)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', '8px')
      .attr('fill', '#757575')
      .text('Bühne');
  }

  /**
   * Draw Mobilität track
   */
  function drawMobilitaetTrack(svg, xScale, y) {
    const mobilitaet = syntheticData.mobilitaet || [];
    const orteById = Object.fromEntries((syntheticData.orte || []).map(o => [o.id, o]));

    mobilitaet.forEach(m => {
      const x = xScale(parseInt(m.jahr));
      const vonOrt = orteById[m.von_ort];
      const nachOrt = orteById[m.nach_ort];

      // Draw marker
      svg.append('circle')
        .attr('class', `partitur__mobility-marker mobility--${m.form}`)
        .attr('cx', x)
        .attr('cy', y + CONFIG.trackHeight / 2)
        .attr('r', 8)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          const docCount = (m.dokumente || []).length;
          showTooltip(event,
            `${vonOrt?.name || '?'} → ${nachOrt?.name || '?'}`,
            `${m.jahr}: ${m.beschreibung} (${m.form})\n📄 ${docCount} Archivalien`
          );
        })
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Mobilität: ${vonOrt?.name || '?'} → ${nachOrt?.name || '?'} (${m.jahr})`, m.dokumente || []);
        });

      // Draw form label
      svg.append('text')
        .attr('class', 'partitur__mobility-label')
        .attr('x', x)
        .attr('y', y + CONFIG.trackHeight - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .attr('fill', '#757575')
        .text(m.form.charAt(0).toUpperCase());
    });
  }

  /**
   * Draw Netzwerk track
   */
  function drawNetzwerkTrack(svg, xScale, y) {
    const personen = syntheticData.personen || [];
    const zeitraeume = ['1945-1949', '1950-1954', '1955-1959', '1960-1964', '1965-1969', '1970-1974'];

    // Calculate network density per period
    const density = zeitraeume.map(zeit => {
      let total = 0;
      personen.forEach(p => {
        const begegnung = (p.begegnungen || []).find(b => b.zeitraum === zeit);
        if (begegnung) total += begegnung.intensitaet;
      });
      return { zeitraum: zeit, density: total };
    });

    const maxDensity = d3.max(density, d => d.density) || 1;
    const heightScale = d3.scaleLinear()
      .domain([0, maxDensity])
      .range([0, CONFIG.trackHeight - 15]);

    density.forEach(d => {
      const [von, bis] = d.zeitraum.split('-').map(Number);
      const barWidth = xScale(bis) - xScale(von) - 2;
      const barHeight = heightScale(d.density);

      svg.append('rect')
        .attr('class', 'partitur__network-bar')
        .attr('x', xScale(von) + 1)
        .attr('y', y + CONFIG.trackHeight - barHeight - 5)
        .attr('width', barWidth)
        .attr('height', barHeight)
        .attr('rx', 2)
        .on('mouseover', (event) => showTooltip(event,
          `Netzwerk ${d.zeitraum}`,
          `Intensität: ${d.density} (Summe aller Begegnungen)`
        ))
        .on('mouseout', hideTooltip);
    });
  }

  /**
   * Draw Repertoire track - with collision detection and composer colors
   */
  function drawRepertoireTrack(svg, xScale, y) {
    const werke = syntheticData.werke || [];
    const barHeight = 10;

    // Composer colors
    const komponistColors = {
      'Richard Wagner': '#8B0000',
      'Giuseppe Verdi': '#006400',
      'Richard Strauss': '#4B0082',
      'Christoph Willibald Gluck': '#B8860B',
      'Georg Friedrich Händel': '#2F4F4F',
      'diverse': '#708090'
    };

    // Collect all roles with their data
    const allRoles = [];
    werke.forEach(werk => {
      (werk.rollen || []).forEach(rolle => {
        const [von, bis] = (rolle.zeitraum || '1950-1970').split('-').map(Number);
        allRoles.push({
          name: rolle.name,
          werk: werk.titel,
          komponist: werk.komponist,
          von,
          bis,
          anzahl: rolle.anzahl_dokumente || 1,
          color: komponistColors[werk.komponist] || '#757575',
          dokumente: rolle.dokumente || []
        });
      });
    });

    // Sort by document count (most important first)
    allRoles.sort((a, b) => b.anzahl - a.anzahl);

    // Collision detection for slot assignment
    const usedSlots = [];
    const maxSlots = 5;

    allRoles.forEach(rolle => {
      // Find first available slot
      let slotIndex = 0;
      while (slotIndex < maxSlots) {
        const slot = usedSlots[slotIndex] || [];
        const conflict = slot.some(range => !(rolle.bis <= range.von || rolle.von >= range.bis));
        if (!conflict) {
          usedSlots[slotIndex] = usedSlots[slotIndex] || [];
          usedSlots[slotIndex].push({ von: rolle.von, bis: rolle.bis });
          break;
        }
        slotIndex++;
      }

      const yPos = y + 5 + slotIndex * (barHeight + 2);

      svg.append('rect')
        .attr('class', 'partitur__role-bar')
        .attr('x', xScale(rolle.von))
        .attr('y', yPos)
        .attr('width', Math.max(xScale(rolle.bis) - xScale(rolle.von), 4))
        .attr('height', barHeight)
        .attr('rx', 2)
        .attr('fill', rolle.color)
        .attr('fill-opacity', 0.7)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          const docCount = rolle.dokumente.length;
          showTooltip(event,
            rolle.name,
            `${rolle.komponist}: ${rolle.werk} (${rolle.von}–${rolle.bis})\n📄 ${docCount} Archivalien`
          );
        })
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Rolle: ${rolle.name} (${rolle.komponist})`, rolle.dokumente);
        });

      // Label only for wider bars and top slots
      const width = xScale(rolle.bis) - xScale(rolle.von);
      if (width > 60 && slotIndex < 3) {
        svg.append('text')
          .attr('class', 'partitur__role-label')
          .attr('x', xScale(rolle.von) + 3)
          .attr('y', yPos + barHeight / 2)
          .attr('dy', '0.35em')
          .attr('font-size', '8px')
          .attr('fill', '#fff')
          .text(rolle.name);
      }
    });
  }

  /**
   * Draw Dokumente track
   */
  function drawDokumenteTrack(svg, xScale, y) {
    const docs = syntheticData.dokument_aggregation?.nach_jahr || [];
    const maxAnzahl = d3.max(docs, d => d.anzahl) || 1;

    const radiusScale = d3.scaleSqrt()
      .domain([0, maxAnzahl])
      .range([1, 8]);

    docs.forEach(d => {
      const jahr = parseInt(d.jahr);
      const radius = radiusScale(d.anzahl);

      svg.append('circle')
        .attr('class', 'partitur__doc-marker')
        .attr('cx', xScale(jahr))
        .attr('cy', y + CONFIG.trackHeight / 2)
        .attr('r', radius)
        .on('mouseover', (event) => showTooltip(event,
          `${d.anzahl} Dokumente`,
          `Jahr: ${jahr}`
        ))
        .on('mouseout', hideTooltip);
    });
  }

  /**
   * Draw focus line
   */
  function drawFocusLine(svg, xScale, height) {
    const x = xScale(focusYear);

    svg.append('line')
      .attr('class', 'partitur__focus-line')
      .attr('id', 'focus-line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', CONFIG.margin.top - 10)
      .attr('y2', height - CONFIG.margin.bottom);

    svg.append('text')
      .attr('class', 'partitur__focus-year')
      .attr('id', 'focus-year-label')
      .attr('x', x)
      .attr('y', CONFIG.margin.top - 20)
      .attr('text-anchor', 'middle')
      .text(focusYear);
  }

  /**
   * Update focus line position
   */
  function updateFocusLine() {
    const container = document.getElementById('viz-container');
    if (!container) return;

    const svg = d3.select(container).select('svg');
    if (svg.empty()) return;

    const width = container.clientWidth;
    const xScale = d3.scaleLinear()
      .domain([CONFIG.minYear, CONFIG.maxYear])
      .range([CONFIG.margin.left, width - CONFIG.margin.right]);

    const x = xScale(focusYear);

    svg.select('#focus-line')
      .attr('x1', x)
      .attr('x2', x);

    svg.select('#focus-year-label')
      .attr('x', x)
      .text(focusYear);
  }

  /**
   * Add tooltip element
   */
  function addTooltip(container) {
    const tooltip = document.createElement('div');
    tooltip.className = 'partitur__tooltip';
    tooltip.id = 'partitur-tooltip';
    tooltip.innerHTML = `
      <div class="partitur__tooltip-title"></div>
      <div class="partitur__tooltip-meta"></div>
    `;
    container.style.position = 'relative';
    container.appendChild(tooltip);
  }

  /**
   * Show tooltip
   */
  function showTooltip(event, title, meta) {
    const tooltip = document.getElementById('partitur-tooltip');
    if (!tooltip) return;

    tooltip.querySelector('.partitur__tooltip-title').textContent = title;
    tooltip.querySelector('.partitur__tooltip-meta').textContent = meta;

    const container = document.getElementById('viz-container');
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    tooltip.style.left = `${x + 15}px`;
    tooltip.style.top = `${y - 10}px`;
    tooltip.classList.add('partitur__tooltip--visible');
  }

  /**
   * Hide tooltip
   */
  function hideTooltip() {
    const tooltip = document.getElementById('partitur-tooltip');
    if (tooltip) {
      tooltip.classList.remove('partitur__tooltip--visible');
    }
  }

  /* ==========================================================================
     BEGEGNUNGS-MATRIX (FF1, FF3)
     ========================================================================== */

  /**
   * Get active matrix category filters
   */
  function getActiveMatrixCategories() {
    const checkboxes = document.querySelectorAll('#filter-matrix-kategorie input:checked');
    if (checkboxes.length === 0) {
      return ['dirigent', 'regisseur', 'vermittler', 'kollege']; // default all
    }
    return Array.from(checkboxes).map(cb => cb.value);
  }

  /**
   * Get active matrix time period filters
   */
  function getActiveMatrixZeitraeume() {
    const checkboxes = document.querySelectorAll('#filter-matrix-zeit input:checked');
    const allPeriods = ['1945-1949', '1950-1954', '1955-1959', '1960-1964', '1965-1969', '1970-1974'];
    if (checkboxes.length === 0) {
      return allPeriods; // default all
    }
    return Array.from(checkboxes).map(cb => cb.value);
  }

  /**
   * Get active matrix sort option
   */
  function getMatrixSortOption() {
    const selected = document.querySelector('#filter-matrix-sort input:checked');
    return selected ? selected.value : 'kategorie';
  }

  /**
   * OPTION A: Volle Breite Layout for Begegnungs-Matrix
   *
   * - Full-width heatmap
   * - Floating legend/controls
   * - Maximized data density
   */
  function renderMatrix(container) {
    if (!syntheticData) {
      container.innerHTML = '<div class="viz-placeholder"><p>Lade Daten...</p></div>';
      return;
    }

    // Add fullwidth styles
    addFullwidthStyles();

    const margin = { top: 80, right: 20, bottom: 60, left: 140 };
    const width = container.clientWidth;

    container.innerHTML = '';

    // Create fullwidth wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'viz-fullwidth';
    container.appendChild(wrapper);

    // Floating info box
    const infoBox = document.createElement('div');
    infoBox.className = 'viz-floating-info';
    infoBox.innerHTML = `
      <div class="vfi-title">Begegnungs-Matrix</div>
      <div class="vfi-stat" id="matrix-stat">-</div>
      <div class="vfi-hint">Klick auf Zelle zeigt Archivalien</div>
    `;
    wrapper.appendChild(infoBox);

    // SVG container
    const svgContainer = document.createElement('div');
    svgContainer.className = 'viz-svg-container';
    wrapper.appendChild(svgContainer);

    // Get filter settings
    const categoryOrder = ['dirigent', 'regisseur', 'vermittler', 'kollege'];
    const activeCategories = getActiveMatrixCategories();
    const activeZeitraeume = getActiveMatrixZeitraeume();
    const sortOption = getMatrixSortOption();

    // Calculate total intensity for each person (for intensity sorting)
    const calculateTotalIntensity = (person) => {
      return (person.begegnungen || [])
        .filter(b => activeZeitraeume.includes(b.zeitraum))
        .reduce((sum, b) => sum + (b.intensitaet || 0), 0);
    };

    // Get persons (excluding focus person), filtered by active categories
    let personen = (syntheticData.personen || [])
      .filter(p => p.kategorie !== 'fokusperson' && activeCategories.includes(p.kategorie));

    // Apply sorting based on selected option
    switch (sortOption) {
      case 'intensitaet':
        // Sort by total intensity descending, then alphabetically
        personen = personen.sort((a, b) => {
          const intensA = calculateTotalIntensity(a);
          const intensB = calculateTotalIntensity(b);
          if (intensB !== intensA) return intensB - intensA;
          return a.name.localeCompare(b.name);
        });
        break;
      case 'alphabetisch':
        // Sort alphabetically
        personen = personen.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'kategorie':
      default:
        // Sort by category then alphabetically
        personen = personen.sort((a, b) => {
          const catA = categoryOrder.indexOf(a.kategorie);
          const catB = categoryOrder.indexOf(b.kategorie);
          if (catA !== catB) return catA - catB;
          return a.name.localeCompare(b.name);
        });
        break;
    }

    // Dynamic height based on number of persons
    const rowHeight = 28;
    const height = Math.max(400, margin.top + margin.bottom + personen.length * rowHeight + 40);

    const svg = d3.select(svgContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'matrix__svg');

    // Update stat
    document.getElementById('matrix-stat').textContent = `${personen.length} Personen × ${activeZeitraeume.length} Zeiträume`;

    // Show message if no persons match filter
    if (personen.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#757575')
        .text('Keine Personen in ausgewählten Kategorien');
      return;
    }

    // Show message if no time periods selected
    if (activeZeitraeume.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#757575')
        .text('Keine Zeiträume ausgewählt');
      return;
    }

    // Use only active time periods
    const zeitraeume = activeZeitraeume;

    // Build matrix data
    const matrixData = [];
    personen.forEach(person => {
      zeitraeume.forEach(zeit => {
        const begegnung = (person.begegnungen || []).find(b => b.zeitraum === zeit);
        matrixData.push({
          person: person.name,
          kategorie: person.kategorie,
          zeitraum: zeit,
          intensitaet: begegnung ? begegnung.intensitaet : 0,
          kontext: begegnung ? begegnung.kontext : '',
          dokumente: begegnung ? (begegnung.dokumente || []) : []
        });
      });
    });

    // Scales
    const xScale = d3.scaleBand()
      .domain(zeitraeume)
      .range([margin.left, width - margin.right])
      .padding(0.05);

    const yScale = d3.scaleBand()
      .domain(personen.map(p => p.name))
      .range([margin.top, height - margin.bottom])
      .padding(0.05);

    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, 5]);

    // Category colors for row labels
    const categoryColors = {
      dirigent: '#1565C0',
      regisseur: '#6A1B9A',
      vermittler: '#2E7D32',
      kollege: '#E65100'
    };

    // Draw cells
    svg.selectAll('.matrix__cell')
      .data(matrixData)
      .enter()
      .append('rect')
      .attr('class', 'matrix__cell')
      .attr('x', d => xScale(d.zeitraum))
      .attr('y', d => yScale(d.person))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 3)
      .attr('fill', d => d.intensitaet > 0 ? colorScale(d.intensitaet) : '#F5F3EF')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', d => d.intensitaet > 0 ? 'pointer' : 'default')
      .on('mouseover', (event, d) => {
        if (d.intensitaet > 0) {
          const docCount = d.dokumente.length;
          showTooltip(event, `${d.person} (${d.zeitraum})`, `Intensität: ${d.intensitaet}/5 – ${d.kontext}\n📄 ${docCount} Archivalien`);
        }
      })
      .on('mouseout', hideTooltip)
      .on('click', (event, d) => {
        if (d.intensitaet > 0 && d.dokumente.length > 0) {
          event.stopPropagation();
          showDocumentPanel(`${d.person} – ${d.zeitraum}`, d.dokumente);
        }
      });

    // Intensity labels in cells
    svg.selectAll('.matrix__label')
      .data(matrixData.filter(d => d.intensitaet > 0))
      .enter()
      .append('text')
      .attr('class', 'matrix__label')
      .attr('x', d => xScale(d.zeitraum) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.person) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', d => d.intensitaet > 3 ? '#fff' : '#1A1A1A')
      .text(d => d.intensitaet);

    // X-Axis (Zeiträume)
    svg.append('g')
      .attr('class', 'matrix__axis')
      .attr('transform', `translate(0, ${margin.top - 10})`)
      .call(d3.axisTop(xScale))
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('fill', '#4A4A4A');

    // Y-Axis (Personen)
    const yAxis = svg.append('g')
      .attr('class', 'matrix__axis')
      .attr('transform', `translate(${margin.left - 10}, 0)`);

    // Custom Y-axis with colored labels and category separators
    let lastCategory = null;
    personen.forEach((person, idx) => {
      const y = yScale(person.name) + yScale.bandwidth() / 2;

      // Draw category separator and label if category changes
      if (person.kategorie !== lastCategory) {
        const separatorY = yScale(person.name) - yScale.step() * yScale.paddingOuter() / 2;

        // Category label on left
        svg.append('text')
          .attr('x', margin.left - 150)
          .attr('y', separatorY + yScale.bandwidth() / 2)
          .attr('font-size', '9px')
          .attr('font-weight', '600')
          .attr('fill', categoryColors[person.kategorie] || '#757575')
          .attr('text-transform', 'uppercase')
          .attr('letter-spacing', '0.05em')
          .text(person.kategorie.toUpperCase());

        // Separator line
        if (lastCategory !== null) {
          svg.append('line')
            .attr('x1', margin.left)
            .attr('x2', width - margin.right)
            .attr('y1', separatorY - 2)
            .attr('y2', separatorY - 2)
            .attr('stroke', categoryColors[person.kategorie])
            .attr('stroke-width', 1)
            .attr('stroke-opacity', 0.3);
        }
        lastCategory = person.kategorie;
      }

      yAxis.append('text')
        .attr('x', 0)
        .attr('y', y)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('font-size', '11px')
        .attr('fill', categoryColors[person.kategorie] || '#4A4A4A')
        .text(person.name);

      // Category indicator
      yAxis.append('circle')
        .attr('cx', -margin.left + 35)
        .attr('cy', y)
        .attr('r', 4)
        .attr('fill', categoryColors[person.kategorie] || '#757575');
    });

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 200}, ${margin.top - 60})`);

    legend.append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#757575')
      .text('INTENSITÄT');

    const legendScale = [0, 1, 2, 3, 4, 5];
    legendScale.forEach((val, i) => {
      legend.append('rect')
        .attr('x', i * 25)
        .attr('y', 10)
        .attr('width', 22)
        .attr('height', 12)
        .attr('fill', val > 0 ? colorScale(val) : '#F5F3EF')
        .attr('stroke', '#D4CFC5');
    });

    // Category legend
    const catLegend = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${height - 25})`);

    Object.entries(categoryColors).forEach(([cat, color], i) => {
      const x = i * 100;
      catLegend.append('circle')
        .attr('cx', x)
        .attr('cy', 0)
        .attr('r', 5)
        .attr('fill', color);
      catLegend.append('text')
        .attr('x', x + 10)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .attr('font-size', '11px')
        .attr('fill', '#4A4A4A')
        .text(cat.charAt(0).toUpperCase() + cat.slice(1));
    });

    addTooltip(container);
  }

  /* ==========================================================================
     ROLLEN-KOSMOS (FF2) - Scroll-Morphing Visualization
     Radial view at top, unfolds to timeline when scrolling down
     ========================================================================== */

  // Kosmos state for interactivity
  let kosmosState = {
    focusedKomponist: null,
    focusedRolle: null,
    scrollProgress: 0
  };

  /**
   * Scroll-Morphing Rollen-Kosmos
   *
   * - At scroll=0: Compact radial view (traditional Kosmos)
   * - At scroll=1: Fully expanded timeline view by years
   * - Smooth interpolation between positions based on scroll
   */
  function renderKosmos(container) {
    if (!syntheticData) {
      container.innerHTML = '<div class="viz-placeholder"><p>Lade Daten...</p></div>';
      return;
    }

    // Add scroll-kosmos styles
    addScrollKosmosStyles();

    const width = container.clientWidth;
    const radialHeight = 600;
    const centerX = width / 2;
    const centerY = radialHeight / 2;

    container.innerHTML = '';

    // === EXTRACT DATA AND BUILD ROLE TIMELINE ===
    const werke = syntheticData.werke || [];
    const dokumente = syntheticData.archivalien?.dokumente || [];

    // Use refined colors from color scheme
    const kompColors = window.M3GIM_COLORS?.komponisten || {
      'Richard Wagner': '#6B2C2C',
      'Giuseppe Verdi': '#2C5C3F',
      'Richard Strauss': '#4A3A6B',
      'Christoph Willibald Gluck': '#8B7355',
      'Georg Friedrich Händel': '#4A5C5C',
      'Georges Bizet': '#7A4A6B',
      'Giacomo Puccini': '#8B5A3C',
      'diverse': '#6B6B6B'
    };

    // Build role data with years from actual documents
    const roleData = [];
    const yearsWithData = new Set();

    werke.forEach(werk => {
      const komp = werk.komponist || 'diverse';
      (werk.rollen || []).forEach(rolle => {
        let years = [];
        // Extract years from role's zeitraum
        if (rolle.zeitraum && rolle.zeitraum.includes('-')) {
          const [von, bis] = rolle.zeitraum.split('-').map(Number);
          if (!isNaN(von) && !isNaN(bis)) {
            for (let y = von; y <= bis; y++) {
              years.push(y);
              yearsWithData.add(y);
            }
          }
        }
        // Also check linked documents for years
        (rolle.dokumente || []).forEach(docId => {
          const doc = archiveDocuments[docId];
          if (doc && doc.jahr) {
            years.push(doc.jahr);
            yearsWithData.add(doc.jahr);
          }
        });

        if (years.length > 0) {
          roleData.push({
            id: `${komp}-${rolle.name}`,
            name: rolle.name,
            werk: werk.titel,
            komponist: komp,
            color: kompColors[komp] || kompColors.diverse || '#6B6B6B',
            years: [...new Set(years)].sort((a, b) => a - b),
            minYear: Math.min(...years),
            maxYear: Math.max(...years),
            dokumente: rolle.dokumente || [],
            anzahl: rolle.anzahl_dokumente || years.length
          });
        }
      });
    });

    // Sort roles by first appearance
    roleData.sort((a, b) => a.minYear - b.minYear);

    // Build timeline from actual data
    const sortedYears = [...yearsWithData].sort((a, b) => a - b);
    const minYear = sortedYears[0] || 1940;
    const maxYear = sortedYears[sortedYears.length - 1] || 1970;

    // Calculate timeline dimensions
    const timelineRowHeight = 45;
    const timelineHeight = Math.max(800, roleData.length * timelineRowHeight + 200);
    const totalScrollHeight = timelineHeight + window.innerHeight;
    const margin = { top: 100, right: 40, bottom: 40, left: 180 };

    // Create scroll container
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'kosmos-scroll-container';
    scrollContainer.style.height = `${totalScrollHeight}px`;
    container.appendChild(scrollContainer);

    // Sticky visualization area
    const vizArea = document.createElement('div');
    vizArea.className = 'kosmos-viz-sticky';
    scrollContainer.appendChild(vizArea);

    // Scroll hint
    const scrollHint = document.createElement('div');
    scrollHint.className = 'kosmos-scroll-hint';
    scrollHint.innerHTML = `
      <span class="kosmos-scroll-hint__text">Scrollen zum Entfalten der Timeline</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M19 12l-7 7-7-7"/>
      </svg>
    `;
    vizArea.appendChild(scrollHint);

    // Reset state
    kosmosState = { focusedKomponist: null, focusedRolle: null, scrollProgress: 0 };

    // Create SVG with dynamic height
    const svg = d3.select(vizArea)
      .append('svg')
      .attr('width', width)
      .attr('height', radialHeight)
      .attr('class', 'kosmos__svg kosmos__svg--scroll');

    // Group composers
    const komponisten = {};
    roleData.forEach(role => {
      if (!komponisten[role.komponist]) {
        komponisten[role.komponist] = {
          name: role.komponist,
          roles: [],
          totalDocs: 0,
          color: role.color
        };
      }
      komponisten[role.komponist].roles.push(role);
      komponisten[role.komponist].totalDocs += role.anzahl;
    });

    const kompArray = Object.values(komponisten).sort((a, b) => b.totalDocs - a.totalDocs);

    // Build nodes with BOTH radial and timeline positions
    const nodes = [];
    const links = [];

    // X scale for timeline
    const xScale = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([margin.left, width - margin.right]);

    // Center node - Ira Malaniuk
    nodes.push({
      id: 'center',
      name: 'Ira Malaniuk',
      type: 'center',
      radius: 45,
      color: '#004A8F',
      // Radial position (center)
      radialX: centerX,
      radialY: centerY,
      // Timeline position (top left, fades out)
      timelineX: margin.left - 80,
      timelineY: margin.top
    });

    // Add composer nodes with dual positions
    kompArray.forEach((komp, i) => {
      const angle = (i / kompArray.length) * 2 * Math.PI - Math.PI / 2;
      const radialR = 150;

      nodes.push({
        id: `komp-${komp.name}`,
        name: komp.name,
        type: 'komponist',
        totalDocs: komp.totalDocs,
        rolesCount: komp.roles.length,
        radius: Math.sqrt(komp.totalDocs) * 1.5 + 18,
        color: komp.color,
        // Radial position
        radialX: centerX + Math.cos(angle) * radialR,
        radialY: centerY + Math.sin(angle) * radialR,
        // Timeline position (left side, stacked)
        timelineX: margin.left - 80,
        timelineY: margin.top + 60 + i * 70
      });

      links.push({
        source: 'center',
        target: `komp-${komp.name}`,
        type: 'komp-link'
      });
    });

    // Add role nodes with dual positions
    roleData.forEach((role, i) => {
      const kompNode = nodes.find(n => n.id === `komp-${role.komponist}`);
      const kompAngle = kompNode ? Math.atan2(kompNode.radialY - centerY, kompNode.radialX - centerX) : 0;
      const roleAngle = kompAngle + (Math.random() - 0.5) * 0.8;
      const radialR = 250 + Math.random() * 40;

      nodes.push({
        id: role.id,
        name: role.name,
        werk: role.werk,
        komponist: role.komponist,
        type: 'rolle',
        years: role.years,
        minYear: role.minYear,
        maxYear: role.maxYear,
        anzahl: role.anzahl,
        dokumente: role.dokumente,
        radius: Math.sqrt(role.anzahl) * 2 + 8,
        color: role.color,
        // Radial position
        radialX: centerX + Math.cos(roleAngle) * radialR,
        radialY: centerY + Math.sin(roleAngle) * radialR,
        // Timeline position
        timelineX: xScale(role.minYear),
        timelineY: margin.top + 50 + i * timelineRowHeight,
        timelineWidth: Math.max(20, xScale(role.maxYear) - xScale(role.minYear))
      });

      links.push({
        source: `komp-${role.komponist}`,
        target: role.id,
        type: 'role-link',
        color: role.color
      });
    });

    // Run force simulation for radial layout
    const simulation = d3.forceSimulation(nodes.filter(n => n.type !== 'center'))
      .force('charge', d3.forceManyBody().strength(d => d.type === 'komponist' ? -150 : -30))
      .force('collision', d3.forceCollide().radius(d => d.radius + 5))
      .force('x', d3.forceX(d => d.radialX).strength(0.3))
      .force('y', d3.forceY(d => d.radialY).strength(0.3))
      .stop();

    for (let i = 0; i < 150; i++) simulation.tick();

    // Update radial positions from simulation
    nodes.forEach(n => {
      if (n.type !== 'center' && n.x !== undefined) {
        n.radialX = n.x;
        n.radialY = n.y;
      }
    });

    // === TIME AXIS (visible when scrolled) ===
    const timeAxis = svg.append('g')
      .attr('class', 'kosmos__time-axis')
      .attr('transform', `translate(0, ${margin.top - 20})`)
      .attr('opacity', 0);

    // Year labels and grid
    const yearStep = Math.ceil((maxYear - minYear) / 12);
    for (let y = minYear; y <= maxYear; y += yearStep) {
      timeAxis.append('text')
        .attr('x', xScale(y))
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .attr('fill', '#8A857E')
        .text(y);

      timeAxis.append('line')
        .attr('x1', xScale(y))
        .attr('x2', xScale(y))
        .attr('y1', 15)
        .attr('y2', timelineHeight - margin.top)
        .attr('stroke', '#EAE6DF')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,6');
    }

    // === DRAW ELEMENTS ===

    // Draw links
    const linkElements = svg.selectAll('.kosmos__link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', d => `kosmos__link kosmos__link--${d.type}`)
      .attr('stroke', d => d.color || '#C4BFB5')
      .attr('stroke-width', d => d.type === 'komp-link' ? 2 : 1)
      .attr('stroke-opacity', d => d.type === 'komp-link' ? 0.4 : 0.2);

    // Draw node groups
    const nodeElements = svg.selectAll('.kosmos__node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => `kosmos__node kosmos__node--${d.type}`)
      .attr('transform', d => `translate(${d.radialX}, ${d.radialY})`);

    // Role bars (for timeline mode)
    nodeElements.filter(d => d.type === 'rolle')
      .append('rect')
      .attr('class', 'kosmos__role-bar')
      .attr('x', d => -d.radius)
      .attr('y', -12)
      .attr('width', d => d.radius * 2)
      .attr('height', 24)
      .attr('rx', 4)
      .attr('fill', d => d.color)
      .attr('fill-opacity', 0);

    // Node circles
    nodeElements.append('circle')
      .attr('class', 'kosmos__circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('fill-opacity', d => d.type === 'center' ? 0.15 : d.type === 'komponist' ? 0.25 : 0.7)
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.type === 'center' ? 3 : d.type === 'komponist' ? 2 : 1.5)
      .style('cursor', 'pointer');

    // Labels
    nodeElements.filter(d => d.type === 'center')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('fill', '#004A8F')
      .style('pointer-events', 'none')
      .text('Ira Malaniuk');

    nodeElements.filter(d => d.type === 'komponist')
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', d => d.color)
      .style('pointer-events', 'none')
      .text(d => d.name.split(' ').pop());

    // Role labels (shown in timeline mode)
    nodeElements.filter(d => d.type === 'rolle')
      .append('text')
      .attr('class', 'kosmos__role-label')
      .attr('text-anchor', 'start')
      .attr('dx', d => d.radius + 8)
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('fill', '#2C2825')
      .attr('opacity', 0)
      .style('pointer-events', 'none')
      .text(d => `${d.name} (${d.minYear}–${d.maxYear})`);

    // === INTERACTION ===
    nodeElements.select('.kosmos__circle')
      .on('mouseover', (event, d) => {
        if (d.type === 'center') {
          showTooltip(event, 'Ira Malaniuk', 'Mezzosopran, 1919–2009');
        } else if (d.type === 'komponist') {
          showTooltip(event, d.name, `${d.rolesCount} Rollen, ${d.totalDocs} Dokumente`);
        } else {
          const dauer = d.maxYear - d.minYear;
          showTooltip(event, d.name,
            `${d.komponist}: ${d.werk}\n` +
            `${d.minYear}–${d.maxYear} (${dauer} ${dauer === 1 ? 'Jahr' : 'Jahre'})\n` +
            `${d.dokumente.length} Archivalien`);
        }
      })
      .on('mouseout', hideTooltip)
      .on('click', (event, d) => {
        event.stopPropagation();
        if (d.type === 'rolle' && d.dokumente.length > 0) {
          showDocumentPanel(`${d.name} (${d.komponist})`, d.dokumente);
        } else if (d.type === 'komponist') {
          kosmosState.focusedKomponist = kosmosState.focusedKomponist === d.name ? null : d.name;
          updateKosmosFocus();
        }
        hideTooltip();
      });

    function updateKosmosFocus() {
      const focused = kosmosState.focusedKomponist;
      nodeElements.select('.kosmos__circle')
        .transition().duration(300)
        .attr('fill-opacity', d => {
          if (!focused) return d.type === 'center' ? 0.15 : d.type === 'komponist' ? 0.25 : 0.7;
          if (d.name === focused || d.komponist === focused) return 0.85;
          return 0.15;
        });
      linkElements.transition().duration(300)
        .attr('stroke-opacity', d => {
          if (!focused) return d.type === 'komp-link' ? 0.4 : 0.2;
          const target = nodes.find(n => n.id === d.target);
          if (target && (target.name === focused || target.komponist === focused)) return 0.6;
          return 0.05;
        });
    }

    // === SCROLL-BASED MORPHING ===
    function updatePositions(progress) {
      kosmosState.scrollProgress = progress;
      const ease = d3.easeCubicInOut(progress);

      // Fade scroll hint
      d3.select(scrollHint).style('opacity', 1 - ease * 2);

      // Show time axis
      timeAxis.attr('opacity', ease);

      // Update SVG height
      const currentHeight = radialHeight + (timelineHeight - radialHeight) * ease;
      svg.attr('height', Math.max(currentHeight, radialHeight));

      // Interpolate node positions
      nodeElements.attr('transform', d => {
        const x = d.radialX + (d.timelineX - d.radialX) * ease;
        const y = d.radialY + (d.timelineY - d.radialY) * ease;
        return `translate(${x}, ${y})`;
      });

      // Update link positions
      linkElements.each(function(d) {
        const src = nodes.find(n => n.id === d.source);
        const tgt = nodes.find(n => n.id === d.target);
        if (src && tgt) {
          const x1 = src.radialX + (src.timelineX - src.radialX) * ease;
          const y1 = src.radialY + (src.timelineY - src.radialY) * ease;
          const x2 = tgt.radialX + (tgt.timelineX - tgt.radialX) * ease;
          const y2 = tgt.radialY + (tgt.timelineY - tgt.radialY) * ease;
          d3.select(this)
            .attr('x1', x1).attr('y1', y1)
            .attr('x2', x2).attr('y2', y2)
            .attr('stroke-opacity', (d.type === 'komp-link' ? 0.4 : 0.2) * (1 - ease * 0.7));
        }
      });

      // Morph circles to bars for roles
      nodeElements.filter(d => d.type === 'rolle')
        .select('.kosmos__role-bar')
        .attr('width', d => d.radius * 2 + (d.timelineWidth - d.radius * 2) * ease)
        .attr('fill-opacity', ease * 0.65);

      // Adjust role circles
      nodeElements.filter(d => d.type === 'rolle')
        .select('.kosmos__circle')
        .attr('fill-opacity', 0.7 * (1 - ease * 0.8))
        .attr('r', d => d.radius * (1 - ease * 0.4));

      // Show role labels in timeline mode
      nodeElements.filter(d => d.type === 'rolle')
        .select('.kosmos__role-label')
        .attr('opacity', ease)
        .attr('dx', d => d.radius * (1 - ease * 0.4) + 8 + d.timelineWidth * ease);

      // Fade center and composer nodes in timeline mode
      nodeElements.filter(d => d.type === 'center')
        .attr('opacity', 1 - ease * 0.8);
      nodeElements.filter(d => d.type === 'komponist')
        .attr('opacity', 1 - ease * 0.5);
    }

    // Initialize at radial view
    updatePositions(0);

    // Scroll handler
    let ticking = false;
    function handleScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          const rect = scrollContainer.getBoundingClientRect();
          const scrollTop = -rect.top;
          const maxScroll = totalScrollHeight - window.innerHeight;
          const progress = Math.max(0, Math.min(1, scrollTop / (maxScroll * 0.5)));
          updatePositions(progress);
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup observer
    const observer = new MutationObserver(() => {
      if (!document.contains(scrollContainer)) {
        window.removeEventListener('scroll', handleScroll);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    addTooltip(container);
  }

  /**
   * Add CSS styles for scroll-morphing Kosmos
   */
  function addScrollKosmosStyles() {
    if (document.getElementById('scroll-kosmos-styles')) return;

    const style = document.createElement('style');
    style.id = 'scroll-kosmos-styles';
    style.textContent = `
      .kosmos-scroll-container {
        position: relative;
        width: 100%;
      }
      .kosmos-viz-sticky {
        position: sticky;
        top: 140px;
        width: 100%;
        background: linear-gradient(180deg, #FCFBF9 0%, #F7F5F2 100%);
        z-index: 10;
        padding-bottom: 20px;
      }
      .kosmos-scroll-hint {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 8px;
        color: #8A857E;
        font-size: 12px;
        font-weight: 500;
        z-index: 20;
        transition: opacity 0.3s ease;
      }
      .kosmos-scroll-hint svg {
        animation: kosmosArrowBounce 1.5s infinite;
      }
      @keyframes kosmosArrowBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(5px); }
      }
      .kosmos__svg--scroll {
        display: block;
        overflow: visible;
      }
      .kosmos__role-bar {
        transition: fill-opacity 0.15s ease;
        cursor: pointer;
      }
      .kosmos__role-bar:hover {
        fill-opacity: 0.85 !important;
      }
      .kosmos__circle {
        transition: fill-opacity 0.15s ease, r 0.15s ease;
      }
      .kosmos__circle:hover {
        filter: brightness(1.1);
      }
      .kosmos__time-axis text {
        font-family: 'Inter', system-ui, sans-serif;
      }
    `;
    document.head.appendChild(style);
  }

  /* ==========================================================================
     KARRIERE-FLUSS (FF2, FF4) - True Alluvial Diagram
     Shows how repertoire focus and geographic centers shifted across career phases
     ========================================================================== */

  /**
   * OPTION B: Filmstreifen-Layout for Karriere-Fluss
   *
   * - Horizontal carousel/filmstrip of career phases
   * - Each "frame" shows one phase with its flows
   * - Left/Right navigation through phases
   * - Compact timeline at bottom shows position
   */
  function renderSankey(container) {
    if (!syntheticData) {
      container.innerHTML = '<div class="viz-placeholder"><p>Lade Daten...</p></div>';
      return;
    }

    // Add filmstrip styles
    addFilmstripStyles();

    const width = container.clientWidth;
    const height = 520;

    container.innerHTML = '';

    // === CREATE FILMSTRIP CONTAINER ===
    const filmstrip = document.createElement('div');
    filmstrip.className = 'karriere-filmstrip';
    container.appendChild(filmstrip);

    // === PHASE DATA (based on Lebensphasen) ===
    const lebensphasen = syntheticData.lebensphasen || [];
    const phases = lebensphasen.length > 0 ? lebensphasen.map((lp, i) => ({
      id: lp.id,
      label: lp.label || lp.name || `Phase ${i + 1}`,
      years: `${lp.von}–${lp.bis}`,
      description: lp.beschreibung || lp.ort || '',
      index: i
    })) : [
      { id: 'LP1', label: 'Kindheit', years: '1919–1937', description: 'Aufwachsen in Lemberg', index: 0 },
      { id: 'LP2', label: 'Ausbildung', years: '1937–1944', description: 'Gesangsstudium', index: 1 },
      { id: 'LP3', label: 'Flucht', years: '1944–1945', description: 'Kriegsflucht', index: 2 },
      { id: 'LP4', label: 'Graz', years: '1945–1947', description: 'Erstes Engagement', index: 3 },
      { id: 'LP5', label: 'Aufstieg', years: '1947–1955', description: 'Wiener Staatsoper', index: 4 },
      { id: 'LP6', label: 'Höhepunkt', years: '1955–1970', description: 'Internationale Karriere', index: 5 },
      { id: 'LP7', label: 'Spätphase', years: '1970–2009', description: 'Rückzug nach Zürich', index: 6 }
    ];

    let currentPhaseIndex = 3; // Start at career phase (LP4 Graz)

    // === NAVIGATION HEADER ===
    const navHeader = document.createElement('div');
    navHeader.className = 'filmstrip-nav';
    navHeader.innerHTML = `
      <button class="filmstrip-nav__btn filmstrip-nav__btn--prev" id="filmstrip-prev" title="Vorherige Phase">
        <span>◀</span>
      </button>
      <div class="filmstrip-nav__info">
        <span class="filmstrip-nav__phase" id="filmstrip-phase-label">-</span>
        <span class="filmstrip-nav__years" id="filmstrip-phase-years">-</span>
      </div>
      <button class="filmstrip-nav__btn filmstrip-nav__btn--next" id="filmstrip-next" title="Nächste Phase">
        <span>▶</span>
      </button>
    `;
    filmstrip.appendChild(navHeader);

    // === MAIN VISUALIZATION AREA ===
    const vizArea = document.createElement('div');
    vizArea.className = 'filmstrip-viz';
    filmstrip.appendChild(vizArea);

    // === TIMELINE STRIP (bottom) ===
    const timelineStrip = document.createElement('div');
    timelineStrip.className = 'filmstrip-timeline';
    filmstrip.appendChild(timelineStrip);

    // Create timeline phases
    phases.forEach((phase, i) => {
      const frame = document.createElement('div');
      frame.className = 'filmstrip-frame';
      frame.dataset.index = i;
      frame.innerHTML = `
        <div class="filmstrip-frame__marker"></div>
        <div class="filmstrip-frame__label">${phase.label}</div>
        <div class="filmstrip-frame__years">${phase.years.split('–')[0]}</div>
      `;
      frame.addEventListener('click', () => goToPhase(i));
      timelineStrip.appendChild(frame);
    });

    // === RENDER PHASE CONTENT ===
    function renderPhaseContent(phaseIndex) {
      const phase = phases[phaseIndex];
      vizArea.innerHTML = '';

      // Update navigation info
      document.getElementById('filmstrip-phase-label').textContent = phase.label;
      document.getElementById('filmstrip-phase-years').textContent = phase.years;

      // Update timeline highlights
      document.querySelectorAll('.filmstrip-frame').forEach((f, i) => {
        f.classList.toggle('filmstrip-frame--active', i === phaseIndex);
        f.classList.toggle('filmstrip-frame--past', i < phaseIndex);
      });

      // Update nav buttons
      document.getElementById('filmstrip-prev').disabled = phaseIndex === 0;
      document.getElementById('filmstrip-next').disabled = phaseIndex === phases.length - 1;

      // Create phase-specific Sankey
      renderPhaseSankey(vizArea, phase, width, height - 120);
    }

    // === PHASE-SPECIFIC SANKEY ===
    function renderPhaseSankey(container, phase, w, h) {
      const svg = d3.select(container)
        .append('svg')
        .attr('width', w)
        .attr('height', h)
        .attr('class', 'filmstrip-sankey');

      const margin = { top: 60, right: 30, bottom: 30, left: 30 };

      // Parse year range
      const [vonYear, bisYear] = phase.years.split('–').map(y => parseInt(y));

      // Phase header
      svg.append('rect')
        .attr('x', margin.left)
        .attr('y', 10)
        .attr('width', w - margin.left - margin.right)
        .attr('height', 40)
        .attr('rx', 6)
        .attr('fill', getLPColor(phase.id))
        .attr('fill-opacity', 0.15);

      svg.append('text')
        .attr('x', w / 2)
        .attr('y', 35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .attr('fill', '#1A1A1A')
        .text(`${phase.label}: ${phase.description}`);

      // Get data for this phase
      const werke = syntheticData.werke || [];
      const orte = syntheticData.orte || [];

      // Find relevant repertoire in this phase
      const phaseRepertoire = [];
      const phaseOrte = [];

      werke.forEach(werk => {
        (werk.rollen || []).forEach(rolle => {
          const von = parseInt(rolle.erste_auffuehrung || rolle.von || 0);
          const bis = parseInt(rolle.letzte_auffuehrung || rolle.bis || von + 5);
          if (bis >= vonYear && von <= bisYear) {
            const komp = werk.komponist?.includes('Wagner') ? 'Wagner' :
              werk.komponist?.includes('Verdi') ? 'Verdi' :
                werk.komponist?.includes('Strauss') ? 'Strauss' : 'Andere';
            phaseRepertoire.push({ rolle: rolle.name, werk: werk.werk, komponist: komp, dokumente: rolle.dokumente || [] });
          }
        });
      });

      orte.forEach(ort => {
        (ort.zeitraeume || []).forEach(zeit => {
          const von = parseInt(zeit.von);
          const bis = parseInt(zeit.bis);
          if (bis >= vonYear && von <= bisYear) {
            phaseOrte.push({ name: ort.name, typ: zeit.typ, dokumente: zeit.dokumente || [] });
          }
        });
      });

      // Group by composer
      const byKomponist = {};
      phaseRepertoire.forEach(r => {
        if (!byKomponist[r.komponist]) byKomponist[r.komponist] = [];
        byKomponist[r.komponist].push(r);
      });

      // Group by location
      const byOrt = {};
      phaseOrte.forEach(o => {
        if (!byOrt[o.name]) byOrt[o.name] = { wohnort: false, auffuehrungsort: false, dokumente: [] };
        if (o.typ === 'wohnort') byOrt[o.name].wohnort = true;
        if (o.typ === 'auffuehrungsort') byOrt[o.name].auffuehrungsort = true;
        byOrt[o.name].dokumente.push(...o.dokumente);
      });

      // Layout
      const col1X = margin.left + 80;
      const col2X = w / 2;
      const col3X = w - margin.right - 80;
      const startY = margin.top + 20;

      // Column headers
      [
        { x: col1X, label: 'REPERTOIRE' },
        { x: col2X, label: phase.label.toUpperCase() },
        { x: col3X, label: 'ORTE' }
      ].forEach(h => {
        svg.append('text')
          .attr('x', h.x)
          .attr('y', startY)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('fill', '#757575')
          .attr('letter-spacing', '0.05em')
          .text(h.label);
      });

      // Draw repertoire nodes
      const kompColors = { 'Wagner': '#8B0000', 'Verdi': '#006400', 'Strauss': '#4B0082', 'Andere': '#708090' };
      const kompList = Object.keys(byKomponist);
      const nodeH = 35;
      const nodeGap = 10;

      kompList.forEach((komp, i) => {
        const y = startY + 30 + i * (nodeH + nodeGap);
        const roles = byKomponist[komp];
        const allDocs = roles.flatMap(r => r.dokumente);

        const g = svg.append('g')
          .style('cursor', 'pointer')
          .on('mouseover', (event) => showTooltip(event, komp, `${roles.length} Rollen\n${roles.map(r => r.rolle).join(', ')}`))
          .on('mouseout', hideTooltip)
          .on('click', (event) => {
            event.stopPropagation();
            showDocumentPanel(`${komp} in ${phase.label}`, allDocs);
          });

        g.append('rect')
          .attr('x', col1X - 50)
          .attr('y', y)
          .attr('width', 100)
          .attr('height', nodeH)
          .attr('rx', 4)
          .attr('fill', kompColors[komp])
          .attr('fill-opacity', 0.2)
          .attr('stroke', kompColors[komp])
          .attr('stroke-width', 2);

        g.append('text')
          .attr('x', col1X)
          .attr('y', y + nodeH / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px')
          .attr('font-weight', '500')
          .attr('fill', kompColors[komp])
          .text(`${komp} (${roles.length})`);

        // Flow line to center
        svg.append('path')
          .attr('d', `M${col1X + 50},${y + nodeH/2} Q${col1X + 80},${y + nodeH/2} ${col2X - 40},${startY + 80}`)
          .attr('fill', 'none')
          .attr('stroke', kompColors[komp])
          .attr('stroke-width', Math.sqrt(roles.length) * 2 + 1)
          .attr('stroke-opacity', 0.3);
      });

      // Center node (Phase)
      svg.append('rect')
        .attr('x', col2X - 50)
        .attr('y', startY + 50)
        .attr('width', 100)
        .attr('height', 60)
        .attr('rx', 8)
        .attr('fill', getLPColor(phase.id))
        .attr('fill-opacity', 0.3)
        .attr('stroke', getLPColor(phase.id))
        .attr('stroke-width', 3);

      svg.append('text')
        .attr('x', col2X)
        .attr('y', startY + 75)
        .attr('text-anchor', 'middle')
        .attr('font-size', '13px')
        .attr('font-weight', '600')
        .attr('fill', '#1A1A1A')
        .text(phase.label);

      svg.append('text')
        .attr('x', col2X)
        .attr('y', startY + 95)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#4A4A4A')
        .text(phase.years);

      // Draw location nodes
      const ortList = Object.keys(byOrt);
      ortList.forEach((ort, i) => {
        const y = startY + 30 + i * (nodeH + nodeGap);
        const data = byOrt[ort];
        const ortColor = ortColors(ort) || '#757575';
        const typeLabel = data.wohnort ? '🏠' : (data.auffuehrungsort ? '🎭' : '');

        const g = svg.append('g')
          .style('cursor', 'pointer')
          .on('mouseover', (event) => showTooltip(event, `${typeLabel} ${ort}`, `${data.wohnort ? 'Wohnort' : ''} ${data.auffuehrungsort ? 'Aufführungsort' : ''}`))
          .on('mouseout', hideTooltip)
          .on('click', (event) => {
            event.stopPropagation();
            showDocumentPanel(`${ort} in ${phase.label}`, data.dokumente);
          });

        g.append('rect')
          .attr('x', col3X - 50)
          .attr('y', y)
          .attr('width', 100)
          .attr('height', nodeH)
          .attr('rx', 4)
          .attr('fill', ortColor)
          .attr('fill-opacity', 0.2)
          .attr('stroke', ortColor)
          .attr('stroke-width', 2);

        g.append('text')
          .attr('x', col3X)
          .attr('y', y + nodeH / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px')
          .attr('font-weight', '500')
          .attr('fill', ortColor)
          .text(`${typeLabel} ${ort}`);

        // Flow line from center
        svg.append('path')
          .attr('d', `M${col2X + 50},${startY + 80} Q${col2X + 80},${y + nodeH/2} ${col3X - 50},${y + nodeH/2}`)
          .attr('fill', 'none')
          .attr('stroke', ortColor)
          .attr('stroke-width', 2)
          .attr('stroke-opacity', 0.3);
      });

      // Document count badge
      const totalDocs = [...new Set([
        ...phaseRepertoire.flatMap(r => r.dokumente),
        ...phaseOrte.flatMap(o => o.dokumente)
      ])].length;

      svg.append('text')
        .attr('x', w - 20)
        .attr('y', h - 10)
        .attr('text-anchor', 'end')
        .attr('font-size', '11px')
        .attr('fill', '#757575')
        .text(`📄 ${totalDocs} Archivalien in dieser Phase`);

      addTooltip(container);
    }

    // === NAVIGATION ===
    function goToPhase(index) {
      if (index >= 0 && index < phases.length) {
        currentPhaseIndex = index;
        renderPhaseContent(currentPhaseIndex);
      }
    }

    document.getElementById('filmstrip-prev').addEventListener('click', () => goToPhase(currentPhaseIndex - 1));
    document.getElementById('filmstrip-next').addEventListener('click', () => goToPhase(currentPhaseIndex + 1));

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (currentViz !== 'sankey') return;
      if (e.key === 'ArrowLeft') goToPhase(currentPhaseIndex - 1);
      if (e.key === 'ArrowRight') goToPhase(currentPhaseIndex + 1);
    });

    // Initial render
    renderPhaseContent(currentPhaseIndex);
  }

  /**
   * Add Filmstrip styles
   */
  function addFilmstripStyles() {
    // Premium styles are now loaded from visualization-premium.css
    // This function is kept for backward compatibility
    if (document.getElementById('filmstrip-styles')) return;

    const style = document.createElement('style');
    style.id = 'filmstrip-styles';
    style.textContent = `
      /* Minimal overrides - main styles in visualization-premium.css */
    `;
    document.head.appendChild(style);
  }

  /**
   * ORIGINAL Karriere-Fluss (kept as renderSankeyClassic for reference)
   * Shows flows between: Career Phase → Repertoire Focus → Geographic Center
   */
  function renderSankeyClassic(container) {
    if (!syntheticData) {
      container.innerHTML = '<div class="viz-placeholder"><p>Lade Daten...</p></div>';
      return;
    }

    const margin = { top: 50, right: 30, bottom: 40, left: 30 };
    const width = container.clientWidth;
    const height = 560;

    container.innerHTML = '';

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'karriere-fluss__svg');

    // === INTUITIVE ENHANCEMENT: Introductory explanation ===
    // Add a subtle reading guide at the very top
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#888')
      .text('Lesen Sie von links nach rechts: Wie führte jede Karrierephase zu welchem Repertoire an welchem Ort?');

    // Define career phases with associated data
    const karrierePhasen = [
      { id: 'anfang', label: 'Anfänge', years: '1945–1950', repertoire: ['Verdi'], orte: ['Graz', 'Wien'], weight: 1 },
      { id: 'aufstieg', label: 'Aufstieg', years: '1950–1955', repertoire: ['Verdi', 'Wagner'], orte: ['Wien', 'München'], weight: 2 },
      { id: 'hoehe', label: 'Höhepunkt', years: '1955–1965', repertoire: ['Wagner', 'Verdi', 'Strauss'], orte: ['Wien', 'Bayreuth', 'München', 'Salzburg'], weight: 4 },
      { id: 'spaet', label: 'Spätphase', years: '1965–1970', repertoire: ['Wagner', 'Strauss'], orte: ['Wien', 'Zürich'], weight: 2 }
    ];

    // Repertoire categories (Fächer) - using refined colors from M3GIM_COLORS
    const colors = window.M3GIM_COLORS || {};
    const komponistenColors = colors.komponisten || {};
    const orteColors = colors.orte || {};

    const repertoireKategorien = [
      { id: 'wagner', label: 'Wagner', color: komponistenColors['Richard Wagner'] || '#6B2C2C', roles: ['Fricka', 'Waltraute', 'Brangäne', 'Erda'] },
      { id: 'verdi', label: 'Verdi', color: komponistenColors['Giuseppe Verdi'] || '#2C5C3F', roles: ['Amneris', 'Eboli', 'Azucena', 'Ulrica'] },
      { id: 'strauss', label: 'Strauss', color: komponistenColors['Richard Strauss'] || '#4A3A6B', roles: ['Klytämnestra', 'Herodias', 'Amme'] },
      { id: 'gluck', label: 'Gluck/Händel', color: komponistenColors['Christoph Willibald Gluck'] || '#8B7355', roles: ['Orfeo', 'Dalila'] }
    ];

    // Geographic centers - using refined colors
    const geoZentren = [
      { id: 'wien', label: 'Wien', color: orteColors['Wien'] || '#9E4A5C' },
      { id: 'bayreuth', label: 'Bayreuth', color: orteColors['Bayreuth'] || '#5C4A7A' },
      { id: 'muenchen', label: 'München', color: orteColors['München'] || '#4A6B8C' },
      { id: 'salzburg', label: 'Salzburg', color: orteColors['Salzburg'] || '#8B5C4A' },
      { id: 'andere', label: 'Andere', color: '#7A7A7A' }
    ];

    // Column positions
    const colWidth = (width - margin.left - margin.right) / 3;
    const col1X = margin.left + colWidth * 0.5;
    const col2X = margin.left + colWidth * 1.5;
    const col3X = margin.left + colWidth * 2.5;

    // Column headers
    const headerY = margin.top;
    [
      { x: col1X, label: 'KARRIEREPHASE' },
      { x: col2X, label: 'REPERTOIRE-SCHWERPUNKT' },
      { x: col3X, label: 'GEOGRAFISCHES ZENTRUM' }
    ].forEach(h => {
      svg.append('text')
        .attr('x', h.x)
        .attr('y', headerY)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', '#757575')
        .attr('letter-spacing', '0.05em')
        .text(h.label);
    });

    // Calculate node positions
    const nodeHeight = 50;
    const nodePadding = 15;
    const startY = headerY + 40;

    // Phase nodes (Column 1)
    const phaseNodes = karrierePhasen.map((phase, i) => ({
      ...phase,
      x: col1X - 60,
      y: startY + i * (nodeHeight + nodePadding),
      width: 120,
      height: nodeHeight
    }));

    // Repertoire nodes (Column 2)
    const repNodes = repertoireKategorien.map((rep, i) => ({
      ...rep,
      x: col2X - 50,
      y: startY + i * (nodeHeight + nodePadding),
      width: 100,
      height: nodeHeight
    }));

    // Geo nodes (Column 3)
    const geoNodes = geoZentren.map((geo, i) => ({
      ...geo,
      x: col3X - 50,
      y: startY + i * (nodeHeight + nodePadding),
      width: 100,
      height: nodeHeight
    }));

    // Build flow data from synthetic data
    const werke = syntheticData.werke || [];
    const orte = syntheticData.orte || [];

    // Helper: Get documents for a composer category
    function getComposerDocuments(kompId) {
      const docs = new Set();
      werke.forEach(werk => {
        const kompMatch = werk.komponist.includes('Wagner') ? 'wagner' :
          werk.komponist.includes('Verdi') ? 'verdi' :
            werk.komponist.includes('Strauss') ? 'strauss' : 'gluck';
        if (kompMatch === kompId) {
          (werk.rollen || []).forEach(rolle => {
            (rolle.dokumente || []).forEach(d => docs.add(d));
          });
        }
      });
      return Array.from(docs);
    }

    // Helper: Get documents for a geographic center
    function getGeoDocuments(geoId) {
      const docs = new Set();
      const geoNameMap = { wien: 'Wien', bayreuth: 'Bayreuth', muenchen: 'München', salzburg: 'Salzburg' };
      const targetName = geoNameMap[geoId];
      orte.forEach(ort => {
        if (targetName && ort.name === targetName) {
          (ort.zeitraeume || []).forEach(z => {
            (z.dokumente || []).forEach(d => docs.add(d));
          });
        } else if (geoId === 'andere' && !Object.values(geoNameMap).includes(ort.name)) {
          (ort.zeitraeume || []).forEach(z => {
            (z.dokumente || []).forEach(d => docs.add(d));
          });
        }
      });
      return Array.from(docs);
    }

    // Helper: Get documents for a career phase
    function getPhaseDocuments(phase) {
      const docs = new Set();
      const [vonYear, bisYear] = phase.years.split('–').map(y => parseInt(y));
      // Get from lebensphasen
      (syntheticData.lebensphasen || []).forEach(lp => {
        const lpVon = parseInt(lp.von);
        const lpBis = parseInt(lp.bis);
        if (lpBis >= vonYear && lpVon <= bisYear) {
          (lp.dokumente || []).forEach(d => docs.add(d));
        }
      });
      // Get from werke in this time range
      werke.forEach(werk => {
        (werk.rollen || []).forEach(rolle => {
          const [rVon, rBis] = (rolle.zeitraum || '1950-1970').split('-').map(Number);
          if (rBis >= vonYear && rVon <= bisYear) {
            (rolle.dokumente || []).forEach(d => docs.add(d));
          }
        });
      });
      return Array.from(docs);
    }

    // Calculate flows: Phase → Repertoire
    const phaseRepFlows = [];
    karrierePhasen.forEach((phase, pi) => {
      const [vonYear, bisYear] = phase.years.split('–').map(y => parseInt(y));

      // Count documents per composer in this phase
      const compCounts = {};
      const compDocs = {};
      werke.forEach(werk => {
        (werk.rollen || []).forEach(rolle => {
          const [rVon, rBis] = (rolle.zeitraum || '1950-1970').split('-').map(Number);
          // Check if role overlaps with phase
          if (rBis >= vonYear && rVon <= bisYear) {
            const komp = werk.komponist.includes('Wagner') ? 'wagner' :
              werk.komponist.includes('Verdi') ? 'verdi' :
                werk.komponist.includes('Strauss') ? 'strauss' : 'gluck';
            compCounts[komp] = (compCounts[komp] || 0) + (rolle.anzahl_dokumente || 1);
            if (!compDocs[komp]) compDocs[komp] = new Set();
            (rolle.dokumente || []).forEach(d => compDocs[komp].add(d));
          }
        });
      });

      // Create flows with document references
      Object.entries(compCounts).forEach(([kompId, count]) => {
        const repNode = repNodes.find(r => r.id === kompId);
        if (repNode && count > 0) {
          phaseRepFlows.push({
            source: phaseNodes[pi],
            target: repNode,
            value: count,
            color: repNode.color,
            dokumente: Array.from(compDocs[kompId] || [])
          });
        }
      });
    });

    // Calculate flows: Repertoire → Geo
    const repGeoFlows = [];
    repertoireKategorien.forEach((rep, ri) => {
      // Find where each composer's works were performed
      const geoCounts = {};
      const geoDocs = {};
      werke.forEach(werk => {
        const kompMatch = werk.komponist.includes('Wagner') ? 'wagner' :
          werk.komponist.includes('Verdi') ? 'verdi' :
            werk.komponist.includes('Strauss') ? 'strauss' : 'gluck';
        if (kompMatch === rep.id) {
          // Get performance locations from orte data
          orte.forEach(ort => {
            const isAuffuehrung = (ort.zeitraeume || []).some(z => z.typ === 'auffuehrungsort');
            if (isAuffuehrung) {
              const geoId = ort.name === 'Wien' ? 'wien' :
                ort.name === 'Bayreuth' ? 'bayreuth' :
                  ort.name === 'München' ? 'muenchen' :
                    ort.name === 'Salzburg' ? 'salzburg' : 'andere';
              // Weight by composer importance
              const weight = kompMatch === 'wagner' ? 3 : kompMatch === 'verdi' ? 2 : 1;
              geoCounts[geoId] = (geoCounts[geoId] || 0) + weight;
              // Collect documents
              if (!geoDocs[geoId]) geoDocs[geoId] = new Set();
              (ort.zeitraeume || []).filter(z => z.typ === 'auffuehrungsort').forEach(z => {
                (z.dokumente || []).forEach(d => geoDocs[geoId].add(d));
              });
            }
          });
        }
      });

      Object.entries(geoCounts).forEach(([geoId, count]) => {
        const geoNode = geoNodes.find(g => g.id === geoId);
        if (geoNode && count > 0) {
          repGeoFlows.push({
            source: repNodes[ri],
            target: geoNode,
            value: count,
            color: rep.color,
            dokumente: Array.from(geoDocs[geoId] || [])
          });
        }
      });
    });

    // Calculate totals for percentage display
    const totalPhaseRepValue = phaseRepFlows.reduce((sum, f) => sum + f.value, 0);
    const totalRepGeoValue = repGeoFlows.reduce((sum, f) => sum + f.value, 0);

    // Calculate percentages per source node (for outgoing flows)
    const phaseOutTotals = {};
    phaseRepFlows.forEach(f => {
      phaseOutTotals[f.source.id] = (phaseOutTotals[f.source.id] || 0) + f.value;
    });
    const repOutTotals = {};
    repGeoFlows.forEach(f => {
      repOutTotals[f.source.id] = (repOutTotals[f.source.id] || 0) + f.value;
    });

    // Draw flows with curved paths
    const drawFlow = (flow, opacity = 0.3, isPhaseRep = true) => {
      const sourceRight = flow.source.x + flow.source.width;
      const targetLeft = flow.target.x;
      const sourceY = flow.source.y + flow.source.height / 2;
      const targetY = flow.target.y + flow.target.height / 2;
      const strokeWidth = Math.sqrt(flow.value) * 2 + 2;

      // Bezier curve control points
      const cp1x = sourceRight + (targetLeft - sourceRight) * 0.4;
      const cp2x = sourceRight + (targetLeft - sourceRight) * 0.6;

      const docCount = (flow.dokumente || []).length;

      // Calculate percentage from source node
      const sourceTotal = isPhaseRep ? phaseOutTotals[flow.source.id] : repOutTotals[flow.source.id];
      const percentage = sourceTotal > 0 ? Math.round((flow.value / sourceTotal) * 100) : 0;
      // Also calculate percentage of overall total
      const overallTotal = isPhaseRep ? totalPhaseRepValue : totalRepGeoValue;
      const overallPercentage = overallTotal > 0 ? Math.round((flow.value / overallTotal) * 100) : 0;

      svg.append('path')
        .attr('class', 'karriere-fluss__flow')
        .attr('d', `M${sourceRight},${sourceY} C${cp1x},${sourceY} ${cp2x},${targetY} ${targetLeft},${targetY}`)
        .attr('fill', 'none')
        .attr('stroke', flow.color)
        .attr('stroke-width', strokeWidth)
        .attr('stroke-opacity', opacity)
        .attr('stroke-linecap', 'round')
        .style('cursor', docCount > 0 ? 'pointer' : 'default')
        .on('mouseover', function(event) {
          d3.select(this).attr('stroke-opacity', 0.7);
          showTooltip(event, `${flow.source.label} → ${flow.target.label}`,
            `Stärke: ${flow.value} (${percentage}% von ${flow.source.label})\n` +
            `Anteil gesamt: ${overallPercentage}%\n` +
            `📄 ${docCount} Archivalien`);
        })
        .on('mouseout', function() {
          d3.select(this).attr('stroke-opacity', opacity);
          hideTooltip();
        })
        .on('click', function(event) {
          if (docCount > 0) {
            event.stopPropagation();
            showDocumentPanel(`${flow.source.label} → ${flow.target.label}`, flow.dokumente);
          }
        });
    };

    // Draw all flows (with isPhaseRep parameter for percentage calculation)
    phaseRepFlows.forEach(f => drawFlow(f, 0.25, true));
    repGeoFlows.forEach(f => drawFlow(f, 0.25, false));

    // Draw phase nodes
    phaseNodes.forEach(node => {
      const phaseDocs = getPhaseDocuments(node);
      const g = svg.append('g')
        .attr('class', 'karriere-fluss__node')
        .style('cursor', 'pointer')
        .on('mouseover', (event) => showTooltip(event, node.label, `${node.years}\nRepertoire: ${node.repertoire.join(', ')}\n📄 ${phaseDocs.length} Archivalien`))
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Karrierephase: ${node.label} (${node.years})`, phaseDocs);
        });

      g.append('rect')
        .attr('x', node.x)
        .attr('y', node.y)
        .attr('width', node.width)
        .attr('height', node.height)
        .attr('rx', 6)
        .attr('fill', '#E8D5B7')
        .attr('stroke', '#A67C52')
        .attr('stroke-width', 2);

      g.append('text')
        .attr('x', node.x + node.width / 2)
        .attr('y', node.y + node.height / 2 - 6)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .attr('fill', '#4A2C17')
        .text(node.label);

      g.append('text')
        .attr('x', node.x + node.width / 2)
        .attr('y', node.y + node.height / 2 + 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#6B4423')
        .text(node.years);
    });

    // Draw repertoire nodes
    repNodes.forEach(node => {
      const repDocs = getComposerDocuments(node.id);
      const g = svg.append('g')
        .attr('class', 'karriere-fluss__node')
        .style('cursor', 'pointer')
        .on('mouseover', (event) => showTooltip(event, node.label, `Rollen: ${node.roles.join(', ')}\n📄 ${repDocs.length} Archivalien`))
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Repertoire: ${node.label}`, repDocs);
        });

      g.append('rect')
        .attr('x', node.x)
        .attr('y', node.y)
        .attr('width', node.width)
        .attr('height', node.height)
        .attr('rx', 6)
        .attr('fill', node.color)
        .attr('fill-opacity', 0.15)
        .attr('stroke', node.color)
        .attr('stroke-width', 2);

      g.append('text')
        .attr('x', node.x + node.width / 2)
        .attr('y', node.y + node.height / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .attr('fill', node.color)
        .text(node.label);
    });

    // Draw geo nodes
    geoNodes.forEach(node => {
      const geoDocs = getGeoDocuments(node.id);
      const g = svg.append('g')
        .attr('class', 'karriere-fluss__node')
        .style('cursor', 'pointer')
        .on('mouseover', (event) => showTooltip(event, node.label, `Aufführungsort\n📄 ${geoDocs.length} Archivalien`))
        .on('mouseout', hideTooltip)
        .on('click', (event) => {
          event.stopPropagation();
          showDocumentPanel(`Geografisches Zentrum: ${node.label}`, geoDocs);
        });

      g.append('rect')
        .attr('x', node.x)
        .attr('y', node.y)
        .attr('width', node.width)
        .attr('height', node.height)
        .attr('rx', 6)
        .attr('fill', node.color)
        .attr('fill-opacity', 0.15)
        .attr('stroke', node.color)
        .attr('stroke-width', 2);

      g.append('text')
        .attr('x', node.x + node.width / 2)
        .attr('y', node.y + node.height / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .attr('fill', node.color)
        .text(node.label);
    });

    // Add narrative insights at bottom
    const insightY = height - 25;
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', insightY)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-style', 'italic')
      .attr('fill', '#757575')
      .text('Lesart: Wie verschoben sich Repertoire-Schwerpunkte und geografische Zentren über die Karriere?');

    // Reading direction arrows
    const arrowY = headerY + 15;
    [[col1X + 70, col2X - 70], [col2X + 60, col3X - 60]].forEach(([x1, x2]) => {
      svg.append('line')
        .attr('x1', x1)
        .attr('x2', x2)
        .attr('y1', arrowY)
        .attr('y2', arrowY)
        .attr('stroke', '#ccc')
        .attr('stroke-width', 1)
        .attr('marker-end', 'url(#arrow)');
    });

    // Define arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 9)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', '#ccc');

    addTooltip(container);
  }

  /**
   * Fallback data if synthetic-data.json fails to load
   */
  function getFallbackData() {
    return {
      lebensphasen: [
        { id: 'LP1', label: 'Kindheit', von: '1919', bis: '1937', beschreibung: 'Aufwachsen in Lemberg' },
        { id: 'LP2', label: 'Ausbildung', von: '1937', bis: '1944', beschreibung: 'Gesangsstudium' },
        { id: 'LP3', label: 'Flucht', von: '1944', bis: '1945', beschreibung: 'Nach Wien' },
        { id: 'LP4', label: 'Graz', von: '1945', bis: '1947', beschreibung: 'Erstes Engagement' },
        { id: 'LP5', label: 'Aufstieg', von: '1947', bis: '1955', beschreibung: 'Wiener Staatsoper' },
        { id: 'LP6', label: 'Karriere', von: '1955', bis: '1970', beschreibung: 'Internationale Karriere' },
        { id: 'LP7', label: 'Ruhestand', von: '1970', bis: '2009', beschreibung: 'Zürich' }
      ],
      orte: [
        { id: 'L1', name: 'Lemberg', zeitraeume: [{ von: '1919', bis: '1944', typ: 'wohnort' }] },
        { id: 'L2', name: 'Wien', zeitraeume: [{ von: '1944', bis: '1970', typ: 'auffuehrungsort' }] },
        { id: 'L3', name: 'Graz', zeitraeume: [{ von: '1945', bis: '1947', typ: 'wohnort' }] },
        { id: 'L4', name: 'München', zeitraeume: [{ von: '1950', bis: '1970', typ: 'auffuehrungsort' }] },
        { id: 'L5', name: 'Bayreuth', zeitraeume: [{ von: '1952', bis: '1968', typ: 'auffuehrungsort' }] },
        { id: 'L6', name: 'Zürich', zeitraeume: [{ von: '1970', bis: '2009', typ: 'wohnort' }] }
      ],
      mobilitaet: [
        { id: 'M1', von_ort: 'L1', nach_ort: 'L2', jahr: '1944', form: 'erzwungen', beschreibung: 'Flucht' },
        { id: 'M2', von_ort: 'L2', nach_ort: 'L3', jahr: '1945', form: 'geografisch', beschreibung: 'Graz' },
        { id: 'M3', von_ort: 'L3', nach_ort: 'L2', jahr: '1947', form: 'geografisch', beschreibung: 'Wien' },
        { id: 'M4', von_ort: 'L2', nach_ort: 'L6', jahr: '1970', form: 'lebensstil', beschreibung: 'Zürich' }
      ],
      personen: [
        { id: 'P2', name: 'Karajan', begegnungen: [{ zeitraum: '1955-1959', intensitaet: 5 }] },
        { id: 'P3', name: 'Böhm', begegnungen: [{ zeitraum: '1955-1959', intensitaet: 5 }] }
      ],
      werke: [
        { titel: 'Ring', komponist: 'Wagner', rollen: [{ name: 'Fricka', zeitraum: '1952-1968' }] },
        { titel: 'Aida', komponist: 'Verdi', rollen: [{ name: 'Amneris', zeitraum: '1945-1968' }] }
      ],
      dokument_aggregation: {
        nach_jahr: [
          { jahr: '1950', anzahl: 22 }, { jahr: '1955', anzahl: 35 },
          { jahr: '1958', anzahl: 42 }, { jahr: '1960', anzahl: 38 },
          { jahr: '1965', anzahl: 18 }, { jahr: '1970', anzahl: 6 }
        ]
      }
    };
  }

  /**
   * Debounce utility
   */
  function debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /* ==========================================================================
     SVG EXPORT - Export visualizations for publications (VIZ improvement)
     ========================================================================== */

  /**
   * Export current visualization as SVG file
   */
  function exportSVG() {
    const container = document.getElementById('viz-container');
    if (!container) return;

    const svg = container.querySelector('svg');
    if (!svg) {
      alert('Keine Visualisierung zum Exportieren vorhanden.');
      return;
    }

    // Clone SVG to add styles
    const clone = svg.cloneNode(true);

    // Add inline styles for fonts
    const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleElement.textContent = `
      text { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; }
      .partitur__track-label, .matrix__label { font-family: 'Inter', sans-serif; }
    `;
    clone.insertBefore(styleElement, clone.firstChild);

    // Add XML declaration and DOCTYPE
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clone);

    // Add XML header
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

    // Create download link
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const vizName = currentViz || 'visualisierung';
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `m3gim-${vizName}-${timestamp}.svg`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Add export button to visualization header
   */
  function addExportButton() {
    const vizHeader = document.querySelector('.viz-header');
    if (!vizHeader || document.getElementById('export-svg-btn')) return;

    const exportBtn = document.createElement('button');
    exportBtn.id = 'export-svg-btn';
    exportBtn.className = 'btn btn--secondary';
    exportBtn.innerHTML = '<i data-lucide="download" class="btn__icon" aria-hidden="true"></i> SVG Export';
    exportBtn.style.cssText = 'margin-left: auto; font-size: 12px; padding: 6px 12px;';
    exportBtn.addEventListener('click', exportSVG);

    // Insert button into header
    const titleEl = vizHeader.querySelector('.viz-header__title');
    if (titleEl) {
      titleEl.style.cssText = 'display: flex; align-items: center; gap: 16px; flex-wrap: wrap;';
      titleEl.appendChild(exportBtn);
    }

    // Re-initialize lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      setTimeout(addExportButton, 500);
    });
  } else {
    init();
    setTimeout(addExportButton, 500);
  }

  // Export for external access
  window.M3GIMPartitur = {
    switchVisualization,
    renderVisualization,
    exportSVG,
    setFocusYear: (year) => {
      focusYear = year;
      updateFocusLine();
    }
  };

})();
