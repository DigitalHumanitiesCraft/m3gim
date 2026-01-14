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
    dokumenttypCounts: {}
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
     4. Filtering
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
    DOM.modalSignatur.textContent = record['rico:identifier'] || '';
    DOM.modalBody.innerHTML = createModalContentHTML(record);

    DOM.modalOverlay.classList.add('modal-overlay--active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Create HTML content for modal body
   */
  function createModalContentHTML(record) {
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

    // Relations
    addRelationFields(record, rows);

    // Build rows HTML
    html += rows
      .map(([label, value]) => createDetailRowHTML(label, value))
      .join('');

    return html;
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
    if (record['rico:hasOrHadLocation']) {
      rows.push(['Aufnahmeort', record['rico:hasOrHadLocation']]);
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
   * Add relation fields to rows
   */
  function addRelationFields(record, rows) {
    if (record['rico:hasOrHadAgent']) {
      const agents = ensureArray(record['rico:hasOrHadAgent']);
      const agentStr = agents.map(a => `${a.name} (${a.role})`).join(', ');
      rows.push(['Personen/Institutionen', agentStr]);
    }

    if (record['rico:hasOrHadSubject']) {
      const subjects = ensureArray(record['rico:hasOrHadSubject']);
      const subjectStr = subjects.map(s => s.name).join(', ');
      rows.push(['Themen/Werke', subjectStr]);
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

    // Modal
    DOM.modalClose.addEventListener('click', closeModal);
    DOM.modalOverlay.addEventListener('click', handleOverlayClick);
    document.addEventListener('keydown', handleKeydown);
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
    searchInput: document.getElementById('search-input'),
    recordGrid: document.getElementById('record-grid'),
    resultCount: document.getElementById('result-count'),
    filterDokumenttyp: document.getElementById('filter-dokumenttyp'),
    filterBestand: document.getElementById('filter-bestand'),
    filterZugang: document.getElementById('filter-zugang'),
    countObjekte: document.getElementById('count-objekte'),
    countFotos: document.getElementById('count-fotos'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalSignatur: document.getElementById('modal-signatur'),
    modalBody: document.getElementById('modal-body'),
    modalClose: document.getElementById('modal-close')
  };

  /**
   * Initialize the application
   */
  function init() {
    setupEventListeners();
    loadData();
  }

  // Start application
  init();

})();
