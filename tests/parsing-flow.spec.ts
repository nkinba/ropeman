import { test, expect } from '@playwright/test';

// CI3-3: Folder drop → parsing → diagram flow
// The ?testDir= feature requires the Vite dev server (not preview) and a local directory.
// In a CI/preview environment, this test is skipped.
// To run locally: use `npx playwright test --config playwright.dev.config.ts` (if created)
// with the dev server running.

test.describe('Parsing Flow (testDir mode)', () => {
	// TODO: This test requires a Vite dev server with the devFsPlugin active
	// and a valid local test directory. Skip in CI / preview mode.
	test.skip('should load test project via ?testDir= parameter', async ({ page }) => {
		// This would work against a dev server with a test fixture directory:
		// await page.goto('/?testDir=/path/to/test/project');
		// await expect(page.locator('.main-layout')).toBeVisible({ timeout: 30_000 });
		// await expect(page.locator('.header-project')).toBeVisible();
	});
});
