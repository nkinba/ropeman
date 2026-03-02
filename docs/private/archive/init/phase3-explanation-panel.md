# Phase 3: Explanation Panel - 결과 문서

## 완료 상태: ✅ 완료 (Agent B)

## 수행 내용

### 생성된 파일 (1개)

#### `src/components/ExplanationPanel.svelte`

**스크립트**:
- selectedSectionId, locale, t store 구독
- sections.json에서 현재 섹션 데이터 파생
- categoryColorMap으로 카테고리별 색상 매핑
- handleTermClick: 관련 용어 클릭 시 채팅 팝업 열기 + 질문 전송

**템플릿 구조**:
1. **미선택 상태**: 중앙 정렬 안내 메시지
2. **섹션 선택 시**:
   - 카테고리 색상 바 (4px 상단)
   - 섹션 제목 (번호 + i18n 제목)
   - **목적** 블록: 1-2문장 설명
   - **핵심 개념** 블록: 카드형 레이아웃, 개념명 + 설명
   - **변수/함수 테이블**: 이름(모노스페이스), 타입, 설명(i18n)
   - **관련 용어**: 클릭 가능한 칩/태그 (채팅 연동)

**스타일**:
- 스크롤 가능 패널, 20px 패딩
- 개념 카드: bg-secondary 배경, 8px 둥근 모서리
- 용어 칩: accent 색상, 12px 둥근 모서리, 호버 효과
