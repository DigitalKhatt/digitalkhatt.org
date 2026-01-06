/**
 * @digitalkhatt/quran-engine - CanvasRenderer
 *
 * Renders Quran text to Canvas 2D.
 * Handles glyph rendering, positioning, and styling.
 */

import type {
  HBFeature,
  LineTextInfo,
  JustResultByLine,
  WordRect,
  LineRect,
  PageFormat,
  RenderResult,
  TajweedColorMap,
} from '../core/types';
import { PAGE_WIDTH, INTERLINE, MARGIN, FONTSIZE } from '../core/types';
import { HarfBuzzFont, HarfBuzzBuffer, getArabLanguage, getArabScript, getWidth } from '../core/harfbuzz';
import { QuranTextService } from '../core/quran-text';
import { analyzeLineForJust, justifyLine } from '../core/justification';
import { applyTajweedByPage, DEFAULT_TAJWEED_COLORS } from '../core/tajweed';
import { glyphCache } from './GlyphCache';

// ============================================
// Types
// ============================================

export interface RenderOptions {
  scale?: number;
  backgroundColor?: string;
  textColor?: string;
  tajweedEnabled?: boolean;
  tajweedColors?: TajweedColorMap;
  highlightedWords?: Array<{ lineIndex: number; wordIndex: number }>;
  highlightColor?: string;
}

// ============================================
// CanvasRenderer Class
// ============================================

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private font: HarfBuzzFont;
  private textService: QuranTextService;

  constructor(
    canvas: HTMLCanvasElement,
    font: HarfBuzzFont,
    textService: QuranTextService
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');
    this.ctx = ctx;
    this.font = font;
    this.textService = textService;
  }

  /**
   * Render a full page
   */
  renderPage(pageIndex: number, viewport: PageFormat, options: RenderOptions = {}): RenderResult {
    const {
      backgroundColor,
      textColor = '#000000',
      tajweedEnabled = true,
      tajweedColors = DEFAULT_TAJWEED_COLORS,
      highlightedWords = [],
      highlightColor = 'rgba(255, 255, 0, 0.3)',
    } = options;

    const wordRects: WordRect[] = [];
    const lineRects: LineRect[] = [];

    const canvas = this.ctx.canvas;
    const pageText = this.textService.quranText[pageIndex];
    const lineCount = pageText.length;

    // Calculate dimensions
    const scale = viewport.width / PAGE_WIDTH;
    const defaultMargin = MARGIN * scale;
    const lineWidth = viewport.width - 2 * defaultMargin;
    const fontSizeLineWidthRatio = viewport.fontSize / lineWidth;
    const glyphScale = viewport.fontSize / FONTSIZE;

    // Space width
    const spaceWidth = getWidth(' ', this.font, FONTSIZE, null);

    // Get tajweed coloring if enabled
    let tajweedResult: Array<Map<number, string>> | undefined;
    if (tajweedEnabled) {
      tajweedResult = applyTajweedByPage(this.textService, pageIndex);
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    if (backgroundColor) {
      this.ctx.fillStyle = backgroundColor;
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Render each line
    let currentY = INTERLINE * scale;

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const lineInfo = this.textService.getLineInfo(pageIndex, lineIndex);
      let margin = defaultMargin;

      // Adjust margin for centered lines
      if (lineInfo.lineWidthRatio !== 1) {
        const newLineWidth = lineWidth * lineInfo.lineWidthRatio;
        margin += (lineWidth - newLineWidth) / 2;
      }

      const lineY = currentY;
      const lineHeight = INTERLINE * scale;

      // Store line rect
      lineRects.push({
        lineIndex,
        x: margin,
        y: lineY - lineHeight * 0.8,
        width: viewport.width - 2 * margin,
        height: lineHeight,
      });

      if (lineInfo.lineType === 0 || (lineInfo.lineType === 2 && (pageIndex === 0 || pageIndex === 1))) {
        // Content line or Basmala on first pages
        const lineText = pageText[lineIndex];
        const lineTextInfo = analyzeLineForJust(this.textService, pageIndex, lineIndex);

        let justResult: JustResultByLine;
        if (lineInfo.lineType === 2) {
          // Basmala - use special features
          justResult = {
            globalFeatures: [{ name: 'basm', value: 1 }],
            fontFeatures: new Map(),
            simpleSpacing: spaceWidth,
            ayaSpacing: spaceWidth,
            xScale: 1,
          };
        } else {
          justResult = justifyLine(
            lineTextInfo,
            this.font,
            fontSizeLineWidthRatio / lineInfo.lineWidthRatio,
            spaceWidth,
            this.textService.mushafType
          );
        }

        // Render the line
        const lineWordRects = this.renderLine(
          lineIndex,
          lineText,
          lineTextInfo,
          justResult,
          tajweedResult?.[lineIndex],
          lineY,
          margin,
          glyphScale * (lineInfo.lineType === 2 ? 0.9 : 1),
          justResult.xScale,
          textColor,
          tajweedColors as Record<string, string>,
          highlightedWords,
          highlightColor,
          viewport
        );

        wordRects.push(...lineWordRects);
      } else if (lineInfo.lineType === 1) {
        // Sura header - render centered text
        const lineText = pageText[lineIndex];
        this.renderSuraHeader(lineText, lineY, viewport.fontSize * 0.9, textColor, viewport);
      }

      // Move to next line
      currentY += INTERLINE * scale;

      // Extra spacing for first pages after sura header
      if ((pageIndex === 0 || pageIndex === 1) && lineInfo.lineType === 1) {
        currentY += 2 * INTERLINE * scale;
      }
    }

    return { wordRects, lineRects };
  }

  /**
   * Render a single line of text
   */
  private renderLine(
    lineIndex: number,
    lineText: string,
    lineTextInfo: LineTextInfo,
    justResult: JustResultByLine,
    tajweedColorMap: Map<number, string> | undefined,
    y: number,
    margin: number,
    glyphScale: number,
    xScale: number,
    textColor: string,
    tajweedColors: Record<string, string>,
    highlightedWords: Array<{ lineIndex: number; wordIndex: number }>,
    highlightColor: string,
    viewport: PageFormat
  ): WordRect[] {
    const wordRects: WordRect[] = [];
    const ctx = this.ctx;

    // Build features
    const features: HBFeature[] = lineTextInfo.features ? [...lineTextInfo.features] : [];

    for (const feat of justResult.globalFeatures || []) {
      features.push({
        tag: feat.name,
        value: feat.value,
        start: 0,
        end: -1,
      });
    }

    if (justResult.fontFeatures?.size > 0) {
      for (const [index, feats] of justResult.fontFeatures) {
        for (const feat of feats) {
          features.push({
            tag: feat.name,
            value: feat.value,
            start: index,
            end: index + 1,
          });
        }
      }
    }

    // Shape text
    const buffer = new HarfBuzzBuffer();
    buffer.setDirection('rtl');
    buffer.setLanguage(getArabLanguage());
    buffer.setScript(getArabScript());
    buffer.setClusterLevel(1);
    buffer.addText(lineText);
    const glyphs = buffer.shape(this.font, features);
    buffer.destroy();

    // Calculate starting position (RTL - start from right)
    let currentX = viewport.width - margin;

    // Track word boundaries
    const wordBoundaries = new Map<number, { startX: number; endX: number; wordIndex: number }>();
    let currentWordIndex = 0;
    let wordStartX = currentX;

    // Draw highlighted backgrounds first
    const highlightedSet = new Set(
      highlightedWords
        .filter((w) => w.lineIndex === lineIndex)
        .map((w) => w.wordIndex)
    );

    // Render glyphs (RTL order)
    const effectiveScale = glyphScale * xScale;

    for (let glyphIndex = glyphs.length - 1; glyphIndex >= 0; glyphIndex--) {
      const glyph = glyphs[glyphIndex];

      // Handle spaces
      const space = lineTextInfo.spaces.get(glyph.Cluster);
      if (space === 2) {
        // Aya space
        // Save word boundary
        if (wordStartX !== currentX) {
          wordBoundaries.set(currentWordIndex, {
            startX: currentX,
            endX: wordStartX,
            wordIndex: currentWordIndex,
          });
          currentWordIndex++;
        }
        currentX -= justResult.ayaSpacing * effectiveScale;
        wordStartX = currentX;
      } else if (space === 1) {
        // Simple space
        // Save word boundary
        if (wordStartX !== currentX) {
          wordBoundaries.set(currentWordIndex, {
            startX: currentX,
            endX: wordStartX,
            wordIndex: currentWordIndex,
          });
          currentWordIndex++;
        }
        currentX -= justResult.simpleSpacing * effectiveScale;
        wordStartX = currentX;
      } else {
        currentX -= glyph.XAdvance * effectiveScale;
      }

      // Get glyph path
      const pathString = this.font.glyphToSvgPath(glyph.GlyphId);
      if (!pathString) continue;

      // Get color
      let fillColor = textColor;
      if (tajweedColorMap) {
        const tajweedClass = tajweedColorMap.get(glyph.Cluster);
        if (tajweedClass && tajweedColors[tajweedClass]) {
          fillColor = tajweedColors[tajweedClass];
        }
      }

      // Draw glyph
      ctx.save();
      ctx.translate(currentX + glyph.XOffset * effectiveScale, y + glyph.YOffset * effectiveScale);
      ctx.scale(effectiveScale, -effectiveScale); // Flip Y for glyph coordinates

      const path = glyphCache.get(glyph.GlyphId, pathString);
      ctx.fillStyle = fillColor;
      ctx.fill(path);

      ctx.restore();
    }

    // Save last word boundary
    if (wordStartX !== currentX) {
      wordBoundaries.set(currentWordIndex, {
        startX: currentX,
        endX: wordStartX,
        wordIndex: currentWordIndex,
      });
    }

    // Build word rects
    for (const [wordIdx, bounds] of wordBoundaries) {
      const wordInfo = lineTextInfo.wordInfos[wordIdx];
      wordRects.push({
        lineIndex,
        wordIndex: wordIdx,
        x: bounds.startX,
        y: y - glyphScale * FONTSIZE * 0.8,
        width: bounds.endX - bounds.startX,
        height: glyphScale * FONTSIZE * 1.2,
        text: wordInfo?.text || '',
      });

      // Draw highlight if needed
      if (highlightedSet.has(wordIdx)) {
        ctx.fillStyle = highlightColor;
        ctx.fillRect(
          bounds.startX,
          y - glyphScale * FONTSIZE * 0.8,
          bounds.endX - bounds.startX,
          glyphScale * FONTSIZE * 1.2
        );
      }
    }

    return wordRects;
  }

  /**
   * Render a sura header (centered)
   */
  private renderSuraHeader(
    text: string,
    y: number,
    fontSize: number,
    textColor: string,
    viewport: PageFormat
  ): void {
    const ctx = this.ctx;

    // For sura headers, we use the browser's text rendering
    // since they're decorative and don't need precise control
    ctx.save();
    ctx.font = `${fontSize}px "Amiri", serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.fillText(text, viewport.width / 2, y);
    ctx.restore();
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  /**
   * Get the canvas context
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
