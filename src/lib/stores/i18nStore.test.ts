import { describe, it, expect, beforeEach } from 'vitest';
import { i18nStore } from './i18nStore.svelte';

describe('i18nStore', () => {
	beforeEach(() => {
		i18nStore.locale = 'ko';
	});

	describe('locale', () => {
		it('defaults to ko', () => {
			expect(i18nStore.locale).toBe('ko');
		});

		it('can be set to en', () => {
			i18nStore.locale = 'en';
			expect(i18nStore.locale).toBe('en');
		});
	});

	describe('toggleLocale', () => {
		it('toggles from ko to en', () => {
			i18nStore.toggleLocale();
			expect(i18nStore.locale).toBe('en');
		});

		it('toggles from en to ko', () => {
			i18nStore.locale = 'en';
			i18nStore.toggleLocale();
			expect(i18nStore.locale).toBe('ko');
		});

		it('toggles back and forth', () => {
			i18nStore.toggleLocale();
			expect(i18nStore.locale).toBe('en');
			i18nStore.toggleLocale();
			expect(i18nStore.locale).toBe('ko');
		});
	});

	describe('t (translation function)', () => {
		it('returns Korean translation for top-level key', () => {
			expect(i18nStore.t('title')).toBe('Ropeman');
		});

		it('returns English translation when locale is en', () => {
			i18nStore.locale = 'en';
			expect(i18nStore.t('subtitle')).toBe('Explore codebases visually');
		});

		it('resolves nested keys with dot notation', () => {
			expect(i18nStore.t('landing.cta')).toBe('폴더 열기');
		});

		it('resolves nested English keys', () => {
			i18nStore.locale = 'en';
			expect(i18nStore.t('landing.cta')).toBe('Open Folder');
		});

		it('returns key string for unknown keys', () => {
			expect(i18nStore.t('nonexistent.key')).toBe('nonexistent.key');
		});

		it('returns key for partially valid path', () => {
			expect(i18nStore.t('landing.nonexistent')).toBe('landing.nonexistent');
		});

		it('resolves snippet keys', () => {
			i18nStore.locale = 'en';
			expect(i18nStore.t('snippet.analyze')).toBe('Analyze');
		});

		it('resolves legend keys', () => {
			i18nStore.locale = 'en';
			expect(i18nStore.t('legend.title')).toBe('Legend');
		});

		it('resolves docs keys in ko', () => {
			expect(i18nStore.t('docs.headerLink')).toBe('문서');
			expect(i18nStore.t('docs.backToApp')).toBe('앱으로 돌아가기');
			expect(i18nStore.t('docs.onThisPage')).toBe('이 페이지');
		});

		it('resolves docs keys in en', () => {
			i18nStore.locale = 'en';
			expect(i18nStore.t('docs.headerLink')).toBe('Docs');
			expect(i18nStore.t('docs.backToApp')).toBe('Back to App');
			expect(i18nStore.t('docs.onThisPage')).toBe('On this page');
		});

		it('resolves docs category labels', () => {
			expect(i18nStore.t('docs.categoryIntro')).toBe('시작하기');
			expect(i18nStore.t('docs.categoryGuides')).toBe('가이드');
			expect(i18nStore.t('docs.categoryReference')).toBe('레퍼런스');
			expect(i18nStore.t('docs.categorySupport')).toBe('도움말');
		});
	});
});
