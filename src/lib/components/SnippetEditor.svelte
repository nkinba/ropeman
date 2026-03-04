<script lang="ts">
	import { projectStore } from '$lib/stores/projectStore.svelte';
	import { graphStore } from '$lib/stores/graphStore.svelte';
	import { selectionStore } from '$lib/stores/selectionStore.svelte';
	import { authStore } from '$lib/stores/authStore.svelte';
	import { parseAllFiles } from '$lib/services/parserService';
	import { analyzeTopLevel } from '$lib/services/semanticAnalysisService';
	import { detectLanguage } from '$lib/utils/languageDetector';
	import { t } from '$lib/stores/i18nStore';
	import {
		SNIPPET_PRESETS,
		LANGUAGE_COLORS,
		LANGUAGE_EXTENSIONS,
		type SnippetPreset
	} from '$lib/data/snippetPresets';
	import type { FileNode } from '$lib/types/fileTree';

	let { oncancel, onload }: { oncancel?: () => void; onload?: () => void } = $props();

	let code = $state('');
	let language = $state('python');
	let error = $state('');

	const supportedLanguages = [
		{ id: 'python', label: 'Python' },
		{ id: 'javascript', label: 'JavaScript' },
		{ id: 'typescript', label: 'TypeScript' }
	];

	function loadPreset(preset: SnippetPreset) {
		code = preset.code;
		language = preset.language;
	}

	function resetStores() {
		projectStore.reset();
		graphStore.clear();
		selectionStore.clear();
	}

	async function handleAnalyze() {
		if (!code.trim()) {
			error = $t('snippet.emptyError');
			return;
		}
		error = '';

		const ext = LANGUAGE_EXTENSIONS[language] ?? '.txt';
		const filename = `snippet${ext}`;

		const fileNode: FileNode = {
			name: filename,
			path: filename,
			kind: 'file',
			language,
			size: code.length,
			handle: {
				kind: 'file' as const,
				name: filename,
				getFile: () => Promise.resolve(new File([code], filename))
			} as unknown as FileSystemFileHandle
		};

		const tree: FileNode = {
			name: 'snippet',
			path: '',
			kind: 'directory',
			children: [fileNode]
		};

		try {
			onload?.();
			resetStores();
			projectStore.projectName = 'snippet';
			projectStore.fileTree = tree;
			projectStore.isLoading = true;
			projectStore.isSnippetMode = true;
			await parseAllFiles(tree);
			// Auto-trigger semantic analysis if AI is connected
			if (authStore.isReady) {
				analyzeTopLevel();
			}
		} catch (err) {
			error = `Failed to analyze snippet: ${err}`;
			projectStore.isLoading = false;
		}
	}

	const lineCount = $derived(code.split('\n').length);
</script>

<section class="snippet-section">
	<div class="snippet-divider">
		<span class="divider-line"></span>
		<span class="divider-text">{$t('snippet.divider')}</span>
		<span class="divider-line"></span>
	</div>

	<div class="preset-row">
		{#each SNIPPET_PRESETS as preset}
			<button
				class="preset-card"
				class:active={code === preset.code && language === preset.language}
				onclick={() => loadPreset(preset)}
			>
				<span class="preset-dot" style="background:{LANGUAGE_COLORS[preset.language] ?? '#888'}"
				></span>
				<span class="preset-info">
					<span class="preset-name">{preset.name}</span>
					<span class="preset-desc">{preset.description}</span>
				</span>
			</button>
		{/each}
	</div>

	<div class="editor-area">
		<div class="editor-toolbar">
			<select class="lang-select" bind:value={language}>
				{#each supportedLanguages as lang}
					<option value={lang.id}>{lang.label}</option>
				{/each}
			</select>
			<span class="line-info">{lineCount} {$t('snippet.lines')}</span>
		</div>
		<div class="editor-wrapper">
			<div class="line-numbers" aria-hidden="true">
				{#each { length: lineCount } as _, i}
					<span>{i + 1}</span>
				{/each}
			</div>
			<textarea
				class="code-textarea"
				bind:value={code}
				placeholder={$t('snippet.placeholder')}
				spellcheck="false"
				autocomplete="off"
				autocapitalize="off"
			></textarea>
		</div>
	</div>

	{#if error}
		<p class="error-msg">{error}</p>
	{/if}

	<button class="analyze-btn" onclick={handleAnalyze} disabled={!code.trim()}>
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
			<polygon points="5 3 19 12 5 21 5 3" />
		</svg>
		{$t('snippet.analyze')}
	</button>
</section>

<style>
	.snippet-section {
		margin-top: 32px;
	}

	.snippet-divider {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 24px;
	}

	.divider-line {
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	.divider-text {
		font-size: 13px;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.preset-row {
		display: flex;
		gap: 10px;
		margin-bottom: 16px;
		flex-wrap: wrap;
	}

	.preset-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		background: var(--landing-card-bg);
		border: 1px solid var(--landing-card-border);
		border-radius: 10px;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
		text-align: left;
	}

	.preset-card:hover {
		border-color: var(--text-muted);
	}

	.preset-card.active {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 8%, var(--landing-card-bg));
	}

	.preset-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.preset-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.preset-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.preset-desc {
		font-size: 11px;
		color: var(--text-muted);
	}

	.editor-area {
		border: 1px solid var(--border);
		border-radius: 10px;
		overflow: hidden;
		background: var(--bg-primary);
	}

	.editor-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 12px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border);
	}

	.lang-select {
		background: var(--bg-primary);
		color: var(--text-primary);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 4px 8px;
		font-size: 12px;
		cursor: pointer;
	}

	.line-info {
		font-size: 11px;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.editor-wrapper {
		display: flex;
		min-height: 200px;
		max-height: 400px;
		overflow: auto;
	}

	.line-numbers {
		display: flex;
		flex-direction: column;
		padding: 12px 0;
		min-width: 40px;
		text-align: right;
		user-select: none;
		border-right: 1px solid var(--border);
		background: var(--bg-secondary);
	}

	.line-numbers span {
		display: block;
		padding: 0 8px;
		font-size: 12px;
		line-height: 20px;
		color: var(--text-muted);
		font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
	}

	.code-textarea {
		flex: 1;
		padding: 12px;
		font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
		font-size: 12px;
		line-height: 20px;
		color: var(--text-primary);
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		tab-size: 4;
		white-space: pre;
		overflow: hidden;
	}

	.code-textarea::placeholder {
		color: var(--text-muted);
	}

	.error-msg {
		margin-top: 8px;
		color: #e53e3e;
		font-size: 13px;
	}

	.analyze-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 12px;
		padding: 10px 24px;
		background: var(--accent);
		color: white;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.2s ease,
			transform 0.15s ease,
			opacity 0.2s ease;
	}

	.analyze-btn:hover:not(:disabled) {
		background: var(--accent-hover);
		transform: translateY(-1px);
	}

	.analyze-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 720px) {
		.preset-row {
			flex-direction: column;
		}
	}
</style>
