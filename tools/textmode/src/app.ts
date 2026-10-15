// Re-exports of the app code the tools use, so paths live in one place.
export * from "../../../ClientApp/src/app/components/hbmedina/harfbuzz";
export {
  FONTSIZE, MARGIN, PAGE_WIDTH, JustStyle, analyzeLineForJust, justifyLine,
} from "../../../ClientApp/src/app/components/hbmedina/just.service";
export type {
  JustResultByLine, LineTextInfo, TextFontFeatures,
} from "../../../ClientApp/src/app/components/hbmedina/just.service";
export {
  MushafLayoutType, NewMadinahQuranTextService, OldMadinahQuranTextService,
  QuranTextIndopak15Service, QuranTextService,
} from "../../../ClientApp/src/app/services/qurantext.service";
