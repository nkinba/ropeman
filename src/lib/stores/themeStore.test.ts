import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { theme, toggleTheme } from './themeStore';

describe('themeStore', () => {
	beforeEach(() => {
		theme.set('dark');
	});

	describe('initial state', () => {
		it('defaults to dark', () => {
			expect(get(theme)).toBe('dark');
		});
	});

	describe('toggleTheme', () => {
		it('toggles from dark to light', () => {
			toggleTheme();
			expect(get(theme)).toBe('light');
		});

		it('toggles from light to dark', () => {
			theme.set('light');
			toggleTheme();
			expect(get(theme)).toBe('dark');
		});

		it('toggles back and forth', () => {
			toggleTheme();
			expect(get(theme)).toBe('light');
			toggleTheme();
			expect(get(theme)).toBe('dark');
		});
	});

	describe('manual set', () => {
		it('can be set to light', () => {
			theme.set('light');
			expect(get(theme)).toBe('light');
		});

		it('can be set to dark', () => {
			theme.set('light');
			theme.set('dark');
			expect(get(theme)).toBe('dark');
		});
	});
});
