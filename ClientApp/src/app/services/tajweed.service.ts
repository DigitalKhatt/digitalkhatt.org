import { Injectable } from '@angular/core';


import { LineType, MushafLayoutType, QuranTextService } from './qurantext.service';

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

const ayaCond = '\\s?[۩]?\\s?۝';
// included waqfInOneOfTwo : occurs 6 times and has an effect only in the second occurrence (page 2) as in the Tajweed Mushaf
const waqfCond = `(?:${ayaCond}|[${prefereWasl + prefereWaqf + mandatoryWaqf + permissibleWaqf}]|$)`; // prettier-ignore
const endWordCond = '(?:\\s|$)';
const endMarksCondOpt = `(?:[${waqfMarks + takhallus + disputedEndofAyah}]*)`;

const elevationChars = 'طقصخغضظ';
let loweringChars = '';
let digits = '';

function initBases() {
  for (let i = 0; i < bases.length; i++) {
    if (elevationChars.indexOf(bases[i]) === -1) {
      loweringChars += bases[i];
    }
  }
  for (let digit = 1632; digit <= 1641; digit++) {
    digits += String.fromCharCode(digit);
  }
}

initBases();

const beforeAyaCond = `[${digits}۞][${waqfMarks}]?\\s`;

@Injectable({
  providedIn: 'root',
})
export class TajweedService {

  private TafkhimRE: RegExp;  
  private OthersREMadinah: RegExp;
  private OthersREIndoPak: RegExp;

  constructor() {

    // التجويد الميسر الحذيفي (https://ar.islamway.net/book/28837/%D8%A7%D9%84%D8%AA%D8%AC%D9%88%D9%8A%D8%AF-%D8%A7%D9%84%D9%85%D9%8A%D8%B3%D8%B1-%D9%84%D8%B9%D8%A7%D9%85-1442-%D9%87)

    // kalkala
    let pattern = `(?<kalkala1>[طقدجب][${sukuns}])`;
    pattern += `|(?<kalkala2>[طقدجب]${shadda}?)(?=[${marks}]*${waqfCond})`;

    // Tafkhim
    pattern += `|(?<tafkhim1>[${elevationChars}]${shadda}?[${fdk + sukuns}]?)`;

    // Tafkhim Reh Indopak Hamzat wasl
    pattern += `|(?<=\\sا${kasra})(?<tafkhim_reh1>ر[${sukuns}])`; 

    // Tafkhim Reh when waqf

    const kasras = kasra + kasratan + openkasratan;
    
    pattern += `|(?<=${kasra}|${kasra}[${loweringChars}][${sukuns}]|[ي][${sukuns}]?|\u0650\u0637\u0652)ر(?<tafkhim2>[${marks}]*)(?<tafkhim2_1>${waqfCond})`; // ترقيق الراء
    pattern += `|(?<tafkhim3>ر)(?<tafkhim4>[${marks}]*)(?<tafkhim4_1>${waqfCond})`; // otherwise tafkhim Reh without marks during waqf

    // Tafkhim Reh when wasl

    pattern += `|ر(?=${shadda}?[${kasras}])`; // ترقيق الراء
    pattern += `|(?<=${kasra})ر[${sukuns}](?![${elevationChars}]${fatha})`; // ترقيق الراء
    pattern += `|(?<tafkhim5>ر[${fdk + sukuns + shadda}]*)`; // otherwise tafkhim Reh with marks

    // Allah Tafkhim lam        
    pattern += `|(?<=^|[${fatha + damma + mandatoryWaqf + prefereWaqf + permissibleWaqf + prefereWasl}](?:[${forbiddenWaqf}]|ا${ziaditHarf})?[ياى]?\\s?|${beforeAyaCond}|وا[${ziaditHarf}]?\\s|${takhallus}\\s|\u0670\u089C)(?:[ٱ]|\u0627\u034f?\u0653|\u0627\u064E?)ل(?<tafkhim6>ل[${marks}]*)ه[${marks}]*م?[${marks}]*${endWordCond}`; // prettier-ignore
    pattern += `|\u0627\u0670\u089Cل(?<tafkhim6_2>ل[${marks}]*)ه[${marks}]*م?[${marks}]*${endWordCond}`; // prettier-ignore

    const lamlamhehOfAllahSWTSeq = `\u0644[${marks}]*ل[${marks}]*ه[${marks}]*${endWordCond}`;

    // Never pronounced
    pattern += `|(?<gray3>[${bases}][${ziaditHarf}])`; // never pronounced indicated by special chars
    pattern += `|(?<=[و][${sukuns}]?${maddClass}?|[و]${cgi}?\u0654${cgi}?[${damma}${dammatan}]|[و][${damma}]|[${damma}${sukuns}][و][${fatha}])(?<gray3_indopak_1>[ا])(?=${endMarksCondOpt}(?:${endWordCond}|(?:${ayaCond})))`; // prettier-ignore
    pattern += `|(?<=[${kasra}])(?<gray3_indopak_2>[ا])(?=[${bases}])(?!${lamlamhehOfAllahSWTSeq})`;

    this.TafkhimRE = new RegExp(pattern, 'gdu');    

    // gray
    const greyHamzatWaslInsideWordMadinah = `(?<=[${bases}][${marks}]*)(?<gray1>ٱ)(?!${lamlamhehOfAllahSWTSeq})`; // همزة الوصل داخل الكلمة
    pattern = greyHamzatWaslInsideWordMadinah; 
    pattern += `|(?<=[اٱ])(?<gray2>ل(?![${marks}]*ل[${marks}]*ه[${marks}]*${endWordCond}))(?=[${bases}])`; // اللام الشمسية        
    const greyWawYehMadinah = `|(?<gray4>[و])(?=${daggerAlef})|(?<gray4_1>[ى])(?=${daggerAlef}[${bases}])`; //waw with dagger alef above or initial or medial alef maksura with dagger alef above
    pattern += greyWawYehMadinah;        
    pattern += `|(?<=${maddClass})(?<gray7>[وي])(?=${cgi}?${hamzaabove}${cgi}?[${marks}]*(?:ا[${ziaditHarf}]?)?${endWordCond})`; // الهمزة ترسم بغير كرسي (see توضيح للمتخصصين في القراءة par 10 of tajweed mushaf)
    pattern += `|(?<=${maddClass})(?<gray8>ل)(?=\u0630\u0651)`; // silent lam in ءَآلذَّكَرَيْنِ

    //tanween
    pattern += `|(?<tanween1>ن${meemiqlab}${cgi}?[${sukuns}]?)`;
    pattern += `|(?<!${beforeAyaCond}|^)(?<tanween2>[من]${shadda}(?:[${fdkt}]|(?=${daggerAlef})))(?!${maddawaajib})`;
    pattern += `|(?<tanween3>[${meemiqlab + lowmeemiqlab}])(?=(?:ا[${ziaditHarf}]?)?(?<tanween3_a>${ayaCond})?)`; // prettier-ignore
    pattern += `|(?<tanween4>م[${sukuns}]?)(?=\\sب)`;
    pattern += `|(?<tanween5>ن[${bases}])`;
    // النون الساكنة والتنوين
    pattern += `|(?<tanween6>[ن${opentanween}${tanween}][${sukuns}]?)[${bases}]?\u06DF?${endMarksCondOpt}\\s(?<tanween7>[ينمو](?:[${shadda}]?[${fdkt}]|[${shadda}](?=${daggerAlef})))`; // إدغام بغنة   
    pattern += `|(?<tanween8>[ن${opentanween}${tanween}][${sukuns}]?)[${bases}]?${endMarksCondOpt}\\s?[لر][${shadda}]`; // إدغام بغير غنة
    pattern += `|(?<tanween9>[${opentanween}${tanween}][${sukuns}]?)[${bases}]?${endMarksCondOpt}\\s?[${IkfaaLetters}]`; // الإخفاء
    pattern += `|(?<tanween9_noon>[ن][${sukuns}]?)[${bases}]?\\s?[${IkfaaLetters}]`; // الإخفاء
    pattern += `|(?<=[${fdk}])(?<gray6>[${bases}])(?<gray6_sukuns>[${sukuns}]?)(?=\\s?(?<gray6_1>[${bases}]${shadda}))`; // الإدغام الكامل
    pattern += `|(?<tanween10>ـۨ[${sukuns}]?)`;

    const madJaizAssert = `(?=[و\u0649]?[${bases}][${harakat}][${marks}]?${waqfCond}|\u0647\u0650\u06DB)(?!ا[${ziaditHarf}])`;

    //madd
    pattern += `|(?<!\\s|^)(?<madd5>(?:[يو${daggerAlef}${subAlef}][${sukuns}]?|[ا]))${madJaizAssert}`;
    pattern += `|(?<madd4_1>[ى]${daggerAlef}${maddClass})${endWordCond}(?=(?<madd4_1_aya>${ayaCond})?)`; // final alefmaksura followed by dagger alef that is followed by maddah
    pattern += `|(?<madd4_4>${daggerAlef}${maddClass})[ي][\u06D9]?${endWordCond}(?=(?<madd4_4_aya>${ayaCond})?)`; 
    pattern += `|(?<=[ى])${daggerAlef}[${waqfMarks}]?${endWordCond}`; // no coloring of dagger alef when final alefmaksura followed by dagger alef that is not followed by maddah
    pattern += `|(?<madd1>[او${smallMadd}]${cgi}?[${sukuns}]?${maddClass})(?=[${bases}][${shadda}${sukuns}]|[${bases}][${bases}])(?!وا)`; // 6 count madd (red4)
    pattern += `|(?<madd4_2>[اويى${smallMadd}]${cgi}?[${sukuns}]?${maddClass})(?=(?:ا[${ziaditHarf}])?(?<madd4_2_a>${waqfCond})?)`;
    pattern += `|(?<madd5_1>ـ[${smallHighYeh}])${madJaizAssert}`;
    pattern += `|(?<madd2_1>ـ[${smallHighYeh}])`;
    pattern += `|(?<madd2>[${smallMadd}])(?!${cgi}?${hamzaabove}|[${fdkt}]|${ayaCond})`;
    pattern += `|[او${smallMadd}]${cgi}?[${sukuns}]?${maddClass}${ayaCond}`;
    pattern += `|(?<madd3>[نكعصلمسق][${shadda}]?[${fatha}]?${maddClass})`; // 6 count madd (red4)
    pattern += `|(?<madd4_3>ࣳٓ)`; // madd wajeeb 4-5 (red3)

    const greyWawYehIndopak = `|(?<=${daggerAlef}${maddah}?)(?<gray4>[و])(?=[${bases}])|(?<gray4_1>[ى])(?=[${bases}])|(?<gray4_2>[و](?=[${bases.replace(
      'ا',
      '',
    )}]))`;
    const greyHamzatWaslInsideWordIndoPak = `(?<=[${bases}][${marks}]*)(?<gray1>ا)(?!${lamlamhehOfAllahSWTSeq})(?=[${bases}][${sukuns}${shadda}]|ل[${bases}])`; // همزة الوصل داخل الكلمة

    let patternIndopak = pattern.replace(greyWawYehMadinah, greyWawYehIndopak);
    patternIndopak = patternIndopak.replace(
      greyHamzatWaslInsideWordMadinah,
      greyHamzatWaslInsideWordIndoPak,
    );

    this.OthersREMadinah = new RegExp(pattern, 'gdu');
    this.OthersREIndoPak = new RegExp(patternIndopak, 'gdu');
  }

  applyTajweedForText(text: string, setTajweed: (pos: number, tajweed: string) => void, resetIndex: () => void, isIndopak: boolean) {
    let match: any
    let group;    
    const OthersRE = isIndopak ? this.OthersREIndoPak : this.OthersREMadinah;

    while ((match = this.TafkhimRE.exec(text))) {
      const groups = match.indices.groups;
      if ((group = groups.tafkhim_reh1)) {
        const firstPos = group[0];
        setTajweed(firstPos, 'tafkim');
        setTajweed(firstPos + 1, 'tafkim');
      } else if (
        (group = groups.tafkhim1 || groups.tafkhim5 || groups.tafkhim6 || groups.tafkhim6_2)
      ) {
        for (let pos = group[0]; pos < group[1]; pos++) {
          setTajweed(pos, 'tafkim');
        }
      } else if ((group = groups.tafkhim2)) {
        const firstPos = group[0];
        const char = text[firstPos];
        const endchar = text[groups.tafkhim2_1[0]];
        if (endchar !== ' ') {
          // not aya mark (always waqf)
          if (char === fatha || char === damma) {
            setTajweed(firstPos, 'tafkim');
          }
        }
      } else if ((group = groups.tafkhim3)) {
        setTajweed(group[0], 'tafkim');
        if ((group = groups.tafkhim4)) {
          const char = text[group[0]];
          const endchar = text[groups.tafkhim4_1[0]];
          if (endchar !== ' ') {
            if (char === fatha || char === damma || sukuns.includes(char)) {
              setTajweed(group[0], 'tafkim');
            } else if (char === shadda) {
              setTajweed(group[0], 'tafkim');
              const nextIndex = group[0] + 1;
              if (nextIndex < group[1]) {
                const nextchar = text[nextIndex];
                if (nextchar === fatha || nextchar === damma) {                  
                  setTajweed(nextIndex, 'tafkim');
                }
              }
            }
          } else {
            if (sukuns.includes(char) || char === shadda) {
              setTajweed(group[0], 'tafkim');
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

    while ((match = OthersRE.exec(text))) {
      const groups = match.indices.groups;
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
        if (alltanween.includes(match.groups.tanween2[2])) {
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
        // dont gray noon
        if (
          match.groups.tanween6[0] !== 'ن' ||
          match.groups.tanween7[0] !== 'ن'
        ) {
          const firstPos = group[0];
          setTajweed(firstPos, 'lgray');
          if (firstPos + 1 < group[1]) {
            setTajweed(firstPos + 1, 'lgray');
          }
        }        
        const tanween7Group = groups.tanween7;
        const greenPos = tanween7Group[0];
        setTajweed(greenPos, 'green');
        setTajweed(greenPos + 1, 'green');
        if (tanween7Group[0] + 2 < tanween7Group[1]) {
          setTajweed(greenPos + 2, 'green');
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
        const firstPos = group[0];
        setTajweed(firstPos, 'lgray');
      } else if ((group = groups.gray2)) {
        const firstPos = group[0];
        setTajweed(firstPos, 'lgray');
      } else if ((group = groups.gray4 || groups.gray4_1 || groups.gray4_2)) {
        const firstPos = group[0];
        setTajweed(firstPos, 'lgray');
      } else if ((group = groups.gray5)) {
        const firstPos = group[0];
        setTajweed(firstPos, 'lgray');
      } else if ((group = groups.gray6)) {
        if (match.groups.gray6_sukuns !== '') {
          // Indopak
          // TODO check if we gray same letters different from madinah.
          // With the addition of the sukun, it seems to be less ambiguous to gray out the letter and the sukun.
          // See عَٰهَدتُّم مِّنَ in 9:1
          const firstPos = group[0];
          const firstChar = match.groups.gray6[0];
          const secondChar = match.groups.gray6_1[0];          
          if (firstChar !== secondChar) {
            if (firstChar !== 'ط') {
              setTajweed(firstPos, 'lgray');
              setTajweed(firstPos + 1, 'lgray');
            } else {
              setTajweed(firstPos, 'tafkim');
              setTajweed(firstPos + 1, 'tafkim');
            }         
          } else {
            // Remove Qalqala
            setTajweed(firstPos, undefined);
            setTajweed(firstPos + 1, undefined);
          }
        } else {
          // Madinah
          // dont gray same letters unless yeh (only in بِا͏ٔ͏َييِّكُم 68:6)
          if (
            match.groups.gray6[0] !== match.groups.gray6_1[0] ||
            (match.groups.gray6[0] === 'ي' && match.groups.gray6_1[0] === 'ي')
          ) {
            const firstPos = group[0];
            setTajweed(firstPos, 'lgray');
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
        const firstPos = group[0];
        setTajweed(firstPos, 'red1');
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
        if (groups.madd4_2_a && match.groups.madd4_2_a.at(-1) === '۝') continue;
        if (
          !groups.madd4_2_a ||
          match.groups.madd4_2[0] === smallYeh ||
          match.groups.madd4_2[0] === smallWaw ||
          match.groups.madd4_2[0] === invertedDamma ||
          match.groups.madd4_2[0] === subAlef
        ) {
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

  applyTajweedByPage(textService: QuranTextService, pageIndex: number) {

    const quranText = textService.quranText
    const pageText = quranText[pageIndex];
    const pageIndexes = [];
    let lastIndex = 0;
    let text = ''
    const result: Array<Map<number, string>> = []
    for (let lineIndex = 0; lineIndex < pageText.length; lineIndex++) {
      result.push(new Map<number, string>())
      const lineInfo = textService.getLineInfo(pageIndex, lineIndex);
      if (lineInfo.lineType == LineType.Sura) continue;
      const lineText = pageText[lineIndex]
      const addedText = lineInfo.lineType == LineType.Basmala ? ' ۝ ' : ' '
      text += lineText + addedText
      pageIndexes.push({ lineIndex, start: lastIndex, end: lastIndex + lineText.length })
      lastIndex += lineText.length + addedText.length

    }

    let globalLastIndex = 0

    const setTajweed = (pos: number, tajweed: string) => {
      while (globalLastIndex < pageIndexes.length) {
        const lineIndexes = pageIndexes[globalLastIndex];
        if (pos >= lineIndexes.start) {
          if (pos < lineIndexes.end) {
            result[lineIndexes.lineIndex].set(pos - lineIndexes.start, tajweed)
            break;
          } else {
            globalLastIndex++
          }
        } else {
          break;
        }
      }
      /*
      for (let i = 0; i < pageIndexes.length; i++) {
        const lineIndexes = pageIndexes[i];
        if (pos >= lineIndexes.start && pos < lineIndexes.end) {
          result[lineIndexes.lineIndex].set(pos - lineIndexes.start, tajweed)
          break;
        }
      }*/
    }

    const resetIndex = () => {
      globalLastIndex = 0;
    }

    this.applyTajweedForText(text, setTajweed, resetIndex, textService.mushafType == MushafLayoutType.IndoPak15Lines)

    return result
  }
}
