import { Injectable } from '@angular/core';
import { MushafLayoutType, QuranTextService } from './qurantext.service';

// ============================================
// Types
// ============================================

export interface VerseRef {
  surah: number;
  ayah: number;
}

export interface WordPosition {
  page: number;
  line: number;
  word: number;
}

export interface VerseWordMapping {
  /** Map from "page:line:word" key to verse reference */
  wordToVerse: Map<string, VerseRef>;
  /** Map from "surah:ayah" key to array of word positions */
  verseToWords: Map<string, WordPosition[]>;
}

export interface WordClickInfo {
  pageNumber: number;
  lineIndex: number;
  wordIndex: number;
  text: string;
  surah?: number;
  ayah?: number;
}

export interface VerseClickInfo {
  surah: number;
  ayah: number;
  pageNumber: number;
}

export interface HighlightGroup {
  /** Verses to highlight (all words in these verses will be highlighted) */
  verses?: Array<{ surah: number; ayah: number }>;
  /** Individual words to highlight (page is 0-indexed) */
  words?: Array<{ page: number; line: number; word: number }>;
  /** Highlight background color */
  color: string;
}

// ============================================
// Unicode Constants
// ============================================

// Arabic-Indic digits (٠-٩)
const ARABIC_INDIC_ZERO = 0x0660;
const ARABIC_INDIC_NINE = 0x0669;

// End of Ayah marker (۝)
const END_OF_AYAH = 0x06dd;

// ============================================
// Helper Functions
// ============================================

function isArabicIndicDigit(charCode: number): boolean {
  return charCode >= ARABIC_INDIC_ZERO && charCode <= ARABIC_INDIC_NINE;
}

/**
 * Check if a word is an ayah marker (contains END_OF_AYAH character or is just digits)
 */
export function isAyahMarker(text: string): boolean {
  // Check if text contains END_OF_AYAH marker (۝)
  if (text.includes(String.fromCharCode(END_OF_AYAH))) return true;

  // Check if the word is primarily Arabic-Indic digits (verse number)
  // This handles cases where the marker might be just the number
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  // Check if ends with Arabic-Indic digit (common pattern for ayah markers)
  const lastChar = trimmed.charCodeAt(trimmed.length - 1);
  if (isArabicIndicDigit(lastChar)) {
    // Verify it's a number-only word (not a word ending in a digit)
    for (let i = 0; i < trimmed.length; i++) {
      const charCode = trimmed.charCodeAt(i);
      if (!isArabicIndicDigit(charCode) && charCode !== END_OF_AYAH) {
        return false;
      }
    }
    return true;
  }

  return false;
}

function arabicIndicToNumber(charCode: number): number {
  return charCode - ARABIC_INDIC_ZERO;
}

function extractVerseNumber(text: string, endIndex: number): number | null {
  let digits: number[] = [];
  let i = endIndex;

  while (i >= 0) {
    const charCode = text.charCodeAt(i);
    if (isArabicIndicDigit(charCode)) {
      digits.unshift(arabicIndicToNumber(charCode));
      i--;
    } else {
      break;
    }
  }

  if (digits.length === 0) {
    return null;
  }

  let result = 0;
  for (const digit of digits) {
    result = result * 10 + digit;
  }
  return result;
}

function wordKey(page: number, line: number, word: number): string {
  return `${page}:${line}:${word}`;
}

function verseKey(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

// ============================================
// Build Verse Mapping
// ============================================

export function buildVerseMapping(textService: QuranTextService): VerseWordMapping {
  const wordToVerse = new Map<string, VerseRef>();
  const verseToWords = new Map<string, WordPosition[]>();

  const quranText = textService.quranText;
  let currentSurah = 0;
  let currentAyah = 0;

  for (let pageIndex = 0; pageIndex < quranText.length; pageIndex++) {
    const page = quranText[pageIndex];

    for (let lineIndex = 0; lineIndex < page.length; lineIndex++) {
      const lineInfo = textService.getLineInfo(pageIndex, lineIndex);
      const lineText = page[lineIndex];

      // Skip surah headers (lineType 1)
      if (lineInfo.lineType === 1) {
        currentSurah++;
        currentAyah = 0;
        continue;
      }

      // Split line into words and track verse markers
      let wordIndex = 0;
      let wordStart = 0;
      let pendingVerseEnd = false;
      let detectedAyah = currentAyah;

      for (let i = 0; i <= lineText.length; i++) {
        const char = i < lineText.length ? lineText.charAt(i) : ' ';
        const charCode = i < lineText.length ? lineText.charCodeAt(i) : 0;

        // Check for end-of-ayah marker
        if (charCode === END_OF_AYAH) {
          pendingVerseEnd = true;
        }

        // Check for space (word boundary)
        if (char === ' ' || i === lineText.length) {
          if (i > wordStart) {
            // We have a word

            // Check if this word ends with a verse marker
            let verseNum: number | null = null;
            let checkIndex = i - 1;

            // Skip end-of-ayah marker if present
            if (checkIndex >= 0 && lineText.charCodeAt(checkIndex) === END_OF_AYAH) {
              checkIndex--;
            }

            // Check for digits before space
            if (checkIndex >= wordStart) {
              const prevCharCode = lineText.charCodeAt(checkIndex);
              if (isArabicIndicDigit(prevCharCode)) {
                verseNum = extractVerseNumber(lineText, checkIndex);
              }
            }

            // If this word contains a verse marker, update current ayah
            if (verseNum !== null) {
              detectedAyah = verseNum;
              currentAyah = verseNum;
            }

            // Map this word to current verse
            if (currentSurah > 0 && detectedAyah > 0) {
              const key = wordKey(pageIndex, lineIndex, wordIndex);
              const verse: VerseRef = { surah: currentSurah, ayah: detectedAyah };
              wordToVerse.set(key, verse);

              // Add to reverse map
              const vKey = verseKey(currentSurah, detectedAyah);
              let wordList = verseToWords.get(vKey);
              if (!wordList) {
                wordList = [];
                verseToWords.set(vKey, wordList);
              }
              wordList.push({ page: pageIndex, line: lineIndex, word: wordIndex });
            }

            wordIndex++;
          }
          wordStart = i + 1;

          // After processing word with verse marker, increment to next verse
          if (pendingVerseEnd) {
            pendingVerseEnd = false;
            currentAyah++;
            detectedAyah = currentAyah;
          }
        }
      }
    }
  }

  return { wordToVerse, verseToWords };
}

// ============================================
// Lookup Functions
// ============================================

export function getVerseForWord(
  mapping: VerseWordMapping,
  page: number,
  line: number,
  word: number
): VerseRef | undefined {
  return mapping.wordToVerse.get(wordKey(page, line, word));
}

export function getWordsForVerse(
  mapping: VerseWordMapping,
  surah: number,
  ayah: number
): WordPosition[] {
  return mapping.verseToWords.get(verseKey(surah, ayah)) || [];
}

export function getWordsForVerses(
  mapping: VerseWordMapping,
  verses: Array<{ surah: number; ayah: number }>
): WordPosition[] {
  const result: WordPosition[] = [];
  for (const verse of verses) {
    result.push(...getWordsForVerse(mapping, verse.surah, verse.ayah));
  }
  return result;
}

// ============================================
// Angular Service
// ============================================

@Injectable({
  providedIn: 'root',
})
export class VerseMappingService {
  private mappings = new Map<MushafLayoutType, VerseWordMapping>();

  /**
   * Get or build verse mapping for a text service
   */
  getMapping(textService: QuranTextService): VerseWordMapping {
    const cached = this.mappings.get(textService.mushafType);
    if (cached) {
      return cached;
    }

    const mapping = buildVerseMapping(textService);
    this.mappings.set(textService.mushafType, mapping);
    return mapping;
  }

  /**
   * Get verse reference for a word
   */
  getVerseForWord(
    textService: QuranTextService,
    page: number,
    line: number,
    word: number
  ): VerseRef | undefined {
    const mapping = this.getMapping(textService);
    return getVerseForWord(mapping, page, line, word);
  }

  /**
   * Get all word positions for a verse
   */
  getWordsForVerse(
    textService: QuranTextService,
    surah: number,
    ayah: number
  ): WordPosition[] {
    const mapping = this.getMapping(textService);
    return getWordsForVerse(mapping, surah, ayah);
  }

  /**
   * Get all word positions for multiple verses
   */
  getWordsForVerses(
    textService: QuranTextService,
    verses: Array<{ surah: number; ayah: number }>
  ): WordPosition[] {
    const mapping = this.getMapping(textService);
    return getWordsForVerses(mapping, verses);
  }
}
