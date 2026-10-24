import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getLectures } from '@/services/api';
import type { LectureSummary } from '@/types/lecture';
import { useClassWatchTheme } from '@/services/theme';

export default function HomeScreen() {
  const [recent, setRecent] = useState<LectureSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useClassWatchTheme();
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    void getLectures().then((items) => { if (active) setRecent(items.slice(0, 3)); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Não foi possível carregar suas aulas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  return (
    <ScrollView style={[styles.background, { backgroundColor: colors.background }]} contentContainerStyle={styles.container}>
      <View style={styles.topRow}><Text style={[styles.brand, { color: colors.text }]}>ClassWatch</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Configurações" onPress={() => router.push({ pathname: '/settings' } as never)} style={[styles.settingsButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={{ color: colors.text, fontSize: 19 }}>⚙</Text></TouchableOpacity></View>

      <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} onPress={() => router.push('/lecture/new')} style={styles.primaryCard}>
        <View style={styles.iconCircle}><Text style={styles.icon}>＋</Text></View>
        <Text style={styles.cardTitle}>Registrar uma aula</Text>
        <Text style={styles.cta}>Começar gravação  →</Text>
      </TouchableOpacity>

      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/subjects' as never)} style={[styles.subjectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.subjectButtonTitle, { color: colors.text }]}>Minhas matérias</Text>
        <Text style={[styles.subjectButtonAction, { color: colors.primary }]}>Ver matérias  →</Text>
      </TouchableOpacity>

      <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Aulas recentes</Text><TouchableOpacity onPress={() => router.push('/history')}><Text style={[styles.seeAll, { color: colors.primary }]}>Ver histórico</Text></TouchableOpacity></View>
      {loading ? <ActivityIndicator color="#315ce7" style={styles.loader} /> : error ? <View style={styles.empty}><Text style={styles.emptyText}>{error}</Text><TouchableOpacity onPress={() => router.push('/history')}><Text style={styles.seeAll}>Abrir histórico</Text></TouchableOpacity></View> : recent.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma aula ainda</Text></View>
      ) : recent.map((lecture) => (
        <TouchableOpacity key={lecture.id} activeOpacity={0.8} onPress={() => router.push({ pathname: '/lecture/[id]', params: { id: String(lecture.id) } })} style={[styles.recentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.recentIcon, { backgroundColor: colors.softPrimary }]}><Text style={[styles.recentIconText, { color: colors.primary }]}>A</Text></View>
          <View style={styles.recentCopy}><Text numberOfLines={1} style={[styles.recentTitle, { color: colors.text }]}>{lecture.titulo}</Text><Text numberOfLines={1} style={[styles.recentDescription, { color: colors.mutedText }]}>{lecture.descricao || 'Aula gravada'}</Text></View>
          <Text style={[styles.status, lecture.status === 'ERRO' && styles.statusError]}>{lecture.status === 'PROCESSANDO' ? 'Em andamento' : lecture.status === 'ERRO' ? 'Com erro' : 'Concluída'}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#f6f7fb' },
  container: { padding: 24, paddingTop: 54, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  brand: { fontSize: 36, lineHeight: 42, fontWeight: '800' },
  settingsButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  primaryCard: { backgroundColor: '#315ce7', padding: 22, borderRadius: 20, marginBottom: 30, shadowColor: '#315ce7', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  subjectButton: { padding: 18, borderWidth: 1, borderRadius: 16, marginBottom: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subjectButtonTitle: { fontWeight: '700', fontSize: 16 },
  subjectButtonAction: { fontWeight: '700', fontSize: 13 },
  iconCircle: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#ffffff33', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  icon: { color: '#ffffff', fontSize: 27, lineHeight: 30 },
  cardTitle: { color: '#ffffff', fontSize: 22, fontWeight: '700' },
  cta: { color: '#ffffff', marginTop: 20, fontWeight: '700', fontSize: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontWeight: '700' },
  seeAll: { color: '#315ce7', fontWeight: '700', fontSize: 13 },
  loader: { marginTop: 22 },
  empty: { padding: 20, borderRadius: 16, borderWidth: 1 },
  emptyTitle: { fontWeight: '700', fontSize: 16 },
  emptyText: { lineHeight: 21, marginTop: 5 },
  recentCard: { backgroundColor: '#ffffff', padding: 14, borderRadius: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderColor: '#edf0f5', borderWidth: 1, gap: 12 },
  recentIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  recentIconText: { fontSize: 15, fontWeight: '800' },
  recentCopy: { flex: 1 },
  recentTitle: { fontSize: 15, fontWeight: '700' },
  recentDescription: { fontSize: 12, marginTop: 4 },
  status: { color: '#315ce7', fontSize: 11, fontWeight: '700' },
  statusError: { color: '#b42318' },
});
