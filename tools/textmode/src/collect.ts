// Build the StretchTable for a layout: run the app's justifier over every
// justified line at a sweep of font-scale values (the app's slider range) and
// record every glyph -> stretched-glyph replacement it produces.
//
//   node dist/collect.mjs --layout newmadina [--scales 0.5:1.2:0.05] [--out out/newmadina-stretch.json]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import * as App from "./app";
import { initHarfBuzz, loadFont } from "./node-env";
import { LAYOUTS, fontSizeLineWidthRatio, isJustifiedLine, justify, parseScales } from "./layouts";
import { StretchTable, textModeLine } from "./textmode";

const { values } = parseArgs({
  options: {
    layout: { type: "string", default: "newmadina" },
    scales: { type: "string", default: "0.5:1.2:0.05" },
    out: { type: "string" },
    assets: { type: "string", default: "../../ClientApp/src/assets" },
  },
});
const layout = LAYOUTS[values.layout!];
if (!layout) throw new Error(`unknown layout ${values.layout}; one of ${Object.keys(LAYOUTS)}`);
const assets = resolve(values.assets!);
const out = values.out ?? `out/${layout.name}-stretch.json`;

await initHarfBuzz(`${assets}/hb.wasm`);
const font = await loadFont(layout.name, `${assets}/fonts/${layout.font}`);
const spaceWidth = App.getWidth(" ", font, App.FONTSIZE, null);

const table: StretchTable = { positions: 0, alternates: {} };
const scales = parseScales(values.scales!);
let lines = 0, stretchedWords = 0;
const t0 = Date.now();
for (const scale of scales) {
  for (let p = 0; p < layout.service.nbPages; p++) {
    for (let l = 0; l < layout.service.quranText[p].length; l++) {
      if (!isJustifiedLine(layout, p, l)) continue;
      const { info, lineTextInfo, justResult } = justify(layout, font, spaceWidth, p, l, scale);
      const desired = App.FONTSIZE / (fontSizeLineWidthRatio(layout, scale) / info.lineWidthRatio);
      const line = textModeLine(font, lineTextInfo, justResult, table, desired, true);
      lines++;
      stretchedWords += line.words.filter(w => w.featureSettings.includes("jp")).length;
    }
  }
  console.log(`scale ${scale}: ${Object.keys(table.alternates).length} glyphs with variants, ` +
    `jp01..jp${table.positions}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
const entries = Object.values(table.alternates).reduce((s, v) => s + v.length, 0);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ layout: layout.name, font: layout.font, scales, ...table }));
console.log(`${lines} lines, ${stretchedWords} stretched words; ${entries} variants; wrote ${out}`);
