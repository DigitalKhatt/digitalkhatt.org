/**
 * @digitalkhatt/quran-engine - QuranViewer
 *
 * High-level viewer controller for Quran text display.
 * Manages page visibility, rendering queue, and viewport.
 */

import type { PageFormat } from './types';
import { RenderingStates, PageViewBuffer, DEFAULT_CACHE_SIZE } from './rendering-states';
import { PageViewer, type PageViewerRenderOptions, type PageViewerConfig } from './PageViewer';
import type { SVGPageRenderer } from '../svg/SVGPageRenderer';
import type { CSSPageRenderer } from '../css/CSSPageRenderer';

/**
 * Information about a visible page
 */
export interface VisiblePageInfo {
  /** 1-based page ID */
  id: number;
  /** X position of the page */
  x: number;
  /** Y position of the page */
  y: number;
  /** The page viewer instance */
  view: PageViewer;
  /** Visibility percentage (0-100) */
  percent: number;
}

/**
 * Visible pages result
 */
export interface VisiblePages {
  /** First visible page */
  first: VisiblePageInfo;
  /** Last visible page */
  last: VisiblePageInfo;
  /** All visible pages sorted by visibility percentage */
  views: VisiblePageInfo[];
}

/**
 * Configuration for QuranViewer
 */
export interface QuranViewerConfig {
  /** Container element with scroll capability */
  scrollContainer: HTMLElement;
  /** Array of page container elements */
  pageContainers: HTMLElement[];
  /** Page renderer instance */
  renderer: SVGPageRenderer | CSSPageRenderer;
  /** Renderer type */
  rendererType: 'svg' | 'css';
  /** Total number of pages */
  totalPages: number;
  /** Initial viewport dimensions */
  viewport: PageFormat;
  /** Optional cache size (default: 10) */
  cacheSize?: number;
  /** Optional line justify element for measurement */
  lineJustifyElement?: HTMLElement;
}

/**
 * Scroll state for direction tracking
 */
export interface ScrollState {
  right: boolean;
  down: boolean;
  lastX: number;
  lastY: number;
}

/**
 * QuranViewer - Complete viewer controller
 *
 * Manages page viewers, visibility detection, rendering queue,
 * and viewport changes. Framework-agnostic - works with any UI framework.
 */
export class QuranViewer {
  private scrollContainer: HTMLElement;
  private pageContainers: HTMLElement[];
  private renderer: SVGPageRenderer | CSSPageRenderer;
  private rendererType: 'svg' | 'css';
  private totalPages: number;
  private viewport: PageFormat;
  private lineJustifyElement?: HTMLElement;

  private views: PageViewer[] = [];
  private buffer: PageViewBuffer<PageViewer>;
  private highestPriorityPage: PageViewer | null = null;
  private scrollState: ScrollState;
  private isHorizontalScrollMode: boolean = false;
  private itemSize: number;

  /**
   * Create a new QuranViewer
   */
  constructor(config: QuranViewerConfig) {
    this.scrollContainer = config.scrollContainer;
    this.pageContainers = config.pageContainers;
    this.renderer = config.renderer;
    this.rendererType = config.rendererType;
    this.totalPages = config.totalPages;
    this.viewport = config.viewport;
    this.lineJustifyElement = config.lineJustifyElement;

    const cacheSize = config.cacheSize ?? DEFAULT_CACHE_SIZE;
    this.buffer = new PageViewBuffer<PageViewer>(cacheSize);
    this.itemSize = config.viewport.height;

    // Initialize scroll state
    this.scrollState = {
      right: true,
      down: true,
      lastX: this.scrollContainer.scrollLeft,
      lastY: this.scrollContainer.scrollTop,
    };

    // Create PageViewer instances for each page
    this.initializePageViewers();
  }

  /**
   * Initialize page viewers for all pages
   */
  private initializePageViewers(): void {
    for (let i = 0; i < this.pageContainers.length; i++) {
      const pageViewerConfig: PageViewerConfig = {
        pageIndex: i,
        container: this.pageContainers[i],
        viewport: this.viewport,
        renderer: this.renderer,
        rendererType: this.rendererType,
        lineJustifyElement: this.lineJustifyElement,
      };
      this.views[i] = new PageViewer(pageViewerConfig);
    }
  }

  /**
   * Get visible pages in the viewport
   */
  getVisiblePages(): VisiblePages | null {
    const scrollEl = this.scrollContainer;
    let top = scrollEl.scrollTop;
    if (top < 0) top = 0;
    const bottom = top + scrollEl.clientHeight;
    const left = scrollEl.scrollLeft;
    const right = left + scrollEl.clientWidth;

    const firstVisibleIndex = Math.floor(top / this.itemSize);
    let lastVisibleIndex = Math.floor(bottom / this.itemSize);
    lastVisibleIndex = Math.min(this.totalPages - 1, lastVisibleIndex);

    if (firstVisibleIndex > lastVisibleIndex) {
      return null;
    }

    const visible: VisiblePageInfo[] = [];

    for (let currIndex = firstVisibleIndex; currIndex <= lastVisibleIndex; currIndex++) {
      const view = this.views[currIndex];
      if (!view) continue;

      const element = view.container;
      const currentWidth = element.offsetLeft + element.clientLeft;
      const currentHeight = element.offsetTop + element.clientTop;
      const viewWidth = element.clientWidth;
      const viewHeight = element.clientHeight;
      const viewRight = currentWidth + viewWidth;
      const viewBottom = currentHeight + viewHeight;

      const hiddenHeight = Math.max(0, top - currentHeight) + Math.max(0, viewBottom - bottom);
      const hiddenWidth = Math.max(0, left - currentWidth) + Math.max(0, viewRight - right);
      const percent = Math.floor(
        ((viewHeight - hiddenHeight) * (viewWidth - hiddenWidth) * 100) / viewHeight / viewWidth
      );

      visible.push({
        id: view.id,
        x: currentWidth,
        y: currentHeight,
        view,
        percent,
      });
    }

    if (visible.length === 0) {
      return null;
    }

    const first = visible[0];
    const last = visible[visible.length - 1];

    // Sort by visibility percentage (descending)
    visible.sort((a, b) => {
      const pc = a.percent - b.percent;
      if (Math.abs(pc) > 0.001) {
        return -pc;
      }
      return a.id - b.id;
    });

    return { first, last, views: visible };
  }

  /**
   * Get the highest priority page to render
   */
  getHighestPriority(visible: VisiblePages, scrolledDown: boolean): PageViewer | null {
    const visibleViews = visible.views;
    const numVisible = visibleViews.length;

    if (numVisible === 0) {
      return null;
    }

    // First, find unfinished visible pages
    for (let i = 0; i < numVisible; i++) {
      const view = visibleViews[i].view;
      if (!this.isViewFinished(view)) {
        return view;
      }
    }

    // All visible pages are rendered, try adjacent pages
    if (scrolledDown) {
      const nextPageIndex = visible.last.id; // IDs are 1-based
      if (
        this.views[nextPageIndex] &&
        !this.isViewFinished(this.views[nextPageIndex]) &&
        nextPageIndex < this.totalPages
      ) {
        return this.views[nextPageIndex];
      }
    } else {
      const previousPageIndex = visible.first.id - 2;
      if (this.views[previousPageIndex] && !this.isViewFinished(this.views[previousPageIndex])) {
        return this.views[previousPageIndex];
      }
    }

    return null;
  }

  /**
   * Check if a view has finished rendering
   */
  private isViewFinished(view: PageViewer): boolean {
    return view.renderingState === RenderingStates.FINISHED;
  }

  /**
   * Force rendering of visible and adjacent pages
   *
   * @param options - Rendering options
   * @param currentlyVisiblePages - Optional pre-calculated visible pages
   * @returns True if rendering was initiated
   */
  forceRendering(
    options: PageViewerRenderOptions,
    currentlyVisiblePages?: VisiblePages | null
  ): boolean {
    const visiblePages = currentlyVisiblePages ?? this.getVisiblePages();

    if (!visiblePages) {
      return false;
    }

    const scrollAhead = this.isHorizontalScrollMode
      ? this.scrollState.right
      : this.scrollState.down;

    const pageView = this.getHighestPriority(visiblePages, scrollAhead);

    if (pageView) {
      this.buffer.push(pageView);
      this.renderView(pageView, options);
      return true;
    }

    return false;
  }

  /**
   * Render a specific page view
   */
  renderView(view: PageViewer, options: PageViewerRenderOptions): boolean {
    const oldHigh = this.highestPriorityPage;

    switch (view.renderingState) {
      case RenderingStates.FINISHED:
        return false;

      case RenderingStates.PAUSED:
        this.highestPriorityPage = view;
        view.resume();
        break;

      case RenderingStates.RUNNING:
        this.highestPriorityPage = view;
        break;

      case RenderingStates.INITIAL:
        this.highestPriorityPage = view;
        view
          .draw(options)
          .catch((error) => {
            console.error('Error rendering page:', error);
          })
          .finally(() => {
            this.forceRendering(options, null);
          });
        break;
    }

    // Pause old highest priority if changed
    if (oldHigh !== null && oldHigh !== this.highestPriorityPage) {
      oldHigh.pause();
    }

    return true;
  }

  /**
   * Handle scroll event - update scroll state and trigger rendering
   *
   * @param options - Rendering options
   * @returns Visible pages info
   */
  handleScroll(options: PageViewerRenderOptions): VisiblePages | null {
    // Update scroll direction
    const currentX = this.scrollContainer.scrollLeft;
    const currentY = this.scrollContainer.scrollTop;

    if (currentX !== this.scrollState.lastX) {
      this.scrollState.right = currentX > this.scrollState.lastX;
    }
    this.scrollState.lastX = currentX;

    if (currentY !== this.scrollState.lastY) {
      this.scrollState.down = currentY > this.scrollState.lastY;
    }
    this.scrollState.lastY = currentY;

    // Get visible pages and resize buffer
    const visible = this.getVisiblePages();
    if (visible && visible.views.length > 0) {
      const numVisible = visible.views.length;
      const newCacheSize = Math.max(DEFAULT_CACHE_SIZE, 2 * numVisible + 1);
      this.buffer.resize(newCacheSize, visible.views.map((v) => v.view));

      // Force rendering
      this.forceRendering(options, visible);
    }

    return visible;
  }

  /**
   * Set viewport and update all pages
   */
  setViewport(viewport: PageFormat, duringZoom: boolean = false): void {
    this.viewport = viewport;
    this.itemSize = viewport.height;

    for (const view of this.views) {
      view.update(viewport, duringZoom);
    }
  }

  /**
   * Navigate to a specific page
   *
   * @param pageNumber - 1-based page number
   */
  setPage(pageNumber: number): void {
    const offset = (pageNumber - 1) * this.itemSize;
    this.scrollContainer.scrollTop = offset;
  }

  /**
   * Get current page number based on scroll position
   */
  getCurrentPage(): number {
    const scrollTop = this.scrollContainer.scrollTop;
    return Math.floor(scrollTop / this.itemSize) + 1;
  }

  /**
   * Get total number of pages
   */
  getTotalPages(): number {
    return this.totalPages;
  }

  /**
   * Get a specific page viewer
   */
  getPageViewer(pageIndex: number): PageViewer | undefined {
    return this.views[pageIndex];
  }

  /**
   * Get all page viewers
   */
  getAllPageViewers(): PageViewer[] {
    return this.views;
  }

  /**
   * Get current scroll state
   */
  getScrollState(): ScrollState {
    return { ...this.scrollState };
  }

  /**
   * Set horizontal scroll mode
   */
  setHorizontalScrollMode(enabled: boolean): void {
    this.isHorizontalScrollMode = enabled;
  }

  /**
   * Reset buffer and all pages
   */
  reset(): void {
    this.buffer.reset();
  }

  /**
   * Destroy the viewer and clean up resources
   */
  destroy(): void {
    this.buffer.reset();
    for (const view of this.views) {
      view.destroy();
    }
    this.views = [];
  }
}
