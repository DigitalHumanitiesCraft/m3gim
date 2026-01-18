/**
 * M³GIM Filter Components
 * Document type and other filter controls
 */

import { CONFIG } from '../modules/config.js';
import { stateRef } from '../modules/state.js';
import { debounce, getDokumenttypLabel } from '../modules/utils.js';
import { applyFilters } from '../services/filter-service.js';
import { renderRecords } from './record-grid.js';

// DOM references
let filterDokumenttyp, filterBestand, filterZugang;
let countObjekte, countFotos, searchInput;

/**
 * Initialize filter components
 */
export function initFilters() {
  filterDokumenttyp = document.getElementById('filter-dokumenttyp');
  filterBestand = document.getElementById('filter-bestand');
  filterZugang = document.getElementById('filter-zugang');
  countObjekte = document.getElementById('count-objekte');
  countFotos = document.getElementById('count-fotos');
  searchInput = document.getElementById('search-input');

  setupFilterListeners();
}

/**
 * Setup filter event listeners
 */
function setupFilterListeners() {
  // Search
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleFilterChange, CONFIG.debounceDelay));
  }

  // Bestand filter
  if (filterBestand) {
    filterBestand.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', handleFilterChange);
    });
  }

  // Zugang filter
  if (filterZugang) {
    filterZugang.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', handleFilterChange);
    });
  }
}

/**
 * Handle filter change
 */
function handleFilterChange() {
  applyFilters();
  renderRecords();
}

/**
 * Build document type filter checkboxes
 */
export function buildDokumenttypFilter() {
  if (!filterDokumenttyp) return;

  const sortedTypes = Object.entries(stateRef.dokumenttypCounts)
    .sort((a, b) => b[1] - a[1]);

  filterDokumenttyp.innerHTML = sortedTypes
    .map(([typ, count]) => createFilterOptionHTML(typ, count))
    .join('');

  // Attach event listeners
  filterDokumenttyp.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', handleFilterChange);
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
 * Update object/photo counts in sidebar
 */
export function updateBestandCounts(objekte, fotos) {
  if (countObjekte) countObjekte.textContent = objekte;
  if (countFotos) countFotos.textContent = fotos;
}
