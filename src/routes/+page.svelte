<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Dropzone from '$lib/components/Dropzone.svelte';
	import ZUICanvas from '$lib/components/ZUICanvas.svelte';
	import CodeViewer from '$lib/components/CodeViewer.svelte';
	import NodeDetailPanel from '$lib/components/NodeDetailPanel.svelte';
	import SemanticDetailPanel from '$lib/components/SemanticDetailPanel.svelte';
	import FileExplorer from '$lib/components/FileExplorer.svelte';
	import ChatPopup from '$lib/components/ChatPopup.svelte';
	import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import ConnectModal from '$lib/components/ConnectModal.svelte';
	import OnboardingModal from '$lib/components/OnboardingModal.svelte';
	import { projectStore } from '$lib/stores/projectStore.svelte';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import { semanticStore } from '$lib/stores/semanticStore.svelte';
	import { authStore } from '$lib/stores/authStore.svelte';
	import { analyzeTopLevel } from '$lib/services/semanticAnalysisService';
	import { loadTestProject } from '$lib/services/testLoader';
	import { onMount } from 'svelte';

	let showSettings = $state(false);
	let showConnect = $state(false);
	let showOnboarding = $state(false);
	let showNewProject = $state(false);
	let explorerCollapsed = $state(false);

	function handleTrackSelect(track: 'edge' | 'byok' | 'bridge') {
		showOnboarding = false;
		if (!authStore.isReady) {
			// edge proxy not yet implemented — require bridge or BYOK auth
			showConnect = true;
		} else {
			analyzeTopLevel();
		}
	}

	const hasProject = $derived(projectStore.fileTree !== null);
	const hasSelection = $derived(selectionStore.selectedNode !== null);
	const hasSemanticSelection = $derived(semanticStore.viewMode === 'semantic' && semanticStore.selectedSemanticNode !== null);

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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (showOnboarding) {
				showOnboarding = false;
			} else if (showConnect) {
				showConnect = false;
			} else if (showSettings) {
				showSettings = false;
			} else if (showNewProject) {
				showNewProject = false;
			} else if (hasSelection) {
				selectionStore.clear();
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div id="app">
	<Header
		onsettings={() => showSettings = !showSettings}
		onnewproject={() => showNewProject = true}
		onconnect={() => showConnect = true}
		onanalyze={() => showOnboarding = true}
	/>

	{#if projectStore.isLoading}
		<LoadingOverlay />
	{/if}

	{#if showNewProject && hasProject}
		<!-- Overlay Dropzone on top of existing canvas -->
		<div class="dropzone-overlay">
			<Dropzone oncancel={() => showNewProject = false} onload={() => showNewProject = false} />
		</div>
	{:else if !hasProject && !projectStore.isLoading}
		<Dropzone onload={() => showNewProject = false} />
	{:else if hasProject}
		<div class="main-layout">
			<FileExplorer
				collapsed={explorerCollapsed}
				ontoggle={() => explorerCollapsed = !explorerCollapsed}
			/>
			<div class="canvas-area">
				{#if semanticStore.viewMode === 'semantic'}
					<ZUICanvas />
				{:else}
					<CodeViewer />
				{/if}
			</div>
			{#if hasSemanticSelection}
				<div class="detail-panel">
					<SemanticDetailPanel />
				</div>
			{:else if hasSelection}
				<div class="detail-panel">
					<NodeDetailPanel onclose={() => selectionStore.clear()} />
				</div>
			{/if}
		</div>
		<ChatPopup onconnect={() => showConnect = true} />
	{/if}

	{#if showSettings}
		<SettingsModal open={showSettings} onclose={() => showSettings = false} onconnect={() => { showSettings = false; showConnect = true; }} />
	{/if}

	{#if showConnect}
		<ConnectModal open={showConnect} onclose={() => showConnect = false} />
	{/if}

	{#if showOnboarding}
		<OnboardingModal open={showOnboarding} onclose={() => showOnboarding = false} onselect={handleTrackSelect} />
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
	}

	.detail-panel {
		width: 400px;
		border-left: 1px solid var(--border);
		overflow-y: auto;
		flex-shrink: 0;
		animation: panelSlide 0.2s ease;
	}

	.dropzone-overlay {
		position: absolute;
		inset: var(--header-height, 48px) 0 0 0;
		z-index: 40;
		background: var(--bg-primary);
		display: flex;
		flex-direction: column;
	}

	@keyframes panelSlide {
		from { width: 0; opacity: 0; }
		to { width: 400px; opacity: 1; }
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
			from { transform: translateX(100%); }
			to { transform: translateX(0); }
		}
	}
</style>
