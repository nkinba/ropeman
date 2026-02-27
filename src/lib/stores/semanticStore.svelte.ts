import type { SemanticLevel, SemanticNode } from '$lib/types/semantic';

export type ViewMode = 'semantic' | 'filetree';

function createSemanticStore() {
	let currentLevel = $state<SemanticLevel | null>(null);
	let drilldownPath = $state<{ nodeId: string; label: string }[]>([]);
	let viewMode = $state<ViewMode>('filetree');
	let isAnalyzing = $state(false);
	let cache = $state<Map<string, SemanticLevel>>(new Map());
	let selectedSemanticNode = $state<SemanticNode | null>(null);

	return {
		get currentLevel() { return currentLevel; },
		set currentLevel(v: SemanticLevel | null) { currentLevel = v; },

		get drilldownPath() { return drilldownPath; },
		set drilldownPath(v: { nodeId: string; label: string }[]) { drilldownPath = v; },

		get viewMode() { return viewMode; },
		set viewMode(v: ViewMode) { viewMode = v; },

		get isAnalyzing() { return isAnalyzing; },
		set isAnalyzing(v: boolean) { isAnalyzing = v; },

		get cache() { return cache; },

		get selectedSemanticNode() { return selectedSemanticNode; },
		set selectedSemanticNode(v: SemanticNode | null) { selectedSemanticNode = v; },

		get highlightedFilePaths(): string[] {
			return selectedSemanticNode?.filePaths ?? [];
		},

		cacheLevel(key: string, level: SemanticLevel) {
			cache.set(key, level);
		},

		getCachedLevel(key: string): SemanticLevel | undefined {
			return cache.get(key);
		},

		drillDown(node: SemanticNode) {
			// Cache current level before drilling down
			const cacheKey = currentLevel?.parentId ?? '__root__';
			if (currentLevel) {
				cache.set(cacheKey, currentLevel);
			}

			drilldownPath = [...drilldownPath, { nodeId: node.id, label: node.label }];

			// Check cache for drill-down level
			const cached = cache.get(node.id);
			if (cached) {
				currentLevel = cached;
				return true; // cached, no AI call needed
			}

			return false; // caller should trigger AI analysis
		},

		drillUp() {
			if (drilldownPath.length === 0) return;

			const newPath = drilldownPath.slice(0, -1);
			const parentKey = newPath.length > 0
				? newPath[newPath.length - 1].nodeId
				: '__root__';

			const cached = cache.get(parentKey);
			if (cached) {
				currentLevel = cached;
			}

			drilldownPath = newPath;
		},

		goToLevel(index: number) {
			if (index < 0) {
				// Go to root
				const cached = cache.get('__root__');
				if (cached) {
					currentLevel = cached;
				}
				drilldownPath = [];
				return;
			}

			const newPath = drilldownPath.slice(0, index + 1);
			const targetKey = newPath[newPath.length - 1].nodeId;
			const cached = cache.get(targetKey);
			if (cached) {
				currentLevel = cached;
			}

			drilldownPath = newPath;
		},

		findSemanticNodeForFile(filePath: string): SemanticNode | null {
			if (!currentLevel) return null;
			return currentLevel.nodes.find(n => n.filePaths.includes(filePath)) ?? null;
		},

		clear() {
			currentLevel = null;
			drilldownPath = [];
			viewMode = 'filetree';
			isAnalyzing = false;
			cache = new Map();
			selectedSemanticNode = null;
		}
	};
}

export const semanticStore = createSemanticStore();

// Dev-only: expose for console testing
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
	(window as any).__semanticStore = semanticStore;
}
