<script lang="ts">
	import 'prismjs/themes/prism-tomorrow.css';
	import '$lib/styles/global.css';
	import '$lib/styles/chat.css';

	let { children } = $props();
</script>

{@render children()}
