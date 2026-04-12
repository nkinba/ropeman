import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	validateManifest,
	validateSnapshot,
	findCuratedEntry,
	filterEntries,
	listLanguages,
	fetchExploreSnapshot,
	getCuratedManifest,
	type CuratedEntry
} from './exploreService';

const SAMPLE_ENTRIES: CuratedEntry[] = [
	{
		slug: 'react',
		owner: 'facebook',
		repo: 'react',
		title: 'React',
		language: 'JavaScript',
		description: 'A library for UIs.',
		stars: '230k+'
	},
	{
		slug: 'fastapi',
		owner: 'tiangolo',
		repo: 'fastapi',
		title: 'FastAPI',
		language: 'Python',
		description: 'Modern Python web framework.'
	},
	{
		slug: 'gin',
		owner: 'gin-gonic',
		repo: 'gin',
		title: 'Gin',
		language: 'Go',
		description: 'Go HTTP framework.'
	}
];

describe('validateManifest', () => {
	it('returns null for non-object input', () => {
		expect(validateManifest(null)).toBeNull();
		expect(validateManifest('string')).toBeNull();
		expect(validateManifest(42)).toBeNull();
	});

	it('returns null when entries is missing or not an array', () => {
		expect(validateManifest({ updatedAt: '2026-04-13' })).toBeNull();
		expect(validateManifest({ updatedAt: '2026-04-13', entries: 'oops' })).toBeNull();
	});

	it('returns null when updatedAt is missing', () => {
		expect(validateManifest({ entries: [] })).toBeNull();
	});

	it('parses a well-formed manifest', () => {
		const out = validateManifest({
			updatedAt: '2026-04-13',
			entries: SAMPLE_ENTRIES
		});
		expect(out).not.toBeNull();
		expect(out!.updatedAt).toBe('2026-04-13');
		expect(out!.entries).toHaveLength(3);
	});

	it('drops entries missing required fields', () => {
		const out = validateManifest({
			updatedAt: '2026-04-13',
			entries: [
				SAMPLE_ENTRIES[0],
				{ slug: 'broken' }, // missing fields
				SAMPLE_ENTRIES[1]
			]
		});
		expect(out!.entries).toHaveLength(2);
		expect(out!.entries.map((e) => e.slug)).toEqual(['react', 'fastapi']);
	});

	it('preserves optional stars field when present', () => {
		const out = validateManifest({
			updatedAt: '2026-04-13',
			entries: SAMPLE_ENTRIES
		});
		expect(out!.entries[0].stars).toBe('230k+');
		expect(out!.entries[1].stars).toBeUndefined();
	});
});

describe('findCuratedEntry', () => {
	it('returns the entry when slug matches', () => {
		const m = { updatedAt: '', entries: SAMPLE_ENTRIES };
		expect(findCuratedEntry(m, 'react')?.title).toBe('React');
	});

	it('returns undefined when slug not found', () => {
		const m = { updatedAt: '', entries: SAMPLE_ENTRIES };
		expect(findCuratedEntry(m, 'unknown')).toBeUndefined();
	});
});

describe('filterEntries', () => {
	it('returns all entries when no filters applied', () => {
		expect(filterEntries(SAMPLE_ENTRIES, {})).toHaveLength(3);
	});

	it('filters by exact language match (case-insensitive)', () => {
		const out = filterEntries(SAMPLE_ENTRIES, { language: 'python' });
		expect(out).toHaveLength(1);
		expect(out[0].slug).toBe('fastapi');
	});

	it('treats language="all" as no language filter', () => {
		expect(filterEntries(SAMPLE_ENTRIES, { language: 'all' })).toHaveLength(3);
	});

	it('filters by free-text query against title, owner, repo, description', () => {
		expect(filterEntries(SAMPLE_ENTRIES, { query: 'facebook' })).toHaveLength(1);
		expect(filterEntries(SAMPLE_ENTRIES, { query: 'modern python' })).toHaveLength(1);
		expect(filterEntries(SAMPLE_ENTRIES, { query: 'GIN' })).toHaveLength(1);
	});

	it('combines language and query filters', () => {
		const out = filterEntries(SAMPLE_ENTRIES, { language: 'go', query: 'http' });
		expect(out).toHaveLength(1);
		expect(out[0].slug).toBe('gin');
	});

	it('returns empty when no entries match', () => {
		expect(filterEntries(SAMPLE_ENTRIES, { query: 'rust' })).toHaveLength(0);
	});
});

describe('listLanguages', () => {
	it('returns distinct sorted languages', () => {
		expect(listLanguages(SAMPLE_ENTRIES)).toEqual(['Go', 'JavaScript', 'Python']);
	});

	it('returns empty array when entries is empty', () => {
		expect(listLanguages([])).toEqual([]);
	});
});

describe('validateSnapshot', () => {
	it('returns null for non-object input', () => {
		expect(validateSnapshot(null)).toBeNull();
		expect(validateSnapshot('string')).toBeNull();
	});

	it('returns null when projectName is missing', () => {
		expect(validateSnapshot({ semanticLevels: {} })).toBeNull();
	});

	it('returns null when semanticLevels is missing', () => {
		expect(validateSnapshot({ projectName: 'demo' })).toBeNull();
	});

	it('drops levels missing required fields', () => {
		const snap = validateSnapshot({
			projectName: 'demo',
			semanticLevels: {
				__root__: {
					parentId: null,
					nodes: [],
					edges: [],
					breadcrumbLabel: 'Project'
				},
				broken: { foo: 'bar' }
			}
		});
		expect(snap).not.toBeNull();
		expect(Object.keys(snap!.semanticLevels)).toEqual(['__root__']);
	});

	it('preserves optional metadata fields', () => {
		const snap = validateSnapshot({
			projectName: 'react',
			owner: 'facebook',
			repo: 'react',
			analyzedAt: '2026-04-13',
			filePaths: ['src/index.ts'],
			semanticLevels: {}
		});
		expect(snap!.owner).toBe('facebook');
		expect(snap!.repo).toBe('react');
		expect(snap!.analyzedAt).toBe('2026-04-13');
		expect(snap!.filePaths).toEqual(['src/index.ts']);
	});
});

describe('fetchExploreSnapshot', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns ok=false with status=not-analyzed on 404', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not found', { status: 404 })));
		const result = await fetchExploreSnapshot('react');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.status).toBe('not-analyzed');
		}
	});

	it('returns ok=false with status=error on 5xx', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })));
		const result = await fetchExploreSnapshot('react');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.status).toBe('error');
		}
	});

	it('returns ok=false on invalid payload', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ wrong: 'shape' }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);
		const result = await fetchExploreSnapshot('react');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.status).toBe('error');
		}
	});

	it('returns ok=true with parsed snapshot on success', async () => {
		const payload = {
			projectName: 'React',
			semanticLevels: {
				__root__: {
					parentId: null,
					nodes: [],
					edges: [],
					breadcrumbLabel: 'React'
				}
			}
		};
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify(payload), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);
		const result = await fetchExploreSnapshot('react');
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.snapshot.projectName).toBe('React');
		}
	});

	it('handles network errors gracefully', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));
		const result = await fetchExploreSnapshot('react');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.status).toBe('error');
			expect(result.message).toContain('connection refused');
		}
	});
});

describe('getCuratedManifest', () => {
	it('loads bundled curated manifest with the seed entries', () => {
		const m = getCuratedManifest();
		expect(m.entries.length).toBeGreaterThanOrEqual(6);
		// React must be present per the seed data
		expect(m.entries.find((e) => e.slug === 'react')).toBeDefined();
	});

	it('every entry has all required fields', () => {
		const m = getCuratedManifest();
		for (const e of m.entries) {
			expect(typeof e.slug).toBe('string');
			expect(typeof e.owner).toBe('string');
			expect(typeof e.repo).toBe('string');
			expect(typeof e.title).toBe('string');
			expect(typeof e.language).toBe('string');
			expect(typeof e.description).toBe('string');
		}
	});

	it('slugs are unique', () => {
		const m = getCuratedManifest();
		const slugs = m.entries.map((e) => e.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});
});
