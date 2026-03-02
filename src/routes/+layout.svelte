<script lang="ts">
	import '$lib/styles/global.css';
	import '$lib/styles/chat.css';
	import { settingsStore } from '$lib/stores/settingsStore.svelte';
	import { injectThemeCSS } from '$lib/services/syntaxThemeService';

	let { children } = $props();

	$effect(() => {
		injectThemeCSS(settingsStore.syntaxTheme);
	});
</script>

{@render children()}
