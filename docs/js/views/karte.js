/** Place evidence navigation with an optional geographic companion. */
import { el, clear } from '../utils/dom.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { createSelectionDetail } from '../ui/selection-detail.js';
import { getFilter, setFilter } from '../ui/filter-state.js';
import { navigateToView } from '../ui/router.js';
import { onViewNavigate } from '../ui/events.js';
import { recordsFor, yearBounds } from '../data/records-for.js';
import { foldText } from '../utils/normalize.js';
import { logStamp } from '../utils/env.js';
import { buildEntities, buildOccurrences, hasGeo, groupPlaces, occurrencesInCut } from './karte-data.js';
import { buildPlaceDetail } from './karte-detail.js';
import { buildMap, loadCountries } from './karte-map.js';

let cleanup = null;
let applyEntity = null;
let wantedEntity = null;
onViewNavigate('karte', detail => {
  if (!detail?.entity) return;
  if (applyEntity) applyEntity(detail.entity);
  else wantedEntity = detail.entity;
});

export function renderMobilitaet(store, container) {
  cleanup?.();
  clear(container);
  const entities = buildEntities(store);
  applyEntity = name => {
    const entity = entities.find(e => e.name === name);
    if (entity) setFilter({ [{ org: 'institution', person: 'person', werk: 'werk' }[entity.kind]]: [name] });
  };
  if (wantedEntity) { applyEntity(wantedEntity); wantedEntity = null; }
  const allOcc = buildOccurrences(store);
  const state = { selectedCities: [], query: '', sort: 'count' };
  let scoped = [];
  let groups = [];
  let visibleEvidence = new Set();
  let map = null;
  let disposed = false;
  let selectedKey = null;

  const heading = el('h2', { className: 'places-heading' });
  const list = el('div', { className: 'places-list', tabindex: '-1' });
  const mapCell = el('div', { className: 'mob-map' },
    el('div', { className: 'mob-map__loading' }, 'Karte wird geladen …'));
  const mapToggle = el('button', { type: 'button', className: 'places-action',
    'aria-pressed': 'true', onClick: () => {
      mapCell.hidden = !mapCell.hidden;
      mapToggle.setAttribute('aria-pressed', String(!mapCell.hidden));
      mapToggle.textContent = mapCell.hidden ? 'Karte anzeigen' : 'Karte ausblenden';
    } }, 'Karte ausblenden');
  const sort = el('select', { className: 'places-sort', 'aria-label': 'Orte sortieren',
    onChange: event => { state.sort = event.target.value; paintList(); } },
    el('option', { value: 'count' }, 'Dokumentzahl'), el('option', { value: 'name' }, 'Alphabetisch'));
  const workspace = el('div', { className: 'places-workspace' },
    el('header', { className: 'places-head' }, heading, sort, mapToggle),
    el('div', { className: 'places-body' }, list, mapCell));
  const stage = el('div', { className: 'places-stage view-main__stage' }, workspace);
  const detail = createSelectionDetail({ host: stage, onClose: () => {
    selectedKey = null; state.selectedCities = []; markSelection(); map?.draw();
  } });
  const query = el('input', { type: 'search', className: 'places-search',
    'aria-label': 'Ort in der Liste suchen', placeholder: 'Ort in der Liste suchen',
    onInput: event => {
      state.query = event.target.value;
      detail.close({ restoreFocus: false });
      paintList(); map?.draw(); sidebar.update();
    } });
  const currentGroups = () => groups.filter(g => foldText(g.city).includes(foldText(state.query)));
  const sidebar = createSidebar(store, {
    yearSpan: yearBounds(store), search: { placeholder: 'Signatur, Titel, Typ oder Datum' },
    getCount: () => recordsFor(store, getFilter()).ids.size,
    getScopeDescription: () => `${new Set(scoped.map(o => o.recordId)).size} Dokumente mit Ortsbelegen; ${groups.filter(g => !g.located).length} Orte ohne Kartenpunkt.`,
    sections: [{ title: 'Ortsliste', controls: [{ kind: 'custom', node: query }] }],
    localChips: () => state.query ? [{ title: 'Ortssuche', chips: [{ label: state.query,
      onRemove: () => { state.query = ''; query.value = ''; redraw(); } }] }] : [],
    onChange: redraw,
  });
  container.appendChild(viewShell(sidebar.element,
    el('div', { className: 'places-main view-main view-main--stacked' }, sidebar.strip, stage)));

  function markSelection() {
    for (const button of list.querySelectorAll('[data-place-key]')) {
      button.setAttribute('aria-expanded', String(button.dataset.placeKey === selectedKey));
    }
  }
  function openCity(city, trigger) {
    const group = groups.find(g => g.city.toLowerCase() === city.toLowerCase());
    if (!group) return;
    selectedKey = group.key; state.selectedCities = [group.city];
    const navigate = (tab, context) => {
      detail.close({ restoreFocus: false });
      navigateToView(tab, context);
    };
    detail.open({ title: group.city, kicker: 'Ortsbelege',
      subtitle: `${group.records.size} Dokumente · ${group.evidence.length} Ortsbelege`, trigger,
      content: buildPlaceDetail(store, group, {
        navigate, filter: () => {
          detail.close({ restoreFocus: false });
          setFilter({ ort: [group.city] });
        }, chronik: () => {
          detail.close({ restoreFocus: false });
          setFilter({ ort: [group.city] });
          navigateToView('chronik');
        },
      }),
    });
    markSelection(); map?.draw();
  }
  function paintList() {
    const scrollTop = list.scrollTop;
    const shown = currentGroups();
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
      const roles = group.roles.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'));
      body.appendChild(el('tr', {},
        el('td', {}, button, !group.located
          ? el('span', { className: 'places-location-note' }, 'Ohne Kartenpunkt') : null),
        el('td', { className: 'places-roles' },
          ...roles.slice(0, 2).map(role => el('span', { className: 'places-role' }, `${role.label} · ${role.count}`)),
          roles.length > 2 ? el('details', { className: 'places-more' },
            el('summary', {}, `${roles.length - 2} weitere Rollen`),
            ...roles.slice(2).map(role => el('span', { className: 'places-role' }, `${role.label} · ${role.count}`))) : null),
        el('td', { className: 'places-count' }, String(group.records.size))));
    }
    list.appendChild(el('table', { className: 'places-table' },
      el('caption', { className: 'visually-hidden' }, 'Orte und Ortsrollen mit der Zahl ihrer Dokumente'),
      el('thead', {}, el('tr', {}, ...['Ort', 'Ortsrollen · Dokumente', 'Dokumente'].map(label =>
        el('th', { scope: 'col' }, label)))), body));
    list.scrollTop = scrollTop;
  }
  function redraw() {
    detail.close({ restoreFocus: false });
    scoped = occurrencesInCut(store, allOcc, getFilter());
    groups = groupPlaces(scoped);
    paintList(); map?.draw(); sidebar.update();
  }
  redraw();
  loadCountries().then(countries => {
    if (disposed) return;
    map = buildMap(mapCell, countries, allOcc.filter(hasGeo), state, {
      isEligible: o => visibleEvidence.has(o),
      onSelectCity: (city, trigger) => openCity(city, trigger),
    });
    map.draw();
  }).catch(error => {
    if (disposed) return;
    clear(mapCell);
    mapCell.appendChild(el('p', { className: 'mob-empty' },
      'Karte nicht verfügbar. Alle Ortsbelege sind über die Liste erreichbar.'));
    console.warn('Ortskarte nicht verfügbar:', error);
  });
  cleanup = () => { disposed = true; map?.destroy(); detail.destroy(); sidebar.destroy(); };
  logStamp('karte', [['entitaeten', entities.length], ['orte', groups.length],
    ['belege', allOcc.length], ['unverortet', allOcc.filter(o => !hasGeo(o)).length],
    ['jahre', `${yearBounds(store).min}-${yearBounds(store).max}`]]);
}
