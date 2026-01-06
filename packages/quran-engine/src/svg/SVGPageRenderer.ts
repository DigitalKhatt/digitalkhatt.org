/**
 * @digitalkhatt/quran-engine - SVG Page Renderer
 *
 * Renders a complete page of Quran text to SVG elements.
 * Extracted from hbmedina/page_view.ts for framework-agnostic use.
 */

import type {
  MushafLayoutType,
  PageFormat,
  LineTextInfo,
  JustResultByLine,
  JustStyle,
  HBFeature,
} from '../core/types';
import {
  JustStyle as JustStyleEnum,
  FONTSIZE,
  INTERLINE,
  MARGIN,
  PAGE_WIDTH,
} from '../core/types';
import { HarfBuzzFont, getWidth } from '../core/harfbuzz';
import { analyzeLineForJust, justifyLine, type QuranTextServiceLike } from '../core/justification';
import {
  SVGLineRenderer,
  getAyaDigitCountForMushaf,
  getAyaPositioningForMushaf,
  type VerseNumberFormat,
  type SajdaRenderInfo,
} from './SVGLineRenderer';

/**
 * Word click callback info for SVG renderer
 */
export interface SVGWordClickInfo {
  pageIndex: number;
  lineIndex: number;
  wordIndex: number;
  text: string;
  element: SVGElement;
}

/**
 * Highlight group for verses or words in SVG
 */
export interface SVGHighlightGroup {
  /** Verses to highlight (identified by surah:ayah) */
  verses?: Array<{ surah: number; ayah: number }>;
  /** Individual words to highlight (page, line, word indices) */
  words?: Array<{ page: number; line: number; word: number }>;
  /** Highlight background color */
  color: string;
}

/**
 * Options for SVG page rendering
 */
export interface SVGPageRenderOptions {
  /** Enable tajweed coloring */
  tajweedEnabled: boolean;
  /** Verse number format - 'arabic' or 'english' */
  verseNumberFormat: VerseNumberFormat;
  /** Justification style */
  justStyle: JustStyle;
  /** Optional SVG group element for aya number frames */
  ayaSvgGroup?: SVGGElement;
  /** Optional function to apply tajweed coloring (returns array of maps per line) */
  applyTajweed?: (pageIndex: number) => Array<Map<number, string>>;
  /** Enable clickable words */
  enableWordClick?: boolean;
  /** Callback when a word is clicked */
  onWordClick?: (info: SVGWordClickInfo) => void;
}

/**
 * Configuration for SVGPageRenderer
 */
export interface SVGPageRendererConfig {
  /** HarfBuzz font instance */
  font: HarfBuzzFont;
  /** Quran text service for text and line info */
  textService: QuranTextServiceLike;
  /** Mushaf layout type */
  mushafType: MushafLayoutType;
}

/**
 * Result of rendering a single line
 */
export interface LineRenderResult {
  /** The container div element */
  lineElement: HTMLDivElement;
  /** The SVG element (if rendered as SVG) */
  svg?: SVGSVGElement;
}

/**
 * Result of rendering a full page
 */
export interface PageRenderResult {
  /** Array of rendered line elements */
  lineElements: HTMLElement[];
  /** Time taken to render in milliseconds */
  renderTime: number;
  /** Word elements for hit testing (keyed by "page:line:word") */
  wordElements?: Map<string, SVGElement>;
}

/**
 * SVG Page Renderer
 *
 * Renders a complete page of Quran text using SVG-based glyph rendering
 * with HarfBuzz text shaping and justification.
 */
export class SVGPageRenderer {
  private font: HarfBuzzFont;
  private textService: QuranTextServiceLike;
  private mushafType: MushafLayoutType;
  private lineRenderer: SVGLineRenderer;
  private spaceWidth: number;
  private ayaDigitCount: number;

  constructor(config: SVGPageRendererConfig) {
    this.font = config.font;
    this.textService = config.textService;
    this.mushafType = config.mushafType;
    this.lineRenderer = new SVGLineRenderer(config.font);
    this.spaceWidth = getWidth(' ', this.font, FONTSIZE, null);
    this.ayaDigitCount = getAyaDigitCountForMushaf(config.mushafType);
  }

  /**
   * Render a complete page
   *
   * @param pageIndex - Zero-based page index
   * @param viewport - Page dimensions and font size
   * @param options - Rendering options
   * @returns Array of rendered line elements
   */
  renderPage(
    pageIndex: number,
    viewport: PageFormat,
    options: SVGPageRenderOptions
  ): PageRenderResult {
    const startTime = performance.now();
    const quranText = this.textService.quranText;
    const lineCount = quranText[pageIndex].length;
    const lineElements: HTMLElement[] = [];
    const wordElements = new Map<string, SVGElement>();

    const scale = viewport.width / PAGE_WIDTH;
    const defaultMargin = MARGIN * scale;
    const lineWidth = viewport.width - 2 * defaultMargin;
    const fontSizeLineWidthRatio = viewport.fontSize / lineWidth;
    const glyphScale = viewport.fontSize / FONTSIZE;

    // Calculate font size ratios for justification
    const fontSizeRatios = this.calculateFontSizeRatios(
      pageIndex,
      lineCount,
      fontSizeLineWidthRatio
    );
    const minRatio = Math.min(...fontSizeRatios.filter((r) => r > 0));

    // Get tajweed coloring if enabled
    // Note: tajweedResult is an array of Maps, one per line
    let tajweedResult: Array<Map<number, string>> | undefined;
    if (options.tajweedEnabled && options.applyTajweed) {
      tajweedResult = options.applyTajweed(pageIndex);
    }

    // Get aya positioning for this mushaf type
    const ayaPositioning = getAyaPositioningForMushaf(this.mushafType);

    // Render each line
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const lineInfo = this.textService.getLineInfo(pageIndex, lineIndex);
      const lineText = quranText[pageIndex][lineIndex];
      const lineElem = document.createElement('div');
      lineElem.classList.add('line');

      let margin = defaultMargin;

      // Line type 0: Content line (justified)
      // Line type 1: Sura header (centered, styled differently)
      // Line type 2: Basmala (centered with special scaling)
      const isFirstTwoPages = pageIndex === 0 || pageIndex === 1;

      if (lineInfo.lineType === 0 || (lineInfo.lineType === 2 && isFirstTwoPages)) {
        // Adjust margin for lines with non-full width
        if (lineInfo.lineWidthRatio !== 1) {
          const newLineWidth = lineWidth * lineInfo.lineWidthRatio;
          margin += (lineWidth - newLineWidth) / 2;
        }

        lineElem.style.marginLeft = margin + 'px';
        lineElem.style.marginRight = lineElem.style.marginLeft;
        lineElem.style.height = INTERLINE * scale + 'px';

        // Analyze and justify the line
        const lineTextInfo = analyzeLineForJust(this.textService, pageIndex, lineIndex);

        let fontSizeRatio = 1;
        if (options.justStyle === JustStyleEnum.SameSizeByPage) {
          fontSizeRatio = Math.min(minRatio, 1);
        }

        const justResult = justifyLine(
          lineTextInfo,
          this.font,
          fontSizeLineWidthRatio * fontSizeRatio / lineInfo.lineWidthRatio,
          this.spaceWidth,
          this.mushafType,
          options.justStyle
        );

        // Calculate sajda info if present
        let sajdaInfo: SajdaRenderInfo | undefined;
        if (lineInfo.sajda) {
          sajdaInfo = {
            startIndex: lineTextInfo.wordInfos[lineInfo.sajda.startWordIndex].startIndex,
            endIndex: lineTextInfo.wordInfos[lineInfo.sajda.endWordIndex].endIndex,
          };
        }

        // Calculate container dimensions
        // containerWidth = page width - 2 * margin
        const containerWidth = viewport.width - 2 * margin;
        const containerHeight = INTERLINE * scale;

        // Render the line as SVG
        this.renderSVGLine(
          lineElem,
          lineText,
          lineTextInfo,
          justResult,
          tajweedResult?.[lineIndex],
          glyphScale,
          fontSizeRatio,
          false,
          options,
          ayaPositioning.yOffset,
          containerWidth,
          containerHeight,
          sajdaInfo,
          pageIndex,
          lineIndex,
          wordElements
        );
      } else if (lineInfo.lineType === 1) {
        // Sura header line
        lineElem.style.textAlign = 'center';
        lineElem.style.marginLeft = margin + 'px';
        lineElem.style.marginRight = lineElem.style.marginLeft;
        lineElem.style.height = INTERLINE * scale + 'px';
        lineElem.classList.add('linesuran');

        if (isFirstTwoPages) {
          lineElem.style.paddingBottom = 2 * scale * INTERLINE + 'px';
        }

        const innerSpan = document.createElement('span');
        innerSpan.textContent = lineText;
        innerSpan.classList.add('innersura');
        innerSpan.style.lineHeight = lineElem.style.height;
        innerSpan.style.fontSize = viewport.fontSize * 0.9 + 'px';
        lineElem.appendChild(innerSpan);
      } else if (lineInfo.lineType === 2) {
        // Basmala line (not on first two pages - those are handled above)
        lineElem.style.marginLeft = margin + 'px';
        lineElem.style.marginRight = lineElem.style.marginLeft;
        lineElem.style.height = INTERLINE * scale + 'px';

        const lineTextInfo = analyzeLineForJust(this.textService, pageIndex, lineIndex);
        const justResult: JustResultByLine = {
          globalFeatures: [{ name: 'basm', value: 1 }],
          fontFeatures: new Map(),
          simpleSpacing: this.spaceWidth,
          ayaSpacing: this.spaceWidth,
          xScale: 1,
        };

        // Calculate container dimensions for basmala
        const containerWidth = viewport.width - 2 * margin;
        const containerHeight = INTERLINE * scale;

        this.renderSVGLine(
          lineElem,
          lineText,
          lineTextInfo,
          justResult,
          tajweedResult?.[lineIndex],
          glyphScale * 0.9,
          1,
          true,
          options,
          ayaPositioning.yOffset,
          containerWidth,
          containerHeight,
          undefined,
          pageIndex,
          lineIndex,
          wordElements
        );
      }

      lineElements.push(lineElem);
    }

    const endTime = performance.now();

    return {
      lineElements,
      renderTime: endTime - startTime,
      wordElements: wordElements.size > 0 ? wordElements : undefined,
    };
  }

  /**
   * Calculate font size ratios for each line for justification
   */
  private calculateFontSizeRatios(
    pageIndex: number,
    lineCount: number,
    fontSizeLineWidthRatio: number
  ): number[] {
    const quranText = this.textService.quranText;
    const fontSizeRatios: number[] = [];
    const isFirstTwoPages = pageIndex === 0 || pageIndex === 1;

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const lineInfo = this.textService.getLineInfo(pageIndex, lineIndex);

      if (lineInfo.lineType === 0 || (lineInfo.lineType === 2 && isFirstTwoPages)) {
        const lineText = quranText[pageIndex][lineIndex];
        const lineWidthUPEM = FONTSIZE / fontSizeLineWidthRatio;
        const desiredWidth = lineInfo.lineWidthRatio * lineWidthUPEM;
        const currentLineWidth = getWidth(lineText, this.font, FONTSIZE, null);
        fontSizeRatios[lineIndex] = desiredWidth / currentLineWidth;
      } else {
        fontSizeRatios[lineIndex] = 0;
      }
    }

    return fontSizeRatios;
  }

  /**
   * Render a line as SVG
   */
  private renderSVGLine(
    lineElem: HTMLDivElement,
    lineText: string,
    lineTextInfo: LineTextInfo,
    justResult: JustResultByLine,
    tajweedResult: Map<number, string> | undefined,
    glyphScale: number,
    fontSizeRatio: number,
    center: boolean,
    options: SVGPageRenderOptions,
    ayaYOffset: number,
    containerWidth: number,
    containerHeight: number,
    sajdaInfo?: SajdaRenderInfo,
    pageIndex?: number,
    lineIndex?: number,
    wordElements?: Map<string, SVGElement>
  ): void {
    // Build features array
    const features: HBFeature[] = lineTextInfo.features ? [...lineTextInfo.features] : [];

    // Add global features from justification
    for (const feat of justResult.globalFeatures || []) {
      features.push({
        tag: feat.name,
        value: feat.value,
        start: 0,
        end: -1,
      });
    }

    // Add per-character features from justification
    if (justResult.fontFeatures?.size > 0) {
      for (const wordInfo of lineTextInfo.wordInfos) {
        for (let i = wordInfo.startIndex; i <= wordInfo.endIndex; i++) {
          const justInfo = justResult.fontFeatures.get(i);
          if (justInfo) {
            for (const feat of justInfo) {
              features.push({
                tag: feat.name,
                value: feat.value,
                start: i,
                end: i + 1,
              });
            }
          }
        }
      }
    }

    // Shape the text
    const shapedGlyphs = this.lineRenderer.shapeText(lineText, features);

    // Calculate x and y scale
    const xScale =
      options.justStyle === JustStyleEnum.SCLXAxis
        ? fontSizeRatio
        : fontSizeRatio * justResult.xScale;
    const yScale = options.justStyle === JustStyleEnum.SameSizeByPage ? xScale : 1;

    // Render to SVG
    const result = this.lineRenderer.renderToSVG(
      lineText,
      shapedGlyphs,
      lineTextInfo.spaces,
      justResult.simpleSpacing,
      justResult.ayaSpacing,
      {
        glyphScale,
        xScale,
        yScale,
        tajweedClasses: tajweedResult,
        ayaDigitCount: this.ayaDigitCount,
        ayaSvgGroup: options.ayaSvgGroup,
        ayaYOffset,
        verseNumberFormat: options.verseNumberFormat,
        mushafType: this.mushafType,
        sajdaInfo,
        wordInfos: options.enableWordClick ? lineTextInfo.wordInfos : undefined,
      }
    );

    // Configure SVG dimensions and viewBox
    // containerWidth and containerHeight are passed as parameters since the element
    // is not yet in the DOM when this method is called
    const svgWidth = containerWidth;
    const svgHeight = containerHeight;
    const viewBoxWidth = Math.max(containerWidth, result.lineWidth);
    const viewBoxHeight = svgHeight;

    // Calculate viewBox x position (RTL text goes from -lineWidth to 0)
    let viewBoxX = -result.lineWidth;
    if (center) {
      const centerOffset = (viewBoxWidth - result.lineWidth) / 2;
      viewBoxX = -result.lineWidth - centerOffset;
    }

    // Position the viewBox to show harakat (marks above baseline) and descenders properly.
    // After the scale(x, -y) transform:
    // - Harakat (positive Y in font units) become negative Y in screen coords
    // - Descenders (negative Y in font units) become positive Y in screen coords
    //
    // Use actual bounds from rendered glyphs when available.
    // Center the content vertically within the viewBox to ensure nothing is clipped.
    // Fallback to 75% ratio if bounds are not available.
    let viewBoxY: number;
    if (result.bounds) {
      // Calculate actual content height
      const contentHeight = result.bounds.maxY - result.bounds.minY;
      // Center the content vertically within the viewBox
      // viewBoxY should position the top of the viewBox such that content is centered
      const verticalPadding = (viewBoxHeight - contentHeight) / 2;
      viewBoxY = result.bounds.minY - verticalPadding;
    } else {
      // Fallback: baseline at ~75% down from top
      viewBoxY = -viewBoxHeight * 0.75;
    }
    result.svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    result.svg.setAttribute('width', svgWidth.toString());
    result.svg.setAttribute('height', svgHeight.toString());
    result.svg.style.position = 'absolute';
    result.svg.style.right = '0px';
    result.svg.style.top = '0px';

    // Add word click overlays if enabled
    console.log('SVG renderSVGLine:', { enableWordClick: options.enableWordClick, pageIndex, lineIndex, hasWordBounds: !!result.wordBounds, wordBoundsLength: result.wordBounds?.length });
    if (options.enableWordClick && pageIndex !== undefined && lineIndex !== undefined && result.wordBounds) {
      const wordOverlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      wordOverlayGroup.setAttribute('class', 'word-overlays');

      for (let wordIndex = 0; wordIndex < result.wordBounds.length; wordIndex++) {
        const bounds = result.wordBounds[wordIndex];
        if (!bounds) continue;

        const wordRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        wordRect.setAttribute('x', bounds.x.toString());
        wordRect.setAttribute('y', viewBoxY.toString());
        wordRect.setAttribute('width', bounds.width.toString());
        wordRect.setAttribute('height', viewBoxHeight.toString());
        wordRect.setAttribute('fill', 'transparent');
        wordRect.setAttribute('class', 'word-click-area');
        wordRect.setAttribute('data-page', pageIndex.toString());
        wordRect.setAttribute('data-line', lineIndex.toString());
        wordRect.setAttribute('data-word', wordIndex.toString());
        wordRect.style.cursor = 'pointer';

        // Extract word text from lineTextInfo
        const wordInfo = lineTextInfo.wordInfos[wordIndex];
        const wordText = wordInfo ? lineText.substring(wordInfo.startIndex, wordInfo.endIndex + 1) : '';

        if (options.onWordClick) {
          wordRect.addEventListener('click', (e) => {
            e.stopPropagation();
            options.onWordClick!({
              pageIndex,
              lineIndex,
              wordIndex,
              text: wordText,
              element: wordRect,
            });
          });
        }

        // Store in word elements map for highlighting
        if (wordElements) {
          const key = `${pageIndex}:${lineIndex}:${wordIndex}`;
          wordElements.set(key, wordRect);
        }

        wordOverlayGroup.appendChild(wordRect);
      }

      result.svg.appendChild(wordOverlayGroup);
    }

    lineElem.appendChild(result.svg);
  }

  /**
   * Clear cached glyph paths
   */
  clearCache(): void {
    this.lineRenderer.clearCache();
  }

  /**
   * Get the underlying line renderer
   */
  getLineRenderer(): SVGLineRenderer {
    return this.lineRenderer;
  }

  /**
   * Apply highlights to word elements
   */
  applyHighlights(
    wordElements: Map<string, Element>,
    highlightGroups: SVGHighlightGroup[],
    pageIndex: number
  ): void {
    // Clear existing highlights
    for (const [, element] of wordElements) {
      // For SVG rect elements, reset fill
      if (element instanceof SVGElement) {
        element.style.fill = '';
        element.classList.remove('highlighted');
      }
    }

    // Apply each highlight group
    for (const group of highlightGroups) {
      if (group.words) {
        for (const word of group.words) {
          if (word.page === pageIndex) {
            const key = `${word.page}:${word.line}:${word.word}`;
            const element = wordElements.get(key);
            if (element && element instanceof SVGElement) {
              element.style.fill = group.color;
              element.classList.add('highlighted');
            }
          }
        }
      }
    }
  }
}
