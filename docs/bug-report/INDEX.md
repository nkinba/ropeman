# Bug Report Index

AI 분석 관련 버그를 유형별로 분류하여 빠르게 원인을 파악하고 해결할 수 있도록 합니다.

## 유형별 문서

| ID   | 유형              | 증상                                                    | 문서                                               |
| ---- | ----------------- | ------------------------------------------------------- | -------------------------------------------------- |
| B001 | JSON 파싱 실패    | `No JSON found in response`, `JSON parse failed`        | [B001-json-parse.md](./B001-json-parse.md)         |
| B002 | Edge Proxy 오류   | `Edge proxy error: 4xx/5xx`, CORS, 지역 제한            | [B002-edge-proxy.md](./B002-edge-proxy.md)         |
| B003 | 응답 Truncation   | 불완전한 다이어그램, 일부 노드 누락                     | [B003-truncation.md](./B003-truncation.md)         |
| B004 | Track/Mode 오작동 | 잘못된 모드로 호출, activeTrack 불일치                  | [B004-track-mismatch.md](./B004-track-mismatch.md) |
| B005 | WebGPU/WebLLM     | 모델 로드 실패, 추론 오류, IndexedDB                    | [B005-webgpu.md](./B005-webgpu.md)                 |
| B006 | 의존성/빌드 오류  | `effect_orphan`, SvelteFlow 미렌더링, node_modules 오염 | [B006-dependency.md](./B006-dependency.md)         |

## 빠른 진단 가이드

```
에러 발생
  ├─ 콘솔에 "JSON" 키워드 → B001
  ├─ 콘솔에 "Edge proxy error" / "Proxy error" → B002
  ├─ 다이어그램이 나오지만 노드가 적거나 edge 누락 → B003
  ├─ 설정한 모드와 다른 API가 호출됨 → B004
  ├─ WebGPU 관련 에러 → B005
  └─ 콘솔에 "effect_orphan" / 다이어그램 빈 화면 / 빌드 에러 → B006
```

## 공통 디버깅 절차

1. **브라우저 콘솔** 확인 (F12 → Console)
2. **Network 탭**에서 실패한 요청의 Response body 확인
3. 에러 메시지에서 유형 판별 → 해당 문서 참조
4. 해결 후 해당 문서의 '해결 이력' 섹션에 날짜 + 문제 + 해결 추가
