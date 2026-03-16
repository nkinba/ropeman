# WIP Session — Sprint 2026-03-13-02 (Post-PR 버그 수정)

> 이 문서는 세션 간 인수인계를 위한 것입니다. 새 세션에서 이 파일을 읽고 작업을 이어가세요.

## 브랜치

- `sprint/2026-03-13-02` (PR #6 생성 완료, 이후 추가 수정 진행 중)

## 완료된 작업

### 1. TabBar 반응성 수정 (`+page.svelte`)

- **문제:** Svelte 5 `$props()` 기본값은 컴포넌트 초기화 시 1회만 캡처되어 반응성이 없음
- **수정:** `<TabBar />` → 명시적 props 전달 (`tabs={tabStore.tabs}`, `activeTabId={tabStore.activeTabId}` 등)

### 2. 탭 드래그 분할/병합 (`TabBar.svelte`, `SplitPane.svelte`, `+page.svelte`)

- HTML5 Drag and Drop API로 탭 드래그하여 split/merge 가능
- `draggable="true"` + `text/x-tab-id`, `text/x-tab-pane` 커스텀 MIME 타입
- 캔버스 오른쪽 절반에 드롭 시 split 활성화 ("Drop to split" 오버레이)
- SplitPane 내 cross-pane 탭 드롭 지원
- secondary pane에 탭이 없으면 자동으로 split 해제

### 3. 코드 디테일 패널 제거 (`+page.svelte`)

- `hasSelection = $derived(false)` — 코드 파일의 NodeDetailPanel (Language, ID, Children) 비활성화
- 이유: 정보가 코드 헤더와 breadcrumb에서 이미 확인 가능

### 4. CLAUDE.md 스프린트 승인 규칙 추가

- 커밋/PR 생성 전 반드시 사용자 승인 필요

### 5. activateTab pane 인식 (`tabStore.svelte.ts`)

- **문제:** 다이어그램 탭이 secondary pane에 있을 때, 시맨틱 트리 클릭 시 primary에 중복 생성
- **수정:** `activateTab`이 탭의 `paneId`를 확인하여 secondary면 `layoutStore.secondaryActiveTabId` 설정

### 6. moveTabToPane activeTabId 정리 (`tabStore.svelte.ts`)

- **문제:** primary의 active 탭을 secondary로 이동 시 `activeTabId`가 그대로 남아 primary가 없는 탭을 참조
- **수정:** 이동 시 남은 primary 탭으로 `activeTabId` 전환

### 7. SplitPane primaryActiveTab 필터링 (`SplitPane.svelte`)

- `primaryActiveTab` derivation에서 `paneId === 'primary'` 조건 추가

### 8. CodeViewer filePath prop (`CodeViewer.svelte`)

- **문제:** 양쪽 pane이 같은 `selectionStore` 싱글턴을 읽어 동일 파일 표시
- **수정:** `filePath` prop 추가, SplitPane에서 각 탭의 `filePath`를 직접 전달

### 9. 코드 탭 다중 오픈 (`tabStore.svelte.ts`)

- `openCodeTab` 기본값 `preview=true` → `preview=false` 변경 (코드 탭이 pinned로 생성)
- split 모드에서 새 코드 탭이 현재 포커스된 pane에 생성되도록 `paneId: targetPane` 설정

## 미해결 버그 / 테스트 필요 사항

### 브라우저 테스트 필요

아래 시나리오를 **브라우저에서 실제 테스트**하여 확인해야 합니다:

1. **다이어그램 split 동작**
   - 다이어그램 탭을 드래그하여 오른쪽으로 분할 → 왼쪽에 다이어그램이 중복 생성되지 않는지
   - 시맨틱 트리 노드 클릭 시 다이어그램이 있는 pane에서 활성화되는지

2. **코드 탭 split 동작**
   - 코드 탭을 드래그하여 분할 → 양쪽에 서로 다른 파일이 보이는지
   - split 모드에서 파일 탐색기/시맨틱 트리에서 파일 열기 → 포커스된 pane에 생성되는지

3. **코드 탭 다중 오픈**
   - 파일 여러 개를 열었을 때 각각 독립 탭으로 유지되는지 (preview 탭으로 교체되지 않는지)

4. **split 해제 동작**
   - secondary pane의 마지막 탭을 primary로 드래그 → 자동 split 해제
   - Ctrl+\ 로 split 토글 → secondary 탭이 primary로 merge

## 변경 파일 목록

| 파일                                   | 변경 내용                                                          |
| -------------------------------------- | ------------------------------------------------------------------ |
| `CLAUDE.md`                            | 스프린트 승인 규칙 추가                                            |
| `src/lib/components/CodeViewer.svelte` | `filePath` prop 추가                                               |
| `src/lib/components/SplitPane.svelte`  | cross-pane 드롭, primaryActiveTab 필터, CodeViewer에 filePath 전달 |
| `src/lib/components/TabBar.svelte`     | 드래그 앤 드롭 지원                                                |
| `src/lib/stores/tabStore.svelte.ts`    | pane-aware activateTab, moveTabToPane, openCodeTab 개선            |
| `src/routes/+page.svelte`              | TabBar 반응성 수정, drag-to-split, 디테일 패널 제거                |

## 새 세션 온보딩 순서

1. 이 파일(`docs/wip-session.md`)을 읽고 맥락 파악
2. `git status` 로 현재 상태 확인
3. 위 "미해결 버그 / 테스트 필요 사항"을 브라우저에서 테스트
4. 문제 해결 후 사용자에게 커밋/PR 승인 요청

## 규칙

- **커밋/PR 전 반드시 사용자 승인** (CLAUDE.md + memory에 기록됨)
- **커밋 메시지에 `Co-Authored-By: Claude ...` 제외** (사용자 선호)
