/**
 * @digitalkhatt/quran-engine - HitTestManager
 *
 * Manages click/hover detection on canvas.
 * Stores word and line bounding boxes and provides hit testing.
 */

import type { WordRect, LineRect } from '../core/types';

export class HitTestManager {
  private wordRects: WordRect[] = [];
  private lineRects: LineRect[] = [];

  /**
   * Set the word rectangles for hit testing
   */
  setWordRects(rects: WordRect[]): void {
    this.wordRects = rects;
  }

  /**
   * Set the line rectangles for hit testing
   */
  setLineRects(rects: LineRect[]): void {
    this.lineRects = rects;
  }

  /**
   * Clear all rectangles
   */
  clear(): void {
    this.wordRects = [];
    this.lineRects = [];
  }

  /**
   * Hit test a point against word rectangles
   */
  hitTestWord(x: number, y: number): WordRect | null {
    // RTL layout - words are positioned from right to left
    for (const rect of this.wordRects) {
      if (this.pointInRect(x, y, rect)) {
        return rect;
      }
    }
    return null;
  }

  /**
   * Hit test a point against line rectangles
   */
  hitTestLine(x: number, y: number): LineRect | null {
    for (const rect of this.lineRects) {
      if (this.pointInRect(x, y, rect)) {
        return rect;
      }
    }
    return null;
  }

  /**
   * Hit test a point and return both word and line
   */
  hitTest(x: number, y: number): { word: WordRect | null; line: LineRect | null } {
    return {
      word: this.hitTestWord(x, y),
      line: this.hitTestLine(x, y),
    };
  }

  /**
   * Get all word rects
   */
  getWordRects(): WordRect[] {
    return this.wordRects;
  }

  /**
   * Get all line rects
   */
  getLineRects(): LineRect[] {
    return this.lineRects;
  }

  /**
   * Get word rects for a specific line
   */
  getWordRectsForLine(lineIndex: number): WordRect[] {
    return this.wordRects.filter((rect) => rect.lineIndex === lineIndex);
  }

  /**
   * Find word rect by line and word index
   */
  findWordRect(lineIndex: number, wordIndex: number): WordRect | null {
    return (
      this.wordRects.find((rect) => rect.lineIndex === lineIndex && rect.wordIndex === wordIndex) ||
      null
    );
  }

  /**
   * Check if a point is inside a rectangle
   */
  private pointInRect(
    x: number,
    y: number,
    rect: { x: number; y: number; width: number; height: number }
  ): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }
}
