import type { SemanticLevel } from '$lib/types/semantic';
import type { Node, Edge } from '@xyflow/svelte';
import dagre from '@dagrejs/dagre';

const SEMANTIC_NODE_WIDTH = 280;
const SEMANTIC_NODE_HEIGHT = 160;

const EDGE_TYPE_STYLES: Record<string, string> = {
	depends_on: 'stroke: #94a3b8; stroke-width: 2px;',
	calls: 'stroke: #3b82f6; stroke-width: 2px;',
	extends: 'stroke: #a855f7; stroke-width: 2px;',
	uses: 'stroke: #22c55e; stroke-width: 2px;'
};

export function toSemanticFlowNodes(level: SemanticLevel): Node[] {
	const g = new dagre.graphlib.Graph();
	g.setGraph({
		rankdir: 'LR',
		nodesep: 80,
		ranksep: 120,
		marginx: 40,
		marginy: 40
	});
	g.setDefaultEdgeLabel(() => ({}));

	for (const node of level.nodes) {
		g.setNode(node.id, {
			width: SEMANTIC_NODE_WIDTH,
			height: SEMANTIC_NODE_HEIGHT
		});
	}

	for (const edge of level.edges) {
		g.setEdge(edge.source, edge.target);
	}

	dagre.layout(g);

	return level.nodes.map(node => {
		const pos = g.node(node.id);
		return {
			id: node.id,
			type: 'semanticNode',
			position: {
				x: pos.x - SEMANTIC_NODE_WIDTH / 2,
				y: pos.y - SEMANTIC_NODE_HEIGHT / 2
			},
			data: {
				label: node.label,
				description: node.description,
				color: node.color,
				filePaths: node.filePaths,
				keySymbols: node.keySymbols,
				fileCount: node.fileCount,
				parentId: node.parentId,
				depth: node.depth,
				id: node.id
			},
			width: SEMANTIC_NODE_WIDTH,
			height: SEMANTIC_NODE_HEIGHT
		} as Node;
	});
}

export function toSemanticFlowEdges(level: SemanticLevel): Edge[] {
	return level.edges.map(edge => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		type: 'smoothstep',
		animated: true,
		...(edge.label ? { label: edge.label } : {}),
		style: EDGE_TYPE_STYLES[edge.type] ?? EDGE_TYPE_STYLES.uses,
		data: { edgeType: edge.type }
	}));
}
