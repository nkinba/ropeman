import { chromium } from 'playwright';

const url = 'http://localhost:5175/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [];
const logs = [];

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
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);

  const title = await page.title();
  console.log('=== PAGE INFO ===');
  console.log(`Title: ${title}`);
  console.log(`URL: ${page.url()}`);

  // Take screenshot of landing page
  await page.screenshot({ path: '/tmp/codeviz-landing.png', fullPage: true });
  console.log('Screenshot saved: /tmp/codeviz-landing.png');

  if (errors.length > 0) {
    console.log('\n=== CONSOLE ERRORS ===');
    errors.forEach(e => console.log(e));
  } else {
    console.log('\n=== NO CONSOLE ERRORS ===');
  }

  if (logs.length > 0) {
    console.log('\n=== CONSOLE LOGS (first 20) ===');
    logs.slice(0, 20).forEach(l => console.log(l));
  }
} catch (err) {
  console.error('Navigation failed:', err.message);
} finally {
  await browser.close();
}
