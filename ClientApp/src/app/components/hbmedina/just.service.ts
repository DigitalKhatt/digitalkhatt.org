import { MushafLayoutType, QuranTextService } from "../../services/qurantext.service";
import { HarfBuzzFont, HarfBuzzBuffer, hb as HarfBuzz, getWidth, HBFeature } from "./harfbuzz"
import { compress, decompress } from 'lz-string';



export const PAGE_WIDTH = 17000
export const INTERLINE = 1800
export const TOP = 200
export const MARGIN = 400
export const FONTSIZE = 1000

export const enum SpaceType {
  Simple = 1,
  Aya,
}

const enum AppliedResult {
  NoChange,
  Positive,
  Overflow,
  Forbiden
}

export interface SubWordInfo {
  baseIndexes: number[],
  baseText: string
}
export interface WordInfo {
  startIndex: number
  endIndex: number
  text: string
  baseText: string,
  baseIndexes: number[],
  subwords: SubWordInfo[]
}
export interface LineTextInfo {
  lineText: string
  ayaSpaceIndexes: number[];
  simpleSpaceIndexes: number[];
  spaces: Map<number, SpaceType>
  wordInfos: WordInfo[],
}
export interface TextFontFeatures {
  name: string,
  value: number
}

export interface JustInfo {
  fontFeatures: Map<number, TextFontFeatures[]>;
  desiredWidth: number;
  textLineWidth: number;
  layoutResults: LayoutResult[];
  font: HarfBuzzFont
}

export interface JustResultByLine {
  globalFeatures?: TextFontFeatures[];
  fontFeatures: Map<number, TextFontFeatures[]>; /* FontFeatures by character index in the line */
  simpleSpacing: number;
  ayaSpacing: number;
  fontSizeRatio: number;
}

export interface LayoutResult {
  parWidth: number;
  appliedKashidas: Map<StretchType, [subWordIndex: number, characterIndexInSubWord: number]>
}

export interface LookupContext {
  justInfo: JustInfo,
  wordIndex: number,
}

export interface ApplyContext {
  prevFeatures: TextFontFeatures[] | undefined,
  char: string,
  wordIndex: number,
  charIndex: number
}

type ActionFunction = {
  apply: (context: ApplyContext) => TextFontFeatures[] | undefined
}
type ActionValue = {
  name: string
  value?: number
  calcNewValue: (prev: number | undefined, curr: number) => number,
}

type Action = ActionFunction | ActionValue

interface AppliedFeature {
  feature: TextFontFeatures
  calcNewValue?: (prev: number | undefined, curr: number) => number,
}

interface Lookup {
  condition?: (context: LookupContext) => boolean
  matchingCondition?: (context: LookupContext) => boolean
  regExprs: RegExp | RegExp[];
  actions: { [key: string]: Action[]; }
}

enum StretchType {
  None = 0,
  Beh = 1,
  FinaAscendant = 2,
  OtherKashidas = 3,
  Kaf = 4,
  SecondKashidaNotSameSubWord = 5,
  SecondKashidaSameSubWord = 6
}

const expaRegExp = new RegExp("^.*(?<expa>[صضسشفقبتثنكيئ])\\p{Mn}*$", "gdu");


const finalIsolAlternates = "ىصضسشفقبتثنكيئ"

const other = "[\\p{Mn}\u06E5]*"

const rightNoJoinLetters = "آاٱأإدذرزوؤءة";
const dualJoinLetters = "بتثجحخسشصضطظعغفقكلمنهيئى"

const bases = new Set<number>();

function initBases() {
  for (let i = 0; i < dualJoinLetters.length; i++) {
    bases.add(dualJoinLetters.charCodeAt(i))
  }
  for (let i = 0; i < rightNoJoinLetters.length; i++) {
    bases.add(rightNoJoinLetters.charCodeAt(i))
  }
}

initBases()

function isLastBase(text: string, index: number) {

  for (let charIndex = index + 1; charIndex < text.length; charIndex++) {
    if (bases.has(text.charCodeAt(charIndex))) {
      return false
    }
  }
  return true
}

function nbBases(text: string) {

  let nb = 0;

  for (let charIndex = 0; charIndex < text.length; charIndex++) {
    if (bases.has(text.charCodeAt(charIndex))) {
      nb++
    }
  }
  return nb
}

function isInitBase(wordInfo: WordInfo, index: number): boolean {

  if (index === wordInfo.baseIndexes[0]) return true;

  for (let i = 1; i < wordInfo.baseIndexes.length; i++) {
    if (index === wordInfo.baseIndexes[i]) {
      return rightNoJoinLetters.includes(wordInfo.text[wordInfo.baseIndexes[i - 1]])
    }
  }

  return false;

}

function getWordWidth(wordInfo: WordInfo, justResults: Map<number, TextFontFeatures[]>, font: HarfBuzzFont): number {


  const buffer = new HarfBuzzBuffer()
  buffer.setDirection('rtl')
  buffer.setLanguage(HarfBuzz.arabLanguage)
  buffer.setScript(HarfBuzz.arabScript)
  buffer.setClusterLevel(1)

  const features: HBFeature[] = []

  for (let i = wordInfo.startIndex; i <= wordInfo.endIndex; i++) {

    const justInfo = justResults.get(i)
    if (justInfo) {

      for (let feat of justInfo) {
        features.push({
          tag: feat.name,
          value: feat.value,
          start: i - wordInfo.startIndex,
          end: i - wordInfo.startIndex + 1
        })
      }
    }

  }
  buffer.addText(wordInfo.text)
  let shapeResult = buffer.shape(font, features)

  let totalWidth = 0.0

  for (let glyphInformation of shapeResult) {
    totalWidth += glyphInformation.XAdvance;
  }

  buffer.destroy()

  return totalWidth

}
function tryApplyFeatures(wordIndex: number, lineTextInfo: LineTextInfo, justInfo: JustInfo, newFeatures: Map<number, TextFontFeatures[]>): AppliedResult {

  const layout = justInfo.layoutResults[wordIndex]

  const wordInfo = lineTextInfo.wordInfos[wordIndex];

  const wordNewWidth = getWordWidth(wordInfo, newFeatures, justInfo.font);
  const diff = wordNewWidth - layout.parWidth;
  if (
    wordNewWidth !== layout.parWidth &&
    justInfo.textLineWidth + diff < justInfo.desiredWidth
  ) {
    justInfo.textLineWidth += diff;
    layout.parWidth = wordNewWidth;
    justInfo.fontFeatures = newFeatures;
    return AppliedResult.Positive;
  } else if (diff === 0) {
    return AppliedResult.NoChange;
  } else {
    return AppliedResult.Overflow;
  }
}
function mergeFeatures(prevFeatures: TextFontFeatures[] | undefined, newFeatures: AppliedFeature[]): TextFontFeatures[] | undefined {

  let mergedFeatures: TextFontFeatures[] | undefined

  if (prevFeatures) {
    mergedFeatures = prevFeatures.map(x => Object.assign({}, x));
  } else {
    mergedFeatures = []
  }

  if (newFeatures) {
    for (const newFeature of newFeatures) {
      const exist = mergedFeatures.find(prevFeature => prevFeature.name == newFeature.feature.name)
      if (exist) {
        exist.value = newFeature.calcNewValue ? newFeature.calcNewValue(exist.value, newFeature.feature.value) : newFeature.feature.value
      } else {
        const cloneNewFeature = { name: newFeature.feature.name, value: newFeature.calcNewValue ? newFeature.calcNewValue(undefined, newFeature.feature.value) : newFeature.feature.value }
        mergedFeatures.push(cloneNewFeature)
      }
    }
  }

  return mergedFeatures
}
function matchSubWords(wordInfo: WordInfo, expr: RegExp[] | string) {

  const result: SubWordsMatch = { subWordIndexes: [], matches: [] }

  let regExprs: RegExp[] = [];

  if (expr instanceof Array) {
    regExprs = [...expr];
  } else {
    regExprs.push(new RegExp(expr, "gdu"));
  }

  for (let subIndex = 0; subIndex < wordInfo.subwords.length; subIndex++) {
    const subWord = wordInfo.subwords[subIndex]

    const subWordMatches: RegExpMatchArray[] = []

    result.matches.push(subWordMatches);

    for (let regExpr of regExprs) {
      let matches = subWord.baseText.matchAll(regExpr)
      for (let match of matches) {
        subWordMatches.push(match)
      }
    }

    if (subWordMatches.length > 0) {
      result.subWordIndexes.push(subIndex)
    }
  }

  return result;
}

function applyExperimentalJust(
  lineTextInfo: LineTextInfo,
  justInfo: JustInfo) {
  applyKashidasSubWords(lineTextInfo, justInfo, StretchType.Beh, 2) ||
    applyAlternatesSubWords(lineTextInfo, justInfo, 'بتثكن', 2) ||
    applyKashidasSubWords(
      lineTextInfo,
      justInfo,
      StretchType.FinaAscendant,
      3,
    ) ||
    applyKashidasSubWords(
      lineTextInfo,
      justInfo,
      StretchType.OtherKashidas,
      2,
    ) ||
    applyAlternatesSubWords(lineTextInfo, justInfo, 'ىصضسشفقيئ', 2) ||
    applyKashidasSubWords(lineTextInfo, justInfo, StretchType.Kaf, 1) ||
    applyKashidasSubWords(lineTextInfo, justInfo, StretchType.Beh, 1) ||
    applyAlternatesSubWords(lineTextInfo, justInfo, 'بتثكن', 1) ||
    applyKashidasSubWords(
      lineTextInfo,
      justInfo,
      StretchType.FinaAscendant,
      1,
    ) ||
    applyKashidasSubWords(
      lineTextInfo,
      justInfo,
      StretchType.OtherKashidas,
      1,
    ) ||
    applyAlternatesSubWords(lineTextInfo, justInfo, 'ىصضسشفقيئ', 1) ||
    applyAlternatesSubWords(lineTextInfo, justInfo, 'بتثكن', 2) ||
    applyAlternatesSubWords(lineTextInfo, justInfo, 'ىصضسشفقيئبتثكن', 2) ||
    applyKashidasSubWords(lineTextInfo, justInfo, StretchType.Beh, 1) ||
    applyKashidasSubWords(
      lineTextInfo,
      justInfo,
      StretchType.FinaAscendant,
      1,
    ) ||
    applyKashidasSubWords(
      lineTextInfo,
      justInfo,
      StretchType.OtherKashidas,
      1,
    ) ||
    applyAlternatesSubWords(lineTextInfo, justInfo, 'ىصضسشفقيئبتثكن', 2) ||
    applyKashidasSubWords(
      lineTextInfo,
      justInfo,
      StretchType.SecondKashidaNotSameSubWord,
      2,
    ) ||
    applyKashidasSubWords(
      lineTextInfo,
      justInfo,
      StretchType.SecondKashidaSameSubWord,
      2,
    );
}
function applyKashida(
  lineTextInfo: LineTextInfo,
  justInfo: JustInfo,
  wordIndex: number,
  subWordIndex: number,
  firstSubWordMatchIndex: number,
  secondSubWordMacthIndex: number
): AppliedResult {

  const wordInfos = lineTextInfo.wordInfos;
  const lineText = lineTextInfo.lineText;
  const wordInfo = wordInfos[wordIndex];
  const subWordInfo = wordInfo.subwords[subWordIndex];
  const firstMatchIndex = subWordInfo.baseIndexes[firstSubWordMatchIndex];
  const secondMatchIndex = subWordInfo.baseIndexes[secondSubWordMacthIndex];
  const firstIndexInLine = wordInfo.startIndex + firstMatchIndex;
  const secondIndexInLine = wordInfo.startIndex + secondMatchIndex;

  let tempResult = new Map(justInfo.fontFeatures);

  const firstPrevFeatures = tempResult.get(firstIndexInLine);
  const secondPrevFeatures = tempResult.get(secondIndexInLine);

  let appliedResult = AppliedResult.Forbiden;

  if (secondPrevFeatures?.find(a => a.name === "cv01")) return appliedResult;

  const chark3 = lineText[firstIndexInLine]
  const chark4 = lineText[secondIndexInLine]

  if (chark4 === "ق" && subWordInfo.baseIndexes.at(-1) === secondMatchIndex) {
    return appliedResult;
  } else if (chark3 === "ل" && ((chark4 === "ك" || chark4 === "د" || chark4 === "ذ" || chark4 === "ة") || (chark4 === "ه" && subWordInfo.baseIndexes.at(-1) === secondMatchIndex))) {
    return appliedResult;
  } else if ("ئبتثنيى".includes(chark3) && subWordInfo.baseIndexes[0] !== firstMatchIndex && "رز".includes(chark4)) {
    return appliedResult;
  }

  const secondNewFeatures = []

  let cv01Value = 0

  let firstAppliedFeatures: AppliedFeature[] = [{
    feature: { name: 'cv01', value: 1 }, calcNewValue: (prev, curr) => {
      cv01Value = Math.min((prev || 0) + curr, 6)
      return cv01Value
    }
  }]

  if ("بتثنيئ".includes(chark3)) {
    firstAppliedFeatures.push({ feature: { name: 'cv10', value: 1 } })
  }

  const finalSubWordMatch = subWordInfo.baseIndexes.at(-1) === secondMatchIndex;

  // decomposition

  if ("ه".includes(chark3) && "م".includes(chark4) && finalSubWordMatch) {
    firstAppliedFeatures.push({ feature: { name: 'cv11', value: 1 } })
    secondNewFeatures.push({ name: 'cv11', value: 1 })
  } else if ("بتثنيئ".includes(chark3) && subWordInfo.baseIndexes[0] === firstMatchIndex && "جحخ".includes(chark4)) {
    firstAppliedFeatures.push({ feature: { name: 'cv12', value: 1 } })
    secondNewFeatures.push({ name: 'cv12', value: 1 })
  } else if ("م".includes(chark3) && subWordInfo.baseIndexes[0] === firstMatchIndex && "جحخ".includes(chark4)) {
    firstAppliedFeatures.push({ feature: { name: 'cv13', value: 1 } })
    secondNewFeatures.push({ name: 'cv13', value: 1 })
  } else if ("فق".includes(chark3) && subWordInfo.baseIndexes[0] === firstMatchIndex && "جحخ".includes(chark4)) {
    firstAppliedFeatures.push({ feature: { name: 'cv14', value: 1 } })
    secondNewFeatures.push({ name: 'cv14', value: 1 })
  } else if ("ل".includes(chark3) && subWordInfo.baseIndexes[0] === firstMatchIndex && "جحخ".includes(chark4)) {
    firstAppliedFeatures.push({ feature: { name: 'cv15', value: 1 } })
    secondNewFeatures.push({ name: 'cv15', value: 1 })
  } else if ("عغ".includes(chark3) && subWordInfo.baseIndexes[0] === firstMatchIndex && ("آادذٱأإل".includes(chark4) || ("بتثنيئ".includes(chark4) && "سش".includes(subWordInfo.baseText?.[2])))) {
    firstAppliedFeatures.push({ feature: { name: 'cv16', value: 1 } })
    secondNewFeatures.push({ name: 'cv16', value: 1 })
  } else if ("جحخ".includes(chark3)) {
    if ("آادذٱأإل".includes(chark4)
      || ("هة".includes(chark4) && finalSubWordMatch)
      || ("بتثنيئ".includes(chark4) && subWordInfo.baseIndexes.at(-2) === secondMatchIndex && "رزن".includes(subWordInfo.baseText.at(-1)!!))
    ) {
      firstAppliedFeatures.push({ feature: { name: 'cv16', value: 1 } })
      secondNewFeatures.push({ name: 'cv16', value: 1 })
    } else if (subWordInfo.baseIndexes[0] === firstMatchIndex && "م".includes(chark4)) {
      firstAppliedFeatures.push({ feature: { name: 'cv18', value: 1 } })
      secondNewFeatures.push({ name: 'cv18', value: 1 })
    }
  } else if ("سشصض".includes(chark3) && "رز".includes(chark4)) {
    firstAppliedFeatures.push({ feature: { name: 'cv17', value: 1 } })
    secondNewFeatures.push({ name: 'cv17', value: 1 })
  }

  const firstNewFeatures = mergeFeatures(firstPrevFeatures, firstAppliedFeatures)!!

  let cv02Value;

  if (finalAscendant.includes(chark4) && finalSubWordMatch) {
    cv02Value = cv01Value
  } else {
    cv02Value = 2 * cv01Value
  }

  secondNewFeatures.push({ name: 'cv02', value: cv02Value });


  tempResult.set(firstIndexInLine, firstNewFeatures);
  tempResult.set(secondIndexInLine, secondNewFeatures);

  appliedResult = tryApplyFeatures(wordIndex, lineTextInfo, justInfo, tempResult);

  return appliedResult;
}
function applyKaf(
  lineTextInfo: LineTextInfo,
  justInfo: JustInfo,
  wordIndex: number,
  subWordIndex: number,
  firstSubWordMatchIndex: number,
  secondSubWordMacthIndex: number
): AppliedResult {

  const wordInfos = lineTextInfo.wordInfos;
  const lineText = lineTextInfo.lineText;
  const wordInfo = wordInfos[wordIndex];
  const subWordInfo = wordInfo.subwords[subWordIndex];
  const firstMatchIndex = subWordInfo.baseIndexes[firstSubWordMatchIndex];
  const secondMatchIndex = subWordInfo.baseIndexes[secondSubWordMacthIndex];
  const firstIndexInLine = wordInfo.startIndex + firstMatchIndex;
  const secondIndexInLine = wordInfo.startIndex + secondMatchIndex;

  let tempResult = new Map(justInfo.fontFeatures)

  const firstPrevFeatures = tempResult.get(firstIndexInLine)
  const secondPrevFeatures = tempResult.get(secondIndexInLine)

  let firstAppliedFeatures: AppliedFeature[] = [
    { feature: { name: 'cv03', value: 1 }, calcNewValue: () => 1 },
  ]

  tempResult.set(firstIndexInLine, mergeFeatures(firstPrevFeatures, firstAppliedFeatures)!!)

  let secondAppliedFeatures: AppliedFeature[] = [{ feature: { name: 'cv03', value: 1 }, calcNewValue: () => 1 }]

  const firstNewFeatures = mergeFeatures(secondPrevFeatures, secondAppliedFeatures)!!


  tempResult.set(secondIndexInLine, firstNewFeatures)

  let fathaIndex;

  if (lineText[firstIndexInLine + 1] === '\u064E') {
    fathaIndex = firstIndexInLine + 1
  } else if (lineText[firstIndexInLine + 1] === '\u0651' && lineText[firstIndexInLine + 2] === '\u064E') {
    fathaIndex = firstIndexInLine + 2
  }

  if (fathaIndex !== undefined) {
    const cv01Value = firstNewFeatures.find(a => a.name === 'cv01')?.value || 0
    tempResult.set(fathaIndex, [{ name: 'cv01', value: 1 + Math.floor(cv01Value / 3) }])
  }

  const appliedResult = tryApplyFeatures(
    wordIndex,
    lineTextInfo,
    justInfo,
    tempResult
  );

  return appliedResult;
}
function applyKashidasSubWords(lineTextInfo: LineTextInfo, justInfo: JustInfo, type: StretchType, nbLevels: number): boolean {

  const right = "بتثنيئ" + "جحخ" + "سش" + "صض" + "طظ" + "عغ" + "فق" + "م" + "ه"
  const left = "ئبتثني" + "جحخ" + "طظ" + "عغ" + "فق" + "ةلم" + "رز"
  const mediLeftAsendant = "ل"

  const wordInfos = lineTextInfo.wordInfos;  

  const matchresult: SubWordsMatch[] = [];

  const regExprs: RegExp[] = [];

  if (type === StretchType.Beh) {
    regExprs.push(new RegExp(`^.+(?<k1>[بتثنيسشصض][بتثنيم]).+$`, "gdu"))
  } else if (type === StretchType.FinaAscendant) {
    regExprs.push(new RegExp(`^.*(?<k1>[${right}][آادذٱأإكلهة])$`, "gdu"))
  } else if (type === StretchType.OtherKashidas) {
    regExprs.push(new RegExp(`.*(?<k1>[${right}][رز])`, "gdu"))
    regExprs.push(new RegExp(`.*(?<k1>[${right}](?:[${mediLeftAsendant}]|[${left.replace("رز", "")}]))`, "gdu"))
  } else if (type === StretchType.Kaf) {
    regExprs.push(new RegExp(`^.*(?<k1>[ك].).*$`, "gdu"))
  } else if (type === StretchType.SecondKashidaNotSameSubWord) {
    regExprs.push(new RegExp(`^.+(?<k1>[بتثنيسشصض][بتثنيم]).+$`, "gdu"))
    regExprs.push(new RegExp(`^.*(?<k1>[${right}][آادذٱأإكلهة])$`, "gdu"))
    regExprs.push(new RegExp(`.*(?<k1>[${right}][رز])`, "gdu"))
    regExprs.push(new RegExp(`.*(?<k1>[${right}](?:[${mediLeftAsendant}]|[${left.replace("رز", "")}]))`, "gdu"))
  } else if (type === StretchType.SecondKashidaSameSubWord) {
    regExprs.push(new RegExp(`^.+(?<k1>[بتثنيسشصض][بتثنيم]).+$`, "gdu"))
    regExprs.push(new RegExp(`(?<k1>[${right}][آادذٱأإكلهة])$`, "gdu"))
    regExprs.push(new RegExp(`(?<k1>[${right}][رز])`, "gdu"))
    regExprs.push(new RegExp(`(?<k1>[${right}](?:[${mediLeftAsendant}]|[${left.replace("رز", "")}]))`, "gdu"))
  }

  for (let wordIndex = 0; wordIndex < wordInfos.length; wordIndex++) {
    matchresult.push(matchSubWords(wordInfos[wordIndex], regExprs))
  }

  for (let level = 1; level <= nbLevels; level++) {
    for (let wordIndex = 0; wordIndex < wordInfos.length; wordIndex++) {      
      const subWordsMatch = matchresult[wordIndex];
      const wordLayout = justInfo.layoutResults[wordIndex];

      const type1Applied = wordLayout.appliedKashidas.get(StretchType.Beh);
      const type2Applied = wordLayout.appliedKashidas.get(StretchType.FinaAscendant);
      const type3Applied = wordLayout.appliedKashidas.get(StretchType.OtherKashidas);      
      const type5Applied = wordLayout.appliedKashidas.get(StretchType.SecondKashidaNotSameSubWord);

      if (type === StretchType.Beh && (type2Applied || type3Applied)) continue;
      if (type === StretchType.FinaAscendant && (type1Applied || type3Applied)) continue;
      if (type === StretchType.OtherKashidas && (type1Applied || type2Applied)) continue;


      let done = false

      for (let i = subWordsMatch.subWordIndexes.length - 1; i >= 0 && !done; i--) {

        const subWordIndex = subWordsMatch.subWordIndexes[i]

        for (let match of subWordsMatch.matches[subWordIndex]) {
          const kashidaGroup = match?.indices?.[1]; 

          if (!kashidaGroup) continue;

          const firstSubWordMatchIndex = kashidaGroup[0]
          const secondSubWordMacthIndex = firstSubWordMatchIndex + 1;

          if (type === StretchType.SecondKashidaNotSameSubWord) {
            const type123 = type1Applied || type2Applied || type3Applied
            if (type123 && type123[0] === subWordIndex) continue
          } else if (type === StretchType.SecondKashidaSameSubWord) {
            const type123 = type1Applied || type2Applied || type3Applied
            if (type123 && type123[0] === subWordIndex && type123[1] === firstSubWordMatchIndex) continue
            if (type5Applied && type5Applied[0] === subWordIndex && type5Applied[1] === firstSubWordMatchIndex) continue
          }

          let appliedResult = AppliedResult.Forbiden;

          if (type === StretchType.Kaf) {
            appliedResult = applyKaf(lineTextInfo, justInfo, wordIndex, subWordIndex, firstSubWordMatchIndex, secondSubWordMacthIndex);
          } else {
            appliedResult = applyKashida(lineTextInfo, justInfo, wordIndex, subWordIndex, firstSubWordMatchIndex, secondSubWordMacthIndex);
          }

          if (appliedResult === AppliedResult.Positive) {
            wordLayout.appliedKashidas.set(type, [subWordIndex, firstSubWordMatchIndex]);
          }
          else if (appliedResult === AppliedResult.Overflow) {
            return true;
          }
          else if (appliedResult === AppliedResult.Forbiden) {
            continue;
          }

          done = true;

          break;

        }
      }
    }
  }
  return false;
}
function applyAlternate(lineTextInfo: LineTextInfo, justInfo: JustInfo, wordIndex: number, indexInLine: number): AppliedResult {

  const lineText = lineTextInfo.lineText

  let appliedResult = AppliedResult.Forbiden

  let tempResult = new Map(justInfo.fontFeatures)

  const prevFeatures = tempResult.get(indexInLine)

  const cv01Value = prevFeatures?.find(a => a.name === 'cv02')?.value || 0

  if (cv01Value > 0) return appliedResult;

  const newFeatures = mergeFeatures(prevFeatures, [{ feature: { name: 'cv01', value: 1 }, calcNewValue: (prev, curr) => Math.min((prev || 0) + curr, 12) }])!!
  tempResult.set(indexInLine, newFeatures)

  let fathaIndex;

  if (lineText[indexInLine + 1] === '\u064E') {
    fathaIndex = indexInLine + 1
  } else if (lineText[indexInLine + 1] === '\u0651' && lineText[indexInLine + 2] === '\u064E') {
    fathaIndex = indexInLine + 2
  }

  if (fathaIndex !== undefined) {
    const cv01FathaValue = newFeatures.find(a => a.name === 'cv01')?.value || 0
    tempResult.set(fathaIndex, [{ name: 'cv01', value: 1 + Math.floor(cv01FathaValue / 3) }])
  }

  appliedResult = tryApplyFeatures(wordIndex, lineTextInfo, justInfo, tempResult)

  return appliedResult;
}
function applyAlternatesSubWords(lineTextInfo: LineTextInfo, justInfo: JustInfo, chars: string, nbLevels: number): boolean {

  const wordInfos = lineTextInfo.wordInfos;

  const matchresult: SubWordsMatch[] = []

  let patternAlt = `^.*(?<alt>[${chars}])$`
  const regExprAlt = [new RegExp(patternAlt, "gdu")];

  for (let wordIndex = 0; wordIndex < wordInfos.length; wordIndex++) {
    matchresult.push(matchSubWords(wordInfos[wordIndex], regExprAlt))
  }

  for (let level = 1; level <= nbLevels; level++) {
    for (let wordIndex = 0; wordIndex < wordInfos.length; wordIndex++) {
      const wordInfo = wordInfos[wordIndex]
      const subWordsMatch = matchresult[wordIndex]

      for (let i = subWordsMatch.subWordIndexes.length - 1; i >= 0; i--) {
        const subWordIndex = subWordsMatch.subWordIndexes[i]
        const alt = subWordsMatch.matches[subWordIndex][0]?.indices?.[1];
        if (!alt) continue;
        const matchIndex = alt[0];   
        const indexInLine = wordInfo.startIndex + wordInfo.subwords[subWordIndex].baseIndexes[matchIndex]

        const appliedResult = applyAlternate(lineTextInfo, justInfo, wordIndex, indexInLine);

        if (appliedResult === AppliedResult.Overflow) {
          return true;
        }
        else if (appliedResult === AppliedResult.Forbiden) {
          continue;
        }
        else {
          break;
        }

      }
    }
  }
  return false;
}

const rightChars = dualJoinLetters;
const leftChars = dualJoinLetters + rightNoJoinLetters.replace("ء", "");
const rightKash = rightChars.replace(/[لك]/gu, '');
const leftKashidaFina = leftChars.replace(/[وهصضطظ]/gu, '');
const leftKashidaMedi = leftKashidaFina.replace("ه", "");
const finalAscendant = "آادذٱأإكلهة";
const jhk = "جحخ";

const altFinPat = `^.*([بتثفكنصضسشقيئى])$`;
const altFinaPrio1Reg = new RegExp(altFinPat, "gdu");
const finalKashidaEndWord = `^.*([${rightKash}][آاٱأإملهة])$`;
const finalKashida = `^.*([${rightKash}][دذآاٱأإملهة])$`;
const hahKashida = `^.*([${jhk}][${leftKashidaMedi}]).*$|^.*([${jhk}][هة])$`;
const regHahFinaAscenKashida = new RegExp(hahKashida + "|" + finalKashidaEndWord, "gdu");
const behBehPat = `^.+([بتثنيسشصض][بتثنيم]).+$`;
const rehPat = `.*([${rightKash}][رز])`;
const otherPat = `.*([${rightKash}](?:[ل]|[${leftKashidaMedi}]))`;
const kafPat = `^.*([ك].).*$`;
const patternSimple = altFinPat + "|" + hahKashida + "|" + finalKashida + "|" + behBehPat + "|" + rehPat + "|" + otherPat + "|" + kafPat;
const regExprSimple = new RegExp(patternSimple, "gdu")
function applySimpleJust(
  lineTextInfo: LineTextInfo,
  justInfo: JustInfo,
  firstWordIncluded: boolean,
  wordByWord: boolean,
  nbLevelAlt: number,
  nbLevelKashida: number,
): boolean {

  const wordInfos = lineTextInfo.wordInfos;

  interface SubWordMatch {
    subWordIndex: number;
    match: RegExpMatchArray;
    type: number
  }

  const matchresult: SubWordMatch[] = [];

  const firstWordIndex = firstWordIncluded ? 0 : 1;

  for (let wordIndex = 0; wordIndex < wordInfos.length; wordIndex++) {
    const wordInfo = wordInfos[wordIndex]
    const result: SubWordMatch = { subWordIndex: -1, match: null, type: 0 }
    if (!wordInfo.baseText.length || wordIndex < firstWordIndex) {
      matchresult[wordIndex] = result;
      continue;
    }

    const lastIndex = wordInfo.subwords.length - 1;
    let subWord = wordInfo.subwords[lastIndex];
    altFinaPrio1Reg.lastIndex = 0;
    let match = altFinaPrio1Reg.exec(subWord.baseText);
    if (match) {
      result.subWordIndex = lastIndex;
      result.match = match;
      result.type = 1;
    } else if (!"يئى".includes(wordInfo.baseText.at(-1))) {
      regHahFinaAscenKashida.lastIndex = 0;
      match = regHahFinaAscenKashida.exec(subWord.baseText);
      if (match) {
        result.subWordIndex = lastIndex;
        result.match = match;
        result.type = 2;
      } else {
        for (let subIndex = lastIndex; subIndex >= 0; subIndex--) {
          subWord = wordInfo.subwords[subIndex];
          regExprSimple.lastIndex = 0;
          match = regExprSimple.exec(subWord.baseText);
          if (match) {
            result.subWordIndex = subIndex;
            result.match = match;
            result.type = 3;
            break;
          }
        }
      }
    }
    matchresult[wordIndex] = result;
  }

  let stretchedWords = new Map<number, boolean>();

  for (let level = 1; level <= Math.max(nbLevelAlt, nbLevelKashida); level++) {

    for (let wordIndex = wordInfos.length - 1; wordIndex >= firstWordIndex; wordIndex--) {
      if (stretchedWords.get(wordIndex + 1)) continue;

      let appliedResult: AppliedResult | undefined = null;

      const wordInfo = wordInfos[wordIndex]
      const subWordsMatch = matchresult[wordIndex]
      /*
      if (wordInfo.text == "الرَّحِيْمِ") {
        const tt = 5;
      }*/

      if (!subWordsMatch?.match) continue;

      const subWordIndex = subWordsMatch.subWordIndex;

      const matchIndices = subWordsMatch.match.indices;
      let matchIndex;
      for (let index = 1; index < matchIndices.length; index++) {
        if (matchIndices[index]) {
          matchIndex = index;
        }
      }
      const match = matchIndices[matchIndex];

      if (subWordsMatch.type === 1 || (subWordsMatch.type === 3 && (matchIndex === 1))) {
        // Alternates
        if (level <= nbLevelAlt) {
          const baseIndex = match[0]
          const indexInLine = wordInfo.startIndex + wordInfo.subwords[subWordIndex].baseIndexes[baseIndex]
          appliedResult = applyAlternate(lineTextInfo, justInfo, wordIndex, indexInLine);
        }
      } else if (level <= nbLevelKashida) {

        const firstSubWordMatchIndex = match[0];
        const secondSubWordMacthIndex = firstSubWordMatchIndex + 1;

        if (matchIndex === 8 && subWordsMatch.type === 3) {
          //Kaf
          appliedResult = applyKaf(lineTextInfo, justInfo, wordIndex, subWordIndex, firstSubWordMatchIndex, secondSubWordMacthIndex);
        } else {
          // Kashidas
          appliedResult = applyKashida(lineTextInfo, justInfo, wordIndex, subWordIndex, firstSubWordMatchIndex, secondSubWordMacthIndex);
        }
      }

      if (appliedResult === AppliedResult.Overflow) {
        return true;
      } else if (appliedResult === AppliedResult.Positive) {
        if (wordByWord) {
          stretchedWords.set(wordIndex, true);
        }
      }
    }
  }
  return false;
}
function stretchLine(
  lineTextInfo: LineTextInfo,
  justInfo: JustInfo,
  mushafType: MushafLayoutType)
  : JustInfo {

  if (mushafType === MushafLayoutType.NewMadinah || mushafType === MushafLayoutType.OldMadinah) {
    applyExperimentalJust(lineTextInfo, justInfo);
  } else {
    applySimpleJust(lineTextInfo, justInfo, true, false, 6, 6);
  }

  return justInfo;
}


async function saveLayout(quranTextService: QuranTextService, fontSizeLineWidthRatio: number, font: HarfBuzzFont, spaceWidth: number) {

  const result: JustResultByLine[][] = []

  for (let pageIndex = 0; pageIndex < quranTextService.quranText.length; pageIndex++) {
    //for (let pageIndex = 0; pageIndex < 10; pageIndex++) {      

    result.push(await getPageLayout(quranTextService, pageIndex, fontSizeLineWidthRatio, font, spaceWidth))
    console.log(`pageIndex=${pageIndex} saved`)
  }

  saveLayoutToStorage(fontSizeLineWidthRatio, result)
}

async function getPageLayout(quranTextService: QuranTextService, pageIndex: number, fontSizeLineWidthRatio: number, font: HarfBuzzFont, spaceWidth: number) {

  const result: JustResultByLine[] = []

  for (let lineIndex = 0; lineIndex < quranTextService.quranText[pageIndex].length; lineIndex++) {
    const lineInfo = quranTextService.getLineInfo(pageIndex, lineIndex)
    const lineTextInfo = analyzeLineForJust(quranTextService, pageIndex, lineIndex)
    let justResult: JustResultByLine
    if (lineInfo.lineType === 1 || (lineInfo.lineType === 2 && pageIndex != 0 && pageIndex != 1)) {
      justResult = { fontFeatures: new Map(), simpleSpacing: spaceWidth, ayaSpacing: spaceWidth, fontSizeRatio: 1 }
      result.push(justResult)

    } else {
      // simple line

      let lineWidthRatio = 1

      if (lineInfo.lineWidthRatio !== 1) {

        lineWidthRatio = lineInfo.lineWidthRatio

      }

      justResult = justifyLine(lineTextInfo, font, fontSizeLineWidthRatio / lineWidthRatio, spaceWidth)
      result.push(justResult)

    }

  }

  return result;
}

function saveLayoutToStorage(fontSizeLineWidthRatio: number, result: JustResultByLine[][]) {
  localStorage.setItem("layout" + fontSizeLineWidthRatio, compress(JSON.stringify(result, replacer)))
  cachedLayouts.set(fontSizeLineWidthRatio, result)

}

function removeLayouts(fontSizeLineWidthRatio?: number) {
  Object.keys(localStorage)
    .filter(x =>
      fontSizeLineWidthRatio ? "layout" + fontSizeLineWidthRatio : x.startsWith('layout'))
    .forEach(x =>
      localStorage.removeItem(x))
}

function getLayoutFromStorage(fontSizeLineWidthRatio: number): JustResultByLine[][] | undefined {

  let layout = cachedLayouts.get(fontSizeLineWidthRatio)
  if (layout) {
    return layout
  } else {
    const json = localStorage.getItem("layout" + fontSizeLineWidthRatio)
    if (json) {
      layout = JSON.parse(decompress(json), reviver)
      if (layout) {
        cachedLayouts.set(fontSizeLineWidthRatio, layout)
      }

    }
    return layout
  }
}

function replacer(key: any, value: any) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}

function reviver(key: any, value: any) {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
}

interface SubWordsMatch {
  subWordIndexes: number[]
  matches: RegExpMatchArray[][]
}
export function justifyLine(
  lineTextInfo: LineTextInfo,
  font: HarfBuzzFont,
  fontSizeLineWidthRatio: number,
  spaceWidth: number,
  mushafType: MushafLayoutType = MushafLayoutType.NewMadinah
): JustResultByLine {

  const desiredWidth = FONTSIZE / fontSizeLineWidthRatio

  const lineText = lineTextInfo.lineText


  let layOutResult: LayoutResult[] = []
  let wordWidths: any[] = []
  let spaceWidths: any[] = []

  let justResults: JustInfo | undefined


  let simpleSpaceWidth;
  let ayaSpaceWidth;

  const totalSpaces = lineTextInfo.ayaSpaceIndexes.length + lineTextInfo.simpleSpaceIndexes.length;

  for (let wordIndex = 0; wordIndex < lineTextInfo.wordInfos.length; wordIndex++) {
    const wordInfo = lineTextInfo.wordInfos[wordIndex]

    const parWidth = getWidth(wordInfo.text, font, FONTSIZE, null)

    layOutResult.push({
      parWidth,
      appliedKashidas: new Map()
    })

  }

  let currentLineWidth = getWidth(lineText, font, FONTSIZE, null)

  let diff = desiredWidth - currentLineWidth

  let fontSizeRatio = 1
  let simpleSpacing = spaceWidth
  let ayaSpacing = spaceWidth

  if (diff > 0) {
    // stretch   

    let maxStretchBySpace = Math.min(100, spaceWidth * 1);
    let maxStretchByAyaSpace = Math.min(200, spaceWidth * 2);

    let maxStretch = maxStretchBySpace * lineTextInfo.simpleSpaceIndexes.length + maxStretchByAyaSpace * lineTextInfo.ayaSpaceIndexes.length;

    let stretch = Math.min(desiredWidth - currentLineWidth, maxStretch);
    let spaceRatio = maxStretch != 0 ? stretch / maxStretch : 0;
    let stretchBySpace = spaceRatio * maxStretchBySpace;
    let stretchByByAyaSpace = spaceRatio * maxStretchByAyaSpace;

    simpleSpaceWidth = spaceWidth + stretchBySpace
    ayaSpaceWidth = spaceWidth + stretchByByAyaSpace

    currentLineWidth += stretch

    // stretching

    if (desiredWidth > currentLineWidth) {
      const justInfo: JustInfo = { textLineWidth: currentLineWidth, fontFeatures: new Map<number, TextFontFeatures[]>(), layoutResults: layOutResult, desiredWidth, font: font };
      justResults = stretchLine(lineTextInfo, justInfo, mushafType)
      currentLineWidth = justResults.textLineWidth
    }

    if (desiredWidth > currentLineWidth) {
      // full justify with space
      let addToSpace = (desiredWidth - currentLineWidth) / lineTextInfo.spaces.size
      simpleSpaceWidth += addToSpace
      ayaSpaceWidth += addToSpace
    }

    simpleSpacing = (simpleSpaceWidth)
    ayaSpacing = (ayaSpaceWidth)


  } else {
    //shrink
    fontSizeRatio = desiredWidth / currentLineWidth;

  }

  return { fontFeatures: justResults?.fontFeatures || new Map<number, TextFontFeatures[]>, simpleSpacing, ayaSpacing, fontSizeRatio }
}

const lineTextInfoCache: Map<number, LineTextInfo> = new Map()

export function analyzeLineForJust(quranTextService: QuranTextService, pageIndex: number, plineIndex: number): LineTextInfo {

  const key = pageIndex * 15 + plineIndex
  let lineTextInfo = lineTextInfoCache.get(key)

  if (lineTextInfo) return lineTextInfo

  const pageText = quranTextService.quranText[pageIndex];


  const lineText = quranTextService.quranText[pageIndex][plineIndex]

  lineTextInfo = {
    lineText: lineText,
    ayaSpaceIndexes: [],
    simpleSpaceIndexes: [],
    wordInfos: [],
    spaces: new Map()
  }

  lineTextInfoCache.set(key, lineTextInfo)


  let currentWord: WordInfo = { text: "", startIndex: 0, endIndex: -1, baseText: "", baseIndexes: [], subwords: [{ baseText: "", baseIndexes: [] }] };
  lineTextInfo.wordInfos.push(currentWord);
  for (let i = 0; i < lineText.length; i++) {
    const char = lineText.charAt(i);
    if (char === " ") {

      if ((lineText.charCodeAt(i - 1) >= 0x0660 && lineText.charCodeAt(i - 1) <= 0x0669) || (lineText.charCodeAt(i + 1) === 0x06DD)) {
        lineTextInfo.ayaSpaceIndexes.push(i)
        lineTextInfo.spaces.set(i, SpaceType.Aya)
      } else {
        lineTextInfo.simpleSpaceIndexes.push(i)
        lineTextInfo.spaces.set(i, SpaceType.Simple)
      }
      currentWord = { text: "", startIndex: i + 1, endIndex: i, baseText: "", baseIndexes: [], subwords: [{ baseText: "", baseIndexes: [] }] }
      lineTextInfo.wordInfos.push(currentWord);

    } else {
      currentWord.text += char;
      if (bases.has(char.charCodeAt(0))) {
        currentWord.baseText += char;
        currentWord.baseIndexes.push(i - currentWord.startIndex)
        let isHamza = false;
        if (char === 'ء') {
          currentWord.subwords.push({ baseText: "", baseIndexes: [] });
          isHamza = true;
        }
        const subWord = currentWord.subwords.at(-1)!!
        subWord.baseText += char;
        subWord.baseIndexes.push(i - currentWord.startIndex)
        if (i < lineText.length - 1 && rightNoJoinLetters.includes(char) && !isHamza) {
          currentWord.subwords.push({ baseText: "", baseIndexes: [] })
        }

      }
      currentWord.endIndex++;
    }
  }


  return lineTextInfo;
}

let cachedLayouts: Map<number, JustResultByLine[][]> = new Map()
