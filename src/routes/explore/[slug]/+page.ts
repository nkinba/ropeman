import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { findCuratedEntry, getCuratedManifest } from '$lib/services/exploreService';

export const prerender = true;

export const entries = () => {
	return getCuratedManifest().entries.map((e) => ({ slug: e.slug }));
};

export const load: PageLoad = async ({ params }) => {
	const manifest = getCuratedManifest();
	const entry = findCuratedEntry(manifest, params.slug);
	if (!entry) {
		throw error(404, `Unknown explore slug: ${params.slug}`);
	}
	return { entry };
};
