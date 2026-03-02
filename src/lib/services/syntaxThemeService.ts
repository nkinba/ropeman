import tomorrowCSS from 'prismjs/themes/prism-tomorrow.css?inline';
import okaidiaCSS from 'prismjs/themes/prism-okaidia.css?inline';
import solarizedLightCSS from 'prismjs/themes/prism-solarizedlight.css?inline';
import defaultLightCSS from 'prismjs/themes/prism.css?inline';
import oneDarkCSS from 'prism-themes/themes/prism-one-dark.css?inline';
import draculaCSS from 'prism-themes/themes/prism-dracula.css?inline';
import vscDarkPlusCSS from 'prism-themes/themes/prism-vsc-dark-plus.css?inline';
import nightOwlCSS from 'prism-themes/themes/prism-night-owl.css?inline';
import nordCSS from 'prism-themes/themes/prism-nord.css?inline';
import gruvboxDarkCSS from 'prism-themes/themes/prism-gruvbox-dark.css?inline';
import gruvboxLightCSS from 'prism-themes/themes/prism-gruvbox-light.css?inline';
import ghcolorsCSS from 'prism-themes/themes/prism-ghcolors.css?inline';

export interface SyntaxTheme {
	id: string;
	label: string;
	mode: 'dark' | 'light';
}

export const SYNTAX_THEMES: SyntaxTheme[] = [
	{ id: 'tomorrow', label: 'Tomorrow Night', mode: 'dark' },
	{ id: 'okaidia', label: 'Okaidia', mode: 'dark' },
	{ id: 'one-dark', label: 'One Dark', mode: 'dark' },
	{ id: 'dracula', label: 'Dracula', mode: 'dark' },
	{ id: 'vsc-dark-plus', label: 'VS Code Dark+', mode: 'dark' },
	{ id: 'night-owl', label: 'Night Owl', mode: 'dark' },
	{ id: 'nord', label: 'Nord', mode: 'dark' },
	{ id: 'gruvbox-dark', label: 'Gruvbox Dark', mode: 'dark' },
	{ id: 'solarized-light', label: 'Solarized Light', mode: 'light' },
	{ id: 'default-light', label: 'Prism Light', mode: 'light' },
	{ id: 'gruvbox-light', label: 'Gruvbox Light', mode: 'light' },
	{ id: 'ghcolors', label: 'GitHub Colors', mode: 'light' },
];

const CSS_MAP: Record<string, string> = {
	'tomorrow': tomorrowCSS,
	'okaidia': okaidiaCSS,
	'solarized-light': solarizedLightCSS,
	'default-light': defaultLightCSS,
	'one-dark': oneDarkCSS,
	'dracula': draculaCSS,
	'vsc-dark-plus': vscDarkPlusCSS,
	'night-owl': nightOwlCSS,
	'nord': nordCSS,
	'gruvbox-dark': gruvboxDarkCSS,
	'gruvbox-light': gruvboxLightCSS,
	'ghcolors': ghcolorsCSS,
};

const STYLE_ID = 'prism-theme';

export function getThemeCSS(id: string): string {
	return CSS_MAP[id] ?? CSS_MAP['tomorrow'];
}

export function injectThemeCSS(id: string): void {
	if (typeof document === 'undefined') return;

	let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
	if (!styleEl) {
		styleEl = document.createElement('style');
		styleEl.id = STYLE_ID;
		document.head.appendChild(styleEl);
	}
	styleEl.textContent = getThemeCSS(id);
}
