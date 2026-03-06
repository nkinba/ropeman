import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, 'screenshots');
const BASE = 'http://localhost:5173';

function collectFiles(dir, base = '') {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'build', '.svelte-kit', 'tests', 'static'].includes(entry.name)) continue;
      result.push(...collectFiles(join(dir, entry.name), rel));
    } else if (/\.(ts|js|svelte)$/.test(entry.name)) {
      result.push({ path: rel, content: fs.readFileSync(join(dir, entry.name), 'utf-8') });
    }
  }
  return result;
}

let passed = 0, failed = 0;
function assert(label, condition) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.log(`  FAIL: ${label}`); failed++; }
}

async function run() {
  const projectRoot = join(__dirname, '..');
  const srcFiles = collectFiles(join(projectRoot, 'src'));
  console.log(`Source files collected: ${srcFiles.length}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Inject mock showDirectoryPicker BEFORE page loads
  await context.addInitScript((files) => {
    const contentMap = new Map();
    function buildTree(files) {
      const root = { name: 'ropeman', kind: 'directory', children: [] };
      const dirs = new Map();
      dirs.set('', root);

      for (const f of files) {
        const parts = f.path.split('/');
        for (let i = 0; i < parts.length - 1; i++) {
          const dirPath = parts.slice(0, i + 1).join('/');
          if (!dirs.has(dirPath)) {
            const dirNode = { name: parts[i], kind: 'directory', children: [] };
            dirs.set(dirPath, dirNode);
            const parentPath = parts.slice(0, i).join('/');
            dirs.get(parentPath).children.push(dirNode);
          }
        }
        const fileName = parts[parts.length - 1];
        const parentPath = parts.slice(0, -1).join('/');
        const fileNode = { name: fileName, kind: 'file', path: f.path };
        dirs.get(parentPath).children.push(fileNode);
        contentMap.set(f.path, f.content);
      }
      return root;
    }

    function createHandle(node) {
      if (node.kind === 'directory') {
        return {
          kind: 'directory',
          name: node.name,
          values() {
            const children = node.children || [];
            let i = 0;
            return {
              [Symbol.asyncIterator]() { return this; },
              async next() {
                if (i >= children.length) return { done: true, value: undefined };
                return { done: false, value: createHandle(children[i++]) };
              }
            };
          }
        };
      } else {
        return {
          kind: 'file',
          name: node.name,
          async getFile() {
            return new File([contentMap.get(node.path) || ''], node.name);
          }
        };
      }
    }

    const tree = buildTree(files);
    const mockHandle = createHandle(tree);
    window.showDirectoryPicker = async () => mockHandle;
  }, srcFiles);

  const page = await context.newPage();
  const jsErrors = [];
  const consoleLogs = [];
  page.on('pageerror', err => jsErrors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') consoleLogs.push(msg.text());
  });

  // ── Test 1: Landing ──
  console.log('\n=== Test 1: Landing page ===');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '01-landing.png') });
  assert('Title is Ropeman', (await page.textContent('h1'))?.trim() === 'Ropeman');

  // ── Test 2: Load project ──
  console.log('\n=== Test 2: Load project ===');
  const openBtn = page.locator('.open-btn');
  assert('Open Directory button visible', (await openBtn.count()) > 0);

  await openBtn.click();
  console.log('  Clicked Open Directory, waiting for parsing...');

  // Wait for the canvas to appear (project loaded)
  try {
    await page.locator('.svelte-flow').waitFor({ state: 'visible', timeout: 15000 });
    console.log('  SvelteFlow canvas appeared');
  } catch {
    console.log('  Timeout waiting for canvas');
  }
  await page.waitForTimeout(3000); // extra time for parsing
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '02-project-loaded.png') });

  const hasFlow = (await page.locator('.svelte-flow').count()) > 0;
  assert('SvelteFlow canvas rendered', hasFlow);

  const nodeCount = await page.locator('.svelte-flow__node').count();
  console.log(`  Rendered nodes: ${nodeCount}`);
  assert('Graph has nodes (> 5)', nodeCount > 5);

  if (!hasFlow || nodeCount === 0) {
    // Debug: screenshot and check for errors
    console.log('  Console errors:', consoleLogs);
    console.log('  JS errors:', jsErrors);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '02-debug.png') });
  }

  // ── Test 3: Node click + edge highlighting ──
  if (nodeCount > 0) {
    console.log('\n=== Test 3: Node click + edge highlighting ===');
    const fileNodes = page.locator('.svelte-flow__node-file');
    const fileNodeCount = await fileNodes.count();
    console.log(`  File nodes: ${fileNodeCount}`);

    if (fileNodeCount > 0) {
      await fileNodes.first().click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(SCREENSHOTS_DIR, '03-node-selected.png') });

      const detailPanel = page.locator('.detail-panel');
      assert('Detail panel appears on node click', (await detailPanel.count()) > 0);

      // Check edges have style attributes (highlighting)
      const styledEdges = await page.locator('g.svelte-flow__edge path[style]').count();
      console.log(`  Styled edge paths: ${styledEdges}`);
      assert('Edges have highlighting styles', styledEdges > 0);

      // Deselect
      await page.locator('.svelte-flow__pane').click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(300);
    }

    // ── Test 4: Expand file + badges ──
    console.log('\n=== Test 4: File expand + badge check ===');
    if (fileNodeCount > 0) {
      // Double-click to expand a file
      await fileNodes.first().dblclick();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: join(SCREENSHOTS_DIR, '04-expanded.png') });

      const symbolNodes = await page.locator('.svelte-flow__node-symbol').count();
      console.log(`  Symbol nodes: ${symbolNodes}`);
      assert('Symbol nodes appear after expand', symbolNodes > 0);

      const badgeCount = await page.locator('.badge-pill').count();
      console.log(`  Badge pills: ${badgeCount}`);
      // Note: badges depend on file content, may not always appear
    }
  }

  // ── Test 5: Chat + ConnectModal ──
  console.log('\n=== Test 5: Chat FAB + ConnectModal ===');
  const chatFab = page.locator('.chat-float-btn');
  assert('Chat FAB exists', (await chatFab.count()) > 0);

  await chatFab.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '05-chat.png') });

  const chatPopup = page.locator('.chat-popup');
  assert('Chat popup opens', (await chatPopup.count()) > 0);

  const warning = page.locator('.chat-warning');
  assert('AI not connected warning', (await warning.count()) > 0);

  const connectLink = page.locator('.chat-warning-link');
  if ((await connectLink.count()) > 0) {
    await connectLink.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '06-connect-modal.png') });

    assert('ConnectModal opens', (await page.locator('.connect-card').count()) > 0);

    const tabs = await page.locator('.connect-tab').count();
    assert('2 tabs (API Key + Bridge)', tabs === 2);

    const activeTabText = await page.locator('.connect-tab.active').textContent();
    assert('Default tab = API Key', activeTabText?.trim() === 'API Key');

    // Switch to Bridge tab
    await page.locator('.connect-tab').nth(1).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '07-bridge-tab.png') });

    const cmdText = await page.locator('.command-block code').textContent();
    assert('Bridge tab has npx command', cmdText?.includes('npx @ropeman/bridge'));

    const statusDot = page.locator('.status-dot');
    assert('Status indicator present', (await statusDot.count()) > 0);

    const connectBtn = page.locator('.connect-btn:not(.danger)');
    assert('Connect button present', (await connectBtn.count()) > 0);

    // Close modal
    await page.locator('.connect-close').click();
    await page.waitForTimeout(300);
  }

  // Close chat
  await chatFab.click();
  await page.waitForTimeout(300);

  // ── Test 6: Settings → Configure AI ──
  console.log('\n=== Test 6: Settings → Configure AI ===');
  await page.waitForTimeout(500);
  // Use evaluate to directly set showSettings state, since the toggle may be flaky
  // First, find and click the settings button via its title attribute
  const settingsBtnByTitle = page.locator('header button[title="설정"], header button[title="Settings"]');
  const settingsBtnCount = await settingsBtnByTitle.count();
  console.log(`  Settings button (by title): ${settingsBtnCount}`);
  if (settingsBtnCount > 0) {
    // Double-click approach: if already open, close first, then reopen
    const alreadyOpen = (await page.locator('.settings-card').count()) > 0;
    if (alreadyOpen) {
      await page.locator('.settings-close').click();
      await page.waitForTimeout(300);
    }
    await settingsBtnByTitle.first().click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '08-settings.png') });

  const settingsVisible = (await page.locator('.settings-card').count()) > 0;
  assert('Settings modal opens', settingsVisible);

  if (settingsVisible) {
    const configBtn = page.locator('.settings-card button:has-text("Configure AI")');
    assert('Configure AI button', (await configBtn.count()) > 0);

    if ((await configBtn.count()) > 0) {
      await configBtn.click();
      await page.waitForTimeout(500);
      assert('Configure AI opens ConnectModal', (await page.locator('.connect-card').count()) > 0);
      await page.locator('.connect-close').click();
      await page.waitForTimeout(300);
    }
  }

  // ── Test 7: AI button in header ──
  console.log('\n=== Test 7: AI Analysis button ===');
  const aiLabel = page.locator('header .btn-label:has-text("AI")');
  assert('AI button in header', (await aiLabel.count()) > 0);

  if ((await aiLabel.count()) > 0) {
    await aiLabel.locator('..').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '09-ai-click.png') });
    // Should open ConnectModal since no API key
    assert('AI button opens ConnectModal (not connected)', (await page.locator('.connect-card').count()) > 0);
    if ((await page.locator('.connect-close').count()) > 0) {
      await page.locator('.connect-close').click();
    }
  }

  // ── Test 8: JS errors ──
  console.log('\n=== Test 8: Console errors ===');
  console.log(`  JS page errors: ${jsErrors.length}`);
  for (const e of jsErrors) console.log(`    ${e.substring(0, 120)}`);
  console.log(`  Console errors: ${consoleLogs.length}`);
  for (const e of consoleLogs) console.log(`    ${e.substring(0, 120)}`);
  assert('No JS page errors', jsErrors.length === 0);

  await page.screenshot({ path: join(SCREENSHOTS_DIR, '10-final.png') });
  await browser.close();

  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`Screenshots: ${SCREENSHOTS_DIR}/`);
  console.log('='.repeat(50));
  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error('Test crashed:', err); process.exit(1); });
