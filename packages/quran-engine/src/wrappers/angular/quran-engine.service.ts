/**
 * @digitalkhatt/quran-engine/angular - QuranEngineService
 *
 * Angular service wrapper for the Quran rendering engine.
 * Provides Observable-based status updates.
 *
 * Note: This is a base class. Angular consumers should create their own
 * Injectable service that extends or wraps this class.
 *
 * @example
 * ```typescript
 * import { Injectable } from '@angular/core';
 * import { QuranEngineServiceBase } from '@digitalkhatt/quran-engine/angular';
 *
 * @Injectable({ providedIn: 'root' })
 * export class QuranEngineService extends QuranEngineServiceBase {
 *   constructor() {
 *     super();
 *   }
 * }
 * ```
 */

import type { QuranEngineConfig } from '../../config';
import type { IRenderer } from '../../renderers/types';
import type { LoadingStatus, PageFormat, RenderResult, QuranOutlineItem } from '../../core/types';
import type { RenderOptions } from '../../canvas/CanvasRenderer';
import { createQuranEngine } from '../../config';
import { SVGPageRenderer, type SVGPageRendererConfig } from '../../svg/SVGPageRenderer';
import { CSSPageRenderer, type CSSPageRendererConfig } from '../../css/CSSPageRenderer';
import { QuranViewer, type QuranViewerConfig } from '../../core/QuranViewer';
import { PageViewer, type PageViewerConfig } from '../../core/PageViewer';

/**
 * Subject-like interface for status updates
 */
export interface StatusObserver<T> {
  getValue(): T;
  next(value: T): void;
  subscribe(callback: (value: T) => void): { unsubscribe: () => void };
}

/**
 * Simple BehaviorSubject implementation for framework-agnostic use
 */
class SimpleBehaviorSubject<T> implements StatusObserver<T> {
  private value: T;
  private subscribers: Set<(value: T) => void> = new Set();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  getValue(): T {
    return this.value;
  }

  next(value: T): void {
    this.value = value;
    this.subscribers.forEach((cb) => cb(value));
  }

  subscribe(callback: (value: T) => void): { unsubscribe: () => void } {
    this.subscribers.add(callback);
    // Immediately emit current value
    callback(this.value);
    return {
      unsubscribe: () => {
        this.subscribers.delete(callback);
      },
    };
  }
}

/**
 * Base class for Angular Quran engine service
 *
 * This class does NOT use Angular decorators, so it can be compiled
 * without Angular dependencies. Extend this class in your Angular app
 * and add the @Injectable decorator.
 */
export class QuranEngineServiceBase {
  private engine: IRenderer | null = null;
  private statusSubject = new SimpleBehaviorSubject<LoadingStatus>('idle');
  private errorSubject = new SimpleBehaviorSubject<Error | null>(null);

  /** Observable-like status updates */
  readonly status$ = this.statusSubject;

  /** Observable-like error updates */
  readonly error$ = this.errorSubject;

  /**
   * Get current status
   */
  get status(): LoadingStatus {
    return this.statusSubject.getValue();
  }

  /**
   * Get current error
   */
  get error(): Error | null {
    return this.errorSubject.getValue();
  }

  /**
   * Check if engine is ready
   */
  get isReady(): boolean {
    return this.status === 'ready';
  }

  /**
   * Initialize the engine with configuration
   */
  async initialize(config: QuranEngineConfig): Promise<void> {
    if (this.status === 'loading') {
      return;
    }

    this.statusSubject.next('loading');
    this.errorSubject.next(null);

    try {
      this.engine = await createQuranEngine(config);
      this.statusSubject.next('ready');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.errorSubject.next(error);
      this.statusSubject.next('error');
      throw error;
    }
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
    if (!this.engine) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }
    return this.engine.renderPage(canvas, pageIndex, viewport, options);
  }

  /**
   * Get total page count
   */
  getPageCount(): number {
    return this.engine?.getPageCount() ?? 0;
  }

  /**
   * Get navigation outline
   */
  getOutline(): QuranOutlineItem[] {
    return this.engine?.getOutline() ?? [];
  }

  /**
   * Get the underlying renderer for advanced usage
   */
  getRenderer(): IRenderer | null {
    return this.engine;
  }

  /**
   * Cleanup - call this in ngOnDestroy
   */
  destroy(): void {
    this.engine?.destroy();
    this.engine = null;
  }

  // ============================================
  // SVG/CSS Rendering Methods
  // ============================================

  /**
   * Create an SVG page renderer for DOM-based rendering
   *
   * @param config - Renderer configuration
   * @returns SVGPageRenderer instance
   */
  createSVGPageRenderer(config: SVGPageRendererConfig): SVGPageRenderer {
    return new SVGPageRenderer(config);
  }

  /**
   * Create a CSS page renderer for text-based rendering
   *
   * @param config - Renderer configuration
   * @returns CSSPageRenderer instance
   */
  createCSSPageRenderer(config: CSSPageRendererConfig): CSSPageRenderer {
    return new CSSPageRenderer(config);
  }

  /**
   * Create a QuranViewer for managing page display
   *
   * @param config - Viewer configuration
   * @returns QuranViewer instance
   */
  createQuranViewer(config: QuranViewerConfig): QuranViewer {
    return new QuranViewer(config);
  }

  /**
   * Create a single PageViewer for managing one page
   *
   * @param config - Page viewer configuration
   * @returns PageViewer instance
   */
  createPageViewer(config: PageViewerConfig): PageViewer {
    return new PageViewer(config);
  }
}

// Export the base class as the main export
export { QuranEngineServiceBase as QuranEngineService };

// Re-export types for convenience
export type {
  SVGPageRendererConfig,
  CSSPageRendererConfig,
  QuranViewerConfig,
  PageViewerConfig,
};
