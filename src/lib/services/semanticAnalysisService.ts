import { get } from 'svelte/store';
import { authStore } from '$lib/stores/authStore.svelte';
import { semanticStore } from '$lib/stores/semanticStore.svelte';
import { projectStore } from '$lib/stores/projectStore.svelte';
import { settingsStore } from '$lib/stores/settingsStore.svelte';
import { locale } from '$lib/stores/i18nStore';
import { extractSkeleton, formatPayloadPreview } from './skeletonExtractor';
import { extractSubSkeleton } from './skeletonExtractor';
import { sendViaBridge } from './bridgeService';
import type { SemanticLevel, SemanticNode, SemanticEdge } from '$lib/types/semantic';

function getGeminiEndpoint(model: string): string {
	return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

const SEMANTIC_COLORS = [
	'#89b4fa', '#a6e3a1', '#f9e2af', '#f38ba8',
	'#cba6f7', '#94e2d5', '#fab387', '#74c7ec'
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

	semanticStore.isAnalyzing = true;

	try {
		// Always wait for parsing to produce results
		if (projectStore.isLoading || projectStore.astMap.size === 0) {
			await waitForParsing();
		}

		const skeleton = extractSkeleton(
			projectStore.projectName,
			projectStore.fileTree,
			projectStore.astMap
		);
		if (skeleton.files.length === 0) {
			throw new Error('No files to analyze — AST parsing may have failed. Check browser console for details.');
		}

		const prompt = `Analyze the semantic architecture of this project:\n\n${formatPayloadPreview(skeleton)}`;

		const responseText = await callAI(TOP_LEVEL_SYSTEM_PROMPT + getLocaleInstruction(), prompt);
		const level = parseSemanticLevel(responseText, null, 0);

		semanticStore.currentLevel = level;
		semanticStore.cacheLevel('__root__', level);
		semanticStore.drilldownPath = [];
		semanticStore.viewMode = 'semantic';
	} catch (error) {
		console.error('Semantic analysis failed:', error);
	} finally {
		semanticStore.isAnalyzing = false;
	}
}

export async function analyzeDrilldown(parentNode: SemanticNode): Promise<void> {
	if (semanticStore.isAnalyzing) return;

	semanticStore.isAnalyzing = true;

	try {
		const subSkeleton = extractSubSkeleton(
			parentNode.filePaths,
			projectStore.fileTree,
			projectStore.astMap
		);
		if (subSkeleton.files.length === 0) {
			throw new Error('No files in this domain');
		}

		const prompt = `Analyze the internal structure of the "${parentNode.label}" domain:\n\n${formatPayloadPreview(subSkeleton)}`;

		const responseText = await callAI(DRILLDOWN_SYSTEM_PROMPT + getLocaleInstruction(), prompt);
		const level = parseSemanticLevel(responseText, parentNode.id, parentNode.depth + 1);

		semanticStore.currentLevel = level;
		semanticStore.cacheLevel(parentNode.id, level);
	} catch (error) {
		console.error('Drilldown analysis failed:', error);
	} finally {
		semanticStore.isAnalyzing = false;
	}
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
	const track = authStore.activeTrack;

	if (track === 'bridge') {
		return await sendViaBridge(systemPrompt + '\n\n' + userPrompt);
	} else if (track === 'byok') {
		// Anthropic requires bridge due to CORS
		if (settingsStore.aiProvider === 'anthropic') {
			throw new Error('Anthropic API requires Local Bridge mode due to browser CORS restrictions. Please connect via Local Bridge.');
		}
		return await callGemini(systemPrompt, userPrompt);
	} else {
		throw new Error('AI not connected');
	}
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
	const apiKey = settingsStore.geminiApiKey;
	if (!apiKey) throw new Error('No API key');

	const model = settingsStore.aiProvider === 'google' ? settingsStore.aiModel : 'gemini-2.5-flash-lite';
	const endpoint = getGeminiEndpoint(model);

	const response = await fetch(`${endpoint}?key=${apiKey}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			system_instruction: { parts: [{ text: systemPrompt }] },
			contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
			generationConfig: {
				temperature: 0.3,
				maxOutputTokens: 16384,
				response_mime_type: 'application/json',
			},
		}),
	});

	if (!response.ok) {
		throw new Error(`Gemini API error: HTTP ${response.status}`);
	}

	const data = await response.json();
	return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function repairJSON(text: string): string {
	// Remove trailing commas before ] or }
	let fixed = text.replace(/,\s*([\]}])/g, '$1');

	// Try parsing as-is first
	try {
		JSON.parse(fixed);
		return fixed;
	} catch {
		// If truncated, try to close open brackets/braces
	}

	// Count unclosed brackets and braces
	let braces = 0;
	let brackets = 0;
	let inString = false;
	let escape = false;

	for (const ch of fixed) {
		if (escape) { escape = false; continue; }
		if (ch === '\\') { escape = true; continue; }
		if (ch === '"') { inString = !inString; continue; }
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
		braces = 0; brackets = 0; inString = false; escape = false;
		for (const ch of fixed) {
			if (escape) { escape = false; continue; }
			if (ch === '\\') { escape = true; continue; }
			if (ch === '"') { inString = !inString; continue; }
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
	const raw = JSON.parse(repaired) as {
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

	if (!raw.roles || !Array.isArray(raw.roles)) {
		throw new Error('Invalid response format: missing roles');
	}

	const roleIds = new Set(raw.roles.map(r => r.id));

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
		.filter(e => roleIds.has(e.source) && roleIds.has(e.target))
		.map((e, i) => ({
			id: `sem-edge:${i}:${e.source}->${e.target}`,
			source: `sem:${e.source}`,
			target: `sem:${e.target}`,
			label: e.label,
			type: validateEdgeType(e.type)
		}));

	const parentLabel = parentId
		? nodes[0]?.label ?? 'Unknown'
		: 'Project';

	return {
		parentId,
		nodes,
		edges,
		breadcrumbLabel: parentLabel
	};
}

function validateEdgeType(type: string): SemanticEdge['type'] {
	const valid: SemanticEdge['type'][] = ['depends_on', 'calls', 'extends', 'uses'];
	return valid.includes(type as SemanticEdge['type'])
		? (type as SemanticEdge['type'])
		: 'uses';
}
