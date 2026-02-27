import { settingsStore } from '$lib/stores/settingsStore.svelte';

const EMBEDDING_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

export async function getEmbedding(text: string): Promise<number[] | null> {
	const apiKey = settingsStore.geminiApiKey;
	if (!apiKey) return null;

	try {
		const response = await fetch(`${EMBEDDING_ENDPOINT}?key=${apiKey}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: 'models/text-embedding-004',
				content: { parts: [{ text }] },
			}),
		});

		if (!response.ok) return null;

		const data = await response.json();
		return data?.embedding?.values ?? null;
	} catch {
		return null;
	}
}
