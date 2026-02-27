<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';

	let { data } = $props();
</script>

<div class="directory-node">
	<Handle type="target" position={Position.Top} />

	<div class="node-content">
		<span class="folder-icon">&#128193;</span>
		<span class="label">{data.label}</span>
		{#if data.childCount > 0}
			<span class="badge">{data.childCount}</span>
		{/if}
	</div>

	<Handle type="source" position={Position.Bottom} />
</div>

<style>
	.directory-node {
		background: #fef9c3;
		border: 2px solid #ca8a04;
		border-radius: 8px;
		padding: 8px 14px;
		min-width: 140px;
		font-size: 13px;
		font-weight: 600;
		color: #713f12;
		cursor: pointer;
		transition: box-shadow 0.15s ease, border-color 0.15s ease;
	}

	.directory-node:hover {
		box-shadow: 0 2px 8px rgba(202, 138, 4, 0.3);
		border-color: #a16207;
	}

	.node-content {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.folder-icon {
		font-size: 16px;
		flex-shrink: 0;
	}

	.label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.badge {
		background: #ca8a04;
		color: white;
		font-size: 10px;
		font-weight: 700;
		padding: 1px 6px;
		border-radius: 10px;
		flex-shrink: 0;
	}
</style>
