/**
 * M³GIM Korb, localStorage-based bookmarking of records.
 */

const STORAGE_KEY = 'm3gim-korb';
const items = new Set();
const listeners = [];

function normalizeRecordId(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  const migrated = raw.startsWith('m3gim:')
    ? `m3gim-data:${raw.slice('m3gim:'.length)}`
    : raw;
  return /^m3gim-data:[A-Za-z0-9._/-]+$/.test(migrated) ? migrated : null;
}

/** Load from localStorage */
export function initKorb() {
  items.clear();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return;
    for (const value of parsed) {
      const id = normalizeRecordId(value);
      if (id) items.add(id);
    }
    persist(false);
  } catch { items.clear(); }
}

function persist(notify = true) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...items]));
  } catch { /* ignore */ }
  if (notify) for (const cb of listeners) cb();
}

/** Remove IDs that the loaded dataset cannot resolve. */
export function reconcileKorb(records) {
  const available = records instanceof Map
    ? new Set(records.keys())
    : new Set(records || []);
  let changed = false;
  for (const id of items) {
    if (available.has(id)) continue;
    items.delete(id);
    changed = true;
  }
  if (changed) persist();
  return changed;
}

export function removeFromKorb(recordId) {
  items.delete(recordId);
  persist();
}

export function toggleKorb(recordId) {
  const id = normalizeRecordId(recordId);
  if (!id) return;
  if (items.has(id)) items.delete(id);
  else items.add(id);
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
  // Unsubscribe zurueckgeben, damit Abonnenten (z. B. renderKorb) sich vor
  // einem erneuten Abonnement abmelden koennen und keine Listener leaken.
  return () => {
    const i = listeners.indexOf(callback);
    if (i !== -1) listeners.splice(i, 1);
  };
}
