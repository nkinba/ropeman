#!/usr/bin/env node

/**
 * lint-staged hook: services/stores 파일 변경 시 대응하는 .test.ts 존재 여부 체크.
 * 없으면 exit 1 → 커밋 차단.
 *
 * - 변경된 파일(M): .test.ts가 디스크에 존재하는지 확인
 * - 신규 추가된 파일(A): .test.ts가 디스크에 존재하는지 확인 + staged 여부 경고
 *
 * Usage: node scripts/check-test-exists.mjs <file1> <file2> ...
 */

import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { basename, dirname, join } from 'node:path';

const targetDirs = ['src/lib/services', 'src/lib/stores'];
// 테스트 파일 자체, 타입 정의, index 파일은 제외
const skipPatterns = [/\.test\.ts$/, /\.d\.ts$/, /^index\.ts$/];

const staged = process.argv.slice(2);
const missing = [];
const warnings = [];

// Detect newly added files from git staging area
let newlyAdded = new Set();
try {
  const output = execSync('git diff --cached --name-status', { encoding: 'utf-8' });
  for (const line of output.trim().split('\n')) {
    if (!line) continue;
    const [status, filePath] = line.split('\t');
    if (status === 'A') {
      newlyAdded.add(filePath);
    }
  }
} catch {
  // git command failed, skip newly-added detection
}

for (const file of staged) {
  const isTarget = targetDirs.some((dir) => file.startsWith(dir + '/'));
  if (!isTarget) continue;

  const base = basename(file);
  if (skipPatterns.some((p) => p.test(base))) continue;

  // foo.ts → foo.test.ts, fooStore.svelte.ts → fooStore.test.ts
  const nameWithoutExt = base.replace(/\.svelte\.ts$/, '').replace(/\.ts$/, '');
  const testFile = join(dirname(file), `${nameWithoutExt}.test.ts`);

  if (!existsSync(testFile)) {
    missing.push({ source: file, expected: testFile, isNew: newlyAdded.has(file) });
  } else if (newlyAdded.has(file) && !newlyAdded.has(testFile)) {
    // Source file is newly added but test file is not staged
    warnings.push({ source: file, testFile });
  }
}

if (warnings.length > 0) {
  console.warn('\n⚠️  New source files have tests but they are not staged:\n');
  for (const { source, testFile } of warnings) {
    console.warn(`  ${source}`);
    console.warn(`    → test exists but not staged: ${testFile}`);
    console.warn(`    → consider: git add ${testFile}\n`);
  }
}

if (missing.length > 0) {
  console.error('\n⚠️  Test file missing for changed services/stores:\n');
  for (const { source, expected, isNew } of missing) {
    console.error(`  ${source}${isNew ? ' (NEW FILE)' : ''}`);
    console.error(`    → expected: ${expected}\n`);
  }
  console.error('Create the test file or use --no-verify to skip (not recommended).\n');
  process.exit(1);
}
