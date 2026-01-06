/**
 * Verse Mapping Service
 *
 * Maps word positions (page, line, word) to verse references (surah, ayah)
 * and provides reverse lookups for verse-level highlighting.
 */

import type { QuranTextService } from './quran-text';

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

/**
 * Check if a character is an Arabic-Indic digit
 */
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

/**
 * Convert Arabic-Indic digit to number
 */
function arabicIndicToNumber(charCode: number): number {
  return charCode - ARABIC_INDIC_ZERO;
}

/**
 * Extract verse number from text at given position
 * Returns the verse number if found, null otherwise
 */
function extractVerseNumber(text: string, endIndex: number): number | null {
  // Work backwards from endIndex to find all digits
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

  // Convert digits array to number
  let result = 0;
  for (const digit of digits) {
    result = result * 10 + digit;
  }
  return result;
}

/**
 * Create a key for the word-to-verse map
 */
function wordKey(page: number, line: number, word: number): string {
  return `${page}:${line}:${word}`;
}

/**
 * Create a key for the verse-to-words map
 */
function verseKey(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

// ============================================
// Main Functions
// ============================================

/**
 * Build verse mapping from QuranTextService
 *
 * This scans through all text to:
 * 1. Detect surah headers to track current surah
 * 2. Detect verse markers (Arabic-Indic numbers + end-of-ayah marker)
 * 3. Map each word to its surah:ayah reference
 */
export function buildVerseMapping(textService: QuranTextService): VerseWordMapping {
  const wordToVerse = new Map<string, VerseRef>();
  const verseToWords = new Map<string, WordPosition[]>();

  const quranText = textService.quranText;
  let currentSurah = 0; // Will be incremented when we see surah headers
  let currentAyah = 0;

  // Process each page
  for (let pageIndex = 0; pageIndex < quranText.length; pageIndex++) {
    const page = quranText[pageIndex];

    // Process each line
    for (let lineIndex = 0; lineIndex < page.length; lineIndex++) {
      const lineInfo = textService.getLineInfo(pageIndex, lineIndex);
      const lineText = page[lineIndex];

      // Skip surah headers (lineType 1)
      if (lineInfo.lineType === 1) {
        // New surah starting
        currentSurah++;
        currentAyah = 0;
        continue;
      }

      // Handle basmala lines (lineType 2)
      // Basmala is either verse 1 of a surah or not counted (for Al-Fatiha and At-Tawbah)
      if (lineInfo.lineType === 2) {
        // For surahs that start with basmala as verse 1 (Al-Fatiha)
        // or surahs where basmala is separate (most surahs)
        // We'll detect the verse number from the text
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
            // Look for Arabic-Indic digits at the end
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
            // Use detectedAyah which may have just been updated
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
            // Next word will be in the next verse
            currentAyah++;
            detectedAyah = currentAyah;
          }
        }
      }
    }
  }

  return { wordToVerse, verseToWords };
}

/**
 * Get the verse reference for a word at given position
 */
export function getVerseForWord(
  mapping: VerseWordMapping,
  page: number,
  line: number,
  word: number
): VerseRef | undefined {
  return mapping.wordToVerse.get(wordKey(page, line, word));
}

/**
 * Get all word positions for a given verse
 */
export function getWordsForVerse(
  mapping: VerseWordMapping,
  surah: number,
  ayah: number
): WordPosition[] {
  return mapping.verseToWords.get(verseKey(surah, ayah)) || [];
}

/**
 * Get all word positions for multiple verses
 */
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
