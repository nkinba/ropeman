import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock CSS imports
vi.mock('prismjs/themes/prism-tomorrow.css?inline', () => ({ default: '.token{color:red}' }));
vi.mock('prismjs/themes/prism-okaidia.css?inline', () => ({ default: '.token{color:blue}' }));
vi.mock('prismjs/themes/prism-solarizedlight.css?inline', () => ({
	default: '.token{color:green}'
}));
vi.mock('prismjs/themes/prism.css?inline', () => ({ default: '.token{color:black}' }));
vi.mock('prism-themes/themes/prism-one-dark.css?inline', () => ({
	default: '.token{color:onedark}'
}));
vi.mock('prism-themes/themes/prism-dracula.css?inline', () => ({
	default: '.token{color:dracula}'
}));
vi.mock('prism-themes/themes/prism-vsc-dark-plus.css?inline', () => ({
	default: '.token{color:vsc}'
}));
vi.mock('prism-themes/themes/prism-night-owl.css?inline', () => ({
	default: '.token{color:nightowl}'
}));
vi.mock('prism-themes/themes/prism-nord.css?inline', () => ({ default: '.token{color:nord}' }));
vi.mock('prism-themes/themes/prism-gruvbox-dark.css?inline', () => ({
	default: '.token{color:gruvdark}'
}));
vi.mock('prism-themes/themes/prism-gruvbox-light.css?inline', () => ({
	default: '.token{color:gruvlight}'
}));
vi.mock('prism-themes/themes/prism-ghcolors.css?inline', () => ({
	default: '.token{color:ghcolors}'
}));

import { getThemeCSS, injectThemeCSS, SYNTAX_THEMES } from './syntaxThemeService';

describe('syntaxThemeService', () => {
	describe('SYNTAX_THEMES', () => {
		it('contains expected themes', () => {
			expect(SYNTAX_THEMES.length).toBeGreaterThan(0);
			const ids = SYNTAX_THEMES.map((t) => t.id);
			expect(ids).toContain('tomorrow');
			expect(ids).toContain('dracula');
			expect(ids).toContain('solarized-light');
		});

		it('each theme has id, label, and mode', () => {
			for (const theme of SYNTAX_THEMES) {
				expect(theme.id).toBeTruthy();
				expect(theme.label).toBeTruthy();
				expect(['dark', 'light']).toContain(theme.mode);
			}
		});
	});

	describe('getThemeCSS', () => {
		it('returns CSS for known theme id', () => {
			const css = getThemeCSS('tomorrow');
			expect(css).toBe('.token{color:red}');
		});

		it('returns tomorrow CSS as fallback for unknown id', () => {
			const css = getThemeCSS('nonexistent');
			expect(css).toBe('.token{color:red}');
		});

		it('returns dracula CSS', () => {
			const css = getThemeCSS('dracula');
			expect(css).toBe('.token{color:dracula}');
		});
	});

	describe('injectThemeCSS', () => {
		let mockStyleEl: { id: string; textContent: string };

		beforeEach(() => {
			mockStyleEl = { id: '', textContent: '' };

			(globalThis as any).document = {
				getElementById: vi.fn(() => null),
				createElement: vi.fn(() => mockStyleEl),
				head: {
					appendChild: vi.fn()
				}
			};
		});

		it('creates style element and injects CSS', () => {
			injectThemeCSS('tomorrow');

			expect(document.createElement).toHaveBeenCalledWith('style');
			expect(mockStyleEl.id).toBe('prism-theme');
			expect(mockStyleEl.textContent).toBe('.token{color:red}');
			expect(document.head.appendChild).toHaveBeenCalled();
		});

		it('reuses existing style element', () => {
			const existingEl = { id: 'prism-theme', textContent: '' };
			(document.getElementById as ReturnType<typeof vi.fn>).mockReturnValue(existingEl);

			injectThemeCSS('dracula');

			expect(document.createElement).not.toHaveBeenCalled();
			expect(existingEl.textContent).toBe('.token{color:dracula}');
		});
	});
});
