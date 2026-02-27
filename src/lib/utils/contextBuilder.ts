import type { GraphNode } from '$lib/types/graph';
import type { ASTSymbol } from '$lib/types/ast';
import { projectStore } from '$lib/stores/projectStore.svelte';

export function buildContext(node: GraphNode | null): string {
	const base = `You are a helpful code analysis assistant. You help developers understand codebases by explaining code structure, functions, classes, and their relationships. Answer concisely and accurately. When referencing other code elements, mention their node IDs so the user can navigate to them.`;

	if (!node) {
		return base;
	}

	let context = base + '\n\n';
	context += `## Current Node\n`;
	context += `- **ID**: ${node.id}\n`;
	context += `- **Name**: ${node.label}\n`;
	context += `- **Kind**: ${node.kind}\n`;
	context += `- **File**: ${node.filePath}\n`;

	if (node.language) {
		context += `- **Language**: ${node.language}\n`;
	}

	if (node.lineStart !== undefined && node.lineEnd !== undefined) {
		context += `- **Lines**: ${node.lineStart}-${node.lineEnd}\n`;
	}

	if (node.parentId) {
		context += `- **Parent ID**: ${node.parentId}\n`;
	}

	if (node.code) {
		context += `\n### Code\n\`\`\`\n${node.code}\n\`\`\`\n`;
	}

	// Include sibling symbols from the same file
	const fileSymbols = projectStore.astMap.get(node.filePath);
	if (fileSymbols && fileSymbols.length > 0) {
		const siblings = fileSymbols
			.filter(s => s.name !== node.label)
			.slice(0, 10);

		if (siblings.length > 0) {
			context += `\n### Other symbols in ${node.filePath}\n`;
			for (const sym of siblings) {
				context += `- ${sym.kind} \`${sym.name}\` (lines ${sym.lineStart}-${sym.lineEnd})\n`;
			}
		}
	}

	context += '\nWhen mentioning related code elements, reference their IDs so the user can click to navigate.';
	return context;
}
