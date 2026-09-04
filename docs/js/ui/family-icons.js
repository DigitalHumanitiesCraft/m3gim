/**
 * One icon per content family (Person, Institution, Ort, Werk), shared by the
 * Indizes grid heads and the Erschliessungsanzeige of the Bestand rows, so both
 * views name a family with the same symbol instead of two codes side by side
 * (Projektleitung, 2026-09-04).
 *
 * The icons are line icons: they carry their family colour through
 * `currentColor` on the stroke, and evidence versus absence is a matter of
 * stroke weight and colour, both set in CSS.
 */

const PATHS = Object.freeze({
  person: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  institution: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
  ort: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  werk: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
});

/**
 * SVG markup of a family icon, for the places that build their content as an
 * HTML string.
 * @param {'person'|'institution'|'ort'|'werk'} family
 * @param {number} [size]
 * @returns {string} empty for an unknown family
 */
export function familyIconSvg(family, size = 16) {
  const paths = PATHS[family];
  if (!paths) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"`
    + ` stroke="currentColor" stroke-width="2" aria-hidden="true">${paths}</svg>`;
}

/**
 * The family icon as an SVG element. Always `aria-hidden`; the meaning is
 * carried by the tooltip and the `aria-label` of the surrounding cell.
 * @param {'person'|'institution'|'ort'|'werk'} family
 * @param {{size?: number, className?: string}} [opts]
 * @returns {?SVGElement}
 */
export function familyIcon(family, opts = {}) {
  const markup = familyIconSvg(family, opts.size ?? 16);
  if (!markup) return null;
  const holder = document.createElement('div');
  holder.innerHTML = markup;
  const svg = holder.firstElementChild;
  if (opts.className) svg.setAttribute('class', opts.className);
  return svg;
}
