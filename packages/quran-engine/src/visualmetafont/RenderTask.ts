/**
 * @digitalkhatt/quran-engine - Render Task
 *
 * Async line-by-line rendering task for VisualMetaFont
 */

import type { QuranShaper } from './QuranShaper';
import type { RenderToken } from './types';

/**
 * Promise capability helper
 */
interface PromiseCapability<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  settled: boolean;
}

function createPromiseCapability<T>(): PromiseCapability<T> {
  let isSettled = false;
  let resolveRef: (value: T) => void;
  let rejectRef: (reason?: unknown) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolveRef = (value: T) => {
      isSettled = true;
      resolve(value);
    };
    rejectRef = (reason?: unknown) => {
      isSettled = true;
      reject(reason);
    };
  });

  return {
    promise,
    resolve: resolveRef!,
    reject: rejectRef!,
    get settled() {
      return isSettled;
    },
  };
}

/**
 * Internal render task for line-by-line rendering
 */
export class InternalRenderTask {
  private lineIndex = 0;
  private ystartposition = 0;
  private promiseCapability: PromiseCapability<void>;
  private cancelled = false;

  constructor(
    private readonly shaper: QuranShaper,
    private readonly token: RenderToken,
    private readonly pageIndex: number,
    private readonly ctx: CanvasRenderingContext2D,
    private readonly texFormat: boolean,
    private readonly tajweedColor: boolean,
    private readonly changeSize: boolean
  ) {
    ctx.transform(shaper.matrix[0], 0, 0, shaper.matrix[3], 0, shaper.matrix[5]);

    this.promiseCapability = createPromiseCapability<void>();

    // Link token to this task
    token.task = this;
  }

  /**
   * Get the number of lines for the current page
   */
  private getNumberOfLines(): number {
    if (this.pageIndex === 0 || this.pageIndex === 1) {
      return 8;
    }
    return 15;
  }

  /**
   * Cancel the render task
   */
  cancel(): void {
    this.cancelled = true;
    this.promiseCapability.resolve();
  }

  /**
   * Start rendering
   */
  render(): Promise<void> {
    this._continue();
    return this.promiseCapability.promise;
  }

  /**
   * Render one line iteration
   */
  private iteration(): void {
    if (this.token.isCancelled()) {
      return;
    }

    const ctx = this.ctx;
    const shaper = this.shaper;

    const pageResult = shaper.shapePage(
      this.pageIndex,
      this.lineIndex,
      this.texFormat,
      this.tajweedColor,
      this.changeSize
    );

    const page = pageResult.page;
    const originalPage = pageResult.originalPage;

    const line = page.value(0);
    const originalLine = originalPage.get(0);

    // Calculate Y position
    if (this.lineIndex === 0) {
      if (this.pageIndex === 0 || this.pageIndex === 1) {
        this.ystartposition = shaper.TopSpace + shaper.InterLineSpacing;
      } else {
        this.ystartposition = shaper.TopSpace;
      }
    } else {
      if (this.pageIndex === 0 || this.pageIndex === 1) {
        (line.type as { value: number }).value = 0;
        if (this.lineIndex === 1) {
          this.ystartposition += shaper.InterLineSpacing * 1.5;
        }
      }
    }

    let currentxPos = shaper.lineWidth + shaper.margin - line.xstartposition;
    const currentyPos = this.ystartposition;

    if (this.pageIndex === 0 || this.pageIndex === 1) {
      this.ystartposition += shaper.InterLineSpacingFirtPage;
    } else {
      this.ystartposition += shaper.InterLineSpacing;
    }

    const lastPos = { x: currentxPos, y: currentyPos };

    ctx.save();

    const SCALEBY = 8;

    if (line.type.value === 1) {
      // Sura header
      const ratio = shaper.getFontScalePerc() > 0.8 ? 0.8 / shaper.getFontScalePerc() : 1;
      const currentlineWidth = -(2 * line.xstartposition - shaper.lineWidth) * ratio;
      const xstartposition = (shaper.lineWidth - currentlineWidth) / 2;
      const newX = shaper.lineWidth + shaper.margin - xstartposition;

      const height = shaper.TopSpace;
      const ayaFrameyPos = currentyPos - (3 * height) / 5;

      // Draw sura image if available
      if (shaper.suraImage) {
        ctx.drawImage(shaper.suraImage, shaper.margin, ayaFrameyPos, shaper.lineWidth, height);
      }

      ctx.transform(ratio, 0, 0, -ratio, newX, lastPos.y);
    } else if (line.type.value === 2) {
      // Basmala
      const ratio = shaper.getFontScalePerc() > 0.85 ? 0.85 / shaper.getFontScalePerc() : 1;
      const currentlineWidth = -(2 * line.xstartposition - shaper.lineWidth) * ratio;
      const xstartposition = (shaper.lineWidth - currentlineWidth) / 2;
      const newX = shaper.lineWidth + shaper.margin - xstartposition;
      ctx.transform(ratio, 0, 0, -ratio, newX, lastPos.y - (200 << SCALEBY));
    } else {
      // Regular content
      ctx.transform(1, 0, 0, -1, lastPos.x, lastPos.y);
    }

    const glyphs = line.glyphs;
    const glyphNumber = glyphs.size();

    let beginsajda: { x: number; y: number } | null = null;
    let endsajda: { x: number; y: number } | null = null;
    let pos = { x: 0, y: 0 };

    for (let glyphIndex = 0; glyphIndex < glyphNumber; glyphIndex++) {
      const glyph = glyphs.get(glyphIndex);

      // Handle tajweed colors
      if (glyph.color) {
        const color = glyph.color;
        const style = `rgb(${(color >> 24) & 0xff},${(color >> 16) & 0xff},${(color >> 8) & 0xff})`;
        ctx.fillStyle = style;
      }

      currentxPos -= glyph.x_advance;
      pos.x = currentxPos + glyph.x_offset;
      pos.y = currentyPos - glyph.y_offset;

      // Track sajda markers
      if (glyph.beginsajda) {
        beginsajda = { x: lastPos.x, y: currentyPos };
      } else if (glyph.endsajda) {
        endsajda = { x: pos.x, y: currentyPos };
      }

      const diff = {
        x: pos.x - lastPos.x,
        y: pos.y - lastPos.y,
      };
      lastPos.x = pos.x;
      lastPos.y = pos.y;

      ctx.translate(diff.x, -diff.y);

      // Draw the glyph
      ctx.save();
      const scalePoint = line.fontSize;
      ctx.scale(scalePoint, scalePoint);
      shaper.displayGlyph(glyph.codepoint, glyph.lefttatweel, glyph.righttatweel, ctx);
      ctx.restore();

      // Reset color if tajweed was applied
      if (glyph.color) {
        ctx.fillStyle = 'rgb(0,0,0)';
      }
    }

    ctx.restore();

    // Draw sajda rule if present
    if (beginsajda && endsajda) {
      if (beginsajda.y !== endsajda.y) {
        console.log('Sajda Rule not in the same line');
        beginsajda.x = shaper.lineWidth + shaper.margin - line.xstartposition;
      }

      ctx.beginPath();
      ctx.moveTo(beginsajda.x, endsajda.y - (1150 << SCALEBY));
      ctx.lineTo(endsajda.x, endsajda.y - (1150 << SCALEBY));
      ctx.lineWidth = 40 << SCALEBY;
      ctx.stroke();
    }

    // Clean up WASM objects
    glyphs.delete();
    originalLine.delete();
    page.delete();
    originalPage.delete();
    pageResult.delete();
    shaper.clearAlternates();
  }

  private _continue(): void {
    if (this.cancelled) {
      return;
    }

    if (this.token.onContinue) {
      this.token.onContinue(() => this._scheduleNext());
    } else {
      this._scheduleNext();
    }
  }

  private _scheduleNext(): void {
    if (this.cancelled) {
      return;
    }

    requestAnimationFrame(() => this._next());
  }

  private _next(): void {
    this.iteration();
    this.lineIndex++;

    if (this.lineIndex < this.getNumberOfLines()) {
      this._continue();
    } else {
      this.promiseCapability.resolve();
    }
  }
}

/**
 * Print a page to a canvas context
 */
export async function printPage(
  shaper: QuranShaper,
  pageIndex: number,
  ctx: CanvasRenderingContext2D,
  token: RenderToken,
  texFormat: boolean,
  tajweedColor: boolean,
  changeSize: boolean
): Promise<void> {
  if (token.isCancelled()) {
    return;
  }

  const task = new InternalRenderTask(shaper, token, pageIndex, ctx, texFormat, tajweedColor, changeSize);
  await task.render();
}
