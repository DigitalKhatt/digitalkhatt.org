// Render one page in text mode in a real browser and compare with HarfBuzz.
//
//   node dist/browser-check.mjs --layout newmadina --page 3 [--scale 1] [--browser chromium]
//        [--overfull line|words]
// Writes out/<layout>-p<page>.html and a screenshot; fails if any word's
// rendered width differs from HarfBuzz by more than 0.1px, or the place where
// the browser puts it in its line by more than 0.3px (at 40px).
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { parseArgs } from "node:util";
import * as App from "./app";
import { initHarfBuzz, loadFont } from "./node-env";
import { LAYOUTS, fontSizeLineWidthRatio, isJustifiedLine, justify } from "./layouts";
import { StretchTable, textModeLine, textModeLineHtml } from "./textmode";

const { values } = parseArgs({
  options: {
    layout: { type: "string", default: "newmadina" },
    page: { type: "string", default: "3" },
    scale: { type: "string", default: "1" },
    browser: { type: "string", default: "chromium" },
    overfull: { type: "string", default: "line" },
    font: { type: "string" },
    table: { type: "string" },
    assets: { type: "string", default: "../../ClientApp/src/assets" },
  },
});
const layout = LAYOUTS[values.layout!];
const assets = resolve(values.assets!);
const fontFile = values.font ?? `out/${basename(layout.font, ".otf")}-textmode.otf`;
const table: StretchTable = JSON.parse(readFileSync(values.table ?? `out/${layout.name}-stretch.json`, "utf8"));
const pageIndex = Number(values.page) - 1;
const scale = Number(values.scale);
const FONT_PX = 40;

await initHarfBuzz(`${assets}/hb.wasm`);
const original = await loadFont("original", `${assets}/fonts/${layout.font}`);
const patched = await loadFont("patched", fontFile);
const spaceWidth = App.getWidth(" ", original, App.FONTSIZE, null);

const rows: string[] = [];
const expected: { line: number, xScale: number, words: number[], scales: number[], right: number[] }[] = [];
for (let l = 0; l < layout.service.quranText[pageIndex].length; l++) {
  if (!isJustifiedLine(layout, pageIndex, l)) continue;
  const { info, lineTextInfo, justResult } = justify(layout, original, spaceWidth, pageIndex, l, scale);
  const desired = App.FONTSIZE / (fontSizeLineWidthRatio(layout, scale) / info.lineWidthRatio);
  const tm = textModeLine(original, lineTextInfo, justResult, table, desired, false,
    { overfull: values.overfull as "line" | "words" });
  rows.push(textModeLineHtml(tm, FONT_PX));
  const advances = tm.words.map(w => {
      const feats = w.featureSettings ? w.featureSettings.split(", ").map(p => {
        const [tag, v] = p.replace(/"/g, "").split(" ");
        return { tag, value: Number(v), start: 0, end: -1 };
      }) : [];
      return App.getWidth(w.text, patched, FONT_PX, feats);
    });
  // where each word's box should end, from the line's right edge, in px (before transforms)
  const right: number[] = [];
  let x = 0;
  advances.forEach((a, i) => { right.push(x); x += a + (i < tm.spaces.length ? tm.spaces[i] * FONT_PX / 1000 : 0); });
  expected.push({
    line: l + 1,
    xScale: tm.xScale,
    scales: tm.words.map((_, i) => tm.wordScales?.[i] ?? 1),
    right,
    words: tm.words.map(w => {
      const feats = w.featureSettings ? w.featureSettings.split(", ").map(p => {
        const [tag, v] = p.replace(/"/g, "").split(" ");
        return { tag, value: Number(v), start: 0, end: -1 };
      }) : [];
      return App.getWidth(w.text, patched, FONT_PX, feats);
    }),
  });
}

mkdirSync("out", { recursive: true });
const fontName = basename(fontFile);
copyFileSync(fontFile, `out/${fontName}`);
const htmlPath = resolve(`out/${layout.name}-p${pageIndex + 1}.html`);
writeFileSync(htmlPath, `<!doctype html><meta charset="utf-8">
<style>
@font-face { font-family: textmode; src: url("${fontName}"); }
body { margin: 20px; background: #fffdf6; }
.tm-line { font: ${FONT_PX}px/1.9 textmode; white-space: nowrap; width: fit-content; margin-left: auto; }
</style>
${rows.join("\n")}`);

const { chromium, firefox, webkit } = await import("playwright");
const engine = { chromium, firefox, webkit }[values.browser!]!;
// BROWSER_PATH: use an already-installed browser build instead of `npx playwright install`
const browser = await engine.launch({ executablePath: process.env.BROWSER_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 760, height: 600 }, deviceScaleFactor: 2 });
await page.goto("file://" + htmlPath);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
const measured: number[][] = await page.evaluate(() =>
  [...document.querySelectorAll(".tm-line")].map(line =>
    [...line.querySelectorAll(".tm-word")].map(w => w.getBoundingClientRect().width)));
// box positions, transforms off (scaleX moves ink, never the boxes)
const positions: number[][] = await page.evaluate(() => {
  document.querySelectorAll<HTMLElement>(".tm-line, .tm-word").forEach(e => { e.style.transform = "none"; });
  return [...document.querySelectorAll(".tm-line")].map(line => {
    const r = line.getBoundingClientRect().right;
    return [...line.querySelectorAll(".tm-word")].map(w => r - w.getBoundingClientRect().right);
  });
});
await page.screenshot({ path: `out/${layout.name}-p${pageIndex + 1}-${values.browser}.png`, fullPage: true });
await browser.close();

let worst = 0, worstPos = 0;
measured.forEach((words, i) => words.forEach((w, j) => {
  // scaled lines/words carry transform: scaleX(), which getBoundingClientRect includes
  worst = Math.max(worst, Math.abs(w / (expected[i].xScale * expected[i].scales[j]) - expected[i].words[j]));
}));
positions.forEach((words, i) => words.forEach((r, j) => {
  worstPos = Math.max(worstPos, Math.abs(r - expected[i].right[j]));
}));
console.log(`${values.browser}, ${layout.name} page ${pageIndex + 1} (overfull: ${values.overfull}): ` +
  `worst word width difference ${worst.toFixed(3)}px, worst position ${worstPos.toFixed(3)}px at ${FONT_PX}px`);
// positions: each inline-block space is snapped to 1/64 px (Chromium's LayoutUnit),
// so a line of ~15 spaces may drift by a few 1/64 px
process.exit(worst <= 0.1 && worstPos <= 0.3 ? 0 : 1);
