<script lang="ts">
	import { projectStore } from '$lib/stores/projectStore.svelte';
	import { graphStore } from '$lib/stores/graphStore.svelte';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import {
		openDirectory,
		readDirectoryRecursive,
		handleFallbackInput,
	} from '$lib/services/fileSystemService';
	import { parseAllFiles } from '$lib/services/parserService';
	import { t } from '$lib/stores/i18nStore';
	import HeroIllustration from './HeroIllustration.svelte';

	let { oncancel, onload }: { oncancel?: () => void; onload?: () => void } = $props();

	const languages = [
		{ name: 'Python', color: '#3572A5' },
		{ name: 'JavaScript', color: '#f1e05a' },
		{ name: 'TypeScript', color: '#3178c6' },
		{ name: 'Java', color: '#b07219' },
		{ name: 'Go', color: '#00ADD8' },
		{ name: 'Rust', color: '#dea584' },
		{ name: 'C/C++', color: '#555555' },
		{ name: 'Ruby', color: '#701516' },
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
				error = 'Drag & drop directory reading requires a Chromium browser. Please use the "Open Directory" button instead.';
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
			await parseAllFiles(tree);
		} catch (err) {
			error = `Failed to process files: ${err}`;
			projectStore.isLoading = false;
		}
	}

	async function loadFromDirectoryHandle(dirHandle: FileSystemDirectoryHandle) {
		onload?.();
		resetStores();
		projectStore.isLoading = true;
		projectStore.projectName = dirHandle.name;

		const tree = await readDirectoryRecursive(dirHandle);
		projectStore.fileTree = tree;

		await parseAllFiles(tree);
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
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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
						<h1>{$t('landing.headline')}</h1>
						<p class="hero-sub">{$t('landing.subheadline')}</p>
						<button class="cta-btn" onclick={handleOpenDirectory}>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
							</svg>
							{$t('landing.cta')}
						</button>
						<p class="drag-hint">{$t('landing.dragHint')}</p>
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
							<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.4V11h3a3 3 0 0 1 3 3v1.6c1.2.6 2 1.9 2 3.4a4 4 0 0 1-8 0c0-1.5.8-2.8 2-3.4V14a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v1.6c1.2.6 2 1.9 2 3.4a4 4 0 0 1-8 0c0-1.5.8-2.8 2-3.4V14a3 3 0 0 1 3-3h3V9.4C7.8 8.8 7 7.5 7 6a4 4 0 0 1 5-3.9"/>
							</svg>
						</div>
						<h3>{$t('landing.featureAiTitle')}</h3>
						<p>{$t('landing.featureAiDesc')}</p>
					</div>
					<div class="feature-card">
						<div class="feature-icon">
							<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<rect x="3" y="3" width="18" height="18" rx="2"/>
								<rect x="7" y="7" width="10" height="10" rx="1"/>
								<rect x="10" y="10" width="4" height="4" rx="0.5"/>
							</svg>
						</div>
						<h3>{$t('landing.featureDrillTitle')}</h3>
						<p>{$t('landing.featureDrillDesc')}</p>
					</div>
					<div class="feature-card">
						<div class="feature-icon">
							<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
								<polyline points="9 12 11 14 15 10"/>
							</svg>
						</div>
						<h3>{$t('landing.featureBrowserTitle')}</h3>
						<p>{$t('landing.featureBrowserDesc')}</p>
					</div>
				</section>

				<section class="landing-languages">
					{#each languages as lang}
						<span class="lang-pill">
							<span class="lang-dot" style="background:{lang.color}"></span>
							{lang.name}
						</span>
					{/each}
				</section>
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
		align-items: flex-start;
		justify-content: center;
		position: relative;
		border: 2px dashed var(--border);
		margin: 24px;
		border-radius: 16px;
		transition: all 0.2s ease;
		cursor: pointer;
		overflow-y: auto;
		padding: 40px 24px;
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
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 5%, transparent);
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
		gap: 40px;
		align-items: center;
		margin-bottom: 48px;
	}

	.hero-text h1 {
		font-size: 28px;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.3;
		margin-bottom: 12px;
	}

	.hero-sub {
		font-size: 15px;
		line-height: 1.6;
		color: var(--text-secondary);
		margin-bottom: 24px;
	}

	.cta-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 12px 28px;
		background: var(--accent);
		color: white;
		border-radius: 10px;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s ease, transform 0.15s ease;
	}

	.cta-btn:hover {
		background: var(--accent-hover);
		transform: translateY(-1px);
	}

	.drag-hint {
		margin-top: 12px;
		font-size: 13px;
		color: var(--text-muted);
	}

	.hero-visual {
		display: flex;
		justify-content: center;
	}

	/* Feature cards */
	.landing-features {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
		margin-bottom: 36px;
	}

	.feature-card {
		background: var(--landing-card-bg);
		border: 1px solid var(--landing-card-border);
		border-radius: 12px;
		padding: 24px 20px;
		text-align: left;
	}

	.feature-icon {
		margin-bottom: 12px;
	}

	.feature-card h3 {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 6px;
	}

	.feature-card p {
		font-size: 13px;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	/* Language pills */
	.landing-languages {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 12px;
	}

	.lang-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		font-size: 13px;
		color: var(--text-secondary);
		background: var(--landing-card-bg);
		border: 1px solid var(--landing-card-border);
		border-radius: 20px;
	}

	.lang-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.error-msg {
		margin-top: 12px;
		color: #e53e3e;
		font-size: 13px;
	}

	/* Loading state */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		text-align: center;
		margin-top: 120px;
	}

	.loading-state h2 {
		font-size: 20px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.progress {
		font-size: 14px;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Responsive */
	@media (max-width: 720px) {
		.landing-hero {
			grid-template-columns: 1fr;
			text-align: center;
		}

		.hero-visual {
			order: -1;
		}

		.landing-features {
			grid-template-columns: 1fr;
		}
	}
</style>
