# Ropeman Anti-Patterns & 개선 항목

## AP-1: 레거시 Svelte 4 스토어

**문제**: `chatStore.ts`, `i18nStore.ts`, `themeStore.ts`가 `writable()` 사용
**영향**: Svelte 5 runes 패턴과 불일치, 코드 일관성 저하
**해결**: `createXxxStore()` + `$state` 싱글턴으로 마이그레이션

```typescript
// Bad: Svelte 4
import { writable } from 'svelte/store';
export const theme = writable<'dark' | 'light'>('dark');

// Good: Svelte 5
function createThemeStore() {
	let theme = $state<'dark' | 'light'>('dark');
	return {
		get theme() {
			return theme;
		},
		set theme(v) {
			theme = v;
			persist();
		}
	};
}
```

---

## AP-2: Service 내부 상태 보유

**문제**: `parserService.ts`가 Worker 인스턴스 + projectStore 직접 수정
**영향**: 테스트 어려움, 부수효과 추적 어려움
**해결**: Worker 인스턴스는 허용하되, 스토어 수정은 호출자에게 위임

```typescript
// Bad: 서비스가 스토어 직접 수정
export async function parseAllFiles(tree: FileNode) {
	// ...
	projectStore.astMap = new Map(batchMap); // 부수효과
	projectStore.isLoading = false; // 부수효과
}

// Better: 결과만 반환, 호출자가 스토어 수정
export async function parseAllFiles(tree: FileNode): Promise<Map<string, ASTSymbol[]>> {
	// ... 파싱 로직
	return batchMap; // 순수 결과 반환
}
```

---

## AP-3: AI Track 분기 중복

**문제**: `aiService.ts`와 `semanticAnalysisService.ts`에 동일한 track 분기 로직 존재
**영향**: 새 Provider 추가 시 두 곳 모두 수정 필요, DRY 위반
**해결**: 어댑터 팩토리 패턴 도입

```typescript
// Bad: 두 서비스에서 동일 분기 반복
// aiService.ts
if (track === 'webgpu') { ... }
if (track === 'edge') { ... }
if (track === 'bridge') { ... }

// semanticAnalysisService.ts
if (track === 'webgpu') { ... }
if (track === 'edge') { ... }
if (track === 'bridge') { ... }

// Good: 단일 팩토리
type AIAdapter = (system: string, user: string, signal?: AbortSignal) => Promise<string>;

function getAdapter(track: AuthTrack): AIAdapter {
    switch (track) {
        case 'bridge': return (s, u) => sendViaBridge(s + '\n\n' + u);
        case 'webgpu': return (s, u) => webllmGenerate(s, u);
        case 'edge': return (s, u, sig) => callEdgeProxy(s, u, sig);
        case 'byok': return (s, u, sig) => callByok(s, u, sig);
        default: throw new Error('AI not connected');
    }
}
```

---

## AP-4: 에러를 content 문자열에 담아 반환

**문제**: `aiService.ts`에서 에러 시 `{ content: "Error: ...", relatedNodes: [] }` 반환
**영향**: UI에서 에러 상태를 명확히 구분 불가, Fallback UI 구현 어려움

```typescript
// Bad
return { content: `Edge proxy error: ${error.message}`, relatedNodes: [] };

// Good: Result 타입 구분
type AIResult =
	| { ok: true; content: string; relatedNodes: string[] }
	| { ok: false; error: string; code: 'NETWORK' | 'PARSE' | 'AUTH' | 'ABORT' };
```

---

## AP-5: MAX_FILE_SIZE 체크 위치

**문제**: 파일 크기 제한(500KB)이 `parserService.ts`에서 처리 — 파일을 메모리에 로드한 후 체크
**영향**: 대형 파일을 불필요하게 메모리에 로드
**해결**: `fileSystemService.ts`의 디렉토리 탐색 시점에서 체크

```typescript
// Bad: 파일 읽은 후 크기 체크
const fileObj = await handle.getFile();
if (fileObj.size > MAX_FILE_SIZE) {
	continue;
}
const content = await fileObj.text(); // 이미 메모리 로드됨

// Good: 읽기 전 크기 체크
const fileObj = await handle.getFile();
if (fileObj.size > MAX_FILE_SIZE) {
	continue;
} // 읽기 스킵
const content = await fileObj.text();
```

참고: 현재 코드는 이미 `getFile()` 후 size 체크를 하고 있어 text() 호출 전에 스킵되지만, `getFile()` 자체도 메타데이터만 가져오므로 실질적 문제는 작음.

---

## AP-6: Map 복사 빈도

**문제**: `semanticStore`에서 분석 요청 추가/제거 시 매번 `new Map(...)` 복사
**영향**: 분석 요청이 빈번하면 GC 부담
**해결**: Svelte 5의 `$state`가 Map mutation을 추적하므로, 직접 mutation 후 재할당 가능

```typescript
// Bad: 매번 복사
const next = new Map(analysisRequests);
next.set(nodeId, request);
analysisRequests = next;

// Better: mutation 후 재할당 트리거
analysisRequests.set(nodeId, request);
analysisRequests = analysisRequests; // 반응성 트리거
```

---

## AP-7: AnalyzeModal 비즈니스 로직 혼재

**문제**: `AnalyzeModal.svelte`에 API 키 유효성 검증, Bridge 연결, Provider 변경 로직이 모두 포함
**영향**: 컴포넌트 비대화, 테스트 어려움
**해결**: `authService` 또는 `connectionService`로 분리

---

## 우선순위

| ID   | 영향도 | 난이도 | 권장 시기         |
| ---- | ------ | ------ | ----------------- |
| AP-3 | 높음   | 중간   | 다음 스프린트     |
| AP-4 | 높음   | 낮음   | 다음 스프린트     |
| AP-1 | 중간   | 낮음   | 리팩토링 스프린트 |
| AP-2 | 중간   | 중간   | 리팩토링 스프린트 |
| AP-7 | 중간   | 중간   | 리팩토링 스프린트 |
| AP-5 | 낮음   | 낮음   | 필요 시           |
| AP-6 | 낮음   | 낮음   | 필요 시           |
