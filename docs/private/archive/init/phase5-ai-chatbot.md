# Phase 5: AI Chatbot - 결과 문서

## 완료 상태: ✅ 완료 (Agent D)

## 수행 내용

### 생성된 파일 (3개)

#### 1. `src/services/aiService.js`
- **Gemini API 연동**: gemini-2.0-flash 모델 사용
- **context.md 시스템 프롬프트**: Vite `?raw` 임포트로 시스템 인스트럭션 주입
- **sendMessage(message, history)**: 대화 히스토리 포함 API 호출
- **classifyQuestion(message)**: 내부(microgpt)/외부(일반 ML) 질문 분류
  - 한국어/영어 키워드 50개+ 매핑
- **extractRelatedSections()**: 응답에서 관련 코드 섹션 ID 추출 (키워드 매칭)
- **API 키 미설정 시**: 안내 메시지 반환 (크래시 방지)
- **에러 핸들링**: 모든 에러를 content 문자열로 반환

#### 2. `src/components/ChatPopup.svelte`
- **플로팅 버튼**: 💬 / ✕ 토글
- **팝업 창**: 헤더, 메시지 영역, 입력 영역
- **스토어 구독**: chatOpen, chatMessages, chatLoading, t (Svelte 5 $effect)
- **자동 스크롤**: 새 메시지 시 하단 스크롤
- **Enter 전송**: Shift+Enter는 줄바꿈
- **로딩 인디케이터**: 점 애니메이션

#### 3. `src/components/ChatMessage.svelte`
- **역할별 스타일링**: user (우측 파란색) / assistant (좌측 회색)
- **마크다운 파싱**: **bold**, `code`, 줄바꿈
- **관련 코드 링크**: relatedSections → 클릭 시 해당 섹션으로 이동
- **접근성**: role="button", tabindex="0", 키보드 이벤트
