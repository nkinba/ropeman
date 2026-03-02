<script lang="ts">
	import {
		SvelteFlow,
		MiniMap,
		Controls,
		Background,
		type Node,
		type Edge
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import { semanticStore } from '$lib/stores/semanticStore.svelte';
	import { toSemanticFlowNodes, toSemanticFlowEdges } from '$lib/services/semanticGraphBuilder';
	import { analyzeDrilldown } from '$lib/services/semanticAnalysisService';

	import SemanticNodeComponent from './nodes/SemanticNode.svelte';

	const nodeTypes = {
		semanticNode: SemanticNodeComponent
	};

	// Use $state.raw to prevent SvelteFlow's internal mutations (fitView, drag)
	// from triggering our effects through deep reactivity
	let flowNodes = $state.raw<Node[]>([]);
	let flowEdges = $state.raw<Edge[]>([]);

	// Effect: Semantic view — render from semanticStore.currentLevel
	$effect(() => {
		if (semanticStore.viewMode !== 'semantic') {
			flowNodes = [];
			flowEdges = [];
			return;
		}

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
	}

	function handleNodeDblClick(node: Node) {
		// Semantic node double-click → drill-down (or switch to code view for leaf nodes)
		if (node.type === 'semanticNode') {
			const semNode = semanticStore.currentLevel?.nodes.find(n => n.id === node.id);
			if (semNode) {
				// Leaf node (1 file): switch to code view with that file selected
				if (semNode.fileCount === 1) {
					semanticStore.selectedSemanticNode = semNode;
					semanticStore.viewMode = 'code';
					return;
				}

				const wasCached = semanticStore.drillDown(semNode);
				if (!wasCached) {
					analyzeDrilldown(semNode);
				}
			}
			return;
		}
	}

	function handlePaneClick(_: { event: MouseEvent }) {
		selectionStore.clear();
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
	</SvelteFlow>

	{#if semanticStore.isAnalyzing}
		<div class="analyzing-overlay">
			<div class="analyzing-spinner"></div>
			<span class="analyzing-text">Analyzing...</span>
		</div>
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

	/* Hide connection handles on semantic nodes */
	.zui-canvas :global(.svelte-flow__node-semanticNode .svelte-flow__handle) {
		width: 0;
		height: 0;
		min-width: 0;
		min-height: 0;
		border: none;
		background: transparent;
		opacity: 0;
		pointer-events: none;
	}

	/* Style edge labels for dark theme */
	.zui-canvas :global(.svelte-flow__edge-label) {
		background: var(--bg-secondary);
		color: var(--text-secondary);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 2px 6px;
		font-size: 9px;
		font-weight: 500;
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

</style>
