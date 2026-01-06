/**
 * @digitalkhatt/quran-engine - Precomputed Module
 *
 * Precomputed layout-based rendering for Quran text
 */

// Core classes
export {
  LayoutService,
  PAGE_WIDTH,
  MARGIN,
  LINE_WIDTH,
  INTERLINE,
} from './LayoutService';

// Canvas renderer
export {
  renderPrecomputedPage,
  createPrecomputedCanvasRenderer,
} from './PrecomputedCanvasRenderer';

// Force simulation
export {
  baseForce,
  markbaseforce,
  constant,
  type BaseForce,
  type MarkBaseForce,
} from './force';
