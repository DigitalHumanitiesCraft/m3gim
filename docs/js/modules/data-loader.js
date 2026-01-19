/**
 * M3GIM Data Loader Module
 * Handles loading of view-specific JSON data
 */

import { CONFIG } from './config.js';

/**
 * Load view-specific data from JSON files
 */
export class ViewDataLoader {
  constructor() {
    this.cache = new Map();
    this.archiveData = null;
  }

  /**
   * Load archive data (JSON-LD)
   */
  async loadArchiveData() {
    if (this.archiveData) {
      return this.archiveData;
    }

    try {
      const response = await fetch(CONFIG.dataUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      this.archiveData = data['@graph'] || [];
      // eslint-disable-next-line no-console
      console.log(`Loaded ${this.archiveData.length} archive records`);
      return this.archiveData;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load archive data:', error);
      return [];
    }
  }

  /**
   * Load view data for a specific visualization
   */
  async loadViewData(viewName) {
    if (this.cache.has(viewName)) {
      return this.cache.get(viewName);
    }

    const url = CONFIG.viewDataUrls[viewName];
    if (!url) {
      throw new Error(`Unknown view: ${viewName}`);
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      this.cache.set(viewName, data);
      // eslint-disable-next-line no-console
      console.log(`Loaded ${viewName} view data`);
      return data;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to load ${viewName} data:`, error);
      return null;
    }
  }

  /**
   * Load Partitur view data
   */
  async loadPartiturData() {
    return this.loadViewData('partitur');
  }

  /**
   * Load Matrix view data
   */
  async loadMatrixData() {
    return this.loadViewData('matrix');
  }

  /**
   * Load Kosmos view data
   */
  async loadKosmosData() {
    return this.loadViewData('kosmos');
  }

  /**
   * Load Sankey view data
   */
  async loadSankeyData() {
    return this.loadViewData('sankey');
  }

  /**
   * Find archive document by signature
   */
  async findDocumentBySignature(signature) {
    const archiveData = await this.loadArchiveData();
    return archiveData.find(doc => doc['rico:identifier'] === signature);
  }

  /**
   * Get documents by signatures
   */
  async getDocumentsBySignatures(signatures) {
    const archiveData = await this.loadArchiveData();
    return signatures
      .map(sig => archiveData.find(doc => doc['rico:identifier'] === sig))
      .filter(doc => doc !== undefined);
  }
}

// Create singleton instance
export const dataLoader = new ViewDataLoader();
