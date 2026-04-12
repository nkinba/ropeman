import { describe, it, expect } from 'vitest';
import { buildPrintDocument } from './pdfExporter';
import type { SemanticLevel } from '$lib/types/semantic';

function makeRoot(): SemanticLevel {
	return {
		parentId: null,
		breadcrumbLabel: 'Project',
		nodes: [
			{
				id: 'sem:auth',
				label: 'Authentication',
				description: 'Login & sessions.',
				color: '#7ad4a0',
				filePaths: ['src/auth/login.ts', 'src/auth/session.ts'],
				keySymbols: ['login', 'logout'],
				parentId: null,
				depth: 0,
				fileCount: 2
			},
			{
				id: 'sem:api',
				label: 'API Layer',
				description: 'REST endpoints.',
				color: '#53ddfc',
				filePaths: ['src/api/users.ts'],
				keySymbols: ['UsersController'],
				parentId: null,
				depth: 0,
				fileCount: 1
			}
		],
		edges: [{ id: 'e1', source: 'sem:api', target: 'sem:auth', type: 'depends_on' }]
	};
}

const FIXED_DATE = new Date('2026-04-13T00:00:00.000Z');

describe('buildPrintDocument', () => {
	it('emits a complete HTML document with print stylesheet', () => {
		const html = buildPrintDocument({
			projectName: 'demo',
			rootLevel: makeRoot(),
			generatedAt: FIXED_DATE
		});
		expect(html.startsWith('<!doctype html>')).toBe(true);
		expect(html).toContain('@media print');
		expect(html).toContain('@page');
	});

	it('includes the project name in title and cover', () => {
		const html = buildPrintDocument({
			projectName: 'awesome-project',
			rootLevel: makeRoot(),
			generatedAt: FIXED_DATE
		});
		expect(html).toContain('<title>awesome-project — Architecture</title>');
		expect(html).toContain('class="cover-title">awesome-project</h1>');
	});

	it('shows generated date in cover meta', () => {
		const html = buildPrintDocument({
			projectName: 'demo',
			rootLevel: makeRoot(),
			generatedAt: FIXED_DATE
		});
		expect(html).toContain('2026-04-13');
	});

	it('renders cover with file and domain counts', () => {
		const html = buildPrintDocument({
			projectName: 'demo',
			rootLevel: makeRoot(),
			generatedAt: FIXED_DATE
		});
		expect(html).toMatch(/<strong>Domains<\/strong> 2/);
		expect(html).toMatch(/<strong>Files<\/strong> 3/);
	});

	it('lists each domain in the table of contents', () => {
		const html = buildPrintDocument({
			projectName: 'demo',
			rootLevel: makeRoot(),
			generatedAt: FIXED_DATE
		});
		expect(html).toContain('Table of Contents');
		expect(html).toContain('>Authentication<');
		expect(html).toContain('>API Layer<');
	});

	it('includes the overview SVG (light theme)', () => {
		const html = buildPrintDocument({
			projectName: 'demo',
			rootLevel: makeRoot(),
			generatedAt: FIXED_DATE
		});
		// Light theme uses #ffffff node bg
		expect(html).toContain('class="diagram"');
		expect(html).toContain('<svg');
		expect(html).toContain('fill="#ffffff"');
	});

	it('renders one section per domain with description and file list', () => {
		const html = buildPrintDocument({
			projectName: 'demo',
			rootLevel: makeRoot(),
			generatedAt: FIXED_DATE
		});
		expect(html).toContain('Login &amp; sessions.');
		expect(html).toContain('REST endpoints.');
		expect(html).toContain('src/auth/login.ts');
		expect(html).toContain('src/api/users.ts');
	});

	it('renders key symbols when present', () => {
		const html = buildPrintDocument({
			projectName: 'demo',
			rootLevel: makeRoot(),
			generatedAt: FIXED_DATE
		});
		expect(html).toContain('<code>login</code>');
		expect(html).toContain('<code>UsersController</code>');
	});

	it('appends sub-domain section when cache contains a child level', () => {
		const sub: SemanticLevel = {
			parentId: 'sem:auth',
			breadcrumbLabel: 'Authentication',
			nodes: [
				{
					id: 'sem:oauth',
					label: 'OAuth',
					description: 'OAuth2 PKCE.',
					color: '#ac8aff',
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
		const html = buildPrintDocument({
			projectName: 'demo',
			rootLevel: makeRoot(),
			cache,
			generatedAt: FIXED_DATE
		});
		expect(html).toContain('Sub-domains');
		// The OAuth label appears via the sub SVG (escaped XML)
		expect(html).toContain('OAuth');
		// And the toc tag indicating sub-domains
		expect(html).toContain('+ sub-domains');
	});

	it('escapes HTML in project name', () => {
		const html = buildPrintDocument({
			projectName: '<script>alert(1)</script>',
			rootLevel: makeRoot(),
			generatedAt: FIXED_DATE
		});
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
	});

	it('includes a Print button for manual triggering', () => {
		const html = buildPrintDocument({
			projectName: 'demo',
			rootLevel: makeRoot(),
			generatedAt: FIXED_DATE
		});
		expect(html).toContain('window.print()');
		expect(html).toContain('class="print-controls"');
	});
});
