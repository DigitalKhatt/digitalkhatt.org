import { Injectable } from '@angular/core';

import { quranText } from './quran_text.js'

@Injectable({
  providedIn: 'root',
})
export class TajweedService {

  private TafkhimRE: RegExp
  private OthersRE: RegExp
  constructor() {

    // Tafkhim
    let pattern = "(?<tafkhim1>[طقصخغضظ]\u0651?[\u0652\u064B\u064E\u08F0\u064D\u0650\u08F2\u064C\u064F\u08F1])"

    // tafkhim Reh(8 possibilities http://www.quran-tajweed.net/tagweed/index.php/%D8%A7%D9%84%D8%B5%D9%81%D8%A7%D8%AA/%D8%AD%D8%A7%D9%84%D8%A7%D8%AA-%D8%AA%D9%81%D8%AE%D9%8A%D9%85-%D9%88%D8%AA%D8%B1%D9%82%D9%8A%D9%82-%D8%A7%D9%84%D8%B1%D8%A7%D8%A1)
    // http://www.dar-alquran.com/Detail.aspx?ArticleID=365

    // Dont Tafkhim
    // pos kasra /^reh/'lookup black @marks ( @marks | NULL ) ( @marks | NULL ) space /^aya|endofaya/;
    // pos /^ behshape / twodotsdown(sukun | NULL) /^ reh / 'lookup black  @marks ( @marks | NULL ) ( @marks | NULL ) space /^aya|endofaya/;
    pattern += "|(?:\u0650|\u064A\u0652?)ر\\p{Mn}+\\s۝"

    // pos /^reh/'lookup tafkim  (shadda | NULL)'lookup tafkim [fatha damma]'lookup tafkim     ;
    pattern += "|(?<tafkhim2>ر\u0651?[\u064E\u064F])"
    // pos wasla (/^reh/ sukun)'lookup tafkim;
    // pos [fatha damma] @bases (/dot/ | NULL) sukun  (/^reh/ sukun)'lookup tafkim;
    // pos [fatha damma] ([/^alef/ /^waw/] | NULL) (/^reh/ sukun)'lookup tafkim;	
    pattern += "|(?:ٱ|[\u0618\u0619](?:\\p{L}\u0652|[او]?))(?<tafkhim3>ر\u0652)"
    // pos [fatha damma] @bases (/dot/ | NULL) sukun  /^reh/'lookup tafkim  @marks ( @marks | NULL ) ( @marks | NULL ) space /^aya|endofaya/;
    // pos [fatha damma] ([/^alef/ /^waw/] | NULL) /^reh/'lookup tafkim  @marks ( @marks | NULL ) ( @marks | NULL ) space /^aya|endofaya/;
    pattern += "|[\u0618\u0619](?:\\p{L}\u0652|[او]?)(?<tafkhim4>ر)\\p{Mn}+\\s۝"
    // pos kasra (/^reh/ sukun)'lookup tafkim [/^sad/ /^tah/] | [/^ain/ /^hah/] onedotup | /^fehshape/ twodotsup;
    pattern += "|\u0650(?<tafkhim5>ر\u0652)[صطغخق]"

    this.TafkhimRE = new RegExp(pattern, "gdu");

    // gray
    pattern = "\\p{L}\\p{Mn}*(?<gray1>ٱ)(?!\u0644\\p{Mn}*ل\\p{Mn}*ه\\p{Mn}*(?:\\s|$))" // همزة الوصل داخل الكلمة
    pattern = pattern + "|ٱ(?<gray2>ل(?!\\p{Mn}*ل\\p{Mn}*ه\\p{Mn}*(?:\\s|$)))\\p{L}" // اللام الشمسية
    pattern = pattern + "|(?<gray3>\\p{L}\u06DF)"
    pattern = pattern + "|(?<gray4>[و])(?=\u0670)|(?<gray4_1>[ى])(?=\u0670\\p{L})"
    pattern = pattern + "|(?<gray5>ن)(?= [\u0646يمورل])"
    pattern = pattern + "|[\u064E\u064F\u0650](?<gray6>\\p{L})(?=\\s?\\p{L}\u0651)"

    //tanween
    pattern = pattern + "|(?<tanween1>\u0646[\u06E2\u06ED])|(?<tanween2>\u0646\u0651\\p{Mn})|(?<tanween3>[\u06E2\u06ED] \u0646)|(?<tanween4>\u0645 \u0628)|(?<tanween5>\u0646\\p{L})";
    pattern = pattern + "|(?<tanween6>[\u08F0\u08F1\u08F2\u0646])\\p{L}? (?<tanween7>[\u064A\u0648\u0645]\\p{Mn}\\p{Mn}?)"
    pattern = pattern + "|(?<tanween8>[\u08F0\u08F1\u08F2\u0646])\\p{L}? [\u0644\u0631]\u0651" // space [/^lam/ /^reh/] shadda

    pattern = pattern + "|(?<tanween9>[\u08F0\u08F1\u08F2\u0646])\\p{L}? \\p{L}" // space @bases;
    pattern = pattern + "|(?<tanween10>[من]\u0651\\p{Mn})" // /^meem|^noon/'lookup green shadda'lookup green @marks'lookup green;

    //madd
    pattern = pattern + "|(?<madd1>[او\u0670\u06E5\u06E6]\u0653)(?=\\p{L}\u0651)" // pos ([/^alef/ /^waw/ /^smallalef/ smallwaw smallyeh] maddahabove)'lookup red4 @bases  (/dot/ | NULL) shadda;
    pattern = pattern + "|(?<madd2>[\u0670\u06E5\u06E6])" // pos [smallwaw smallyeh smallalef.joined smallalef.isol smallalef.replacement]'lookup red1 @bases;
    pattern = pattern + "|[او\u0670\u06E5\u06E6]\u0653\\s۝" // pos ([/^alef/ /^waw/ /^smallalef/ smallwaw smallyeh] maddahabove)' space /^aya|endofaya/;
    pattern = pattern + "|(?<madd3>[لم]\u0653)" // pos ([/^lam/ /^meem/ ] maddahabove)'lookup red4;
    pattern = pattern + "|(?<madd4>[اويى\u0670\u06E5\u06E6]\u0653)" // pos ([/^alef/ /^waw/ /^alefmaksura/ /^yehshape/ /^smallalef/ smallwaw smallyeh ] maddahabove)'lookup red3;
    pattern = pattern + "|(?<madd5>[ياو\u0670]\u0652?)(?=\\p{L}\\p{Mn}\\p{Mn}?\\s۝)" // pos  /^waw/'lookup red2 (sukun | NULL)'lookup red2 @bases @marks ( @marks | NULL ) space /^aya|endofaya/;

    // kalkala
    pattern = pattern + "|(?<kalkala1>[\u0637\u0642\u062F\u062C\u0628]\u0652)"
    pattern = pattern + "|(?<kalkala2>[\u0637\u0642\u062F\u062C\u0628]) \u06DD"

    this.OthersRE = new RegExp(pattern, "gdu");
  }

  applyTajweed(pageIndex, lineIndex) {

    const lineText = quranText[pageIndex][lineIndex]

    // TODO
    const preText = ""
    const postText = ""

    const text = preText + lineText + postText


    let matches = text.matchAll(this.TafkhimRE);
    let match: any
    let group;

    const result = new Map();

    for (match of matches) {
      const groups = match.indices.groups
      if (group = groups.tafkhim1) {
        let firstPos = group[0] - preText.length;
        result.set(firstPos, "tafkim")
        result.set(firstPos + 1, "tafkim")
        if (group[0] + 2 < group[1]) {
          result.set(firstPos + 2, "tafkim")
        }
      } else if (group = groups.tafkhim2) {
        let firstPos = group[0] - preText.length;
        result.set(firstPos, "tafkim")
        result.set(firstPos + 1, "tafkim")
        if (group[0] + 2 < group[1]) {
          result.set(firstPos + 2, "tafkim")
        }
      } else if (group = groups.tafkhim3) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "tafkim")
        result.set(firstPos + 1, "tafkim")
      } else if (group = groups.tafkhim4) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "tafkim")
      } else if (group = groups.tafkhim5) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "tafkim")
        result.set(firstPos + 1, "tafkim")
      }
    }


    matches = text.matchAll(this.OthersRE);

    for (match of matches) {
      const groups = match.indices.groups
      if (group = groups.tanween1) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "lgray");
        result.set(firstPos + 1, "green");
      } else if (group = groups.tanween2) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "green");
        result.set(firstPos + 1, "green");
        result.set(firstPos + 2, "green");
      } else if (group = groups.tanween3) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "green");
      } else if (group = groups.tanween4) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "green");
      } else if (group = groups.tanween5) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "green");
      } else if (group = groups.tanween6) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "lgray");
        const tanween7Group = groups.tanween7
        const greenPos = tanween7Group[0] - preText.length;
        result.set(greenPos, "green");
        result.set(greenPos + 1, "green");
        if (tanween7Group[0] + 2 < tanween7Group[1]) {
          result.set(greenPos + 2, "green");
        }
      } else if (group = groups.tanween8) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "lgray");
      } else if (group = groups.tanween9) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "green");
      }
      else if (group = groups.tanween10) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "green");
        result.set(firstPos + 1, "green");
        result.set(firstPos + 2, "green");
      } else if (group = groups.gray1) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "lgray");
      } else if (group = groups.gray2) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "lgray");
      } else if (group = groups.gray3) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "lgray");
        result.set(firstPos + 1, "lgray");
      } else if (group = groups.gray4 || groups.gray4_1) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "lgray");
      } else if (group = groups.gray5) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "lgray");
      } else if (group = groups.gray6) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "lgray");
      } else if (group = groups.kalkala1) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "lkalkala");
        result.set(firstPos + 1, "lkalkala");
      } else if (group = groups.kalkala2) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "lkalkala");
      } else if (group = groups.madd1) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "red4");
        result.set(firstPos + 1, "red4");
      } else if (group = groups.madd2) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "red1");
      } else if (group = groups.madd3) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "red4");
        result.set(firstPos + 1, "red4");
      } else if (group = groups.madd4) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "red3");
        result.set(firstPos + 1, "red3");
      } else if (group = groups.madd5) {
        const firstPos = group[0] - preText.length;
        result.set(firstPos, "red2");
        if (group[0] + 1 < group[1]) {
          result.set(firstPos + 1, "red2");
        }
      }
    }
    return result
  }
}
