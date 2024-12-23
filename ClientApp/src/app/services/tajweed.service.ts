import { Injectable } from '@angular/core';


import { LineType, QuranTextService } from './qurantext.service';

const rightNoJoinLetters = 'ادذرزوؤأٱإءة';
const dualJoinLetters = 'بتثجحخسشصضطظعغفقكلمنهيئى';
const bases = rightNoJoinLetters + dualJoinLetters;

const fathatan = "\u064B"
const dammatan = "\u064C"
const kasratan = "\u064D"
const fatha = "\u064E"
const damma = "\u064F"
const kasra = "\u0650"
const shadda = "\u0651"
const sukuns = "\u0652\u06E1"
const openfathatan = "\u08F0"
const opendammatan = "\u08F1"
const openkasratan = "\u08F2"
const tanween = fathatan + dammatan + kasratan
const opentanween = openfathatan + opendammatan + openkasratan
const fdk = fatha + damma + kasra
const fdkt = fdk + tanween + opentanween
const harakat = fdkt + sukuns + shadda

const prefereWasl = "\u06D6"
const prefereWaqf = "\u06D7"
const mandatoryWaqf = "\u06D8"
const forbiddenWaqf = "\u06D9"
const permissibleWaqf = "\u06DA"
const waqfInOneOfTwo = "\u06DB"

const waqfMarks = prefereWasl + prefereWaqf + mandatoryWaqf + forbiddenWaqf + permissibleWaqf + waqfInOneOfTwo
const maddah = "\u0653"
const ziaditHarf = "\u06DF"
const ziaditHarfWasl = "\u06E0"
const meemiqlab = "\u06E2"
const lowmeemiqlab = "\u06ED"
const daggerAlef = "\u0670"
const smallWaw = "\u06E5"
const smallYeh = "\u06E6"
const smallMadd = daggerAlef + smallWaw + smallYeh
const smallHighYeh = "\u06E7"
const smallHighWaw = "\u08F3"
const highCircle = "\u06EC"
const lowCircle = "\u065C"
const hamzaabove = "\u0654"
const hamzabelow = "\u0655"
const smallHighSeen = "\u06DC"
const smallLowSeen = "\u06E3"
const smallHighNoon = "\u06E8"
const cgi = "\u034F"

const marks = harakat + waqfMarks + maddah
  + ziaditHarf + ziaditHarfWasl
  + meemiqlab + lowmeemiqlab
  + smallMadd
  + smallHighYeh + smallHighWaw
  + highCircle + lowCircle
  + hamzaabove + hamzabelow
  + smallHighSeen + smallLowSeen + smallHighNoon
  + cgi;

const ayaCond = "\\s۝";
// included waqfInOneOfTwo : occurs 6 times and has an effect only in the second occurrence (page 2) as in the Tajweed Mushaf
const waqfCond = `(?:${ayaCond}|[${prefereWasl + prefereWaqf + mandatoryWaqf + permissibleWaqf}]|$)`;
const endWordCond = "(?:\\s|$)";

const elevationChars = "طقصخغضظ"
let loweringChars = ""
let digits = ""

function initBases() {
  for (let i = 0; i < bases.length; i++) {
    if (elevationChars.indexOf(bases[i]) === -1) {
      loweringChars += loweringChars;
    }
  }
  for (let digit = 1632; digit <= 1641; digit++) {
    digits += String.fromCharCode(digit)
  }
}

initBases();

@Injectable({
  providedIn: 'root',
})
export class TajweedService {

  private TafkhimRE: RegExp
  private OthersRE: RegExp
  constructor() {

    // التجويد الميسر الحذيفي (https://ar.islamway.net/book/28837/%D8%A7%D9%84%D8%AA%D8%AC%D9%88%D9%8A%D8%AF-%D8%A7%D9%84%D9%85%D9%8A%D8%B3%D8%B1-%D9%84%D8%B9%D8%A7%D9%85-1442-%D9%87)

    // kalkala
    let pattern = `(?<kalkala1>[طقدجب][${sukuns}])`
    pattern = pattern + `|(?<kalkala2>[طقدجب]${shadda}?)(?=[${marks}]*${waqfCond})`

    // Tafkhim
    pattern = pattern + `|(?<tafkhim1>[${elevationChars}]${shadda}?[${fdk + sukuns}]?)`

    // Tafkhim Reh when waqf

    const kasras = kasra + kasratan + openkasratan;

    pattern += `|(?<=${kasra}|${kasra}[${loweringChars}][${sukuns}]|[ي][${sukuns}]?)ر(?<tafkhim2>[${marks}]*)(?<tafkhim2_1>${waqfCond})` // ترقيق الراء
    pattern += `|(?<tafkhim3>ر)(?<tafkhim4>[${marks}]*)(?<tafkhim4_1>${waqfCond})` // otherwise tafkhim Reh without marks during waqf

    // Tafkhim Reh when wasl

    pattern += `|ر(?=${shadda}?[${kasras}])` // ترقيق الراء
    pattern += `|(?<=${kasra})ر[${sukuns}](?![${elevationChars}]${fatha})` // ترقيق الراء
    pattern += `|(?<tafkhim5>ر[${fdk + sukuns + shadda}]*)` // otherwise tafkhim Reh with marks

    // Allah Tafkhim lam    
    pattern += `|(?<=[${fatha + damma}][اى]?\\s?|[${digits}]\\s|وا[${ziaditHarf}]\\s)ٱل(?<tafkhim6>ل[${marks}]*)ه[${marks}]*${endWordCond}`

    this.TafkhimRE = new RegExp(pattern, "gdu");

    // gray
    pattern = `(?<=[${bases}][${marks}]*)(?<gray1>ٱ)(?!\u0644[${marks}]*ل[${marks}]*ه[${marks}]*${endWordCond})` // همزة الوصل داخل الكلمة
    pattern = pattern + `|(?<=ٱ)(?<gray2>ل(?![${marks}]*ل[${marks}]*ه[${marks}]*${endWordCond}))(?=[${bases}])` // اللام الشمسية
    pattern = pattern + `|(?<gray3>[${bases}][${ziaditHarf}])` // never pronounced indicated by special chars
    pattern = pattern + `|(?<gray4>[و])(?=${daggerAlef})|(?<gray4_1>[ى])(?=${daggerAlef}[${bases}])` //waw with dagger alef above or initial or medial alef maksura with dagger alef above    
    pattern = pattern + `|[${fdk}](?<gray6>[${bases}])(?=\\s?(?<gray6_1>[${bases}]${shadda}))` // الإدغام الكامل
    pattern = pattern + `|(?<=${maddah})(?<gray7>و)(?=${cgi}?${hamzaabove})` // الهمزة ترسم بغير كرسي (see توضيح للمتخصصين في القراءة par 10 of tajweed mushaf)

    //tanween
    pattern = pattern + `|(?<tanween1>ن${meemiqlab})`;
    pattern = pattern + `|(?<=(?<tanween2_afteraya>[${digits}]\\s)?)(?<tanween2>[من]${shadda}[${fdkt}])`;
    pattern = pattern + `|(?<tanween3>[${meemiqlab + lowmeemiqlab}])(?=(?:ا[${ziaditHarf}]?)?(?<tanween3_a>${ayaCond})?)`;
    pattern = pattern + `|(?<tanween4>م\\sب)`;
    pattern = pattern + `|(?<tanween5>ن[${bases}])`;
    pattern = pattern + `|(?<tanween6>[ن${opentanween}])[${bases}]?[${waqfMarks}]?\\s(?<tanween7>[ئينمو][${shadda}]?[${fdkt}])`
    pattern = pattern + `|(?<tanween8>[ن${opentanween}])[${bases}]?[${waqfMarks}]?\\s[لر][${shadda}]`
    pattern = pattern + `|(?<tanween9>[ن${opentanween}])[${bases}]?[${waqfMarks}]?\\s[${bases}]`

    //madd
    pattern = pattern + `|(?<!\\s|^)(?<madd5>[ياو${daggerAlef}][${sukuns}]?)(?=[${bases}][${marks}][${marks}]?${waqfCond}|\u0647\u0650\u06DB)(?!ا[${ziaditHarf}])`
    pattern = pattern + `|(?<madd4_1>[ى]${daggerAlef}${maddah})${endWordCond}` // final alefmaksura followed by dagger alef that is followed by maddah
    pattern = pattern + `|(?<=[ى])${daggerAlef}[${waqfMarks}]?${endWordCond}` // no coloring of dagger alef when final alefmaksura followed by dagger alef that is not followed by maddah
    pattern = pattern + `|(?<madd1>[او${smallMadd}]${cgi}?${maddah})(?=[${bases}]${shadda})`
    pattern = pattern + `|(?<madd4_2>[اويى${smallMadd}]${cgi}?${maddah})(?=(?:ا[${ziaditHarf}])?(?<madd4_2_a>${waqfCond})?)`
    pattern = pattern + `|(?<madd2>[${smallMadd}])`
    pattern = pattern + `|[او${smallMadd}]${cgi}?${maddah}${ayaCond}`
    pattern = pattern + `|(?<madd3>[لمس]${maddah})`




    this.OthersRE = new RegExp(pattern, "gdu");
  }

  applyTajweedForText(text: string, setTajweed: (pos: number, tajweed: string) => void, resetIndex: () => void) {    
    let match: any
    let group;

    while (match = this.TafkhimRE.exec(text)) {
      const groups = match.indices.groups
      if (group = groups.tafkhim1 || groups.tafkhim5 || groups.tafkhim6) {
        for (let pos = group[0]; pos < group[1]; pos++) {
          setTajweed(pos, "tafkim");
        }
      } else if (group = groups.tafkhim2) {
        const firstPos = group[0];
        const char = text[firstPos]
        const endchar = text[groups.tafkhim2_1[0]]
        if (endchar !== ' ') { // not aya mark (always waqf)
          if (char === fatha || char === fathatan || char === openfathatan
            || char === damma || char === dammatan || char === opendammatan) {
            setTajweed(firstPos, "tafkim")
          }
        }

      } else if (group = groups.tafkhim3) {
        setTajweed(group[0], "tafkim")
        if (group = groups.tafkhim4) {
          const char = text[group[0]]
          const endchar = text[groups.tafkhim4_1[0]]
          if (endchar !== ' ') {
            if (char === fatha || char === fathatan || char === openfathatan
              || char === damma || char === dammatan || char === opendammatan) {
              setTajweed(group[0], "tafkim")
            }
          }
        }
      } else if (group = groups.kalkala1) {
        const firstPos = group[0];
        setTajweed(firstPos, "lkalkala");
        setTajweed(firstPos + 1, "lkalkala");
      } else if (group = groups.kalkala2) {
        const firstPos = group[0];
        setTajweed(firstPos, "lkalkala");
        if (firstPos + 1 < group[1]) {
          setTajweed(firstPos + 1, "lkalkala");
        }
      }
    }

    resetIndex()

    while (match = this.OthersRE.exec(text)) {
      const groups = match.indices.groups
      if (group = groups.tanween1) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
        setTajweed(firstPos + 1, "green");
      } else if (group = groups.tanween2) {
        if (!groups.tanween2_afteraya) {
          const firstPos = group[0];
          setTajweed(firstPos, "green");
          setTajweed(firstPos + 1, "green");
          setTajweed(firstPos + 2, "green");
        }
      } else if (group = groups.tanween3) {
        if (!groups.tanween3_a) {
          setTajweed(group[0], "green");
        }
      } else if (group = groups.tanween4) {
        const firstPos = group[0];
        setTajweed(firstPos, "green");
      } else if (group = groups.tanween5) {
        const firstPos = group[0];
        setTajweed(firstPos, "green");
      } else if (group = groups.tanween6) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
        const tanween7Group = groups.tanween7
        const greenPos = tanween7Group[0];
        setTajweed(greenPos, "green");
        setTajweed(greenPos + 1, "green");
        if (tanween7Group[0] + 2 < tanween7Group[1]) {
          setTajweed(greenPos + 2, "green");
        }
      } else if (group = groups.tanween8) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
      } else if (group = groups.tanween9) {
        const firstPos = group[0];
        setTajweed(firstPos, "green");
      }
      else if (group = groups.gray1) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
      } else if (group = groups.gray2) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
      } else if (group = groups.gray3) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
        setTajweed(firstPos + 1, "lgray");
      } else if (group = groups.gray4 || groups.gray4_1) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
      } else if (group = groups.gray5) {
        const firstPos = group[0];
        setTajweed(firstPos, "lgray");
      } else if (group = groups.gray6) {
        // dont gray same letters
        if (match.groups.gray6[0] !== match.groups.gray6_1[0]) {
          const firstPos = group[0];
          setTajweed(firstPos, "lgray");
        }
      } else if (group = groups.gray7) {
        setTajweed(group[0], "lgray");
      } else if (group = groups.madd1) {
        const firstPos = group[0];
        setTajweed(firstPos, "red4");
        setTajweed(firstPos + 1, "red4");
        if (group[0] + 2 < group[1]) {
          setTajweed(firstPos + 2, "red4");
        }
      } else if (group = groups.madd2) {
        const firstPos = group[0];
        setTajweed(firstPos, "red1");
      } else if (group = groups.madd3) {
        const firstPos = group[0];
        setTajweed(firstPos, "red4");
        setTajweed(firstPos + 1, "red4");
      } else if (group = groups.madd4_1) {
        const firstPos = group[0];
        setTajweed(firstPos, "red3");
        setTajweed(firstPos + 1, "red3");
        if (group[0] + 2 < group[1]) {
          setTajweed(firstPos + 2, "red3");
        }
      } else if (group = groups.madd4_2) {
        const firstPos = group[0];
        if (!groups.madd4_2_a || match.groups.madd4_2[0] === smallYeh) {
          setTajweed(firstPos, "red3");
        }
        setTajweed(firstPos + 1, "red3");
        if (group[0] + 2 < group[1]) {
          setTajweed(firstPos + 2, "red3");
        }
      } else if (group = groups.madd5) {
        const firstPos = group[0];
        setTajweed(firstPos, "red2");
        if (group[0] + 1 < group[1]) {
          setTajweed(firstPos + 1, "red2");
        }
      }
    }
  }

  applyTajweedByPage(textService: QuranTextService, pageIndex: number) {
    
    const quranText = textService.quranText
    const pageText = quranText[pageIndex];
    const pageIndexes = [];
    let lastIndex = 0;
    let text = ""
    const result = []
    for (let lineIndex = 0; lineIndex < pageText.length; lineIndex++) {
      result.push(new Map())
      const lineInfo = textService.getLineInfo(pageIndex, lineIndex);
      if (lineInfo.lineType == LineType.Sura) continue;
      const lineText = pageText[lineIndex]
      const addedText = lineInfo.lineType == LineType.Basmala ? " ۝ " : " "
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

    this.applyTajweedForText(text, setTajweed, resetIndex)

    return result
  }
}
