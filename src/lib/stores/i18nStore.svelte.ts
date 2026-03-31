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
	showSymbols: string;
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
		chatPlaceholder: '아키텍처에 대해 질문하세요...',
		chatTitle: 'ROPEMAN ASSISTANT',
		send: '전송',
		relatedNodes: '관련 코드 보기',
		loading: '응답 생성 중...',
		settings: '설정',
		openDirectory: '폴더 열기',
		dropHere: '프로젝트 폴더를 여기에 드롭하세요',
		dropHint: 'Python, JavaScript, TypeScript 프로젝트 지원',
		noApiKey: 'Settings에서 Gemini API 키를 입력하세요',
		cacheEnabled: '분석 캐시',
		clearCache: '캐시 초기화',
		showSymbols: '심볼 사이드바',
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
			headline: 'AI로 코드 구조를<br/><span class="headline-accent">시각화하세요</span>',
			subheadline:
				'AI가 코드베이스를 의미론적으로 분석하여, 역할과 의존 관계를 다이어그램으로 즉시 시각화합니다.',
			cta: '폴더 열기',
			dragHint: 'or drag & drop a folder here',
			featureAiTitle: 'AI 의미론적 분석',
			featureAiDesc: 'LLM이 리포지토리를 시맨틱 모듈과 핵심 추상화로 자동 매핑합니다.',
			featureDrillTitle: '드릴다운 탐색',
			featureDrillDesc:
				'고수준 아키텍처 다이어그램에서 특정 코드 라인까지, 맥락을 잃지 않고 탐색합니다.',
			featureBrowserTitle: 'Multi-Track AI',
			featureBrowserDesc:
				'Demo · API Key · Local Bridge · Browser AI — 4가지 분석 방식을 제공합니다. 소스 코드 원문은 어떤 모드에서도 외부로 전송되지 않습니다.'
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
			toggleView: '사이드바 전환 (파일/시맨틱)',
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
		chatPlaceholder: 'Ask about architecture...',
		chatTitle: 'ROPEMAN ASSISTANT',
		send: 'Send',
		relatedNodes: 'View Related Code',
		loading: 'Generating response...',
		settings: 'Settings',
		openDirectory: 'Open Directory',
		dropHere: 'Drop a project folder here',
		dropHint: 'Supports Python, JavaScript, and TypeScript projects',
		noApiKey: 'Enter your Gemini API key in Settings',
		cacheEnabled: 'Analysis Cache',
		clearCache: 'Clear Cache',
		showSymbols: 'Symbol Sidebar',
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
			headline: 'Visualize code<br/><span class="headline-accent">architecture with AI</span>',
			subheadline:
				'AI semantically analyzes your codebase, instantly visualizing roles and dependencies as diagrams.',
			cta: '폴더 열기',
			dragHint: 'or drag & drop a folder here',
			featureAiTitle: 'AI Semantic Analysis',
			featureAiDesc:
				'LLMs automatically map your repository into semantic modules and key abstractions.',
			featureDrillTitle: 'Drill-down Navigation',
			featureDrillDesc:
				'Navigate from high-level architecture diagrams down to specific lines of code without losing context.',
			featureBrowserTitle: 'Multi-Track AI',
			featureBrowserDesc:
				'Demo · API Key · Local Bridge · Browser AI — choose from 4 analysis modes. Source code is never sent externally in any mode.'
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
			toggleView: 'Toggle Sidebar (Files/Semantic)',
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
