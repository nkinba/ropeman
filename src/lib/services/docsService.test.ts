import { describe, it, expect } from 'vitest';
import {
	parseDocPath,
	getDocs,
	getDocBySlug,
	getAllEntries,
	buildSidebar,
	type DocModule
} from './docsService';

const mockComponent = (() => null) as unknown as DocModule['default'];

function mod(title: string, category: string, order: number, description = ''): DocModule {
	return {
		default: mockComponent,
		metadata: { title, description, category, order }
	};
}

const mockModules: Record<string, DocModule> = {
	'/src/content/docs/ko/getting-started.md': mod('시작하기', 'intro', 1),
	'/src/content/docs/ko/ai-modes.md': mod('AI 모드', 'guides', 2),
	'/src/content/docs/ko/security.md': mod('보안', 'guides', 3),
	'/src/content/docs/ko/faq.md': mod('FAQ', 'reference', 4),
	'/src/content/docs/en/getting-started.md': mod('Getting Started', 'intro', 1),
	'/src/content/docs/en/ai-modes.md': mod('AI Modes', 'guides', 2)
};

describe('docsService.parseDocPath', () => {
	it('parses ko paths', () => {
		expect(parseDocPath('/src/content/docs/ko/getting-started.md')).toEqual({
			locale: 'ko',
			slug: 'getting-started'
		});
	});

	it('parses en paths', () => {
		expect(parseDocPath('/src/content/docs/en/ai-modes.md')).toEqual({
			locale: 'en',
			slug: 'ai-modes'
		});
	});

	it('returns null for non-docs paths', () => {
		expect(parseDocPath('/src/lib/foo.md')).toBeNull();
		expect(parseDocPath('/src/content/docs/fr/foo.md')).toBeNull();
		expect(parseDocPath('/src/content/docs/ko/getting-started.svelte')).toBeNull();
	});
});

describe('docsService.getDocs', () => {
	it('returns only ko docs when locale is ko', () => {
		const docs = getDocs(mockModules, 'ko');
		expect(docs).toHaveLength(4);
		expect(docs.every((d) => d.locale === 'ko')).toBe(true);
	});

	it('returns only en docs when locale is en', () => {
		const docs = getDocs(mockModules, 'en');
		expect(docs).toHaveLength(2);
		expect(docs.every((d) => d.locale === 'en')).toBe(true);
	});

	it('sorts by frontmatter.order', () => {
		const docs = getDocs(mockModules, 'ko');
		expect(docs.map((d) => d.frontmatter.order)).toEqual([1, 2, 3, 4]);
	});
});

describe('docsService.getDocBySlug', () => {
	it('returns matching doc', () => {
		const doc = getDocBySlug(mockModules, 'ko', 'getting-started');
		expect(doc).not.toBeNull();
		expect(doc?.frontmatter.title).toBe('시작하기');
	});

	it('returns null for unknown slug', () => {
		expect(getDocBySlug(mockModules, 'ko', 'nonexistent')).toBeNull();
	});

	it('returns null for wrong locale', () => {
		expect(getDocBySlug(mockModules, 'en', 'security')).toBeNull();
	});
});

describe('docsService.getAllEntries', () => {
	it('returns every locale/slug combination', () => {
		const entries = getAllEntries(mockModules);
		expect(entries).toHaveLength(6);
		expect(entries).toContainEqual({ lang: 'ko', slug: 'getting-started' });
		expect(entries).toContainEqual({ lang: 'en', slug: 'ai-modes' });
	});
});

describe('docsService.buildSidebar', () => {
	const labels = { intro: '소개', guides: '가이드', reference: '레퍼런스' };

	it('groups by category', () => {
		const sidebar = buildSidebar(mockModules, 'ko', labels);
		expect(sidebar).toHaveLength(3);
		const cats = sidebar.map((c) => c.id);
		expect(cats).toEqual(['intro', 'guides', 'reference']);
	});

	it('applies labels', () => {
		const sidebar = buildSidebar(mockModules, 'ko', labels);
		expect(sidebar.find((c) => c.id === 'intro')?.label).toBe('소개');
	});

	it('falls back to id when label missing', () => {
		const sidebar = buildSidebar(mockModules, 'ko', {});
		expect(sidebar.find((c) => c.id === 'intro')?.label).toBe('intro');
	});

	it('orders categories by the minimum order of their items', () => {
		const mixed: Record<string, DocModule> = {
			'/src/content/docs/ko/a.md': mod('A', 'z-cat', 1),
			'/src/content/docs/ko/b.md': mod('B', 'a-cat', 2)
		};
		const sidebar = buildSidebar(mixed, 'ko', {});
		expect(sidebar.map((c) => c.id)).toEqual(['z-cat', 'a-cat']);
	});

	it('orders items within a category by frontmatter.order', () => {
		const mixed: Record<string, DocModule> = {
			'/src/content/docs/ko/a.md': mod('A', 'cat', 3),
			'/src/content/docs/ko/b.md': mod('B', 'cat', 1),
			'/src/content/docs/ko/c.md': mod('C', 'cat', 2)
		};
		const sidebar = buildSidebar(mixed, 'ko', {});
		expect(sidebar[0].items.map((i) => i.title)).toEqual(['B', 'C', 'A']);
	});
});
