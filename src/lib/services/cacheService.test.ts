import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @orama/orama
const mockDb = { __mock: true };
vi.mock('@orama/orama', () => ({
	create: vi.fn(async () => ({ ...mockDb })),
	insert: vi.fn(async () => 'id-1'),
	search: vi.fn(async () => ({ hits: [] })),
	remove: vi.fn(async () => true),
	count: vi.fn(async () => 0),
	save: vi.fn(() => ({ serialized: true })),
	load: vi.fn()
}));

// Mock indexedDB
const idbStore = new Map<string, unknown>();

function makeMockIDB() {
	const store = {
		get: vi.fn((key: string) => {
			const req: any = {};
			setTimeout(() => {
				req.result = idbStore.get(key) ?? undefined;
				req.onsuccess?.();
			});
			return req;
		}),
		put: vi.fn((value: unknown, key: string) => {
			idbStore.set(key, value);
			const req: any = {};
			return req;
		}),
		delete: vi.fn((key: string) => {
			idbStore.delete(key);
			const req: any = {};
			return req;
		})
	};

	const tx: any = {
		objectStore: vi.fn(() => store),
		oncomplete: null as any,
		onerror: null as any
	};
	// Auto-trigger oncomplete on next tick
	const origObjectStore = tx.objectStore;
	tx.objectStore = vi.fn((...args: any[]) => {
		setTimeout(() => tx.oncomplete?.());
		return origObjectStore(...args);
	});

	const db: any = {
		transaction: vi.fn(() => tx),
		createObjectStore: vi.fn(),
		close: vi.fn()
	};

	return db;
}

(globalThis as any).indexedDB = {
	open: vi.fn(() => {
		const req: any = {};
		const db = makeMockIDB();
		setTimeout(() => {
			req.result = db;
			req.onsuccess?.();
		});
		return req;
	})
};

// Must also set window for the typeof window checks
(globalThis as any).window = globalThis;

import { create, insert, search, count, remove, save, load } from '@orama/orama';
import { initCache, searchCache, addToCache, clearCache, getCacheSize } from './cacheService';

describe('cacheService', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		idbStore.clear();
		// Reset internal db state by clearing the cache
		await clearCache();
	});

	describe('initCache', () => {
		it('creates a new Orama database', async () => {
			await initCache();
			expect(create).toHaveBeenCalled();
		});
	});

	describe('searchCache', () => {
		it('returns null when no hits', async () => {
			(search as ReturnType<typeof vi.fn>).mockResolvedValue({ hits: [] });

			const result = await searchCache('query', [0.1, 0.2]);
			expect(result).toBeNull();
		});

		it('returns cached entry on hit', async () => {
			(search as ReturnType<typeof vi.fn>).mockResolvedValue({
				hits: [
					{
						document: {
							response: 'cached response',
							code: 'const x = 1;',
							nodeId: 'node:x'
						}
					}
				]
			});

			const result = await searchCache('query', [0.1, 0.2]);
			expect(result).toEqual({
				response: 'cached response',
				code: 'const x = 1;',
				nodeId: 'node:x'
			});
		});
	});

	describe('addToCache', () => {
		it('inserts an entry', async () => {
			await addToCache('node:x', 'what is x?', 'x is a var', 'const x=1', [0.1]);

			expect(insert).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					nodeId: 'node:x',
					query: 'what is x?',
					response: 'x is a var',
					code: 'const x=1',
					embedding: [0.1]
				})
			);
		});

		it('evicts oldest entry when at max capacity', async () => {
			(count as ReturnType<typeof vi.fn>).mockResolvedValue(500);
			(search as ReturnType<typeof vi.fn>).mockResolvedValue({
				hits: [{ id: 'old-entry-id' }]
			});

			await addToCache('node:y', 'q', 'r', 'c', [0.1]);

			expect(remove).toHaveBeenCalledWith(expect.anything(), 'old-entry-id');
			expect(insert).toHaveBeenCalled();
		});
	});

	describe('getCacheSize', () => {
		it('returns the count from Orama', async () => {
			(count as ReturnType<typeof vi.fn>).mockResolvedValue(42);

			const size = await getCacheSize();
			expect(size).toBe(42);
		});
	});

	describe('clearCache', () => {
		it('creates a fresh database', async () => {
			await clearCache();
			expect(create).toHaveBeenCalled();
		});
	});
});
