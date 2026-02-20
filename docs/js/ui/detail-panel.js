/**
 * M³GIM Detail Panel — Slide-in panel showing full record metadata.
 * Delegates rendering to the shared buildInlineDetail() component.
 */

import { clear } from '../utils/dom.js';
import { formatSignatur } from '../utils/format.js';
import { deselectRecord } from './router.js';
import { buildInlineDetail } from '../views/archiv-inline-detail.js';

let panelEl = null;
let bodyEl = null;
let store = null;

export function initDetailPanel(storeRef) {
  store = storeRef;
  panelEl = document.getElementById('detail-panel');
  bodyEl = panelEl.querySelector('.detail-panel__body');

  const closeBtn = panelEl.querySelector('.detail-panel__close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closePanel();
      deselectRecord();
    });
  }
}

export function showRecord(recordId) {
  if (!store || !panelEl) return;
  const record = store.records.get(recordId);
  if (!record) {
    closePanel();
    return;
  }

  // Update panel header
  const headerTitle = panelEl.querySelector('.detail-panel__title');
  const headerSig = panelEl.querySelector('.detail-panel__signatur');
  if (headerSig) headerSig.textContent = formatSignatur(record['rico:identifier']);
  if (headerTitle) headerTitle.textContent = record['rico:title'] || '(ohne Titel)';

  // Render body using shared inline detail component
  clear(bodyEl);
  bodyEl.appendChild(buildInlineDetail(record, store));

  panelEl.classList.add('open');
}

export function closePanel() {
  if (panelEl) panelEl.classList.remove('open');
}
