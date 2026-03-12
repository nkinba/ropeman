<script lang="ts">
	import { theme, toggleTheme } from '$lib/stores/themeStore';
	import { locale, toggleLocale, t } from '$lib/stores/i18nStore';
	import { projectStore } from '$lib/stores/projectStore.svelte';
	import { semanticStore } from '$lib/stores/semanticStore.svelte';
	import { authStore } from '$lib/stores/authStore.svelte';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';

	let {
		onsettings,
		onnewproject,
		onconnect,
		onanalyze
	}: {
		onsettings?: () => void;
		onnewproject?: () => void;
		onconnect?: () => void;
		onanalyze?: () => void;
	} = $props();

	const hasProject = $derived(projectStore.fileTree !== null);
	const hasSemanticData = $derived(semanticStore.currentLevel !== null);

	const showBridgeStatus = $derived(
		authStore.bridgeStatus === 'connected' ||
			authStore.bridgeStatus === 'reconnecting' ||
			authStore.bridgeStatus === 'connecting'
	);

	const bridgeStatusLabel = $derived.by(() => {
		switch (authStore.bridgeStatus) {
			case 'connected':
				return 'Bridge connected';
			case 'reconnecting':
				return 'Reconnecting...';
			case 'connecting':
				return 'Connecting...';
			default:
				return 'Bridge disconnected';
		}
	});

	function toggleViewMode() {
		semanticStore.viewMode = semanticStore.viewMode === 'semantic' ? 'code' : 'semantic';
	}
</script>

<header class="header">
	<div class="header-left">
		<h1 class="header-title">{$t('title')}</h1>
		{#if projectStore.projectName}
			<span class="header-project">{projectStore.projectName}</span>
		{:else}
			<span class="header-subtitle">{$t('subtitle')}</span>
		{/if}
	</div>
	<div class="header-right">
		{#if hasProject}
			<button class="header-btn text-btn" onclick={onnewproject} title="Open New Project">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
					<line x1="12" y1="11" x2="12" y2="17" />
					<line x1="9" y1="14" x2="15" y2="14" />
				</svg>
				<span class="btn-label">New</span>
			</button>
		{/if}
		{#if hasProject}
			<button
				class="header-btn text-btn"
				onclick={() => onanalyze?.()}
				title="AI Semantic Analysis"
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polygon
						points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
					/>
				</svg>
				<span class="btn-label">AI</span>
			</button>
		{/if}
		{#if hasProject && hasSemanticData}
			<button
				class="header-btn text-btn view-toggle"
				class:active={semanticStore.viewMode === 'semantic'}
				onclick={toggleViewMode}
				title="Toggle View Mode (Ctrl+Shift+V)"
			>
				{#if semanticStore.viewMode === 'semantic'}
					<svg
						width="16"
						height="16"
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
					<span class="btn-label">Semantic</span>
				{:else}
					<svg
						width="16"
						height="16"
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
					<span class="btn-label">Code</span>
				{/if}
			</button>
		{/if}
		<button class="header-btn" onclick={toggleLocale} title="Toggle Language">
			{$locale === 'ko' ? 'EN' : '\uD55C'}
		</button>
		<button
			class="header-btn"
			onclick={toggleTheme}
			title="{$t($theme === 'dark' ? 'lightMode' : 'darkMode')} (Ctrl+Shift+D)"
		>
			{$theme === 'dark' ? '\u2600' : '\u263D'}
		</button>
		<button class="header-btn" onclick={onsettings} title="{$t('settings')} (?)">
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
				<circle cx="12" cy="12" r="3" />
				<path
					d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
				/>
			</svg>
		</button>
		{#if showBridgeStatus}
			<span
				class="bridge-indicator"
				class:connected={authStore.bridgeStatus === 'connected'}
				class:reconnecting={authStore.bridgeStatus === 'reconnecting'}
				title={bridgeStatusLabel}
			>
				<span class="bridge-dot"></span>
			</span>
		{/if}
	</div>
</header>

<SearchBar />

{#if hasProject}
	<Breadcrumb />
{/if}

<style>
	.header {
		height: var(--header-height);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 20px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: baseline;
		gap: 12px;
	}

	.header-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.header-subtitle {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.header-project {
		font-size: 13px;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.header-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-secondary);
		transition:
			background-color var(--transition),
			color var(--transition);
	}

	.header-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.header-btn.text-btn {
		width: auto;
		padding: 0 12px;
		gap: 6px;
	}

	.btn-label {
		font-size: 13px;
	}

	.view-toggle.active {
		background: var(--accent-bg, rgba(59, 130, 246, 0.12));
		color: var(--accent, #3b82f6);
	}

	.bridge-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		margin-left: 4px;
	}

	.bridge-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #585b70;
	}

	.bridge-indicator.connected .bridge-dot {
		background: #a6e3a1;
	}

	.bridge-indicator.reconnecting .bridge-dot {
		background: #f9e2af;
		animation: bridge-pulse 1s infinite;
	}

	@keyframes bridge-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}

	@media (max-width: 768px) {
		.header-subtitle {
			display: none;
		}

		.btn-label {
			display: none;
		}

		.header-btn.text-btn {
			width: 36px;
			padding: 0;
		}
	}
</style>
