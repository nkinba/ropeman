<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Dropzone from '$lib/components/Dropzone.svelte';
	import ZUICanvas from '$lib/components/ZUICanvas.svelte';
	import CodeViewer from '$lib/components/CodeViewer.svelte';
	import NodeDetailPanel from '$lib/components/NodeDetailPanel.svelte';
	import SemanticDetailPanel from '$lib/components/SemanticDetailPanel.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ChatPopup from '$lib/components/ChatPopup.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import ConnectModal from '$lib/components/ConnectModal.svelte';
	import OnboardingModal from '$lib/components/OnboardingModal.svelte';
	import { projectStore } from '$lib/stores/projectStore.svelte';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import { semanticStore } from '$lib/stores/semanticStore.svelte';
	import { authStore } from '$lib/stores/authStore.svelte';
	import { toggleTheme } from '$lib/stores/themeStore';
	import { tabStore } from '$lib/stores/tabStore.svelte';
	import { layoutStore } from '$lib/stores/layoutStore.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import SplitPane from '$lib/components/SplitPane.svelte';
	import { analyzeTopLevel } from '$lib/services/semanticAnalysisService';
	import { t } from '$lib/stores/i18nStore';
	import { loadTestProject } from '$lib/services/testLoader';
	import { graphStore } from '$lib/stores/graphStore.svelte';
	import {
		openDirectory,
		readDirectoryRecursive,
		handleFallbackInput
	} from '$lib/services/fileSystemService';
	import { parseAllFiles } from '$lib/services/parserService';
	import { onMount } from 'svelte';

	let showSettings = $state(false);
	let showConnect = $state(false);
	let showOnboarding = $state(false);
	// explorerCollapsed removed — sidebar icon bar is always visible,
	// content panel is managed internally by Sidebar component
	let isMobile = $state(false);
	let zuiCanvasRef: ZUICanvas | undefined = $state(undefined);
	let sidebarRef: Sidebar | undefined = $state(undefined);

	// U1-5: Responsive layout — detect mobile viewport
	$effect(() => {
		if (typeof window === 'undefined') return;
		const mql = window.matchMedia('(max-width: 768px)');
		const handler = (e: MediaQueryListEvent | MediaQueryList) => {
			isMobile = e.matches;
		};
		handler(mql);
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	});

	function handleTrackSelect(track: 'edge' | 'byok' | 'bridge') {
		showOnboarding = false;
		if (!authStore.isReady) {
			// edge proxy not yet implemented — require bridge or BYOK auth
			showConnect = true;
		} else {
			analyzeTopLevel();
		}
	}

	let fallbackInput: HTMLInputElement | undefined = $state(undefined);
	const supportsDirectoryPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

	function resetAllStores() {
		projectStore.reset();
		graphStore.clear();
		selectionStore.clear();
		semanticStore.clear();
	}

	async function handleNewProject() {
		if (supportsDirectoryPicker) {
			try {
				const dirHandle = await openDirectory();
				resetAllStores();
				projectStore.isLoading = true;
				projectStore.projectName = dirHandle.name;
				const tree = await readDirectoryRecursive(dirHandle);
				projectStore.fileTree = tree;
				await parseAllFiles(tree);
			} catch (err: unknown) {
				if (err instanceof Error && err.name === 'AbortError') return;
				console.error('Failed to open project:', err);
			}
		} else {
			fallbackInput?.click();
		}
	}

	async function handleFallbackFiles(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		try {
			resetAllStores();
			const tree = handleFallbackInput(input.files);
			projectStore.projectName = tree.name;
			projectStore.fileTree = tree;
			projectStore.isLoading = true;
			await parseAllFiles(tree);
		} catch (err) {
			console.error('Failed to process files:', err);
			projectStore.isLoading = false;
		}
	}

	// U1-1: Analysis progress/error UI state
	let errorDismissed = $state(false);
	let errorDismissTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (semanticStore.analysisError) {
			errorDismissed = false;
			if (errorDismissTimer) clearTimeout(errorDismissTimer);
			errorDismissTimer = setTimeout(() => {
				errorDismissed = true;
			}, 5000);
		}
		return () => {
			if (errorDismissTimer) clearTimeout(errorDismissTimer);
		};
	});

	function dismissError() {
		errorDismissed = true;
		semanticStore.analysisError = null;
	}

	const hasProject = $derived(projectStore.fileTree !== null);
	// Code-mode file detail panel disabled — info already visible in code header & breadcrumb
	const hasSelection = $derived(false);
	const hasSemanticSelection = $derived(
		tabStore.viewMode === 'semantic' &&
			semanticStore.selectedSemanticNode !== null &&
			!semanticStore.panelDismissed
	);
	const isSnippetMode = $derived(projectStore.isSnippetMode);

	// Auto-trigger semantic analysis when snippet mode is active and AI becomes ready
	$effect(() => {
		if (
			isSnippetMode &&
			hasProject &&
			!projectStore.isLoading &&
			authStore.isReady &&
			!semanticStore.isAnalyzing &&
			semanticStore.currentLevel === null
		) {
			analyzeTopLevel();
		}
	});

	// Tab switch: restore state when the active tab changes
	let prevActiveTabId = $state<string | null>(null);
	$effect(() => {
		const tab = tabStore.activeTab;
		const tabId = tab?.id ?? null;
		if (tabId === prevActiveTabId) return;
		prevActiveTabId = tabId;
		if (!tab) return;

		if (tab.type === 'diagram' && tab.drilldownPath) {
			// Restore the drilldown path and level from cache
			const targetPath = tab.drilldownPath;
			const currentPath = semanticStore.drilldownPath;

			// Only update if the path actually differs
			const pathKey = targetPath.map((p) => p.nodeId).join('/');
			const currentKey = currentPath.map((p) => p.nodeId).join('/');
			if (pathKey !== currentKey) {
				const levelKey =
					targetPath.length > 0 ? targetPath[targetPath.length - 1].nodeId : '__root__';
				const cached = semanticStore.getCachedLevel(levelKey);
				if (cached) {
					semanticStore.currentLevel = cached;
				}
				semanticStore.drilldownPath = [...targetPath];
			}
		} else if (tab.type === 'code' && tab.filePath) {
			// Sync the selection to match the active code tab's file
			const fileName = tab.filePath.split('/').pop() ?? tab.filePath;
			selectionStore.selectedNode = {
				id: `file:${tab.filePath}`,
				kind: 'file',
				label: fileName,
				filePath: tab.filePath,
				parentId: null,
				childCount: 0,
				isExpanded: false
			};
			selectionStore.breadcrumb = [selectionStore.selectedNode];
		}
	});

	// Auto-show onboarding when snippet parsing completes but AI is not connected
	let snippetOnboardingShown = $state(false);
	$effect(() => {
		if (
			isSnippetMode &&
			hasProject &&
			!projectStore.isLoading &&
			!authStore.isReady &&
			!snippetOnboardingShown
		) {
			snippetOnboardingShown = true;
			showOnboarding = true;
		}
		if (!isSnippetMode) {
			snippetOnboardingShown = false;
		}
	});

	// Drag-to-split: track drop zone state for non-split mode
	let splitDropZone = $state<'none' | 'right'>('none');

	function handleCanvasDragOver(e: DragEvent) {
		if (layoutStore.isSplit || isMobile) return;
		if (!e.dataTransfer?.types.includes('text/x-tab-id')) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const relX = (e.clientX - rect.left) / rect.width;
		splitDropZone = relX > 0.5 ? 'right' : 'none';
	}

	function handleCanvasDragLeave() {
		splitDropZone = 'none';
	}

	function handleCanvasDrop(e: DragEvent) {
		if (layoutStore.isSplit || isMobile) return;
		if (splitDropZone === 'none') return;
		if (!e.dataTransfer) return;
		e.preventDefault();
		const tabId = e.dataTransfer.getData('text/x-tab-id');
		if (!tabId) {
			splitDropZone = 'none';
			return;
		}
		// Move tab to secondary pane and activate split
		tabStore.moveTabToPane(tabId, 'secondary');
		layoutStore.secondaryActiveTabId = tabId;
		layoutStore.isSplit = true;
		layoutStore.focusedPane = 'secondary';
		splitDropZone = 'none';
	}

	// When split is toggled off, merge secondary tabs to primary
	let prevIsSplit = $state(false);
	$effect(() => {
		const current = layoutStore.isSplit;
		if (prevIsSplit && !current) {
			tabStore.mergeSecondaryToPrimary();
		}
		prevIsSplit = current;
	});

	// Disable split on mobile
	$effect(() => {
		if (isMobile && layoutStore.isSplit) {
			layoutStore.isSplit = false;
		}
	});

	// Dev-only: auto-load test project from ?testDir= URL parameter
	onMount(() => {
		if (!import.meta.env.DEV) return;
		const params = new URLSearchParams(window.location.search);
		const testDir = params.get('testDir');
		if (testDir) {
			console.log(`[dev] Loading test project from: ${testDir}`);
			loadTestProject(testDir);
		}
	});

	function isInputFocused(): boolean {
		const el = document.activeElement;
		if (!el) return false;
		const tag = el.tagName.toLowerCase();
		return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (showOnboarding) {
				showOnboarding = false;
			} else if (showConnect) {
				showConnect = false;
			} else if (showSettings) {
				showSettings = false;
			} else if (hasSelection) {
				selectionStore.clear();
			}
			return;
		}

		// Skip keyboard shortcuts when input fields are focused
		if (isInputFocused()) return;

		// Ctrl+Shift+D: Toggle theme
		if (e.ctrlKey && e.shiftKey && e.key === 'D') {
			e.preventDefault();
			toggleTheme();
			return;
		}

		// Ctrl+W: Close active tab in focused pane
		if (e.ctrlKey && !e.shiftKey && e.key === 'w') {
			e.preventDefault();
			if (layoutStore.isSplit && layoutStore.focusedPane === 'secondary') {
				const secTabId = layoutStore.secondaryActiveTabId;
				if (secTabId) {
					const secTabs = tabStore.tabsForPane('secondary');
					tabStore.closeTab(secTabId);
					if (secTabs.length <= 1) {
						layoutStore.isSplit = false;
					} else {
						const remaining = secTabs.filter((t) => t.id !== secTabId);
						layoutStore.secondaryActiveTabId = remaining.length > 0 ? remaining[0].id : null;
					}
				}
			} else if (tabStore.activeTabId) {
				tabStore.closeTab(tabStore.activeTabId);
			}
			return;
		}

		// Ctrl+Tab: Next tab / Ctrl+Shift+Tab: Previous tab (within focused pane)
		if (e.ctrlKey && e.key === 'Tab') {
			e.preventDefault();
			const isSecondary = layoutStore.isSplit && layoutStore.focusedPane === 'secondary';
			const paneTabs = isSecondary
				? tabStore.tabsForPane('secondary')
				: tabStore.tabsForPane('primary');
			if (paneTabs.length <= 1) return;
			const currentId = isSecondary ? layoutStore.secondaryActiveTabId : tabStore.activeTabId;
			const currentIdx = paneTabs.findIndex((t) => t.id === currentId);
			const nextIdx = e.shiftKey
				? (currentIdx - 1 + paneTabs.length) % paneTabs.length
				: (currentIdx + 1) % paneTabs.length;
			if (isSecondary) {
				layoutStore.secondaryActiveTabId = paneTabs[nextIdx].id;
			} else {
				tabStore.activateTab(paneTabs[nextIdx].id);
			}
			return;
		}

		// Ctrl+B: Toggle sidebar content panel
		if (e.ctrlKey && !e.shiftKey && e.key === 'b') {
			e.preventDefault();
			sidebarRef?.toggleContent();
			return;
		}

		// Ctrl+Shift+E: Export diagram
		if (e.ctrlKey && e.shiftKey && e.key === 'E') {
			e.preventDefault();
			zuiCanvasRef?.triggerExport();
			return;
		}

		// Ctrl+\: Toggle split
		if (e.ctrlKey && e.key === '\\') {
			e.preventDefault();
			if (!isMobile) {
				layoutStore.toggleSplit();
			}
			return;
		}

		// Ctrl+1: Focus primary pane
		if (e.ctrlKey && e.key === '1') {
			e.preventDefault();
			layoutStore.focusPrimary();
			return;
		}

		// Ctrl+2: Focus secondary pane
		if (e.ctrlKey && e.key === '2') {
			e.preventDefault();
			if (layoutStore.isSplit) {
				layoutStore.focusSecondary();
			}
			return;
		}

		// ? or Ctrl+/: Show keyboard shortcuts help (open settings modal)
		if (e.key === '?' || (e.ctrlKey && e.key === '/')) {
			e.preventDefault();
			showSettings = true;
			return;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div id="app">
	<Header
		onsettings={() => (showSettings = !showSettings)}
		onnewproject={handleNewProject}
		onconnect={() => (showConnect = true)}
		onanalyze={() => (showOnboarding = true)}
	/>

	{#if projectStore.isLoading}
		<LoadingOverlay />
	{/if}

	{#if !hasProject && !projectStore.isLoading}
		<Dropzone />
	{:else if hasProject}
		<div class="main-layout">
			{#if !isSnippetMode}
				<Sidebar bind:this={sidebarRef} mobile={isMobile} />
			{/if}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="canvas-area"
				ondragover={handleCanvasDragOver}
				ondragleave={handleCanvasDragLeave}
				ondrop={handleCanvasDrop}
			>
				{#if splitDropZone === 'right'}
					<div class="split-drop-overlay">
						<div class="split-drop-hint">Drop to split</div>
					</div>
				{/if}
				{#if layoutStore.isSplit && !isMobile}
					<SplitPane
						zuiCanvasBindPrimary={(ref) => {
							zuiCanvasRef = ref;
						}}
					/>
				{:else}
					<TabBar
						paneId="primary"
						tabs={tabStore.tabs}
						activeTabId={tabStore.activeTabId}
						onactivate={(id) => tabStore.activateTab(id)}
						onclose={(id) => tabStore.closeTab(id)}
					/>
					<div class="canvas-content">
						{#if tabStore.activeTab?.type === 'diagram'}
							<ZUICanvas bind:this={zuiCanvasRef} />
						{:else if tabStore.activeTab?.type === 'code'}
							<CodeViewer filePath={tabStore.activeTab.filePath} />
						{:else}
							<!-- No active tab: show diagram if semantic data exists, otherwise code viewer -->
							{#if semanticStore.currentLevel}
								<ZUICanvas bind:this={zuiCanvasRef} />
							{:else}
								<CodeViewer />
							{/if}
						{/if}
					</div>
				{/if}
			</div>
			{#if hasSemanticSelection}
				<div class="detail-panel">
					<SemanticDetailPanel ondismiss={() => (semanticStore.panelDismissed = true)} />
				</div>
			{:else if hasSelection}
				<div class="detail-panel">
					<NodeDetailPanel onclose={() => selectionStore.clear()} />
				</div>
			{/if}
		</div>
		<!-- U1-1: Analysis progress indicator (bottom-right, always visible) -->
		{#if semanticStore.isAnalyzing}
			<div class="analysis-progress-pill">
				<div class="analysis-spinner"></div>
				<span class="analysis-progress-text">
					{semanticStore.analysisProgress || $t('analyzing')}
				</span>
			</div>
		{/if}

		<!-- U1-1: Analysis error toast -->
		{#if semanticStore.analysisError && !errorDismissed}
			<div class="analysis-error-toast">
				<span class="analysis-error-text">{semanticStore.analysisError}</span>
				<button class="analysis-error-dismiss" onclick={dismissError}>&#10005;</button>
			</div>
		{/if}

		<ChatPopup onconnect={() => (showConnect = true)} />
	{/if}

	{#if showSettings}
		<SettingsModal
			open={showSettings}
			onclose={() => (showSettings = false)}
			onconnect={() => {
				showSettings = false;
				showConnect = true;
			}}
		/>
	{/if}

	{#if showConnect}
		<ConnectModal open={showConnect} onclose={() => (showConnect = false)} />
	{/if}

	{#if showOnboarding}
		<OnboardingModal
			open={showOnboarding}
			onclose={() => (showOnboarding = false)}
			onselect={handleTrackSelect}
		/>
	{/if}

	{#if !supportsDirectoryPicker}
		<input
			bind:this={fallbackInput}
			type="file"
			webkitdirectory
			multiple
			hidden
			onchange={handleFallbackFiles}
		/>
	{/if}
</div>

<style>
	#app {
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.main-layout {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.canvas-area {
		flex: 1;
		min-width: 0;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.canvas-content {
		flex: 1;
		min-height: 0;
		position: relative;
	}

	.split-drop-overlay {
		position: absolute;
		top: 0;
		right: 0;
		width: 50%;
		height: 100%;
		background: rgba(59, 130, 246, 0.08);
		border: 2px dashed var(--accent, #3b82f6);
		border-radius: 8px;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.split-drop-hint {
		font-size: 14px;
		font-weight: 600;
		color: var(--accent, #3b82f6);
		background: var(--bg-secondary);
		padding: 8px 16px;
		border-radius: 8px;
		border: 1px solid var(--accent, #3b82f6);
	}

	.detail-panel {
		width: 400px;
		border-left: 1px solid var(--border);
		overflow-y: auto;
		flex-shrink: 0;
		animation: panelSlide 0.2s ease;
	}

	@keyframes panelSlide {
		from {
			width: 0;
			opacity: 0;
		}
		to {
			width: 400px;
			opacity: 1;
		}
	}

	/* U1-1: Analysis progress pill (bottom-right, above chat button) */
	.analysis-progress-pill {
		position: fixed;
		bottom: 80px;
		right: 24px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 20px;
		z-index: 50;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		animation: pillFadeIn 0.2s ease;
	}

	@keyframes pillFadeIn {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	:global(.analysis-progress-pill.pulse) {
		animation: pillPulse 0.4s ease;
	}

	@keyframes pillPulse {
		0% {
			transform: scale(1);
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		}
		50% {
			transform: scale(1.05);
			box-shadow: 0 2px 16px rgba(59, 130, 246, 0.3);
		}
		100% {
			transform: scale(1);
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		}
	}

	.analysis-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid var(--text-muted);
		border-top-color: var(--accent, #3b82f6);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.analysis-progress-text {
		font-size: 12px;
		color: var(--text-secondary);
		font-weight: 500;
		white-space: nowrap;
	}

	/* U1-1: Analysis error toast */
	.analysis-error-toast {
		position: fixed;
		bottom: 80px;
		right: 24px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: rgba(239, 68, 68, 0.9);
		border: 1px solid rgba(239, 68, 68, 1);
		border-radius: 8px;
		z-index: 51;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		animation: pillFadeIn 0.2s ease;
		max-width: 360px;
	}

	.analysis-error-text {
		font-size: 12px;
		color: #fff;
		font-weight: 500;
		flex: 1;
		word-break: break-word;
	}

	.analysis-error-dismiss {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		font-size: 14px;
		padding: 0 2px;
		flex-shrink: 0;
		line-height: 1;
	}

	.analysis-error-dismiss:hover {
		color: #fff;
	}

	@media (max-width: 768px) {
		.detail-panel {
			position: fixed;
			top: 0;
			right: 0;
			bottom: 0;
			width: 100%;
			z-index: 50;
			background: var(--bg-primary);
			animation: mobileSlide 0.2s ease;
		}

		@keyframes mobileSlide {
			from {
				transform: translateX(100%);
			}
			to {
				transform: translateX(0);
			}
		}
	}
</style>
