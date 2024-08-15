//import { quranTextService, PAGE_WIDTH, FONTSIZE, MARGIN, INTERLINE, TOP, SPACEWIDTH, SpaceType, LineTextInfo, WordInfo } from './qurantext.service'

import { HarfBuzzFont, HarfBuzzBuffer, hb as HarfBuzz, getWidth, HBFeature } from "./harfbuzz"
import { compress, decompress } from 'lz-string';
import { QuranTextService } from "./qurantext.service";


export const PAGE_WIDTH = 17000
export const INTERLINE = 1800
export const TOP = 200
export const MARGIN = 400
export const FONTSIZE = 1000
export const SPACEWIDTH = 100

export const enum SpaceType {
  Simple = 1,
  Aya,
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
  layoutResult: LayoutResult[];
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
  groups?: {
    [key: string]: [number, number];
  };
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

interface Appliedfeature {
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

const rightNoJoinLetters = "ادذرزوؤأٱإءة";
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

function tryApplyFeatures(wordIndex: number, lineTextInfo: LineTextInfo, justInfo: JustInfo, newFeatures: Map<number, TextFontFeatures[]>): Boolean {

  const layout = justInfo.layoutResult[wordIndex]

  const wordInfo = lineTextInfo.wordInfos[wordIndex];


  const wordNewWidth = getWordWidth(wordInfo, newFeatures, justInfo.font)
  if (wordNewWidth != layout.parWidth && justInfo.textLineWidth + wordNewWidth - layout.parWidth < justInfo.desiredWidth) {
    justInfo.textLineWidth += wordNewWidth - layout.parWidth
    layout.parWidth = wordNewWidth
    justInfo.fontFeatures = newFeatures
    return true
  }
  return false
}
export function justifyLine(lineTextInfo: LineTextInfo, font: HarfBuzzFont, fontSizeLineWidthRatio: number): JustResultByLine {

  const desiredWidth = FONTSIZE / fontSizeLineWidthRatio

  const defaultSpaceWidth = SPACEWIDTH

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
  let simpleSpacing = SPACEWIDTH
  let ayaSpacing = SPACEWIDTH

  if (diff > 0) {
    // stretch   

    let maxStretchBySpace = defaultSpaceWidth * 1;
    let maxStretchByAyaSpace = defaultSpaceWidth * 2;

    let maxStretch = maxStretchBySpace * lineTextInfo.simpleSpaceIndexes.length + maxStretchByAyaSpace * lineTextInfo.ayaSpaceIndexes.length;

    let stretch = Math.min(desiredWidth - currentLineWidth, maxStretch);
    let spaceRatio = maxStretch != 0 ? stretch / maxStretch : 0;
    let stretchBySpace = spaceRatio * maxStretchBySpace;
    let stretchByByAyaSpace = spaceRatio * maxStretchByAyaSpace;

    simpleSpaceWidth = defaultSpaceWidth + stretchBySpace
    ayaSpaceWidth = defaultSpaceWidth + stretchByByAyaSpace

    currentLineWidth += stretch

    // stretching

    if (desiredWidth > currentLineWidth) {
      const startTime = performance.now();
      const justInfo: JustInfo = { textLineWidth: currentLineWidth, fontFeatures: new Map<number, TextFontFeatures[]>(), layoutResult: layOutResult, desiredWidth, font: font };
      justResults = stretchLine(lineTextInfo, justInfo)
      const endTime = performance.now();

      //console.log(`stretchLine in page=${this.pageIndex + 1},line=${this.lineIndex} takes ${endTime - startTime}`)
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

function stretchLine(lineTextInfo: LineTextInfo, justInfo: JustInfo): JustInfo {

  const wordInfos = lineTextInfo.wordInfos;

  applyKashidasSubWords(lineTextInfo, justInfo, StretchType.Beh, 2)
  applyAlternatesSubWords(lineTextInfo, justInfo, "بتثكن", 2)
  applyKashidasSubWords(lineTextInfo, justInfo, StretchType.FinaAscendant, 3)
  applyKashidasSubWords(lineTextInfo, justInfo, StretchType.OtherKashidas, 2)
  applyAlternatesSubWords(lineTextInfo, justInfo, "ىصضسشفقيئ", 2)
  applyKashidasSubWords(lineTextInfo, justInfo, StretchType.Kaf, 1)  
  applyKashidasSubWords(lineTextInfo, justInfo, StretchType.Beh, 1)
  applyAlternatesSubWords(lineTextInfo, justInfo, "بتثكن", 1)
  applyKashidasSubWords(lineTextInfo, justInfo, StretchType.FinaAscendant, 1)
  applyKashidasSubWords(lineTextInfo, justInfo, StretchType.OtherKashidas, 1)
  applyAlternatesSubWords(lineTextInfo, justInfo, "ىصضسشفقيئ", 1)
  applyAlternatesSubWords(lineTextInfo, justInfo, "بتثكن", 2)
  applyAlternatesSubWords(lineTextInfo, justInfo, "ىصضسشفقيئبتثكن", 2)
  applyKashidasSubWords(lineTextInfo, justInfo, StretchType.Beh, 1)
  applyKashidasSubWords(lineTextInfo, justInfo, StretchType.FinaAscendant, 1)
  applyKashidasSubWords(lineTextInfo, justInfo, StretchType.OtherKashidas, 1)
  applyAlternatesSubWords(lineTextInfo, justInfo, "ىصضسشفقيئبتثكن", 2)
  applyKashidasSubWords(lineTextInfo, justInfo, StretchType.SecondKashidaNotSameSubWord, 2)
  applyKashidasSubWords(lineTextInfo, justInfo, StretchType.SecondKashidaSameSubWord, 2)
  //applyKashidasSubWords(lineTextInfo, justInfo, StretchType.Kaf, 6)
  /*
  this.applyKashidasSubWords(justInfo, StretchType.Beh, 1)
  this.applyKashidasSubWords(justInfo, StretchType.FinaAscendant, 1)
  this.applyKashidasSubWords(justInfo, StretchType.OtherKashidas, 1)
  this.applyAlternatesSubWords(justInfo, "ىصضسشفقيئبتثكن", 1)
  this.applyKashidasSubWords(justInfo, StretchType.Beh, 1)
  this.applyKashidasSubWords(justInfo, StretchType.FinaAscendant, 1)
  this.applyKashidasSubWords(justInfo, StretchType.OtherKashidas, 1)*/


  return justInfo;


}

function mergeFeatures(prevFeatures: TextFontFeatures[] | undefined, newFeatures: Appliedfeature[]): TextFontFeatures[] | undefined {

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

function applyKashidasSubWords(lineTextInfo: LineTextInfo, justInfo: JustInfo, type: StretchType, nbLevels: number) {

  const right = "بتثنيئ" + "جحخ" + "سش" + "صض" + "طظ" + "عغ" + "فق" + "م" + "ه"
  const left = "ئبتثني" + "جحخ" + "طظ" + "عغ" + "فق" + "ةلم" + "رز"
  const mediLeftAsendant = "ل"

  const wordInfos = lineTextInfo.wordInfos;
  const lineText = lineTextInfo.lineText

  const matchresult: SubWordsMatch[] = []

  const regExprs: RegExp[] = []

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
      const wordInfo = wordInfos[wordIndex]
      const subWordsMatch = matchresult[wordIndex]
      const wordLayout = justInfo.layoutResult[wordIndex]

      const type1Applied = wordLayout.appliedKashidas.get(StretchType.Beh);
      const type2Applied = wordLayout.appliedKashidas.get(StretchType.FinaAscendant);
      const type3Applied = wordLayout.appliedKashidas.get(StretchType.OtherKashidas);
      const type4Applied = wordLayout.appliedKashidas.get(StretchType.Kaf);
      const type5Applied = wordLayout.appliedKashidas.get(StretchType.SecondKashidaNotSameSubWord);

      if (type === StretchType.Beh && (type2Applied || type3Applied)) continue;
      if (type === StretchType.FinaAscendant && (type1Applied || type3Applied)) continue;
      if (type === StretchType.OtherKashidas && (type1Applied || type2Applied)) continue;


      let done = false

      for (let i = subWordsMatch.subWordIndexes.length - 1; i >= 0 && !done; i--) {

        const subWordIndex = subWordsMatch.subWordIndexes[i]

        for (let match of subWordsMatch.matches[subWordIndex]) {
          const groups = match.indices!.groups!!

          const kashidaGroup = groups.k1 || groups.k2 || groups.k3

          if (!kashidaGroup) continue

          const firstSubWordMatchIndex = kashidaGroup[0]
          const secondSubWordMacthIndex = firstSubWordMatchIndex + 1



          if (type === StretchType.SecondKashidaNotSameSubWord) {
            const type123 = type1Applied || type2Applied || type3Applied
            if (type123 && type123[0] === subWordIndex) continue
          } else if (type === StretchType.SecondKashidaSameSubWord) {
            const type123 = type1Applied || type2Applied || type3Applied
            if (type123 && type123[0] === subWordIndex && type123[1] === firstSubWordMatchIndex) continue
            if (type5Applied && type5Applied[0] === subWordIndex && type5Applied[1] === firstSubWordMatchIndex) continue
          }


          const subWordInfo = wordInfo.subwords[subWordIndex]
          const firstMatchIndex = subWordInfo.baseIndexes[firstSubWordMatchIndex]
          const secondMacthIndex = subWordInfo.baseIndexes[secondSubWordMacthIndex]
          const firstIndexInLine = wordInfo.startIndex + firstMatchIndex
          const secondIndexInLine = wordInfo.startIndex + secondMacthIndex

          let tempResult = new Map(justInfo.fontFeatures)

          const firstPrevFeatures = tempResult.get(firstIndexInLine)
          const secondPrevFeatures = tempResult.get(secondIndexInLine)

          if (type === StretchType.Kaf) {

            let firstAppliedFeatures: Appliedfeature[] = [
              { feature: { name: 'cv03', value: 1 }, calcNewValue: (prev, curr) => 1 },
              /*{
                feature: { name: 'cv01', value: 1 }, calcNewValue: (prev, curr) => {
                  const cv01Value = Math.min((prev || 0) + curr, 6)
                  return cv01Value
                }
              }*/
            ]

            

            tempResult.set(firstIndexInLine, mergeFeatures(firstPrevFeatures, firstAppliedFeatures)!!)

            let secondAppliedFeatures: Appliedfeature[] = [{ feature: { name: 'cv03', value: 1 }, calcNewValue: (prev, curr) => 1 }]

            const firstNewFeatures = mergeFeatures(secondPrevFeatures, secondAppliedFeatures)!!


            tempResult.set(secondIndexInLine, firstNewFeatures)

            let fathaIndex;

            if (lineText[firstIndexInLine + 1] === '\u064E') {
              fathaIndex = firstIndexInLine + 1
            } else if (lineText[firstIndexInLine + 1] === '\u0651' && lineText[firstIndexInLine + 2] === '\u064E') {
              fathaIndex = firstIndexInLine + 2
            }

            if (fathaIndex !== undefined) {
              const cv01Value = firstNewFeatures.find(a => a.name == 'cv01')?.value || 0
              tempResult.set(fathaIndex, [{ name: 'cv01', value: 1 + Math.floor(cv01Value / 3) }])
            }

          } else {

            if (secondPrevFeatures?.find(a => a.name == "cv01")) continue;

            const chark3 = lineText[firstIndexInLine]
            const chark4 = lineText[secondIndexInLine]

            if (chark4 === "ق" && subWordInfo.baseIndexes.at(-1) === secondMacthIndex) {
              continue
            } else if (chark3 === "ل" && ((chark4 === "ك" || chark4 === "د" || chark4 === "ذ" || chark4 === "ة") || (chark4 === "ه" && subWordInfo.baseIndexes.at(-1) === secondMacthIndex))) {
              continue
            } else if ("ئبتثنيى".includes(chark3) && subWordInfo.baseIndexes[0] !== firstMatchIndex && "رز".includes(chark4)) {
              continue
            }

            const secondNewFeatures = []

            let cv01Value = 0

            let firstAppliedFeatures: Appliedfeature[] = [{
              feature: { name: 'cv01', value: 1 }, calcNewValue: (prev, curr) => {
                cv01Value = Math.min((prev || 0) + curr, 6)
                return cv01Value
              }
            }]

            if ("بتثنيئ".includes(chark3)) {
              firstAppliedFeatures.push({ feature: { name: 'cv10', value: 1 } })
            }


            // decomposition

            if ("ه".includes(chark3) && "م".includes(chark4) && subWordInfo.baseIndexes.at(-1) === secondMacthIndex) {
              firstAppliedFeatures.push({ feature: { name: 'cv11', value: 1 } })
              secondNewFeatures.push({ name: 'cv11', value: 1 })
            } else if ("بتثنيئ".includes(chark3) && subWordInfo.baseIndexes[0] == firstMatchIndex && "جحخ".includes(chark4)) {
              firstAppliedFeatures.push({ feature: { name: 'cv12', value: 1 } })
              secondNewFeatures.push({ name: 'cv12', value: 1 })
            } else if ("م".includes(chark3) && subWordInfo.baseIndexes[0] == firstMatchIndex && "جحخ".includes(chark4)) {
              firstAppliedFeatures.push({ feature: { name: 'cv13', value: 1 } })
              secondNewFeatures.push({ name: 'cv13', value: 1 })
            } else if ("فق".includes(chark3) && subWordInfo.baseIndexes[0] == firstMatchIndex && "جحخ".includes(chark4)) {
              firstAppliedFeatures.push({ feature: { name: 'cv14', value: 1 } })
              secondNewFeatures.push({ name: 'cv14', value: 1 })
            } else if ("ل".includes(chark3) && subWordInfo.baseIndexes[0] == firstMatchIndex && "جحخ".includes(chark4)) {
              firstAppliedFeatures.push({ feature: { name: 'cv15', value: 1 } })
              secondNewFeatures.push({ name: 'cv15', value: 1 })
            } else if ("عغ".includes(chark3) && subWordInfo.baseIndexes[0] == firstMatchIndex && ("آادذٱأإل".includes(chark4) || ("بتثنيئ".includes(chark4) && "سش".includes(subWordInfo.baseText?.[2])))) {
              firstAppliedFeatures.push({ feature: { name: 'cv16', value: 1 } })
              secondNewFeatures.push({ name: 'cv16', value: 1 })
            } else if ("جحخ".includes(chark3)) {
              if ("آادذٱأإل".includes(chark4)
                || ("هة".includes(chark4) && subWordInfo.baseIndexes.at(-1) === secondMacthIndex)
                || ("بتثنيئ".includes(chark4) && subWordInfo.baseIndexes.at(-2) === secondMacthIndex && "رزن".includes(subWordInfo.baseText.at(-1)!!))
              ) {
                firstAppliedFeatures.push({ feature: { name: 'cv16', value: 1 } })
                secondNewFeatures.push({ name: 'cv16', value: 1 })
              } else if (subWordInfo.baseIndexes[0] == firstMatchIndex && "م".includes(chark4)) {
                firstAppliedFeatures.push({ feature: { name: 'cv18', value: 1 } })
                secondNewFeatures.push({ name: 'cv18', value: 1 })
              }
            } else if ("سشصض".includes(chark3) && "رز".includes(chark4)) {
              firstAppliedFeatures.push({ feature: { name: 'cv17', value: 1 } })
              secondNewFeatures.push({ name: 'cv17', value: 1 })
            }

            const firstNewFeatures = mergeFeatures(firstPrevFeatures, firstAppliedFeatures)!!

            let cv02Value;

            if (type === StretchType.FinaAscendant) {
              cv02Value = cv01Value
            } else {
              cv02Value = 2 * cv01Value
            }
            secondNewFeatures.push({ name: 'cv02', value: cv02Value })


            tempResult.set(firstIndexInLine, firstNewFeatures)
            tempResult.set(secondIndexInLine, secondNewFeatures)
          }



          if (tryApplyFeatures(wordIndex, lineTextInfo, justInfo, tempResult)) {
            wordLayout.appliedKashidas.set(type, [subWordIndex, firstSubWordMatchIndex])
          }

          done = true;

          break;

        }
      }
    }
  }
}

function applyAlternatesSubWords(lineTextInfo: LineTextInfo, justInfo: JustInfo, chars: string, nbLevels: number) {

  const wordInfos = lineTextInfo.wordInfos;
  const lineText = lineTextInfo.lineText

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
        const matchIndex = subWordsMatch.matches[subWordIndex][0]!.indices!.groups!.alt[0]
        const indexInLine = wordInfo.startIndex + wordInfo.subwords[subWordIndex].baseIndexes[matchIndex]

        let tempResult = new Map(justInfo.fontFeatures)

        const prevFeatures = tempResult.get(indexInLine)

        const cv01Value = prevFeatures?.find(a => a.name == 'cv02')?.value || 0

        if (cv01Value > 0) continue;

        const newFeatures = mergeFeatures(prevFeatures, [{ feature: { name: 'cv01', value: 1 }, calcNewValue: (prev, curr) => Math.min((prev || 0) + curr, 12) }])!!
        tempResult.set(indexInLine, newFeatures)

        let fathaIndex;

        if (lineText[indexInLine + 1] === '\u064E') {
          fathaIndex = indexInLine + 1
        } else if (lineText[indexInLine + 1] === '\u0651' && lineText[indexInLine + 2] === '\u064E') {
          fathaIndex = indexInLine + 2
        }

        if (fathaIndex !== undefined) {
          const cv01Value = newFeatures.find(a => a.name == 'cv01')?.value || 0
          tempResult.set(fathaIndex, [{ name: 'cv01', value: 1 + Math.floor(cv01Value / 3) }])
        }

        tryApplyFeatures(wordIndex, lineTextInfo, justInfo, tempResult)

        break;

      }



    }
  }
}


async function saveLayout(quranTextService: QuranTextService, fontSizeLineWidthRatio: number, font: HarfBuzzFont) {

  const result: JustResultByLine[][] = []

  for (let pageIndex = 0; pageIndex < quranTextService.quranText.length; pageIndex++) {
    //for (let pageIndex = 0; pageIndex < 10; pageIndex++) {      

    result.push(await getPageLayout(quranTextService, pageIndex, fontSizeLineWidthRatio, font))
    console.log(`pageIndex=${pageIndex} saved`)
  }

  saveLayoutToStorage(fontSizeLineWidthRatio, result)
}

async function getPageLayout(quranTextService: QuranTextService, pageIndex: number, fontSizeLineWidthRatio: number, font: HarfBuzzFont) {

  const result: JustResultByLine[] = []

  for (let lineIndex = 0; lineIndex < quranTextService.quranText[pageIndex].length; lineIndex++) {
    const lineInfo = quranTextService.getLineInfo(pageIndex, lineIndex)
    const lineTextInfo = analyzeLineForJust(quranTextService, pageIndex, lineIndex)
    let justResult: JustResultByLine
    if (lineInfo.lineType === 1 || (lineInfo.lineType === 2 && pageIndex != 0 && pageIndex != 1)) {
      justResult = { fontFeatures: new Map(), simpleSpacing: SPACEWIDTH, ayaSpacing: SPACEWIDTH, fontSizeRatio: 1 }
      result.push(justResult)

    } else {
      // simple line

      let lineWidthRatio = 1

      if (lineInfo.lineWidthRatio !== 1) {

        lineWidthRatio = lineInfo.lineWidthRatio

      }

      justResult = justifyLine(lineTextInfo, font, fontSizeLineWidthRatio / lineWidthRatio)
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

enum MatchPos {
  None = 0,
  Init = 1 << 0, // 0001 -- the bitshift is unnecessary, but done for consistency
  Medi = 1 << 1,     // 0010
  Fina = 1 << 2,    // 0100
  Isol = 1 << 3,   // 1000
  All = ~(~0 << 4)   // 1111
}

interface SubWordsMatch {
  subWordIndexes: number[]
  matches: RegExpMatchArray[][]
}


function matchSubWords(wordInfo: WordInfo, expr: RegExp[] | string, pos?: MatchPos) {

  const result: SubWordsMatch = { subWordIndexes: [], matches: [] }

  let regExprs: RegExp[] = [];

  if (expr instanceof Array) {
    regExprs = [...expr];
  } else {
    if (!pos || pos === MatchPos.All) {
      regExprs.push(new RegExp(expr, "gdu"));
    } else {

      const init = (pos & MatchPos.Init) === MatchPos.Init
      const medi = (pos & MatchPos.Medi) === MatchPos.Medi
      const fina = (pos & MatchPos.Fina) === MatchPos.Fina
      const isol = (pos & MatchPos.Isol) === MatchPos.Isol;

      if (init) {
        if (!isol) {
          regExprs.push(new RegExp(`^${expr}.+$`, "gdu"));
        } else {
          regExprs.push(new RegExp(`^${expr}.*$`, "gdu"));
        }
      }
      if (medi) {
        regExprs.push(new RegExp(`^.+${expr}.+$`, "gdu"));
      }
      if (fina) {
        if (!isol) {
          regExprs.push(new RegExp(`^.+${expr}$`, "gdu"));
        } else {
          regExprs.push(new RegExp(`^.*${expr}$`, "gdu"));
        }
      }
      if (isol && !init && !fina) {
        regExprs.push(new RegExp(`^${expr}$`, "gdu"));
      }
    }

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
        const subWord = currentWord.subwords.at(-1)!!
        subWord.baseText += char;
        subWord.baseIndexes.push(i - currentWord.startIndex)
        if (i < lineText.length - 1 && rightNoJoinLetters.includes(char)) {
          currentWord.subwords.push({ baseText: "", baseIndexes: [] })
        }

      }
      currentWord.endIndex++;
    }
  }


  return lineTextInfo;
}

let cachedLayouts: Map<number, JustResultByLine[][]> = new Map()
