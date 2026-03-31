# Stitch 정본 vs 현재 코드 — 정밀 비교 보고서

> 기준: `.stitch-html/` 내 사용자 확인 정본 HTML (2026-03-31)
> DESIGN.md의 Sidebar icon bar 40px 규격은 정본 HTML의 48px와 상충 → HTML 우선

---

## 1. Header (semantic-diagram.html 기준)

### 일치 항목 (OK)

- height: 48px ✓
- bg: #0f141a ✓
- padding: 0 16px ✓
- ROPEMAN: 18px, bold, tracking-widest(0.1em), color #a3a6ff ✓

### 차이 항목

| 항목                      | Stitch 정본                                                                                                          | 현재 코드                                     | 조치                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------- |
| header border-bottom      | `border-b border-white/5` = 1px solid rgba(255,255,255,0.05)                                                         | 없음                                          | 추가 필요             |
| header-left gap           | `gap-8` (32px) — logo와 nav 사이                                                                                     | `gap: 12px`                                   | 32px로 변경           |
| nav tabs (Diagram/Code)   | `h-full, border-b-2 border-primary, 11px, tracking-wider, uppercase`                                                 | TabBar 컴포넌트로 대체                        | 별도 평가 (아래 참고) |
| "New" 버튼 스타일         | `bg-[#1b2028] border border-white/10 text-secondary px-3 py-1`                                                       | ghost style `text-btn`                        | CSS 변경 필요         |
| 우측 컨트롤 구분선        | `border-l border-white/10 pl-4 ml-2` — EN/한, theme, settings 앞                                                     | 없음                                          | 추가 필요             |
| EN/한 버튼                | `text-[11px] font-bold` 텍스트 버튼                                                                                  | 14px font-weight 600                          | 11px로 변경           |
| theme/settings 아이콘     | `text-[18px]` Material icon                                                                                          | SVG 18px                                      | 유지 가능 (동일 크기) |
| track badge               | `bg-primary/10 border-primary/20 px-2 py-0.5 rounded-full, dot w-1.5 h-1.5 animate-pulse, text 9px tracking-tighter` | `border-radius: 12px, dot 7px, text 11px 600` | 값 변경 필요          |
| Analyze btn border-radius | `rounded` (4px)                                                                                                      | `8px`                                         | 4px로 변경            |
| Analyze btn padding       | `px-3 py-1` (12px 4px)                                                                                               | `4px 16px`                                    | px 12px로 변경        |

### 구조 차이 (HTML 변경 필요)

- Stitch: 헤더 내 nav 탭(Diagram/Code)이 존재 → 현재 앱은 TabBar가 canvas-area 위에 별도 존재. **구조 유지, CSS만 참고.**

---

## 2. Sidebar (semantic-diagram.html 기준)

### 일치 항목 (OK)

- icon bar: 48px, bg #0f141a, py-4, gap-4 ✓
- icon btn: 40x40 ✓
- active icon: border-l-2 border-primary, bg #1b2028, text primary ✓
- content bg: #151a21 ✓
- section title: 11px, headline, bold, uppercase, tracking-wider, slate-500 ✓

### 차이 항목

| 항목                        | Stitch 정본                                                                  | 현재 코드                    | 조치                            |
| --------------------------- | ---------------------------------------------------------------------------- | ---------------------------- | ------------------------------- |
| 전체 sidebar width          | `w-[280px]`                                                                  | 48+232=280px                 | OK                              |
| sidebar 우측 border         | `border-r border-white/5`                                                    | 없음 (No-Line Rule 적용)     | Stitch에선 있음 → 추가          |
| content panel border-bottom | `border-b border-surface-low/30`                                             | 없음                         | 추가 (panel-header에)           |
| semantic tree dot           | `w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(163,166,255,0.4)]` | 없음 (SemanticTree 컴포넌트) | SemanticTree.svelte에 반영 필요 |
| tree item active bg         | `bg-[#1b2028] rounded`                                                       | 컴포넌트 내부                | 확인 필요                       |
| tree item hover             | `hover:bg-surface-high/50`                                                   | 컴포넌트 내부                | 확인 필요                       |
| tree item font              | `text-xs` (12px)                                                             | 컴포넌트 내부                | 확인 필요                       |
| bottom icon (info)          | Stitch: info 아이콘                                                          | 현재: settings 아이콘        | 참고만                          |

---

## 3. Semantic Nodes (semantic-diagram.html 기준)

### 일치 항목 (OK)

- bg: #1b2028 ✓
- border: 1px solid rgba(255,255,255,0.05) ✓
- padding: 16px (p-4) ✓
- accent bar: absolute, 4px, rounded-l-lg ✓
- title: 13px, headline, bold, uppercase ✓
- badge: bg-primary/20, text-primary, 9px, uppercase ✓
- symbol tags: bg-surface-container(#151a21), 10px ✓
- selected: border-2 border-primary, shadow-2xl ✓

### 차이 항목

| 항목                      | Stitch 정본                                          | 현재 코드                   | 조치                                                                                      |
| ------------------------- | ---------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| title tracking            | `tracking-wide` (0.025em)                            | 0.025em                     | OK                                                                                        |
| badge font-weight         | `font-bold` (700)                                    | 500                         | 700으로 변경                                                                              |
| symbol tags color         | `text-slate-500` ≈ #64748b                           | var(--text-muted) = #72757d | 근사치, 유지                                                                              |
| symbol tags gap           | `gap-1.5` (6px)                                      | `gap: 4px`                  | 6px로 변경                                                                                |
| node-glow                 | `filter: drop-shadow(0 0 8px rgba(83,221,252,0.2))`  | 동일                        | OK                                                                                        |
| hover bg                  | `hover:bg-[#20262f]`                                 | var(--bg-highest) = #20262f | OK                                                                                        |
| secondary node title font | `font-medium` (500), `text-[12px]`, `text-slate-200` | 700, 13px, text-primary     | Stitch는 secondary가 더 작고 가벼움 — **현재는 구분 없음**                                |
| secondary node padding    | `p-3` (12px)                                         | 16px 동일                   | Stitch에선 secondary가 더 작음 — **라이브러리 한계** (SvelteFlow에서 노드 타입 분리 필요) |

### 라이브러리 한계

- SvelteFlow는 단일 `SemanticNode` 타입을 사용. Stitch에서 selected/secondary 노드의 크기·폰트가 다르지만, 현재 구조에서는 동일 컴포넌트로 렌더링됨. 분리하려면 `secondarySemanticNode` 타입을 추가해야 함.

---

## 4. Canvas/Main Area (semantic-diagram.html 기준)

| 항목              | Stitch 정본                                                            | 현재 코드                          | 조치                                                                            |
| ----------------- | ---------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| canvas bg         | `bg-[#0f141a]` (surface-low)                                           | var(--bg-lowest) = #000000         | **변경 필요: #0f141a**                                                          |
| grid dot pattern  | `radial-gradient(#a3a6ff 1px, transparent 1px); 24px 24px; opacity-10` | SvelteFlow `<Background>` 컴포넌트 | SvelteFlow Background gap=24, size=1 이미 설정. 색상 커스텀은 CSS override 가능 |
| edge stroke       | `#53ddfc, stroke-dasharray 4 4, stroke-width 1.5, opacity-50`          | semanticGraphBuilder.ts에서 설정   | 확인 필요                                                                       |
| floating controls | `bg-[#1b2028]/80 backdrop-blur-md, rounded-full, border-white/10`      | SvelteFlow Controls 사용           | **반영 불가** — SvelteFlow 내장 컨트롤                                          |

### 중요 차이: 캔버스 배경색

- DESIGN.md: `surface-container-lowest (#000000)` for canvas
- 정본 HTML: `bg-[#0f141a]` (surface-low)
- 현재 코드: `#000000`
- **HTML 기준 #0f141a로 변경해야 함**

---

## 5. Right Detail Panel (semantic-diagram.html 기준)

| 항목           | Stitch 정본                                                           | 현재 코드                        | 조치                                       |
| -------------- | --------------------------------------------------------------------- | -------------------------------- | ------------------------------------------ |
| width          | `w-[300px]`                                                           | 400px                            | **300px로 변경**                           |
| bg             | `bg-[#151a21]` (surface-container)                                    | var(--bg-secondary)              | OK (동일)                                  |
| left border    | `border-l border-white/5`                                             | background tonal (border 제거됨) | **복원: 1px solid rgba(255,255,255,0.05)** |
| header padding | `p-5` (20px)                                                          | 컴포넌트 내부                    | 확인                                       |
| title icon     | Material Symbols `hub`                                                | 없음                             | 추가 가능                                  |
| title          | `14px, headline, bold, uppercase, tracking-wide`                      | 컴포넌트 내부                    | 확인                                       |
| files section  | `p-5`, `11px headline bold uppercase`, file items with Material icons | 컴포넌트 내부                    | 확인                                       |
| key symbols    | `bg-[#1b2028] px-2 py-1, code font, 10px, colored dots`               | 컴포넌트 내부                    | 확인                                       |
| footer action  | `bg-surface-high/30, uppercase tracking-widest button`                | 없음                             | 추가 고려                                  |

---

## 6. Welcome / Empty State (welcome.html 기준)

### 일치 항목 (OK)

- headline: 48px(text-5xl), font-headline, bold, white, leading-tight ✓
- "시각화하세요" accent color ✓
- subtitle: 18px(text-lg), slate-400, max-w-md, leading-relaxed ✓
- CTA: bg-primary, px-8 py-4, rounded-lg, font-headline, font-bold, text-lg, shadow-lg shadow-primary/20 ✓
- drag hint: font-code, text-sm(14px), slate-500 ✓
- dropzone: SVG dashed border #a3a6ff44 ✓
- feature cards: bg #151a21, p-8, border-white/5, hover:border-xxx/30 ✓
- feature icons: Material Symbols, text-3xl, per-card color ✓
- feature title: 18px, headline, bold ✓
- feature desc: 14px(text-sm), slate-400 ✓
- lang pills: rounded-full, bg-white/5, border-white/5, text-xs ✓
- "Supported Languages" label: 11px, headline, bold, uppercase, tracking-widest, slate-600 ✓

### 차이 항목

| 항목                | Stitch 정본                                        | 현재 코드                        | 조치                                                                          |
| ------------------- | -------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| header (welcome)    | `border-b border-white/5`, `px-6`, settings+help만 | 현재 Header 컴포넌트             | Welcome에서는 Analyze 버튼/track badge 숨김 — 이미 hasProject 조건으로 처리됨 |
| main bg             | `bg-[#0a0e14]` (surface)                           | bg-primary (#0a0e14)             | OK                                                                            |
| max-width           | `max-w-6xl` (1152px)                               | 960px                            | **1152px로 변경**                                                             |
| hero grid gap       | `gap-12` (48px)                                    | `gap: 40px`                      | 48px로 변경                                                                   |
| hero min-height     | `min-h-[500px]`                                    | 없음                             | 추가                                                                          |
| hero illustration   | SVG hero-nodes with grid pattern                   | HeroIllustration.svelte 컴포넌트 | 유지 (커스텀 컴포넌트)                                                        |
| feature cards grid  | `grid grid-cols-3 gap-6`                           | flex gap-16px                    | **gap 24px(gap-6)로 변경**                                                    |
| feature section mt  | `mb-20` (80px)                                     | margin-bottom: 80px              | OK                                                                            |
| lang pills padding  | `px-4 py-1.5` (16px 6px)                           | `6px 16px`                       | OK                                                                            |
| lang pills label mb | `mb-6` (24px)                                      | 24px                             | OK                                                                            |
| footer (welcome)    | `h-8, bg #151a21, border-t border-white/5`         | 없음                             | **현재 앱에 footer 없음**                                                     |

---

## 7. Settings Modal (settings.html 기준)

### 차이 항목 (현재 적용된 것 vs 정본)

| 항목          | Stitch 정본                                                  | 현재 코드                                          | 조치                              |
| ------------- | ------------------------------------------------------------ | -------------------------------------------------- | --------------------------------- |
| glass bg      | `rgba(32,38,47,0.85)`                                        | `rgba(27,32,40,0.7)` — variant 기준                | **0.85로 복원**                   |
| glass border  | `rgba(68,72,79,0.15)`                                        | `rgba(255,255,255,0.1)`                            | **0.15로 복원**                   |
| glass blur    | `blur(20px)`                                                 | 24px (variant 기준)                                | **20px로 복원**                   |
| modal width   | `max-w-[480px]`                                              | 420px                                              | **480px로 변경**                  |
| header title  | `12px, tracking-[0.1em], text-primary, uppercase` "SETTINGS" | 16px, 700, text-primary                            | **12px, 0.1em으로 변경**          |
| header border | `border-b border-white/5`                                    | transparent + border-bottom rgba(255,255,255,0.05) | OK                                |
| section title | `11px, tracking-[0.05em], uppercase, slate-500`              | 10px, 0.1em                                        | **11px, 0.05em으로 변경**         |
| section card  | `bg-surface-container p-4 rounded-lg` 카드 그룹핑            | flat (카드 없음)                                   | **HTML 구조 변경 필요**           |
| select bg     | `bg-surface-lowest` (#000)                                   | bg-primary                                         | **surface-lowest로 변경**         |
| slider        | custom: 4px height, 12px thumb, primary color                | 브라우저 기본 accent                               | **커스텀 슬라이더 CSS 추가**      |
| toggle        | `w-10 h-5, rounded-full, 3px knob`                           | w-44 h-24                                          | **Stitch는 더 작은 토글**         |
| kbd keys      | `bg-surface-container-high text-primary, font-mono 10px`     | bg-lowest                                          | **surface-container-high로 변경** |
| footer        | gradient Save 버튼 + Cancel                                  | 없음                                               | **구조 차이 — 현재 유지**         |

---

## 8. Analyze Modal (settings.html의 glass-card 기준)

settings.html의 모달 컬렉션에서 AnalyzeModal 부분:

| 항목                        | Stitch 정본                                    | 현재 코드                                         | 조치                                                                                             |
| --------------------------- | ---------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| glass-card bg               | `bg-[#1b2028]/70`                              | `rgba(27,32,40,0.7)`                              | OK (동일)                                                                                        |
| glass-card blur             | `backdrop-blur-xl` (24px)                      | 24px                                              | **정본은 설정 모달과 다름** — settings는 20px, modals collection은 24px. **DESIGN.md 기준 20px** |
| width                       | `w-[420px]`                                    | 520px                                             | **420px로 변경?** — 원본(별도 화면)은 520px. 모달 컬렉션은 420px. 기능상 520px 유지              |
| header icon                 | Material `auto_awesome`                        | 없음                                              | 추가 고려                                                                                        |
| track card active           | `bg-primary/10 border-primary/30`              | `rgba(163,166,255,0.1)` + `rgba(163,166,255,0.3)` | OK                                                                                               |
| track card inactive         | `bg-white/5 border-white/5`                    | `rgba(255,255,255,0.05)`                          | OK                                                                                               |
| track card icon container   | `w-10 h-10 rounded-lg bg-xxx/20` Material icon | emoji text                                        | **HTML 구조 변경 필요**                                                                          |
| drilldown width             | `w-[320px]`                                    | 320px                                             | OK                                                                                               |
| drilldown close button 위치 | 없음 (우측에 "DRILLDOWN" 라벨)                 | ✕ 버튼                                            | 유지                                                                                             |

---

## 9. Code Viewer (source-editor.html 기준)

### 참고용 (CodeViewer.svelte는 별도 라이브러리 사용)

| 항목                 | Stitch 정본                                                                                |               반영 가능성               |
| -------------------- | ------------------------------------------------------------------------------------------ | :-------------------------------------: | ------------------ |
| code header bar      | file breadcrumb + language badge + copy button                                             |                부분 가능                |
| tab bar style        | `border-t-2 border-primary` (상단 indicator)                                               | 현재 border-bottom 사용 — **변경 가능** |
| line gutter          | `w-12, bg #0f141a, border-r border-white/5, 11px font-code slate-600`                      |    highlight.js 사용 중 — 부분 반영     |
| syntax colors        | keyword=#ac8aff, func=#53ddfc, string=#7ad4a0, type=#f2c478, comment=#4b5563, meta=#a3a6ff |       syntaxThemeService에서 관리       |
| symbol outline panel | `w-[240px], bg #151a21, 11px font-code`                                                    |    CodeViewer에 symbol sidebar 없음     | **구조 추가 필요** |

---

## 10. Loading States (project-loading.html 기준)

### 참고용 (D1-7 로드맵 대상)

| 항목              | Stitch 정본                                                        | 현재 코드                 |
| ----------------- | ------------------------------------------------------------------ | ------------------------- |
| overlay           | `bg-[#0a0e14]/40` dimming                                          | Dropzone 내 loading-state |
| center spinner    | `w-16 h-16 border-2, border-t-primary animate-spin` + inner icon   | 40x40 border-3            |
| title             | `headline bold white tracking-widest uppercase text-sm`            | 20px 600                  |
| progress text     | `font-code text-xs text-primary/70`                                | 14px text-secondary       |
| analysis pill     | `bg-[#151a21]/90 backdrop-blur-md rounded-full border-tertiary/30` | analysis-progress-pill    |
| download card     | `w-64 bg-[#1b2028] rounded-lg border-white/5 shadow-2xl p-4`       | WebGPU download indicator |
| progress bar glow | `shadow-[0_0_8px_rgba(83,221,252,0.4)]`                            | 없음                      |

---

## 11. global.css 변수 보정 필요

| 변수                | Stitch 정본 (DESIGN.md + HTML)    | 현재 값                 | 조치                          |
| ------------------- | --------------------------------- | ----------------------- | ----------------------------- |
| --glass-bg          | `rgba(32,38,47,0.85)`             | `rgba(27,32,40,0.7)`    | **복원: 0.85**                |
| --glass-blur        | `20px` (DESIGN.md)                | `24px`                  | **복원: 20px**                |
| --glass-border      | `rgba(68,72,79,0.15)` (DESIGN.md) | `rgba(255,255,255,0.1)` | **복원: rgba(68,72,79,0.15)** |
| --landing-max-width | 1152px (max-w-6xl)                | 960px                   | **변경: 1152px**              |

---

## 12. 라이브러리 한계 / 구조 변경이 필요한 항목

| 항목                                              | 이유                                                  | 권장                      |
| ------------------------------------------------- | ----------------------------------------------------- | ------------------------- |
| Track card 아이콘 컨테이너 (w-10 h-10 rounded-lg) | 현재 emoji 기반 → Material icon + 컨테이너 div 필요   | HTML 구조 변경 태스크     |
| Settings 섹션 카드 그룹핑                         | 각 섹션을 bg-surface-container 카드로 감싸야 함       | HTML 구조 변경 태스크     |
| SvelteFlow 캔버스 컨트롤                          | 내장 Controls 컴포넌트, 커스텀 floating controls 불가 | 유지                      |
| 노드 크기 분화 (primary vs secondary)             | SvelteFlow 단일 nodeType                              | nodeType 추가 태스크      |
| Code Viewer symbol outline panel                  | 현재 CodeViewer에 없는 패널                           | 별도 태스크               |
| 헤더 내 nav 탭                                    | Stitch에만 존재, 앱은 TabBar 사용                     | 유지                      |
| Footer status bar                                 | 현재 앱에 없음                                        | 별도 태스크 (D1-7과 함께) |
| Settings custom slider                            | CSS만으로 가능하나 크로스브라우저 이슈                | CSS 추가                  |

---

## 요약: 즉시 반영 가능한 CSS 변경 목록

### global.css

1. `--glass-bg`: `rgba(32,38,47,0.85)` 로 복원
2. `--glass-blur`: `20px` 로 복원
3. `--glass-border`: `rgba(68,72,79,0.15)` 로 복원
4. `--landing-max-width`: `1152px` 로 변경

### Header.svelte

5. `header-left gap`: 12px → 32px
6. header `border-bottom`: 추가 `1px solid rgba(255,255,255,0.05)`
7. Analyze btn `border-radius`: 8px → 4px
8. Analyze btn `padding`: 4px 16px → 4px 12px
9. track-badge: `border-radius: 9999px`, `dot: 6px(w-1.5)`, `text: 9px tracking-tighter`
10. 우측 컨트롤 구분선 추가

### Sidebar.svelte

11. sidebar 우측 `border-right`: `1px solid rgba(255,255,255,0.05)` 추가
12. panel-header `border-bottom`: `1px solid rgba(15,20,26,0.3)` 추가

### SemanticNode.svelte

13. badge `font-weight`: 500 → 700
14. symbol tags `gap`: 4px → 6px

### ZUICanvas.svelte / +page.svelte

15. canvas bg: `var(--bg-lowest)` → `var(--sidebar-icon-bg)` (#0f141a)
16. detail panel `width`: 400px → 300px
17. detail panel `border-left`: 복원 `1px solid rgba(255,255,255,0.05)`

### Dropzone.svelte

18. `--landing-max-width`: 960px → 1152px (global.css에서)
19. hero grid `gap`: 40px → 48px
20. hero `min-height`: 500px 추가
21. feature cards `gap`: 16px → 24px

### SettingsModal.svelte

22. width: 420px → 480px
23. section labels: 10px → 11px, tracking 0.1em → 0.05em
24. select bg: surface-lowest (#000)
25. kbd: bg surface-container-high, text primary
26. custom slider CSS 추가
