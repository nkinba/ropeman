/**
 * htmlExporter — generate a single self-contained HTML viewer from semantic analysis.
 *
 * Output: one .html file containing
 *   - root level + every cached drilldown level rendered as inline SVG via dagre layout
 *   - minimal vanilla JS for level switching (drill down/up) and pan/zoom
 *   - inline CSS, no external CDN dependencies
 *
 * Strategy: instead of capturing the live SvelteFlow viewport (only the
 * currently rendered level is in the DOM), re-run dagre layout against the
 * cached `SemanticLevel` data and emit our own SVG. This lets us include every
 * level the user has drilled into in a single file.
 *
 * See ADR-17 for the rationale (cytoscape.js / vis-network alternatives rejected
 * for bundle-size and read-only-document reasons).
 */
import type { SemanticLevel } from '$lib/types/semantic';
import { renderSemanticLevelSvg } from './semanticSvgRenderer';

export interface HtmlExportInput {
	projectName: string;
	rootLevel: SemanticLevel;
	cache?: Map<string, SemanticLevel>;
	generatedAt?: Date;
}

interface RenderedLevel {
	id: string;
	parentId: string | null;
	breadcrumbLabel: string;
	svg: string;
	width: number;
	height: number;
	domains: {
		id: string;
		label: string;
		description: string;
		fileCount: number;
		filePaths: string[];
		keySymbols: string[];
		hasChildLevel: boolean;
	}[];
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function renderLevelSvg(
	level: SemanticLevel,
	cache: Map<string, SemanticLevel> | undefined
): RenderedLevel {
	const { svg, width, height } = renderSemanticLevelSvg(level, { theme: 'dark', cache });
	return {
		id: level.parentId ?? '__root__',
		parentId: level.parentId,
		breadcrumbLabel: level.breadcrumbLabel,
		svg,
		width,
		height,
		domains: level.nodes.map((n) => ({
			id: n.id,
			label: n.label,
			description: n.description,
			fileCount: n.fileCount,
			filePaths: n.filePaths,
			keySymbols: n.keySymbols,
			hasChildLevel: !!cache?.get(n.id)
		}))
	};
}

function collectLevels(
	root: SemanticLevel,
	cache: Map<string, SemanticLevel> | undefined
): Map<string, RenderedLevel> {
	const out = new Map<string, RenderedLevel>();
	const queue: SemanticLevel[] = [root];
	const visited = new Set<string>();
	while (queue.length > 0) {
		const level = queue.shift()!;
		const key = level.parentId ?? '__root__';
		if (visited.has(key)) continue;
		visited.add(key);
		out.set(key, renderLevelSvg(level, cache));
		if (cache) {
			for (const node of level.nodes) {
				const sub = cache.get(node.id);
				if (sub) queue.push(sub);
			}
		}
	}
	return out;
}

export function buildHtmlDocument(input: HtmlExportInput): string {
	const levels = collectLevels(input.rootLevel, input.cache);
	const rootKey = input.rootLevel.parentId ?? '__root__';

	const levelData: Record<
		string,
		{
			parentId: string | null;
			breadcrumbLabel: string;
			svg: string;
			domains: RenderedLevel['domains'];
		}
	> = {};
	for (const [key, lvl] of levels) {
		levelData[key] = {
			parentId: lvl.parentId,
			breadcrumbLabel: lvl.breadcrumbLabel,
			svg: lvl.svg,
			domains: lvl.domains
		};
	}

	// JSON.stringify is HTML-safe enough as long as we close out </script> sequences
	const dataJson = JSON.stringify(levelData).replace(/<\/script/g, '<\\/script');
	const generated = (input.generatedAt ?? new Date()).toISOString();
	const projectName = escapeHtml(input.projectName || 'project');

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="ropeman">
<title>${projectName} — Architecture</title>
<style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; height: 100%; background: #020617; color: #f1f5f9; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
body { display: flex; flex-direction: column; }
header { padding: 12px 20px; background: #0f172a; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
header h1 { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #e2e8f0; }
header .meta { font-size: 11px; color: #64748b; }
nav.breadcrumbs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 8px 20px; background: #0b1220; border-bottom: 1px solid #1e293b; font-size: 12px; }
nav.breadcrumbs button { background: none; border: none; color: #93c5fd; cursor: pointer; font: inherit; padding: 2px 6px; border-radius: 4px; }
nav.breadcrumbs button:hover { background: #1e293b; }
nav.breadcrumbs span.sep { color: #475569; }
nav.breadcrumbs span.current { color: #f1f5f9; font-weight: 600; padding: 2px 6px; }
main { flex: 1; display: flex; min-height: 0; }
.canvas-wrap { flex: 1; min-width: 0; overflow: hidden; position: relative; background: radial-gradient(circle at center, #0a1224 0%, #020617 100%); }
.canvas-inner { position: absolute; inset: 0; cursor: grab; }
.canvas-inner:active { cursor: grabbing; }
.canvas-inner svg { display: block; transform-origin: 0 0; user-select: none; }
.zoom-hint { position: absolute; bottom: 12px; left: 12px; padding: 4px 10px; background: rgba(15, 23, 42, 0.85); border-radius: 4px; font-size: 11px; color: #94a3b8; pointer-events: none; }
.zoom-controls { position: absolute; top: 12px; right: 12px; display: flex; flex-direction: column; gap: 4px; }
.zoom-controls button { width: 32px; height: 32px; background: #0f172a; border: 1px solid #1e293b; color: #e2e8f0; border-radius: 4px; cursor: pointer; font-size: 14px; }
.zoom-controls button:hover { background: #1e293b; }
aside { width: 320px; flex-shrink: 0; background: #0f172a; border-left: 1px solid #1e293b; overflow-y: auto; padding: 16px; font-size: 12px; }
aside h2 { margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
.domain-card { padding: 12px; border: 1px solid #1e293b; border-radius: 6px; margin-bottom: 8px; cursor: pointer; transition: border-color 0.15s; }
.domain-card:hover { border-color: #334155; }
.domain-card.has-child { border-left: 3px solid #38bdf8; }
.domain-card .name { font-weight: 600; color: #f1f5f9; margin-bottom: 4px; }
.domain-card .desc { color: #94a3b8; line-height: 1.4; margin-bottom: 6px; }
.domain-card .meta { color: #64748b; font-size: 10px; }
.domain-card .symbols { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px; }
.domain-card .symbols code { background: #1e293b; color: #e2e8f0; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-family: ui-monospace, monospace; }
.footer { padding: 8px 20px; background: #0b1220; border-top: 1px solid #1e293b; font-size: 10px; color: #475569; text-align: center; }
@media (max-width: 768px) {
	main { flex-direction: column; }
	aside { width: auto; max-height: 40vh; border-left: none; border-top: 1px solid #1e293b; }
}
</style>
</head>
<body>
<header>
	<h1>${projectName} — Architecture</h1>
	<span class="meta">Generated ${escapeHtml(generated)}</span>
</header>
<nav class="breadcrumbs" id="breadcrumbs"></nav>
<main>
	<div class="canvas-wrap">
		<div class="canvas-inner" id="canvas"></div>
		<div class="zoom-hint">Drag to pan · scroll to zoom · click a domain to drill down</div>
		<div class="zoom-controls">
			<button id="zoom-in" title="Zoom in">+</button>
			<button id="zoom-out" title="Zoom out">−</button>
			<button id="zoom-fit" title="Fit">⊡</button>
		</div>
	</div>
	<aside id="sidebar">
		<h2>Domains</h2>
		<div id="domain-list"></div>
	</aside>
</main>
<div class="footer">Generated by ropeman · single-file viewer · no network required</div>
<script>
(function () {
	var levels = ${dataJson};
	var rootKey = ${JSON.stringify(rootKey)};
	var stack = [rootKey];
	var canvas = document.getElementById('canvas');
	var sidebar = document.getElementById('domain-list');
	var crumbs = document.getElementById('breadcrumbs');
	var scale = 1;
	var tx = 0;
	var ty = 0;

	function currentKey() { return stack[stack.length - 1]; }

	function applyTransform() {
		var svg = canvas.querySelector('svg');
		if (svg) svg.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
	}

	function fit() {
		var svg = canvas.querySelector('svg');
		if (!svg) return;
		var w = svg.viewBox.baseVal.width || svg.getAttribute('width');
		var h = svg.viewBox.baseVal.height || svg.getAttribute('height');
		var rect = canvas.getBoundingClientRect();
		var pad = 24;
		scale = Math.min((rect.width - pad * 2) / w, (rect.height - pad * 2) / h, 1);
		tx = (rect.width - w * scale) / 2;
		ty = (rect.height - h * scale) / 2;
		applyTransform();
	}

	function render() {
		var key = currentKey();
		var level = levels[key];
		if (!level) return;
		canvas.innerHTML = level.svg;
		// Bind node clicks
		canvas.querySelectorAll('.node').forEach(function (g) {
			if (g.dataset.hasChild === '1') {
				g.addEventListener('click', function () {
					stack.push(g.dataset.nodeId);
					render();
				});
			}
		});
		// Sidebar
		sidebar.innerHTML = '';
		level.domains.forEach(function (d) {
			var card = document.createElement('div');
			card.className = 'domain-card' + (d.hasChildLevel ? ' has-child' : '');
			var name = document.createElement('div'); name.className = 'name'; name.textContent = d.label; card.appendChild(name);
			if (d.description) { var desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = d.description; card.appendChild(desc); }
			var meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = d.fileCount + ' file' + (d.fileCount === 1 ? '' : 's') + (d.hasChildLevel ? ' · drill down →' : ''); card.appendChild(meta);
			if (d.keySymbols && d.keySymbols.length) {
				var sym = document.createElement('div'); sym.className = 'symbols';
				d.keySymbols.slice(0, 6).forEach(function (s) { var c = document.createElement('code'); c.textContent = s; sym.appendChild(c); });
				card.appendChild(sym);
			}
			if (d.hasChildLevel) {
				card.addEventListener('click', function () { stack.push(d.id); render(); });
			}
			sidebar.appendChild(card);
		});
		// Breadcrumbs
		crumbs.innerHTML = '';
		stack.forEach(function (k, i) {
			var lvl = levels[k];
			if (!lvl) return;
			if (i < stack.length - 1) {
				var btn = document.createElement('button');
				btn.textContent = lvl.breadcrumbLabel || (k === '__root__' ? 'Project' : k);
				btn.addEventListener('click', function () { stack = stack.slice(0, i + 1); render(); });
				crumbs.appendChild(btn);
				var sep = document.createElement('span'); sep.className = 'sep'; sep.textContent = '/';
				crumbs.appendChild(sep);
			} else {
				var cur = document.createElement('span'); cur.className = 'current';
				cur.textContent = lvl.breadcrumbLabel || (k === '__root__' ? 'Project' : k);
				crumbs.appendChild(cur);
			}
		});
		fit();
	}

	// Pan
	var dragging = false;
	var startX = 0, startY = 0;
	canvas.addEventListener('pointerdown', function (e) {
		if (e.target.closest('.node')) return;
		dragging = true; startX = e.clientX - tx; startY = e.clientY - ty;
		canvas.setPointerCapture(e.pointerId);
	});
	canvas.addEventListener('pointermove', function (e) {
		if (!dragging) return;
		tx = e.clientX - startX; ty = e.clientY - startY; applyTransform();
	});
	canvas.addEventListener('pointerup', function () { dragging = false; });

	// Zoom (wheel)
	canvas.addEventListener('wheel', function (e) {
		e.preventDefault();
		var rect = canvas.getBoundingClientRect();
		var px = e.clientX - rect.left;
		var py = e.clientY - rect.top;
		var prev = scale;
		var delta = e.deltaY < 0 ? 1.1 : 1 / 1.1;
		scale = Math.max(0.1, Math.min(4, scale * delta));
		tx = px - (px - tx) * (scale / prev);
		ty = py - (py - ty) * (scale / prev);
		applyTransform();
	}, { passive: false });

	document.getElementById('zoom-in').addEventListener('click', function () { scale = Math.min(4, scale * 1.2); applyTransform(); });
	document.getElementById('zoom-out').addEventListener('click', function () { scale = Math.max(0.1, scale / 1.2); applyTransform(); });
	document.getElementById('zoom-fit').addEventListener('click', fit);

	window.addEventListener('resize', fit);
	render();
})();
</script>
</body>
</html>
`;
}

export async function exportAsHtml(input: HtmlExportInput): Promise<void> {
	const html = buildHtmlDocument(input);
	const filename = `${sanitizeFilename(input.projectName) || 'project'}-architecture.html`;
	const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
	await downloadBlob(blob, filename);
}

function sanitizeFilename(name: string): string {
	return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
	if ('showSaveFilePicker' in window) {
		try {
			const handle = await (
				window as unknown as {
					showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
				}
			).showSaveFilePicker({
				suggestedName: filename,
				types: [{ description: 'HTML', accept: { 'text/html': ['.html'] } }]
			});
			const writable = await handle.createWritable();
			await writable.write(blob);
			await writable.close();
			return;
		} catch (err: unknown) {
			if (err instanceof Error && err.name === 'AbortError') return;
		}
	}

	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
