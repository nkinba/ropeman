<script lang="ts">
	import { authStore } from '$lib/stores/authStore.svelte';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';

	let {
		open,
		nodeLabel,
		onconfirm,
		oncancel
	}: {
		open: boolean;
		nodeLabel: string;
		onconfirm: () => void;
		oncancel: () => void;
	} = $props();

	let dontAskAgain = $state(false);

	const trackInfo = $derived.by(() => {
		switch (authStore.activeTrack) {
			case 'bridge':
				return { label: 'Local Bridge', color: 'var(--track-bridge)' };
			case 'edge':
				return { label: 'Demo', color: 'var(--track-demo)' };
			case 'webgpu':
				return { label: 'WebGPU', color: 'var(--track-webgpu)' };
			case 'byok':
				return { label: 'API Key', color: 'var(--track-byok)' };
			default:
				return { label: 'Not connected', color: 'var(--text-muted)' };
		}
	});

	function handleConfirm() {
		if (dontAskAgain) {
			settingsStore.skipDrilldownConfirm = true;
		}
		dontAskAgain = false;
		onconfirm();
	}

	function handleCancel() {
		dontAskAgain = false;
		oncancel();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') handleCancel();
		if (e.key === 'Enter') handleConfirm();
	}

	function handleBackdropClick(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('drilldown-backdrop')) {
			handleCancel();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="drilldown-backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown}>
		<div class="drilldown-card" role="dialog" aria-modal="true">
			<div class="drilldown-title">추가 분석</div>
			<p class="drilldown-desc">
				<strong>{nodeLabel}</strong> 도메인의 내부 구조를 분석합니다.
			</p>
			<div class="drilldown-track">
				<span class="track-dot" style="background: {trackInfo.color}"></span>
				<span class="track-name" style="color: {trackInfo.color}">{trackInfo.label}</span>
				<span class="track-suffix">모드로 분석</span>
			</div>
			<label class="dont-ask">
				<input type="checkbox" bind:checked={dontAskAgain} />
				다시 묻지 않기
			</label>
			<div class="drilldown-actions">
				<button class="drilldown-btn secondary" onclick={handleCancel}>취소</button>
				<button class="drilldown-btn primary" onclick={handleConfirm}>분석</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.drilldown-backdrop {
		position: fixed;
		inset: 0;
		background: var(--modal-backdrop);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1200;
	}
	.drilldown-card {
		background: var(--bg-primary);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 20px 24px;
		width: 360px;
		max-width: 90vw;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}
	.drilldown-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 8px;
	}
	.drilldown-desc {
		font-size: 13px;
		color: var(--text-secondary);
		margin: 0 0 14px;
		line-height: 1.5;
	}
	.drilldown-track {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: var(--bg-secondary);
		border-radius: 8px;
		margin-bottom: 14px;
	}
	.track-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.track-name {
		font-size: 13px;
		font-weight: 600;
	}
	.track-suffix {
		font-size: 13px;
		color: var(--text-secondary);
	}
	.dont-ask {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--text-secondary);
		cursor: pointer;
		margin-bottom: 16px;
	}
	.dont-ask input {
		accent-color: var(--accent);
	}
	.drilldown-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
	.drilldown-btn {
		padding: 8px 18px;
		border: none;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
	}
	.drilldown-btn.primary {
		background: var(--accent);
		color: var(--bg-primary);
	}
	.drilldown-btn.secondary {
		background: var(--bg-tertiary);
		color: var(--text-secondary);
	}
</style>
