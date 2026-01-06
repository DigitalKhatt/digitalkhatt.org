/**
 * @digitalkhatt/quran-engine - Precomputed Canvas Renderer
 *
 * Renders precomputed layout data to Canvas 2D
 */

import * as d3Force from 'd3-force';
import type {
  PageFormat,
  RenderResult,
  WordRect,
  LineRect,
  ForceNode,
  ForceSimulationOptions,
} from '../core/types';
import type { RenderOptions } from '../canvas/CanvasRenderer';
import { LayoutService, PAGE_WIDTH, MARGIN, INTERLINE } from './LayoutService';
import { baseForce, markbaseforce } from './force';

/**
 * Glyph cache for Path2D objects
 */
class GlyphCache {
  private cache = new Map<string, Path2D>();
  private maxSize: number;

  constructor(maxSize = 5000) {
    this.maxSize = maxSize;
  }

  getOrCreate(
    codepoint: number,
    lefttatweel: number,
    righttatweel: number,
    layoutService: LayoutService
  ): Path2D {
    const key = `${codepoint}:${lefttatweel}:${righttatweel}`;
    let path = this.cache.get(key);

    if (!path) {
      path = layoutService.getGlyphPath2D(codepoint, lefttatweel, righttatweel);
      this.cache.set(key, path);

      // LRU eviction
      if (this.cache.size > this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }
    }

    return path;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Render a page using precomputed layout data
 */
export function renderPrecomputedPage(
  canvas: HTMLCanvasElement,
  pageIndex: number,
  viewport: PageFormat,
  layoutService: LayoutService,
  options: RenderOptions = {},
  glyphCache: GlyphCache,
  forceOptions: ForceSimulationOptions = {}
): RenderResult {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Could not get 2D context');
  }

  const pageLayout = layoutService.getPageLayout(pageIndex);
  if (!pageLayout) {
    return { wordRects: [], lineRects: [] };
  }

  // Set canvas dimensions
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // Calculate scale
  const scale = viewport.width / PAGE_WIDTH;
  const fontSize = viewport.fontSize || 1000;
  const glyphScale = (fontSize / 1000) * scale;

  // Clear canvas
  ctx.fillStyle = options.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Set default text color
  ctx.fillStyle = options.textColor || '#000000';

  // Track word and line rectangles
  const wordRects: WordRect[] = [];
  const lineRects: LineRect[] = [];

  // Initialize simulation for this page
  layoutService.clearSimulationNodes(pageIndex);
  layoutService.initSimulation(pageIndex);

  // Render each line
  const lineCount = pageLayout.lines.length;
  const marginPx = MARGIN * scale;
  const lineHeight = INTERLINE * scale;

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
    const lineLayout = pageLayout.lines[lineIndex];
    if (!lineLayout) continue;

    const lineY = (200 + INTERLINE * lineIndex) * scale;
    const xScale = lineLayout.xscale || 1;

    // Track line bounds
    let lineMinX = Infinity;
    let lineMaxX = -Infinity;

    ctx.save();

    // Position for this line - right to left rendering
    const lineStartX = viewport.width - marginPx;
    ctx.translate(lineStartX, lineY);
    ctx.scale(glyphScale * xScale, -glyphScale); // Flip Y for glyph coordinates

    let currentxPos = -lineLayout.x;
    let currentBase: ForceNode | undefined;

    for (let glyphIndex = 0; glyphIndex < lineLayout.glyphs.length; glyphIndex++) {
      const glyph = lineLayout.glyphs[glyphIndex];
      const glyphInfo = layoutService.glyphs[glyph.codepoint];

      if (!glyphInfo) continue;

      currentxPos -= glyph.x_advance || 0;
      const posX = currentxPos + (glyph.x_offset || 0);
      const posY = glyph.y_offset || 0;

      // Get cached path
      const path = glyphCache.getOrCreate(
        glyph.codepoint,
        glyph.lefttatweel || 0,
        glyph.righttatweel || 0,
        layoutService
      );

      // Create force node
      const node: ForceNode = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        posX,
        posY,
        isMark: glyphInfo.classes?.marks === true,
        baseNode: undefined,
        x_offset: glyph.x_offset || 0,
        y_offset: glyph.y_offset || 0,
      };

      if (node.isMark && currentBase) {
        node.baseNode = currentBase;
      } else if (glyphInfo.name !== 'space') {
        currentBase = node;
      }

      layoutService.addSimulationNode(pageIndex, node);

      // Draw glyph at position
      ctx.save();
      ctx.translate(posX, posY);
      ctx.fill(path);
      ctx.restore();

      // Track line bounds (in page coordinates)
      const glyphX = lineStartX + posX * glyphScale * xScale;
      lineMinX = Math.min(lineMinX, glyphX);
      lineMaxX = Math.max(lineMaxX, glyphX);
    }

    ctx.restore();

    // Add line rect
    if (lineMinX !== Infinity) {
      lineRects.push({
        lineIndex,
        x: Math.min(lineMinX, lineMaxX),
        y: lineY - lineHeight / 2,
        width: Math.abs(lineMaxX - lineMinX),
        height: lineHeight,
      });
    }
  }

  // Run force simulation
  runForceSimulation(pageIndex, layoutService, forceOptions);

  return { wordRects, lineRects };
}

/**
 * Run D3 force simulation for mark positioning
 */
function runForceSimulation(
  pageIndex: number,
  layoutService: LayoutService,
  options: ForceSimulationOptions
): void {
  const nodes = layoutService.getSimulationNodes(pageIndex);
  if (nodes.length === 0) return;

  const iterations = options.iterations ?? 300;
  const alphaDecay = options.alphaDecay ?? 0.0228;

  const simulation = d3Force.forceSimulation(nodes as d3Force.SimulationNodeDatum[])
    .alphaDecay(alphaDecay)
    .force('baseForce', baseForce() as unknown as d3Force.Force<d3Force.SimulationNodeDatum, undefined>)
    .force('marktobase', markbaseforce() as unknown as d3Force.Force<d3Force.SimulationNodeDatum, undefined>);

  // Run simulation synchronously for specified iterations
  simulation.stop();
  for (let i = 0; i < iterations; i++) {
    simulation.tick();
  }
}

/**
 * Create a precomputed canvas renderer instance
 */
export function createPrecomputedCanvasRenderer(layoutService: LayoutService): {
  render: (
    canvas: HTMLCanvasElement,
    pageIndex: number,
    viewport: PageFormat,
    options?: RenderOptions,
    forceOptions?: ForceSimulationOptions
  ) => RenderResult;
  clearCache: () => void;
} {
  const glyphCache = new GlyphCache();

  return {
    render: (
      canvas: HTMLCanvasElement,
      pageIndex: number,
      viewport: PageFormat,
      options: RenderOptions = {},
      forceOptions: ForceSimulationOptions = {}
    ) => {
      return renderPrecomputedPage(canvas, pageIndex, viewport, layoutService, options, glyphCache, forceOptions);
    },
    clearCache: () => {
      glyphCache.clear();
    },
  };
}
