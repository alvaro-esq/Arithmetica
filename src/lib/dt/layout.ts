// Tidy top-down layout for a TreeNode, in pixel coordinates ready for native
// <svg>. No charting library — x by in-order leaf position, y by depth. Keeps the
// tree-diagram components thin (they just map the returned boxes/edges to circles
// and lines).

import type { TreeNode } from './types';

export interface NodeBox {
  id: number;
  x: number;
  y: number;
  node: TreeNode;
  depth: number;
}

export interface EdgeLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: '≤' | '>';
}

/**
 * Layout `tree` inside `width × height` (minus `pad`). Leaves are spread evenly
 * along x in in-order; each node sits at the midpoint of its children, and y is a
 * function of depth. Returns positioned nodes (with stable ids) and parent→child
 * edges labelled with the branch condition.
 */
export function layoutTree(
  tree: TreeNode,
  width: number,
  height: number,
  pad = 28,
): { nodes: NodeBox[]; edges: EdgeLine[] } {
  const nodes: NodeBox[] = [];
  const edges: EdgeLine[] = [];

  // First pass: assign each node an x via an in-order leaf counter, and record depth.
  let leafCursor = 0;
  let maxDepth = 0;
  const xOf = new Map<TreeNode, number>();

  function assign(node: TreeNode): number {
    maxDepth = Math.max(maxDepth, node.depth);
    let x: number;
    if (node.kind === 'leaf') {
      x = leafCursor++;
    } else {
      const lx = assign(node.left);
      const rx = assign(node.right);
      x = (lx + rx) / 2;
    }
    xOf.set(node, x);
    return x;
  }
  assign(tree);

  const leaves = Math.max(1, leafCursor);
  const innerW = width - 2 * pad;
  const innerH = height - 2 * pad;
  const px = (slot: number) => pad + (leaves === 1 ? innerW / 2 : (slot / (leaves - 1)) * innerW);
  const py = (depth: number) => pad + (maxDepth === 0 ? 0 : (depth / maxDepth) * innerH);

  let id = 0;
  function place(node: TreeNode) {
    const x = px(xOf.get(node)!);
    const y = py(node.depth);
    nodes.push({ id: id++, x, y, node, depth: node.depth });
    if (node.kind === 'split') {
      const lx = px(xOf.get(node.left)!);
      const ly = py(node.left.depth);
      const rx = px(xOf.get(node.right)!);
      const ry = py(node.right.depth);
      edges.push({ x1: x, y1: y, x2: lx, y2: ly, label: '≤' });
      edges.push({ x1: x, y1: y, x2: rx, y2: ry, label: '>' });
      place(node.left);
      place(node.right);
    }
  }
  place(tree);

  return { nodes, edges };
}
