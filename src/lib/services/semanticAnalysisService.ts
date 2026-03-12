import { get } from 'svelte/store';
import { authStore } from '$lib/stores/authStore.svelte';
import { semanticStore } from '$lib/stores/semanticStore.svelte';
import { projectStore } from '$lib/stores/projectStore.svelte';
import { settingsStore } from '$lib/stores/settingsStore.svelte';
import { locale, getProgressMessage } from '$lib/stores/i18nStore';
import { extractSkeleton, formatPayloadPreview } from './skeletonExtractor';
import { extractSubSkeleton } from './skeletonExtractor';
import { sendViaBridge } from './bridgeService';
import type { SemanticLevel, SemanticNode, SemanticEdge } from '$lib/types/semantic';

function getGeminiEndpoint(model: string): string {
	return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

const SEMANTIC_COLORS = [
	'#89b4fa',
	'#a6e3a1',
	'#f9e2af',
	'#f38ba8',
	'#cba6f7',
	'#94e2d5',
	'#fab387',
	'#74c7ec'
];

const TOP_LEVEL_SYSTEM_PROMPT = `You are a code architecture analyzer. Given a project skeleton, identify the high-level semantic roles/domains in the codebase.

Return ONLY valid JSON with this format:
{
  "roles": [
    {
      "id": "unique-slug",
      "label": "Human-Readable Name",
      "description": "1-2 sentence description of this domain's responsibility",
      "filePaths": ["path/to/file1.ts", "path/to/file2.ts"],
      "keySymbols": ["functionName", "ClassName"]
    }
  ],
  "edges": [
    {
      "source": "role-id-1",
      "target": "role-id-2",
      "label": "short relationship description",
      "type": "depends_on"
    }
  ]
}

Rules:
- Create 3-7 roles based on semantic meaning (not file structure)
- Role names should describe purpose (e.g., "Authentication System", "Data Layer", "UI Components")
- filePaths should use the exact paths from the skeleton
- keySymbols should list 2-5 most important functions/classes
- Edge types: depends_on, calls, extends, uses
- Every file should belong to exactly one role
- Focus on architecture, not implementation details`;

const DRILLDOWN_SYSTEM_PROMPT = `You are a code architecture analyzer. Given a subset of files belonging to a specific domain, identify the internal sub-roles within this domain.

Return ONLY valid JSON with this format:
{
  "roles": [
    {
      "id": "unique-slug",
      "label": "Human-Readable Name",
      "description": "1-2 sentence description",
      "filePaths": ["path/to/file1.ts"],
      "keySymbols": ["functionName", "ClassName"]
    }
  ],
  "edges": [
    {
      "source": "role-id-1",
      "target": "role-id-2",
      "label": "relationship",
      "type": "depends_on"
    }
  ]
}

Rules:
- Create 2-5 sub-roles within this domain
- Be more granular than top-level analysis
- Focus on internal structure and responsibilities
- Every provided file should belong to exactly one sub-role
- Edge types: depends_on, calls, extends, uses`;

function getLocaleInstruction(): string {
	const lang = get(locale);
	const langName = lang === 'ko' ? 'Korean' : 'English';
	return `\n\nIMPORTANT: All labels and descriptions in your response MUST be written in ${langName}.`;
}

function waitForParsing(timeoutMs = 60000): Promise<void> {
	return new Promise((resolve, reject) => {
		const start = Date.now();
		const check = () => {
			if (!projectStore.isLoading && projectStore.astMap.size > 0) {
				resolve();
			} else if (!projectStore.isLoading && !projectStore.fileTree) {
				reject(new Error('No project loaded'));
			} else if (Date.now() - start > timeoutMs) {
				// Resolve anyway so caller can check astMap and give a better error
				resolve();
			} else {
				setTimeout(check, 200);
			}
		};
		check();
	});
}

export async function analyzeTopLevel(): Promise<void> {
	if (semanticStore.isAnalyzing) return;

	const nodeId = '__top_level__';
	const abortController = semanticStore.addAnalysisRequest(nodeId, 'Top Level');
	semanticStore.analysisError = null;

	try {
		// Always wait for parsing to produce results
		if (projectStore.isLoading || projectStore.astMap.size === 0) {
			semanticStore.updateAnalysisProgress(nodeId, getProgressMessage('waitingParse'));
			await waitForParsing();
		}

		throwIfAborted(abortController);

		semanticStore.updateAnalysisProgress(nodeId, getProgressMessage('extractingSkeleton'));
		const skeleton = extractSkeleton(
			projectStore.projectName,
			projectStore.fileTree,
			projectStore.astMap
		);
		if (skeleton.files.length === 0) {
			throw new Error(
				'No files to analyze — AST parsing may have failed. Check browser console for details.'
			);
		}

		const prompt = `Analyze the semantic architecture of this project:\n\n${formatPayloadPreview(skeleton)}`;

		throwIfAborted(abortController);
		semanticStore.updateAnalysisProgress(nodeId, getProgressMessage('requestingAI'));
		const responseText = await callAI(
			TOP_LEVEL_SYSTEM_PROMPT + getLocaleInstruction(),
			prompt,
			abortController.signal
		);

		throwIfAborted(abortController);
		semanticStore.updateAnalysisProgress(nodeId, getProgressMessage('generatingDiagram'));
		const level = parseSemanticLevel(responseText, null, 0);

		semanticStore.currentLevel = level;
		semanticStore.cacheLevel('__root__', level);
		semanticStore.drilldownPath = [];
		semanticStore.viewMode = 'semantic';
	} catch (error) {
		if (isAbortError(error)) return;
		console.error('Semantic analysis failed:', error);
		semanticStore.analysisError = error instanceof Error ? error.message : String(error);
	} finally {
		semanticStore.removeAnalysisRequest(nodeId);
	}
}

export async function analyzeDrilldown(parentNode: SemanticNode): Promise<void> {
	// Allow concurrent requests for different nodes; block duplicate for same node
	if (semanticStore.isNodeAnalyzing(parentNode.id)) return;

	const abortController = semanticStore.addAnalysisRequest(parentNode.id, parentNode.label);
	semanticStore.analysisError = null;

	// Snapshot current drilldownPath to detect stale results
	const pathSnapshot = [...semanticStore.drilldownPath];

	try {
		semanticStore.updateAnalysisProgress(parentNode.id, getProgressMessage('extractingSkeleton'));
		const subSkeleton = extractSubSkeleton(
			parentNode.filePaths,
			projectStore.fileTree,
			projectStore.astMap
		);
		if (subSkeleton.files.length === 0) {
			throw new Error('No files in this domain');
		}

		const prompt = `Analyze the internal structure of the "${parentNode.label}" domain:\n\n${formatPayloadPreview(subSkeleton)}`;

		throwIfAborted(abortController);
		semanticStore.updateAnalysisProgress(parentNode.id, getProgressMessage('requestingAI'));
		const responseText = await callAI(
			DRILLDOWN_SYSTEM_PROMPT + getLocaleInstruction(),
			prompt,
			abortController.signal
		);

		throwIfAborted(abortController);
		semanticStore.updateAnalysisProgress(parentNode.id, getProgressMessage('generatingDiagram'));
		const level = parseSemanticLevel(responseText, parentNode.id, parentNode.depth + 1);

		// Always cache the result
		semanticStore.cacheLevel(parentNode.id, level);

		// Stale check: only apply to diagram if user hasn't navigated away
		const currentPath = semanticStore.drilldownPath;
		const isStale =
			pathSnapshot.length !== currentPath.length ||
			pathSnapshot.some((p, i) => p.nodeId !== currentPath[i]?.nodeId);

		if (!isStale) {
			semanticStore.currentLevel = level;
		}
	} catch (error) {
		if (isAbortError(error)) return;
		console.error('Drilldown analysis failed:', error);
		semanticStore.analysisError = error instanceof Error ? error.message : String(error);
	} finally {
		semanticStore.removeAnalysisRequest(parentNode.id);
	}
}

function throwIfAborted(controller: AbortController) {
	if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
}

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError';
}

async function callAI(
	systemPrompt: string,
	userPrompt: string,
	signal?: AbortSignal
): Promise<string> {
	const track = authStore.activeTrack;

	if (track === 'bridge') {
		return await sendViaBridge(systemPrompt + '\n\n' + userPrompt);
	} else if (track === 'byok') {
		// Anthropic requires bridge due to CORS
		if (settingsStore.aiProvider === 'anthropic') {
			throw new Error(
				'Anthropic API requires Local Bridge mode due to browser CORS restrictions. Please connect via Local Bridge.'
			);
		}
		return await callGemini(systemPrompt, userPrompt, signal);
	} else {
		throw new Error('AI not connected');
	}
}

async function callGemini(
	systemPrompt: string,
	userPrompt: string,
	signal?: AbortSignal
): Promise<string> {
	const apiKey = settingsStore.geminiApiKey;
	if (!apiKey) throw new Error('No API key');

	const model =
		settingsStore.aiProvider === 'google' ? settingsStore.aiModel : 'gemini-2.5-flash-lite';
	const endpoint = getGeminiEndpoint(model);

	const response = await fetch(`${endpoint}?key=${apiKey}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		signal,
		body: JSON.stringify({
			system_instruction: { parts: [{ text: systemPrompt }] },
			contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
			generationConfig: {
				temperature: 0.3,
				maxOutputTokens: 16384,
				response_mime_type: 'application/json'
			}
		})
	});

	if (!response.ok) {
		throw new Error(`Gemini API error: HTTP ${response.status}`);
	}

	const data = await response.json();
	return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function repairJSON(text: string): string {
	// Escape control characters only inside JSON string values
	let fixed = escapeControlCharsInStrings(text);

	// Remove trailing commas before ] or }
	fixed = fixed.replace(/,\s*([\]}])/g, '$1');

	// Try parsing as-is first
	try {
		JSON.parse(fixed);
		return fixed;
	} catch {
		// Continue with repair
	}

	// Attempt truncation repair: close unclosed brackets/braces
	const repaired = closeBrackets(fixed);
	try {
		JSON.parse(repaired);
		return repaired;
	} catch (e) {
		// If still failing, try to extract valid portion up to the error position
		const posMatch = String(e).match(/position\s+(\d+)/);
		if (posMatch) {
			const errorPos = parseInt(posMatch[1], 10);
			// Cut just before the error and try to close brackets
			const truncated = closeBrackets(fixed.substring(0, errorPos));
			try {
				JSON.parse(truncated);
				return truncated;
			} catch {
				// Last resort: cut further back to last complete array element
				const lastGoodEnd = fixed.lastIndexOf('},', errorPos);
				if (lastGoodEnd > 0) {
					const aggressiveCut = closeBrackets(fixed.substring(0, lastGoodEnd + 1));
					try {
						JSON.parse(aggressiveCut);
						return aggressiveCut;
					} catch {
						/* fall through */
					}
				}
			}
		}
	}

	// Return best effort
	return repaired;
}

/** Escape unescaped control characters only inside JSON string values */
function escapeControlCharsInStrings(text: string): string {
	let result = '';
	let inString = false;
	let escape = false;

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (escape) {
			escape = false;
			result += ch;
			continue;
		}
		if (ch === '\\' && inString) {
			escape = true;
			result += ch;
			continue;
		}
		if (ch === '"') {
			inString = !inString;
			result += ch;
			continue;
		}
		if (inString) {
			const code = ch.charCodeAt(0);
			if (code < 0x20) {
				// Escape control characters inside strings
				if (ch === '\n') {
					result += '\\n';
					continue;
				}
				if (ch === '\r') {
					result += '\\r';
					continue;
				}
				if (ch === '\t') {
					result += '\\t';
					continue;
				}
				// Skip other control chars
				continue;
			}
		}
		result += ch;
	}

	return result;
}

function closeBrackets(text: string): string {
	let fixed = text;

	// Count unclosed brackets and braces
	let braces = 0;
	let brackets = 0;
	let inString = false;
	let escape = false;

	for (const ch of fixed) {
		if (escape) {
			escape = false;
			continue;
		}
		if (ch === '\\') {
			escape = true;
			continue;
		}
		if (ch === '"') {
			inString = !inString;
			continue;
		}
		if (inString) continue;
		if (ch === '{') braces++;
		else if (ch === '}') braces--;
		else if (ch === '[') brackets++;
		else if (ch === ']') brackets--;
	}

	// If we're inside a string, close it
	if (inString) fixed += '"';

	// Remove any trailing partial value (e.g., truncated string or number)
	// Trim to last complete element
	const lastValid = Math.max(
		fixed.lastIndexOf(','),
		fixed.lastIndexOf('}'),
		fixed.lastIndexOf(']'),
		fixed.lastIndexOf('"')
	);
	if (lastValid > 0 && (braces > 0 || brackets > 0)) {
		fixed = fixed.substring(0, lastValid + 1);
		// Remove trailing comma if we just truncated
		fixed = fixed.replace(/,\s*$/, '');
		// Recount
		braces = 0;
		brackets = 0;
		inString = false;
		escape = false;
		for (const ch of fixed) {
			if (escape) {
				escape = false;
				continue;
			}
			if (ch === '\\') {
				escape = true;
				continue;
			}
			if (ch === '"') {
				inString = !inString;
				continue;
			}
			if (inString) continue;
			if (ch === '{') braces++;
			else if (ch === '}') braces--;
			else if (ch === '[') brackets++;
			else if (ch === ']') brackets--;
		}
	}

	// Close unclosed brackets/braces
	for (let i = 0; i < brackets; i++) fixed += ']';
	for (let i = 0; i < braces; i++) fixed += '}';

	return fixed;
}

function parseSemanticLevel(text: string, parentId: string | null, depth: number): SemanticLevel {
	// Extract JSON from response (may be wrapped in markdown code block)
	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) throw new Error('No JSON found in response');

	const repaired = repairJSON(jsonMatch[0]);
	let raw: {
		roles: Array<{
			id: string;
			label: string;
			description: string;
			filePaths: string[];
			keySymbols: string[];
		}>;
		edges?: Array<{
			source: string;
			target: string;
			label?: string;
			type: string;
		}>;
	};

	try {
		raw = JSON.parse(repaired);
	} catch (e) {
		console.error(
			'[parseSemanticLevel] JSON parse failed after repair. First 500 chars:',
			repaired.substring(0, 500)
		);
		throw e;
	}

	// Accept alternative key names from AI response
	const roles =
		raw.roles ||
		(raw as any).nodes ||
		(raw as any).groups ||
		(raw as any).components ||
		(raw as any).modules;

	if (!roles || !Array.isArray(roles)) {
		console.error('[parseSemanticLevel] Missing roles. Keys found:', Object.keys(raw));
		throw new Error(
			`Invalid response format: missing roles (found keys: ${Object.keys(raw).join(', ')})`
		);
	}

	raw.roles = roles;

	const roleIds = new Set(raw.roles.map((r) => r.id));

	const nodes: SemanticNode[] = raw.roles.map((role, i) => ({
		id: `sem:${role.id}`,
		label: role.label,
		description: role.description || '',
		color: SEMANTIC_COLORS[i % SEMANTIC_COLORS.length],
		filePaths: role.filePaths || [],
		keySymbols: role.keySymbols || [],
		parentId,
		depth,
		fileCount: (role.filePaths || []).length
	}));

	const edges: SemanticEdge[] = (raw.edges || [])
		.filter((e) => roleIds.has(e.source) && roleIds.has(e.target))
		.map((e, i) => ({
			id: `sem-edge:${i}:${e.source}->${e.target}`,
			source: `sem:${e.source}`,
			target: `sem:${e.target}`,
			label: e.label,
			type: validateEdgeType(e.type)
		}));

	const parentLabel = parentId ? (nodes[0]?.label ?? 'Unknown') : 'Project';

	return {
		parentId,
		nodes,
		edges,
		breadcrumbLabel: parentLabel
	};
}

function validateEdgeType(type: string): SemanticEdge['type'] {
	const valid: SemanticEdge['type'][] = ['depends_on', 'calls', 'extends', 'uses'];
	return valid.includes(type as SemanticEdge['type']) ? (type as SemanticEdge['type']) : 'uses';
}
