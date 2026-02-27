import type { GraphNode, GraphEdge } from '$lib/types/graph';

function createGraphStore() {
	let nodes = $state<GraphNode[]>([]);
	let edges = $state<GraphEdge[]>([]);
	let viewport = $state({ x: 0, y: 0, zoom: 1 });
	let expandedIds = $state<Set<string>>(new Set());
	let utilityNodeIds = $state<Set<string>>(new Set());
	let showUtilityEdges = $state(false);
	let selectedUtilityId = $state<string | null>(null);
	let focusedGroupId = $state<string | null>(null);

	return {
		get nodes() { return nodes; },
		set nodes(v: GraphNode[]) { nodes = v; },

		get edges() { return edges; },
		set edges(v: GraphEdge[]) { edges = v; },

		get viewport() { return viewport; },
		set viewport(v: { x: number; y: number; zoom: number }) { viewport = v; },

		get expandedIds() { return expandedIds; },

		get utilityNodeIds() { return utilityNodeIds; },
		set utilityNodeIds(v: Set<string>) { utilityNodeIds = v; },

		get showUtilityEdges() { return showUtilityEdges; },
		set showUtilityEdges(v: boolean) { showUtilityEdges = v; },

		get selectedUtilityId() { return selectedUtilityId; },
		set selectedUtilityId(v: string | null) { selectedUtilityId = v; },

		get focusedGroupId() { return focusedGroupId; },
		set focusedGroupId(v: string | null) { focusedGroupId = v; },

		toggleExpanded(nodeId: string) {
			const next = new Set(expandedIds);
			if (next.has(nodeId)) {
				next.delete(nodeId);
			} else {
				next.add(nodeId);
			}
			expandedIds = next;
		},

		expand(nodeId: string) {
			if (!expandedIds.has(nodeId)) {
				const next = new Set(expandedIds);
				next.add(nodeId);
				expandedIds = next;
			}
		},

		collapse(nodeId: string) {
			if (expandedIds.has(nodeId)) {
				const next = new Set(expandedIds);
				next.delete(nodeId);
				expandedIds = next;
			}
		},

		clear() {
			nodes = [];
			edges = [];
			viewport = { x: 0, y: 0, zoom: 1 };
			expandedIds = new Set();
			utilityNodeIds = new Set();
			showUtilityEdges = false;
			selectedUtilityId = null;
			focusedGroupId = null;
		}
	};
}

export const graphStore = createGraphStore();
