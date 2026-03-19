import { describe, it, expect, beforeEach, vi } from 'vitest';
import { themeStore } from './themeStore.svelte';

describe('themeStore', () => {
	beforeEach(() => {
		themeStore.current = 'dark';
	});

	describe('initial state', () => {
		it('defaults to dark', () => {
			expect(themeStore.current).toBe('dark');
		});
	});

	describe('toggle', () => {
		it('toggles from dark to light', () => {
			themeStore.toggle();
			expect(themeStore.current).toBe('light');
		});

		it('toggles from light to dark', () => {
			themeStore.current = 'light';
			themeStore.toggle();
			expect(themeStore.current).toBe('dark');
		});

		it('toggles back and forth', () => {
			themeStore.toggle();
			expect(themeStore.current).toBe('light');
			themeStore.toggle();
			expect(themeStore.current).toBe('dark');
		});
	});

	describe('manual set', () => {
		it('can be set to light', () => {
			themeStore.current = 'light';
			expect(themeStore.current).toBe('light');
		});

		it('can be set to dark', () => {
			themeStore.current = 'light';
			themeStore.current = 'dark';
			expect(themeStore.current).toBe('dark');
		});
	});
});
