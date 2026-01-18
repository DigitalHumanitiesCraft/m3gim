/**
 * M³GIM - Digitales Archiv Ira Malaniuk
 * Main Application Entry Point
 *
 * This module initializes all components and orchestrates the application.
 * Uses ES6 modules with Vite for bundling.
 */

// Core modules
import { CONFIG } from './modules/config.js';
import { setState, getState, subscribe } from './modules/state.js';

// Services
import {
  loadArchiveData,
  loadVisualizationData,
  getBestandCounts
} from './services/data-service.js';
import { applyFilters } from './services/filter-service.js';

// Components
import { initModal } from './components/modal.js';
import { initViewSwitcher, switchView } from './components/view-switcher.js';
import { initRecordGrid, renderRecords, showError } from './components/record-grid.js';
import { initTektonikNav, buildTektonikNav } from './components/tektonik-nav.js';
import { initFilters, buildDokumenttypFilter, updateBestandCounts } from './components/filters.js';

/**
 * Initialize the application
 */
async function init() {
  console.log('M³GIM: Initializing application...');

  try {
    // Initialize UI components
    initComponents();

    // Load data
    await loadData();

    // Setup state subscriptions
    setupStateSubscriptions();

    // Set initial view
    const state = getState();
    switchView(state.currentView);

    console.log('M³GIM: Application initialized successfully');
  } catch (error) {
    console.error('M³GIM: Initialization error:', error);
    showError(`Fehler beim Initialisieren: ${error.message}`);
  }
}

/**
 * Initialize all UI components
 */
function initComponents() {
  initModal();
  initViewSwitcher();
  initRecordGrid();
  initFilters();
}

/**
 * Load all required data
 */
async function loadData() {
  try {
    // Load archive data
    await loadArchiveData();

    // Update UI after data load
    const counts = getBestandCounts();
    updateBestandCounts(counts.objekte, counts.fotos);

    // Build filter UI
    buildDokumenttypFilter();

    // Build Tektonik navigation
    initTektonikNav();

    // Initial render
    applyFilters();
    renderRecords();

    // Load visualization data in background
    loadVisualizationData().catch(err => {
      console.warn('M³GIM: Could not load visualization data:', err);
    });
  } catch (error) {
    console.error('M³GIM: Data loading error:', error);
    throw error;
  }
}

/**
 * Setup state change subscriptions
 */
function setupStateSubscriptions() {
  // Re-render when filtered records change
  subscribe('filteredRecords', () => {
    renderRecords();
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for debugging
window.M3GIM = {
  getState,
  setState,
  CONFIG
};
