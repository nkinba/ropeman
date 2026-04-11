import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('$lib/utils/languageDetector', () => ({
	detectLanguage: (filename: string) => {
		if (filename.endsWith('.ts')) return 'typescript';
		if (filename.endsWith('.js')) return 'javascript';
		if (filename.endsWith('.py')) return 'python';
		return null;
	},
	isSupported: (lang: string) => ['typescript', 'javascript', 'python'].includes(lang)
}));

vi.mock('$lib/services/parserService', () => ({
	parseFile: vi.fn().mockResolvedValue([{ name: 'mockSymbol', kind: 'function' }])
}));

vi.mock('$lib/stores/projectStore.svelte', () => {
	const store = {
		fileTree: null,
		astMap: new Map(),
		isLoading: false,
		projectName: '',
		parsingProgress: { done: 0, total: 0 },
		githubInfo: null
	};
	return { projectStore: store };
});

vi.mock('$lib/config', () => ({
	GITHUB_PROXY_URL: ''
}));

import { loadGitHubRepo, GitHubLoadError } from './githubLoader';
import { projectStore } from '$lib/stores/projectStore.svelte';

const mockTreeResponse = {
	sha: 'abc123',
	url: 'https://api.github.com/repos/owner/repo/git/trees/abc123',
	tree: [
		{ path: 'src', mode: '040000', type: 'tree' as const, sha: 'dir1', url: '' },
		{ path: 'src/index.ts', mode: '100644', type: 'blob' as const, sha: 'f1', url: '', size: 500 },
		{ path: 'src/utils.ts', mode: '100644', type: 'blob' as const, sha: 'f2', url: '', size: 300 },
		{ path: 'README.md', mode: '100644', type: 'blob' as const, sha: 'f3', url: '', size: 200 },
		{ path: 'image.png', mode: '100644', type: 'blob' as const, sha: 'f4', url: '', size: 1000 }
	],
	truncated: false
};

describe('loadGitHubRepo', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		projectStore.fileTree = null;
		projectStore.astMap = new Map();
		projectStore.isLoading = false;
		projectStore.parsingProgress = { done: 0, total: 0 };
	});

	it('loads repo, builds file tree, and parses supported files', async () => {
		const fetchMock = vi.fn() as Mock;

		// Tree API response
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => mockTreeResponse
		});

		// Raw file responses for 2 supported .ts files
		fetchMock.mockResolvedValueOnce({
			ok: true,
			text: async () => 'export const x = 1;'
		});
		fetchMock.mockResolvedValueOnce({
			ok: true,
			text: async () => 'export function util() {}'
		});

		vi.stubGlobal('fetch', fetchMock);

		await loadGitHubRepo({ owner: 'owner', repo: 'repo' });

		// File tree was built
		expect(projectStore.fileTree).not.toBeNull();
		expect(projectStore.fileTree!.name).toBe('repo');
		expect(projectStore.fileTree!.children).toHaveLength(3); // src dir + README.md + image.png

		// AST map has parsed files
		expect(projectStore.astMap.size).toBe(2); // 2 .ts files
		expect(projectStore.astMap.has('repo/src/index.ts')).toBe(true);
		expect(projectStore.astMap.has('repo/src/utils.ts')).toBe(true);

		// Loading was set to false
		expect(projectStore.isLoading).toBe(false);
	});

	it('throws GitHubLoadError on 404', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 404
			})
		);

		try {
			await loadGitHubRepo({ owner: 'owner', repo: 'nonexistent' });
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e).toBeInstanceOf(GitHubLoadError);
			expect(e.status).toBe(404);
		}
	});

	it('throws GitHubLoadError on 403 rate limit', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValueOnce({
				ok: false,
				status: 403
			})
		);

		await expect(loadGitHubRepo({ owner: 'owner', repo: 'repo' })).rejects.toThrow(GitHubLoadError);
	});

	it('throws GitHubLoadError on 401 private repo', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValueOnce({
				ok: false,
				status: 401
			})
		);

		await expect(loadGitHubRepo({ owner: 'owner', repo: 'private-repo' })).rejects.toThrow(
			GitHubLoadError
		);
	});

	it('skips files larger than 500KB', async () => {
		const largeTree = {
			...mockTreeResponse,
			tree: [
				{
					path: 'big.ts',
					mode: '100644',
					type: 'blob' as const,
					sha: 'b1',
					url: '',
					size: 600_000
				},
				{ path: 'small.ts', mode: '100644', type: 'blob' as const, sha: 'b2', url: '', size: 100 }
			]
		};

		const fetchMock = vi.fn() as Mock;
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => largeTree });
		fetchMock.mockResolvedValueOnce({ ok: true, text: async () => 'const x = 1;' });

		vi.stubGlobal('fetch', fetchMock);

		await loadGitHubRepo({ owner: 'owner', repo: 'repo' });

		// Only small.ts should be parsed
		expect(projectStore.astMap.size).toBe(1);
		expect(projectStore.astMap.has('repo/small.ts')).toBe(true);
	});

	it('skips unsupported file types', async () => {
		const mixedTree = {
			...mockTreeResponse,
			tree: [
				{ path: 'app.ts', mode: '100644', type: 'blob' as const, sha: 's1', url: '', size: 100 },
				{ path: 'style.css', mode: '100644', type: 'blob' as const, sha: 's2', url: '', size: 100 },
				{ path: 'data.json', mode: '100644', type: 'blob' as const, sha: 's3', url: '', size: 100 }
			]
		};

		const fetchMock = vi.fn() as Mock;
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => mixedTree });
		fetchMock.mockResolvedValueOnce({ ok: true, text: async () => 'const x = 1;' });

		vi.stubGlobal('fetch', fetchMock);

		await loadGitHubRepo({ owner: 'owner', repo: 'repo' });

		// Only .ts file parsed
		expect(projectStore.astMap.size).toBe(1);
	});

	it('handles failed individual file downloads gracefully', async () => {
		const tree = {
			...mockTreeResponse,
			tree: [
				{ path: 'a.ts', mode: '100644', type: 'blob' as const, sha: 'a1', url: '', size: 100 },
				{ path: 'b.ts', mode: '100644', type: 'blob' as const, sha: 'a2', url: '', size: 100 }
			]
		};

		const fetchMock = vi.fn() as Mock;
		fetchMock.mockResolvedValueOnce({ ok: true, json: async () => tree });
		fetchMock.mockResolvedValueOnce({ ok: true, text: async () => 'const a = 1;' });
		fetchMock.mockResolvedValueOnce({ ok: false, status: 500 }); // b.ts fails

		vi.stubGlobal('fetch', fetchMock);

		await loadGitHubRepo({ owner: 'owner', repo: 'repo' });

		// Only a.ts was parsed successfully
		expect(projectStore.astMap.size).toBe(1);
		expect(projectStore.astMap.has('repo/a.ts')).toBe(true);
	});

	it('uses branch from info when provided', async () => {
		const fetchMock = vi.fn() as Mock;
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ ...mockTreeResponse, tree: [] })
		});

		vi.stubGlobal('fetch', fetchMock);

		await loadGitHubRepo({ owner: 'owner', repo: 'repo', branch: 'develop' });

		expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('develop'));
	});
});
