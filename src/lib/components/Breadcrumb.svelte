<script lang="ts">
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import { graphStore } from '$lib/stores/graphStore.svelte';
	import { architectureStore } from '$lib/stores/architectureStore.svelte';
	import { semanticStore } from '$lib/stores/semanticStore.svelte';
	import type { GraphNode } from '$lib/types/graph';

	const kindIcons: Record<string, string> = {
		directory: '\uD83D\uDCC1',
		file: '\uD83D\uDCC4',
		function: 'f\u2099',
		class: '\u25C7',
		method: '\u2192',
		import: '\u21E5',
	};

	let focusedGroup = $derived(
		graphStore.focusedGroupId
			? architectureStore.groups.find(g => `arch-group:${g.name}` === graphStore.focusedGroupId)
			: null
	);

	const isSemanticView = $derived(semanticStore.viewMode === 'semantic');
	const semanticPath = $derived(semanticStore.drilldownPath);

	function handleCrumbClick(node: GraphNode) {
		selectionStore.select(node);
	}

	function handleGroupRootClick() {
		graphStore.focusedGroupId = null;
	}

	function handleSemanticRootClick() {
		semanticStore.goToLevel(-1);
	}

	function handleSemanticCrumbClick(index: number) {
		semanticStore.goToLevel(index);
	}
</script>

{#if isSemanticView && (semanticStore.currentLevel !== null)}
	<nav class="breadcrumb-bar">
		<button
			class="crumb group-crumb"
			class:active={semanticPath.length === 0}
			onclick={handleSemanticRootClick}
		>
			<span class="crumb-icon">&#9673;</span>
			<span class="crumb-label">Project</span>
		</button>

		{#each semanticPath as crumb, i}
			<span class="separator">&rsaquo;</span>
			<button
				class="crumb"
				class:active={i === semanticPath.length - 1}
				onclick={() => handleSemanticCrumbClick(i)}
			>
				<span class="crumb-label">{crumb.label}</span>
			</button>
		{/each}
	</nav>
{:else if focusedGroup || selectionStore.breadcrumb.length > 0}
	<nav class="breadcrumb-bar">
		{#if focusedGroup}
			<button class="crumb group-crumb" onclick={handleGroupRootClick}>
				<span class="crumb-icon" style="color: {focusedGroup.color};">&#9632;</span>
				<span class="crumb-label">{focusedGroup.name}</span>
			</button>
		{/if}

		{#each selectionStore.breadcrumb as crumb, i}
			{#if i > 0 || focusedGroup}
				<span class="separator">&rsaquo;</span>
			{/if}
			<button
				class="crumb"
				class:active={i === selectionStore.breadcrumb.length - 1}
				onclick={() => handleCrumbClick(crumb)}
			>
				<span class="crumb-icon">{kindIcons[crumb.kind] ?? ''}</span>
				<span class="crumb-label">{crumb.label}</span>
			</button>
		{/each}
	</nav>
{/if}

<style>
	.breadcrumb-bar {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px 20px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border);
		overflow-x: auto;
		flex-shrink: 0;
		min-height: 32px;
	}

	.breadcrumb-bar::-webkit-scrollbar {
		height: 0;
	}

	.separator {
		color: var(--text-muted);
		font-size: 14px;
		margin: 0 2px;
		user-select: none;
	}

	.crumb {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 12px;
		color: var(--text-secondary);
		white-space: nowrap;
		transition: background-color var(--transition), color var(--transition);
	}

	.crumb:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.crumb.active {
		color: var(--accent);
		font-weight: 600;
	}

	.group-crumb {
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.3px;
		font-size: 11px;
	}

	.crumb-icon {
		font-size: 11px;
	}

	.crumb-label {
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
