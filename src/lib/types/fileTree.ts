export interface FileNode {
	name: string;
	path: string;
	kind: 'file' | 'directory';
	children?: FileNode[];
	handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
	language?: string;
	size?: number;
}
