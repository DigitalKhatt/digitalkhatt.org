/**
 * @digitalkhatt/quran-engine - Line Rendering Helper
 *
 * High-level helper for rendering a complete line with justification.
 */

import type { HBFeature, LineTextInfo, JustResultByLine } from '../core/types';
import { HarfBuzzFont } from '../core/harfbuzz';
import { SVGLineRenderer, SpaceType } from './SVGLineRenderer';

/**
 * Configuration for line rendering
 */
export interface LineRenderConfig {
  /** The HarfBuzz font to use */
  font: HarfBuzzFont;
  /** Line text info from justification analysis */
  lineTextInfo: LineTextInfo;
  /** Justification result */
  justResult: JustResultByLine;
  /** Optional tajweed color map */
  tajweedResult?: Map<number, string>;
  /** Scale factor */
  glyphScale: number;
  /** Font size ratio for additional scaling */
  fontSizeRatio?: number;
  /** Margin for positioning */
  margin: number;
  /** Whether to center the content */
  center?: boolean;
  /** Line element height (for vertical positioning) */
  lineHeight: number;
  /** Aya SVG group for number rendering */
  ayaSvgGroup?: SVGGElement;
  /** Number of digits in aya number */
  ayaDigitCount?: number;
  /** Y offset for aya rendering */
  ayaYOffset?: number;
  /** Justification style (for scale calculation) */
  justStyle?: 'xScale' | 'sclXAxis' | 'sameSizeByPage';
}

/**
 * Render a line to an SVG element with full justification
 */
export function renderLineToSVG(config: LineRenderConfig): SVGSVGElement {
  const {
    font,
    lineTextInfo,
    justResult,
    tajweedResult,
    glyphScale,
    fontSizeRatio = 1,
    margin,
    center = false,
    lineHeight,
    ayaSvgGroup,
    ayaDigitCount = 0,
    ayaYOffset = 0,
    justStyle = 'xScale',
  } = config;

  const renderer = new SVGLineRenderer(font);

  // Build features list
  const features: HBFeature[] = lineTextInfo.features ? [...lineTextInfo.features] : [];

  // Add global features from justification
  for (const feat of justResult.globalFeatures || []) {
    features.push({
      tag: feat.name,
      value: feat.value,
      start: 0,
      end: -1,
    });
  }

  // Add per-character features from justification
  if (justResult.fontFeatures?.size > 0) {
    for (let wordIndex = 0; wordIndex < lineTextInfo.wordInfos.length; wordIndex++) {
      const wordInfo = lineTextInfo.wordInfos[wordIndex];

      for (let i = wordInfo.startIndex; i <= wordInfo.endIndex; i++) {
        const justInfo = justResult.fontFeatures.get(i);
        if (justInfo) {
          for (const feat of justInfo) {
            features.push({
              tag: feat.name,
              value: feat.value,
              start: i,
              end: i + 1,
            });
          }
        }
      }
    }
  }

  // Shape the text
  const shapedGlyphs = renderer.shapeText(lineTextInfo.lineText, features);

  // Calculate scales
  const xScale = justStyle === 'sclXAxis' ? fontSizeRatio : fontSizeRatio * justResult.xScale;
  const yScale = justStyle === 'sameSizeByPage' ? xScale : 1;

  // Render to SVG
  const result = renderer.renderToSVG(
    lineTextInfo.lineText,
    shapedGlyphs,
    lineTextInfo.spaces as Map<number, typeof SpaceType.Simple | typeof SpaceType.Aya>,
    justResult.simpleSpacing,
    justResult.ayaSpacing,
    {
      glyphScale,
      xScale,
      yScale,
      tajweedClasses: tajweedResult,
      ayaDigitCount,
      ayaSvgGroup,
      ayaYOffset,
    }
  );

  const { svg, lineWidth } = result;

  // Set up viewBox and dimensions
  const x = lineWidth * 2;
  const width = x + margin;
  const height = lineHeight * 2;

  svg.setAttribute('viewBox', `${-x} ${-height / 2} ${width} ${height}`);
  svg.setAttribute('width', width.toString());
  svg.setAttribute('height', height.toString());
  svg.style.position = 'relative';

  if (center) {
    // For centered content (like basmala)
    // This needs to be calculated by the caller based on container width
  } else {
    svg.style.right = -margin + 'px';
  }

  svg.style.top = -lineHeight / 2 + 'px';

  return svg;
}
