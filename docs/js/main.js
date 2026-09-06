/**
 * M³GIM Main Entry Point
 * Loads archive data, initializes router, renders views on demand.
 */

import { el, clear } from './utils/dom.js';
import { loadArchive } from './data/loader.js';
import { initRouter, getState, navigateToView } from './ui/router.js';
import { initRegisterMenu } from './ui/register-menu.js';
import { initTooltips } from './ui/tooltip.js';
import { initKorb, reconcileKorb, onKorbChange, getKorbCount } from './ui/basket.js';
import { renderBestand, selectArchivRecord } from './views/bestand.js';
import { renderChronik } from './views/chronik.js';
import { renderStatistik } from './views/statistik.js';
import { renderIndizes, expandEntry } from './views/indizes.js';
import { renderKorb } from './views/korb.js';
import { renderMobilitaet } from './views/karte.js';
import { renderNetzwerk } from './views/netzwerk.js';
import { IS_DEV } from './utils/env.js';

/** The one data file of the frontend; the error state names it. */
const DATA_URL = './data/m3gim.jsonld';

let store = null;
// Diagnose-Modul, nur auf localhost geladen (utils/dev.js).
let dev = null;
const renderedTabs = new Set();

/** Tab renderer registry — maps tab name to render function. */
const TAB_RENDERERS = new Map([
  ['bestand',            (s, c) => renderBestand(s, c)],
  ['chronik',            (s, c) => renderChronik(s, c)],
  ['statistik',          (s, c) => renderStatistik(s, c)],
  ['indizes',            (s, c) => renderIndizes(s, c)],
  ['karte',              (s, c) => renderMobilitaet(s, c)],
  ['netzwerk',           (s, c) => renderNetzwerk(s, c)],
  ['korb',               (s, c) => renderKorb(s, c)],
]);

async function init() {
  try {
    initTooltips();
    // Show loading state
    showLoading(true);

    // Load data
    store = await loadArchive(DATA_URL);
    if (IS_DEV) {
      dev = await import('./utils/dev.js');
      dev.logStoreSummary(store);
      dev.exposeDebug(store);
    }

    // Hide loading
    showLoading(false);

    // Initialize korb (before router)
    initKorb();
    reconcileKorb(store.records);
    onKorbChange(() => updateKorbTabVisibility());
    updateKorbTabVisibility();

    // Vor dem Router verdrahtet: der Klickhandler des Registermenues muss den
    // Tab-Zustand von vor dem Klick sehen (E-230).
    initRegisterMenu();

    // Initialize router
    initRouter({
      onTab: (tab) => renderTab(tab),
      onRecord: (recordId) => {
        if (!recordId) return;
        const { activeTab } = getState();
        if (activeTab === 'bestand') {
          // Expand record inline in the Bestand view
          selectArchivRecord(recordId);
          return;
        }
        // Navigate to Bestand tab and show record inline. Through the router,
        // so the hash keeps the shared filter (user-story audit 2026-09-03).
        navigateToView('bestand', { recordId });
      },
      onIndex: (gridType, entityName) => {
        renderTab('indizes');
        expandEntry(gridType, entityName);
      },
    });

    // Render initial tab
    renderTab(getState().activeTab);

  } catch (err) {
    console.error('M³GIM init error:', err);
    showError(err.message);
  }
}

function renderTab(tab) {
  // Lazy render: only render a tab the first time it's activated
  if (renderedTabs.has(tab)) return;
  renderedTabs.add(tab);

  const container = document.getElementById(`tab-${tab}`);
  if (!container) return;

  const renderer = TAB_RENDERERS.get(tab);
  if (!renderer) return;

  if (dev) dev.logTabActivation(tab, store);

  try {
    const result = renderer(store, container);
    if (result && typeof result.catch === 'function') {
      result.catch(err => showTabError(tab, container, err));
    }
  } catch (err) {
    showTabError(tab, container, err);
  }
}

/**
 * Error box, built as DOM. A message may carry the text of a source value, so
 * it must never reach the page as markup. role="alert" rather than the polite
 * region around it, because a failed load ends the session and has to reach a
 * screen reader at once.
 */
function errorBox(title, message, onRetry) {
  const box = el('div', { className: 'load-error', role: 'alert' },
    el('p', { className: 'load-error__title' }, title),
    el('p', { className: 'load-error__detail' }, message));
  if (onRetry) {
    box.appendChild(el('button', {
      className: 'load-error__retry',
      type: 'button',
      onClick: onRetry,
    }, 'Neu laden'));
  }
  return box;
}

function showTabError(tab, container, err) {
  console.error(`[${tab}] Render-Fehler:`, err);
  clear(container);
  container.appendChild(el('div', { className: 'load-status' },
    errorBox('Fehler in dieser Ansicht', err.message || 'Unbekannter Fehler')));
  // Allow re-render on next tab switch
  renderedTabs.delete(tab);
}

function showLoading(show) {
  const status = document.getElementById('load-status');
  const main = document.getElementById('main-content');
  if (status) {
    status.hidden = !show;
    status.setAttribute('aria-busy', show ? 'true' : 'false');
  }
  if (main) main.hidden = show;
}

function showError(message) {
  const status = document.getElementById('load-status');
  if (!status) return;
  status.hidden = false;
  status.setAttribute('aria-busy', 'false');
  clear(status);
  status.appendChild(errorBox('Archivdaten konnten nicht geladen werden', message,
    () => window.location.reload()));
}

function updateKorbTabVisibility() {
  const count = getKorbCount();
  const badge = document.getElementById('korb-badge');
  if (badge) {
    badge.textContent = String(count);
    badge.hidden = count <= 0;
  }

  if (renderedTabs.has('korb')) {
    renderedTabs.delete('korb');
    const { activeTab } = getState();
    if (activeTab === 'korb') renderTab('korb');
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
