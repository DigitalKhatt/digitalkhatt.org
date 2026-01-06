/**
 * @digitalkhatt/quran-engine - Mark Base Force
 *
 * D3 force that attaches diacritical marks to their base glyphs
 */

import type { ForceNode } from '../../core/types';
import constant from './constant';

export interface MarkBaseForce {
  (alpha: number): void;
  initialize(nodes: ForceNode[]): void;
  strength(value: number | ((node: ForceNode, index: number, nodes: ForceNode[]) => number)): MarkBaseForce;
  x(value: number | ((node: ForceNode, index: number, nodes: ForceNode[]) => number)): MarkBaseForce;
}

/**
 * Creates a force that moves marks to follow their base glyphs
 */
export default function markbaseforce(): MarkBaseForce {
  let strength: (node: ForceNode, index: number, nodes: ForceNode[]) => number = constant(1);
  let nodes: ForceNode[] = [];
  let strengths: number[] = [];
  let xz: number[] = [];
  let x: (node: ForceNode, index: number, nodes: ForceNode[]) => number = constant(0);

  function force(alpha: number): void {
    for (let i = 0, n = nodes.length; i < n; ++i) {
      const node = nodes[i];
      if (node.isMark && node.baseNode) {
        const baseNode = node.baseNode;
        const targetPosX = baseNode.x + baseNode.vx + (node.posX - baseNode.posX);
        const targetPosY = baseNode.y + baseNode.vy + (node.posY - baseNode.posY);
        node.vx += (targetPosX - node.x) * strengths[i] * alpha;
        node.vy += (targetPosY - node.y) * strengths[i] * alpha;
      }
    }
  }

  function initialize(): void {
    if (!nodes) return;
    const n = nodes.length;
    strengths = new Array(n);
    xz = new Array(n);
    for (let i = 0; i < n; ++i) {
      xz[i] = +x(nodes[i], i, nodes);
      strengths[i] = isNaN(xz[i]) ? 0 : +strength(nodes[i], i, nodes);
    }
  }

  force.initialize = function (_nodes: ForceNode[]): void {
    nodes = _nodes;
    initialize();
  };

  force.strength = function (
    value: number | ((node: ForceNode, index: number, nodes: ForceNode[]) => number)
  ): MarkBaseForce {
    strength = typeof value === 'function' ? value : constant(+value);
    initialize();
    return force as MarkBaseForce;
  };

  force.x = function (
    value: number | ((node: ForceNode, index: number, nodes: ForceNode[]) => number)
  ): MarkBaseForce {
    x = typeof value === 'function' ? value : constant(+value);
    initialize();
    return force as MarkBaseForce;
  };

  return force as MarkBaseForce;
}
