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

export function aggregateMatrix(store) {
  const personMap = new Map(); // name → { kategorie, begegnungen: Map<periode, {intensitaet, docs}> }

  for (const record of store.allRecords) {
    const year = extractYear(record['rico:date']);
    if (!year) continue;
    const periode = get5YearPeriod(year);
    if (!periode || !ZEITRAEUME.includes(periode)) continue;

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

      // Normalize known variants
      const name = normalizePerson(rawName);

      if (!personMap.has(name)) {
        personMap.set(name, {
          kategorie: getPersonKategorie(name),
          begegnungen: new Map(),
        });
      }
      const person = personMap.get(name);
      if (!person.begegnungen.has(periode)) {
        person.begegnungen.set(periode, { intensitaet: 0, anzahl: 0, dokumente: [] });
      }
      const beg = person.begegnungen.get(periode);
      beg.intensitaet += weight;
      beg.anzahl++;
      if (beg.dokumente.length < 10) {
        beg.dokumente.push({
          signatur: record['rico:identifier'],
          titel: (record['rico:title'] || '').slice(0, 80),
          typ: docType,
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
        if (!person.begegnungen.has(periode)) {
          person.begegnungen.set(periode, { intensitaet: 0, anzahl: 0, dokumente: [] });
        }
        const beg = person.begegnungen.get(periode);
        beg.intensitaet += weight;
        beg.anzahl++;
      }
    }
  }

  // Convert to sorted array
  const personen = [...personMap.entries()].map(([name, data]) => {
    const begegnungen = ZEITRAEUME.map(z => {
      const beg = data.begegnungen.get(z);
      return beg
        ? { zeitraum: z, intensitaet: beg.intensitaet, anzahl_dokumente: beg.anzahl, dokumente: beg.dokumente }
        : { zeitraum: z, intensitaet: 0, anzahl_dokumente: 0, dokumente: [] };
    });
    const gesamt = begegnungen.reduce((sum, b) => sum + b.intensitaet, 0);
    return { name, kategorie: data.kategorie, begegnungen, gesamt_intensitaet: gesamt };
  }).sort((a, b) => b.gesamt_intensitaet - a.gesamt_intensitaet);

  return { zeitraeume: ZEITRAEUME, personen };
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
// Kosmos
// =========================================================================

export function aggregateKosmos(store) {
  const kompMap = new Map(); // canonicalName → { dokumente: Set, werke: Map<werkName, {docs, orte, rollen}> }

  // Method 1: Structured data from rico:hasOrHadSubject
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
          kEntry.werke.set(werkName, { docs: new Set(), signaturen: new Set(), orte: new Map(), rollen: new Map() });
        }
        const wEntry = kEntry.werke.get(werkName);
        wEntry.docs.add(record['@id']);
        if (record['rico:identifier']) wEntry.signaturen.add(record['rico:identifier']);
      }
    }

    // Also harvest performance roles
    const roles = ensureArray(record['m3gim:hasPerformanceRole']);
    for (const role of roles) {
      const roleName = role.name || role['skos:prefLabel'] || '';
      // Try to find which werk this role belongs to
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

    // Locations on this record → attribute to all works in this record
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

  // Method 2: Title-matching fallback
  for (const record of store.allRecords) {
    const title = (record['rico:title'] || '').toLowerCase();
    const subjects = ensureArray(record['rico:hasOrHadSubject']);
    // Skip if already has structured work data
    if (subjects.some(s => s['@type'] === 'm3gim:MusicalWork')) continue;

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
