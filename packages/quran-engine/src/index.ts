/**
 * @digitalkhatt/quran-engine
 *
 * Framework-agnostic Quran rendering engine with HarfBuzz, VisualMetaFont,
 * and precomputed layout support. Provides high-quality Arabic typography
 * for Quran text rendering.
 *
 * @example
 * ```typescript
 * import { createQuranEngine } from '@digitalkhatt/quran-engine';
 *
 * // Using HarfBuzz renderer
 * const engine = await createQuranEngine({
 *   renderer: 'harfbuzz',
 *   layoutType: 'newMadinah',
 *   assets: {
 *     harfbuzzWasm: '/wasm/hb.wasm',
 *     fonts: { newMadinah: '/fonts/newmadinah.otf' },
 *     quranText: quranTextData,
 *   },
 * });
 *
 * // Using Precomputed renderer
 * const precomputed = await createQuranEngine({
 *   renderer: 'precomputed',
 *   layoutType: 'newMadinah',
 *   assets: {
 *     layoutData: '/layouts/madina.json',
 *   },
 * });
 *
 * const canvas = document.getElementById('quran-canvas');
 * await engine.renderPage(canvas, 0, { width: 800, height: 1200, fontSize: 40 });
 * ```
 */

// Core exports
export * from './core';

// Canvas utilities
export * from './canvas';

// Renderers
export * from './renderers';

// VisualMetaFont module (selective exports to avoid conflicts)
export {
  QuranShaper,
  InternalRenderTask,
  printPage,
  loadVisualMetaFontWasm,
  createRenderToken,
} from './visualmetafont';
export type {
  StatusCallback,
  VMFLoadResult,
  EmscriptenModule,
  EmscriptenFS,
  VMFQuranShaperNative,
  RenderToken,
  VisualMetaFontModuleFactory,
} from './visualmetafont';

// Precomputed module (selective exports to avoid conflicts)
export {
  LayoutService,
  LINE_WIDTH,
  renderPrecomputedPage,
  createPrecomputedCanvasRenderer,
  baseForce,
  markbaseforce,
  constant,
} from './precomputed';
export type { BaseForce, MarkBaseForce } from './precomputed';

// SVG rendering module
export {
  SVGLineRenderer,
  SVGPageRenderer,
  renderLineToSVG,
  SpaceType,
  convertArabicToEnglishNumber,
  getAyaDigitCountForMushaf,
  getAyaPositioningForMushaf,
} from './svg';
export type {
  SVGLineRenderResult,
  SVGRenderOptions,
  SajdaRenderInfo,
  VerseNumberFormat,
  LineRenderConfig,
  SVGPageRenderOptions,
  SVGPageRendererConfig,
  LineRenderResult,
  PageRenderResult,
  SVGWordClickInfo,
  SVGHighlightGroup,
} from './svg';

// CSS rendering module
export { CSSPageRenderer } from './css';
export type {
  CSSPageRenderOptions,
  CSSPageRendererConfig,
  CSSPageRenderResult,
  CSSWordClickInfo,
  CSSHighlightGroup,
} from './css';

// Configuration and factory
export { createQuranEngine } from './config';
export type { QuranEngineConfig } from './config';
