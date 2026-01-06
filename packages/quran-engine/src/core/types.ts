/**
 * @digitalkhatt/quran-engine - Core Type Definitions
 *
 * Framework-agnostic types for Quran text rendering
 */

// ============================================
// Mushaf Layout Types
// ============================================

export const MushafLayoutType = {
  NewMadinah: 1,
  OldMadinah: 2,
  IndoPak15Lines: 3,
} as const;

export type MushafLayoutType = (typeof MushafLayoutType)[keyof typeof MushafLayoutType];

export type MushafLayoutTypeString = 'newMadinah' | 'oldMadinah' | 'indoPak15';

export const LAYOUT_TYPE_MAP: Record<MushafLayoutTypeString, MushafLayoutType> = {
  newMadinah: MushafLayoutType.NewMadinah,
  oldMadinah: MushafLayoutType.OldMadinah,
  indoPak15: MushafLayoutType.IndoPak15Lines,
};

// ============================================
// Line Types
// ============================================

export const LineType = {
  Content: 0,
  Sura: 1,
  Basmala: 2,
} as const;

export type LineType = (typeof LineType)[keyof typeof LineType];

export const SpaceType = {
  Simple: 1,
  Aya: 2,
} as const;

export type SpaceType = (typeof SpaceType)[keyof typeof SpaceType];

// ============================================
// HarfBuzz Types
// ============================================

export interface HBFeature {
  tag: string;
  value: number;
  start: number;
  end: number;
}

export interface GlyphInformation {
  GlyphId: number;
  Cluster: number;
  XAdvance: number;
  YAdvance: number;
  XOffset: number;
  YOffset: number;
}

export type HarfBuzzDirection = 'ltr' | 'rtl' | 'ttb' | 'btt';

// ============================================
// Justification Types
// ============================================

export interface SubWordInfo {
  baseIndexes: number[];
  baseText: string;
}

export interface WordInfo {
  startIndex: number;
  endIndex: number;
  text: string;
  baseText: string;
  baseIndexes: number[];
  subwords: SubWordInfo[];
}

export interface LineTextInfo {
  lineText: string;
  ayaSpaceIndexes: number[];
  simpleSpaceIndexes: number[];
  spaces: Map<number, SpaceType>;
  wordInfos: WordInfo[];
  features: HBFeature[];
}

export interface TextFontFeature {
  name: string;
  value: number;
}

export interface JustResultByLine {
  globalFeatures?: TextFontFeature[];
  fontFeatures: Map<number, TextFontFeature[]>;
  simpleSpacing: number;
  ayaSpacing: number;
  xScale: number;
}

export const JustStyle = {
  SameSizeByPage: 0,
  XScale: 1,
  XScaleOnly: 2,
  SCLXAxis: 3,
} as const;

export type JustStyle = (typeof JustStyle)[keyof typeof JustStyle];

// ============================================
// Line Info Types
// ============================================

export interface SajdaInfo {
  startWordIndex: number;
  endWordIndex: number;
}

export interface LineInfo {
  lineType: LineType;
  lineWidthRatio: number;
  sajda?: SajdaInfo;
}

// ============================================
// Page Layout Constants
// ============================================

export const PAGE_WIDTH = 17000;
export const INTERLINE = 1800;
export const TOP = 200;
export const MARGIN = 400;
export const FONTSIZE = 1000;

// ============================================
// Quran Text Service Types
// ============================================

export interface QuranOutlineItem {
  name: string;
  page: number;
}

export interface QuranTextData {
  quranText: string[][];
  outline: QuranOutlineItem[];
  lineInfos: Map<number, Map<number, LineInfo>>;
  lineWidthRatios: Map<number, number>;
}

// ============================================
// Rendering Types
// ============================================

export interface VerseRef {
  surah: number;
  ayah: number;
}

export interface WordRef {
  pageNumber: number;
  lineIndex: number;
  wordIndex: number;
}

export interface WordClickInfo {
  pageNumber: number;
  lineIndex: number;
  wordIndex: number;
  text: string;
  surah?: number;
  ayah?: number;
}

export interface VerseClickInfo {
  surah: number;
  ayah: number;
  pageNumber: number;
}

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

export interface TajweedColorMap {
  tafkim?: string;
  kalkala?: string;
  gray?: string;
  green?: string;
  red1?: string;
  red2?: string;
  red3?: string;
  red4?: string;
}

// ============================================
// Canvas Rendering Types
// ============================================

export interface WordRect {
  lineIndex: number;
  wordIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  surah?: number;
  ayah?: number;
}

export interface LineRect {
  lineIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageFormat {
  width: number;
  height: number;
  fontSize: number;
}

export interface RenderResult {
  wordRects: WordRect[];
  lineRects: LineRect[];
}

// ============================================
// Engine Status Types
// ============================================

export type LoadingStatus = 'idle' | 'loading' | 'ready' | 'error';

// ============================================
// Renderer Types
// ============================================

export type RendererType = 'harfbuzz' | 'visualMetafont' | 'precomputed';

// ============================================
// VisualMetaFont Types
// ============================================

/**
 * Assets required by the VisualMetaFont WASM module
 */
export interface VisualMetaFontAssets {
  mfplain: string;      // Path to mfplain.mp
  ayah: string;         // Path to ayah.mp
  mpguifont: string;    // Path to mpguifont.mp
  myfontbase: string;   // Path to myfontbase.mp
  digitalkhatt: string; // Path to digitalkhatt.mp
  parameters: string;   // Path to parameters.json
  automedina: string;   // Path to automedina.fea
  texpages: string;     // Path to texpages.dat
  medinapages: string;  // Path to medinapages.dat
}

/**
 * Glyph information from VisualMetaFont shaper
 */
export interface VMFGlyph {
  codepoint: number;
  cluster: number;
  x_advance: number;
  x_offset: number;
  y_offset: number;
  lefttatweel: number;
  righttatweel: number;
  color?: number;
  beginsajda?: boolean;
  endsajda?: boolean;
}

/**
 * Line information from VisualMetaFont shaper
 */
export interface VMFLine {
  type: { value: 0 | 1 | 2 }; // 0=Content, 1=Sura, 2=Bism
  xstartposition: number;
  glyphs: VMFGlyphCollection;
  fontSize: number;
}

export interface VMFGlyphCollection {
  size(): number;
  get(index: number): VMFGlyph;
  delete(): void;
}

export interface VMFOriginalLine {
  unicode(cluster: number): number;
  size(): number;
  toStdString(): string;
  get(index: number): number;
  delete(): void;
}

export interface VMFPageResult {
  page: { value(index: number): VMFLine; delete(): void };
  originalPage: { get(index: number): VMFOriginalLine; delete(): void };
  delete(): void;
}

// ============================================
// Precomputed Layout Types
// ============================================

/**
 * A single Bézier path segment - either MoveTo [x,y] or CurveTo [cp1x,cp1y,cp2x,cp2y,x,y]
 */
export type PathSegment = [number, number] | [number, number, number, number, number, number];

/**
 * A path consisting of multiple segments with optional color
 */
export interface GlyphPath {
  path: PathSegment[];
  color?: [number, number, number];
}

/**
 * Glyph data including Bézier paths and tatweel variants
 */
export interface GlyphPathData {
  name?: string;
  bbox?: [number, number, number, number];
  default: GlyphPath[];
  minLeft?: GlyphPath[];
  maxLeft?: GlyphPath[];
  minRight?: GlyphPath[];
  maxRight?: GlyphPath[];
  limits?: [number, number, number, number]; // [minLeft, maxLeft, minRight, maxRight]
  classes?: Record<string, boolean>;
}

/**
 * Glyph info in a precomputed line
 */
export interface PrecomputedGlyphInfo {
  codepoint: number;
  x_advance?: number;
  x_offset?: number;
  y_offset?: number;
  lefttatweel?: number;
  righttatweel?: number;
}

/**
 * Line layout in precomputed data
 */
export interface PrecomputedLineLayout {
  x: number;
  xscale?: number;
  glyphs: PrecomputedGlyphInfo[];
}

/**
 * Page layout in precomputed data
 */
export interface PrecomputedPageLayout {
  lines: PrecomputedLineLayout[];
}

/**
 * Character classification data
 */
export interface PrecomputedClasses {
  bases?: number[];
  marks?: number[];
  joinedmarks?: number[];
  kalkalamarks?: number[];
  topmarks?: number[];
  lowmarks?: number[];
  downdotmarks?: number[];
  topdotmarks?: number[];
  haslefttatweel?: number[];
  hasshrink?: number[];
  digits?: number[];
  [key: string]: number[] | undefined;
}

/**
 * Complete precomputed layout data structure
 */
export interface PrecomputedLayoutData {
  glyphs: Record<number, GlyphPathData>;
  pages: PrecomputedPageLayout[];
  classes: PrecomputedClasses;
}

/**
 * Node used in D3 force simulation
 */
export interface ForceNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  posX: number;
  posY: number;
  isMark?: boolean;
  baseNode?: ForceNode;
  x_offset?: number;
  y_offset?: number;
}

/**
 * Options for the D3 force simulation
 */
export interface ForceSimulationOptions {
  iterations?: number;
  alphaDecay?: number;
}
