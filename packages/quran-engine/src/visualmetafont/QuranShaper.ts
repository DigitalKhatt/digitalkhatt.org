/**
 * @digitalkhatt/quran-engine - QuranShaper
 *
 * Wrapper around the VisualMetaFont WASM shaper
 */

import type { QuranOutlineItem } from '../core/types';
import type {
  VMFQuranShaperNative,
  VMFPageResultNative,
  EmscriptenModule,
} from './types';

/**
 * Constants for coordinate system
 */
const SCALEBY = 8;

/**
 * QuranShaper wraps the native VisualMetaFont WASM module
 * and provides a convenient API for shaping and rendering Quran text
 */
export class QuranShaper {
  private readonly SCALEBY = SCALEBY;
  private fontScalePerc: number;
  private scalePoint: number;

  /** Margin in scaled units */
  public readonly margin = 400 << this.SCALEBY;
  /** Line width in scaled units */
  public readonly lineWidth = (17000 - 2 * 400) << this.SCALEBY;
  /** Page width in scaled units */
  public readonly pagewidth = 17000 << this.SCALEBY;
  /** Top spacing in scaled units */
  public readonly TopSpace = 1450 << this.SCALEBY;
  /** Inter-line spacing in scaled units */
  public readonly InterLineSpacing = 1800 << this.SCALEBY;
  /** Inter-line spacing for first page in scaled units */
  public readonly InterLineSpacingFirtPage = 2025 << this.SCALEBY;

  /** Sura header image */
  public suraImage: HTMLImageElement | null = null;

  /** Coordinate scale factor */
  public readonly scale: number;
  /** Transformation matrix */
  public readonly matrix: [number, number, number, number, number, number];

  /** Whether to use justification */
  public useJustification = true;

  /** Native WASM shaper instance */
  public readonly quranShaper: VMFQuranShaperNative;

  private readonly emscriptenModule: EmscriptenModule;
  private outline: QuranOutlineItem[] | null = null;
  private texOutline: QuranOutlineItem[] | null = null;

  constructor(quranShaper: VMFQuranShaperNative, module: EmscriptenModule) {
    this.quranShaper = quranShaper;
    this.emscriptenModule = module;

    this.fontScalePerc = 1;
    this.scalePoint = (1 << this.SCALEBY) * this.fontScalePerc;

    this.scale = 72.0 / (4800 << this.SCALEBY);
    this.matrix = [this.scale, 0, 0, -this.scale, 0, 410];
  }

  /**
   * Load the sura header image
   */
  loadSuraImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.suraImage = new Image();
      this.suraImage.onload = () => resolve();
      this.suraImage.onerror = (err) => reject(err);
      this.suraImage.src = src;
    });
  }

  /**
   * Set the font scale percentage
   */
  setScalePoint(percent: number): void {
    this.fontScalePerc = percent;
    this.scalePoint = (1 << this.SCALEBY) * this.fontScalePerc;
  }

  /**
   * Get the current font scale percentage
   */
  getFontScalePerc(): number {
    return this.fontScalePerc;
  }

  /**
   * Get the current scale point
   */
  getScalePoint(): number {
    return this.scalePoint;
  }

  /**
   * Get the number of pages in Tex format
   */
  getTexNbPages(): number {
    return this.quranShaper.getTexNbPages();
  }

  /**
   * Get the outline (sura locations) for navigation
   */
  getOutline(tex: boolean): QuranOutlineItem[] {
    // Cache the outline
    if (tex && this.texOutline) {
      return this.texOutline;
    }
    if (!tex && this.outline) {
      return this.outline;
    }

    const nativeOutline = this.quranShaper.getSuraLocations(tex);
    const size = nativeOutline.size();
    const positions: QuranOutlineItem[] = [];

    for (let i = 0; i < size; i++) {
      const position = nativeOutline.value(i);
      const name = position.name.toStdString();
      position.name.delete();
      positions.push({
        name,
        page: position.page,
      });
    }

    nativeOutline.delete();

    if (tex) {
      this.texOutline = positions;
    } else {
      this.outline = positions;
    }

    return positions;
  }

  /**
   * Get the Emscripten module (for advanced usage like FS access)
   */
  getModule(): EmscriptenModule {
    return this.emscriptenModule;
  }

  /**
   * Shape a page and get the result
   */
  shapePage(
    pageIndex: number,
    lineIndex: number,
    texFormat: boolean,
    tajweedColor: boolean,
    changeSize: boolean
  ): VMFPageResultNative {
    return this.quranShaper.shapePage(
      pageIndex,
      this.fontScalePerc,
      this.useJustification,
      lineIndex,
      texFormat,
      tajweedColor,
      changeSize
    );
  }

  /**
   * Display a glyph on a canvas context
   */
  displayGlyph(
    codepoint: number,
    leftTatweel: number,
    rightTatweel: number,
    ctx: CanvasRenderingContext2D
  ): void {
    this.quranShaper.displayGlyph(codepoint, leftTatweel, rightTatweel, ctx);
  }

  /**
   * Execute MetaPost code
   */
  executeMetapost(code: string): number {
    return this.quranShaper.executeMetapost(code);
  }

  /**
   * Get glyph code by name
   */
  getGlyphCode(name: string): number {
    return this.quranShaper.getGlyphCode(name);
  }

  /**
   * Draw a path by name
   */
  drawPathByName(name: string, ctx: CanvasRenderingContext2D): void {
    this.quranShaper.drawPathByName(name, ctx);
  }

  /**
   * Shape arbitrary text
   */
  shapeText(
    text: string,
    lineWidth: number,
    applyJustification: boolean,
    tajweedColor: boolean,
    ctx: CanvasRenderingContext2D
  ): unknown {
    return this.quranShaper.shapeText(
      text,
      lineWidth,
      this.fontScalePerc,
      applyJustification,
      tajweedColor,
      false,
      ctx
    );
  }

  /**
   * Clear cached alternates
   */
  clearAlternates(): void {
    this.quranShaper.clearAlternates();
  }

  /**
   * Destroy the shaper and release resources
   */
  destroy(): void {
    this.quranShaper.delete();
  }
}
