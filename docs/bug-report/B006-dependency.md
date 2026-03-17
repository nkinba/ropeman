# B006: 의존성/빌드 오류

## 증상

- `Svelte error: effect_orphan` — `$effect` can only be used inside an effect
- 다이어그램(SvelteFlow) 빈 화면 — 노드/엣지 미렌더링
- AI 분석 응답은 정상(200 OK, 유효한 JSON)인데 다이어그램이 안 보임

## 근본 원인

### npm 패키지 설치 시 node_modules 의존성 트리 오염

새 패키지(`@mlc-ai/web-llm` 등)를 `npm install`하면 npm이 의존성 hoisting 구조를 재계산한다. 이 과정에서:

1. 기존 패키지들의 `node_modules` 내 위치가 바뀔 수 있음
2. Vite의 pre-bundle 캐시(`node_modules/.vite/deps/`)는 이전 위치를 기억
3. `@xyflow/svelte`(SvelteFlow)가 참조하는 `svelte` 런타임 인스턴스와 앱이 사용하는 인스턴스가 서로 다른 복사본이 됨
4. Svelte 5의 `$effect`는 전역 컨텍스트(current component)에 의존 → 두 인스턴스가 다르면 `effect_orphan` 에러 발생

### 증거 (2026-03-18 스프린트)

- Svelte 5.52.0, @xyflow/svelte 1.5.1 — 버전은 이전 커밋과 동일
- 코드 변경(ZUICanvas, +page.svelte)은 렌더링 로직에 영향 없음
- `@mlc-ai/web-llm` 설치 이후부터 에러 발생
- `rm -rf node_modules/.vite && npm install` 후 에러 해소

## 해결 방법

```bash
# 1. Vite 캐시 + node_modules 재설치
rm -rf node_modules/.vite
npm install

# 2. dev 서버 재시작
npm run dev
```

또는 전체 재설치:

```bash
rm -rf node_modules node_modules/.vite
npm install
```

## 예방 조치

- 새 패키지 설치 후 반드시 `rm -rf node_modules/.vite` 실행
- SvelteFlow 관련 에러 발생 시 코드 변경보다 먼저 의존성 캐시 확인
- `npm install` 후 dev 서버 재시작 필요

## 관련 파일

| 파일                                  | 역할                                  |
| ------------------------------------- | ------------------------------------- |
| `node_modules/.vite/deps/`            | Vite pre-bundled 의존성 캐시          |
| `@xyflow/svelte`                      | SvelteFlow 그래프 렌더링 라이브러리   |
| `src/lib/components/ZUICanvas.svelte` | SvelteFlow를 사용하는 캔버스 컴포넌트 |
| `src/routes/+page.svelte`             | ZUICanvas 조건부 렌더링               |

## 해결 이력

| 날짜       | 문제                                                            | 해결                                             |
| ---------- | --------------------------------------------------------------- | ------------------------------------------------ |
| 2026-03-18 | `@mlc-ai/web-llm` 설치 후 `effect_orphan` → 다이어그램 미렌더링 | `node_modules/.vite` 삭제 + `npm install` 재실행 |
