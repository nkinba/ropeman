# B002: Edge Proxy 오류

## 증상

- `Edge proxy error: HTTP 4xx/5xx`
- `Proxy error: HTTP 4xx/5xx`
- `Gemini API error: 400` — `"User location is not supported for the API use."`
- `API key not valid`
- `Rate limit exceeded`
- `TypeError: Failed to fetch` (CORS)

## 원인 분류

### 1. Gemini 지역 제한 (400 FAILED_PRECONDITION)

- Worker가 Gemini API 미지원 지역(한국 등)에서 실행됨
- **증거 (2026-03-18)**: `ropeman-api` → `ropeman-demo`로 Worker 이름 변경 후 새 리전에 배치되어 발생
- **해결**: `wrangler.demo.toml`에 `[placement] mode = "smart"` + `hint = "wnam"` 추가
- `mode = "smart"`: Worker를 백엔드 API 서버에 가까운 리전에서 실행
- `hint = "wnam"`: Western North America 리전 힌트

### 2. API Key 무효 (400 INVALID_ARGUMENT)

- Worker의 `GEMINI_API_KEY` secret 미설정 또는 만료
- **증거 (2026-03-18)**: 새 `ropeman-demo` Worker에 기존 `ropeman-api`의 secret이 없었음
- **해결**: `wrangler secret put GEMINI_API_KEY -c wrangler.demo.toml`

### 3. CORS 오류 (Failed to fetch)

- `ALLOWED_ORIGINS`에 현재 도메인/포트 미포함
- **증거 (2026-03-18)**: dev 서버가 5174 포트로 실행되었는데 ALLOWED_ORIGINS에 5173만 있었음
- **해결**: `wrangler.demo.toml`과 `wrangler.proxy.toml`의 `ALLOWED_ORIGINS`에 5174 추가

### 4. Rate Limit (429)

- Demo Worker 자체 rate limit (IP당 분당 10회, 일일 200회)
- 또는 Gemini 무료 tier TPM/RPM 제한
- **구분 방법**: 응답 body에 `"Rate limit exceeded"` → Worker 제한, Gemini 형식 에러 → Gemini 제한

### 5. BYOK Proxy 오류 (ropeman-proxy)

- Anthropic/OpenAI API 키가 유효하지 않거나 잔액 부족

## 관련 파일

| 파일                             | 역할                                        |
| -------------------------------- | ------------------------------------------- |
| `edge-proxy/src/demo.ts`         | Demo Worker (서버키 + rate limit)           |
| `edge-proxy/src/proxy.ts`        | BYOK Proxy Worker (pass-through)            |
| `edge-proxy/src/shared.ts`       | 공통 CORS, callGemini, maxOutputTokens      |
| `edge-proxy/wrangler.demo.toml`  | Demo 배포 설정 (placement, ALLOWED_ORIGINS) |
| `edge-proxy/wrangler.proxy.toml` | Proxy 배포 설정                             |
| `src/lib/config.ts`              | 프론트엔드 URL 상수 (DEMO_URL, PROXY_URL)   |

## 해결 이력

| 날짜       | 문제                                        | 해결                                               |
| ---------- | ------------------------------------------- | -------------------------------------------------- |
| 2026-03-18 | Worker 이름 변경 후 지역 제한 발생          | `[placement] mode = "smart"`, `hint = "wnam"` 추가 |
| 2026-03-18 | 새 Worker에 GEMINI_API_KEY secret 미설정    | `wrangler secret put` 실행                         |
| 2026-03-18 | dev 서버 포트 변경 시 CORS 에러             | `ALLOWED_ORIGINS`에 `localhost:5174` 추가          |
| 2026-03-18 | maxOutputTokens 4096 부족 → 응답 truncation | `shared.ts`에서 16384로 상향                       |
