/**
 * @digitalkhatt/quran-engine - SVG Rendering Module
 *
 * Provides SVG-based rendering for Quran text using HarfBuzz shaping.
 * This module is useful for DOM-based rendering in Angular/React apps.
 */

export {
  SVGLineRenderer,
  SpaceType,
  convertArabicToEnglishNumber,
  getAyaDigitCountForMushaf,
  getAyaPositioningForMushaf,
  type SVGLineRenderResult,
  type SVGRenderOptions,
  type SajdaRenderInfo,
  type VerseNumberFormat,
  type LineBounds,
} from './SVGLineRenderer';
export { renderLineToSVG, type LineRenderConfig } from './renderLine';
export {
  SVGPageRenderer,
  type SVGPageRenderOptions,
  type SVGPageRendererConfig,
  type LineRenderResult,
  type PageRenderResult,
  type SVGWordClickInfo,
  type SVGHighlightGroup,
} from './SVGPageRenderer';
