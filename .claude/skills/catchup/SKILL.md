---
name: catchup
description: Read the latest 3 sprint history files from .spec/history/ to restore previous work context. Use this at the start of a new session as part of Agent Onboarding, or when the user asks to catch up on previous work.
---

# Catchup — 이전 작업 맥락 복원

## 수행 절차

1. `.spec/history/` 디렉토리에서 최신 3개 파일을 날짜 역순으로 읽는다
   - ⚠️ `.spec/`은 symlink일 수 있음 — `Glob` 대신 `Bash ls` 또는 `Read`로 접근
2. 각 파일의 완료 태스크, 미완료 태스크, 주요 변경사항을 요약한다
3. 현재 PRD의 로드맵(P0/P1)을 확인하여 다음 작업 대상을 파악한다
4. 사용자에게 맥락 요약을 보고한다

## 출력 형식

```
### 최근 3개 스프린트 요약

**{sprint_id}** — {날짜}
- ✅ {완료 태스크 1}
- ✅ {완료 태스크 2}
- ⬜ {미완료 태스크} (사유)

### 현재 로드맵
- P0: {현재 스프린트 대상}
- P1: {다음 스프린트 대상}
```
