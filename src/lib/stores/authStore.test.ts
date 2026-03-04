import { describe, it, expect, beforeEach } from 'vitest';
import { authStore } from './authStore.svelte';
import { settingsStore } from './settingsStore.svelte';

describe('authStore', () => {
	beforeEach(() => {
		authStore.bridgeStatus = 'disconnected';
		authStore.bridgePort = 9876;
		authStore.bridgeError = '';
		settingsStore.clearAll();
	});

	describe('initial state', () => {
		it('bridgeStatus is disconnected', () => {
			expect(authStore.bridgeStatus).toBe('disconnected');
		});

		it('bridgePort is 9876', () => {
			expect(authStore.bridgePort).toBe(9876);
		});

		it('bridgeError is empty string', () => {
			expect(authStore.bridgeError).toBe('');
		});
	});

	describe('setters', () => {
		it('sets bridgeStatus', () => {
			authStore.bridgeStatus = 'connected';
			expect(authStore.bridgeStatus).toBe('connected');
		});

		it('sets bridgeStatus to all valid states', () => {
			const states = ['disconnected', 'connecting', 'connected', 'reconnecting', 'error'] as const;
			for (const state of states) {
				authStore.bridgeStatus = state;
				expect(authStore.bridgeStatus).toBe(state);
			}
		});

		it('sets bridgePort', () => {
			authStore.bridgePort = 3000;
			expect(authStore.bridgePort).toBe(3000);
		});

		it('sets bridgeError', () => {
			authStore.bridgeError = 'Connection refused';
			expect(authStore.bridgeError).toBe('Connection refused');
		});
	});

	describe('isReady (derived getter)', () => {
		it('returns false when no API key and bridge disconnected', () => {
			expect(authStore.isReady).toBe(false);
		});

		it('returns true when bridge is connected', () => {
			authStore.bridgeStatus = 'connected';
			expect(authStore.isReady).toBe(true);
		});

		it('returns true when API key is set (BYOK)', () => {
			settingsStore.aiProvider = 'google';
			settingsStore.geminiApiKey = 'test-key';
			expect(authStore.isReady).toBe(true);
		});

		it('returns true when both bridge connected and API key set', () => {
			authStore.bridgeStatus = 'connected';
			settingsStore.aiProvider = 'google';
			settingsStore.geminiApiKey = 'test-key';
			expect(authStore.isReady).toBe(true);
		});

		it('returns false when bridge is connecting but no API key', () => {
			authStore.bridgeStatus = 'connecting';
			expect(authStore.isReady).toBe(false);
		});
	});

	describe('activeTrack (derived getter)', () => {
		it('returns none when no auth configured', () => {
			expect(authStore.activeTrack).toBe('none');
		});

		it('returns bridge when bridge is connected', () => {
			authStore.bridgeStatus = 'connected';
			expect(authStore.activeTrack).toBe('bridge');
		});

		it('returns byok when API key is set', () => {
			settingsStore.aiProvider = 'google';
			settingsStore.geminiApiKey = 'test-key';
			expect(authStore.activeTrack).toBe('byok');
		});

		it('returns bridge when both bridge connected and API key set (bridge takes priority)', () => {
			authStore.bridgeStatus = 'connected';
			settingsStore.aiProvider = 'google';
			settingsStore.geminiApiKey = 'test-key';
			expect(authStore.activeTrack).toBe('bridge');
		});
	});
});
