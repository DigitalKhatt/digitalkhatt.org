/**
 * Tajweed Service for DigitalKhatt React
 * Ported from Angular implementation
 *
 * Applies Tajweed (Quran recitation rules) coloring to text
 */

import type { QuranTextService } from './quran-text';

// ============================================
// Character Constants
// ============================================

const rightNoJoinLetters = 'ادذرزوؤأٱإءة';
const dualJoinLetters = 'بتثجحخسشصضطظعغفقكلمنهيئى';
const bases = rightNoJoinLetters + dualJoinLetters;
const IkfaaLetters = 'صذثكجشقسدطزفتضظ';

const fathatan = '\u064B';
const dammatan = '\u064C';
const kasratan = '\u064D';
const fatha = '\u064E';
const damma = '\u064F';
const kasra = '\u0650';
const shadda = '\u0651';
const sukuns = '\u0652\u06E1';
const openfathatan = '\u08F0';
const opendammatan = '\u08F1';
const openkasratan = '\u08F2';
const tanween = fathatan + dammatan + kasratan;
const opentanween = openfathatan + opendammatan + openkasratan;
const alltanween = tanween + opentanween;
const fdk = fatha + damma + kasra;
const fdkt = fdk + alltanween;
const harakat = fdkt + sukuns + shadda;

const prefereWaslIndoPak = '\u08D5\u0617\u08D7';
const mandatoryWaqfIndoPak = '\u08DE\u08DF\u08DD\u08DB';
const prefereWaqfIndoPak = '\u0615\u08D6';
const takhallus = '\u0614';
const disputedEndofAyah = '\u08E2';

const prefereWasl = '\u06D6' + prefereWaslIndoPak;
const prefereWaqf = '\u06D7' + prefereWaqfIndoPak;
const mandatoryWaqf = '\u06D8' + mandatoryWaqfIndoPak;
const forbiddenWaqf = '\u06D9';
const permissibleWaqf = '\u06DA';
const waqfInOneOfTwo = '\u06DB';

const waqfMarks =
  prefereWasl +
  prefereWaqf +
  mandatoryWaqf +
  forbiddenWaqf +
  permissibleWaqf +
  waqfInOneOfTwo +
  disputedEndofAyah;
const maddah = '\u0653';
const maddawaajib = '\u089C';
const maddClass = `[${maddah}${maddawaajib}]`;
const ziaditHarf = '\u06DF';
const ziaditHarfWasl = '\u06E0';
const meemiqlab = '\u06E2';
const lowmeemiqlab = '\u06ED';
const daggerAlef = '\u0670';
const smallWaw = '\u06E5';
const smallYeh = '\u06E6';
const invertedDamma = '\u0657';
const subAlef = '\u0656';
const smallMadd = daggerAlef + smallWaw + smallYeh + invertedDamma + subAlef;
const smallHighYeh = '\u06E7';
const smallHighWaw = '\u08F3';
const highCircle = '\u06EC';
const lowCircle = '\u065C';
const hamzaabove = '\u0654';
const hamzabelow = '\u0655';
const smallHighSeen = '\u06DC';
const smallLowSeen = '\u06E3';
const smallHighNoon = '\u06E8';
const cgi = '\u034F';

const marks =
  harakat +
  waqfMarks +
  maddah +
  maddawaajib +
  ziaditHarf +
  ziaditHarfWasl +
  meemiqlab +
  lowmeemiqlab +
  smallMadd +
  smallHighYeh +
  smallHighWaw +
  highCircle +
  lowCircle +
  hamzaabove +
  hamzabelow +
  smallHighSeen +
  smallLowSeen +
  smallHighNoon +
  cgi +
  takhallus;

const elevationChars = 'طقصخغضظ';
let loweringChars = '';
let digits = '';

// Initialize character sets
for (let i = 0; i < bases.length; i++) {
  if (elevationChars.indexOf(bases[i]) === -1) {
    loweringChars += bases[i];
  }
}
for (let digit = 1632; digit <= 1641; digit++) {
  digits += String.fromCharCode(digit);
}

// ============================================
// Regular Expression Patterns
// ============================================

const ayaCond = '\\s?[۩]?\\s?۝';
const waqfCond = `(?:${ayaCond}|[${prefereWasl + prefereWaqf + mandatoryWaqf + permissibleWaqf}]|$)`;
const endWordCond = '(?:\\s|$)';
const endMarksCondOpt = `(?:[${waqfMarks + takhallus + disputedEndofAyah}]*)`;
const beforeAyaCond = `[${digits}۞][${waqfMarks}]?\\s`;
const lamlamhehOfAllahSWTSeq = `\u0644[${marks}]*ل[${marks}]*ه[${marks}]*${endWordCond}`;
const kasras = kasra + kasratan + openkasratan;

// Build Tafkhim pattern
let tafkhimPattern = `(?<kalkala1>[طقدجب][${sukuns}])`;
tafkhimPattern += `|(?<kalkala2>[طقدجب]${shadda}?)(?=[${marks}]*${waqfCond})`;
tafkhimPattern += `|(?<tafkhim1>[${elevationChars}]${shadda}?[${fdk + sukuns}]?)`;
tafkhimPattern += `|(?<=\\sا${kasra})(?<tafkhim_reh1>ر[${sukuns}])`;
tafkhimPattern += `|(?<=${kasra}|${kasra}[${loweringChars}][${sukuns}]|[ي][${sukuns}]?|\u0650\u0637\u0652)ر(?<tafkhim2>[${marks}]*)(?<tafkhim2_1>${waqfCond})`;
tafkhimPattern += `|(?<tafkhim3>ر)(?<tafkhim4>[${marks}]*)(?<tafkhim4_1>${waqfCond})`;
tafkhimPattern += `|ر(?=${shadda}?[${kasras}])`;
tafkhimPattern += `|(?<=${kasra})ر[${sukuns}](?![${elevationChars}]${fatha})`;
tafkhimPattern += `|(?<tafkhim5>ر[${fdk + sukuns + shadda}]*)`;
tafkhimPattern += `|(?<=^|[${fatha + damma + mandatoryWaqf + prefereWaqf + permissibleWaqf + prefereWasl}](?:[${forbiddenWaqf}]|ا${ziaditHarf})?[ياى]?\\s?|${beforeAyaCond}|وا[${ziaditHarf}]?\\s|${takhallus}\\s|\u0670\u089C)(?:[ٱ]|\u0627\u034f?\u0653|\u0627\u064E?)ل(?<tafkhim6>ل[${marks}]*)ه[${marks}]*م?[${marks}]*${endWordCond}`;
tafkhimPattern += `|\u0627\u0670\u089Cل(?<tafkhim6_2>ل[${marks}]*)ه[${marks}]*م?[${marks}]*${endWordCond}`;
tafkhimPattern += `|(?<gray3>[${bases}][${ziaditHarf}])`;
tafkhimPattern += `|(?<=[و][${sukuns}]?${maddClass}?|[و]${cgi}?\u0654${cgi}?[${damma}${dammatan}]|[و][${damma}]|[${damma}${sukuns}][و][${fatha}])(?<gray3_indopak_1>[ا])(?=${endMarksCondOpt}(?:${endWordCond}|(?:${ayaCond})))`;
tafkhimPattern += `|(?<=[${kasra}])(?<gray3_indopak_2>[ا])(?=[${bases}])(?!${lamlamhehOfAllahSWTSeq})`;

const TafkhimRE = new RegExp(tafkhimPattern, 'gdu');

// Build Others pattern (Madinah)
const greyHamzatWaslInsideWordMadinah = `(?<=[${bases}][${marks}]*)(?<gray1>ٱ)(?!${lamlamhehOfAllahSWTSeq})`;
let othersPattern = greyHamzatWaslInsideWordMadinah;
othersPattern += `|(?<=[اٱ])(?<gray2>ل(?![${marks}]*ل[${marks}]*ه[${marks}]*${endWordCond}))(?=[${bases}])`;
const greyWawYehMadinah = `|(?<gray4>[و])(?=${daggerAlef})|(?<gray4_1>[ى])(?=${daggerAlef}[${bases}])`;
othersPattern += greyWawYehMadinah;
othersPattern += `|(?<=${maddClass})(?<gray7>[وي])(?=${cgi}?${hamzaabove}${cgi}?[${marks}]*(?:ا[${ziaditHarf}]?)?${endWordCond})`;
othersPattern += `|(?<=${maddClass})(?<gray8>ل)(?=\u0630\u0651)`;
othersPattern += `|(?<tanween1>ن${meemiqlab}${cgi}?[${sukuns}]?)`;
othersPattern += `|(?<!${beforeAyaCond}|^)(?<tanween2>[من]${shadda}(?:[${fdkt}]|(?=${daggerAlef})))(?!${maddawaajib})`;
othersPattern += `|(?<tanween3>[${meemiqlab + lowmeemiqlab}])(?=(?:ا[${ziaditHarf}]?)?(?<tanween3_a>${ayaCond})?)`;
othersPattern += `|(?<tanween4>م[${sukuns}]?)(?=\\sب)`;
othersPattern += `|(?<tanween5>ن[${bases}])`;
othersPattern += `|(?<tanween6>[ن${opentanween}${tanween}][${sukuns}]?)[${bases}]?\u06DF?${endMarksCondOpt}\\s(?<tanween7>[ينمو](?:[${shadda}]?[${fdkt}]|[${shadda}](?=${daggerAlef})))`;
othersPattern += `|(?<tanween8>[ن${opentanween}${tanween}][${sukuns}]?)[${bases}]?${endMarksCondOpt}\\s?[لر][${shadda}]`;
othersPattern += `|(?<tanween9>[${opentanween}${tanween}][${sukuns}]?)[${bases}]?${endMarksCondOpt}\\s?[${IkfaaLetters}]`;
othersPattern += `|(?<tanween9_noon>[ن][${sukuns}]?)[${bases}]?\\s?[${IkfaaLetters}]`;
othersPattern += `|(?<=[${fdk}])(?<gray6>[${bases}])(?<gray6_sukuns>[${sukuns}]?)(?=\\s?(?<gray6_1>[${bases}]${shadda}))`;
othersPattern += `|(?<tanween10>ـۨ[${sukuns}]?)`;

const madJaizAssert = `(?=[و\u0649]?[${bases}][${harakat}][${marks}]?${waqfCond}|\u0647\u0650\u06DB)(?!ا[${ziaditHarf}])`;

othersPattern += `|(?<!\\s|^)(?<madd5>(?:[يو${daggerAlef}${subAlef}][${sukuns}]?|[ا]))${madJaizAssert}`;
othersPattern += `|(?<madd4_1>[ى]${daggerAlef}${maddClass})${endWordCond}(?=(?<madd4_1_aya>${ayaCond})?)`;
othersPattern += `|(?<madd4_4>${daggerAlef}${maddClass})[ي][\u06D9]?${endWordCond}(?=(?<madd4_4_aya>${ayaCond})?)`;
othersPattern += `|(?<=[ى])${daggerAlef}[${waqfMarks}]?${endWordCond}`;
othersPattern += `|(?<madd1>[او${smallMadd}]${cgi}?[${sukuns}]?${maddClass})(?=[${bases}][${shadda}${sukuns}]|[${bases}][${bases}])(?!وا)`;
othersPattern += `|(?<madd4_2>[اويى${smallMadd}]${cgi}?[${sukuns}]?${maddClass})(?=(?:ا[${ziaditHarf}])?(?<madd4_2_a>${waqfCond})?)`;
othersPattern += `|(?<madd5_1>ـ[${smallHighYeh}])${madJaizAssert}`;
othersPattern += `|(?<madd2_1>ـ[${smallHighYeh}])(?![${harakat}])`;
othersPattern += `|(?<madd2>[${smallMadd}])(?!${cgi}?${hamzaabove}|[${fdkt}]|${ayaCond})`;
othersPattern += `|[او${smallMadd}]${cgi}?[${sukuns}]?${maddClass}${ayaCond}`;
othersPattern += `|(?<madd3>[نكعصلمسق][${shadda}]?[${fatha}]?${maddClass})`;
othersPattern += `|(?<madd4_3>ࣳٓ)`;

const OthersREMadinah = new RegExp(othersPattern, 'gdu');

// Build IndoPak variant
const greyWawYehIndopak = `|(?<=${daggerAlef}${maddah}?)(?<gray4>[و])(?=[${bases}])|(?<gray4_1>[ى])(?=[${bases}])|(?<gray4_2>[و](?=[${bases.replace('ا', '')}]))`;
const greyHamzatWaslInsideWordIndoPak = `(?<=[${bases}][${marks}]*)(?<gray1>ا)(?!${lamlamhehOfAllahSWTSeq})(?=[${bases}][${sukuns}${shadda}]|ل[${bases}])`;

let othersPatternIndopak = othersPattern.replace(greyWawYehMadinah, greyWawYehIndopak);
othersPatternIndopak = othersPatternIndopak.replace(greyHamzatWaslInsideWordMadinah, greyHamzatWaslInsideWordIndoPak);

const OthersREIndoPak = new RegExp(othersPatternIndopak, 'gdu');

// ============================================
// Tajweed Application
// ============================================

type TajweedSetter = (pos: number, tajweed: string | undefined) => void;

/**
 * Apply Tajweed coloring rules to text
 */
function applyTajweedForText(
  text: string,
  setTajweed: TajweedSetter,
  resetIndex: () => void,
  isIndopak: boolean
): void {
  let match: RegExpExecArray | null;
  let group: number[] | undefined;
  const OthersRE = isIndopak ? OthersREIndoPak : OthersREMadinah;

  // Apply Tafkhim patterns
  TafkhimRE.lastIndex = 0;
  while ((match = TafkhimRE.exec(text)) !== null) {
    const matchWithIndices = match as RegExpExecArray & { indices?: { groups?: Record<string, number[]> } };
    const groups = matchWithIndices.indices?.groups;
    if (!groups) continue;

    if ((group = groups.tafkhim_reh1)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'tafkim');
      setTajweed(firstPos + 1, 'tafkim');
    } else if ((group = groups.tafkhim1 || groups.tafkhim5 || groups.tafkhim6 || groups.tafkhim6_2)) {
      for (let pos = group[0]; pos < group[1]; pos++) {
        setTajweed(pos, 'tafkim');
      }
    } else if ((group = groups.tafkhim2)) {
      const firstPos = group[0];
      const char = text[firstPos];
      const tafkhim2_1 = groups.tafkhim2_1;
      const endchar = tafkhim2_1 ? text[tafkhim2_1[0]] : '';
      if (endchar !== ' ') {
        if (char === fatha || char === damma) {
          setTajweed(firstPos, 'tafkim');
        }
      }
    } else if ((group = groups.tafkhim3)) {
      setTajweed(group[0], 'tafkim');
      const tafkhim4 = groups.tafkhim4;
      if (tafkhim4) {
        const char = text[tafkhim4[0]];
        const tafkhim4_1 = groups.tafkhim4_1;
        const endchar = tafkhim4_1 ? text[tafkhim4_1[0]] : '';
        if (endchar !== ' ') {
          if (char === fatha || char === damma || sukuns.includes(char)) {
            setTajweed(tafkhim4[0], 'tafkim');
          } else if (char === shadda) {
            setTajweed(tafkhim4[0], 'tafkim');
            const nextIndex = tafkhim4[0] + 1;
            if (nextIndex < tafkhim4[1]) {
              const nextchar = text[nextIndex];
              if (nextchar === fatha || nextchar === damma) {
                setTajweed(nextIndex, 'tafkim');
              }
            }
          }
        } else {
          if (sukuns.includes(char) || char === shadda) {
            setTajweed(tafkhim4[0], 'tafkim');
          }
        }
      }
    } else if ((group = groups.kalkala1)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'lkalkala');
      setTajweed(firstPos + 1, 'lkalkala');
    } else if ((group = groups.kalkala2)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'lkalkala');
      if (firstPos + 1 < group[1]) {
        setTajweed(firstPos + 1, 'lkalkala');
      }
    } else if ((group = groups.gray3)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'lgray');
      setTajweed(firstPos + 1, 'lgray');
    } else if ((group = groups.gray3_indopak_1 || groups.gray3_indopak_2)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'lgray');
    }
  }

  resetIndex();

  // Apply other patterns
  OthersRE.lastIndex = 0;
  while ((match = OthersRE.exec(text)) !== null) {
    const matchWithIndices = match as RegExpExecArray & { indices?: { groups?: Record<string, number[]> }; groups?: Record<string, string> };
    const groups = matchWithIndices.indices?.groups;
    const matchGroups = matchWithIndices.groups;
    if (!groups) continue;

    if ((group = groups.tanween1)) {
      let pos = group[0];
      setTajweed(pos++, 'lgray');
      while (pos < group[1]) {
        setTajweed(pos++, 'green');
      }
    } else if ((group = groups.tanween2)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'green');
      setTajweed(firstPos + 1, 'green');
      if (matchGroups?.tanween2 && alltanween.includes(matchGroups.tanween2[2])) {
        OthersRE.lastIndex--;
      } else {
        setTajweed(firstPos + 2, 'green');
      }
    } else if ((group = groups.tanween3)) {
      if (!groups.tanween3_a) {
        setTajweed(group[0], 'green');
      }
    } else if ((group = groups.tanween4)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'green');
      if (firstPos + 1 < group[1]) {
        setTajweed(firstPos + 1, 'green');
      }
    } else if ((group = groups.tanween5)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'green');
    } else if ((group = groups.tanween6)) {
      if (matchGroups?.tanween6?.[0] !== 'ن' || matchGroups?.tanween7?.[0] !== 'ن') {
        const firstPos = group[0];
        setTajweed(firstPos, 'lgray');
        if (firstPos + 1 < group[1]) {
          setTajweed(firstPos + 1, 'lgray');
        }
      }
      const tanween7Group = groups.tanween7;
      if (tanween7Group) {
        const greenPos = tanween7Group[0];
        setTajweed(greenPos, 'green');
        setTajweed(greenPos + 1, 'green');
        if (tanween7Group[0] + 2 < tanween7Group[1]) {
          setTajweed(greenPos + 2, 'green');
        }
      }
    } else if ((group = groups.tanween8)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'lgray');
      if (firstPos + 1 < group[1]) {
        setTajweed(firstPos + 1, 'lgray');
      }
    } else if ((group = groups.tanween9 || groups.tanween9_noon)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'green');
      if (firstPos + 1 < group[1]) {
        setTajweed(firstPos + 1, 'green');
      }
    } else if ((group = groups.tanween10)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'green');
      setTajweed(firstPos + 1, 'green');
      if (firstPos + 2 < group[1]) {
        setTajweed(firstPos + 2, 'green');
      }
    } else if ((group = groups.gray1)) {
      setTajweed(group[0], 'lgray');
    } else if ((group = groups.gray2)) {
      setTajweed(group[0], 'lgray');
    } else if ((group = groups.gray4 || groups.gray4_1 || groups.gray4_2)) {
      setTajweed(group[0], 'lgray');
    } else if ((group = groups.gray6)) {
      const gray6_sukuns = matchGroups?.gray6_sukuns;
      if (gray6_sukuns && gray6_sukuns !== '') {
        const firstPos = group[0];
        const firstChar = matchGroups?.gray6?.[0];
        const secondChar = matchGroups?.gray6_1?.[0];
        if (firstChar !== secondChar) {
          if (firstChar !== 'ط') {
            setTajweed(firstPos, 'lgray');
            setTajweed(firstPos + 1, 'lgray');
          } else {
            setTajweed(firstPos, 'tafkim');
            setTajweed(firstPos + 1, 'tafkim');
          }
        } else {
          setTajweed(firstPos, undefined);
          setTajweed(firstPos + 1, undefined);
        }
      } else {
        if (matchGroups?.gray6?.[0] !== matchGroups?.gray6_1?.[0] ||
            (matchGroups?.gray6?.[0] === 'ي' && matchGroups?.gray6_1?.[0] === 'ي')) {
          setTajweed(group[0], 'lgray');
        }
      }
    } else if ((group = groups.gray7 || groups.gray8)) {
      setTajweed(group[0], 'lgray');
    } else if ((group = groups.madd1)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'red4');
      setTajweed(firstPos + 1, 'red4');
      if (group[0] + 2 < group[1]) {
        setTajweed(firstPos + 2, 'red4');
      }
    } else if ((group = groups.madd2)) {
      setTajweed(group[0], 'red1');
    } else if ((group = groups.madd2_1)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'red1');
      setTajweed(firstPos + 1, 'red1');
    } else if ((group = groups.madd5_1)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'red2');
      setTajweed(firstPos + 1, 'red2');
    } else if ((group = groups.madd3)) {
      for (let pos = group[0]; pos < group[1]; pos++) {
        setTajweed(pos, 'red4');
      }
    } else if ((group = groups.madd4_1)) {
      if (!groups.madd4_1_aya) {
        const firstPos = group[0];
        setTajweed(firstPos, 'red3');
        setTajweed(firstPos + 1, 'red3');
        if (group[0] + 2 < group[1]) {
          setTajweed(firstPos + 2, 'red3');
        }
      }
    } else if ((group = groups.madd4_4)) {
      if (!groups.madd4_4_aya) {
        const firstPos = group[0];
        setTajweed(firstPos, 'red3');
        setTajweed(firstPos + 1, 'red3');
        setTajweed(firstPos + 2, 'red3');
      }
    } else if ((group = groups.madd4_2)) {
      const firstPos = group[0];
      const madd4_2_a = groups.madd4_2_a;
      if (matchGroups?.madd4_2_a?.at(-1) === '۝') continue;
      if (!madd4_2_a ||
          matchGroups?.madd4_2?.[0] === smallYeh ||
          matchGroups?.madd4_2?.[0] === smallWaw ||
          matchGroups?.madd4_2?.[0] === invertedDamma ||
          matchGroups?.madd4_2?.[0] === subAlef) {
        setTajweed(firstPos, 'red3');
      }
      setTajweed(firstPos + 1, 'red3');
      if (group[0] + 2 < group[1]) {
        setTajweed(firstPos + 2, 'red3');
      }
    } else if ((group = groups.madd5)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'red2');
      if (group[0] + 1 < group[1]) {
        setTajweed(firstPos + 1, 'red2');
      }
    } else if ((group = groups.madd4_3)) {
      const firstPos = group[0];
      setTajweed(firstPos, 'red3');
      setTajweed(firstPos + 1, 'red3');
    }
  }
}

// ============================================
// Public API
// ============================================

/**
 * Tajweed color class names
 */
export type TajweedClass = 'tafkim' | 'lkalkala' | 'lgray' | 'green' | 'red1' | 'red2' | 'red3' | 'red4';

/**
 * Default Tajweed color map (matching DigitalKhatt standard colors)
 */
export const DEFAULT_TAJWEED_COLORS: Record<TajweedClass, string> = {
  tafkim: '#006694',      // Blue - Tafkheem (heavy letters)
  lkalkala: '#00ADEF',    // Cyan - Qalqalah
  lgray: '#B4B4B4',       // Gray - Silent letters
  green: '#00A650',       // Green - Idgham/Ikhfa/Iqlab
  red1: '#C38A08',        // Orange-brown - Madd 2 counts
  red2: '#F47216',        // Orange - Madd 4-5 counts (jaiz)
  red3: '#EC008C',        // Magenta-pink - Madd 4-5 counts (wajib)
  red4: '#8C0000',        // Dark red - Madd 6 counts (lazim)
};

/**
 * User-customizable Tajweed color configuration
 */
export type TajweedColorConfig = Partial<Record<TajweedClass, string>>;

/**
 * Merge user colors with defaults
 */
export function mergeTajweedColors(userColors?: TajweedColorConfig): Record<TajweedClass, string> {
  return { ...DEFAULT_TAJWEED_COLORS, ...userColors };
}

/**
 * Generate CSS for tajweed colors (for SVG fill property)
 */
export function generateTajweedCSS(colors: Record<TajweedClass, string> = DEFAULT_TAJWEED_COLORS): string {
  return Object.entries(colors)
    .map(([className, color]) => `.${className} { fill: ${color}; }`)
    .join('\n');
}

/**
 * Generate CSS custom properties (variables) for tajweed colors
 */
export function generateTajweedCSSVariables(
  colors: Record<TajweedClass, string> = DEFAULT_TAJWEED_COLORS,
  prefix: string = 'tajweed'
): string {
  return Object.entries(colors)
    .map(([className, color]) => `--${prefix}-${className}: ${color};`)
    .join('\n');
}

/**
 * Generate CSS that uses CSS custom properties
 */
export function generateTajweedCSSWithVariables(prefix: string = 'tajweed'): string {
  const classes: TajweedClass[] = ['tafkim', 'lkalkala', 'lgray', 'green', 'red1', 'red2', 'red3', 'red4'];
  return classes
    .map((className) => `.${className} { fill: var(--${prefix}-${className}); }`)
    .join('\n');
}

/**
 * Apply Tajweed coloring to a page
 * Returns an array of Maps, one per line, mapping character index to Tajweed class
 */
export function applyTajweedByPage(
  textService: QuranTextService,
  pageIndex: number
): Array<Map<number, string>> {
  const quranText = textService.quranText;
  const pageText = quranText[pageIndex];
  const pageIndexes: Array<{ lineIndex: number; start: number; end: number }> = [];
  let lastIndex = 0;
  let text = '';
  const result: Array<Map<number, string>> = [];

  for (let lineIndex = 0; lineIndex < pageText.length; lineIndex++) {
    result.push(new Map<number, string>());
    const lineInfo = textService.getLineInfo(pageIndex, lineIndex);
    if (lineInfo.lineType === 1) continue; // Skip Sura headers
    const lineText = pageText[lineIndex];
    const addedText = lineInfo.lineType === 2 ? ' ۝ ' : ' '; // Basmala
    text += lineText + addedText;
    pageIndexes.push({ lineIndex, start: lastIndex, end: lastIndex + lineText.length });
    lastIndex += lineText.length + addedText.length;
  }

  let globalLastIndex = 0;

  const setTajweed = (pos: number, tajweed: string | undefined) => {
    while (globalLastIndex < pageIndexes.length) {
      const lineIndexes = pageIndexes[globalLastIndex];
      if (pos >= lineIndexes.start) {
        if (pos < lineIndexes.end) {
          if (tajweed) {
            result[lineIndexes.lineIndex].set(pos - lineIndexes.start, tajweed);
          } else {
            result[lineIndexes.lineIndex].delete(pos - lineIndexes.start);
          }
          break;
        } else {
          globalLastIndex++;
        }
      } else {
        break;
      }
    }
  };

  const resetIndex = () => {
    globalLastIndex = 0;
  };

  const isIndopak = textService.mushafType === 3; // IndoPak15Lines
  applyTajweedForText(text, setTajweed, resetIndex, isIndopak);

  return result;
}
