export const THEMES = { system: 'System', light: 'Light', dark: 'Dark' }
export type Theme = keyof typeof THEMES

const KEY = 'bingit-theme'

export function readTheme(): Theme {
  const saved = localStorage.getItem(KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

/** `data-theme` on <html> overrides the system setting (see tokens.css). */
export function applyTheme(theme: Theme): void {
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
  localStorage.setItem(KEY, theme)
}
