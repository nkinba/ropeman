export interface KeyTestResult {
	valid: boolean;
	error?: string;
}

async function testViaProxy(provider: string, key: string, model: string): Promise<KeyTestResult> {
	const { PROXY_URL } = await import('$lib/config');
	const res = await fetch(PROXY_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			provider,
			apiKey: key,
			model,
			messages: [{ role: 'user', content: 'Say "ok"' }]
		})
	});
	if (res.ok) return { valid: true };
	const data = await res.json().catch(() => ({}));
	return { valid: false, error: (data as { error?: string })?.error || `HTTP ${res.status}` };
}

export async function testApiKey(
	provider: string,
	key: string,
	model: string
): Promise<KeyTestResult> {
	try {
		if (provider === 'google') {
			const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
			const res = await fetch(`${endpoint}?key=${key}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					contents: [{ parts: [{ text: 'Say "ok"' }] }],
					generationConfig: { maxOutputTokens: 8 }
				})
			});
			if (res.ok) return { valid: true };
			const data = await res.json().catch(() => ({}));
			return {
				valid: false,
				error: (data as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`
			};
		}
		if (provider === 'anthropic' || provider === 'openai') {
			return testViaProxy(provider, key, model);
		}
		return { valid: false, error: 'Unknown provider' };
	} catch (err) {
		return { valid: false, error: (err as Error).message };
	}
}
