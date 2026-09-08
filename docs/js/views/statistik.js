/** Two coordinated dashboard panels over the one shared document cut. */
import { clear, el } from '../utils/dom.js';
import { logStamp } from '../utils/env.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { getFilter, replaceFilter } from '../ui/filter-state.js';
import { recordsFor, yearBounds } from '../data/records-for.js';
import { splitHash, viewParams } from '../ui/filter-url.js';
import { setViewParams } from '../ui/router.js';
import { onViewNavigate } from '../ui/events.js';
import { buildOccurrences } from '../data/place-evidence.js';
import { datasetFingerprint } from './statistik-data.js';
import { createDashboardSelection } from './dashboard-selection.js';
import { createDashboardPanel, normalizePanelConfig } from './dashboard-panel.js';

const PARAMS = Object.freeze({ a: 'dash-panel-a', b: 'dash-panel-b', reference: 'dash-reference' });
let mounted = null;

function readJson(params, key) {
  try {
    const raw = new URLSearchParams(params || '').get(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeReference(store, value, fingerprint) {
  if (!value || !value.filter || !Array.isArray(value.recordIds)) return null;
  const result = recordsFor(store, value.filter);
  const recordIds = [...result.ids].sort();
  const stored = [...new Set(value.recordIds)].sort();
  const stale = value.fingerprint !== fingerprint || JSON.stringify(recordIds) !== JSON.stringify(stored);
  return { ...value, fingerprint, recordIds, stale,
    changedFrom: stale ? (value.fingerprint || 'unbekannt') : value.changedFrom };
}

export function renderStatistik(store, container) {
  mounted?.destroy(); clear(container);
  const fingerprint = datasetFingerprint(store);
  const currentParams = viewParams(splitHash(window.location.hash).query);
  let panelAState = normalizePanelConfig(readJson(currentParams, PARAMS.a), 'treemap');
  let panelBState = normalizePanelConfig(readJson(currentParams, PARAMS.b), 'matrix');
  let reference = normalizeReference(store, readJson(currentParams, PARAMS.reference), fingerprint);
  let cut = recordsFor(store, getFilter());
  let highlighted = new Set();
  const placeStatements = buildOccurrences(store);
  const span = yearBounds(store);

  const panelsHost = el('div', { className: 'dashboard-panels' });
  const workspace = el('div', { className: 'dashboard-workspace' }, panelsHost);
  const dashboardHost = el('div', { className: 'dashboard-stage' }, workspace);
  const main = el('div', { className: 'view-main statistik-main' }, dashboardHost);

  let panelA = null, panelB = null;
  const shared = {
    store, cutIds: cut.ids, placeStatements, fingerprint,
    getHighlighted: () => highlighted,
    onSelect: null, onAdd: null,
    get reference() { return reference; },
    pinReference() {
      reference = { filter: clone(getFilter()), recordIds: [...cut.ids].sort(), fingerprint,
        label: `Schnitt mit ${cut.ids.size} Dokumenten` };
      setViewParams({ [PARAMS.reference]: JSON.stringify(reference) });
      drawPanels();
    },
    clearReference() {
      reference = null; setViewParams({ [PARAMS.reference]: null }); drawPanels();
    },
    applyReference() {
      if (reference?.filter) replaceFilter(clone(reference.filter));
    },
  };

  const selection = createDashboardSelection({ host: dashboardHost, store, fingerprint,
    getQueryWitnesses: () => cut.witnesses || cut.evidence?.witnesses || [],
    getReference: () => reference,
    onHighlight(ids) { highlighted = ids; panelA?.highlight(ids); panelB?.highlight(ids); } });
  shared.retargetSelection = trigger => selection.retarget(trigger);
  shared.onSelect = (aggregate, trigger) => selection.replace(aggregate, trigger);
  shared.onAdd = (aggregate, trigger) => selection.add(aggregate, trigger);

  panelA = createDashboardPanel({ id: 'a', host: panelsHost, initial: panelAState, context: shared,
    onState(state) { panelAState = state; setViewParams({ [PARAMS.a]: JSON.stringify(state) }); } });
  panelB = createDashboardPanel({ id: 'b', host: panelsHost, initial: panelBState, context: shared,
    onState(state) { panelBState = state; setViewParams({ [PARAMS.b]: JSON.stringify(state) }); } });

  function drawPanels() {
    shared.cutIds = cut.ids;
    panelA?.draw(); panelB?.draw();
  }

  const sidebar = createSidebar(store, {
    yearSpan: span, getCount: () => cut.ids.size,
    search: { placeholder: 'Signatur, Titel, Typ, Datum oder verknüpfte Entität' },
    onChange() {
      cut = recordsFor(store, getFilter());
      selection.clear(); shared.cutIds = cut.ids; drawPanels(); sidebar.update();
    },
  });
  container.appendChild(viewShell(sidebar.element, main));
  sidebar.update();

  onViewNavigate('statistik', detail => {
    if (typeof detail.viewParams !== 'string') return;
    panelAState = normalizePanelConfig(readJson(detail.viewParams, PARAMS.a), 'treemap');
    panelBState = normalizePanelConfig(readJson(detail.viewParams, PARAMS.b), 'matrix');
    reference = normalizeReference(store, readJson(detail.viewParams, PARAMS.reference), fingerprint);
    panelA.setState(panelAState); panelB.setState(panelBState);
  });

  mounted = { destroy() { panelA.destroy(); panelB.destroy(); selection.destroy(); sidebar.destroy(); } };
  logStamp('dashboard', [['records', cut.ids.size], ['panels', 2],
    ['placeStatements', placeStatements.length], ['fingerprint', fingerprint]]);
}
