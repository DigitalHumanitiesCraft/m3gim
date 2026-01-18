/**
 * M³GIM Filter Service
 * Handles filtering of archive records
 */

import { TEKTONIK_STRUKTUR } from '../modules/config.js';
import { setState, stateRef } from '../modules/state.js';
import { getDokumenttyp, isPhoto, getAccessStatus } from '../modules/utils.js';

/**
 * Get current filter state from DOM
 */
export function getFilterState() {
  const searchInput = document.getElementById('search-input');
  const filterDokumenttyp = document.getElementById('filter-dokumenttyp');
  const filterBestand = document.getElementById('filter-bestand');
  const filterZugang = document.getElementById('filter-zugang');

  return {
    searchTerm: searchInput?.value.toLowerCase().trim() || '',
    dokumenttypen: getCheckedValues(filterDokumenttyp),
    bestand: getCheckedValues(filterBestand),
    zugang: getCheckedValues(filterZugang)
  };
}

/**
 * Get checked checkbox values from a container
 */
function getCheckedValues(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll('input:checked'))
    .map(input => input.value);
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

/**
 * Check if record matches tektonik filter
 */
function matchesTektonik(record, tektonikFilter) {
  if (!tektonikFilter) return true;

  const id = record['rico:identifier'] || '';

  if (tektonikFilter.type === 'prefix') {
    return id.includes(tektonikFilter.value);
  }

  if (tektonikFilter.type === 'gruppe') {
    const gruppe = TEKTONIK_STRUKTUR[tektonikFilter.value];
    if (!gruppe) return true;

    if (!id.includes(gruppe.prefix)) return false;

    if (gruppe.excludePrefix) {
      for (const excl of gruppe.excludePrefix) {
        if (id.includes(excl)) return false;
      }
    }
  }

  return true;
}

/**
 * Apply all filters and update state
 */
export function applyFilters() {
  const filters = getFilterState();
  const { tektonikFilter } = stateRef;

  const filteredRecords = stateRef.allRecords.filter(record => {
    // Search filter
    if (filters.searchTerm && !matchesSearch(record, filters.searchTerm)) {
      return false;
    }

    // Tektonik filter
    if (!matchesTektonik(record, tektonikFilter)) {
      return false;
    }

    // Document type filter
    const typ = getDokumenttyp(record);
    if (filters.dokumenttypen.length > 0 && !filters.dokumenttypen.includes(typ)) {
      return false;
    }

    // Collection filter (Objekte vs Fotos)
    const isFoto = isPhoto(record);
    if (filters.bestand.length > 0) {
      if (isFoto && !filters.bestand.includes('fotos')) return false;
      if (!isFoto && !filters.bestand.includes('objekte')) return false;
    }

    // Access status filter
    const zugang = getAccessStatus(record);
    if (filters.zugang.length > 0 && !filters.zugang.includes(zugang)) {
      return false;
    }

    return true;
  });

  setState({ filteredRecords });
  return filteredRecords;
}

/**
 * Set tektonik filter
 */
export function setTektonikFilter(filter) {
  setState({ tektonikFilter: filter });
  return applyFilters();
}

/**
 * Clear tektonik filter
 */
export function clearTektonikFilter() {
  setState({ tektonikFilter: null });
  return applyFilters();
}

/**
 * Count records in a Bestandsgruppe
 */
export function countRecordsInGruppe(gruppeKey) {
  const gruppe = TEKTONIK_STRUKTUR[gruppeKey];
  if (!gruppe) return 0;

  return stateRef.allRecords.filter(record => {
    const id = record['rico:identifier'] || '';
    if (!id.includes(gruppe.prefix)) return false;

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
export function countRecordsWithPrefix(prefix) {
  return stateRef.allRecords.filter(record => {
    const id = record['rico:identifier'] || '';
    return id.includes(prefix);
  }).length;
}
