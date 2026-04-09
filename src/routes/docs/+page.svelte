<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';

	// Client-side redirect to the user's preferred locale. We can't do this
	// server-side because prerender doesn't know the visitor's language.
	onMount(() => {
		if (!browser) return;
		const stored = localStorage.getItem('ropeman-settings');
		let locale: 'ko' | 'en' = 'en';
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				if (parsed.language === 'ko' || parsed.language === 'en') locale = parsed.language;
			} catch {
				// fall through to default
			}
		} else {
			const navLang = navigator.language?.toLowerCase() ?? '';
			if (navLang.startsWith('ko')) locale = 'ko';
		}
		goto(resolve(`/docs/${locale}/getting-started`), { replaceState: true });
	});
</script>

<svelte:head>
	<title>Ropeman Docs</title>
	<meta name="description" content="Ropeman 공식 문서 — AI 기반 코드 시각화 도구" />
</svelte:head>

<div class="redirect-notice">
	<p>Loading documentation…</p>
	<p class="hint">
		<a href={resolve('/docs/en/getting-started')}>English</a> ·
		<a href={resolve('/docs/ko/getting-started')}>한국어</a>
	</p>
</div>

<style>
	.redirect-notice {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		gap: 16px;
		color: var(--text-secondary);
		font-family: var(--font-body);
	}

	.hint {
		font-size: 14px;
	}

	.hint a {
		color: var(--accent);
		text-decoration: none;
	}

	.hint a:hover {
		text-decoration: underline;
	}
</style>
