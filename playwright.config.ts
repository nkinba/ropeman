import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',

	use: {
		baseURL: 'http://localhost:5173',
		screenshot: 'only-on-failure',
		trace: 'on-first-retry'
	},

	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' }
		}
	],

	webServer: {
		command: 'npm run dev -- --port 5173',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 60_000
	}
});
