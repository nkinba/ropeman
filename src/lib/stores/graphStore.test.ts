import { describe, it, expect, beforeEach } from 'vitest';
import { graphStore } from './graphStore.svelte';
import type { GraphNode, GraphEdge } from '$lib/types/graph';

function makeNode(id: string, overrides: Partial<GraphNode> = {}): GraphNode {
	return {
		id,
		kind: 'file',
		label: id,
		filePath: `src/${id}.ts`,
		parentId: null,
		childCount: 0,
		isExpanded: false,
		...overrides
	};
}

function makeEdge(source: string, target: string): GraphEdge {
	return {
		id: `edge:${source}->${target}`,
		source,
		target,
		type: 'contains'
	};
}

describe('graphStore', () => {
	beforeEach(() => {
		graphStore.clear();
	});

	describe('initial state', () => {
		it('nodes is empty array', () => {
			expect(graphStore.nodes).toEqual([]);
		});

		it('edges is empty array', () => {
			expect(graphStore.edges).toEqual([]);
		});

		it('viewport is default', () => {
			expect(graphStore.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
		});

		it('expandedIds is empty set', () => {
			expect(graphStore.expandedIds.size).toBe(0);
		});

		it('utilityNodeIds is empty set', () => {
			expect(graphStore.utilityNodeIds.size).toBe(0);
		});

		it('showUtilityEdges is false', () => {
			expect(graphStore.showUtilityEdges).toBe(false);
		});

		it('selectedUtilityId is null', () => {
			expect(graphStore.selectedUtilityId).toBeNull();
		});

		it('focusedGroupId is null', () => {
			expect(graphStore.focusedGroupId).toBeNull();
		});
	});

	describe('setters', () => {
		it('sets nodes', () => {
			const nodes = [makeNode('a'), makeNode('b')];
			graphStore.nodes = nodes;
			expect(graphStore.nodes).toHaveLength(2);
			expect(graphStore.nodes[0].id).toBe('a');
		});

		it('sets edges', () => {
			const edges = [makeEdge('a', 'b')];
			graphStore.edges = edges;
			expect(graphStore.edges).toHaveLength(1);
		});

		it('sets viewport', () => {
			graphStore.viewport = { x: 100, y: 200, zoom: 2 };
			expect(graphStore.viewport).toEqual({ x: 100, y: 200, zoom: 2 });
		});

		it('sets utilityNodeIds', () => {
			graphStore.utilityNodeIds = new Set(['u1', 'u2']);
			expect(graphStore.utilityNodeIds.has('u1')).toBe(true);
			expect(graphStore.utilityNodeIds.has('u2')).toBe(true);
		});

		it('sets showUtilityEdges', () => {
			graphStore.showUtilityEdges = true;
			expect(graphStore.showUtilityEdges).toBe(true);
		});

		it('sets selectedUtilityId', () => {
			graphStore.selectedUtilityId = 'util1';
			expect(graphStore.selectedUtilityId).toBe('util1');
		});

		it('sets focusedGroupId', () => {
			graphStore.focusedGroupId = 'group1';
			expect(graphStore.focusedGroupId).toBe('group1');
		});
	});

	describe('toggleExpanded', () => {
		it('adds nodeId to expandedIds', () => {
			graphStore.toggleExpanded('n1');
			expect(graphStore.expandedIds.has('n1')).toBe(true);
		});

		it('removes nodeId from expandedIds if already present', () => {
			graphStore.toggleExpanded('n1');
			graphStore.toggleExpanded('n1');
			expect(graphStore.expandedIds.has('n1')).toBe(false);
		});

		it('handles multiple toggles on different nodes', () => {
			graphStore.toggleExpanded('n1');
			graphStore.toggleExpanded('n2');
			expect(graphStore.expandedIds.has('n1')).toBe(true);
			expect(graphStore.expandedIds.has('n2')).toBe(true);
			graphStore.toggleExpanded('n1');
			expect(graphStore.expandedIds.has('n1')).toBe(false);
			expect(graphStore.expandedIds.has('n2')).toBe(true);
		});
	});

	describe('expand', () => {
		it('adds nodeId to expandedIds', () => {
			graphStore.expand('n1');
			expect(graphStore.expandedIds.has('n1')).toBe(true);
		});

		it('is idempotent if already expanded', () => {
			graphStore.expand('n1');
			graphStore.expand('n1');
			expect(graphStore.expandedIds.has('n1')).toBe(true);
			expect(graphStore.expandedIds.size).toBe(1);
		});
	});

	describe('collapse', () => {
		it('removes nodeId from expandedIds', () => {
			graphStore.expand('n1');
			graphStore.collapse('n1');
			expect(graphStore.expandedIds.has('n1')).toBe(false);
		});

		it('is safe to call on non-expanded node', () => {
			graphStore.collapse('nonexistent');
			expect(graphStore.expandedIds.size).toBe(0);
		});
	});

	describe('clear', () => {
		it('resets all state to initial values', () => {
			graphStore.nodes = [makeNode('a')];
			graphStore.edges = [makeEdge('a', 'b')];
			graphStore.viewport = { x: 10, y: 20, zoom: 3 };
			graphStore.toggleExpanded('n1');
			graphStore.utilityNodeIds = new Set(['u1']);
			graphStore.showUtilityEdges = true;
			graphStore.selectedUtilityId = 'util1';
			graphStore.focusedGroupId = 'g1';

			graphStore.clear();

			expect(graphStore.nodes).toEqual([]);
			expect(graphStore.edges).toEqual([]);
			expect(graphStore.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
			expect(graphStore.expandedIds.size).toBe(0);
			expect(graphStore.utilityNodeIds.size).toBe(0);
			expect(graphStore.showUtilityEdges).toBe(false);
			expect(graphStore.selectedUtilityId).toBeNull();
			expect(graphStore.focusedGroupId).toBeNull();
		});
	});
});
