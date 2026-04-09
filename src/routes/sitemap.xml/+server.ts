import { docsModules, getAllEntries } from '$lib/services/docsService';

export const prerender = true;

const SITE = 'https://ropeman.dev';

export function GET() {
	const docsEntries = getAllEntries(docsModules);
	const today = new Date().toISOString().split('T')[0];

	const urls: Array<{ loc: string; priority: string }> = [
		{ loc: `${SITE}/`, priority: '1.0' },
		{ loc: `${SITE}/docs`, priority: '0.9' }
	];

	for (const { lang, slug } of docsEntries) {
		urls.push({
			loc: `${SITE}/docs/${lang}/${slug}`,
			priority: '0.8'
		});
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(u) => `	<url>
		<loc>${u.loc}</loc>
		<lastmod>${today}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>${u.priority}</priority>
	</url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
