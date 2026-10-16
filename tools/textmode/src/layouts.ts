// The three hbmedina layouts and how the app sizes their lines.
import * as App from "./app";

export interface Layout {
  name: string;
  font: string;                 // path relative to ClientApp/src/assets/fonts
  service: App.QuranTextService;
  pageWidth: number;            // font units per page width (hbmedina.component.ts)
}

export const LAYOUTS: Record<string, Layout> = {
  newmadina: { name: "newmadina", font: "hb/madina.otf", service: App.NewMadinahQuranTextService, pageWidth: 16200 },
  oldmadina: { name: "oldmadina", font: "hb/oldmadina.otf", service: App.OldMadinahQuranTextService, pageWidth: 16400 },
  indopak: { name: "indopak", font: "hb/indopak.otf", service: App.QuranTextIndopak15Service, pageWidth: 16400 },
};

/** fontSize / lineWidth exactly as page_view.ts computes it, for a font-scale slider value. */
export function fontSizeLineWidthRatio(layout: Layout, fontScale: number): number {
  return (App.FONTSIZE * fontScale) / (layout.pageWidth * (1 - (2 * App.MARGIN) / App.PAGE_WIDTH));
}

/** Lines page_view.ts justifies (content lines, plus the basmala on pages 1-2). */
export function isJustifiedLine(layout: Layout, pageIndex: number, lineIndex: number): boolean {
  const info = layout.service.getLineInfo(pageIndex, lineIndex);
  return info.lineType === 0 || (info.lineType === 2 && (pageIndex === 0 || pageIndex === 1));
}

/** Same call page_view.ts makes for one line (JustStyle.XScale, fontSizeRatio 1). */
export function justify(layout: Layout, font: App.HarfBuzzFont, spaceWidth: number,
  pageIndex: number, lineIndex: number, fontScale: number) {
  const info = layout.service.getLineInfo(pageIndex, lineIndex);
  const lineTextInfo = App.analyzeLineForJust(layout.service, pageIndex, lineIndex);
  const justResult = App.justifyLine(lineTextInfo, font,
    fontSizeLineWidthRatio(layout, fontScale) / info.lineWidthRatio, spaceWidth,
    layout.service.mushafType, App.JustStyle.XScale);
  return { info, lineTextInfo, justResult };
}

export function parseScales(spec: string): number[] {
  // "1" | "0.5:1.2:0.05" | "0.8,1,1.1"
  if (spec.includes(":")) {
    const [a, b, step] = spec.split(":").map(Number);
    const out: number[] = [];
    for (let x = a; x <= b + 1e-9; x += step) out.push(Math.round(x * 1000) / 1000);
    return out;
  }
  return spec.split(",").map(Number);
}
