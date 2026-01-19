/**
 * M3GIM Visualization Main Entry Point
 * Coordinates loading and rendering of all visualizations
 */

import { renderMatrix } from './visualizations/matrix.js';
import { renderKosmos } from './visualizations/kosmos.js';
import { renderSankey } from './visualizations/sankey.js';
import { renderPartitur } from './visualizations/partitur.js';

// Make visualization functions globally available
window.M3GIM_VIZ = {
  renderMatrix,
  renderKosmos,
  renderSankey,
  renderPartitur
};

console.log('M3GIM Visualization modules loaded');
