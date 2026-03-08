import dagre from '@dagrejs/dagre';
import type { ProcessNode, ProcessEdge } from './types';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 120;
const RANK_SEP = 80;
const NODE_SEP = 40;

/**
 * Apply Dagre auto-layout to arrange nodes in a readable top-to-bottom flow.
 * Returns new node array with updated positions (edges unchanged).
 */
export function autoLayout(
  nodes: ProcessNode[],
  edges: ProcessEdge[]
): ProcessNode[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    marginx: 40,
    marginy: 40,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}
