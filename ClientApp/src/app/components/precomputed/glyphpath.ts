export enum PointType {
  MoveTo = 1,
  Cubic,
}

export interface Point {
  x: number;
  y: number;
}

class Glyph {

}

class GlyphMap {

  private root = new Map();
  constructor() {

  }
  set(codepoint: number, lefttatweel: number, righttatweel: number, glyph: Glyph) {
    let codepointmap = this.root.get(codepoint);
    if (!codepointmap) {
      codepointmap = new Map()
      this.root.set(codepoint, codepointmap);
      let lefttatweelMap = new Map();
      codepointmap.set(lefttatweel, lefttatweelMap);
      lefttatweelMap.set(righttatweel, glyph);
    } else {
      let lefttatweelMap = codepointmap.get(lefttatweel);
      if (!lefttatweelMap) {
        let lefttatweelMap = new Map();
        codepointmap.set(lefttatweel, lefttatweelMap);
        lefttatweelMap.set(righttatweel, glyph);
      } else {
        lefttatweelMap.set(righttatweel, glyph);
      }
    }
  }
  get(codepoint: number, lefttatweel: number, righttatweel: number) {
    const codepointmap = this.root.get(codepoint);
    if (!codepointmap) {
      const lefttatweelMap = codepointmap.get(lefttatweel);
      if (!lefttatweelMap) {
        return lefttatweelMap.get(righttatweel);
      }
    }
    return undefined;
  }

  has(codepoint: number, lefttatweel: number, righttatweel: number) {
    const codepointmap = this.root.get(codepoint);
    if (!codepointmap) {
      const lefttatweelMap = codepointmap.get(lefttatweel);
      if (!lefttatweelMap) {
        return lefttatweelMap.has(righttatweel);
      }
    }
    return false;
  }
}
