/**
 * @digitalkhatt/quran-engine - VisualMetaFont Module
 *
 * VisualMetaFont WASM-based rendering for Quran text
 */

// Core classes
export { QuranShaper } from './QuranShaper';
export { InternalRenderTask, printPage } from './RenderTask';

// WASM loader
export {
  loadVisualMetaFontWasm,
  createRenderToken,
  type StatusCallback,
  type VMFLoadResult,
} from './wasm-loader';

// Types
export type {
  EmscriptenModule,
  EmscriptenFS,
  VMFQuranShaperNative,
  VMFPageResultNative,
  VMFLineNative,
  VMFGlyphNative,
  VMFOriginalLineNative,
  RenderToken,
  VisualMetaFontRendererConfig,
  VisualMetaFontModuleFactory,
} from './types';
