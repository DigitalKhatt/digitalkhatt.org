/**
 * DigitalKhatt React - Local Type Definitions
 *
 * Types specific to React components that extend or complement quran-engine types.
 * Most core types are re-exported from @digitalkhatt/quran-engine.
 */

// Re-export commonly used types from quran-engine for convenience
export type {
  MushafLayoutType,
  MushafLayoutTypeString,
  LineType,
  SpaceType,
  HBFeature,
  GlyphInformation,
  HarfBuzzDirection,
  SubWordInfo,
  WordInfo,
  LineTextInfo,
  TextFontFeature,
  JustResultByLine,
  JustStyle,
  SajdaInfo,
  LineInfo,
  QuranOutlineItem,
  QuranTextData,
  VerseRef,
  WordRef,
  WordRect,
  LineRect,
  PageFormat,
  RenderResult,
  TajweedClass,
  TajweedColorConfig,
} from '@digitalkhatt/quran-engine';

// Re-export constants from quran-engine
export {
  PAGE_WIDTH,
  INTERLINE,
  TOP,
  MARGIN,
  FONTSIZE,
  MushafLayoutTypeEnum,
  LineTypeEnum,
  SpaceTypeEnum,
  JustStyleEnum,
  LAYOUT_TYPE_MAP,
  DEFAULT_TAJWEED_COLORS,
  mergeTajweedColors,
  generateTajweedCSS,
  generateTajweedCSSVariables,
  generateTajweedCSSWithVariables,
} from '@digitalkhatt/quran-engine';


// ============================================
// React Component Types
// ============================================

/**
 * Information passed when a word is clicked
 */
export interface WordClickInfo {
  pageNumber: number;
  lineIndex: number;
  wordIndex: number;
  text: string;
  surah?: number;
  ayah?: number;
}

/**
 * Information passed when a verse is clicked
 */
export interface VerseClickInfo {
  surah: number;
  ayah: number;
  pageNumber: number;
}

/**
 * Style configuration for highlights
 */
export interface HighlightStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
}

/**
 * A group of highlights with a specific color
 * Can specify either verses (surah/ayah) or individual words
 */
export interface HighlightGroup {
  /** Verses to highlight (all words in these verses will be highlighted) */
  verses?: Array<{ surah: number; ayah: number }>;
  /** Individual words to highlight (page is 0-indexed) */
  words?: Array<{ page: number; line: number; word: number }>;
  /** Highlight background color */
  color: string;
}

/**
 * Loading status for the QuranProvider
 */
export type LoadingStatus = 'idle' | 'loading' | 'ready' | 'error';
