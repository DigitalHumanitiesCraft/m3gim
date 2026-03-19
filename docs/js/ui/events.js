/**
 * M³GIM Cross-View Event Bus
 * Centralized listener for m3gim:navigate and m3gim:archiv-filter events.
 * Queues events for views that haven't rendered yet — replays on subscribe.
 */

const handlers = new Map();  // tab → handler function
const pending = new Map();   // tab → last queued detail (for not-yet-rendered views)

/**
 * Register a handler for cross-view navigation into a specific tab.
 * If an event arrived before registration, the handler is called immediately.
 * @param {string} tab - target tab name (e.g. 'kosmos', 'zeitfluss', 'archiv')
 * @param {Function} handler - callback(detail) — receives the event detail object
 */
export function onViewNavigate(tab, handler) {
  handlers.set(tab, handler);
  // Replay any pending event that arrived before the view was ready
  if (pending.has(tab)) {
    const detail = pending.get(tab);
    pending.delete(tab);
    handler(detail);
  }
}

/**
 * Remove a registered handler.
 * @param {string} tab
 */
export function offViewNavigate(tab) {
  handlers.delete(tab);
}

// --- Global listener (single point of dispatch) ---

window.addEventListener('m3gim:navigate', (event) => {
  const detail = event.detail || {};
  const { tab } = detail;
  if (!tab) return;

  const handler = handlers.get(tab);
  if (handler) {
    handler(detail);
  } else {
    // View not yet rendered — queue for later replay
    pending.set(tab, detail);
  }
});

window.addEventListener('m3gim:archiv-filter', (event) => {
  const detail = event.detail || {};
  const handler = handlers.get('archiv');
  if (handler) {
    handler(detail);
  } else {
    pending.set('archiv', detail);
  }
});
