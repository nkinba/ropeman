<script lang="ts">
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import { semanticStore } from '$lib/stores/semanticStore.svelte';
	import { tabStore } from '$lib/stores/tabStore.svelte';
	import { projectStore } from '$lib/stores/projectStore.svelte';
	import type { FileNode } from '$lib/types/fileTree';
	import type { SemanticNode } from '$lib/types/semantic';

	const activeTab = $derived(tabStore.activeTab);
	const semanticPath = $derived(semanticStore.drilldownPath);

	// Dropdown state
	let openDropdownIndex = $state<number | null>(null);

	function closeDropdown() {
		openDropdownIndex = null;
	}

	// Close dropdown on outside click
	function handleWindowClick(e: MouseEvent) {
		if (openDropdownIndex !== null) {
			const target = e.target as HTMLElement;
			if (!target.closest('.crumb-dropdown-wrapper')) {
				closeDropdown();
			}
		}
	}

	// --- Semantic breadcrumb helpers ---
	function handleSemanticRootClick() {
		semanticStore.goToLevel(-1);
		tabStore.openDiagramTab([], 'Project');
		closeDropdown();
	}

	function handleSemanticCrumbClick(index: number) {
		semanticStore.goToLevel(index);
		const path = semanticStore.drilldownPath;
		const label = path.length > 0 ? path[path.length - 1].label : 'Project';
		tabStore.openDiagramTab(path, label);
		closeDropdown();
	}

	function getSemanticSiblings(index: number): SemanticNode[] {
		// Get the parent level's nodes (siblings at this crumb's level)
		let parentKey: string;
		if (index === 0) {
			parentKey = '__root__';
		} else {
			parentKey = semanticPath[index - 1].nodeId;
		}
		const level = semanticStore.getCachedLevel(parentKey);
		return level?.nodes ?? [];
	}

	function handleSemanticDropdownItem(node: SemanticNode, index: number) {
		// Navigate to the level containing this node, then select it
		const newPath = semanticPath.slice(0, index);
		newPath.push({ nodeId: node.id, label: node.label });
		semanticStore.drilldownPath = newPath.slice(0, index); // go to parent level
		semanticStore.goToLevel(index - 1);

		// Now drill into this node
		const wasCached = semanticStore.drillDown(node);
		if (wasCached) {
			tabStore.openDiagramTab(semanticStore.drilldownPath, node.label);
		}
		closeDropdown();
	}

	// --- Code breadcrumb helpers ---
	const codeFilePath = $derived.by(() => {
		if (activeTab?.type !== 'code') return '';
		return activeTab.filePath ?? selectionStore.selectedNode?.filePath ?? '';
	});

	const codePathSegments = $derived.by(() => {
		if (!codeFilePath) return [];
		return codeFilePath.split('/');
	});

	function getDirectoryContents(dirPath: string): FileNode[] {
		const tree = projectStore.fileTree;
		if (!tree) return [];

		if (dirPath === tree.name || dirPath === tree.path) {
			return tree.children ?? [];
		}

		// Navigate to the directory
		const parts = dirPath.split('/');
		let current: FileNode | undefined = tree;
		// Skip root if it matches
		const startIdx = parts[0] === tree.name ? 1 : 0;
		for (let i = startIdx; i < parts.length; i++) {
			if (!current?.children) return [];
			current = current.children.find((c) => c.name === parts[i]);
		}
		return current?.children ?? [];
	}

	function handleCodeSegmentClick(segmentIndex: number) {
		// Last segment = filename, no dropdown
		if (segmentIndex === codePathSegments.length - 1) return;
		openDropdownIndex = openDropdownIndex === segmentIndex ? null : segmentIndex;
	}

	function handleCodeDropdownItem(item: FileNode) {
		if (item.kind === 'file') {
			tabStore.openCodeTab(item.path, item.name, true);
			const syntheticNode = {
				id: `file:${item.path}`,
				kind: 'file' as const,
				label: item.name,
				filePath: item.path,
				parentId: null,
				childCount: 0,
				isExpanded: false
			};
			selectionStore.selectedNode = syntheticNode;
			selectionStore.breadcrumb = [syntheticNode];
		}
		closeDropdown();
	}
</script>

<svelte:window
	onclick={handleWindowClick}
	onkeydown={(e) => {
		if (e.key === 'Escape') closeDropdown();
	}}
/>

{#if activeTab?.type === 'diagram' && semanticStore.currentLevel !== null}
	<!-- Semantic diagram breadcrumb -->
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
			<div class="crumb-dropdown-wrapper">
				<button
					class="crumb"
					class:active={i === semanticPath.length - 1}
					onclick={() => {
						if (i === semanticPath.length - 1) {
							// Toggle dropdown for active crumb
							openDropdownIndex = openDropdownIndex === i ? null : i;
						} else {
							handleSemanticCrumbClick(i);
						}
					}}
				>
					<span class="crumb-label">{crumb.label}</span>
					<span class="crumb-chevron">&#9662;</span>
				</button>
				{#if openDropdownIndex === i}
					<div class="crumb-dropdown">
						{#each getSemanticSiblings(i) as sibling}
							<button
								class="dropdown-item"
								class:current={sibling.id === crumb.nodeId}
								onclick={() => handleSemanticDropdownItem(sibling, i)}
							>
								<span class="dropdown-color" style="background: {sibling.color};"></span>
								<span class="dropdown-label">{sibling.label}</span>
								<span class="dropdown-count">{sibling.fileCount}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</nav>
{:else if activeTab?.type === 'code' && codePathSegments.length > 0}
	<!-- Code file path breadcrumb -->
	<nav class="breadcrumb-bar">
		{#each codePathSegments as segment, i}
			{#if i > 0}
				<span class="separator">&rsaquo;</span>
			{/if}
			{#if i === codePathSegments.length - 1}
				<!-- Filename (last segment, no dropdown) -->
				<span class="crumb active">
					<span class="crumb-icon">&#128196;</span>
					<span class="crumb-label">{segment}</span>
				</span>
			{:else}
				<!-- Directory segment with dropdown -->
				<div class="crumb-dropdown-wrapper">
					<button class="crumb" onclick={() => handleCodeSegmentClick(i)}>
						{#if i === 0}
							<span class="crumb-icon">&#128193;</span>
						{/if}
						<span class="crumb-label">{segment}</span>
						<span class="crumb-chevron">&#9662;</span>
					</button>
					{#if openDropdownIndex === i}
						{@const dirPath = codePathSegments.slice(0, i + 1).join('/')}
						<div class="crumb-dropdown">
							{#each getDirectoryContents(dirPath).sort((a, b) => {
								if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
								return a.name.localeCompare(b.name);
							}) as item}
								<button
									class="dropdown-item"
									class:current={i + 1 < codePathSegments.length &&
										item.name === codePathSegments[i + 1]}
									onclick={() => handleCodeDropdownItem(item)}
								>
									<span class="dropdown-icon"
										>{item.kind === 'directory' ? '\uD83D\uDCC1' : '\uD83D\uDCC4'}</span
									>
									<span class="dropdown-label">{item.name}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
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
		background: none;
		border: none;
		cursor: pointer;
		transition:
			background-color var(--transition),
			color var(--transition);
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
		max-width: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.crumb-chevron {
		font-size: 8px;
		color: var(--text-muted);
		margin-left: 2px;
	}

	.crumb-dropdown-wrapper {
		position: relative;
	}

	.crumb-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		z-index: 100;
		min-width: 180px;
		max-width: 300px;
		max-height: 280px;
		overflow-y: auto;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 6px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		padding: 4px;
		margin-top: 4px;
	}

	.crumb-dropdown::-webkit-scrollbar {
		width: 4px;
	}

	.crumb-dropdown::-webkit-scrollbar-thumb {
		background: var(--border);
		border-radius: 2px;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 8px;
		border-radius: 4px;
		font-size: 12px;
		color: var(--text-secondary);
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		white-space: nowrap;
		transition: background-color 0.1s ease;
	}

	.dropdown-item:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.dropdown-item.current {
		color: var(--accent, #3b82f6);
		font-weight: 600;
	}

	.dropdown-color {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.dropdown-icon {
		font-size: 12px;
		flex-shrink: 0;
	}

	.dropdown-label {
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
		min-width: 0;
	}

	.dropdown-count {
		font-size: 10px;
		color: var(--text-muted);
		flex-shrink: 0;
	}
</style>
