/**
 * M³GIM Router — Tab switching, page navigation, and URL hash state.
 */

const TABS = ['archiv', 'indizes', 'korb'];
const HIDDEN_TABS = ['matrix', 'kosmos']; // ausgeblendet fuer Demo, Code bleibt
const PAGES = ['about', 'projekt', 'modell', 'hilfe'];
const ALL_VIEWS = [...TABS, ...PAGES];

const state = {
  activeTab: 'archiv',
  selectedRecord: null,
};

let onTabChange = null;
let onRecordSelect = null;
let onIndexNavigate = null;

export function initRouter({ onTab, onRecord, onIndex } = {}) {
  onTabChange = onTab;
  onRecordSelect = onRecord;
  onIndexNavigate = onIndex;

  // Set up tab click handlers
  for (const tab of TABS) {
    const btn = document.querySelector(`[data-tab="${tab}"]`);
    if (btn) btn.addEventListener('click', () => switchTab(tab));
  }

  // Set up page link handlers
  for (const page of PAGES) {
    const link = document.querySelector(`[data-page="${page}"]`);
    if (link) link.addEventListener('click', (e) => { e.preventDefault(); switchTab(page); });
  }

  // Parse initial hash
  parseHash();
  applyState();

  // Listen for hash changes (back/forward)
  window.addEventListener('hashchange', () => {
    parseHash();
    applyState();
  });
}

function switchTab(tab) {
  if (!ALL_VIEWS.includes(tab)) return;
  state.activeTab = tab;
  state.selectedRecord = null;
  updateHash();
  applyState();
}

export function selectRecord(recordId) {
  state.selectedRecord = recordId;
  updateHash();
  if (onRecordSelect) onRecordSelect(recordId);
}

export function navigateToIndex(gridType, entityName) {
  state.activeTab = 'indizes';
  state.selectedRecord = null;
  updateHash();
  applyState();
  if (onIndexNavigate) onIndexNavigate(gridType, entityName);
}

export function deselectRecord() {
  state.selectedRecord = null;
  updateHash();
  if (onRecordSelect) onRecordSelect(null);
}

export function getState() {
  return { ...state };
}

function parseHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  const parts = hash.split('/');
  if (ALL_VIEWS.includes(parts[0])) {
    state.activeTab = parts[0];
  }
  if (parts[1] && TABS.includes(parts[0])) {
    state.selectedRecord = decodeURIComponent(parts[1]);
  }
}

function updateHash() {
  const parts = [state.activeTab];
  if (state.selectedRecord) {
    parts.push(encodeURIComponent(state.selectedRecord));
  }
  const newHash = '#' + parts.join('/');
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}

function applyState() {
  const isPage = PAGES.includes(state.activeTab);

  // Switch tab visibility
  for (const tab of TABS) {
    const section = document.getElementById(`tab-${tab}`);
    const btn = document.querySelector(`[data-tab="${tab}"]`);
    if (section) section.classList.toggle('active', !isPage && tab === state.activeTab);
    if (btn) btn.classList.toggle('active', !isPage && tab === state.activeTab);
  }

  // Switch page visibility
  for (const page of PAGES) {
    const section = document.getElementById(`page-${page}`);
    const link = document.querySelector(`[data-page="${page}"]`);
    if (section) section.classList.toggle('active', page === state.activeTab);
    if (link) link.classList.toggle('active', page === state.activeTab);
  }

  if (onTabChange) onTabChange(state.activeTab);
  if (state.selectedRecord && onRecordSelect) onRecordSelect(state.selectedRecord);
}
