/**
 * M³GIM Color Schemes - Premium Edition
 *
 * Refined color definitions for all visualizations.
 * Design Philosophy: "Archival Elegance meets Modern Clarity"
 *
 * - Harmonized, less saturated colors
 * - Improved accessibility (WCAG AA compliant)
 * - Consistent warmth across palette
 */

(function() {
  'use strict';

  const M3GIM_COLORS = {
    // === PRIMARY: KUG Institutional (refined) ===
    primary: {
      main: '#004A8F',
      dark: '#002D5C',
      medium: '#2E6AAD',
      light: '#6B9DD1',
      tint: '#E1ECF5',
      subtle: '#F4F8FC'
    },

    // === NEUTRAL: Archive Palette (warmer) ===
    neutral: {
      paper: '#FCFBF9',
      cream: '#F7F5F2',
      parchment: '#F0EDE8',
      sand: '#E8E4DC',
      shadow: '#C4BFB5'
    },

    // === TEXT (warmer, more readable) ===
    text: {
      primary: '#2C2825',
      secondary: '#5C5651',
      tertiary: '#8A857E',
      hint: '#B0AAA3'
    },

    // === GOLD ACCENT (for highlights) ===
    gold: {
      rich: '#9A7B4F',
      medium: '#C4A574',
      light: '#E8DBC7',
      tint: '#F5F0E6'
    },

    // === COMPOSERS (harmonized, professional) ===
    komponisten: {
      'Richard Wagner': '#6B2C2C',      // Burgundy - dramatic
      'Giuseppe Verdi': '#2C5C3F',      // Deep forest - Italy
      'Richard Strauss': '#4A3A6B',     // Aubergine - modern
      'Christoph Willibald Gluck': '#8B7355', // Bronze - classical
      'Georg Friedrich Händel': '#4A5C5C',    // Teal slate - Baroque
      'Georges Bizet': '#7A4A6B',       // Muted plum
      'Giacomo Puccini': '#8B5A3C',     // Terracotta
      'Pietro Mascagni': '#6B5A4A',     // Warm brown
      'Ludwig van Beethoven': '#4A5A7A', // Steel blue
      'Eugen d\'Albert': '#5A6B4A',     // Olive
      'Jules Massenet': '#6B4A7A',      // Soft purple
      'Pjotr Iljitsch Tschaikowski': '#7A4A4A', // Dusty rose
      'diverse': '#6B6B6B'              // Neutral gray
    },

    // === PERSON CATEGORIES (for Matrix - refined) ===
    personenKategorien: {
      dirigent: '#4A6E96',     // Slate blue - leadership
      regisseur: '#6B4E8C',    // Muted purple - creative
      vermittler: '#3D7A5A',   // Forest green - connection
      kollege: '#9A6B3D',      // Warm amber - peer
      fokusperson: '#004A8F'   // Primary blue
    },

    // === MOBILITY TYPES (muted, professional) ===
    mobilitaet: {
      erzwungen: '#8B3A3A',    // Muted brick red - forced/flight
      geografisch: '#3D7A5A',  // Forest green - career
      bildung: '#B67D3D',      // Warm amber - education
      lebensstil: '#6B4E8C',   // Muted purple - lifestyle
      national: '#4A6E96'      // Slate blue - citizenship
    },

    // === PLACES (geographic harmony) ===
    orte: {
      'Lemberg': '#7A6B55',    // Warm brown - historical
      'Wien': '#9E4A5C',       // Rose - Austria
      'Graz': '#4A7A5C',       // Green - Steiermark
      'München': '#4A6B8C',    // Blue - Bavaria
      'Bayreuth': '#5C4A7A',   // Purple - Wagner
      'Zürich': '#8B6B4A',     // Amber - Switzerland
      'London': '#5C6B7A',     // Blue grey - UK
      'Salzburg': '#8B5C4A',   // Terracotta - Mozart
      'Berlin': '#5C5C5C',     // Neutral grey
      'Paris': '#4A5C8B',      // Blue - France
      'Stanislau': '#7A6655',  // Brown - historical
      'Edinburgh': '#4A6B5A',  // Dark green - Scotland
      'default': '#7A7A7A'     // Neutral
    },

    // === DOCUMENT TYPES (harmonized) ===
    dokumentTypen: {
      'Photograph': '#4A6E96',
      'Collection': '#6B4E8C',
      'Letter': '#3D7A5A',
      'Program': '#9A6B3D',
      'Article': '#8B3A3A',
      'Poster': '#3D7A8C',
      'Contract': '#6B5A4A',
      'IdentityDocument': '#5C6B7A',
      'Autobiography': '#7A4A7A',
      'List': '#6B6B6B',
      'AudioVisualRecord': '#8B4A4A',
      'default': '#7A7A7A'
    },

    // === LEBENSPHASEN (warm gradient) ===
    lebensphasen: {
      'LP1': '#F5F0E6',  // Gold tint - Childhood
      'LP2': '#E8DBC7',  // Light gold - Education
      'LP3': '#D4C4A8',  // Sand - Flight
      'LP4': '#C4A574',  // Medium gold - First engagements
      'LP5': '#B08A5C',  // Warm amber - Rise
      'LP6': '#9A7B4F',  // Rich gold - Peak
      'LP7': '#7A6644'   // Deep gold - Late phase
    },

    // === STATUS (accessible) ===
    status: {
      success: '#3D7A5A',
      warning: '#B67D3D',
      error: '#8B3A3A',
      info: '#4A6E96'
    },

    // === ACCESS STATUS ===
    zugang: {
      offen: '#3D7A5A',
      eingeschraenkt: '#B67D3D',
      gesperrt: '#8B3A3A'
    },

    // === BORDERS & LINES ===
    border: {
      strong: '#C4BFB5',
      medium: '#DCD7CE',
      light: '#EAE6DF',
      subtle: '#F2EFE9'
    }
  };

  /**
   * Get composer color
   */
  function getKomponistColor(komponistName) {
    // Try exact match first
    if (M3GIM_COLORS.komponisten[komponistName]) {
      return M3GIM_COLORS.komponisten[komponistName];
    }
    // Try partial match
    for (const [name, color] of Object.entries(M3GIM_COLORS.komponisten)) {
      if (komponistName.includes(name) || name.includes(komponistName)) {
        return color;
      }
    }
    // Fallback
    return M3GIM_COLORS.komponisten.diverse;
  }

  /**
   * Get place color
   */
  function getOrtColor(ortName) {
    if (M3GIM_COLORS.orte[ortName]) {
      return M3GIM_COLORS.orte[ortName];
    }
    // Try partial match
    for (const [name, color] of Object.entries(M3GIM_COLORS.orte)) {
      if (ortName.includes(name) || name.includes(ortName)) {
        return color;
      }
    }
    return M3GIM_COLORS.orte.default;
  }

  /**
   * Get category color
   */
  function getKategorieColor(kategorie) {
    return M3GIM_COLORS.personenKategorien[kategorie] || M3GIM_COLORS.text.tertiary;
  }

  /**
   * Get mobility color
   */
  function getMobilitaetColor(form) {
    return M3GIM_COLORS.mobilitaet[form] || M3GIM_COLORS.text.tertiary;
  }

  /**
   * Get document type color
   */
  function getDokumentTypColor(typ) {
    return M3GIM_COLORS.dokumentTypen[typ] || M3GIM_COLORS.dokumentTypen.default;
  }

  /**
   * Create D3 color scale for composers
   */
  function createKomponistScale() {
    const domain = Object.keys(M3GIM_COLORS.komponisten);
    const range = Object.values(M3GIM_COLORS.komponisten);
    return { domain, range };
  }

  /**
   * Create D3 color scale for places
   */
  function createOrtScale() {
    const domain = Object.keys(M3GIM_COLORS.orte).filter(k => k !== 'default');
    const range = domain.map(k => M3GIM_COLORS.orte[k]);
    return { domain, range };
  }

  // Export
  window.M3GIM_COLORS = M3GIM_COLORS;
  window.M3GIMColors = {
    colors: M3GIM_COLORS,
    getKomponistColor,
    getOrtColor,
    getKategorieColor,
    getMobilitaetColor,
    getDokumentTypColor,
    createKomponistScale,
    createOrtScale
  };

})();
