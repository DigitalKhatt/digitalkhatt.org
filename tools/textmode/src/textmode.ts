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
import { clearanceOffset, placedDistance, placedProfile, wordProfile } from "./ink";

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
  /** Advance of each space in font units, in line order (index i = space after word i).
   *  Can be negative with `overfull: "words"` (word boxes overlap, their ink does not). */
  spaces: number[];
  /** Horizontal scale of the whole line (justResult.xScale, or what is left of it). */
  xScale: number;
  /** overfull: "words" — horizontal scale of each word (aya numbers keep 1)... */
  wordScales?: number[];
  /** ...about which side of its box: the line's first word from the right, its last from the left. */
  wordOrigins?: ("right" | "left" | "center")[];
}

export interface TextModeOptions {
  /**
   * How a line wider than its width (justResult.xScale < 1) is fitted:
   *  - "line" (default): the whole line is scaled, as the SVG renderer does;
   *  - "words": the words are narrowed instead, never the aya numbers or the
   *    spaces, as the printed mushaf writes dense lines; below `minWordScale`
   *    the rest goes back to the line.
   */
  overfull?: "line" | "words";
  minWordScale?: number;
  /**
   * The SVG renderer shapes the whole line at once, so the font's contextual
   * positioning can act across a space (e.g. a word-initial kaf after a pause
   * mark gets room). Word spans are shaped one by one and lose that. With
   * contextualSpacing (default true) each space is corrected so the two
   * words' ink is exactly as far apart as in the SVG renderer; the line keeps
   * its width (the difference is spread evenly over its spaces).
   */
  contextualSpacing?: boolean;
}

/** Aya-number tokens (۝ + digits). */
export const isAyaNumber = (text: string) => text.includes("\u06DD");

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
  collect = false, options: TextModeOptions = {}): TextModeLine {
  const words: TextModeWord[] = [];
  const advances: number[] = [];
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
    const advance = widthOf(font, word.text, used);
    advances.push(advance);
    wordsWidth += advance;
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
  if (options.contextualSpacing !== false && spaces.length) {
    matchLineInk(font, lineTextInfo, justResult, words, spaces);
  }
  if (justResult.xScale < 1 && options.overfull === "words" && words.length > 1) {
    return narrowWords(words, advances, spaces, desiredWidth, options.minWordScale ?? 0.8);
  }
  return { words, spaces, xScale: justResult.xScale };
}

/** Features of the whole line, exactly as page_view.ts renderLine() builds them. */
export function lineFeatures(lineTextInfo: LineTextInfo, justResult: JustResultByLine): HBFeature[] {
  const out: HBFeature[] = lineTextInfo.features ? [...lineTextInfo.features] : [];
  for (const f of justResult.globalFeatures || []) out.push({ tag: f.name, value: f.value, start: 0, end: -1 });
  for (const word of lineTextInfo.wordInfos) {
    for (let i = word.startIndex; i <= word.endIndex; i++) {
      for (const f of justResult.fontFeatures?.get(i) || []) out.push({ tag: f.name, value: f.value, start: i, end: i + 1 });
    }
  }
  return out;
}

/**
 * Glyphs of the whole line placed as page_view.ts renderLine() places them:
 * right to left from x = 0, spaces at the justified spacing.
 */
export function lineGlyphPlacement(font: HarfBuzzFont, lineTextInfo: LineTextInfo, justResult: JustResultByLine) {
  const buffer = new HarfBuzzBuffer();
  buffer.setDirection("rtl");
  buffer.setLanguage(hb.arabLanguage);
  buffer.setScript(hb.arabScript);
  buffer.setClusterLevel(1);
  buffer.addText(lineTextInfo.lineText);
  const result = buffer.shape(font, lineFeatures(lineTextInfo, justResult));
  buffer.destroy();
  const placed: { glyphId: number, cluster: number, x: number, y: number }[] = [];
  let x = 0;
  for (let i = result.length - 1; i >= 0; i--) {
    const g = result[i];
    const space = lineTextInfo.spaces.get(g.Cluster);
    x -= space === 2 /* Aya */ ? justResult.ayaSpacing : space === 1 /* Simple */ ? justResult.simpleSpacing : g.XAdvance;
    placed.push({ glyphId: g.GlyphId, cluster: g.Cluster, x: x + g.XOffset, y: g.YOffset });
  }
  return placed;
}

/** Correct each space so the ink gap of its two words equals the SVG renderer's. */
function matchLineInk(font: HarfBuzzFont, lineTextInfo: LineTextInfo, justResult: JustResultByLine,
  words: TextModeWord[], spaces: number[]) {
  const placed = lineGlyphPlacement(font, lineTextInfo, justResult);
  const inLine = lineTextInfo.wordInfos.map(w =>
    placedProfile(font, placed.filter(g => g.cluster >= w.startIndex && g.cluster <= w.endIndex)));
  // each span shaped alone: the original font with the word's per-character features gives
  // exactly the glyphs the patched font's jpNN span gives (that is what verify checks)
  const asSpans = words.map((w, i) =>
    wordProfile(font, w.text, wordFeatures(lineTextInfo, justResult, i, !w.unsupported)));
  let moved = 0;
  for (let k = 0; k < spaces.length; k++) {
    const want = placedDistance(inLine[k], inLine[k + 1]);
    const have = spaces[k] + clearanceOffset(asSpans[k], asSpans[k + 1]);
    const delta = Number.isFinite(want) && Number.isFinite(have) ? want - have : 0;
    if (Math.abs(delta) >= 1) { spaces[k] += delta; moved += delta; }
  }
  if (moved !== 0 && justResult.xScale === 1) {
    // keep the line width: every space gives (or takes) an equal share, so all gaps keep
    // the SVG renderer's proportions (it may itself leave such a line a little short)
    for (let k = 0; k < spaces.length; k++) spaces[k] -= moved / spaces.length;
  }
}

/**
 * Overfull line, print style: one scale c for the words (not the aya numbers,
 * not the spaces) so the line fits; below minScale the line takes the rest.
 * Words are scaled by a CSS transform, which keeps their boxes, so each space
 * gives back what its neighbours lost on their inner sides.
 */
function narrowWords(words: TextModeWord[], advances: number[], spaces: number[],
  desiredWidth: number, minScale: number): TextModeLine {
  const marker = words.map(w => isAyaNumber(w.text));
  const fixed = spaces.reduce((a, b) => a + b, 0) + advances.reduce((s, a, i) => s + (marker[i] ? a : 0), 0);
  const scalable = advances.reduce((s, a, i) => s + (marker[i] ? 0 : a), 0);
  let c = scalable > 0 ? (desiredWidth - fixed) / scalable : 1;
  let xScale = 1;
  if (c < minScale) {
    c = minScale;
    xScale = desiredWidth / (fixed + c * scalable);
  }
  c = Math.min(1, c);
  const n = words.length;
  const wordScales = marker.map(m => (m ? 1 : c));
  const wordOrigins = words.map((_, i) => (i === 0 ? "right" : i === n - 1 ? "left" : "center") as const);
  const inner = (i: number, side: "right" | "left") => {
    const lost = (1 - wordScales[i]) * advances[i];
    if (wordOrigins[i] === "center") return lost / 2;
    return (wordOrigins[i] === "right") === (side === "left") ? lost : 0;
  };
  const domSpaces = spaces.map((s, k) => s - inner(k, "left") - inner(k + 1, "right"));
  return { words, spaces: domSpaces, xScale, wordScales, wordOrigins };
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
      const em = (line.spaces[i - 1] / unitsPerEm).toFixed(4);
      // a negative space overlaps the word boxes (never their ink): pull the next word in
      const css = line.spaces[i - 1] >= 0 ? `width:${em}em` : `width:0;margin-left:${em}em`;
      parts.push(`<span class="tm-space" style="display:inline-block;${css}"> </span>`);
    }
    const styles: string[] = [];
    if (w.featureSettings) styles.push(`font-feature-settings: ${w.featureSettings}`);
    const c = line.wordScales?.[i] ?? 1;
    if (c !== 1) {
      styles.push(`display:inline-block;transform:scaleX(${c.toFixed(4)});transform-origin:${line.wordOrigins![i]}`);
    }
    const style = styles.length ? ` style='${styles.join(";")}'` : "";
    parts.push(`<span class="tm-word"${style}>${esc(w.text)}</span>`);
  });
  const scale = line.xScale !== 1 ? ` style="transform:scaleX(${line.xScale.toFixed(4)});transform-origin:right"` : "";
  return `<div class="tm-line" dir="rtl"${scale}>${parts.join("")}</div>`;
}
