import { handleCors, callGemini, jsonResponse } from './shared';

interface Env {
	ALLOWED_ORIGINS: string;
}

type Provider = 'google' | 'anthropic' | 'openai';

interface ProxyRequest {
	provider: Provider;
	apiKey: string;
	model: string;
	messages: Array<{ role: string; content: string }>;
	system?: string;
}

// --- Provider별 API 호출 ---

async function callAnthropic(
	apiKey: string,
	model: string,
	messages: Array<{ role: string; content: string }>,
	systemPrompt?: string,
): Promise<Response> {
	const body: Record<string, unknown> = {
		model,
		max_tokens: 4096,
		messages: messages.map((m) => ({ role: m.role, content: m.content })),
	};

	if (systemPrompt) {
		body.system = systemPrompt;
	}

	return fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify(body),
	});
}

async function callOpenAI(
	apiKey: string,
	model: string,
	messages: Array<{ role: string; content: string }>,
	systemPrompt?: string,
): Promise<Response> {
	const msgs: Array<{ role: string; content: string }> = [];

	if (systemPrompt) {
		msgs.push({ role: 'system', content: systemPrompt });
	}
	msgs.push(...messages);

	return fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			messages: msgs,
			max_tokens: 4096,
		}),
	});
}

// --- 응답 정규화 (각 provider → 통일 형식) ---

function normalizeResponse(provider: Provider, data: any): string {
	if (provider === 'google') {
		return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
	}
	if (provider === 'anthropic') {
		const blocks = data?.content;
		if (Array.isArray(blocks)) {
			return blocks
				.filter((b: any) => b.type === 'text')
				.map((b: any) => b.text)
				.join('');
		}
		return '';
	}
	if (provider === 'openai') {
		return data?.choices?.[0]?.message?.content || '';
	}
	return '';
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const corsResult = handleCors(request, env.ALLOWED_ORIGINS);
		if (corsResult instanceof Response) return corsResult;
		const { headers } = corsResult;

		try {
			const body = (await request.json()) as ProxyRequest;
			const { provider, apiKey, model, messages, system } = body;

			if (!provider || !apiKey || !model || !messages) {
				return jsonResponse({ error: 'Missing required fields: provider, apiKey, model, messages' }, 400, headers);
			}

			let response: Response;

			switch (provider) {
				case 'google':
					response = await callGemini(apiKey, model, messages, system);
					break;
				case 'anthropic':
					response = await callAnthropic(apiKey, model, messages, system);
					break;
				case 'openai':
					response = await callOpenAI(apiKey, model, messages, system);
					break;
				default:
					return jsonResponse({ error: `Unsupported provider: ${provider}` }, 400, headers);
			}

			const result = await response.json();

			if (!response.ok) {
				console.error(`${provider} API error (${response.status}):`, JSON.stringify(result));
				return jsonResponse({ error: `${provider} API error: ${response.status}`, detail: result }, response.status, headers);
			}

			// 정규화된 텍스트 + 원본 모두 반환
			const text = normalizeResponse(provider, result);
			return jsonResponse({ text, raw: result }, 200, headers);
		} catch (err) {
			return jsonResponse({ error: 'Proxy error' }, 500, headers);
		}
	},
};
