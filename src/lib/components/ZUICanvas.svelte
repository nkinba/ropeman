<script lang="ts">
	import { untrack } from 'svelte';
	import {
		SvelteFlow,
		MiniMap,
		Controls,
		Background,
		type Node,
		type Edge
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import { graphStore } from '$lib/stores/graphStore.svelte';
	import { projectStore } from '$lib/stores/projectStore.svelte';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import { architectureStore } from '$lib/stores/architectureStore.svelte';
	import { semanticStore } from '$lib/stores/semanticStore.svelte';
	import { buildGraph, toFlowNodes, toFlowEdges, applyGroupLayout } from '$lib/services/graphBuilder';
	import { toSemanticFlowNodes, toSemanticFlowEdges } from '$lib/services/semanticGraphBuilder';
	import { analyzeDrilldown } from '$lib/services/semanticAnalysisService';

	import DirectoryNode from './nodes/DirectoryNode.svelte';
	import FileNodeComponent from './nodes/FileNode.svelte';
	import SymbolNode from './nodes/SymbolNode.svelte';
	import ArchitectureGroupNode from './nodes/ArchitectureGroupNode.svelte';
	import SemanticNodeComponent from './nodes/SemanticNode.svelte';
	import ZUIGroupController from './ZUIGroupController.svelte';

	const nodeTypes = {
		directory: DirectoryNode,
		file: FileNodeComponent,
		symbol: SymbolNode,
		architectureGroup: ArchitectureGroupNode,
		semanticNode: SemanticNodeComponent
	};

	// Use $state.raw to prevent SvelteFlow's internal mutations (fitView, drag)
	// from triggering our effects through deep reactivity
	let flowNodes = $state.raw<Node[]>([]);
	let flowEdges = $state.raw<Edge[]>([]);
	let baseFlowNodes = $state.raw<Node[]>([]);

	function doRebuild(fileTree: any, astMap: Map<string, any>) {
		const { nodes, edges, utilityNodeIds } = buildGraph(fileTree, astMap);
		graphStore.nodes = nodes;
		graphStore.edges = edges;
		graphStore.utilityNodeIds = utilityNodeIds;

		// Only set baseFlowNodes here — flowEdges and flowNodes are derived by Effects 2 & 3
		baseFlowNodes = toFlowNodes(nodes) as Node[];
	}

	// Effect 1a: Semantic view — render from semanticStore.currentLevel
	$effect(() => {
		if (semanticStore.viewMode !== 'semantic') return;

		const level = semanticStore.currentLevel;
		if (!level) {
			flowNodes = [];
			flowEdges = [];
			return;
		}

		// Determine which node should be highlighted based on file selection
		const highlightedNodeId = semanticStore.selectedSemanticNode?.id ?? null;
		const nodes = toSemanticFlowNodes(level);
		if (highlightedNodeId) {
			for (const n of nodes) {
				if (n.id === highlightedNodeId) {
					n.data = { ...n.data, highlighted: true };
				}
			}
		}

		flowNodes = nodes;
		flowEdges = toSemanticFlowEdges(level);
	});

	// Effect 1b: Rebuild graph when project data changes (filetree mode).
	$effect(() => {
		if (semanticStore.viewMode === 'semantic') return;

		const fileTree = projectStore.fileTree;
		const astMap = projectStore.astMap;
		const isLoading = projectStore.isLoading;

		if (!fileTree) {
			untrack(() => graphStore.clear());
			flowNodes = [];
			flowEdges = [];
			baseFlowNodes = [];
			return;
		}

		if (isLoading) {
			const timer = setTimeout(() => doRebuild(fileTree, astMap), 300);
			return () => clearTimeout(timer);
		} else {
			doRebuild(fileTree, astMap);
		}
	});

	// Effect 2: Edge highlighting based on selected node + utility edge hiding (filetree mode only)
	// Sole writer of flowEdges in filetree mode.
	$effect(() => {
		if (semanticStore.viewMode === 'semantic') return;
		const selectedId = selectionStore.selectedNode?.id ?? null;
		const utilIds = graphStore.utilityNodeIds;
		const showUtil = graphStore.showUtilityEdges;
		const activeUtilId = graphStore.selectedUtilityId;
		const rawEdges = toFlowEdges(graphStore.edges) as Edge[];

		flowEdges = rawEdges.map(edge => {
			if (edge.data?.edgeType !== 'imports') return edge;

			const srcIsUtil = utilIds.has(edge.source);
			const tgtIsUtil = utilIds.has(edge.target);
			const touchesUtil = srcIsUtil || tgtIsUtil;

			// Utility edge hiding logic
			if (touchesUtil && !showUtil) {
				if (activeUtilId && (edge.source === activeUtilId || edge.target === activeUtilId)) {
					return {
						...edge,
						animated: true,
						style: 'stroke:#f59e0b;stroke-width:2.5px;opacity:1;'
					};
				}
				return { ...edge, hidden: true };
			}

			if (!selectedId) return { ...edge, animated: false, style: 'stroke:#3b82f6;stroke-width:1px;opacity:0.15;' };
			const connected = edge.source === selectedId || edge.target === selectedId;
			return {
				...edge,
				animated: connected,
				style: connected
					? 'stroke:#3b82f6;stroke-width:2.5px;opacity:1;'
					: 'stroke:#3b82f6;stroke-width:1px;opacity:0.05;'
			};
		});
	});

	// Effect 3: Apply group layout when architecture groups or base nodes change (filetree mode only).
	// Sole writer of flowNodes in filetree mode. Reads flowEdges via untrack to avoid re-triggering
	// from Effect 2's edge highlighting (group layout only needs edge topology, not styles).
	$effect(() => {
		if (semanticStore.viewMode === 'semantic') return;
		const groups = architectureStore.groups;
		const enabled = architectureStore.enabled;
		const base = baseFlowNodes;

		if (enabled && groups.length > 0 && base.length > 0) {
			const edges = untrack(() => flowEdges);
			flowNodes = applyGroupLayout(base, edges, groups);
		} else if (base.length > 0) {
			flowNodes = base;
		}
	});

	// Double-click detection via two rapid single clicks
	let lastClickId = '';
	let lastClickTime = 0;
	const DBLCLICK_MS = 400;

	function handleNodeClick({ node }: { node: Node; event: MouseEvent | TouchEvent }) {
		const now = Date.now();

		if (node.id === lastClickId && now - lastClickTime < DBLCLICK_MS) {
			lastClickId = '';
			lastClickTime = 0;
			handleNodeDblClick(node);
			return;
		}

		lastClickId = node.id;
		lastClickTime = now;

		// Semantic node click → select in semanticStore
		if (node.type === 'semanticNode') {
			const semNode = semanticStore.currentLevel?.nodes.find(n => n.id === node.id) ?? null;
			semanticStore.selectedSemanticNode = semNode;
			return;
		}

		// Don't select group nodes in the graph store
		if (node.type === 'architectureGroup') return;

		const graphNode = graphStore.nodes.find((n) => n.id === node.id);
		if (graphNode) {
			selectionStore.select(graphNode);

			// Utility node click-to-reveal toggle
			if (graphStore.utilityNodeIds.has(node.id)) {
				graphStore.selectedUtilityId =
					graphStore.selectedUtilityId === node.id ? null : node.id;
			} else {
				graphStore.selectedUtilityId = null;
			}
		}
	}

	function handleNodeDblClick(node: Node) {
		// Semantic node double-click → drill-down
		if (node.type === 'semanticNode') {
			const semNode = semanticStore.currentLevel?.nodes.find(n => n.id === node.id);
			if (semNode) {
				const wasCached = semanticStore.drillDown(semNode);
				if (!wasCached) {
					// Need AI analysis for this level
					analyzeDrilldown(semNode);
				}
			}
			return;
		}

		// F-2.3: Double-click on group node → drill-down zoom
		if (node.type === 'architectureGroup') {
			graphStore.focusedGroupId = node.id;
			return;
		}

		// Existing expand/collapse for directory/file nodes
		const graphNode = graphStore.nodes.find((n) => n.id === node.id);
		if (!graphNode) return;

		if (graphNode.kind === 'directory' || graphNode.kind === 'file') {
			graphStore.toggleExpanded(graphNode.id);
		}
	}

	function handlePaneClick(_: { event: MouseEvent }) {
		selectionStore.clear();
		graphStore.selectedUtilityId = null;
		semanticStore.selectedSemanticNode = null;
	}
</script>

<div class="zui-canvas">
	<SvelteFlow
		nodes={flowNodes}
		edges={flowEdges}
		{nodeTypes}
		fitView
		minZoom={0.05}
		maxZoom={4}
		onnodeclick={handleNodeClick}
		onpaneclick={handlePaneClick}
		proOptions={{ hideAttribution: true }}
	>
		<Controls />
		<MiniMap />
		<Background gap={20} size={1} />
		<ZUIGroupController />
	</SvelteFlow>

	{#if semanticStore.isAnalyzing}
		<div class="analyzing-overlay">
			<div class="analyzing-spinner"></div>
			<span class="analyzing-text">Analyzing...</span>
		</div>
	{/if}

	{#if graphStore.focusedGroupId}
		{@const group = architectureStore.groups.find(g => `arch-group:${g.name}` === graphStore.focusedGroupId)}
		<button
			class="zoom-out-btn"
			onclick={() => graphStore.focusedGroupId = null}
			title="Zoom out to all groups (Esc)"
		>
			<span class="zoom-out-icon">&larr;</span>
			{#if group}
				<span class="zoom-out-label">{group.name}</span>
			{/if}
		</button>
	{/if}
</div>

<style>
	.zui-canvas {
		width: 100%;
		height: 100%;
		position: relative;
	}

	.zui-canvas :global(.svelte-flow) {
		background: var(--bg-primary);
	}

	.zui-canvas :global(.svelte-flow__minimap) {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 4px;
	}

	.zui-canvas :global(.svelte-flow__controls) {
		border: 1px solid var(--border);
		border-radius: 4px;
		overflow: hidden;
	}

	.zui-canvas :global(.svelte-flow__controls button) {
		background: var(--bg-primary);
		color: var(--text-primary);
		border-bottom: 1px solid var(--border);
	}

	.zui-canvas :global(.svelte-flow__controls button:hover) {
		background: var(--bg-secondary);
	}

	.analyzing-overlay {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 24px;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 8px;
		z-index: 10;
		box-shadow: 0 4px 12px rgba(0,0,0,0.2);
	}

	.analyzing-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--text-muted);
		border-top-color: var(--accent, #3b82f6);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.analyzing-text {
		font-size: 13px;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.zoom-out-btn {
		position: absolute;
		top: 12px;
		left: 12px;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 12px;
		cursor: pointer;
		z-index: 10;
		transition: background-color 0.15s ease;
	}

	.zoom-out-btn:hover {
		background: var(--bg-tertiary);
	}

	.zoom-out-icon {
		font-size: 14px;
	}

	.zoom-out-label {
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}
</style>
