<script lang="ts">
	import { semanticStore } from '$lib/stores/semanticStore.svelte';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import type { GraphNode } from '$lib/types/graph';

	const node = $derived(semanticStore.selectedSemanticNode);

	function handleFileClick(filePath: string) {
		const fileName = filePath.split('/').pop() ?? filePath;
		const syntheticNode: GraphNode = {
			id: `file:${filePath}`,
			kind: 'file',
			label: fileName,
			filePath,
			parentId: null,
			childCount: 0,
			isExpanded: false,
		};
		selectionStore.selectedNode = syntheticNode;
		selectionStore.breadcrumb = [syntheticNode];
		semanticStore.viewMode = 'code';
	}

	function handleClose() {
		semanticStore.selectedSemanticNode = null;
	}
</script>

{#if node}
<div class="semantic-detail-panel">
	<div class="panel-header">
		<span class="panel-label" style="color: {node.color};">{node.label}</span>
		<button class="panel-close" onclick={handleClose} title="Close">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"/>
				<line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
		</button>
	</div>

	{#if node.description}
		<div class="panel-section">
			<div class="section-title">Description</div>
			<p class="panel-description">{node.description}</p>
		</div>
	{/if}

	{#if node.filePaths.length > 0}
		<div class="panel-section">
			<div class="section-title">Files <span class="file-count">{node.fileCount}</span></div>
			<div class="file-list">
				{#each node.filePaths as fp}
					<button class="file-item" onclick={() => handleFileClick(fp)}>
						<span class="file-icon">&#128196;</span>
						<span class="file-path">{fp}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if node.keySymbols.length > 0}
		<div class="panel-section">
			<div class="section-title">Key Symbols</div>
			<div class="symbol-tags">
				{#each node.keySymbols as sym}
					<span class="symbol-tag">{sym}</span>
				{/each}
			</div>
		</div>
	{/if}
</div>
{/if}

<style>
	.semantic-detail-panel {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary);
		overflow-y: auto;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.panel-label {
		font-size: 16px;
		font-weight: 700;
		line-height: 1.3;
		flex: 1;
		min-width: 0;
		word-break: break-word;
	}

	.panel-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 4px;
		color: var(--text-muted);
		cursor: pointer;
		flex-shrink: 0;
		transition: background-color 0.15s ease;
	}

	.panel-close:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.panel-section {
		padding: 12px 16px;
		border-bottom: 1px solid var(--border);
	}

	.section-title {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-muted);
		margin-bottom: 8px;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.file-count {
		font-size: 10px;
		font-weight: 600;
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		padding: 1px 6px;
		border-radius: 8px;
	}

	.panel-description {
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0;
	}

	.file-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 8px;
		font-size: 12px;
		color: var(--text-secondary);
		cursor: pointer;
		border: none;
		background: none;
		text-align: left;
		border-radius: 4px;
		transition: background-color 0.1s ease;
		width: 100%;
	}

	.file-item:hover {
		background: var(--bg-tertiary);
		color: var(--accent, #3b82f6);
	}

	.file-icon {
		font-size: 12px;
		flex-shrink: 0;
	}

	.file-path {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-mono, monospace);
		flex: 1;
		min-width: 0;
	}

	.symbol-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.symbol-tag {
		font-size: 11px;
		font-family: var(--font-mono, monospace);
		color: var(--text-secondary);
		background: var(--bg-tertiary, rgba(255,255,255,0.06));
		padding: 3px 8px;
		border-radius: 4px;
	}
</style>
