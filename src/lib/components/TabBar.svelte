<script lang="ts">
	import { tabStore } from '$lib/stores/tabStore.svelte';

	function handleMouseDown(e: MouseEvent, tabId: string) {
		// Middle-click to close
		if (e.button === 1) {
			e.preventDefault();
			tabStore.closeTab(tabId);
		}
	}

	function handleDblClick(tabId: string) {
		tabStore.pinTab(tabId);
	}
</script>

{#if tabStore.tabs.length > 0}
	<div class="tab-bar">
		<div class="tab-list">
			{#each tabStore.tabs as tab (tab.id)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="tab"
					class:active={tab.id === tabStore.activeTabId}
					class:preview={tab.preview}
					onclick={() => tabStore.activateTab(tab.id)}
					onmousedown={(e) => handleMouseDown(e, tab.id)}
					ondblclick={() => handleDblClick(tab.id)}
					title={tab.type === 'code' ? (tab.filePath ?? tab.label) : tab.label}
					role="tab"
					tabindex="0"
					aria-selected={tab.id === tabStore.activeTabId}
				>
					<span class="tab-icon">
						{#if tab.type === 'diagram'}
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="12" cy="12" r="10" />
								<line x1="2" y1="12" x2="22" y2="12" />
								<path
									d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
								/>
							</svg>
						{:else}
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="16 18 22 12 16 6" />
								<polyline points="8 6 2 12 8 18" />
							</svg>
						{/if}
					</span>
					<span class="tab-label">{tab.label}</span>
					<button
						class="tab-close"
						onclick={(e) => {
							e.stopPropagation();
							tabStore.closeTab(tab.id);
						}}
						title="Close"
					>
						<svg
							width="10"
							height="10"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.tab-bar {
		display: flex;
		align-items: stretch;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
		min-height: 35px;
		overflow-x: auto;
		overflow-y: hidden;
	}

	.tab-bar::-webkit-scrollbar {
		height: 0;
	}

	.tab-list {
		display: flex;
		align-items: stretch;
		gap: 0;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 12px;
		height: 35px;
		font-size: 12px;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		border-right: 1px solid var(--border);
		cursor: pointer;
		white-space: nowrap;
		transition:
			background-color 0.1s ease,
			color 0.1s ease;
		min-width: 0;
		max-width: 200px;
	}

	.tab:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.tab.active {
		background: var(--bg-primary);
		color: var(--text-primary);
		border-bottom: 2px solid var(--accent, #3b82f6);
	}

	.tab.preview .tab-label {
		font-style: italic;
	}

	.tab-icon {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		color: var(--text-muted);
	}

	.tab.active .tab-icon {
		color: var(--accent, #3b82f6);
	}

	.tab-label {
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.tab-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 3px;
		color: var(--text-muted);
		background: none;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		opacity: 0;
		transition:
			opacity 0.1s ease,
			background-color 0.1s ease;
	}

	.tab:hover .tab-close,
	.tab.active .tab-close {
		opacity: 1;
	}

	.tab-close:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}
</style>
