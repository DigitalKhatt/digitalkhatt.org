/**
 * @digitalkhatt/quran-engine - Renderer Types
 *
 * Common interfaces for all rendering engines
 */

import type {
  MushafLayoutType,
  QuranOutlineItem,
  RenderResult,
  PageFormat,
} from '../core/types';
import type { RenderOptions } from '../canvas/CanvasRenderer';

/**
 * Configuration for initializing a renderer
 */
export interface RendererConfig {
  /** Mushaf layout type */
  layoutType: MushafLayoutType;

  /** Path to HarfBuzz WASM file */
  harfbuzzWasm?: string;

  /** Path to VisualMetaFont WASM file */
  visualMetafontWasm?: string;

  /** Font URLs by layout type */
  fonts: {
    newMadinah?: string;
    oldMadinah?: string;
    indoPak15?: string;
  };

  /** Quran text data (inline or URL) */
  quranText?: string[][] | string;
}

/**
 * Common interface for all renderers
 */
export interface IRenderer {
  /**
   * Initialize the renderer (load WASM, fonts, text data)
   */
  initialize(): Promise<void>;

  /**
   * Check if renderer is ready
   */
  isReady(): boolean;

  /**
   * Render a page to a canvas
   */
  renderPage(
    canvas: HTMLCanvasElement,
    pageIndex: number,
    viewport: PageFormat,
    options?: RenderOptions
  ): Promise<RenderResult>;

  /**
   * Get total number of pages
   */
  getPageCount(): number;

  /**
   * Get navigation outline (sura names and page numbers)
   */
  getOutline(): QuranOutlineItem[];

  /**
   * Destroy renderer and release resources
   */
  destroy(): void;
}

/**
 * Status of renderer initialization
 */
export type RendererStatus = 'idle' | 'loading' | 'ready' | 'error';
