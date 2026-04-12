import { describe, it, expect } from 'vitest';
import { buildMermaidFlowchart, buildMarkdownDocument } from './markdownExporter';
import type { SemanticLevel } from '$lib/types/semantic';

function makeLevel(): SemanticLevel {
	return {
		parentId: null,
		breadcrumbLabel: 'Project',
		nodes: [
			{
				id: 'sem:auth',
				label: 'Authentication',
				description: 'Handles user login and session management.',
				color: '#abc',
				filePaths: ['src/auth/login.ts', 'src/auth/session.ts'],
				keySymbols: ['login', 'logout', 'verifySession'],
				parentId: null,
				depth: 0,
				fileCount: 2
			},
			{
				id: 'sem:api',
				label: 'API Layer',
				description: 'REST endpoints.',
				color: '#def',
				filePaths: ['src/api/users.ts'],
				keySymbols: ['UsersController'],
				parentId: null,
				depth: 0,
				fileCount: 1
			}
		],
		edges: [
			{
				id: 'e1',
				source: 'sem:api',
				target: 'sem:auth',
				type: 'depends_on'
			},
			{
				id: 'e2',
				source: 'sem:auth',
				target: 'sem:api',
				type: 'calls',
				label: 'token check'
			}
		]
	};
}

describe('buildMermaidFlowchart', () => {
	it('renders nodes with sanitized ids and quoted labels', () => {
		const out = buildMermaidFlowchart(makeLevel());
		expect(out).toContain('flowchart LR');
		expect(out).toContain('sem_auth["Authentication"]');
		expect(out).toContain('sem_api["API Layer"]');
	});

	it('renders edges with default type label when no custom label', () => {
		const out = buildMermaidFlowchart(makeLevel());
		expect(out).toContain('sem_api -- "depends on" --> sem_auth');
	});

	it('uses custom edge label when provided', () => {
		const out = buildMermaidFlowchart(makeLevel());
		expect(out).toContain('sem_auth -- "token check" --> sem_api');
	});

	it('escapes double quotes in labels', () => {
		const lvl = makeLevel();
		lvl.nodes[0].label = 'He said "hi"';
		const out = buildMermaidFlowchart(lvl);
		expect(out).toContain('sem_auth["He said \\"hi\\""]');
	});

	it('wraps output in mermaid code fence', () => {
		const out = buildMermaidFlowchart(makeLevel());
		expect(out.startsWith('```mermaid\n')).toBe(true);
		expect(out.endsWith('\n```')).toBe(true);
	});
});

describe('buildMarkdownDocument', () => {
	const FIXED_DATE = new Date('2026-04-13T00:00:00.000Z');

	it('includes frontmatter with project, date, and counts', () => {
		const md = buildMarkdownDocument({
			projectName: 'demo-project',
			rootLevel: makeLevel(),
			generatedAt: FIXED_DATE
		});
		expect(md.startsWith('---\n')).toBe(true);
		expect(md).toContain('project: "demo-project"');
		expect(md).toContain('generated: 2026-04-13T00:00:00.000Z');
		expect(md).toContain('files: 3');
		expect(md).toContain('domains: 2');
		expect(md).toContain('generator: ropeman');
	});

	it('includes h1 title with project name', () => {
		const md = buildMarkdownDocument({
			projectName: 'demo',
			rootLevel: makeLevel(),
			generatedAt: FIXED_DATE
		});
		expect(md).toContain('# demo — Architecture');
	});

	it('includes overview section with mermaid flowchart', () => {
		const md = buildMarkdownDocument({
			projectName: 'demo',
			rootLevel: makeLevel(),
			generatedAt: FIXED_DATE
		});
		expect(md).toContain('## Overview');
		expect(md).toContain('```mermaid');
	});

	it('renders each domain as h3 with description, key symbols, and files', () => {
		const md = buildMarkdownDocument({
			projectName: 'demo',
			rootLevel: makeLevel(),
			generatedAt: FIXED_DATE
		});
		expect(md).toContain('### Authentication');
		expect(md).toContain('Handles user login and session management.');
		expect(md).toContain('**Key symbols**');
		expect(md).toContain('`login`, `logout`, `verifySession`');
		expect(md).toContain('**Files**');
		expect(md).toContain('- `src/auth/login.ts`');
	});

	it('renders nested sub-levels from cache when includeNested=true', () => {
		const root = makeLevel();
		const sub: SemanticLevel = {
			parentId: 'sem:auth',
			breadcrumbLabel: 'Authentication',
			nodes: [
				{
					id: 'sem:oauth',
					label: 'OAuth Flow',
					description: 'OAuth2 PKCE handler.',
					color: '#fff',
					filePaths: ['src/auth/oauth.ts'],
					keySymbols: ['startOAuth'],
					parentId: 'sem:auth',
					depth: 1,
					fileCount: 1
				}
			],
			edges: []
		};
		const cache = new Map<string, SemanticLevel>([['sem:auth', sub]]);
		const md = buildMarkdownDocument({
			projectName: 'demo',
			rootLevel: root,
			cache,
			generatedAt: FIXED_DATE,
			includeNested: true
		});
		expect(md).toContain('Authentication — Sub-domains');
		expect(md).toContain('OAuth Flow');
		expect(md).toContain('OAuth2 PKCE handler.');
	});

	it('omits nested sub-levels when includeNested=false', () => {
		const root = makeLevel();
		const sub: SemanticLevel = {
			parentId: 'sem:auth',
			breadcrumbLabel: 'Authentication',
			nodes: [
				{
					id: 'sem:oauth',
					label: 'OAuth Flow',
					description: '',
					color: '#fff',
					filePaths: [],
					keySymbols: [],
					parentId: 'sem:auth',
					depth: 1,
					fileCount: 0
				}
			],
			edges: []
		};
		const cache = new Map<string, SemanticLevel>([['sem:auth', sub]]);
		const md = buildMarkdownDocument({
			projectName: 'demo',
			rootLevel: root,
			cache,
			generatedAt: FIXED_DATE,
			includeNested: false
		});
		expect(md).not.toContain('Sub-domains');
		expect(md).not.toContain('OAuth Flow');
	});

	it('counts unique files across overlapping domain assignments', () => {
		const root = makeLevel();
		// Make api share a file with auth — should still count uniquely
		root.nodes[1].filePaths = ['src/auth/login.ts', 'src/api/users.ts'];
		const md = buildMarkdownDocument({
			projectName: 'demo',
			rootLevel: root,
			generatedAt: FIXED_DATE
		});
		expect(md).toContain('files: 3');
	});

	it('handles empty key symbols and file paths gracefully', () => {
		const lvl: SemanticLevel = {
			parentId: null,
			breadcrumbLabel: 'Project',
			nodes: [
				{
					id: 'sem:empty',
					label: 'Empty Domain',
					description: '',
					color: '#000',
					filePaths: [],
					keySymbols: [],
					parentId: null,
					depth: 0,
					fileCount: 0
				}
			],
			edges: []
		};
		const md = buildMarkdownDocument({
			projectName: 'demo',
			rootLevel: lvl,
			generatedAt: FIXED_DATE
		});
		expect(md).toContain('### Empty Domain');
		expect(md).not.toContain('**Key symbols**');
		expect(md).not.toContain('**Files**');
	});

	it('ends with single trailing newline', () => {
		const md = buildMarkdownDocument({
			projectName: 'demo',
			rootLevel: makeLevel(),
			generatedAt: FIXED_DATE
		});
		expect(md.endsWith('\n')).toBe(true);
		expect(md.endsWith('\n\n')).toBe(false);
	});
});
