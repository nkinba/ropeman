import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Cache API
const mockCacheEntries = new Map<string, Response>();

const mockCache = {
	put: vi.fn(async (req: Request, resp: Response) => {
		mockCacheEntries.set(req.url, resp.clone());
	}),
	match: vi.fn(async (req: Request) => {
		return mockCacheEntries.get(req.url)?.clone() ?? undefined;
	}),
	keys: vi.fn(async () => {
		return Array.from(mockCacheEntries.keys()).map((url) => new Request(url));
	}),
	delete: vi.fn()
};

const mockCaches = {
	open: vi.fn(async () => mockCache),
	delete: vi.fn(async () => true)
};

// Assign to globalThis before import
(globalThis as any).caches = mockCaches;

// Stub indexedDB.deleteDatabase (one-time migration in module)
(globalThis as any).indexedDB = { deleteDatabase: vi.fn() };

import {
	loadSemanticCache,
	saveSemanticLevel,
	clearSemanticCache,
	getSemanticCacheSize
} from './semanticCacheService';

describe('semanticCacheService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCacheEntries.clear();
	});

	describe('saveSemanticLevel', () => {
		it('stores a level in the cache', async () => {
			const level = {
				parentId: null,
				nodes: [],
				edges: [],
				breadcrumbLabel: 'Root'
			};

			await saveSemanticLevel('my-project', 'root', level);

			expect(mockCaches.open).toHaveBeenCalledWith('ropeman/semantic');
			expect(mockCache.put).toHaveBeenCalledTimes(1);

			const [req, resp] = mockCache.put.mock.calls[0];
			expect(req.url).toContain('my-project');
			expect(req.url).toContain('root');
			const body = await resp.json();
			expect(body).toEqual(level);
		});

		it('silently fails when cache API throws', async () => {
			mockCaches.open.mockRejectedValueOnce(new Error('Cache API unavailable'));

			await expect(
				saveSemanticLevel('proj', 'key', {
					parentId: null,
					nodes: [],
					edges: [],
					breadcrumbLabel: ''
				})
			).resolves.toBeUndefined();
		});
	});

	describe('loadSemanticCache', () => {
		it('returns empty map when no entries exist', async () => {
			const result = await loadSemanticCache('empty-project');
			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(0);
		});

		it('loads cached levels for the given project', async () => {
			// Arrange: put entries directly
			const level = {
				parentId: null,
				nodes: [],
				edges: [],
				breadcrumbLabel: 'Root'
			};
			const url = `https://ropeman.local/semantic/${encodeURIComponent('proj')}/${encodeURIComponent('level-1')}`;
			mockCacheEntries.set(
				url,
				new Response(JSON.stringify(level), {
					headers: { 'Content-Type': 'application/json' }
				})
			);

			const result = await loadSemanticCache('proj');
			expect(result.size).toBe(1);
			expect(result.get('level-1')).toEqual(level);
		});

		it('ignores entries from other projects', async () => {
			const url = `https://ropeman.local/semantic/${encodeURIComponent('other-proj')}/${encodeURIComponent('lv')}`;
			mockCacheEntries.set(
				url,
				new Response(JSON.stringify({ parentId: null, nodes: [], edges: [], breadcrumbLabel: '' }))
			);

			const result = await loadSemanticCache('my-proj');
			expect(result.size).toBe(0);
		});

		it('silently returns empty map on cache error', async () => {
			mockCaches.open.mockRejectedValueOnce(new Error('fail'));

			const result = await loadSemanticCache('proj');
			expect(result.size).toBe(0);
		});
	});

	describe('clearSemanticCache', () => {
		it('deletes the entire cache', async () => {
			await clearSemanticCache();
			expect(mockCaches.delete).toHaveBeenCalledWith('ropeman/semantic');
		});

		it('silently handles errors', async () => {
			mockCaches.delete.mockRejectedValueOnce(new Error('fail'));
			await expect(clearSemanticCache()).resolves.toBeUndefined();
		});
	});

	describe('getSemanticCacheSize', () => {
		it('returns 0 when cache is empty', async () => {
			const size = await getSemanticCacheSize();
			expect(size).toBe(0);
		});

		it('returns the number of entries', async () => {
			mockCacheEntries.set('https://ropeman.local/semantic/a/b', new Response('{}'));
			mockCacheEntries.set('https://ropeman.local/semantic/a/c', new Response('{}'));

			const size = await getSemanticCacheSize();
			expect(size).toBe(2);
		});

		it('returns 0 on cache error', async () => {
			mockCaches.open.mockRejectedValueOnce(new Error('fail'));
			const size = await getSemanticCacheSize();
			expect(size).toBe(0);
		});
	});
});
