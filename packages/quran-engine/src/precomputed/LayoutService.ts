/**
 * @digitalkhatt/quran-engine - Layout Service
 *
 * Manages precomputed layout data and generates glyph paths
 */

import type {
  PrecomputedLayoutData,
  GlyphPathData,
  PrecomputedPageLayout,
  PrecomputedLineLayout,
  PrecomputedGlyphInfo,
  ForceNode,
} from '../core/types';

/**
 * Page constants
 */
export const PAGE_WIDTH = 17000;
export const MARGIN = 300;
export const LINE_WIDTH = PAGE_WIDTH - 2 * MARGIN;
export const INTERLINE = 1800;

/**
 * Simulation info for a page
 */
interface PageSimInfo {
  nodes: ForceNode[];
}

/**
 * LayoutService manages precomputed layout data and generates glyph paths
 */
export class LayoutService {
  /** Glyph definitions with paths */
  public readonly glyphs: Record<number, GlyphPathData>;
  /** Page layouts */
  public readonly pages: PrecomputedPageLayout[];
  /** Character classifications */
  public readonly classes: Record<string, number[]>;

  /** Simulation info per page */
  private simInfo: Map<number, PageSimInfo> = new Map();

  constructor(layout: PrecomputedLayoutData) {
    this.glyphs = layout.glyphs;
    this.pages = layout.pages;
    this.classes = layout.classes as Record<string, number[]>;

    // Assign classes to glyphs
    for (const className in this.classes) {
      const codepoints = this.classes[className];
      if (!codepoints) continue;

      for (const code of codepoints) {
        const glyph = this.glyphs[code];
        if (glyph) {
          const classes = glyph.classes || {};
          classes[className] = true;
          glyph.classes = classes;
        }
      }
    }
  }

  /**
   * Get the number of pages
   */
  getPageCount(): number {
    return this.pages.length;
  }

  /**
   * Get the layout for a specific page
   */
  getPageLayout(pageIndex: number): PrecomputedPageLayout | undefined {
    return this.pages[pageIndex];
  }

  /**
   * Get the layout for a specific line
   */
  getLineLayout(pageIndex: number, lineIndex: number): PrecomputedLineLayout | undefined {
    const page = this.pages[pageIndex];
    return page?.lines[lineIndex];
  }

  /**
   * Initialize simulation for a page
   */
  initSimulation(pageIndex: number): void {
    this.simInfo.set(pageIndex, { nodes: [] });
  }

  /**
   * Get simulation nodes for a page
   */
  getSimulationNodes(pageIndex: number): ForceNode[] {
    let info = this.simInfo.get(pageIndex);
    if (!info) {
      info = { nodes: [] };
      this.simInfo.set(pageIndex, info);
    }
    return info.nodes;
  }

  /**
   * Add a node to the simulation
   */
  addSimulationNode(pageIndex: number, node: ForceNode): void {
    const nodes = this.getSimulationNodes(pageIndex);
    nodes.push(node);
  }

  /**
   * Clear simulation nodes for a page
   */
  clearSimulationNodes(pageIndex: number): void {
    this.simInfo.delete(pageIndex);
  }

  /**
   * Check if a glyph is a mark
   */
  isMarkGlyph(codepoint: number): boolean {
    const glyph = this.glyphs[codepoint];
    return glyph?.classes?.marks === true;
  }

  /**
   * Check if a glyph is a space
   */
  isSpaceGlyph(codepoint: number): boolean {
    const glyph = this.glyphs[codepoint];
    return glyph?.name === 'space';
  }

  /**
   * Generate SVG path string for a glyph with tatweel interpolation
   */
  getGlyphPath(codepoint: number, lefttatweel: number, righttatweel: number): string {
    const glyphInfo = this.glyphs[codepoint];
    if (!glyphInfo) {
      return '';
    }

    const limits = glyphInfo.limits || [0, 0, 0, 0];

    // Clamp tatweel values to limits
    lefttatweel = Math.max(limits[0], Math.min(limits[1], lefttatweel));
    righttatweel = Math.max(limits[2], Math.min(limits[3], righttatweel));

    // Calculate interpolation scalars
    let leftScalar = 0;
    if (lefttatweel < 0 && limits[0] !== 0) {
      leftScalar = lefttatweel / limits[0];
    } else if (lefttatweel > 0 && limits[1] !== 0) {
      leftScalar = lefttatweel / limits[1];
    }

    let rightScalar = 0;
    if (righttatweel < 0 && limits[2] !== 0) {
      rightScalar = righttatweel / limits[2];
    } else if (righttatweel > 0 && limits[3] !== 0) {
      rightScalar = righttatweel / limits[3];
    }

    // Interpolation function
    const interpolate = (value: number, pathIndex: number, segmentIndex: number, coordIndex: number): number => {
      let interpolatedValue = value;

      if (lefttatweel < 0 && glyphInfo.minLeft?.[pathIndex]?.path[segmentIndex]) {
        const minLeftValue = glyphInfo.minLeft[pathIndex].path[segmentIndex][coordIndex];
        if (minLeftValue !== undefined) {
          interpolatedValue += (minLeftValue - value) * leftScalar;
        }
      } else if (lefttatweel > 0 && glyphInfo.maxLeft?.[pathIndex]?.path[segmentIndex]) {
        const maxLeftValue = glyphInfo.maxLeft[pathIndex].path[segmentIndex][coordIndex];
        if (maxLeftValue !== undefined) {
          interpolatedValue += (maxLeftValue - value) * leftScalar;
        }
      }

      if (righttatweel < 0 && glyphInfo.minRight?.[pathIndex]?.path[segmentIndex]) {
        const minRightValue = glyphInfo.minRight[pathIndex].path[segmentIndex][coordIndex];
        if (minRightValue !== undefined) {
          interpolatedValue += (minRightValue - value) * rightScalar;
        }
      } else if (righttatweel > 0 && glyphInfo.maxRight?.[pathIndex]?.path[segmentIndex]) {
        const maxRightValue = glyphInfo.maxRight[pathIndex].path[segmentIndex][coordIndex];
        if (maxRightValue !== undefined) {
          interpolatedValue += (maxRightValue - value) * rightScalar;
        }
      }

      return interpolatedValue;
    };

    // Build path string
    let pathd = '';

    for (let i = 0; i < glyphInfo.default.length; i++) {
      const defaultPath = glyphInfo.default[i];

      for (let j = 0; j < defaultPath.path.length; j++) {
        const segment = defaultPath.path[j];

        if (segment.length === 2) {
          // MoveTo
          pathd += `M${interpolate(segment[0], i, j, 0)} ${interpolate(segment[1], i, j, 1)}`;
        } else if (segment.length === 6) {
          // CurveTo
          pathd += `C${interpolate(segment[0], i, j, 0)} ${interpolate(segment[1], i, j, 1)},`;
          pathd += `${interpolate(segment[2], i, j, 2)} ${interpolate(segment[3], i, j, 3)},`;
          pathd += `${interpolate(segment[4], i, j, 4)} ${interpolate(segment[5], i, j, 5)}`;
        }
      }
    }

    return pathd;
  }

  /**
   * Convert SVG path string to Path2D for canvas rendering
   */
  getGlyphPath2D(codepoint: number, lefttatweel: number, righttatweel: number): Path2D {
    const pathString = this.getGlyphPath(codepoint, lefttatweel, righttatweel);
    return new Path2D(pathString);
  }

  /**
   * Get glyph info for rendering a line
   */
  getLineGlyphs(pageIndex: number, lineIndex: number): Array<{
    glyph: PrecomputedGlyphInfo;
    glyphInfo: GlyphPathData;
    posX: number;
    posY: number;
  }> {
    const lineLayout = this.getLineLayout(pageIndex, lineIndex);
    if (!lineLayout) {
      return [];
    }

    const result: Array<{
      glyph: PrecomputedGlyphInfo;
      glyphInfo: GlyphPathData;
      posX: number;
      posY: number;
    }> = [];

    let currentxPos = -lineLayout.x;

    for (const glyph of lineLayout.glyphs) {
      currentxPos -= glyph.x_advance || 0;
      const glyphInfo = this.glyphs[glyph.codepoint];

      if (glyphInfo) {
        const posX = currentxPos + (glyph.x_offset || 0);
        const posY = glyph.y_offset || 0;

        result.push({
          glyph,
          glyphInfo,
          posX,
          posY,
        });
      }
    }

    return result;
  }
}
