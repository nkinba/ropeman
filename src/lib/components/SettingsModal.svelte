<script lang="ts">
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import { i18nStore } from '$lib/stores/i18nStore.svelte';
	import { projectStore } from '$lib/stores/projectStore.svelte';
	import { clearCache } from '$lib/services/cacheService';
	import { clearSemanticCache, getSemanticCacheSize } from '$lib/services/semanticCacheService';
	import { SYNTAX_THEMES } from '$lib/services/syntaxThemeService';

	const hasProject = $derived(projectStore.fileTree !== null);

	let { open, onclose, onconnect }: { open: boolean; onclose: () => void; onconnect?: () => void } =
		$props();

	let cacheEnabled = $state(settingsStore.cacheEnabled);
	let showSymbols = $state(settingsStore.showSymbols);
	let maxSkeletonKB = $state(settingsStore.maxSkeletonKB);
	let skeletonUnlimited = $state(settingsStore.skeletonUnlimited);
	let lang = $state<'ko' | 'en'>(settingsStore.language);
	let syntaxTheme = $state(settingsStore.syntaxTheme);
	let cacheSize = $state(0);

	$effect(() => {
		if (open) {
			cacheEnabled = settingsStore.cacheEnabled;
			showSymbols = settingsStore.showSymbols;
			maxSkeletonKB = settingsStore.maxSkeletonKB;
			skeletonUnlimited = settingsStore.skeletonUnlimited;
			lang = settingsStore.language;
			syntaxTheme = settingsStore.syntaxTheme;
			getSemanticCacheSize().then((n) => {
				cacheSize = n;
			});
		}
	});

	function handleSkeletonKBChange(e: Event) {
		const v = parseInt((e.target as HTMLInputElement).value) || 150;
		maxSkeletonKB = v;
		settingsStore.maxSkeletonKB = v;
	}

	function handleSkeletonUnlimitedToggle() {
		skeletonUnlimited = !skeletonUnlimited;
		settingsStore.skeletonUnlimited = skeletonUnlimited;
	}

	function handleCacheToggle() {
		cacheEnabled = !cacheEnabled;
		settingsStore.cacheEnabled = cacheEnabled;
	}

	function handleShowSymbolsToggle() {
		showSymbols = !showSymbols;
		settingsStore.showSymbols = showSymbols;
	}

	function handleLangChange(e: Event) {
		lang = (e.target as HTMLSelectElement).value as 'ko' | 'en';
		settingsStore.language = lang;
		i18nStore.locale = lang;
	}

	function handleThemeChange(e: Event) {
		syntaxTheme = (e.target as HTMLSelectElement).value;
		settingsStore.syntaxTheme = syntaxTheme;
	}

	async function handleClearAll() {
		await clearCache();
		await clearSemanticCache();
		settingsStore.clearAll();
		cacheEnabled = true;
		showSymbols = false;
		maxSkeletonKB = 150;
		skeletonUnlimited = false;
		lang = 'ko';
		syntaxTheme = 'tomorrow';
		cacheSize = 0;
		i18nStore.locale = 'ko';
	}

	function handleBackdropClick(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('settings-backdrop')) {
			onclose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-backdrop settings-backdrop"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<div class="modal-card settings-card" role="dialog" aria-modal="true">
			<div class="modal-header">
				<h2>{i18nStore.t('settings')}</h2>
				<button class="modal-close" onclick={onclose}>&#10005;</button>
			</div>

			<div class="modal-body">
				{#if hasProject}
					<section class="settings-section">
						<span class="form-label">AI Connection</span>
						<div class="section-card">
							<button
								class="btn btn-primary"
								onclick={() => {
									onclose();
									onconnect?.();
								}}
							>
								Configure AI
							</button>
						</div>
					</section>
				{/if}

				<section class="settings-section">
					<span class="form-label">Skeleton Size Limit</span>
					<div class="section-card">
						<div class="form-row">
							<label class="checkbox-label">
								<input
									type="checkbox"
									checked={skeletonUnlimited}
									onchange={handleSkeletonUnlimitedToggle}
								/>
								Unlimited
							</label>
						</div>
						{#if !skeletonUnlimited}
							<div class="form-row">
								<input
									type="range"
									class="settings-range"
									min="50"
									max="1000"
									step="50"
									value={maxSkeletonKB}
									oninput={handleSkeletonKBChange}
								/>
								<span class="range-value">{maxSkeletonKB} KB</span>
							</div>
						{/if}
						<p class="hint">
							AI 분석 시 전송되는 코드 스켈레톤 최대 크기. 큰 프로젝트에서 API 오류 발생 시
							줄이세요. (기본: 150KB)
						</p>
					</div>
				</section>

				<section class="settings-section">
					<span class="form-label" id="cache-toggle-label">{i18nStore.t('cacheEnabled')}</span>
					<div class="section-card">
						<div class="form-row">
							<button
								class="toggle"
								class:active={cacheEnabled}
								onclick={handleCacheToggle}
								role="switch"
								aria-checked={cacheEnabled}
								aria-labelledby="cache-toggle-label"
							>
								<span class="toggle-knob"></span>
							</button>
							<span class="cache-size">{cacheSize} entries</span>
						</div>
					</div>
				</section>

				<section class="settings-section">
					<span class="form-label" id="symbols-toggle-label">{i18nStore.t('showSymbols')}</span>
					<div class="section-card">
						<div class="form-row">
							<button
								class="toggle"
								class:active={showSymbols}
								onclick={handleShowSymbolsToggle}
								role="switch"
								aria-checked={showSymbols}
								aria-labelledby="symbols-toggle-label"
							>
								<span class="toggle-knob"></span>
							</button>
						</div>
					</div>
				</section>

				<section class="settings-section">
					<label class="form-label" for="lang-select">Language</label>
					<div class="section-card">
						<select id="lang-select" class="select" value={lang} onchange={handleLangChange}>
							<option value="ko">한국어</option>
							<option value="en">English</option>
						</select>
					</div>
				</section>

				<section class="settings-section">
					<label class="form-label" for="theme-select">{i18nStore.t('codeTheme')}</label>
					<div class="section-card">
						<select
							id="theme-select"
							class="select"
							value={syntaxTheme}
							onchange={handleThemeChange}
						>
							{#each SYNTAX_THEMES as theme}
								<option value={theme.id}
									>{theme.label} ({theme.mode === 'dark' ? 'Dark' : 'Light'})</option
								>
							{/each}
						</select>
					</div>
				</section>

				<section class="settings-section">
					<button class="btn btn-danger" onclick={handleClearAll}>
						{i18nStore.t('clearCache')} & Reset
					</button>
				</section>

				<section class="settings-section shortcuts-section">
					<span class="form-label">{i18nStore.t('shortcuts.title')}</span>
					<div class="shortcut-list">
						<div class="shortcut-row">
							<span class="shortcut-desc">{i18nStore.t('shortcuts.search')}</span>
							<span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>K</kbd></span>
						</div>
						<div class="shortcut-row">
							<span class="shortcut-desc">{i18nStore.t('shortcuts.toggleTheme')}</span>
							<span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd></span>
						</div>
						<div class="shortcut-row">
							<span class="shortcut-desc">{i18nStore.t('shortcuts.toggleView')}</span>
							<span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd></span>
						</div>
						<div class="shortcut-row">
							<span class="shortcut-desc">{i18nStore.t('shortcuts.toggleSidebar')}</span>
							<span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>B</kbd></span>
						</div>
						<div class="shortcut-row">
							<span class="shortcut-desc">{i18nStore.t('shortcuts.exportDiagram')}</span>
							<span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd></span>
						</div>
						<div class="shortcut-row">
							<span class="shortcut-desc">{i18nStore.t('shortcuts.showHelp')}</span>
							<span class="shortcut-keys"><kbd>?</kbd></span>
						</div>
						<div class="shortcut-row">
							<span class="shortcut-desc">{i18nStore.t('shortcuts.closeModal')}</span>
							<span class="shortcut-keys"><kbd>Esc</kbd></span>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
{/if}

<style>
	.settings-card {
		width: 380px;
	}
	.settings-card :global(.modal-header) {
		padding: 20px;
	}
	.settings-card :global(.modal-header h2) {
		font-size: 14px;
		letter-spacing: 0.025em;
	}
	.settings-card :global(.modal-body) {
		padding: 20px;
		gap: 24px;
		max-height: 600px;
		overflow-y: auto;
	}
	.settings-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.section-card {
		background: transparent;
		padding: 0;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.cache-size {
		font-size: 11px;
		color: var(--text-secondary);
	}
	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		color: var(--text-secondary);
		cursor: pointer;
	}
	.checkbox-label input[type='checkbox'] {
		accent-color: var(--accent);
	}
	.settings-range {
		-webkit-appearance: none;
		appearance: none;
		height: 4px;
		background: var(--bg-tertiary, #1b2028);
		border-radius: 2px;
		flex: 1;
	}
	.settings-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		height: 12px;
		width: 12px;
		border-radius: 50%;
		background: var(--accent, #a3a6ff);
		cursor: pointer;
	}
	.range-value {
		font-size: 11px;
		font-family: var(--font-code);
		color: var(--accent);
		min-width: 60px;
		text-align: right;
	}
	/* Settings-specific label override: Stitch 10px uppercase */
	.settings-section :global(.form-label) {
		font-size: 10px;
		font-family: var(--font-display);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #64748b;
		margin-bottom: 4px;
	}
	.settings-section :global(.select) {
		background: var(--bg-bright, var(--bg-tertiary));
		font-size: 11px;
		border: none;
		border-radius: 4px;
		padding: 6px;
	}
	.settings-section :global(.select:focus) {
		box-shadow: 0 0 0 1px var(--accent);
		border: none;
	}
	.settings-section :global(.toggle) {
		width: 32px;
		height: 16px;
		border-radius: 8px;
	}
	.settings-section :global(.toggle-knob) {
		width: 8px;
		height: 8px;
		top: 4px;
		left: 4px;
	}
	.settings-section :global(.toggle.active .toggle-knob) {
		transform: translateX(16px);
	}
	.shortcuts-section {
		padding-top: 16px;
	}
	.shortcut-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.shortcut-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 0;
	}
	.shortcut-desc {
		font-size: 11px;
		color: var(--text-secondary);
	}
	.shortcut-keys {
		display: flex;
		align-items: center;
		gap: 2px;
		font-size: 11px;
		color: var(--text-secondary);
	}
	.shortcut-keys :global(kbd) {
		font-family: var(--font-code);
		color: var(--text-muted);
		background: var(--bg-lowest, #000000);
		padding: 1px 4px;
		border-radius: 4px;
	}
</style>
