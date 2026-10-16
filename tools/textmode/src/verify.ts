// Whole-Quran check of text mode against the app's own rendering.
//
// For every justified line at each font scale: justify with the app's
// justifyLine(), turn the result into per-word CSS (textmode.ts), then shape
// each stretched word twice and require identical output:
//   reference: original font + the app's per-character cvNN features
//   text mode: patched font  + the word's jpNN features (one span)
// "Identical" means same glyph ids, advances and offsets for every glyph.
// Also checks that words + spaces add up to the line width.
//
//   node dist/verify.mjs --layout newmadina --font out/madina-textmode.otf \
//        --table out/newmadina-stretch.json [--scales 1,0.73,1.07]
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import * as App from "./app";
import { initHarfBuzz, loadFont } from "./node-env";
import { LAYOUTS, fontSizeLineWidthRatio, isJustifiedLine, justify, parseScales } from "./layouts";
import { StretchTable, textModeLine, wordFeatures } from "./textmode";

const { values } = parseArgs({
  options: {
    layout: { type: "string", default: "newmadina" },
    font: { type: "string" },
    table: { type: "string" },
    scales: { type: "string", default: "1,0.73,0.88,1.07,1.18" },
    assets: { type: "string", default: "../../ClientApp/src/assets" },
    // share of words allowed to fall back to unstretched (stretch not in the table)
    "max-unsupported": { type: "string", default: "0.0001" },
  },
});
const layout = LAYOUTS[values.layout!];
const assets = resolve(values.assets!);
const fontPath = values.font ?? `out/${layout.name.replace("newmadina", "madina")}-textmode.otf`;
const table: StretchTable = JSON.parse(readFileSync(values.table ?? `out/${layout.name}-stretch.json`, "utf8"));

await initHarfBuzz(`${assets}/hb.wasm`);
const original = await loadFont("original", `${assets}/fonts/${layout.font}`);
const patched = await loadFont("patched", fontPath);
const spaceWidth = App.getWidth(" ", original, App.FONTSIZE, null);

type G = { GlyphId: number, XAdvance: number, YAdvance: number, XOffset: number, YOffset: number };
function shapeWord(font: App.HarfBuzzFont, text: string, features: App.HBFeature[]): G[] {
  const buffer = new App.HarfBuzzBuffer();
  buffer.setDirection("rtl");
  buffer.setLanguage(App.hb.arabLanguage);
  buffer.setScript(App.hb.arabScript);
  buffer.setClusterLevel(1);
  buffer.addText(text);
  const out = buffer.shape(font, features);
  buffer.destroy();
  return out;
}
const same = (a: G[], b: G[]) => a.length === b.length && a.every((g, i) =>
  g.GlyphId === b[i].GlyphId && g.XAdvance === b[i].XAdvance && g.YAdvance === b[i].YAdvance &&
  g.XOffset === b[i].XOffset && g.YOffset === b[i].YOffset);
function parseCss(css: string): App.HBFeature[] {
  if (!css) return [];
  return css.split(", ").map(part => {
    const m = /^"(\w{4})" (\d+)$/.exec(part);
    if (!m) throw new Error(`bad css feature ${part}`);
    return { tag: m[1], value: Number(m[2]), start: 0, end: -1 };
  });
}

let lines = 0, words = 0, stretched = 0, mismatches = 0, unsupported = 0, widthErrors = 0;
const examples: string[] = [];
for (const scale of parseScales(values.scales!)) {
  let scaleUnsupported = 0;
  for (let p = 0; p < layout.service.nbPages; p++) {
    for (let l = 0; l < layout.service.quranText[p].length; l++) {
      if (!isJustifiedLine(layout, p, l)) continue;
      const { info, lineTextInfo, justResult } = justify(layout, original, spaceWidth, p, l, scale);
      const desired = App.FONTSIZE / (fontSizeLineWidthRatio(layout, scale) / info.lineWidthRatio);
      const tm = textModeLine(original, lineTextInfo, justResult, table, desired);
      lines++;
      let lineWidth = 0;
      tm.words.forEach((w, wi) => {
        words++;
        const css = parseCss(w.featureSettings);
        const mine = shapeWord(patched, w.text, css);
        lineWidth += mine.reduce((s, g) => s + g.XAdvance, 0);
        if (w.unsupported) {
          unsupported++; scaleUnsupported++;
          if (examples.length < 10) examples.push(`unsupported p${p + 1} l${l + 1} "${w.text}" @${scale}: ${w.unsupported}`);
          return;
        }
        if (!css.some(f => f.tag.startsWith("jp"))) return;
        stretched++;
        const reference = shapeWord(original, w.text, wordFeatures(lineTextInfo, justResult, wi));
        if (!same(reference, mine)) {
          mismatches++;
          if (examples.length < 10) examples.push(`MISMATCH p${p + 1} l${l + 1} "${w.text}" @${scale} css=${w.featureSettings}`);
        }
      });
      if (tm.xScale === 1 && tm.spaces.length) {
        lineWidth += tm.spaces.reduce((a, b) => a + b, 0);
        if (Math.abs(lineWidth - desired) > 0.5) {
          widthErrors++;
          if (examples.length < 10) examples.push(`WIDTH p${p + 1} l${l + 1} @${scale}: ${lineWidth.toFixed(1)} vs ${desired.toFixed(1)}`);
        }
      }
    }
  }
  console.log(`scale ${scale}: done (${scaleUnsupported} unsupported words)`);
}

console.log(`\n${layout.name}: ${lines} lines, ${words} words, ${stretched} stretched words checked`);
console.log(`  glyph-identical to the app's rendering: ${stretched - mismatches}/${stretched}`);
console.log(`  words the table cannot express (shown unstretched): ${unsupported}` +
  ` (${(100 * unsupported / words).toFixed(4)}%)`);
console.log(`  lines not filling their width: ${widthErrors}`);
examples.forEach(e => console.log("  " + e));
const ok = mismatches === 0 && widthErrors === 0 &&
  unsupported <= Number(values["max-unsupported"]) * words;
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
