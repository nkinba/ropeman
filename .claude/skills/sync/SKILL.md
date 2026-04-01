---
name: sync
description: Scan the current codebase to understand the actual state of the project. Use this at the start of a new session as part of Agent Onboarding (after catchup), or when the user asks to sync with the current code state.
---

# Sync — 코드베이스 현재 상태 스캔

## 수행 절차

1. `npm run test:unit` 실행하여 테스트 통과 여부 확인
2. `npm run build` 실행하여 빌드 성공 여부 확인
3. `git status`로 미커밋 변경사항 확인
4. 주요 디렉토리 구조 스캔:
   - `src/lib/components/` — 컴포넌트 목록
   - `src/lib/stores/` — 스토어 목록
   - `src/lib/services/` — 서비스 목록
5. 현재 브랜치, 최근 커밋 5개 확인

## 출력 형식

```
### 코드베이스 현황
- 테스트: {N}개 통과 / 실패
- 빌드: 성공/실패
- 브랜치: {branch_name}
- 미커밋: {N}개 파일
- 컴포넌트: {N}개
- 스토어: {N}개
- 서비스: {N}개
```
