# Ropeman — 코드 시각화 도구 (MVP)

## Tech Stack

- SvelteKit + Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`)
- @xyflow/svelte (SvelteFlow) — 그래프 렌더링
- web-tree-sitter WASM — 여러 프로그래밍 언어 AST 파싱 (Web Worker)
- File System Access API (`showDirectoryPicker`)
- @dagrejs/dagre — 레이아웃, @orama — 검색

## Conventions

- 스토어: `src/lib/stores/` 모듈 레벨 싱글턴 (getter/setter export)
- 서비스: `src/lib/services/` 순수 함수 또는 stateless 모듈
- 컴포넌트: Svelte 5 `$props()` destructuring, snippet 미사용
- 파싱: parserWorker.ts (Web Worker) → postMessage → parserService.ts
- 타입: `src/lib/types/` (ast.ts, graph.ts, search.ts)

## Constraints

- 브라우저 전용 (SSR 없음, adapter-cloudflare)
- FileSystemHandle 한계 → MAX_FILES=2000, MAX_FILE_SIZE=500KB

## Agent Onboarding

- 새 세션 시작 시 순서대로 수행
  1. `/catchup` → .spec/history 최신 3개 읽고 맥락 파악
  2. 전체 레퍼런스(⚠️ .spec/은 symlink — Glob 대신 Bash ls 또는 Read로 접근) 확인
     - `.spec/PRD.md` — 비전/로드맵
     - `.spec/ARCH.md` — 아키텍처/ADR
     - `.spec/tasks/` — 원자적 태스크
     - 위 파일이 없으면 사용자에게 확인 후 진행
  3. `/sync` → 소스 스캔 (현재 코드가 실제로 어떤 상태인가)

- 스프린트 수행 규칙 (사용자가 스프린트 실행을 요청했을 때만 적용)
  1. `.spec/PRD.md`의 '7. 우선순위 및 로드맵'과 `.spec/tasks/` 의 Task md 파일로 대상을 파악한다.
  2. 가능하면 Agent Team을 구성하여 Task를 병렬 수행한다. 각 Task는 개발 → 테스트 → 코드 리뷰 순서.
  3. Task 상태 변경: 작업 시작 시 `In-Progress`, DoD 전부 충족 시 `Done`.
  4. 스프린트는 최대 4개 Task. 미완료 Task가 있으면 포함 + P1에서 가져와 4개를 채운다.

- 스프린트 ID: `YYYY-MM-dd-{n}` (예: `2026-03-03-01`). PRD 로드맵, history 파일명, changelog, 브랜치명에 사용.

- ⚠️ **스프린트 마무리 절차 (순서 엄수, 2개 커밋 분리)**

  **[1단계] 기능 작업 커밋**
  1. `npm run test:unit && npm run build` 통과 확인
  2. 스프린트 브랜치 생성 (`sprint/{sprint_id}`)
  3. **커밋 A (feat)**: 기능 구현 결과만 커밋
     - 메시지: `feat({scope}): {스프린트 요약}` 또는 복수 태스크면 `feat: sprint {id} — G1, G2, G4`
     - 이 커밋은 **리뷰 전 상태**

  **[2단계] 리뷰 & 수정 & 메타데이터 → 커밋 B** 4. `/code-reviewer` 실행 (Explore 에이전트로 위임) 5. **리뷰 보고서 작성** → `.spec/reviews/{sprint_id}-review.md`
  - 리뷰 대상, Critical/Warning/Suggestion 개수, 이슈별 증상·원인·수정·결정
  - 오탐(false positive)과 스킵한 Suggestion의 이유 포함
  - 새 안티패턴은 `common_antipatterns.md`로 승격 후 보고서에서 링크
  6. Critical / Warning 즉시 수정 (Suggestion은 판단)
  7. 스프린트 중 해결한 버그는 `.spec/bug-report/`에 기록
  8. `npm run test:unit && npm run build` 재통과 확인
  9. **PRD 최신화** (아래 6개 필드 전부 — 하나라도 빠지면 안 됨)
     - `최종 업데이트` 날짜 → 오늘
     - `버전` → 마이너 증가 (0.15.0 → 0.16.0)
     - `상태` → "스프린트 {id} 완료"
     - `7. 우선순위 및 로드맵` → 이전/P0/P1 갱신
     - `8. 변경 이력` → 행 추가
     - `5. 구현 현황` → 태스크 상태 반영
  10. **Task 파일** 상태·DoD 업데이트
  11. **Changelog** → `.spec/history/{sprint_id}.md` 작성 (리뷰 보고서 링크 포함)
  12. **커밋 B (review)**: 리뷰 수정 + 리뷰 보고서 + 메타데이터를 한 번에
      - 메시지 예시:

        ```
        review: sprint {id} — {Critical}/{Warning}/{Suggestion} issues addressed

        - {주요 수정 1}
        - {주요 수정 2}
        - PRD / changelog / task 상태 업데이트
        - 리뷰 보고서: .spec/reviews/{sprint_id}-review.md
        ```

  **[3단계] 사용자 승인 & 후속 작업** 13. 사용자에게 결과 보고 → **승인** 14. 승인 후 추가 개발·수정 요청이 있으면 **커밋 C+ 로 반영** - 각 커밋은 독립된 단위 (예: `fix(ui): ...`, `feat(share): add OG image`) - 추가 작업이 있으면 필요 시 Changelog를 amend 또는 신규 커밋(`docs: update changelog`)으로 갱신 - 추가 작업이 리뷰가 필요할 만큼 크면 [2단계]를 반복 (2차 리뷰 보고서 작성)

  **[4단계] Push + PR** 15. Push → PR 생성 - PR 제목: 완료 태스크 요약 - PR 본문: 완료/미완료 태스크 + 주요 변경사항 + 리뷰 보고서 링크 - 커밋 이력: A(feat) → B(review) → C+(post-approval, 있으면)

- **기본 원칙**: 커밋 경계 = 의사결정 경계
  - **커밋 A** = "이게 내가 만든 것"
  - **커밋 B** = "리뷰가 찾은 것 + 내가 고친 것"
  - **커밋 C+** = "사용자 승인 후 추가로 한 것"
  - 각 커밋은 독립적으로 revert 가능해야 하고, 리뷰 보고서는 B 시점의 스냅샷이지 최종 상태가 아니라는 점을 인지할 것

- PRD 로드맵 구조 (`7. 우선순위 및 로드맵`)
  - **이전 스프린트**: 직전 1개만 (이전 이력은 `.spec/history/`)
  - **P0 — 현재 스프린트**: 최대 4개
  - **P1 — 다음 스프린트**: 그 다음 우선순위
  - P2 이후는 각 태스크 파일의 우선순위 속성으로 관리
  - 스프린트 종료 시 승격: 완료→이전, 미완료→P0 잔류, P1에서 채움, P2 중 준비된 것→P1 승격

## 디자인 반영 규칙

외부 디자인 도구(Stitch 등)의 산출물을 코드에 반영할 때 아래 절차를 따른다.

1. **매핑표 작성** (작업 시작 전 필수)
   - 디자인 HTML의 모든 요소를 나열한다
   - 각 요소에 대응하는 Svelte 컴포넌트 파일을 매핑한다
   - 하나의 HTML에 여러 컴포넌트가 포함될 수 있다 — 빠짐없이 식별한다
   - 매핑표를 사용자에게 보여주고 확인받은 후 작업을 시작한다

2. **전수 변환** (추정 금지)
   - 디자인 HTML의 모든 클래스를 CSS property-value로 변환한다
   - 현재 코드의 모든 대응 속성과 1:1 비교한다
   - "대략 맞겠지"로 넘어가지 않는다 — 모든 값을 명시적으로 확인한다
   - 변환할 수 없는 값(구조 차이, 라이브러리 한계)은 문서화한다

3. **검증** (Agent 결과를 맹신하지 않는다)
   - Agent 작업 완료 후 매핑표의 모든 항목에 체크 표시한다
   - 미처리 항목이 있으면 추가 반영한다
   - `npm run build && npm run test:unit` 통과 확인

4. **디자인 정본 관리**
   - 정본 HTML 파일은 `.stitch-html/`에 보관한다
   - 디자인 시스템 문서는 `.stitch-html/DESIGN.md`를 참조한다
   - variant(초안)와 정본(확정)을 혼동하지 않는다 — 사용자가 확인한 파일만 정본으로 취급한다

## 테스트

- `src/lib/services/` 또는 `src/lib/stores/` 파일 변경 시 대응하는 `.test.ts` 파일을 반드시 추가 또는 업데이트한다.
- vitest, AAA 패턴, 외부 의존성은 `vi.mock()`.
- 실제 발생했던 버그 케이스는 테스트에 포함 (regression test).

## Custom Commands(Claude Skills)

- `/sync` — 코드베이스 스캔 후 현재 아키텍처 파악
- `/catchup` — .spec/history 읽고 이전 작업 맥락 파악
- `/changelog` — 작업 완료 후 변경사항 자동 문서화
- `/generate-tests [파일경로]` — 지정 파일의 테스트 자동 생성
- `/code-reviewer` — 코드 리뷰 수행 (프로젝트 맞춤 체크리스트)
