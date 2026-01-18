/**
 * M³GIM Configuration Module
 * Central configuration and constants
 */

export const CONFIG = {
  dataUrl: 'data/m3gim.jsonld',
  syntheticDataUrl: 'data/synthetic-data.json',
  debounceDelay: 200,
  minYear: 1919,
  maxYear: 2009
};

/**
 * Tektonik structure based on archive organization
 */
export const TEKTONIK_STRUKTUR = {
  'Hauptbestand': {
    label: 'Hauptbestand',
    prefix: 'NIM_',
    excludePrefix: ['NIM/PL_', 'NIM_FS_', 'NIM_TT_'],
    children: null
  },
  'Plakate': {
    label: 'Plakate',
    prefix: 'NIM/PL_'
  },
  'Fotografien': {
    label: 'Fotografien',
    prefix: 'NIM_FS_'
  },
  'Tonträger': {
    label: 'Tonträger',
    prefix: 'NIM_TT_'
  }
};

/**
 * Visualization metadata
 */
export const VIZ_INFO = {
  partitur: {
    title: 'Mobilitäts-Partitur',
    description: 'Parallele Darstellung aller Dimensionen wie eine Orchesterpartitur – synchrone und diachrone Lesart.',
    ff: ['FF1', 'FF2', 'FF3', 'FF4']
  },
  matrix: {
    title: 'Begegnungs-Matrix',
    description: 'Beziehungsintensität zu Personen über Zeitperioden – wer war wann wichtig?',
    ff: ['FF1', 'FF3']
  },
  kosmos: {
    title: 'Rollen-Kosmos',
    description: 'Radiale Darstellung des künstlerischen Universums – Komponisten, Rollen, Aufführungsorte.',
    ff: ['FF2']
  },
  sankey: {
    title: 'Karriere-Fluss',
    description: 'Alluviales Diagramm: Wie veränderten sich Repertoire-Schwerpunkte und geografische Zentren über die Karrierephasen?',
    ff: ['FF2', 'FF4']
  }
};

/**
 * German labels for document types
 */
export const DOKUMENTTYP_LABELS = {
  'Letter': 'Korrespondenz',
  'Contract': 'Vertrag',
  'Article': 'Presse',
  'Program': 'Programm',
  'Poster': 'Plakat',
  'AudioVisualRecord': 'Tonträger',
  'Autobiography': 'Autobiografie',
  'IdentityDocument': 'Identitätsdokument',
  'EducationalRecord': 'Studienunterlagen',
  'List': 'Repertoire',
  'Collection': 'Sammlung',
  'Photograph': 'Fotografie'
};

/**
 * German labels for photo types
 */
export const PHOTO_TYPE_LABELS = {
  'sw': 'Schwarz-Weiß',
  'farbe': 'Farbe',
  'digital': 'Digital'
};

/**
 * German labels for languages
 */
export const LANGUAGE_LABELS = {
  'de': 'Deutsch',
  'uk': 'Ukrainisch',
  'en': 'Englisch',
  'fr': 'Französisch',
  'it': 'Italienisch'
};

/**
 * German labels for scan status
 */
export const SCAN_STATUS_LABELS = {
  'gescannt': 'Gescannt',
  'nicht_gescannt': 'Nicht gescannt',
  'online': 'Online verfügbar'
};

/**
 * Partitur track definitions
 */
export const PARTITUR_TRACKS = [
  { id: 'lebensphasen', label: 'Lebensphasen', ff: ['FF4'] },
  { id: 'orte', label: 'Orte', ff: ['FF4'] },
  { id: 'mobilitaet', label: 'Mobilität', ff: ['FF4'] },
  { id: 'netzwerk', label: 'Netzwerk', ff: ['FF1', 'FF3'] },
  { id: 'repertoire', label: 'Repertoire', ff: ['FF2'] },
  { id: 'dokumente', label: 'Dokumente', ff: ['FF1', 'FF2', 'FF3', 'FF4'] }
];

/**
 * Partitur layout configuration
 */
export const PARTITUR_CONFIG = {
  margin: { top: 50, right: 40, bottom: 60, left: 110 },
  trackHeight: 55,
  trackPadding: 18
};
