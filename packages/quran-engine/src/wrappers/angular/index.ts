/**
 * @digitalkhatt/quran-engine/angular
 *
 * Angular bindings for the Quran rendering engine.
 */

export { QuranEngineService, QuranEngineServiceBase } from './quran-engine.service';
export type {
  StatusObserver,
  SVGPageRendererConfig,
  CSSPageRendererConfig,
  QuranViewerConfig,
  PageViewerConfig,
} from './quran-engine.service';

// Re-export commonly used types from core for convenience
export type {
  PageFormat,
  MushafLayoutType,
  LoadingStatus,
  QuranOutlineItem,
  JustStyle,
} from '../../core/types';

export type { VerseNumberFormat } from '../../svg/SVGLineRenderer';
export type { PageViewerRenderOptions } from '../../core/PageViewer';
export type { VisiblePages, ScrollState } from '../../core/QuranViewer';
export { RenderingStates, PageViewBuffer, DEFAULT_CACHE_SIZE } from '../../core/rendering-states';
export { SVGPageRenderer } from '../../svg/SVGPageRenderer';
export { CSSPageRenderer } from '../../css/CSSPageRenderer';
export { PageViewer } from '../../core/PageViewer';
export { QuranViewer } from '../../core/QuranViewer';
