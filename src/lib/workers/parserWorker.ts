/// <reference lib="webworker" />

import type { ASTSymbol, SymbolKind } from '$lib/types/ast';

declare const self: DedicatedWorkerGlobalScope;

interface InitMessage {
	type: 'init';
}

interface ParseMessage {
	type: 'parse';
	filePath: string;
	content: string;
	language: string;
}

type WorkerMessage = InitMessage | ParseMessage;

let Parser: any;
let parserInstance: any;
const loadedGrammars = new Map<string, any>();

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
	const msg = e.data;

	if (msg.type === 'init') {
		try {
			const TreeSitter = await import('web-tree-sitter');
			Parser = TreeSitter.default;
			await Parser.init({
				locateFile: () => '/tree-sitter.wasm',
			});
			parserInstance = new Parser();
			self.postMessage({ type: 'init-done' });
		} catch (err) {
			self.postMessage({ type: 'error', error: `Init failed: ${err}` });
		}
		return;
	}

	if (msg.type === 'parse') {
		try {
			if (!parserInstance) {
				self.postMessage({
					type: 'error',
					filePath: msg.filePath,
					error: 'Parser not initialized',
				});
				return;
			}

			const grammar = await getGrammar(msg.language);
			parserInstance.setLanguage(grammar);

			const tree = parserInstance.parse(msg.content);
			const symbols = extractSymbols(tree.rootNode, msg.language);

			self.postMessage({
				type: 'parse-result',
				filePath: msg.filePath,
				symbols,
			});
		} catch (err) {
			self.postMessage({
				type: 'error',
				filePath: msg.filePath,
				error: `Parse failed: ${err}`,
			});
		}
	}
};

async function getGrammar(language: string) {
	if (loadedGrammars.has(language)) {
		return loadedGrammars.get(language);
	}

	const grammarMap: Record<string, string> = {
		python: '/tree-sitter-python.wasm',
		javascript: '/tree-sitter-javascript.wasm',
		typescript: '/tree-sitter-typescript.wasm',
	};

	const wasmPath = grammarMap[language];
	if (!wasmPath) throw new Error(`Unsupported language: ${language}`);

	const grammar = await Parser.Language.load(wasmPath);
	loadedGrammars.set(language, grammar);
	return grammar;
}

function extractSymbols(rootNode: any, language: string): ASTSymbol[] {
	if (language === 'python') {
		return extractPythonSymbols(rootNode);
	}
	return extractJSSymbols(rootNode);
}

function extractPythonSymbols(rootNode: any): ASTSymbol[] {
	const symbols: ASTSymbol[] = [];

	for (const child of rootNode.children) {
		if (child.type === 'function_definition') {
			symbols.push(buildFunctionSymbol(child, 'function', 'python'));
		} else if (child.type === 'class_definition') {
			symbols.push(buildClassSymbol(child, 'python'));
		} else if (child.type === 'import_statement' || child.type === 'import_from_statement') {
			symbols.push(buildImportSymbol(child));
		} else if (child.type === 'decorated_definition') {
			const inner = child.children.find(
				(c: any) => c.type === 'function_definition' || c.type === 'class_definition'
			);
			if (inner) {
				if (inner.type === 'function_definition') {
					symbols.push(buildFunctionSymbol(inner, 'function', 'python'));
				} else {
					symbols.push(buildClassSymbol(inner, 'python'));
				}
			}
		}
	}

	return symbols;
}

function extractJSSymbols(rootNode: any): ASTSymbol[] {
	const symbols: ASTSymbol[] = [];

	for (const child of rootNode.children) {
		if (child.type === 'function_declaration') {
			symbols.push(buildFunctionSymbol(child, 'function', 'javascript'));
		} else if (child.type === 'class_declaration') {
			symbols.push(buildClassSymbol(child, 'javascript'));
		} else if (child.type === 'import_statement') {
			symbols.push(buildImportSymbol(child));
		} else if (child.type === 'export_statement') {
			const isDefault = child.text?.startsWith('export default');
			const inner = child.children.find(
				(c: any) =>
					c.type === 'function_declaration' ||
					c.type === 'class_declaration' ||
					c.type === 'lexical_declaration'
			);
			if (inner) {
				if (inner.type === 'function_declaration') {
					const sym = buildFunctionSymbol(inner, 'function', 'javascript');
					if (isDefault) {
						sym.badges = [...(sym.badges ?? []), 'export_default'];
					}
					symbols.push(sym);
				} else if (inner.type === 'class_declaration') {
					const sym = buildClassSymbol(inner, 'javascript');
					if (isDefault) {
						sym.badges = [...(sym.badges ?? []), 'export_default'];
					}
					symbols.push(sym);
				} else if (inner.type === 'lexical_declaration') {
					const arrowSyms = extractArrowFunctions(inner);
					if (isDefault) {
						for (const s of arrowSyms) {
							s.badges = [...(s.badges ?? []), 'export_default'];
						}
					}
					symbols.push(...arrowSyms);
				}
			}
		} else if (child.type === 'lexical_declaration') {
			const arrowSyms = extractArrowFunctions(child);
			symbols.push(...arrowSyms);
		}
	}

	return symbols;
}

function extractArrowFunctions(node: any): ASTSymbol[] {
	const symbols: ASTSymbol[] = [];

	for (const declarator of node.children) {
		if (declarator.type !== 'variable_declarator') continue;

		const nameNode = declarator.childForFieldName('name');
		const valueNode = declarator.childForFieldName('value');

		if (valueNode?.type === 'arrow_function' && nameNode) {
			symbols.push({
				name: nameNode.text,
				kind: 'function',
				lineStart: node.startPosition.row + 1,
				lineEnd: node.endPosition.row + 1,
			});
		}
	}

	return symbols;
}

function detectBadges(node: any, language: string): import('$lib/types/ast').BadgeKind[] {
	const badges: import('$lib/types/ast').BadgeKind[] = [];

	if (language === 'python') {
		// Check for async def
		if (node.type === 'function_definition' && node.text?.startsWith('async ')) {
			badges.push('async');
		}
		// Check for yield in body (generator)
		const body = node.childForFieldName('body');
		if (body && body.text?.includes('yield')) {
			badges.push('generator');
		}
		// Check for @staticmethod decorator (look at parent decorated_definition)
		const parentText = node.parent?.text ?? '';
		if (parentText.includes('@staticmethod')) {
			badges.push('static');
		}
		// Check for route decorators
		if (parentText.match(/@(app|router)\.(route|get|post|put|delete|patch)/)) {
			badges.push('route');
		}
		// Check if decorated
		if (node.parent?.type === 'decorated_definition') {
			badges.push('decorator');
		}
	} else {
		// JS/TS
		// async function or async arrow
		if (node.text?.startsWith('async ')) {
			badges.push('async');
		}
		// generator: function*
		if (node.type === 'generator_function_declaration' || node.text?.includes('function*')) {
			badges.push('generator');
		}
		// abstract class
		if (node.text?.startsWith('abstract ')) {
			badges.push('abstract');
		}
	}

	return badges;
}

function buildFunctionSymbol(node: any, kind: SymbolKind, language: string = 'python'): ASTSymbol {
	const nameNode = node.childForFieldName('name');
	const badges = detectBadges(node, language);
	return {
		name: nameNode?.text ?? '<anonymous>',
		kind,
		lineStart: node.startPosition.row + 1,
		lineEnd: node.endPosition.row + 1,
		badges: badges.length > 0 ? badges : undefined,
	};
}

function buildClassSymbol(node: any, language: string = 'python'): ASTSymbol {
	const nameNode = node.childForFieldName('name');
	const methods: ASTSymbol[] = [];
	const badges = detectBadges(node, language);

	const body = node.childForFieldName('body');
	if (body) {
		for (const member of body.children) {
			if (
				member.type === 'function_definition' ||
				member.type === 'method_definition'
			) {
				const methodName = member.childForFieldName('name');
				methods.push({
					name: methodName?.text ?? '<anonymous>',
					kind: 'method',
					lineStart: member.startPosition.row + 1,
					lineEnd: member.endPosition.row + 1,
					parentName: nameNode?.text,
				});
			}
		}
	}

	return {
		name: nameNode?.text ?? '<anonymous>',
		kind: 'class',
		lineStart: node.startPosition.row + 1,
		lineEnd: node.endPosition.row + 1,
		children: methods.length > 0 ? methods : undefined,
		badges: badges.length > 0 ? badges : undefined,
	};
}

function buildImportSymbol(node: any): ASTSymbol {
	return {
		name: node.text,
		kind: 'import',
		lineStart: node.startPosition.row + 1,
		lineEnd: node.endPosition.row + 1,
	};
}
