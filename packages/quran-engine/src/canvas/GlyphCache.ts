/**
 * @digitalkhatt/quran-engine - GlyphCache
 *
 * Caches Path2D objects for efficient canvas rendering.
 * Converts SVG path strings to Path2D objects and caches them for reuse.
 */

export class GlyphCache {
  private cache: Map<number, Path2D> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 5000) {
    this.maxSize = maxSize;
  }

  /**
   * Get a cached Path2D for a glyph ID, or create and cache it
   */
  get(glyphId: number, pathString: string): Path2D {
    let path = this.cache.get(glyphId);
    if (!path) {
      path = new Path2D(pathString);
      this.set(glyphId, path);
    }
    return path;
  }

  /**
   * Check if a glyph is cached
   */
  has(glyphId: number): boolean {
    return this.cache.has(glyphId);
  }

  /**
   * Set a cached Path2D
   */
  set(glyphId: number, path: Path2D): void {
    // Simple LRU eviction - remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(glyphId, path);
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
}

// Singleton instance for global glyph caching
export const glyphCache = new GlyphCache();
