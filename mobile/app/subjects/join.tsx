import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { joinSubject } from '@/services/api';
import { useAuth } from '@/services/auth';
import { useClassWatchTheme } from '@/services/theme';

export default function JoinSubjectScreen() {
  const { user } = useAuth();
  const { colors } = useClassWatchTheme();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    if (!code.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const subject = await joinSubject(code.trim().toUpperCase());
      router.replace({ pathname: '/subjects/[id]', params: { id: String(subject.id) } });
    } catch (err) { setError(err instanceof Error ? err.message : 'Código inválido ou matéria arquivada.'); }
    finally { setBusy(false); }
  }

  if (user?.role !== 'ESTUDANTE') return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.errorText }}>O ingresso por código está disponível para estudantes.</Text></View>;
  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <Text style={[styles.title, { color: colors.text }]}>Ingressar em matéria</Text>
    <TextInput value={code} onChangeText={(value) => setCode(value.replace(/\s/g, '').toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={10} placeholder="Código de ingresso" placeholderTextColor={colors.mutedText} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
    {error ? <Text style={[styles.error, { color: colors.errorText }]}>{error}</Text> : null}
    <TouchableOpacity disabled={code.trim().length === 0 || busy} onPress={() => void join()} style={[styles.submit, { backgroundColor: colors.primary }]}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Ingressar</Text>}</TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { flex: 1, padding: 22 },
  title: { fontSize: 27, fontWeight: '800', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 52, paddingHorizontal: 15, fontSize: 18, letterSpacing: 2 },
  error: { marginTop: 12, lineHeight: 20 },
  submit: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16, padding: 13 },
  submitText: { color: '#fff', fontWeight: '800' },
});
