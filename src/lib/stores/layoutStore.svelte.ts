function createLayoutStore() {
	let isSplit = $state(false);
	let splitDirection = $state<'vertical' | 'horizontal'>('vertical');
	let splitRatio = $state(0.5);
	let focusedPane = $state<'primary' | 'secondary'>('primary');
	let secondaryActiveTabId = $state<string | null>(null);

	return {
		get isSplit() {
			return isSplit;
		},
		set isSplit(v: boolean) {
			isSplit = v;
		},

		get splitDirection() {
			return splitDirection;
		},
		set splitDirection(v: 'vertical' | 'horizontal') {
			splitDirection = v;
		},

		get splitRatio() {
			return splitRatio;
		},
		set splitRatio(v: number) {
			splitRatio = Math.max(0.15, Math.min(0.85, v));
		},

		get focusedPane() {
			return focusedPane;
		},
		set focusedPane(v: 'primary' | 'secondary') {
			focusedPane = v;
		},

		get secondaryActiveTabId() {
			return secondaryActiveTabId;
		},
		set secondaryActiveTabId(v: string | null) {
			secondaryActiveTabId = v;
		},

		toggleSplit() {
			if (isSplit) {
				// Merge secondary tabs to primary — handled by +page.svelte
				isSplit = false;
				focusedPane = 'primary';
				secondaryActiveTabId = null;
			} else {
				isSplit = true;
			}
		},

		focusPrimary() {
			focusedPane = 'primary';
		},

		focusSecondary() {
			focusedPane = 'secondary';
		}
	};
}

export const layoutStore = createLayoutStore();
