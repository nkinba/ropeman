import fs from 'node:fs';
import path from 'node:path';

const SKIP_PATTERNS = new Set([
	'node_modules', '.git', 'dist', 'build', '__pycache__',
	'.svelte-kit', '.next', '.nuxt', '.venv', 'venv',
	'.tox', '.mypy_cache', '.pytest_cache', '.ruff_cache', '.eggs',
	'tests', 'test', 'docs', 'doc', 'examples',
	'benchmarks', 'benchmark', 'benchmark_v2', 'notebooks',
	'fixtures', 'coverage', '.coverage', 'htmlcov',
	'.idea', '.vscode', 'vendor',
]);

const EXTENSION_MAP = {
	'.py': 'python', '.js': 'javascript', '.jsx': 'javascript',
	'.ts': 'typescript', '.tsx': 'typescript', '.go': 'go',
	'.rs': 'rust', '.java': 'java', '.c': 'c', '.cpp': 'cpp',
	'.h': 'c', '.hpp': 'cpp', '.rb': 'ruby', '.php': 'php',
	'.swift': 'swift', '.kt': 'kotlin', '.scala': 'scala', '.cs': 'csharp',
};

const MAX_FILES = 2000;
const MAX_DEPTH = 30;
const MAX_FILE_SIZE = 500_000;

function detectLanguage(filename) {
	const ext = filename.substring(filename.lastIndexOf('.'));
	return EXTENSION_MAP[ext] ?? null;
}

function scanDirectory(dirPath, basePath = '', depth = 0, ctx = { fileCount: 0 }) {
	const currentPath = basePath || path.basename(dirPath);

	if (depth >= MAX_DEPTH || ctx.fileCount >= MAX_FILES) {
		return { name: path.basename(dirPath), path: currentPath, kind: 'directory', children: [] };
	}

	let entries;
	try {
		entries = fs.readdirSync(dirPath, { withFileTypes: true });
	} catch {
		return { name: path.basename(dirPath), path: currentPath, kind: 'directory', children: [] };
	}

	const children = [];

	for (const entry of entries) {
		if (ctx.fileCount >= MAX_FILES) break;
		if (SKIP_PATTERNS.has(entry.name)) continue;
		if (entry.name.endsWith('.egg-info')) continue;
		if (entry.name.startsWith('.') && entry.name !== '.env') continue;

		const entryPath = `${currentPath}/${entry.name}`;
		const absolutePath = path.join(dirPath, entry.name);

		if (entry.isDirectory()) {
			const child = scanDirectory(absolutePath, entryPath, depth + 1, ctx);
			children.push(child);
		} else if (entry.isFile()) {
			ctx.fileCount++;
			const language = detectLanguage(entry.name);
			children.push({
				name: entry.name,
				path: entryPath,
				kind: 'file',
				language: language ?? undefined,
				_absolutePath: absolutePath,
			});
		}
	}

	children.sort((a, b) => {
		if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
		return a.name.localeCompare(b.name);
	});

	return {
		name: path.basename(dirPath),
		path: currentPath,
		kind: 'directory',
		children,
	};
}

export function devFsPlugin() {
	return {
		name: 'dev-fs-plugin',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const url = new URL(req.url, 'http://localhost');

				if (url.pathname === '/__dev/scan') {
					const dir = url.searchParams.get('dir');
					if (!dir) {
						res.statusCode = 400;
						res.end(JSON.stringify({ error: 'Missing dir parameter' }));
						return;
					}
					if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
						res.statusCode = 404;
						res.end(JSON.stringify({ error: 'Directory not found' }));
						return;
					}

					const tree = scanDirectory(dir);
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify(tree));
					return;
				}

				if (url.pathname === '/__dev/read') {
					const file = url.searchParams.get('file');
					if (!file) {
						res.statusCode = 400;
						res.end(JSON.stringify({ error: 'Missing file parameter' }));
						return;
					}
					if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
						res.statusCode = 404;
						res.end(JSON.stringify({ error: 'File not found' }));
						return;
					}

					const stat = fs.statSync(file);
					if (stat.size > MAX_FILE_SIZE) {
						res.setHeader('Content-Type', 'text/plain');
						res.end('');
						return;
					}

					const content = fs.readFileSync(file, 'utf-8');
					res.setHeader('Content-Type', 'text/plain');
					res.end(content);
					return;
				}

				next();
			});
		},
	};
}
