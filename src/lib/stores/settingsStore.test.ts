import { describe, it, expect, beforeEach } from 'vitest';
import { settingsStore } from './settingsStore.svelte';

describe('settingsStore', () => {
	beforeEach(() => {
		settingsStore.clearAll();
	});

	describe('initial/cleared state', () => {
		it('geminiApiKey is empty string', () => {
			expect(settingsStore.geminiApiKey).toBe('');
		});

		it('anthropicApiKey is empty string', () => {
			expect(settingsStore.anthropicApiKey).toBe('');
		});

		it('aiProvider defaults to google', () => {
			expect(settingsStore.aiProvider).toBe('google');
		});

		it('aiModel defaults to gemini-2.5-flash-lite', () => {
			expect(settingsStore.aiModel).toBe('gemini-2.5-flash-lite');
		});

		it('cacheEnabled defaults to true', () => {
			expect(settingsStore.cacheEnabled).toBe(true);
		});

		it('language defaults to ko', () => {
			expect(settingsStore.language).toBe('ko');
		});

		it('syntaxTheme defaults to tomorrow', () => {
			expect(settingsStore.syntaxTheme).toBe('tomorrow');
		});
	});

	describe('setters', () => {
		it('sets geminiApiKey', () => {
			settingsStore.geminiApiKey = 'test-key-123';
			expect(settingsStore.geminiApiKey).toBe('test-key-123');
		});

		it('sets anthropicApiKey', () => {
			settingsStore.anthropicApiKey = 'sk-ant-test';
			expect(settingsStore.anthropicApiKey).toBe('sk-ant-test');
		});

		it('sets aiProvider', () => {
			settingsStore.aiProvider = 'anthropic';
			expect(settingsStore.aiProvider).toBe('anthropic');
		});

		it('sets aiModel', () => {
			settingsStore.aiModel = 'claude-3-opus';
			expect(settingsStore.aiModel).toBe('claude-3-opus');
		});

		it('sets cacheEnabled', () => {
			settingsStore.cacheEnabled = false;
			expect(settingsStore.cacheEnabled).toBe(false);
		});

		it('sets language', () => {
			settingsStore.language = 'en';
			expect(settingsStore.language).toBe('en');
		});

		it('sets syntaxTheme', () => {
			settingsStore.syntaxTheme = 'monokai';
			expect(settingsStore.syntaxTheme).toBe('monokai');
		});
	});

	describe('hasApiKey (derived getter)', () => {
		it('returns false when no API key is set', () => {
			expect(settingsStore.hasApiKey).toBe(false);
		});

		it('returns true when geminiApiKey is set and provider is google', () => {
			settingsStore.aiProvider = 'google';
			settingsStore.geminiApiKey = 'key123';
			expect(settingsStore.hasApiKey).toBe(true);
		});

		it('returns false when geminiApiKey is set but provider is anthropic', () => {
			settingsStore.aiProvider = 'anthropic';
			settingsStore.geminiApiKey = 'key123';
			expect(settingsStore.hasApiKey).toBe(false);
		});

		it('returns true when anthropicApiKey is set and provider is anthropic', () => {
			settingsStore.aiProvider = 'anthropic';
			settingsStore.anthropicApiKey = 'sk-ant-key';
			expect(settingsStore.hasApiKey).toBe(true);
		});

		it('returns false when anthropicApiKey is set but provider is google', () => {
			settingsStore.aiProvider = 'google';
			settingsStore.anthropicApiKey = 'sk-ant-key';
			expect(settingsStore.hasApiKey).toBe(false);
		});
	});

	describe('currentApiKey (derived getter)', () => {
		it('returns empty string when no key is set', () => {
			expect(settingsStore.currentApiKey).toBe('');
		});

		it('returns geminiApiKey when provider is google', () => {
			settingsStore.aiProvider = 'google';
			settingsStore.geminiApiKey = 'gemini-key';
			expect(settingsStore.currentApiKey).toBe('gemini-key');
		});

		it('returns anthropicApiKey when provider is anthropic', () => {
			settingsStore.aiProvider = 'anthropic';
			settingsStore.anthropicApiKey = 'anthropic-key';
			expect(settingsStore.currentApiKey).toBe('anthropic-key');
		});
	});

	describe('clearAll', () => {
		it('resets all values to defaults', () => {
			settingsStore.geminiApiKey = 'key1';
			settingsStore.anthropicApiKey = 'key2';
			settingsStore.aiProvider = 'anthropic';
			settingsStore.aiModel = 'custom-model';
			settingsStore.cacheEnabled = false;
			settingsStore.language = 'en';
			settingsStore.syntaxTheme = 'monokai';

			settingsStore.clearAll();

			expect(settingsStore.geminiApiKey).toBe('');
			expect(settingsStore.anthropicApiKey).toBe('');
			expect(settingsStore.aiProvider).toBe('google');
			expect(settingsStore.aiModel).toBe('gemini-2.5-flash-lite');
			expect(settingsStore.cacheEnabled).toBe(true);
			expect(settingsStore.language).toBe('ko');
			expect(settingsStore.syntaxTheme).toBe('tomorrow');
		});
	});
});
