/**
 * M³GIM Data Service
 * Handles data loading and transformation
 */

import { CONFIG } from '../modules/config.js';
import { setState, stateRef } from '../modules/state.js';
import { getDokumenttyp, isPhoto } from '../modules/utils.js';

/**
 * Load JSON-LD data from server
 */
export async function loadArchiveData() {
  try {
    const response = await fetch(CONFIG.dataUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const records = data['@graph'] || [];

    // Make data available globally for debugging
    window.m3gim = data;

    // Update state
    setState({
      allRecords: records,
      filteredRecords: records
    });

    // Calculate document type counts
    calculateDokumenttypCounts();

    return records;
  } catch (error) {
    console.error('Data loading error:', error);
    throw error;
  }
}

/**
 * Load visualization data (synthetic or extracted)
 */
export async function loadVisualizationData() {
  try {
    // Try to use the Data Extractor for real archive data
    if (window.M3GIMDataExtractor) {
      console.log('M³GIM: Using Data Extractor for real archive data...');
      const realData = await window.M3GIMDataExtractor.loadAndTransform();

      if (realData && realData.archivalien?.dokumente?.length > 0) {
        setState({ syntheticData: realData });
        window.m3gimData = realData;
        console.log(`M³GIM: Loaded ${realData.archivalien.dokumente.length} real archive records`);

        // Build archive document lookup table
        const archiveDocuments = {};
        realData.archivalien.dokumente.forEach(doc => {
          archiveDocuments[doc.id] = doc;
        });
        setState({ archiveDocuments });

        return realData;
      }
    }

    // Fallback to synthetic data file
    console.log('M³GIM: Falling back to synthetic data...');
    const response = await fetch(CONFIG.syntheticDataUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const syntheticData = await response.json();
    setState({ syntheticData });
    window.m3gimData = syntheticData;

    // Build archive document lookup table
    if (syntheticData.archivalien?.dokumente) {
      const archiveDocuments = {};
      syntheticData.archivalien.dokumente.forEach(doc => {
        archiveDocuments[doc.id] = doc;
      });
      setState({ archiveDocuments });
    }

    return syntheticData;
  } catch (error) {
    console.warn('Could not load visualization data:', error);
    return null;
  }
}

/**
 * Calculate counts for each document type
 */
export function calculateDokumenttypCounts() {
  const counts = {};

  stateRef.allRecords.forEach(record => {
    const typ = getDokumenttyp(record);
    if (typ) {
      counts[typ] = (counts[typ] || 0) + 1;
    }
  });

  setState({ dokumenttypCounts: counts });
  return counts;
}

/**
 * Get counts for Objekte and Fotos
 */
export function getBestandCounts() {
  const fotos = stateRef.allRecords.filter(isPhoto);
  const objekte = stateRef.allRecords.filter(r => !isPhoto(r));

  return {
    objekte: objekte.length,
    fotos: fotos.length
  };
}

/**
 * Find record by ID
 */
export function findRecordById(id) {
  return stateRef.allRecords.find(r => r['@id'] === id);
}

/**
 * Get archive document by ID
 */
export function getArchiveDocument(id) {
  return stateRef.archiveDocuments[id];
}
