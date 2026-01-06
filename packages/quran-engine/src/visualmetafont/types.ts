/**
 * @digitalkhatt/quran-engine - VisualMetaFont Types
 *
 * Internal types for the VisualMetaFont WASM module
 */

import type { VisualMetaFontAssets } from '../core/types';

/**
 * Emscripten FileSystem interface
 */
export interface EmscriptenFS {
  createPreloadedFile(
    parent: string,
    name: string,
    url: string,
    canRead: boolean,
    canWrite: boolean
  ): void;
  unlink(path: string): void;
}

/**
 * Emscripten Module interface
 */
export interface EmscriptenModule {
  FS: EmscriptenFS;
  QuranShaper: new () => VMFQuranShaperNative;
  instantiateWasm?: (
    imports: WebAssembly.Imports,
    successCallback: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void
  ) => Record<string, unknown>;
  onRuntimeInitialized?: () => void;
  preRun?: Array<() => void>;
  postRun?: Array<() => void>;
  noInitialRun?: boolean;
  wasmMemory?: WebAssembly.Memory;
}

/**
 * Native QuranShaper from WASM
 */
export interface VMFQuranShaperNative {
  shapePage(
    pageIndex: number,
    fontScale: number,
    useJustification: boolean,
    lineIndex: number,
    texFormat: boolean,
    tajweedColor: boolean,
    changeSize: boolean
  ): VMFPageResultNative;

  displayGlyph(
    codepoint: number,
    leftTatweel: number,
    rightTatweel: number,
    ctx: CanvasRenderingContext2D
  ): void;

  executeMetapost(code: string): number;

  getGlyphCode(name: string): number;

  drawPathByName(name: string, ctx: CanvasRenderingContext2D): void;

  shapeText(
    text: string,
    lineWidth: number,
    fontScale: number,
    applyJustification: boolean,
    tajweedColor: boolean,
    flag: boolean,
    ctx: CanvasRenderingContext2D
  ): unknown;

  getTexNbPages(): number;

  getSuraLocations(texFormat: boolean): VMFOutlineNative;

  clearAlternates(): void;

  delete(): void;
}

/**
 * Native page result from shapePage
 */
export interface VMFPageResultNative {
  page: VMFPageNative;
  originalPage: VMFOriginalPageNative;
  delete(): void;
}

export interface VMFPageNative {
  value(index: number): VMFLineNative;
  delete(): void;
}

export interface VMFOriginalPageNative {
  get(index: number): VMFOriginalLineNative;
  delete(): void;
}

export interface VMFLineNative {
  type: { value: 0 | 1 | 2 };
  xstartposition: number;
  glyphs: VMFGlyphsNative;
  fontSize: number;
}

export interface VMFGlyphsNative {
  size(): number;
  get(index: number): VMFGlyphNative;
  delete(): void;
}

export interface VMFGlyphNative {
  codepoint: number;
  cluster: number;
  x_advance: number;
  x_offset: number;
  y_offset: number;
  lefttatweel: number;
  righttatweel: number;
  color?: number;
  beginsajda?: boolean;
  endsajda?: boolean;
}

export interface VMFOriginalLineNative {
  unicode(cluster: number): number;
  size(): number;
  toStdString(): string;
  get(index: number): number;
  delete(): void;
}

export interface VMFOutlineNative {
  size(): number;
  value(index: number): VMFOutlineItemNative;
  delete(): void;
}

export interface VMFOutlineItemNative {
  name: { toStdString(): string; delete(): void };
  page: number;
}

/**
 * Cancellation token for rendering tasks
 */
export interface RenderToken {
  task?: InternalRenderTaskInterface;
  onContinue?: (callback: () => void) => void;
  isCancelled(): boolean;
  cancel(): void;
}

/**
 * Internal render task interface
 */
export interface InternalRenderTaskInterface {
  cancel(): void;
}

/**
 * Configuration for VisualMetaFont renderer
 */
export interface VisualMetaFontRendererConfig {
  wasmUrl: string;
  assets: VisualMetaFontAssets;
  format: 'tex' | 'madinah';
  quranText?: string[][] | string;
}

/**
 * VisualMetaFont module factory type
 */
export type VisualMetaFontModuleFactory = (module: Partial<EmscriptenModule>) => Promise<EmscriptenModule>;
