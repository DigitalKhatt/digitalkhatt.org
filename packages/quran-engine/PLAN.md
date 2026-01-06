# Plan: Configurable Mushaf Layout System for quran-engine

## Overview

Make `@digitalkhatt/quran-engine` fully configurable to replicate any Quran mushaf style.

---

## Phase 1: Core Configuration Infrastructure

### 1.1 Create MushafConfig Interface

**New File**: `packages/quran-engine/src/config/mushaf-config.ts`

```typescript
/**
 * @digitalkhatt/quran-engine - Mushaf Configuration Types
 *
 * Complete configuration system for customizing mushaf appearance
 */

// ============================================
// Main Configuration Interface
// ============================================

/**
 * Complete mushaf configuration for replicating any Quran style
 */
export interface MushafConfig {
  /** Unique identifier for this mushaf style */
  id: string;

  /** Human-readable name */
  name: string;

  /** Layout geometry configuration */
  layout: MushafLayoutConfig;

  /** Border and frame configuration */
  border: MushafBorderConfig;

  /** Verse marker configuration */
  verseMarker: VerseMarkerConfig;

  /** Surah header configuration */
  surahHeader: SurahHeaderConfig;

  /** Tajweed color configuration */
  tajweed: TajweedConfig;

  /** Margin annotations configuration */
  margins: MarginAnnotationConfig;

  /** Word-by-word mode configuration (optional) */
  wordByWord?: WordByWordConfig;

  /** Page spread configuration */
  spread: PageSpreadConfig;

  /** Typography configuration */
  typography: TypographyConfig;
}

// ============================================
// Layout Configuration
// ============================================

export interface MushafLayoutConfig {
  /** Lines per page (most mushafs use 15, but some use 12, 13, or 18) */
  linesPerPage: number;

  /** Page dimensions in internal units */
  pageWidth: number;
  pageHeight: number;

  /** Margins in internal units */
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    /** Inner margin for book binding (gutter) */
    gutter?: number;
  };

  /** Line spacing in internal units */
  interlineSpacing: number;

  /** Default font size in internal units */
  fontSize: number;

  /** Justification style */
  justificationStyle: 'stretch' | 'xscale' | 'kashida' | 'mixed';
}

// ============================================
// Border Configuration
// ============================================

export interface MushafBorderConfig {
  /** Enable border rendering */
  enabled: boolean;

  /** SVG template for the border frame */
  template?: SVGBorderTemplate;

  /** Different borders for odd/even pages (for book spreads) */
  oddPageTemplate?: SVGBorderTemplate;
  evenPageTemplate?: SVGBorderTemplate;

  /** Inner frame around text content area */
  innerFrame?: SVGFrameConfig;

  /** Corner decorations */
  corners?: CornerDecorationConfig;

  /** CSS fallback styles if no SVG template */
  cssStyles?: BorderCSSStyles;
}

export interface SVGBorderTemplate {
  /** SVG content as string or URL to fetch */
  svg: string | URL;

  /** Named slots within the SVG where content can be inserted */
  slots: {
    /** Header slot for surah name, juz info, etc. */
    header?: SlotDefinition;
    /** Footer slot for page number, etc. */
    footer?: SlotDefinition;
    /** Left margin slot for annotations */
    leftMargin?: SlotDefinition;
    /** Right margin slot for annotations */
    rightMargin?: SlotDefinition;
    /** Main content area - REQUIRED */
    content: SlotDefinition;
  };

  /** ViewBox dimensions */
  viewBox: { width: number; height: number };
}

export interface SlotDefinition {
  /** CSS selector or element ID to find the slot */
  selector: string;
  /** Expected content type */
  type: 'text' | 'svg' | 'html';
  /** Default styles for slot content */
  styles?: Record<string, string>;
}

export interface SVGFrameConfig {
  /** SVG path for inner frame */
  path?: string;
  /** Stroke color */
  strokeColor?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Fill color */
  fillColor?: string;
}

export interface CornerDecorationConfig {
  topLeft?: string | URL;
  topRight?: string | URL;
  bottomLeft?: string | URL;
  bottomRight?: string | URL;
  /** Size of corner decorations */
  size?: { width: number; height: number };
}

export interface BorderCSSStyles {
  borderColor?: string;
  borderWidth?: string;
  borderStyle?: string;
  borderRadius?: string;
  boxShadow?: string;
}

// ============================================
// Verse Marker Configuration
// ============================================

export interface VerseMarkerConfig {
  /** Style of verse marker */
  style: 'ornate-frame' | 'simple-circle' | 'colored-circle' | 'inline-number' | 'custom';

  /** SVG template for custom verse marker */
  customSvg?: string | URL;

  /** Number format */
  numberFormat: 'arabic-indic' | 'western' | 'both';

  /** Font for verse numbers */
  font?: {
    family: string;
    size: number;
    weight?: string;
    color?: string;
  };

  /** Positioning within the marker */
  numberPosition?: {
    x: number;
    y: number;
    anchor: 'middle' | 'start' | 'end';
  };

  /** Size of the marker in internal units */
  size: { width: number; height: number };

  /** Colors */
  colors?: {
    frame?: string;
    background?: string;
    number?: string;
  };
}

// ============================================
// Surah Header Configuration
// ============================================

export interface SurahHeaderConfig {
  /** SVG template for surah header decoration */
  template?: string | URL;

  /** Display options */
  display: {
    surahName: boolean;
    surahNumber: boolean;
    revelationType: boolean;
    verseCount: boolean;
    bismillah: 'inline' | 'separate-line' | 'hidden';
  };

  /** Font configuration */
  font?: {
    family: string;
    size: number;
    color?: string;
  };

  /** Height in internal units */
  height: number;

  /** Background style */
  background?: {
    color?: string;
    image?: string | URL;
    repeat?: 'no-repeat' | 'repeat-x';
  };
}

// ============================================
// Tajweed Configuration
// ============================================

export interface TajweedConfig {
  /** Enable tajweed coloring */
  enabled: boolean;

  /** Color palette */
  colors: TajweedColorPalette;

  /** Individual rule toggles */
  rules: TajweedRuleToggles;

  /** School of recitation (affects which rules apply) */
  qiraat?: 'hafs' | 'warsh' | 'qalun' | string;
}

export interface TajweedColorPalette {
  tafkim: string;
  lkalkala: string;
  lgray: string;
  green: string;
  red1: string;
  red2: string;
  red3: string;
  red4: string;
  // Extended colors
  ghunnah?: string;
  idghamBighunnah?: string;
  idghamBillaghunnah?: string;
  ikhfa?: string;
  iqlab?: string;
  madd2?: string;
  madd4?: string;
  madd6?: string;
}

export interface TajweedRuleToggles {
  tafkhim: boolean;
  qalqalah: boolean;
  ghunnah: boolean;
  idgham: boolean;
  ikhfa: boolean;
  iqlab: boolean;
  madd: boolean;
}

// ============================================
// Margin Annotation Configuration
// ============================================

export interface MarginAnnotationConfig {
  /** Enable margin annotations */
  enabled: boolean;

  /** Juz (part) markers */
  juz?: JuzMarkerConfig;

  /** Hizb (60 divisions) markers */
  hizb?: HizbMarkerConfig;

  /** Ruku/Rakaat markers (IndoPak style) */
  ruku?: RukuMarkerConfig;

  /** Manzil (7 divisions) markers */
  manzil?: ManzilMarkerConfig;

  /** Sajdah (prostration) markers */
  sajdah?: SajdahMarkerConfig;
}

export interface JuzMarkerConfig {
  enabled: boolean;
  position: 'left' | 'right' | 'header';
  svg?: string | URL;
  font?: FontConfig;
  displayFormat: 'number' | 'name' | 'both';
}

export interface HizbMarkerConfig {
  enabled: boolean;
  position: 'left' | 'right' | 'header';
  svg?: string | URL;
  showQuarters: boolean;
}

export interface RukuMarkerConfig {
  enabled: boolean;
  position: 'left' | 'right';
  svg?: string | URL;
  font?: FontConfig;
}

export interface ManzilMarkerConfig {
  enabled: boolean;
  position: 'left' | 'right' | 'header';
  svg?: string | URL;
}

export interface SajdahMarkerConfig {
  enabled: boolean;
  style: 'underline' | 'symbol' | 'both';
  svg?: string | URL;
  color?: string;
}

// ============================================
// Word-by-Word Configuration
// ============================================

export interface WordByWordConfig {
  /** Enable word-by-word mode */
  enabled: boolean;

  /** Translation languages to display */
  translations: WordTranslationConfig[];

  /** Layout options */
  layout: WordByWordLayoutConfig;

  /** Arabic text styling */
  arabic: WordTextStyle;

  /** Transliteration styling */
  transliteration?: TransliterationConfig;
}

export interface WordTranslationConfig {
  /** Language code (e.g., 'en', 'ur', 'id') */
  language: string;
  /** Display name */
  displayName?: string;
  /** Translation data source (URL or inline) */
  data: WordTranslationData | string;
  /** Display styling */
  style: WordTextStyle;
}

export interface WordTranslationData {
  /** Map from "surah:ayah:wordIndex" to translation text */
  translations: Record<string, string>;
  /** Optional transliterations */
  transliterations?: Record<string, string>;
}

export interface WordByWordLayoutConfig {
  /** How to arrange word components */
  arrangement: 'vertical' | 'horizontal';
  /** Spacing between word stacks */
  wordSpacing: number;
  /** Spacing between components (Arabic, transliteration, translation) */
  componentSpacing: number;
  /** Words per row */
  wordsPerRow?: number;
  /** Row-based coloring for visual grouping */
  rowColoring?: RowColoringConfig;
}

export interface RowColoringConfig {
  enabled: boolean;
  colors: string[];
  groupBy: 'verse' | 'phrase' | 'word-count';
  wordsPerGroup?: number;
}

export interface WordTextStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight?: string;
}

export interface TransliterationConfig {
  enabled: boolean;
  fontSize: number;
  fontFamily: string;
  color: string;
}

// ============================================
// Page Spread Configuration
// ============================================

export interface PageSpreadConfig {
  /** Default view mode */
  defaultMode: 'single' | 'double' | 'auto';

  /** Auto mode breakpoint (switch to single below this width) */
  autoBreakpoint?: number;

  /** Double page (spread) settings */
  spread?: SpreadSettings;
}

export interface SpreadSettings {
  /** Gutter width between pages */
  gutterWidth: number;
  /** Shared header/footer across spread */
  sharedHeader: boolean;
  sharedFooter: boolean;
  /** Which page is on the right (for RTL books, odd pages are usually on left) */
  rightPageParity: 'odd' | 'even';
  /** Gap between pages in spread view */
  pageGap: number;
}

// ============================================
// Typography Configuration
// ============================================

export interface TypographyConfig {
  /** Primary font for Quran text */
  primaryFont: FontConfig;

  /** Secondary font for headers, numbers */
  secondaryFont?: FontConfig;

  /** Translation font */
  translationFont?: FontConfig;

  /** Default text color */
  textColor: string;

  /** Background color */
  backgroundColor: string;

  /** Text direction */
  direction: 'rtl' | 'ltr';

  /** Line height multiplier */
  lineHeightMultiplier: number;
}

export interface FontConfig {
  family: string;
  size: number;
  weight?: string | number;
  style?: 'normal' | 'italic';
  color?: string;
}

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type MushafConfigOverrides = DeepPartial<MushafConfig>;
```

### 1.2 Create Default Presets

**New File**: `packages/quran-engine/src/config/mushaf-presets.ts`

```typescript
/**
 * @digitalkhatt/quran-engine - Mushaf Presets
 *
 * Default configurations for common mushaf styles
 */

import type { MushafConfig, MushafConfigOverrides } from './mushaf-config';

// ============================================
// Default Values
// ============================================

const DEFAULT_LAYOUT = {
  linesPerPage: 15,
  pageWidth: 17000,
  pageHeight: 27000,
  margins: { top: 200, bottom: 200, left: 400, right: 400 },
  interlineSpacing: 1800,
  fontSize: 1000,
  justificationStyle: 'xscale' as const,
};

const DEFAULT_TAJWEED_COLORS = {
  tafkim: '#006694',
  lkalkala: '#00ADEF',
  lgray: '#B4B4B4',
  green: '#00A650',
  red1: '#C38A08',
  red2: '#F47216',
  red3: '#EC008C',
  red4: '#8C0000',
};

const DEFAULT_TAJWEED_RULES = {
  tafkhim: true,
  qalqalah: true,
  ghunnah: true,
  idgham: true,
  ikhfa: true,
  iqlab: true,
  madd: true,
};

// ============================================
// Mushaf Presets
// ============================================

export const MUSHAF_PRESETS: Record<string, MushafConfig> = {
  /**
   * Standard Madinah Mushaf (King Fahd Complex)
   */
  'madinah-standard': {
    id: 'madinah-standard',
    name: 'Madinah Mushaf (Standard)',
    layout: {
      ...DEFAULT_LAYOUT,
    },
    border: {
      enabled: true,
      cssStyles: {
        borderColor: '#8B4513',
        borderWidth: '2px',
        borderStyle: 'solid',
      },
    },
    verseMarker: {
      style: 'ornate-frame',
      numberFormat: 'arabic-indic',
      size: { width: 800, height: 800 },
      colors: {
        frame: '#DAA520',
        background: '#FFFFFF',
        number: '#000000',
      },
    },
    surahHeader: {
      display: {
        surahName: true,
        surahNumber: false,
        revelationType: false,
        verseCount: false,
        bismillah: 'separate-line',
      },
      height: 1800,
      background: {
        color: '#F5F5DC',
      },
    },
    tajweed: {
      enabled: false,
      colors: DEFAULT_TAJWEED_COLORS,
      rules: DEFAULT_TAJWEED_RULES,
    },
    margins: {
      enabled: false,
    },
    spread: {
      defaultMode: 'auto',
      autoBreakpoint: 800,
      spread: {
        gutterWidth: 40,
        sharedHeader: false,
        sharedFooter: true,
        rightPageParity: 'even',
        pageGap: 10,
      },
    },
    typography: {
      primaryFont: {
        family: 'digitalkhatt',
        size: 1000,
      },
      textColor: '#000000',
      backgroundColor: '#FFFEF0',
      direction: 'rtl',
      lineHeightMultiplier: 1.8,
    },
  },

  /**
   * IndoPak 15-line Mushaf
   */
  'indopak-15': {
    id: 'indopak-15',
    name: 'IndoPak 15-Line',
    layout: {
      ...DEFAULT_LAYOUT,
    },
    border: {
      enabled: true,
      cssStyles: {
        borderColor: '#228B22',
        borderWidth: '3px',
        borderStyle: 'double',
      },
    },
    verseMarker: {
      style: 'simple-circle',
      numberFormat: 'arabic-indic',
      size: { width: 600, height: 600 },
      colors: {
        frame: '#228B22',
        background: '#FFFFFF',
        number: '#228B22',
      },
    },
    surahHeader: {
      display: {
        surahName: true,
        surahNumber: true,
        revelationType: true,
        verseCount: true,
        bismillah: 'separate-line',
      },
      height: 2000,
      background: {
        color: '#E8F5E9',
      },
    },
    tajweed: {
      enabled: false,
      colors: DEFAULT_TAJWEED_COLORS,
      rules: DEFAULT_TAJWEED_RULES,
    },
    margins: {
      enabled: true,
      ruku: {
        enabled: true,
        position: 'left',
        displayFormat: 'number',
      },
      manzil: {
        enabled: true,
        position: 'right',
      },
      juz: {
        enabled: true,
        position: 'header',
        displayFormat: 'both',
      },
      sajdah: {
        enabled: true,
        style: 'both',
        color: '#FF0000',
      },
    },
    spread: {
      defaultMode: 'auto',
      autoBreakpoint: 800,
      spread: {
        gutterWidth: 40,
        sharedHeader: false,
        sharedFooter: true,
        rightPageParity: 'even',
        pageGap: 10,
      },
    },
    typography: {
      primaryFont: {
        family: 'indopak',
        size: 1000,
      },
      textColor: '#000000',
      backgroundColor: '#FFFEF0',
      direction: 'rtl',
      lineHeightMultiplier: 1.8,
    },
  },

  /**
   * Color-coded Tajweed Mushaf
   */
  'tajweed-colored': {
    id: 'tajweed-colored',
    name: 'Tajweed (Color-Coded)',
    layout: {
      ...DEFAULT_LAYOUT,
    },
    border: {
      enabled: true,
      cssStyles: {
        borderColor: '#4169E1',
        borderWidth: '2px',
        borderStyle: 'solid',
      },
    },
    verseMarker: {
      style: 'colored-circle',
      numberFormat: 'arabic-indic',
      size: { width: 700, height: 700 },
      colors: {
        frame: '#4169E1',
        background: '#E6F2FF',
        number: '#4169E1',
      },
    },
    surahHeader: {
      display: {
        surahName: true,
        surahNumber: false,
        revelationType: false,
        verseCount: false,
        bismillah: 'separate-line',
      },
      height: 1800,
      background: {
        color: '#E6F2FF',
      },
    },
    tajweed: {
      enabled: true,
      colors: {
        ...DEFAULT_TAJWEED_COLORS,
        // Enhanced colors for tajweed mushaf
        ghunnah: '#9932CC',
        ikhfa: '#00CED1',
        iqlab: '#FF69B4',
      },
      rules: DEFAULT_TAJWEED_RULES,
      qiraat: 'hafs',
    },
    margins: {
      enabled: false,
    },
    spread: {
      defaultMode: 'single',
    },
    typography: {
      primaryFont: {
        family: 'digitalkhatt',
        size: 1000,
      },
      textColor: '#000000',
      backgroundColor: '#FFFFFF',
      direction: 'rtl',
      lineHeightMultiplier: 1.8,
    },
  },

  /**
   * Word-by-Word Layout (English)
   */
  'word-by-word-en': {
    id: 'word-by-word-en',
    name: 'Word-by-Word (English)',
    layout: {
      linesPerPage: 8,
      pageWidth: 17000,
      pageHeight: 27000,
      margins: { top: 300, bottom: 300, left: 300, right: 300 },
      interlineSpacing: 3000,
      fontSize: 800,
      justificationStyle: 'stretch',
    },
    border: {
      enabled: true,
      cssStyles: {
        borderColor: '#8B4513',
        borderWidth: '1px',
        borderStyle: 'solid',
      },
    },
    verseMarker: {
      style: 'simple-circle',
      numberFormat: 'western',
      size: { width: 500, height: 500 },
      colors: {
        frame: '#8B4513',
        background: '#FFFFFF',
        number: '#8B4513',
      },
    },
    surahHeader: {
      display: {
        surahName: true,
        surahNumber: true,
        revelationType: false,
        verseCount: false,
        bismillah: 'inline',
      },
      height: 1500,
    },
    tajweed: {
      enabled: false,
      colors: DEFAULT_TAJWEED_COLORS,
      rules: DEFAULT_TAJWEED_RULES,
    },
    margins: {
      enabled: false,
    },
    wordByWord: {
      enabled: true,
      translations: [],
      layout: {
        arrangement: 'vertical',
        wordSpacing: 200,
        componentSpacing: 100,
        wordsPerRow: 4,
        rowColoring: {
          enabled: true,
          colors: ['#FFF5E6', '#E6F3FF', '#F0FFF0', '#FFF0F5'],
          groupBy: 'verse',
        },
      },
      arabic: {
        fontSize: 800,
        fontFamily: 'digitalkhatt',
        color: '#000000',
        fontWeight: 'bold',
      },
      transliteration: {
        enabled: true,
        fontSize: 400,
        fontFamily: 'Arial',
        color: '#666666',
      },
    },
    spread: {
      defaultMode: 'single',
    },
    typography: {
      primaryFont: {
        family: 'digitalkhatt',
        size: 800,
      },
      translationFont: {
        family: 'Arial',
        size: 350,
        color: '#333333',
      },
      textColor: '#000000',
      backgroundColor: '#FFFFFF',
      direction: 'rtl',
      lineHeightMultiplier: 3.0,
    },
  },
};

// ============================================
// Preset Helper Functions
// ============================================

/**
 * Get a mushaf preset by ID
 */
export function getMushafPreset(id: string): MushafConfig | undefined {
  return MUSHAF_PRESETS[id];
}

/**
 * Get all available preset IDs
 */
export function getAvailablePresets(): string[] {
  return Object.keys(MUSHAF_PRESETS);
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null
      ) {
        (result as any)[key] = deepMerge(target[key] as object, source[key] as object);
      } else {
        (result as any)[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * Extend a preset with custom overrides
 */
export function extendPreset(
  basePresetId: string,
  overrides: MushafConfigOverrides
): MushafConfig {
  const base = getMushafPreset(basePresetId);
  if (!base) {
    throw new Error(`Unknown preset: ${basePresetId}`);
  }
  return deepMerge(base, overrides as Partial<MushafConfig>);
}

/**
 * Create a custom mushaf config with defaults
 */
export function createMushafConfig(config: Partial<MushafConfig> & { id: string; name: string }): MushafConfig {
  const base = MUSHAF_PRESETS['madinah-standard'];
  return deepMerge(base, config as Partial<MushafConfig>);
}
```

### 1.3 Update Config Index

**Modify**: `packages/quran-engine/src/config/index.ts`

Add to existing file:

```typescript
// Add to imports
import type { MushafConfig, MushafConfigOverrides } from './mushaf-config';
import { getMushafPreset, extendPreset } from './mushaf-presets';

// Add to QuranEngineConfig interface
export interface QuranEngineConfig {
  // ... existing properties ...

  /** Full mushaf configuration (takes precedence over layoutType) */
  mushafConfig?: MushafConfig;
}

// Add exports
export * from './mushaf-config';
export * from './mushaf-presets';

/**
 * Convert legacy layoutType to MushafConfig
 */
export function legacyLayoutToConfig(layoutType: MushafLayoutTypeString): MushafConfig {
  switch (layoutType) {
    case 'newMadinah':
      return getMushafPreset('madinah-standard')!;
    case 'oldMadinah':
      return extendPreset('madinah-standard', { id: 'oldMadinah', name: 'Old Madinah' });
    case 'indoPak15':
      return getMushafPreset('indopak-15')!;
    default:
      return getMushafPreset('madinah-standard')!;
  }
}
```

---

## Phase 2: SVG Border System

### 2.1 Border Types

**New File**: `packages/quran-engine/src/border/types.ts`

```typescript
/**
 * @digitalkhatt/quran-engine - Border System Types
 */

export interface BorderRenderContext {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Is this an odd page? */
  isOddPage: boolean;
  /** Viewport dimensions */
  viewport: { width: number; height: number };
  /** Scale factor */
  scale: number;
}

export interface SlotContent {
  /** Slot name */
  name: string;
  /** Content to inject */
  content: string | SVGElement | HTMLElement;
  /** Content type */
  type: 'text' | 'svg' | 'html';
}

export interface BorderRenderResult {
  /** The complete border SVG element */
  borderElement: SVGSVGElement;
  /** Content area bounds (where Quran text goes) */
  contentBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ParsedBorderTemplate {
  /** The parsed SVG document */
  svg: SVGSVGElement;
  /** Map of slot names to elements */
  slots: Map<string, Element>;
  /** Original viewBox */
  viewBox: { x: number; y: number; width: number; height: number };
}
```

### 2.2 Slot Manager

**New File**: `packages/quran-engine/src/border/SlotManager.ts`

```typescript
/**
 * @digitalkhatt/quran-engine - SVG Slot Manager
 *
 * Manages named slots within SVG templates for content injection
 */

import type { SlotDefinition } from '../config/mushaf-config';

export class SlotManager {
  private template: SVGSVGElement;
  private slots: Map<string, Element> = new Map();
  private slotDefinitions: Record<string, SlotDefinition>;

  constructor(svgTemplate: string | SVGSVGElement, slotDefinitions: Record<string, SlotDefinition>) {
    this.slotDefinitions = slotDefinitions;

    if (typeof svgTemplate === 'string') {
      this.template = this.parseTemplate(svgTemplate);
    } else {
      this.template = svgTemplate.cloneNode(true) as SVGSVGElement;
    }

    this.findSlots();
  }

  private parseTemplate(svg: string): SVGSVGElement {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`Failed to parse SVG template: ${parseError.textContent}`);
    }
    return doc.documentElement as unknown as SVGSVGElement;
  }

  private findSlots(): void {
    // Find slots by data-slot attribute
    const dataSlotElements = this.template.querySelectorAll('[data-slot]');
    dataSlotElements.forEach((el) => {
      const slotName = el.getAttribute('data-slot');
      if (slotName) {
        this.slots.set(slotName, el);
      }
    });

    // Find slots by selector from definitions
    for (const [name, definition] of Object.entries(this.slotDefinitions)) {
      if (!this.slots.has(name) && definition.selector) {
        const element = this.template.querySelector(definition.selector);
        if (element) {
          this.slots.set(name, element);
        }
      }
    }
  }

  hasSlot(slotName: string): boolean {
    return this.slots.has(slotName);
  }

  getSlotNames(): string[] {
    return Array.from(this.slots.keys());
  }

  injectText(slotName: string, text: string): void {
    const slot = this.slots.get(slotName);
    if (!slot) return;
    slot.textContent = text;
  }

  injectSVG(slotName: string, svgContent: SVGElement | string): void {
    const slot = this.slots.get(slotName);
    if (!slot) return;
    slot.innerHTML = '';
    if (typeof svgContent === 'string') {
      slot.innerHTML = svgContent;
    } else {
      slot.appendChild(svgContent.cloneNode(true));
    }
  }

  getSlotBounds(slotName: string): DOMRect | null {
    const slot = this.slots.get(slotName);
    if (!slot || !(slot instanceof SVGGraphicsElement)) return null;
    try {
      return slot.getBBox();
    } catch {
      return null;
    }
  }

  render(): SVGSVGElement {
    return this.template.cloneNode(true) as SVGSVGElement;
  }
}
```

### 2.3 Border Renderer

**New File**: `packages/quran-engine/src/border/BorderRenderer.ts`

```typescript
/**
 * @digitalkhatt/quran-engine - Border Renderer
 */

import type { MushafBorderConfig, SVGBorderTemplate } from '../config/mushaf-config';
import type { BorderRenderContext, BorderRenderResult } from './types';
import { SlotManager } from './SlotManager';

export class BorderRenderer {
  private config: MushafBorderConfig;
  private slotManagers: Map<string, SlotManager> = new Map();

  constructor(config: MushafBorderConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;

    const templates = [
      { key: 'default', template: this.config.template },
      { key: 'odd', template: this.config.oddPageTemplate },
      { key: 'even', template: this.config.evenPageTemplate },
    ];

    for (const { key, template } of templates) {
      if (template) {
        await this.loadTemplate(key, template);
      }
    }
  }

  private async loadTemplate(key: string, template: SVGBorderTemplate): Promise<void> {
    let svgString: string;

    if (template.svg instanceof URL || (typeof template.svg === 'string' && template.svg.startsWith('http'))) {
      const url = template.svg instanceof URL ? template.svg.toString() : template.svg;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load border template from ${url}`);
      }
      svgString = await response.text();
    } else {
      svgString = template.svg as string;
    }

    const slotManager = new SlotManager(svgString, template.slots);
    this.slotManagers.set(key, slotManager);
  }

  private getTemplateForPage(isOddPage: boolean): SlotManager | null {
    if (isOddPage && this.slotManagers.has('odd')) {
      return this.slotManagers.get('odd')!;
    }
    if (!isOddPage && this.slotManagers.has('even')) {
      return this.slotManagers.get('even')!;
    }
    return this.slotManagers.get('default') || null;
  }

  render(context: BorderRenderContext): BorderRenderResult | null {
    if (!this.config.enabled) return null;

    const slotManager = this.getTemplateForPage(context.isOddPage);
    if (slotManager) {
      return this.renderSVGBorder(slotManager, context);
    }
    return this.renderCSSBorder(context);
  }

  private renderSVGBorder(slotManager: SlotManager, context: BorderRenderContext): BorderRenderResult {
    const svg = slotManager.render();
    svg.setAttribute('width', context.viewport.width.toString());
    svg.setAttribute('height', context.viewport.height.toString());

    const contentBounds = slotManager.getSlotBounds('content');
    const template = this.config.template || this.config.oddPageTemplate || this.config.evenPageTemplate;
    const viewBox = template?.viewBox || { width: 1700, height: 2700 };

    const scaleX = context.viewport.width / viewBox.width;
    const scaleY = context.viewport.height / viewBox.height;

    let contentArea = {
      x: 0, y: 0,
      width: context.viewport.width,
      height: context.viewport.height,
    };

    if (contentBounds) {
      contentArea = {
        x: contentBounds.x * scaleX,
        y: contentBounds.y * scaleY,
        width: contentBounds.width * scaleX,
        height: contentBounds.height * scaleY,
      };
    }

    return { borderElement: svg, contentBounds: contentArea };
  }

  private renderCSSBorder(context: BorderRenderContext): BorderRenderResult {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', context.viewport.width.toString());
    svg.setAttribute('height', context.viewport.height.toString());

    const styles = this.config.cssStyles;
    if (styles) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', context.viewport.width.toString());
      rect.setAttribute('height', context.viewport.height.toString());
      rect.setAttribute('fill', 'none');
      if (styles.borderColor) rect.setAttribute('stroke', styles.borderColor);
      if (styles.borderWidth) rect.setAttribute('stroke-width', styles.borderWidth);
      svg.appendChild(rect);
    }

    const margin = 10;
    return {
      borderElement: svg,
      contentBounds: {
        x: margin, y: margin,
        width: context.viewport.width - 2 * margin,
        height: context.viewport.height - 2 * margin,
      },
    };
  }
}
```

### 2.4 Border Index

**New File**: `packages/quran-engine/src/border/index.ts`

```typescript
export { BorderRenderer } from './BorderRenderer';
export { SlotManager } from './SlotManager';
export * from './types';
```

---

## Phase 3: Margin Annotation System

### 3.1 Annotation Data

**New File**: `packages/quran-engine/src/margin/annotation-data.ts`

```typescript
export interface JuzPosition {
  juz: number;
  surah: number;
  ayah: number;
  page: number;
}

export interface ManzilPosition {
  manzil: number;
  surah: number;
  ayah: number;
  page: number;
}

export interface SajdahPosition {
  surah: number;
  ayah: number;
  page: number;
  line: number;
  type: 'wajib' | 'mustahabb';
}

export const JUZ_POSITIONS: JuzPosition[] = [
  { juz: 1, surah: 1, ayah: 1, page: 1 },
  { juz: 2, surah: 2, ayah: 142, page: 22 },
  // ... (30 juz positions)
  { juz: 30, surah: 78, ayah: 1, page: 582 },
];

export const MANZIL_POSITIONS: ManzilPosition[] = [
  { manzil: 1, surah: 1, ayah: 1, page: 1 },
  // ... (7 manzil positions)
  { manzil: 7, surah: 50, ayah: 1, page: 518 },
];

export const SAJDAH_POSITIONS: SajdahPosition[] = [
  { surah: 7, ayah: 206, page: 176, line: 15, type: 'wajib' },
  // ... (14+ sajdah positions)
];

export function getPageAnnotations(pageNumber: number) {
  return {
    juz: JUZ_POSITIONS.find((j) => j.page === pageNumber),
    manzil: MANZIL_POSITIONS.find((m) => m.page === pageNumber),
    sajdah: SAJDAH_POSITIONS.filter((s) => s.page === pageNumber),
  };
}

export function getJuzForPage(pageNumber: number): number {
  for (let i = JUZ_POSITIONS.length - 1; i >= 0; i--) {
    if (JUZ_POSITIONS[i].page <= pageNumber) {
      return JUZ_POSITIONS[i].juz;
    }
  }
  return 1;
}
```

### 3.2 Margin Annotation Renderer

**New File**: `packages/quran-engine/src/margin/MarginAnnotationRenderer.ts`

```typescript
import type { MarginAnnotationConfig } from '../config/mushaf-config';
import { getPageAnnotations, type SajdahPosition } from './annotation-data';

export interface MarginRenderContext {
  pageNumber: number;
  viewport: { width: number; height: number };
  scale: number;
  lineHeight: number;
  topMargin: number;
}

export interface MarginRenderResult {
  leftMargin?: SVGGElement;
  rightMargin?: SVGGElement;
  headerAnnotations?: SVGGElement;
  sajdahMarkers?: Array<{ line: number; element: SVGElement }>;
}

export class MarginAnnotationRenderer {
  private config: MarginAnnotationConfig;

  constructor(config: MarginAnnotationConfig) {
    this.config = config;
  }

  render(context: MarginRenderContext): MarginRenderResult {
    if (!this.config.enabled) return {};

    const result: MarginRenderResult = {};
    const annotations = getPageAnnotations(context.pageNumber);

    if (this.config.juz?.enabled && annotations.juz) {
      const juzElement = this.renderJuzMarker(annotations.juz.juz, context);
      this.addToPosition(result, this.config.juz.position, juzElement);
    }

    if (this.config.manzil?.enabled && annotations.manzil) {
      const manzilElement = this.renderManzilMarker(annotations.manzil.manzil, context);
      this.addToPosition(result, this.config.manzil.position, manzilElement);
    }

    if (this.config.sajdah?.enabled && annotations.sajdah?.length) {
      result.sajdahMarkers = annotations.sajdah.map((s) => this.renderSajdahMarker(s, context));
    }

    return result;
  }

  private addToPosition(result: MarginRenderResult, position: 'left' | 'right' | 'header', element: SVGGElement) {
    // Add element to appropriate margin group
  }

  private renderJuzMarker(juzNumber: number, context: MarginRenderContext): SVGGElement {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // Render juz marker
    return g;
  }

  private renderManzilMarker(manzilNumber: number, context: MarginRenderContext): SVGGElement {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // Render manzil marker
    return g;
  }

  private renderSajdahMarker(sajdah: SajdahPosition, context: MarginRenderContext) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // Render sajdah marker
    return { line: sajdah.line, element: g };
  }
}
```

---

## Phase 4: Word-by-Word Layout System

### 4.1 Types

**New File**: `packages/quran-engine/src/word-by-word/types.ts`

```typescript
export interface WordData {
  key: string;
  arabic: string;
  transliteration?: string;
  translations: Record<string, string>;
}

export interface WordByWordRenderContext {
  pageNumber: number;
  viewport: { width: number; height: number };
  scale: number;
}

export interface WordRowLayout {
  words: WordLayoutInfo[];
  y: number;
  height: number;
  backgroundColor?: string;
}

export interface WordLayoutInfo {
  word: WordData;
  x: number;
  width: number;
  height: number;
}
```

### 4.2 Translation Data Loader

**New File**: `packages/quran-engine/src/word-by-word/TranslationDataLoader.ts`

```typescript
import type { WordTranslationData, WordTranslationConfig } from '../config/mushaf-config';

export class TranslationDataLoader {
  private cache: Map<string, WordTranslationData> = new Map();

  async loadTranslation(config: WordTranslationConfig): Promise<WordTranslationData> {
    if (typeof config.data !== 'string') return config.data;

    const url = config.data;
    if (this.cache.has(url)) return this.cache.get(url)!;

    const response = await fetch(url);
    const data = await response.json();
    this.cache.set(url, data);
    return data;
  }

  getWordTranslation(data: WordTranslationData, surah: number, ayah: number, wordIndex: number): string | undefined {
    return data.translations[`${surah}:${ayah}:${wordIndex}`];
  }
}
```

### 4.3 Word-by-Word Renderer

**New File**: `packages/quran-engine/src/word-by-word/WordByWordRenderer.ts`

```typescript
import type { WordByWordConfig } from '../config/mushaf-config';
import type { WordData, WordByWordRenderContext } from './types';
import { TranslationDataLoader } from './TranslationDataLoader';

export class WordByWordRenderer {
  private config: WordByWordConfig;
  private translationLoader: TranslationDataLoader;

  constructor(config: WordByWordConfig) {
    this.config = config;
    this.translationLoader = new TranslationDataLoader();
  }

  async initialize(): Promise<void> {
    for (const transConfig of this.config.translations) {
      await this.translationLoader.loadTranslation(transConfig);
    }
  }

  renderPage(words: WordData[], context: WordByWordRenderContext): SVGGElement {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // Layout and render word stacks with translations
    return g;
  }
}
```

---

## Phase 5: Page Spread System

### 5.1 Spread Manager

**New File**: `packages/quran-engine/src/spread/SpreadManager.ts`

```typescript
import type { PageSpreadConfig } from '../config/mushaf-config';

export type SpreadMode = 'single' | 'double';

export interface SpreadState {
  mode: SpreadMode;
  leftPageNumber: number;
  rightPageNumber: number;
  totalPages: number;
}

export class SpreadManager {
  private config: PageSpreadConfig;
  private currentMode: SpreadMode;
  private totalPages: number;

  constructor(config: PageSpreadConfig, totalPages: number) {
    this.config = config;
    this.totalPages = totalPages;
    this.currentMode = config.defaultMode === 'auto' ? 'single' : config.defaultMode;
  }

  updateModeForViewport(viewportWidth: number): SpreadMode {
    if (this.config.defaultMode !== 'auto') return this.currentMode;
    const breakpoint = this.config.autoBreakpoint || 800;
    this.currentMode = viewportWidth >= breakpoint ? 'double' : 'single';
    return this.currentMode;
  }

  getSpreadState(pageNumber: number): SpreadState {
    if (this.currentMode === 'single') {
      return { mode: 'single', leftPageNumber: pageNumber, rightPageNumber: pageNumber, totalPages: this.totalPages };
    }

    const rightPageParity = this.config.spread?.rightPageParity || 'even';
    const isRightPage = rightPageParity === 'even' ? pageNumber % 2 === 0 : pageNumber % 2 === 1;

    let leftPage = isRightPage ? pageNumber - 1 : pageNumber;
    let rightPage = isRightPage ? pageNumber : pageNumber + 1;

    leftPage = Math.max(1, leftPage);
    rightPage = Math.min(this.totalPages, rightPage);

    return { mode: 'double', leftPageNumber: leftPage, rightPageNumber: rightPage, totalPages: this.totalPages };
  }
}
```

---

## Phase 6: React Component Updates

### 6.1 Update QuranPage Props

**Modify**: `digitalkhatt-react/src/lib/components/QuranPage.tsx`

```typescript
export interface QuranPageProps {
  // Existing props (backward compatible)
  pageNumber: number;
  layoutType?: MushafLayoutTypeString;

  // NEW: Full config support
  mushafConfig?: MushafConfig;
  preset?: string;
  configOverrides?: MushafConfigOverrides;
}
```

### 6.2 New QuranSpread Component

**New File**: `digitalkhatt-react/src/lib/components/QuranSpread.tsx`

```typescript
export interface QuranSpreadProps {
  pageNumber: number;
  totalPages?: number;
  mushafConfig?: MushafConfig;
  preset?: string;
  width?: number | string;
  height?: number | string;
  onPageChange?: (leftPage: number, rightPage: number) => void;
}

export function QuranSpread(props: QuranSpreadProps) {
  // Implement double-page spread using SpreadManager
}
```

### 6.3 New useMushafConfig Hook

**New File**: `digitalkhatt-react/src/lib/hooks/useMushafConfig.ts`

```typescript
export interface UseMushafConfigOptions {
  preset?: string;
  overrides?: MushafConfigOverrides;
  baseConfig?: MushafConfig;
}

export function useMushafConfig(options: UseMushafConfigOptions = {}) {
  // Manage config state, preset switching, overrides
  return { config, setConfig, applyOverrides, switchPreset, reset, presetId };
}
```

---

## File Summary

### New Files (23)

```
packages/quran-engine/src/
├── config/
│   ├── mushaf-config.ts           (Phase 1)
│   └── mushaf-presets.ts          (Phase 1)
├── border/
│   ├── index.ts                   (Phase 2)
│   ├── BorderRenderer.ts          (Phase 2)
│   ├── SlotManager.ts             (Phase 2)
│   └── types.ts                   (Phase 2)
├── margin/
│   ├── index.ts                   (Phase 3)
│   ├── MarginAnnotationRenderer.ts (Phase 3)
│   ├── annotation-data.ts         (Phase 3)
│   └── types.ts                   (Phase 3)
├── word-by-word/
│   ├── index.ts                   (Phase 4)
│   ├── WordByWordRenderer.ts      (Phase 4)
│   ├── TranslationDataLoader.ts   (Phase 4)
│   ├── WordStackLayout.ts         (Phase 4)
│   └── types.ts                   (Phase 4)
├── spread/
│   ├── index.ts                   (Phase 5)
│   ├── SpreadManager.ts           (Phase 5)
│   └── types.ts                   (Phase 5)

digitalkhatt-react/src/lib/
├── components/
│   └── QuranSpread.tsx            (Phase 6)
├── hooks/
│   └── useMushafConfig.ts         (Phase 6)
```

### Modified Files (3)

```
packages/quran-engine/src/config/index.ts
packages/quran-engine/src/svg/SVGPageRenderer.ts
digitalkhatt-react/src/lib/components/QuranPage.tsx
```

---

## Implementation Order

1. **Phase 1**: Core config (mushaf-config.ts, mushaf-presets.ts)
2. **Phase 2**: Border system (BorderRenderer, SlotManager)
3. **Phase 3**: Margin annotations (MarginAnnotationRenderer)
4. **Phase 4**: Word-by-word (WordByWordRenderer, TranslationDataLoader)
5. **Phase 5**: Page spreads (SpreadManager)
6. **Phase 6**: React updates (QuranSpread, useMushafConfig)

---

## Example Usage

```tsx
// Using preset
<QuranPage pageNumber={1} preset="indopak-15" />

// Using preset with overrides
<QuranPage
  pageNumber={1}
  preset="madinah-standard"
  configOverrides={{
    tajweed: { enabled: true },
    border: { enabled: false }
  }}
/>

// Double page spread
<QuranSpread
  pageNumber={42}
  preset="madinah-standard"
  width="100%"
  height="100vh"
/>

// With hook
function MyQuranViewer() {
  const { config, switchPreset } = useMushafConfig({ preset: 'madinah-standard' });

  return (
    <>
      <button onClick={() => switchPreset('tajweed-colored')}>Switch</button>
      <QuranPage pageNumber={1} mushafConfig={config} />
    </>
  );
}
```
