/**
 * File type icon mapping using Material Symbols Outlined (Apache 2.0).
 * Returns a Material Symbols icon name and optional accent color for the given filename.
 */

interface FileIconInfo {
	icon: string;
	color?: string;
}

const EXTENSION_MAP: Record<string, FileIconInfo> = {
	// JavaScript / TypeScript
	'.js': { icon: 'javascript', color: '#f7df1e' },
	'.jsx': { icon: 'javascript', color: '#61dafb' },
	'.ts': { icon: 'code', color: '#3178c6' },
	'.tsx': { icon: 'code', color: '#3178c6' },
	'.mjs': { icon: 'javascript', color: '#f7df1e' },
	'.cjs': { icon: 'javascript', color: '#f7df1e' },

	// Web
	'.html': { icon: 'html', color: '#e34f26' },
	'.css': { icon: 'css', color: '#1572b6' },
	'.scss': { icon: 'css', color: '#c6538c' },
	'.svelte': { icon: 'code', color: '#ff3e00' },
	'.vue': { icon: 'code', color: '#42b883' },

	// Python
	'.py': { icon: 'code', color: '#3776ab' },

	// Go / Rust / Java / C
	'.go': { icon: 'code', color: '#00add8' },
	'.rs': { icon: 'code', color: '#dea584' },
	'.java': { icon: 'coffee', color: '#b07219' },
	'.c': { icon: 'code', color: '#555555' },
	'.cpp': { icon: 'code', color: '#f34b7d' },
	'.h': { icon: 'code', color: '#555555' },
	'.hpp': { icon: 'code', color: '#f34b7d' },
	'.cs': { icon: 'code', color: '#178600' },

	// Ruby / PHP / Swift / Kotlin / Scala
	'.rb': { icon: 'code', color: '#cc342d' },
	'.php': { icon: 'code', color: '#4f5d95' },
	'.swift': { icon: 'code', color: '#f05138' },
	'.kt': { icon: 'code', color: '#a97bff' },
	'.scala': { icon: 'code', color: '#dc322f' },

	// Data / Config
	'.json': { icon: 'data_object', color: '#959da5' },
	'.yaml': { icon: 'settings', color: '#cb171e' },
	'.yml': { icon: 'settings', color: '#cb171e' },
	'.toml': { icon: 'settings' },
	'.xml': { icon: 'data_object', color: '#e37933' },
	'.env': { icon: 'lock', color: '#ecd53f' },

	// Markdown / Text
	'.md': { icon: 'article', color: '#083fa1' },
	'.txt': { icon: 'description' },
	'.rst': { icon: 'article' },

	// Images
	'.png': { icon: 'image', color: '#a4c639' },
	'.jpg': { icon: 'image', color: '#a4c639' },
	'.jpeg': { icon: 'image', color: '#a4c639' },
	'.gif': { icon: 'image', color: '#a4c639' },
	'.svg': { icon: 'image', color: '#ffb13b' },
	'.ico': { icon: 'image' },
	'.webp': { icon: 'image', color: '#a4c639' },

	// Shell / Scripts
	'.sh': { icon: 'terminal', color: '#4eaa25' },
	'.bash': { icon: 'terminal', color: '#4eaa25' },
	'.zsh': { icon: 'terminal', color: '#4eaa25' },
	'.bat': { icon: 'terminal' },
	'.ps1': { icon: 'terminal', color: '#012456' },

	// Lock / Package
	'.lock': { icon: 'lock' },

	// Build / Tooling
	'.wasm': { icon: 'memory', color: '#654ff0' },
	'.map': { icon: 'map' }
};

const FILENAME_MAP: Record<string, FileIconInfo> = {
	'package.json': { icon: 'inventory_2', color: '#cb3837' },
	'tsconfig.json': { icon: 'settings', color: '#3178c6' },
	'vite.config.js': { icon: 'bolt', color: '#646cff' },
	'vite.config.ts': { icon: 'bolt', color: '#646cff' },
	'svelte.config.js': { icon: 'settings', color: '#ff3e00' },
	'.gitignore': { icon: 'visibility_off' },
	'.eslintrc': { icon: 'rule', color: '#4b32c3' },
	'eslint.config.js': { icon: 'rule', color: '#4b32c3' },
	Dockerfile: { icon: 'deployed_code', color: '#2496ed' },
	'docker-compose.yml': { icon: 'deployed_code', color: '#2496ed' },
	'README.md': { icon: 'menu_book', color: '#083fa1' },
	LICENSE: { icon: 'gavel' },
	Makefile: { icon: 'build' },
	'.env': { icon: 'lock', color: '#ecd53f' },
	'wrangler.toml': { icon: 'cloud', color: '#f38020' }
};

export function getFileIcon(filename: string): FileIconInfo {
	// Check exact filename first
	const byName = FILENAME_MAP[filename];
	if (byName) return byName;

	// Check extension
	const dotIndex = filename.lastIndexOf('.');
	if (dotIndex >= 0) {
		const ext = filename.substring(dotIndex).toLowerCase();
		const byExt = EXTENSION_MAP[ext];
		if (byExt) return byExt;
	}

	// Default
	return { icon: 'description' };
}

export function getFolderIcon(expanded: boolean): FileIconInfo {
	return { icon: expanded ? 'folder_open' : 'folder', color: '#90a4ae' };
}
