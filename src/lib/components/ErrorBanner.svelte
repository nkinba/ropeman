<script lang="ts">
	import { onMount } from 'svelte';

	let { message, type = 'error', ondismiss }: {
		message: string;
		type?: 'warning' | 'error' | 'info';
		ondismiss: () => void;
	} = $props();

	onMount(() => {
		if (type !== 'error') {
			const timer = setTimeout(ondismiss, 5000);
			return () => clearTimeout(timer);
		}
	});

	const icons: Record<string, string> = {
		error: '\u2716',
		warning: '\u26A0',
		info: '\u2139',
	};
</script>

<div class="error-banner {type}" role="alert">
	<span class="banner-icon">{icons[type]}</span>
	<span class="banner-message">{message}</span>
	<button class="banner-dismiss" onclick={ondismiss}>&times;</button>
</div>

<style>
	.error-banner {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		border-radius: 8px;
		font-size: 13px;
		animation: slideDown 0.25s ease;
	}

	@keyframes slideDown {
		from { opacity: 0; transform: translateY(-8px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.error-banner.error {
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.error-banner.warning {
		background: rgba(245, 158, 11, 0.12);
		border: 1px solid rgba(245, 158, 11, 0.3);
		color: #f59e0b;
	}

	.error-banner.info {
		background: rgba(59, 130, 246, 0.12);
		border: 1px solid rgba(59, 130, 246, 0.3);
		color: #3b82f6;
	}

	.banner-icon {
		font-size: 15px;
		flex-shrink: 0;
	}

	.banner-message {
		flex: 1;
	}

	.banner-dismiss {
		font-size: 18px;
		opacity: 0.6;
		padding: 0 4px;
		flex-shrink: 0;
		transition: opacity var(--transition);
	}

	.banner-dismiss:hover {
		opacity: 1;
	}
</style>
