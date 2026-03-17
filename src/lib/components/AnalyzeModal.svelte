<script lang="ts">
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import { authStore } from '$lib/stores/authStore.svelte';
	import { webgpuStore } from '$lib/stores/webgpuStore.svelte';
	import { projectStore } from '$lib/stores/projectStore.svelte';
	import { connectBridge, disconnectBridge } from '$lib/services/bridgeService';
	import { AI_PROVIDERS, getProvider, getDefaultModel } from '$lib/data/aiProviders';
	import {
		extractSkeleton,
		estimatePayloadSize,
		formatPayloadPreview
	} from '$lib/services/skeletonExtractor';
	import type { AIProviderId } from '$lib/stores/settingsStore.svelte';
	import WebGPUSetupModal from './WebGPUSetupModal.svelte';

	let {
		open,
		onclose,
		onanalyze
	}: {
		open: boolean;
		onclose: () => void;
		onanalyze: (track: 'edge' | 'byok' | 'bridge' | 'webgpu') => void;
	} = $props();

	type CardId = 'edge' | 'byok' | 'bridge' | 'webgpu';
	let expandedCard = $state<CardId | null>(null);
	let showWebGPUSetup = $state(false);
	let showPreview = $state(false);

	// BYOK state
	let selectedProvider = $state<AIProviderId>(settingsStore.aiProvider);
	let selectedModel = $state(settingsStore.aiModel);
	let testStatus = $state<'idle' | 'testing' | 'success' | 'error'>('idle');
	let testError = $state('');

	// Bridge state
	let bridgePort = $state(authStore.bridgePort);

	const currentProvider = $derived(getProvider(selectedProvider));
	const providerModels = $derived(currentProvider?.models ?? []);
	const apiKeyValue = $derived.by(() => {
		if (selectedProvider === 'google') return settingsStore.geminiApiKey;
		if (selectedProvider === 'anthropic') return settingsStore.anthropicApiKey;
		return '';
	});

	const skeleton = $derived(
		projectStore.fileTree
			? extractSkeleton(projectStore.projectName, projectStore.fileTree, projectStore.astMap)
			: null
	);
	const payloadSize = $derived(skeleton ? estimatePayloadSize(skeleton) : null);
	const payloadPreview = $derived(skeleton ? formatPayloadPreview(skeleton) : '');

	const trackInfo = $derived.by(() => {
		const t = authStore.activeTrack;
		switch (t) {
			case 'bridge':
				return { label: 'Local Bridge', color: '#a6e3a1' };
			case 'edge':
				return { label: 'Demo', color: '#89b4fa' };
			case 'webgpu':
				return { label: 'WebGPU', color: '#cba6f7' };
			case 'byok':
				return { label: 'API Key', color: '#f9e2af' };
			default:
				return null;
		}
	});

	$effect(() => {
		if (open) {
			selectedProvider = settingsStore.aiProvider;
			selectedModel = settingsStore.aiModel;
			testStatus = 'idle';
			bridgePort = authStore.bridgePort;
			expandedCard = null;
		}
	});

	function handleProviderChange(e: Event) {
		const newProvider = (e.target as HTMLSelectElement).value as AIProviderId;
		selectedProvider = newProvider;
		settingsStore.aiProvider = newProvider;
		const defaultModel = getDefaultModel(newProvider);
		selectedModel = defaultModel;
		settingsStore.aiModel = defaultModel;
		testStatus = 'idle';
	}

	function handleModelChange(e: Event) {
		selectedModel = (e.target as HTMLSelectElement).value;
		settingsStore.aiModel = selectedModel;
	}

	function handleApiKeyInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		if (selectedProvider === 'google') settingsStore.geminiApiKey = value;
		else if (selectedProvider === 'anthropic') settingsStore.anthropicApiKey = value;
	}

	async function testKey() {
		const key = apiKeyValue;
		if (!key) return;
		testStatus = 'testing';
		testError = '';
		try {
			if (selectedProvider === 'google') {
				const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`;
				const res = await fetch(`${endpoint}?key=${key}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						contents: [{ parts: [{ text: 'Say "ok"' }] }],
						generationConfig: { maxOutputTokens: 8 }
					})
				});
				testStatus = res.ok ? 'success' : 'error';
				if (!res.ok) {
					const data = await res.json().catch(() => ({}));
					testError =
						(data as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`;
				}
			} else if (selectedProvider === 'anthropic') {
				const { PROXY_URL } = await import('$lib/config');
				const res = await fetch(PROXY_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						provider: 'anthropic',
						apiKey: key,
						model: selectedModel,
						messages: [{ role: 'user', content: 'Say "ok"' }]
					})
				});
				testStatus = res.ok ? 'success' : 'error';
				if (!res.ok) {
					const data = await res.json().catch(() => ({}));
					testError = (data as { error?: string })?.error || `HTTP ${res.status}`;
				}
			}
		} catch (err) {
			testError = (err as Error).message;
			testStatus = 'error';
		}
	}

	async function handleBridgeConnect() {
		try {
			await connectBridge(bridgePort);
		} catch {
			/* handled by authStore */
		}
	}

	function startAnalysis(track: CardId) {
		if (track === 'edge') authStore.edgeEnabled = true;
		else authStore.edgeEnabled = false;
		onanalyze(track);
	}

	function toggleCard(id: CardId) {
		expandedCard = expandedCard === id ? null : id;
	}

	function handleBackdropClick(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('analyze-backdrop')) onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="analyze-backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown}>
		<div class="analyze-card" role="dialog" aria-modal="true">
			<div class="analyze-header">
				<div>
					<h2>AI Architecture Analysis</h2>
					{#if trackInfo}
						<div class="current-track">
							<span class="ct-dot" style="background: {trackInfo.color}"></span>
							<span class="ct-label">Current: {trackInfo.label}</span>
						</div>
					{/if}
				</div>
				<button class="analyze-close" onclick={onclose}>&#10005;</button>
			</div>

			<div class="analyze-body">
				<!-- Edge / Demo -->
				<div class="track-card" class:active={authStore.activeTrack === 'edge'}>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="track-row" onclick={() => toggleCard('edge')}>
						<span class="track-icon">&#9889;</span>
						<div class="track-info">
							<span class="track-name">Demo</span>
							<span class="track-sub">Free &middot; No setup</span>
						</div>
						{#if authStore.activeTrack === 'edge'}
							<span class="active-badge">Active</span>
						{/if}
						<button
							class="start-btn"
							onclick={(e: MouseEvent) => {
								e.stopPropagation();
								startAnalysis('edge');
							}}
						>
							Start
						</button>
					</div>
				</div>

				<!-- BYOK -->
				<div class="track-card" class:active={authStore.activeTrack === 'byok'}>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="track-row" onclick={() => toggleCard('byok')}>
						<span class="track-icon">&#128273;</span>
						<div class="track-info">
							<span class="track-name">API Key (BYOK)</span>
							<span class="track-sub">
								{currentProvider?.label ?? 'Google'} &middot;
								{#if settingsStore.hasApiKey}
									Key set
								{:else}
									Not configured
								{/if}
							</span>
						</div>
						{#if authStore.activeTrack === 'byok'}
							<span class="active-badge">Active</span>
						{/if}
						<span class="expand-arrow" class:expanded={expandedCard === 'byok'}>&#9656;</span>
					</div>
					{#if expandedCard === 'byok'}
						<div class="track-config">
							<label class="cfg-label">Provider</label>
							<select class="cfg-select" value={selectedProvider} onchange={handleProviderChange}>
								{#each AI_PROVIDERS as provider}
									<option value={provider.id}>{provider.label}</option>
								{/each}
							</select>
							<label class="cfg-label">Model</label>
							<select class="cfg-select" value={selectedModel} onchange={handleModelChange}>
								{#each providerModels as model}
									<option value={model.id}>{model.label}</option>
								{/each}
							</select>
							<label class="cfg-label">{currentProvider?.label ?? ''} API Key</label>
							<div class="cfg-row">
								<input
									type="password"
									class="cfg-input"
									placeholder="Enter API key"
									value={apiKeyValue}
									oninput={handleApiKeyInput}
								/>
								<button
									class="cfg-btn"
									onclick={testKey}
									disabled={!apiKeyValue || testStatus === 'testing'}
								>
									{testStatus === 'testing' ? '...' : 'Test'}
								</button>
							</div>
							{#if testStatus === 'success'}
								<span class="cfg-status success">Valid</span>
							{:else if testStatus === 'error'}
								<span class="cfg-status error">{testError || 'Invalid'}</span>
							{/if}
							{#if apiKeyValue}
								<button class="start-btn wide" onclick={() => startAnalysis('byok')}>
									Start with API Key
								</button>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Bridge -->
				<div class="track-card" class:active={authStore.activeTrack === 'bridge'}>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="track-row" onclick={() => toggleCard('bridge')}>
						<span class="track-icon">&#128279;</span>
						<div class="track-info">
							<span class="track-name">Local Bridge</span>
							<span class="track-sub">
								{#if authStore.bridgeStatus === 'connected'}
									Connected
								{:else}
									Disconnected
								{/if}
							</span>
						</div>
						{#if authStore.activeTrack === 'bridge'}
							<span class="active-badge">Active</span>
						{/if}
						<span class="expand-arrow" class:expanded={expandedCard === 'bridge'}>&#9656;</span>
					</div>
					{#if expandedCard === 'bridge'}
						<div class="track-config">
							<label class="cfg-label">Port</label>
							<div class="cfg-row">
								<input
									type="number"
									class="cfg-input"
									value={bridgePort}
									oninput={(e) =>
										(bridgePort = parseInt((e.target as HTMLInputElement).value) || 9876)}
								/>
								{#if authStore.bridgeStatus === 'connected'}
									<button class="cfg-btn danger" onclick={disconnectBridge}>Disconnect</button>
								{:else}
									<button
										class="cfg-btn"
										onclick={handleBridgeConnect}
										disabled={authStore.bridgeStatus === 'connecting'}
									>
										{authStore.bridgeStatus === 'connecting' ? '...' : 'Connect'}
									</button>
								{/if}
							</div>
							<div class="cfg-command">
								<code>npx @ropeman/bridge --port {bridgePort}</code>
							</div>
							{#if authStore.bridgeStatus === 'connected'}
								<button class="start-btn wide" onclick={() => startAnalysis('bridge')}>
									Start with Bridge
								</button>
							{/if}
						</div>
					{/if}
				</div>

				<!-- WebGPU -->
				<div
					class="track-card"
					class:active={authStore.activeTrack === 'webgpu'}
					class:disabled={!webgpuStore.isSupported}
				>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="track-row" onclick={() => webgpuStore.isSupported && toggleCard('webgpu')}>
						<span class="track-icon">&#129504;</span>
						<div class="track-info">
							<span class="track-name">Browser AI <span class="beta-tag">Beta</span></span>
							<span class="track-sub">
								{#if !webgpuStore.isSupported}
									WebGPU not supported
								{:else if webgpuStore.isReady}
									Model loaded
								{:else}
									Not initialized (~900MB download)
								{/if}
							</span>
						</div>
						{#if authStore.activeTrack === 'webgpu'}
							<span class="active-badge">Active</span>
						{/if}
						{#if webgpuStore.isSupported}
							<span class="expand-arrow" class:expanded={expandedCard === 'webgpu'}>&#9656;</span>
						{/if}
					</div>
					{#if expandedCard === 'webgpu' && webgpuStore.isSupported}
						<div class="track-config">
							{#if webgpuStore.isReady}
								<button class="start-btn wide" onclick={() => startAnalysis('webgpu')}>
									Start with WebGPU
								</button>
							{:else}
								<button class="cfg-btn" onclick={() => (showWebGPUSetup = true)}>
									Setup Model
								</button>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Payload Preview -->
				{#if skeleton}
					<div class="preview-section">
						<button class="preview-toggle" onclick={() => (showPreview = !showPreview)}>
							Payload preview
							<span class="toggle-arrow" class:expanded={showPreview}>&#9656;</span>
						</button>
						<div class="preview-meta">
							{#if payloadSize}
								<span class="meta-item">{payloadSize.formatted}</span>
								<span class="meta-sep">&middot;</span>
							{/if}
							<span class="meta-item">{skeleton.totalFiles} files</span>
							<span class="meta-sep">&middot;</span>
							<span class="meta-item">{skeleton.totalSymbols} symbols</span>
							<span class="meta-sep">&middot;</span>
							<span class="meta-item"
								>Limit: {settingsStore.skeletonUnlimited
									? 'Unlimited'
									: settingsStore.maxSkeletonKB + ' KB'}</span
							>
						</div>
						{#if showPreview}
							<pre class="preview-json">{payloadPreview}</pre>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<WebGPUSetupModal open={showWebGPUSetup} onclose={() => (showWebGPUSetup = false)} />

<style>
	.analyze-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.analyze-card {
		background: var(--bg-primary, #1e1e2e);
		border: 1px solid var(--border-color, #333);
		border-radius: 12px;
		width: 520px;
		max-width: 90vw;
		max-height: 85vh;
		overflow-y: auto;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}
	.analyze-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color, #333);
	}
	.analyze-header h2 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		color: var(--text-primary, #cdd6f4);
	}
	.current-track {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 4px;
	}
	.ct-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}
	.ct-label {
		font-size: 11px;
		color: var(--text-secondary, #a6adc8);
	}
	.analyze-close {
		background: none;
		border: none;
		color: var(--text-secondary, #a6adc8);
		font-size: 18px;
		cursor: pointer;
		padding: 4px;
	}
	.analyze-body {
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* Track cards */
	.track-card {
		border: 1px solid var(--border-color, #333);
		border-radius: 10px;
		overflow: hidden;
		transition: border-color 0.2s;
	}
	.track-card:hover:not(.disabled) {
		border-color: var(--text-secondary, #a6adc8);
	}
	.track-card.active {
		border-color: var(--accent-color, #89b4fa);
	}
	.track-card.disabled {
		opacity: 0.5;
	}
	.track-row {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px 14px;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		color: inherit;
	}
	.track-icon {
		font-size: 20px;
		flex-shrink: 0;
		width: 28px;
		text-align: center;
	}
	.track-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.track-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #cdd6f4);
	}
	.track-sub {
		font-size: 11px;
		color: var(--text-secondary, #a6adc8);
		margin-top: 1px;
	}
	.active-badge {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 7px;
		border-radius: 8px;
		background: rgba(137, 180, 250, 0.15);
		color: var(--accent-color, #89b4fa);
		flex-shrink: 0;
	}
	.beta-tag {
		font-size: 10px;
		font-weight: 500;
		padding: 1px 5px;
		border-radius: 6px;
		background: var(--bg-secondary, #181825);
		color: var(--text-secondary, #a6adc8);
		vertical-align: middle;
	}
	.expand-arrow {
		font-size: 12px;
		color: var(--text-secondary, #a6adc8);
		transition: transform 0.2s;
		flex-shrink: 0;
	}
	.expand-arrow.expanded {
		transform: rotate(90deg);
	}
	.start-btn {
		flex-shrink: 0;
		padding: 6px 14px;
		background: var(--accent-color, #89b4fa);
		color: var(--bg-primary, #1e1e2e);
		border: none;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}
	.start-btn:hover {
		opacity: 0.9;
	}
	.start-btn.wide {
		width: 100%;
		padding: 8px;
		font-size: 13px;
	}

	/* Config sections */
	.track-config {
		padding: 10px 14px 14px;
		border-top: 1px solid var(--border-color, #333);
		display: flex;
		flex-direction: column;
		gap: 8px;
		background: var(--bg-secondary, #181825);
	}
	.cfg-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary, #a6adc8);
	}
	.cfg-select,
	.cfg-input {
		padding: 7px 10px;
		background: var(--bg-primary, #1e1e2e);
		border: 1px solid var(--border-color, #333);
		border-radius: 6px;
		color: var(--text-primary, #cdd6f4);
		font-size: 12px;
		outline: none;
	}
	.cfg-select:focus,
	.cfg-input:focus {
		border-color: var(--accent-color, #89b4fa);
	}
	.cfg-row {
		display: flex;
		gap: 6px;
	}
	.cfg-row .cfg-input {
		flex: 1;
	}
	.cfg-btn {
		padding: 7px 12px;
		background: var(--accent-color, #89b4fa);
		color: var(--bg-primary, #1e1e2e);
		border: none;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
	}
	.cfg-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.cfg-btn.danger {
		background: #f38ba8;
	}
	.cfg-status {
		font-size: 11px;
	}
	.cfg-status.success {
		color: #a6e3a1;
	}
	.cfg-status.error {
		color: #f38ba8;
	}
	.cfg-command {
		padding: 6px 10px;
		background: var(--bg-primary, #1e1e2e);
		border: 1px solid var(--border-color, #333);
		border-radius: 6px;
	}
	.cfg-command code {
		font-size: 11px;
		color: #a6e3a1;
		font-family: 'SF Mono', 'Fira Code', monospace;
	}

	/* Preview */
	.preview-section {
		margin-top: 4px;
		border-top: 1px solid var(--border-color, #333);
		padding-top: 10px;
	}
	.preview-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--text-secondary, #a6adc8);
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
	}
	.preview-toggle:hover {
		color: var(--text-primary, #cdd6f4);
	}
	.toggle-arrow {
		font-size: 10px;
		transition: transform 0.2s;
	}
	.toggle-arrow.expanded {
		transform: rotate(90deg);
	}
	.preview-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 6px;
		flex-wrap: wrap;
	}
	.meta-item {
		font-size: 11px;
		color: var(--text-secondary, #a6adc8);
	}
	.meta-sep {
		font-size: 11px;
		color: var(--text-secondary, #a6adc8);
		opacity: 0.4;
	}
	.preview-json {
		background: var(--bg-secondary, #181825);
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 10px;
		line-height: 1.5;
		padding: 10px;
		border-radius: 8px;
		max-height: 200px;
		overflow: auto;
		white-space: pre-wrap;
		word-break: break-all;
		margin-top: 8px;
		color: var(--text-secondary, #a6adc8);
	}
</style>
