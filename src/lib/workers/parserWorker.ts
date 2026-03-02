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
let Language: any;
let parserInstance: any;
const loadedGrammars = new Map<string, any>();

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
	const msg = e.data;

	if (msg.type === 'init') {
		try {
			const TreeSitter = await import('web-tree-sitter');
			Parser = TreeSitter.Parser ?? TreeSitter.default;
			Language = TreeSitter.Language ?? Parser.Language;
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
		go: '/tree-sitter-go.wasm',
		rust: '/tree-sitter-rust.wasm',
		java: '/tree-sitter-java.wasm',
		c: '/tree-sitter-c.wasm',
		cpp: '/tree-sitter-cpp.wasm',
	};

	const wasmPath = grammarMap[language];
	if (!wasmPath) throw new Error(`Unsupported language: ${language}`);

	const grammar = await Language.load(wasmPath);
	loadedGrammars.set(language, grammar);
	return grammar;
}

function extractSymbols(rootNode: any, language: string): ASTSymbol[] {
	switch (language) {
		case 'python':
			return extractPythonSymbols(rootNode);
		case 'javascript':
		case 'typescript':
			return extractJSSymbols(rootNode);
		case 'go':
			return extractGoSymbols(rootNode);
		case 'rust':
		case 'java':
		case 'c':
		case 'cpp':
			return extractGenericSymbols(rootNode, language);
		default:
			return extractGenericSymbols(rootNode, language);
	}
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

function extractGoSymbols(rootNode: any): ASTSymbol[] {
	const symbols: ASTSymbol[] = [];

	for (const child of rootNode.children) {
		if (child.type === 'package_clause') {
			symbols.push({
				name: child.childForFieldName('name')?.text ?? child.text,
				kind: 'import',
				lineStart: child.startPosition.row + 1,
				lineEnd: child.endPosition.row + 1,
			});
		} else if (child.type === 'import_declaration') {
			symbols.push(buildImportSymbol(child));
		} else if (child.type === 'function_declaration') {
			symbols.push(buildFunctionSymbol(child, 'function', 'go'));
		} else if (child.type === 'method_declaration') {
			// Go methods: func (receiver Type) MethodName(...)
			const nameNode = child.childForFieldName('name');
			const receiverNode = child.childForFieldName('receiver');
			let receiverType: string | undefined;
			if (receiverNode) {
				// Extract the type name from the parameter list
				const paramList = receiverNode.text ?? '';
				const match = paramList.match(/\*?(\w+)\s*\)$/);
				if (match) receiverType = match[1];
			}
			symbols.push({
				name: nameNode?.text ?? '<anonymous>',
				kind: 'method',
				lineStart: child.startPosition.row + 1,
				lineEnd: child.endPosition.row + 1,
				parentName: receiverType,
			});
		} else if (child.type === 'type_declaration') {
			// type_declaration contains type_spec children
			for (const spec of child.children) {
				if (spec.type === 'type_spec') {
					const nameNode = spec.childForFieldName('name');
					const typeNode = spec.childForFieldName('type');
					const typeName = typeNode?.type;

					if (typeName === 'struct_type') {
						const methods: ASTSymbol[] = [];
						const body = typeNode.childForFieldName('body') ?? typeNode;
						if (body) {
							for (const field of body.children) {
								if (field.type === 'field_declaration') {
									const fieldName = field.childForFieldName('name');
									if (fieldName) {
										methods.push({
											name: fieldName.text,
											kind: 'variable',
											lineStart: field.startPosition.row + 1,
											lineEnd: field.endPosition.row + 1,
											parentName: nameNode?.text,
										});
									}
								}
							}
						}
						symbols.push({
							name: nameNode?.text ?? '<anonymous>',
							kind: 'class',
							lineStart: child.startPosition.row + 1,
							lineEnd: child.endPosition.row + 1,
							children: methods.length > 0 ? methods : undefined,
						});
					} else if (typeName === 'interface_type') {
						const methods: ASTSymbol[] = [];
						for (const member of typeNode.children) {
							if (member.type === 'method_spec') {
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
						symbols.push({
							name: nameNode?.text ?? '<anonymous>',
							kind: 'interface',
							lineStart: child.startPosition.row + 1,
							lineEnd: child.endPosition.row + 1,
							children: methods.length > 0 ? methods : undefined,
						});
					} else {
						// type alias
						symbols.push({
							name: nameNode?.text ?? '<anonymous>',
							kind: 'type',
							lineStart: child.startPosition.row + 1,
							lineEnd: child.endPosition.row + 1,
						});
					}
				}
			}
		}
	}

	return symbols;
}

function extractGenericSymbols(rootNode: any, language: string): ASTSymbol[] {
	const symbols: ASTSymbol[] = [];

	function walk(node: any) {
		switch (node.type) {
			// Functions
			case 'function_definition':
			case 'function_declaration':
			case 'function_item': {
				symbols.push(buildFunctionSymbol(node, 'function', language));
				return; // don't walk children
			}

			// Methods (Java)
			case 'method_declaration': {
				// Java method inside a class
				const nameNode = node.childForFieldName('name');
				symbols.push({
					name: nameNode?.text ?? '<anonymous>',
					kind: 'method',
					lineStart: node.startPosition.row + 1,
					lineEnd: node.endPosition.row + 1,
				});
				return;
			}

			// Classes (Java, C++)
			case 'class_declaration': {
				symbols.push(buildClassSymbol(node, language));
				return;
			}

			// Structs (Rust)
			case 'struct_item': {
				const nameNode = node.childForFieldName('name');
				symbols.push({
					name: nameNode?.text ?? '<anonymous>',
					kind: 'class',
					lineStart: node.startPosition.row + 1,
					lineEnd: node.endPosition.row + 1,
				});
				return;
			}

			// Enums (Rust)
			case 'enum_item': {
				const nameNode = node.childForFieldName('name');
				symbols.push({
					name: nameNode?.text ?? '<anonymous>',
					kind: 'class',
					lineStart: node.startPosition.row + 1,
					lineEnd: node.endPosition.row + 1,
				});
				return;
			}

			// Impl blocks (Rust)
			case 'impl_item': {
				const typeNode = node.childForFieldName('type');
				const traitNode = node.childForFieldName('trait');
				const implName = traitNode
					? `${traitNode.text} for ${typeNode?.text ?? '?'}`
					: typeNode?.text ?? '<anonymous>';
				const methods: ASTSymbol[] = [];
				const body = node.childForFieldName('body');
				if (body) {
					for (const member of body.children) {
						if (member.type === 'function_item') {
							const methodName = member.childForFieldName('name');
							methods.push({
								name: methodName?.text ?? '<anonymous>',
								kind: 'method',
								lineStart: member.startPosition.row + 1,
								lineEnd: member.endPosition.row + 1,
								parentName: typeNode?.text,
							});
						}
					}
				}
				symbols.push({
					name: implName,
					kind: 'class',
					lineStart: node.startPosition.row + 1,
					lineEnd: node.endPosition.row + 1,
					children: methods.length > 0 ? methods : undefined,
				});
				return;
			}

			// Interfaces (Java)
			case 'interface_declaration': {
				const nameNode = node.childForFieldName('name');
				symbols.push({
					name: nameNode?.text ?? '<anonymous>',
					kind: 'interface',
					lineStart: node.startPosition.row + 1,
					lineEnd: node.endPosition.row + 1,
				});
				return;
			}

			// Imports
			case 'import_declaration':
			case 'use_declaration':
			case 'preproc_include': {
				symbols.push(buildImportSymbol(node));
				return;
			}
		}

		// Walk children for container nodes
		if (node.children) {
			for (const child of node.children) {
				walk(child);
			}
		}
	}

	walk(rootNode);
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
				member.type === 'method_definition' ||
				member.type === 'method_declaration'
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
