import { settingsStore } from '$lib/stores/settingsStore.svelte';
import { authStore } from '$lib/stores/authStore.svelte';
import { sendViaBridge } from '$lib/services/bridgeService';
import { buildContext } from '$lib/utils/contextBuilder';
import type { GraphNode } from '$lib/types/graph';
import { searchCache, addToCache, initCache } from '$lib/services/cacheService';
import { getEmbedding } from '$lib/services/embeddingService';

function getGeminiEndpoint(model: string): string {
	return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

export interface AIResponse {
	content: string;
	relatedNodes: string[];
	fromCache?: boolean;
}

interface GeminiContent {
	role: string;
	parts: { text: string }[];
}

function buildRequestBody(message: string, systemPrompt: string, history: { role: string; content: string }[]) {
	const contents: GeminiContent[] = [];

	for (const msg of history) {
		contents.push({
			role: msg.role === 'assistant' ? 'model' : 'user',
			parts: [{ text: msg.content }],
		});
	}

	contents.push({
		role: 'user',
		parts: [{ text: message }],
	});

	return {
		system_instruction: {
			parts: [{ text: systemPrompt }],
		},
		contents,
		generationConfig: {
			temperature: 0.7,
			topP: 0.9,
			maxOutputTokens: 2048,
		},
	};
}

export async function sendMessage(
	message: string,
	nodeContext: GraphNode | null,
	history: { role: string; content: string }[] = []
): Promise<AIResponse> {
	const track = authStore.activeTrack;

	if (track === 'none') {
		return {
			content: 'AI not connected. Please set up an API key or connect the local bridge.',
			relatedNodes: [],
		};
	}

	// Bridge track: send via WebSocket
	if (track === 'bridge') {
		try {
			const contextPrefix = nodeContext
				? `[Context: ${nodeContext.label} (${nodeContext.kind}) in ${nodeContext.filePath}]\n\n`
				: '';
			const content = await sendViaBridge(contextPrefix + message);
			return { content, relatedNodes: nodeContext ? [nodeContext.id] : [] };
		} catch (error) {
			return {
				content: `Bridge error: ${(error as Error).message}`,
				relatedNodes: [],
			};
		}
	}

	// BYOK track: Anthropic requires bridge
	if (settingsStore.aiProvider === 'anthropic') {
		return {
			content: 'Anthropic API requires Local Bridge mode due to browser CORS restrictions. Please connect via the Local Bridge tab in AI Connection settings.',
			relatedNodes: [],
		};
	}

	// BYOK track: use Gemini REST API
	const apiKey = settingsStore.geminiApiKey;
	const model = settingsStore.aiProvider === 'google' ? settingsStore.aiModel : 'gemini-2.5-flash-lite';
	const endpoint = getGeminiEndpoint(model);

	// Cache lookup (only for first messages without history for simplicity)
	if (settingsStore.cacheEnabled && history.length === 0) {
		try {
			await initCache();
			const embedding = await getEmbedding(message);
			if (embedding) {
				const cached = await searchCache(message, embedding);
				if (cached) {
					return {
						content: cached.response,
						relatedNodes: cached.nodeId ? [cached.nodeId] : [],
						fromCache: true,
					};
				}
			}
		} catch {
			// cache miss, proceed to API
		}
	}

	const systemPrompt = buildContext(nodeContext);
	const body = buildRequestBody(message, systemPrompt, history);
	const maxRetries = 3;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const response = await fetch(`${endpoint}?key=${apiKey}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (response.status === 429) {
				const waitMs = Math.pow(2, attempt) * 1000;
				await new Promise(resolve => setTimeout(resolve, waitMs));
				continue;
			}

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || `HTTP ${response.status}`;
				throw new Error(`Gemini API error: ${errorMessage}`);
			}

			const data = await response.json();
			const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
			const relatedNodes = nodeContext ? [nodeContext.id] : [];

			// Store in cache
			if (settingsStore.cacheEnabled && history.length === 0) {
				try {
					const embedding = await getEmbedding(message);
					if (embedding) {
						await addToCache(
							nodeContext?.id ?? '',
							message,
							content,
							nodeContext?.code ?? '',
							embedding
						);
					}
				} catch {
					// cache write failed, non-critical
				}
			}

			return { content, relatedNodes };
		} catch (error) {
			if (attempt === maxRetries - 1) {
				return {
					content: `Error: ${(error as Error).message}`,
					relatedNodes: [],
				};
			}
		}
	}

	return {
		content: 'Error: Maximum retries exceeded. Please try again later.',
		relatedNodes: [],
	};
}
