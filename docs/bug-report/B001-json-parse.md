# B001: JSON 파싱 실패

## 증상

- `No JSON found in response`
- `JSON parse failed after repair`
- `SyntaxError: Expected ',' or '}' after property value in JSON at position N`

## 원인 분류

### 1. 응답이 잘려서 닫는 `}` 없음 (→ B003과 연관)

- 토큰 제한으로 출력이 truncate됨
- **증거 (2026-03-18)**: TensorFlow 프로젝트(293KB skeleton)에서 Demo Worker(maxOutputTokens: 4096)가 첫 role 객체의 filePaths조차 완성 못 함
- **수정**: `parseSemanticLevel`에서 `{`만 있고 `}`가 없는 경우 fallback 추출 + `repairJSON` 연계

### 2. closeBrackets 닫기 순서 오류

- 이전: brackets(`]`) 먼저, braces(`}`) 나중 → `"path"]]}}` 형태로 잘못 닫힘
- **증거**: `"tensorflow/tensorflow/c/e"]]}}` — filePaths 배열 → role 객체 → roles 배열 → root 순서가 아닌 `]]}}` 순서
- **수정**: 스택 기반 `closeBrackets`로 열린 순서의 역순으로 닫도록 개선

### 3. repairJSON progressive cut 부재

- 이전: 에러 position 기준 1회 cut만 시도
- **증거**: 첫 role 내에서 잘리면 `},` 경계가 없어서 cut point 없음
- **수정**: 모든 `},` 경계를 수집하여 가장 긴 유효 prefix부터 시도

### 4. AI가 다른 키 이름 사용

- `roles` 대신 `nodes`, `groups`, `components`, `modules` 등
- `parseSemanticLevel`에서 대체 키 탐색 처리됨

## 관련 코드

| 함수                            | 위치                       | 역할                               |
| ------------------------------- | -------------------------- | ---------------------------------- |
| `parseSemanticLevel()`          | semanticAnalysisService.ts | JSON 추출 + 파싱                   |
| `repairJSON()`                  | semanticAnalysisService.ts | JSON 복구 (progressive truncation) |
| `closeBrackets()`               | semanticAnalysisService.ts | 스택 기반 미닫힌 `[]{}` 자동 닫기  |
| `escapeControlCharsInStrings()` | semanticAnalysisService.ts | 문자열 내 제어문자 이스케이프      |

## 해결 이력

| 날짜       | 문제                                      | 해결                                       |
| ---------- | ----------------------------------------- | ------------------------------------------ |
| 2026-03-18 | 응답 truncation 시 `No JSON found`        | `{` 기준 fallback 추출 + `repairJSON` 연계 |
| 2026-03-18 | `closeBrackets`가 `]]}}` 순서로 잘못 닫음 | 스택 기반으로 열린 순서의 역순 닫기        |
| 2026-03-18 | `repairJSON` 에러 position 1회 cut만 시도 | 모든 `},` 경계 progressive cut             |
| 2026-03-18 | Demo Worker maxOutputTokens 4096 부족     | 16384로 상향 (edge-proxy/src/shared.ts)    |
