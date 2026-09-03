/**
 * Tab bar keyboard handling — the WAI-ARIA tabs pattern for a tablist whose
 * buttons are visually split into groups (E-160).
 *
 * The groups are a visual ordering only, so arrow keys run across all tabs in
 * DOM order and never stop at a group boundary. The router keeps owning
 * navigation: this module resolves the target index and hands the tab name
 * back, it does not write the hash.
 */

/**
 * Target index for a key press in a roving tablist, or null when the key is
 * not one of the pattern's. Arrow movement wraps, which is what the pattern
 * prescribes for a tablist that activates on focus.
 *
 * @param {string} key KeyboardEvent.key
 * @param {number} current index of the currently focused tab
 * @param {number} count number of tabs
 * @returns {number|null}
 */
export function nextTabIndex(key, current, count) {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowRight': return (current + 1) % count;
    case 'ArrowLeft':  return (current - 1 + count) % count;
    case 'Home':       return 0;
    case 'End':        return count - 1;
    default:           return null;
  }
}

/**
 * Roving tabindex: exactly one tab is reachable by Tab, the active one.
 * @param {Iterable<HTMLElement>} tabs
 * @param {number} activeIndex
 */
export function setRovingTabindex(tabs, activeIndex) {
  let i = 0;
  for (const tab of tabs) {
    tab.tabIndex = i === activeIndex ? 0 : -1;
    i += 1;
  }
}

/**
 * Binds arrow/Home/End on the tablist. Activation follows focus, which is the
 * pattern's default for tab panels that are cheap to show.
 *
 * @param {HTMLElement} tablist
 * @param {(name: string) => void} onSelect called with the tab's data-tab value
 * @returns {() => void} detach
 */
export function initTabKeyboard(tablist, onSelect) {
  if (!tablist) return () => {};

  const handler = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    const target = nextTabIndex(event.key, current, tabs.length);
    if (target === null) return;
    event.preventDefault();
    const btn = tabs[target];
    setRovingTabindex(tabs, target);
    btn.focus();
    const name = btn.dataset.tab;
    if (name) onSelect(name);
  };

  tablist.addEventListener('keydown', handler);
  return () => tablist.removeEventListener('keydown', handler);
}
