import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/stores/settingsStore.svelte', () => ({
	settingsStore: {
		geminiApiKey: 'test-api-key'
	}
}));

import { getEmbedding } from './embeddingService';
import { settingsStore } from '$lib/stores/settingsStore.svelte';

describe('embeddingService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(settingsStore as any).geminiApiKey = 'test-api-key';
	});

	describe('getEmbedding', () => {
		it('returns null when no API key', async () => {
			(settingsStore as any).geminiApiKey = '';

			const result = await getEmbedding('hello');
			expect(result).toBeNull();
		});

		it('returns embedding values on success', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						embedding: { values: [0.1, 0.2, 0.3] }
					})
			});

			const result = await getEmbedding('test text');

			expect(result).toEqual([0.1, 0.2, 0.3]);
			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining('text-embedding-004'),
				expect.objectContaining({ method: 'POST' })
			);
		});

		it('returns null on HTTP error', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 401
			});

			const result = await getEmbedding('test');
			expect(result).toBeNull();
		});

		it('returns null on fetch failure', async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

			const result = await getEmbedding('test');
			expect(result).toBeNull();
		});

		it('returns null when response has no embedding', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({})
			});

			const result = await getEmbedding('test');
			expect(result).toBeNull();
		});
	});
});
