# B005: WebGPU / WebLLM 오류

## 증상

- 모델 다운로드 실패
- `WebGPU inference error`
- 모델 초기화 후 생성 결과 없음
- IndexedDB 캐시 문제

## 원인 분류

### 1. WebGPU 미지원 브라우저

- Chrome 113+ / Edge 113+ 필요
- `webgpuStore.isSupported`가 false
- Safari, Firefox는 미지원 또는 플래그 필요

### 2. 모델 다운로드 실패

- 네트워크 불안정 또는 CDN 차단
- IndexedDB 용량 부족
- **해결**: 브라우저 IndexedDB 정리 후 재시도

### 3. GPU 메모리 부족

- Qwen2.5-Coder-1.5B는 ~2GB VRAM 필요
- 저사양 GPU 또는 통합 그래픽에서 실패 가능
- **증상**: Worker에서 `out of memory` 에러

### 4. 추론 결과 품질

- 소형 모델 특성상 JSON 형식 준수율이 낮음
- B001 (JSON 파싱 실패)과 함께 발생 가능
- **해결**: `repairJSON` 복구에 의존, 또는 프롬프트 최적화

### 5. IndexedDB 캐시 손상

- 부분 다운로드 후 브라우저 종료 시 캐시 불완전
- **증상**: `isReady`인데 추론 실패
- **해결**: 브라우저 DevTools → Application → IndexedDB → 관련 DB 삭제

## 관련 코드

| 파일                      | 역할                                      |
| ------------------------- | ----------------------------------------- |
| `webgpuStore.svelte.ts`   | 상태 관리 (status, progress, isSupported) |
| `webllmWorker.ts`         | Web Worker — 모델 초기화 + 추론           |
| `webllmService.ts`        | Worker 래퍼 — 메시지 기반 통신            |
| `WebGPUSetupModal.svelte` | 다운로드 확인/진행/에러 UI                |

## 해결 이력

| 날짜       | 문제      | 해결                              |
| ---------- | --------- | --------------------------------- |
| 2026-03-18 | 초기 구현 | WebLLM + Worker 패턴으로 PoC 구현 |
