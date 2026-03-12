<script lang="ts">
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import { locale, t } from '$lib/stores/i18nStore';
	import { clearCache, getCacheSize } from '$lib/services/cacheService';
	import { SYNTAX_THEMES } from '$lib/services/syntaxThemeService';

	let { open, onclose, onconnect }: { open: boolean; onclose: () => void; onconnect?: () => void } =
		$props();

	let tFunc = $state<(key: string) => string>((key: string) => key);
	$effect(() => {
		const unsub = t.subscribe((fn) => {
			tFunc = fn;
		});
		return () => {
			unsub();
		};
	});

	let cacheEnabled = $state(settingsStore.cacheEnabled);
	let lang = $state<'ko' | 'en'>(settingsStore.language);
	let syntaxTheme = $state(settingsStore.syntaxTheme);
	let cacheSize = $state(0);

	$effect(() => {
		if (open) {
			cacheEnabled = settingsStore.cacheEnabled;
			lang = settingsStore.language;
			syntaxTheme = settingsStore.syntaxTheme;
			getCacheSize().then((n) => {
				cacheSize = n;
			});
		}
	});

	function handleCacheToggle() {
		cacheEnabled = !cacheEnabled;
		settingsStore.cacheEnabled = cacheEnabled;
	}

	function handleLangChange(e: Event) {
		lang = (e.target as HTMLSelectElement).value as 'ko' | 'en';
		settingsStore.language = lang;
		locale.set(lang);
	}

	function handleThemeChange(e: Event) {
		syntaxTheme = (e.target as HTMLSelectElement).value;
		settingsStore.syntaxTheme = syntaxTheme;
	}

	async function handleClearAll() {
		await clearCache();
		settingsStore.clearAll();
		cacheEnabled = true;
		lang = 'ko';
		syntaxTheme = 'tomorrow';
		cacheSize = 0;
		locale.set('ko');
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
	<div class="settings-backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown}>
		<div class="settings-card" role="dialog" aria-modal="true">
			<div class="settings-header">
				<h2>{tFunc('settings')}</h2>
				<button class="settings-close" onclick={onclose}>&#10005;</button>
			</div>

			<div class="settings-body">
				<section class="settings-section">
					<label class="settings-label">AI Connection</label>
					<button
						class="settings-btn"
						onclick={() => {
							onclose();
							onconnect?.();
						}}
					>
						Configure AI
					</button>
				</section>

				<section class="settings-section">
					<label class="settings-label">{tFunc('cacheEnabled')}</label>
					<div class="settings-row">
						<button
							class="settings-toggle"
							class:active={cacheEnabled}
							onclick={handleCacheToggle}
							role="switch"
							aria-checked={cacheEnabled}
						>
							<span class="toggle-knob"></span>
						</button>
						<span class="cache-size">{cacheSize} entries</span>
					</div>
				</section>

				<section class="settings-section">
					<label class="settings-label">Language</label>
					<select class="settings-select" value={lang} onchange={handleLangChange}>
						<option value="ko">한국어</option>
						<option value="en">English</option>
					</select>
				</section>

				<section class="settings-section">
					<label class="settings-label">{tFunc('codeTheme')}</label>
					<select class="settings-select" value={syntaxTheme} onchange={handleThemeChange}>
						{#each SYNTAX_THEMES as theme}
							<option value={theme.id}
								>{theme.label} ({theme.mode === 'dark' ? 'Dark' : 'Light'})</option
							>
						{/each}
					</select>
				</section>

				<section class="settings-section">
					<button class="settings-btn danger" onclick={handleClearAll}>
						{tFunc('clearCache')} & Reset
					</button>
				</section>

				<section class="settings-section shortcuts-section">
					<label class="settings-label">{tFunc('shortcuts.title')}</label>
					<div class="shortcut-list">
						<div class="shortcut-row">
							<span class="shortcut-desc">{tFunc('shortcuts.search')}</span>
							<span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>K</kbd></span>
						</div>
						<div class="shortcut-row">
							<span class="shortcut-desc">{tFunc('shortcuts.toggleTheme')}</span>
							<span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd></span>
						</div>
						<div class="shortcut-row">
							<span class="shortcut-desc">{tFunc('shortcuts.toggleView')}</span>
							<span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd></span>
						</div>
						<div class="shortcut-row">
							<span class="shortcut-desc">{tFunc('shortcuts.toggleSidebar')}</span>
							<span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>B</kbd></span>
						</div>
						<div class="shortcut-row">
							<span class="shortcut-desc">{tFunc('shortcuts.exportDiagram')}</span>
							<span class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd></span>
						</div>
						<div class="shortcut-row">
							<span class="shortcut-desc">{tFunc('shortcuts.showHelp')}</span>
							<span class="shortcut-keys"><kbd>?</kbd></span>
						</div>
						<div class="shortcut-row">
							<span class="shortcut-desc">{tFunc('shortcuts.closeModal')}</span>
							<span class="shortcut-keys"><kbd>Esc</kbd></span>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
{/if}

<style>
	.settings-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.settings-card {
		background: var(--bg-primary, #1e1e2e);
		border: 1px solid var(--border-color, #333);
		border-radius: 12px;
		width: 420px;
		max-width: 90vw;
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}
	.settings-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color, #333);
	}
	.settings-header h2 {
		margin: 0;
		font-size: 16px;
		color: var(--text-primary, #cdd6f4);
	}
	.settings-close {
		background: none;
		border: none;
		color: var(--text-secondary, #a6adc8);
		font-size: 18px;
		cursor: pointer;
		padding: 4px;
	}
	.settings-body {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.settings-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.settings-label {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary, #a6adc8);
	}
	.settings-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.settings-select {
		padding: 8px 12px;
		background: var(--bg-secondary, #181825);
		border: 1px solid var(--border-color, #333);
		border-radius: 6px;
		color: var(--text-primary, #cdd6f4);
		font-size: 13px;
		outline: none;
	}
	.settings-btn {
		padding: 8px 14px;
		background: var(--accent-color, #89b4fa);
		color: var(--bg-primary, #1e1e2e);
		border: none;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
	}
	.settings-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.settings-btn.danger {
		background: #f38ba8;
	}
	.settings-toggle {
		width: 44px;
		height: 24px;
		border-radius: 12px;
		border: none;
		background: var(--bg-tertiary, #313244);
		position: relative;
		cursor: pointer;
		transition: background 0.2s;
		padding: 0;
	}
	.settings-toggle.active {
		background: var(--accent-color, #89b4fa);
	}
	.toggle-knob {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: white;
		transition: transform 0.2s;
	}
	.settings-toggle.active .toggle-knob {
		transform: translateX(20px);
	}
	.cache-size {
		font-size: 12px;
		color: var(--text-secondary, #a6adc8);
	}
	.shortcuts-section {
		border-top: 1px solid var(--border-color, #333);
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
		font-size: 13px;
		color: var(--text-primary, #cdd6f4);
	}
	.shortcut-keys {
		display: flex;
		align-items: center;
		gap: 2px;
		font-size: 12px;
		color: var(--text-secondary, #a6adc8);
	}
	.shortcut-keys :global(kbd) {
		display: inline-block;
		padding: 2px 6px;
		font-size: 11px;
		font-family: inherit;
		color: var(--text-primary, #cdd6f4);
		background: var(--bg-secondary, #181825);
		border: 1px solid var(--border-color, #333);
		border-radius: 4px;
		min-width: 20px;
		text-align: center;
	}
</style>
