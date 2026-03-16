# WIP Session — Sprint 2026-03-16-01 (Edge Proxy + BYOK 프록시)

> 이 문서는 세션 간 인수인계를 위한 것입니다. 새 세션에서 이 파일을 읽고 작업을 이어가세요.

## 브랜치

- `sprint/2026-03-16-01` (main에서 분기)

## 현재 상태

### ISS001: Cloudflare Edge 체험 데모 — 70% 완료

**완료:**

- Cloudflare Worker 배포: `ropeman-api.ysc9606.workers.dev`
- Worker 코드: Gemini API 프록시 + rate limit + CORS
- 프론트엔드 연동: `authStore` edge 트랙, `callEdgeProxy()`, 온보딩 "빠른 체험" 버튼
- Skeleton 크기 제한: 우선순위 기반 파일 선택 (src/ 우선, tests/docs 제외), 150KB 상한
- `ropeman.dev` 도메인 구매

**남은 작업:**

1. **Worker 2개 분리** (핵심)
   - 현재 `ropeman-api` 1개 → `ropeman-demo` + `ropeman-proxy` 분리
   - `ropeman-demo`: 체험 모드, 서버 키(GEMINI_API_KEY 시크릿), rate limit
   - `ropeman-proxy`: BYOK 프록시, 사용자 키 pass-through, rate limit 없음
   - 이유: 인프라 단 분리로 WAF 독립 적용, 확장성

2. **BYOK 프록시 Worker 구현** (`ropeman-proxy`)
   - Anthropic API 프록시 (CORS 우회)
   - OpenAI API 프록시 (CORS 우회)
   - 요청에 `apiKey` + `provider` 포함 → 해당 API로 전달 → 응답 반환
   - 키 저장 안 함 (pass-through)

3. **프론트엔드 수정**
   - `semanticAnalysisService.ts`: byok + anthropic/openai일 때 `ropeman-proxy` Worker 경유
   - `DEMO_URL`과 `PROXY_URL` 상수 분리
   - 기존 Gemini byok는 직접 호출 유지 (CORS 허용)

4. **E2E 테스트**
   - 작은 프로젝트(Ropeman 자체)로 체험 모드 동작 확인
   - GEMINI_API_KEY 시크릿 등록 확인: `cd edge-proxy && bunx wrangler secret put GEMINI_API_KEY`

### ISS002: WebGPU 소형모델 PoC — 미착수

- WebLLM + Qwen2.5-Coder-1.5B
- 다운로드 확인 모달 (크기/시간 안내, 확인/취소)
- IndexedDB 캐싱

## 아키텍처 결정사항

### Worker 구조 (결정됨)

```
브라우저 (Ropeman)
  ├─ 체험 모드 → ropeman-demo.ysc9606.workers.dev
  │                → Gemini 2.5 Flash (서버 키, rate limit)
  ├─ BYOK Gemini → 직접 호출 (CORS 허용)
  ├─ BYOK Anthropic/OpenAI → ropeman-proxy.ysc9606.workers.dev
  │                           → 사용자 키 pass-through (rate limit 없음)
  └─ Bridge → localhost WebSocket → Claude Code/Gemini CLI
```

### authStore 우선순위 (변경됨)

```
bridge > byok(API 키) > edge(체험 데모) > none
```

API 키가 있으면 항상 byok 우선. edge는 키 없을 때만.

### Skeleton 제한 (신규)

- 150KB 상한, 우선순위 기반 파일 선택
- Priority 3: src/, lib/, app/, packages/
- Priority 2: 루트 파일
- Priority 1: 그 외
- Priority 0 (제외): tests/, docs/, examples/, benchmarks/

## 환경 참고사항

### macmini에서 작업 재개 시

- `.spec` symlink이 macmini 경로와 다를 수 있음 — 확인 필요
- `edge-proxy/` 디렉토리에 `node_modules` 없을 수 있음 — `cd edge-proxy && bun install`
- Worker 시크릿은 Cloudflare 계정에 저장되므로 환경 무관

### Worker 배포

```bash
cd edge-proxy
bunx wrangler login   # 처음 한 번
bunx wrangler deploy  # 배포
bunx wrangler secret put GEMINI_API_KEY  # 시크릿 등록 (Worker 재생성 시)
```

### 주의사항

- 루트의 `wrangler.jsonc.bak`: SvelteKit 배포용 설정이 Worker 배포와 충돌했음. 복구 시 이름을 `ropeman-web` 등으로 변경 필요
- `docs/private/market-analysis.html`: gitignore 대상, 로컬 전용

## 변경 파일 목록

| 파일                                          | 변경 내용                            |
| --------------------------------------------- | ------------------------------------ |
| `.gitignore`                                  | `.spec`, wrangler 관련 추가          |
| `src/lib/stores/authStore.svelte.ts`          | edge 트랙, 우선순위 조정             |
| `src/lib/services/semanticAnalysisService.ts` | `callEdgeProxy()`                    |
| `src/lib/services/aiService.ts`               | edge 트랙 처리                       |
| `src/lib/services/skeletonExtractor.ts`       | 우선순위 기반 파일 선택 + 150KB 상한 |
| `src/routes/+page.svelte`                     | edge 트랙 활성화                     |
| `edge-proxy/`                                 | Worker 프로젝트 (신규)               |
| `docs/guide-cloudflare-edge-proxy.md`         | 세팅 가이드                          |

## 규칙

- **커밋/PR 전 반드시 사용자 승인** (CLAUDE.md에 기록됨)
