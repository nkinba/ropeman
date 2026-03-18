import { describe, it, expect } from 'vitest';
import {
	repairJSON,
	closeBrackets,
	escapeControlCharsInStrings,
	parseSemanticLevel
} from './semanticAnalysisService';

// --- closeBrackets ---

describe('closeBrackets', () => {
	it('returns valid JSON unchanged', () => {
		const input = '{"roles":[{"id":"a"}]}';
		const result = closeBrackets(input);
		expect(() => JSON.parse(result)).not.toThrow();
		expect(JSON.parse(result)).toEqual({ roles: [{ id: 'a' }] });
	});

	it('closes missing braces in correct nesting order', () => {
		// roles array → role object → filePaths array → root object
		const input = '{"roles":[{"id":"a","filePaths":["file1.ts","file2.ts"';
		const result = closeBrackets(input);
		expect(() => JSON.parse(result)).not.toThrow();
		const parsed = JSON.parse(result);
		expect(parsed.roles[0].filePaths).toContain('file1.ts');
	});

	it('handles truncated string value inside array', () => {
		// B001 실제 버그: "tensorflow/tensorflow/c/e" 에서 잘림
		const input = '{"roles":[{"id":"core","filePaths":["src/a.ts","src/b';
		const result = closeBrackets(input);
		expect(() => JSON.parse(result)).not.toThrow();
	});

	it('closes nested structures: array inside object inside array inside object', () => {
		const input = '{"roles":[{"id":"a","files":["x"]},{"id":"b","files":["y"';
		const result = closeBrackets(input);
		expect(() => JSON.parse(result)).not.toThrow();
	});

	it('handles empty input', () => {
		const result = closeBrackets('');
		expect(result).toBe('');
	});

	it('handles input with only opening brace', () => {
		const result = closeBrackets('{');
		expect(() => JSON.parse(result)).not.toThrow();
	});

	it('closes unclosed string then brackets', () => {
		const input = '{"key":"unclosed value';
		const result = closeBrackets(input);
		expect(() => JSON.parse(result)).not.toThrow();
	});
});

// --- escapeControlCharsInStrings ---

describe('escapeControlCharsInStrings', () => {
	it('escapes newlines inside JSON strings', () => {
		const input = '{"desc":"line1\nline2"}';
		const result = escapeControlCharsInStrings(input);
		expect(() => JSON.parse(result)).not.toThrow();
		expect(JSON.parse(result).desc).toBe('line1\nline2');
	});

	it('escapes tabs inside JSON strings', () => {
		const input = '{"desc":"col1\tcol2"}';
		const result = escapeControlCharsInStrings(input);
		expect(() => JSON.parse(result)).not.toThrow();
	});

	it('does not escape characters outside strings', () => {
		const input = '{\n"key": "value"\n}';
		const result = escapeControlCharsInStrings(input);
		expect(result).toContain('\n');
		expect(() => JSON.parse(result)).not.toThrow();
	});

	it('handles already-escaped sequences', () => {
		const input = '{"desc":"already\\nescaped"}';
		const result = escapeControlCharsInStrings(input);
		expect(() => JSON.parse(result)).not.toThrow();
	});

	it('handles empty string', () => {
		expect(escapeControlCharsInStrings('')).toBe('');
	});
});

// --- repairJSON ---

describe('repairJSON', () => {
	it('returns valid JSON unchanged', () => {
		const valid =
			'{"roles":[{"id":"a","label":"A","description":"desc","filePaths":[],"keySymbols":[]}]}';
		const result = repairJSON(valid);
		expect(JSON.parse(result)).toEqual(JSON.parse(valid));
	});

	it('removes trailing commas', () => {
		const input = '{"roles":[{"id":"a",},]}';
		const result = repairJSON(input);
		expect(() => JSON.parse(result)).not.toThrow();
	});

	it('repairs truncated response with incomplete role object', () => {
		// 실제 버그: Demo Worker maxOutputTokens 부족으로 잘린 응답
		const input =
			'{"roles":[{"id":"core","label":"Core","description":"desc","filePaths":["src/a.ts","src/b.ts","src/c';
		const result = repairJSON(input);
		expect(() => JSON.parse(result)).not.toThrow();
	});

	it('uses progressive cut to find longest valid prefix', () => {
		// 2개 role 중 두 번째가 잘림 → 첫 번째는 살려야 함
		const input =
			'{"roles":[{"id":"a","label":"A","description":"d","filePaths":[],"keySymbols":[]},{"id":"b","label":"B","description":"d","filePaths":["src/x';
		const result = repairJSON(input);
		const parsed = JSON.parse(result);
		expect(parsed.roles.length).toBeGreaterThanOrEqual(1);
		expect(parsed.roles[0].id).toBe('a');
	});

	it('handles control characters in AI response', () => {
		const input = '{"roles":[{"id":"a","description":"line1\nline2\ttab"}]}';
		const result = repairJSON(input);
		expect(() => JSON.parse(result)).not.toThrow();
	});

	it('handles completely empty input', () => {
		const result = repairJSON('');
		// Should not throw, may return empty or best-effort
		expect(typeof result).toBe('string');
	});
});

// --- parseSemanticLevel ---

describe('parseSemanticLevel', () => {
	const validResponse = JSON.stringify({
		roles: [
			{
				id: 'core',
				label: 'Core Module',
				description: 'The core module',
				filePaths: ['src/core.ts'],
				keySymbols: ['CoreClass']
			},
			{
				id: 'utils',
				label: 'Utilities',
				description: 'Utility functions',
				filePaths: ['src/utils.ts'],
				keySymbols: ['helperFn']
			}
		],
		edges: [{ source: 'core', target: 'utils', label: 'uses', type: 'dependency' }]
	});

	it('parses valid JSON response into SemanticLevel', () => {
		const level = parseSemanticLevel(validResponse, null, 0);
		expect(level.nodes).toHaveLength(2);
		expect(level.edges).toHaveLength(1);
		expect(level.nodes[0].label).toBe('Core Module');
		expect(level.nodes[1].label).toBe('Utilities');
	});

	it('extracts JSON from markdown code block', () => {
		const wrapped = '```json\n' + validResponse + '\n```';
		const level = parseSemanticLevel(wrapped, null, 0);
		expect(level.nodes).toHaveLength(2);
	});

	it('sets parentId and depth correctly', () => {
		const level = parseSemanticLevel(validResponse, 'parent-1', 2);
		expect(level.parentId).toBe('parent-1');
		expect(level.nodes[0].parentId).toBe('parent-1');
		expect(level.nodes[0].depth).toBe(2);
	});

	it('filters edges with invalid source/target', () => {
		const response = JSON.stringify({
			roles: [{ id: 'a', label: 'A', description: 'd', filePaths: [], keySymbols: [] }],
			edges: [{ source: 'a', target: 'nonexistent', label: 'x', type: 'dependency' }]
		});
		const level = parseSemanticLevel(response, null, 0);
		expect(level.edges).toHaveLength(0); // filtered out
	});

	it('handles alternative key names (nodes instead of roles)', () => {
		const response = JSON.stringify({
			nodes: [{ id: 'a', label: 'A', description: 'd', filePaths: [], keySymbols: [] }]
		});
		const level = parseSemanticLevel(response, null, 0);
		expect(level.nodes).toHaveLength(1);
	});

	it('handles truncated response with fallback extraction', () => {
		// No closing } — should use { fallback
		const truncated =
			'```json\n{"roles":[{"id":"a","label":"A","description":"d","filePaths":["x.ts"],"keySymbols":["fn"';
		const level = parseSemanticLevel(truncated, null, 0);
		expect(level.nodes.length).toBeGreaterThanOrEqual(1);
	});

	it('throws on response with no JSON at all', () => {
		expect(() => parseSemanticLevel('This is just plain text with no JSON', null, 0)).toThrow();
	});

	it('assigns colors to nodes', () => {
		const level = parseSemanticLevel(validResponse, null, 0);
		expect(level.nodes[0].color).toBeTruthy();
		expect(level.nodes[1].color).toBeTruthy();
	});

	it('prefixes node IDs with sem:', () => {
		const level = parseSemanticLevel(validResponse, null, 0);
		expect(level.nodes[0].id).toBe('sem:core');
		expect(level.nodes[1].id).toBe('sem:utils');
	});

	it('prefixes edge IDs and source/target with sem:', () => {
		const level = parseSemanticLevel(validResponse, null, 0);
		expect(level.edges[0].source).toBe('sem:core');
		expect(level.edges[0].target).toBe('sem:utils');
	});
});
