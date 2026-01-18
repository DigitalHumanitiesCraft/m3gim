/**
 * M³GIM State Management Module
 * Centralized reactive state
 */

/**
 * Application state
 */
const state = {
  // Archive data
  allRecords: [],
  filteredRecords: [],
  dokumenttypCounts: {},

  // View state
  currentView: 'analyse',
  currentViz: 'partitur',

  // Filter state
  tektonikFilter: null,
  selectedRecord: null,

  // Visualization state
  focusYear: 1958,
  visibleTracks: new Set(['lebensphasen', 'orte', 'mobilitaet', 'netzwerk', 'repertoire', 'dokumente']),

  // Data
  syntheticData: null,
  archiveDocuments: {}
};

/**
 * State change listeners
 */
const listeners = new Map();

/**
 * Get current state (read-only copy)
 */
export function getState() {
  return { ...state };
}

/**
 * Update state and notify listeners
 */
export function setState(updates) {
  const changedKeys = [];

  for (const [key, value] of Object.entries(updates)) {
    if (state[key] !== value) {
      state[key] = value;
      changedKeys.push(key);
    }
  }

  // Notify listeners for changed keys
  changedKeys.forEach(key => {
    if (listeners.has(key)) {
      listeners.get(key).forEach(callback => callback(state[key], state));
    }
  });

  // Notify global listeners
  if (changedKeys.length > 0 && listeners.has('*')) {
    listeners.get('*').forEach(callback => callback(state));
  }
}

/**
 * Subscribe to state changes
 * @param {string} key - State key to watch ('*' for all changes)
 * @param {Function} callback - Called with new value and full state
 * @returns {Function} Unsubscribe function
 */
export function subscribe(key, callback) {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key).add(callback);

  // Return unsubscribe function
  return () => {
    listeners.get(key).delete(callback);
  };
}

/**
 * Direct state access for internal modules
 * Use with caution - prefer setState for modifications
 */
export const stateRef = state;
