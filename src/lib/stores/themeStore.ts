import { writable } from 'svelte/store';

type Theme = 'dark' | 'light';

const storedTheme: Theme = typeof window !== 'undefined'
  ? (localStorage.getItem('theme') as Theme) || 'dark'
  : 'dark';

export const theme = writable<Theme>(storedTheme);

export function toggleTheme(): void {
  theme.update(t => {
    const next: Theme = t === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', next);
      document.documentElement.setAttribute('data-theme', next);
    }
    return next;
  });
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  document.documentElement.setAttribute('data-theme', storedTheme);
}
