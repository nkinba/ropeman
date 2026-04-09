import { error } from '@sveltejs/kit';
import {
	docsModules,
	getAllEntries,
	getDocBySlug,
	type DocLocale
} from '$lib/services/docsService';
import type { PageLoad } from './$types';

// Tell SvelteKit which dynamic routes to prerender at build time.
export const entries = () => getAllEntries(docsModules).map(({ lang, slug }) => ({ lang, slug }));

export const prerender = true;

export const load: PageLoad = async ({ params }) => {
	const lang = params.lang as DocLocale;
	if (lang !== 'ko' && lang !== 'en') {
		throw error(404, 'Unknown locale');
	}
	const entry = getDocBySlug(docsModules, lang, params.slug);
	if (!entry) {
		throw error(404, `Document not found: ${params.slug}`);
	}
	return {
		lang,
		slug: params.slug,
		frontmatter: entry.frontmatter,
		component: entry.component
	};
};
