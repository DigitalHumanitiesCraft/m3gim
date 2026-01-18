/**
 * M³GIM Modal Component
 * Document detail modal
 */

import { setState, stateRef } from '../modules/state.js';
import {
  escapeHtml,
  ensureArray,
  formatDate,
  getDokumenttyp,
  getDokumenttypLabel
} from '../modules/utils.js';
import { PHOTO_TYPE_LABELS, LANGUAGE_LABELS, SCAN_STATUS_LABELS } from '../modules/config.js';

// DOM references
let modalOverlay, modalSignatur, modalBreadcrumb, modalCore, modalClose;
let provenienzContent;

/**
 * Initialize modal component
 */
export function initModal() {
  modalOverlay = document.getElementById('modal-overlay');
  modalSignatur = document.getElementById('modal-signatur');
  modalBreadcrumb = document.getElementById('modal-breadcrumb');
  modalCore = document.getElementById('modal-core');
  modalClose = document.getElementById('modal-close');
  provenienzContent = document.getElementById('provenienz-content');

  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', handleOverlayClick);
  }
  document.addEventListener('keydown', handleKeydown);

  // Modal action buttons
  const modalJson = document.getElementById('modal-json');
  const modalAnalyse = document.getElementById('modal-analyse');

  if (modalJson) {
    modalJson.addEventListener('click', showJsonLd);
  }
  if (modalAnalyse) {
    modalAnalyse.addEventListener('click', openInAnalyse);
  }
}

/**
 * Open detail modal for a record
 */
export function openModal(record) {
  setState({ selectedRecord: record });

  // Set signatur and breadcrumb
  const signatur = record['rico:identifier'] || '';
  if (modalSignatur) modalSignatur.textContent = signatur;
  if (modalBreadcrumb) modalBreadcrumb.textContent = getBreadcrumb(signatur);

  // Populate core section
  if (modalCore) modalCore.innerHTML = createCoreContentHTML(record);

  // Populate provenienz section
  populateProvenienz(record);

  // Populate relations sections
  populateRelations(record);

  if (modalOverlay) {
    modalOverlay.classList.add('modal-overlay--active');
  }
  document.body.style.overflow = 'hidden';
}

/**
 * Close the modal
 */
export function closeModal() {
  if (modalOverlay) {
    modalOverlay.classList.remove('modal-overlay--active');
  }
  document.body.style.overflow = '';
}

/**
 * Get breadcrumb path from signatur
 */
function getBreadcrumb(signatur) {
  const parts = signatur.split('/');
  if (parts.length < 2) return signatur;

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

  let html = `<h3 class="modal__title">${escapeHtml(record['rico:title'] || 'Ohne Titel')}</h3>`;

  if (record['rico:date']) {
    rows.push(['Datum', formatDate(record['rico:date'])]);
  }

  rows.push(['Dokumenttyp', getDokumenttypLabel(typ)]);

  if (record['m3gim:accessStatus']) {
    rows.push(['Zugänglichkeit', record['m3gim:accessStatus']]);
  }

  if (isFoto) {
    addPhotoFields(record, rows);
  } else {
    addObjectFields(record, rows);
  }

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
 * Populate provenienz section
 */
function populateProvenienz(record) {
  if (!provenienzContent) return;

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
  const agents = ensureArray(record['rico:hasOrHadAgent'] || []);
  const subjects = ensureArray(record['rico:hasOrHadSubject'] || []);
  const locations = ensureArray(record['rico:hasOrHadLocation'] || []);

  const persons = agents.filter(a => !a.type || a.type === 'person');
  const institutions = agents.filter(a => a.type === 'institution');

  const werke = subjects.filter(s => s.type === 'werk' || !s.type);
  const ereignisse = subjects.filter(s => s.type === 'ereignis');

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
 * Handle modal overlay click
 */
function handleOverlayClick(event) {
  if (event.target === modalOverlay) {
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
 * Show JSON-LD for current record
 */
function showJsonLd() {
  const record = stateRef.selectedRecord;
  if (!record) return;

  const jsonStr = JSON.stringify(record, null, 2);
  const newWindow = window.open('', '_blank');
  newWindow.document.write(`
    <html>
      <head><title>JSON-LD - ${record['rico:identifier']}</title></head>
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
  // Import dynamically to avoid circular dependency
  import('./view-switcher.js').then(({ switchView }) => {
    switchView('analyse');
  });
}
