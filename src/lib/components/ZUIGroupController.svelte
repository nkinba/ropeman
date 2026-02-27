<script lang="ts">
	import { useSvelteFlow } from '@xyflow/svelte';
	import { architectureStore } from '$lib/stores/architectureStore.svelte';
	import { graphStore } from '$lib/stores/graphStore.svelte';

	const { fitView } = useSvelteFlow();

	// Track previous enabled state for transition detection
	let prevEnabled = false;

	// F-2.2: Zoom out transition when groups first appear
	$effect(() => {
		const enabled = architectureStore.enabled;
		const hasGroups = architectureStore.groups.length > 0;

		if (enabled && hasGroups && !prevEnabled) {
			// Groups just appeared — animate zoom out to show all groups
			setTimeout(() => {
				fitView({ padding: 0.2, duration: 800 });
			}, 150);
		}

		prevEnabled = enabled;
	});

	// F-2.3: Drill-down zoom when focusedGroupId changes
	$effect(() => {
		const focusedId = graphStore.focusedGroupId;

		if (focusedId === null) {
			// Zoom out to full view
			if (architectureStore.enabled && architectureStore.groups.length > 0) {
				fitView({ padding: 0.2, duration: 600 });
			}
			return;
		}

		// Find the group to zoom into
		const group = architectureStore.groups.find(
			g => `arch-group:${g.name}` === focusedId
		);
		if (group && group.nodeIds.length > 0) {
			fitView({
				nodes: group.nodeIds.map(id => ({ id })),
				padding: 0.3,
				duration: 600
			});
		}
	});

	// Escape key to exit drill-down
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && graphStore.focusedGroupId) {
			e.preventDefault();
			graphStore.focusedGroupId = null;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />
