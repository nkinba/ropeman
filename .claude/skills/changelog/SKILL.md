---
name: changelog
description: Generate a sprint changelog file in .spec/history/{sprint_id}.md after sprint completion. Use this as part of the sprint completion procedure, after PRD update and before commit.
---

# Changelog — 스프린트 변경사항 기록

## 수행 절차

1. 현재 스프린트 ID를 확인한다 (PRD 로드맵 또는 사용자 지정)
2. `git diff main...HEAD --stat`으로 변경 파일 목록을 수집한다
3. 완료된 태스크와 주요 변경사항을 정리한다
4. `.spec/history/{sprint_id}.md` 파일을 생성한다

## 출력 형식

```markdown
# Sprint {sprint_id}

**날짜**: {YYYY-MM-DD}
**브랜치**: `sprint/{sprint_id}`
**성격**: {스프린트 주제 요약}

## 완료 항목

### {태스크 ID}: {태스크 제목}

- {변경 내용 1}
- {변경 내용 2}

## 파일 변경 ({N}개)

- `{파일경로}` — {변경 설명}

## 테스트

- {N} tests passed, 빌드 성공
```

## 주의사항

- ⚠️ `.spec/`은 symlink일 수 있음 — 파일 쓰기 시 경로 확인
- 당일 기존 파일이 있으면 순번을 증가시킨다 (예: 01 → 02)
