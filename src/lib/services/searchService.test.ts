import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@orama/orama', () => {
	let docs: any[] = [];
	return {
		create: vi.fn(() => {
			docs = [];
			return { __docs: docs };
		}),
		insert: vi.fn((_db: any, doc: any) => {
			docs.push(doc);
		}),
		search: vi.fn((_db: any, params: any) => {
			const term = params.term?.toLowerCase() ?? '';
			if (!term) return { hits: [] };
			const matched = docs.filter((d) => d.name.toLowerCase().includes(term));
			return {
				hits: matched.slice(0, params.limit ?? 20).map((d: any) => ({ document: d }))
			};
		})
	};
});

import { buildIndex, searchIndex } from './searchService';
import type { FileNode } from '$lib/types/fileTree';

describe('searchService', () => {
	const mockFileTree: FileNode = {
		name: 'root',
		path: 'root',
		kind: 'directory',
		children: [
			{ name: 'index.ts', path: 'root/index.ts', kind: 'file', language: 'typescript' },
			{ name: 'utils.ts', path: 'root/utils.ts', kind: 'file', language: 'typescript' }
		]
	};

	const mockAstMap = new Map([
		[
			'root/index.ts',
			[
				{
					name: 'main',
					kind: 'function',
					lineStart: 1,
					lineEnd: 10,
					children: []
				}
			]
		]
	]);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('buildIndex', () => {
		it('indexes files and symbols', () => {
			buildIndex(mockFileTree, mockAstMap as any);

			// Should be able to search after building
			const results = searchIndex('index');
			expect(results.length).toBeGreaterThan(0);
		});

		it('handles null fileTree', () => {
			buildIndex(null, new Map());
			const results = searchIndex('anything');
			expect(results).toEqual([]);
		});
	});

	describe('searchIndex', () => {
		it('returns empty array for empty query', () => {
			buildIndex(mockFileTree, mockAstMap as any);
			const results = searchIndex('');
			expect(results).toEqual([]);
		});

		it('returns empty array when index not built', () => {
			// Don't call buildIndex
			const results = searchIndex('test');
			expect(results).toEqual([]);
		});

		it('finds files by name', () => {
			buildIndex(mockFileTree, mockAstMap as any);
			const results = searchIndex('utils');
			expect(results.some((r) => r.name === 'utils.ts')).toBe(true);
		});

		it('finds symbols by name', () => {
			buildIndex(mockFileTree, mockAstMap as any);
			const results = searchIndex('main');
			expect(results.some((r) => r.name === 'main' && r.type === 'symbol')).toBe(true);
		});
	});
});
