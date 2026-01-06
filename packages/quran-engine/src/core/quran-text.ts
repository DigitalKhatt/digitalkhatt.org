/**
 * Quran Text Service for DigitalKhatt React
 * Ported from Angular implementation
 *
 * Handles Quran text data, page layouts, and line information
 */

import type { MushafLayoutType, LineInfo, QuranOutlineItem } from './types';

// ============================================
// Line Width Ratios by Mushaf Type
// ============================================

const oldMadinaLineWidths = new Map<number, number>([
  [600 * 15 + 9, 0.84],
  [602 * 15 + 5, 0.61],
  [602 * 15 + 15, 0.59],
  [603 * 15 + 10, 0.68],
  [604 * 15 + 4, 0.836],
  [604 * 15 + 9, 0.836],
  [604 * 15 + 14, 0.717],
  [604 * 15 + 15, 0.54],
]);

const newMadinaLineWidths = new Map<number, number>([
  [255 * 15 + 2, 0.74],
  [528 * 15 + 9, 0.6],
  [534 * 15 + 6, 0.7],
  [545 * 15 + 6, 0.75],
  [586 * 15 + 1, 0.81],
  [593 * 15 + 2, 0.81],
  [594 * 15 + 5, 0.63],
  [600 * 15 + 10, 0.75],
  [602 * 15 + 5, 0.63],
  [602 * 15 + 11, 0.9],
  [602 * 15 + 15, 0.53],
  [603 * 15 + 10, 0.66],
  [603 * 15 + 15, 0.6],
  [604 * 15 + 4, 0.55],
  [604 * 15 + 9, 0.55],
  [604 * 15 + 14, 0.675],
  [604 * 15 + 15, 0.5],
]);

const indoPak15LineWidths = new Map<number, number>([
  [255 * 15 + 4, 0.9],
  [312 * 15 + 4, 0.6],
  [331 * 15 + 12, 0.7],
  [349 * 15 + 15, 0.9],
  [396 * 15 + 8, 0.7],
  [417 * 15 + 15, 0.8],
  [440 * 15 + 7, 0.5],
  [452 * 15 + 11, 0.8],
  [495 * 15 + 11, 0.8],
  [498 * 15 + 7, 0.7],
  [510 * 15 + 15, 0.6],
  [523 * 15 + 8, 0.8],
  [528 * 15 + 11, 0.7],
  [531 * 15 + 7, 0.7],
  [548 * 15 + 15, 0.5],
  [554 * 15 + 9, 0.7],
  [569 * 15 + 10, 0.8],
  [573 * 15 + 12, 0.3],
  [576 * 15 + 2, 0.5],
  [577 * 15 + 15, 0.5],
  [580 * 15 + 5, 0.7],
  [581 * 15 + 15, 0.5],
  [584 * 15 + 2, 0.3],
  [590 * 15 + 10, 0.8],
  [591 * 15 + 11, 0.5],
  [592 * 15 + 8, 0.7],
  [594 * 15 + 2, 0.8],
  [595 * 15 + 3, 0.6],
  [596 * 15 + 4, 0.7],
  [596 * 15 + 15, 0.6],
  [598 * 15 + 9, 0.8],
  [599 * 15 + 15, 0.5],
  [602 * 15 + 2, 0.5],
  [602 * 15 + 15, 0.5],
  [605 * 15 + 10, 0.5],
  [606 * 15 + 2, 0.5],
  [606 * 15 + 9, 0.8],
  [606 * 15 + 15, 0.7],
  [609 * 15 + 11, 0.7],
  [609 * 15 + 15, 0.7],
  [610 * 15 + 5, 0.5],
  [610 * 15 + 10, 0.7],
]);

// ============================================
// Text Adjustment
// ============================================

/**
 * Adjust text for proper hamza reordering
 */
function adjustText(text: string): string {
  let newText = text.replaceAll('\u0627\u0653', '\u0627\u034F\u0653');
  newText = newText.replaceAll('\u0627\u0654', '\u0627\u034F\u0654\u034F');
  newText = newText.replaceAll('\u0648\u0654', '\u0648\u034F\u0654\u034F');
  newText = newText.replaceAll('\u064A\u0654', '\u064A\u034F\u0654\u034F');
  return newText;
}

// ============================================
// QuranTextService Class
// ============================================

export class QuranTextService {
  private quranInfo: LineInfo[][] = [];
  private _outline: QuranOutlineItem[] = [];
  private _quranText: string[][];
  private _sajdas: Array<{ pageIndex: number; lineIndex: number; startWordIndex: number; endWordIndex: number }> = [];

  readonly mushafType: MushafLayoutType;

  constructor(quranText: string[][], mushafType: MushafLayoutType) {
    this.mushafType = mushafType;
    // Adjust text for proper hamza reordering
    this._quranText = quranText.map((page) => page.map((line) => adjustText(line)));

    const suraWord = 'سُورَةُ';
    const bism = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

    const surabismpattern =
      '^(?<sura>' +
      suraWord +
      ' .*)|(?<bism>' +
      bism +
      '|' +
      'بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ' +
      '|' +
      'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ ۝' + // indopak
      ')$';

    let sajdapatterns =
      '(وَٱسْجُدْ) وَٱقْتَرِب|(خَرُّوا۟ سُجَّدࣰا)|(وَلِلَّهِ يَسْجُدُ)|(يَسْجُدُونَ)۩|(فَٱسْجُدُوا۟ لِلَّهِ)|(وَٱسْجُدُوا۟ لِلَّهِ)|(أَلَّا يَسْجُدُوا۟ لِلَّهِ)|(وَخَرَّ رَاكِعࣰا)|(يَسْجُدُ لَهُ)|(يَخِرُّونَ لِلْأَذْقَانِ سُجَّدࣰا)|(ٱسْجُدُوا۟) لِلرَّحْمَٰنِ|ٱرْكَعُوا۟ (وَٱسْجُدُوا۟)';
    sajdapatterns = adjustText(sajdapatterns);

    const sajdaRegExpr = new RegExp(sajdapatterns, 'du');
    const regexpr = new RegExp(surabismpattern, 'u');

    // Select line width map based on mushaf type
    const madinaLineWidths =
      mushafType === 2 // OldMadinah
        ? new Map(oldMadinaLineWidths)
        : mushafType === 1 // NewMadinah
          ? new Map(newMadinaLineWidths)
          : new Map(indoPak15LineWidths);

    // Add first page line widths
    if (mushafType === 2) {
      // OldMadinah
      const ratio = 0.9;
      for (let pageIndex = 0; pageIndex < 2; pageIndex++) {
        const pageNumber = pageIndex + 1;
        madinaLineWidths.set(pageNumber * 15 + 2, ratio * (pageIndex === 0 ? 0.5 : 0.43));
        madinaLineWidths.set(pageNumber * 15 + 3, ratio * 0.7);
        madinaLineWidths.set(pageNumber * 15 + 4, ratio * 0.9);
        madinaLineWidths.set(pageNumber * 15 + 5, ratio);
        madinaLineWidths.set(pageNumber * 15 + 6, ratio * 0.9);
        madinaLineWidths.set(pageNumber * 15 + 7, ratio * 0.7);
        madinaLineWidths.set(pageNumber * 15 + 8, ratio * 0.4);
      }
    } else if (mushafType === 1) {
      // NewMadinah
      for (let pageIndex = 0; pageIndex < 2; pageIndex++) {
        const ratio = pageIndex === 0 ? 0.95 : 0.95;
        const pageNumber = pageIndex + 1;
        madinaLineWidths.set(pageNumber * 15 + 2, ratio * (pageIndex === 0 ? 0.5 : 0.45));
        madinaLineWidths.set(pageNumber * 15 + 3, ratio * 0.7);
        madinaLineWidths.set(pageNumber * 15 + 4, ratio * 0.9);
        madinaLineWidths.set(pageNumber * 15 + 5, ratio);
        madinaLineWidths.set(pageNumber * 15 + 6, ratio * 0.9);
        madinaLineWidths.set(pageNumber * 15 + 7, ratio * 0.7);
        madinaLineWidths.set(pageNumber * 15 + 8, ratio * 0.4);
      }
    } else {
      // IndoPak
      const ratio = 0.7;
      for (let pageIndex = 0; pageIndex < 2; pageIndex++) {
        const pageNumber = pageIndex + 1;
        madinaLineWidths.set(pageNumber * 15 + 2, ratio * 0.8);
        madinaLineWidths.set(pageNumber * 15 + 3, ratio);
        madinaLineWidths.set(pageNumber * 15 + 4, ratio);
        madinaLineWidths.set(pageNumber * 15 + 5, ratio);
        madinaLineWidths.set(pageNumber * 15 + 6, ratio);
        madinaLineWidths.set(pageNumber * 15 + 7, ratio);
        madinaLineWidths.set(pageNumber * 15 + 8, ratio);
      }
    }

    // Parse all pages and lines
    for (let pageIndex = 0; pageIndex < this._quranText.length; pageIndex++) {
      const pageInfo: LineInfo[] = [];
      this.quranInfo.push(pageInfo);
      const page = this._quranText[pageIndex];

      for (let lineIndex = 0; lineIndex < page.length; lineIndex++) {
        const line = page[lineIndex];
        const lineInfo: LineInfo = {
          lineWidthRatio: madinaLineWidths.get((pageIndex + 1) * 15 + lineIndex + 1) || 1,
          lineType: 0, // Content
        };
        pageInfo.push(lineInfo);

        const match = line.match(regexpr);
        if (match?.groups?.sura) {
          lineInfo.lineType = 1; // Sura
          this._outline.push({
            name: match.groups.sura,
            page: pageIndex,
          });
        } else if (match?.groups?.bism) {
          lineInfo.lineType = 2; // Basmala
        }

        // Check for sajda markers
        const sajdaMatch = line.match(sajdaRegExpr) as RegExpMatchArray & { indices?: number[][] };
        if (sajdaMatch) {
          for (let i = 1; i < sajdaMatch.length; i++) {
            if (sajdaMatch[i]) {
              const pos = sajdaMatch.indices?.[i];
              if (!pos) continue;

              let startWordIndex: number | null = null;
              let endWordIndex: number | null = null;
              let currentWordIndex = 0;

              for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line.charAt(charIndex);
                const isSpace = char === ' ';

                if (startWordIndex === null && charIndex >= pos[0]) {
                  startWordIndex = currentWordIndex;
                }

                if (charIndex >= pos[1]) {
                  endWordIndex = currentWordIndex;
                  break;
                }

                if (isSpace) {
                  currentWordIndex++;
                }
              }

              if (startWordIndex !== null && endWordIndex !== null) {
                lineInfo.sajda = { startWordIndex, endWordIndex };
                this._sajdas.push({ pageIndex, lineIndex, startWordIndex, endWordIndex });
              }
            }
          }
        }
      }
    }
  }

  getLineInfo(pageIndex: number, lineIndex: number): LineInfo {
    return this.quranInfo[pageIndex][lineIndex];
  }

  get outline(): QuranOutlineItem[] {
    return this._outline;
  }

  get nbPages(): number {
    return this._quranText.length;
  }

  get sajdas(): Array<{ pageIndex: number; lineIndex: number; startWordIndex: number; endWordIndex: number }> {
    return this._sajdas;
  }

  get quranText(): string[][] {
    return this._quranText;
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a QuranTextService from text data
 */
export function createQuranTextService(quranText: string[][], mushafType: MushafLayoutType): QuranTextService {
  return new QuranTextService(quranText, mushafType);
}

/**
 * Load Quran text from URL and create service
 */
export async function loadQuranTextService(textUrl: string, mushafType: MushafLayoutType): Promise<QuranTextService> {
  const response = await fetch(textUrl);
  const quranText = await response.json();
  return new QuranTextService(quranText, mushafType);
}
