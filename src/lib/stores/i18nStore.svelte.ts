export type Locale = 'ko' | 'en';

interface LandingTranslations {
	headline: string;
	subheadline: string;
	cta: string;
	dragHint: string;
	featureAiTitle: string;
	featureAiDesc: string;
	featureDrillTitle: string;
	featureDrillDesc: string;
	featureBrowserTitle: string;
	featureBrowserDesc: string;
}

interface SnippetTranslations {
	divider: string;
	placeholder: string;
	analyze: string;
	lines: string;
	emptyError: string;
}

interface LegendTranslations {
	title: string;
	depends_on: string;
	calls: string;
	extends: string;
	uses: string;
}

export interface AnalysisProgressTranslations {
	waitingParse: string;
	extractingSkeleton: string;
	requestingAI: string;
	generatingDiagram: string;
}

interface TranslationSet {
	title: string;
	subtitle: string;
	darkMode: string;
	lightMode: string;
	chatPlaceholder: string;
	chatTitle: string;
	send: string;
	relatedNodes: string;
	loading: string;
	settings: string;
	openDirectory: string;
	dropHere: string;
	dropHint: string;
	noApiKey: string;
	cacheEnabled: string;
	clearCache: string;
	codeTheme: string;
	apiKeyPlaceholder: string;
	analyzing: string;
	analysisProgress: AnalysisProgressTranslations;
	landing: LandingTranslations;
	snippet: SnippetTranslations;
	legend: LegendTranslations;
	shortcuts: {
		title: string;
		search: string;
		toggleTheme: string;
		toggleView: string;
		toggleSidebar: string;
		exportDiagram: string;
		showHelp: string;
		closeModal: string;
	};
}

const translations: Record<Locale, TranslationSet> = {
	ko: {
		title: 'Ropeman',
		subtitle: '코드베이스를 시각적으로 탐색하세요',
		darkMode: '다크모드',
		lightMode: '라이트모드',
		chatPlaceholder: '코드에 대해 질문하세요...',
		chatTitle: 'AI 도우미',
		send: '전송',
		relatedNodes: '관련 코드 보기',
		loading: '응답 생성 중...',
		settings: '설정',
		openDirectory: '폴더 열기',
		dropHere: '프로젝트 폴더를 여기에 드롭하세요',
		dropHint: 'Python, JavaScript, TypeScript 프로젝트 지원',
		noApiKey: 'Settings에서 Gemini API 키를 입력하세요',
		cacheEnabled: '캐시 활성화',
		clearCache: '캐시 초기화',
		codeTheme: '코드 테마',
		apiKeyPlaceholder: 'Gemini API 키 입력',
		analyzing: '분석 중...',
		analysisProgress: {
			waitingParse: '파싱 대기 중...',
			extractingSkeleton: '스켈레톤 추출 중...',
			requestingAI: 'AI 분석 요청 중...',
			generatingDiagram: '다이어그램 생성 중...'
		},
		landing: {
			headline: '코드를 읽기 전에, 먼저 구조를 보세요',
			subheadline:
				'AI가 코드베이스를 분석하여 의미 기반 다이어그램을 자동 생성합니다. 폴더를 열면 바로 시작됩니다.',
			cta: '폴더 열기',
			dragHint: '또는 프로젝트 폴더를 여기에 드래그하세요',
			featureAiTitle: 'AI 의미 분석',
			featureAiDesc: '파일 트리가 아닌, 역할과 도메인 기반의 구조를 AI가 자동 파악',
			featureDrillTitle: '재귀적 탐색',
			featureDrillDesc: '영역 클릭 시 AI가 하위 구조를 점진적으로 분석',
			featureBrowserTitle: '100% 브라우저',
			featureBrowserDesc: '코드가 브라우저를 떠나지 않음. WASM 파싱 + 로컬 분석'
		},
		snippet: {
			divider: '또는 코드 스니펫으로 체험하기',
			placeholder: '여기에 코드를 붙여넣으세요...',
			analyze: '분석하기',
			lines: '줄',
			emptyError: '코드를 입력해주세요'
		},
		legend: {
			title: '범례',
			depends_on: '의존',
			calls: '호출',
			extends: '상속',
			uses: '사용'
		},
		shortcuts: {
			title: '키보드 단축키',
			search: '검색',
			toggleTheme: '테마 전환',
			toggleView: '뷰 전환 (시맨틱/코드)',
			toggleSidebar: '사이드바 토글',
			exportDiagram: '다이어그램 내보내기',
			showHelp: '단축키 도움말',
			closeModal: '모달 닫기'
		}
	},
	en: {
		title: 'Ropeman',
		subtitle: 'Explore codebases visually',
		darkMode: 'Dark Mode',
		lightMode: 'Light Mode',
		chatPlaceholder: 'Ask about the code...',
		chatTitle: 'AI Assistant',
		send: 'Send',
		relatedNodes: 'View Related Code',
		loading: 'Generating response...',
		settings: 'Settings',
		openDirectory: 'Open Directory',
		dropHere: 'Drop a project folder here',
		dropHint: 'Supports Python, JavaScript, and TypeScript projects',
		noApiKey: 'Enter your Gemini API key in Settings',
		cacheEnabled: 'Cache Enabled',
		clearCache: 'Clear Cache',
		codeTheme: 'Code Theme',
		apiKeyPlaceholder: 'Enter Gemini API key',
		analyzing: 'Analyzing...',
		analysisProgress: {
			waitingParse: 'Waiting for parsing...',
			extractingSkeleton: 'Extracting skeleton...',
			requestingAI: 'Requesting AI analysis...',
			generatingDiagram: 'Generating diagram...'
		},
		landing: {
			headline: 'See the structure before reading the code',
			subheadline:
				'AI analyzes your codebase and generates semantic architecture diagrams. Just open a folder to start.',
			cta: 'Open a Folder',
			dragHint: 'or drag & drop a project folder anywhere',
			featureAiTitle: 'AI Semantic Analysis',
			featureAiDesc: 'AI identifies roles and domains, not just the file tree',
			featureDrillTitle: 'Recursive Drill-down',
			featureDrillDesc: 'Click any area and AI progressively analyzes deeper structures',
			featureBrowserTitle: '100% Browser-based',
			featureBrowserDesc: 'Your code never leaves the browser. WASM parsing + local analysis'
		},
		snippet: {
			divider: 'or try a code snippet',
			placeholder: 'Paste your code here...',
			analyze: 'Analyze',
			lines: 'lines',
			emptyError: 'Please enter some code'
		},
		legend: {
			title: 'Legend',
			depends_on: 'Depends on',
			calls: 'Calls',
			extends: 'Extends',
			uses: 'Uses'
		},
		shortcuts: {
			title: 'Keyboard Shortcuts',
			search: 'Search',
			toggleTheme: 'Toggle Theme',
			toggleView: 'Toggle View (Semantic/Code)',
			toggleSidebar: 'Toggle Sidebar',
			exportDiagram: 'Export Diagram',
			showHelp: 'Show Shortcuts Help',
			closeModal: 'Close Modal'
		}
	}
};

function createI18nStore() {
	let locale = $state<Locale>('ko');

	return {
		get locale() {
			return locale;
		},
		set locale(v: Locale) {
			locale = v;
		},
		t(key: string): string {
			const keys = key.split('.');
			let value: unknown = translations[locale];
			for (const k of keys) {
				if (value && typeof value === 'object' && k in value) {
					value = (value as Record<string, unknown>)[k];
				} else {
					return key;
				}
			}
			return value as string;
		},
		toggleLocale() {
			locale = locale === 'ko' ? 'en' : 'ko';
		},
		getProgressMessage(key: keyof AnalysisProgressTranslations): string {
			return translations[locale].analysisProgress[key];
		}
	};
}

export const i18nStore = createI18nStore();
