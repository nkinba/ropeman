/**
 * exportService — export SvelteFlow diagram as PNG or SVG
 * Uses browser-native APIs only (no external libraries).
 */

/**
 * Export a DOM element as PNG by rendering it to a canvas.
 * Uses the foreignObject SVG technique with data URL encoding
 * to avoid tainted canvas issues.
 */
export async function exportAsPNG(
	element: HTMLElement,
	filename: string = 'diagram.png'
): Promise<void> {
	const { width, height } = element.getBoundingClientRect();
	const cloned = element.cloneNode(true) as HTMLElement;

	// Inline computed styles for faithful rendering
	inlineStyles(element, cloned);

	const svgNS = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS(svgNS, 'svg');
	svg.setAttribute('width', String(width));
	svg.setAttribute('height', String(height));
	svg.setAttribute('xmlns', svgNS);

	const foreignObject = document.createElementNS(svgNS, 'foreignObject');
	foreignObject.setAttribute('width', '100%');
	foreignObject.setAttribute('height', '100%');
	foreignObject.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
	foreignObject.appendChild(cloned);
	svg.appendChild(foreignObject);

	const serializer = new XMLSerializer();
	const svgString = serializer.serializeToString(svg);

	// Use data URL instead of blob URL to avoid tainted canvas
	const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

	return new Promise<void>((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			const scale = window.devicePixelRatio || 1;
			canvas.width = width * scale;
			canvas.height = height * scale;
			const ctx = canvas.getContext('2d')!;
			ctx.scale(scale, scale);
			ctx.drawImage(img, 0, 0, width, height);

			canvas.toBlob((blob) => {
				if (!blob) {
					reject(new Error('Failed to create PNG blob'));
					return;
				}
				downloadBlob(blob, filename);
				resolve();
			}, 'image/png');
		};
		img.onerror = () => {
			console.error('[exportService] Failed to render PNG');
			reject(new Error('Failed to render PNG'));
		};
		img.src = dataUrl;
	});
}

/**
 * Export the SVG content from a SvelteFlow container.
 * Extracts the internal SVG element and serializes it.
 */
export async function exportAsSVG(
	element: HTMLElement,
	filename: string = 'diagram.svg'
): Promise<void> {
	const svgEl = element.querySelector('svg.svelte-flow__edges');
	if (!svgEl) {
		// Fallback: serialize the entire container as foreignObject SVG
		const { width, height } = element.getBoundingClientRect();
		const svgNS = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(svgNS, 'svg');
		svg.setAttribute('width', String(width));
		svg.setAttribute('height', String(height));
		svg.setAttribute('xmlns', svgNS);

		const foreignObject = document.createElementNS(svgNS, 'foreignObject');
		foreignObject.setAttribute('width', '100%');
		foreignObject.setAttribute('height', '100%');

		const cloned = element.cloneNode(true) as HTMLElement;
		inlineStyles(element, cloned);
		foreignObject.appendChild(cloned);
		svg.appendChild(foreignObject);

		const serializer = new XMLSerializer();
		const svgString =
			'<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(svg);
		const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		downloadBlob(blob, filename);
		return;
	}

	// Clone and prepare the SVG
	const cloned = svgEl.cloneNode(true) as SVGSVGElement;
	const { width, height } = element.getBoundingClientRect();
	cloned.setAttribute('width', String(width));
	cloned.setAttribute('height', String(height));
	cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

	const serializer = new XMLSerializer();
	const svgString =
		'<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(cloned);
	const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
	downloadBlob(blob, filename);
}

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
	// Prefer File System Access API (avoids insecure connection warnings on HTTP)
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
			// User cancelled save dialog — silently ignore
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

/**
 * Recursively inline computed styles from source to cloned element.
 * This ensures the cloned element renders correctly in the exported image.
 */
function inlineStyles(source: Element, target: Element): void {
	const computed = window.getComputedStyle(source);
	const important: string[] = [
		'background-color',
		'color',
		'font-family',
		'font-size',
		'font-weight',
		'border',
		'border-radius',
		'padding',
		'margin',
		'display',
		'flex-direction',
		'align-items',
		'justify-content',
		'gap',
		'position',
		'width',
		'height',
		'box-shadow',
		'opacity',
		'overflow',
		'transform',
		'fill',
		'stroke',
		'stroke-width'
	];
	for (const prop of important) {
		(target as HTMLElement).style?.setProperty(prop, computed.getPropertyValue(prop));
	}

	const sourceChildren = source.children;
	const targetChildren = target.children;
	for (let i = 0; i < sourceChildren.length && i < targetChildren.length; i++) {
		inlineStyles(sourceChildren[i], targetChildren[i]);
	}
}
