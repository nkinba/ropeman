/**
 * exploreUploader — dev-only console helper for uploading semantic snapshots
 * to the explore gallery KV.
 *
 * Usage (from browser devtools console, after analyzing a repo locally):
 *
 *   __uploadExplore('react')
 *     → opens window.prompt() for the admin token (keeps it out of
 *       command history and source logs)
 *
 *   __uploadExplore('react', 'EXPLICIT_TOKEN')
 *     → explicit token passed in (useful when chaining from a secret manager
 *       CLI via clipboard, e.g. `await navigator.clipboard.readText()`)
 *
 *   __uploadExplore('react', undefined, { owner: 'facebook', repo: 'react' })
 *     → override owner/repo/projectName if they differ from projectStore
 *
 * Requires:
 *   - explore worker deployed (npm run deploy:edge:explore)
 *   - EXPLORE_ADMIN_TOKEN secret set via wrangler
 *   - The current page has run a full analysis (semanticStore.cache populated)
 *
 * This module is imported exclusively from +layout.svelte under an
 * `import.meta.env.DEV` gate, so it never ships to production bundles.
 */
import { semanticStore } from '$lib/stores/semanticStore.svelte';
import { projectStore } from '$lib/stores/projectStore.svelte';
import { uploadExploreSnapshot, type ExploreSnapshot } from '$lib/services/exploreService';
import type { SemanticLevel } from '$lib/types/semantic';

interface UploadOptions {
	owner?: string;
	repo?: string;
	projectName?: string;
}

/** Prompt the user for the admin token. Returns empty string on cancel. */
function promptForToken(): string {
	if (typeof window === 'undefined') return '';
	const entered = window.prompt('Explore admin token (Bearer):');
	return entered?.trim() ?? '';
}

async function runUpload(slug: string, token?: string, opts: UploadOptions = {}): Promise<void> {
	if (!slug || typeof slug !== 'string') {
		console.error('[ExploreUploader] slug is required as the first argument.');
		return;
	}

	// Resolve token: explicit arg > window.prompt() fallback.
	// Keeping the token out of the positional arg avoids leaving it in the
	// devtools command history where screen-sharing or accidental copy-paste
	// could expose it.
	const resolvedToken = token && token.trim() ? token.trim() : promptForToken();
	if (!resolvedToken) {
		console.error('[ExploreUploader] upload cancelled (no token provided).');
		return;
	}

	const cache = semanticStore.cache;
	if (cache.size === 0) {
		console.error(
			'[ExploreUploader] semantic cache is empty — load a repo and run analysis first.'
		);
		return;
	}

	const semanticLevels: Record<string, SemanticLevel> = {};
	for (const [key, level] of cache) {
		semanticLevels[key] = level;
	}

	const githubInfo = projectStore.githubInfo;
	const snapshot: ExploreSnapshot = {
		projectName: opts.projectName ?? projectStore.projectName ?? slug,
		owner: opts.owner ?? githubInfo?.owner,
		repo: opts.repo ?? githubInfo?.repo,
		analyzedAt: new Date().toISOString().slice(0, 10),
		semanticLevels
	};

	console.log(
		`[ExploreUploader] Uploading '${slug}' (${Object.keys(semanticLevels).length} levels)...`
	);

	const result = await uploadExploreSnapshot(slug, snapshot, resolvedToken);
	if (result.ok) {
		console.log(`[ExploreUploader] ✔ Uploaded '${slug}' successfully.`);
		console.log(`[ExploreUploader]   View at https://ropeman.dev/explore/${slug}`);
	} else {
		console.error(`[ExploreUploader] ✗ Upload failed:`, result.message);
	}
}

if (typeof window !== 'undefined') {
	(window as unknown as { __uploadExplore: typeof runUpload }).__uploadExplore = runUpload;
	console.log(
		'[ExploreUploader] __uploadExplore(slug, token?, { owner?, repo?, projectName? }) — omit token to use window.prompt().'
	);
}
