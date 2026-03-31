# Ropeman

> AI 기반 시맨틱 코드 아키텍처 시각화 도구 -- Local-First

**배포 URL**: [https://ropeman.dev](https://ropeman.dev)

[English](./README.md)

## 개요

Ropeman은 임의의 코드베이스를 브라우저에서 분석하여 **AI 기반 의미론적 아키텍처 다이어그램**으로 시각화하는 웹 애플리케이션입니다. 파일 트리가 아닌, 프로젝트의 *역할과 의존 관계*를 다이어그램으로 표현합니다.

폴더를 열면 아키텍처 다이어그램이 생성됩니다. 각 영역을 클릭하면 AI가 하위 구조를 재귀적으로 추가 분석합니다.

### 핵심 가치

- **Semantic-First** -- 메인 캔버스는 역할 기반 다이어그램 (파일 트리가 아님)
- **재귀적 드릴다운** -- 영역 클릭 시 AI가 하위 구조를 동적 생성
- **100% Local-First** -- 소스 코드 원문은 브라우저 밖으로 나가지 않음. 구조 메타데이터만 AI에 전달
- **Zero Friction** -- URL 접속, 폴더 드롭, 다이어그램 생성. 별도 설치/가입 없이 Demo 모드 사용 가능

## 주요 기능

- **AI 의미론적 분석** -- LLM 기반 아키텍처 다이어그램 자동 생성
- **재귀적 드릴다운** -- 노드 클릭으로 내부 구조 확장
- **Multi-Track AI** -- 4가지 AI 모드 지원 (아래 참고)
- **Local-First** -- 브라우저 내 WASM AST 파싱, 코드 스켈레톤만 AI에 전달
- **Polyglot** -- 14개 언어 지원 (Python, JavaScript, TypeScript, Go, Rust, Java, C, C++, Ruby, PHP, Swift, Kotlin, C#, Scala)
- **코드 뷰어** -- 구문 하이라이팅 + 분할 뷰
- **시맨틱 캐싱** -- Cache API로 세션 간 분석 결과 유지
- **검색** -- Orama 기반 전문 검색

## 기술 스택

| 영역            | 기술                               |
| --------------- | ---------------------------------- |
| 프레임워크      | SvelteKit + Svelte 5 (runes)       |
| 그래프 렌더링   | @xyflow/svelte (SvelteFlow)        |
| 그래프 레이아웃 | @dagrejs/dagre                     |
| AST 파싱        | web-tree-sitter (WASM, Web Worker) |
| 검색            | @orama/orama                       |
| WebGPU AI       | @mlc-ai/web-llm                    |
| Edge Proxy      | Cloudflare Workers                 |
| 테스트          | Vitest + Playwright                |
| 빌드            | Vite v6                            |
| 배포            | Cloudflare Pages                   |

## 시작하기

```bash
git clone https://github.com/nkinba/ropeman.git
cd ropeman
npm install
npm run dev
```

[http://localhost:5173](http://localhost:5173)을 Chromium 기반 브라우저(Chrome, Edge 권장)에서 열어주세요. File System Access API를 지원합니다.

### 스크립트

| 명령어              | 설명                    |
| ------------------- | ----------------------- |
| `npm run dev`       | 개발 서버 실행          |
| `npm run build`     | 프로덕션 빌드           |
| `npm run test:unit` | 단위 테스트 (Vitest)    |
| `npm run test:e2e`  | E2E 테스트 (Playwright) |
| `npm run lint`      | ESLint 실행             |
| `npm run format`    | Prettier 포맷팅         |

## AI 모드

4가지 AI 트랙을 지원합니다:

1. **Demo** -- 무료, 설정 불필요. Edge Proxy를 통해 AI 분석. 체험용.
2. **API Key (BYOK)** -- Google Gemini, Anthropic, OpenAI 키를 직접 입력. 키는 브라우저(localStorage)에만 저장되며, 보안 Edge Proxy를 통해 요청.
3. **Local Bridge** -- 로컬 AI(Claude Code, Gemini CLI 등)와 Bridge 서버를 통해 연결. 소스 코드가 완전히 로컬에 유지됨.
4. **Browser AI** -- WebGPU 기반 브라우저 내 추론 (web-llm). 완전 오프라인, 실험적.

## 아키텍처

```
src/lib/
  stores/       # Svelte 5 rune 싱글턴 (모듈 레벨)
  services/     # 순수 함수, AI 어댑터, 캐싱
  components/   # Svelte 5 컴포넌트 ($props 패턴)
  workers/      # Web Worker (AST 파서, web-llm)
  types/        # TypeScript 인터페이스
  utils/        # 유틸리티 (언어 감지 등)

edge-proxy/
  src/          # Cloudflare Workers (demo, proxy, shared)
```

### 데이터 흐름

1. 사용자가 폴더를 드롭 (File System Access API)
2. Parser Worker (web-tree-sitter WASM)가 파일별 AST 스켈레톤 추출
3. AI 어댑터가 선택된 AI 트랙으로 스켈레톤 전송
4. 응답을 시맨틱 노드/엣지로 파싱하여 SvelteFlow로 렌더링
5. 결과를 Cache API에 캐싱하여 즉시 복원 가능

## 캐싱

| 데이터           | 스토리지          | 키                 |
| ---------------- | ----------------- | ------------------ |
| 시맨틱 분석 결과 | Cache API         | `ropeman/semantic` |
| 채팅 응답        | IndexedDB (Orama) | `ropeman-cache`    |
| WebGPU 모델      | Cache API         | `webllm/*`         |

## 단축키

| 단축키         | 동작                        |
| -------------- | --------------------------- |
| `Ctrl+K`       | 검색                        |
| `Ctrl+Shift+D` | 테마 전환                   |
| `Ctrl+Shift+V` | 사이드바 전환 (파일/시맨틱) |
| `Ctrl+B`       | 사이드바 토글               |
| `Ctrl+W`       | 탭 닫기                     |
| `Ctrl+\`       | 분할 뷰 토글                |
| `Esc`          | 모달 닫기                   |

## 브라우저 요구사항

- Chromium 기반 브라우저 권장 (Chrome, Edge) -- File System Access API 완전 지원
- Firefox / Safari -- 드래그 앤 드롭 폴더 업로드로 제한적 사용 가능
- WebGPU AI 모드는 WebGPU 지원 브라우저 필요

## 라이선스

TBD
