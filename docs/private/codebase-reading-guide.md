# CodeViz 코드베이스 읽기 가이드

> 이 문서는 코드를 직접 읽으며 프로젝트를 이해하려는 개발자를 위한 가이드입니다.

---

## Part A. 배경지식

코드를 읽기 전에 이 프로젝트에서 사용하는 언어, 프레임워크, 도메인 개념을 먼저 파악하세요.
각 주제는 별도의 HTML 페이지로 분리되어 있습니다. 이미 익숙한 영역은 건너뛰세요.

| 주제 | 설명 | 링크 |
|------|------|------|
| **TypeScript 패턴** | 타입 선언, 제네릭, 단언, Promise, Discriminated Union 등 이 프로젝트에서 반복되는 TS 문법 | [typescript-patterns.html](./knowledge/typescript-patterns.html) |
| **프론트엔드 기술 스택** | SvelteKit, Svelte 5 Runes, Vite, SvelteFlow, web-tree-sitter, dagre, File System Access API, Orama의 역할과 관계 | [frontend-ecosystem.html](./knowledge/frontend-ecosystem.html) |
| **도메인 지식** | 코드 시각화란, Files/Semantic 두 뷰 모드, AST와 심볼 추출, 스켈레톤, 시맨틱 분석/드릴다운, 양방향 연동, 인증 트랙 | [domain-concepts.html](./knowledge/domain-concepts.html) |

---

## Part B. 전체 아키텍처 개요

```
사용자가 폴더 선택
    │
    ▼
┌─────────────────┐     ┌───────────────────┐
│ fileSystemService│────▶│  projectStore     │ (fileTree, astMap 저장)
│ (폴더 스캔)      │     │                   │
└─────────────────┘     └───────┬───────────┘
                                │
        ┌───────────────────────┤
        ▼                       ▼
┌─────────────────┐     ┌───────────────────┐
│ parserWorker    │     │ skeletonExtractor │
│ (WASM AST 파싱) │     │ (프로젝트 요약)    │
│ ← Web Worker    │     └───────┬───────────┘
└───────┬─────────┘             │
        │                       ▼
        │               ┌───────────────────┐
        │               │ semanticAnalysis  │ ← AI (Gemini / Bridge)
        │               │ Service           │
        │               └───────┬───────────┘
        ▼                       │
┌─────────────────┐     ┌──────┴────────────┐
│ graphBuilder    │     │ semanticStore     │ (시맨틱 레벨, 드릴다운)
│ (노드/엣지 생성) │     │ + semanticGraph   │
└───────┬─────────┘     │   Builder         │
        │               └──────┬────────────┘
        ▼                      │
┌─────────────────┐            │
│ graphStore      │            │
│ (그래프 상태)    │            │
└───────┬─────────┘            │
        │          ┌───────────┘
        ▼          ▼
┌──────────────────────────────────────────────────┐
│                    ZUICanvas                     │
│  viewMode='filetree' │  viewMode='semantic'      │
│  (파일트리 그래프)     │  (시맨틱 다이어그램)       │
├──────────────────────┴───────────────────────────┤
│  FileExplorer  │  NodeDetailPanel  │  ChatPopup  │
│  (사이드바)     │  (상세 패널)       │  (AI 채팅)   │
└──────────────────────────────────────────────────┘
```

**두 갈래 렌더링 경로:**
- **Files 뷰**: projectStore → graphBuilder → graphStore → ZUICanvas (Effect 1b)
- **Semantic 뷰**: projectStore → skeletonExtractor → AI → semanticStore → semanticGraphBuilder → ZUICanvas (Effect 1a)

---

## Part C. 읽기 순서 (총 5단계)

### Stage 1. 데이터 모델 — "이 앱이 다루는 것들"

가장 먼저 타입 정의를 읽으세요. 코드의 모든 로직이 이 타입들을 중심으로 돌아갑니다.

| 순서 | 파일 | 핵심 내용 |
|------|------|-----------|
| 1-1 | `src/lib/types/fileTree.ts` | **FileNode** — 파일/폴더의 트리 구조. `children` 재귀 구조 |
| 1-2 | `src/lib/types/ast.ts` | **ASTSymbol** — 파서가 추출한 심볼(함수, 클래스 등). `SymbolKind`, `BadgeKind` union 타입 |
| 1-3 | `src/lib/types/graph.ts` | **GraphNode**, **GraphEdge** — SvelteFlow에 렌더링할 노드와 엣지 |
| 1-4 | `src/lib/types/skeleton.ts` | **SkeletonPayload** — AI에 보낼 프로젝트 요약 포맷 |
| 1-5 | `src/lib/types/semantic.ts` | **SemanticNode**, **SemanticEdge**, **SemanticLevel** — 시맨틱 다이어그램 타입 |

**읽기 포인트:**
- 두 가지 데이터 변환 경로를 머리에 그리세요:
  - **Files**: `FileNode` → `ASTSymbol` → `GraphNode` → SvelteFlow Node
  - **Semantic**: `SkeletonPayload` → AI → `SemanticNode` → SvelteFlow Node
- `graph.ts`의 `NodeKind`와 `ast.ts`의 `SymbolKind`가 유사하지만 다릅니다 — `GraphNode`는 디렉토리와 파일도 포함
- `semantic.ts`의 `SemanticNode.filePaths`가 양방향 연동의 핵심 — 시맨틱 역할과 실제 파일을 매핑

**TS 주의점:**
```ts
// fileTree.ts의 handle 필드
handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
// "|"는 union type: 둘 중 하나
// "?"는 optional: 없을 수도 있음 (fallback input 시)

// semantic.ts의 edge type
type: 'depends_on' | 'calls' | 'extends' | 'uses';
// 4가지 관계 유형만 허용하는 리터럴 유니온
```

---

### Stage 2. 데이터 파이프라인 — "파일 → AST → 그래프"

사용자가 폴더를 열면 데이터가 변환되는 흐름을 따라갑니다.

| 순서 | 파일 | 핵심 내용 |
|------|------|-----------|
| 2-1 | `src/lib/utils/languageDetector.ts` | 확장자 → 언어 매핑. `Record<string, string>` 딕셔너리 |
| 2-2 | `src/lib/services/fileSystemService.ts` | **openDirectory** (File System Access API), **readDirectoryRecursive** (재귀 스캔 → `FileNode` 트리) |
| 2-3 | `src/lib/workers/parserWorker.ts` | **Web Worker** — tree-sitter WASM으로 코드 파싱. `onmessage`로 수신, `postMessage`로 결과 반환 |
| 2-4 | `src/lib/services/parserService.ts` | Worker 관리자 — 초기화, 파싱 요청/응답 브릿지. `parseAllFiles`가 메인 진입점 |
| 2-5 | `src/lib/services/graphBuilder.ts` | **핵심 파일** — `buildGraph()`: FileNode + astMap → GraphNode[] + GraphEdge[]. `toFlowNodes/toFlowEdges`: SvelteFlow 변환 |
| 2-6 | `src/lib/services/semanticGraphBuilder.ts` | `toSemanticFlowNodes/Edges()`: SemanticLevel → SvelteFlow 변환 + dagre LR 레이아웃 |

**읽기 포인트:**

**2-2 fileSystemService.ts:**
- `readDirectoryRecursive`는 `for await...of` 비동기 이터레이터를 사용 — 디렉토리 항목을 하나씩 비동기로 읽음
- `ScanContext` 객체로 파일 카운트를 재귀 함수 간에 공유 (MAX_FILES=2000 제한)
- `handleFallbackInput`은 `showDirectoryPicker`를 지원하지 않는 브라우저용 대안

**2-3 parserWorker.ts:**
- `/// <reference lib="webworker" />` — TS에게 이 파일이 Worker 환경임을 알림
- `self.onmessage` — Worker가 메인 스레드 메시지를 받는 방법
- `extractPythonSymbols` / `extractJSSymbols` — 언어별 AST 노드 타입이 다름

**2-5 graphBuilder.ts:**
- `buildGraph()`가 이 프로젝트의 핵심 함수
- stack 기반 DFS(깊이 우선 탐색)로 트리 순회
- `resolveImportTarget` — 상대 경로 import를 실제 파일 노드로 매핑
- `applyTreeLayout` — 파일 탐색기 스타일의 들여쓰기 레이아웃
- `applyGroupLayout` — dagre 라이브러리로 아키텍처 그룹 배치

**2-6 semanticGraphBuilder.ts:**
- dagre `rankdir: 'LR'` (좌→우) 레이아웃, 노드 크기 280x160px
- 엣지 타입별 색상 분기 (depends_on: slate, calls: blue, extends: purple, uses: green)
- 이 파일은 AI 분석 결과를 캔버스에 그리는 마지막 변환 단계

**TS 주의점:**
```ts
// parserWorker.ts에서 discriminated union 패턴
type WorkerMessage = InitMessage | ParseMessage;
// msg.type이 'init'이면 InitMessage, 'parse'이면 ParseMessage
// → if (msg.type === 'init') 안에서 TS가 자동으로 타입을 좁혀줌 (narrowing)
```

---

### Stage 3. 상태 관리 — "앱의 뇌"

Svelte 5 runes 기반의 싱글턴 스토어들입니다. 모두 같은 패턴을 따릅니다.

| 순서 | 파일 | 역할 |
|------|------|------|
| 3-1 | `src/lib/stores/projectStore.svelte.ts` | **프로젝트 핵심 상태** — fileTree, astMap, isLoading, parsingProgress |
| 3-2 | `src/lib/stores/graphStore.svelte.ts` | **그래프 상태** — nodes, edges, expandedIds, viewport |
| 3-3 | `src/lib/stores/selectionStore.svelte.ts` | **선택 상태** — selectedNode, breadcrumb 경로 계산 |
| 3-4 | `src/lib/stores/semanticStore.svelte.ts` | **시맨틱 상태** — currentLevel, drilldownPath, viewMode, cache, selectedSemanticNode |
| 3-5 | `src/lib/stores/settingsStore.svelte.ts` | **설정** — API 키, 캐시, 언어. localStorage 영속화 |
| 3-6 | `src/lib/stores/authStore.svelte.ts` | **인증** — BYOK/Bridge 트랙 결정 |
| 3-7 | `src/lib/stores/architectureStore.svelte.ts` | **아키텍처 분석** — AI가 생성한 그룹 정보 (레거시) |
| 3-8 | `src/lib/stores/chatStore.ts` | **채팅** — 유일하게 Svelte 4 writable 스토어 사용 |

**스토어 패턴 (모든 .svelte.ts 파일 공통):**
```ts
function createXxxStore() {
  let value = $state(초기값);      // 반응형 상태 선언
  return {
    get value() { return value; },  // getter
    set value(v) { value = v; },    // setter
    someMethod() { ... },           // 상태 변경 메서드
  };
}
export const xxxStore = createXxxStore(); // 싱글턴 export
```
- 이 패턴이 모든 `.svelte.ts` 스토어에서 동일하게 반복됩니다
- 클로저(closure)로 `$state` 변수를 캡슐화하고, getter/setter로 외부에 노출
- chatStore만 예외: Svelte 4의 `writable()` 사용

**3-4 semanticStore (핵심 스토어):**
- `viewMode: 'semantic' | 'filetree'` — 현재 캔버스가 어떤 뷰인지 결정
- `cache: Map<string, SemanticLevel>` — 드릴다운 결과를 캐시 (`'__root__'` 키 = 최상위)
- `drillDown(node)` → 캐시 확인 후 boolean 반환 (true=캐시 히트, false=AI 호출 필요)
- `findSemanticNodeForFile(filePath)` → 파일 경로로 소속 시맨틱 노드 역조회 (양방향 연동)
- `highlightedFilePaths` derived getter — 선택된 시맨틱 노드의 filePaths 반환

**3-5 settingsStore:**
- `persist()` 함수가 매 setter 호출마다 localStorage에 저장
- `typeof window !== 'undefined'` 체크 — SSR이 아닌 환경 방어 코드

**3-6 authStore:**
- `activeTrack`이 computed (getter) — bridge 연결 > API 키 > none 우선순위

---

### Stage 4. AI/외부 연동 — "앱의 두뇌"

| 순서 | 파일 | 핵심 내용 |
|------|------|-----------|
| 4-1 | `src/lib/services/skeletonExtractor.ts` | 프로젝트 구조를 AI가 읽을 수 있는 JSON으로 변환. `extractSubSkeleton()` — 드릴다운용 부분 스켈레톤 추출 |
| 4-2 | `src/lib/utils/contextBuilder.ts` | 선택된 노드의 컨텍스트를 시스템 프롬프트로 조합 |
| 4-3 | `src/lib/services/aiService.ts` | **AI 채팅** — Gemini API 호출, 캐시 조회/저장, Bridge 분기 |
| 4-4 | `src/lib/services/semanticAnalysisService.ts` | **시맨틱 분석** — `analyzeTopLevel()` (전체), `analyzeDrilldown()` (하위). AI→JSON→SemanticLevel 파싱 |
| 4-5 | `src/lib/services/architectureService.ts` | **아키텍처 분석** (레거시) — 스켈레톤 → AI → 그룹 파싱 |
| 4-6 | `src/lib/services/bridgeService.ts` | WebSocket 기반 로컬 브릿지 연결 (로컬 LLM 용) |
| 4-7 | `src/lib/services/embeddingService.ts` | Gemini embedding API — 캐시 유사도 검색용 |
| 4-8 | `src/lib/services/cacheService.ts` | Orama(벡터 DB) + IndexedDB로 AI 응답 캐싱 |

**읽기 포인트:**

**4-1 skeletonExtractor.ts:**
- `extractSkeleton()` — 전체 프로젝트의 파일+심볼을 AI 친화적 JSON으로 요약
- `extractSubSkeleton(filePaths, fileTree, astMap)` — 특정 파일 경로만으로 부분 스켈레톤 생성 (드릴다운 분석용)

**4-3 aiService.ts:**
- `sendMessage()`의 분기 흐름: track 확인 → 캐시 조회 → API 호출 → 캐시 저장
- 429 (Rate Limit) 시 지수 백오프 재시도: `Math.pow(2, attempt) * 1000`ms
- `buildRequestBody` — Gemini API의 multi-turn 대화 포맷

**4-4 semanticAnalysisService.ts:**
- `TOP_LEVEL_SYSTEM_PROMPT` — 프로젝트 전체를 3-7개 시맨틱 역할로 분류하라는 지시
- `DRILLDOWN_SYSTEM_PROMPT` — 특정 도메인 내부를 하위 역할로 분해하라는 지시
- `parseSemanticLevel()` — AI 응답에서 JSON 추출, `sem:` ID 프리픽스 부여, `SEMANTIC_COLORS` 8색 순환
- `callAI()` — authStore.activeTrack에 따라 bridge/byok 라우팅

**4-6 bridgeService.ts:**
- `pendingRequests` Map으로 비동기 요청/응답 매칭 (id 기반)
- `ws.onclose`에서 모든 pending 요청을 reject — 깔끔한 정리

---

### Stage 5. UI 컴포넌트 — "사용자가 보는 것"

마지막으로 화면을 구성하는 컴포넌트들입니다.

| 순서 | 파일 | 역할 |
|------|------|------|
| 5-1 | `src/routes/+page.svelte` | **앱 루트** — 전체 레이아웃, 조건부 렌더링, 모달 관리. FileExplorer 사이드바 + 캔버스 영역 |
| 5-2 | `src/routes/+layout.svelte` | 글로벌 레이아웃 (CSS import 등) |
| 5-3 | `src/lib/components/Dropzone.svelte` | 파일/폴더 드롭 → fileSystemService 호출 → 파싱 시작 |
| 5-4 | `src/lib/components/ZUICanvas.svelte` | **가장 복잡한 컴포넌트** — SvelteFlow 래퍼. viewMode에 따라 두 렌더링 경로 분기 |
| 5-5 | `src/lib/components/nodes/*.svelte` | 커스텀 노드 5종: Directory, File, Symbol, ArchitectureGroup, **Semantic** |
| 5-6 | `src/lib/components/FileExplorer.svelte` | **IDE식 파일 탐색기 사이드바** — 검색, 트리, 양방향 하이라이트 |
| 5-7 | `src/lib/components/NodeDetailPanel.svelte` | 노드 선택 시 코드/상세 표시 |
| 5-8 | `src/lib/components/ChatPopup.svelte` | AI 채팅 UI |
| 5-9 | `src/lib/components/Header.svelte` | 상단 헤더 — 프로젝트명, AI 분석 버튼, **뷰 모드 토글** (Semantic/Files) |
| 5-10 | `src/lib/components/Breadcrumb.svelte` | 파일트리 경로 / **시맨틱 드릴다운 경로** 표시 |
| 5-11 | 나머지 | LoadingOverlay, OnboardingModal 등 |

**읽기 포인트:**

**5-1 +page.svelte:**
- `$derived` — `hasProject`, `hasSelection`이 스토어 값에서 자동 파생
- `{#if}...{:else if}...{:else}` 조건 블록으로 상태별 UI 분기
- 레이아웃: `FileExplorer | canvas-area` 가로 분할 구조

**5-4 ZUICanvas.svelte (핵심 — viewMode 분기):**
- **Effect 1a** (시맨틱): `semanticStore.currentLevel` → `toSemanticFlowNodes/Edges` → 캔버스 렌더링
- **Effect 1b** (파일트리): `graphStore` → 기존 파일트리 그래프 렌더링
- **Effect 2, 3**: `viewMode === 'semantic'` 가드로 파일트리 전용 로직 스킵
- `handleNodeClick`: 노드 타입에 따라 selectionStore 또는 semanticStore에 선택 전달
- `handleNodeDblClick`: 시맨틱 노드 → `drillDown()` 호출 → 캐시 미스 시 AI 분석 트리거
- 분석 중 스피너 오버레이 (`.analyzing-overlay`) 표시

**5-5 SemanticNode.svelte:**
- 280x160 라운드 박스, 색상 배경 + 보더
- 핵심 심볼 태그 (최대 4개 + "+N"), 파일 수 뱃지, 드릴다운 힌트 아이콘
- `highlighted` 클래스: 파란색 글로우 (Explorer에서 파일 클릭 시)

**5-6 FileExplorer.svelte:**
- 260px 고정 너비 사이드바, 토글(숨기기/복원) 가능
- 실시간 검색 필터링: 파일명/디렉토리명 부분 일치
- `highlightedPaths` derived → semanticStore.highlightedFilePaths 구독 → 노란 배경 하이라이트
- `handleFileClick()` → graphStore 노드 선택 + semanticStore 역방향 하이라이트

---

## Part D. 읽기 요약 체크리스트

- [ ] **Part A**: 배경지식 HTML 페이지 읽기 ([TS 패턴](./knowledge/typescript-patterns.html), [프론트엔드 스택](./knowledge/frontend-ecosystem.html), [도메인 지식](./knowledge/domain-concepts.html))
- [ ] **Stage 1**: 5개 타입 파일 읽고, Files/Semantic 두 데이터 변환 경로 이해
- [ ] **Stage 2**: 폴더 스캔 → Worker 파싱 → 그래프 빌드 + 시맨틱 그래프 빌드 파이프라인 추적
- [ ] **Stage 3**: 스토어 패턴 이해하고, 특히 semanticStore의 viewMode/cache/drilldown 흐름 파악
- [ ] **Stage 4**: AI 호출 흐름 (skeleton → AI → parse → cache) 이해
- [ ] **Stage 5**: ZUICanvas의 viewMode 분기, FileExplorer의 양방향 연동 흐름 추적

---

## Part E. 파일 간 의존 관계 요약

```
types/        → 모든 곳에서 import (fileTree, ast, graph, skeleton, semantic)
utils/        → services, stores에서 import
stores/       → services, components에서 import (의존 방향 주의)
services/     → components에서 호출
workers/      → services/parserService.ts에서만 사용
components/   → +page.svelte에서 조합
```

**핵심 규칙:** stores는 다른 stores를 import할 수 있지만 (예: authStore→settingsStore),
services는 stores를 import하고, components는 둘 다 import합니다.
역방향(stores가 components를 import)은 없습니다.

**주요 의존 체인:**
```
semanticAnalysisService → authStore, settingsStore, semanticStore, skeletonExtractor
ZUICanvas → graphStore, semanticStore, selectionStore, semanticGraphBuilder
FileExplorer → projectStore, graphStore, semanticStore, selectionStore
Header → semanticStore (viewMode 토글), projectStore
Breadcrumb → selectionStore (파일트리), semanticStore (시맨틱 드릴다운 경로)
```

---

## Part F. 자주 등장하는 패턴 정리

| 패턴 | 사용처 | 설명 |
|------|--------|------|
| Stack 기반 DFS | graphBuilder, fileSystemService | 재귀 대신 while+stack으로 트리 순회 |
| Message-passing | parserWorker↔parserService | postMessage/onmessage로 Worker 통신 |
| Pending Map | parserService, bridgeService | id로 요청/응답을 매칭하는 비동기 패턴 |
| Closure 싱글턴 | 모든 .svelte.ts 스토어 | createXxxStore() 팩토리로 상태 캡슐화 |
| Discriminated Union | WorkerMessage, AuthTrack | type 필드로 메시지 종류를 구분 |
| ViewMode 가드 | ZUICanvas의 모든 $effect | `viewMode === 'semantic'`으로 경로 분기, 크로스 오염 방지 |
| Cache-first 패턴 | semanticStore.drillDown() | 캐시 확인 → 히트면 즉시 반환, 미스면 AI 호출 |
| 양방향 derived | semanticStore↔FileExplorer | `highlightedFilePaths` / `findSemanticNodeForFile()` 양방향 조회 |
| Spread-before-mutate | FileExplorer 등 | `[...array].sort()` — Svelte 5 Proxy 상태의 in-place 변경 방지 |
