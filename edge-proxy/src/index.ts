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
		// 다음 자정(UTC) 기준 리셋
		const tomorrow = new Date();
		tomorrow.setUTCHours(24, 0, 0, 0);
		dailyResetAt = tomorrow.getTime();
	}
	if (dailyCount >= limit) return false;
	dailyCount++;
	return true;
}

// --- CORS ---
function getAllowedOrigin(requestOrigin: string | null, allowedList: string): string {
	if (!allowedList) return '';
	const origins = allowedList.split(',').map((o) => o.trim());
	if (requestOrigin && origins.includes(requestOrigin)) return requestOrigin;
	return '';
}

function corsHeaders(origin: string) {
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400',
	};
}

// --- Gemini API 호출 ---
async function callGemini(
	apiKey: string,
	model: string,
	messages: Array<{ role: string; content: string }>,
	systemPrompt?: string,
): Promise<Response> {
	// Ropeman 형식 (OpenAI-like) → Gemini 형식으로 변환
	const contents = messages.map((m) => ({
		role: m.role === 'assistant' ? 'model' : 'user',
		parts: [{ text: m.content }],
	}));

	const body: Record<string, unknown> = {
		contents,
		generationConfig: {
			maxOutputTokens: 4096,
		},
	};

	if (systemPrompt) {
		body.systemInstruction = { parts: [{ text: systemPrompt }] };
	}

	const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
	return fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

// --- Worker Entry ---
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const requestOrigin = request.headers.get('Origin');
		const origin = getAllowedOrigin(requestOrigin, env.ALLOWED_ORIGINS);
		if (!origin) {
			return new Response('Origin not allowed', { status: 403 });
		}
		const headers = corsHeaders(origin);

		// CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers });
		}

		// POST only
		if (request.method !== 'POST') {
			return new Response('Method not allowed', { status: 405, headers });
		}

		// Rate limit (IP별 분당)
		const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
		const perMinLimit = parseInt(env.RATE_LIMIT_PER_MIN || '10');
		if (!checkIpRateLimit(ip, perMinLimit)) {
			return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }), {
				status: 429,
				headers: { ...headers, 'Content-Type': 'application/json' },
			});
		}

		// Daily global cap
		const dailyLimit = parseInt(env.DAILY_LIMIT_TOTAL || '200');
		if (!checkDailyLimit(dailyLimit)) {
			return new Response(JSON.stringify({ error: 'Daily demo limit reached. Please try again tomorrow or use your own API key.' }), {
				status: 429,
				headers: { ...headers, 'Content-Type': 'application/json' },
			});
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
				return new Response(JSON.stringify({ error: `Gemini API error: ${response.status}`, detail: result }), {
					status: response.status,
					headers: { ...headers, 'Content-Type': 'application/json' },
				});
			}

			return new Response(result, {
				status: response.status,
				headers: { ...headers, 'Content-Type': 'application/json' },
			});
		} catch (err) {
			return new Response(JSON.stringify({ error: 'Proxy error' }), {
				status: 500,
				headers: { ...headers, 'Content-Type': 'application/json' },
			});
		}
	},
};
