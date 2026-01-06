/**
 * @digitalkhatt/quran-engine - Force Constant Utility
 *
 * Creates a constant function for D3 force simulation
 */

import type { ForceNode } from '../../core/types';

/**
 * Creates a function that always returns the given constant value
 */
export default function constant(x: number): (node: ForceNode, index: number, nodes: ForceNode[]) => number {
  return function (_node: ForceNode, _index: number, _nodes: ForceNode[]): number {
    return x;
  };
}
