import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  initialize: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: (theme) => {
    localStorage.setItem('flowza-theme', theme);
    const resolved = resolveTheme(theme);
    updateHtmlClass(resolved);
    set({ theme, resolvedTheme: resolved });
  },
  initialize: () => {
    const savedTheme = (localStorage.getItem('flowza-theme') as Theme) || 'system';
    const resolved = resolveTheme(savedTheme);
    updateHtmlClass(resolved);
    set({ theme: savedTheme, resolvedTheme: resolved });

    // Listen for system changes if system theme is selected
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (get().theme === 'system') {
        const resolvedSystem = resolveTheme('system');
        updateHtmlClass(resolvedSystem);
        set({ resolvedTheme: resolvedSystem });
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
  },
}));

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function updateHtmlClass(resolvedTheme: 'light' | 'dark') {
  const root = window.document.documentElement;
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
