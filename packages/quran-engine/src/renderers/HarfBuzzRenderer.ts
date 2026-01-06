/**
 * @digitalkhatt/quran-engine - HarfBuzzRenderer
 *
 * Renderer implementation using HarfBuzz for text shaping.
 * This is the primary renderer for modern OpenType fonts.
 */

import type {
  QuranOutlineItem,
  RenderResult,
  PageFormat,
  MushafLayoutTypeString,
} from '../core/types';
import { LAYOUT_TYPE_MAP } from '../core/types';
import { loadHarfbuzz, loadAndCacheFont, HarfBuzzFont } from '../core/harfbuzz';
import { QuranTextService, createQuranTextService } from '../core/quran-text';
import { CanvasRenderer, RenderOptions } from '../canvas/CanvasRenderer';
import type { IRenderer, RendererStatus } from './types';

/**
 * HarfBuzz-based renderer configuration
 */
export interface HarfBuzzRendererConfig {
  /** Mushaf layout type */
  layoutType: MushafLayoutTypeString;

  /** Path to HarfBuzz WASM file */
  harfbuzzWasm: string;

  /** Font URL for the selected layout type */
  fontUrl: string;

  /** Quran text data (inline array or URL to fetch) */
  quranText: string[][] | string;
}

/**
 * HarfBuzz Renderer
 *
 * Uses HarfBuzz WASM for text shaping and canvas for rendering.
 * Supports all mushaf layout types with proper Arabic justification.
 */
export class HarfBuzzRenderer implements IRenderer {
  private config: HarfBuzzRendererConfig;
  private status: RendererStatus = 'idle';
  private error: Error | null = null;

  private font: HarfBuzzFont | null = null;
  private textService: QuranTextService | null = null;

  constructor(config: HarfBuzzRendererConfig) {
    this.config = config;
  }

  /**
   * Initialize the renderer
   */
  async initialize(): Promise<void> {
    if (this.status === 'loading' || this.status === 'ready') {
      return;
    }

    this.status = 'loading';
    this.error = null;

    try {
      // Load HarfBuzz WASM
      await loadHarfbuzz(this.config.harfbuzzWasm);

      // Load font
      this.font = await loadAndCacheFont(this.config.layoutType, this.config.fontUrl);

      // Load or use Quran text
      let quranText: string[][];
      if (typeof this.config.quranText === 'string') {
        const response = await fetch(this.config.quranText);
        quranText = await response.json();
      } else {
        quranText = this.config.quranText;
      }

      // Create text service
      const mushafType = LAYOUT_TYPE_MAP[this.config.layoutType];
      this.textService = createQuranTextService(quranText, mushafType);

      this.status = 'ready';
    } catch (err) {
      this.status = 'error';
      this.error = err instanceof Error ? err : new Error(String(err));
      throw this.error;
    }
  }

  /**
   * Check if renderer is ready
   */
  isReady(): boolean {
    return this.status === 'ready';
  }

  /**
   * Get current status
   */
  getStatus(): RendererStatus {
    return this.status;
  }

  /**
   * Get error if any
   */
  getError(): Error | null {
    return this.error;
  }

  /**
   * Render a page to canvas
   */
  async renderPage(
    canvas: HTMLCanvasElement,
    pageIndex: number,
    viewport: PageFormat,
    options?: RenderOptions
  ): Promise<RenderResult> {
    if (!this.isReady() || !this.font || !this.textService) {
      throw new Error('Renderer not initialized. Call initialize() first.');
    }

    if (pageIndex < 0 || pageIndex >= this.getPageCount()) {
      throw new Error(`Invalid page index: ${pageIndex}`);
    }

    // Set canvas size
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Create canvas renderer and render
    const canvasRenderer = new CanvasRenderer(canvas, this.font, this.textService);
    return canvasRenderer.renderPage(pageIndex, viewport, options);
  }

  /**
   * Get total number of pages
   */
  getPageCount(): number {
    return this.textService?.nbPages ?? 0;
  }

  /**
   * Get navigation outline
   */
  getOutline(): QuranOutlineItem[] {
    return this.textService?.outline ?? [];
  }

  /**
   * Get the text service for advanced usage
   */
  getTextService(): QuranTextService | null {
    return this.textService;
  }

  /**
   * Get the font for advanced usage
   */
  getFont(): HarfBuzzFont | null {
    return this.font;
  }

  /**
   * Destroy renderer and release resources
   */
  destroy(): void {
    // HarfBuzz fonts are cached globally, so we don't destroy them here
    this.font = null;
    this.textService = null;
    this.status = 'idle';
  }
}

/**
 * Create a HarfBuzz renderer with configuration
 */
export function createHarfBuzzRenderer(config: HarfBuzzRendererConfig): HarfBuzzRenderer {
  return new HarfBuzzRenderer(config);
}
