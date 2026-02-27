const EXTENSION_MAP: Record<string, string> = {
	'.py': 'python',
	'.js': 'javascript',
	'.jsx': 'javascript',
	'.ts': 'typescript',
	'.tsx': 'typescript',
	'.go': 'go',
	'.rs': 'rust',
	'.java': 'java',
	'.c': 'c',
	'.cpp': 'cpp',
	'.h': 'c',
	'.hpp': 'cpp',
	'.rb': 'ruby',
	'.php': 'php',
	'.swift': 'swift',
	'.kt': 'kotlin',
	'.scala': 'scala',
	'.cs': 'csharp',
};

const SUPPORTED_LANGUAGES = new Set(['python', 'javascript', 'typescript']);

export function detectLanguage(filename: string): string | null {
	const ext = filename.substring(filename.lastIndexOf('.'));
	return EXTENSION_MAP[ext] ?? null;
}

export function isSupported(language: string): boolean {
	return SUPPORTED_LANGUAGES.has(language);
}

export function getGrammarFile(language: string): string | null {
	const grammarMap: Record<string, string> = {
		python: 'tree-sitter-python.wasm',
		javascript: 'tree-sitter-javascript.wasm',
		typescript: 'tree-sitter-typescript.wasm',
	};
	return grammarMap[language] ?? null;
}
