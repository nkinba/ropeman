import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/config', () => ({
	PROXY_URL: 'https://proxy.test'
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { testApiKey } from './apiKeyValidator';

describe('apiKeyValidator', () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	describe('google provider', () => {
		it('returns valid when response is ok (200)', async () => {
			// Arrange
			mockFetch.mockResolvedValue({ ok: true });

			// Act
			const result = await testApiKey('google', 'test-key', 'gemini-pro');

			// Assert
			expect(result).toEqual({ valid: true });
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('generativelanguage.googleapis.com'),
				expect.objectContaining({ method: 'POST' })
			);
		});

		it('returns invalid with error message when response is not ok', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				ok: false,
				status: 403,
				json: () => Promise.resolve({ error: { message: 'API key not valid' } })
			});

			// Act
			const result = await testApiKey('google', 'bad-key', 'gemini-pro');

			// Assert
			expect(result).toEqual({ valid: false, error: 'API key not valid' });
		});

		it('returns HTTP status when error JSON has no message', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				ok: false,
				status: 500,
				json: () => Promise.resolve({})
			});

			// Act
			const result = await testApiKey('google', 'bad-key', 'gemini-pro');

			// Assert
			expect(result).toEqual({ valid: false, error: 'HTTP 500' });
		});

		it('returns HTTP status when res.json() throws', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				ok: false,
				status: 401,
				json: () => Promise.reject(new Error('parse error'))
			});

			// Act
			const result = await testApiKey('google', 'bad-key', 'gemini-pro');

			// Assert
			expect(result).toEqual({ valid: false, error: 'HTTP 401' });
		});
	});

	describe('anthropic provider (via proxy)', () => {
		it('returns valid when proxy response is ok (200)', async () => {
			// Arrange
			mockFetch.mockResolvedValue({ ok: true });

			// Act
			const result = await testApiKey('anthropic', 'sk-ant-key', 'claude-3-opus');

			// Assert
			expect(result).toEqual({ valid: true });
			expect(mockFetch).toHaveBeenCalledWith(
				'https://proxy.test',
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('"provider":"anthropic"')
				})
			);
		});

		it('returns invalid with error from proxy when response is not ok', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				ok: false,
				status: 401,
				json: () => Promise.resolve({ error: 'Invalid API key' })
			});

			// Act
			const result = await testApiKey('anthropic', 'bad-key', 'claude-3-opus');

			// Assert
			expect(result).toEqual({ valid: false, error: 'Invalid API key' });
		});
	});

	describe('openai provider (via proxy)', () => {
		it('returns valid when proxy response is ok (200)', async () => {
			// Arrange
			mockFetch.mockResolvedValue({ ok: true });

			// Act
			const result = await testApiKey('openai', 'sk-openai-key', 'gpt-4o');

			// Assert
			expect(result).toEqual({ valid: true });
			expect(mockFetch).toHaveBeenCalledWith(
				'https://proxy.test',
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('"provider":"openai"')
				})
			);
		});

		it('returns invalid with HTTP status when response is not ok and json fails', async () => {
			// Arrange
			mockFetch.mockResolvedValue({
				ok: false,
				status: 429,
				json: () => Promise.reject(new Error('parse error'))
			});

			// Act
			const result = await testApiKey('openai', 'bad-key', 'gpt-4o');

			// Assert
			expect(result).toEqual({ valid: false, error: 'HTTP 429' });
		});
	});

	describe('unknown provider', () => {
		it('returns error for unknown provider', async () => {
			// Act
			const result = await testApiKey('unknown-provider', 'key', 'model');

			// Assert
			expect(result).toEqual({ valid: false, error: 'Unknown provider' });
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe('network error', () => {
		it('returns error message when fetch throws', async () => {
			// Arrange
			mockFetch.mockRejectedValue(new Error('Network request failed'));

			// Act
			const result = await testApiKey('google', 'key', 'gemini-pro');

			// Assert
			expect(result).toEqual({ valid: false, error: 'Network request failed' });
		});
	});
});
