<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';

	let { data } = $props();

	const maxSymbols = 4;
	const displaySymbols = data.keySymbols?.slice(0, maxSymbols) ?? [];
	const moreCount = (data.keySymbols?.length ?? 0) - maxSymbols;
	const isLeaf = data.fileCount === 1;
	const isCached: boolean = data.isCached ?? false;

	const targetHandleCount: number = data.targetHandleCount ?? 1;
	const sourceHandleCount: number = data.sourceHandleCount ?? 1;

	function handleReanalyze(e: MouseEvent) {
		e.stopPropagation();
		data.onReanalyze?.(data.nodeId);
	}
</script>

{#each Array(targetHandleCount) as _, i}
	<Handle
		type="target"
		position={Position.Left}
		id="target-{i}"
		style="top: {((i + 1) / (targetHandleCount + 1)) * 100}%;"
	/>
{/each}

<div
	class="semantic-node"
	class:highlighted={data.highlighted}
	class:dimmed={data.dimmed}
	style="
		background: {data.color}15;
		border-color: {data.color}60;
	"
>
	<div class="node-header">
		<span class="node-label" style="color: {data.color};">{data.label}</span>
		<span class="node-badge" style="background: {data.color}30; color: {data.color};">
			{#if isLeaf}&#128196;
			{/if}{data.fileCount}
			{data.fileCount === 1 ? 'file' : 'files'}
		</span>
	</div>

	{#if data.description}
		<p class="node-description">{data.description}</p>
	{/if}

	{#if displaySymbols.length > 0}
		<div class="node-symbols">
			{#each displaySymbols as sym}
				<span class="symbol-tag">{sym}</span>
			{/each}
			{#if moreCount > 0}
				<span class="symbol-more">+{moreCount}</span>
			{/if}
		</div>
	{/if}

	{#if !isLeaf}
		<div class="drilldown-hint">
			{#if isCached}
				<button
					class="reanalyze-btn"
					title="Re-analyze"
					onclick={handleReanalyze}
				>
					&#x21BB;
				</button>
			{/if}
			<span class="drilldown-icon">&#x25B6;</span>
		</div>
	{/if}
</div>

{#each Array(sourceHandleCount) as _, i}
	<Handle
		type="source"
		position={Position.Right}
		id="source-{i}"
		style="top: {((i + 1) / (sourceHandleCount + 1)) * 100}%;"
	/>
{/each}

<style>
	.semantic-node {
		width: 280px;
		min-height: 120px;
		border: 2px solid;
		border-radius: 12px;
		padding: 16px;
		cursor: pointer;
		position: relative;
		transition:
			box-shadow 0.2s ease,
			transform 0.15s ease;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.semantic-node:hover {
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		transform: translateY(-1px);
	}

	.semantic-node.highlighted {
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.5),
			0 0 16px rgba(59, 130, 246, 0.3),
			0 4px 20px rgba(0, 0, 0, 0.3);
		opacity: 0.95;
		transform: scale(1.03);
		animation: pulse 2s ease-in-out infinite;
	}

	.semantic-node.dimmed {
		opacity: 0.4;
		filter: grayscale(0.3);
		transition:
			opacity 0.3s ease,
			filter 0.3s ease;
	}

	@keyframes pulse {
		0%,
		100% {
			box-shadow:
				0 0 0 3px rgba(59, 130, 246, 0.5),
				0 0 16px rgba(59, 130, 246, 0.3),
				0 4px 20px rgba(0, 0, 0, 0.3);
		}
		50% {
			box-shadow:
				0 0 0 4px rgba(59, 130, 246, 0.6),
				0 0 24px rgba(59, 130, 246, 0.4),
				0 4px 20px rgba(0, 0, 0, 0.3);
		}
	}

	.node-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.node-label {
		font-size: 14px;
		font-weight: 700;
		line-height: 1.2;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.node-badge {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 10px;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.node-description {
		font-size: 11px;
		color: var(--text-secondary);
		line-height: 1.4;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.node-symbols {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.symbol-tag {
		font-size: 10px;
		font-family: var(--font-mono, monospace);
		color: var(--text-secondary);
		background: var(--bg-tertiary, rgba(255, 255, 255, 0.06));
		padding: 1px 6px;
		border-radius: 4px;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.symbol-more {
		font-size: 10px;
		color: var(--text-muted);
	}

	.drilldown-hint {
		position: absolute;
		bottom: 8px;
		right: 12px;
		opacity: 0.3;
		transition: opacity 0.15s ease;
	}

	.semantic-node:hover .drilldown-hint {
		opacity: 0.7;
	}

	.drilldown-icon {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.reanalyze-btn {
		display: none;
		width: 20px;
		height: 20px;
		border: none;
		border-radius: 4px;
		background: var(--bg-tertiary, rgba(255, 255, 255, 0.08));
		color: var(--text-secondary);
		font-size: 14px;
		cursor: pointer;
		padding: 0;
		line-height: 1;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.semantic-node:hover .reanalyze-btn {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.reanalyze-btn:hover {
		background: var(--accent-bg, rgba(59, 130, 246, 0.15));
		color: var(--accent, #3b82f6);
	}
</style>
