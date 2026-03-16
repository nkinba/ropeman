/**
 * exportService — export SvelteFlow diagram as PNG or SVG
 * Uses html-to-image for correct CSS variable resolution and foreignObject handling.
 */
import { toPng, toSvg } from 'html-to-image';

/** Filter out SvelteFlow UI chrome (minimap, controls, background, panels) */
function defaultNodeFilter(node: HTMLElement): boolean {
	const el = node as HTMLElement;
	if (!(el instanceof Element)) return true;
	const className = el.getAttribute?.('class') ?? '';
	// Exclude minimap, controls, background grid, and attribution
	if (
		className.includes('svelte-flow__minimap') ||
		className.includes('svelte-flow__controls') ||
		className.includes('svelte-flow__background') ||
		className.includes('svelte-flow__panel') ||
		className.includes('svelte-flow__attribution')
	) {
		return false;
	}
	return true;
}

export async function exportAsPNG(
	element: HTMLElement,
	filename: string = 'diagram.png',
	options?: { width?: number; height?: number }
): Promise<void> {
	const scale = window.devicePixelRatio || 1;
	const width = options?.width ?? element.scrollWidth;
	const height = options?.height ?? element.scrollHeight;

	const dataUrl = await toPng(element, {
		width,
		height,
		pixelRatio: scale,
		filter: defaultNodeFilter as (node: HTMLElement) => boolean,
		style: {
			transform: 'none',
			transformOrigin: 'top left'
		}
	});

	// Convert data URL to blob
	const response = await fetch(dataUrl);
	const blob = await response.blob();
	await downloadBlob(blob, filename);
}

export async function exportAsSVG(
	element: HTMLElement,
	filename: string = 'diagram.svg',
	options?: { width?: number; height?: number }
): Promise<void> {
	const width = options?.width ?? element.scrollWidth;
	const height = options?.height ?? element.scrollHeight;

	const dataUrl = await toSvg(element, {
		width,
		height,
		filter: defaultNodeFilter as (node: HTMLElement) => boolean,
		style: {
			transform: 'none',
			transformOrigin: 'top left'
		}
	});

	// Convert data URL to blob
	const svgString = decodeURIComponent(dataUrl.split(',')[1]);
	const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
	await downloadBlob(blob, filename);
}

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
	// Prefer File System Access API
	if ('showSaveFilePicker' in window) {
		try {
			const ext = filename.split('.').pop() ?? 'png';
			const mimeMap: Record<string, string> = { png: 'image/png', svg: 'image/svg+xml' };
			const handle = await (window as any).showSaveFilePicker({
				suggestedName: filename,
				types: [
					{
						description: `${ext.toUpperCase()} Image`,
						accept: { [mimeMap[ext] ?? 'application/octet-stream']: [`.${ext}`] }
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

	// Fallback: data URL download
	const reader = new FileReader();
	reader.onload = () => {
		const a = document.createElement('a');
		a.href = reader.result as string;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};
	reader.readAsDataURL(blob);
}
