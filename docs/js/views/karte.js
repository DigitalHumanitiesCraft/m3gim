/** Place evidence navigation with an optional geographic companion. */
import { el, clear } from '../utils/dom.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { createSelectionDetail } from '../ui/selection-detail.js';
import { getFilter, setFilter, buildFacetSelectionPatch } from '../ui/filter-state.js';
import { navigateToView } from '../ui/router.js';
import { onViewNavigate } from '../ui/events.js';
import { recordsFor, yearBounds } from '../data/records-for.js';
import { logStamp } from '../utils/env.js';
import { buildEntities, buildOccurrences, hasGeo, groupPlaces, occurrencesInCut } from './karte-data.js';
import { buildPlaceDetail } from './karte-detail.js';
import { buildMap, loadCountries } from './karte-map.js';

let cleanup = null;
let applyNavigation = null;
let wantedNavigation = null;
onViewNavigate('karte', detail => {
  const navigation = placeNavigation(detail);
  if (!navigation) return;
  if (applyNavigation) applyNavigation(navigation);
  else wantedNavigation = navigation;
});

function placeNavigation(detail) {
  if (detail?.family === 'ort' && (detail.ort || detail.rawValue)) {
    return { type: 'place', value: detail.ort || detail.rawValue };
  }
  if (detail?.entityFamily && detail.entityName) {
    return { type: 'entity', family: detail.entityFamily, value: detail.entityName };
  }
  return detail?.entity ? { type: 'legacy-entity', value: detail.entity } : null;
}

export function renderMobilitaet(store, container) {
  cleanup?.();
  clear(container);
  const entities = buildEntities(store);
  applyNavigation = navigation => {
    if (navigation.type === 'place') {
      requestAnimationFrame(() => openCity(navigation.value, null));
      return;
    }
    const matches = entities.filter(entity => entity.name === navigation.value);
    const entity = navigation.type === 'entity'
      ? matches.find(item => item.family === navigation.family)
      : matches.length === 1 ? matches[0] : null;
    if (entity) setFilter(buildFacetSelectionPatch(
      getFilter(), entity.family, [entity.name],
    ));
  };
  const allOcc = buildOccurrences(store);
  const state = { selectedCities: [], sort: 'count' };
  let scoped = [];
  let groups = [];
  let visibleEvidence = new Set();
  let matchingPlaceWitnesses = [];
  let map = null;
  let disposed = false;
  let selectedKey = null;
  let centreFrame = null;
  let centreFrame2 = null;
  let navigatorSized = false;

  const heading = el('h2', { className: 'places-heading' });
  const list = el('div', { className: 'places-list', tabindex: '-1' });
  const navigator = el('section', { className: 'places-navigator', 'aria-label': 'Ortsnavigation' }, list);
  const mapCell = el('div', { className: 'mob-map' },
    el('div', { className: 'mob-map__loading' }, 'Karte wird geladen …'));
  const mapToggle = el('button', { type: 'button', className: 'places-action',
    'aria-pressed': 'true', onClick: () => {
      mapCell.hidden = !mapCell.hidden;
      mapToggle.setAttribute('aria-pressed', String(!mapCell.hidden));
      mapToggle.textContent = mapCell.hidden ? 'Karte anzeigen' : 'Karte ausblenden';
    } }, 'Karte ausblenden');
  const navigatorToggle = el('button', { type: 'button', className: 'places-action places-navigator-toggle',
    'aria-expanded': 'true', onClick: () => setNavigatorCollapsed(!navigator.hidden) }, 'Ortsliste einklappen');
  const sort = el('select', { className: 'places-sort', 'aria-label': 'Orte sortieren',
    onChange: event => { state.sort = event.target.value; paintList(); } },
    el('option', { value: 'count' }, 'Dokumentzahl'), el('option', { value: 'name' }, 'Alphabetisch'));
  const workspace = el('div', { className: 'places-workspace' },
    el('header', { className: 'places-head' }, heading, sort, navigatorToggle, mapToggle),
    el('div', { className: 'places-body' }, navigator, mapCell));
  const stage = el('div', { className: 'places-stage view-main__stage' }, workspace);
  const detail = createSelectionDetail({ host: stage, onClose: () => {
    selectedKey = null; state.selectedCities = []; markSelection(); map?.draw();
  }, onChange: ({ open }) => { if (open && selectedKey) queueCentre(selectedKey); } });
  const sidebar = createSidebar(store, {
    yearSpan: yearBounds(store), search: { placeholder: 'Signatur, Titel, Typ oder Datum' },
    getCount: () => recordsFor(store, getFilter()).ids.size,
    getScopeDescription: () => `${new Set(scoped.map(o => o.recordId)).size} Dokumente mit Ortsbelegen; ${groups.filter(g => !g.located).length} Orte ohne Kartenpunkt.`,
    onChange: redraw,
  });
  container.appendChild(viewShell(sidebar.element,
    el('div', { className: 'places-main view-main view-main--stacked' }, stage)));

  function setNavigatorCollapsed(collapsed) {
    navigator.hidden = collapsed;
    workspace.classList.toggle('places-workspace--navigator-collapsed', collapsed);
    navigatorToggle.setAttribute('aria-expanded', String(!collapsed));
    navigatorToggle.textContent = collapsed ? 'Ortsliste einblenden' : 'Ortsliste einklappen';
  }
  function queueCentre(cityOrKey) {
    if (centreFrame) cancelAnimationFrame(centreFrame);
    if (centreFrame2) cancelAnimationFrame(centreFrame2);
    centreFrame = requestAnimationFrame(() => {
      centreFrame = null;
      centreFrame2 = requestAnimationFrame(() => {
        centreFrame2 = null;
        if (!disposed) map?.centerCity(cityOrKey);
      });
    });
  }

  function markSelection() {
    for (const button of list.querySelectorAll('[data-place-key]')) {
      button.setAttribute('aria-expanded', String(button.dataset.placeKey === selectedKey));
    }
  }
  function openCity(city, trigger) {
    const group = groups.find(g => g.city.toLowerCase() === city.toLowerCase());
    if (!group) return;
    selectedKey = group.key; state.selectedCities = [group.city];
    const detailTrigger = trigger || container.querySelector('.research-search__input') || navigatorToggle;
    const navigate = (tab, context) => {
      detail.close({ restoreFocus: false });
      navigateToView(tab, context);
    };
    detail.open({ title: group.city, kicker: 'Ortsbelege',
      subtitle: `${group.records.size} Dokumente · ${group.evidence.length} Ortsbelege`, trigger: detailTrigger,
      content: buildPlaceDetail(store, group, {
        matchingWitnesses: matchingPlaceWitnesses,
        navigate, filter: () => {
          detail.close({ restoreFocus: false });
          setFilter(buildFacetSelectionPatch(getFilter(), 'ort', [group.city]));
        }, chronik: () => {
          detail.close({ restoreFocus: false });
          setFilter(buildFacetSelectionPatch(getFilter(), 'ort', [group.city]));
          navigateToView('chronik');
        },
      }),
    });
    markSelection(); map?.draw();
    queueCentre(group.city);
  }
  function paintList() {
    const scrollTop = list.scrollTop;
    const shown = groups.slice();
    visibleEvidence = new Set(shown.flatMap(g => g.evidence));
    if (state.sort === 'name') shown.sort((a, b) => a.city.localeCompare(b.city, 'de'));
    heading.textContent = `Orte (${shown.length})`;
    clear(list);
    if (!shown.length) {
      list.appendChild(el('p', { className: 'mob-empty' }, 'Keine Ortsbelege für diese Auswahl.'));
      return;
    }
    const body = el('tbody');
    for (const group of shown) {
      const button = el('button', { type: 'button', className: 'places-name',
        'aria-expanded': String(group.key === selectedKey),
        'aria-label': `Belege zu ${group.city}`, dataset: { placeKey: group.key },
        onClick: event => openCity(group.city, event.currentTarget) }, group.city);
      body.appendChild(el('tr', {},
        el('td', {}, button, !group.located
          ? el('span', { className: 'places-location-note' }, 'Ohne Kartenpunkt') : null),
        el('td', { className: 'places-count' }, String(group.records.size))));
    }
    list.appendChild(el('table', { className: 'places-table' },
      el('caption', { className: 'visually-hidden' }, 'Orte mit der Zahl ihrer Dokumente'),
      el('thead', {}, el('tr', {}, ...['Ort', 'Dokumente'].map(label =>
        el('th', { scope: 'col' }, label)))), body));
    list.scrollTop = scrollTop;
  }
  function redraw() {
    detail.close({ restoreFocus: false });
    const filter = getFilter();
    const result = recordsFor(store, filter);
    const hasBoundPlace = (filter.predicates || []).some(predicate =>
      predicate?.type === 'entity-role' && predicate.family === 'ort');
    matchingPlaceWitnesses = hasBoundPlace
      ? result.witnesses.filter(witness => witness.dimension === 'ort') : [];
    scoped = occurrencesInCut(store, allOcc, filter);
    groups = groupPlaces(scoped);
    paintList(); map?.draw(); sidebar.update();
  }
  redraw();
  const navigatorObserver = new ResizeObserver(() => {
    if (navigatorSized || !workspace.clientWidth) return;
    navigatorSized = true;
    if (workspace.clientWidth < 760) setNavigatorCollapsed(true);
  });
  navigatorObserver.observe(workspace);
  loadCountries().then(countries => {
    if (disposed) return;
    map = buildMap(mapCell, countries, allOcc.filter(hasGeo), state, {
      isEligible: o => visibleEvidence.has(o),
      onSelectCity: (city, trigger) => openCity(city, trigger),
    });
    map.draw();
    if (selectedKey) queueCentre(selectedKey);
  }).catch(error => {
    if (disposed) return;
    clear(mapCell);
    mapCell.appendChild(el('p', { className: 'mob-empty' },
      'Karte nicht verfügbar. Alle Ortsbelege sind über die Liste erreichbar.'));
    console.warn('Ortskarte nicht verfügbar:', error);
  });
  if (wantedNavigation) {
    const navigation = wantedNavigation;
    wantedNavigation = null;
    applyNavigation(navigation);
  }
  cleanup = () => {
    disposed = true;
    if (centreFrame) cancelAnimationFrame(centreFrame);
    if (centreFrame2) cancelAnimationFrame(centreFrame2);
    navigatorObserver.disconnect(); map?.destroy(); detail.destroy(); sidebar.destroy();
    applyNavigation = null;
  };
  logStamp('karte', [['entitaeten', entities.length], ['orte', groups.length],
    ['belege', allOcc.length], ['unverortet', allOcc.filter(o => !hasGeo(o)).length],
    ['jahre', `${yearBounds(store).min}-${yearBounds(store).max}`]]);
}
