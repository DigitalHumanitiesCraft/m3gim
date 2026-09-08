import { el } from '../utils/dom.js';
import { getFilter, setFilter, facetSelectionValues } from './filter-state.js';
import { navigateToView } from './router.js';
import { labelNode } from './sidebar-options.js';
import { searchSuggestions, textSearchCount, SEARCH_FAMILIES } from './search-data.js';

let sequence = 0;
const REGISTERS = { person: 'personen', institution: 'organisationen', werk: 'werke', ort: 'orte' };

/** One draft/commit combobox shared by every research view. */
export function createSearch(store, { selectFacet } = {}) {
  const id = `research-search-${++sequence}`;
  const root = el('div', { className: 'research-search', role: 'search' });
  const input = el('input', { type: 'search', className: 'research-search__input',
    'aria-label': 'Suche', placeholder: 'Dokumente, Personen, Institutionen, Werke und Orte suchen',
    role: 'combobox', autocomplete: 'off', 'aria-autocomplete': 'list',
    'aria-controls': `${id}-options`, 'aria-expanded': 'false' });
  const list = el('div', { id: `${id}-options`, role: 'listbox', 'aria-label': 'Suchvorschläge',
    className: 'research-search__options' });
  const status = el('span', { className: 'research-search__status', 'aria-live': 'polite' });
  const more = el('button', { type: 'button', className: 'research-search__more',
    onClick: () => { limit += 20; paint(); } });
  const open = el('button', { type: 'button', className: 'research-search__open',
    onClick: () => { if (items[active]) openSuggestion(items[active]); } });
  const popup = el('div', { className: 'research-search__popup' }, status, list, more, open);
  popup.hidden = true;
  root.append(el('div', { className: 'research-search__row' }, input), popup);
  let active = -1;
  let items = [];
  let limit = 20;
  let expanded = false;

  function close() {
    expanded = false;
    popup.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  function commitText() {
    const value = input.value.trim();
    close();
    input.value = '';
    setFilter({ search: value });
  }
  function choose(item) {
    if (item.action === 'text') { commitText(); return; }
    close();
    input.value = '';
    if (item.family === 'document') {
      setFilter({ predicates: [...(getFilter().predicates || []),
        { type: 'records', ids: [item.rawValue] }] });
    } else {
      const values = [...new Set([...facetSelectionValues(getFilter(), item.family), item.rawValue])];
      if (selectFacet) selectFacet(item.family, values);
      else setFilter({ [item.family]: values });
    }
    input.focus();
  }
  function openSuggestion(item) {
    close();
    if (item.family === 'document') navigateToView('bestand', { recordId: item.rawValue, preserveFilter: true });
    else if (item.family === 'ort') navigateToView('karte', { ort: item.rawValue, family: 'ort' });
    else navigateToView('indizes', { register: REGISTERS[item.family], entry: item.rawValue,
      family: item.family });
  }
  function paintActive() {
    [...list.children].forEach((row, index) => {
      row.setAttribute('aria-selected', String(index === active));
      row.classList.toggle('research-search__option--active', index === active);
    });
    const row = list.children[active];
    if (row) {
      input.setAttribute('aria-activedescendant', row.id);
      row.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
    open.hidden = !row || items[active].action === 'text';
    if (row && items[active].action !== 'text') open.textContent = items[active].family === 'document'
      ? 'Dokument öffnen' : items[active].family === 'ort' ? 'Ort auf der Karte öffnen' : 'Registereintrag öffnen';
  }
  function paint() {
    if (!expanded) return;
    const draft = input.value.trim();
    items = draft ? [{ action: 'text', family: 'text', label: draft,
      count: textSearchCount(store, getFilter(), draft), key: JSON.stringify(['text', draft]) },
    ...searchSuggestions(store, getFilter(), draft)] : [];
    if (active < 0 || active >= Math.min(limit, items.length)) active = items.length ? 0 : -1;
    list.replaceChildren();
    for (const [index, item] of items.slice(0, limit).entries()) {
      const row = el('div', { role: 'option', id: `${id}-${index}`, 'aria-selected': 'false',
        className: 'research-search__option', onClick: () => choose(item),
        'aria-label': actionLabel(item),
      }, actionNode(item, input.value),
      el('span', { className: 'research-search__count' }, String(item.count)));
      list.append(row);
    }
    status.textContent = items.length ? `${items.length} Aktionen · Enter führt die ausgewählte Aktion aus` : '';
    more.hidden = items.length <= limit;
    more.textContent = `Weitere Vorschläge (${Math.max(0, items.length - limit)})`;
    popup.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    paintActive();
  }
  input.addEventListener('focus', () => { expanded = true; active = -1; paint(); });
  input.addEventListener('input', () => { expanded = true; active = -1; limit = 20; paint(); });
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(); event.preventDefault(); return; }
    if (event.key === 'Enter') {
      if (expanded && active >= 0 && items[active]) choose(items[active]); else commitText();
      event.preventDefault();
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!expanded) { expanded = true; paint(); }
      const count = Math.min(limit, items.length);
      if (!count) return;
      active = active < 0 ? (event.key === 'ArrowDown' ? 0 : count - 1)
        : (active + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
      paintActive(); event.preventDefault();
    }
  });
  list.addEventListener('mousedown', event => event.preventDefault());
  const outside = event => { if (!root.contains(event.target)) close(); };
  const leave = event => { if (!root.contains(event.relatedTarget)) close(); };
  document.addEventListener('pointerdown', outside);
  root.addEventListener('focusout', leave);
  const tabChange = () => { close(); input.value = ''; };
  window.addEventListener('m3gim:navigate', tabChange);
  window.addEventListener('m3gim:view-change', tabChange);
  return { element: root, update: paint, destroy() {
    close(); document.removeEventListener('pointerdown', outside);
    window.removeEventListener('m3gim:navigate', tabChange);
    window.removeEventListener('m3gim:view-change', tabChange);
    root.removeEventListener('focusout', leave);
  } };
}

function actionLabel(item) {
  const count = `${item.count} ${item.count === 1 ? 'Dokument' : 'Dokumente'}`;
  if (item.action === 'text') return `Nach „${item.label}“ im Text suchen, ${count}`;
  return `Nach ${SEARCH_FAMILIES[item.family]} ${item.label} filtern, ${count}`;
}

function actionNode(item, draft) {
  const prefix = item.action === 'text' ? 'Nach „' : `Nach ${SEARCH_FAMILIES[item.family]} `;
  const suffix = item.action === 'text' ? '“ im Text suchen' : ' filtern';
  return el('span', { className: `research-search__label fam-mark--${item.family}` },
    prefix, labelNode(item.label, draft), suffix,
    item.title ? el('span', { className: 'research-search__title' }, item.title) : null);
}
