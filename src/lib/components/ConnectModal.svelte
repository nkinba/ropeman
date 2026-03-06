<script lang="ts">
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import { authStore } from '$lib/stores/authStore.svelte';
	import { connectBridge, disconnectBridge } from '$lib/services/bridgeService';
	import { AI_PROVIDERS, getProvider, getDefaultModel } from '$lib/data/aiProviders';
	import type { AIProviderId } from '$lib/stores/settingsStore.svelte';

	let { open, onclose }: { open: boolean; onclose: () => void } = $props();

	let activeTab = $state<'byok' | 'bridge'>('byok');
	let testStatus = $state<'idle' | 'testing' | 'success' | 'error'>('idle');
	let testError = $state('');
	let bridgePort = $state(authStore.bridgePort);

	// Provider/model selection
	let selectedProvider = $state<AIProviderId>(settingsStore.aiProvider);
	let selectedModel = $state(settingsStore.aiModel);

	const currentProvider = $derived(getProvider(selectedProvider));
	const providerModels = $derived(currentProvider?.models ?? []);
	const requiresBridge = $derived(currentProvider?.requiresBridge ?? false);

	// API key based on selected provider
	const apiKeyValue = $derived.by(() => {
		if (selectedProvider === 'google') return settingsStore.geminiApiKey;
		if (selectedProvider === 'anthropic') return settingsStore.anthropicApiKey;
		return '';
	});

	$effect(() => {
		if (open) {
			selectedProvider = settingsStore.aiProvider;
			selectedModel = settingsStore.aiModel;
			testStatus = 'idle';
			bridgePort = authStore.bridgePort;
		}
	});

	function handleProviderChange(e: Event) {
		const newProvider = (e.target as HTMLSelectElement).value as AIProviderId;
		selectedProvider = newProvider;
		settingsStore.aiProvider = newProvider;
		// Auto-select default model for new provider
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
		if (selectedProvider === 'google') {
			settingsStore.geminiApiKey = value;
		} else if (selectedProvider === 'anthropic') {
			settingsStore.anthropicApiKey = value;
		}
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
				if (res.ok) {
					testStatus = 'success';
				} else {
					const data = await res.json().catch(() => ({}));
					testError =
						(data as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`;
					testStatus = 'error';
				}
			} else if (selectedProvider === 'anthropic') {
				// Anthropic has CORS restrictions for browser direct calls
				testError =
					'Anthropic API cannot be called directly from the browser due to CORS. Use Local Bridge mode instead.';
				testStatus = 'error';
			}
		} catch (err) {
			testError = (err as Error).message;
			testStatus = 'error';
		}
	}

	async function handleConnect() {
		try {
			await connectBridge(bridgePort);
		} catch {
			// error is handled by authStore
		}
	}

	function handleDisconnect() {
		disconnectBridge();
	}

	function handleBridgePortInput(e: Event) {
		bridgePort = parseInt((e.target as HTMLInputElement).value) || 9876;
	}

	function handleBackdropClick(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('connect-backdrop')) {
			onclose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function copyCommand() {
		navigator.clipboard.writeText(`npx @ropeman/bridge --port ${bridgePort}`);
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="connect-backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown}>
		<div class="connect-card" role="dialog" aria-modal="true">
			<div class="connect-header">
				<h2>AI Connection</h2>
				<button class="connect-close" onclick={onclose}>&#10005;</button>
			</div>

			<div class="connect-tabs">
				<button
					class="connect-tab"
					class:active={activeTab === 'byok'}
					onclick={() => (activeTab = 'byok')}
				>
					API Key
				</button>
				<button
					class="connect-tab"
					class:active={activeTab === 'bridge'}
					onclick={() => (activeTab = 'bridge')}
				>
					Local Bridge
				</button>
			</div>

			<div class="connect-body">
				{#if activeTab === 'byok'}
					<section class="connect-section">
						<!-- Provider Selection -->
						<label class="connect-label">Provider</label>
						<select class="connect-select" value={selectedProvider} onchange={handleProviderChange}>
							{#each AI_PROVIDERS as provider}
								<option value={provider.id}>{provider.label}</option>
							{/each}
						</select>

						<!-- Model Selection -->
						<label class="connect-label">Model</label>
						<select class="connect-select" value={selectedModel} onchange={handleModelChange}>
							{#each providerModels as model}
								<option value={model.id}>{model.label}</option>
							{/each}
						</select>

						{#if requiresBridge}
							<div class="bridge-notice">
								<span class="notice-icon">&#9888;</span>
								<span class="notice-text">
									{currentProvider?.label} API cannot be called directly from the browser due to CORS
									restrictions. Please use the
									<button class="notice-link" onclick={() => (activeTab = 'bridge')}
										>Local Bridge</button
									> mode instead.
								</span>
							</div>
						{:else}
							<!-- API Key Input -->
							<label class="connect-label">{currentProvider?.label ?? ''} API Key</label>
							<div class="connect-row">
								<input
									type="password"
									class="connect-input"
									placeholder="Enter API key"
									value={apiKeyValue}
									oninput={handleApiKeyInput}
								/>
								<button
									class="connect-btn"
									onclick={testKey}
									disabled={!apiKeyValue || testStatus === 'testing'}
								>
									{testStatus === 'testing' ? '...' : 'Test'}
								</button>
							</div>
							{#if testStatus === 'success'}
								<span class="connect-status success">Valid key</span>
							{:else if testStatus === 'error'}
								<span class="connect-status error">{testError || 'Invalid key'}</span>
							{/if}
							<p class="connect-hint">
								Your API key is stored locally and never sent to our servers.
							</p>
						{/if}
					</section>
				{:else}
					<section class="connect-section">
						<label class="connect-label">Bridge Port</label>
						<div class="connect-row">
							<input
								type="number"
								class="connect-input"
								value={bridgePort}
								oninput={handleBridgePortInput}
							/>
							{#if authStore.bridgeStatus === 'connected'}
								<button class="connect-btn danger" onclick={handleDisconnect}>Disconnect</button>
							{:else}
								<button
									class="connect-btn"
									onclick={handleConnect}
									disabled={authStore.bridgeStatus === 'connecting'}
								>
									{authStore.bridgeStatus === 'connecting' ? 'Connecting...' : 'Connect'}
								</button>
							{/if}
						</div>

						<div class="bridge-status">
							{#if authStore.bridgeStatus === 'connected'}
								<span class="status-dot connected"></span>
								<span class="status-text">Connected</span>
							{:else if authStore.bridgeStatus === 'connecting'}
								<span class="status-dot connecting"></span>
								<span class="status-text">Connecting...</span>
							{:else if authStore.bridgeStatus === 'reconnecting'}
								<span class="status-dot connecting"></span>
								<span class="status-text">Reconnecting...</span>
							{:else if authStore.bridgeStatus === 'error'}
								<span class="status-dot error"></span>
								<span class="status-text">{authStore.bridgeError || 'Connection failed'}</span>
							{:else}
								<span class="status-dot"></span>
								<span class="status-text">Disconnected</span>
							{/if}
						</div>

						<div class="command-block">
							<code>npx @ropeman/bridge --port {bridgePort}</code>
							<button class="copy-btn" onclick={copyCommand} title="Copy">
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
									<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
								</svg>
							</button>
						</div>
						<p class="connect-hint">
							Run this command in your terminal to start the local bridge server.
						</p>
					</section>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.connect-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.connect-card {
		background: var(--bg-primary, #1e1e2e);
		border: 1px solid var(--border-color, #333);
		border-radius: 12px;
		width: 440px;
		max-width: 90vw;
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}
	.connect-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color, #333);
	}
	.connect-header h2 {
		margin: 0;
		font-size: 16px;
		color: var(--text-primary, #cdd6f4);
	}
	.connect-close {
		background: none;
		border: none;
		color: var(--text-secondary, #a6adc8);
		font-size: 18px;
		cursor: pointer;
		padding: 4px;
	}
	.connect-tabs {
		display: flex;
		border-bottom: 1px solid var(--border-color, #333);
	}
	.connect-tab {
		flex: 1;
		padding: 10px;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--text-secondary, #a6adc8);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}
	.connect-tab.active {
		color: var(--accent-color, #89b4fa);
		border-bottom-color: var(--accent-color, #89b4fa);
	}
	.connect-body {
		padding: 20px;
	}
	.connect-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.connect-label {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary, #a6adc8);
	}
	.connect-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.connect-input {
		flex: 1;
		padding: 8px 12px;
		background: var(--bg-secondary, #181825);
		border: 1px solid var(--border-color, #333);
		border-radius: 6px;
		color: var(--text-primary, #cdd6f4);
		font-size: 13px;
		outline: none;
	}
	.connect-input:focus {
		border-color: var(--accent-color, #89b4fa);
	}
	.connect-select {
		padding: 8px 12px;
		background: var(--bg-secondary, #181825);
		border: 1px solid var(--border-color, #333);
		border-radius: 6px;
		color: var(--text-primary, #cdd6f4);
		font-size: 13px;
		outline: none;
		cursor: pointer;
	}
	.connect-select:focus {
		border-color: var(--accent-color, #89b4fa);
	}
	.connect-btn {
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
	.connect-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.connect-btn.danger {
		background: #f38ba8;
	}
	.connect-status {
		font-size: 12px;
	}
	.connect-status.success {
		color: #a6e3a1;
	}
	.connect-status.error {
		color: #f38ba8;
	}
	.connect-hint {
		font-size: 11px;
		color: var(--text-secondary, #a6adc8);
		margin: 0;
		opacity: 0.7;
	}
	.bridge-notice {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 10px 12px;
		background: rgba(249, 226, 175, 0.08);
		border: 1px solid rgba(249, 226, 175, 0.2);
		border-radius: 6px;
	}
	.notice-icon {
		font-size: 16px;
		flex-shrink: 0;
		color: #f9e2af;
	}
	.notice-text {
		font-size: 12px;
		color: var(--text-secondary, #a6adc8);
		line-height: 1.5;
	}
	.notice-link {
		background: none;
		border: none;
		color: var(--accent-color, #89b4fa);
		cursor: pointer;
		padding: 0;
		font-size: 12px;
		text-decoration: underline;
	}
	.bridge-status {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 0;
	}
	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #585b70;
		flex-shrink: 0;
	}
	.status-dot.connected {
		background: #a6e3a1;
	}
	.status-dot.connecting {
		background: #f9e2af;
		animation: pulse 1s infinite;
	}
	.status-dot.error {
		background: #f38ba8;
	}
	.status-text {
		font-size: 12px;
		color: var(--text-secondary, #a6adc8);
	}
	.command-block {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: var(--bg-secondary, #181825);
		border: 1px solid var(--border-color, #333);
		border-radius: 6px;
	}
	.command-block code {
		flex: 1;
		font-size: 12px;
		color: #a6e3a1;
		font-family: 'SF Mono', 'Fira Code', monospace;
	}
	.copy-btn {
		background: none;
		border: none;
		color: var(--text-secondary, #a6adc8);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
	}
	.copy-btn:hover {
		color: var(--text-primary, #cdd6f4);
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}
</style>
