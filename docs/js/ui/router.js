/**
 * M³GIM Router — Tab switching and URL hash state.
 */

const TABS = ['archiv', 'indizes', 'matrix', 'kosmos'];

const state = {
  activeTab: 'archiv',
  selectedRecord: null,
};

let onTabChange = null;
let onRecordSelect = null;

export function initRouter({ onTab, onRecord } = {}) {
  onTabChange = onTab;
  onRecordSelect = onRecord;

  // Set up tab click handlers
  for (const tab of TABS) {
    const btn = document.querySelector(`[data-tab="${tab}"]`);
    if (btn) btn.addEventListener('click', () => switchTab(tab));
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
  if (!TABS.includes(tab)) return;
  state.activeTab = tab;
  updateHash();
  applyState();
}

export function selectRecord(recordId) {
  state.selectedRecord = recordId;
  updateHash();
  if (onRecordSelect) onRecordSelect(recordId);
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
  if (TABS.includes(parts[0])) {
    state.activeTab = parts[0];
  }
  if (parts[1]) {
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
  // Switch tab visibility
  for (const tab of TABS) {
    const section = document.getElementById(`tab-${tab}`);
    const btn = document.querySelector(`[data-tab="${tab}"]`);
    if (section) section.classList.toggle('active', tab === state.activeTab);
    if (btn) btn.classList.toggle('active', tab === state.activeTab);
  }

  if (onTabChange) onTabChange(state.activeTab);
  if (state.selectedRecord && onRecordSelect) onRecordSelect(state.selectedRecord);
}
