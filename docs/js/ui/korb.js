/**
 * M³GIM Wissenskorb — localStorage-based bookmarking of records.
 */

const STORAGE_KEY = 'm3gim-korb';
const items = new Set();
const listeners = [];

/** Load from localStorage */
export function initKorb() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      for (const id of JSON.parse(stored)) items.add(id);
    }
  } catch { /* ignore */ }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...items]));
  } catch { /* ignore */ }
  for (const cb of listeners) cb();
}

export function addToKorb(recordId) {
  items.add(recordId);
  persist();
}

export function removeFromKorb(recordId) {
  items.delete(recordId);
  persist();
}

export function toggleKorb(recordId) {
  if (items.has(recordId)) items.delete(recordId);
  else items.add(recordId);
  persist();
}

export function isInKorb(recordId) {
  return items.has(recordId);
}

export function getKorbItems() {
  return [...items];
}

export function getKorbCount() {
  return items.size;
}

export function clearKorb() {
  items.clear();
  persist();
}

export function onKorbChange(callback) {
  listeners.push(callback);
}
