import { handleCors, callGemini, jsonResponse } from './shared';

interface Env {
	GEMINI_API_KEY: string;
	ALLOWED_ORIGINS: string;
	RATE_LIMIT_PER_MIN: string;
	DAILY_LIMIT_TOTAL: string;
	DEMO_MODEL: string;
}

// --- Rate Limiter (IP별 분당) ---
const ipCounts = new Map<string, { count: number; resetAt: number }>();

function checkIpRateLimit(ip: string, limit: number): boolean {
	const now = Date.now();
	const entry = ipCounts.get(ip);
	if (!entry || now > entry.resetAt) {
		ipCounts.set(ip, { count: 1, resetAt: now + 60_000 });
		return true;
	}
	if (entry.count >= limit) return false;
	entry.count++;
	return true;
}

// --- Daily Global Cap ---
let dailyCount = 0;
let dailyResetAt = 0;

function checkDailyLimit(limit: number): boolean {
	const now = Date.now();
	if (now > dailyResetAt) {
		dailyCount = 0;
		const tomorrow = new Date();
		tomorrow.setUTCHours(24, 0, 0, 0);
		dailyResetAt = tomorrow.getTime();
	}
	if (dailyCount >= limit) return false;
	dailyCount++;
	return true;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const corsResult = handleCors(request, env.ALLOWED_ORIGINS);
		if (corsResult instanceof Response) return corsResult;
		const { headers } = corsResult;

		// Rate limit (IP별 분당)
		const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
		const perMinLimit = parseInt(env.RATE_LIMIT_PER_MIN || '10');
		if (!checkIpRateLimit(ip, perMinLimit)) {
			return jsonResponse({ error: 'Rate limit exceeded. Try again in a minute.' }, 429, headers);
		}

		// Daily global cap
		const dailyLimit = parseInt(env.DAILY_LIMIT_TOTAL || '200');
		if (!checkDailyLimit(dailyLimit)) {
			return jsonResponse({ error: 'Daily demo limit reached. Please try again tomorrow or use your own API key.' }, 429, headers);
		}

		try {
			const body = (await request.json()) as Record<string, unknown>;
			const messages = body.messages as Array<{ role: string; content: string }>;
			const systemPrompt = body.system as string | undefined;
			const model = env.DEMO_MODEL || 'gemini-3-flash-preview';

			const response = await callGemini(env.GEMINI_API_KEY, model, messages, systemPrompt);
			const result = await response.text();

			if (!response.ok) {
				console.error(`Gemini API error (${response.status}):`, result);
				return jsonResponse({ error: `Gemini API error: ${response.status}`, detail: result }, response.status, headers);
			}

			return new Response(result, {
				status: response.status,
				headers: { ...headers, 'Content-Type': 'application/json' },
			});
		} catch (err) {
			return jsonResponse({ error: 'Proxy error' }, 500, headers);
		}
	},
};
