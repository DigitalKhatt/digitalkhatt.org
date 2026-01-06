/**
 * @digitalkhatt/quran-engine - Data Module
 *
 * Quran text data loaders and utilities.
 * Text data is bundled separately and can be imported as needed (tree-shakeable).
 */

// Re-export Quran text service for loading text data
export { QuranTextService, createQuranTextService, loadQuranTextService } from '../core/quran-text';

// Note: Quran text data files (~1.5MB each) should be imported separately:
//
// For New Madinah layout:
//   import { quranTextNewMadinah } from '@digitalkhatt/quran-engine/data/new-madinah';
//
// For Old Madinah layout:
//   import { quranTextOldMadinah } from '@digitalkhatt/quran-engine/data/old-madinah';
//
// For IndoPak 15 Lines layout:
//   import { quranTextIndoPak15 } from '@digitalkhatt/quran-engine/data/indopak15';
//
// These will be added when the full text data is bundled with the package.
