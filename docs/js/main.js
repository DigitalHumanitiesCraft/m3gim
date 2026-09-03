/**
 * M³GIM Main Entry Point
 * Loads archive data, initializes router, renders views on demand.
 */

import { el, clear } from './utils/dom.js';
import { loadArchive } from './data/loader.js';
import { initRouter, getState } from './ui/router.js';
import { initKorb, onKorbChange, getKorbCount } from './ui/basket.js';
import { renderBestand, selectArchivRecord } from './views/bestand.js';
import { renderChronik } from './views/chronik.js';
import { renderStatistik } from './views/statistik.js';
import { renderIndizes, expandEntry } from './views/indizes.js';
import { renderKorb } from './views/korb.js';
import { renderMobilitaet } from './views/karte.js';
import { renderNetzwerk } from './views/netzwerk.js';
import { IS_DEV } from './utils/env.js';

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
    // Show loading state
    showLoading(true);

    // Load data
    store = await loadArchive('./data/m3gim.jsonld');
    if (IS_DEV) {
      dev = await import('./utils/dev.js');
      dev.logStoreSummary(store);
      dev.exposeDebug(store);
    }

    // Hide loading
    showLoading(false);

    // Initialize korb (before router)
    initKorb();
    onKorbChange(() => updateKorbTabVisibility());
    updateKorbTabVisibility();

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
        // Navigate to Bestand tab and show record inline
        window.location.hash = '#bestand/' + encodeURIComponent(recordId);
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
 * it must never reach the page as markup.
 */
function errorBox(title, message, extraStyle = '') {
  return el('div', { style: `color: #8B3A3A; text-align: center; padding: 40px;${extraStyle}` },
    el('p', { style: 'font-weight: 600; margin-bottom: 8px;' }, title),
    el('p', { style: 'font-size: 0.8rem; opacity: 0.7;' }, message));
}

function showTabError(tab, container, err) {
  console.error(`[${tab}] Render-Fehler:`, err);
  clear(container);
  container.appendChild(errorBox('Fehler in dieser Ansicht',
    err.message || 'Unbekannter Fehler', ' font-family: var(--font-ui);'));
  // Allow re-render on next tab switch
  renderedTabs.delete(tab);
}

function showLoading(show) {
  const spinner = document.getElementById('loading-spinner');
  const main = document.getElementById('main-content');
  if (spinner) spinner.hidden = !show;
  if (main) main.hidden = show;
}

function showError(message) {
  const spinner = document.getElementById('loading-spinner');
  if (!spinner) return;
  clear(spinner);
  spinner.appendChild(errorBox('Fehler beim Laden', message));
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
