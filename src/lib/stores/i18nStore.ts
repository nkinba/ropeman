import { writable, derived } from 'svelte/store';

export type Locale = 'ko' | 'en';

export const locale = writable<Locale>('ko');

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
  apiKeyPlaceholder: string;
  landing: LandingTranslations;
}

const translations: Record<Locale, TranslationSet> = {
  ko: {
    title: 'CodeViz',
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
    apiKeyPlaceholder: 'Gemini API 키 입력',
    landing: {
      headline: '코드를 읽기 전에, 먼저 구조를 보세요',
      subheadline: 'AI가 코드베이스를 분석하여 의미 기반 다이어그램을 자동 생성합니다. 폴더를 열면 바로 시작됩니다.',
      cta: '폴더 열기',
      dragHint: '또는 프로젝트 폴더를 여기에 드래그하세요',
      featureAiTitle: 'AI 의미 분석',
      featureAiDesc: '파일 트리가 아닌, 역할과 도메인 기반의 구조를 AI가 자동 파악',
      featureDrillTitle: '재귀적 탐색',
      featureDrillDesc: '영역 클릭 시 AI가 하위 구조를 점진적으로 분석',
      featureBrowserTitle: '100% 브라우저',
      featureBrowserDesc: '코드가 브라우저를 떠나지 않음. WASM 파싱 + 로컬 분석',
    },
  },
  en: {
    title: 'CodeViz',
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
    apiKeyPlaceholder: 'Enter Gemini API key',
    landing: {
      headline: 'See the structure before reading the code',
      subheadline: 'AI analyzes your codebase and generates semantic architecture diagrams. Just open a folder to start.',
      cta: 'Open a Folder',
      dragHint: 'or drag & drop a project folder anywhere',
      featureAiTitle: 'AI Semantic Analysis',
      featureAiDesc: 'AI identifies roles and domains, not just the file tree',
      featureDrillTitle: 'Recursive Drill-down',
      featureDrillDesc: 'Click any area and AI progressively analyzes deeper structures',
      featureBrowserTitle: '100% Browser-based',
      featureBrowserDesc: 'Your code never leaves the browser. WASM parsing + local analysis',
    },
  }
};

export const t = derived(locale, ($locale) => {
  return (key: string): string => {
    const keys = key.split('.');
    let value: unknown = translations[$locale];
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return value as string;
  };
});

export function toggleLocale(): void {
  locale.update(l => l === 'ko' ? 'en' : 'ko');
}
