export type AIProviderId = 'google' | 'anthropic';

function createSettingsStore() {
	const stored = typeof window !== 'undefined' ? localStorage.getItem('ropeman-settings') : null;
	const initial = stored ? JSON.parse(stored) : {};

	let geminiApiKey = $state<string>(initial.geminiApiKey ?? '');
	let anthropicApiKey = $state<string>(initial.anthropicApiKey ?? '');
	let aiProvider = $state<AIProviderId>(initial.aiProvider ?? 'google');
	let aiModel = $state<string>(initial.aiModel ?? 'gemini-2.5-flash-lite');
	let cacheEnabled = $state<boolean>(initial.cacheEnabled ?? true);
	let language = $state<'ko' | 'en'>(initial.language ?? 'ko');
	let syntaxTheme = $state<string>(initial.syntaxTheme ?? 'tomorrow');

	function persist() {
		if (typeof window !== 'undefined') {
			localStorage.setItem(
				'ropeman-settings',
				JSON.stringify({
					geminiApiKey,
					anthropicApiKey,
					aiProvider,
					aiModel,
					cacheEnabled,
					language,
					syntaxTheme
				})
			);
		}
	}

	return {
		get geminiApiKey() {
			return geminiApiKey;
		},
		set geminiApiKey(v: string) {
			geminiApiKey = v;
			persist();
		},

		get anthropicApiKey() {
			return anthropicApiKey;
		},
		set anthropicApiKey(v: string) {
			anthropicApiKey = v;
			persist();
		},

		get aiProvider() {
			return aiProvider;
		},
		set aiProvider(v: AIProviderId) {
			aiProvider = v;
			persist();
		},

		get aiModel() {
			return aiModel;
		},
		set aiModel(v: string) {
			aiModel = v;
			persist();
		},

		get cacheEnabled() {
			return cacheEnabled;
		},
		set cacheEnabled(v: boolean) {
			cacheEnabled = v;
			persist();
		},

		get language() {
			return language;
		},
		set language(v: 'ko' | 'en') {
			language = v;
			persist();
		},

		get syntaxTheme() {
			return syntaxTheme;
		},
		set syntaxTheme(v: string) {
			syntaxTheme = v;
			persist();
		},

		get hasApiKey() {
			if (aiProvider === 'google') return geminiApiKey.length > 0;
			if (aiProvider === 'anthropic') return anthropicApiKey.length > 0;
			return false;
		},

		get currentApiKey() {
			if (aiProvider === 'google') return geminiApiKey;
			if (aiProvider === 'anthropic') return anthropicApiKey;
			return '';
		},

		clearAll() {
			geminiApiKey = '';
			anthropicApiKey = '';
			aiProvider = 'google';
			aiModel = 'gemini-2.5-flash-lite';
			cacheEnabled = true;
			language = 'ko';
			syntaxTheme = 'tomorrow';
			if (typeof window !== 'undefined') {
				localStorage.removeItem('ropeman-settings');
			}
		}
	};
}

export const settingsStore = createSettingsStore();
