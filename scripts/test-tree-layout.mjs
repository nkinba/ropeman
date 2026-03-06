import { chromium } from 'playwright';
import { readdir, readFile, stat } from 'fs/promises';
import { join, relative, extname } from 'path';

const url = 'http://localhost:5175/';
const projectDir = '/tmp/nanochat';

const errors = [];
const logs = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

page.on('console', msg => {
  const type = msg.type();
  const text = msg.text();
  if (type === 'error') errors.push(text);
  else logs.push(`[${type}] ${text}`);
});

page.on('pageerror', err => {
  errors.push(`PAGE ERROR: ${err.message}`);
});

try {
  // 1. Collect files from nanochat
  console.log('=== STEP 1: Collecting project files ===');
  const fileList = [];
  async function collectFiles(dir, base) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', '__pycache__', '.venv', 'venv', '.mypy_cache', '.ruff_cache', 'runs'].includes(entry.name)) continue;
        await collectFiles(fullPath, base);
      } else {
        const relPath = relative(base, fullPath);
        const ext = extname(entry.name);
        if (['.py', '.js', '.ts', '.tsx', '.jsx'].includes(ext)) {
          try {
            const content = await readFile(fullPath, 'utf-8');
            fileList.push({ path: relPath, name: entry.name, content: content.slice(0, 50000) });
          } catch { /* skip */ }
        }
      }
    }
  }
  await collectFiles(projectDir, projectDir);
  console.log(`Collected ${fileList.length} source files from nanochat`);

  // 2. Load the page and inject test helper
  console.log('\n=== STEP 2: Loading page ===');

  // Add a route that exposes store access for testing
  await page.addInitScript(() => {
    // We'll expose store setters on window during testing
    window.__ropeman_test = true;
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log(`Title: ${await page.title()}`);

  // Take landing screenshot
  await page.screenshot({ path: '/tmp/ropeman-test-1-landing.png' });

  // 3. Instead of mocking showDirectoryPicker, expose the stores on window
  // by adding a <script> module that imports and exposes them
  console.log('\n=== STEP 3: Injecting store access ===');

  await page.evaluate(async () => {
    // Use Vite's import to access the stores
    try {
      const projectMod = await import('/src/lib/stores/projectStore.svelte.ts');
      const graphMod = await import('/src/lib/stores/graphStore.svelte.ts');
      const parserMod = await import('/src/lib/services/parserService.ts');
      window.__stores = {
        projectStore: projectMod.projectStore,
        graphStore: graphMod.graphStore,
        parseAllFiles: parserMod.parseAllFiles
      };
      console.log('Stores injected successfully');
    } catch (err) {
      console.error('Failed to inject stores:', err);
    }
  });

  await page.waitForTimeout(500);

  // 4. Build file tree and set it in the store
  console.log('\n=== STEP 4: Loading project into stores ===');

  await page.evaluate(async (files) => {
    const { projectStore, parseAllFiles } = window.__stores;
    if (!projectStore) throw new Error('projectStore not found');

    // Build FileNode tree
    const root = {
      name: 'nanochat',
      path: 'nanochat',
      kind: 'directory',
      children: []
    };

    const dirMap = new Map();
    dirMap.set('', root);

    for (const file of files) {
      const parts = file.path.split('/');
      let currentPath = '';

      // Create directories
      for (let i = 0; i < parts.length - 1; i++) {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];

        if (!dirMap.has(currentPath)) {
          const dirNode = {
            name: parts[i],
            path: `nanochat/${currentPath}`,
            kind: 'directory',
            children: []
          };
          dirMap.set(currentPath, dirNode);
          const parent = dirMap.get(parentPath);
          if (parent) parent.children.push(dirNode);
        }
      }

      // Create file node
      const fileName = parts[parts.length - 1];
      const ext = fileName.split('.').pop()?.toLowerCase();
      const langMap = {
        'py': 'python', 'js': 'javascript', 'ts': 'typescript',
        'tsx': 'tsx', 'jsx': 'jsx'
      };

      const fileNode = {
        name: fileName,
        path: `nanochat/${file.path}`,
        kind: 'file',
        language: langMap[ext] || null,
        content: file.content
      };

      const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
      const parent = dirMap.get(parentPath);
      if (parent) parent.children.push(fileNode);
    }

    // Set project data
    projectStore.projectName = 'nanochat';
    projectStore.fileTree = root;
    projectStore.isLoading = true;

    // Trigger parsing
    await parseAllFiles(root);

    console.log('Project loaded into stores');
  }, fileList);

  // Wait for parsing & graph build
  console.log('Waiting for parsing and graph rendering...');
  await page.waitForTimeout(5000);

  // Take screenshot
  await page.screenshot({ path: '/tmp/ropeman-test-2-loaded.png' });
  console.log('Screenshot: /tmp/ropeman-test-2-loaded.png');

  // 5. Check for rendered graph
  console.log('\n=== STEP 5: Checking rendered graph ===');
  const canvas = await page.$('.svelte-flow');
  if (canvas) {
    console.log('SvelteFlow canvas found');
  } else {
    console.log('WARNING: SvelteFlow canvas not found');
    // Check what's on the page
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('Page body text:', bodyText);
  }

  const nodeCount = await page.$$eval('.svelte-flow__node', nodes => nodes.length);
  console.log(`Rendered flow nodes: ${nodeCount}`);

  if (nodeCount > 0) {
    // 6. Verify vertical tree layout
    console.log('\n=== STEP 6: Verifying vertical tree layout ===');

    const nodePositions = await page.$$eval('.svelte-flow__node', nodes => {
      return nodes.slice(0, 30).map(n => {
        const transform = n.style.transform || '';
        const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
        return {
          id: n.dataset?.id || 'unknown',
          x: match ? parseFloat(match[1]) : null,
          y: match ? parseFloat(match[2]) : null,
          text: n.textContent?.trim().slice(0, 40)
        };
      });
    });

    console.log('\nFirst 30 node positions:');
    for (const np of nodePositions) {
      const xStr = np.x !== null ? np.x.toFixed(0).padStart(6) : '  null';
      const yStr = np.y !== null ? np.y.toFixed(0).padStart(6) : '  null';
      console.log(`  ${(np.text || '').padEnd(35)} x=${xStr} y=${yStr}`);
    }

    // Verify vertical ordering: y values should be strictly increasing
    const validNodes = nodePositions.filter(n => n.y !== null);
    const isVertical = validNodes.every((n, i) => i === 0 || n.y >= validNodes[i - 1].y);
    console.log(`\nVertical ordering (increasing y): ${isVertical ? 'PASS' : 'FAIL'}`);

    // Verify indentation: x positions should be multiples of INDENT_PX (28)
    const xs = [...new Set(validNodes.map(n => n.x))].sort((a, b) => a - b);
    console.log(`Unique x positions (indent levels): ${xs.join(', ')}`);
    if (xs.length > 1) {
      const baseX = xs[0];
      const indents = xs.map(x => x - baseX);
      const allMultiplesOf28 = indents.every(d => Math.abs(d % 28) < 2);
      console.log(`Indents are multiples of 28px: ${allMultiplesOf28 ? 'PASS' : 'FAIL'} (indents: ${indents.join(', ')})`);
    }

    // Check that we have multiple node types
    const types = await page.$$eval('.svelte-flow__node', nodes => {
      const typeCounts = {};
      for (const n of nodes) {
        for (const cls of n.classList) {
          if (cls.startsWith('type-')) {
            typeCounts[cls] = (typeCounts[cls] || 0) + 1;
          }
        }
      }
      return typeCounts;
    });
    console.log(`Node type counts:`, types);

    // 7. Take final screenshot with "fit view"
    await page.screenshot({ path: '/tmp/ropeman-test-3-tree.png', fullPage: false });
    console.log('Screenshot: /tmp/ropeman-test-3-tree.png');

    // 8. Test node click
    console.log('\n=== STEP 7: Testing node click ===');
    const firstNode = await page.$('.svelte-flow__node');
    if (firstNode) {
      await firstNode.click();
      await page.waitForTimeout(500);
      const detailPanel = await page.$('.detail-panel');
      console.log(`Node click → detail panel visible: ${detailPanel ? 'YES' : 'NO'}`);
      await page.screenshot({ path: '/tmp/ropeman-test-4-click.png' });
      console.log('Screenshot: /tmp/ropeman-test-4-click.png');
    }
  }

  // Final error summary
  console.log('\n=== FINAL RESULTS ===');
  if (errors.length > 0) {
    console.log(`ERRORS (${errors.length}):`);
    errors.forEach(e => console.log(`  ${e}`));
  } else {
    console.log('NO CONSOLE ERRORS');
  }

  const totalLogs = logs.length;
  console.log(`Total console logs: ${totalLogs}`);
  if (totalLogs > 0 && totalLogs <= 20) {
    logs.forEach(l => console.log(`  ${l}`));
  } else if (totalLogs > 20) {
    logs.slice(0, 10).forEach(l => console.log(`  ${l}`));
    console.log(`  ... and ${totalLogs - 10} more`);
  }

} catch (err) {
  console.error('TEST FAILED:', err.message);
  console.error(err.stack);
  await page.screenshot({ path: '/tmp/ropeman-test-error.png' });
  console.log('Error screenshot: /tmp/ropeman-test-error.png');

  if (errors.length > 0) {
    console.log('\nConsole errors during test:');
    errors.forEach(e => console.log(`  ${e}`));
  }
} finally {
  await browser.close();
}
