import type { SemanticLevel } from '$lib/types/semantic';

const CACHE_NAME = 'ropeman/semantic';

// One-time migration: delete old IndexedDB
try {
	indexedDB.deleteDatabase('ropeman-semantic-cache');
} catch {
	/* ignore */
}

function makeKey(projectName: string, levelKey: string): string {
	return `https://ropeman.local/semantic/${encodeURIComponent(projectName)}/${encodeURIComponent(levelKey)}`;
}

export async function loadSemanticCache(projectName: string): Promise<Map<string, SemanticLevel>> {
	const result = new Map<string, SemanticLevel>();
	try {
		const cache = await caches.open(CACHE_NAME);
		const keys = await cache.keys();
		const prefix = `https://ropeman.local/semantic/${encodeURIComponent(projectName)}/`;
		for (const req of keys) {
			if (req.url.startsWith(prefix)) {
				const levelKey = decodeURIComponent(req.url.slice(prefix.length));
				const resp = await cache.match(req);
				if (resp) {
					const level = (await resp.json()) as SemanticLevel;
					result.set(levelKey, level);
				}
			}
		}
	} catch {
		// silent fail
	}
	return result;
}

export async function saveSemanticLevel(
	projectName: string,
	levelKey: string,
	level: SemanticLevel
): Promise<void> {
	try {
		const cache = await caches.open(CACHE_NAME);
		const url = makeKey(projectName, levelKey);
		const resp = new Response(JSON.stringify(level), {
			headers: { 'Content-Type': 'application/json' }
		});
		await cache.put(new Request(url), resp);
	} catch {
		// silent fail
	}
}

export async function clearSemanticCache(): Promise<void> {
	try {
		await caches.delete(CACHE_NAME);
	} catch {
		// silent fail
	}
}

export async function getSemanticCacheSize(): Promise<number> {
	try {
		const cache = await caches.open(CACHE_NAME);
		const keys = await cache.keys();
		return keys.length;
	} catch {
		return 0;
	}
}
