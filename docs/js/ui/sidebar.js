/** Shared filter column and search/strip host for all research views. */

import { el } from '../utils/dom.js';
import { familyIcon } from './family-icons.js';
import { getFilter, setFilter, subscribe, buildFacetSelectionPatch } from './filter-state.js';
import { createSearch } from './search.js';
import {
  facetInventory, docTypeGroups, linkGroups,
} from '../data/records-for.js';
import {
  SHARED_FACETS, facetTreeControl, optionListControl,
  sharedFacetSection,
} from './sidebar-facets.js';
import { dokumenteSection } from './sidebar-status.js';
import { filterStrip } from './sidebar-strip.js';
import { rangeControl } from './sidebar-range.js';
import {
  legendControl, sliderControl, toggleControl, staticLegendControl,
  customControl,
} from './sidebar-controls.js';

export { FACET_META, SHARED_FACETS, impliedByGroup, groupTip } from './sidebar-facets.js';
export { countLabel } from './sidebar-status.js';
export { coveredBand } from './sidebar-range.js';

// ---------------------------------------------------------------------------
// Geruest + Builder
// ---------------------------------------------------------------------------

const sidebarHosts = new WeakMap();

export function viewShell(sidebarEl, mainEl) {
  // Keep the same toggle reachable at every width; smaller hosts start folded.
  const collapsedAtStart = !window.matchMedia('(min-width: 1200px)').matches;
  const shell = el('div', { className: `view-shell${collapsedAtStart ? ' view-shell--sidebar-collapsed' : ''}` });
  const toggle = el('button', {
    className: 'view-shell__sidebar-toggle', type: 'button',
    'aria-expanded': String(!collapsedAtStart), 'aria-label': 'Filter ein- oder ausblenden',
    onClick: () => {
      const collapsed = shell.classList.toggle('view-shell--sidebar-collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
    },
  });
  toggle.innerHTML = '<svg class="view-shell__sidebar-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>';
  toggle.appendChild(el('span', {}, 'Filter'));
  const toolbar = sidebarHosts.get(sidebarEl);
  if (toolbar) { toolbar.prepend(toggle); mainEl.prepend(toolbar); }
  else mainEl.prepend(toggle);
  shell.append(sidebarEl, mainEl);
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
  yearSpan = { min: null, max: null },
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
    Number.isFinite(yearSpan.min) && Number.isFinite(yearSpan.max) ? zeitSection(yearSpan) : null,
    ...facetSpecs.map((spec, i) => withRule(spec, i === 0)),
    ...withLeadingRule(sections),
    ...withLeadingRule(legend),
  ];

  const built = buildColumn(specs.filter(Boolean));
  const strip = filterStrip(inventories, localChips);
  const commonSearch = search === false ? null : createSearch(store, {
    selectFacet: (key, values) => setFilter(buildFacetSelectionPatch(getFilter(), key, values)),
  });
  const toolbar = el('div', { className: 'research-toolbar' }, commonSearch?.element, strip.element);
  sidebarHosts.set(built.element, toolbar);

  // A cut from another view must arrive here without the consumer thinking of
  // it; otherwise the column shows a state the shared filter no longer has.
  const unsubscribe = subscribe(() => onChange(), { immediate: false });

  return {
    element: built.element,
    strip: strip.element,
    update() { built.update(); strip.update(); commonSearch?.update(); },
    destroy() { unsubscribe(); commonSearch?.destroy(); built.destroy(); sidebarHosts.delete(built.element); },
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
  const destroyers = [];

  for (const spec of specs) {
    if (!spec) continue;
    const sec = el('section', { className: 'vs-section' });
    if (spec.rule) sec.classList.add('vs-section--rule');
    if (spec.className) sec.classList.add(spec.className);

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
      const { node, update, destroy } = make({ ...control, labelledBy: spec.titleId });
      if (node) body.appendChild(node);
      if (update) updaters.push(update);
      if (destroy) destroyers.push(destroy);
    }

    paintHead();
    updaters.push(() => {
      paintHead();
      if (spec.hidden) sec.hidden = spec.hidden();
    });
    if (spec.hidden) sec.hidden = spec.hidden();

    aside.appendChild(sec);
  }

  return { element: aside, update() { for (const u of updaters) u(); },
    destroy() { for (const destroy of destroyers) destroy(); } };
}

// ---------------------------------------------------------------------------
// (a) Suche, (b) Zeitraum
// ---------------------------------------------------------------------------

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
  facetTree: facetTreeControl,
  optionList: optionListControl,
  legend: legendControl,
  range: rangeControl,
  slider: sliderControl,
  toggle: toggleControl,
  staticLegend: staticLegendControl,
  custom: customControl,
};
