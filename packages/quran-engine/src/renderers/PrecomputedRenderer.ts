/**
 * @digitalkhatt/quran-engine - Precomputed Renderer
 *
 * Renderer implementation using precomputed layout data
 */

import type {
  PageFormat,
  RenderResult,
  QuranOutlineItem,
  PrecomputedLayoutData,
  ForceSimulationOptions,
} from '../core/types';
import type { RenderOptions } from '../canvas/CanvasRenderer';
import type { IRenderer, RendererStatus } from './types';
import { LayoutService } from '../precomputed/LayoutService';
import { createPrecomputedCanvasRenderer } from '../precomputed/PrecomputedCanvasRenderer';

/**
 * Configuration for Precomputed renderer
 */
export interface PrecomputedRendererConfig {
  /** Layout data (inline object or URL to fetch) */
  layoutData: PrecomputedLayoutData | string;
  /** Loading strategy: 'eager' loads all data, 'lazy' loads on demand */
  loadingStrategy?: 'eager' | 'lazy';
  /** Force simulation options */
  forceSimulationOptions?: ForceSimulationOptions;
  /** Outline data for navigation (sura names and pages) */
  outline?: QuranOutlineItem[];
}

/**
 * Precomputed layout-based Quran renderer
 *
 * Uses precomputed JSON data with Bézier paths for glyph rendering
 */
export class PrecomputedRenderer implements IRenderer {
  private config: PrecomputedRendererConfig;
  private status: RendererStatus = 'idle';
  private error: Error | null = null;
  private layoutService: LayoutService | null = null;
  private canvasRenderer: ReturnType<typeof createPrecomputedCanvasRenderer> | null = null;
  private outline: QuranOutlineItem[] = [];

  constructor(config: PrecomputedRendererConfig) {
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
      let layoutData: PrecomputedLayoutData;

      // Load layout data
      if (typeof this.config.layoutData === 'string') {
        const response = await fetch(this.config.layoutData);
        if (!response.ok) {
          throw new Error(`Failed to fetch layout data: ${response.statusText}`);
        }
        layoutData = await response.json();
      } else {
        layoutData = this.config.layoutData;
      }

      // Create layout service
      this.layoutService = new LayoutService(layoutData);

      // Create canvas renderer
      this.canvasRenderer = createPrecomputedCanvasRenderer(this.layoutService);

      // Set outline
      this.outline = this.config.outline || this.generateOutline();

      this.status = 'ready';
    } catch (err) {
      this.status = 'error';
      this.error = err instanceof Error ? err : new Error(String(err));
      throw this.error;
    }
  }

  /**
   * Generate a basic outline from page data
   */
  private generateOutline(): QuranOutlineItem[] {
    // If no outline provided, return empty array
    // In a real implementation, this would parse the layout data
    // to find sura headers
    return [];
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
   * Get the layout service instance
   */
  getLayoutService(): LayoutService | null {
    return this.layoutService;
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
    if (this.status !== 'ready' || !this.canvasRenderer || !this.layoutService) {
      throw new Error('Renderer not initialized');
    }

    // Validate page index
    const pageCount = this.layoutService.getPageCount();
    if (pageIndex < 0 || pageIndex >= pageCount) {
      throw new Error(`Invalid page index: ${pageIndex}. Valid range: 0-${pageCount - 1}`);
    }

    // Render the page
    return this.canvasRenderer.render(
      canvas,
      pageIndex,
      viewport,
      options,
      this.config.forceSimulationOptions
    );
  }

  /**
   * Get total number of pages
   */
  getPageCount(): number {
    if (!this.layoutService) {
      return 0;
    }
    return this.layoutService.getPageCount();
  }

  /**
   * Get navigation outline
   */
  getOutline(): QuranOutlineItem[] {
    return this.outline;
  }

  /**
   * Clear the glyph cache
   */
  clearCache(): void {
    if (this.canvasRenderer) {
      this.canvasRenderer.clearCache();
    }
  }

  /**
   * Destroy renderer and release resources
   */
  destroy(): void {
    if (this.canvasRenderer) {
      this.canvasRenderer.clearCache();
      this.canvasRenderer = null;
    }

    this.layoutService = null;
    this.outline = [];
    this.status = 'idle';
    this.error = null;
  }
}

/**
 * Factory function to create a Precomputed renderer
 */
export function createPrecomputedRenderer(
  config: PrecomputedRendererConfig
): PrecomputedRenderer {
  return new PrecomputedRenderer(config);
}
