function createSettingsStore() {
	const stored = typeof window !== 'undefined' ? localStorage.getItem('codeviz-settings') : null;
	const initial = stored ? JSON.parse(stored) : {};

	let geminiApiKey = $state<string>(initial.geminiApiKey ?? '');
	let cacheEnabled = $state<boolean>(initial.cacheEnabled ?? true);
	let language = $state<'ko' | 'en'>(initial.language ?? 'ko');

	function persist() {
		if (typeof window !== 'undefined') {
			localStorage.setItem('codeviz-settings', JSON.stringify({
				geminiApiKey,
				cacheEnabled,
				language
			}));
		}
	}

	return {
		get geminiApiKey() { return geminiApiKey; },
		set geminiApiKey(v: string) { geminiApiKey = v; persist(); },

		get cacheEnabled() { return cacheEnabled; },
		set cacheEnabled(v: boolean) { cacheEnabled = v; persist(); },

		get language() { return language; },
		set language(v: 'ko' | 'en') { language = v; persist(); },

		get hasApiKey() { return geminiApiKey.length > 0; },

		clearAll() {
			geminiApiKey = '';
			cacheEnabled = true;
			language = 'ko';
			if (typeof window !== 'undefined') {
				localStorage.removeItem('codeviz-settings');
			}
		}
	};
}

export const settingsStore = createSettingsStore();
