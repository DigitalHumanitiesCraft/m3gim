/**
 * M³GIM Main Entry Point
 * Loads archive data, initializes router, renders views on demand.
 */

import { loadArchive } from './data/loader.js';
import { initRouter, getState } from './ui/router.js';
import { initKorb, onKorbChange, getKorbCount } from './ui/korb.js';
import { renderArchiv, selectArchivRecord } from './views/archiv.js';
import { renderIndizes, expandEntry } from './views/indizes.js';
import { renderMatrix } from './views/matrix.js';
import { renderKosmos } from './views/kosmos.js';
import { renderKorb } from './views/korb.js';
import { renderMobilitaet } from './views/mobilitaet.js';
import { renderZeitfluss } from './views/zeitfluss.js';
import { renderLebenspartitur } from './views/lebenspartitur.js';
import { DEV } from './utils/viz-components.js';

let store = null;
const renderedTabs = new Set();

/** Tab renderer registry — maps tab name to render function. */
const TAB_RENDERERS = new Map([
  ['archiv',     (s, c) => renderArchiv(s, c)],
  ['indizes',    (s, c) => renderIndizes(s, c)],
  ['matrix',     (s, c) => renderMatrix(s, c)],
  ['kosmos',     (s, c) => renderKosmos(s, c)],
  ['mobilitaet', (s, c) => renderMobilitaet(s, c)],
  ['zeitfluss',       (s, c) => renderZeitfluss(s, c)],
  ['lebenspartitur',  (s, c) => renderLebenspartitur(s, c)],
  ['korb',            (s, c) => renderKorb(s, c)],
]);

async function init() {
  try {
    // Show loading state
    showLoading(true);

    // Load data
    store = await loadArchive('./data/m3gim.jsonld');
    if (DEV) console.log(`M³GIM loaded: ${store.allRecords.length} Records, ${store.konvolute.size} Konvolute, ${store.persons.size} Personen, ${store.organizations.size} Organisationen`);

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

  const container = document.getElementById(`tab-${tab}`);
  if (!container) return;

  const renderer = TAB_RENDERERS.get(tab);
  if (!renderer) return;

  try {
    const result = renderer(store, container);
    // Handle async renderers (D3 views that load partitur.json)
    if (result && typeof result.catch === 'function') {
      result.catch(err => showTabError(tab, container, err));
    }
  } catch (err) {
    showTabError(tab, container, err);
  }
}

function showTabError(tab, container, err) {
  console.error(`[${tab}] Render-Fehler:`, err);
  container.innerHTML = `
    <div style="color: #8B3A3A; text-align: center; padding: 40px; font-family: var(--font-sans);">
      <p style="font-weight: 600; margin-bottom: 8px;">Fehler in dieser Ansicht</p>
      <p style="font-size: 0.8rem; opacity: 0.7;">${err.message || 'Unbekannter Fehler'}</p>
    </div>
  `;
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
