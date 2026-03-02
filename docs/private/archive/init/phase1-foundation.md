# Phase 1: Foundation - 결과 문서

## 완료 상태: ✅ 완료

## 수행 내용

### 1.1 프로젝트 셋업
- Svelte 5 + Vite 7 프로젝트 생성
- 의존성 설치: `prismjs`, `marked`
- 디렉토리 구조: `src/{components,stores,services,data,styles}`, `api/`, `docs/`

### 1.2 Store 생성 (4개)
| 파일 | 역할 |
|------|------|
| `src/stores/i18nStore.js` | 한/영 토글, translations 객체, `t()` 파생 함수 |
| `src/stores/themeStore.js` | 다크/라이트 모드 토글, localStorage 연동 |
| `src/stores/sectionStore.js` | 선택된 섹션 ID, 확장 상태, 호버 변수 |
| `src/stores/chatStore.js` | 채팅 메시지 히스토리, 팝업 열기/닫기, 로딩 상태 |

### 1.3 스타일 (3개)
| 파일 | 역할 |
|------|------|
| `src/styles/global.css` | CSS 변수, 다크모드, 스크롤바, 기본 리셋 |
| `src/styles/code.css` | 코드 뷰어 섹션 헤더, 코드 블록, 라인 번호 |
| `src/styles/chat.css` | 채팅 플로팅 버튼, 팝업, 메시지 버블 |

### 1.4 데이터 파일 (3개)
| 파일 | 역할 |
|------|------|
| `src/data/sections.json` | 14개 섹션 메타데이터 (한/영 설명 포함) |
| `src/data/context.md` | AI 시스템 프롬프트 |
| `src/data/microgpt.py` | 원본 소스코드 |

### 1.5 기본 컴포넌트 (2개)
| 파일 | 역할 |
|------|------|
| `src/App.svelte` | 3단 레이아웃 (다이어그램/코드/설명), 모바일 탭 |
| `src/components/Header.svelte` | 제목, 한/영 토글, 다크모드, GitHub 링크 |

### 1.6 설정 파일
- `src/main.js` - 글로벌 CSS 임포트 설정
- `index.html`, `vite.config.js`, `package.json` - Vite 프로젝트 설정

## 빌드 결과
```
✓ 30 modules transformed
✓ Built successfully
```
