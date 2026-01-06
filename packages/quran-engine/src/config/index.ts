/**
 * @digitalkhatt/quran-engine - Config Module
 *
 * Engine configuration and factory functions
 */

import type {
  MushafLayoutTypeString,
  TajweedColorMap,
  VisualMetaFontAssets,
  PrecomputedLayoutData,
  QuranOutlineItem,
  ForceSimulationOptions,
} from '../core/types';
import type { IRenderer } from '../renderers/types';
import { createHarfBuzzRenderer } from '../renderers/HarfBuzzRenderer';
import { createVisualMetaFontRenderer } from '../renderers/VisualMetaFontRenderer';
import { createPrecomputedRenderer } from '../renderers/PrecomputedRenderer';
import type { VisualMetaFontModuleFactory } from '../visualmetafont/types';

/**
 * Configuration for creating a Quran engine instance
 */
export interface QuranEngineConfig {
  /** Renderer type to use */
  renderer: 'harfbuzz' | 'visualMetafont' | 'precomputed';

  /** Mushaf layout type */
  layoutType: MushafLayoutTypeString;

  /** Asset paths */
  assets: {
    // HarfBuzz assets
    /** HarfBuzz WASM path */
    harfbuzzWasm?: string;
    /** Font paths by layout type */
    fonts?: {
      newMadinah?: string;
      oldMadinah?: string;
      indoPak15?: string;
    };
    /** Quran text data (URL or inline data) */
    quranText?: string[][] | string;

    // VisualMetaFont assets
    /** VisualMetaFont WASM path */
    visualMetafontWasm?: string;
    /** VisualMetaFont asset files */
    visualMetafontAssets?: VisualMetaFontAssets;
    /** VisualMetaFont module factory */
    visualMetafontModuleFactory?: VisualMetaFontModuleFactory;
    /** Layout format for VisualMetaFont */
    format?: 'tex' | 'madinah';
    /** Sura header image URL */
    suraImageUrl?: string;

    // Precomputed assets
    /** Precomputed layout data (URL or inline data) */
    layoutData?: PrecomputedLayoutData | string;
    /** Loading strategy for precomputed data */
    loadingStrategy?: 'eager' | 'lazy';
    /** Outline data for precomputed renderer */
    outline?: QuranOutlineItem[];
  };

  /** Rendering options */
  options?: {
    tajweedEnabled?: boolean;
    tajweedColors?: TajweedColorMap;
    defaultTextColor?: string;
    defaultBackgroundColor?: string;
    /** Force simulation options for precomputed renderer */
    forceSimulationOptions?: ForceSimulationOptions;
  };
}

/**
 * Create a Quran engine instance based on configuration
 */
export async function createQuranEngine(config: QuranEngineConfig): Promise<IRenderer> {
  switch (config.renderer) {
    case 'harfbuzz': {
      if (!config.assets.harfbuzzWasm) {
        throw new Error('HarfBuzz renderer requires harfbuzzWasm asset');
      }
      if (!config.assets.fonts) {
        throw new Error('HarfBuzz renderer requires fonts asset');
      }
      if (!config.assets.quranText) {
        throw new Error('HarfBuzz renderer requires quranText asset');
      }

      const fontUrl = config.assets.fonts[config.layoutType];
      if (!fontUrl) {
        throw new Error(`No font URL provided for layout type '${config.layoutType}'`);
      }

      const renderer = createHarfBuzzRenderer({
        layoutType: config.layoutType,
        harfbuzzWasm: config.assets.harfbuzzWasm,
        fontUrl,
        quranText: config.assets.quranText,
      });

      await renderer.initialize();
      return renderer;
    }

    case 'visualMetafont': {
      if (!config.assets.visualMetafontWasm) {
        throw new Error('VisualMetaFont renderer requires visualMetafontWasm asset');
      }
      if (!config.assets.visualMetafontAssets) {
        throw new Error('VisualMetaFont renderer requires visualMetafontAssets');
      }
      if (!config.assets.visualMetafontModuleFactory) {
        throw new Error('VisualMetaFont renderer requires visualMetafontModuleFactory');
      }

      const renderer = createVisualMetaFontRenderer({
        wasmUrl: config.assets.visualMetafontWasm,
        assets: config.assets.visualMetafontAssets,
        format: config.assets.format || 'madinah',
        moduleFactory: config.assets.visualMetafontModuleFactory,
        suraImageUrl: config.assets.suraImageUrl,
      });

      await renderer.initialize();
      return renderer;
    }

    case 'precomputed': {
      if (!config.assets.layoutData) {
        throw new Error('Precomputed renderer requires layoutData asset');
      }

      const renderer = createPrecomputedRenderer({
        layoutData: config.assets.layoutData,
        loadingStrategy: config.assets.loadingStrategy,
        forceSimulationOptions: config.options?.forceSimulationOptions,
        outline: config.assets.outline,
      });

      await renderer.initialize();
      return renderer;
    }

    default:
      throw new Error(`Unknown renderer type: ${config.renderer}`);
  }
}
