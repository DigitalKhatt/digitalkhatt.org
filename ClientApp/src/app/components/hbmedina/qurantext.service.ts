import { Injectable } from '@angular/core';

import { quranText as quranTextOldMadinah } from './quran_text_old_madinah'
import { quranText } from './quran_text_old_madinah'

@Injectable({
  providedIn: 'root',
})
export class QuranTextService {

  private quranInfo: any[];
  private _outline: any[] = [];
  private _quranText: string[][];
  private _sajsdas: any[] = [];

  private madinaLineWidths = new Map([
    [600 * 15 + 9, 0.84],
    [602 * 15 + 5, 0.61],
    [602 * 15 + 15, 0.59],
    [603 * 15 + 10, 0.68],
    [604 * 15 + 4, 0.836],
    [604 * 15 + 9, 0.836],
    [604 * 15 + 14, 0.717],
    [604 * 15 + 15, 0.54],
  ]);  

  constructor(qt : string[][] ) {

    this._quranText = qt;

    const start = performance.now();

    const suraWord = "سُورَةُ";
    const bism = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

    const surabismpattern = "^(?<sura>"
      + suraWord + " .*)|(?<bism>"
      + bism
      + "|" + "بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
      + ")$";

    const sajdapatterns = "(وَٱسْجُدْ) وَٱقْتَرِب|(خَرُّوا۟ سُجَّدࣰا)|(وَلِلَّهِ يَسْجُدُ)|(يَسْجُدُونَ)۩|(فَٱسْجُدُوا۟ لِلَّهِ)|(وَٱسْجُدُوا۟ لِلَّهِ)|(أَلَّا يَسْجُدُوا۟ لِلَّهِ)|(وَخَرَّ رَاكِعࣰا)|(يَسْجُدُ لَهُ)|(يَخِرُّونَ لِلْأَذْقَانِ سُجَّدࣰا)|(ٱسْجُدُوا۟) لِلرَّحْمَٰنِ|ٱرْكَعُوا۟ (وَٱسْجُدُوا۟)"; // sajdapatterns.replace("\u0657", "\u08F0").replace("\u065E", "\u08F1").replace("\u0656", "\u08F2");
    const sajdaRegExpr = new RegExp(sajdapatterns, "du")


    const regexpr = new RegExp(surabismpattern, "u")

    const ratio = 0.9;
    for (let pageIndex = 0; pageIndex < 2; pageIndex++) {
      const pageNumber = pageIndex + 1
      this.madinaLineWidths.set(pageNumber * 15 + 2, ratio * 0.5)
      this.madinaLineWidths.set(pageNumber * 15 + 3, ratio * 0.7)
      this.madinaLineWidths.set(pageNumber * 15 + 4, ratio * 0.9)
      this.madinaLineWidths.set(pageNumber * 15 + 5, ratio)
      this.madinaLineWidths.set(pageNumber * 15 + 6, ratio * 0.9)
      this.madinaLineWidths.set(pageNumber * 15 + 7, ratio * 0.7)
      this.madinaLineWidths.set(pageNumber * 15 + 8, ratio * 0.4)
    }

    this.quranInfo = [];
    for (let pageIndex = 0; pageIndex < this._quranText.length; pageIndex++) {
      const pageInfo = []
      this.quranInfo.push(pageInfo)
      const page = this._quranText[pageIndex];
      for (let lineIndex = 0; lineIndex < page.length; lineIndex++) {
        const line = page[lineIndex];
        const lineInfo: any = {}
        pageInfo.push(lineInfo)
        lineInfo.lineWidthRatio = this.madinaLineWidths.get((pageIndex + 1) * 15 + lineIndex + 1) || 1
        lineInfo.lineType = 0;
        const match = line.match(regexpr)
        if (match?.groups.sura) {
          lineInfo.lineType = 1
          this._outline.push({
            name: match?.groups.sura,
            pageIndex: pageIndex,
            lineIndex: lineIndex
          })

        } else if (match?.groups.bism) {
          lineInfo.lineType = 2
        }

        const sajdaMatch = line.match(sajdaRegExpr)
        if (sajdaMatch) {          
          for (let i = 1; i < sajdaMatch.length; i++) {
            if (sajdaMatch[i]) {
              var pos = (sajdaMatch as any).indices[i]
              let startWordIndex = null;
              let endWordIndex = null;
              let currentWordIndex = 0;
              for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line.charAt(charIndex);

                const isSpace = char === " "
                
                if (startWordIndex == null && charIndex >= pos[0]) {
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
              lineInfo.sajda = { startWordIndex, endWordIndex }
              this._sajsdas.push({ pageIndex, lineIndex, startWordIndex, endWordIndex/*, words: sajdaMatch[i]*/ })
            }
          }
        }
      }
    }
    console.info(`sajdasMatched=${this._sajsdas.length}`);
    console.log(`QuranTextService constructor=${performance.now() - start}`)

  }

  getLineInfo(pageIndex, lineIndex): any {
    return this.quranInfo[pageIndex][lineIndex]
  }

  get outline(): any[] {
    return this._outline;
  }

  get nbPages(): number {
    return this._quranText.length
  }

  get sajdas(): any[] {
    return this._sajsdas
  }
  get quranText(): string[][] {
    return this._quranText
  }
}

export const OldMadinahQuranTextService = new QuranTextService(quranTextOldMadinah);
export const NewMadinahQuranTextService = new QuranTextService(quranText);
