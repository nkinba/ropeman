import { describe, it, expect } from 'vitest';
import { buildHtmlDocument } from './htmlExporter';
import type { SemanticLevel } from '$lib/types/semantic';

function makeRoot(): SemanticLevel {
	return {
		parentId: null,
		breadcrumbLabel: 'Project',
		nodes: [
			{
				id: 'sem:auth',
				label: 'Authentication',
				description: 'Login and session management.',
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
		edges: [
			{ id: 'e1', source: 'sem:api', target: 'sem:auth', type: 'depends_on' },
			{ id: 'e2', source: 'sem:auth', target: 'sem:api', type: 'calls', label: 'token check' }
		]
	};
}

function makeSub(): SemanticLevel {
	return {
		parentId: 'sem:auth',
		breadcrumbLabel: 'Authentication',
		nodes: [
			{
				id: 'sem:oauth',
				label: 'OAuth Flow',
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
}

describe('buildHtmlDocument', () => {
	it('emits a complete HTML5 document', () => {
		const html = buildHtmlDocument({ projectName: 'demo', rootLevel: makeRoot() });
		expect(html.startsWith('<!doctype html>')).toBe(true);
		expect(html).toContain('<html lang="en">');
		expect(html).toContain('</html>');
	});

	it('includes project name in title and header', () => {
		const html = buildHtmlDocument({ projectName: 'awesome-repo', rootLevel: makeRoot() });
		expect(html).toContain('<title>awesome-repo — Architecture</title>');
		expect(html).toContain('awesome-repo — Architecture</h1>');
	});

	it('inlines the SVG for the root level with all node ids (JSON-escaped)', () => {
		const html = buildHtmlDocument({ projectName: 'demo', rootLevel: makeRoot() });
		// SVG is embedded inside a JSON.stringify'd payload, so " becomes \"
		expect(html).toContain('data-node-id=\\"sem:auth\\"');
		expect(html).toContain('data-node-id=\\"sem:api\\"');
	});

	it('embeds level data as JSON for the runtime script', () => {
		const html = buildHtmlDocument({ projectName: 'demo', rootLevel: makeRoot() });
		expect(html).toContain('"__root__"');
		expect(html).toContain('Authentication');
		expect(html).toContain('API Layer');
	});

	it('marks nodes with cached child levels as has-child=1', () => {
		const cache = new Map<string, SemanticLevel>([['sem:auth', makeSub()]]);
		const html = buildHtmlDocument({
			projectName: 'demo',
			rootLevel: makeRoot(),
			cache
		});
		// JSON-escaped attributes
		expect(html).toMatch(/data-node-id=\\"sem:auth\\"[^>]*data-has-child=\\"1\\"/);
		expect(html).toMatch(/data-node-id=\\"sem:api\\"[^>]*data-has-child=\\"0\\"/);
	});

	it('renders SVG for cached drilldown levels in addition to root', () => {
		const cache = new Map<string, SemanticLevel>([['sem:auth', makeSub()]]);
		const html = buildHtmlDocument({
			projectName: 'demo',
			rootLevel: makeRoot(),
			cache
		});
		// The OAuth Flow node from the sub-level must appear somewhere in the JSON
		expect(html).toContain('OAuth Flow');
		expect(html).toContain('data-node-id=\\"sem:oauth\\"');
	});

	it('contains no external URL or http reference (single-file, no CDN)', () => {
		const html = buildHtmlDocument({ projectName: 'demo', rootLevel: makeRoot() });
		// Strip the SVG namespace which is the only allowed http reference
		const stripped = html.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
		expect(stripped).not.toContain('http://');
		expect(stripped).not.toContain('https://');
	});

	it('escapes HTML-dangerous characters in project name', () => {
		const html = buildHtmlDocument({
			projectName: '<script>alert(1)</script>',
			rootLevel: makeRoot()
		});
		// The header should contain the escaped form, not raw <script>
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; — Architecture</h1>');
	});

	it('neutralizes embedded </script> in inline JSON data', () => {
		const root = makeRoot();
		root.nodes[0].description = 'breaks </script> tag';
		const html = buildHtmlDocument({ projectName: 'demo', rootLevel: root });
		// JSON-embedded </script> must be escaped to <\/script
		const jsonStartIdx = html.indexOf('var levels = ');
		const jsonEndIdx = html.indexOf(';\n\tvar rootKey');
		const jsonRegion = html.slice(jsonStartIdx, jsonEndIdx);
		expect(jsonRegion).not.toMatch(/<\/script/);
		expect(jsonRegion).toContain('<\\/script');
	});

	it('emits valid root key reference matching the rootLevel', () => {
		const html = buildHtmlDocument({ projectName: 'demo', rootLevel: makeRoot() });
		expect(html).toContain('var rootKey = "__root__"');
	});
});
