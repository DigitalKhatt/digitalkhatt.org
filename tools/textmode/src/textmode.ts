/**
 * Text mode: show a justified line as real HTML text.
 *
 * justifyLine() stretches single letters (cv01/cv02/cv10-cv18 on one
 * character). The DOM cannot do that: a <span> around one letter breaks
 * joining, and even with ZWJ the kerning and cursive attachment across span
 * edges are lost. But stretching never changes the number of glyphs in a word,
 * so each stretched word is "glyph k becomes glyph g'". A patched font
 * (patch_font.py) carries:
 *   - an AlternateSubst lookup: glyph -> its stretched variants (StretchTable)
 *   - features jp01..jpNN: jpKK replaces the glyph at position KK of the word,
 *     the feature value picking the variant
 * so a whole word is one span:
 *   <span style='font-feature-settings: "jp04" 3, "jp06" 1'>word</span>
 * and the browser produces exactly the glyphs HarfBuzz produces here.
 *
 * Browser-safe: depends only on harfbuzz.ts and the justification types.
 */
import { HarfBuzzBuffer, HarfBuzzFont, HBFeature, hb } from "../../../ClientApp/src/app/components/hbmedina/harfbuzz";
import type {
  JustResultByLine, LineTextInfo,
} from "../../../ClientApp/src/app/components/hbmedina/just.service";

/** glyph id -> stretched variants; CSS value v selects variants[v - 1]. */
export interface StretchTable {
  positions: number;                   // number of jpNN features in the font
  alternates: Record<string, number[]>;
}

export const tagFor = (position: number) => `jp${String(position + 1).padStart(2, "0")}`;

export interface TextModeWord {
  text: string;
  /** CSS font-feature-settings for the word span ("" = none). */
  featureSettings: string;
  /** Word stretched by the justifier but not expressible with this table/font. */
  unsupported?: string;
}

export interface TextModeLine {
  words: TextModeWord[];
  /** Advance of each space in font units, in line order (index i = space after word i). */
  spaces: number[];
  /** Horizontal scale for shrunk lines (justResult.xScale). */
  xScale: number;
}

/** Glyph ids of `text` as one buffer, logical order, same settings as getWordWidth(). */
export function wordGlyphs(font: HarfBuzzFont, text: string, features: HBFeature[]): number[] {
  const buffer = new HarfBuzzBuffer();
  buffer.setDirection("rtl");
  buffer.setLanguage(hb.arabLanguage);
  buffer.setScript(hb.arabScript);
  buffer.setClusterLevel(1);
  buffer.addText(text);
  const glyphs = buffer.shape(font, features).map(g => g.GlyphId);
  buffer.destroy();
  return glyphs.reverse();                       // RTL output is in visual order
}

/** Features of one word: line features + global features + per-character ones. */
export function wordFeatures(lineTextInfo: LineTextInfo, justResult: JustResultByLine,
  wordIndex: number, withCharFeatures = true): HBFeature[] {
  const word = lineTextInfo.wordInfos[wordIndex];
  const out: HBFeature[] = lineTextInfo.features ? [...lineTextInfo.features] : [];
  for (const f of justResult.globalFeatures || []) {
    out.push({ tag: f.name, value: f.value, start: 0, end: -1 });
  }
  if (!withCharFeatures) return out;
  for (let i = word.startIndex; i <= word.endIndex; i++) {
    for (const f of justResult.fontFeatures?.get(i) || []) {
      out.push({ tag: f.name, value: f.value, start: i - word.startIndex, end: i - word.startIndex + 1 });
    }
  }
  return out;
}

const cssList = (features: HBFeature[]) =>
  features.map(f => `"${f.tag}" ${f.value}`).join(", ");

/**
 * Per-word CSS for one justified line.
 * `collect`: when given, missing (glyph -> variant) pairs are added to `table`
 * instead of being reported (used to build the table).
 */
export function textModeLine(font: HarfBuzzFont, lineTextInfo: LineTextInfo,
  justResult: JustResultByLine, table: StretchTable, desiredWidth: number,
  collect = false): TextModeLine {
  const words: TextModeWord[] = [];
  let wordsWidth = 0;
  lineTextInfo.wordInfos.forEach((word, wordIndex) => {
    const base = wordFeatures(lineTextInfo, justResult, wordIndex, false);
    const all = wordFeatures(lineTextInfo, justResult, wordIndex, true);
    const css: HBFeature[] = base.map(f => ({ ...f }));
    let unsupported: string | undefined;
    if (all.length > base.length) {
      const plain = wordGlyphs(font, word.text, base);
      const stretched = wordGlyphs(font, word.text, all);
      if (plain.length !== stretched.length) {
        unsupported = "glyph count changed";
      } else {
        for (let k = 0; k < plain.length && !unsupported; k++) {
          if (plain[k] === stretched[k]) continue;
          const key = String(plain[k]);
          const variants = table.alternates[key] || (collect ? (table.alternates[key] = []) : []);
          let v = variants.indexOf(stretched[k]);
          if (v < 0 && collect) { variants.push(stretched[k]); v = variants.length - 1; }
          if (k >= table.positions && collect) table.positions = k + 1;
          if (v < 0) unsupported = `no variant ${plain[k]}->${stretched[k]}`;
          else if (k >= table.positions) unsupported = `position ${k + 1} > jp${table.positions}`;
          else css.push({ tag: tagFor(k), value: v + 1, start: 0, end: -1 });
        }
      }
    }
    const used = unsupported ? base : all;
    wordsWidth += widthOf(font, word.text, used);
    words.push({ text: word.text, featureSettings: unsupported ? cssList(base) : cssList(css), unsupported });
  });

  // Spaces: the justifier's simple/aya spacing, then whatever is left to reach
  // the line width (words are measured one by one, as the DOM shapes them).
  const spaces: number[] = [];
  const spaceIndexes = [...lineTextInfo.spaces.keys()].sort((a, b) => a - b);
  for (const idx of spaceIndexes) {
    spaces.push(lineTextInfo.spaces.get(idx) === 2 /* SpaceType.Aya */ ? justResult.ayaSpacing : justResult.simpleSpacing);
  }
  if (justResult.xScale === 1 && spaces.length) {
    const total = wordsWidth + spaces.reduce((a, b) => a + b, 0);
    const extra = (desiredWidth - total) / spaces.length;
    for (let i = 0; i < spaces.length; i++) spaces[i] += extra;
  }
  return { words, spaces, xScale: justResult.xScale };
}

function widthOf(font: HarfBuzzFont, text: string, features: HBFeature[]): number {
  const buffer = new HarfBuzzBuffer();
  buffer.setDirection("rtl");
  buffer.setLanguage(hb.arabLanguage);
  buffer.setScript(hb.arabScript);
  buffer.setClusterLevel(1);
  buffer.addText(text);
  const w = buffer.shape(font, features).reduce((s, g) => s + g.XAdvance, 0);
  buffer.destroy();
  return w;
}

/** Helper for pages: HTML for one line (font-size in px, widths in font units). */
export function textModeLineHtml(line: TextModeLine, fontSize: number, unitsPerEm = 1000): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const parts: string[] = [];
  line.words.forEach((w, i) => {
    if (i > 0) {
      parts.push(`<span class="tm-space" style="display:inline-block;width:${(line.spaces[i - 1] / unitsPerEm).toFixed(4)}em"> </span>`);
    }
    const style = w.featureSettings ? ` style='font-feature-settings: ${w.featureSettings}'` : "";
    parts.push(`<span class="tm-word"${style}>${esc(w.text)}</span>`);
  });
  const scale = line.xScale !== 1 ? ` style="transform:scaleX(${line.xScale});transform-origin:right"` : "";
  return `<div class="tm-line" dir="rtl"${scale}>${parts.join("")}</div>`;
}
