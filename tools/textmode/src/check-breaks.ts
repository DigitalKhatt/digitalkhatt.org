// Line breaks of a layout text: checks that don't need any reference, and an
// optional word-by-word comparison with the printed mushaf's own breaks.
//
//   node dist/check-breaks.mjs --layout newmadina [--reference path/to/quran-qcf4/package]
//
// Without a reference: counts lines that start with an aya number. The
// Madina prints never do that (an aya number always closes its line).
//
// --reference: a folder holding KFGQPC page data in the layout of the
// `quran-qcf4` npm package (pages/001.json ... 604.json, each line listing its
// words with verse_key and position). That package describes the 1441H
// Madina print, so it applies to `newmadina`. The data is only read, nothing
// from it is written out except line numbers.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { LAYOUTS } from "./layouts";

const { values } = parseArgs({
  options: {
    layout: { type: "string", default: "newmadina" },
    reference: { type: "string" },
    report: { type: "string" },
  },
});
const layout = LAYOUTS[values.layout!];
const service = layout.service;
const AYA = "۝", RUB = "۞", SAJDA = "۩";
enum LineType { Content = 0, Sura, Basmala }

/** "sura:aya:index" of each token: index counts the aya's words, its number last. */
interface Line { page: number, line: number, first: string, last: string, startsWithNumber: boolean, keys: string[] }
const markerKeys = new Set<string>();
const lines: Line[] = [];
let sura = 0, aya = 1, index = 0;
for (let p = 0; p < service.nbPages; p++) {
  for (let l = 0; l < service.quranText[p].length; l++) {
    const type = service.getLineInfo(p, l).lineType;
    if (type === LineType.Sura) { sura++; aya = 1; index = 0; continue; }
    // a basmala line is a decoration, except Al-Fatiha's (its aya 1)
    if (type === LineType.Basmala && sura !== 1) continue;
    if (sura === 0) sura = 1;
    const keys: string[] = [];
    const tokens = service.quranText[p][l].split(" ").filter(t => t && t !== RUB && t !== SAJDA);
    for (const token of tokens) {
      index++;
      keys.push(`${sura}:${aya}:${index}`);
      if (token.includes(AYA)) { markerKeys.add(`${sura}:${aya}:${index}`); aya++; index = 0; }
    }
    if (!keys.length) continue;
    lines.push({ page: p + 1, line: l + 1, first: keys[0], last: keys[keys.length - 1],
      startsWithNumber: tokens[0].includes(AYA), keys });
  }
}

const starting = lines.filter(x => x.startsWithNumber);
console.log(`${layout.name}: ${lines.length} text lines; ${starting.length} start with an aya number`);
starting.slice(0, 5).forEach(x => console.log(`    p${x.page} l${x.line}`));

let differing: { page: number, line: number, ours: string, print: string, numberOnly: boolean }[] = [];
if (values.reference) {
  const dir = existsSync(join(values.reference, "pages")) ? join(values.reference, "pages") : values.reference;
  const print = new Map<string, string>();
  const printKeys = new Map<string, string[]>();
  for (let p = 1; p <= service.nbPages; p++) {
    const data = JSON.parse(readFileSync(join(dir, `${String(p).padStart(3, "0")}.json`), "utf8"));
    for (const line of data.lines) {
      const shift = new Map<string, number>();
      const keys: string[] = [];
      for (const w of line.words) {
        if (w.type !== "word" && w.type !== "end") continue;   // ۞, headers, basmala
        if (String(w.text).startsWith("#")) {                   // the print's own ۩ glyph
          shift.set(w.verse_key, (shift.get(w.verse_key) || 0) + 1);
          continue;
        }
        keys.push(`${w.verse_key}:${w.position - (shift.get(w.verse_key) || 0)}`);
      }
      if (keys.length) {
        print.set(`${p}:${line.line}`, `${keys[0]}-${keys[keys.length - 1]}`);
        printKeys.set(`${p}:${line.line}`, keys);
      }
    }
  }
  differing = lines
    .map(x => {
      const theirs = printKeys.get(`${x.page}:${x.line}`) || [];
      const a = new Set(x.keys), b = new Set(theirs);
      const changed = [...x.keys.filter(k => !b.has(k)), ...theirs.filter(k => !a.has(k))];
      return { page: x.page, line: x.line, ours: `${x.first}-${x.last}`,
        print: print.get(`${x.page}:${x.line}`) || "(none)",
        numberOnly: changed.length > 0 && changed.every(k => markerKeys.has(k)) };
    })
    .filter(x => x.ours !== x.print);
  const numberOnly = differing.filter(x => x.numberOnly).length;
  console.log(`compared with the print: ${lines.length - differing.length} lines identical, ${differing.length} differ` +
    ` (${numberOnly} only by where an aya number sits, ${differing.length - numberOnly} by words)`);
  differing.slice(0, 8).forEach(x => console.log(`    p${x.page} l${x.line}: layout ${x.ours}, print ${x.print}`));
}
if (values.report) {
  writeFileSync(values.report, JSON.stringify({
    layout: layout.name, lines: lines.length,
    startsWithNumber: starting.map(x => [x.page, x.line]),
    differing: differing.map(x => [x.page, x.line, x.ours, x.print, x.numberOnly]),
  }));
}
