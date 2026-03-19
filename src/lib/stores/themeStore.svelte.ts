type Theme = 'dark' | 'light';

function createThemeStore() {
	const storedTheme: Theme =
		typeof window !== 'undefined' ? (localStorage.getItem('theme') as Theme) || 'dark' : 'dark';

	let current = $state<Theme>(storedTheme);

	// Initialize on load
	if (typeof window !== 'undefined') {
		document.documentElement.setAttribute('data-theme', storedTheme);
	}

	return {
		get current() {
			return current;
		},
		set current(v: Theme) {
			current = v;
			if (typeof window !== 'undefined') {
				localStorage.setItem('theme', v);
				document.documentElement.setAttribute('data-theme', v);
			}
		},
		toggle() {
			const next: Theme = current === 'dark' ? 'light' : 'dark';
			// Use setter to persist
			this.current = next;
		}
	};
}

export const themeStore = createThemeStore();
