# CodeViz — PRD (Living Document)

**최종 업데이트**: 2026-03-03
**버전**: 0.5.1
**상태**: Semantic Diagram MVP + 구문 하이라이팅 + CodeViewer 버그 수정 완성 / 확장 기능 기획 중

---

## 1. 프로젝트 개요

CodeViz는 임의의 코드베이스를 브라우저에서 분석하여 **AI 기반 의미론적 아키텍처 다이어그램**으로 시각화하는 **Local-First 웹 애플리케이션**입니다.

**AI가 프로젝트의 역할과 구조를 분석하여 최상위 레벨의 의미론적 다이어그램을 생성**하고, 각 영역을 클릭하면 **동적으로 해당 영역의 하위 역할을 AI가 추가 분석**하는 재귀적 드릴다운 UX를 제공합니다.

### 핵심 가치
- **Semantic-First**: 메인 캔버스는 AI가 분석한 역할 기반 다이어그램 (파일 트리가 아님)
- **Recursive Drill-down**: 영역 클릭 → AI 추가 분석 → 하위 역할 다이어그램 동적 생성
- **Dual View**: 메인(semantic diagram) + 사이드바(IDE식 파일 탐색기), 양방향 연동
- **Zero Friction**: URL 접속 → 폴더 드롭 → AST 파싱 → AI 분석 → 다이어그램
- **Instant Try**: 폴더 드롭 없이 코드 스니펫으로 즉시 체험 (프리셋 예제 + 텍스트 입력)
- **Polyglot**: 단일 프로젝트 내 여러 프로그래밍 언어를 동시 분석 (Python, JS, Go, Rust, Java, C/C++ 등)
- **100% Local-First**: 소스 코드가 브라우저 밖으로 나가지 않음 (WASM 파싱)
- **BYOK**: 서버 비용 0원, 사용자 API 키 또는 Edge Proxy로 LLM 호출

### 현재 vs 목표

| | 현재 상태 (v0.5) | 목표 (v1.0) |
|---|---|---|
| **메인 캔버스** | ✅ AI 의미론적 다이어그램 (역할/도메인 노드) | 멀티 언어 + 대규모 프로젝트 지원 |
| **드릴다운** | ✅ AI 추가 분석 → 하위 역할 다이어그램 생성 | 캐시 최적화 + 오프라인 지원 |
| **파일 탐색** | ✅ IDE식 사이드바 File Explorer | 검색 + 필터 고도화 |
| **코드 뷰어** | ✅ 8개 언어 구문 하이라이팅 + 12개 테마 | 코드 인라인 프리뷰 |
| **코드 스니펫** | 없음 | JSFiddle식 코드 입력 → 즉시 분석 |
| **언어 지원** | 구문 하이라이팅 8개 / AST 파싱 Python, JS, TS (3개) | 13개 언어 tree-sitter WASM 파싱 |
| **Bridge** | WebSocket 클라이언트만 | `npx @codeviz/bridge` 서버 패키지 |
| **CI** | 빌드만 | Lint + Unit Test + E2E + GitHub Actions |

---

## 2. 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| 프레임워크 | SvelteKit + Svelte 5 (runes) | adapter-static, SSR 없음 |
| 그래프 렌더링 | @xyflow/svelte (SvelteFlow) v1.x | 노드/엣지 시각화, fitView, 줌/패닝 |
| AST 파싱 | web-tree-sitter (WASM) v0.24 | Web Worker에서 파싱. 현재 Python/JS/TS, Tier 1 추가 예정: Go, Rust, Java, C/C++ |
| 그래프 레이아웃 | @dagrejs/dagre v1.1 | 트리/계층 레이아웃 |
| 검색 | @orama/orama v3.1 | 브라우저 내장 벡터/키워드 검색 |
| 코드 하이라이팅 | prismjs v1.30 + prism-themes | 8개 언어, 12개 테마 (Vite `?inline`으로 동적 주입) |
| 마크다운 렌더링 | marked v17 | 채팅 메시지 렌더링 |
| 테스트 | Playwright v1.58 | E2E 테스트 (설정 예정) |
| 빌드 | Vite v6.3 | dev server 미들웨어 플러그인 지원 |

---

## 3. 아키텍처 및 디렉토리 구조

```
src/
├── routes/
│   ├── +page.svelte          # 메인 페이지 (레이아웃 + testDir 감지)
│   ├── +layout.svelte        # 전역 레이아웃 (테마 CSS 주입)
│   └── +layout.ts            # SSR 비활성화 (ssr = false)
│
├── lib/
│   ├── stores/               # Svelte 5 rune 기반 모듈 싱글턴 스토어
│   │   ├── projectStore.svelte.ts   # 파일 트리, AST 맵, 파싱 진행률 ($state.raw)
│   │   ├── graphStore.svelte.ts     # 그래프 노드/엣지, 확장/접기, 유틸리티 노드
│   │   ├── selectionStore.svelte.ts # 선택된 노드 상태
│   │   ├── architectureStore.svelte.ts # AI 그룹화 결과, 활성화 상태
│   │   ├── semanticStore.svelte.ts  # 시맨틱 다이어그램 레벨, 드릴다운 스택, AI 분석 상태
│   │   ├── authStore.svelte.ts      # API 키, 인증 모드 (none/BYOK/Bridge)
│   │   ├── settingsStore.svelte.ts  # 사용자 설정 (API키, 캐시, 언어, 코드 테마)
│   │   ├── chatStore.ts             # 채팅 메시지 히스토리
│   │   ├── i18nStore.ts             # 다국어 지원
│   │   └── themeStore.ts            # 다크/라이트 테마
│   │
│   ├── services/             # 순수 함수 / stateless 모듈
│   │   ├── fileSystemService.ts     # File System Access API 래퍼 + fallback handle 래퍼
│   │   ├── parserService.ts         # Web Worker 통신 (parseFile, parseAllFiles)
│   │   ├── graphBuilder.ts          # FileNode → GraphNode/Edge 변환, 레이아웃
│   │   ├── skeletonExtractor.ts     # AST → LLM 전송용 스켈레톤 JSON 추출
│   │   ├── architectureService.ts   # LLM 아키텍처 분석 요청/파싱
│   │   ├── semanticAnalysisService.ts # 시맨틱 AI 분석 (최상위 + 드릴다운)
│   │   ├── semanticGraphBuilder.ts  # 시맨틱 노드 → SvelteFlow 노드/엣지 변환
│   │   ├── syntaxThemeService.ts    # Prism 테마 CSS 동적 주입 관리
│   │   ├── aiService.ts             # Gemini API 직접 호출 (BYOK)
│   │   ├── bridgeService.ts         # 로컬 Bridge WebSocket 연결 (ws://localhost:9876)
│   │   ├── embeddingService.ts      # 온디맨드 임베딩 (Orama)
│   │   ├── cacheService.ts          # IndexedDB 시맨틱 캐시
│   │   └── testLoader.ts            # dev 전용 테스트 프로젝트 로더
│   │
│   ├── components/           # Svelte 5 컴포넌트 ($props 패턴)
│   │   ├── ZUICanvas.svelte         # 메인 그래프 캔버스 (SvelteFlow)
│   │   ├── ZUIGroupController.svelte # 그룹 줌 트랜지션 컨트롤러
│   │   ├── Dropzone.svelte          # 폴더 드래그앤드롭 진입점
│   │   ├── Header.svelte            # 상단 헤더 (AI 분석 토글)
│   │   ├── Breadcrumb.svelte        # 경로 네비게이션
│   │   ├── NodeDetailPanel.svelte   # 선택 노드 상세 정보
│   │   ├── SemanticDetailPanel.svelte # 시맨틱 노드 상세 패널
│   │   ├── CodeViewer.svelte        # 코드 뷰어 (8개 언어 Prism 하이라이팅 + 심볼 사이드바)
│   │   ├── CodePanel.svelte         # 코드 스니펫 패널 (Prism 하이라이팅)
│   │   ├── ChatPopup.svelte         # AI 채팅 팝업
│   │   ├── ChatMessage.svelte       # 채팅 메시지 버블
│   │   ├── ConnectModal.svelte      # 투 트랙 인증 모달 (BYOK/Bridge)
│   │   ├── OnboardingModal.svelte   # 첫 사용 온보딩 가이드
│   │   ├── SettingsModal.svelte     # 설정 모달 (코드 테마 드롭다운 포함)
│   │   ├── LoadingOverlay.svelte    # 파싱 진행률 오버레이
│   │   ├── ErrorBanner.svelte       # 에러 배너
│   │   ├── FileExplorer.svelte      # IDE식 파일 트리뷰 사이드바
│   │   ├── HeroIllustration.svelte  # 랜딩 페이지 히어로 일러스트
│   │   ├── Tooltip.svelte           # 툴팁
│   │   └── nodes/                   # SvelteFlow 커스텀 노드 타입
│   │       ├── DirectoryNode.svelte
│   │       ├── FileNode.svelte
│   │       ├── SymbolNode.svelte
│   │       ├── ArchitectureGroupNode.svelte
│   │       └── SemanticNode.svelte  # 시맨틱 다이어그램 노드
│   │
│   ├── workers/
│   │   └── parserWorker.ts          # Web Worker: tree-sitter WASM 파싱
│   │
│   ├── types/                # TypeScript 인터페이스
│   │   ├── fileTree.ts              # FileNode (디렉토리/파일 트리)
│   │   ├── ast.ts                   # SymbolInfo (파싱된 심볼)
│   │   ├── graph.ts                 # GraphNode, GraphEdge
│   │   ├── semantic.ts              # SemanticNode, SemanticEdge, SemanticLevel
│   │   ├── skeleton.ts             # LLM 전송용 스켈레톤 타입
│   │   └── search.ts               # 검색 관련 타입
│   │
│   └── utils/
│       ├── languageDetector.ts      # 확장자 → 언어 매핑, isSupported()
│       └── contextBuilder.ts        # 채팅용 코드 컨텍스트 구성
│
├── static/                   # tree-sitter WASM 바이너리
│   └── tree-sitter-*.wasm
│
└── scripts/
    └── vite-dev-fs-plugin.js        # dev 전용 파일시스템 미들웨어
```

---

## 4. 핵심 데이터 흐름

### Phase 1: 로컬 스캔 및 파싱
```
사용자 폴더 드롭
  → File System Access API (showDirectoryPicker)
  → fileSystemService.readDirectoryRecursive()
  → FileNode 트리 생성 (projectStore.fileTree)
  → parserService.parseAllFiles() [Web Worker]
  → SymbolInfo[] 맵 생성 (projectStore.astMap)
```

### Phase 2: AI 의미론적 분석 (핵심 흐름)
```
AST 파싱 완료
  → skeletonExtractor.extractSkeleton()     # 코드 제외 뼈대만 추출
  → AI 인증 (BYOK / Edge Proxy / Bridge)
  → architectureService.analyzeArchitecture()
  → 최상위 의미론적 다이어그램 생성
    → 역할 기반 노드 (예: "인증 시스템", "데이터 파이프라인", "API 레이어")
    → 역할 간 관계 엣지
  → SvelteFlow 렌더링 (메인 캔버스)
```

### Phase 3: 재귀적 드릴다운
```
사용자가 의미론적 영역 클릭
  → 해당 영역에 속한 파일들의 스켈레톤 재추출
  → AI 추가 분석 요청 (하위 역할 분석)
  → 하위 의미론적 다이어그램 생성
  → 메인 캔버스 업데이트 + 브레드크럼 네비게이션
  → File Explorer 사이드바 해당 디렉토리로 자동 이동
```

### Phase 4 (구현 완료): 파일 트리 그래프 렌더링 (Fallback)
```
AI 미연결 시 또는 디버그용
  → graphBuilder.buildGraph(fileTree, astMap)
    → filterBlacklistedNodes()     # 블랙리스트 필터링
    → identifyUtilityNodes()       # 유틸리티 노드 식별
    → applyTreeLayout() [dagre]    # 트리 레이아웃 계산
  → GraphNode[] / GraphEdge[] → graphStore
  → toFlowNodes() / toFlowEdges() → SvelteFlow 렌더링
```

### Phase 5 (미구현): 코드 스니펫 즉시 분석
```
초기 화면 코드 에디터 / 프리셋 선택
  → 인메모리 가상 FileNode 생성 (단일 파일)
  → parserService.parseFile() [Web Worker]
  → skeletonExtractor.extractSkeleton()
  → AI 시맨틱 분석
  → 다이어그램 렌더링
```

---

## 5. 요구사항 ID 체계

요구사항은 **접두사-번호** 형태로 관리합니다. 접두사는 기능 도메인을 나타냅니다.

| 접두사 | 의미 | 설명 |
|:------:|------|------|
| **V** | **Vision** | 핵심 비전 기능 — 프로젝트의 존재 이유인 시맨틱 다이어그램, 드릴다운, File Explorer 등 |
| **F** | **Feature** | 기반/보조 기능 — 프로젝트 로딩, 인증, 파일 트리 그래프 등 핵심을 지탱하는 기능 |
| **C** | **Code** | 코드 뷰어 관련 — 구문 하이라이팅, 테마, 심볼 네비게이션 |
| **S** | **Snippet** | 코드 스니펫 즉시 분석 — 폴더 드롭 없는 즉시 체험 기능 |
| **L** | **Language** | 프로그래밍 언어 확장 — WASM 문법 추가, 심볼 추출기 |
| **B** | **Bridge** | Bridge 서버 연동 — Claude Code 로컬 중개 서버 |
| **R** | **Retrieval** | 검색 기능 — 파일/심볼 검색, Orama 인덱스 |
| **U** | **UX** | 사용자 경험 개선 — 인라인 프리뷰, 내보내기, 단축키 등 |
| **NFR** | **Non-Functional** | 비기능 요구사항 — 성능, 보안, 접근성, 호환성 |
| **CI** | **CI/Quality** | 지속적 통합 및 품질 — 린트, 테스트, 파이프라인 |

**번호 규칙**: 각 그룹 내에서 1부터 순차 부여. 예) `V1`, `V2`, `F1`, `CI1`

---

## 6. 기능 요구사항 — 구현 완료

### V1: AI 의미론적 다이어그램

| ID | 기능 | 구현 파일 |
|----|------|-----------|
| V1-1 | 최상위 의미론적 다이어그램 생성 | `semanticAnalysisService.ts`, `SemanticNode.svelte`, `semanticStore.svelte.ts` |
| V1-2 | 재귀적 AI 드릴다운 | `semanticStore.drillDown()`, `analyzeDrilldown()` |
| V1-3 | 브레드크럼 네비게이션 | `Breadcrumb.svelte` + `semanticStore` 연동 |
| V1-4 | 다이어그램 ↔ File Explorer 양방향 연동 | 시맨틱 노드 클릭 → Explorer 하이라이트, 역방향 지원 |
| V1-5 | 엣지 타입별 시각화 (depends_on, calls, extends, uses) | `ZUICanvas.svelte` |
| V1-6 | 엣지 타입 레전드 토글 | `ZUICanvas.svelte` |
| V1-7 | 시맨틱 노드 상세 패널 | `SemanticDetailPanel.svelte` |
| V1-8 | 노드 하이라이트 (glow + dimming) | `ZUICanvas.svelte` |
| V1-9 | 다이어그램 UI 다국어 대응 | `i18nStore.ts`, `semanticAnalysisService.ts` |

**DoD — 기능 기준**:
- AI 연결 후 폴더 파싱 완료 시 자동으로 최상위 다이어그램이 3~7개 역할 노드로 렌더링된다
- 노드 더블클릭 시 하위 역할 다이어그램으로 전환되며 브레드크럼이 업데이트된다
- 브레드크럼 클릭으로 상위 레벨로 복귀할 수 있다
- 노드 선택 시 관련 엣지가 하이라이트되고 비관련 노드가 dimming된다
- 엣지 레전드에서 특정 타입을 토글하면 해당 엣지만 표시/숨김된다

**DoD — 흐름 기준**:
- 드릴다운 → 브레드크럼 복귀 시 이전 레벨의 다이어그램이 정상 렌더링된다
- 분석 로딩 중 다른 노드 클릭 시 이전 요청이 완료된 후 결과가 표시된다
- Code 모드 ↔ Semantic 모드 전환 시 각 모드의 상태가 독립적으로 유지된다
- 빈 결과(노드 0개) 반환 시 사용자에게 피드백이 표시된다
- AI 미연결 시 시맨틱 뷰 전환 버튼이 비활성화된다

---

### V2: File Explorer 사이드바

| ID | 기능 | 구현 파일 |
|----|------|-----------|
| V2-1 | IDE식 파일 트리뷰 | `FileExplorer.svelte` |
| V2-2 | 파일 선택 → Code 모드 전환 | `CodeViewer.svelte` |
| V2-3 | 다이어그램 영역 클릭 시 자동 네비게이션 | 시맨틱 노드 → 소속 파일/디렉토리 매핑 |

**DoD — 기능 기준**:
- 프로젝트 로딩 후 좌측 사이드바에 파일 트리가 렌더링된다
- 폴더 접기/펼치기가 동작한다
- 시맨틱 노드 클릭 시 해당 소속 파일이 Explorer에서 하이라이트된다
- Explorer에서 파일 클릭 시 Code 모드로 전환되어 코드가 표시된다

**DoD — 흐름 기준**:
- 파일 클릭 후 디테일 패널을 닫아도 코드 뷰어의 내용이 유지된다
- 파일 A를 보는 중 파일 B를 클릭하면 B의 내용으로 교체된다
- 비지원 확장자 파일(`.md`, `.json` 등) 클릭 시 plain text로 표시된다
- Dev 테스트 모드(`?testDir=`)에서도 파일 내용이 정상 로드된다

---

### F1: 프로젝트 로딩 및 파싱

| ID | 기능 | 구현 파일 |
|----|------|-----------|
| F1-1 | File System Access API 폴더 선택 | `fileSystemService.ts` |
| F1-2 | 드래그앤드롭 폴더 업로드 | `Dropzone.svelte` |
| F1-3 | webkitdirectory 입력 fallback (비-localhost) | `fileSystemService.ts` (ADR-6) |
| F1-4 | 재귀적 디렉토리 스캔 (MAX_FILES=2000, MAX_FILE_SIZE=500KB) | `fileSystemService.ts` |
| F1-5 | web-tree-sitter WASM AST 파싱 (Web Worker) | `parserWorker.ts`, `parserService.ts` |
| F1-6 | 파싱 진행률 UI | `LoadingOverlay.svelte`, `projectStore.parsingProgress` |
| F1-7 | Dev 테스트 모드 (?testDir= URL 파라미터) | `testLoader.ts`, `vite-dev-fs-plugin.js` |

**DoD — 기능 기준**:
- 폴더 드롭 또는 선택 후 파일 트리가 `projectStore.fileTree`에 저장된다
- 지원 언어 파일이 Web Worker에서 파싱되어 `projectStore.astMap`에 심볼이 등록된다
- 진행률 바가 0% → 100%으로 표시된다
- `node_modules`, `.git` 등 블랙리스트 디렉토리가 제외된다
- 비-localhost HTTP 환경에서도 fallback 입력으로 정상 파싱된다

**DoD — 흐름 기준**:
- MAX_FILES(2000) 초과 프로젝트 시 경고 메시지가 표시되고 일부 파일만 로드된다
- 파싱 도중 에러가 발생한 파일은 건너뛰고 나머지가 정상 파싱된다
- Dev 테스트 모드(`?testDir=`)에서 `/__dev/scan` → `/__dev/read` 파이프라인이 절대경로 기반으로 동작한다
- 프로젝트 재로드(다른 폴더 드롭) 시 이전 데이터가 완전히 초기화된다

---

### F2: AI 인증 및 채팅

| ID | 기능 | 구현 파일 |
|----|------|-----------|
| F2-1 | BYOK — Gemini API | `aiService.ts`, `ConnectModal.svelte` |
| F2-2 | BYOK — Anthropic API | `aiService.ts`, `ConnectModal.svelte` |
| F2-3 | Local Bridge WebSocket 연결 | `bridgeService.ts`, `ConnectModal.svelte` |
| F2-4 | 온보딩 모달 (트랙 선택) | `OnboardingModal.svelte` |
| F2-5 | AI 채팅 팝업 | `ChatPopup.svelte`, `ChatMessage.svelte` |
| F2-6 | 스켈레톤 기반 코드 컨텍스트 전송 | `skeletonExtractor.ts`, `contextBuilder.ts` |

**DoD — 기능 기준**:
- BYOK 모드에서 API 키 입력 후 AI 분석이 동작한다
- Bridge 모드에서 WebSocket 연결 후 AI 분석이 동작한다
- 채팅 팝업에서 코드 관련 질문에 AI가 답변한다
- 코드 컨텍스트(스켈레톤)가 API 페이로드에 포함된다

**DoD — 흐름 기준**:
- 잘못된 API 키 입력 시 명확한 에러 메시지가 표시된다
- API 키 저장 → 페이지 새로고침 후에도 키가 유지된다 (localStorage)
- BYOK ↔ Bridge 모드 전환 시 이전 모드의 연결이 정리된다
- Bridge 연결 실패 시 사용자에게 피드백이 표시되고 BYOK fallback이 가능하다

---

### F3: UI/UX 공통

| ID | 기능 | 구현 파일 |
|----|------|-----------|
| F3-1 | 다크/라이트 테마 전환 | `themeStore.ts`, `Header.svelte` |
| F3-2 | 한국어/영어 다국어 지원 | `i18nStore.ts` |
| F3-3 | 설정 모달 (API, 캐시, 언어, 코드 테마) | `SettingsModal.svelte` |
| F3-4 | 에러 배너 | `ErrorBanner.svelte` |
| F3-5 | 랜딩 페이지 히어로 일러스트 | `HeroIllustration.svelte` |

**DoD — 기능 기준**:
- 테마 토글 시 전체 UI가 다크/라이트로 전환된다
- 언어 변경 시 모든 UI 텍스트가 해당 언어로 전환된다
- 설정 변경사항이 localStorage에 저장되어 세션 간 유지된다

**DoD — 흐름 기준**:
- 다크/라이트 테마 전환 시 코드 하이라이팅 테마와 충돌하지 않는다
- 설정 모달에서 변경 후 모달을 닫아도 변경사항이 유지된다
- localStorage 데이터 손상 시 기본값으로 복구된다 (JSON.parse 실패 방어)

---

### F4: 캐싱

| ID | 기능 | 구현 파일 |
|----|------|-----------|
| F4-1 | IndexedDB 시맨틱 캐시 | `cacheService.ts` |
| F4-2 | 벡터 유사도 캐시 조회 (threshold 0.9) | `cacheService.ts`, `embeddingService.ts` |
| F4-3 | LRU 캐시 삭제 (MAX=500) | `cacheService.ts` |
| F4-4 | 캐시 초기화 기능 | `SettingsModal.svelte` |

**DoD — 기능 기준**:
- 동일/유사 프로젝트 재분석 시 캐시에서 결과를 가져와 API 호출이 절감된다
- 캐시 크기가 500건 초과 시 LRU 방식으로 자동 삭제된다
- 설정에서 캐시 초기화 버튼으로 전체 캐시를 삭제할 수 있다

**DoD — 흐름 기준**:
- 캐시 히트 시 AI API를 호출하지 않고 캐시 데이터로 다이어그램이 렌더링된다
- 캐시 초기화 후 동일 프로젝트 재분석 시 AI API가 호출된다
- IndexedDB 접근 실패 시 캐시 없이 정상 동작한다 (graceful degradation)

---

### F5: 파일 트리 그래프 (Fallback)

> AI 미연결 시 대체 뷰. v1.0에서 디버그/Fallback 전용으로 전환 예정.

| ID | 기능 | 구현 파일 |
|----|------|-----------|
| F5-1 | 파일 트리 그래프 렌더링 | `graphBuilder.ts`, `ZUICanvas.svelte` |
| F5-2 | AI 아키텍처 그룹 오버레이 | `ArchitectureGroupNode.svelte` |
| F5-3 | 줌 기반 드릴다운 | `ZUICanvas.svelte` |
| F5-4 | 블랙리스트 필터링 | `graphBuilder.ts` |
| F5-5 | 유틸리티 노드 은닉 | `graphBuilder.ts` |

**DoD — 기능 기준**:
- AI 미연결 시 파일 트리 기반 그래프가 렌더링된다
- 블랙리스트 파일(config, lock 등)이 자동 필터링된다

**DoD — 흐름 기준**:
- AI 연결 후 시맨틱 모드에서 파일 트리 모드(Code)로 전환 시 그래프가 정상 렌더링된다
- 파일 트리 모드에서 노드 클릭 시 해당 파일/디렉토리 정보가 표시된다

---

### C1: 코드 뷰어 및 구문 하이라이팅

| ID | 기능 | 구현 파일 |
|----|------|-----------|
| C1-1 | Prism.js 8개 언어 구문 하이라이팅 (python, js, ts, go, rust, java, c, cpp) | `CodeViewer.svelte`, `CodePanel.svelte` |
| C1-2 | 12개 테마 선택 (다크 8 + 라이트 4) | `syntaxThemeService.ts`, `SettingsModal.svelte` |
| C1-3 | 테마 동적 CSS 주입 (런타임 교체) | `syntaxThemeService.ts`, `+layout.svelte` |
| C1-4 | 심볼 사이드바 (함수/클래스/변수 목록) | `CodeViewer.svelte` |
| C1-5 | 심볼 클릭 → 해당 라인 스크롤 | `CodeViewer.svelte` |
| C1-6 | 비지원 언어 plain text fallback | `CodeViewer.svelte` |
| C1-7 | 테마 설정 localStorage 유지 | `settingsStore.svelte.ts` |

**DoD — 기능 기준**:
- 8개 언어 파일에서 구문 하이라이팅이 적용된다
- 설정에서 테마 변경 시 즉시 색상이 반영된다 (다크/라이트 양쪽)
- 비지원 언어 파일은 에러 없이 plain text로 표시된다
- 페이지 새로고침 후에도 선택한 테마가 유지된다
- CodeViewer와 CodePanel 모두 동일한 테마가 적용된다

**DoD — 흐름 기준**:
- 파일 A(Python) → 파일 B(Go) 전환 시 각 언어에 맞는 하이라이팅이 적용된다
- 테마 변경 후 다른 파일 선택 시 새 테마가 유지된다
- 디테일 패널 닫기 후에도 코드 뷰어 내용과 하이라이팅이 유지된다
- Dev 모드(`?testDir=`)에서 `/__dev/read` API를 통해 파일이 정상 로드되고 하이라이팅된다

---

## 7. 기능 요구사항 — 미구현/계획

### S1: 코드 스니펫 즉시 분석 `P0`

> 폴더 드롭 없이 코드 스니펫으로 즉시 체험 가능한 진입점 제공

| ID | 기능 | 설명 |
|----|------|------|
| S1-1 | 코드 에디터 영역 | 랜딩 페이지에 코드 텍스트 입력 영역 (textarea, 향후 Monaco 검토) |
| S1-2 | 언어 선택 드롭다운 | 스니펫 언어 선택 → tree-sitter 문법 자동 매핑 |
| S1-3 | 프리셋 예제 | micrograd, Flask 앱 등 미리 준비된 코드 스니펫 |
| S1-4 | 즉시 분석 버튼 | 입력 코드 → 가상 FileNode → AST → AI 분석 → 다이어그램 |

**DoD**:
- 랜딩 페이지에 코드 에디터 영역이 표시된다
- 언어 드롭다운에서 지원 언어를 선택할 수 있다
- 프리셋 선택 시 해당 코드가 에디터에 로드된다
- "분석" 버튼 클릭 시 폴더 드롭 없이 시맨틱 다이어그램이 생성된다
- 가상 FileNode가 내부적으로 생성되어 기존 파싱/분석 파이프라인을 재사용한다

---

### L1: 확장 언어 지원 `P0`

> Python/JS/TS 외 주요 언어로 AST 파싱 확장

| ID | 기능 | 설명 |
|----|------|------|
| L1-1 | Tier 1 언어 WASM 추가 (Go, Rust, Java, C/C++) | tree-sitter WASM 문법 + 심볼 추출기 추가 |
| L1-2 | Generic 심볼 추출기 | 전용 추출기 없는 언어를 위한 공통 AST 노드 패턴 fallback |
| L1-3 | 멀티 언어 프로젝트 지원 | 파일별 언어 감지 → 해당 WASM 자동 로드 → 통합 astMap |

**DoD**:
- Tier 1 각 언어에 대해 WASM 파일이 `static/`에 존재한다
- 각 언어 파일에서 function, class, import 심볼이 추출된다
- Generic 추출기가 전용 추출기 없는 언어에서 기본 심볼을 추출한다
- 단일 프로젝트 내 Python + Go + Rust 파일이 혼재 시 모두 파싱된다

---

### L2: Tier 2 언어 추가 `P1`

| ID | 기능 | 설명 |
|----|------|------|
| L2-1 | Ruby, PHP, Swift, Kotlin, C#, Scala WASM 추가 | 각 언어 tree-sitter WASM 문법 + 심볼 추출 |

**DoD**:
- 각 Tier 2 언어 파일에서 기본 심볼이 추출된다
- Generic 추출기 또는 전용 추출기가 적용된다

---

### B1: Bridge 서버 완성 `P1`

> Claude Code와의 로컬 연동을 위한 WebSocket 중개 서버 패키지화

| ID | 기능 | 설명 |
|----|------|------|
| B1-1 | Bridge 서버 패키지 (`npx @codeviz/bridge`) | WebSocket ↔ Claude Code 중개 서버, npm 배포 |
| B1-2 | 자동 재연결 (exponential backoff) | 연결 끊김 시 자동 재연결, 최대 5회 시도 |
| B1-3 | 연결 상태 표시 (글로벌) | 헤더 또는 상태바에 Bridge 연결 상태 아이콘 |

**DoD**:
- `npx @codeviz/bridge` 실행 시 WebSocket 서버가 기동된다
- 클라이언트에서 연결 끊김 후 자동 재연결이 시도된다 (exponential backoff)
- UI에서 연결 상태(연결됨/끊어짐/재연결 중)가 실시간으로 표시된다

---

### R1: 검색 고도화 `P1`

| ID | 기능 | 설명 |
|----|------|------|
| R1-1 | 전역 검색 바 (파일명 + 심볼명) | Orama 인덱스 구축 후 키워드 검색 UI |
| R1-2 | 검색 결과 → 다이어그램/코드 네비게이션 | 검색 결과 클릭 시 해당 노드 포커스 또는 코드 라인으로 이동 |
| R1-3 | 파일 Explorer 필터링 | Explorer 상단 검색 입력으로 파일 트리 실시간 필터 |

**DoD**:
- 검색 바에 키워드 입력 시 매칭되는 파일/심볼 목록이 표시된다
- 결과 클릭 시 해당 위치(다이어그램 노드 또는 코드 라인)로 이동한다

---

### U1: UX 개선 `P2`

| ID | 기능 | 설명 |
|----|------|------|
| U1-1 | 코드 인라인 프리뷰 | 다이어그램 노드 호버 시 해당 코드 프리뷰 툴팁 |
| U1-2 | 다이어그램 PNG/SVG 내보내기 | 현재 뷰를 이미지로 다운로드 |
| U1-3 | 키보드 단축키 | 검색(Ctrl+K), 테마 토글, 뷰 전환 등 |
| U1-4 | 반응형 레이아웃 (모바일 지원) | 768px 이하에서 사이드바 접기 + 캔버스 전체 폭 |
| U1-5 | Edge Proxy 백엔드 | Vercel/CF Edge Function 배포 — 서버리스 AI 프록시 |

**DoD** (각 항목별):
- U1-1: 노드 호버 1초 후 코드 프리뷰가 툴팁으로 표시된다
- U1-2: 내보내기 버튼 클릭 시 PNG 또는 SVG 파일이 다운로드된다
- U1-3: 단축키 목록이 설정/도움말에 표시되며, 해당 액션이 실행된다
- U1-4: 768px 이하 뷰포트에서 사이드바가 접히고 캔버스가 전체 폭을 사용한다
- U1-5: Edge Proxy URL 입력 시 API 키 없이 AI 분석이 가능하다

---

## 8. 비기능 요구사항 (NFR)

| ID | 항목 | 기준 | 상태 |
|----|------|------|:----:|
| NFR-1 | 초기 번들 크기 | < 500KB gzipped (WASM 제외) | 확인 필요 |
| NFR-2 | 파싱 성능 | 1000 파일 프로젝트 파싱 < 30초 | 확인 필요 |
| NFR-3 | 브라우저 지원 | Chrome/Edge 최신 2버전 | Done |
| NFR-4 | 데이터 프라이버시 | 소스 코드가 브라우저 외부로 전송되지 않음 (AI API 호출 시 스켈레톤만 전송) | Done |
| NFR-5 | 접근성 (a11y) | 기본 키보드 네비게이션, ARIA 라벨 | 부분 |
| NFR-6 | 에러 복원 | API 실패 시 fallback 뷰 + 에러 메시지 | Done |
| NFR-7 | 오프라인 지원 | AI 없이도 파일 트리 그래프 + 코드 뷰어 사용 가능 | Done |
| NFR-8 | 설정 영속성 | localStorage 기반 설정/테마/언어 유지 | Done |

---

## 9. CI/품질 요구사항

> **현재 상태**: 테스트 인프라 미구축. Playwright devDependency만 설치됨. `npm run build`만 검증 가능.

### CI1: 린팅 및 포맷팅 `P0`

| ID | 항목 | 설명 |
|----|------|------|
| CI1-1 | ESLint 설정 | `eslint` + `eslint-plugin-svelte` + `@typescript-eslint` |
| CI1-2 | Prettier 설정 | `.prettierrc` + `prettier-plugin-svelte` |
| CI1-3 | `npm run lint` / `npm run format` 스크립트 | package.json에 명령 추가 |
| CI1-4 | lint-staged + Husky (pre-commit) | 커밋 시 변경 파일 자동 린트/포맷 |

**DoD**:
- `npm run lint` 실행 시 전체 소스에 대해 ESLint + Svelte 검사가 수행된다
- `npm run format` 실행 시 Prettier로 전체 소스가 포맷된다
- CI에서 lint 실패 시 빌드가 중단된다

---

### CI2: 단위 테스트 `P0`

| ID | 항목 | 설명 |
|----|------|------|
| CI2-1 | Vitest 설정 | `vitest.config.ts` + Svelte/TS 지원 |
| CI2-2 | 서비스 레이어 단위 테스트 | `services/` 내 순수 함수 테스트 |
| CI2-3 | 유틸리티 단위 테스트 | `utils/` 순수 함수 테스트 |
| CI2-4 | 스토어 레이어 단위 테스트 | `stores/` 상태 변경 로직 테스트 |
| CI2-5 | `npm run test:unit` 스크립트 | package.json에 명령 추가 |

**테스트 대상 우선순위**:

| 파일 | 테스트 용이성 | 우선순위 | 이유 |
|------|:------------:|:--------:|------|
| `languageDetector.ts` | 높음 | P0 | 순수 함수, 입출력 명확 |
| `skeletonExtractor.ts` | 높음 | P0 | 순수 함수, AST → 스켈레톤 변환 |
| `graphBuilder.ts` | 높음 | P0 | 순수 함수, 그래프 구성 로직 |
| `semanticGraphBuilder.ts` | 높음 | P0 | 순수 함수, 노드/엣지 변환 |
| `syntaxThemeService.ts` | 중간 | P1 | DOM 의존 (jsdom mock 필요) |
| `cacheService.ts` | 중간 | P1 | IndexedDB 의존 (fake-indexeddb mock) |
| `aiService.ts` | 낮음 | P2 | 외부 API 의존 (fetch mock) |
| `bridgeService.ts` | 낮음 | P2 | WebSocket 의존 (mock server) |

**DoD**:
- `npm run test:unit` 실행 시 Vitest가 전체 단위 테스트를 수행한다
- P0 순수 함수의 커버리지가 80% 이상이다
- 각 테스트 파일이 해당 소스 파일과 동일 경로에 `*.test.ts`로 위치한다

---

### CI3: E2E 테스트 `P1`

| ID | 항목 | 설명 |
|----|------|------|
| CI3-1 | Playwright 설정 | `playwright.config.ts` + Chromium 전용 |
| CI3-2 | 랜딩 페이지 로딩 테스트 | 페이지 접속 → 주요 UI 요소 존재 확인 |
| CI3-3 | 폴더 드롭 → 파싱 → 다이어그램 플로우 | Dev 테스트 모드 활용 (`?testDir=`) |
| CI3-4 | 설정 변경 → 저장 → 유지 플로우 | 테마/언어 변경 후 새로고침 → 유지 확인 |
| CI3-5 | 코드 뷰어 → 파일 선택 → 하이라이팅 플로우 | 파일 선택 → 구문 하이라이팅 적용 확인 |
| CI3-6 | `npm run test:e2e` 스크립트 | package.json에 명령 추가 |

**DoD**:
- `npm run test:e2e` 실행 시 Playwright가 Chromium에서 E2E 테스트를 수행한다
- 핵심 사용자 플로우(폴더 드롭 → 분석 → 다이어그램)가 E2E로 검증된다
- Dev 테스트 모드(`?testDir=`)를 활용하여 파일 시스템 접근 없이 테스트한다

---

### CI4: CI 파이프라인 `P1`

| ID | 항목 | 설명 |
|----|------|------|
| CI4-1 | GitHub Actions 워크플로우 | PR 시 자동 실행 |
| CI4-2 | 빌드 검증 단계 | `npm run build` 성공 확인 |
| CI4-3 | 타입 체크 단계 | `svelte-check` + `tsc --noEmit` |
| CI4-4 | 린트 검증 단계 | `npm run lint` 통과 확인 |
| CI4-5 | 단위 테스트 단계 | `npm run test:unit` 통과 확인 |
| CI4-6 | E2E 테스트 단계 | `npm run test:e2e` 통과 확인 |
| CI4-7 | 커버리지 리포트 | 커버리지 결과를 PR 코멘트로 게시 |

**DoD**:
- PR 생성/업데이트 시 GitHub Actions가 자동으로 lint → type-check → build → test:unit → test:e2e를 실행한다
- 모든 단계 통과 시에만 머지 가능하다
- 워크플로우 실행 시간이 5분 이내이다

---

## 10. 우선순위 및 로드맵

### P0 — 즉시 (현재 스프린트)

```
CI1      린팅 및 포맷팅 설정 (ESLint + Prettier)
CI2      단위 테스트 설정 (Vitest + P0 대상 테스트)
S1       코드 스니펫 즉시 분석
L1       Tier 1 언어 WASM 추가 + Generic 추출기 + 멀티 언어
```

### P1 — 단기 (다음 스프린트)

```
CI1-4    lint-staged + Husky (pre-commit hook)
CI2-4    스토어 단위 테스트
CI3      E2E 테스트 설정 (Playwright)
CI4      GitHub Actions 워크플로우
B1       Bridge 서버 완성
R1       검색 고도화
L2       Tier 2 언어 추가
```

### P2 — 중기

```
CI4-7    커버리지 리포트
U1       UX 개선 (인라인 프리뷰, 내보내기, 단축키, 반응형, Edge Proxy)
```

---

## 11. 주요 아키텍처 결정 (ADR)

### ADR-1: $state.raw for SvelteFlow 통합
- **문제**: SvelteFlow가 내부적으로 노드/엣지 객체를 mutation하여 `$state` deep reactivity가 `$effect` 무한 루프 유발
- **결정**: `flowNodes`, `flowEdges`, `baseFlowNodes`에 `$state.raw` 사용
- **결과**: 재할당만 reactivity 트리거, SvelteFlow의 drag/fitView mutation 무시

### ADR-2: Single-Writer 패턴 for Effects
- **문제**: 여러 `$effect`가 같은 변수에 쓰기 → 순환 의존성
- **결정**: 각 `$state` 변수에 대해 정확히 하나의 `$effect`만 writer로 지정
- **적용**: Effect 2 → `flowEdges` 전담, Effect 3 → `flowNodes` 전담

### ADR-3: untrack()로 의존성 차단
- **문제**: Effect 3이 `flowEdges`를 읽으면 Effect 2의 하이라이팅 변경마다 재실행
- **결정**: `untrack(() => flowEdges)`로 읽기 — 토폴로지만 필요하고 스타일은 불필요
- **결과**: Effect 2→3 순환 차단

### ADR-4: Dev 전용 파일시스템 미들웨어
- **문제**: 원격 SSH 환경에서 `showDirectoryPicker` 사용 불가
- **결정**: Vite dev server 미들웨어로 `/__dev/scan`, `/__dev/read` 엔드포인트 제공
- **조건**: `import.meta.env.DEV` 체크, 프로덕션 빌드에 포함되지 않음

### ADR-5: $state.raw for projectStore Maps
- **문제**: `$state` deep proxy가 Map 연산을 비반응적 컨텍스트(async)에서 실패시킴
- **결정**: `fileTree`, `astMap`에 `$state.raw` 사용
- **결과**: Map 연산이 async 함수에서도 정상 동작, 재할당 시에만 reactivity 트리거

### ADR-6: Fallback File Handle 래퍼
- **문제**: 비-localhost HTTP에서 File System Access API 미지원 → `<input webkitdirectory>` fallback 사용 → FileNode에 handle 없음 → parseAllFiles가 모든 파일 건너뜀
- **결정**: fallback File 객체를 `{ getFile: () => Promise.resolve(file) }` handle-like 래퍼로 감싸 동일 인터페이스 제공
- **결과**: DirectoryPicker 경로와 webkitdirectory 경로 모두 동일한 parseAllFiles 로직 사용

### ADR-7: Prism 테마 동적 CSS 주입
- **문제**: 정적 CSS import는 테마 교체가 불가능 (빌드 타임 고정)
- **결정**: Vite `?inline`으로 CSS를 문자열로 가져와 런타임에 `<style id="prism-theme">` 태그에 주입
- **결과**: 설정에서 테마 변경 시 즉시 반영, 12개 테마 지원

---

## 12. 제약 사항 및 알려진 이슈

### 제약
- **브라우저 전용**: File System Access API → Chromium 기반 브라우저만 지원 (비-localhost HTTP에서는 fallback input 사용)
- **파일 제한**: MAX_FILES=2000, MAX_FILE_SIZE=500KB
- **AST 파싱 언어**: 현재 실제 파싱은 Python/JS/TS 3개, 나머지는 언어 감지 + 구문 하이라이팅만 가능
- **정적 분석만**: 런타임 동작 분석 불가
- **스니펫 분석**: 단일 파일 기준, 멀티 파일 프로젝트 구조는 폴더 드롭 필요

### 알려진 이슈
- Edge Proxy 백엔드 미배포 (Vercel/CF Edge Function)
- WebGPU 옵션 플레이스홀더만 존재
- a11y 경고: label-control 미연결 (SettingsModal, ConnectModal)

---

## 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-03-03 | PRD v0.5.1 — 전체 기능 테스트 후 흐름 기준 DoD 추가 (V1~C1), CodeViewer 버그 2건 수정 반영, 버전 0.5.1 |
| 2026-03-03 | PRD v0.5 — 요구사항 ID 체계 재구성, NFR/CI 섹션 추가, REQUIREMENTS.md 흡수, 구문 하이라이팅 12개 테마 반영, ADR-7 추가 |
| 2026-03-02 | PRD v0.3 — 코드 스니펫 분석, 멀티 언어 지원, Bridge 완성 기능 추가 |
| 2026-03-02 | V-1.1~V-2.1 구현 완료 반영, ADR-5/6 추가, fallback handle 래퍼 수정 |
| 2026-02-27 | Directory Picker fallback 수정 — 비-localhost HTTP에서 파싱 정상화 |
| 2026-02-26 | PRD v0.2 — 비전 재정립: semantic diagram 중심, File Explorer 사이드바, 재귀적 AI 드릴다운 추가 |
| 2026-02-26 | PRD-latest.md 초기 작성 (전체 구현 상태 반영) |
| 2026-02-26 | dev 테스트 모드 구현, Svelte effect 루프 수정 |
| 2026-02-24 | 4-에이전트 병렬 마이그레이션 (Svelte 5, SvelteFlow, 컴포넌트 분리) |
