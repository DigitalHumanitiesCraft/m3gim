/**
 * M³GIM Main Entry Point
 * Loads archive data, initializes router, renders views on demand.
 */

import { loadArchive } from './data/loader.js';
import { initRouter, getState } from './ui/router.js';
import { initKorb, onKorbChange, getKorbCount, getKorbItems } from './ui/korb.js';
import { renderBestand, selectArchivRecord } from './views/archiv-bestand.js';
import { renderChronik } from './views/archiv-chronik.js';
import { renderStatistik } from './views/statistik.js';
import { renderIndizes, expandEntry } from './views/indizes.js';
import { renderKorb } from './views/korb.js';
import { renderMobilitaetsAtlas } from './views/mobilitaets-atlas.js';
import { renderRepertoire, repertoireAggregate } from './views/repertoire.js';
import { renderBiogramm, biogrammData } from './views/biogramm.js';
import { renderNetzwerk, netzwerkAggregate } from './views/netzwerk.js';

const DEV = typeof location !== 'undefined'
  && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

let store = null;
const renderedTabs = new Set();

/** Tab renderer registry — maps tab name to render function. */
const TAB_RENDERERS = new Map([
  ['bestand',            (s, c) => renderBestand(s, c)],
  ['chronik',            (s, c) => renderChronik(s, c)],
  ['statistik',          (s, c) => renderStatistik(s, c)],
  ['indizes',            (s, c) => renderIndizes(s, c)],
  ['mobilitaets-atlas',  (s, c) => renderMobilitaetsAtlas(s, c)],
  ['repertoire',         (s, c) => renderRepertoire(s, c)],
  ['biogramm',           (s, c) => renderBiogramm(s, c)],
  ['netzwerk',           (s, c) => renderNetzwerk(s, c)],
  ['korb',               (s, c) => renderKorb(s, c)],
]);

async function init() {
  try {
    // Show loading state
    showLoading(true);

    // Load data
    store = await loadArchive('./data/m3gim.jsonld');
    if (DEV) {
      logStoreSummary(store);
      exposeDebug(store);
    }

    // Hide loading
    showLoading(false);

    // Initialize korb (before router)
    initKorb();
    onKorbChange(() => updateKorbTabVisibility());
    updateKorbTabVisibility();

    // Initialize router
    initRouter({
      onTab: (tab) => renderTab(tab),
      onRecord: (recordId) => {
        if (!recordId) return;
        const { activeTab } = getState();
        if (activeTab === 'bestand') {
          // Expand record inline in the Bestand view
          selectArchivRecord(recordId);
          return;
        }
        // Navigate to Bestand tab and show record inline
        window.location.hash = '#bestand/' + encodeURIComponent(recordId);
      },
      onIndex: (gridType, entityName) => {
        renderTab('indizes');
        expandEntry(gridType, entityName);
      },
    });

    // Render initial tab
    renderTab(getState().activeTab);

  } catch (err) {
    console.error('M³GIM init error:', err);
    showError(err.message);
  }
}

function renderTab(tab) {
  // Lazy render: only render a tab the first time it's activated
  if (renderedTabs.has(tab)) return;
  renderedTabs.add(tab);

  const container = document.getElementById(`tab-${tab}`);
  if (!container) return;

  const renderer = TAB_RENDERERS.get(tab);
  if (!renderer) return;

  if (DEV) logTabActivation(tab, store);

  try {
    const result = renderer(store, container);
    if (result && typeof result.catch === 'function') {
      result.catch(err => showTabError(tab, container, err));
    }
  } catch (err) {
    showTabError(tab, container, err);
  }
}

/** Kurze Diagnostik beim erstmaligen Öffnen eines Tabs: welche Datenmengen nutzt die View? */
function logTabActivation(tab, s) {
  const profile = {
    bestand:             () => ({ records: s.allRecords.length, bearbeitet: s.allRecords.length - s.unprocessedIds.size, finances: s.finances.size, agentRel: s.agentRelations.size }),
    chronik:             () => ({ records: s.allRecords.length, bearbeitet: s.allRecords.length - s.unprocessedIds.size }),
    statistik:           () => ({ records: s.allRecords.length, konvolute: s.konvolute.size, events: s.mobilityEvents.size, personen: s.persons.size }),
    indizes:             () => ({ persons: s.persons.size, orgs: s.organizations.size, locs: s.locations.size, works: s.works.size, agentRel: s.agentRelations.size, relResolved: s.agentRelationResolvedCount || 0 }),
    'mobilitaets-atlas': () => {
      const all = [...s.mobilityEvents.values()];
      const withGeo = all.filter(e => typeof e.placeLat === 'number' && typeof e.placeLon === 'number');
      return { events: all.length, withGeo: withGeo.length, unverortet: all.length - withGeo.length };
    },
    repertoire: () => {
      const agg = repertoireAggregate();
      return { works: agg?.works.length || 0, composers: agg?.composers.length || 0 };
    },
    biogramm: () => {
      const bio = biogrammData();
      return { orte: bio?.orte.length || 0, belege: bio?.belege.length || 0 };
    },
    netzwerk: () => {
      const agg = netzwerkAggregate();
      return { agenten: agg?.length || 0 };
    },
    korb: () => {
      const ids = getKorbItems();
      let relations = 0;
      let finances = 0;
      let events = 0;
      for (const id of ids) {
        relations += (s.agentRelations.get(id) || []).length;
        finances += (s.finances.get(id) || []).length;
        events += (s.recordToEvents.get(id) || []).length;
      }
      return { records: ids.length, relations, finances, events };
    },
  };
  const fn = profile[tab];
  if (!fn) return;
  console.log(`%c[${tab}] geöffnet`, 'color: #2E7D4F; font-weight: bold', fn());
}

function showTabError(tab, container, err) {
  console.error(`[${tab}] Render-Fehler:`, err);
  container.innerHTML = `
    <div style="color: #8B3A3A; text-align: center; padding: 40px; font-family: var(--font-sans);">
      <p style="font-weight: 600; margin-bottom: 8px;">Fehler in dieser Ansicht</p>
      <p style="font-size: 0.8rem; opacity: 0.7;">${err.message || 'Unbekannter Fehler'}</p>
    </div>
  `;
  // Allow re-render on next tab switch
  renderedTabs.delete(tab);
}

function showLoading(show) {
  const spinner = document.getElementById('loading-spinner');
  const main = document.getElementById('main-content');
  if (spinner) spinner.hidden = !show;
  if (main) main.hidden = show;
}

function showError(message) {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.innerHTML = `
      <div style="color: #8B3A3A; text-align: center; padding: 40px;">
        <p style="font-weight: 600; margin-bottom: 8px;">Fehler beim Laden</p>
        <p style="font-size: 0.8rem;">${message}</p>
      </div>
    `;
  }
}

function updateKorbTabVisibility() {
  const count = getKorbCount();
  const badge = document.getElementById('korb-badge');
  if (badge) {
    badge.textContent = String(count);
    badge.hidden = count <= 0;
  }

  if (renderedTabs.has('korb')) {
    renderedTabs.delete('korb');
    const { activeTab } = getState();
    if (activeTab === 'korb') renderTab('korb');
  }
}

// ----------------------------------------------------------------------
// DEV-Logging + Debug-Helper (localhost only, silent in production)
// ----------------------------------------------------------------------

/**
 * Strukturierter Load-Report in der Konsole: Base-Counts + alle Phase-6-Maps.
 * Gibt auf einen Blick Auskunft, ob die Daten im erwarteten Umfang ankommen.
 */
function logStoreSummary(s) {
  const wdCount = (map) => {
    let n = 0;
    for (const entry of map.values()) {
      if (entry.wikidata && String(entry.wikidata).startsWith('wd:')) n++;
    }
    return n;
  };
  const pct = (n, t) => t > 0 ? `${Math.round(n / t * 100)} %` : '0 %';

  const wdP = wdCount(s.persons), wdO = wdCount(s.organizations);
  const wdL = wdCount(s.locations), wdW = wdCount(s.works);

  // Provenance-Coverage
  let recProv = 0, nestedTotal = 0, nestedProv = 0;
  for (const rec of s.allRecords) {
    if (rec['m3gim:xlsxSource']) recProv++;
    const details = rec['m3gim:hasDetail'];
    const detailList = Array.isArray(details) ? details : (details ? [details] : []);
    for (const d of detailList) {
      if (d && d['@type'] === 'm3gim:DetailAnnotation') {
        nestedTotal++;
        if (d['m3gim:xlsxSource']) nestedProv++;
      }
    }
    const rels = rec['m3gim:agentRelation'];
    const relList = Array.isArray(rels) ? rels : (rels ? [rels] : []);
    for (const r of relList) {
      if (r) {
        nestedTotal++;
        if (r['m3gim:xlsxSource']) nestedProv++;
      }
    }
  }

  console.group('%c[M³GIM] Store geladen', 'color: #004A8F; font-weight: bold; font-size: 1.1em');
  console.log(`Export: ${s.exportDate || 'unbekannt'}`);
  console.table({
    Records:          { count: s.allRecords.length, wikidata: '—' },
    Konvolute:        { count: s.konvolute.size,    wikidata: '—' },
    Personen:         { count: s.persons.size,        wikidata: `${wdP} (${pct(wdP, s.persons.size)})` },
    Organisationen:   { count: s.organizations.size,  wikidata: `${wdO} (${pct(wdO, s.organizations.size)})` },
    Orte:             { count: s.locations.size,      wikidata: `${wdL} (${pct(wdL, s.locations.size)})` },
    Werke:            { count: s.works.size,          wikidata: `${wdW} (${pct(wdW, s.works.size)})` },
  });
  console.log(
    `%cProvenance: ${recProv}/${s.allRecords.length} Records + ${nestedProv}/${nestedTotal} nested entities mit xlsxSource`,
    'color: #5C5651; font-style: italic'
  );
  console.group('%cv2-Store-Maps (Phase 6)', 'color: #8B3A3A; font-weight: bold');
  console.table({
    'dftHierarchy':      { size: s.dftHierarchy.size,   beschreibung: 'SKOS-Concepts mit broader+children' },
    'mobilityEvents':    { size: s.mobilityEvents.size, beschreibung: 'SpatiotemporalEvents (Top-Level)' },
    'recordToEvents':    { size: s.recordToEvents.size, beschreibung: 'Records mit STE-Refs' },
    'agentRelations':    { size: s.agentRelations.size, beschreibung: 'Records mit AgRelOn-Einträgen' },
    'finances':          { size: s.finances.size,       beschreibung: 'Records mit Finanz-Details' },
  });
  console.groupEnd();
  console.log('%cTipp: window.m3gim.store greift auf alle Daten zu', 'color: gray; font-style: italic');
  console.log('%c     window.m3gim.inspect("m3gim:NIM_007_5_1") zeigt Record-Details', 'color: gray; font-style: italic');
  console.groupEnd();
}

/**
 * Exponiert den Store + Inspektionsfunktionen auf window — nur im DEV-Modus.
 * Ermöglicht manuelle Prüfung in der DevTools-Konsole:
 *   window.m3gim.store                   → kompletter Store
 *   window.m3gim.inspect('m3gim:NIM_007_5_1')  → Record mit allen v2-Maps
 *   window.m3gim.finances()              → Alle Finanz-Einträge
 *   window.m3gim.agentRelations()        → Alle AgRelOn-Beziehungen
 *   window.m3gim.mobilityEvents()        → Alle SpatiotemporalEvents
 *   window.m3gim.dftTree()               → DFT-Hierarchie als Baum
 */
function exposeDebug(s) {
  window.m3gim = {
    store: s,
    inspect(recordId) {
      const record = s.records.get(recordId);
      if (!record) return { error: `Kein Record ${recordId}` };
      return {
        record,
        events: (s.recordToEvents.get(recordId) || []).map(eid => s.mobilityEvents.get(eid)),
        agentRelations: s.agentRelations.get(recordId) || [],
        finances: s.finances.get(recordId) || [],
        konvolut: s.childToKonvolut.get(recordId) || null,
      };
    },
    finances() {
      const rows = [];
      for (const [rid, entries] of s.finances) {
        for (const e of entries) rows.push({ record: rid, ...e });
      }
      console.table(rows);
      return rows;
    },
    agentRelations() {
      const rows = [];
      for (const [rid, entries] of s.agentRelations) {
        for (const e of entries) rows.push({ record: rid, type: e.type, object: e.objectName, wd: e.objectWikidata || '' });
      }
      console.table(rows);
      return rows;
    },
    mobilityEvents() {
      const rows = [...s.mobilityEvents.values()].map(e => ({
        event: e.id, record: e.recordId, place: e.place, date: e.date, role: e.role,
      }));
      console.table(rows);
      return rows;
    },
    repertoireAggregate() {
      const agg = repertoireAggregate();
      if (!agg) return null;
      console.log('Werke:'); console.table(agg.works);
      console.log('Komponisten:'); console.table(agg.composers);
      return agg;
    },
    biogrammData() {
      const bio = biogrammData();
      if (!bio) return null;
      console.log('Orte:'); console.table(bio.orte);
      console.log('Belege:'); console.table(bio.belege.slice(0, 20));
      return bio;
    },
    netzwerkAggregate() {
      const agg = netzwerkAggregate();
      if (!agg) return null;
      console.table(agg.map(e => ({ name: e.name, summe: e.summe, records: e.records.size })));
      return agg;
    },
    mobilityEventsWithGeo() {
      const rows = [...s.mobilityEvents.values()]
        .filter(e => typeof e.placeLat === 'number' && typeof e.placeLon === 'number')
        .map(e => ({
          event: e.id, record: e.recordId, place: e.place, date: e.date,
          lat: e.placeLat, lon: e.placeLon, country: e.placeCountry || '',
        }));
      console.table(rows);
      return rows;
    },
    dftTree() {
      const roots = [...s.dftHierarchy.values()].filter(c => !c.broader);
      const render = (c, depth = 0) => {
        console.log(`${'  '.repeat(depth)}• ${c.prefLabel} (${c.children.length} Kinder)`);
        for (const childId of c.children) {
          const child = s.dftHierarchy.get(childId);
          if (child) render(child, depth + 1);
        }
      };
      console.group('DFT-Hierarchie');
      for (const r of roots) render(r);
      console.groupEnd();
      return roots;
    },
    /**
     * Provenance-Uebersicht fuer einen Record: welche XLSX-Quellen liegen
     * dahinter (direkt + nested). Gibt Liste mit {field, sheet, row} zurueck.
     */
    provenanceOf(recordId) {
      const rec = s.records.get(recordId) || s.bySignatur.get(recordId);
      if (!rec) return { error: `Kein Record ${recordId}` };
      const rows = [];
      const src = rec['m3gim:xlsxSource'];
      if (src) rows.push({ field: 'record', sheet: src['m3gim:xlsxSheet'], row: src['m3gim:xlsxRow'], datenpunkt: src['m3gim:datenpunktId'] || '' });
      const details = Array.isArray(rec['m3gim:hasDetail']) ? rec['m3gim:hasDetail'] : (rec['m3gim:hasDetail'] ? [rec['m3gim:hasDetail']] : []);
      for (const d of details) {
        const s2 = d && d['m3gim:xlsxSource'];
        if (s2) rows.push({ field: `detail:${d['m3gim:detailField'] || '?'}`, sheet: s2['m3gim:xlsxSheet'], row: s2['m3gim:xlsxRow'], datenpunkt: s2['m3gim:datenpunktId'] || '' });
      }
      const rels = Array.isArray(rec['m3gim:agentRelation']) ? rec['m3gim:agentRelation'] : (rec['m3gim:agentRelation'] ? [rec['m3gim:agentRelation']] : []);
      for (const r of rels) {
        const s2 = r && r['m3gim:xlsxSource'];
        if (s2) rows.push({ field: `agrelon:${r['@type'] || '?'}`, sheet: s2['m3gim:xlsxSheet'], row: s2['m3gim:xlsxRow'], datenpunkt: s2['m3gim:datenpunktId'] || '' });
      }
      console.table(rows);
      return rows;
    },
  };
}

// Boot
document.addEventListener('DOMContentLoaded', init);
