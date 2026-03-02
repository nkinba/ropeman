# PRD: microGPT Visualizer

## 1. 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | microGPT Visualizer |
| **목적** | Andrej Karpathy의 microgpt.py를 비전문가도 이해할 수 있도록 인터랙티브 시각화 |
| **대상 사용자** | ML 비전문가, GPT 내부 동작을 학습하려는 개발자 |
| **원본 코드** | `/microgpt.py` (약 260줄) |

---

## 2. 기술 스택

### Frontend
| 역할 | 기술 | 선정 이유 |
|------|------|-----------|
| 프레임워크 | **Svelte + Vite** | 경량, 직관적 상태 관리, 낮은 학습 곡선 |
| 코드 하이라이팅 | **Prism.js** 또는 **Shiki** | Python 문법 강조 |
| 다이어그램 | **SVG** (직접 작성) | 인터랙션 제어 용이 |
| 스타일링 | **CSS Variables** + 다크모드 | 단순, 프레임워크 불필요 |

### Backend (AI 검색)
| 역할 | 기술 | 선정 이유 |
|------|------|-----------|
| AI 모델 | **Google Gemini** (Flash/Pro) | 무료 티어 충분 |
| 임베딩 | **Google Gemini Embedding** | 무료, 768차원 |
| 벡터 DB | **Qdrant** (Docker) | Apache 2.0, 고성능, 라이선스 안전 |
| 웹 검색 | **Tavily API** | 무료 1,000회/월, AI 검색 특화 |

### 배포
| 역할 | 기술 |
|------|------|
| 호스팅 | **GitHub Pages** (정적 빌드) |
| 백엔드 API | **Cloudflare Workers** 또는 **Vercel Edge Functions** |

---

## 3. 핵심 기능

### 3.1 아키텍처 다이어그램

GPT 전체 구조를 SVG로 시각화

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   Input → [Embedding] → [Transformer Layer] → [Output]  │
│               ↓              ↓                          │
│            클릭 시        클릭 시                        │
│         코드 섹션으로    상세 다이어그램                  │
│            이동          (Attention + MLP)              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**요구사항**:
- [ ] 전체 흐름도 (Input → Embedding → Layers → Output)
- [ ] Transformer Layer 상세도 (Attention + MLP + Residual)
- [ ] 각 블록 클릭 시 해당 코드 섹션으로 스크롤 + 하이라이트
- [ ] 호버 시 간단한 설명 툴팁

---

### 3.2 인터랙티브 코드 뷰어

microgpt.py를 섹션별로 분할하여 표시

**코드 섹션 분류**:

| # | 섹션명 | 라인 | 핵심 개념 |
|---|--------|------|-----------|
| 1 | Imports & Setup | 1-15 | 의존성, 시드 설정 |
| 2 | Dataset Loading | 17-25 | 데이터 로드, 셔플 |
| 3 | Tokenizer | 27-33 | 문자 토크나이징, BOS 토큰 |
| 4 | Value Class - 초기화 | 37-49 | Autograd, 계산 그래프 |
| 5 | Value Class - 연산자 | 51-91 | Forward pass 연산 |
| 6 | Value Class - Backward | 92-107 | 역전파, 체인 룰 |
| 7 | Parameter Init | 110-134 | wte, wpe, attention, mlp 가중치 |
| 8 | Utility Functions | 139-153 | linear, softmax, rmsnorm |
| 9 | GPT Forward - Embedding | 156-162 | 토큰 + 위치 임베딩 |
| 10 | GPT Forward - Attention | 164-190 | Multi-Head Attention |
| 11 | GPT Forward - MLP | 191-200 | Feed-Forward Network |
| 12 | Optimizer Setup | 203-206 | Adam 버퍼 초기화 |
| 13 | Training Loop | 208-242 | Forward, Backward, Update |
| 14 | Inference | 244-258 | Temperature Sampling |

**요구사항**:
- [ ] 섹션별 접기/펼치기
- [ ] 섹션 클릭 시 우측 설명 패널 업데이트
- [ ] 변수/함수 호버 시 툴팁 (용어 정의 + 관련 코드 라인)
- [ ] 현재 선택된 섹션이 다이어그램에서 하이라이트
- [ ] 라인 번호 표시

---

### 3.3 설명 패널

선택된 코드 섹션에 대한 상세 설명

**각 섹션별 설명 포함 내용**:
```markdown
## 섹션 제목

### 목적
이 코드가 하는 일 (1-2문장)

### 핵심 개념
- 개념 1: 설명
- 개념 2: 설명

### 변수/함수 설명
| 이름 | 역할 | 수식 (선택) |
|------|------|-------------|

### 데이터 흐름
입력 → 처리 → 출력 시각화

### 관련 용어
[링크] [링크] [링크]
```

---

### 3.4 AI 검색 챗봇 (팝업)

좌측 하단 플로팅 버튼 → 팝업 채팅창

```
┌─────────────────────────────────┐
│  🤖 microGPT 도우미       [×]  │
├─────────────────────────────────┤
│                                 │
│  [사용자] attention이 뭐야?     │
│                                 │
│  [AI] Attention은 "어떤 토큰이  │
│  다른 토큰들을 얼마나 주목할지"  │
│  계산하는 메커니즘입니다...      │
│                                 │
│  📍 관련 코드: 섹션 10 (164줄)  │
│                                 │
├─────────────────────────────────┤
│  [입력창]              [전송]   │
└─────────────────────────────────┘
```

**요구사항**:
- [ ] 플로팅 버튼 (💬) 클릭 시 팝업 토글
- [ ] 대화 히스토리 유지
- [ ] 스트리밍 응답 지원
- [ ] 내부 질문: 컨텍스트만으로 응답 (microgpt 관련)
- [ ] 외부 질문: 웹 검색 후 응답 (일반 ML 지식)
- [ ] "관련 코드 보기" 클릭 시 해당 섹션으로 이동
- [ ] 로딩 인디케이터

**Semantic Caching**:
- [ ] Gemini Embedding으로 질문 벡터화
- [ ] Qdrant에서 유사 질문 검색 (threshold: 0.9)
- [ ] 캐시 히트 시 저장된 응답 반환
- [ ] 캐시 미스 시 AI 호출 → 결과 캐싱

---

## 4. 데이터 구조

### 4.1 섹션 데이터 (`sections.json`)

```json
{
  "sections": [
    {
      "id": "value-class-init",
      "title": "Value Class - 초기화",
      "titleEn": "Value Class - Initialization",
      "lineStart": 37,
      "lineEnd": 49,
      "category": "autograd",
      "description": {
        "purpose": "신경망 학습의 핵심인 역전파를 위한 자동 미분 엔진",
        "concepts": [
          {
            "name": "계산 그래프",
            "explanation": "연산들의 연결 관계를 저장하는 구조"
          },
          {
            "name": "Gradient",
            "explanation": "손실 함수에 대한 각 파라미터의 미분값"
          }
        ],
        "variables": [
          {
            "name": "data",
            "type": "float",
            "description": "실제 숫자 값"
          },
          {
            "name": "grad",
            "type": "float",
            "description": "이 노드에 대한 loss의 미분값"
          },
          {
            "name": "_children",
            "type": "tuple",
            "description": "이 값을 만든 입력 노드들"
          },
          {
            "name": "_local_grads",
            "type": "tuple",
            "description": "자식에 대한 국소 미분값"
          }
        ]
      },
      "relatedTerms": ["backpropagation", "chain-rule", "computation-graph"],
      "diagramHighlight": ["autograd-block"]
    }
  ]
}
```

### 4.2 AI 컨텍스트 (`context.md`)

AI System Prompt에 포함될 전체 컨텍스트:

```markdown
# microGPT 코드 설명 도우미

당신은 Andrej Karpathy의 microgpt.py 코드를 설명하는 도우미입니다.
비전문가도 이해할 수 있도록 친절하게 설명하세요.

## 코드 구조
[전체 코드 또는 요약]

## 용어 정의
- **wte**: Weight Token Embedding - 토큰을 벡터로 변환하는 행렬
- **wpe**: Weight Position Embedding - 위치 정보를 인코딩하는 행렬
- **softmax**: 숫자 벡터를 확률 분포로 변환하는 함수
...

## 섹션별 설명
[각 섹션 요약]

## 응답 지침
1. microgpt.py 관련 질문은 위 컨텍스트를 기반으로 답변
2. 일반 ML 질문은 웹 검색 결과를 활용
3. 관련 코드 섹션이 있으면 섹션 번호와 라인 번호 안내
4. 수식이 필요하면 간단한 텍스트로 표현
```

---

## 5. UI/UX 설계

### 5.1 전체 레이아웃

```
┌──────────────────────────────────────────────────────────────────┐
│  Header: microGPT Visualizer                    [GitHub] [다크] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   아키텍처 다이어그램                        │ │
│  │   [Input] → [Embed] → [Attention] → [MLP] → [Output]       │ │
│  │                          ↑ 클릭 가능                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
├────────────────────────────────┬─────────────────────────────────┤
│                                │                                 │
│        코드 뷰어 (60%)          │       설명 패널 (40%)           │
│                                │                                 │
│   ▼ Section 1: Imports        │   ## Value Class               │
│   ▼ Section 2: Dataset        │                                 │
│   ▶ Section 3: Tokenizer      │   ### 목적                      │
│     27 | uchars = sorted(...  │   자동 미분을 위한 래퍼 클래스    │
│     28 |   set("".join(docs)) │                                 │
│     ...                       │   ### 핵심 개념                  │
│                                │   - 계산 그래프: ...            │
│                                │   - Gradient: ...              │
│                                │                                 │
│                                │   ### 관련 용어                  │
│                                │   [Backprop] [Chain Rule]       │
│                                │                                 │
└────────────────────────────────┴─────────────────────────────────┘
│                                                                  │
│  [💬] ← AI 챗봇 플로팅 버튼                                       │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 반응형 (모바일)

```
┌─────────────────────────┐
│  microGPT     [≡] 메뉴  │
├─────────────────────────┤
│   [다이어그램] [코드]    │  ← 탭 전환
├─────────────────────────┤
│                         │
│   (선택된 뷰 표시)       │
│                         │
│                         │
├─────────────────────────┤
│   설명 패널 (하단 시트)  │
│   ↑ 드래그로 확장        │
└─────────────────────────┘
      [💬]
```

### 5.3 색상 테마

```css
:root {
  /* Light Mode */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --accent: #3b82f6;
  --code-bg: #1e1e1e;

  /* 섹션 카테고리 색상 */
  --color-autograd: #ef4444;
  --color-embedding: #22c55e;
  --color-attention: #3b82f6;
  --color-mlp: #a855f7;
  --color-training: #f59e0b;
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
}
```

---

## 6. 프로젝트 구조

```
microgpt-visualizer/
├── src/
│   ├── App.svelte
│   ├── main.js
│   │
│   ├── components/
│   │   ├── Header.svelte
│   │   ├── ArchitectureDiagram.svelte
│   │   ├── CodeViewer.svelte
│   │   ├── CodeSection.svelte
│   │   ├── ExplanationPanel.svelte
│   │   ├── ChatPopup.svelte
│   │   ├── ChatMessage.svelte
│   │   └── Tooltip.svelte
│   │
│   ├── stores/
│   │   ├── sectionStore.js      # 선택된 섹션 상태
│   │   ├── chatStore.js         # 대화 히스토리
│   │   └── themeStore.js        # 다크모드 상태
│   │
│   ├── services/
│   │   ├── aiService.js         # Gemini API 호출
│   │   ├── searchService.js     # Tavily 웹 검색
│   │   └── cacheService.js      # Qdrant 캐싱
│   │
│   ├── data/
│   │   ├── sections.json        # 코드 섹션 메타데이터
│   │   ├── context.md           # AI 시스템 프롬프트
│   │   └── microgpt.py          # 원본 소스코드
│   │
│   └── styles/
│       ├── global.css
│       ├── code.css
│       └── chat.css
│
├── public/
│   └── favicon.svg
│
├── api/                          # 서버리스 함수 (선택)
│   ├── chat.js                  # AI 응답 엔드포인트
│   └── search.js                # 웹 검색 엔드포인트
│
├── docker-compose.yml            # Qdrant 로컬 실행
├── package.json
├── vite.config.js
└── README.md
```

---

## 7. API 명세

### 7.1 AI Chat (내부 또는 Cloudflare Worker)

**POST /api/chat**

```json
// Request
{
  "message": "softmax가 뭐야?",
  "history": [
    {"role": "user", "content": "이전 질문"},
    {"role": "assistant", "content": "이전 답변"}
  ]
}

// Response
{
  "content": "Softmax는 임의의 실수 벡터를 확률 분포로 변환하는 함수입니다...",
  "relatedSections": [8, 10],
  "cached": false,
  "searchUsed": false
}
```

### 7.2 Semantic Cache (Qdrant)

```python
# 컬렉션 스키마
{
  "collection": "query_cache",
  "vectors": {
    "size": 768,
    "distance": "Cosine"
  },
  "payload_schema": {
    "query": "string",
    "response": "string",
    "relatedSections": "integer[]",
    "createdAt": "datetime"
  }
}
```

---

## 8. 개발 단계

### Phase 1: 기반 구축 (Foundation)

**목표**: 프로젝트 셋업 및 기본 UI

**태스크**:
- [ ] Svelte + Vite 프로젝트 생성
- [ ] 기본 레이아웃 (Header, 3단 구조)
- [ ] 다크모드 토글
- [ ] `sections.json` 데이터 작성 (14개 섹션)
- [ ] 글로벌 스타일링

**산출물**: 정적 레이아웃 완성

---

### Phase 2: 코드 뷰어 (Code Viewer)

**목표**: 인터랙티브 코드 탐색

**태스크**:
- [ ] microgpt.py 로드 및 파싱
- [ ] 섹션별 코드 렌더링 (Prism.js)
- [ ] 섹션 접기/펼치기
- [ ] 섹션 클릭 → 설명 패널 업데이트 (Svelte Store)
- [ ] 변수 호버 → 툴팁
- [ ] 라인 번호 표시

**산출물**: 작동하는 코드 뷰어

---

### Phase 3: 설명 패널 (Explanation Panel)

**목표**: 섹션별 상세 설명 표시

**태스크**:
- [ ] 섹션 데이터 기반 렌더링
- [ ] 목적 / 핵심 개념 / 변수 설명 UI
- [ ] 관련 용어 링크 (클릭 시 AI 검색)
- [ ] 수식 렌더링 (KaTeX 또는 텍스트)

**산출물**: 완성된 설명 패널

---

### Phase 4: 아키텍처 다이어그램 (Diagram)

**목표**: GPT 구조 시각화

**태스크**:
- [ ] 전체 흐름 SVG 설계
- [ ] Transformer Layer 상세 SVG
- [ ] 블록 클릭 → 코드 섹션 연동
- [ ] 현재 섹션 하이라이트
- [ ] 호버 툴팁

**산출물**: 인터랙티브 다이어그램

---

### Phase 5: AI 챗봇 (Chat)

**목표**: 질의응답 기능

**태스크**:
- [ ] ChatPopup 컴포넌트
- [ ] 플로팅 버튼 + 팝업 토글
- [ ] Gemini API 연동
- [ ] 스트리밍 응답 표시
- [ ] "관련 코드 보기" 링크

**산출물**: 기본 AI 챗봇

---

### Phase 6: 캐싱 & 웹 검색 (Advanced AI)

**목표**: 성능 최적화 및 외부 검색

**태스크**:
- [ ] Docker Compose로 Qdrant 실행
- [ ] Gemini Embedding 연동
- [ ] Semantic Cache 구현
- [ ] 질문 분류 (내부/외부)
- [ ] Tavily 웹 검색 연동
- [ ] 캐시 적중률 모니터링

**산출물**: 완성된 AI 시스템

---

### Phase 7: 통합 & 배포 (Polish)

**목표**: 완성도 향상 및 배포

**태스크**:
- [ ] 전체 기능 통합 테스트
- [ ] 반응형 디자인 (모바일)
- [ ] 키보드 네비게이션 (접근성)
- [ ] 성능 최적화 (lazy loading)
- [ ] GitHub Pages 배포
- [ ] README.md 작성

**산출물**: 배포된 웹사이트

---

## 9. 예상 비용

### 개발/테스트 단계

| 항목 | 비용 |
|------|------|
| Gemini API (Flash) | 무료 |
| Gemini Embedding | 무료 |
| Qdrant (로컬 Docker) | 무료 |
| Tavily (1,000회/월) | 무료 |
| **합계** | **$0** |

### 운영 단계 (월간, 100명/일 가정)

| 항목 | 비용 |
|------|------|
| GitHub Pages | 무료 |
| Cloudflare Workers | 무료 (100K 요청/일) |
| Gemini API | 무료 (캐싱으로 호출 최소화) |
| Qdrant Cloud (필요시) | 무료 티어 또는 ~$25/월 |
| **합계** | **$0 ~ $25** |

---

## 10. 성공 지표

| 지표 | 목표 |
|------|------|
| 코드 커버리지 | 14개 섹션 모두 설명 포함 |
| 응답 시간 | 캐시 히트 < 100ms, 미스 < 3s |
| 캐시 적중률 | > 60% |
| 모바일 지원 | 반응형 완전 지원 |
| Lighthouse 점수 | Performance > 90 |

---

## 11. 참고 자료

- [microgpt.py 원본](https://karpathy.github.io/2026/02/12/microgpt/)
- [Svelte 공식 문서](https://svelte.dev/)
- [Qdrant 문서](https://qdrant.tech/documentation/)
- [Gemini API 문서](https://ai.google.dev/docs)
- [Tavily API 문서](https://tavily.com/docs)

---

## 부록 A: 전체 용어 목록

| 용어 | 코드 변수 | 카테고리 |
|------|-----------|----------|
| Token Embedding | wte | embedding |
| Position Embedding | wpe | embedding |
| Query | attn_wq, q | attention |
| Key | attn_wk, k | attention |
| Value | attn_wv, v | attention |
| Output Projection | attn_wo | attention |
| Multi-Head | n_head, head_dim | attention |
| Feed-Forward | mlp_fc1, mlp_fc2 | mlp |
| RMSNorm | rmsnorm | normalization |
| Softmax | softmax, probs | activation |
| ReLU | relu | activation |
| Residual Connection | x_residual | architecture |
| Language Model Head | lm_head | output |
| Adam Optimizer | m, v, learning_rate | training |
| Gradient | grad | autograd |
| Backpropagation | backward | autograd |
| KV Cache | keys, values | inference |
| Temperature | temperature | inference |
| BOS Token | BOS | tokenizer |

