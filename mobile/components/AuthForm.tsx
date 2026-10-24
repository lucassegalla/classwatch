import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/services/auth';
import { useClassWatchTheme } from '@/services/theme';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const { colors } = useClassWatchTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const registration = mode === 'register';

  async function submit() {
    setError('');
    if (!email.trim() || !password) { setError('Informe seu e-mail e sua senha.'); return; }
    if (registration && !name.trim()) { setError('Informe seu nome.'); return; }
    if (registration && password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return; }
    setBusy(true);
    try {
      if (registration) await register(name, email, password);
      else await login(email, password);
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível autenticar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}><Text style={styles.brandLetter}>C</Text></View>
        <Text style={[styles.brand, { color: colors.text }]}>ClassWatch</Text>
        <Text style={[styles.heading, { color: colors.text }]}>{registration ? 'Criar conta de estudante' : 'Entrar'}</Text>
        {registration ? <TextInput accessibilityLabel="Nome" autoCapitalize="words" value={name} onChangeText={setName} placeholder="Nome" placeholderTextColor={colors.mutedText} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} returnKeyType="next" /> : null}
        <TextInput accessibilityLabel="E-mail" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="E-mail" placeholderTextColor={colors.mutedText} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} returnKeyType="next" />
        <TextInput accessibilityLabel="Senha" autoCapitalize="none" autoComplete={registration ? 'new-password' : 'password'} secureTextEntry value={password} onChangeText={setPassword} placeholder="Senha" placeholderTextColor={colors.mutedText} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} onSubmitEditing={() => void submit()} returnKeyType="go" />
        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.errorText }]}>{error}</Text> : null}
        <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={[styles.button, { backgroundColor: colors.primary }, busy && styles.buttonDisabled]}>
          {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>{registration ? 'Criar conta' : 'Entrar'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity disabled={busy} onPress={() => router.replace((registration ? '/login' : '/register') as never)} style={styles.linkButton}>
          <Text style={[styles.link, { color: colors.primary }]}>{registration ? 'Já tenho uma conta' : 'Criar conta de estudante'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 26, paddingBottom: 42 },
  brandMark: { alignSelf: 'center', width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#315ce7', marginBottom: 10 },
  brandLetter: { color: '#ffffff', fontSize: 27, fontWeight: '900' },
  brand: { textAlign: 'center', fontSize: 20, fontWeight: '800', marginBottom: 30 },
  heading: { fontSize: 25, fontWeight: '800', marginBottom: 18 },
  input: { minHeight: 54, paddingHorizontal: 15, borderRadius: 13, borderWidth: 1, marginBottom: 11, fontSize: 16 },
  error: { marginTop: 4, marginBottom: 12, lineHeight: 21 },
  button: { minHeight: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  linkButton: { alignSelf: 'center', padding: 17 },
  link: { fontWeight: '700' },
});
