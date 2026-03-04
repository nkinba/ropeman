import { describe, it, expect, beforeEach } from 'vitest';
import { selectionStore } from './selectionStore.svelte';
import { graphStore } from './graphStore.svelte';
import type { GraphNode } from '$lib/types/graph';

function makeNode(id: string, parentId: string | null = null): GraphNode {
	return {
		id,
		kind: 'file',
		label: id,
		filePath: `src/${id}.ts`,
		parentId,
		childCount: 0,
		isExpanded: false
	};
}

describe('selectionStore', () => {
	beforeEach(() => {
		selectionStore.clear();
		graphStore.clear();
	});

	describe('initial state', () => {
		it('selectedNode is null', () => {
			expect(selectionStore.selectedNode).toBeNull();
		});

		it('hoveredNode is null', () => {
			expect(selectionStore.hoveredNode).toBeNull();
		});

		it('breadcrumb is empty array', () => {
			expect(selectionStore.breadcrumb).toEqual([]);
		});
	});

	describe('setters', () => {
		it('sets selectedNode', () => {
			const node = makeNode('n1');
			selectionStore.selectedNode = node;
			expect(selectionStore.selectedNode).toEqual(node);
		});

		it('sets selectedNode to null', () => {
			selectionStore.selectedNode = makeNode('n1');
			selectionStore.selectedNode = null;
			expect(selectionStore.selectedNode).toBeNull();
		});

		it('sets hoveredNode', () => {
			const node = makeNode('n1');
			selectionStore.hoveredNode = node;
			expect(selectionStore.hoveredNode).toEqual(node);
		});

		it('sets breadcrumb directly', () => {
			const nodes = [makeNode('a'), makeNode('b')];
			selectionStore.breadcrumb = nodes;
			expect(selectionStore.breadcrumb).toHaveLength(2);
		});
	});

	describe('select', () => {
		it('sets selectedNode and builds breadcrumb for root node', () => {
			const root = makeNode('root');
			graphStore.nodes = [root];

			selectionStore.select(root);

			expect(selectionStore.selectedNode).toEqual(root);
			expect(selectionStore.breadcrumb).toHaveLength(1);
			expect(selectionStore.breadcrumb[0].id).toBe('root');
		});

		it('builds breadcrumb with parent chain', () => {
			const root = makeNode('root');
			const child = makeNode('child', 'root');
			const grandchild = makeNode('grandchild', 'child');
			graphStore.nodes = [root, child, grandchild];

			selectionStore.select(grandchild);

			expect(selectionStore.breadcrumb).toHaveLength(3);
			expect(selectionStore.breadcrumb[0].id).toBe('root');
			expect(selectionStore.breadcrumb[1].id).toBe('child');
			expect(selectionStore.breadcrumb[2].id).toBe('grandchild');
		});

		it('builds breadcrumb for node with no parent in graphStore', () => {
			const orphan = makeNode('orphan');
			graphStore.nodes = [];

			selectionStore.select(orphan);

			expect(selectionStore.breadcrumb).toHaveLength(1);
			expect(selectionStore.breadcrumb[0].id).toBe('orphan');
		});
	});

	describe('clear', () => {
		it('resets all state', () => {
			selectionStore.selectedNode = makeNode('n1');
			selectionStore.hoveredNode = makeNode('n2');
			selectionStore.breadcrumb = [makeNode('a')];

			selectionStore.clear();

			expect(selectionStore.selectedNode).toBeNull();
			expect(selectionStore.hoveredNode).toBeNull();
			expect(selectionStore.breadcrumb).toEqual([]);
		});
	});
});
