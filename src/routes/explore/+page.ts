import type { PageLoad } from './$types';
import { getCuratedManifest } from '$lib/services/exploreService';

export const prerender = true;

export const load: PageLoad = async () => {
	return { manifest: getCuratedManifest() };
};
