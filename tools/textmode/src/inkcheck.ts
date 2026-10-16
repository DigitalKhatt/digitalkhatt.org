// Do neighbouring words keep clear of each other? For every justified line,
// lay the line out in text mode (textModeLine) and measure the closest ink
// distance between each pair of neighbouring words, band by band (ink.ts).
//
//   node dist/inkcheck.mjs --layout newmadina [--scales 1] [--overfull line|words]
//
// Reports distances in font units at FONTSIZE 1000 (an em), after the line's
// scaleX. "touching" means closer than --touch units (default 10, 1% of an em).
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import * as App from "./app";
import { initHarfBuzz, loadFont } from "./node-env";
import { LAYOUTS, fontSizeLineWidthRatio, isJustifiedLine, justify, parseScales } from "./layouts";
import { StretchTable, TextModeLine, lineGlyphPlacement, textModeLine } from "./textmode";
import { clearanceOffset, placedDistance, placedProfile, wordProfile } from "./ink";

const { values } = parseArgs({
  options: {
    layout: { type: "string", default: "newmadina" },
    font: { type: "string" },
    table: { type: "string" },
    scales: { type: "string", default: "1" },
    overfull: { type: "string", default: "line" },
    contextual: { type: "string", default: "true" },
    touch: { type: "string", default: "10" },
    report: { type: "string" },
    assets: { type: "string", default: "../../ClientApp/src/assets" },
  },
});
const layout = LAYOUTS[values.layout!];
const assets = resolve(values.assets!);
const fontPath = values.font ?? `out/${layout.name.replace("newmadina", "madina")}-textmode.otf`;
const table: StretchTable = JSON.parse(readFileSync(values.table ?? `out/${layout.name}-stretch.json`, "utf8"));
const touch = Number(values.touch);

await initHarfBuzz(`${assets}/hb.wasm`);
const original = await loadFont("original", `${assets}/fonts/${layout.font}`);
const patched = await loadFont("patched", fontPath);
const spaceWidth = App.getWidth(" ", original, App.FONTSIZE, null);

const parseCss = (css: string): App.HBFeature[] => !css ? [] : css.split(", ").map(p => {
  const [tag, v] = p.replace(/"/g, "").split(" ");
  return { tag, value: Number(v), start: 0, end: -1 };
});

/** Ink distances between neighbouring words of one text-mode line, after scaling. */
export function lineGaps(tm: TextModeLine): number[] {
  const profiles = tm.words.map(w => wordProfile(patched, w.text, parseCss(w.featureSettings)));
  const gaps: number[] = [];
  for (let i = 0; i + 1 < tm.words.length; i++) {
    const cr = tm.wordScales?.[i] ?? 1, cl = tm.wordScales?.[i + 1] ?? 1;
    // narrowed words keep their box (CSS transform): add back what each lost inside
    const lost = (k: number, c: number, side: "right" | "left") => {
      if (c === 1) return 0;
      const origin = tm.wordOrigins?.[k] ?? "center";
      const l = (1 - c) * profiles[k].advance;
      if (origin === "center") return l / 2;
      return (origin === "right") === (side === "left") ? l : 0;
    };
    const space = tm.spaces[i] + lost(i, cr, "left") + lost(i + 1, cl, "right");
    gaps.push((space + clearanceOffset(profiles[i], profiles[i + 1], cr, cl)) * tm.xScale);
  }
  return gaps;
}

const all: number[] = [], worst: { where: string, gap: number, svg: number, words: string }[] = [];
let lines = 0, touching = 0, linesTouching = 0, svgTouching = 0, differ = 0, svgShort = 0, fallbackGaps = 0;
for (const scale of parseScales(values.scales!)) {
  for (let p = 0; p < layout.service.nbPages; p++) {
    for (let l = 0; l < layout.service.quranText[p].length; l++) {
      if (!isJustifiedLine(layout, p, l)) continue;
      const { info, lineTextInfo, justResult } = justify(layout, original, spaceWidth, p, l, scale);
      const desired = App.FONTSIZE / (fontSizeLineWidthRatio(layout, scale) / info.lineWidthRatio);
      const tm = textModeLine(original, lineTextInfo, justResult, table, desired, false,
        { overfull: values.overfull as "line" | "words", contextualSpacing: values.contextual !== "false" });
      const gaps = lineGaps(tm);
      // the SVG renderer's own gaps (whole line shaped at once)
      const placed = lineGlyphPlacement(original, lineTextInfo, justResult);
      const svgProfiles = lineTextInfo.wordInfos.map(w =>
        placedProfile(original, placed.filter(g => g.cluster >= w.startIndex && g.cluster <= w.endIndex)));
      lines++;
      let hit = false;
      const svgGaps = gaps.map((_, i) => placedDistance(svgProfiles[i], svgProfiles[i + 1]) * justResult.xScale);
      // the SVG renderer occasionally leaves a line a little short of its width (text mode
      // always fills it): compare gaps up to that line-wide difference
      const diffs = gaps.map((g, i) => g - svgGaps[i]).filter(Number.isFinite).sort((a, b) => a - b);
      const offset = diffs.length ? diffs[Math.floor(diffs.length / 2)] : 0;
      if (Math.abs(offset) > 1) svgShort++;
      gaps.forEach((g, i) => {
        all.push(g);
        const svg = svgGaps[i];
        if (svg < touch) svgTouching++;
        // a word the stretch table cannot express is shown unstretched: its gaps can't match
        const fallback = !!(tm.words[i].unsupported || tm.words[i + 1].unsupported);
        if (fallback) fallbackGaps++;
        else if (values.overfull === "line" && Math.abs(g - svg - offset) > 1 && Math.abs(g - svg) > 1) {
          differ++;
          if (differ <= 5) console.log(`  differs p${p + 1} l${l + 1} gap ${i}: text ${g.toFixed(1)} svg ${svg.toFixed(1)}  ${tm.words[i].text} | ${tm.words[i + 1].text}`);
        }
        if (g < touch && !(svg < touch)) {
          touching++; hit = true;
          worst.push({ where: `p${p + 1} l${l + 1} @${scale}`, gap: g, svg,
            words: `${tm.words[i].text} | ${tm.words[i + 1].text}` });
        }
      });
      if (hit) linesTouching++;
    }
  }
}
all.sort((a, b) => a - b);
const pct = (q: number) => all[Math.min(all.length - 1, Math.floor(q * all.length))].toFixed(0);
console.log(`${layout.name} (overfull: ${values.overfull}): ${lines} lines, ${all.length} word gaps`);
console.log(`  ink gap (font units, em = 1000): p1 ${pct(0.01)}  p5 ${pct(0.05)}  median ${pct(0.5)}  p95 ${pct(0.95)}`);
if (values.overfull === "line") {
  console.log(`  gaps differing from the SVG renderer by more than 1 unit: ${differ}` +
    ` (not counted: ${fallbackGaps} next to a word shown unstretched)`);
  console.log(`  (lines the SVG renderer leaves short of their width, gaps compared up to that: ${svgShort})`);
}
console.log(`  closer than ${touch} in the SVG renderer itself (by design, e.g. basmala): ${svgTouching}`);
console.log(`  closer than ${touch} in text mode only: ${touching} gaps on ${linesTouching} lines`);
worst.sort((a, b) => a.gap - b.gap).slice(0, 8).forEach(w =>
  console.log(`    ${w.where}: ${w.gap.toFixed(0)} (SVG ${w.svg.toFixed(0)})  ${w.words}`));
if (values.report) writeFileSync(values.report, JSON.stringify({ lines, gaps: all.length, differ, fallbackGaps, svgTouching, touching, linesTouching, worst: worst.slice(0, 200) }));
const ok = touching === 0 && (values.overfull !== "line" || differ === 0);
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
