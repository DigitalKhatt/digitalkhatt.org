import { Injectable } from '@angular/core';

import { quranText as quranTextOldMadinah } from './quran_text_old_madinah'
import { quranText } from './quran_text'


export enum LineType {
  Content = 0,
  Sura,
  Basmala,
}

@Injectable({
  providedIn: 'root',
})
export class QuranTextService {

  private quranInfo: any[];
  private _outline: any[] = [];
  private _quranText: string[][];
  private _sajsdas: any[] = [];

  private oldMadinaLineWidths = new Map([
    [600 * 15 + 9, 0.84],
    [602 * 15 + 5, 0.61],
    [602 * 15 + 15, 0.59],
    [603 * 15 + 10, 0.68],
    [604 * 15 + 4, 0.836],
    [604 * 15 + 9, 0.836],
    [604 * 15 + 14, 0.717],
    [604 * 15 + 15, 0.54],
  ]);

  private newMadinaLineWidths = new Map([
    [586 * 15 + 1, 0.81],
    [593 * 15 + 2, 0.81],
    [594 * 15 + 5, 0.63],
    [600 * 15 + 10, 0.63],
    [601 * 15 + 3, 1],
    [601 * 15 + 4, 1],
    [601 * 15 + 7, 1],
    [601 * 15 + 8, 1],
    [601 * 15 + 9, 1],
    [601 * 15 + 10, 1],
    [601 * 15 + 13, 1],
    [601 * 15 + 14, 1],
    [601 * 15 + 15, 1],
    [602 * 15 + 5, 0.63],
    [602 * 15 + 11, 0.9],
    [602 * 15 + 15, 0.53],
    [603 * 15 + 10, 0.66],
    [603 * 15 + 13, 1],
    [603 * 15 + 15, 0.60],
    [604 * 15 + 3, 1],
    [604 * 15 + 4, 0.55],
    [604 * 15 + 7, 1],
    [604 * 15 + 8, 1],
    [604 * 15 + 9, 0.55],
    [604 * 15 + 12, 1],
    [604 * 15 + 13, 1],
    [604 * 15 + 14, 0.675],
    [604 * 15 + 15, 0.5],
  ]);

  constructor(qt: string[][], public isOld: boolean) {

    //const t0 = performance.now()
    // Correct hamza reordering otherwise the feature applied to the base is also applied to the fatha    
    let qurantext = qt.map(page => page.map(line => line.replaceAll("\u0654", "\u034F\u0654\u034F")));    
    qurantext = qurantext.map(page => page.map(line => line.replaceAll("آ", "\u0627\u034F\u0653")));    
    //console.log(`quranreplace=${performance.now() - t0}`);

    this._quranText = qurantext;

    const start = performance.now();

    const suraWord = "سُورَةُ";
    const bism = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

    const surabismpattern = "^(?<sura>"
      + suraWord + " .*)|(?<bism>"
      + bism
      + "|" + "بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
      + ")$";

    let sajdapatterns = "(وَٱسْجُدْ) وَٱقْتَرِب|(خَرُّوا۟ سُجَّدࣰا)|(وَلِلَّهِ يَسْجُدُ)|(يَسْجُدُونَ)۩|(فَٱسْجُدُوا۟ لِلَّهِ)|(وَٱسْجُدُوا۟ لِلَّهِ)|(أَلَّا يَسْجُدُوا۟ لِلَّهِ)|(وَخَرَّ رَاكِعࣰا)|(يَسْجُدُ لَهُ)|(يَخِرُّونَ لِلْأَذْقَانِ سُجَّدࣰا)|(ٱسْجُدُوا۟) لِلرَّحْمَٰنِ|ٱرْكَعُوا۟ (وَٱسْجُدُوا۟)"; // sajdapatterns.replace("\u0657", "\u08F0").replace("\u065E", "\u08F1").replace("\u0656", "\u08F2");
    sajdapatterns = sajdapatterns.replaceAll("\u0654", "\u034F\u0654\u034F");    
    sajdapatterns = sajdapatterns.replaceAll("آ", "\u0627\u034F\u0653");  

    const sajdaRegExpr = new RegExp(sajdapatterns, "du")


    const regexpr = new RegExp(surabismpattern, "u")

    const madinaLineWidths = isOld ? this.oldMadinaLineWidths : this.newMadinaLineWidths;

    const ratio = 0.9;
    for (let pageIndex = 0; pageIndex < 2; pageIndex++) {
      const pageNumber = pageIndex + 1
      madinaLineWidths.set(pageNumber * 15 + 2, ratio * 0.5)
      madinaLineWidths.set(pageNumber * 15 + 3, ratio * 0.7)
      madinaLineWidths.set(pageNumber * 15 + 4, ratio * 0.9)
      madinaLineWidths.set(pageNumber * 15 + 5, ratio)
      madinaLineWidths.set(pageNumber * 15 + 6, ratio * 0.9)
      madinaLineWidths.set(pageNumber * 15 + 7, ratio * 0.7)
      madinaLineWidths.set(pageNumber * 15 + 8, ratio * 0.4)
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
        lineInfo.lineWidthRatio = madinaLineWidths.get((pageIndex + 1) * 15 + lineIndex + 1) || 1
        lineInfo.lineType = LineType.Content;
        const match = line.match(regexpr)
        if (match?.groups.sura) {
          lineInfo.lineType = LineType.Sura
          this._outline.push({
            name: match?.groups.sura,
            pageIndex: pageIndex,
            lineIndex: lineIndex
          })

        } else if (match?.groups.bism) {
          lineInfo.lineType = LineType.Basmala
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

export const OldMadinahQuranTextService = new QuranTextService(quranTextOldMadinah, true);
export const NewMadinahQuranTextService = new QuranTextService(quranText, false);
