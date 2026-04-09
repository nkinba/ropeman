import type { Component } from 'svelte';

export type DocLocale = 'ko' | 'en';

export interface DocFrontmatter {
	title: string;
	description: string;
	category: string;
	order: number;
}

export interface DocModule {
	default: Component;
	metadata: DocFrontmatter;
}

export interface DocEntry {
	slug: string;
	locale: DocLocale;
	frontmatter: DocFrontmatter;
	component: Component;
}

export interface SidebarCategory {
	id: string;
	label: string;
	items: Array<{ slug: string; title: string }>;
}

/**
 * Parse a module path like "/src/content/docs/ko/getting-started.md"
 * into { locale: "ko", slug: "getting-started" }. Returns null if not a docs path.
 */
export function parseDocPath(path: string): { locale: DocLocale; slug: string } | null {
	const match = path.match(/\/src\/content\/docs\/(ko|en)\/(.+)\.md$/);
	if (!match) return null;
	return { locale: match[1] as DocLocale, slug: match[2] };
}

/** Return all docs for a given locale, sorted by frontmatter.order. */
export function getDocs(modules: Record<string, DocModule>, locale: DocLocale): DocEntry[] {
	const entries: DocEntry[] = [];
	for (const [path, mod] of Object.entries(modules)) {
		const parsed = parseDocPath(path);
		if (!parsed || parsed.locale !== locale) continue;
		entries.push({
			slug: parsed.slug,
			locale: parsed.locale,
			frontmatter: mod.metadata,
			component: mod.default
		});
	}
	return entries.sort((a, b) => a.frontmatter.order - b.frontmatter.order);
}

/** Look up a single doc by locale + slug. */
export function getDocBySlug(
	modules: Record<string, DocModule>,
	locale: DocLocale,
	slug: string
): DocEntry | null {
	const path = `/src/content/docs/${locale}/${slug}.md`;
	const mod = modules[path];
	if (!mod) return null;
	return {
		slug,
		locale,
		frontmatter: mod.metadata,
		component: mod.default
	};
}

/**
 * Return all valid {lang, slug} combinations — used by SvelteKit prerender's
 * `entries()` export to discover routes at build time.
 */
export function getAllEntries(
	modules: Record<string, DocModule>
): Array<{ lang: DocLocale; slug: string }> {
	const entries: Array<{ lang: DocLocale; slug: string }> = [];
	for (const path of Object.keys(modules)) {
		const parsed = parseDocPath(path);
		if (parsed) entries.push({ lang: parsed.locale, slug: parsed.slug });
	}
	return entries;
}

/**
 * Build a sidebar structure for a locale: items grouped by frontmatter.category,
 * ordered by frontmatter.order within each group. Category ordering is determined
 * by the minimum order of items inside each category.
 */
export function buildSidebar(
	modules: Record<string, DocModule>,
	locale: DocLocale,
	categoryLabels: Record<string, string>
): SidebarCategory[] {
	const docs = getDocs(modules, locale);
	const grouped = new Map<string, DocEntry[]>();
	for (const doc of docs) {
		const cat = doc.frontmatter.category;
		if (!grouped.has(cat)) grouped.set(cat, []);
		grouped.get(cat)!.push(doc);
	}
	const categories: SidebarCategory[] = [];
	for (const [id, items] of grouped.entries()) {
		categories.push({
			id,
			label: categoryLabels[id] ?? id,
			items: items.map((d) => ({ slug: d.slug, title: d.frontmatter.title }))
		});
	}
	categories.sort((a, b) => {
		const aMin = Math.min(
			...docs.filter((d) => d.frontmatter.category === a.id).map((d) => d.frontmatter.order)
		);
		const bMin = Math.min(
			...docs.filter((d) => d.frontmatter.category === b.id).map((d) => d.frontmatter.order)
		);
		return aMin - bMin;
	});
	return categories;
}

// Eagerly load all docs MD modules at the module entrypoint — mdsvex compiles
// them to Svelte components at build time. Exported as a singleton so pages
// can import once and pass to the pure helpers above.
export const docsModules = import.meta.glob<DocModule>('/src/content/docs/**/*.md', {
	eager: true
});
