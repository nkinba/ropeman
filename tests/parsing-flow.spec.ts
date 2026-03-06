import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DIR = '/tmp/ropeman-test-fixture';

// Ensure test fixture exists before tests run
test.beforeAll(() => {
	fs.mkdirSync(TEST_DIR, { recursive: true });

	fs.writeFileSync(
		path.join(TEST_DIR, 'hello.py'),
		`def greet(name: str) -> str:
    """Return a greeting message."""
    return f"Hello, {name}!"

class Calculator:
    def __init__(self):
        self.result = 0

    def add(self, a: int, b: int) -> int:
        self.result = a + b
        return self.result
`
	);

	fs.writeFileSync(
		path.join(TEST_DIR, 'utils.js'),
		`function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function isEmpty(value) {
    return value === null || value === undefined || value === '';
}

export { formatDate, isEmpty };
`
	);
});

test.describe('Parsing Flow (testDir mode)', () => {
	test('should load test project via ?testDir= parameter', async ({ page }) => {
		// Navigate with testDir query parameter — triggers testLoader
		await page.goto(`/?testDir=${encodeURIComponent(TEST_DIR)}`);

		// Wait for loading overlay to appear (parsing started)
		const loadingOverlay = page.locator('.loading-overlay');
		// It may appear briefly or may have already passed — use a short timeout
		await loadingOverlay.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {
			// Loading may have completed very quickly
		});

		// Wait for loading overlay to disappear (parsing completed)
		await expect(loadingOverlay).not.toBeVisible({ timeout: 60_000 });

		// After parsing, the main layout should be visible (project loaded)
		const mainLayout = page.locator('.main-layout');
		await expect(mainLayout).toBeVisible({ timeout: 10_000 });

		// File explorer should be visible
		const fileExplorer = page.locator('.file-explorer');
		await expect(fileExplorer).toBeVisible();

		// Explorer should contain the project name in the tree
		const explorerTree = page.locator('.explorer-tree');
		await expect(explorerTree).toBeVisible();
	});

	test('should display file tree with test fixture files', async ({ page }) => {
		await page.goto(`/?testDir=${encodeURIComponent(TEST_DIR)}`);

		// Wait for project to load
		await expect(page.locator('.main-layout')).toBeVisible({ timeout: 60_000 });

		// The root directory node should be visible
		const rootDir = page.locator('.tree-item.dir-item');
		await expect(rootDir).toBeVisible();

		// Click to expand root directory
		await rootDir.click();

		// File items should appear after expanding
		const fileItems = page.locator('.tree-item.file-item');
		await expect(fileItems.first()).toBeVisible({ timeout: 5_000 });

		// Should have at least 2 files (hello.py and utils.js)
		const count = await fileItems.count();
		expect(count).toBeGreaterThanOrEqual(2);
	});

	test('should show CodeViewer with syntax-highlighted code when file is clicked', async ({
		page
	}) => {
		await page.goto(`/?testDir=${encodeURIComponent(TEST_DIR)}`);

		// Wait for project to load
		await expect(page.locator('.main-layout')).toBeVisible({ timeout: 60_000 });

		// Expand root directory
		const rootDir = page.locator('.tree-item.dir-item');
		await rootDir.click();

		// Click on hello.py file
		const pyFile = page.locator('.tree-item.file-item', { hasText: 'hello.py' });
		await expect(pyFile).toBeVisible({ timeout: 5_000 });
		await pyFile.click();

		// CodeViewer should show the file
		const codeViewer = page.locator('.code-viewer');
		await expect(codeViewer).toBeVisible();

		// File path should be displayed in the header
		const codeFilepath = page.locator('.code-filepath');
		await expect(codeFilepath).toBeVisible({ timeout: 10_000 });
		await expect(codeFilepath).toContainText('hello.py');

		// Language badge should show python
		const langBadge = page.locator('.code-lang-badge');
		await expect(langBadge).toBeVisible();
		await expect(langBadge).toHaveText('python');

		// Code lines should be rendered
		const codeLines = page.locator('.code-line');
		const lineCount = await codeLines.count();
		expect(lineCount).toBeGreaterThan(0);

		// Line numbers should be present
		const lineNumbers = page.locator('.line-number');
		await expect(lineNumbers.first()).toBeVisible();

		// Syntax highlighting should produce token spans (Prism adds <span> elements)
		const highlightedContent = page.locator('.line-text span');
		const spanCount = await highlightedContent.count();
		expect(spanCount).toBeGreaterThan(0);
	});

	test('should show symbols sidebar for parsed file', async ({ page }) => {
		await page.goto(`/?testDir=${encodeURIComponent(TEST_DIR)}`);

		// Wait for project to load
		await expect(page.locator('.main-layout')).toBeVisible({ timeout: 60_000 });

		// Expand root directory and click hello.py
		const rootDir = page.locator('.tree-item.dir-item');
		await rootDir.click();

		const pyFile = page.locator('.tree-item.file-item', { hasText: 'hello.py' });
		await expect(pyFile).toBeVisible({ timeout: 5_000 });
		await pyFile.click();

		// Wait for code to load
		await expect(page.locator('.code-filepath')).toBeVisible({ timeout: 10_000 });

		// Symbol sidebar should be visible with parsed symbols
		const symbolSidebar = page.locator('.symbol-sidebar');
		await expect(symbolSidebar).toBeVisible({ timeout: 5_000 });

		// Should have symbol items (greet function and Calculator class at minimum)
		const symbolItems = page.locator('.symbol-item');
		const symbolCount = await symbolItems.count();
		expect(symbolCount).toBeGreaterThanOrEqual(2);
	});

	test('should switch between files in CodeViewer', async ({ page }) => {
		await page.goto(`/?testDir=${encodeURIComponent(TEST_DIR)}`);

		// Wait for project to load
		await expect(page.locator('.main-layout')).toBeVisible({ timeout: 60_000 });

		// Expand root directory
		const rootDir = page.locator('.tree-item.dir-item');
		await rootDir.click();

		// Click hello.py first
		const pyFile = page.locator('.tree-item.file-item', { hasText: 'hello.py' });
		await expect(pyFile).toBeVisible({ timeout: 5_000 });
		await pyFile.click();

		// Verify hello.py is shown
		await expect(page.locator('.code-filepath')).toContainText('hello.py', { timeout: 10_000 });

		// Now click utils.js
		const jsFile = page.locator('.tree-item.file-item', { hasText: 'utils.js' });
		await jsFile.click();

		// CodeViewer should now show utils.js
		await expect(page.locator('.code-filepath')).toContainText('utils.js', { timeout: 10_000 });

		// Language badge should update to javascript
		const langBadge = page.locator('.code-lang-badge');
		await expect(langBadge).toHaveText('javascript');
	});
});
