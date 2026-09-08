import { el, clear } from '../utils/dom.js';
import { buildMap, loadCountries } from './karte-map.js';
import { groupPlaces, hasGeo, occurrencesInCut, placeStatementKey, placeRoleLabel } from '../data/place-evidence.js';
import { sourceReference } from '../data/evidence.js';
import { getFilter } from '../ui/filter-state.js';
import { emptyState, appendAccessibleList } from './dashboard-shared.js';

function mapAggregate(group, denominator) {
  const recordIds = [...group.records].sort();
  const witnesses = group.evidence.map(statement => ({
    kind: 'place-statement', key: placeStatementKey(statement), recordId: statement.recordId,
    label: `${statement.place} · ${placeRoleLabel(statement)} · ${statement.date || 'ohne eigenes Datum'}`,
    role: statement.roleId || statement.role || null, date: statement.date,
    documentDate: statement.documentDate, primaryAnchor: statement.recordDate,
    source: statement.xlsxSource ? { ...statement.xlsxSource, recordId: statement.recordId } : null,
    sourceRef: sourceReference(statement.recordId, statement.xlsxSource,
      { nodeId: statement.id, kind: 'place-statement' }),
  }));
  return { key: `place:${group.key}`, label: group.city, dimensions: { place: group.city },
    recordIds, count: recordIds.length, unit: 'documents', denominator,
    denominatorDefinition: 'Dokumente im gemeinsamen Schnitt', witnesses,
    sourceRefs: witnesses.map(witness => witness.source).filter(Boolean),
    descriptor: { type: 'records', ids: recordIds } };
}

export function renderPlaceMap(host, context) {
  clear(host);
  const eligible = occurrencesInCut(context.store, context.placeStatements, getFilter())
    .filter(statement => context.cutIds.has(statement.recordId));
  if (!eligible.length) {
    emptyState(host, 'Der aktuelle Schnitt enthält keine Ortsaussagen.');
    return { aggregates: [], destroy() { clear(host); } };
  }
  const state = { selectedCities: [] };
  const groups = groupPlaces(eligible);
  const aggregates = groups.map(group => mapAggregate(group, context.cutIds.size));
  const byCity = new Map(aggregates.map(item => [item.label, item]));
  const mapHost = el('div', { className: 'dashboard-map mob-map' });
  host.appendChild(mapHost);
  let map = null, destroyed = false, centreFrame = null, settleFrame = null;
  let selectedCity = null;
  let highlightedIds = context.highlightedIds || new Set();
  function highlight(ids) {
    highlightedIds = ids;
    state.selectedCities = groups.filter(group => [...group.records].some(id => ids.has(id)))
      .map(group => group.city);
    map?.draw();
  }
  function centre(city) {
    selectedCity = city;
    cancelAnimationFrame(centreFrame); cancelAnimationFrame(settleFrame);
    centreFrame = requestAnimationFrame(() => {
      settleFrame = requestAnimationFrame(() => { if (!destroyed) map?.centerCity(city); });
    });
  }
  function select(aggregate, trigger) {
    context.onSelect(aggregate, trigger);
    centre(aggregate.label);
  }
  loadCountries().then(countries => {
    if (destroyed) return;
    map = buildMap(mapHost, countries, eligible, state, {
      isEligible: hasGeo,
      onSelectCity(city, trigger) {
        const aggregate = byCity.get(city);
        if (aggregate) select(aggregate, trigger);
      },
    });
    highlight(highlightedIds);
    if (selectedCity) centre(selectedCity);
  }).catch(() => { if (!destroyed) emptyState(mapHost, 'Die Karten-Geometrie konnte nicht geladen werden. Die Ortsbelege bleiben in der Werteliste erreichbar.'); });
  const missing = eligible.filter(statement => !hasGeo(statement));
  host.appendChild(el('p', { className: 'dashboard-note' },
    `${groups.length} Orte; ${new Set(missing.map(value => value.recordId)).size} Dokumente mit Ortsaussagen ohne Kartenpunkt.`));
  appendAccessibleList(host, aggregates, { ...context, onSelect: select });
  return { aggregates, highlight, destroy() {
    destroyed = true; cancelAnimationFrame(centreFrame); cancelAnimationFrame(settleFrame);
    map?.destroy(); clear(host);
  } };
}
