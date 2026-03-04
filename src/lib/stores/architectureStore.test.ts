import { describe, it, expect, beforeEach } from 'vitest';
import { architectureStore } from './architectureStore.svelte';

describe('architectureStore', () => {
	beforeEach(() => {
		architectureStore.clear();
	});

	describe('initial state', () => {
		it('groups is empty array', () => {
			expect(architectureStore.groups).toEqual([]);
		});

		it('isAnalyzing is false', () => {
			expect(architectureStore.isAnalyzing).toBe(false);
		});

		it('enabled is false', () => {
			expect(architectureStore.enabled).toBe(false);
		});
	});

	describe('setters', () => {
		it('sets groups', () => {
			const groups = [
				{ name: 'UI', color: '#ff0000', nodeIds: ['n1', 'n2'] },
				{ name: 'API', color: '#00ff00', nodeIds: ['n3'] }
			];
			architectureStore.groups = groups;
			expect(architectureStore.groups).toEqual(groups);
		});

		it('sets isAnalyzing', () => {
			architectureStore.isAnalyzing = true;
			expect(architectureStore.isAnalyzing).toBe(true);
		});

		it('sets enabled', () => {
			architectureStore.enabled = true;
			expect(architectureStore.enabled).toBe(true);
		});
	});

	describe('clear', () => {
		it('resets all state to initial values', () => {
			architectureStore.groups = [{ name: 'Test', color: '#000', nodeIds: ['x'] }];
			architectureStore.isAnalyzing = true;
			architectureStore.enabled = true;

			architectureStore.clear();

			expect(architectureStore.groups).toEqual([]);
			expect(architectureStore.isAnalyzing).toBe(false);
			expect(architectureStore.enabled).toBe(false);
		});

		it('is idempotent', () => {
			architectureStore.clear();
			architectureStore.clear();
			expect(architectureStore.groups).toEqual([]);
		});
	});
});
