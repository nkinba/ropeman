<script lang="ts">
	import { semanticStore } from '$lib/stores/semanticStore.svelte';
	import { tabStore } from '$lib/stores/tabStore.svelte';
	import type { SemanticNode, SemanticLevel } from '$lib/types/semantic';

	interface TreeNode {
		id: string;
		label: string;
		color: string;
		fileCount: number;
		status: 'cached' | 'analyzing' | 'unanalyzed';
		children: TreeNode[];
		drilldownPath: { nodeId: string; label: string }[];
	}

	let expandedNodes = $state<Set<string>>(new Set());

	function buildTree(): TreeNode[] {
		const rootLevel = semanticStore.getCachedLevel('__root__');
		if (!rootLevel) return [];
		return rootLevel.nodes.map((node) => buildTreeNode(node, []));
	}

	function buildTreeNode(
		node: SemanticNode,
		parentPath: { nodeId: string; label: string }[]
	): TreeNode {
		const path = [...parentPath, { nodeId: node.id, label: node.label }];
		const cachedLevel = semanticStore.getCachedLevel(node.id);
		const isAnalyzing = semanticStore.isNodeAnalyzing(node.id);

		let status: TreeNode['status'] = 'unanalyzed';
		if (cachedLevel) status = 'cached';
		else if (isAnalyzing) status = 'analyzing';

		const children: TreeNode[] = cachedLevel
			? cachedLevel.nodes.map((child) => buildTreeNode(child, path))
			: [];

		return {
			id: node.id,
			label: node.label,
			color: node.color,
			fileCount: node.fileCount,
			drilldownPath: path,
			status,
			children
		};
	}

	const tree = $derived(buildTree());

	function toggleExpand(nodeId: string) {
		const next = new Set(expandedNodes);
		if (next.has(nodeId)) {
			next.delete(nodeId);
		} else {
			next.add(nodeId);
		}
		expandedNodes = next;
	}

	function handleNodeClick(node: TreeNode) {
		if (node.status === 'cached') {
			// Navigate to this level's diagram tab
			const pathWithoutLast = node.drilldownPath.slice(0, -1);
			const parentKey =
				pathWithoutLast.length > 0
					? pathWithoutLast[pathWithoutLast.length - 1].nodeId
					: '__root__';
			const level = semanticStore.getCachedLevel(parentKey);
			if (level) {
				semanticStore.currentLevel = level;
				semanticStore.drilldownPath = pathWithoutLast;
			}
			// Also open/focus diagram tab
			const tabLabel =
				pathWithoutLast.length > 0 ? pathWithoutLast[pathWithoutLast.length - 1].label : 'Project';
			tabStore.openDiagramTab(pathWithoutLast, tabLabel);

			// Select this node in the semantic store
			const semNode = level?.nodes.find((n) => n.id === node.id) ?? null;
			semanticStore.selectedSemanticNode = semNode;
		}
	}

	// Auto-expand nodes that have children
	$effect(() => {
		const next = new Set(expandedNodes);
		let changed = false;
		function autoExpand(nodes: TreeNode[]) {
			for (const node of nodes) {
				if (node.children.length > 0 && !next.has(node.id)) {
					next.add(node.id);
					changed = true;
				}
				autoExpand(node.children);
			}
		}
		autoExpand(tree);
		if (changed) expandedNodes = next;
	});

	const statusIcons: Record<string, string> = {
		cached: '\u2713',
		analyzing: '\u23F3',
		unanalyzed: '\u2014'
	};
</script>

<div class="semantic-tree">
	{#if tree.length === 0}
		<div class="empty-state">
			<span class="empty-text">No semantic analysis data</span>
		</div>
	{:else}
		{#each tree as node}
			{@render treeItem(node, 0)}
		{/each}
	{/if}
</div>

{#snippet treeItem(node: TreeNode, depth: number)}
	<div class="tree-row" style="padding-left: {12 + depth * 16}px;">
		{#if node.children.length > 0}
			<button
				class="tree-chevron"
				class:expanded={expandedNodes.has(node.id)}
				onclick={() => toggleExpand(node.id)}
			>
				&#9656;
			</button>
		{:else}
			<span class="tree-spacer"></span>
		{/if}
		<button
			class="tree-node"
			class:selected={semanticStore.selectedSemanticNode?.id === node.id}
			onclick={() => handleNodeClick(node)}
		>
			<span class="node-color" style="background: {node.color};"></span>
			<span class="node-label">{node.label}</span>
			<span
				class="node-status"
				class:cached={node.status === 'cached'}
				class:analyzing={node.status === 'analyzing'}
			>
				{statusIcons[node.status]}
			</span>
			<span class="node-count">{node.fileCount}</span>
		</button>
	</div>
	{#if expandedNodes.has(node.id) && node.children.length > 0}
		{#each node.children as child}
			{@render treeItem(child, depth + 1)}
		{/each}
	{/if}
{/snippet}

<style>
	.semantic-tree {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 4px 0;
	}

	.semantic-tree::-webkit-scrollbar {
		width: 6px;
	}

	.semantic-tree::-webkit-scrollbar-track {
		background: transparent;
	}

	.semantic-tree::-webkit-scrollbar-thumb {
		background: var(--border);
		border-radius: 3px;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100px;
	}

	.empty-text {
		font-size: 12px;
		color: var(--text-muted);
	}

	.tree-row {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.tree-chevron {
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		color: var(--text-muted);
		background: none;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		transition: transform 0.15s ease;
		padding: 0;
	}

	.tree-chevron.expanded {
		transform: rotate(90deg);
	}

	.tree-spacer {
		width: 16px;
		flex-shrink: 0;
	}

	.tree-node {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
		min-width: 0;
		padding: 3px 8px;
		border-radius: 4px;
		font-size: 12px;
		color: var(--text-secondary);
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background-color 0.1s ease;
	}

	.tree-node:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.tree-node.selected {
		background: var(--accent-bg, rgba(59, 130, 246, 0.12));
		color: var(--accent, #3b82f6);
	}

	.node-color {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.node-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.node-status {
		font-size: 10px;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.node-status.cached {
		color: #a6e3a1;
	}

	.node-status.analyzing {
		color: #f9e2af;
	}

	.node-count {
		font-size: 10px;
		color: var(--text-muted);
		flex-shrink: 0;
	}
</style>
