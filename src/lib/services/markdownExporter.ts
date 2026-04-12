/**
 * markdownExporter — generate Markdown architecture document from semantic analysis
 *
 * Output: a single .md file with frontmatter, root-level Mermaid flowchart,
 * per-domain sections (description, file list, key symbols), and optional
 * nested sub-levels from the drilldown cache.
 */
import type { SemanticLevel, SemanticNode, SemanticEdge } from '$lib/types/semantic';

export interface MarkdownExportInput {
	projectName: string;
	rootLevel: SemanticLevel;
	cache?: Map<string, SemanticLevel>;
	generatedAt?: Date;
	includeNested?: boolean;
}

const EDGE_LABELS: Record<SemanticEdge['type'], string> = {
	depends_on: 'depends on',
	calls: 'calls',
	extends: 'extends',
	uses: 'uses'
};

/** Mermaid node IDs must be alphanumeric/underscore. */
function safeId(id: string): string {
	return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

/** Escape characters that break Mermaid label parsing. */
function escapeLabel(label: string): string {
	return label.replace(/"/g, '\\"').replace(/\n/g, ' ');
}

function fileCount(level: SemanticLevel): number {
	const seen = new Set<string>();
	for (const n of level.nodes) {
		for (const fp of n.filePaths) seen.add(fp);
	}
	return seen.size;
}

export function buildMermaidFlowchart(level: SemanticLevel): string {
	const lines: string[] = ['```mermaid', 'flowchart LR'];
	for (const node of level.nodes) {
		lines.push(`    ${safeId(node.id)}["${escapeLabel(node.label)}"]`);
	}
	for (const edge of level.edges) {
		const arrow = edge.label
			? `-- "${escapeLabel(edge.label)}" -->`
			: `-- "${EDGE_LABELS[edge.type] ?? 'uses'}" -->`;
		lines.push(`    ${safeId(edge.source)} ${arrow} ${safeId(edge.target)}`);
	}
	lines.push('```');
	return lines.join('\n');
}

function buildFrontmatter(input: MarkdownExportInput): string {
	const date = (input.generatedAt ?? new Date()).toISOString();
	const totalFiles = fileCount(input.rootLevel);
	return [
		'---',
		`project: ${JSON.stringify(input.projectName)}`,
		`generated: ${date}`,
		`files: ${totalFiles}`,
		`domains: ${input.rootLevel.nodes.length}`,
		'generator: ropeman',
		'---'
	].join('\n');
}

function renderNodeSection(node: SemanticNode, headingLevel: number): string {
	const heading = '#'.repeat(headingLevel);
	const lines: string[] = [];
	lines.push(`${heading} ${node.label}`);
	lines.push('');
	if (node.description) {
		lines.push(node.description);
		lines.push('');
	}
	if (node.keySymbols.length > 0) {
		lines.push('**Key symbols**');
		lines.push('');
		lines.push(node.keySymbols.map((s) => `\`${s}\``).join(', '));
		lines.push('');
	}
	if (node.filePaths.length > 0) {
		lines.push('**Files**');
		lines.push('');
		for (const fp of node.filePaths) {
			lines.push(`- \`${fp}\``);
		}
		lines.push('');
	}
	return lines.join('\n');
}

function renderLevel(
	level: SemanticLevel,
	headingLevel: number,
	cache: Map<string, SemanticLevel> | undefined,
	includeNested: boolean,
	visited: Set<string>
): string {
	const sections: string[] = [];
	for (const node of level.nodes) {
		sections.push(renderNodeSection(node, headingLevel));

		if (includeNested && cache && !visited.has(node.id)) {
			const sub = cache.get(node.id);
			if (sub && sub.nodes.length > 0) {
				visited.add(node.id);
				const subHeading = '#'.repeat(Math.min(headingLevel + 1, 6));
				sections.push(`${subHeading} ${node.label} — Sub-domains`);
				sections.push('');
				sections.push(buildMermaidFlowchart(sub));
				sections.push('');
				sections.push(
					renderLevel(sub, Math.min(headingLevel + 2, 6), cache, includeNested, visited)
				);
			}
		}
	}
	return sections.join('\n');
}

export function buildMarkdownDocument(input: MarkdownExportInput): string {
	const parts: string[] = [];
	parts.push(buildFrontmatter(input));
	parts.push('');
	parts.push(`# ${input.projectName} — Architecture`);
	parts.push('');
	parts.push('## Overview');
	parts.push('');
	parts.push(buildMermaidFlowchart(input.rootLevel));
	parts.push('');
	parts.push('## Domains');
	parts.push('');
	parts.push(
		renderLevel(input.rootLevel, 3, input.cache, input.includeNested ?? true, new Set<string>())
	);
	return (
		parts
			.join('\n')
			.replace(/\n{3,}/g, '\n\n')
			.trimEnd() + '\n'
	);
}

export async function exportAsMarkdown(input: MarkdownExportInput): Promise<void> {
	const md = buildMarkdownDocument(input);
	const filename = `${sanitizeFilename(input.projectName) || 'project'}-architecture.md`;
	const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
	await downloadBlob(blob, filename);
}

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
	if ('showSaveFilePicker' in window) {
		try {
			const handle = await (
				window as unknown as {
					showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
				}
			).showSaveFilePicker({
				suggestedName: filename,
				types: [
					{
						description: 'Markdown',
						accept: { 'text/markdown': ['.md'] }
					}
				]
			});
			const writable = await handle.createWritable();
			await writable.write(blob);
			await writable.close();
			return;
		} catch (err: unknown) {
			if (err instanceof Error && err.name === 'AbortError') return;
		}
	}

	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
