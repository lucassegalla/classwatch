import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#121212' },
          headerTintColor: '#ffffff',
          contentStyle: { backgroundColor: '#121212' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="lecture/new" options={{ title: 'Nova aula' }} />
        <Stack.Screen name="lecture/[id]" options={{ title: 'Aula' }} />
        <Stack.Screen name="history" options={{ title: 'Histórico' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
