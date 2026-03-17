<script lang="ts">
	import { webgpuStore } from '$lib/stores/webgpuStore.svelte';
	import { initModel, cancelDownload } from '$lib/services/webllmService';

	let { open, onclose }: { open: boolean; onclose: () => void } = $props();

	const MODEL_NAME = 'Qwen2.5-Coder-1.5B';
	const MODEL_SIZE = '~900 MB';
	const ESTIMATED_TIME = '1~3 min (on fast network)';

	async function handleConfirm() {
		try {
			await initModel();
			onclose();
		} catch {
			// error handled by store
		}
	}

	function handleCancel() {
		if (webgpuStore.status === 'downloading') {
			cancelDownload();
		}
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

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="webgpu-backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown}>
		<div class="webgpu-card" role="dialog" aria-modal="true">
			<div class="webgpu-header">
				<h2>Browser AI Setup</h2>
				<button class="webgpu-close" onclick={handleCancel}>&#10005;</button>
			</div>

			<div class="webgpu-body">
				{#if webgpuStore.status === 'downloading'}
					<!-- Download progress -->
					<div class="download-section">
						<div class="progress-label">
							{webgpuStore.downloadStage || 'Downloading model...'}
						</div>
						<div class="progress-bar-track">
							<div class="progress-bar-fill" style="width: {webgpuStore.downloadProgress}%"></div>
						</div>
						<div class="progress-info">
							{webgpuStore.downloadProgress}%
						</div>
						<button class="webgpu-btn danger" onclick={handleCancel}> Cancel </button>
					</div>
				{:else if webgpuStore.status === 'error'}
					<!-- Error -->
					<div class="error-section">
						<div class="error-icon">&#9888;</div>
						<p class="error-text">{webgpuStore.errorMessage}</p>
						<button class="webgpu-btn" onclick={handleConfirm}>Retry</button>
						<button class="webgpu-btn secondary" onclick={handleCancel}>Close</button>
					</div>
				{:else}
					<!-- Confirmation screen -->
					<div class="confirm-section">
						<div class="model-info">
							<div class="info-row">
								<span class="info-label">Model</span>
								<span class="info-value">{MODEL_NAME}</span>
							</div>
							<div class="info-row">
								<span class="info-label">Size</span>
								<span class="info-value">{MODEL_SIZE}</span>
							</div>
							<div class="info-row">
								<span class="info-label">Est. Time</span>
								<span class="info-value">{ESTIMATED_TIME}</span>
							</div>
						</div>
						<p class="confirm-desc">
							The model will be downloaded once and cached in your browser (IndexedDB). No data is
							sent to any server during inference.
						</p>
						<div class="confirm-actions">
							<button class="webgpu-btn primary" onclick={handleConfirm}>
								Download &amp; Setup
							</button>
							<button class="webgpu-btn secondary" onclick={handleCancel}> Cancel </button>
						</div>
					</div>
				{/if}
			</div>
		</div>
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
	.confirm-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}

	/* Download */
	.download-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: center;
	}
	.progress-label {
		font-size: 13px;
		color: var(--text-secondary, #a6adc8);
		text-align: center;
		word-break: break-word;
	}
	.progress-bar-track {
		width: 100%;
		height: 8px;
		background: var(--bg-secondary, #181825);
		border-radius: 4px;
		overflow: hidden;
	}
	.progress-bar-fill {
		height: 100%;
		background: var(--accent-color, #89b4fa);
		border-radius: 4px;
		transition: width 0.3s ease;
	}
	.progress-info {
		font-size: 12px;
		color: var(--text-secondary, #a6adc8);
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
	.webgpu-btn.danger {
		background: #f38ba8;
		color: var(--bg-primary, #1e1e2e);
	}
</style>
