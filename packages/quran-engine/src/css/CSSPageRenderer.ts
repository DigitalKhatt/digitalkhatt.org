/**
 * @digitalkhatt/quran-engine - CSS Page Renderer
 *
 * Renders a complete page of Quran text using CSS-based text rendering.
 * Uses font-feature-settings for justification instead of SVG glyphs.
 * Extracted from otfmushaf/page_view.ts for framework-agnostic use.
 */

import type {
  MushafLayoutType,
  PageFormat,
} from '../core/types';
import {
  MushafLayoutType as MushafLayoutTypeEnum,
  INTERLINE,
  MARGIN,
  PAGE_WIDTH,
} from '../core/types';
import type { QuranTextServiceLike } from '../core/justification';

/**
 * Word click callback info
 */
export interface CSSWordClickInfo {
  pageIndex: number;
  lineIndex: number;
  wordIndex: number;
  text: string;
  element: HTMLElement;
}

/**
 * Options for CSS page rendering
 */
export interface CSSPageRenderOptions {
  /** Enable tajweed coloring */
  tajweedEnabled: boolean;
  /** Enable clickable words */
  enableWordClick?: boolean;
  /** Callback when a word is clicked */
  onWordClick?: (info: CSSWordClickInfo) => void;
}

/**
 * Configuration for CSSPageRenderer
 */
export interface CSSPageRendererConfig {
  /** Quran text service for text and line info */
  textService: QuranTextServiceLike;
  /** Mushaf layout type */
  mushafType: MushafLayoutType;
}

/**
 * Highlight group for verses or words
 */
export interface CSSHighlightGroup {
  /** Verses to highlight (identified by surah:ayah) */
  verses?: Array<{ surah: number; ayah: number }>;
  /** Individual words to highlight (page, line, word indices) */
  words?: Array<{ page: number; line: number; word: number }>;
  /** Highlight background color */
  color: string;
}

/**
 * Result of rendering a full page
 */
export interface CSSPageRenderResult {
  /** Array of rendered line elements */
  lineElements: HTMLElement[];
  /** Time taken to render in milliseconds */
  renderTime: number;
  /** Word elements for hit testing */
  wordElements?: Map<string, HTMLElement>;
}

/**
 * Detect Safari browser for workarounds
 */
const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

/**
 * CSS Page Renderer
 *
 * Renders a complete page of Quran text using CSS-based text rendering.
 * This is a simpler approach than SVG glyph rendering, using the browser's
 * native text rendering with OpenType font features.
 */
export class CSSPageRenderer {
  private textService: QuranTextServiceLike;
  private mushafType: MushafLayoutType;

  constructor(config: CSSPageRendererConfig) {
    this.textService = config.textService;
    this.mushafType = config.mushafType;
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
    options: CSSPageRenderOptions
  ): CSSPageRenderResult {
    console.log(`[CSSPageRenderer] renderPage() called for page ${pageIndex}, enableWordClick=${options.enableWordClick}, hasOnWordClick=${!!options.onWordClick}`);
    const startTime = performance.now();
    const quranText = this.textService.quranText;
    const lineCount = quranText[pageIndex].length;
    const lineElements: HTMLElement[] = [];
    const wordElements = new Map<string, HTMLElement>();

    const scale = viewport.width / PAGE_WIDTH;
    const defaultMargin = MARGIN * scale;
    const lineWidth = viewport.width - 2 * defaultMargin;
    const isFirstTwoPages = pageIndex === 0 || pageIndex === 1;

    // Render each line
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const isBism = isFirstTwoPages && lineIndex === 1;
      const lineInfo = this.textService.getLineInfo(pageIndex, lineIndex);
      const lineText = quranText[pageIndex][lineIndex];
      const lineElem = document.createElement('div');
      lineElem.classList.add('line');

      let margin = defaultMargin;

      // Line type 0: Content line (justified with CSS)
      if (lineInfo.lineType === 0 && !isBism) {
        if (lineInfo.lineWidthRatio !== 1) {
          const newLineWidth = lineWidth * lineInfo.lineWidthRatio;
          margin += (lineWidth - newLineWidth) / 2;
        }

        lineElem.style.marginLeft = margin + 'px';
        lineElem.style.marginRight = lineElem.style.marginLeft;
        lineElem.style.height = INTERLINE * scale + 'px';

        const innerSpan = document.createElement('div');
        innerSpan.classList.add('justifyline');

        // Handle sajda (prostration) marking or word-level rendering
        if (options.enableWordClick) {
          console.log(`[CSSPageRenderer] Rendering line ${lineIndex} with word click enabled`);
          this.renderLineWithWords(
            innerSpan,
            lineText,
            pageIndex,
            lineIndex,
            wordElements,
            options,
            lineInfo.sajda
          );
        } else if (lineInfo.sajda) {
          innerSpan.innerHTML = this.renderSajdaText(lineText, lineInfo.sajda);
        } else {
          innerSpan.textContent = lineText;
        }

        innerSpan.style.lineHeight = lineElem.style.height;
        innerSpan.style.fontSize = viewport.fontSize + 'px';
        lineElem.appendChild(innerSpan);

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

      } else if (lineInfo.lineType === 2 || isBism) {
        // Basmala line
        lineElem.style.textAlign = 'center';
        lineElem.style.marginLeft = margin + 'px';
        lineElem.style.marginRight = lineElem.style.marginLeft;
        lineElem.style.height = INTERLINE * scale + 'px';
        lineElem.classList.add('linebism');

        const innerSpan = document.createElement('span');
        innerSpan.textContent = lineText;

        if (isFirstTwoPages) {
          innerSpan.classList.add('bismfeature');
          if (isSafari) {
            if (this.mushafType !== MushafLayoutTypeEnum.IndoPak15Lines) {
              innerSpan.style.left = 350 * scale + 'px';
            }
            innerSpan.style.fontSize = viewport.fontSize + 'px';
          }
        } else {
          innerSpan.classList.add('basmfeature');
          if (isSafari) {
            if (this.mushafType === MushafLayoutTypeEnum.NewMadinah) {
              innerSpan.style.left = 700 * scale + 'px';
            } else if (this.mushafType === MushafLayoutTypeEnum.OldMadinah) {
              innerSpan.style.right = 1500 * scale + 'px';
            }
            innerSpan.style.fontSize = viewport.fontSize * 0.9 + 'px';
          }
        }

        innerSpan.style.lineHeight = lineElem.style.height;
        innerSpan.style.fontSize = viewport.fontSize * 0.95 + 'px';
        lineElem.appendChild(innerSpan);
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
   * Render a line with individual word spans for click handling
   */
  private renderLineWithWords(
    container: HTMLElement,
    lineText: string,
    pageIndex: number,
    lineIndex: number,
    wordElements: Map<string, HTMLElement>,
    options: CSSPageRenderOptions,
    sajda?: { text?: string }
  ): void {
    // Split line into words (by spaces)
    const words = lineText.split(' ');

    words.forEach((word, wordIndex) => {
      if (word.length === 0) return;

      const wordSpan = document.createElement('span');
      wordSpan.classList.add('quran-word');
      wordSpan.textContent = word;

      // Store word data attributes
      wordSpan.dataset.page = String(pageIndex);
      wordSpan.dataset.line = String(lineIndex);
      wordSpan.dataset.word = String(wordIndex);

      // Handle sajda marking on words
      if (sajda?.text && word.includes(sajda.text)) {
        wordSpan.classList.add('sajda');
      }

      // Add click handler if callback provided
      if (options.onWordClick) {
        wordSpan.style.cursor = 'pointer';
        wordSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          options.onWordClick!({
            pageIndex,
            lineIndex,
            wordIndex,
            text: word,
            element: wordSpan,
          });
        });
      }

      // Store in word elements map
      const key = `${pageIndex}:${lineIndex}:${wordIndex}`;
      wordElements.set(key, wordSpan);

      container.appendChild(wordSpan);

      // Add space between words (except last word)
      if (wordIndex < words.length - 1) {
        container.appendChild(document.createTextNode(' '));
      }
    });
  }

  /**
   * Render text with sajda (prostration) marking
   */
  private renderSajdaText(lineText: string, sajda: { text?: string }): string {
    if (sajda.text) {
      return lineText.replace(sajda.text, `<span class='sajda'>${sajda.text}</span>`);
    }
    return lineText;
  }

  /**
   * Apply highlights to word elements
   */
  applyHighlights(
    wordElements: Map<string, Element>,
    highlightGroups: CSSHighlightGroup[],
    pageIndex: number
  ): void {
    // Clear existing highlights
    for (const [, element] of wordElements) {
      if (element instanceof HTMLElement) {
        element.style.backgroundColor = '';
      }
      element.classList.remove('highlighted');
    }

    // Apply each highlight group
    for (const group of highlightGroups) {
      if (group.words) {
        for (const word of group.words) {
          if (word.page === pageIndex) {
            const key = `${word.page}:${word.line}:${word.word}`;
            const element = wordElements.get(key);
            if (element) {
              if (element instanceof HTMLElement) {
                element.style.backgroundColor = group.color;
              }
              element.classList.add('highlighted');
            }
          }
        }
      }
    }
  }
}
