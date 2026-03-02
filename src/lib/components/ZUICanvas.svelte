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
	import { t } from '$lib/stores/i18nStore';
	import { toSemanticFlowNodes, toSemanticFlowEdges } from '$lib/services/semanticGraphBuilder';
	import { analyzeDrilldown } from '$lib/services/semanticAnalysisService';

	import SemanticNodeComponent from './nodes/SemanticNode.svelte';

	const nodeTypes = {
		semanticNode: SemanticNodeComponent
	};

	const EDGE_TYPE_INFO: { type: string; i18nKey: string; color: string }[] = [
		{ type: 'depends_on', i18nKey: 'legend.depends_on', color: '#94a3b8' },
		{ type: 'calls', i18nKey: 'legend.calls', color: '#3b82f6' },
		{ type: 'extends', i18nKey: 'legend.extends', color: '#a855f7' },
		{ type: 'uses', i18nKey: 'legend.uses', color: '#22c55e' },
	];

	// Use $state.raw to prevent SvelteFlow's internal mutations (fitView, drag)
	// from triggering our effects through deep reactivity
	let flowNodes = $state.raw<Node[]>([]);
	let flowEdges = $state.raw<Edge[]>([]);
	let allEdges = $state.raw<Edge[]>([]);

	let legendOpen = $state(false);
	let hiddenEdgeTypes = $state<Set<string>>(new Set());

	// Effect: Semantic view — render from semanticStore.currentLevel
	$effect(() => {
		if (semanticStore.viewMode !== 'semantic') {
			flowNodes = [];
			flowEdges = [];
			allEdges = [];
			return;
		}

		const level = semanticStore.currentLevel;
		if (!level) {
			flowNodes = [];
			flowEdges = [];
			allEdges = [];
			return;
		}

		// Determine which node should be highlighted based on file selection
		const highlightedNodeId = semanticStore.selectedSemanticNode?.id ?? null;
		const nodes = toSemanticFlowNodes(level);
		for (const n of nodes) {
			if (highlightedNodeId) {
				if (n.id === highlightedNodeId) {
					n.data = { ...n.data, highlighted: true, dimmed: false };
				} else {
					n.data = { ...n.data, highlighted: false, dimmed: true };
				}
			} else {
				n.data = { ...n.data, highlighted: false, dimmed: false };
			}
		}

		flowNodes = nodes;
		allEdges = toSemanticFlowEdges(level);
	});

	// Filter edges based on hidden edge types
	$effect(() => {
		if (hiddenEdgeTypes.size === 0) {
			flowEdges = allEdges;
		} else {
			flowEdges = allEdges.filter(e => !hiddenEdgeTypes.has(e.data?.edgeType as string));
		}
	});

	function toggleEdgeType(type: string) {
		const next = new Set(hiddenEdgeTypes);
		if (next.has(type)) {
			next.delete(type);
		} else {
			next.add(type);
		}
		hiddenEdgeTypes = next;
	}

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
			<span class="analyzing-text">{$t('analyzing')}</span>
		</div>
	{/if}

	{#if semanticStore.viewMode === 'semantic' && semanticStore.currentLevel}
		<div class="legend-container">
			<button class="legend-toggle" onclick={() => legendOpen = !legendOpen} title={$t('legend.title')}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="7" height="7"/>
					<rect x="14" y="3" width="7" height="7"/>
					<rect x="3" y="14" width="7" height="7"/>
					<rect x="14" y="14" width="7" height="7"/>
				</svg>
			</button>
			{#if legendOpen}
				<div class="legend-panel">
					<div class="legend-header">{$t('legend.title')}</div>
					{#each EDGE_TYPE_INFO as info}
						<label class="legend-item">
							<input
								type="checkbox"
								checked={!hiddenEdgeTypes.has(info.type)}
								onchange={() => toggleEdgeType(info.type)}
							/>
							<span class="legend-color" style="background: {info.color};"></span>
							<span class="legend-label">{$t(info.i18nKey)}</span>
						</label>
					{/each}
				</div>
			{/if}
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

	/* Legend */
	.legend-container {
		position: absolute;
		bottom: 12px;
		left: 12px;
		z-index: 5;
	}

	.legend-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 6px;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		color: var(--text-secondary);
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.legend-toggle:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.legend-panel {
		position: absolute;
		bottom: 44px;
		left: 0;
		min-width: 160px;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 8px 0;
		box-shadow: 0 4px 16px rgba(0,0,0,0.2);
		animation: legendSlideUp 0.15s ease;
	}

	@keyframes legendSlideUp {
		from { opacity: 0; transform: translateY(4px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.legend-header {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-muted);
		padding: 4px 12px 8px;
		border-bottom: 1px solid var(--border);
		margin-bottom: 4px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		cursor: pointer;
		font-size: 12px;
		color: var(--text-secondary);
		transition: background-color 0.1s ease;
	}

	.legend-item:hover {
		background: var(--bg-tertiary);
	}

	.legend-item input[type="checkbox"] {
		width: 14px;
		height: 14px;
		cursor: pointer;
		accent-color: var(--accent, #3b82f6);
	}

	.legend-color {
		width: 16px;
		height: 3px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.legend-label {
		flex: 1;
		min-width: 0;
	}
</style>
