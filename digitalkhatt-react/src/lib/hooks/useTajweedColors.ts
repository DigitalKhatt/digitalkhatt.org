/**
 * useTajweedColors Hook
 *
 * A convenience hook for working with tajweed colors in React components.
 * Provides access to current colors and a method to update them.
 */

import { useCallback } from 'react';
import { useDigitalKhatt } from '../components/QuranProvider';
import type { TajweedClass, TajweedColorConfig } from '@digitalkhatt/quran-engine';
import { DEFAULT_TAJWEED_COLORS } from '@digitalkhatt/quran-engine';

/**
 * Tajweed color information with descriptions
 */
export interface TajweedColorInfo {
  key: TajweedClass;
  color: string;
  name: string;
  arabicName: string;
  description: string;
}

/**
 * Descriptions for each tajweed rule
 */
const TAJWEED_DESCRIPTIONS: Record<TajweedClass, { name: string; arabicName: string; description: string }> = {
  tafkim: {
    name: 'Tafkheem',
    arabicName: 'تفخيم',
    description: 'Heavy/emphatic pronunciation of certain letters',
  },
  lkalkala: {
    name: 'Qalqalah',
    arabicName: 'قلقلة',
    description: 'Echoing sound on letters ق ط ب ج د when they have sukoon',
  },
  lgray: {
    name: 'Silent Letters',
    arabicName: 'حروف ساكنة',
    description: 'Letters that are written but not pronounced (e.g., Hamza Wasl)',
  },
  green: {
    name: 'Ghunnah/Ikhfa/Idgham',
    arabicName: 'غنة / إخفاء / إدغام',
    description: 'Nasal sound rules and assimilation',
  },
  red1: {
    name: 'Madd (2 counts)',
    arabicName: 'مد طبيعي',
    description: 'Natural elongation of 2 counts',
  },
  red2: {
    name: 'Madd Jaiz (4-5 counts)',
    arabicName: 'مد جائز',
    description: 'Permissible elongation of 4-5 counts',
  },
  red3: {
    name: 'Madd Wajib (4-5 counts)',
    arabicName: 'مد واجب',
    description: 'Obligatory elongation of 4-5 counts',
  },
  red4: {
    name: 'Madd Lazim (6 counts)',
    arabicName: 'مد لازم',
    description: 'Compulsory elongation of 6 counts',
  },
};

export interface UseTajweedColorsReturn {
  /** Current tajweed colors */
  colors: Record<TajweedClass, string>;
  /** Default tajweed colors */
  defaultColors: Record<TajweedClass, string>;
  /** Update one or more tajweed colors */
  setColors: (colors: TajweedColorConfig) => void;
  /** Reset all colors to defaults */
  resetColors: () => void;
  /** Reset a specific color to default */
  resetColor: (key: TajweedClass) => void;
  /** Get detailed information about all colors */
  getColorInfo: () => TajweedColorInfo[];
  /** Get CSS custom properties string for current colors */
  getCSSVariables: () => string;
}

/**
 * Hook for working with tajweed colors
 *
 * @example
 * ```tsx
 * function TajweedSettings() {
 *   const { colors, setColors, resetColors, getColorInfo } = useTajweedColors();
 *
 *   return (
 *     <div>
 *       {getColorInfo().map(info => (
 *         <div key={info.key}>
 *           <label>{info.name}: </label>
 *           <input
 *             type="color"
 *             value={info.color}
 *             onChange={e => setColors({ [info.key]: e.target.value })}
 *           />
 *         </div>
 *       ))}
 *       <button onClick={resetColors}>Reset to Defaults</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTajweedColors(): UseTajweedColorsReturn {
  const { tajweedColors, setTajweedColors } = useDigitalKhatt();

  const resetColors = useCallback(() => {
    setTajweedColors(DEFAULT_TAJWEED_COLORS);
  }, [setTajweedColors]);

  const resetColor = useCallback(
    (key: TajweedClass) => {
      setTajweedColors({ [key]: DEFAULT_TAJWEED_COLORS[key] });
    },
    [setTajweedColors]
  );

  const getColorInfo = useCallback((): TajweedColorInfo[] => {
    return (Object.keys(tajweedColors) as TajweedClass[]).map((key) => ({
      key,
      color: tajweedColors[key],
      ...TAJWEED_DESCRIPTIONS[key],
    }));
  }, [tajweedColors]);

  const getCSSVariables = useCallback((): string => {
    return Object.entries(tajweedColors)
      .map(([key, color]) => `--tajweed-${key}: ${color};`)
      .join('\n');
  }, [tajweedColors]);

  return {
    colors: tajweedColors,
    defaultColors: DEFAULT_TAJWEED_COLORS,
    setColors: setTajweedColors,
    resetColors,
    resetColor,
    getColorInfo,
    getCSSVariables,
  };
}
