import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { UserProfile } from '@/types/lecture';

const TOKEN_KEY = 'classwatch.access-token';
const PROFILE_KEY = 'classwatch.user-profile';
let webToken: string | null = null;
let webProfile: UserProfile | null = null;

export interface SavedSession {
  token: string;
  user: UserProfile | null;
}

export async function loadSession(): Promise<SavedSession | null> {
  if (Platform.OS === 'web') return webToken ? { token: webToken, user: webProfile } : null;
  const [token, profileJson] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(PROFILE_KEY),
  ]);
  if (!token) return null;
  let user: UserProfile | null = null;
  try { user = profileJson ? JSON.parse(profileJson) as UserProfile : null; } catch { /* The token is still verified against /auth/me. */ }
  return { token, user };
}

export async function saveSession(token: string, user: UserProfile): Promise<void> {
  if (Platform.OS === 'web') {
    webToken = token;
    webProfile = user;
    return;
  }
  await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(user), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearSavedSession(): Promise<void> {
  if (Platform.OS === 'web') {
    webToken = null;
    webProfile = null;
    return;
  }
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(PROFILE_KEY),
  ]);
}
