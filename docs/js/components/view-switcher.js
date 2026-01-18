/**
 * M³GIM View Switcher Component
 * Handles view and visualization switching
 */

import { setState, stateRef } from '../modules/state.js';
import { VIZ_INFO } from '../modules/config.js';

// DOM references
let sidebarArchiv, sidebarAnalyse, contentArchiv, contentAnalyse;
let searchInput, vizTitle, vizDescription;

/**
 * Initialize view switcher
 */
export function initViewSwitcher() {
  sidebarArchiv = document.getElementById('sidebar-archiv');
  sidebarAnalyse = document.getElementById('sidebar-analyse');
  contentArchiv = document.getElementById('content-archiv');
  contentAnalyse = document.getElementById('content-analyse');
  searchInput = document.getElementById('search-input');
  vizTitle = document.getElementById('viz-title');
  vizDescription = document.getElementById('viz-description');

  // View tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // Visualization selector
  document.querySelectorAll('.viz-tab').forEach(btn => {
    btn.addEventListener('click', () => switchVisualization(btn.dataset.viz));
  });
}

/**
 * Switch between Archiv and Analyse views
 */
export function switchView(view) {
  setState({ currentView: view });

  // Update tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    const isActive = tab.dataset.view === view;
    tab.classList.toggle('nav-tab--active', isActive);
    tab.setAttribute('aria-selected', isActive);
  });

  // Update sidebar visibility
  if (sidebarArchiv) {
    sidebarArchiv.classList.toggle('sidebar--hidden', view !== 'archiv');
  }
  if (sidebarAnalyse) {
    sidebarAnalyse.classList.add('sidebar--hidden');
  }

  // Update content areas
  if (contentArchiv) {
    contentArchiv.classList.toggle('content--hidden', view !== 'archiv');
  }
  if (contentAnalyse) {
    contentAnalyse.classList.toggle('content--hidden', view !== 'analyse');
  }

  // Update search placeholder
  if (searchInput) {
    searchInput.placeholder = view === 'archiv'
      ? 'Suche in Titeln und Beschreibungen...'
      : 'Suche in Visualisierung...';
  }
}

/**
 * Switch visualization type
 */
export function switchVisualization(viz) {
  setState({ currentViz: viz });

  // Update buttons
  document.querySelectorAll('.viz-tab').forEach(btn => {
    const isActive = btn.dataset.viz === viz;
    btn.classList.toggle('viz-tab--active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });

  // Update controls visibility
  document.querySelectorAll('.viz-controls').forEach(ctrl => {
    ctrl.classList.add('viz-controls--hidden');
  });

  const activeControls = document.getElementById(`controls-${viz}`);
  if (activeControls) {
    activeControls.classList.remove('viz-controls--hidden');
  }

  // Update viz header
  const info = VIZ_INFO[viz];
  if (info) {
    if (vizTitle) vizTitle.textContent = info.title;
    if (vizDescription) vizDescription.textContent = info.description;
  }
}

/**
 * Get current view
 */
export function getCurrentView() {
  return stateRef.currentView;
}

/**
 * Get current visualization
 */
export function getCurrentVisualization() {
  return stateRef.currentViz;
}
