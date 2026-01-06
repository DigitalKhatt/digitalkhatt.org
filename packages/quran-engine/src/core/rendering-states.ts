/**
 * @digitalkhatt/quran-engine - Rendering States
 *
 * Provides rendering state management for page-based Quran viewers.
 */

/**
 * Rendering state enum for page views.
 * Tracks the lifecycle of a page's rendering process.
 */
export enum RenderingStates {
  /** Page has not started rendering */
  INITIAL = 0,
  /** Page is currently rendering */
  RUNNING,
  /** Rendering was paused (can be resumed) */
  PAUSED,
  /** Rendering completed successfully */
  FINISHED,
}

/**
 * Interface for items that can be managed by PageViewBuffer
 */
export interface BufferableView {
  /** Unique identifier for the view */
  id: number;
  /** Cleanup method called when view is evicted from buffer */
  destroy(): void;
}

/**
 * A buffer for caching rendered page views with LRU eviction strategy.
 *
 * When the buffer reaches its capacity, the least recently used pages
 * are destroyed to make room for new ones.
 *
 * @typeParam T - Type of view objects, must implement BufferableView
 *
 * @example
 * ```typescript
 * const buffer = new PageViewBuffer<PageView>(10);
 * buffer.push(pageView);
 * buffer.resize(15, visiblePages);
 * buffer.reset();
 * ```
 */
export class PageViewBuffer<T extends BufferableView> {
  private data: T[] = [];
  private size: number;

  /**
   * Creates a new page view buffer
   * @param size - Maximum number of pages to cache
   */
  constructor(size: number) {
    this.size = size;
  }

  /**
   * Add a view to the buffer.
   * If the view already exists, it's moved to the end (most recently used).
   * If buffer is full, the oldest view is destroyed.
   *
   * @param view - The view to add to the buffer
   */
  push(view: T): void {
    const i = this.data.indexOf(view);
    if (i >= 0) {
      this.data.splice(i, 1);
    }
    this.data.push(view);
    if (this.data.length > this.size) {
      this.data.shift()?.destroy();
    }
  }

  /**
   * Resize the buffer, optionally keeping specific pages.
   * Pages to keep are moved to the end of the buffer.
   *
   * @param newSize - New buffer size
   * @param pagesToKeep - Optional array of pages that should be prioritized
   */
  resize(newSize: number, pagesToKeep?: T[]): void {
    this.size = newSize;
    if (pagesToKeep) {
      const pageIdsToKeep = new Set<number>();
      for (const page of pagesToKeep) {
        pageIdsToKeep.add(page.id);
      }
      this.moveToEndOfArray(this.data, (page) => pageIdsToKeep.has(page.id));
    }
    while (this.data.length > this.size) {
      this.data.shift()?.destroy();
    }
  }

  /**
   * Clear all pages from the buffer, destroying each one.
   */
  reset(): void {
    while (this.data.length > 0) {
      this.data.shift()?.destroy();
    }
  }

  /**
   * Get the current number of pages in the buffer.
   */
  get length(): number {
    return this.data.length;
  }

  /**
   * Move items matching condition to the end of the array.
   * Used for LRU ordering.
   */
  private moveToEndOfArray(arr: T[], condition: (item: T) => boolean): void {
    const moved: T[] = [];
    const len = arr.length;
    let write = 0;
    for (let read = 0; read < len; ++read) {
      if (condition(arr[read])) {
        moved.push(arr[read]);
      } else {
        arr[write] = arr[read];
        ++write;
      }
    }
    for (let read = 0; write < len; ++read, ++write) {
      arr[write] = moved[read];
    }
  }
}

/**
 * Default buffer size for page caching
 */
export const DEFAULT_CACHE_SIZE = 10;
