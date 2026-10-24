import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SubjectCard } from '@/components/SubjectCard';
import { useAuth } from '@/services/auth';
import { getSubjects } from '@/services/api';
import { useClassWatchTheme } from '@/services/theme';
import type { Subject } from '@/types/lecture';

export default function SubjectsScreen() {
  const { user } = useAuth();
  const { colors } = useClassWatchTheme();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setSubjects(await getSubjects()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar as matérias.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <FlatList
      data={subjects}
      keyExtractor={(item) => String(item.id)}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      onRefresh={() => void load()}
      refreshing={loading}
      ListHeaderComponent={<>
        <Text style={[styles.title, { color: colors.text }]}>Matérias</Text>
        <View style={styles.actions}>
          {user?.role === 'PROFESSOR' ? <Action label="Criar matéria" onPress={() => router.push('/subjects/new')} primary /> : <Action label="Ingressar com código" onPress={() => router.push('/subjects/join')} primary />}
        </View>
        {error ? <View style={[styles.message, { backgroundColor: colors.errorSurface }]}><Text style={{ color: colors.errorText }}>{error}</Text><TouchableOpacity onPress={() => void load()}><Text style={{ color: colors.primary, fontWeight: '700', marginTop: 8 }}>Tentar novamente</Text></TouchableOpacity></View> : null}
      </>}
      ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : !error ? <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>{user?.role === 'PROFESSOR' ? 'Nenhuma matéria criada' : 'Você ainda não participa de matérias'}</Text><Text style={[styles.emptyText, { color: colors.secondaryText }]}>{user?.role === 'PROFESSOR' ? 'Crie uma matéria para organizar aulas e compartilhar o código de ingresso.' : 'Peça o código ao professor para ingressar em uma matéria.'}</Text></View> : null}
      renderItem={({ item }) => <SubjectCard subject={item} onPress={() => router.push({ pathname: '/subjects/[id]', params: { id: String(item.id) } })} />}
    />
  );
}

function Action({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  const { colors } = useClassWatchTheme();
  return <TouchableOpacity onPress={onPress} style={[styles.action, { backgroundColor: primary ? colors.primary : colors.surface, borderColor: colors.border }]}><Text style={[styles.actionText, { color: primary ? '#fff' : colors.text }]}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  title: { fontSize: 29, fontWeight: '800', marginBottom: 17 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  action: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  actionText: { fontWeight: '700' },
  loader: { marginTop: 24 },
  empty: { padding: 20, borderRadius: 15, borderWidth: 1 },
  emptyTitle: { fontWeight: '800', fontSize: 16 },
  emptyText: { marginTop: 6, lineHeight: 21 },
  message: { padding: 14, borderRadius: 12, marginBottom: 14 },
});
