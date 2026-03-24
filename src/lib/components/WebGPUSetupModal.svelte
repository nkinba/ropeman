<script lang="ts">
	import { webgpuStore, WEBGPU_MODELS } from '$lib/stores/webgpuStore.svelte';
	import { initModel, cancelDownload } from '$lib/services/webllmService';

	let { open, onclose }: { open: boolean; onclose: () => void } = $props();

	function formatSize(mb: number): string {
		return mb >= 1000 ? `~${(mb / 1000).toFixed(1)} GB` : `~${mb} MB`;
	}

	function estimateTime(mb: number): string {
		if (mb < 600) return '< 1 min';
		if (mb < 1200) return '1~3 min';
		if (mb < 3000) return '3~6 min';
		return '5~10 min';
	}

	function handleStartDownload() {
		// Start download in background — don't await, close modal immediately
		initModel().catch(() => {
			// error handled by store
		});
		onclose();
	}

	function handleCancel() {
		onclose();
	}

	function handleBackdropClick(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('webgpu-backdrop')) {
			handleCancel();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') handleCancel();
	}
</script>

<!-- Model selection modal (shown before download starts) -->
{#if open && webgpuStore.status !== 'downloading'}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="webgpu-backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown}>
		<div class="webgpu-card" role="dialog" aria-modal="true">
			<div class="webgpu-header">
				<h2>Browser AI Setup</h2>
				<button class="webgpu-close" onclick={handleCancel}>&#10005;</button>
			</div>

			<div class="webgpu-body">
				{#if webgpuStore.status === 'error'}
					<!-- Error -->
					<div class="error-section">
						<div class="error-icon">&#9888;</div>
						<p class="error-text">{webgpuStore.errorMessage}</p>
						<button class="webgpu-btn" onclick={handleStartDownload}>Retry</button>
						<button class="webgpu-btn secondary" onclick={handleCancel}>Close</button>
					</div>
				{:else}
					<!-- Confirmation screen -->
					<div class="confirm-section">
						<div class="model-selector">
							<label for="webgpu-model-select" class="selector-label">Model</label>
							<select
								id="webgpu-model-select"
								class="model-select"
								bind:value={webgpuStore.selectedModelId}
							>
								{#each WEBGPU_MODELS as model}
									<option value={model.id}>
										{model.label} ({model.params})
									</option>
								{/each}
							</select>
						</div>
						<div class="model-info">
							<div class="info-row">
								<span class="info-label">Parameters</span>
								<span class="info-value">{webgpuStore.selectedModel.params}</span>
							</div>
							<div class="info-row">
								<span class="info-label">VRAM</span>
								<span class="info-value">{formatSize(webgpuStore.selectedModel.vramMB)}</span>
							</div>
							<div class="info-row">
								<span class="info-label">Download</span>
								<span class="info-value">{formatSize(webgpuStore.selectedModel.downloadSizeMB)}</span>
							</div>
							<div class="info-row">
								<span class="info-label">Est. Time</span>
								<span class="info-value">{estimateTime(webgpuStore.selectedModel.downloadSizeMB)}</span>
							</div>
						</div>
						{#if webgpuStore.selectedModel.vramMB > 3000}
							<p class="vram-warning">
								This model requires {formatSize(webgpuStore.selectedModel.vramMB)} VRAM. Make sure your GPU has enough memory.
							</p>
						{/if}
						{#if webgpuStore.isCached}
							<p class="confirm-desc cached-hint">
								This model is already cached in your browser. Loading will take just a few seconds.
							</p>
						{:else}
							<p class="confirm-desc">
								The model will download in the background. You can use other AI modes while waiting.
								Once downloaded, the model is cached in your browser (IndexedDB).
							</p>
						{/if}
						<div class="confirm-actions">
							<button class="webgpu-btn primary" onclick={handleStartDownload}>
								{webgpuStore.isCached ? 'Load Model' : 'Download & Setup'}
							</button>
							<button class="webgpu-btn secondary" onclick={handleCancel}> Cancel </button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Floating download indicator (always visible during download) -->
{#if webgpuStore.status === 'downloading'}
	<div class="download-indicator">
		<div class="di-header">
			<span class="di-icon">&#129504;</span>
			<span class="di-title">Downloading {webgpuStore.selectedModel.label}...</span>
			<button class="di-cancel" onclick={() => cancelDownload()} aria-label="Cancel download">&#10005;</button>
		</div>
		<div class="di-progress-track">
			<div class="di-progress-fill" style="width: {webgpuStore.downloadProgress}%"></div>
		</div>
		<div class="di-info">
			<span class="di-percent">{webgpuStore.downloadProgress}%</span>
			<span class="di-stage">{webgpuStore.downloadStage || 'Starting...'}</span>
		</div>
	</div>
{/if}

<!-- Download complete notification -->
{#if webgpuStore.status === 'ready' && webgpuStore.downloadProgress === 100}
	<div class="download-complete" role="status">
		<span class="dc-icon">&#10003;</span>
		<span class="dc-text">Browser AI ({webgpuStore.selectedModel.label}) is ready!</span>
		<button class="dc-dismiss" onclick={() => (webgpuStore.downloadProgress = 0)}>&#10005;</button>
	</div>
{/if}

<style>
	.webgpu-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1100;
	}
	.webgpu-card {
		background: var(--bg-primary, #1e1e2e);
		border: 1px solid var(--border-color, #333);
		border-radius: 12px;
		width: 420px;
		max-width: 90vw;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}
	.webgpu-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color, #333);
	}
	.webgpu-header h2 {
		margin: 0;
		font-size: 16px;
		color: var(--text-primary, #cdd6f4);
	}
	.webgpu-close {
		background: none;
		border: none;
		color: var(--text-secondary, #a6adc8);
		font-size: 18px;
		cursor: pointer;
		padding: 4px;
	}
	.webgpu-body {
		padding: 20px;
	}

	/* Confirmation */
	.confirm-section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.model-selector {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.selector-label {
		font-size: 12px;
		color: var(--text-secondary, #a6adc8);
		font-weight: 500;
	}
	.model-select {
		padding: 8px 12px;
		border: 1px solid var(--border-color, #333);
		border-radius: 6px;
		background: var(--bg-secondary, #181825);
		color: var(--text-primary, #cdd6f4);
		font-size: 13px;
		cursor: pointer;
	}
	.model-select:focus {
		outline: 1px solid var(--accent-color, #89b4fa);
	}
	.vram-warning {
		font-size: 12px;
		color: #fab387;
		margin: 0;
		padding: 8px 12px;
		background: rgba(250, 179, 135, 0.1);
		border-radius: 6px;
		border-left: 3px solid #fab387;
	}
	.model-info {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px;
		background: var(--bg-secondary, #181825);
		border-radius: 8px;
	}
	.info-row {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
	}
	.info-label {
		color: var(--text-secondary, #a6adc8);
	}
	.info-value {
		color: var(--text-primary, #cdd6f4);
		font-weight: 500;
	}
	.confirm-desc {
		font-size: 12px;
		color: var(--text-secondary, #a6adc8);
		line-height: 1.6;
		margin: 0;
	}
	.cached-hint {
		color: #a6e3a1;
		padding: 8px 12px;
		background: rgba(166, 227, 161, 0.1);
		border-radius: 6px;
		border-left: 3px solid #a6e3a1;
	}
	.confirm-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}

	/* Error */
	.error-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		text-align: center;
	}
	.error-icon {
		font-size: 32px;
		color: #f38ba8;
	}
	.error-text {
		font-size: 13px;
		color: #f38ba8;
		margin: 0;
	}

	/* Buttons */
	.webgpu-btn {
		padding: 8px 16px;
		border: none;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		background: var(--bg-tertiary, #313244);
		color: var(--text-primary, #cdd6f4);
	}
	.webgpu-btn.primary {
		background: var(--accent-color, #89b4fa);
		color: var(--bg-primary, #1e1e2e);
	}
	.webgpu-btn.secondary {
		background: var(--bg-tertiary, #313244);
		color: var(--text-secondary, #a6adc8);
	}

	/* Floating download indicator */
	.download-indicator {
		position: fixed;
		bottom: 20px;
		right: 20px;
		width: 320px;
		background: var(--bg-primary, #1e1e2e);
		border: 1px solid var(--border-color, #333);
		border-radius: 10px;
		padding: 12px 14px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
		z-index: 1200;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.di-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.di-icon {
		font-size: 16px;
		flex-shrink: 0;
	}
	.di-title {
		flex: 1;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary, #cdd6f4);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.di-cancel {
		background: none;
		border: none;
		color: var(--text-secondary, #a6adc8);
		font-size: 14px;
		cursor: pointer;
		padding: 2px;
		flex-shrink: 0;
	}
	.di-cancel:hover {
		color: #f38ba8;
	}
	.di-progress-track {
		width: 100%;
		height: 6px;
		background: var(--bg-secondary, #181825);
		border-radius: 3px;
		overflow: hidden;
	}
	.di-progress-fill {
		height: 100%;
		background: var(--accent-color, #89b4fa);
		border-radius: 3px;
		transition: width 0.3s ease;
	}
	.di-info {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		color: var(--text-secondary, #a6adc8);
	}
	.di-percent {
		font-weight: 600;
		color: var(--accent-color, #89b4fa);
	}
	.di-stage {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 200px;
	}

	/* Download complete notification */
	.download-complete {
		position: fixed;
		bottom: 20px;
		right: 20px;
		background: #a6e3a1;
		color: #1e1e2e;
		border-radius: 10px;
		padding: 12px 16px;
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
		font-weight: 600;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		z-index: 1200;
		animation: slideIn 0.3s ease;
	}
	.dc-icon {
		font-size: 16px;
		font-weight: 700;
	}
	.dc-text {
		flex: 1;
	}
	.dc-dismiss {
		background: none;
		border: none;
		color: #1e1e2e;
		font-size: 14px;
		cursor: pointer;
		padding: 2px;
		opacity: 0.7;
	}
	.dc-dismiss:hover {
		opacity: 1;
	}
	@keyframes slideIn {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
</style>
