import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Redirect pages.dev to custom domain
	const host = event.url.hostname;
	if (host.endsWith('.pages.dev')) {
		const target = new URL(event.url);
		target.hostname = 'ropeman.dev';
		target.port = '';
		redirect(301, target.toString());
	}

	return resolve(event);
};
