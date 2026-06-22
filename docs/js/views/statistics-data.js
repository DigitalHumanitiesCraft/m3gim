/**
 * Statistik — reine Datenschicht.
 *
 * Aggregationen und Sub-Store-Ableitung ueber den Live-Store, ohne DOM oder d3.
 * Lane C (statistics.js) importiert die hier exportierten Namen wortgleich und
 * rendert sie. Hier liegt keine Praesentationslogik: keine Farben jenseits der
 * geteilten Sichten-Tokens (SICHT_COLOR), keine Strings ueber die fachlichen
 * Labels hinaus.
 */

import { getDocTypeId, cityOf } from '../utils/format.js';
import { mobilityClusterFor } from '../data/constants.js';
import { extractYear } from '../utils/date-parser.js';

// ---------------------------------------------------------------------------
// Mobilitaetssichten — geteilt mit der Karte
// ---------------------------------------------------------------------------

export const SICHTEN = [
  { id: 'performativ',    label: 'Performativ',    desc: 'Auftritte, Gastspiele, Premieren' },
  { id: 'institutionell', label: 'Institutionell', desc: 'Spielzeit-Engagements, Ensemble-Zugehoerigkeit' },
  { id: 'korrespondenz',  label: 'Reise & Korrespondenz', desc: 'Reisewege (Ziel-, Abreise-, Vertragsort), Korrespondenz-Orte und Briefdaten' },
  { id: 'diskursiv',      label: 'Diskursiv',      desc: 'Rezensionen, Rundfunk, Druckerscheinungen' },
  { id: 'biografisch',    label: 'Biografisch',    desc: 'Ausweise, Wohnsitz, persoenliche Dokumente' },
];

// Eine Quelle fuer die Sichten-Farben: die --color-sicht-*-Tokens (variables.css).
// Karte und Statistik zeigen dieselbe Sicht damit in derselben Farbe.
export const SICHT_COLOR = {
  performativ:    'var(--color-sicht-performativ)',
  institutionell: 'var(--color-sicht-institutionell)',
  korrespondenz:  'var(--color-sicht-korrespondenz)',
  diskursiv:      'var(--color-sicht-diskursiv)',
  biografisch:    'var(--color-sicht-biografisch)',
  neutral:        'var(--color-text-tertiary)',
};

// ---------------------------------------------------------------------------
// Inventar + Filterung
// ---------------------------------------------------------------------------

/** Jahr-Primitive: kanonisch aus rico:date (wie die Chronik, E-88); null = undatiert. */
function recordYear(rec) {
  return extractYear(rec['rico:date']);
}

/**
 * Facetten-Inventar fuer die Sidebar: Jahresspektrum, undatierte Records sowie
 * die wahlbaren Sichten und Laender mit Gesamt-Zaehlungen am vollen Store.
 */
export function facetInventory(store) {
  const years = [];
  for (const rec of store.allRecords) {
    const y = recordYear(rec);
    if (y != null) years.push(y);
  }
  const minYear = years.length ? Math.min(...years) : 1900;
  const maxYear = years.length ? Math.max(...years) : 2000;
  const undatedTotal = store.allRecords.length - years.length;

  const sichten = aggregateSichten(store).map(s => ({
    id: s.id, label: s.label, count: s.count,
  }));

  const laenderMap = new Map();
  for (const ev of store.mobilityEvents.values()) {
    const code = ev.placeCountry;
    if (!code) continue;
    laenderMap.set(code, (laenderMap.get(code) || 0) + 1);
  }
  const laender = [...laenderMap.entries()]
    .map(([code, count]) => ({ code, label: code, count }))
    .sort((a, b) => b.count - a.count);

  return { minYear, maxYear, undatedTotal, sichten, laender };
}

/**
 * Leitet einen store-foermigen Sub-Store ab. Drei Schritte:
 *  1. Record-Jahresschnitt -> gehaltene Record-@ids (lo/hi inklusive). Voller
 *     Store nur, wenn das Fenster das ganze Spektrum deckt UND keine Facette aktiv
 *     ist, damit undatierte Daten sichtbar bleiben.
 *  2. Sub-Store wie die bisherige filteredStore-Logik (mobilityEvents via recordId,
 *     agentRelations/finances via key, persons/works via records-Set).
 *  3. Event-Facetten (sichten/laender) NACH dem Jahresschnitt nur auf mobilityEvents
 *     anwenden; record-only Maps bleiben jahresgefiltert.
 *
 * @param {object} store
 * @param {{lo:number, hi:number, sichten:?Set<string>, laender:?Set<string>}} opts
 */
export function filterStore(store, { lo, hi, sichten = null, laender = null } = {}) {
  const years = [];
  for (const rec of store.allRecords) {
    const y = recordYear(rec);
    if (y != null) years.push(y);
  }
  const minYear = years.length ? Math.min(...years) : lo;
  const maxYear = years.length ? Math.max(...years) : hi;

  // Ein Set (auch leer) bedeutet "nur diese" — leeres Set blendet folglich alle
  // Ereignisse aus (deckungsgleich mit allen abgewaehlten Chips). null = alle.
  const sichtenActive = sichten instanceof Set;
  const laenderActive = laender instanceof Set;
  const fullWindow = lo <= minYear && hi >= maxYear;

  // Nothing to cut: full year window and no event facet -> the untouched store.
  if (fullWindow && !sichtenActive && !laenderActive) return store;

  // Step 1: record-based year cut.
  let sub;
  if (fullWindow) {
    sub = store;
  } else {
    const keep = new Set();
    for (const rec of store.allRecords) {
      const y = recordYear(rec);
      if (y != null && y >= lo && y <= hi) keep.add(rec['@id']);
    }
    const pick = (map, hasKey) => {
      const out = new Map();
      for (const [k, v] of map) if (hasKey(k, v)) out.set(k, v);
      return out;
    };
    const inRecords = (set) => {
      for (const rid of (set || [])) if (keep.has(rid)) return true;
      return false;
    };
    // Step 2: derive the year-filtered sub-store.
    sub = {
      ...store,
      allRecords:     store.allRecords.filter(r => keep.has(r['@id'])),
      mobilityEvents: pick(store.mobilityEvents, (_, ev) => ev.recordId && keep.has(ev.recordId)),
      agentRelations: pick(store.agentRelations, (k) => keep.has(k)),
      finances:       pick(store.finances, (k) => keep.has(k)),
      persons:        pick(store.persons, (_, p) => inRecords(p.records)),
      works:          pick(store.works, (_, w) => inRecords(w.records)),
    };
  }

  // Step 3: event facets prune only mobilityEvents; record-only maps stay as-is.
  if (!sichtenActive && !laenderActive) return sub;

  const events = new Map();
  for (const [id, ev] of sub.mobilityEvents) {
    if (sichtenActive) {
      const cluster = mobilityClusterFor(ev.role) || 'neutral';
      if (!sichten.has(cluster)) continue;
    }
    if (laenderActive) {
      if (!ev.placeCountry || !laender.has(ev.placeCountry)) continue;
    }
    events.set(id, ev);
  }

  return { ...sub, mobilityEvents: events };
}

// ---------------------------------------------------------------------------
// § 1 Dokumenttypen
// ---------------------------------------------------------------------------

export function aggregateDocTypes(store) {
  const counts = new Map();
  let ohneTyp = 0;
  for (const rec of store.allRecords) {
    const id = getDocTypeId(rec);
    if (!id) { ohneTyp++; continue; }
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const rows = [...counts.entries()]
    .map(([id, count]) => {
      const concept = store.dftHierarchy.get(id);
      const label = concept?.prefLabel || id;
      return { id, count, label };
    })
    .sort((a, b) => b.count - a.count);
  if (ohneTyp > 0) {
    rows.push({ id: null, count: ohneTyp, label: 'ohne Typ' });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// § 2 Mobilitaetssichten
// ---------------------------------------------------------------------------

export function aggregateSichten(store) {
  const buckets = new Map(SICHTEN.map(s => [s.id, { ...s, count: 0 }]));
  // Per-role tally for the residual bucket so the description stays factual as
  // the data evolves (e.g. E-97 mobility ortsrollen now dominate it). Hard-coded
  // role lists drift out of sync with the export.
  const unklassifiziertRollen = new Map();
  for (const ev of store.mobilityEvents.values()) {
    const cluster = mobilityClusterFor(ev.role);
    if (cluster && buckets.has(cluster)) {
      buckets.get(cluster).count++;
    } else {
      const role = ev.role || '(ohne Rolle)';
      unklassifiziertRollen.set(role, (unklassifiziertRollen.get(role) || 0) + 1);
    }
  }
  const rows = [...buckets.values()];
  const unklassifiziert = [...unklassifiziertRollen.values()].reduce((s, n) => s + n, 0);
  if (unklassifiziert > 0) {
    const breakdown = [...unklassifiziertRollen.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([role, n]) => `${role} (${n})`)
      .join(', ');
    rows.push({
      id: 'neutral', label: 'Nicht klassifiziert',
      desc: `Rollen ausserhalb der fünf Sichten: ${breakdown}`,
      count: unklassifiziert,
    });
  }
  return rows;
}

/**
 * Ereignis-Rollen einzeln, jede einer Sicht zugeordnet (mobilityClusterFor,
 * Fallback "neutral"). count-absteigend.
 */
export function aggregateEventRoles(store) {
  const counts = new Map();
  for (const ev of store.mobilityEvents.values()) {
    const role = ev.role || '(ohne Rolle)';
    counts.set(role, (counts.get(role) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([role, count]) => {
      const sicht = mobilityClusterFor(role) || 'neutral';
      return { role, label: role, sicht, count };
    })
    .sort((a, b) => b.count - a.count);
}

/**
 * Events je Jahrzehnt, gestapelt nach gemappter Sicht. dated = Events mit Jahr,
 * total = alle Events. bySicht traegt je Sicht-ID (inkl. "neutral") die Zaehlung.
 */
export function aggregateDecadesBySicht(store) {
  const buckets = new Map();  // decade -> Map<sichtId, count>
  let dated = 0;
  let total = 0;
  for (const ev of store.mobilityEvents.values()) {
    total++;
    if (typeof ev.date !== 'string' || ev.date.length < 4) continue;
    const y = parseInt(ev.date.slice(0, 4), 10);
    if (!Number.isFinite(y)) continue;
    dated++;
    const decade = Math.floor(y / 10) * 10;
    const sicht = mobilityClusterFor(ev.role) || 'neutral';
    if (!buckets.has(decade)) buckets.set(decade, new Map());
    const bs = buckets.get(decade);
    bs.set(sicht, (bs.get(sicht) || 0) + 1);
  }

  const rows = [];
  if (buckets.size > 0) {
    const min = Math.min(...buckets.keys());
    const max = Math.max(...buckets.keys());
    // Fill gap decades so the stacked chart keeps a continuous x-axis.
    for (let d = min; d <= max; d += 10) {
      const bs = buckets.get(d) || new Map();
      const bySicht = {};
      let rowTotal = 0;
      for (const [sichtId, count] of bs) {
        bySicht[sichtId] = count;
        rowTotal += count;
      }
      rows.push({ decade: d, total: rowTotal, bySicht });
    }
  }

  return { rows, dated, total };
}

// ---------------------------------------------------------------------------
// § 3 Geografie
// ---------------------------------------------------------------------------

export function aggregatePlaces(store) {
  // Auf Stadt-Ebene aggregieren: adressgenaue Orte ("Zürich, Strasse") und ihre
  // Stadt fallen sonst auseinander (nur die Stadt traegt eine Q-ID). cityOf
  // konsolidiert sie; die Stadt-Q-ID wird uebernommen, sobald ein Event sie hat.
  const map = new Map();
  for (const ev of store.mobilityEvents.values()) {
    if (!ev.place) continue;
    const city = cityOf(ev.place);
    if (!map.has(city)) {
      map.set(city, { name: city, qid: null, count: 0 });
    }
    const entry = map.get(city);
    entry.count++;
    if (!entry.qid && ev.placeWikidata) entry.qid = ev.placeWikidata;
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** Laender aus placeCountry ueber Events; label = code; count-absteigend. */
export function aggregateCountries(store) {
  const counts = new Map();
  for (const ev of store.mobilityEvents.values()) {
    const code = ev.placeCountry;
    if (!code) continue;
    counts.set(code, (counts.get(code) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, label: code, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// § 4 Netzwerk
// ---------------------------------------------------------------------------

const AGRELON_LABEL = {
  'agrelon:HasCorrespondent':       'Korrespondenz',
  'agrelon:IsHasPatron':             'Förderung / Patronage',
  'agrelon:HasProfessionalContact':  'Beruflicher Kontakt',
  'agrelon:HasIsMember':             'Mitgliedschaft',
  'agrelon:HasEmployeeEmployer':     'Anstellung',
};

export function aggregateAgentRelations(store) {
  const counts = new Map();
  let total = 0;
  for (const rels of store.agentRelations.values()) {
    for (const r of rels) {
      const t = r.type || '(unbekannt)';
      counts.set(t, (counts.get(t) || 0) + 1);
      total++;
    }
  }
  const items = [...counts.entries()]
    .map(([type, count]) => ({
      type,
      label: AGRELON_LABEL[type] || type.replace(/^agrelon:Has/, ''),
      count,
    }))
    .sort((a, b) => b.count - a.count);
  return { items, total };
}

/**
 * Benannte Beziehungspartner: das Gegenueber jeder Relation, sofern nicht Malaniuk
 * selbst (bei rund zwei Dritteln der Relationen ist sie das genannte Objekt). Pro
 * Partner die Beziehungstypen mit Zaehlung. Normalisierungs-Dubletten (z. B. zwei
 * Taubman-Schreibweisen) bleiben als getrennte Eintraege sichtbar — das ist ein
 * Datenbefund (datenfehler.md), kein View-seitiger Normalisierungs-Workaround.
 */
export function aggregateRelationPartners(store) {
  const MAL = /malaniuk|malnaiuk/i;
  const map = new Map();
  let allRelations = 0;
  for (const rels of store.agentRelations.values()) {
    for (const r of rels) {
      allRelations++;
      const name = r.objectName;
      if (!name || MAL.test(name)) continue;
      const label = AGRELON_LABEL[r.type] || (r.type || '').replace(/^agrelon:Has/, '');
      if (!map.has(name)) map.set(name, { name, count: 0, byType: new Map() });
      const e = map.get(name);
      e.count++;
      e.byType.set(label, (e.byType.get(label) || 0) + 1);
    }
  }
  const partners = [...map.values()]
    .map(p => ({
      name: p.name,
      count: p.count,
      byType: [...p.byType.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);
  const namedRelations = partners.reduce((s, p) => s + p.count, 0);
  return { partners, namedRelations, allRelations };
}

export function aggregatePersonRollen(store) {
  // Personen nach Rolle aus dem roles-Set (jede Person je distinkter Rolle einmal).
  // Datengetrieben statt der namensbasierten kategorie, die fast alle als "Andere"
  // fuehrte (loader.js getPersonKategorie deckt nur namentlich bekannte Personen ab).
  const counts = new Map();
  for (const p of store.persons.values()) {
    for (const r of (p.roles || [])) {
      if (!r) continue;
      const label = r.charAt(0).toUpperCase() + r.slice(1);
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([rolle, count]) => ({ rolle, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// § 5 Repertoire
// ---------------------------------------------------------------------------

export function aggregateComposers(store) {
  const counts = new Map();
  for (const w of store.works.values()) {
    const k = (w.komponist || '').trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([komponist, count]) => ({ komponist, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// § 6 Finanzen — nur Nennungs-Zaehlungen, nie Betragssummen ueber Waehrungen
// ---------------------------------------------------------------------------

const CURRENCY_LABEL = {
  'S':   'Schilling',
  'Esc': 'Escudo',
  'RM':  'Reichsmark',
  'Fr':  'Franc',
  'DM':  'Deutsche Mark',
};

export function aggregateFinances(store) {
  let total = 0;
  let recordsWithFin = 0;
  const currencies = new Map();
  const roles = new Map();
  for (const entries of store.finances.values()) {
    if (entries.length > 0) recordsWithFin++;
    for (const e of entries) {
      total++;
      if (e.currency) currencies.set(e.currency, (currencies.get(e.currency) || 0) + 1);
      if (e.role) roles.set(e.role, (roles.get(e.role) || 0) + 1);
    }
  }
  return {
    total,
    recordsWithFin,
    currencies: [...currencies.entries()]
      .map(([code, count]) => ({ code, label: CURRENCY_LABEL[code] || code, count }))
      .sort((a, b) => b.count - a.count),
    roles: [...roles.entries()]
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count),
  };
}
