import { describe, it, expect, beforeEach } from 'vitest';
import { tabStore } from './tabStore.svelte';

describe('tabStore', () => {
	beforeEach(() => {
		tabStore.clear();
	});

	describe('initial state', () => {
		it('has no tabs', () => {
			expect(tabStore.tabs).toEqual([]);
		});

		it('activeTabId is null', () => {
			expect(tabStore.activeTabId).toBeNull();
		});

		it('activeTab is undefined', () => {
			expect(tabStore.activeTab).toBeUndefined();
		});

		it('viewMode defaults to code', () => {
			expect(tabStore.viewMode).toBe('code');
		});
	});

	describe('openDiagramTab', () => {
		it('creates a diagram tab for root', () => {
			const id = tabStore.openDiagramTab([], 'Project');
			expect(tabStore.tabs).toHaveLength(1);
			expect(tabStore.tabs[0].type).toBe('diagram');
			expect(tabStore.tabs[0].label).toBe('Project');
			expect(tabStore.tabs[0].key).toBe('__root__');
			expect(tabStore.activeTabId).toBe(id);
		});

		it('creates a diagram tab for drilldown path', () => {
			tabStore.openDiagramTab([{ nodeId: 'n1', label: 'UI' }], 'UI');
			expect(tabStore.tabs[0].key).toBe('n1');
			expect(tabStore.tabs[0].drilldownPath).toEqual([{ nodeId: 'n1', label: 'UI' }]);
		});

		it('reuses existing tab with same key', () => {
			const id1 = tabStore.openDiagramTab([], 'Project');
			const id2 = tabStore.openDiagramTab([], 'Project');
			expect(id1).toBe(id2);
			expect(tabStore.tabs).toHaveLength(1);
		});

		it('viewMode becomes semantic', () => {
			tabStore.openDiagramTab([], 'Project');
			expect(tabStore.viewMode).toBe('semantic');
		});
	});

	describe('openCodeTab', () => {
		it('creates a code tab', () => {
			const id = tabStore.openCodeTab('src/main.ts', 'main.ts', false);
			expect(tabStore.tabs).toHaveLength(1);
			expect(tabStore.tabs[0].type).toBe('code');
			expect(tabStore.tabs[0].filePath).toBe('src/main.ts');
			expect(tabStore.activeTabId).toBe(id);
		});

		it('creates preview tab', () => {
			tabStore.openCodeTab('src/a.ts', 'a.ts', true);
			expect(tabStore.tabs[0].preview).toBe(true);
			expect(tabStore.tabs[0].pinned).toBe(false);
		});

		it('creates pinned tab', () => {
			tabStore.openCodeTab('src/a.ts', 'a.ts', false);
			expect(tabStore.tabs[0].preview).toBe(false);
			expect(tabStore.tabs[0].pinned).toBe(true);
		});

		it('replaces existing preview tab', () => {
			tabStore.openCodeTab('src/a.ts', 'a.ts', true);
			tabStore.openCodeTab('src/b.ts', 'b.ts', true);
			expect(tabStore.tabs).toHaveLength(1);
			expect(tabStore.tabs[0].filePath).toBe('src/b.ts');
			expect(tabStore.tabs[0].label).toBe('b.ts');
		});

		it('does not replace pinned tab', () => {
			tabStore.openCodeTab('src/a.ts', 'a.ts', false);
			tabStore.openCodeTab('src/b.ts', 'b.ts', true);
			expect(tabStore.tabs).toHaveLength(2);
		});

		it('reuses existing tab with same file', () => {
			const id1 = tabStore.openCodeTab('src/a.ts', 'a.ts', false);
			const id2 = tabStore.openCodeTab('src/a.ts', 'a.ts', true);
			expect(id1).toBe(id2);
			expect(tabStore.tabs).toHaveLength(1);
		});

		it('pins existing tab when opened non-preview', () => {
			tabStore.openCodeTab('src/a.ts', 'a.ts', true);
			expect(tabStore.tabs[0].preview).toBe(true);
			tabStore.openCodeTab('src/a.ts', 'a.ts', false);
			expect(tabStore.tabs[0].preview).toBe(false);
			expect(tabStore.tabs[0].pinned).toBe(true);
		});

		it('viewMode becomes code', () => {
			tabStore.openCodeTab('src/a.ts', 'a.ts');
			expect(tabStore.viewMode).toBe('code');
		});
	});

	describe('activateTab', () => {
		it('activates an existing tab', () => {
			const id1 = tabStore.openDiagramTab([], 'Project');
			const id2 = tabStore.openCodeTab('src/a.ts', 'a.ts', false);
			expect(tabStore.activeTabId).toBe(id2);

			tabStore.activateTab(id1);
			expect(tabStore.activeTabId).toBe(id1);
		});
	});

	describe('closeTab', () => {
		it('removes the tab', () => {
			const id = tabStore.openCodeTab('src/a.ts', 'a.ts', false);
			tabStore.closeTab(id);
			expect(tabStore.tabs).toHaveLength(0);
			expect(tabStore.activeTabId).toBeNull();
		});

		it('activates neighbor when closing active tab', () => {
			const id1 = tabStore.openCodeTab('src/a.ts', 'a.ts', false);
			tabStore.openCodeTab('src/b.ts', 'b.ts', false);
			const id3 = tabStore.openCodeTab('src/c.ts', 'c.ts', false);

			// Close active (c.ts), should activate b.ts
			tabStore.closeTab(id3);
			expect(tabStore.tabs).toHaveLength(2);
			expect(tabStore.activeTab?.filePath).toBe('src/b.ts');
		});
	});

	describe('pinTab', () => {
		it('pins a preview tab', () => {
			tabStore.openCodeTab('src/a.ts', 'a.ts', true);
			const tabId = tabStore.tabs[0].id;
			tabStore.pinTab(tabId);
			expect(tabStore.tabs[0].preview).toBe(false);
			expect(tabStore.tabs[0].pinned).toBe(true);
		});
	});

	describe('clear', () => {
		it('removes all tabs', () => {
			tabStore.openDiagramTab([], 'Project');
			tabStore.openCodeTab('src/a.ts', 'a.ts', false);
			tabStore.clear();
			expect(tabStore.tabs).toHaveLength(0);
			expect(tabStore.activeTabId).toBeNull();
		});
	});
});
