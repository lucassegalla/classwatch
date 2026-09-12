import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenMessage } from '@/components/screen-message';
import { StatusBadge } from '@/components/status-badge';
import { colors, radii, spacing } from '@/constants/theme';
import { listLectures } from '@/services/api';
import type { Lecture } from '@/types/lecture';

export default function HistoryScreen() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      setLectures(await listLectures());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as aulas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error && lectures.length === 0) {
    return (
      <View style={styles.centered}>
        <ScreenMessage
          actionLabel="Tentar novamente"
          icon="cloud-off"
          message={error}
          onAction={() => void load()}
          title="Histórico indisponível"
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => void load(true)}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>BIBLIOTECA</Text>
            <Text style={styles.title}>Suas aulas</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/lecture/new')} style={styles.addButton}>
            <MaterialIcons color={colors.background} name="add" size={26} />
          </TouchableOpacity>
        </View>

        {lectures.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ScreenMessage
              actionLabel="Gravar primeira aula"
              icon="library-books"
              message="Quando você gravar uma aula, ela aparecerá aqui."
              onAction={() => router.push('/lecture/new')}
              title="Nenhuma aula ainda"
            />
          </View>
        ) : (
          <View style={styles.list}>
            {lectures.map((lecture) => (
              <TouchableOpacity
                activeOpacity={0.8}
                key={lecture.id}
                onPress={() =>
                  router.push({ pathname: '/lecture/[id]', params: { id: lecture.id.toString() } })
                }
                style={styles.card}>
                <View style={styles.cardTop}>
                  <StatusBadge status={lecture.status} />
                  <Text style={styles.date}>{formatDate(lecture.createdAt)}</Text>
                </View>
                <Text numberOfLines={2} style={styles.cardTitle}>
                  {lecture.titulo}
                </Text>
                <Text numberOfLines={2} style={styles.cardDescription}>
                  {lecture.descricao || 'Sem descrição'}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.openText}>Abrir aula</Text>
                  <MaterialIcons color={colors.primary} name="arrow-forward" size={19} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  centered: { backgroundColor: colors.background, flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 17,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  list: { gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.large,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  date: { color: colors.textSubtle, fontSize: 12 },
  cardTitle: { color: colors.text, fontSize: 19, fontWeight: '700', marginTop: spacing.md },
  cardDescription: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
  cardFooter: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  openText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  emptyContainer: { flex: 1, minHeight: 420 },
});
