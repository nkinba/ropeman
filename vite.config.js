import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { devFsPlugin } from './scripts/vite-dev-fs-plugin.js';

export default defineConfig({
	plugins: [devFsPlugin(), sveltekit()],
	worker: {
		format: 'es'
	}
});
