/**
 * The one sidebar of every view (design.md Regel 7, E-158).
 *
 * `createSidebar` builds a fixed order and every tab gets the same column
 * (Projektleitung, 2026-09-03):
 *
 *   (a) search      free text into the shared filter, no title, the view names
 *                   its searchable fields in the placeholder
 *   (b) Zeitraum    the two-thumb year window, its years at the ends of the rail
 *   (c) facets      the shared facets, Dokumenttyp first, the two folded ones
 *                   (Land, Verknüpfung) among them
 *   (d) sections    view-specific controls the view passes in
 *   (e) legend      view-specific legend sections
 *
 * The result line is not a block of its own: it is the root row of the
 * Dokumenttyp tree ("Dokumente · 161 von 187"). The active values and the reset
 * link live outside the column, in the strip `createSidebar` returns beside the
 * element: a filter change must not make the column jump.
 *
 * A view passes only (d), (e) and an optional search config; the rest comes
 * from the scaffold and reads `filter-state.js`. Exactly three rules exist in
 * the column, before (c), (d) and (e); inside a block only spacing separates
 * (design.md Regel 11).
 *
 * The view stays owner of its local state. Controls read it through getters and
 * report back through callbacks; afterwards the view redraws and calls
 * `update()`. Every filter change, whether from this column or from another
 * view, arrives as exactly one `onChange` call, so a click never triggers two
 * render passes. `destroy()` drops the subscription when a view rebuilds.
 *
 * viewShell(sidebarEl, mainEl) is the grid the sidebar and the canvas hang in.
 *
 * This file composes; the parts stand beside it and are assembled here:
 * `sidebar-status.js` (result line), `sidebar-facets.js` (shared facets and
 * their tree), `sidebar-options.js` (row forms), `sidebar-range.js` (year
 * rail), `sidebar-controls.js` (the remaining factories), `sidebar-strip.js`
 * (chip row). Views and tests keep importing through this file.
 */

import { el } from '../utils/dom.js';
import { familyIcon } from './family-icons.js';
import { getFilter, setFilter, subscribe } from './filter-state.js';
import {
  facetInventory, docTypeGroups, linkGroups, YEAR_MIN, YEAR_MAX,
} from '../data/records-for.js';
import {
  SHARED_FACETS, facetControl, facetTreeControl, optionListControl,
  sharedFacetSection,
} from './sidebar-facets.js';
import { dokumenteSection } from './sidebar-status.js';
import { filterStrip } from './sidebar-strip.js';
import { rangeControl } from './sidebar-range.js';
import {
  legendControl, sliderControl, toggleControl, searchControl, staticLegendControl,
  customControl,
} from './sidebar-controls.js';

export { FACET_META, SHARED_FACETS, impliedByGroup, groupTip } from './sidebar-facets.js';
export { countLabel } from './sidebar-status.js';
export { coveredBand } from './sidebar-range.js';

// ---------------------------------------------------------------------------
// Geruest + Builder
// ---------------------------------------------------------------------------

export function viewShell(sidebarEl, mainEl) {
  // Under 900px container width the column folds behind this toggle; the
  // stylesheet hides the button above that width, so desktop pays nothing
  // (Projektleitung, 2026-09-04).
  const shell = el('div', { className: 'view-shell view-shell--sidebar-collapsed' });
  const toggle = el('button', {
    className: 'view-shell__sidebar-toggle', type: 'button',
    'aria-expanded': 'false', 'aria-label': 'Filter ein- oder ausblenden',
    onClick: () => {
      const collapsed = shell.classList.toggle('view-shell--sidebar-collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
    },
  });
  toggle.innerHTML = '<svg class="view-shell__sidebar-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>';
  toggle.appendChild(el('span', {}, 'Filter'));
  shell.append(toggle, sidebarEl, mainEl);
  return shell;
}

let titleSeq = 0;

/**
 * @param {Object} store
 * @param {Object} [opts]
 * @param {string[]} [opts.facets]     shared facet keys, in column order
 * @param {{min:number,max:number,covered?:{min:number,max:number,tip?:string}}}
 *   [opts.yearSpan]  the rail runs over the shared bounds in every view;
 *   `covered` marks the part of them the view's own data actually reaches
 * @param {() => ?number} [opts.getCount]  documents of the view's current cut;
 *   without it the scaffold resolves the shared filter itself
 * @param {boolean|{placeholder?: string}} [opts.search]  free-text field (a);
 *   `false` leaves it out, which is what a view without a text cut needs
 * @param {Array} [opts.sections]      view-specific sections (d)
 * @param {Array} [opts.legend]        view-specific legend sections (e)
 * @param {() => Array<{title:string, chips:Array<{label:string,onRemove:Function}>}>}
 *   [opts.localChips]            view-local narrowings for the strip (E-223)
 * @param {() => void} [opts.onChange] after every filter change, own or foreign
 * @returns {{element: HTMLElement, update: () => void, destroy: () => void}}
 */
export function createSidebar(store, {
  facets = SHARED_FACETS,
  yearSpan = { min: YEAR_MIN, max: YEAR_MAX },
  getCount = null,
  getScopeDescription = null,
  search = true,
  sections = [],
  legend = [],
  localChips = () => [],
  onChange = () => {},
} = {}) {
  const inventories = new Map();
  for (const key of facets) inventories.set(key, inventoryFor(store, key));

  // Dokumenttyp does not get a section of its own: its tree hangs under the
  // result line, which is the root row of the same tree.
  const facetSpecs = [
    dokumenteSection(store, inventories, getCount, facets.includes('docType'), getScopeDescription),
    ...facets.filter(key => key !== 'docType')
      .map(key => sharedFacetSection(store, key, inventories.get(key))),
  ];

  const specs = [
    search === false ? null : searchSection(search && search.placeholder),
    zeitSection(yearSpan),
    ...facetSpecs.map((spec, i) => withRule(spec, i === 0)),
    ...withLeadingRule(sections),
    ...withLeadingRule(legend),
  ];

  const built = buildColumn(specs);
  const strip = filterStrip(inventories, localChips);

  // A cut from another view must arrive here without the consumer thinking of
  // it; otherwise the column shows a state the shared filter no longer has.
  const unsubscribe = subscribe(() => onChange(), { immediate: false });

  return {
    element: built.element,
    strip: strip.element,
    update() { built.update(); strip.update(); },
    destroy: unsubscribe,
  };
}

/** The two tree facets bring their groups, every other facet its flat values. */
function inventoryFor(store, key) {
  if (key === 'docType') return docTypeGroups(store);
  if (key === 'verknuepfung') return linkGroups(store);
  return facetInventory(store, key);
}

/** The rule sits on the first real section of a block, so an empty block adds
 *  no line of its own. */
function withLeadingRule(specs) {
  const list = (specs || []).filter(Boolean);
  return list.map((spec, i) => withRule(spec, i === 0));
}

function withRule(spec, on) {
  return on && spec ? { ...spec, rule: true } : spec;
}

function buildColumn(specs) {
  const aside = el('aside', { className: 'view-sidebar', 'aria-label': 'Filter' });
  const updaters = [];

  for (const spec of specs) {
    if (!spec) continue;
    const sec = el('section', { className: 'vs-section' });
    if (spec.rule) sec.classList.add('vs-section--rule');
    if (spec.className) sec.classList.add(spec.className);
    // An open facet is one row: the title names the axis, the input is the whole
    // control. Stacking them cost a line per facet and the column ran long.
    if ((spec.controls || []).some(c => c && c.kind === 'facet')) {
      sec.classList.add('vs-section--inline');
    }

    const body = el('div', { className: 'vs-section__body' });
    let head = null;
    let labelEl = null;
    let collapsed = !!(spec.collapsed && spec.collapsed());

    if (spec.title != null) {
      labelEl = el('span', { className: 'vs-section__label' });
      // The family symbol of the Indizes and the Bestand rows (E-212), so the
      // legend is one symbol set across the application.
      const dot = spec.family
        ? familyIcon(spec.family, { size: 14, className: `fam-mark fam-mark--${spec.family}` })
        : null;
      const id = `vs-title-${++titleSeq}`;
      if (spec.collapsible) {
        head = el('button', {
          className: 'vs-section__title vs-section__title--toggle', type: 'button', id,
          onClick: () => { collapsed = !collapsed; paintHead(); },
        }, dot, labelEl, el('span', { className: 'vs-section__chevron', 'aria-hidden': 'true' }, '›'));
      } else {
        head = el('h2', { className: 'vs-section__title', id }, dot, labelEl);
      }
      spec.titleId = id;
      sec.appendChild(head);
      if (spec.tip) {
        // The head carries what the dot and the numbers of its rows mean. It
        // sits there and not on the rows themselves, because the suggestion
        // list is an overflow container that would clip a tooltip, and a
        // second tooltip inside a row that already has one would stack (E-90).
        // bottom-left, not centred: the head sits at the left edge of the
        // window, where a centred tooltip runs out of the viewport.
        Object.assign(head.dataset, { tipWrap: '', tipPos: 'bottom-left' });
      }
    }
    sec.appendChild(body);

    function paintHead() {
      if (!head) return;
      const title = typeof spec.title === 'function' ? spec.title() : spec.title;
      labelEl.textContent = title == null ? '' : String(title);
      head.classList.toggle('vs-section__title--active',
        !!(spec.titleActive && spec.titleActive()));
      if (spec.tip) {
        head.dataset.tip = spec.tip();
        // Without a name of its own the heading takes the generated tooltip
        // content into its accessible name, so it read as label plus whole
        // explanation (Projektleitung, 2026-09-04).
        head.setAttribute('aria-label', labelEl.textContent);
      }
      if (spec.collapsible) {
        head.classList.toggle('vs-section__title--collapsed', collapsed);
        head.setAttribute('aria-expanded', String(!collapsed));
        body.hidden = collapsed;
      }
    }

    for (const control of spec.controls || []) {
      if (!control) continue;
      const make = FACTORIES[control.kind];
      if (!make) continue;
      const { node, update } = make({ ...control, labelledBy: spec.titleId });
      if (node) body.appendChild(node);
      if (update) updaters.push(update);
    }

    paintHead();
    updaters.push(() => {
      paintHead();
      if (spec.hidden) sec.hidden = spec.hidden();
    });
    if (spec.hidden) sec.hidden = spec.hidden();

    aside.appendChild(sec);
  }

  return { element: aside, update() { for (const u of updaters) u(); } };
}

// ---------------------------------------------------------------------------
// (a) Suche, (b) Zeitraum
// ---------------------------------------------------------------------------

/** The free text sits above everything and carries no title; the placeholder
 *  names the fields the view actually searches (design.md Regel 8). */
function searchSection(placeholder) {
  return {
    className: 'vs-section--search',
    controls: [{
      kind: 'search',
      ariaLabel: 'Suche',
      // Every keystroke resolves the whole cut and recounts every facet, so the
      // input bundles them (Projektleitung, 2026-09-04).
      debounce: 120,
      placeholder: placeholder || '',
      value: () => getFilter().search || '',
      onChange: (v) => setFilter({ search: v }),
    }],
  };
}

function zeitSection(span) {
  const windowOf = () => {
    const zf = getFilter().zeitfenster;
    if (!Array.isArray(zf)) return [span.min, span.max];
    return [Math.max(span.min, zf[0] ?? span.min), Math.min(span.max, zf[1] ?? span.max)];
  };
  return {
    title: 'Zeitraum',
    titleActive: () => Array.isArray(getFilter().zeitfenster),
    controls: [{
      kind: 'range', min: span.min, max: span.max, covered: span.covered || null,
      from: () => windowOf()[0],
      to: () => windowOf()[1],
      onChange: (from, to) => {
        const full = from <= span.min && to >= span.max;
        setFilter({ zeitfenster: full ? null : [from, to] });
      },
    }],
  };
}

const FACTORIES = {
  facet: facetControl,
  facetTree: facetTreeControl,
  optionList: optionListControl,
  legend: legendControl,
  range: rangeControl,
  slider: sliderControl,
  toggle: toggleControl,
  search: searchControl,
  staticLegend: staticLegendControl,
  custom: customControl,
};
