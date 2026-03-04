import type { FileNode } from '$lib/types/fileTree';
import type { ASTSymbol } from '$lib/types/ast';

interface ProjectState {
	fileTree: FileNode | null;
	astMap: Map<string, ASTSymbol[]>;
	isLoading: boolean;
	projectName: string;
	parsingProgress: { done: number; total: number };
	isSnippetMode: boolean;
}

function createProjectStore() {
	let fileTree = $state.raw<FileNode | null>(null);
	let astMap = $state.raw<Map<string, ASTSymbol[]>>(new Map());
	let isLoading = $state(false);
	let projectName = $state('');
	let parsingProgress = $state({ done: 0, total: 0 });
	let isSnippetMode = $state(false);

	return {
		get fileTree() {
			return fileTree;
		},
		set fileTree(v: FileNode | null) {
			fileTree = v;
		},

		get astMap() {
			return astMap;
		},
		set astMap(v: Map<string, ASTSymbol[]>) {
			astMap = v;
		},

		get isLoading() {
			return isLoading;
		},
		set isLoading(v: boolean) {
			isLoading = v;
		},

		get projectName() {
			return projectName;
		},
		set projectName(v: string) {
			projectName = v;
		},

		get parsingProgress() {
			return parsingProgress;
		},
		set parsingProgress(v: { done: number; total: number }) {
			parsingProgress = v;
		},

		get isSnippetMode() {
			return isSnippetMode;
		},
		set isSnippetMode(v: boolean) {
			isSnippetMode = v;
		},

		reset() {
			fileTree = null;
			astMap = new Map();
			isLoading = false;
			projectName = '';
			parsingProgress = { done: 0, total: 0 };
			isSnippetMode = false;
		}
	};
}

export const projectStore = createProjectStore();
