// Render one page in text mode in a real browser and compare with HarfBuzz.
//
//   node dist/browser-check.mjs --layout newmadina --page 3 [--scale 1] [--browser chromium]
// Writes out/<layout>-p<page>.html and a screenshot; fails if any word's
// rendered width differs from HarfBuzz by more than 0.1px (at 40px).
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
const expected: { line: number, xScale: number, words: number[] }[] = [];
for (let l = 0; l < layout.service.quranText[pageIndex].length; l++) {
  if (!isJustifiedLine(layout, pageIndex, l)) continue;
  const { info, lineTextInfo, justResult } = justify(layout, original, spaceWidth, pageIndex, l, scale);
  const desired = App.FONTSIZE / (fontSizeLineWidthRatio(layout, scale) / info.lineWidthRatio);
  const tm = textModeLine(original, lineTextInfo, justResult, table, desired);
  rows.push(textModeLineHtml(tm, FONT_PX));
  expected.push({
    line: l + 1,
    xScale: tm.xScale,
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
await page.screenshot({ path: `out/${layout.name}-p${pageIndex + 1}-${values.browser}.png`, fullPage: true });
await browser.close();

let worst = 0;
measured.forEach((words, i) => words.forEach((w, j) => {
  // shrunk lines carry transform: scaleX(), which getBoundingClientRect includes
  worst = Math.max(worst, Math.abs(w / expected[i].xScale - expected[i].words[j]));
}));
console.log(`${values.browser}, ${layout.name} page ${pageIndex + 1}: worst word width difference ${worst.toFixed(3)}px at ${FONT_PX}px`);
process.exit(worst <= 0.1 ? 0 : 1);
