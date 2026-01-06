/**
 * @digitalkhatt/quran-engine - HarfBuzz WASM Wrapper
 *
 * Provides HarfBuzz text shaping functionality for Arabic text rendering.
 * Based on harfbuzzjs: https://github.com/harfbuzz/harfbuzzjs
 */

import type { HBFeature, GlyphInformation, HarfBuzzDirection } from './types';

// @ts-ignore - harfbuzzjs module type definition
import * as hbjs from 'harfbuzzjs/hb.js';

type Pointer = number;

const HB_MEMORY_MODE_WRITABLE: number = 2;

/**
 * HarfBuzz WASM exports wrapper
 */
export class HarfBuzzExports {
  readonly heapu8: Uint8Array;
  readonly heapu32: Uint32Array;
  readonly heapi32: Int32Array;
  readonly utf8Encoder: TextEncoder;

  // Exported HarfBuzz methods
  readonly malloc: (length: number) => Pointer;
  readonly free: (ptr: Pointer) => void;
  readonly free_ptr: () => Pointer;
  readonly hb_blob_create: (
    data: Pointer,
    length: number,
    memoryMode: number,
    useData: Pointer,
    destroyFunction: Pointer
  ) => Pointer;
  readonly hb_blob_destroy: (ptr: Pointer) => void;
  readonly hb_face_create: (blobPtr: Pointer, index: number) => Pointer;
  readonly hb_face_get_upem: (facePtr: Pointer) => number;
  readonly hb_face_destroy: (ptr: Pointer) => void;
  readonly hb_font_create: (facePtr: Pointer) => Pointer;
  readonly hb_font_set_scale: (fontPtr: Pointer, xScale: number, yScale: number) => void;
  readonly hb_font_destroy: (ptr: Pointer) => void;
  readonly hb_face_collect_unicodes: (facePtr: Pointer, setPtr: Pointer) => void;
  readonly hb_set_create: () => Pointer;
  readonly hb_set_destroy: (setPtr: Pointer) => void;
  readonly hb_set_get_population: (setPtr: Pointer) => number;
  readonly hb_set_next_many: (
    setPtr: Pointer,
    greaterThanUnicodePtr: Pointer,
    outputU32ArrayPtr: Pointer,
    size: number
  ) => number;
  readonly hb_buffer_create: () => Pointer;
  readonly hb_buffer_add_utf8: (
    bufferPtr: Pointer,
    stringPtr: Pointer,
    stringLength: number,
    itemOffset: number,
    itemLength: number
  ) => void;
  readonly hb_buffer_guess_segment_properties: (bufferPtr: Pointer) => void;
  readonly hb_buffer_set_direction: (bufferPtr: Pointer, direction: number) => void;
  readonly hb_shape: (fontPtr: Pointer, bufferPtr: Pointer, features: Pointer, numFeatures: number) => void;
  readonly hb_buffer_get_length: (bufferPtr: Pointer) => number;
  readonly hb_buffer_get_glyph_infos: (bufferPtr: Pointer, length: number) => Pointer;
  readonly hb_buffer_get_glyph_positions: (bufferPtr: Pointer, length: number) => Pointer;
  readonly hb_buffer_destroy: (bufferPtr: Pointer) => void;

  readonly arabScript: number;
  readonly arabLanguage: number;

  readonly pathBufferSize = 65536;
  readonly pathBuffer: Pointer;

  readonly utf8Decoder = new TextDecoder('utf8');

  readonly exports: WebAssembly.Exports & Record<string, CallableFunction>;
  readonly addFunction: (fn: CallableFunction, sig: string) => Pointer;
  readonly freeFuncPtr: Pointer;

  constructor(module: { wasmExports: WebAssembly.Exports; addFunction: (fn: CallableFunction, sig: string) => Pointer }) {
    this.addFunction = module.addFunction;
    this.exports = module.wasmExports as WebAssembly.Exports & Record<string, CallableFunction>;
    const exports = this.exports;

    this.freeFuncPtr = this.addFunction((ptr: Pointer) => {
      (this.exports.free as (ptr: Pointer) => void)(ptr);
    }, 'vi');

    this.heapu8 = new Uint8Array((exports.memory as WebAssembly.Memory).buffer);
    this.heapu32 = new Uint32Array((exports.memory as WebAssembly.Memory).buffer);
    this.heapi32 = new Int32Array((exports.memory as WebAssembly.Memory).buffer);
    this.utf8Encoder = new TextEncoder();

    this.malloc = exports.malloc as (length: number) => Pointer;
    this.free = exports.free as (ptr: Pointer) => void;
    this.free_ptr = exports.free_ptr as () => Pointer;
    this.hb_blob_destroy = exports.hb_blob_destroy as (ptr: Pointer) => void;
    this.hb_blob_create = exports.hb_blob_create as typeof this.hb_blob_create;
    this.hb_face_create = exports.hb_face_create as typeof this.hb_face_create;
    this.hb_face_get_upem = exports.hb_face_get_upem as typeof this.hb_face_get_upem;
    this.hb_face_destroy = exports.hb_face_destroy as (ptr: Pointer) => void;
    this.hb_face_collect_unicodes = exports.hb_face_collect_unicodes as typeof this.hb_face_collect_unicodes;
    this.hb_set_create = exports.hb_set_create as () => Pointer;
    this.hb_set_destroy = exports.hb_set_destroy as (setPtr: Pointer) => void;
    this.hb_set_get_population = exports.hb_set_get_population as typeof this.hb_set_get_population;
    this.hb_set_next_many = exports.hb_set_next_many as typeof this.hb_set_next_many;
    this.hb_font_create = exports.hb_font_create as typeof this.hb_font_create;
    this.hb_font_set_scale = exports.hb_font_set_scale as typeof this.hb_font_set_scale;
    this.hb_font_destroy = exports.hb_font_destroy as (ptr: Pointer) => void;
    this.hb_buffer_create = exports.hb_buffer_create as () => Pointer;
    this.hb_buffer_add_utf8 = exports.hb_buffer_add_utf8 as typeof this.hb_buffer_add_utf8;
    this.hb_buffer_guess_segment_properties = exports.hb_buffer_guess_segment_properties as typeof this.hb_buffer_guess_segment_properties;
    this.hb_buffer_set_direction = exports.hb_buffer_set_direction as typeof this.hb_buffer_set_direction;
    this.hb_shape = exports.hb_shape as typeof this.hb_shape;
    this.hb_buffer_get_length = exports.hb_buffer_get_length as typeof this.hb_buffer_get_length;
    this.hb_buffer_get_glyph_infos = exports.hb_buffer_get_glyph_infos as typeof this.hb_buffer_get_glyph_infos;
    this.hb_buffer_get_glyph_positions = exports.hb_buffer_get_glyph_positions as typeof this.hb_buffer_get_glyph_positions;
    this.hb_buffer_destroy = exports.hb_buffer_destroy as (bufferPtr: Pointer) => void;

    let str = this.createAsciiString('Arab');
    this.arabScript = (this.exports.hb_script_from_string as (ptr: Pointer, len: number) => number)(str.ptr, -1);
    str.free();

    str = this.createAsciiString('ar');
    this.arabLanguage = (this.exports.hb_language_from_string as (ptr: Pointer, len: number) => number)(str.ptr, -1);
    str.free();

    this.pathBuffer = this.malloc(this.pathBufferSize);
  }

  createAsciiString(text: string): { ptr: Pointer; length: number; free: () => void } {
    const ptr = this.malloc(text.length + 1);
    for (let i = 0; i < text.length; ++i) {
      const char = text.charCodeAt(i);
      if (char > 127) throw new Error('Expected ASCII text');
      this.heapu8[ptr + i] = char;
    }
    this.heapu8[ptr + text.length] = 0;
    return {
      ptr,
      length: text.length,
      free: () => this.free(ptr),
    };
  }

  createJsString(text: string): { ptr: Pointer; length: number; free: () => void } {
    const ptr = this.malloc(text.length * 2);
    const words = new Uint16Array((this.exports.memory as WebAssembly.Memory).buffer, ptr, text.length);
    for (let i = 0; i < words.length; ++i) {
      words[i] = text.charCodeAt(i);
    }
    return {
      ptr,
      length: words.length,
      free: () => this.free(ptr),
    };
  }

  createFeatures(features: HBFeature[] | null | undefined): { ptr: Pointer; length: number; free: () => void } {
    if (!features?.length) {
      return {
        ptr: 0,
        length: 0,
        free: () => {},
      };
    }
    const ptr = this.malloc(16 * features.length);
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      this.heapu32[ptr / 4 + i * 4 + 0] = hb_tag(feature.tag);
      this.heapu32[ptr / 4 + i * 4 + 1] = feature.value;
      this.heapu32[ptr / 4 + i * 4 + 2] = feature.start;
      this.heapu32[ptr / 4 + i * 4 + 3] = feature.end;
    }
    return {
      ptr,
      length: features.length,
      free: () => this.free(ptr),
    };
  }
}

// Singleton HarfBuzz instance
let hb: HarfBuzzExports | null = null;

/**
 * CString helper for UTF-8 text
 */
class CString {
  readonly ptr: Pointer;
  readonly length: number;

  constructor(text: string) {
    if (!hb) throw new Error('HarfBuzz not initialized');
    const bytes = hb.utf8Encoder.encode(text);
    this.ptr = hb.malloc(bytes.byteLength);
    hb.heapu8.set(bytes, this.ptr);
    this.length = bytes.byteLength;
  }

  destroy(): void {
    if (hb) hb.free(this.ptr);
  }
}

/**
 * HarfBuzz Blob wrapper
 */
export class HarfBuzzBlob {
  readonly ptr: Pointer;

  constructor(data: Uint8Array) {
    if (!hb) throw new Error('HarfBuzz not initialized');
    const blobPtr = hb.malloc(data.length);
    hb.heapu8.set(data, blobPtr);
    this.ptr = hb.hb_blob_create(blobPtr, data.byteLength, HB_MEMORY_MODE_WRITABLE, blobPtr, hb.freeFuncPtr);
  }

  destroy(): void {
    if (hb) hb.hb_blob_destroy(this.ptr);
  }
}

/**
 * HarfBuzz Face wrapper
 */
export class HarfBuzzFace {
  readonly ptr: Pointer;

  constructor(blob: HarfBuzzBlob, index: number) {
    if (!hb) throw new Error('HarfBuzz not initialized');
    this.ptr = hb.hb_face_create(blob.ptr, index);
  }

  getUnitsPerEM(): number {
    if (!hb) throw new Error('HarfBuzz not initialized');
    return hb.hb_face_get_upem(this.ptr);
  }

  destroy(): void {
    if (hb) hb.hb_face_destroy(this.ptr);
  }
}

/**
 * Glyph bounds information
 */
export interface GlyphBounds {
  minY: number;
  maxY: number;
}

/**
 * Result of glyph-to-path conversion with bounds
 */
export interface GlyphPathWithBounds {
  path: string;
  bounds: GlyphBounds;
}

/**
 * HarfBuzz Font wrapper with glyph-to-path support
 */
export class HarfBuzzFont {
  readonly ptr: Pointer;
  readonly unitsPerEM: number;
  private drawFuncsPtr: Pointer | null = null;
  private pathBuffer = '';
  private minY = 0;
  private maxY = 0;

  constructor(face: HarfBuzzFace) {
    if (!hb) throw new Error('HarfBuzz not initialized');
    this.ptr = hb.hb_font_create(face.ptr);
    this.unitsPerEM = face.getUnitsPerEM();
    this.initializeDraw();
  }

  setScale(xScale: number, yScale: number): void {
    if (!hb) throw new Error('HarfBuzz not initialized');
    hb.hb_font_set_scale(this.ptr, xScale, yScale);
  }

  glyphToSvgPath(glyphId: number): string {
    if (!hb) throw new Error('HarfBuzz not initialized');
    this.pathBuffer = '';
    this.minY = Infinity;
    this.maxY = -Infinity;
    (hb.exports.hb_font_draw_glyph as (fontPtr: Pointer, glyphId: number, drawFuncsPtr: Pointer, userData: number) => void)(
      this.ptr,
      glyphId,
      this.drawFuncsPtr!,
      0
    );
    return this.pathBuffer;
  }

  /**
   * Convert glyph to SVG path and return bounds
   * @param glyphId - The glyph ID to render
   * @returns Object containing path string and Y bounds
   */
  glyphToSvgPathWithBounds(glyphId: number): GlyphPathWithBounds {
    if (!hb) throw new Error('HarfBuzz not initialized');
    this.pathBuffer = '';
    this.minY = Infinity;
    this.maxY = -Infinity;
    (hb.exports.hb_font_draw_glyph as (fontPtr: Pointer, glyphId: number, drawFuncsPtr: Pointer, userData: number) => void)(
      this.ptr,
      glyphId,
      this.drawFuncsPtr!,
      0
    );
    // Handle empty glyphs (spaces, etc.)
    const bounds: GlyphBounds = {
      minY: this.minY === Infinity ? 0 : this.minY,
      maxY: this.maxY === -Infinity ? 0 : this.maxY,
    };
    return { path: this.pathBuffer, bounds };
  }

  /**
   * Update minY and maxY with a Y coordinate
   */
  private updateYBounds(y: number): void {
    if (y < this.minY) this.minY = y;
    if (y > this.maxY) this.maxY = y;
  }

  private initializeDraw(): void {
    if (!hb) throw new Error('HarfBuzz not initialized');

    const moveTo = (_dfuncs: Pointer, _draw_data: Pointer, _draw_state: Pointer, to_x: number, to_y: number) => {
      this.pathBuffer += `M${to_x},${to_y}`;
      this.updateYBounds(to_y);
    };
    const lineTo = (_dfuncs: Pointer, _draw_data: Pointer, _draw_state: Pointer, to_x: number, to_y: number) => {
      this.pathBuffer += `L${to_x},${to_y}`;
      this.updateYBounds(to_y);
    };
    const cubicTo = (
      _dfuncs: Pointer,
      _draw_data: Pointer,
      _draw_state: Pointer,
      c1_x: number,
      c1_y: number,
      c2_x: number,
      c2_y: number,
      to_x: number,
      to_y: number
    ) => {
      this.pathBuffer += `C${c1_x},${c1_y} ${c2_x},${c2_y} ${to_x},${to_y}`;
      this.updateYBounds(c1_y);
      this.updateYBounds(c2_y);
      this.updateYBounds(to_y);
    };
    const quadTo = (
      _dfuncs: Pointer,
      _draw_data: Pointer,
      _draw_state: Pointer,
      c_x: number,
      c_y: number,
      to_x: number,
      to_y: number
    ) => {
      this.pathBuffer += `Q${c_x},${c_y} ${to_x},${to_y}`;
      this.updateYBounds(c_y);
      this.updateYBounds(to_y);
    };
    const closePath = () => {
      this.pathBuffer += 'Z';
    };

    const moveToPtr = hb.addFunction(moveTo, 'viiiffi');
    const lineToPtr = hb.addFunction(lineTo, 'viiiffi');
    const cubicToPtr = hb.addFunction(cubicTo, 'viiiffffffi');
    const quadToPtr = hb.addFunction(quadTo, 'viiiffffi');
    const closePathPtr = hb.addFunction(closePath, 'viiii');

    this.drawFuncsPtr = (hb.exports.hb_draw_funcs_create as () => Pointer)();
    (hb.exports.hb_draw_funcs_set_move_to_func as (ptr: Pointer, fn: Pointer, userData: number, destroy: number) => void)(
      this.drawFuncsPtr,
      moveToPtr,
      0,
      0
    );
    (hb.exports.hb_draw_funcs_set_line_to_func as (ptr: Pointer, fn: Pointer, userData: number, destroy: number) => void)(
      this.drawFuncsPtr,
      lineToPtr,
      0,
      0
    );
    (hb.exports.hb_draw_funcs_set_cubic_to_func as (ptr: Pointer, fn: Pointer, userData: number, destroy: number) => void)(
      this.drawFuncsPtr,
      cubicToPtr,
      0,
      0
    );
    (hb.exports.hb_draw_funcs_set_quadratic_to_func as (ptr: Pointer, fn: Pointer, userData: number, destroy: number) => void)(
      this.drawFuncsPtr,
      quadToPtr,
      0,
      0
    );
    (hb.exports.hb_draw_funcs_set_close_path_func as (ptr: Pointer, fn: Pointer, userData: number, destroy: number) => void)(
      this.drawFuncsPtr,
      closePathPtr,
      0,
      0
    );
  }

  destroy(): void {
    if (hb) hb.hb_font_destroy(this.ptr);
  }
}

/**
 * HarfBuzz Buffer wrapper for text shaping
 */
export class HarfBuzzBuffer {
  readonly ptr: Pointer;

  constructor() {
    if (!hb) throw new Error('HarfBuzz not initialized');
    this.ptr = hb.hb_buffer_create();
  }

  addUtf8Text(text: string): void {
    if (!hb) throw new Error('HarfBuzz not initialized');
    const str = new CString(text);
    hb.hb_buffer_add_utf8(this.ptr, str.ptr, str.length, 0, str.length);
    str.destroy();
  }

  addText(text: string): void {
    if (!hb) throw new Error('HarfBuzz not initialized');
    const str = hb.createJsString(text);
    (hb.exports.hb_buffer_add_utf16 as (bufferPtr: Pointer, stringPtr: Pointer, stringLength: number, itemOffset: number, itemLength: number) => void)(
      this.ptr,
      str.ptr,
      str.length,
      0,
      str.length
    );
    str.free();
  }

  guessSegmentProperties(): void {
    if (!hb) throw new Error('HarfBuzz not initialized');
    hb.hb_buffer_guess_segment_properties(this.ptr);
  }

  setDirection(direction: HarfBuzzDirection): void {
    if (!hb) throw new Error('HarfBuzz not initialized');
    const d = { ltr: 4, rtl: 5, ttb: 6, btt: 7 }[direction];
    hb.hb_buffer_set_direction(this.ptr, d);
  }

  setLanguage(language: number): void {
    if (!hb) throw new Error('HarfBuzz not initialized');
    (hb.exports.hb_buffer_set_language as (bufferPtr: Pointer, language: number) => void)(this.ptr, language);
  }

  setScript(script: number): void {
    if (!hb) throw new Error('HarfBuzz not initialized');
    (hb.exports.hb_buffer_set_script as (bufferPtr: Pointer, script: number) => void)(this.ptr, script);
  }

  setClusterLevel(level: number): void {
    if (!hb) throw new Error('HarfBuzz not initialized');
    (hb.exports.hb_buffer_set_cluster_level as (bufferPtr: Pointer, level: number) => void)(this.ptr, level);
  }

  shape(font: HarfBuzzFont, features: HBFeature[] | null): GlyphInformation[] {
    if (!hb) throw new Error('HarfBuzz not initialized');
    const feats = hb.createFeatures(features);
    hb.hb_shape(font.ptr, this.ptr, feats.ptr, feats.length);
    feats.free();
    return this.json();
  }

  json(): GlyphInformation[] {
    if (!hb) throw new Error('HarfBuzz not initialized');
    const length = hb.hb_buffer_get_length(this.ptr);
    const result: GlyphInformation[] = [];
    const infosPtr32 = hb.hb_buffer_get_glyph_infos(this.ptr, 0) / 4;
    const positionsPtr32 = hb.hb_buffer_get_glyph_positions(this.ptr, 0) / 4;
    const infos = hb.heapu32.subarray(infosPtr32, infosPtr32 + 5 * length);
    const positions = hb.heapi32.subarray(positionsPtr32, positionsPtr32 + 5 * length);
    for (let i = 0; i < length; ++i) {
      result.push({
        GlyphId: infos[i * 5 + 0],
        Cluster: infos[i * 5 + 2],
        XAdvance: positions[i * 5 + 0],
        YAdvance: positions[i * 5 + 1],
        XOffset: positions[i * 5 + 2],
        YOffset: positions[i * 5 + 3],
      });
    }
    return result;
  }

  destroy(): void {
    if (hb) hb.hb_buffer_destroy(this.ptr);
  }
}

/**
 * Shape text and return glyph information
 */
export function shape(text: string, font: HarfBuzzFont, features: HBFeature[] | null): GlyphInformation[] {
  const buffer = new HarfBuzzBuffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  buffer.shape(font, features);
  const result = buffer.json();
  buffer.destroy();
  return result;
}

/**
 * Get width of shaped text
 */
export function getWidth(text: string, font: HarfBuzzFont, fontSizeInPixel: number, features: HBFeature[] | null): number {
  const scale = fontSizeInPixel / font.unitsPerEM;
  const shapeResult = shape(text, font, features);
  let totalWidth = 0;
  for (const glyphInfo of shapeResult) {
    totalWidth += glyphInfo.XAdvance;
  }
  return totalWidth * scale;
}

/**
 * Convert 4-character tag to number
 */
export function hb_tag(s: string): number {
  return (
    ((s.charCodeAt(0) & 0xff) << 24) |
    ((s.charCodeAt(1) & 0xff) << 16) |
    ((s.charCodeAt(2) & 0xff) << 8) |
    ((s.charCodeAt(3) & 0xff) << 0)
  );
}

// Font cache
export const harfbuzzFonts = new Map<string, HarfBuzzFont>();

// Loading state
let loadingPromise: Promise<HarfBuzzExports> | null = null;

/**
 * Load HarfBuzz WASM module
 */
export async function loadHarfbuzz(webAssemblyUrl: string): Promise<HarfBuzzExports> {
  if (hb) return hb;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const response = await fetch(webAssemblyUrl);
    const wasm = await response.arrayBuffer();
    const module = { wasmBinary: wasm };
    const loadedModule = await hbjs.default(module);
    hb = new HarfBuzzExports(loadedModule);
    return hb;
  })();

  return loadingPromise;
}

/**
 * Load and cache a font
 */
export async function loadAndCacheFont(fontName: string, fontUrl: string): Promise<HarfBuzzFont> {
  if (harfbuzzFonts.has(fontName)) {
    return harfbuzzFonts.get(fontName)!;
  }

  const response = await fetch(fontUrl);
  const blob = await response.arrayBuffer();
  const fontBlob = new Uint8Array(blob);
  const harfbuzzBlob = new HarfBuzzBlob(fontBlob);
  const harfbuzzFace = new HarfBuzzFace(harfbuzzBlob, 0);
  const harfbuzzFont = new HarfBuzzFont(harfbuzzFace);

  harfbuzzFonts.set(fontName, harfbuzzFont);
  harfbuzzFace.destroy();
  harfbuzzBlob.destroy();

  return harfbuzzFont;
}

/**
 * Get the HarfBuzz instance (throws if not initialized)
 */
export function getHarfBuzz(): HarfBuzzExports {
  if (!hb) throw new Error('HarfBuzz not initialized. Call loadHarfbuzz first.');
  return hb;
}

/**
 * Check if HarfBuzz is initialized
 */
export function isHarfBuzzReady(): boolean {
  return hb !== null;
}

/**
 * Get the Arabic script constant
 */
export function getArabScript(): number {
  if (!hb) throw new Error('HarfBuzz not initialized');
  return hb.arabScript;
}

/**
 * Get the Arabic language constant
 */
export function getArabLanguage(): number {
  if (!hb) throw new Error('HarfBuzz not initialized');
  return hb.arabLanguage;
}
