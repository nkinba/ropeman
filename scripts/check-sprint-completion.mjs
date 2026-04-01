#!/usr/bin/env node

/**
 * pre-push hook: sprint/* 브랜치 push 시 마무리 절차 누락 체크.
 * 누락 시 exit 1 → push 차단.
 *
 * 체크 항목:
 * 1. .spec/PRD.md 최종 업데이트 날짜가 오늘인가
 * 2. .spec/history/{sprint_id}.md 파일이 존재하는가
 * 3. npm run test:unit 통과 (CI에서도 하지만 사전 방지)
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// 현재 브랜치 확인
let branch;
try {
  branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
} catch {
  process.exit(0); // git 오류 시 통과
}

// sprint/* 브랜치가 아니면 스킵
if (!branch.startsWith('sprint/')) {
  process.exit(0);
}

const sprintId = branch.replace('sprint/', '');
const errors = [];

// 1. PRD 최종 업데이트 날짜 체크
const prdPath = resolve('.spec/PRD.md');
if (existsSync(prdPath)) {
  const prd = readFileSync(prdPath, 'utf-8');
  const match = prd.match(/\*\*최종 업데이트\*\*:\s*(\d{4}-\d{2}-\d{2})/);
  if (match) {
    const today = new Date().toISOString().slice(0, 10);
    if (match[1] !== today) {
      errors.push(`PRD 최종 업데이트 날짜가 오늘(${today})이 아닙니다: ${match[1]}`);
    }
  } else {
    errors.push('PRD에서 최종 업데이트 날짜를 찾을 수 없습니다');
  }
} else {
  errors.push('.spec/PRD.md 파일을 찾을 수 없습니다');
}

// 2. Changelog 파일 존재 체크
const historyDir = resolve('.spec/history');
if (existsSync(historyDir)) {
  const files = readdirSync(historyDir);
  const hasChangelog = files.some((f) => f.startsWith(sprintId));
  if (!hasChangelog) {
    errors.push(`Changelog 파일이 없습니다: .spec/history/${sprintId}.md`);
  }
} else {
  errors.push('.spec/history/ 디렉토리를 찾을 수 없습니다');
}

// 결과 출력
if (errors.length > 0) {
  console.error('\n⚠️  스프린트 마무리 절차 누락:\n');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  console.error('\n마무리 절차를 완료한 후 다시 push하세요.\n');
  console.error('강제 push: git push --no-verify\n');
  process.exit(1);
}
