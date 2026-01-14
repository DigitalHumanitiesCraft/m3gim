/**
 * M³GIM - Digitales Archiv Ira Malaniuk
 * MVP: Katalog mit Suche, Filter und Detailansicht
 */

(function() {
  // State
  let allRecords = [];
  let filteredRecords = [];
  let dokumenttypCounts = {};

  // DOM Elements
  const searchInput = document.getElementById('search-input');
  const recordGrid = document.getElementById('record-grid');
  const resultCount = document.getElementById('result-count');
  const filterDokumenttyp = document.getElementById('filter-dokumenttyp');
  const filterBestand = document.getElementById('filter-bestand');
  const filterZugang = document.getElementById('filter-zugang');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalSignatur = document.getElementById('modal-signatur');
  const modalBody = document.getElementById('modal-body');
  const modalClose = document.getElementById('modal-close');

  // Dokumenttyp Labels (German)
  const dokumenttypLabels = {
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

  // Helper: Get dokumenttyp from record
  function getDokumenttyp(record) {
    const dft = record['rico:hasDocumentaryFormType'];
    if (!dft) return null;
    const id = dft['@id'] || '';
    return id.replace('m3gim-dft:', '');
  }

  // Helper: Get German label for dokumenttyp
  function getDokumenttypLabel(typ) {
    return dokumenttypLabels[typ] || typ || 'Unbekannt';
  }

  // Helper: Check if record is a photo
  function isPhoto(record) {
    return getDokumenttyp(record) === 'Photograph';
  }

  // Helper: Get access status
  function getAccessStatus(record) {
    return record['m3gim:accessStatus'] || 'offen';
  }

  // Helper: Format date for display
  function formatDate(dateStr) {
    if (!dateStr) return '';
    // Handle date ranges (1958-04-18/1958-04-30)
    if (dateStr.includes('/')) {
      const [from, to] = dateStr.split('/');
      return `${formatSingleDate(from)} – ${formatSingleDate(to)}`;
    }
    return formatSingleDate(dateStr);
  }

  function formatSingleDate(dateStr) {
    if (!dateStr) return '';
    // Year only
    if (/^\d{4}$/.test(dateStr)) return dateStr;
    // Year-Month
    if (/^\d{4}-\d{2}$/.test(dateStr)) {
      const [y, m] = dateStr.split('-');
      return `${m}/${y}`;
    }
    // Full date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-');
      return `${d}.${m}.${y}`;
    }
    return dateStr;
  }

  // Load data
  async function loadData() {
    try {
      const response = await fetch('data/m3gim.jsonld');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      allRecords = data['@graph'] || [];
      window.m3gim = data; // For console access

      // Count dokumenttypen
      dokumenttypCounts = {};
      allRecords.forEach(r => {
        const typ = getDokumenttyp(r);
        if (typ) {
          dokumenttypCounts[typ] = (dokumenttypCounts[typ] || 0) + 1;
        }
      });

      // Update counts in sidebar
      const fotos = allRecords.filter(isPhoto);
      const objekte = allRecords.filter(r => !isPhoto(r));
      document.getElementById('count-objekte').textContent = objekte.length;
      document.getElementById('count-fotos').textContent = fotos.length;

      // Build dokumenttyp filter
      buildDokumenttypFilter();

      // Initial render
      applyFilters();

    } catch (error) {
      recordGrid.innerHTML = `<div class="empty-state">Fehler beim Laden: ${error.message}</div>`;
      console.error('Ladefehler:', error);
    }
  }

  // Build dokumenttyp filter checkboxes
  function buildDokumenttypFilter() {
    // Sort by count descending, but put Photograph first (most common)
    const sortedTypes = Object.entries(dokumenttypCounts)
      .sort((a, b) => b[1] - a[1]);

    filterDokumenttyp.innerHTML = sortedTypes.map(([typ, count]) => `
      <label class="filter-option">
        <input type="checkbox" value="${typ}" checked>
        <span>${getDokumenttypLabel(typ)}</span>
        <span class="count">${count}</span>
      </label>
    `).join('');

    // Add event listeners
    filterDokumenttyp.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', applyFilters);
    });
  }

  // Get current filter state
  function getFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    const selectedDokumenttypen = Array.from(
      filterDokumenttyp.querySelectorAll('input:checked')
    ).map(i => i.value);

    const selectedBestand = Array.from(
      filterBestand.querySelectorAll('input:checked')
    ).map(i => i.value);

    const selectedZugang = Array.from(
      filterZugang.querySelectorAll('input:checked')
    ).map(i => i.value);

    return { searchTerm, selectedDokumenttypen, selectedBestand, selectedZugang };
  }

  // Apply filters and render
  function applyFilters() {
    const { searchTerm, selectedDokumenttypen, selectedBestand, selectedZugang } = getFilters();

    filteredRecords = allRecords.filter(record => {
      // Search filter
      if (searchTerm) {
        const title = (record['rico:title'] || '').toLowerCase();
        const desc = (record['rico:scopeAndContent'] || '').toLowerCase();
        const sig = (record['rico:identifier'] || '').toLowerCase();
        if (!title.includes(searchTerm) && !desc.includes(searchTerm) && !sig.includes(searchTerm)) {
          return false;
        }
      }

      // Dokumenttyp filter
      const typ = getDokumenttyp(record);
      if (!selectedDokumenttypen.includes(typ)) {
        return false;
      }

      // Bestand filter (Objekte vs Fotos)
      const isFoto = isPhoto(record);
      if (isFoto && !selectedBestand.includes('fotos')) return false;
      if (!isFoto && !selectedBestand.includes('objekte')) return false;

      // Zugänglichkeit filter
      const zugang = getAccessStatus(record);
      if (!selectedZugang.includes(zugang)) return false;

      return true;
    });

    renderRecords();
    updateResultCount();
  }

  // Render record cards
  function renderRecords() {
    if (filteredRecords.length === 0) {
      recordGrid.innerHTML = '<div class="empty-state">Keine Ergebnisse gefunden</div>';
      return;
    }

    recordGrid.innerHTML = filteredRecords.map(record => {
      const signatur = record['rico:identifier'] || '';
      const title = record['rico:title'] || 'Ohne Titel';
      const date = record['rico:date'] || '';
      const typ = getDokumenttyp(record);
      const typLabel = getDokumenttypLabel(typ);
      const status = getAccessStatus(record);

      return `
        <article class="record-card" data-id="${record['@id']}">
          <div class="record-card-header">
            <span class="record-signatur">${signatur}</span>
            <span class="record-status ${status}">${status}</span>
          </div>
          <span class="record-type">${typLabel}</span>
          <h3 class="record-title">${escapeHtml(title)}</h3>
          ${date ? `<div class="record-date">${formatDate(date)}</div>` : ''}
        </article>
      `;
    }).join('');

    // Add click handlers
    recordGrid.querySelectorAll('.record-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const record = allRecords.find(r => r['@id'] === id);
        if (record) openModal(record);
      });
    });
  }

  // Update result count
  function updateResultCount() {
    const total = allRecords.length;
    const shown = filteredRecords.length;
    if (shown === total) {
      resultCount.textContent = `${total} Archiveinheiten`;
    } else {
      resultCount.textContent = `${shown} von ${total} Archiveinheiten`;
    }
  }

  // Open detail modal
  function openModal(record) {
    modalSignatur.textContent = record['rico:identifier'] || '';

    const typ = getDokumenttyp(record);
    const isFoto = typ === 'Photograph';

    // Build detail rows based on record type
    let html = `<h3>${escapeHtml(record['rico:title'] || 'Ohne Titel')}</h3>`;

    const rows = [];

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
        const photoTypes = { 'sw': 'Schwarz-Weiß', 'farbe': 'Farbe', 'digital': 'Digital' };
        rows.push(['Fototyp', photoTypes[record['m3gim:photoType']] || record['m3gim:photoType']]);
      }
      if (record['rico:hasOrHadLocation']) {
        rows.push(['Aufnahmeort', record['rico:hasOrHadLocation']]);
      }
    } else {
      if (record['rico:hasLanguage']) {
        const languages = { 'de': 'Deutsch', 'uk': 'Ukrainisch', 'en': 'Englisch', 'fr': 'Französisch', 'it': 'Italienisch' };
        rows.push(['Sprache', languages[record['rico:hasLanguage']] || record['rico:hasLanguage']]);
      }
      if (record['rico:physicalOrLogicalExtent']) {
        rows.push(['Umfang', record['rico:physicalOrLogicalExtent']]);
      }
      if (record['m3gim:digitizationStatus']) {
        const scanStatus = { 'gescannt': 'Gescannt', 'nicht_gescannt': 'Nicht gescannt', 'online': 'Online verfügbar' };
        rows.push(['Digitalisierung', scanStatus[record['m3gim:digitizationStatus']] || record['m3gim:digitizationStatus']]);
      }
    }

    // Relations (if any)
    if (record['rico:hasOrHadAgent']) {
      const agents = Array.isArray(record['rico:hasOrHadAgent'])
        ? record['rico:hasOrHadAgent']
        : [record['rico:hasOrHadAgent']];
      const agentStr = agents.map(a => `${a.name} (${a.role})`).join(', ');
      rows.push(['Personen/Institutionen', agentStr]);
    }

    if (record['rico:hasOrHadSubject']) {
      const subjects = Array.isArray(record['rico:hasOrHadSubject'])
        ? record['rico:hasOrHadSubject']
        : [record['rico:hasOrHadSubject']];
      const subjectStr = subjects.map(s => s.name).join(', ');
      rows.push(['Themen/Werke', subjectStr]);
    }

    html += rows.map(([label, value]) => `
      <div class="detail-row">
        <span class="detail-label">${label}</span>
        <span class="detail-value">${escapeHtml(String(value))}</span>
      </div>
    `).join('');

    modalBody.innerHTML = html;
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Close modal
  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Escape HTML
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Event listeners
  searchInput.addEventListener('input', debounce(applyFilters, 200));

  filterBestand.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', applyFilters);
  });

  filterZugang.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', applyFilters);
  });

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Debounce helper
  function debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Init
  loadData();
})();
