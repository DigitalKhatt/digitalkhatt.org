/**
 * Ink profiles: where a word's ink starts and ends, band by band.
 *
 * Two neighbouring words don't collide where their bounding boxes meet (tails,
 * descenders and marks interleave) but where their ink meets in the same
 * horizontal band. A profile keeps, for every band of ROW font units, the
 * leftmost and rightmost ink of a shaped word (x from the word's own origin),
 * so the ink-to-ink distance of two words placed side by side is exact to one
 * band. Outlines come from HarfBuzz (glyphToSvgPath), sampled densely enough
 * that no band is skipped.
 */
import { HarfBuzzBuffer, HarfBuzzFont, HBFeature, hb } from "../../../ClientApp/src/app/components/hbmedina/harfbuzz";

export const ROW = 20;
const Y_MIN = -1500, Y_MAX = 2500;
const BANDS = (Y_MAX - Y_MIN) / ROW;

export interface InkProfile {
  advance: number;
  left: Float64Array;     // per band, NaN = no ink
  right: Float64Array;
}

function sample(path: string, dx: number, dy: number, left: Float64Array, right: Float64Array) {
  const nums = (s: string) => s.trim().split(/[ ,]+/).filter(Boolean).map(Number);
  let x = 0, y = 0, sx = 0, sy = 0;
  const put = (px: number, py: number) => {
    const b = Math.floor((py + dy - Y_MIN) / ROW);
    if (b < 0 || b >= BANDS) return;
    const X = px + dx;
    if (!(X >= left[b])) left[b] = X;      // NaN-safe min
    if (!(X <= right[b])) right[b] = X;
  };
  const steps = (...pts: number[]) => {
    let d = 0;
    for (let i = 2; i < pts.length; i += 2) d = Math.max(d, Math.abs(pts[i] - pts[i - 2]), Math.abs(pts[i + 1] - pts[i - 1]));
    return Math.max(1, Math.ceil(d / (ROW / 2)));
  };
  for (const m of path.matchAll(/([MLCQZ])([^MLCQZ]*)/g)) {
    const v = nums(m[2]);
    switch (m[1]) {
      case "M": x = sx = v[0]; y = sy = v[1]; put(x, y); break;
      case "L": {
        const n = steps(x, y, v[0], v[1]);
        for (let i = 1; i <= n; i++) put(x + (v[0] - x) * i / n, y + (v[1] - y) * i / n);
        x = v[0]; y = v[1]; break;
      }
      case "Q": {
        const n = steps(x, y, v[0], v[1], v[2], v[3]);
        for (let i = 1; i <= n; i++) {
          const t = i / n, u = 1 - t;
          put(u * u * x + 2 * u * t * v[0] + t * t * v[2], u * u * y + 2 * u * t * v[1] + t * t * v[3]);
        }
        x = v[2]; y = v[3]; break;
      }
      case "C": {
        const n = steps(x, y, v[0], v[1], v[2], v[3], v[4], v[5]);
        for (let i = 1; i <= n; i++) {
          const t = i / n, u = 1 - t;
          put(u * u * u * x + 3 * u * u * t * v[0] + 3 * u * t * t * v[2] + t * t * t * v[4],
            u * u * u * y + 3 * u * u * t * v[1] + 3 * u * t * t * v[3] + t * t * t * v[5]);
        }
        x = v[4]; y = v[5]; break;
      }
      case "Z": {
        const n = steps(x, y, sx, sy);
        for (let i = 1; i <= n; i++) put(x + (sx - x) * i / n, y + (sy - y) * i / n);
        x = sx; y = sy; break;
      }
    }
  }
}

const paths = new WeakMap<HarfBuzzFont, Map<number, string>>();
/** Glyph outline as an SVG path, cached per font. */
function glyphPath(font: HarfBuzzFont, glyphId: number): string {
  let m = paths.get(font);
  if (!m) paths.set(font, m = new Map());
  let p = m.get(glyphId);
  if (p === undefined) m.set(glyphId, p = font.glyphToSvgPath(glyphId));
  return p;
}

/** Profile of one word shaped as the DOM shapes it (one buffer, RTL). */
export function wordProfile(font: HarfBuzzFont, text: string, features: HBFeature[]): InkProfile {
  const buffer = new HarfBuzzBuffer();
  buffer.setDirection("rtl");
  buffer.setLanguage(hb.arabLanguage);
  buffer.setScript(hb.arabScript);
  buffer.setClusterLevel(1);
  buffer.addText(text);
  const glyphs = buffer.shape(font, features);
  buffer.destroy();
  const left = new Float64Array(BANDS).fill(NaN), right = new Float64Array(BANDS).fill(NaN);
  let x = 0;
  for (const g of glyphs) {                       // visual order, left to right
    sample(glyphPath(font, g.GlyphId), x + g.XOffset, g.YOffset, left, right);
    x += g.XAdvance;
  }
  return { advance: x, left, right };
}

/**
 * Closest ink distance between two words set box to box (no space): `right`
 * is the word read first (on the right), `left` the next one. A space s makes
 * the distance offset + s. Words can be scaled horizontally (cRight, cLeft),
 * each about its own box origin.
 */
export function clearanceOffset(right: InkProfile, left: InkProfile, cRight = 1, cLeft = 1): number {
  let best = Infinity;
  for (let b = 0; b < BANDS; b++) {
    const l = right.left[b], r = left.right[b];
    if (Number.isNaN(l) || Number.isNaN(r)) continue;
    best = Math.min(best, l * cRight + (left.advance - r) * cLeft);
  }
  if (best === Infinity) {                         // no shared band: use the boxes
    let minL = Infinity, maxR = -Infinity;
    right.left.forEach(v => { if (!Number.isNaN(v)) minL = Math.min(minL, v); });
    left.right.forEach(v => { if (!Number.isNaN(v)) maxR = Math.max(maxR, v); });
    best = (Number.isFinite(minL) ? minL * cRight : 0) + (Number.isFinite(maxR) ? (left.advance - maxR) * cLeft : 0);
  }
  return best;
}

/** Profile of glyphs already placed (x, y in one coordinate system, e.g. a whole line). */
export function placedProfile(font: HarfBuzzFont, glyphs: { glyphId: number, x: number, y: number }[]): InkProfile {
  const left = new Float64Array(BANDS).fill(NaN), right = new Float64Array(BANDS).fill(NaN);
  for (const g of glyphs) sample(glyphPath(font, g.glyphId), g.x, g.y, left, right);
  return { advance: 0, left, right };
}

/** Closest ink distance between two placed profiles, `right` being right of `left`. */
export function placedDistance(right: InkProfile, left: InkProfile): number {
  let best = Infinity;
  for (let b = 0; b < BANDS; b++) {
    const l = right.left[b], r = left.right[b];
    if (!Number.isNaN(l) && !Number.isNaN(r)) best = Math.min(best, l - r);
  }
  return best;
}
