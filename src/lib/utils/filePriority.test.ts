import { describe, it, expect } from 'vitest';
import { pathPriority, shouldSkipPath, SKIP_DIRS } from './filePriority';

describe('pathPriority', () => {
	describe('GitHub tree paths (no repo prefix)', () => {
		it('scores core src/ as 0', () => {
			expect(pathPriority('src/index.ts')).toBe(0);
			expect(pathPriority('src/lib/foo.ts')).toBe(0);
		});

		it('scores other core dirs as 0', () => {
			expect(pathPriority('lib/util.ts')).toBe(0);
			expect(pathPriority('app/main.ts')).toBe(0);
			expect(pathPriority('pkg/svc/server.go')).toBe(0);
			expect(pathPriority('internal/core.go')).toBe(0);
			expect(pathPriority('cmd/server/main.go')).toBe(0);
		});

		it('scores root-level files as 1', () => {
			expect(pathPriority('index.ts')).toBe(1);
			expect(pathPriority('main.py')).toBe(1);
		});

		it('scores tests/examples/docs as 3', () => {
			expect(pathPriority('foo/tests/a.ts')).toBe(3);
			expect(pathPriority('foo/test/a.ts')).toBe(3);
			expect(pathPriority('foo/__tests__/a.ts')).toBe(3);
			expect(pathPriority('foo/examples/a.ts')).toBe(3);
			expect(pathPriority('foo/docs/a.ts')).toBe(3);
			expect(pathPriority('foo/benchmarks/a.ts')).toBe(3);
			expect(pathPriority('foo/fixtures/a.ts')).toBe(3);
			expect(pathPriority('foo/mocks/a.ts')).toBe(3);
		});

		it('scores other paths as 2', () => {
			expect(pathPriority('scripts/build.js')).toBe(2);
			expect(pathPriority('config/env.ts')).toBe(2);
		});

		it('is case-insensitive', () => {
			expect(pathPriority('SRC/Index.TS')).toBe(0);
			expect(pathPriority('Foo/TESTS/a.ts')).toBe(3);
		});
	});

	describe('local FileNode paths (with repo prefix)', () => {
		it('strips repo prefix and detects core src/', () => {
			expect(pathPriority('myrepo/src/index.ts', true)).toBe(0);
			expect(pathPriority('my-app/lib/util.ts', true)).toBe(0);
		});

		it('scores root-level files under repo as 1', () => {
			expect(pathPriority('myrepo/index.ts', true)).toBe(1);
		});

		it('scores tests under repo as 3', () => {
			expect(pathPriority('myrepo/tests/a.ts', true)).toBe(3);
			expect(pathPriority('myrepo/src/__tests__/a.ts', true)).toBe(3);
		});

		it('scores other paths as 2', () => {
			expect(pathPriority('myrepo/scripts/build.js', true)).toBe(2);
		});
	});

	describe('prioritization order', () => {
		it('core src < root < other < tests', () => {
			const paths = [
				'tests/a.ts', // 3
				'scripts/a.ts', // 2
				'root.ts', // 1
				'src/core.ts' // 0
			];
			const sorted = [...paths].sort((a, b) => pathPriority(a) - pathPriority(b));
			expect(sorted).toEqual(['src/core.ts', 'root.ts', 'scripts/a.ts', 'tests/a.ts']);
		});
	});
});

describe('SKIP_DIRS', () => {
	it('contains expected directory names', () => {
		expect(SKIP_DIRS.has('tests')).toBe(true);
		expect(SKIP_DIRS.has('test')).toBe(true);
		expect(SKIP_DIRS.has('examples')).toBe(true);
		expect(SKIP_DIRS.has('docs')).toBe(true);
		expect(SKIP_DIRS.has('node_modules')).toBe(true);
		expect(SKIP_DIRS.has('.git')).toBe(true);
		expect(SKIP_DIRS.has('vendor')).toBe(true);
	});

	it('does not contain source directories', () => {
		expect(SKIP_DIRS.has('src')).toBe(false);
		expect(SKIP_DIRS.has('lib')).toBe(false);
		expect(SKIP_DIRS.has('app')).toBe(false);
	});
});

describe('shouldSkipPath', () => {
	it('skips paths with skip-dir segments', () => {
		expect(shouldSkipPath('tests/foo.rs')).toBe(true);
		expect(shouldSkipPath('tokio/tests/io_read.rs')).toBe(true);
		expect(shouldSkipPath('examples/hello.rs')).toBe(true);
		expect(shouldSkipPath('docs/guide.md')).toBe(true);
		expect(shouldSkipPath('node_modules/pkg/index.js')).toBe(true);
	});

	it('skips hidden directories', () => {
		expect(shouldSkipPath('.github/workflows/ci.yml')).toBe(true);
		expect(shouldSkipPath('.vscode/settings.json')).toBe(true);
	});

	it('skips egg-info directories', () => {
		expect(shouldSkipPath('my_pkg.egg-info/PKG-INFO')).toBe(true);
	});

	it('does not skip core source paths', () => {
		expect(shouldSkipPath('src/main.rs')).toBe(false);
		expect(shouldSkipPath('tokio/src/runtime/mod.rs')).toBe(false);
		expect(shouldSkipPath('lib/utils.ts')).toBe(false);
	});

	it('does not skip root-level files', () => {
		expect(shouldSkipPath('Cargo.toml')).toBe(false);
		expect(shouldSkipPath('README.md')).toBe(false);
	});

	it('does not skip directories with hyphenated names containing skip words', () => {
		expect(shouldSkipPath('tests-integration/tests_macro.rs')).toBe(false);
		expect(shouldSkipPath('tests-build/pass/main.rs')).toBe(false);
	});

	it('does not skip .env as hidden', () => {
		expect(shouldSkipPath('.env/something')).toBe(false);
	});

	it('skips root-level skip directories with trailing slash', () => {
		expect(shouldSkipPath('tests/')).toBe(true);
		expect(shouldSkipPath('examples/')).toBe(true);
		expect(shouldSkipPath('docs/')).toBe(true);
		expect(shouldSkipPath('.git/')).toBe(true);
	});
});
