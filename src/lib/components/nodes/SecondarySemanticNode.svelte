<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';

	let { data } = $props();

	const targetHandleCount: number = data.targetHandleCount ?? 1;
	const sourceHandleCount: number = data.sourceHandleCount ?? 1;
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
	class="secondary-node"
	class:dimmed={data.dimmed}
	class:node-glow={data.glow}
	style="--node-color: {data.color};"
>
	<div class="accent-bar" style="background: {data.color};"></div>
	<h3 class="node-title">{data.label}</h3>
	{#if data.description}
		<p class="node-desc">{data.description}</p>
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
	.secondary-node {
		width: 224px;
		background: var(--bg-tertiary, #1b2028);
		border: 1px solid var(--ghost-border);
		border-radius: 8px;
		padding: 12px;
		cursor: pointer;
		position: relative;
		transition: background 0.15s ease;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.accent-bar {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 4px;
		border-radius: 8px 0 0 8px;
	}

	.secondary-node:hover {
		background: var(--bg-highest, #20262f);
	}

	.secondary-node.dimmed {
		opacity: 0.4;
		filter: grayscale(0.3);
		transition:
			opacity 0.3s ease,
			filter 0.3s ease;
	}

	.secondary-node.node-glow {
		filter: drop-shadow(0 0 8px rgba(83, 221, 252, 0.2));
	}

	/* Handles — hidden by default, visible on hover */
	.secondary-node :global(.svelte-flow__handle) {
		width: 6px;
		height: 6px;
		background: var(--accent-secondary, #53ddfc);
		border: none;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.secondary-node:hover :global(.svelte-flow__handle) {
		opacity: 1;
	}

	.node-title {
		font-family: var(--font-display, 'Space Grotesk', sans-serif);
		font-size: 12px;
		font-weight: 500;
		text-transform: uppercase;
		color: var(--text-primary, #e2e8f0);
		line-height: 1.2;
		margin: 0;
	}

	.node-desc {
		font-family: var(--font-body, 'Inter', sans-serif);
		font-size: 10px;
		color: var(--text-muted, #72757d);
		line-height: 1.4;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
