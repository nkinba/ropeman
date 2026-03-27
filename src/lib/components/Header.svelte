<script lang="ts">
	import { themeStore } from '$lib/stores/themeStore.svelte';
	import { i18nStore } from '$lib/stores/i18nStore.svelte';
	import { projectStore } from '$lib/stores/projectStore.svelte';
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

	const trackInfo = $derived.by(() => {
		const track = authStore.activeTrack;
		switch (track) {
			case 'bridge':
				return { label: 'Bridge', color: 'var(--track-bridge)', icon: '🔗' };
			case 'edge':
				return { label: 'Demo', color: 'var(--track-demo)', icon: '⚡' };
			case 'webgpu':
				return { label: 'WebGPU', color: 'var(--track-webgpu)', icon: '🧠' };
			case 'byok':
				return { label: 'API Key', color: 'var(--track-byok)', icon: '🔑' };
			default:
				return null;
		}
	});
</script>

<header class="header">
	<div class="header-left">
		<h1 class="header-title">{i18nStore.t('title')}</h1>
		{#if projectStore.projectName}
			<span class="header-project">{projectStore.projectName}</span>
		{:else}
			<span class="header-subtitle">{i18nStore.t('subtitle')}</span>
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
			<button class="analyze-btn" onclick={() => onanalyze?.()} title="AI Semantic Analysis">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polygon
						points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
					/>
				</svg>
				Analyze
			</button>
		{/if}
		<button class="header-btn" onclick={() => i18nStore.toggleLocale()} title="Toggle Language">
			{i18nStore.locale === 'ko' ? 'EN' : '\uD55C'}
		</button>
		<button
			class="header-btn"
			onclick={() => themeStore.toggle()}
			title="{i18nStore.t(themeStore.current === 'dark' ? 'lightMode' : 'darkMode')} (Ctrl+Shift+D)"
		>
			{themeStore.current === 'dark' ? '\u2600' : '\u263D'}
		</button>
		<button class="header-btn" onclick={onsettings} title="{i18nStore.t('settings')} (?)">
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
		{#if trackInfo}
			<button
				class="track-badge"
				style="--track-color: {trackInfo.color}"
				onclick={onconnect}
				title="AI: {trackInfo.label} (click to change)"
			>
				<span class="track-dot"></span>
				<span class="track-label">{trackInfo.label}</span>
			</button>
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

	.analyze-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		background: var(--accent);
		color: var(--bg-primary);
		border: none;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.analyze-btn:hover {
		opacity: 0.85;
	}

	.track-badge {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		margin-left: 4px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--track-color) 15%, transparent);
		border: 1px solid color-mix(in srgb, var(--track-color) 30%, transparent);
		cursor: pointer;
		transition: background 0.2s;
	}

	.track-badge:hover {
		background: color-mix(in srgb, var(--track-color) 25%, transparent);
	}

	.track-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--track-color);
		flex-shrink: 0;
	}

	.track-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--track-color);
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
