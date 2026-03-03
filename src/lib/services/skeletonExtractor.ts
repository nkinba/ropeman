import type { FileNode } from '$lib/types/fileTree';
import type { ASTSymbol } from '$lib/types/ast';
import type {
	SkeletonFile,
	SkeletonImport,
	SkeletonPayload,
	SkeletonSymbol
} from '$lib/types/skeleton';

const SKIP_KINDS = new Set(['variable', 'interface', 'type']);

export function extractSkeleton(
	projectName: string,
	fileTree: FileNode | null,
	astMap: Map<string, ASTSymbol[]>
): SkeletonPayload {
	const files: SkeletonFile[] = [];
	let totalSymbols = 0;

	const filePaths = collectFilePaths(fileTree);

	for (const filePath of filePaths) {
		const astSymbols = astMap.get(filePath);
		if (!astSymbols || astSymbols.length === 0) continue;

		const symbols: SkeletonSymbol[] = [];
		const imports: SkeletonImport[] = [];

		for (const sym of astSymbols) {
			if (sym.kind === 'import') {
				imports.push(parseImport(sym));
			} else if (!SKIP_KINDS.has(sym.kind)) {
				symbols.push(toSkeletonSymbol(sym));
			}
		}

		if (symbols.length === 0 && imports.length === 0) continue;

		totalSymbols += countSymbols(symbols);

		const language = inferLanguage(filePath);
		files.push({ path: filePath, language, symbols, imports });
	}

	return {
		projectName,
		totalFiles: files.length,
		totalSymbols,
		files,
		generatedAt: new Date().toISOString()
	};
}

export function extractSubSkeleton(
	filePaths: string[],
	fileTree: FileNode | null,
	astMap: Map<string, ASTSymbol[]>
): SkeletonPayload {
	const filePathSet = new Set(filePaths);
	const files: SkeletonFile[] = [];
	let totalSymbols = 0;

	for (const filePath of filePaths) {
		const astSymbols = astMap.get(filePath);
		if (!astSymbols || astSymbols.length === 0) continue;

		const symbols: SkeletonSymbol[] = [];
		const imports: SkeletonImport[] = [];

		for (const sym of astSymbols) {
			if (sym.kind === 'import') {
				imports.push(parseImport(sym));
			} else if (!SKIP_KINDS.has(sym.kind)) {
				symbols.push(toSkeletonSymbol(sym));
			}
		}

		if (symbols.length === 0 && imports.length === 0) continue;

		totalSymbols += countSymbols(symbols);

		const language = inferLanguage(filePath);
		files.push({ path: filePath, language, symbols, imports });
	}

	return {
		projectName: 'sub-skeleton',
		totalFiles: files.length,
		totalSymbols,
		files,
		generatedAt: new Date().toISOString()
	};
}

export function estimatePayloadSize(payload: SkeletonPayload): {
	bytes: number;
	formatted: string;
} {
	const json = JSON.stringify(payload);
	const bytes = new TextEncoder().encode(json).byteLength;
	return { bytes, formatted: formatBytes(bytes) };
}

export function formatPayloadPreview(payload: SkeletonPayload): string {
	return JSON.stringify(payload, null, 2);
}

function collectFilePaths(node: FileNode | null): string[] {
	if (!node) return [];
	if (node.kind === 'file') return [node.path];

	const paths: string[] = [];
	if (node.children) {
		for (const child of node.children) {
			paths.push(...collectFilePaths(child));
		}
	}
	return paths;
}

function toSkeletonSymbol(sym: ASTSymbol): SkeletonSymbol {
	const result: SkeletonSymbol = {
		name: sym.name,
		kind: sym.kind as SkeletonSymbol['kind']
	};
	if (sym.badges && sym.badges.length > 0) {
		result.badges = [...sym.badges];
	}
	if (sym.children && sym.children.length > 0) {
		result.children = sym.children.filter((c) => !SKIP_KINDS.has(c.kind)).map(toSkeletonSymbol);
		if (result.children.length === 0) delete result.children;
	}
	return result;
}

function parseImport(sym: ASTSymbol): SkeletonImport {
	// sym.name typically looks like "module_name" or "from module import x, y"
	// We split on common patterns to extract source and specifiers
	const name = sym.name;

	// Pattern: "x, y from module" or just "module"
	const fromMatch = name.match(/^(.+?)\s+from\s+(.+)$/);
	if (fromMatch) {
		return {
			source: fromMatch[2].trim(),
			specifiers: fromMatch[1]
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean)
		};
	}

	return { source: name, specifiers: [] };
}

function countSymbols(symbols: SkeletonSymbol[]): number {
	let count = 0;
	for (const sym of symbols) {
		count++;
		if (sym.children) {
			count += countSymbols(sym.children);
		}
	}
	return count;
}

function inferLanguage(filePath: string): string | null {
	const ext = filePath.split('.').pop()?.toLowerCase();
	switch (ext) {
		case 'py':
			return 'python';
		case 'js':
			return 'javascript';
		case 'ts':
			return 'typescript';
		case 'jsx':
			return 'jsx';
		case 'tsx':
			return 'tsx';
		case 'svelte':
			return 'svelte';
		case 'go':
			return 'go';
		case 'rs':
			return 'rust';
		case 'java':
			return 'java';
		case 'c':
		case 'h':
			return 'c';
		case 'cpp':
		case 'hpp':
		case 'cc':
		case 'cxx':
			return 'cpp';
		case 'rb':
			return 'ruby';
		case 'php':
			return 'php';
		case 'swift':
			return 'swift';
		case 'kt':
			return 'kotlin';
		case 'scala':
			return 'scala';
		case 'cs':
			return 'csharp';
		default:
			return null;
	}
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb.toFixed(1)} KB`;
	const mb = kb / 1024;
	return `${mb.toFixed(1)} MB`;
}
