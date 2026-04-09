// Override root layout settings for the /docs subtree.
// Docs pages are pure content — we want real SSR so that prerender generates
// fully-rendered static HTML for search-engine indexing.
export const ssr = true;
export const prerender = true;
