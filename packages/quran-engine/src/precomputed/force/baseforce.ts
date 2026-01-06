/**
 * @digitalkhatt/quran-engine - Base Force
 *
 * D3 force that positions base glyphs at their target positions
 */

import type { ForceNode } from '../../core/types';
import constant from './constant';

export interface BaseForce {
  (alpha: number): void;
  initialize(nodes: ForceNode[]): void;
  strength(value: number | ((node: ForceNode, index: number, nodes: ForceNode[]) => number)): BaseForce;
  x(value: number | ((node: ForceNode, index: number, nodes: ForceNode[]) => number)): BaseForce;
}

/**
 * Creates a force that moves base glyphs (non-marks) to their target positions
 */
export default function baseForce(): BaseForce {
  let strength: (node: ForceNode, index: number, nodes: ForceNode[]) => number = constant(0.1);
  let nodes: ForceNode[] = [];
  let strengths: number[] = [];
  let xz: number[] = [];
  let x: (node: ForceNode, index: number, nodes: ForceNode[]) => number = constant(0);

  function force(alpha: number): void {
    for (let i = 0, n = nodes.length; i < n; ++i) {
      const node = nodes[i];
      if (!node.isMark) {
        const targetPosX = node.posX;
        const targetPosY = node.posY;
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
  ): BaseForce {
    strength = typeof value === 'function' ? value : constant(+value);
    initialize();
    return force as BaseForce;
  };

  force.x = function (
    value: number | ((node: ForceNode, index: number, nodes: ForceNode[]) => number)
  ): BaseForce {
    x = typeof value === 'function' ? value : constant(+value);
    initialize();
    return force as BaseForce;
  };

  return force as BaseForce;
}
