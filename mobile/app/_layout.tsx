import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { ClassWatchThemeProvider, useClassWatchTheme } from '@/services/theme';

export default function RootLayout() {
  return <ClassWatchThemeProvider><ThemedNavigator /></ClassWatchThemeProvider>;
}

function ThemedNavigator() {
  const { scheme, colors } = useClassWatchTheme();
  const baseTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...baseTheme, dark: scheme === 'dark', colors: { ...baseTheme.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary } }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="lecture/new" options={{ title: 'Nova aula' }} />
        <Stack.Screen name="lecture/[id]" options={{ title: 'Aula' }} />
        <Stack.Screen name="history" options={{ title: 'Histórico' }} />
        <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
