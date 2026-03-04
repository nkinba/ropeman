// File System Access API type declarations
// https://wicg.github.io/file-system-access/

interface FileSystemDirectoryHandle {
	values(): AsyncIterableIterator<FileSystemHandle>;
}

interface Window {
	showDirectoryPicker(options?: {
		mode?: 'read' | 'readwrite';
	}): Promise<FileSystemDirectoryHandle>;
}
