import { create, insert, search } from '@orama/orama';
import type { ASTSymbol } from '$lib/types/ast';
import type { FileNode } from '$lib/types/fileTree';

export interface SearchResult {
	type: 'file' | 'symbol';
	name: string;
	path: string;
	kind?: string;
	lineStart?: number;
	language?: string;
}

const schema = {
	type: 'string' as const,
	name: 'string' as const,
	path: 'string' as const,
	kind: 'string' as const,
	lineStart: 'number' as const,
	language: 'string' as const
};

type OramaDB = ReturnType<typeof create<typeof schema>>;

let db: OramaDB | null = null;

function collectFiles(node: FileNode, results: FileNode[]): void {
	if (node.kind === 'file') {
		results.push(node);
	}
	if (node.children) {
		for (const child of node.children) {
			collectFiles(child, results);
		}
	}
}

export function buildIndex(fileTree: FileNode | null, astMap: Map<string, ASTSymbol[]>): void {
	db = create({ schema });

	if (!fileTree) return;

	const files: FileNode[] = [];
	collectFiles(fileTree, files);

	for (const file of files) {
		insert(db, {
			type: 'file',
			name: file.name,
			path: file.path,
			kind: 'file',
			lineStart: 0,
			language: file.language ?? ''
		});
	}

	for (const [filePath, symbols] of astMap) {
		const insertSymbols = (syms: ASTSymbol[]) => {
			for (const sym of syms) {
				insert(db!, {
					type: 'symbol',
					name: sym.name,
					path: filePath,
					kind: sym.kind,
					lineStart: sym.lineStart,
					language: ''
				});
				if (sym.children) {
					insertSymbols(sym.children);
				}
			}
		};
		insertSymbols(symbols);
	}
}

export function searchIndex(query: string, limit = 20): SearchResult[] {
	if (!db || !query.trim()) return [];

	const raw = search(db, {
		term: query,
		properties: ['name'],
		limit,
		tolerance: 1
	});

	if (!raw || !('hits' in raw)) return [];

	return (raw as { hits: { document: Record<string, unknown> }[] }).hits.map((hit) => {
		const doc = hit.document;
		return {
			type: doc.type as 'file' | 'symbol',
			name: doc.name as string,
			path: doc.path as string,
			kind: doc.kind as string | undefined,
			lineStart:
				doc.lineStart && (doc.lineStart as number) > 0 ? (doc.lineStart as number) : undefined,
			language: (doc.language as string) || undefined
		};
	});
}
