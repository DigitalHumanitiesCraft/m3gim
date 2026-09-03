/**
 * M³GIM Router — Tab switching and URL hash state.
 * Info pages (about, projekt, impressum) are standalone HTML files.
 *
 * Hash-Grammatik `#<tab>[/<recordId>][?<query>]`. Der Query-Teil traegt den
 * geteilten Filter (filter-url.js) und wird abgetrennt, bevor der Pfad an `/`
 * aufgeteilt wird; die bestehenden Deep-Links auf einen Datensatz bleiben
 * dadurch unveraendert gueltig. Geschrieben wird mit replaceState, damit ein
 * Sliderschritt keinen History-Eintrag erzeugt.
 */

import { splitHash, buildHash, parseFilterQuery } from './filter-url.js';
import { getFilter, setFilter, addFacetValue, subscribe as subscribeFilter } from './filter-state.js';
import { initTabKeyboard, setRovingTabindex } from './tabs.js';

// Vollstaendiger Katalog -- alle Tabs bleiben im TAB_RENDERERS registriert,
// damit Hash-URLs und Code-Pfade nicht brechen.
const TABS = ['bestand', 'chronik', 'statistik', 'indizes', 'karte', 'netzwerk', 'korb'];
const ALL_VIEWS = [...TABS, 'archiv']; // 'archiv' als Legacy-Alias fuer alte Bookmarks/Hash-URLs

const state = {
  activeTab: 'bestand',
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

  // Arrow/Home/End across the whole tablist; the groups are visual only.
  initTabKeyboard(document.querySelector('.tab-bar'), (tab) => switchTab(tab));

  // Parse initial hash
  parseHash();
  applyState();

  // Listen for hash changes (back/forward)
  window.addEventListener('hashchange', () => {
    parseHash();
    applyState();
  });

  // Der Schnitt gehoert in die Adresszeile: jede Filteraenderung schreibt den
  // Query-Teil nach, damit ein Befund zitierbar bleibt und den Reload
  // ueberlebt. Der Router ist die einzige Stelle, die in die Adresszeile
  // schreibt, also abonniert er selbst, statt sich von main.js rufen zu lassen.
  subscribeFilter(() => updateHash());
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

export function navigateToView(tab, context = {}) {
  if (!ALL_VIEWS.includes(tab)) return;
  state.activeTab = tab;
  state.selectedRecord = null;
  updateHash();
  applyState();
  requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent('m3gim:navigate', {
      detail: { tab, ...context },
    }));
  });
}

/**
 * Setzt eine Facette im geteilten Filter und wechselt in den Record-Tab, der
 * sie zeigt (Chronik, wenn sie aktiv ist, sonst Bestand).
 *
 * Der Schnitt wird hier direkt geschrieben, statt ihn als Detail eines
 * Navigations-Events an die Ansicht zu reichen: der Umweg lief ueber einen
 * eigenen Kanal, dessen Handler unter dem Schluessel `archiv` gesucht wurde,
 * den keine Ansicht je registriert hat, sodass die Facette aus den Indizes nie
 * ankam.
 *
 * `location` ist der Altname der Ortsfacette aus der entfallenen Toolbar; die
 * aufrufenden Ansichten nennen ihn weiter.
 * @param {'person'|'location'|'ort'|'werk'|'institution'|'docType'} facet
 * @param {string|string[]} value
 */
export function applyArchivFilter(facet, value) {
  if (!facet || !value) return;
  addFacetValue(facet === 'location' ? 'ort' : facet, value);
  navigateToView(state.activeTab === 'chronik' ? 'chronik' : 'bestand');
}

export function getState() {
  return { ...state };
}

// Instanzen trugen bis zur Namensraum-Dreiteilung (E-138) den Praefix
// `m3gim:`. Geteilte Links und Bookmarks aus der Zeit davor nennen ihn weiter;
// ohne Aufloesung oeffnet ein solcher Link die Anwendung und zeigt nichts an,
// ohne einen Fehler zu melden.
const LEGACY_ID_PREFIX = 'm3gim:';
const ID_PREFIX = 'm3gim-data:';

export function resolveRecordId(id) {
  if (typeof id !== 'string') return id;
  return id.startsWith(LEGACY_ID_PREFIX)
    ? ID_PREFIX + id.slice(LEGACY_ID_PREFIX.length)
    : id;
}

/**
 * Liest die Hash-Grammatik `#<tab>[/<recordId>][?<query>]` in den Router-State
 * und den geteilten Filter. Exportiert, damit die Grammatik ohne Browser
 * pruefbar ist; die Anwendung ruft sie nur ueber initRouter und hashchange.
 */
export function parseHash() {
  const { path, query } = splitHash(window.location.hash);
  // Der Filter kommt aus der URL, bevor die Views rendern; ein geteilter Link
  // zeigt sonst kurz den vollen Bestand und springt dann.
  applyFilterFromQuery(query);
  if (!path) return;
  const parts = path.split('/');
  let t = parts[0];
  if (t === 'archiv') t = 'bestand'; // Legacy-Alias
  // Legacy-Alias: der Tab heisst jetzt 'karte'; alte mobilitaet/-atlas-Bookmarks
  // landen auf der Karte (der Atlas war der hier abgeloeste Vorgaenger).
  if (t === 'mobilitaet' || t === 'mobilitaets-atlas') t = 'karte';
  // Legacy-Alias: Verknuepfungen ist mit E-160 im Netzwerk aufgegangen. Der
  // Query-Teil traegt den geteilten Schnitt und ueberlebt die Umleitung, damit
  // ein geteilter Link denselben Befund oeffnet.
  if (t === 'verknuepfungen') t = 'netzwerk';
  if (TABS.includes(t)) state.activeTab = t;
  if (parts[1] && ALL_VIEWS.includes(parts[0])) {
    state.selectedRecord = resolveRecordId(decodeURIComponent(parts[1]));
  }
}

/**
 * Filter aus dem Query-Teil uebernehmen. Ein leerer Query loest den Filter
 * nicht auf: er heisst "dieser Link nennt keinen Schnitt", nicht "kein
 * Schnitt", und ein Tab-Wechsel darf den gesetzten Filter nicht wegwischen.
 */
function applyFilterFromQuery(query) {
  const patch = parseFilterQuery(query);
  if (Object.keys(patch).length > 0) setFilter(patch);
}

function updateHash() {
  const newHash = buildHash(state.activeTab, state.selectedRecord, getFilter());
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}

function applyState() {
  // Switch tab visibility + ARIA state
  for (const tab of TABS) {
    const section = document.getElementById(`tab-${tab}`);
    const btn = document.querySelector(`[data-tab="${tab}"]`);
    const isActive = tab === state.activeTab;
    if (section) section.classList.toggle('active', isActive);
    if (btn) {
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    }
  }

  // Roving tabindex follows the active tab, in DOM order rather than TABS
  // order: the bar is grouped, so the two orders differ.
  const buttons = [...document.querySelectorAll('.tab-bar [role="tab"]')];
  const activeIndex = buttons.findIndex(b => b.dataset.tab === state.activeTab);
  if (activeIndex >= 0) setRovingTabindex(buttons, activeIndex);

  if (onTabChange) onTabChange(state.activeTab);
  if (state.selectedRecord && onRecordSelect) onRecordSelect(state.selectedRecord);
}
