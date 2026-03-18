# B003: 응답 Truncation

## 증상

- 다이어그램에 예상보다 적은 노드 표시
- Edge가 일부 누락
- 콘솔에 `JSON parse failed after repair` (B001과 연관)
- `repairJSON`이 aggressive cut 수행

## 원인 분류

### 1. 스켈레톤이 너무 커서 출력 토큰 부족

- 대형 프로젝트 → 스켈레톤 payload가 크면 AI 응답도 길어짐
- `maxOutputTokens` 한도에 도달하여 응답이 잘림
- **해결**: Settings → Skeleton Size Limit 줄이기, 또는 더 큰 토큰 한도의 모델 사용

### 2. Demo Worker의 고정 maxOutputTokens

- `demo.ts`/`shared.ts`에서 `maxOutputTokens: 4096`으로 고정
- 큰 프로젝트에서는 부족할 수 있음
- **해결**: Worker 코드에서 한도 상향 또는 프론트엔드에서 스켈레톤 크기 제한

### 3. BYOK에서 모델별 출력 한도

- Gemini Flash Lite: 8K output
- Claude Haiku: 4K output
- 모델에 따라 출력 한도가 다름

## 복구 메커니즘

| 단계 | 함수                 | 동작                                         |
| ---- | -------------------- | -------------------------------------------- |
| 1    | `parseSemanticLevel` | `{`만 있고 `}`가 없어도 추출 시도            |
| 2    | `repairJSON`         | 제어문자 이스케이프 + trailing comma 제거    |
| 3    | `closeBrackets`      | 미닫힌 `[]{}""` 자동 닫기                    |
| 4    | aggressive cut       | 에러 위치 기준 마지막 유효 요소까지 잘라내기 |

## 설정 관련

| 설정                 | 위치                 | 영향                                     |
| -------------------- | -------------------- | ---------------------------------------- |
| `maxSkeletonKB`      | settingsStore        | 전송되는 스켈레톤 크기 제한 (기본 150KB) |
| `skeletonUnlimited`  | settingsStore        | true 시 스켈레톤 크기 무제한             |
| `MAX_SKELETON_BYTES` | skeletonExtractor.ts | 기본값 상수 (150KB)                      |

## 해결 이력

| 날짜       | 문제                          | 해결                                                              |
| ---------- | ----------------------------- | ----------------------------------------------------------------- |
| 2026-03-18 | truncation 시 `No JSON found` | fallback 추출 로직 추가 (B001)                                    |
| 2026-03-18 | 사용자별 스켈레톤 크기 조절   | Settings에 Skeleton Size Limit 슬라이더 + Unlimited 체크박스 추가 |
