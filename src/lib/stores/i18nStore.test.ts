import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { locale, t, toggleLocale } from './i18nStore';

describe('i18nStore', () => {
	beforeEach(() => {
		locale.set('ko');
	});

	describe('locale', () => {
		it('defaults to ko', () => {
			expect(get(locale)).toBe('ko');
		});

		it('can be set to en', () => {
			locale.set('en');
			expect(get(locale)).toBe('en');
		});
	});

	describe('toggleLocale', () => {
		it('toggles from ko to en', () => {
			toggleLocale();
			expect(get(locale)).toBe('en');
		});

		it('toggles from en to ko', () => {
			locale.set('en');
			toggleLocale();
			expect(get(locale)).toBe('ko');
		});

		it('toggles back and forth', () => {
			toggleLocale();
			expect(get(locale)).toBe('en');
			toggleLocale();
			expect(get(locale)).toBe('ko');
		});
	});

	describe('t (translation function)', () => {
		it('returns Korean translation for top-level key', () => {
			const translate = get(t);
			expect(translate('title')).toBe('CodeViz');
		});

		it('returns English translation when locale is en', () => {
			locale.set('en');
			const translate = get(t);
			expect(translate('subtitle')).toBe('Explore codebases visually');
		});

		it('resolves nested keys with dot notation', () => {
			const translate = get(t);
			expect(translate('landing.cta')).toBe('폴더 열기');
		});

		it('resolves nested English keys', () => {
			locale.set('en');
			const translate = get(t);
			expect(translate('landing.cta')).toBe('Open a Folder');
		});

		it('returns key string for unknown keys', () => {
			const translate = get(t);
			expect(translate('nonexistent.key')).toBe('nonexistent.key');
		});

		it('returns key for partially valid path', () => {
			const translate = get(t);
			expect(translate('landing.nonexistent')).toBe('landing.nonexistent');
		});

		it('resolves snippet keys', () => {
			locale.set('en');
			const translate = get(t);
			expect(translate('snippet.analyze')).toBe('Analyze');
		});

		it('resolves legend keys', () => {
			locale.set('en');
			const translate = get(t);
			expect(translate('legend.title')).toBe('Legend');
		});
	});
});
