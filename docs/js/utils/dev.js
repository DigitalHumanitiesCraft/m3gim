/**
 * DEV-Logging und Debug-Helfer, nur auf localhost geladen (E-50).
 *
 * Das Modul haengt an main.js allein ueber einen dynamischen Import unter
 * IS_DEV. Auf dhcraft.org wird es damit nicht einmal geholt, und die
 * Abhaengigkeiten, die nur die Diagnose braucht (Provenance-Extraktion,
 * Netzwerk-Aggregat, Jahresextraktion), stehen nicht mehr
 * im Startpfad der Anwendung.
 */

import { ensureArray } from './format.js';
import { extractXlsxSource } from './provenance.js';
import { extractYear } from './date-parser.js';
import { getKorbItems } from '../ui/basket.js';
import { netzwerkAggregate } from '../views/netzwerk.js';

/** Kurze Diagnostik beim erstmaligen Öffnen eines Tabs: welche Datenmengen nutzt die View? */
export function logTabActivation(tab, s) {
  const profile = {
    bestand:             () => ({ records: s.allRecords.length, bearbeitet: s.allRecords.length - s.unprocessedIds.size, finances: s.finances.size, agentRel: s.agentRelations.size }),
    chronik:             () => ({ records: s.allRecords.length, bearbeitet: s.allRecords.length - s.unprocessedIds.size }),
    statistik:           () => ({ records: s.allRecords.length, konvolute: s.konvolute.size, events: s.mobilityEvents.size, personen: s.persons.size }),
    indizes:             () => ({ persons: s.persons.size, orgs: s.organizations.size, locs: s.locations.size, works: s.works.size, agentRel: s.agentRelations.size, relResolved: s.agentRelationResolvedCount || 0 }),
    karte:               () => {
      const all = [...s.mobilityEvents.values()];
      return { events: all.length, datiert: all.filter(e => extractYear(e.date) !== null).length, verortet: all.filter(e => typeof e.placeLat === 'number').length };
    },
    netzwerk: () => {
      const g = netzwerkAggregate();
      return g ? { knoten: g.nodes.length, records: g.stats.records, eng: g.stats.eng } : {};
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

/**
 * Strukturierter Load-Report in der Konsole: Base-Counts + alle Phase-6-Maps.
 * Gibt auf einen Blick Auskunft, ob die Daten im erwarteten Umfang ankommen.
 */
export function logStoreSummary(s) {
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

  // Provenance-Coverage. Die Zeilenherkunft liest ueberall extractXlsxSource,
  // damit das Format nur an einer Stelle festgelegt ist.
  let recProv = 0, nestedTotal = 0, nestedProv = 0;
  for (const rec of s.allRecords) {
    if (extractXlsxSource(rec)) recProv++;
    for (const d of ensureArray(rec['m3gim-ontology:hasDetail'])) {
      if (d && d['@type'] === 'm3gim-ontology:Annotation') {
        nestedTotal++;
        if (extractXlsxSource(d)) nestedProv++;
      }
    }
    for (const r of ensureArray(rec['m3gim-ontology:hasAgentRelation'])) {
      if (r) {
        nestedTotal++;
        if (extractXlsxSource(r)) nestedProv++;
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
    'annotations':       { size: s.annotations.size,    beschreibung: 'Annotationen: Datierung, Verortung oder beides' },
    'mobilityEvents':    { size: s.mobilityEvents.size, beschreibung: 'davon verortet' },
    'recordToEvents':    { size: s.recordToEvents.size, beschreibung: 'Records mit verorteten Annotationen' },
    'agentRelations':    { size: s.agentRelations.size, beschreibung: 'Records mit AgRelOn-Einträgen' },
    'finances':          { size: s.finances.size,       beschreibung: 'Records mit Finanz-Details' },
  });
  console.groupEnd();
  console.log('%cTipp: window.m3gim.store greift auf alle Daten zu', 'color: gray; font-style: italic');
  console.log('%c     window.m3gim.inspect("m3gim-data:NIM_007_5_1") zeigt Record-Details', 'color: gray; font-style: italic');
  console.groupEnd();
}

/**
 * Exponiert den Store + Inspektionsfunktionen auf window — nur im DEV-Modus.
 * Ermöglicht manuelle Prüfung in der DevTools-Konsole:
 *   window.m3gim.store                   → kompletter Store
 *   window.m3gim.inspect('m3gim-data:NIM_007_5_1')  → Record mit allen v2-Maps
 *   window.m3gim.finances()              → Alle Finanz-Einträge
 *   window.m3gim.agentRelations()        → Alle AgRelOn-Beziehungen
 *   window.m3gim.mobilityEvents()        → Alle verorteten Annotationen
 *   window.m3gim.dftTree()               → DFT-Hierarchie als Baum
 */
export function exposeDebug(s) {
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
        annotation: e.id, record: e.recordId, place: e.place, date: e.date,
        rolle: e.roleLabel, sicht: e.cluster || '', bezugsebene: e.scope || '',
      }));
      console.table(rows);
      return rows;
    },
    netzwerkAggregate() {
      const g = netzwerkAggregate();
      if (!g) return null;
      console.table(g.nodes.map(n => ({
        typ: n.type, name: n.name, gemeinsam: n.weight, ring: n.ring, evidenz: n.evidence,
      })));
      return g;
    },
    mobilityEventsWithGeo() {
      const rows = [...s.mobilityEvents.values()]
        .filter(e => typeof e.placeLat === 'number' && typeof e.placeLon === 'number')
        .map(e => ({
          annotation: e.id, record: e.recordId, place: e.place, date: e.date,
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
      const row = (field, src) => {
        if (src) rows.push({ field, sheet: src.sheet || '', row: src.row, datenpunkt: src.datenpunkt || '' });
      };
      row('record', extractXlsxSource(rec));
      for (const d of ensureArray(rec['m3gim-ontology:hasDetail'])) {
        row(`detail:${(d && d['m3gim-ontology:detailField']) || '?'}`, extractXlsxSource(d));
      }
      for (const r of ensureArray(rec['m3gim-ontology:hasAgentRelation'])) {
        row(`agrelon:${(r && r['@type']) || '?'}`, extractXlsxSource(r));
      }
      // Die Annotationen haengen als eigene Knoten am Graph; ihre Herkunft
      // liegt im Store bereits normalisiert vor.
      for (const aid of (s.recordToAnnotations.get(rec['@id']) || [])) {
        const a = s.annotations.get(aid);
        if (a) row(`annotation:${a.roleLabel || '?'}`, a.xlsxSource);
      }
      console.table(rows);
      return rows;
    },
  };
}
