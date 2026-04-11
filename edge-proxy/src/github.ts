import { getAllowedOrigin, corsHeaders, jsonResponse } from './shared';

interface Env {
	ALLOWED_ORIGINS: string;
	GITHUB_PAT: string;
	GITHUB_CACHE: KVNamespace;
}

// Rate limiting (IP-based)
const ipMinuteCounts = new Map<string, { count: number; resetAt: number }>();
const ipDailyCounts = new Map<string, { count: number; resetAt: number }>();

function pruneExpired(map: Map<string, { count: number; resetAt: number }>, now: number) {
	if (map.size > 5000) {
		for (const [key, entry] of map) {
			if (now > entry.resetAt) map.delete(key);
		}
	}
}

function checkIpRateLimit(ip: string, perMin: number, perDay: number): boolean {
	const now = Date.now();

	pruneExpired(ipMinuteCounts, now);
	pruneExpired(ipDailyCounts, now);

	// Per-minute check
	const minEntry = ipMinuteCounts.get(ip);
	if (!minEntry || now > minEntry.resetAt) {
		ipMinuteCounts.set(ip, { count: 1, resetAt: now + 60_000 });
	} else {
		if (minEntry.count >= perMin) return false;
		minEntry.count++;
	}

	// Per-day check
	const dayEntry = ipDailyCounts.get(ip);
	if (!dayEntry || now > dayEntry.resetAt) {
		const tomorrow = new Date();
		tomorrow.setUTCHours(24, 0, 0, 0);
		ipDailyCounts.set(ip, { count: 1, resetAt: tomorrow.getTime() });
	} else {
		if (dayEntry.count >= perDay) return false;
		dayEntry.count++;
	}

	return true;
}

const TREE_CACHE_TTL = 86400; // 24 hours

function githubHeaders(pat: string): Record<string, string> {
	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'User-Agent': 'ropeman-proxy',
		'X-GitHub-Api-Version': '2022-11-28',
	};
	if (pat) {
		headers.Authorization = `Bearer ${pat}`;
	}
	return headers;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const requestOrigin = request.headers.get('Origin');
		const origin = getAllowedOrigin(requestOrigin, env.ALLOWED_ORIGINS);
		if (!origin) {
			return new Response('Origin not allowed', { status: 403 });
		}
		const cors = corsHeaders(origin);
		// Override to allow GET
		cors['Access-Control-Allow-Methods'] = 'GET, OPTIONS';

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: cors });
		}

		if (request.method !== 'GET') {
			return new Response('Method not allowed', { status: 405, headers: cors });
		}

		// Rate limit
		const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
		if (!checkIpRateLimit(ip, 30, 300)) {
			return jsonResponse({ error: 'Rate limit exceeded' }, 429, cors);
		}

		const url = new URL(request.url);
		const path = url.pathname;

		// Route: /github/tree/{owner}/{repo}/{ref}
		const treeMatch = path.match(/^\/github\/tree\/([^/]+)\/([^/]+)\/(.+)$/);
		if (treeMatch) {
			const [, owner, repo, ref] = treeMatch;
			return handleTree(env, owner, repo, ref, cors);
		}

		// Route: /github/file/{owner}/{repo}/{ref}/{...path}
		const fileMatch = path.match(/^\/github\/file\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
		if (fileMatch) {
			const [, owner, repo, ref, filePath] = fileMatch;
			return handleFile(env, owner, repo, ref, filePath, cors);
		}

		return jsonResponse({ error: 'Not found' }, 404, cors);
	},
};

async function handleTree(env: Env, owner: string, repo: string, ref: string, cors: Record<string, string>): Promise<Response> {
	// Check KV cache
	const cacheKey = `tree:${owner}/${repo}/${ref}`;
	const cached = await env.GITHUB_CACHE.get(cacheKey);
	if (cached) {
		return new Response(cached, {
			status: 200,
			headers: { ...cors, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
		});
	}

	// Fetch from GitHub
	const ghUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
	const res = await fetch(ghUrl, { headers: githubHeaders(env.GITHUB_PAT) });

	if (!res.ok) {
		const body = await res.text();
		return new Response(body, {
			status: res.status,
			headers: { ...cors, 'Content-Type': 'application/json' },
		});
	}

	const body = await res.text();

	// Cache in KV (24h TTL)
	await env.GITHUB_CACHE.put(cacheKey, body, { expirationTtl: TREE_CACHE_TTL });

	return new Response(body, {
		status: 200,
		headers: { ...cors, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
	});
}

async function handleFile(
	env: Env,
	owner: string,
	repo: string,
	ref: string,
	filePath: string,
	cors: Record<string, string>,
): Promise<Response> {
	const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`;
	const res = await fetch(rawUrl, {
		headers: { 'User-Agent': 'ropeman-proxy' },
	});

	if (!res.ok) {
		return new Response(res.statusText, {
			status: res.status,
			headers: cors,
		});
	}

	const content = await res.text();
	return new Response(content, {
		status: 200,
		headers: {
			...cors,
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
}
