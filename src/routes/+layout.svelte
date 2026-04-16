<script lang="ts">
	import '$lib/styles/global.css';
	import '$lib/styles/chat.css';
	import { onMount } from 'svelte';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import { injectThemeCSS } from '$lib/services/syntaxThemeService';

	let { children } = $props();

	$effect(() => {
		injectThemeCSS(settingsStore.syntaxTheme);
	});

	onMount(() => {
		// Dev-only: expose __uploadExplore() console helper for manual
		// gallery snapshot uploads. Tree-shaken out of production builds.
		if (import.meta.env.DEV) {
			import('$lib/dev/exploreUploader');
		}
	});
</script>

{@render children()}
