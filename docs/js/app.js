/**
 * M³GIM - Digitales Archiv Ira Malaniuk
 * Main Application
 *
 * Modules:
 * 1. Config & Constants
 * 2. State Management
 * 3. Data Loading
 * 4. Filtering
 * 5. Rendering
 * 6. Modal
 * 7. Event Handlers
 * 8. Utilities
 * 9. Initialization
 */

(function() {
  'use strict';

  /* ==========================================================================
     1. Config & Constants
     ========================================================================== */

  const CONFIG = {
    dataUrl: 'data/m3gim.jsonld',
    debounceDelay: 200
  };

  /**
   * Tektonik structure based on archive organization
   *
   * Signatur-Muster in den Daten:
   * - Plakate:      UAKUG/NIM/PL_XX     (25 Einheiten)
   * - Hauptbestand: UAKUG/NIM_XXX      (183 Einheiten, ohne FS/TT/PL)
   * - Fotografien:  UAKUG/NIM_FS_XXX   (228 Einheiten)
   * - Tonträger:    UAKUG/NIM_TT_XX    (1 Einheit)
   */
  const TEKTONIK_STRUKTUR = {
    'Hauptbestand': {
      label: 'Hauptbestand',
      prefix: 'NIM_',
      excludePrefix: ['NIM/PL_', 'NIM_FS_', 'NIM_TT_'],
      children: null  // Keine Unterkategorien in den Daten vorhanden
    },
    'Plakate': {
      label: 'Plakate',
      prefix: 'NIM/PL_'
    },
    'Fotografien': {
      label: 'Fotografien',
      prefix: 'NIM_FS_'
    },
    'Tonträger': {
      label: 'Tonträger',
      prefix: 'NIM_TT_'
    }
  };

  /**
   * Visualization metadata
   */
  const VIZ_INFO = {
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
      title: 'Biografie-Strom',
      description: 'Alluviale Darstellung der Lebens-Trajektorie – Fluss durch Orte, Institutionen, Rollen.',
      ff: ['FF4']
    }
  };

  /**
   * German labels for document types
   */
  const DOKUMENTTYP_LABELS = {
    'Letter': 'Korrespondenz',
    'Contract': 'Vertrag',
    'Article': 'Presse',
    'Program': 'Programm',
    'Poster': 'Plakat',
    'AudioVisualRecord': 'Tonträger',
    'Autobiography': 'Autobiografie',
    'IdentityDocument': 'Identitätsdokument',
    'EducationalRecord': 'Studienunterlagen',
    'List': 'Repertoire',
    'Collection': 'Sammlung',
    'Photograph': 'Fotografie'
  };

  /**
   * German labels for photo types
   */
  const PHOTO_TYPE_LABELS = {
    'sw': 'Schwarz-Weiß',
    'farbe': 'Farbe',
    'digital': 'Digital'
  };

  /**
   * German labels for languages
   */
  const LANGUAGE_LABELS = {
    'de': 'Deutsch',
    'uk': 'Ukrainisch',
    'en': 'Englisch',
    'fr': 'Französisch',
    'it': 'Italienisch'
  };

  /**
   * German labels for scan status
   */
  const SCAN_STATUS_LABELS = {
    'gescannt': 'Gescannt',
    'nicht_gescannt': 'Nicht gescannt',
    'online': 'Online verfügbar'
  };

  /* ==========================================================================
     2. State Management
     ========================================================================== */

  const state = {
    allRecords: [],
    filteredRecords: [],
    dokumenttypCounts: {},
    currentView: 'analyse',  // Default to Analyse view
    currentViz: 'partitur',
    tektonikFilter: null,
    selectedRecord: null
  };

  /* ==========================================================================
     3. Data Loading
     ========================================================================== */

  /**
   * Load JSON-LD data from server
   */
  async function loadData() {
    try {
      const response = await fetch(CONFIG.dataUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      state.allRecords = data['@graph'] || [];

      // Make data available globally for debugging
      window.m3gim = data;

      // Calculate document type counts
      calculateDokumenttypCounts();

      // Update UI counts
      updateBestandCounts();

      // Build filter UI
      buildDokumenttypFilter();

      // Build Tektonik navigation
      buildTektonikNav();

      // Initial render
      applyFilters();

    } catch (error) {
      showError(`Fehler beim Laden: ${error.message}`);
      console.error('Data loading error:', error);
    }
  }

  /**
   * Calculate counts for each document type
   */
  function calculateDokumenttypCounts() {
    state.dokumenttypCounts = {};

    state.allRecords.forEach(record => {
      const typ = getDokumenttyp(record);
      if (typ) {
        state.dokumenttypCounts[typ] = (state.dokumenttypCounts[typ] || 0) + 1;
      }
    });
  }

  /**
   * Update object/photo counts in sidebar
   */
  function updateBestandCounts() {
    const fotos = state.allRecords.filter(isPhoto);
    const objekte = state.allRecords.filter(r => !isPhoto(r));

    DOM.countObjekte.textContent = objekte.length;
    DOM.countFotos.textContent = fotos.length;
  }

  /* ==========================================================================
     4. Tektonik Navigation
     ========================================================================== */

  /**
   * Build the Tektonik navigation tree
   */
  function buildTektonikNav() {
    const container = document.getElementById('tektonik-nav');
    if (!container) return;

    let html = '';

    for (const [key, gruppe] of Object.entries(TEKTONIK_STRUKTUR)) {
      const count = countRecordsInGruppe(key);
      const hasChildren = gruppe.children && Object.keys(gruppe.children).length > 0;

      html += `
        <div class="tektonik-item" data-gruppe="${key}">
          <div class="tektonik-item__row" role="button" tabindex="0">
            <span class="tektonik-item__toggle${hasChildren ? '' : ' tektonik-item__toggle--empty'}">
              ${hasChildren ? '<i data-lucide="chevron-right"></i>' : ''}
            </span>
            <span class="tektonik-item__label">${gruppe.label}</span>
            <span class="tektonik-item__count">${count}</span>
          </div>
          ${hasChildren ? buildTektonikChildren(gruppe.children) : ''}
        </div>
      `;
    }

    container.innerHTML = html;

    // Initialize Lucide icons in the new content
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Attach event listeners
    container.querySelectorAll('.tektonik-item__row').forEach(row => {
      row.addEventListener('click', handleTektonikClick);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTektonikClick(e);
        }
      });
    });
  }

  /**
   * Build child items for Tektonik tree
   */
  function buildTektonikChildren(children) {
    let html = '<div class="tektonik-item__children">';

    for (const [key, child] of Object.entries(children)) {
      const count = countRecordsWithPrefix(child.prefix);
      html += `
        <div class="tektonik-item" data-prefix="${child.prefix}">
          <div class="tektonik-item__row" role="button" tabindex="0">
            <span class="tektonik-item__toggle tektonik-item__toggle--empty"></span>
            <span class="tektonik-item__label">${key}</span>
            <span class="tektonik-item__count">${count}</span>
          </div>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  /**
   * Count records in a Bestandsgruppe
   */
  function countRecordsInGruppe(gruppeKey) {
    const gruppe = TEKTONIK_STRUKTUR[gruppeKey];
    if (!gruppe) return 0;

    return state.allRecords.filter(record => {
      const id = record['rico:identifier'] || '';
      if (!id.includes(gruppe.prefix)) return false;

      // Exclude if matches any exclude prefix
      if (gruppe.excludePrefix) {
        for (const excl of gruppe.excludePrefix) {
          if (id.includes(excl)) return false;
        }
      }
      return true;
    }).length;
  }

  /**
   * Count records with a specific prefix
   */
  function countRecordsWithPrefix(prefix) {
    return state.allRecords.filter(record => {
      const id = record['rico:identifier'] || '';
      return id.includes(prefix);
    }).length;
  }

  /**
   * Handle Tektonik item click
   */
  function handleTektonikClick(event) {
    const item = event.target.closest('.tektonik-item');
    const row = item.querySelector('.tektonik-item__row');
    const children = item.querySelector('.tektonik-item__children');
    const toggle = item.querySelector('.tektonik-item__toggle');

    // Toggle children visibility
    if (children) {
      children.classList.toggle('tektonik-item__children--expanded');
      toggle.classList.toggle('tektonik-item__toggle--expanded');
    }

    // Set filter
    const gruppe = item.dataset.gruppe;
    const prefix = item.dataset.prefix;

    // Remove active from all
    document.querySelectorAll('.tektonik-item__row--active').forEach(el => {
      el.classList.remove('tektonik-item__row--active');
    });

    // Set active
    row.classList.add('tektonik-item__row--active');

    // Update filter state
    if (prefix) {
      state.tektonikFilter = { type: 'prefix', value: prefix };
    } else if (gruppe) {
      state.tektonikFilter = { type: 'gruppe', value: gruppe };
    }

    applyFilters();
  }

  /**
   * Clear Tektonik filter
   */
  function clearTektonikFilter() {
    state.tektonikFilter = null;
    document.querySelectorAll('.tektonik-item__row--active').forEach(el => {
      el.classList.remove('tektonik-item__row--active');
    });
    applyFilters();
  }

  /* ==========================================================================
     5. View Switching
     ========================================================================== */

  /**
   * Switch between Archiv and Analyse views
   */
  function switchView(view) {
    state.currentView = view;

    // Update tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const isActive = tab.dataset.view === view;
      tab.classList.toggle('nav-tab--active', isActive);
      tab.setAttribute('aria-selected', isActive);
    });

    // Update sidebar visibility (only show sidebar for archiv view)
    if (DOM.sidebarArchiv) {
      DOM.sidebarArchiv.classList.toggle('sidebar--hidden', view !== 'archiv');
    }
    // Old analyse sidebar is deprecated, always hidden (if it exists)
    if (DOM.sidebarAnalyse) {
      DOM.sidebarAnalyse.classList.add('sidebar--hidden');
    }

    // Update content areas
    if (DOM.contentArchiv) {
      DOM.contentArchiv.classList.toggle('content--hidden', view !== 'archiv');
    }
    if (DOM.contentAnalyse) {
      DOM.contentAnalyse.classList.toggle('content--hidden', view !== 'analyse');
    }

    // Update search placeholder
    DOM.searchInput.placeholder = view === 'archiv'
      ? 'Suche in Titeln und Beschreibungen...'
      : 'Suche in Visualisierung...';
  }

  /**
   * Switch visualization type
   */
  function switchVisualization(viz) {
    state.currentViz = viz;

    // Update buttons
    document.querySelectorAll('.viz-tab').forEach(btn => {
      const isActive = btn.dataset.viz === viz;
      btn.classList.toggle('viz-tab--active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });

    // Update controls visibility
    document.querySelectorAll('.viz-controls').forEach(ctrl => {
      ctrl.classList.add('viz-controls--hidden');
    });
    const activeControls = document.getElementById(`controls-${viz}`);
    if (activeControls) {
      activeControls.classList.remove('viz-controls--hidden');
    }

    // Update viz header
    const info = VIZ_INFO[viz];
    if (info) {
      DOM.vizTitle.textContent = info.title;
      DOM.vizDescription.textContent = info.description;
    }
  }

  /* ==========================================================================
     6. Filtering
     ========================================================================== */

  /**
   * Build document type filter checkboxes
   */
  function buildDokumenttypFilter() {
    const sortedTypes = Object.entries(state.dokumenttypCounts)
      .sort((a, b) => b[1] - a[1]);

    DOM.filterDokumenttyp.innerHTML = sortedTypes
      .map(([typ, count]) => createFilterOptionHTML(typ, count))
      .join('');

    // Attach event listeners
    DOM.filterDokumenttyp.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', applyFilters);
    });
  }

  /**
   * Create HTML for a filter checkbox option
   */
  function createFilterOptionHTML(typ, count) {
    return `
      <label class="filter-option">
        <input type="checkbox" value="${typ}" checked>
        <span class="filter-option__label">${getDokumenttypLabel(typ)}</span>
        <span class="filter-option__count">${count}</span>
      </label>
    `;
  }

  /**
   * Get current filter selections
   */
  function getFilterState() {
    return {
      searchTerm: DOM.searchInput.value.toLowerCase().trim(),
      dokumenttypen: getCheckedValues(DOM.filterDokumenttyp),
      bestand: getCheckedValues(DOM.filterBestand),
      zugang: getCheckedValues(DOM.filterZugang)
    };
  }

  /**
   * Get checked checkbox values from a container
   */
  function getCheckedValues(container) {
    return Array.from(container.querySelectorAll('input:checked'))
      .map(input => input.value);
  }

  /**
   * Apply all filters and re-render
   */
  function applyFilters() {
    const filters = getFilterState();

    state.filteredRecords = state.allRecords.filter(record => {
      // Search filter
      if (filters.searchTerm && !matchesSearch(record, filters.searchTerm)) {
        return false;
      }

      // Tektonik filter
      if (state.tektonikFilter) {
        const id = record['rico:identifier'] || '';
        if (state.tektonikFilter.type === 'prefix') {
          if (!id.includes(state.tektonikFilter.value)) return false;
        } else if (state.tektonikFilter.type === 'gruppe') {
          const gruppe = TEKTONIK_STRUKTUR[state.tektonikFilter.value];
          if (gruppe) {
            if (!id.includes(gruppe.prefix)) return false;
            if (gruppe.excludePrefix) {
              for (const excl of gruppe.excludePrefix) {
                if (id.includes(excl)) return false;
              }
            }
          }
        }
      }

      // Document type filter
      const typ = getDokumenttyp(record);
      if (!filters.dokumenttypen.includes(typ)) {
        return false;
      }

      // Collection filter (Objekte vs Fotos)
      const isFoto = isPhoto(record);
      if (isFoto && !filters.bestand.includes('fotos')) return false;
      if (!isFoto && !filters.bestand.includes('objekte')) return false;

      // Access status filter
      const zugang = getAccessStatus(record);
      if (!filters.zugang.includes(zugang)) return false;

      return true;
    });

    renderRecords();
    updateResultCount();
  }

  /**
   * Check if record matches search term
   */
  function matchesSearch(record, term) {
    const searchFields = [
      record['rico:title'] || '',
      record['rico:scopeAndContent'] || '',
      record['rico:identifier'] || ''
    ];

    return searchFields.some(field =>
      field.toLowerCase().includes(term)
    );
  }

  /* ==========================================================================
     5. Rendering
     ========================================================================== */

  /**
   * Render all filtered records as cards
   */
  function renderRecords() {
    if (state.filteredRecords.length === 0) {
      DOM.recordGrid.innerHTML = '<div class="empty-state">Keine Ergebnisse gefunden</div>';
      return;
    }

    DOM.recordGrid.innerHTML = state.filteredRecords
      .map(createRecordCardHTML)
      .join('');

    // Attach click handlers
    DOM.recordGrid.querySelectorAll('.record-card').forEach(card => {
      card.addEventListener('click', handleCardClick);
    });
  }

  /**
   * Create HTML for a record card
   */
  function createRecordCardHTML(record) {
    const signatur = record['rico:identifier'] || '';
    const title = record['rico:title'] || 'Ohne Titel';
    const date = record['rico:date'] || '';
    const typ = getDokumenttyp(record);
    const status = getAccessStatus(record);

    return `
      <article class="record-card" data-id="${record['@id']}">
        <div class="record-card__header">
          <span class="record-card__signatur">${signatur}</span>
          <span class="status-badge status-badge--${status}">${status}</span>
        </div>
        <span class="type-badge">${getDokumenttypLabel(typ)}</span>
        <h3 class="record-card__title">${escapeHtml(title)}</h3>
        ${date ? `<div class="record-card__date">${formatDate(date)}</div>` : ''}
      </article>
    `;
  }

  /**
   * Update result count display
   */
  function updateResultCount() {
    const total = state.allRecords.length;
    const shown = state.filteredRecords.length;

    DOM.resultCount.textContent = shown === total
      ? `${total} Archiveinheiten`
      : `${shown} von ${total} Archiveinheiten`;
  }

  /**
   * Show error message
   */
  function showError(message) {
    DOM.recordGrid.innerHTML = `<div class="error-state">${escapeHtml(message)}</div>`;
  }

  /* ==========================================================================
     6. Modal
     ========================================================================== */

  /**
   * Open detail modal for a record
   */
  function openModal(record) {
    state.selectedRecord = record;

    // Set signatur and breadcrumb
    const signatur = record['rico:identifier'] || '';
    DOM.modalSignatur.textContent = signatur;
    DOM.modalBreadcrumb.textContent = getBreadcrumb(signatur);

    // Populate core section
    DOM.modalCore.innerHTML = createCoreContentHTML(record);

    // Populate provenienz section
    populateProvenienz(record);

    // Populate relations sections
    populateRelations(record);

    DOM.modalOverlay.classList.add('modal-overlay--active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Get breadcrumb path from signatur
   */
  function getBreadcrumb(signatur) {
    const parts = signatur.split('/');
    if (parts.length < 2) return signatur;

    // Determine Bestandsgruppe
    let bestandsgruppe = 'Hauptbestand';
    if (signatur.includes('_PL_')) bestandsgruppe = 'Plakate';
    else if (signatur.includes('_F_')) bestandsgruppe = 'Fotografien';
    else if (signatur.includes('_T_')) bestandsgruppe = 'Tonträger';

    return `${parts[0]} / ${parts[1]} / ${bestandsgruppe}`;
  }

  /**
   * Create HTML content for modal core section
   */
  function createCoreContentHTML(record) {
    const typ = getDokumenttyp(record);
    const isFoto = typ === 'Photograph';
    const rows = [];

    // Title
    let html = `<h3 class="modal__title">${escapeHtml(record['rico:title'] || 'Ohne Titel')}</h3>`;

    // Common fields
    if (record['rico:date']) {
      rows.push(['Datum', formatDate(record['rico:date'])]);
    }

    rows.push(['Dokumenttyp', getDokumenttypLabel(typ)]);

    if (record['m3gim:accessStatus']) {
      rows.push(['Zugänglichkeit', record['m3gim:accessStatus']]);
    }

    // Type-specific fields
    if (isFoto) {
      addPhotoFields(record, rows);
    } else {
      addObjectFields(record, rows);
    }

    // Build rows HTML
    html += rows
      .map(([label, value]) => createDetailRowHTML(label, value))
      .join('');

    return html;
  }

  /**
   * Populate provenienz section
   */
  function populateProvenienz(record) {
    const provenienzContent = DOM.provenienzContent;
    if (!provenienzContent) return;

    // Default provenienz info (could be extended with actual data)
    provenienzContent.innerHTML = `
      <div class="detail-row">
        <span class="detail-row__label">Übernommen</span>
        <span class="detail-row__value">2015 vom Nachlass der Künstlerin</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Vorbesitz</span>
        <span class="detail-row__value">Privatbesitz Ira Malaniuk, Zürich</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Bearbeitung</span>
        <span class="detail-row__value">Erschließung 2026 (Projekt M³GIM)</span>
      </div>
    `;
  }

  /**
   * Populate relations sections in modal
   */
  function populateRelations(record) {
    // Get relation data
    const agents = ensureArray(record['rico:hasOrHadAgent'] || []);
    const subjects = ensureArray(record['rico:hasOrHadSubject'] || []);
    const locations = ensureArray(record['rico:hasOrHadLocation'] || []);

    // Categorize agents into persons and institutions
    const persons = agents.filter(a => !a.type || a.type === 'person');
    const institutions = agents.filter(a => a.type === 'institution');

    // Categorize subjects into werke and ereignisse
    const werke = subjects.filter(s => s.type === 'werk' || !s.type);
    const ereignisse = subjects.filter(s => s.type === 'ereignis');

    // Populate lists
    populateRelationList('list-personen', persons, 'relations-personen');
    populateRelationList('list-institutionen', institutions, 'relations-institutionen');
    populateRelationList('list-orte', locations, 'relations-orte');
    populateRelationList('list-werke', werke, 'relations-werke');
    populateRelationList('list-ereignisse', ereignisse, 'relations-ereignisse');
  }

  /**
   * Populate a single relation list
   */
  function populateRelationList(listId, items, groupId) {
    const list = document.getElementById(listId);
    const group = document.getElementById(groupId);

    if (!list || !group) return;

    if (!items || items.length === 0) {
      group.classList.add('relation-group--empty');
      list.innerHTML = '';
      return;
    }

    group.classList.remove('relation-group--empty');
    list.innerHTML = items.map(item => {
      const name = item.name || item;
      const role = item.role ? ` (${item.role})` : '';
      return `
        <li class="relation-list__item">
          <span class="relation-list__name">${escapeHtml(name)}</span>
          <span class="relation-list__role">${escapeHtml(role)}</span>
        </li>
      `;
    }).join('');
  }

  /**
   * Add photo-specific fields to rows
   */
  function addPhotoFields(record, rows) {
    if (record['rico:scopeAndContent']) {
      rows.push(['Beschreibung', record['rico:scopeAndContent']]);
    }
    if (record['m3gim:photographerName']) {
      rows.push(['Fotograf', record['m3gim:photographerName']]);
    }
    if (record['rico:physicalOrLogicalExtent']) {
      rows.push(['Format', record['rico:physicalOrLogicalExtent']]);
    }
    if (record['m3gim:photoType']) {
      rows.push(['Fototyp', PHOTO_TYPE_LABELS[record['m3gim:photoType']] || record['m3gim:photoType']]);
    }
  }

  /**
   * Add object-specific fields to rows
   */
  function addObjectFields(record, rows) {
    if (record['rico:hasLanguage']) {
      rows.push(['Sprache', LANGUAGE_LABELS[record['rico:hasLanguage']] || record['rico:hasLanguage']]);
    }
    if (record['rico:physicalOrLogicalExtent']) {
      rows.push(['Umfang', record['rico:physicalOrLogicalExtent']]);
    }
    if (record['m3gim:digitizationStatus']) {
      rows.push(['Digitalisierung', SCAN_STATUS_LABELS[record['m3gim:digitizationStatus']] || record['m3gim:digitizationStatus']]);
    }
  }

  /**
   * Create HTML for a detail row
   */
  function createDetailRowHTML(label, value) {
    return `
      <div class="detail-row">
        <span class="detail-row__label">${label}</span>
        <span class="detail-row__value">${escapeHtml(String(value))}</span>
      </div>
    `;
  }

  /**
   * Close the modal
   */
  function closeModal() {
    DOM.modalOverlay.classList.remove('modal-overlay--active');
    document.body.style.overflow = '';
  }

  /* ==========================================================================
     7. Event Handlers
     ========================================================================== */

  /**
   * Handle card click - open modal
   */
  function handleCardClick(event) {
    const card = event.currentTarget;
    const id = card.dataset.id;
    const record = state.allRecords.find(r => r['@id'] === id);

    if (record) {
      openModal(record);
    }
  }

  /**
   * Handle modal overlay click - close if clicking outside
   */
  function handleOverlayClick(event) {
    if (event.target === DOM.modalOverlay) {
      closeModal();
    }
  }

  /**
   * Handle keyboard events
   */
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }

  /**
   * Setup all event listeners
   */
  function setupEventListeners() {
    // Search
    DOM.searchInput.addEventListener('input', debounce(applyFilters, CONFIG.debounceDelay));

    // Filters
    DOM.filterBestand.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', applyFilters);
    });

    DOM.filterZugang.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', applyFilters);
    });

    // View tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => switchView(tab.dataset.view));
    });

    // Visualization selector
    document.querySelectorAll('.viz-tab').forEach(btn => {
      btn.addEventListener('click', () => switchVisualization(btn.dataset.viz));
    });

    // Network threshold slider
    if (DOM.networkThreshold) {
      DOM.networkThreshold.addEventListener('input', () => {
        DOM.thresholdValue.textContent = DOM.networkThreshold.value;
      });
    }

    // Modal
    DOM.modalClose.addEventListener('click', closeModal);
    DOM.modalOverlay.addEventListener('click', handleOverlayClick);
    document.addEventListener('keydown', handleKeydown);

    // Modal actions
    if (DOM.modalJson) {
      DOM.modalJson.addEventListener('click', showJsonLd);
    }
    if (DOM.modalAnalyse) {
      DOM.modalAnalyse.addEventListener('click', openInAnalyse);
    }
  }

  /**
   * Show JSON-LD for current record
   */
  function showJsonLd() {
    if (!state.selectedRecord) return;

    const jsonStr = JSON.stringify(state.selectedRecord, null, 2);
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
      <html>
        <head><title>JSON-LD - ${state.selectedRecord['rico:identifier']}</title></head>
        <body style="font-family: monospace; white-space: pre; padding: 20px; background: #f5f5f5;">
${escapeHtml(jsonStr)}
        </body>
      </html>
    `);
  }

  /**
   * Open current record in Analyse view
   */
  function openInAnalyse() {
    closeModal();
    switchView('analyse');
    // Future: highlight the record in the visualization
  }

  /* ==========================================================================
     8. Utilities
     ========================================================================== */

  /**
   * Get document type from record
   */
  function getDokumenttyp(record) {
    const dft = record['rico:hasDocumentaryFormType'];
    if (!dft) return null;

    const id = dft['@id'] || '';
    return id.replace('m3gim-dft:', '');
  }

  /**
   * Get German label for document type
   */
  function getDokumenttypLabel(typ) {
    return DOKUMENTTYP_LABELS[typ] || typ || 'Unbekannt';
  }

  /**
   * Check if record is a photo
   */
  function isPhoto(record) {
    return getDokumenttyp(record) === 'Photograph';
  }

  /**
   * Get access status from record
   */
  function getAccessStatus(record) {
    return record['m3gim:accessStatus'] || 'offen';
  }

  /**
   * Format date for display
   */
  function formatDate(dateStr) {
    if (!dateStr) return '';

    // Handle date ranges
    if (dateStr.includes('/')) {
      const [from, to] = dateStr.split('/');
      return `${formatSingleDate(from)} – ${formatSingleDate(to)}`;
    }

    return formatSingleDate(dateStr);
  }

  /**
   * Format a single date value
   */
  function formatSingleDate(dateStr) {
    if (!dateStr) return '';

    // Year only (1958)
    if (/^\d{4}$/.test(dateStr)) {
      return dateStr;
    }

    // Year-Month (1958-04)
    if (/^\d{4}-\d{2}$/.test(dateStr)) {
      const [y, m] = dateStr.split('-');
      return `${m}/${y}`;
    }

    // Full date (1958-04-18)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-');
      return `${d}.${m}.${y}`;
    }

    return dateStr;
  }

  /**
   * Escape HTML special characters
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Ensure value is an array
   */
  function ensureArray(value) {
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Debounce function calls
   */
  function debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /* ==========================================================================
     9. Initialization
     ========================================================================== */

  /**
   * DOM element references
   */
  const DOM = {
    // Search & Grid
    searchInput: document.getElementById('search-input'),
    recordGrid: document.getElementById('record-grid'),
    resultCount: document.getElementById('result-count'),

    // Filters
    filterDokumenttyp: document.getElementById('filter-dokumenttyp'),
    filterBestand: document.getElementById('filter-bestand'),
    filterZugang: document.getElementById('filter-zugang'),
    countObjekte: document.getElementById('count-objekte'),
    countFotos: document.getElementById('count-fotos'),

    // View areas
    sidebarArchiv: document.getElementById('sidebar-archiv'),
    sidebarAnalyse: document.getElementById('sidebar-analyse'),
    contentArchiv: document.getElementById('content-archiv'),
    contentAnalyse: document.getElementById('content-analyse'),

    // Visualization
    vizTitle: document.getElementById('viz-title'),
    vizDescription: document.getElementById('viz-description'),
    networkThreshold: document.getElementById('network-threshold'),
    thresholdValue: document.getElementById('threshold-value'),

    // Modal
    modalOverlay: document.getElementById('modal-overlay'),
    modalSignatur: document.getElementById('modal-signatur'),
    modalBreadcrumb: document.getElementById('modal-breadcrumb'),
    modalBody: document.getElementById('modal-body'),
    modalCore: document.getElementById('modal-core'),
    modalClose: document.getElementById('modal-close'),
    provenienzContent: document.getElementById('provenienz-content'),
    modalJson: document.getElementById('modal-json'),
    modalAnalyse: document.getElementById('modal-analyse')
  };

  /**
   * Initialize the application
   */
  function init() {
    setupEventListeners();
    loadData();
    // Initialize with the default view (analyse)
    switchView(state.currentView);
  }

  // Start application
  init();

})();
