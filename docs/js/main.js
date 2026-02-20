/**
 * M³GIM Main Entry Point
 * Loads archive data, initializes router, renders views on demand.
 */

import { loadArchive } from './data/loader.js';
import { initRouter, getState } from './ui/router.js';
import { initDetailPanel, showRecord, closePanel } from './ui/detail-panel.js';
import { renderStatsBar } from './ui/stats-bar.js';
import { renderArchiv } from './views/archiv.js';
import { renderIndizes } from './views/indizes.js';
import { renderMatrix } from './views/matrix.js';
import { renderKosmos } from './views/kosmos.js';

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

    // Render stats
    const statsContainer = document.getElementById('stats-bar');
    if (statsContainer) renderStatsBar(store, statsContainer);

    // Initialize detail panel
    initDetailPanel(store);

    // Initialize router
    initRouter({
      onTab: (tab) => renderTab(tab),
      onRecord: (recordId) => {
        const { activeTab } = getState();
        if (activeTab === 'archiv') return; // Archiv uses inline expansion
        if (recordId) showRecord(recordId);
        else closePanel();
      },
    });

    // Render initial tab
    renderTab(getState().activeTab);

    // Set up info modal
    setupInfoModal();

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
  }
}

function showLoading(show) {
  const spinner = document.getElementById('loading-spinner');
  const main = document.getElementById('main-content');
  if (spinner) spinner.style.display = show ? 'flex' : 'none';
  if (main) main.style.display = show ? 'none' : 'block';
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

function setupInfoModal() {
  const btn = document.getElementById('info-btn');
  const modal = document.getElementById('info-modal');
  if (!btn || !modal) return;

  btn.addEventListener('click', () => modal.classList.add('open'));
  modal.querySelector('.info-modal__backdrop')?.addEventListener('click', () => modal.classList.remove('open'));
  modal.querySelector('.info-modal__close')?.addEventListener('click', () => modal.classList.remove('open'));

  // Populate dynamic stats
  const linkedCount = store.allRecords.filter(r => {
    const agents = r['rico:hasOrHadAgent'];
    const locs = r['rico:hasOrHadLocation'];
    const subj = r['rico:hasOrHadSubject'];
    const ment = r['m3gim:mentions'];
    return agents || locs || subj || ment;
  }).length;
  const pct = Math.round(linkedCount / store.allRecords.length * 100);

  const statsEl = document.getElementById('info-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <li>Stand: ${store.exportDate ? store.exportDate.split('T')[0] : 'unbekannt'}</li>
      <li>${store.allRecords.length} Archivalien, davon ${linkedCount} (${pct}%) mit Verkn\u00fcpfungen</li>
      <li>Indizes: ${store.persons.size} Personen, ${store.organizations.size} Organisationen, ${store.locations.size} Orte, ${store.works.size} Werke</li>
      <li>Matrix/Kosmos: nur die ${linkedCount} verkn\u00fcpften Objekte</li>
      <li>Wikidata-Anreicherung ausstehend</li>
    `;
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
