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

// =========================================================================
// Dokumenttyp Labels
// =========================================================================

export const DOKUMENTTYP_LABELS = {
  // Tatsaechlich in den Daten vorkommende DFT-IDs (Stand 2026-04)
  'autobiografie': 'Autobiografie',
  'biographie': 'Biographie',
  'biographisch': 'Biographisch',
  'identitaetsdokument': 'Identitätsdokument',
  'konvolut': 'Konvolut',
  'korrespondenz': 'Korrespondenz',
  'notiz': 'Notiz',
  'photokopie': 'Photokopie',
  'plakat': 'Plakat',
  'presse': 'Presse',
  'programm': 'Programmheft',
  'quittung': 'Quittung',
  'repertoireliste': 'Repertoireliste',
  'rezension': 'Rezension',
  'tontraeger': 'Tonträger',
  'typoskript': 'Typoskript',
  'vertrag': 'Vertrag',
  'visitenkarte': 'Visitenkarte',
  // Legacy-Labels (aktuell nicht in Daten, belassen fuer Rueckwaertskompatibilitaet)
  'brief': 'Brief',
  'programmheft': 'Programmheft',
  'zeitungsausschnitt': 'Zeitungsausschnitt',
  'ausweis': 'Ausweis',
  'dokument': 'Dokument',
  'telegramm': 'Telegramm',
  'postkarte': 'Postkarte',
  'fotografie': 'Fotografie',
  'urkunde': 'Urkunde',
  'noten': 'Noten',
  'manuskript': 'Manuskript',
  'rechnung': 'Rechnung',
  'sammlung': 'Sammlung',
  // === PENDING: neuer Datenstand Lane 1 (G6). Aktivieren nach Promote des
  // neuen Exports; siehe lane-2-frontend-datenstand.md §1. Mittelfristig durch
  // SKOS-prefLabel-Pfad abgeloest (knowledge/plan.md).
  // 'musikzeitschrift': 'Musikzeitschrift',
  // 'briefumschlag':    'Briefumschlag',
  // 'verzeichnis':      'Verzeichnis',
  // 'chronik':          'Chronik',
};

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
  // Lane-1-Bestaetigung der Rollennamen; siehe lane-2-frontend-datenstand.md §1.
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
// `forschungsrahmen.md § Fuenf Mobilitaetstypen` und `datenmodell.md § 10`.
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

  // Klaerungsbedarf: nicht in datenmodell.md § 5 als Mobilitaets-Rolle
  // belegt -- bewusst auf null statt willkuerlich einzuordnen.
  // TODO M3.5-Review (Session 36): mit Erschliessungsteam klaeren.
  'auftrag':           null,  // Werks-/Vertrags-/Auftritts-Auftrag? Unklar.
  'entstehung':        null,  // Werk- oder Dokumententstehung? Unklar.
  // Finanzrolle (datenmodell.md § 5 Finanzrollen) -- gehoert nicht in
  // Mobilitaetssichten. Hier fuer den Test explizit als nicht-Mobilitaet
  // markiert; die Darstellung erfolgt ueber das Finanzen-Cluster.
  'ueberweisung':      null,
  'überweisung':       null,

  // === PENDING: neuer Datenstand Lane 1 (G1 STE-eventRoles + G8). KRITISCH:
  // ohne diese Eintraege failt test_25, sobald die STE im Export landen.
  // Aktivieren nach Lane-1-Bestaetigung; Cluster-Zuordnung der Ortsrollen ist
  // die unsichere Stelle (siehe lane-2-frontend-datenstand.md §1).
  // 'zielort':       'korrespondenz',   // G1 -- korrespondenz/reise
  // 'absendeort':    'korrespondenz',   // G1
  // 'abreiseort':    'korrespondenz',   // G1
  // 'empfangsort':   'korrespondenz',   // G1
  // 'vertragsort':   'institutionell',  // G1 -- institutionell ODER biografisch, mit Lane 1 klaeren
  // 'aufnahme':      'diskursiv',       // G8
  // 'generalprobe':  'performativ',     // G8 (probenTyp)
  // 'empfang':       null,              // G8 -- ggf. rahmenveranstaltung, mit Lane 1 klaeren
};

export function mobilityClusterFor(eventRole) {
  if (!eventRole) return null;
  const key = String(eventRole).trim().toLowerCase();
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
  // Lane-1-Bestaetigung; siehe lane-2-frontend-datenstand.md §1. Sonst landen
  // diese Rollen im Default-Bucket "Weitere" statt in Produktion/Erwaehnt.
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

