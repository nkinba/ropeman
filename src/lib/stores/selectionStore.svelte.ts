import type { GraphNode } from '$lib/types/graph';
import { graphStore } from './graphStore.svelte';

function createSelectionStore() {
	let selectedNode = $state<GraphNode | null>(null);
	let hoveredNode = $state<GraphNode | null>(null);
	let breadcrumb = $state<GraphNode[]>([]);

	function buildBreadcrumb(node: GraphNode): GraphNode[] {
		const path: GraphNode[] = [];
		let current: GraphNode | undefined = node;

		while (current) {
			path.unshift(current);
			if (current.parentId) {
				current = graphStore.nodes.find((n) => n.id === current!.parentId);
			} else {
				break;
			}
		}

		return path;
	}

	return {
		get selectedNode() { return selectedNode; },
		set selectedNode(v: GraphNode | null) { selectedNode = v; },

		get hoveredNode() { return hoveredNode; },
		set hoveredNode(v: GraphNode | null) { hoveredNode = v; },

		get breadcrumb() { return breadcrumb; },
		set breadcrumb(v: GraphNode[]) { breadcrumb = v; },

		select(node: GraphNode) {
			selectedNode = node;
			breadcrumb = buildBreadcrumb(node);
		},

		clear() {
			selectedNode = null;
			hoveredNode = null;
			breadcrumb = [];
		}
	};
}

export const selectionStore = createSelectionStore();
