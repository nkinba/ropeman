<script lang="ts">
	import { projectStore } from '$lib/stores/projectStore.svelte';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import { semanticStore } from '$lib/stores/semanticStore.svelte';
	import { graphStore } from '$lib/stores/graphStore.svelte';
	import type { FileNode } from '$lib/types/fileTree';

	let { collapsed = false, ontoggle }: {
		collapsed?: boolean;
		ontoggle?: () => void;
	} = $props();

	let searchQuery = $state('');
	let expandedDirs = $state<Set<string>>(new Set());
	let treeContainer: HTMLElement | undefined = $state();

	const langColors: Record<string, string> = {
		python: '#22c55e',
		javascript: '#eab308',
		typescript: '#3b82f6',
		svelte: '#ff3e00',
		css: '#a855f7',
		html: '#f97316',
		json: '#6b7280',
		markdown: '#6b7280',
		jsx: '#61dafb',
		tsx: '#3b82f6'
	};

	const highlightedPaths = $derived(semanticStore.highlightedFilePaths);
	const highlightedDirPaths = $derived(semanticStore.highlightedDirPaths);

	function toggleDir(path: string) {
		const next = new Set(expandedDirs);
		if (next.has(path)) {
			next.delete(path);
		} else {
			next.add(path);
		}
		expandedDirs = next;
	}

	function handleFileClick(node: FileNode) {
		// Select the file in the graph
		const graphNode = graphStore.nodes.find(n => n.filePath === node.path && n.kind === 'file');
		if (graphNode) {
			selectionStore.select(graphNode);
		}

		// If in semantic mode, find and highlight the semantic node containing this file
		if (semanticStore.viewMode === 'semantic') {
			const semNode = semanticStore.findSemanticNodeForFile(node.path);
			semanticStore.selectedSemanticNode = semNode;
		}
	}

	function matchesSearch(node: FileNode, query: string): boolean {
		if (!query) return true;
		const lowerQuery = query.toLowerCase();
		if (node.name.toLowerCase().includes(lowerQuery)) return true;
		if (node.kind === 'directory' && node.children) {
			return node.children.some(c => matchesSearch(c, query));
		}
		return false;
	}

	function isHighlighted(path: string): boolean {
		return highlightedPaths.includes(path) || highlightedDirPaths.includes(path);
	}

	function inferLang(path: string): string | null {
		const ext = path.split('.').pop()?.toLowerCase();
		switch (ext) {
			case 'py': return 'python';
			case 'js': return 'javascript';
			case 'ts': return 'typescript';
			case 'jsx': return 'jsx';
			case 'tsx': return 'tsx';
			case 'svelte': return 'svelte';
			case 'css': return 'css';
			case 'html': return 'html';
			case 'json': return 'json';
			case 'md': return 'markdown';
			default: return null;
		}
	}

	// Auto-expand root directory
	$effect(() => {
		const tree = projectStore.fileTree;
		if (tree && tree.kind === 'directory' && !expandedDirs.has(tree.path)) {
			expandedDirs = new Set([tree.path]);
		}
	});

	// Auto-expand parent directories when highlighted paths change
	$effect(() => {
		if (highlightedDirPaths.length > 0) {
			const next = new Set(expandedDirs);
			let changed = false;
			for (const dir of highlightedDirPaths) {
				if (!next.has(dir)) {
					next.add(dir);
					changed = true;
				}
			}
			if (changed) {
				expandedDirs = next;
			}
		}
	});

	// Auto-scroll to highlighted files
	$effect(() => {
		if (highlightedPaths.length > 0 && treeContainer) {
			const firstHighlighted = treeContainer.querySelector('.file-item.highlighted');
			if (firstHighlighted) {
				firstHighlighted.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			}
		}
	});
</script>

{#if !collapsed}
<aside class="file-explorer">
	<div class="explorer-header">
		<span class="explorer-title">Explorer</span>
		<button class="explorer-toggle" onclick={ontoggle} title="Hide Explorer">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="11 17 6 12 11 7"/>
			</svg>
		</button>
	</div>

	<div class="explorer-search">
		<input
			type="text"
			placeholder="Search files..."
			bind:value={searchQuery}
			class="search-input"
		/>
	</div>

	<div class="explorer-tree" bind:this={treeContainer}>
		{#if projectStore.fileTree}
			{@render treeNode(projectStore.fileTree, 0)}
		{/if}
	</div>
</aside>
{:else}
<button class="explorer-collapsed-toggle" onclick={ontoggle} title="Show Explorer">
	<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<polyline points="13 17 18 12 13 7"/>
	</svg>
</button>
{/if}

{#snippet treeNode(node: FileNode, depth: number)}
	{#if matchesSearch(node, searchQuery)}
		{#if node.kind === 'directory'}
			<button
				class="tree-item dir-item"
				class:highlighted={isHighlighted(node.path)}
				style="padding-left: {12 + depth * 16}px;"
				onclick={() => toggleDir(node.path)}
			>
				<span class="tree-chevron" class:expanded={expandedDirs.has(node.path)}>
					&#9656;
				</span>
				<span class="tree-icon">&#128193;</span>
				<span class="tree-label">{node.name}</span>
				{#if node.children}
					<span class="tree-count">{node.children.length}</span>
				{/if}
			</button>
			{#if expandedDirs.has(node.path) && node.children}
				{#each [...node.children].sort((a, b) => {
					if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
					return a.name.localeCompare(b.name);
				}) as child}
					{@render treeNode(child, depth + 1)}
				{/each}
			{/if}
		{:else}
			{@const lang = inferLang(node.path)}
			{@const color = langColors[lang ?? ''] ?? '#6b7280'}
			<button
				class="tree-item file-item"
				class:highlighted={isHighlighted(node.path)}
				class:selected={selectionStore.selectedNode?.filePath === node.path}
				style="padding-left: {12 + depth * 16}px;"
				onclick={() => handleFileClick(node)}
			>
				<span class="tree-color-dot" style="background: {color};"></span>
				<span class="tree-label">{node.name}</span>
			</button>
		{/if}
	{/if}
{/snippet}

<style>
	.file-explorer {
		width: 260px;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary);
		border-right: 1px solid var(--border);
		overflow: hidden;
		flex-shrink: 0;
	}

	.explorer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		border-bottom: 1px solid var(--border);
	}

	.explorer-title {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-secondary);
	}

	.explorer-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 4px;
		color: var(--text-muted);
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.explorer-toggle:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.explorer-collapsed-toggle {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 24px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-left: none;
		border-radius: 0 6px 6px 0;
		color: var(--text-muted);
		cursor: pointer;
		z-index: 5;
		transition: background-color 0.15s ease;
	}

	.explorer-collapsed-toggle:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.explorer-search {
		padding: 8px;
		border-bottom: 1px solid var(--border);
	}

	.search-input {
		width: 100%;
		padding: 6px 10px;
		font-size: 12px;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.15s ease;
	}

	.search-input:focus {
		border-color: var(--accent, #3b82f6);
	}

	.search-input::placeholder {
		color: var(--text-muted);
	}

	.explorer-tree {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 4px 0;
	}

	.explorer-tree::-webkit-scrollbar {
		width: 6px;
	}

	.explorer-tree::-webkit-scrollbar-track {
		background: transparent;
	}

	.explorer-tree::-webkit-scrollbar-thumb {
		background: var(--border);
		border-radius: 3px;
	}

	.tree-item {
		display: flex;
		align-items: center;
		gap: 4px;
		width: 100%;
		padding: 3px 12px;
		font-size: 12px;
		color: var(--text-secondary);
		cursor: pointer;
		border: none;
		background: none;
		text-align: left;
		white-space: nowrap;
		transition: background-color 0.1s ease;
	}

	.tree-item:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.tree-item.selected {
		background: var(--accent-bg, rgba(59, 130, 246, 0.12));
		color: var(--accent, #3b82f6);
	}

	.tree-item.highlighted {
		background: rgba(250, 204, 21, 0.1);
	}

	.tree-chevron {
		font-size: 10px;
		color: var(--text-muted);
		transition: transform 0.15s ease;
		width: 10px;
		flex-shrink: 0;
		display: inline-block;
	}

	.tree-chevron.expanded {
		transform: rotate(90deg);
	}

	.tree-icon {
		font-size: 13px;
		flex-shrink: 0;
	}

	.tree-label {
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
		min-width: 0;
	}

	.tree-count {
		font-size: 10px;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.tree-color-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
		margin-left: 14px;
	}
</style>
