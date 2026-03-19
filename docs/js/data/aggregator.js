/**
 * M³GIM Data Aggregator
 * Client-side aggregation of JSON-LD store into view-specific data.
 * Mirrors the logic from scripts/build-views.py.
 */

import { extractYear, get5YearPeriod } from '../utils/date-parser.js';
import { ensureArray, getDocTypeId } from '../utils/format.js';
import { normalizePerson, getPersonKategorie } from '../utils/normalize.js';
import {
  KOMPONISTEN_MAPPING, KOMPONISTEN_NORMALISIERUNG, KOMPONISTEN_FARBEN,
  KOMPONISTEN_NAMEN, PERSONEN_KATEGORIEN, PERSONEN_FARBEN, ZEITRAEUME,
} from './constants.js';

// =========================================================================
// Matrix
// =========================================================================

/**
 * aggregateMatrix — aggregates person × life-phase heatmap data.
 * @param {Object} store - the JSON-LD store
 * @param {Array} lebensphasen - array of {id, label, von, bis} from partitur.json
 *   Falls back to ZEITRAEUME-based 5-year periods when lebensphasen is empty/null.
 */
export function aggregateMatrix(store, lebensphasen) {
  const phasen = lebensphasen && lebensphasen.length > 0 ? lebensphasen : null;
  const phasenIds = phasen ? phasen.map(p => p.id) : ZEITRAEUME;

  /** Map year → phase id */
  function yearToPhase(year) {
    if (phasen) {
      for (const p of phasen) {
        if (year >= p.von && year < p.bis) return p.id;
      }
      // Inclusive upper bound for last phase
      const last = phasen[phasen.length - 1];
      if (year === last.bis) return last.id;
      return null;
    }
    const periode = get5YearPeriod(year);
    return periode && ZEITRAEUME.includes(periode) ? periode : null;
  }

  const personMap = new Map(); // name → { kategorie, begegnungen: Map<phaseId, {intensitaet, docs}> }

  for (const record of store.allRecords) {
    const year = extractYear(record['rico:date']);
    if (!year) continue;
    const phase = yearToPhase(year);
    if (!phase) continue;

    const docType = getDocTypeId(record) || '';
    const weight = getIntensityWeight(docType);

    // Collect agents and mentioned persons (now in subjects with @type rico:Person)
    const agents = ensureArray(record['m3gim:hasAssociatedAgent']);
    const mentionedPersons = ensureArray(record['rico:hasOrHadSubject'])
      .filter(s => s['@type'] === 'rico:Person');
    const allPersons = [...agents, ...mentionedPersons];

    for (const agent of allPersons) {
      const rawName = agent.name || agent['skos:prefLabel'] || '';
      if (!rawName) continue;

      // Skip composers — they belong in Kosmos, not Matrix
      if (isComposerName(rawName)) continue;

      const name = normalizePerson(rawName);

      if (!personMap.has(name)) {
        personMap.set(name, {
          kategorie: getPersonKategorie(name),
          begegnungen: new Map(),
        });
      }
      const person = personMap.get(name);
      if (!person.begegnungen.has(phase)) {
        person.begegnungen.set(phase, { intensitaet: 0, anzahl: 0, dokumente: [] });
      }
      const beg = person.begegnungen.get(phase);
      beg.intensitaet += weight;
      beg.anzahl++;
      // Collect locations for this record
      const recLocs = ensureArray(record['rico:hasOrHadLocation'])
        .map(loc => loc.name || loc['rico:name'] || '')
        .filter(Boolean);

      if (beg.dokumente.length < 10) {
        beg.dokumente.push({
          signatur: record['rico:identifier'],
          titel: (record['rico:title'] || '').slice(0, 80),
          typ: docType,
          orte: recLocs,
        });
      }
    }

    // Also extract persons from title matching
    const title = (record['rico:title'] || '').toLowerCase();
    for (const [keyword, kat] of Object.entries(PERSONEN_KATEGORIEN)) {
      if (title.includes(keyword) && !allPersons.some(a => (a.name || '').toLowerCase().includes(keyword))) {
        const fullName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        if (!personMap.has(fullName)) {
          personMap.set(fullName, { kategorie: kat, begegnungen: new Map() });
        }
        const person = personMap.get(fullName);
        if (!person.begegnungen.has(phase)) {
          person.begegnungen.set(phase, { intensitaet: 0, anzahl: 0, dokumente: [] });
        }
        const beg = person.begegnungen.get(phase);
        beg.intensitaet += weight;
        beg.anzahl++;
      }
    }
  }

  // Convert to sorted array
  const personen = [...personMap.entries()].map(([name, data]) => {
    const begegnungen = phasenIds.map(z => {
      const beg = data.begegnungen.get(z);
      return beg
        ? { zeitraum: z, intensitaet: beg.intensitaet, anzahl_dokumente: beg.anzahl, dokumente: beg.dokumente }
        : { zeitraum: z, intensitaet: 0, anzahl_dokumente: 0, dokumente: [] };
    });
    const gesamt = begegnungen.reduce((sum, b) => sum + b.intensitaet, 0);
    const anzahl_gesamt = begegnungen.reduce((sum, b) => sum + b.anzahl_dokumente, 0);
    return { name, kategorie: data.kategorie, begegnungen, gesamt_intensitaet: gesamt, anzahl_gesamt };
  }).sort((a, b) => b.gesamt_intensitaet - a.gesamt_intensitaet);

  return {
    zeitraeume: phasenIds,
    phasenLabels: phasen ? Object.fromEntries(phasen.map(p => [p.id, p.label])) : null,
    phasenJahre: phasen ? Object.fromEntries(phasen.map(p => [p.id, `${p.von}\u2013${p.bis}`])) : null,
    personen,
  };
}

function isComposerName(name) {
  const lower = name.toLowerCase().trim();
  // Check against known composer names
  for (const compName of KOMPONISTEN_NAMEN) {
    if (lower.includes(compName)) return true;
  }
  return false;
}

function getIntensityWeight(docType) {
  if (docType === 'brief') return 3;
  if (['programmheft', 'plakat', 'vertrag'].includes(docType)) return 2;
  return 1;
}

// =========================================================================
// Shared: Komponisten-Map Builder (used by Kosmos + Zeitfluss)
// =========================================================================

/**
 * buildKomponistenMap — extracts composer → works structure from store.
 * Pass 1: Structured data from rico:hasOrHadSubject (MusicalWork).
 * Pass 2: Title-matching fallback for records without structured work data.
 *
 * Each entry: { dokumente: Set<id>, werke: Map<werkName, {
 *   docs: Set, signaturen: Set, orte: Map<name,count>, rollen: Map<name,count>, jahre: Set
 * }> }
 *
 * @param {Object} store
 * @returns {Map}
 */
function buildKomponistenMap(store) {
  const kompMap = new Map();

  // --- Pass 1: Structured data from rico:hasOrHadSubject ---
  for (const record of store.allRecords) {
    const subjects = ensureArray(record['rico:hasOrHadSubject']);
    for (const subj of subjects) {
      if (subj['@type'] !== 'm3gim:MusicalWork') continue;
      const werkName = subj.name || '';
      const rawKomponist = subj.komponist || '';
      if (!werkName && !rawKomponist) continue;

      const komponist = normalizeKomponist(rawKomponist);
      if (!komponist) continue;

      if (!kompMap.has(komponist)) {
        kompMap.set(komponist, { dokumente: new Set(), werke: new Map() });
      }
      const kEntry = kompMap.get(komponist);
      kEntry.dokumente.add(record['@id']);

      if (werkName) {
        if (!kEntry.werke.has(werkName)) {
          kEntry.werke.set(werkName, { docs: new Set(), signaturen: new Set(), orte: new Map(), rollen: new Map(), jahre: new Set() });
        }
        const wEntry = kEntry.werke.get(werkName);
        wEntry.docs.add(record['@id']);
        if (record['rico:identifier']) wEntry.signaturen.add(record['rico:identifier']);
        const yr = extractYear(record['rico:date']);
        if (yr) wEntry.jahre.add(yr);
      }
    }

    // Harvest performance roles
    const roles = ensureArray(record['m3gim:hasPerformanceRole']);
    for (const role of roles) {
      const roleName = role.name || role['skos:prefLabel'] || '';
      for (const subj of subjects) {
        if (subj['@type'] === 'm3gim:MusicalWork' && subj.name) {
          const komponist = normalizeKomponist(subj.komponist || '');
          if (komponist && kompMap.has(komponist)) {
            const werk = kompMap.get(komponist).werke.get(subj.name);
            if (werk && roleName) {
              werk.rollen.set(roleName, (werk.rollen.get(roleName) || 0) + 1);
            }
          }
        }
      }
    }

    // Locations → attribute to all works in this record
    const locs = ensureArray(record['rico:hasOrHadLocation']);
    for (const loc of locs) {
      const locName = loc.name || '';
      if (!locName || loc.role === 'erscheinungsdatum') continue;
      for (const subj of subjects) {
        if (subj['@type'] === 'm3gim:MusicalWork' && subj.name) {
          const komponist = normalizeKomponist(subj.komponist || '');
          if (komponist && kompMap.has(komponist)) {
            const werk = kompMap.get(komponist).werke.get(subj.name);
            if (werk) {
              werk.orte.set(locName, (werk.orte.get(locName) || 0) + 1);
            }
          }
        }
      }
    }
  }

  // --- Pass 2: Title-matching fallback ---
  for (const record of store.allRecords) {
    const subjects = ensureArray(record['rico:hasOrHadSubject']);
    if (subjects.some(s => s['@type'] === 'm3gim:MusicalWork')) continue;

    const title = (record['rico:title'] || '').toLowerCase();
    for (const [keyword, komponist] of Object.entries(KOMPONISTEN_MAPPING)) {
      if (title.includes(keyword)) {
        if (!kompMap.has(komponist)) {
          kompMap.set(komponist, { dokumente: new Set(), werke: new Map() });
        }
        kompMap.get(komponist).dokumente.add(record['@id']);
        break;
      }
    }
  }

  return kompMap;
}

// =========================================================================
// Kosmos
// =========================================================================

export function aggregateKosmos(store) {
  const kompMap = buildKomponistenMap(store);

  // Convert to output format, enriched with role and type info
  const ANDERE_THRESHOLD = 1; // composers with ≤ this many docs → "Andere" group
  const allKomponisten = [...kompMap.entries()].map(([name, data]) => ({
    name,
    farbe: KOMPONISTEN_FARBEN[name] || KOMPONISTEN_FARBEN['Andere'],
    dokumente_gesamt: data.dokumente.size,
    werke: [...data.werke.entries()].map(([werkName, w]) => {
      const rollen = [...w.rollen.entries()]
        .map(([n, c]) => ({ name: n, count: c }))
        .sort((a, b) => b.count - a.count);
      // Primary role: highest count, but only if plausible (count ≥ 2, or single role)
      const rolleHaupt = rollen.length > 0 && (rollen[0].count >= 2 || rollen.length === 1)
        ? rollen[0].name : null;
      return {
        name: werkName,
        dokumente: w.docs.size,
        signaturen: [...w.signaturen],
        orte: [...w.orte.entries()].map(([n, c]) => ({ name: n, count: c })),
        rollen,
        rolleHaupt,
        istOper: rolleHaupt !== null,
        jahre: [...w.jahre].sort(),
      };
    }).sort((a, b) => b.dokumente - a.dokumente),
  })).sort((a, b) => b.dokumente_gesamt - a.dokumente_gesamt);

  // Split into named composers and "Andere" group
  const hauptKomponisten = allKomponisten.filter(k => k.dokumente_gesamt > ANDERE_THRESHOLD);
  const andereKomponisten = allKomponisten.filter(k => k.dokumente_gesamt <= ANDERE_THRESHOLD);

  return {
    zentrum: { name: 'Ira Malaniuk', wikidata: 'Q94208', lebensdaten: '1919\u20132009', fach: 'Mezzosopran' },
    komponisten: hauptKomponisten,
    andere: andereKomponisten,
    totalDocs: allKomponisten.reduce((s, k) => s + k.dokumente_gesamt, 0),
  };
}

function normalizeKomponist(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  return KOMPONISTEN_NORMALISIERUNG[lower] || raw;
}

// =========================================================================
// Zeitfluss (Temporal Flow)
// =========================================================================

export function aggregateZeitfluss(store) {
  const kompMap = buildKomponistenMap(store);

  // --- Build output (adapts shared kompMap to Zeitfluss format) ---
  const straenge = [];
  const undatiert = [];

  for (const [name, data] of kompMap) {
    // Collect all years from werke (jahre is a Set in the shared map)
    const allYears = [];
    for (const [, w] of data.werke) {
      allYears.push(...w.jahre);
    }
    const datedYears = allYears.filter(y => y >= 1900 && y <= 2020);
    const uniqueYears = [...new Set(datedYears)].sort((a, b) => a - b);

    // Compute dated/undated doc counts from the shared dokumente Set
    let datedDocs = 0;
    let undatedDocs = 0;
    for (const docId of data.dokumente) {
      // Check if any werk references this doc with a dated year
      let hasDatedYear = false;
      for (const [, w] of data.werke) {
        if (w.docs.has(docId) && [...w.jahre].some(y => y >= 1900 && y <= 2020)) {
          hasDatedYear = true;
          break;
        }
      }
      if (hasDatedYear) datedDocs++;
      else undatedDocs++;
    }

    if (uniqueYears.length === 0) {
      undatiert.push({
        komponist: name,
        farbe: KOMPONISTEN_FARBEN[name] || KOMPONISTEN_FARBEN['Andere'],
        werke_count: data.werke.size,
        dokumente_count: data.dokumente.size,
      });
      continue;
    }

    const werke = [...data.werke.entries()]
      .map(([werkName, w]) => {
        const sorted = [...w.jahre].filter(y => y >= 1900 && y <= 2020).sort((a, b) => a - b);
        const topRolle = [...w.rollen.entries()].sort((a, b) => b[1] - a[1])[0];
        const sigs = [...w.signaturen];
        return {
          name: werkName,
          erstbeleg: sorted.length > 0 ? sorted[0] : null,
          letztbeleg: sorted.length > 0 ? sorted[sorted.length - 1] : null,
          orte: [...w.orte.keys()],
          rolle: topRolle ? topRolle[0] : null,
          istOper: w.rollen.size > 0,
          signaturen: sigs,
          dokumente: sigs.length,
          datiert: sorted.length > 0,
        };
      })
      .sort((a, b) => (a.erstbeleg || 9999) - (b.erstbeleg || 9999));

    straenge.push({
      komponist: name,
      farbe: KOMPONISTEN_FARBEN[name] || KOMPONISTEN_FARBEN['Andere'],
      von: uniqueYears[0],
      bis: uniqueYears[uniqueYears.length - 1],
      dokumente_datiert: datedDocs,
      dokumente_undatiert: undatedDocs,
      werke,
    });
  }

  // Sort: most documents first
  straenge.sort((a, b) => b.dokumente_datiert - a.dokumente_datiert);

  // Coverage stats
  const totalRecords = store.allRecords.length;
  const linked = store.allRecords.filter(r => ensureArray(r['rico:hasOrHadSubject']).some(s => s['@type'] === 'm3gim:MusicalWork')).length;
  const dated = store.allRecords.filter(r => extractYear(r['rico:date'])).length;

  return {
    straenge,
    undatiert,
    abdeckung: {
      total: totalRecords,
      verknuepft: linked,
      datiert: dated,
      zeitspanne: straenge.length > 0
        ? { von: Math.min(...straenge.map(s => s.von)), bis: Math.max(...straenge.map(s => s.bis)) }
        : { von: 1940, bis: 1970 },
    },
  };
}
