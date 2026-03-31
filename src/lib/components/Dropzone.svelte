<script lang="ts">
	import { projectStore } from '$lib/stores/projectStore.svelte';
	import { graphStore } from '$lib/stores/graphStore.svelte';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import { semanticStore } from '$lib/stores/semanticStore.svelte';
	import {
		openDirectory,
		readDirectoryRecursive,
		handleFallbackInput
	} from '$lib/services/fileSystemService';
	import { parseAllFiles } from '$lib/services/parserService';
	import { i18nStore } from '$lib/stores/i18nStore.svelte';
	import HeroIllustration from './HeroIllustration.svelte';
	import SnippetEditor from './SnippetEditor.svelte';

	let { oncancel, onload }: { oncancel?: () => void; onload?: () => void } = $props();

	const languages = [
		{ name: 'Python', color: '#3572A5' },
		{ name: 'JavaScript', color: '#f1e05a' },
		{ name: 'TypeScript', color: '#3178c6' },
		{ name: 'Java', color: '#b07219' },
		{ name: 'Go', color: '#00ADD8' },
		{ name: 'Rust', color: '#dea584' },
		{ name: 'C/C++', color: '#555555' },
		{ name: 'Ruby', color: '#701516' }
	];

	let isDragOver = $state(false);
	let error = $state('');
	let fallbackInput = $state<HTMLInputElement>(null!);

	const supportsDirectoryPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave() {
		isDragOver = false;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		error = '';

		try {
			const items = e.dataTransfer?.items;
			if (!items || items.length === 0) return;

			const item = items[0];

			// Try File System Access API (Chromium)
			if ('getAsFileSystemHandle' in item) {
				const handle = await (item as any).getAsFileSystemHandle();
				if (handle?.kind === 'directory') {
					await loadFromDirectoryHandle(handle as FileSystemDirectoryHandle);
					return;
				}
			}

			// Fallback: check for files via webkitGetAsEntry
			const entry = item.webkitGetAsEntry?.();
			if (entry?.isDirectory) {
				error =
					'Drag & drop directory reading requires a Chromium browser. Please use the "Open Directory" button instead.';
				return;
			}

			error = 'Please drop a folder, not individual files.';
		} catch (err) {
			error = `Failed to read directory: ${err}`;
		}
	}

	async function handleOpenDirectory() {
		error = '';

		if (supportsDirectoryPicker) {
			try {
				const dirHandle = await openDirectory();
				await loadFromDirectoryHandle(dirHandle);
			} catch (err: any) {
				if (err.name !== 'AbortError') {
					error = `Failed to open directory: ${err.message}`;
				}
			}
		} else {
			// Trigger fallback file input
			fallbackInput?.click();
		}
	}

	function resetStores() {
		projectStore.reset();
		graphStore.clear();
		selectionStore.clear();
		semanticStore.clear();
	}

	async function handleFallbackFiles(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		error = '';
		try {
			resetStores();
			const tree = handleFallbackInput(input.files);
			projectStore.projectName = tree.name;
			projectStore.fileTree = tree;
			projectStore.isLoading = true;
			const astMap = await parseAllFiles(tree, projectStore.astMap, (progress) => {
				projectStore.parsingProgress = progress;
			});
			projectStore.astMap = astMap;
			projectStore.isLoading = false;
		} catch (err) {
			error = `Failed to process files: ${err}`;
			projectStore.isLoading = false;
		}
	}

	async function loadFromDirectoryHandle(dirHandle: FileSystemDirectoryHandle) {
		resetStores();
		projectStore.isLoading = true;
		projectStore.projectName = dirHandle.name;
		onload?.();

		const tree = await readDirectoryRecursive(dirHandle);
		projectStore.fileTree = tree;

		const astMap = await parseAllFiles(tree, projectStore.astMap, (progress) => {
			projectStore.parsingProgress = progress;
		});
		projectStore.astMap = astMap;
		projectStore.isLoading = false;
	}
</script>

<div
	class="dropzone"
	class:dragover={isDragOver}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	role="button"
	tabindex="0"
>
	{#if oncancel}
		<button class="dropzone-close" onclick={oncancel} title="Cancel">
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
	{/if}
	<div class="dropzone-content">
		{#if projectStore.isLoading}
			<div class="loading-state">
				<div class="spinner"></div>
				<h2>Parsing project...</h2>
				{#if projectStore.parsingProgress.total > 0}
					<p class="progress">
						{projectStore.parsingProgress.done} / {projectStore.parsingProgress.total} files
					</p>
				{/if}
			</div>
		{:else}
			<div class="landing">
				<section class="landing-hero">
					<div class="hero-text">
						<h1>{i18nStore.t('landing.headline')}</h1>
						<p class="hero-sub">{i18nStore.t('landing.subheadline')}</p>
						<button class="cta-btn" onclick={handleOpenDirectory}>
							<!-- folder_open material icon -->
							<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"
								/>
							</svg>
							{i18nStore.t('landing.cta')}
						</button>
						<p class="drag-hint">{i18nStore.t('landing.dragHint')}</p>
						{#if error}
							<p class="error-msg">{error}</p>
						{/if}
					</div>
					<div class="hero-visual">
						<HeroIllustration />
					</div>
				</section>

				<section class="landing-features">
					<div class="feature-card">
						<div class="feature-icon">
							<!-- smart_toy icon -->
							<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"
								/>
							</svg>
						</div>
						<h3>{i18nStore.t('landing.featureAiTitle')}</h3>
						<p>{i18nStore.t('landing.featureAiDesc')}</p>
					</div>
					<div class="feature-card">
						<div class="feature-icon">
							<!-- account_tree icon -->
							<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3h7zM7 9H4V5h3v4zm10 6h3v4h-3v-4zm0-10h3v4h-3V5z"
								/>
							</svg>
						</div>
						<h3>{i18nStore.t('landing.featureDrillTitle')}</h3>
						<p>{i18nStore.t('landing.featureDrillDesc')}</p>
					</div>
					<div class="feature-card">
						<div class="feature-icon">
							<!-- security icon -->
							<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"
								/>
							</svg>
						</div>
						<h3>{i18nStore.t('landing.featureBrowserTitle')}</h3>
						<p>{i18nStore.t('landing.featureBrowserDesc')}</p>
					</div>
				</section>

				<section class="landing-languages">
					<span class="languages-label">Supported Languages</span>
					<div class="languages-pills">
						{#each languages as lang}
							<span class="lang-pill">
								<span class="lang-dot" style="background:{lang.color}"></span>
								{lang.name}
							</span>
						{/each}
					</div>
				</section>

				<SnippetEditor {oncancel} {onload} />
			</div>
		{/if}
	</div>
</div>

<!-- Hidden fallback input for non-Chromium browsers -->
{#if !supportsDirectoryPicker}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<input
		bind:this={fallbackInput}
		type="file"
		webkitdirectory
		multiple
		hidden
		onchange={handleFallbackFiles}
	/>
{/if}

<style>
	.dropzone {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		border: none;
		background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%23a3a6ff44' stroke-width='2' stroke-dasharray='8%2c 8' stroke-linecap='square'/%3e%3c/svg%3e");
		margin: 24px;
		border-radius: 16px;
		padding: 48px;
		transition: all 0.2s ease;
		cursor: pointer;
		overflow-y: auto;
		background-color: var(--bg-primary);
	}

	.dropzone-close {
		position: absolute;
		top: 16px;
		right: 16px;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		color: var(--text-secondary);
		cursor: pointer;
		z-index: 1;
	}

	.dropzone-close:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.dropzone.dragover {
		background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%23a3a6ff' stroke-width='2' stroke-dasharray='8%2c 8' stroke-linecap='square'/%3e%3c/svg%3e");
		background-color: color-mix(in srgb, var(--accent) 5%, transparent);
	}

	.dropzone-content {
		width: 100%;
		max-width: var(--landing-max-width);
		color: var(--text-secondary);
	}

	/* Landing layout */
	.landing {
		animation: fadeInUp 0.5s ease both;
	}

	.landing-hero {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 48px;
		align-items: center;
		min-height: 500px;
		margin-bottom: 48px;
	}

	.hero-text h1 {
		font-family: var(--font-display);
		font-size: 48px;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.25;
		margin-bottom: 0;
	}

	.hero-sub {
		font-family: var(--font-body);
		font-size: 18px;
		line-height: 1.625;
		color: var(--text-secondary);
		max-width: 448px;
		margin-top: 16px;
		margin-bottom: 32px;
	}

	.cta-btn {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		padding: 16px 32px;
		background: var(--accent);
		color: #0f141a;
		border-radius: 8px;
		font-family: var(--font-display);
		font-size: 18px;
		font-weight: 700;
		cursor: pointer;
		box-shadow:
			0 10px 15px -3px rgba(163, 166, 255, 0.2),
			0 4px 6px -4px rgba(163, 166, 255, 0.2);
		transition: all 0.15s ease;
	}

	.cta-btn:hover {
		opacity: 0.9;
	}

	.cta-btn:active {
		transform: scale(0.98);
	}

	.drag-hint {
		margin-top: 16px;
		margin-left: 8px;
		font-family: var(--font-code);
		font-size: 14px;
		color: var(--text-muted);
	}

	.hero-visual {
		display: flex;
		justify-content: center;
	}

	/* Feature cards */
	.landing-features {
		display: flex;
		gap: 24px;
		margin-top: 48px;
		margin-bottom: 80px;
	}

	.feature-card {
		flex: 1;
		background: var(--bg-secondary);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		padding: 32px;
		text-align: left;
		transition: border-color 0.2s ease;
	}

	.feature-card:nth-child(1):hover {
		border-color: rgba(163, 166, 255, 0.3);
	}

	.feature-card:nth-child(2):hover {
		border-color: rgba(83, 221, 252, 0.3);
	}

	.feature-card:nth-child(3):hover {
		border-color: rgba(172, 138, 255, 0.3);
	}

	.feature-icon {
		margin-bottom: 16px;
		font-size: 30px;
	}

	.feature-card:nth-child(1) .feature-icon {
		color: var(--accent, #a3a6ff);
	}

	.feature-card:nth-child(2) .feature-icon {
		color: var(--accent-secondary, #53ddfc);
	}

	.feature-card:nth-child(3) .feature-icon {
		color: var(--accent-tertiary, #ac8aff);
	}

	.feature-icon svg {
		width: 30px;
		height: 30px;
	}

	.feature-card h3 {
		font-family: var(--font-display);
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 8px;
	}

	.feature-card p {
		font-family: var(--font-body);
		font-size: 14px;
		line-height: 1.625;
		color: var(--text-secondary);
	}

	/* Language pills */
	.landing-languages {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 24px;
		padding-bottom: 96px;
	}

	.languages-label {
		font-family: var(--font-display);
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #4b5563;
		margin-bottom: 24px;
	}

	.languages-pills {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
	}

	.lang-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 16px;
		font-family: var(--font-body);
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 9999px;
	}

	.lang-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.error-msg {
		margin-top: 12px;
		color: var(--color-error, #e53e3e);
		font-size: 13px;
	}

	/* Loading state */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		text-align: center;
	}

	.loading-state h2 {
		font-size: 14px;
		font-family: var(--font-display);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: white;
	}

	.progress {
		font-family: var(--font-code);
		font-size: 12px;
		color: rgba(163, 166, 255, 0.7);
		font-variant-numeric: tabular-nums;
	}

	.spinner {
		width: 64px;
		height: 64px;
		border: 2px solid rgba(163, 166, 255, 0.1);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Responsive */
	@media (max-width: 720px) {
		.dropzone {
			padding: 24px 16px;
		}

		.landing-hero {
			grid-template-columns: 1fr;
			text-align: center;
		}

		.hero-sub {
			max-width: none;
		}

		.hero-visual {
			order: -1;
		}

		.landing-features {
			flex-direction: column;
		}
	}
</style>
