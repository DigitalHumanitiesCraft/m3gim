/**
 * Netzwerk-Geometrie: reine Funktionen fuer Ring-Klassifikation, Layout,
 * Farbe und Evidenz-Typ. Keine DOM-Aufrufe, keine D3. Damit in Unit-Tests
 * und Dev-Console reproduzierbar.
 *
 * Die Viz antwortet auf die Frage: "Mit welchen Personen stand Malaniuk
 * in Beziehung?" — Malaniuk ist das Zentrum, alle anderen Personen liegen
 * auf drei konzentrischen Ringen nach *Evidenzstaerke*:
 *
 *   Ring 1 (innen) — harte Beziehungen: AgRelOn-Partner ODER Wikidata+>=5 Docs
 *   Ring 2 (mitte) — wiederkehrendes Umfeld: >=2 Docs ODER kategorisierte Rolle
 *   Ring 3 (aussen) — einmalige Nennungen
 *
 * Determinismus (frontend.md § 196): Winkel alphabetisch pro Ring,
 * Positionen analytisch aus Sinus/Kosinus — gleiche Daten, gleiche Grafik.
 * KEINE Force-Simulation.
 */

import { KOMPONISTEN_NAMEN, PERSONEN_FARBEN } from '../data/constants.js';

// ---------------------------------------------------------------------------
// Rollenbasierte Personen-Kategorisierung fuer den Netzwerk-Tab.
//
// Die globale `entry.kategorie` aus `getPersonKategorie()` in
// `utils/normalize.js` nutzt eine statische Keyword-Liste ueber Namen
// (karajan → Dirigent, ludwig → Kollege, ...). Nur ~70 der 305 Personen
// matchen dort; alle anderen landen in "Andere".
//
// Hier leiten wir die Kategorie aus den *tatsaechlichen* `entry.roles`-Sets
// ab. Jede Person im Nachlass hat mindestens eine Rolle (sänger, komponist,
// verfasser, erwähnt, ...), also ist die Struktur real datengetrieben und
// "Andere" schrumpft auf einen echten Rest (fuenf Faelle oder weniger).
//
// Prioritaet bei Mehrfachrollen: Produktion > Buehne > Vermittlung >
// Korrespondenz > Presse > Erwaehnt. Begruendung: wer dirigiert UND singt,
// ist primaer Dirigent; reine Rezensions-Erwaehnungen stehen hinten an.
// ---------------------------------------------------------------------------

export const NETZWERK_KATEGORIEN = {
  'Produktion':     '#6B4E8C',   // violett — Regie/Dirigat/Komposition
  'Bühne':          '#9A6B3D',   // gold — Sänger:innen-Kolleg:innen
  'Vermittlung':    '#3D7A5A',   // gruen — Agenten, Veranstalter
  'Korrespondenz':  '#8B7355',   // braun — Absender, Empfaenger
  'Presse':         '#6B5A3D',   // oliv — Verfasser:innen von Texten
  'Erwähnt':        '#A89F95',   // hellgrau — nur in Dritt-Erwaehnung
  'Andere':         '#757575',
};

const ROLE_PRIO = [
  ['Produktion', new Set([
    'komponist', 'dirigent', 'regisseur', 'chorleiter', 'librettist',
    'arrangeur', 'bühnenbildner', 'buehnenbildner', 'kostümbildner',
    'kostuembildner', 'choreograph', 'choreograf', 'ausstatter',
    'technische leitung', 'übersetzer', 'uebersetzer', 'herausgeber',
    'bühnenleiter', 'buehnenleiter',
  ])],
  ['Bühne', new Set(['sänger', 'saenger', 'sängerin', 'interpret', 'protagonist'])],
  ['Vermittlung', new Set(['vermittler', 'agent', 'auftraggeber', 'veranstalter'])],
  ['Korrespondenz', new Set([
    'absender', 'empfänger', 'empfaenger', 'adressat', 'unterzeichner',
  ])],
  ['Presse', new Set(['verfasser'])],
];

const ERWAEHNT_RX = /^erw(?:ä|ae)hnt$/;

/**
 * Leitet eine Personen-Kategorie aus den tatsaechlichen Rollen einer
 * Person ab. Returns ein Key aus NETZWERK_KATEGORIEN.
 */
export function derivePersonKategorie(entry) {
  if (!entry || !entry.roles || entry.roles.size === 0) return 'Andere';
  const roles = new Set();
  for (const r of entry.roles) roles.add(String(r || '').toLowerCase().trim());

  for (const [kat, set] of ROLE_PRIO) {
    for (const r of roles) if (set.has(r)) return kat;
  }
  // Wenn ueberhaupt nur Varianten von "erwaehnt" drin → Erwaehnt.
  let onlyErwaehnt = true;
  for (const r of roles) {
    if (!ERWAEHNT_RX.test(r)) { onlyErwaehnt = false; break; }
  }
  if (onlyErwaehnt) return 'Erwähnt';
  return 'Andere';
}

// Malaniuk-Identifikation: per Q-ID stabil, Name als Fallback.
const MALANIUK_QID = 'wd:Q94208';
const MALANIUK_NAME_RX = /malaniuk/i;

// Schwellwerte — oben gebuendelt, damit sie nach einer ersten Demo trivial
// zu tunen sind. Im Plan-Dokument benannt als "Konstanten in _netzwerk-geometry.js".
export const RING_THRESHOLDS = {
  HARD_MIN_RECORDS_WITH_QID: 5,  // Ring 1 Einstieg, wenn Q-ID + dokumenten-dicht
  MID_MIN_RECORDS: 2,             // Ring 2 Einstieg, wenn >= 2 Records
};

/**
 * Ist die Person Ira Malaniuk selbst? Dann gehoert sie ins Zentrum, nicht
 * in einen Ring.
 */
export function isMalaniuk(name, entry) {
  if (entry && entry.wikidata === MALANIUK_QID) return true;
  if (name && MALANIUK_NAME_RX.test(name)) return true;
  return false;
}

/**
 * Soll die Person ueberhaupt im Personen-Netzwerk auftauchen? Reine
 * Werk-Komponisten (Wagner R., Strauss, Mozart, Beethoven) landen als
 * Repertoire-Signatur im Repertoire-Tab und bleiben hier draussen.
 * Ausnahmen: Wieland/Wolfgang Wagner (Regisseure) — ihre Kategorie ist
 * bereits "Regisseur" aus PERSONEN_KATEGORIEN und sie bleiben drin.
 */
export function isPureComposer(name, entry) {
  if (!name) return false;
  if (entry && entry.kategorie === 'Regisseur') return false;
  const lower = name.toLowerCase();
  // Auf Nachnamen-Token matchen, damit "Wagner, Richard" greift, aber
  // "Wieland Wagner" NICHT (der hat kategorie=Regisseur → oben abgefangen).
  for (const composer of KOMPONISTEN_NAMEN) {
    if (lower.includes(composer)) {
      // Nur rausfiltern, wenn die Person NICHT manuell als anderer Typ
      // kategorisiert wurde.
      if (!entry || entry.kategorie === 'Komponist' || entry.kategorie === 'Andere') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Ring-Klassifikation nach Evidenzstaerke.
 * @param {{records: Set, wikidata: ?string, relations?: Array, kategorie: string}} entry
 * @returns {1|2|3}
 */
export function classifyRing(entry) {
  const recordCount = entry.records ? entry.records.size : 0;
  const hasAgRelOn = entry.relations && entry.relations.length > 0;
  const hasWikidata = !!(entry.wikidata && String(entry.wikidata).startsWith('wd:'));

  // Ring 1: strukturierte Beziehung ODER (Wikidata + hohe Record-Frequenz)
  if (hasAgRelOn) return 1;
  if (hasWikidata && recordCount >= RING_THRESHOLDS.HARD_MIN_RECORDS_WITH_QID) return 1;

  // Ring 2: wiederkehrendes Umfeld
  if (recordCount >= RING_THRESHOLDS.MID_MIN_RECORDS) return 2;
  if (entry.kategorie && entry.kategorie !== 'Andere') return 2;

  // Ring 3: Rest
  return 3;
}

/**
 * 'strong' = AgRelOn-strukturierte Beziehung vorhanden, 'weak' = nur
 * Co-Occurrence in Records. Orthogonal zu classifyRing.
 */
export function nodeEvidence(entry) {
  return (entry.relations && entry.relations.length > 0) ? 'strong' : 'weak';
}

/**
 * Farbe — aus rollenbasierter Kategorie (nicht aus der statischen
 * Namens-Keyword-Kategorie in entry.kategorie).
 */
export function nodeColor(entry) {
  const kat = derivePersonKategorie(entry);
  return NETZWERK_KATEGORIEN[kat] || NETZWERK_KATEGORIEN['Andere'];
}

/**
 * Normalisierter Sortierschluessel: "Nachname, Vorname" → "nachname" (erstes
 * Komma-getrenntes Token lowercase, Umlaute gefaltet).
 */
function sortKey(name) {
  const base = String(name || '').split(',')[0].trim().toLowerCase();
  return base
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss');
}

/**
 * Hauptfunktion: berechnet die deterministische Position jedes Knotens.
 *
 * Eingabe: Map oder Iterable von [name, personEntry]-Paaren (typischerweise
 * store.persons nach Filtern).
 *
 * Rueckgabe:
 *   {
 *     center: { x, y, r, name, wikidata, label },
 *     nodes:  [{ name, entry, ring, x, y, r, color, evidence, angle, labelAngle, sortKey }]
 *     ringCounts: { 1: n1, 2: n2, 3: n3 }
 *   }
 *
 * Winkel pro Ring: alphabetisch, gleichverteilt auf 2π, Start bei 0 = 12 Uhr.
 *   x = cx + R · sin(angle)
 *   y = cy − R · cos(angle)
 */
export function computeLayout(persons, { cx, cy, radii }) {
  const [R1, R2] = radii;

  // Vorfilter: Malaniuk + reine Komponisten raus, Ring 3 (einmalige
  // Nennungen) komplett weggeworfen — sie trugen nur dekorativen Halo bei.
  const byRing = { 1: [], 2: [] };
  let centerEntry = null;
  let centerName = 'Malaniuk, Ira';

  for (const [name, entry] of persons) {
    if (isMalaniuk(name, entry)) {
      centerEntry = entry;
      centerName = name;
      continue;
    }
    if (isPureComposer(name, entry)) continue;
    const ring = classifyRing(entry);
    if (ring === 3) continue; // Ring 3 (einmalige Nennungen) aus der Viz entfernt
    byRing[ring].push({ name, entry });
  }

  // Pro Ring alphabetisch sortieren und Winkel gleichverteilen.
  const nodes = [];
  const ringRadii = { 1: R1, 2: R2 };
  for (const ring of [1, 2]) {
    const list = byRing[ring];
    list.sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name), 'de'));
    const total = list.length;
    const R = ringRadii[ring];
    for (let i = 0; i < total; i++) {
      const { name, entry } = list[i];
      const angle = total > 0 ? (i / total) * 2 * Math.PI : 0;
      const recordCount = entry.records ? entry.records.size : 0;
      // Knoten-Radius: groesser als vorher, damit die Kreise den Canvas
      // auch wirklich fuellen. sqrt(recordCount) * 4.2, min 6, gedeckelt 28.
      const nodeR = Math.max(6, Math.min(28, Math.sqrt(recordCount) * 4.2));
      nodes.push({
        name,
        entry,
        ring,
        x: cx + R * Math.sin(angle),
        y: cy - R * Math.cos(angle),
        r: nodeR,
        color: nodeColor(entry),
        evidence: nodeEvidence(entry),
        angle,
        // labelAngle: wie altes Kosmos — tangentiale Ausrichtung, Seite je
        // nach Halbkreis. Wert = Winkel in Radiant, Konsument rechnet die
        // text-anchor-Seite aus.
        labelAngle: angle,
        sortKey: sortKey(name),
      });
    }
  }

  return {
    center: {
      x: cx,
      y: cy,
      r: 38,
      name: centerName,
      wikidata: (centerEntry && centerEntry.wikidata) || MALANIUK_QID,
      kategorie: 'Archivsubjekt',
      records: centerEntry ? centerEntry.records.size : 0,
      entry: centerEntry,
    },
    nodes,
    ringCounts: {
      1: byRing[1].length,
      2: byRing[2].length,
    },
  };
}

/**
 * Textanker- und Offset-Berechnung fuer ein Ring-Label — analog zur
 * Logik im alten Kosmos-View (git show 2856daa^:docs/js/views/kosmos.js).
 *
 * Winkel 0 = 12 Uhr. Rechte Halbebene → 'start' (links am Knoten anhaengen),
 * linke Halbebene → 'end' (rechts am Knoten anhaengen).
 */
export function labelGeometry(angle, nodeR, gap = 4) {
  const rightHalf = angle < Math.PI;
  const side = rightHalf ? 1 : -1;
  return {
    anchor: rightHalf ? 'start' : 'end',
    dx: side * (nodeR + gap),
    dy: 3, // Mitte-Ausrichtung leichter nach unten versetzt
  };
}

/**
 * Ko-Okkurrenz: zwei Personen sind verknuepft, wenn sie in mindestens
 * `minShared` Dokumenten gemeinsam auftauchen. Das ist die *interessante*
 * Netzwerk-Topologie jenseits der Malaniuk-Hub-Struktur — wer mit wem
 * sang, wer bei wem dirigierte, wer wen vermittelte.
 *
 * Implementiert ueber Record-Buckets (nicht paarweise Mengen-Schnitt),
 * weil das bei ~300 Personen um Groessenordnungen schneller ist: fuer
 * jeden Record alle Personen-Paare emittieren und paarweise zaehlen.
 *
 * Rueckgabe: Array {a, b, shared}, absteigend nach shared sortiert.
 * Deterministisch — gleiche Daten, gleiche Paarliste.
 */
export function computeCoOccurrence(persons, { minShared = 2, maxEdges = 250 } = {}) {
  // recordId -> Set<personName> (nach Filtern Malaniuk/Komponisten).
  const recordToPersons = new Map();
  for (const [name, entry] of persons) {
    if (isMalaniuk(name, entry)) continue;
    if (isPureComposer(name, entry)) continue;
    if (!entry || !entry.records) continue;
    for (const recordId of entry.records) {
      let set = recordToPersons.get(recordId);
      if (!set) { set = new Set(); recordToPersons.set(recordId, set); }
      set.add(name);
    }
  }

  // Pro Record alle Paare aufzaehlen, key = a||b mit a alphabetisch < b.
  const pairCount = new Map();
  for (const names of recordToPersons.values()) {
    if (names.size < 2) continue;
    const arr = [...names].sort();
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = arr[i] + '' + arr[j];
        pairCount.set(key, (pairCount.get(key) || 0) + 1);
      }
    }
  }

  const pairs = [];
  for (const [key, count] of pairCount) {
    if (count < minShared) continue;
    const [a, b] = key.split('');
    pairs.push({ a, b, shared: count });
  }
  // Sortierung: zuerst nach shared absteigend, dann alphabetisch fuer
  // Determinismus bei Ties.
  pairs.sort((x, y) => (y.shared - x.shared) || x.a.localeCompare(y.a, 'de') || x.b.localeCompare(y.b, 'de'));
  if (maxEdges && pairs.length > maxEdges) return pairs.slice(0, maxEdges);
  return pairs;
}
