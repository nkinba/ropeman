#!/usr/bin/env node

/**
 * lint-staged hook: services/stores 파일 변경 시 대응하는 .test.ts 존재 여부 체크.
 * 없으면 exit 1 → 커밋 차단.
 *
 * Usage: node scripts/check-test-exists.mjs <file1> <file2> ...
 */

import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const targetDirs = ['src/lib/services', 'src/lib/stores'];
// 테스트 파일 자체, 타입 정의, index 파일은 제외
const skipPatterns = [/\.test\.ts$/, /\.d\.ts$/, /^index\.ts$/];

const staged = process.argv.slice(2);
const missing = [];

for (const file of staged) {
  const isTarget = targetDirs.some((dir) => file.startsWith(dir + '/'));
  if (!isTarget) continue;

  const base = basename(file);
  if (skipPatterns.some((p) => p.test(base))) continue;

  // foo.ts → foo.test.ts, fooStore.svelte.ts → fooStore.test.ts
  const nameWithoutExt = base.replace(/\.svelte\.ts$/, '').replace(/\.ts$/, '');
  const testFile = join(dirname(file), `${nameWithoutExt}.test.ts`);

  if (!existsSync(testFile)) {
    missing.push({ source: file, expected: testFile });
  }
}

if (missing.length > 0) {
  console.error('\n⚠️  Test file missing for changed services/stores:\n');
  for (const { source, expected } of missing) {
    console.error(`  ${source}`);
    console.error(`    → expected: ${expected}\n`);
  }
  console.error('Create the test file or use --no-verify to skip (not recommended).\n');
  process.exit(1);
}
