/**
 * M³GIM Static Data & Constants
 * Ported from scripts/build-views.py
 */

// =========================================================================
// Personen-Kategorien (keyword in name → category)
// =========================================================================

export const PERSONEN_KATEGORIEN = {
  // Komponisten (before Dirigenten so specific names match first)
  'beethoven': 'Komponist', 'verdi': 'Komponist', 'mozart': 'Komponist',
  'brahms': 'Komponist', 'schubert': 'Komponist', 'wolf, hugo': 'Komponist',
  'mahler': 'Komponist', 'bizet': 'Komponist', 'tschaikowsky': 'Komponist',
  'barwinsky': 'Komponist', 'puccini': 'Komponist',
  // Dirigenten
  'karajan': 'Dirigent', 'böhm': 'Dirigent', 'knappertsbusch': 'Dirigent',
  'furtwängler': 'Dirigent', 'krauss': 'Dirigent', 'krauß': 'Dirigent',
  'solti': 'Dirigent', 'kempe': 'Dirigent', 'kolessa': 'Dirigent',
  'hindemith': 'Dirigent',
  // Regisseure — specific names before generic 'wagner'
  'wieland wagner': 'Regisseur', 'wolfgang wagner': 'Regisseur',
  'wagner, siegfried': 'Regisseur',
  'felsenstein': 'Regisseur', 'hartmann': 'Regisseur',
  // Now Wagner/Strauss/Gluck/Händel as Komponist (after specific Wagner family members)
  'wagner': 'Komponist', 'strauss': 'Komponist', 'gluck': 'Komponist', 'händel': 'Komponist',
  // Archivsubjekt
  'malaniuk': 'Archivsubjekt',
  // Korrepetitoren
  'werba': 'Korrepetitor', 'baumgartner': 'Korrepetitor',
  // Vermittler
  'taubman': 'Vermittler', 'taubmann': 'Vermittler',
  // Kollegen
  'ludwig': 'Kollege', 'jurinac': 'Kollege', 'della casa': 'Kollege',
  'nilsson': 'Kollege', 'vickers': 'Kollege', 'windgassen': 'Kollege',
  'hotter': 'Kollege', 'rehfuss': 'Kollege', 'callas': 'Kollege',
};

// =========================================================================
// Ortsfarbcodierung — wiederkehrende Orte tragen ueber alle Views eine
// konstante Farbe (Wiedererkennung, design.md § Ortsfarbcodierung). Die Werte
// liegen als --color-ort-*-Tokens in variables.css. Nicht gelistete Orte
// liefern null, der Aufrufer waehlt dann seinen eigenen Default.
// =========================================================================

const ORT_COLOR = {
  'Wien':     'var(--color-ort-wien)',
  'Graz':     'var(--color-ort-graz)',
  'München':  'var(--color-ort-muenchen)',
  'Bayreuth': 'var(--color-ort-bayreuth)',
  'Salzburg': 'var(--color-ort-salzburg)',
};

/** Konstante Farbe eines wiederkehrenden Orts, sonst null. */
export function ortColor(name) {
  return ORT_COLOR[name] || null;
}

// Normalize variant person names to canonical form
// Keys are lowercase, matching is done on lowercased input
export const PERSONEN_NORMALISIERUNG = {
  // Hartmann variants
  'hartmann, prof.': 'Hartmann, Rudolf',
  'hartmann, rudolf': 'Hartmann, Rudolf',
  // Taubmann variants (single-n and double-n)
  'taubman, martin hugo': 'Taubmann, Martin Hugo',
  'taubmann, martin hugo': 'Taubmann, Martin Hugo',
  'taubmann, frau': 'Taubmann, Martin Hugo',
  // Dermota variants
  'dermota': 'Dermota, Anton',
  'dermotas, anton': 'Dermota, Anton',
  'dermota, anton': 'Dermota, Anton',
  // Dönch variants
  'dönch, carl': 'Dönch, Karl',
  'dönch, karl': 'Dönch, Karl',
  // Gostic/Gostič
  'gostic, josef': 'Gostič, Josef',
  'gostič, josef': 'Gostič, Josef',
  // Guthrie variants
  'guthrie, frederic': 'Guthrie, Frederick',
  'guthrie, frederick': 'Guthrie, Frederick',
  // Krauss/Krauß
  'krauß, clemens': 'Krauss, Clemens',
  'krauss, clemens': 'Krauss, Clemens',
  // Kupper variants
  'kupper, annelies': 'Kupper, Anneliese',
  'kupper, anneliese': 'Kupper, Anneliese',
  // Majkut/Maykut
  'maykut, erich': 'Majkut, Erich',
  'majkut, erich': 'Majkut, Erich',
  // Metternich typo
  'metternicz, josef': 'Metternich, Josef',
  'metternich, josef': 'Metternich, Josef',
  // Schmidt-Garre typo
  'schmidt-gasse, helmut': 'Schmidt-Garre, Helmut',
  'schmidt-garre, helmut': 'Schmidt-Garre, Helmut',
  // Verdi typo
  'verdi, guiseppe': 'Verdi, Giuseppe',
  // Kusche lowercase
  'kusche, benno': 'Kusche, Benno',
  // Kurt, Kuhlmann (reversed)
  'kurt, kuhlmann': 'Kuhlmann, Kurt',
  // Felbermayer hyphen error
  'felberma-yers, anny': 'Felbermayer, Anny',
  // Wagner typo
  'wagner, siegfied': 'Wagner, Siegfried',
  // Wehrli extra period
  'wehrli., dr.': 'Wehrli, Dr.',
  // Levinger period instead of comma
  'levinger. dr. henry w.': 'Levinger, Dr. Henry W.',
};

// Composer names to exclude from person matrix (they are composers, not network contacts)
export const KOMPONISTEN_NAMEN = new Set([
  'wagner', 'verdi', 'strauss', 'beethoven', 'mozart', 'brahms',
  'schubert', 'wolf', 'gluck', 'händel', 'hindemith', 'bizet',
  'tschaikowsky', 'mahler', 'barwinsky', 'puccini', 'weber',
]);

// =========================================================================
// Wikidata Icon (simplified barcode logo, inline SVG)
// =========================================================================

export const WIKIDATA_ICON_SVG = '<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="1" width="1" height="10" fill="#990000"/><rect x="2" y="1" width="1" height="10" fill="#990000"/><rect x="4" y="1" width="1" height="10" fill="#339966"/><rect x="5.5" y="1" width="1" height="10" fill="#339966"/><rect x="7.5" y="1" width="1" height="10" fill="#006699"/><rect x="9" y="1" width="1" height="10" fill="#006699"/><rect x="10.5" y="1" width="1" height="10" fill="#006699"/></svg>';

// =========================================================================
// Lesezeichen-Icon (Wissenskorb)
// =========================================================================

/**
 * Inline-SVG fuer Korb-Buttons. Vereinheitlicht die zuvor 8-fach inline
 * duplizierten Bookmark-Pfade. size: 12 (Index-Detail) | 14 (Bestand/Inline-
 * Detail). filled = Record liegt im Korb.
 */
export function bookmarkIcon(size = 14, filled = false) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`;
}

// Dokumenttyp-Labels kommen jetzt aus den Daten: die Pipeline schreibt
// skos:prefLabel an die m3gim-dft-Concepts (E-101), der Loader legt sie in
// store.dftHierarchy ab, format.js dftLabel(store, id) löst sie auf. Die
// frühere Hand-Map DOKUMENTTYP_LABELS entfiel damit.

// =========================================================================
// Sprach-Kuerzel (ISO 639-1) -> lesbare deutsche Labels
// =========================================================================

export const LANGUAGE_LABELS = {
  'de': 'Deutsch',
  'en': 'Englisch',
  'fr': 'Französisch',
  'it': 'Italienisch',
};

/**
 * Loest einen (ggf. kommaseparierten) Sprach-Wert in lesbare Labels auf.
 * Beispiel: "en, fr" -> "Englisch, Französisch".
 * Unbekannte Kuerzel werden unveraendert durchgereicht.
 */
export function formatLanguage(value) {
  if (!value) return '';
  return String(value)
    .split(/[,/]/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(code => LANGUAGE_LABELS[code.toLowerCase()] || code)
    .join(', ');
}

// =========================================================================
// AgRelOn-Beziehungstypen → deutsche Labels (Session 32: E-75 Chip-Pattern)
// =========================================================================

export const AGRELON_LABELS = {
  'agrelon:HasEmployeeEmployer':    'Arbeitgeber',
  'agrelon:HasCorrespondent':       'Korrespondenz',
  'agrelon:HasProfessionalContact': 'Beruflicher Kontakt',
  'agrelon:IsHasPatron':            'Patron',
  'agrelon:HasIsMember':            'Mitglied',
};

// =========================================================================
// Role-Cluster fuer Chip-Farbfamilien (Session 32: E-75 Designregeln)
// Prefix (Uppercase, wie im Chip angezeigt) -> Cluster-Klassenname.
// CSS-Regeln: .chip--c-ort, .chip--c-person, .chip--c-rolle,
// .chip--c-beziehung, .chip--c-finanz, .chip--c-datum, .chip--c-neutral.
// =========================================================================

export const ROLE_CLUSTER = {
  // Orte + raumzeitliche Ereignisse
  'AUFFUEHRUNGSORT':  'ort',
  'AUFFÜHRUNGSORT':   'ort',
  'ERSCHEINUNGSORT':  'ort',
  'ABSENDEORT':       'ort',
  'ABREISEORT':       'ort',
  'ZIELORT':          'ort',
  'ENTSTEHUNGSORT':   'ort',
  'WOHNORT':          'ort',
  'AUFFUEHRUNG':      'ort',
  'AUFFÜHRUNG':       'ort',
  'AUFTRITT':         'ort',
  'PROBE':            'ort',
  'GENERALPROBE':     'ort',
  'GASTSPIEL':        'ort',
  'SPIELZEIT':        'ort',
  'PREMIERE':         'ort',
  'FESTVORSTELLUNG':  'ort',
  'WIEDERAUFNAHME':   'ort',
  'ENTSTEHUNG':       'ort',
  'AUFTRAG':          'ort',
  'REPERTOIRE':       'ort',
  'ERWAEHNT':         'ort',
  'ERWÄHNT':          'ort',
  // Aus dem tieferen Export ergaenzte Ereignisrollen (Treffen 2026-06-23).
  'AUFNAHME':         'ort',
  'EMPFANG':          'ort',

  // Personen in Produktionsrollen
  'KOMPONIST':        'person',
  'DIRIGENT':         'person',
  'SAENGER':          'person',
  'SÄNGER':           'person',
  'SÄNGERIN':         'person',
  'REGISSEUR':        'person',
  'CHORLEITER':       'person',
  'INTERPRET':        'person',
  'LIBRETTIST':       'person',
  'VERFASSER':        'person',
  'UEBERSETZER':      'person',
  'ÜBERSETZER':       'person',
  'HERAUSGEBER':      'person',
  'ARRANGEUR':        'person',
  'CHOREOGRAPH':      'person',
  'CHOREOGRAF':       'person',
  'BUEHNENBILDNER':   'person',
  'BÜHNENBILDNER':    'person',
  'KOSTUEMBILDNER':   'person',
  'KOSTÜMBILDNER':    'person',
  'AUSSTATTER':       'person',
  'BUEHNENLEITER':    'person',
  'BÜHNENLEITER':     'person',
  'TECHNISCHE LEITUNG': 'person',
  'PROTAGONIST':      'person',
  'AGENT':            'person',
  'VERMITTLER':       'person',
  // Aus dem tieferen Export ergaenzte Personenrollen (Treffen 2026-06-23).
  // 'maskenbidner' ist die durchgereichte Tippform aus der Quelle (data.md § 5).
  'LEITUNG':          'person',
  'MASKENBIDNER':     'person',
  'ADRESSAT':         'person',
  'ABSENDER':         'person',
  'EMPFAENGER':       'person',
  'EMPFÄNGER':        'person',
  'UNTERZEICHNER':    'person',
  'AUFTRAGGEBER':     'person',

  // Buehnenrollen
  'ROLLE':            'rolle',

  // AgRelOn-Beziehungen
  'ARBEITGEBER':         'beziehung',
  'VERANSTALTER':        'person',
  'KORRESPONDENZ':       'beziehung',
  'BERUFLICHER KONTAKT': 'beziehung',
  'PATRON':              'beziehung',
  'MITGLIED':            'beziehung',

  // Finanzen
  'AUSGABEN':         'finanz',
  'EINNAHMEN':        'finanz',
  'HONORAR':          'finanz',
  'GAGE':             'finanz',
  'PROVISION':        'finanz',
  'VERTRAGSSUMME':    'finanz',

  // Datumsrollen
  'ERSCHEINUNGSDATUM':  'datum',
  'ABSENDEDATUM':       'datum',
  'EMPFANGSDATUM':      'datum',
  'AUFFUEHRUNGSDATUM':  'datum',
  'AUFFÜHRUNGSDATUM':   'datum',
  'PREMIEREDATUM':      'datum',
  'AUSSTELLUNGSDATUM':  'datum',
  'ABREISEDATUM':       'datum',

  // === PENDING: neuer Datenstand Lane 1 (G1/G2/G3/G8). Aktivieren nach Promote +
  // Lane-1-Bestaetigung der Rollennamen; siehe frontend-architecture.md
  // § Erweiterung fuer den neuen Datenstand.
  // Unmapped faellt auf 'neutral' (grau) -- kein Crash, aber Designregel 3 bricht.
  // 'EMPFANGSORT':       'ort',          // G1
  // 'VERTRAGSORT':       'ort',          // G1
  // 'BELEUCHTER':        'person',       // G2 Crew
  // 'MASKENBILDNER':     'person',       // G2 (Tippfehler 'MASKENBIDNER' durchgereicht)
  // 'REPETITOR':         'person',       // G2
  // 'REGIEASSISTENT':    'person',       // G2
  // 'FOTOGRAF':          'person',       // G2
  // 'PUBLIKUM':          'person',       // G8 -- bzw. subject, mit Lane 1 klaeren
  // 'ABGEBILDET':        'person',       // G8
  // 'GESAMTVERGÜTUNG':   'finanz',       // G3 detailRole
  // 'REISEKOSTEN':       'finanz',       // G3
  // 'RUNDFUNKSHONORAR':  'finanz',       // G3 (Tippfehler-Variante durchgereicht)
};

export function roleClusterFor(prefix) {
  if (!prefix) return 'neutral';
  const key = String(prefix).toUpperCase();
  return ROLE_CLUSTER[key] || 'neutral';
}

// =========================================================================
// Mobilitaetssichten (Session 36, M3): `m3gim:eventRole` an STE-Events +
// Datumsrollen gruppiert nach den fuenf Mobilitaetstypen aus
// `research-framework.md § Mobilitaetstypen` und `data-model.md § 10`.
// Orthogonal zu ROLE_CLUSTER (dort: Chip-Farbe pro Rolle-Kategorie);
// hier: thematisches Cluster pro Mobilitaets-Sicht.
// =========================================================================

export const EVENT_ROLE_TO_MOBILITY_CLUSTER = {
  // Performative Mobilitaet (Auftritte, Auffuehrungen)
  'auftritt':          'performativ',
  'aufführung':        'performativ',
  'auffuehrung':       'performativ',
  'gastspiel':         'performativ',
  'premiere':          'performativ',
  'wiederaufnahme':    'performativ',
  'festvorstellung':   'performativ',
  'probe':             'performativ',
  'probenbeginn':      'performativ',
  'auftrittsdatum':    'performativ',
  'auffuehrungsdatum': 'performativ',
  'aufführungsdatum':  'performativ',
  'probendatum':       'performativ',
  'premieredatum':     'performativ',

  // Institutionelle Mobilitaet (Engagements)
  'spielzeit':         'institutionell',
  'spielzeitVon':      'institutionell',
  'spielzeitBis':      'institutionell',

  // Korrespondenz + Reise
  'absendedatum':      'korrespondenz',
  'empfangsdatum':     'korrespondenz',
  'abreisedatum':      'korrespondenz',

  // Diskursive Mobilitaet (Presse, Rundfunk)
  'erscheinungsdatum': 'diskursiv',
  'ausstrahlung':      'diskursiv',
  'ausstrahlungsdatum':'diskursiv',

  // Biografische Mobilitaet (Ausweise, Wohnsitz)
  'ausstellungsdatum': 'biografisch',
  'wohnort':           'biografisch',
  'gespräch':          'biografisch',
  'gespraech':         'biografisch',

  // Neutrale Kennzeichnung
  'erwähnt':           null,
  'erwaehnt':          null,

  // Klaerungsbedarf: nicht in data.md § 5 als Mobilitaets-Rolle
  // belegt -- bewusst auf null statt willkuerlich einzuordnen.
  // TODO M3.5-Review (Session 36): mit Erschliessungsteam klaeren.
  'auftrag':           null,  // Werks-/Vertrags-/Auftritts-Auftrag? Unklar.
  'entstehung':        null,  // Werk- oder Dokumententstehung? Unklar.
  // Finanzrolle (data.md § 5 Finanzrollen) -- gehoert nicht in
  // Mobilitaetssichten. Hier fuer den Test explizit als nicht-Mobilitaet
  // markiert; die Darstellung erfolgt ueber das Finanzen-Cluster.
  'ueberweisung':      null,
  'überweisung':       null,

  // Mobilitaets-Ortsrollen (E-97): erzeugen datumslose SpatiotemporalEvents.
  // Zugeordnet zum Cluster 'korrespondenz' (buendelt Reise + Korrespondenz, s.o.)
  // nach data.md § Ortsrollen: zielort/abreiseort = Reisemobilitaet,
  // empfangsort = Korrespondenzmobilitaet, absendeort = beides, vertragsort =
  // Mobilitaets-Ortsrolle der Reise/Korrespondenz-Spur (§ 10).
  // Datumslosigkeit ist hier der Normalfall, kein Defekt: die Sicht-Zuordnung
  // erfolgt ueber die Rolle, nicht ueber ein Datum (kein Datum wird geraten,
  // § 8 Konfidenz). Entscheidung E-110, order-m3gim 2026-06-21 Punkt 1.
  'zielort':           'korrespondenz',
  'absendeort':        'korrespondenz',
  'abreiseort':        'korrespondenz',
  'empfangsort':       'korrespondenz',
  'vertragsort':       'korrespondenz',

  // Aus dem PENDING-Block aktiviert (tieferer Export belegt diese eventRoles).
  // Provisorisch, mit dem Erschliessungsteam zu bestaetigen (Treffen 2026-06-23):
  // generalprobe = performativ (wie das Geschwister 'probe'); aufnahme =
  // diskursiv (mediale Spur wie 'ausstrahlung'); rahmenveranstaltung = null
  // (genuin unklar, null = "keine Sicht/Klaerungsbedarf", Leitplanke-konform).
  'generalprobe':      'performativ',
  'aufnahme':          'diskursiv',
  'rahmenveranstaltung': null,
};

/**
 * Mobilitaetssicht einer Rolle. Nimmt die Concept-Id des zusammengefuehrten
 * Modells (ANNOTATION_ROLE_CLUSTER, massgeblich) und ebenso den Rollen-Rohwert
 * des abgeloesten Modells (EVENT_ROLE_TO_MOBILITY_CLUSTER), solange die
 * ausgelieferte Datei unter docs/data/ noch das alte Modell traegt.
 */
export function mobilityClusterFor(eventRole) {
  if (!eventRole) return null;
  const raw = String(eventRole).trim();
  if (raw in ANNOTATION_ROLE_CLUSTER) return ANNOTATION_ROLE_CLUSTER[raw];
  const key = raw.toLowerCase();
  if (!(key in EVENT_ROLE_TO_MOBILITY_CLUSTER)) return null;
  return EVENT_ROLE_TO_MOBILITY_CLUSTER[key];
}

// =========================================================================
// Rollen -> funktionale Sektion im Archiv-Inline-Detail (Session 34)
// Eingabe: Rollenwert in lowercase (wie in JSON-LD, z. B. "komponist").
// Rueckgabe: Sektionskey ('produktion' | 'mitwirkende' | 'erwaehnt' | null).
// null bedeutet: keine explizite Zuordnung -> landet im Default-Bucket
// "Weitere".
// =========================================================================

export const ROLE_TO_SECTION = {
  // Produktion — kreative Verantwortung
  'komponist':         'produktion',
  'dirigent':          'produktion',
  'regisseur':         'produktion',
  'librettist':        'produktion',
  'übersetzer':        'produktion',
  'uebersetzer':       'produktion',
  'verfasser':         'produktion',
  'herausgeber':       'produktion',
  'arrangeur':         'produktion',
  'choreograph':       'produktion',
  'choreograf':        'produktion',
  'bühnenbildner':     'produktion',
  'buehnenbildner':    'produktion',
  'chorleiter':        'produktion',
  'kostümbildner':     'produktion',
  'kostuembildner':    'produktion',
  'ausstatter':        'produktion',
  'bühnenleiter':      'produktion',
  'buehnenleiter':     'produktion',
  'technische leitung': 'produktion',

  // Mitwirkende — auf der Buehne oder im Archiv-Kontext
  'sänger':            'mitwirkende',
  'saenger':           'mitwirkende',
  'sängerin':          'mitwirkende',
  'interpret':         'mitwirkende',
  'protagonist':       'mitwirkende',
  'agent':             'mitwirkende',
  'vermittler':        'mitwirkende',
  'adressat':          'mitwirkende',
  'absender':          'mitwirkende',
  'empfänger':         'mitwirkende',
  'empfaenger':        'mitwirkende',
  'unterzeichner':     'mitwirkende',
  'auftraggeber':      'mitwirkende',
  'veranstalter':      'mitwirkende',

  // Erwaehnt
  'erwähnt':           'erwaehnt',
  'erwaehnt':          'erwaehnt',

  // === PENDING: neuer Datenstand Lane 1 (G2/G8). Aktivieren nach Promote +
  // Lane-1-Bestaetigung; siehe frontend-architecture.md § Erweiterung fuer den
  // neuen Datenstand. Sonst landen diese Rollen im Default-Bucket "Weitere"
  // statt in Produktion/Erwaehnt.
  // 'beleuchter':        'produktion',  // G2
  // 'maskenbildner':     'produktion',  // G2
  // 'repetitor':         'produktion',  // G2
  // 'regieassistent':    'produktion',  // G2
  // 'fotograf':          'produktion',  // G2
  // 'publikum':          'erwaehnt',    // G8
  // 'abgebildet':        'erwaehnt',    // G8
};

export function sectionForRole(role) {
  if (!role) return null;
  return ROLE_TO_SECTION[String(role).trim().toLowerCase()] || null;
}

// =========================================================================
// STE-Chip-Prefix: Datums-Rollen auf Ereignis-/Ort-Rollen mappen.
// Die Pipeline emittiert m3gim:eventRole im STE mit der Datums-Property
// aus der XLSX (z. B. "auffuehrungsdatum"). Im Ort-und-Ereignis-Chip
// (Ort · Datum) ist eine Ort-/Ereignis-Rolle semantisch stimmiger.
// =========================================================================

export const STE_ROLE_DISPLAY = {
  absendedatum:       'ABSENDEORT',
  empfangsdatum:      'EMPFANGSORT',
  erscheinungsdatum:  'ERSCHEINUNGSORT',
  ausstellungsdatum:  'AUSSTELLUNGSORT',
  abreisedatum:       'ABREISEORT',
  auffuehrungsdatum:  'AUFFÜHRUNG',
  auftrittsdatum:     'AUFTRITT',
  premieredatum:      'PREMIERE',
  probendatum:        'PROBE',
  probenbeginn:       'PROBENBEGINN',
  ausstrahlungsdatum: 'AUSSTRAHLUNG',
  ueberweisungsdatum: 'ÜBERWEISUNG',
  gespraechsdatum:    'GESPRÄCH',
};

export function steChipPrefix(eventRole) {
  if (!eventRole) return 'EREIGNIS';
  const key = String(eventRole).trim().toLowerCase();
  return STE_ROLE_DISPLAY[key] || String(eventRole).toUpperCase();
}

// =========================================================================
// Annotationsrollen des zusammengefuehrten Modells.
//
// Die Klasse m3gim-ontology:Annotation traegt jede Datierung und jede
// Verortung. Ihre Rolle ist ein Verweis auf ein Concept des Vokabulars
// m3gim-vocab und fuehrt dessen skos:prefLabel im Verweisknoten mit. Die
// Anzeigeform steht damit in den Daten und nicht mehr im Code; die Tabellen
// hier halten nur die drei Entscheidungen, die die Daten nicht treffen.
// Geschluesselt wird durchweg mit der stabilen Concept-Id, nicht mit dem
// Anzeigetext.
// =========================================================================

/**
 * Bezugsebene je Annotationsrolle (Frontend-Vertrag A3). Sie sagt, worauf sich
 * eine Datierung bezieht; die Rolle sagt, was fuer ein Zeitpunkt gemeint ist.
 * Vor der Zusammenfuehrung steckte diese Unterscheidung in der Formzugehoerig-
 * keit (typisierte Property gegen DatedEvent), die nach Parsbarkeit vergeben
 * wurde und damit Datenqualitaet kodierte statt Bedeutung.
 *
 *   object       Das Dokument selbst ist dann entstanden, ausgestellt,
 *                erschienen, abgesendet oder empfangen worden.
 *   attested     Das Dokument belegt ein Ereignis, das dann stattfand. Nur
 *                diese Ebene und `object` speisen den Zeitstrahl.
 *   mentioned    Das Datum steht im Dokument und gehoert nicht in die
 *                Lebenslinie (Beleg: eine genannte Jahreszahl 1872 auf einer
 *                Lebenslinie von 1919 bis 2009).
 *   framing      Rahmenveranstaltung, ein Zeitraum, der deutlich weiter ist
 *                als das Dokument selbst (Festspielsaison).
 *   unfulfilled  Vertragsstatus `nicht eingehalten`, ein Termin, der gerade
 *                nicht stattgefunden hat. Kein Begriff des Vokabulars, deshalb
 *                als Literal geschluesselt.
 *
 * Eine Annotation ohne Rolle traegt die Bezugsebene `unclassified`; sie ist
 * nicht entscheidbar und datiert deshalb nicht. Der Wert steht nicht in dieser
 * Tabelle, weil es keine Rolle gibt, an der er haengen koennte.
 *
 * Ohne Eintrag faellt eine Datierung aus jeder Auswahl nach Bezugsebene
 * heraus; `tests/frontend/typed-dates.test.mjs` haelt die Tabelle deshalb
 * gegen den Datenstand.
 */
export const ANNOTATION_ROLE_SCOPE = {
  // Datierung des Objekts
  'm3gim-vocab:creation':             'object',
  'm3gim-vocab:publicationDate':      'object',
  'm3gim-vocab:issueDate':            'object',
  'm3gim-vocab:dispatch':             'object',
  'm3gim-vocab:receiving':            'object',
  'm3gim-vocab:contractPlace':        'object',
  'm3gim-vocab:wageConfirmationDate': 'object',

  // Datierung eines bezeugten Ereignisses
  'm3gim-vocab:performance':          'attested',
  'm3gim-vocab:premiere':             'attested',
  'm3gim-vocab:guestPerformance':     'attested',
  'm3gim-vocab:dressRehearsal':       'attested',
  'm3gim-vocab:rehearsal':            'attested',
  'm3gim-vocab:rehearsalStartDate':   'attested',
  'm3gim-vocab:recording':            'attested',
  'm3gim-vocab:broadcastDate':        'attested',
  'm3gim-vocab:season':               'attested',
  'm3gim-vocab:departure':            'attested',
  'm3gim-vocab:destinationPlace':     'attested',
  'm3gim-vocab:reception':            'attested',
  'm3gim-vocab:conversationDate':     'attested',
  'm3gim-vocab:transferDate':         'attested',
  'm3gim-vocab:installmentPeriod':    'attested',
  'm3gim-vocab:assignment':           'attested',

  // Datierung einer Erwaehnung
  'm3gim-vocab:mentioned':            'mentioned',

  // Umfassender Zeitraum
  'm3gim-vocab:framingEvent':         'framing',

  // Negierte Behauptung
  'nicht eingehalten':                'unfulfilled',
};

/**
 * Die Bezugsebenen, die einen Record datieren duerfen (Frontend-Vertrag A4).
 * Jede andere Ebene bleibt lesbar, datiert den Record aber nicht.
 */
export const ANCHORING_SCOPES = new Set(['object', 'attested']);

/**
 * Rang der Annotationsrollen (Frontend-Vertrag A2). Die Listenreihenfolge ist
 * die Prioritaet der abgeleiteten Datierung, wenn ein Record mehrere traegt.
 *
 * Der vordere Block uebernimmt die Reihenfolge der abgeloesten Liste
 * TYPED_DATE_PROPS unveraendert; sie folgte dem Auffuehrungsbezug. Die beiden
 * zusammengefallenen Terme stehen an der Stelle ihres Zusammenschlusses
 * (auftrittsdatum in aufführung, erstelldatum in entstehung). Der hintere
 * Block haelt die Rollen, die das Frontend vor der Zusammenfuehrung nur ueber
 * die raumzeitlichen Ereignisse erreichte, wo keine Prioritaet zwischen Rollen
 * bestand; ihre Reihenfolge folgt derselben Logik wie der vordere Block.
 *
 * Rollen ohne Eintrag sortieren hinter jeden Eintrag der Liste, in
 * Quellreihenfolge. Eine Rolle, die im Datenstand datiert und hier fehlt,
 * meldet `tests/frontend/typed-dates.test.mjs`.
 */
export const ANNOTATION_ROLE_RANK = [
  'm3gim-vocab:performance',          // auffuehrungsdatum, auftrittsdatum
  'm3gim-vocab:premiere',             // premieredatum
  'm3gim-vocab:dispatch',             // absendedatum
  'm3gim-vocab:receiving',            // empfangsdatum
  'm3gim-vocab:conversationDate',     // gespraechsdatum
  'm3gim-vocab:publicationDate',      // erscheinungsdatum
  'm3gim-vocab:issueDate',            // ausstellungsdatum
  'm3gim-vocab:broadcastDate',        // ausstrahlungsdatum
  'm3gim-vocab:rehearsalStartDate',   // probenbeginn
  'm3gim-vocab:rehearsal',            // probendatum
  'm3gim-vocab:season',               // spielzeitVon
  'm3gim-vocab:transferDate',         // ueberweisungsdatum
  'm3gim-vocab:departure',            // abreisedatum
  'm3gim-vocab:creation',             // erstelldatum, entstehungsdatum
  'm3gim-vocab:guestPerformance',
  'm3gim-vocab:dressRehearsal',
  'm3gim-vocab:recording',
  'm3gim-vocab:reception',
  'm3gim-vocab:contractPlace',
  'm3gim-vocab:assignment',
  'm3gim-vocab:installmentPeriod',
  'm3gim-vocab:wageConfirmationDate',
];

const RANK_BY_ROLE = new Map(ANNOTATION_ROLE_RANK.map((id, i) => [id, i]));

/** Rang einer Rolle; ohne Eintrag hinter jeden gefuehrten Rang. */
export function rankForRole(roleId) {
  const rank = RANK_BY_ROLE.get(roleId);
  return rank === undefined ? ANNOTATION_ROLE_RANK.length : rank;
}

/** Bezugsebene einer Rolle; null, wenn die Rolle nicht gefuehrt ist. */
export function scopeForRole(roleId) {
  return (roleId && ANNOTATION_ROLE_SCOPE[roleId]) || null;
}

/**
 * Mobilitaetssicht je Annotationsrolle, nach Concept-Id. Loest die
 * Zeichenketten-Heuristik auf dem Rollennamen ab, die aus der Endung "datum"
 * ein Farbcluster ableitete; ein Begriff wie `aufführung` traegt die Endung
 * nicht mehr. Die Zuordnungen sind unveraendert aus
 * EVENT_ROLE_TO_MOBILITY_CLUSTER uebernommen, `null` heisst wie dort
 * ausdruecklich "keine Sicht" und nicht "nicht eingetragen".
 */
export const ANNOTATION_ROLE_CLUSTER = {
  'm3gim-vocab:performance':          'performativ',
  'm3gim-vocab:guestPerformance':     'performativ',
  'm3gim-vocab:premiere':             'performativ',
  'm3gim-vocab:revival':              'performativ',
  'm3gim-vocab:galaPerformance':      'performativ',
  'm3gim-vocab:rehearsal':            'performativ',
  'm3gim-vocab:rehearsalStartDate':   'performativ',
  'm3gim-vocab:dressRehearsal':       'performativ',
  'm3gim-vocab:performancePlace':     'performativ',

  'm3gim-vocab:season':               'institutionell',

  'm3gim-vocab:dispatch':             'korrespondenz',
  'm3gim-vocab:receiving':            'korrespondenz',
  'm3gim-vocab:departure':            'korrespondenz',
  'm3gim-vocab:destinationPlace':     'korrespondenz',
  'm3gim-vocab:contractPlace':        'korrespondenz',

  'm3gim-vocab:publicationDate':      'diskursiv',
  'm3gim-vocab:broadcastDate':        'diskursiv',
  'm3gim-vocab:recording':            'diskursiv',

  'm3gim-vocab:issueDate':            'biografisch',
  'm3gim-vocab:residencePlace':       'biografisch',
  'm3gim-vocab:conversationDate':     'biografisch',

  // Ausdruecklich ohne Sicht (Klaerungsbedarf oder nicht-mobiler Vorgang).
  'm3gim-vocab:mentioned':            null,
  'm3gim-vocab:framingEvent':         null,
  'm3gim-vocab:assignment':           null,
  'm3gim-vocab:creation':             null,
  'm3gim-vocab:transferDate':         null,
  'm3gim-vocab:installmentPeriod':    null,
  'm3gim-vocab:wageConfirmationDate': null,
  'm3gim-vocab:reception':            null,
  'nicht eingehalten':                null,
};

