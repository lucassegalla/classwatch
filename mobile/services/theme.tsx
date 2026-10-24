import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

export type ThemePreference = 'system' | 'light' | 'dark';

const settingsDirectory = new Directory(Paths.document, 'classwatch');
const settingsFile = new File(settingsDirectory, 'settings.json');

const palette = {
  light: { background: '#f6f7fb', surface: '#ffffff', text: '#172033', secondaryText: '#657086', mutedText: '#7d8795', border: '#e5e9f2', primary: '#315ce7', softPrimary: '#eaf0ff', input: '#ffffff', errorSurface: '#fff0ef', errorText: '#9b2c24' },
  dark: { background: '#111827', surface: '#1f2937', text: '#f3f4f6', secondaryText: '#c0c9d8', mutedText: '#9ca3af', border: '#374151', primary: '#91a9ff', softPrimary: '#25345a', input: '#1f2937', errorSurface: '#422525', errorText: '#fecaca' },
} as const;

export type AppColors = (typeof palette)[keyof typeof palette];
interface ThemeContextValue { preference: ThemePreference; scheme: 'light' | 'dark'; colors: AppColors; setPreference: (value: ThemePreference) => void }
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ClassWatchThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!settingsFile.exists) return;
        const saved = JSON.parse(await settingsFile.text()) as { theme?: unknown };
        if (active && (saved.theme === 'system' || saved.theme === 'light' || saved.theme === 'dark')) setPreference(saved.theme);
      } catch { /* A missing or corrupt local preference falls back to the system theme. */ }
    })();
    return () => { active = false; };
  }, []);
  const setAndPersist = (value: ThemePreference) => {
    setPreference(value);
    try {
      settingsDirectory.create({ idempotent: true, intermediates: true });
      settingsFile.create({ overwrite: true, intermediates: true });
      settingsFile.write(JSON.stringify({ theme: value }));
    } catch { /* The current session still uses the chosen theme if storage is unavailable. */ }
  };
  const scheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(() => ({ preference, scheme, colors: palette[scheme], setPreference: setAndPersist }), [preference, scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useClassWatchTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useClassWatchTheme deve ser usado dentro de ClassWatchThemeProvider');
  return value;
}
