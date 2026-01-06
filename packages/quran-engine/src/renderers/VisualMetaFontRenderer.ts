/**
 * @digitalkhatt/quran-engine - VisualMetaFont Renderer
 *
 * Renderer implementation using VisualMetaFont WASM
 */

import type {
  PageFormat,
  RenderResult,
  QuranOutlineItem,
  VisualMetaFontAssets,
} from '../core/types';
import type { RenderOptions } from '../canvas/CanvasRenderer';
import type { IRenderer, RendererStatus } from './types';
import { QuranShaper } from '../visualmetafont/QuranShaper';
import { loadVisualMetaFontWasm, createRenderToken } from '../visualmetafont/wasm-loader';
import { printPage } from '../visualmetafont/RenderTask';
import type { VisualMetaFontModuleFactory, RenderToken } from '../visualmetafont/types';

/**
 * Configuration for VisualMetaFont renderer
 */
export interface VisualMetaFontRendererConfig {
  /** URL to the VisualMetaFontWasm.wasm file */
  wasmUrl: string;
  /** URLs to required asset files */
  assets: VisualMetaFontAssets;
  /** Layout format: 'tex' or 'madinah' */
  format: 'tex' | 'madinah';
  /** Emscripten module factory (from VisualMetaFontWasm.js) */
  moduleFactory: VisualMetaFontModuleFactory;
  /** URL to sura header image */
  suraImageUrl?: string;
}

/**
 * VisualMetaFont-based Quran renderer
 *
 * Uses the VisualMetaFont WASM module for MetaPost-based glyph generation
 */
export class VisualMetaFontRenderer implements IRenderer {
  private config: VisualMetaFontRendererConfig;
  private status: RendererStatus = 'idle';
  private error: Error | null = null;
  private quranShaper: QuranShaper | null = null;
  private currentToken: RenderToken | null = null;

  constructor(config: VisualMetaFontRendererConfig) {
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
      // Load WASM module
      const { quranShaper, module } = await loadVisualMetaFontWasm(
        this.config.wasmUrl,
        this.config.assets,
        this.config.moduleFactory
      );

      // Create QuranShaper wrapper
      this.quranShaper = new QuranShaper(quranShaper, module);

      // Load sura image if provided
      if (this.config.suraImageUrl) {
        await this.quranShaper.loadSuraImage(this.config.suraImageUrl);
      }

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
   * Get the QuranShaper instance
   */
  getQuranShaper(): QuranShaper | null {
    return this.quranShaper;
  }

  /**
   * Render a page to a canvas
   */
  async renderPage(
    canvas: HTMLCanvasElement,
    pageIndex: number,
    viewport: PageFormat,
    options?: RenderOptions
  ): Promise<RenderResult> {
    if (this.status !== 'ready' || !this.quranShaper) {
      throw new Error('Renderer not initialized');
    }

    // Cancel any pending render
    if (this.currentToken) {
      this.currentToken.cancel();
    }

    const { token } = createRenderToken();
    this.currentToken = token;

    // Get canvas context
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Could not get 2D canvas context');
    }

    // Set canvas dimensions
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Clear canvas
    ctx.fillStyle = options?.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scale
    const scale = viewport.width / 255;
    ctx.scale(scale, scale);

    // Set default text color
    ctx.fillStyle = options?.textColor || '#000000';

    // Render the page
    const texFormat = this.config.format === 'tex';
    const tajweedColor = options?.tajweedEnabled ?? false;
    const changeSize = false;

    await printPage(
      this.quranShaper,
      pageIndex,
      ctx,
      token,
      texFormat,
      tajweedColor,
      changeSize
    );

    // Return empty result for now (hit testing would need additional work)
    return {
      wordRects: [],
      lineRects: [],
    };
  }

  /**
   * Get total number of pages
   */
  getPageCount(): number {
    if (!this.quranShaper) {
      return 0;
    }

    if (this.config.format === 'tex') {
      return this.quranShaper.getTexNbPages();
    }

    // Madinah format has 604 pages
    return 604;
  }

  /**
   * Get navigation outline
   */
  getOutline(): QuranOutlineItem[] {
    if (!this.quranShaper) {
      return [];
    }

    return this.quranShaper.getOutline(this.config.format === 'tex');
  }

  /**
   * Cancel current render operation
   */
  cancelRender(): void {
    if (this.currentToken) {
      this.currentToken.cancel();
      this.currentToken = null;
    }
  }

  /**
   * Destroy renderer and release resources
   */
  destroy(): void {
    this.cancelRender();

    if (this.quranShaper) {
      this.quranShaper.destroy();
      this.quranShaper = null;
    }

    this.status = 'idle';
    this.error = null;
  }
}

/**
 * Factory function to create a VisualMetaFont renderer
 */
export function createVisualMetaFontRenderer(
  config: VisualMetaFontRendererConfig
): VisualMetaFontRenderer {
  return new VisualMetaFontRenderer(config);
}
