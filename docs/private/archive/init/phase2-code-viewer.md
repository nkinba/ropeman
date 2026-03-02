# Phase 2: Code Viewer - 결과 문서

## 완료 상태: ✅ 완료 (Agent A)

## 수행 내용

### 생성된 파일 (3개)

#### 1. `src/components/CodeViewer.svelte`
- sections.json 메타데이터 로드
- microgpt.py를 Vite `?raw` 임포트로 원본 텍스트 로드
- 라인 배열로 분할 후 각 섹션에 해당하는 코드 라인 추출
- 14개 CodeSection 컴포넌트를 순서대로 렌더링

#### 2. `src/components/CodeSection.svelte`
- **아코디언 UI**: 클릭으로 접기/펼치기
- **섹션 헤더**: 쉐브론, 섹션 번호, i18n 제목, 라인 범위 (예: L164-190)
- **카테고리 색상**: 왼쪽 3px 보더 (예: attention=파란색, autograd=빨간색)
- **코드 하이라이팅**: Prism.js Python 문법 강조
- **라인 번호**: 원본 microgpt.py 기준 라인 번호 표시
- **상태 연동**: selectedSectionId 구독하여 활성 섹션 하이라이트
- **접근성**: role="button", tabindex="0", Enter/Space 키보드 지원

#### 3. `src/components/Tooltip.svelte`
- 마우스 위치 추적 (x, y 좌표)
- 다크 배경, 흰 텍스트, 최대 280px
- pointer-events: none로 인터랙션 비간섭
- z-index 100

## 카테고리 색상 매핑
| 카테고리 | CSS 변수 | 색상 |
|----------|----------|------|
| setup | --color-setup | #64748b |
| autograd | --color-autograd | #ef4444 |
| embedding | --color-embedding | #22c55e |
| tokenizer | --color-tokenizer | #ec4899 |
| attention | --color-attention | #3b82f6 |
| mlp | --color-mlp | #a855f7 |
| training | --color-training | #f59e0b |
| inference | --color-inference | #06b6d4 |
