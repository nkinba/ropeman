import type { Tab, TabType } from '$lib/types/tab';

const MAX_TABS = 15;

function generateId(): string {
	return 'tab-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

/** Hash a drilldown path array into a stable key */
function hashDrilldownPath(path: { nodeId: string; label: string }[]): string {
	if (path.length === 0) return '__root__';
	return path.map((p) => p.nodeId).join('/');
}

function createTabStore() {
	let tabs = $state<Tab[]>([]);
	let activeTabId = $state<string | null>(null);

	function findByKey(key: string): Tab | undefined {
		return tabs.find((t) => t.key === key);
	}

	function findPreviewTab(): Tab | undefined {
		return tabs.find((t) => t.preview);
	}

	function enforceTabLimit() {
		while (tabs.length > MAX_TABS) {
			// Find oldest inactive unpinned tab
			const candidates = tabs
				.filter((t) => t.id !== activeTabId && !t.pinned)
				.sort((a, b) => a.lastAccessed - b.lastAccessed);
			if (candidates.length === 0) break;
			tabs = tabs.filter((t) => t.id !== candidates[0].id);
		}
	}

	function activateTab(tabId: string) {
		const tab = tabs.find((t) => t.id === tabId);
		if (!tab) return;
		activeTabId = tabId;
		tab.lastAccessed = Date.now();
	}

	function closeTab(tabId: string) {
		const idx = tabs.findIndex((t) => t.id === tabId);
		if (idx === -1) return;

		const wasActive = tabId === activeTabId;
		tabs = tabs.filter((t) => t.id !== tabId);

		if (wasActive && tabs.length > 0) {
			// Activate nearest neighbor
			const nextIdx = Math.min(idx, tabs.length - 1);
			activateTab(tabs[nextIdx].id);
		} else if (tabs.length === 0) {
			activeTabId = null;
		}
	}

	return {
		get tabs() {
			return tabs;
		},

		get activeTabId() {
			return activeTabId;
		},

		get activeTab(): Tab | undefined {
			return tabs.find((t) => t.id === activeTabId);
		},

		get viewMode(): 'semantic' | 'code' {
			const active = tabs.find((t) => t.id === activeTabId);
			return active?.type === 'diagram' ? 'semantic' : 'code';
		},

		activateTab,
		closeTab,

		/**
		 * Open or focus a diagram tab for a given drilldown path.
		 * Returns the tab ID.
		 */
		openDiagramTab(drilldownPath: { nodeId: string; label: string }[], label: string): string {
			const key = hashDrilldownPath(drilldownPath);
			const existing = findByKey(key);
			if (existing) {
				activateTab(existing.id);
				return existing.id;
			}

			const tab: Tab = {
				id: generateId(),
				type: 'diagram',
				label,
				key,
				pinned: true,
				preview: false,
				lastAccessed: Date.now(),
				drilldownPath: [...drilldownPath]
			};

			tabs = [...tabs, tab];
			enforceTabLimit();
			activateTab(tab.id);
			return tab.id;
		},

		/**
		 * Open or focus a code tab.
		 * When preview=true, replaces any existing preview tab.
		 * Returns the tab ID.
		 */
		openCodeTab(filePath: string, label: string, preview = true): string {
			const key = filePath;
			const existing = findByKey(key);
			if (existing) {
				// If opening with pin (preview=false), pin it
				if (!preview) {
					existing.preview = false;
					existing.pinned = true;
				}
				activateTab(existing.id);
				return existing.id;
			}

			if (preview) {
				// Replace existing preview tab
				const previewTab = findPreviewTab();
				if (previewTab) {
					previewTab.key = key;
					previewTab.label = label;
					previewTab.filePath = filePath;
					previewTab.lastAccessed = Date.now();
					tabs = [...tabs]; // trigger reactivity
					activateTab(previewTab.id);
					return previewTab.id;
				}
			}

			const tab: Tab = {
				id: generateId(),
				type: 'code',
				label,
				key,
				pinned: !preview,
				preview,
				lastAccessed: Date.now(),
				filePath
			};

			tabs = [...tabs, tab];
			enforceTabLimit();
			activateTab(tab.id);
			return tab.id;
		},

		pinTab(tabId: string) {
			const tab = tabs.find((t) => t.id === tabId);
			if (tab) {
				tab.preview = false;
				tab.pinned = true;
				tabs = [...tabs]; // trigger reactivity
			}
		},

		clear() {
			tabs = [];
			activeTabId = null;
		}
	};
}

export const tabStore = createTabStore();
