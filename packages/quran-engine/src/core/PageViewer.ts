/**
 * @digitalkhatt/quran-engine - PageViewer
 *
 * Framework-agnostic page state manager with pause/resume support.
 * Manages the rendering lifecycle of a single page in the Quran viewer.
 */

import type { PageFormat, JustStyle } from './types';
import { RenderingStates, type BufferableView } from './rendering-states';
import type { SVGPageRenderer, SVGPageRenderOptions, SVGWordClickInfo } from '../svg/SVGPageRenderer';
import type { CSSPageRenderer, CSSPageRenderOptions, CSSWordClickInfo } from '../css/CSSPageRenderer';
import type { VerseNumberFormat } from '../svg/SVGLineRenderer';

/**
 * Union type for renderer-specific word click info (works with both SVG and CSS renderers)
 */
export type RendererWordClickInfo = SVGWordClickInfo | CSSWordClickInfo;

/**
 * Rendering options for PageViewer
 */
export interface PageViewerRenderOptions {
  /** Enable tajweed coloring */
  tajweedEnabled: boolean;
  /** Verse number format - 'arabic' or 'english' */
  verseNumberFormat: VerseNumberFormat;
  /** Justification style */
  justStyle: JustStyle;
  /** Optional SVG group for aya frames (SVG renderer only) */
  ayaSvgGroup?: SVGGElement;
  /** Optional function to apply tajweed coloring (returns array of maps per line) */
  applyTajweed?: (pageIndex: number) => Array<Map<number, string>>;
  /** Enable clickable words */
  enableWordClick?: boolean;
  /** Callback when a word is clicked (works with both SVG and CSS renderers) */
  onWordClick?: (info: RendererWordClickInfo) => void;
}

/**
 * Configuration for PageViewer
 */
export interface PageViewerConfig {
  /** Zero-based page index */
  pageIndex: number;
  /** Container element to render into */
  container: HTMLElement;
  /** Initial viewport dimensions */
  viewport: PageFormat;
  /** Page renderer (SVG or CSS) */
  renderer: SVGPageRenderer | CSSPageRenderer;
  /** Renderer type */
  rendererType: 'svg' | 'css';
  /** Optional line justify element for measurement */
  lineJustifyElement?: HTMLElement;
}

/**
 * PageViewer - Manages rendering of a single page
 *
 * Implements the BufferableView interface for use with PageViewBuffer.
 * Supports pause/resume for progressive rendering without blocking the UI.
 */
export class PageViewer implements BufferableView {
  /** Unique identifier (1-based page number) */
  public readonly id: number;
  /** Zero-based page index */
  public readonly pageIndex: number;
  /** Current rendering state */
  public renderingState: RenderingStates = RenderingStates.INITIAL;
  /** Rendering ID for tracking */
  public readonly renderingId: string;
  /** Container element */
  public readonly container: HTMLElement;

  private viewport: PageFormat;
  private renderer: SVGPageRenderer | CSSPageRenderer;
  private rendererType: 'svg' | 'css';
  private lineJustifyElement?: HTMLElement;

  private resumeCallback: (() => void) | null = null;
  private pausePromise: Promise<boolean> | null = null;
  private lastDrawTime: number = 0;
  private zoomLayer: HTMLElement | null = null;
  /** Word elements for hit testing (CSS renderer only) */
  private wordElements: Map<string, Element> | null = null;

  /**
   * Create a new PageViewer
   */
  constructor(config: PageViewerConfig) {
    this.pageIndex = config.pageIndex;
    this.id = config.pageIndex + 1;
    this.renderingId = 'page' + this.id;
    this.container = config.container;
    this.viewport = config.viewport;
    this.renderer = config.renderer;
    this.rendererType = config.rendererType;
    this.lineJustifyElement = config.lineJustifyElement;

    // Set initial container dimensions and font size
    this.container.style.width = this.viewport.width + 'px';
    this.container.style.height = this.viewport.height + 'px';
    this.container.style.fontSize = this.viewport.fontSize + 'px';
  }

  /**
   * Pause rendering if currently running
   */
  pause(): void {
    if (this.renderingState === RenderingStates.RUNNING && this.resumeCallback === null) {
      this.renderingState = RenderingStates.PAUSED;
      this.pausePromise = new Promise((resolve) => {
        this.resumeCallback = () => {
          if (this.renderingState === RenderingStates.PAUSED) {
            resolve(true);
            this.renderingState = RenderingStates.RUNNING;
          } else {
            resolve(false);
          }
          this.resumeCallback = null;
        };
      });
    }
  }

  /**
   * Resume paused rendering
   */
  resume(): void {
    if (this.resumeCallback) {
      this.resumeCallback();
    }
  }

  /**
   * Check if rendering is paused
   */
  isPaused(): boolean {
    return this.renderingState === RenderingStates.PAUSED;
  }

  /**
   * Draw the page with progressive rendering support
   *
   * @param options - Rendering options
   * @returns Promise that resolves when rendering is complete
   */
  async draw(options: PageViewerRenderOptions): Promise<void> {
    if (this.renderingState !== RenderingStates.INITIAL) {
      return;
    }

    const startTime = performance.now();
    this.lastDrawTime = startTime;
    this.renderingState = RenderingStates.RUNNING;

    // Configure line justify element if available (for measurement)
    if (this.lineJustifyElement) {
      this.lineJustifyElement.style.width = this.container.style.width;
      this.lineJustifyElement.style.fontSize = this.container.style.fontSize;
    }

    // Render based on renderer type
    let lineElements: HTMLElement[];

    console.log(`[PageViewer] draw() called for page ${this.pageIndex}, rendererType=${this.rendererType}, enableWordClick=${options.enableWordClick}`);

    if (this.rendererType === 'svg') {
      const svgRenderer = this.renderer as SVGPageRenderer;
      const svgOptions: SVGPageRenderOptions = {
        tajweedEnabled: options.tajweedEnabled,
        verseNumberFormat: options.verseNumberFormat,
        justStyle: options.justStyle,
        ayaSvgGroup: options.ayaSvgGroup,
        applyTajweed: options.applyTajweed,
        enableWordClick: options.enableWordClick,
        onWordClick: options.onWordClick as SVGPageRenderOptions['onWordClick'],
      };
      const result = svgRenderer.renderPage(this.pageIndex, this.viewport, svgOptions);
      lineElements = result.lineElements;
      // SVG renderer returns word elements as SVGElement
      this.wordElements = result.wordElements as Map<string, Element> | undefined ?? null;
    } else {
      const cssRenderer = this.renderer as CSSPageRenderer;
      const cssOptions: CSSPageRenderOptions = {
        tajweedEnabled: options.tajweedEnabled,
        enableWordClick: options.enableWordClick,
        onWordClick: options.onWordClick,
      };
      const result = cssRenderer.renderPage(this.pageIndex, this.viewport, cssOptions);
      lineElements = result.lineElements;
      this.wordElements = result.wordElements || null;
    }

    // Progressive rendering: append lines with yield to prevent blocking
    const tempContainer = document.createElement('div');

    for (const lineElement of lineElements) {
      tempContainer.appendChild(lineElement);

      // Yield control every ~16ms (one frame)
      if (performance.now() - this.lastDrawTime > 16) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });

        // Check if paused
        if (this.isPaused()) {
          const shouldContinue = await this.pausePromise;
          if (!shouldContinue) return;
        } else if (this.renderingState !== RenderingStates.RUNNING) {
          return;
        }

        this.lastDrawTime = performance.now();
      }
    }

    // Move all rendered lines to the container
    while (tempContainer.firstChild) {
      this.container.appendChild(tempContainer.firstChild);
    }

    this.renderingState = RenderingStates.FINISHED;

    const endTime = performance.now();
    console.info(`draw page ${this.id} took ${endTime - startTime} ms`);
  }

  /**
   * Reset the page to initial state
   *
   * @param keepZoomLayer - Whether to preserve zoom layer
   */
  reset(keepZoomLayer: boolean = false): void {
    this.container.style.width = this.viewport.width + 'px';
    this.container.style.height = this.viewport.height + 'px';
    this.container.style.fontSize = this.viewport.fontSize + 'px';

    this.renderingState = RenderingStates.INITIAL;

    // Resume if paused
    if (this.resumeCallback) {
      this.resumeCallback();
    }

    this.container.removeAttribute('data-loaded');

    // Clear children
    while (this.container.firstChild) {
      this.container.removeChild(this.container.lastChild!);
    }

    // Handle zoom layer
    if (!keepZoomLayer && this.zoomLayer) {
      this.resetZoomLayer(true);
    }
  }

  /**
   * Update viewport and reset for re-rendering
   *
   * @param viewport - New viewport dimensions
   * @param duringZoom - Whether this is during a zoom operation
   */
  update(viewport: PageFormat, _duringZoom: boolean = false): void {
    this.viewport = viewport;

    if (this.zoomLayer) {
      this.zoomLayer.style.width = this.viewport.width + 'px';
      this.zoomLayer.style.height = this.viewport.height + 'px';
    }

    this.reset(true);
  }

  /**
   * Destroy the page viewer and clean up resources
   */
  destroy(): void {
    this.reset(false);
  }

  /**
   * Get the current viewport
   */
  getViewport(): PageFormat {
    return this.viewport;
  }

  /**
   * Get word elements for hit testing
   */
  getWordElements(): Map<string, Element> | null {
    return this.wordElements;
  }

  /**
   * Reset zoom layer
   */
  private resetZoomLayer(removeFromDOM: boolean = false): void {
    if (!this.zoomLayer) {
      return;
    }

    // Clean up zoom layer (release resources)
    (this.zoomLayer as any).width = 0;
    (this.zoomLayer as any).height = 0;

    if (removeFromDOM) {
      this.zoomLayer.remove();
    }

    this.zoomLayer = null;
  }
}
