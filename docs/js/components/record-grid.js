/**
 * M³GIM Record Grid Component
 * Displays archive records as cards
 */

import { stateRef } from '../modules/state.js';
import {
  escapeHtml,
  formatDate,
  getDokumenttyp,
  getDokumenttypLabel,
  getAccessStatus
} from '../modules/utils.js';
import { openModal } from './modal.js';
import { findRecordById } from '../services/data-service.js';

// DOM references
let recordGrid, resultCount;

/**
 * Initialize record grid
 */
export function initRecordGrid() {
  recordGrid = document.getElementById('record-grid');
  resultCount = document.getElementById('result-count');
}

/**
 * Render all filtered records as cards
 */
export function renderRecords() {
  if (!recordGrid) return;

  const records = stateRef.filteredRecords;

  if (records.length === 0) {
    recordGrid.innerHTML = '<div class="empty-state">Keine Ergebnisse gefunden</div>';
    updateResultCount();
    return;
  }

  recordGrid.innerHTML = records
    .map(createRecordCardHTML)
    .join('');

  // Attach click handlers
  recordGrid.querySelectorAll('.record-card').forEach(card => {
    card.addEventListener('click', handleCardClick);
  });

  updateResultCount();
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
 * Handle card click - open modal
 */
function handleCardClick(event) {
  const card = event.currentTarget;
  const id = card.dataset.id;
  const record = findRecordById(id);

  if (record) {
    openModal(record);
  }
}

/**
 * Update result count display
 */
export function updateResultCount() {
  if (!resultCount) return;

  const total = stateRef.allRecords.length;
  const shown = stateRef.filteredRecords.length;

  resultCount.textContent = shown === total
    ? `${total} Archiveinheiten`
    : `${shown} von ${total} Archiveinheiten`;
}

/**
 * Show error message in grid
 */
export function showError(message) {
  if (!recordGrid) return;
  recordGrid.innerHTML = `<div class="error-state">${escapeHtml(message)}</div>`;
}
