/**
 * M³GIM Main Entry Point
 * Loads archive data, initializes router, renders views on demand.
 */

import { loadArchive } from './data/loader.js';
import { initRouter, getState } from './ui/router.js';
import { initDetailPanel, showRecord, closePanel } from './ui/detail-panel.js';
import { initKorb, onKorbChange, getKorbCount } from './ui/korb.js';
import { renderArchiv, selectArchivRecord } from './views/archiv.js';
import { renderIndizes, expandEntry } from './views/indizes.js';
import { renderMatrix } from './views/matrix.js';
import { renderKosmos } from './views/kosmos.js';
import { renderKorb } from './views/korb.js';
import { renderAbout } from './views/about.js';
import { renderProjekt } from './views/projekt.js';
import { renderHilfe } from './views/hilfe.js';

let store = null;
const renderedTabs = new Set();

async function init() {
  try {
    // Show loading state
    showLoading(true);

    // Load data
    store = await loadArchive('./data/m3gim.jsonld');
    console.log(`M³GIM loaded: ${store.allRecords.length} Records, ${store.konvolute.size} Konvolute, ${store.persons.size} Personen, ${store.organizations.size} Organisationen`);

    // Hide loading
    showLoading(false);

    // Initialize korb (before detail panel and router)
    initKorb();
    onKorbChange(() => updateKorbTabVisibility());
    updateKorbTabVisibility();

    // Detail panel deactivated (Demo mode — clicks navigate to Archiv instead)
    // initDetailPanel(store);

    // Initialize router
    initRouter({
      onTab: (tab) => renderTab(tab),
      onRecord: (recordId) => {
        if (!recordId) return;
        const { activeTab } = getState();
        if (activeTab === 'archiv') {
          // Expand record inline in the Bestand view
          selectArchivRecord(recordId);
          return;
        }
        // Navigate to Archiv tab and show record inline
        window.location.hash = '#archiv/' + encodeURIComponent(recordId);
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

  // Data tabs use tab-{name}, pages use page-{name}
  const container = document.getElementById(`tab-${tab}`) || document.getElementById(`page-${tab}`);
  if (!container) return;

  switch (tab) {
    case 'archiv':
      renderArchiv(store, container);
      break;
    case 'indizes':
      renderIndizes(store, container);
      break;
    case 'matrix':
      renderMatrix(store, container);
      break;
    case 'kosmos':
      renderKosmos(store, container);
      break;
    case 'korb':
      renderKorb(store, container);
      break;
    case 'about':
      renderAbout(store, container);
      break;
    case 'projekt':
      renderProjekt(store, container);
      break;
    case 'hilfe':
      renderHilfe(store, container);
      break;
  }
}

function showLoading(show) {
  const spinner = document.getElementById('loading-spinner');
  const main = document.getElementById('main-content');
  if (spinner) spinner.hidden = !show;
  if (main) main.hidden = show;
}

function showError(message) {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.innerHTML = `
      <div style="color: #8B3A3A; text-align: center; padding: 40px;">
        <p style="font-weight: 600; margin-bottom: 8px;">Fehler beim Laden</p>
        <p style="font-size: 0.8rem;">${message}</p>
      </div>
    `;
  }
}

function updateKorbTabVisibility() {
  const count = getKorbCount();
  const btn = document.getElementById('korb-tab-btn');
  const badge = document.getElementById('korb-badge');
  if (btn) btn.hidden = false; // Korb-Tab immer sichtbar
  if (badge) {
    badge.textContent = String(count);
    badge.hidden = count <= 0;
  }

  // Force re-render of Korb view if it's already rendered
  if (renderedTabs.has('korb')) {
    renderedTabs.delete('korb');
    const { activeTab } = getState();
    if (activeTab === 'korb') renderTab('korb');
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
