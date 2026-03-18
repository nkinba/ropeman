# B004: Track/Mode 오작동

## 증상

- "빠른 체험" 선택했는데 API key로 호출됨
- API key 모드인데 Edge proxy로 호출됨
- Header의 모드 뱃지와 실제 호출이 불일치

## 원인 분류

### 1. activeTrack 우선순위 문제

- `authStore.activeTrack`는 우선순위로 결정됨:
  `bridge > edge > webgpu > byok > none`
- `edgeEnabled`가 true이면 API key가 있어도 edge로 동작
- **주의**: `edgeEnabled`는 세션 내 상태 (새로고침 시 false로 리셋)

### 2. edgeEnabled가 꺼지지 않음

- AnalyzeModal에서 다른 트랙 선택 시 `authStore.edgeEnabled = false` 호출 필요
- **관련 코드**: `+page.svelte` → `handleTrackSelect()`

### 3. ConnectModal/AnalyzeModal 상태 불일치

- 모달이 열릴 때 현재 activeTrack에 맞는 탭/카드가 선택되지 않음
- `$effect`에서 open 시 상태 동기화 확인

## 관련 코드

| 파일                  | 함수/속성             | 역할                                       |
| --------------------- | --------------------- | ------------------------------------------ |
| `authStore.svelte.ts` | `activeTrack`         | 현재 활성 트랙 결정 (우선순위)             |
| `authStore.svelte.ts` | `edgeEnabled`         | Demo 모드 활성 여부                        |
| `+page.svelte`        | `handleTrackSelect()` | 트랙 선택 시 edgeEnabled 토글              |
| `AnalyzeModal.svelte` | `startAnalysis()`     | edge 선택 시 edgeEnabled=true, 그 외 false |

## 디버깅 방법

1. 콘솔에서 `authStore.activeTrack` 확인
2. `authStore.edgeEnabled` 값 확인
3. Network 탭에서 실제 호출된 URL 확인 (DEMO_URL vs PROXY_URL vs Gemini 직접)

## 해결 이력

| 날짜       | 문제                              | 해결                                               |
| ---------- | --------------------------------- | -------------------------------------------------- |
| 2026-03-18 | API key 있으면 edge보다 byok 우선 | activeTrack 우선순위에서 edge를 byok보다 위로 이동 |
| 2026-03-18 | 모드 전환 불가                    | AnalyzeModal에 Demo/API Key 탭 + 전환 버튼 추가    |
