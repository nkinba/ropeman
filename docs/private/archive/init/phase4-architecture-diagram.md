# Phase 4: Architecture Diagram - 결과 문서

## 완료 상태: ✅ 완료 (Agent C)

## 수행 내용

### 생성된 파일 (1개)

#### `src/components/ArchitectureDiagram.svelte`

**SVG 기반 GPT 아키텍처 시각화**:
- viewBox="0 0 770 205", preserveAspectRatio="xMidYMid meet"
- 100% 반응형 (컨테이너 220px 높이에 맞춤)

**블록 구성**:
| 블록 | ID | 색상 | 연결 섹션 |
|------|----|------|-----------|
| 입력/Input | input-block | --color-tokenizer | tokenizer |
| 임베딩/Embedding | embed-block | --color-embedding | gpt-embedding |
| 어텐션/Attention | attention-block | --color-attention | gpt-attention |
| MLP | mlp-block | --color-mlp | gpt-mlp |
| 출력/Output | output-block | --color-inference | inference |
| 학습/Training | training-block | --color-training | training-loop |
| 자동미분/Autograd | autograd-block | --color-autograd | value-class-init |

**인터랙티브 기능**:
- 블록 클릭 → selectSection + expandSection 호출
- selectedSectionId 구독 → 연관 블록 하이라이트 (두꺼운 스트로크, 색상 필)
- 호버 시 drop-shadow 글로우 효과
- 커서: pointer

**레이어 구조**:
1. 배경: Autograd (점선 아웃라인)
2. 화살표: 블록 간 데이터 흐름
3. 컨테이너: Transformer Layer
4. 서브 라벨: RMSNorm, +Residual
5. 인터랙티브 블록 (최상위)

**i18n**:
- 한국어: 입력, 임베딩, 어텐션, MLP, 출력, 학습, 자동미분
- 영어: Input, Embedding, Attention, MLP, Output, Training, Autograd
