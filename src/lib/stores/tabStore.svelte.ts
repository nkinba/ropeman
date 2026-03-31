import type { Tab, TabType } from '$lib/types/tab';
import { layoutStore } from './layoutStore.svelte';

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
		const pane = tab.paneId ?? 'primary';
		if (pane === 'secondary' && layoutStore.isSplit) {
			layoutStore.secondaryActiveTabId = tabId;
			layoutStore.focusedPane = 'secondary';
		} else {
			activeTabId = tabId;
			if (layoutStore.isSplit) {
				layoutStore.focusedPane = 'primary';
			}
		}
		tab.lastAccessed = Date.now();
	}

	function closeTab(tabId: string) {
		const idx = tabs.findIndex((t) => t.id === tabId);
		if (idx === -1) return;

		const closedTab = tabs[idx];
		const wasActive = tabId === activeTabId;
		const wasSecondaryActive = tabId === layoutStore.secondaryActiveTabId;
		tabs = tabs.filter((t) => t.id !== tabId);

		if (wasSecondaryActive) {
			// Handle secondary pane active tab removal
			const remaining = tabs.filter((t) => t.paneId === 'secondary');
			layoutStore.secondaryActiveTabId = remaining.length > 0 ? remaining[0].id : null;
		}

		if (wasActive && tabs.length > 0) {
			// Activate nearest neighbor in primary pane
			const primaryTabs = tabs.filter((t) => (t.paneId ?? 'primary') === 'primary');
			if (primaryTabs.length > 0) {
				const nextIdx = Math.min(idx, primaryTabs.length - 1);
				activateTab(primaryTabs[nextIdx].id);
			} else {
				activeTabId = null;
			}
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
		 * Reuses an existing diagram tab in the same pane if one exists,
		 * updating its key, label, and drilldownPath rather than creating a duplicate.
		 * Returns the tab ID.
		 */
		openDiagramTab(drilldownPath: { nodeId: string; label: string }[], label: string): string {
			const key = hashDrilldownPath(drilldownPath);
			const existing = findByKey(key);
			if (existing) {
				activateTab(existing.id);
				return existing.id;
			}

			// Reuse an existing diagram tab in the same pane instead of creating a duplicate
			const targetPane = layoutStore.isSplit ? layoutStore.focusedPane : 'primary';
			const existingDiagram = tabs.find(
				(t) => t.type === 'diagram' && (t.paneId ?? 'primary') === targetPane
			);
			if (existingDiagram) {
				existingDiagram.key = key;
				existingDiagram.label = label;
				existingDiagram.drilldownPath = [...drilldownPath];
				existingDiagram.lastAccessed = Date.now();
				tabs = [...tabs]; // trigger reactivity
				activateTab(existingDiagram.id);
				return existingDiagram.id;
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
		openCodeTab(filePath: string, label: string, preview = false): string {
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

			// Determine target pane: in split mode, open code tabs in the pane
			// that does NOT contain the active diagram tab, so clicking a file
			// from the explorer never replaces the diagram view.
			let targetPane: 'primary' | 'secondary' = 'primary';
			if (layoutStore.isSplit) {
				const primaryHasDiagram = tabs.some(
					(t) => t.type === 'diagram' && (t.paneId ?? 'primary') === 'primary'
				);
				const secondaryHasDiagram = tabs.some(
					(t) => t.type === 'diagram' && t.paneId === 'secondary'
				);
				if (primaryHasDiagram && !secondaryHasDiagram) {
					targetPane = 'secondary';
				} else if (secondaryHasDiagram && !primaryHasDiagram) {
					targetPane = 'primary';
				} else {
					// Both or neither have diagram tabs — use focused pane
					targetPane = layoutStore.focusedPane;
				}
			}

			if (preview) {
				// Replace existing preview tab in the same pane
				const previewTab = tabs.find((t) => t.preview && (t.paneId ?? 'primary') === targetPane);
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
				filePath,
				paneId: targetPane
			};

			tabs = [...tabs, tab];
			enforceTabLimit();
			activateTab(tab.id);
			return tab.id;
		},

		/** Get view mode for a specific tab */
		viewModeForTab(tabId: string | null): 'semantic' | 'code' {
			if (!tabId) return 'code';
			const tab = tabs.find((t) => t.id === tabId);
			return tab?.type === 'diagram' ? 'semantic' : 'code';
		},

		/** Get tabs filtered by pane */
		tabsForPane(paneId: 'primary' | 'secondary'): Tab[] {
			return tabs.filter((t) => (t.paneId ?? 'primary') === paneId);
		},

		/** Move tab to a specific pane */
		moveTabToPane(tabId: string, paneId: 'primary' | 'secondary') {
			const tab = tabs.find((t) => t.id === tabId);
			if (!tab) return;
			const oldPane = tab.paneId ?? 'primary';
			tab.paneId = paneId;

			// If moving active primary tab away, switch to another primary tab
			if (oldPane === 'primary' && paneId === 'secondary' && tabId === activeTabId) {
				const remaining = tabs.filter(
					(t) => t.id !== tabId && (t.paneId ?? 'primary') === 'primary'
				);
				activeTabId = remaining.length > 0 ? remaining[0].id : null;
			}
			// If moving active secondary tab away, clear secondary active
			if (
				oldPane === 'secondary' &&
				paneId === 'primary' &&
				tabId === layoutStore.secondaryActiveTabId
			) {
				const remaining = tabs.filter((t) => t.id !== tabId && t.paneId === 'secondary');
				layoutStore.secondaryActiveTabId = remaining.length > 0 ? remaining[0].id : null;
			}

			tabs = [...tabs]; // trigger reactivity
		},

		/** Merge all secondary pane tabs to primary */
		mergeSecondaryToPrimary() {
			for (const tab of tabs) {
				if (tab.paneId === 'secondary') {
					tab.paneId = 'primary';
				}
			}
			tabs = [...tabs];
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
