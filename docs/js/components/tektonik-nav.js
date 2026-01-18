/**
 * M³GIM Tektonik Navigation Component
 * Archive hierarchy tree navigation
 */

import { TEKTONIK_STRUKTUR } from '../modules/config.js';
import { setTektonikFilter, countRecordsInGruppe, countRecordsWithPrefix } from '../services/filter-service.js';

/**
 * Initialize Tektonik navigation
 */
export function initTektonikNav() {
  buildTektonikNav();
}

/**
 * Build the Tektonik navigation tree
 */
export function buildTektonikNav() {
  const container = document.getElementById('tektonik-nav');
  if (!container) return;

  let html = '';

  for (const [key, gruppe] of Object.entries(TEKTONIK_STRUKTUR)) {
    const count = countRecordsInGruppe(key);
    const hasChildren = gruppe.children && Object.keys(gruppe.children).length > 0;

    html += `
      <div class="tektonik-item" data-gruppe="${key}">
        <div class="tektonik-item__row" role="button" tabindex="0">
          <span class="tektonik-item__toggle${hasChildren ? '' : ' tektonik-item__toggle--empty'}">
            ${hasChildren ? '<i data-lucide="chevron-right"></i>' : ''}
          </span>
          <span class="tektonik-item__label">${gruppe.label}</span>
          <span class="tektonik-item__count">${count}</span>
        </div>
        ${hasChildren ? buildTektonikChildren(gruppe.children) : ''}
      </div>
    `;
  }

  container.innerHTML = html;

  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Attach event listeners
  container.querySelectorAll('.tektonik-item__row').forEach(row => {
    row.addEventListener('click', handleTektonikClick);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTektonikClick(e);
      }
    });
  });
}

/**
 * Build child items for Tektonik tree
 */
function buildTektonikChildren(children) {
  let html = '<div class="tektonik-item__children">';

  for (const [key, child] of Object.entries(children)) {
    const count = countRecordsWithPrefix(child.prefix);
    html += `
      <div class="tektonik-item" data-prefix="${child.prefix}">
        <div class="tektonik-item__row" role="button" tabindex="0">
          <span class="tektonik-item__toggle tektonik-item__toggle--empty"></span>
          <span class="tektonik-item__label">${key}</span>
          <span class="tektonik-item__count">${count}</span>
        </div>
      </div>
    `;
  }

  html += '</div>';
  return html;
}

/**
 * Handle Tektonik item click
 */
function handleTektonikClick(event) {
  const item = event.target.closest('.tektonik-item');
  const row = item.querySelector('.tektonik-item__row');
  const children = item.querySelector('.tektonik-item__children');
  const toggle = item.querySelector('.tektonik-item__toggle');

  // Toggle children visibility
  if (children) {
    children.classList.toggle('tektonik-item__children--expanded');
    toggle.classList.toggle('tektonik-item__toggle--expanded');
  }

  // Set filter
  const gruppe = item.dataset.gruppe;
  const prefix = item.dataset.prefix;

  // Remove active from all
  document.querySelectorAll('.tektonik-item__row--active').forEach(el => {
    el.classList.remove('tektonik-item__row--active');
  });

  // Set active
  row.classList.add('tektonik-item__row--active');

  // Update filter
  if (prefix) {
    setTektonikFilter({ type: 'prefix', value: prefix });
  } else if (gruppe) {
    setTektonikFilter({ type: 'gruppe', value: gruppe });
  }
}
