import { create, insert, search, remove, count, save, load, type Orama, type Results } from '@orama/orama';

const DB_NAME = 'codeviz-cache';
const IDB_STORE = 'orama-data';
const MAX_ENTRIES = 500;
const SIMILARITY_THRESHOLD = 0.9;

const schema = {
	nodeId: 'string',
	query: 'string',
	response: 'string',
	code: 'string',
	embedding: 'vector[768]',
	timestamp: 'number',
} as const;

let db: Orama<typeof schema> | null = null;

// --- IndexedDB helpers (no external deps) ---

function openIDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			req.result.createObjectStore(IDB_STORE);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function idbGet(key: string): Promise<unknown | null> {
	const idb = await openIDB();
	return new Promise((resolve, reject) => {
		const tx = idb.transaction(IDB_STORE, 'readonly');
		const req = tx.objectStore(IDB_STORE).get(key);
		req.onsuccess = () => resolve(req.result ?? null);
		req.onerror = () => reject(req.error);
		tx.oncomplete = () => idb.close();
	});
}

async function idbSet(key: string, value: unknown): Promise<void> {
	const idb = await openIDB();
	return new Promise((resolve, reject) => {
		const tx = idb.transaction(IDB_STORE, 'readwrite');
		tx.objectStore(IDB_STORE).put(value, key);
		tx.oncomplete = () => { idb.close(); resolve(); };
		tx.onerror = () => { idb.close(); reject(tx.error); };
	});
}

async function idbDelete(key: string): Promise<void> {
	const idb = await openIDB();
	return new Promise((resolve, reject) => {
		const tx = idb.transaction(IDB_STORE, 'readwrite');
		tx.objectStore(IDB_STORE).delete(key);
		tx.oncomplete = () => { idb.close(); resolve(); };
		tx.onerror = () => { idb.close(); reject(tx.error); };
	});
}

// --- Cache API ---

export async function initCache(): Promise<void> {
	if (db) return;

	try {
		const stored = typeof window !== 'undefined' ? await idbGet('db') : null;
		if (stored) {
			db = await create({ schema, id: DB_NAME });
			load(db, stored as Parameters<typeof load>[1]);
		}
	} catch {
		// stored data corrupted, start fresh
	}

	if (!db) {
		db = await create({ schema, id: DB_NAME });
	}
}

export async function searchCache(
	query: string,
	embedding: number[]
): Promise<{ response: string; code: string; nodeId: string } | null> {
	if (!db) await initCache();
	if (!db) return null;

	try {
		const results: Results<typeof schema> = await search(db, {
			mode: 'vector',
			vector: { value: embedding, property: 'embedding' },
			limit: 1,
			similarity: SIMILARITY_THRESHOLD,
		});

		if (results.hits.length > 0) {
			const hit = results.hits[0];
			const doc = hit.document as { response: string; code: string; nodeId: string };
			return { response: doc.response, code: doc.code, nodeId: doc.nodeId };
		}
	} catch {
		// search failed, fallback to API
	}

	return null;
}

export async function addToCache(
	nodeId: string,
	query: string,
	response: string,
	code: string,
	embedding: number[]
): Promise<void> {
	if (!db) await initCache();
	if (!db) return;

	try {
		// LRU eviction: if at max, remove oldest
		const currentCount = await count(db);
		if (currentCount >= MAX_ENTRIES) {
			const oldest: Results<typeof schema> = await search(db, {
				term: '',
				limit: 1,
				sortBy: { property: 'timestamp', order: 'ASC' },
			});
			if (oldest.hits.length > 0) {
				await remove(db, oldest.hits[0].id);
			}
		}

		await insert(db, {
			nodeId,
			query,
			response,
			code,
			embedding,
			timestamp: Date.now(),
		});

		await persistCache();
	} catch {
		// insertion failed silently
	}
}

export async function clearCache(): Promise<void> {
	db = await create({ schema, id: DB_NAME });
	if (typeof window !== 'undefined') {
		await idbDelete('db');
	}
}

export async function getCacheSize(): Promise<number> {
	if (!db) await initCache();
	if (!db) return 0;
	try {
		return await count(db);
	} catch {
		return 0;
	}
}

export async function persistCache(): Promise<void> {
	if (!db) return;
	try {
		const data = save(db);
		if (typeof window !== 'undefined') {
			await idbSet('db', data);
		}
	} catch {
		// persist failed silently
	}
}
