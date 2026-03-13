<script lang="ts">
	import FileExplorer from './FileExplorer.svelte';
	import SemanticTree from './SemanticTree.svelte';
	import { semanticStore } from '$lib/stores/semanticStore.svelte';

	let {
		collapsed = false,
		mobile = false,
		ontoggle
	}: {
		collapsed?: boolean;
		mobile?: boolean;
		ontoggle?: () => void;
	} = $props();

	let activePanel = $state<'files' | 'semantic'>('files');

	const hasSemanticData = $derived(semanticStore.cache.size > 0);

	// Auto-switch to semantic panel when first analysis completes
	let autoSwitched = $state(false);
	$effect(() => {
		if (hasSemanticData && !autoSwitched) {
			activePanel = 'semantic';
			autoSwitched = true;
		}
	});
</script>

{#if !collapsed}
	{#if mobile}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="mobile-overlay"
			onclick={ontoggle}
			onkeydown={(e) => {
				if (e.key === 'Escape') ontoggle?.();
			}}
		></div>
	{/if}
	<aside class="sidebar" class:mobile>
		<div class="sidebar-icons">
			<button
				class="icon-btn"
				class:active={activePanel === 'files'}
				onclick={() => (activePanel = 'files')}
				title="File Explorer"
			>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
				</svg>
			</button>
			<button
				class="icon-btn"
				class:active={activePanel === 'semantic'}
				class:disabled={!hasSemanticData}
				onclick={() => {
					if (hasSemanticData) activePanel = 'semantic';
				}}
				title={hasSemanticData ? 'Semantic Tree' : 'Semantic Tree (run AI analysis first)'}
			>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="5" r="3" />
					<line x1="12" y1="8" x2="12" y2="14" />
					<circle cx="6" cy="19" r="3" />
					<circle cx="18" cy="19" r="3" />
					<line x1="12" y1="14" x2="6" y2="16" />
					<line x1="12" y1="14" x2="18" y2="16" />
				</svg>
			</button>
		</div>
		<div class="sidebar-content">
			{#if activePanel === 'files'}
				<FileExplorer collapsed={false} mobile={false} {ontoggle} />
			{:else}
				<div class="semantic-panel">
					<div class="panel-header">
						<span class="panel-title">Semantic Tree</span>
						<button class="panel-toggle" onclick={ontoggle} title="Hide Sidebar">
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="11 17 6 12 11 7" />
							</svg>
						</button>
					</div>
					<SemanticTree />
				</div>
			{/if}
		</div>
	</aside>
{:else}
	<button class="sidebar-collapsed-toggle" onclick={ontoggle} title="Show Sidebar">
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<polyline points="13 17 18 12 13 7" />
		</svg>
	</button>
{/if}

<style>
	.sidebar {
		display: flex;
		background: var(--bg-primary);
		border-right: 1px solid var(--border);
		overflow: hidden;
		flex-shrink: 0;
	}

	.sidebar-icons {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 8px 4px;
		border-right: 1px solid var(--border);
		background: var(--bg-secondary);
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 6px;
		color: var(--text-muted);
		background: none;
		border: none;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.icon-btn:hover:not(.disabled) {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.icon-btn.active {
		color: var(--accent, #3b82f6);
		background: var(--accent-bg, rgba(59, 130, 246, 0.12));
	}

	.icon-btn.disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.sidebar-content {
		width: 260px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.semantic-panel {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		border-bottom: 1px solid var(--border);
	}

	.panel-title {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-secondary);
	}

	.panel-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 4px;
		color: var(--text-muted);
		background: none;
		border: none;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.panel-toggle:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.sidebar-collapsed-toggle {
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

	.sidebar-collapsed-toggle:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	/* Mobile overlay mode */
	.mobile-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 29;
	}

	.sidebar.mobile {
		position: fixed;
		top: 0;
		left: 0;
		width: calc(44px + 80vw);
		height: 100vh;
		z-index: 30;
		animation: slideIn 0.2s ease;
	}

	@keyframes slideIn {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(0);
		}
	}
</style>
