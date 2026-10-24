import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { deleteLecture, getLectures } from '@/services/api';
import type { LectureSummary, LectureStatus } from '@/types/lecture';
import { useClassWatchTheme } from '@/services/theme';

const STATUS_LABEL: Record<LectureStatus, string> = {
  PROCESSANDO: 'Processando',
  FINALIZADO: 'Finalizada',
  ERRO: 'Erro no processamento',
};

function formatDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const [lectures, setLectures] = useState<LectureSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { colors } = useClassWatchTheme();

  useEffect(() => {
    const timeout = setTimeout(() => setSearchQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const carregarLectures = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      setLectures(await getLectures(searchQuery));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      void carregarLectures();
    }, [carregarLectures]),
  );

  function confirmarExclusao(lecture: LectureSummary) {
    Alert.alert('Excluir aula?', `“${lecture.titulo}” e o áudio associado serão removidos.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => void (async () => {
        try {
          await deleteLecture(lecture.id);
          setLectures((items) => items.filter((item) => item.id !== lecture.id));
        } catch (err) {
          Alert.alert('Não foi possível excluir', err instanceof Error ? err.message : 'Tente novamente.');
        }
      })() },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Carregando aulas...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={lectures}
      keyExtractor={(lecture) => lecture.id.toString()}
      contentContainerStyle={[styles.list, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void carregarLectures(true)}
          tintColor="#315ce7"
        />
      }
      ListHeaderComponent={
        <>
          <Text style={[styles.title, { color: colors.text }]}>Histórico</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => setSearchQuery(query)}
            placeholder="Buscar por título ou disciplina"
            placeholderTextColor="#7d8795"
            returnKeyType="search"
            style={[styles.search, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
          />
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.errorSurface }]}>
              <Text style={[styles.errorText, { color: colors.errorText }]}>{error}</Text>
              <TouchableOpacity onPress={() => void carregarLectures()}>
                <Text style={[styles.retryText, { color: colors.primary }]}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      }
      ListEmptyComponent={
        !error ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma aula ainda</Text>
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>Grave uma aula para ela aparecer aqui.</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => {
        const date = formatDate(item.createdAt);

        return (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/lecture/[id]', params: { id: item.id.toString() } })}
              accessibilityRole="button"
              accessibilityLabel={`Abrir aula ${item.titulo}`}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.titulo}</Text>
              {item.descricao ? <Text style={[styles.description, { color: colors.secondaryText }]}>{item.descricao}</Text> : null}
              <View style={styles.metaRow}><Text style={[styles.status, { color: item.status === 'ERRO' ? colors.errorText : colors.primary }]}>{STATUS_LABEL[item.status]}</Text>{date ? <Text style={[styles.date, { color: colors.mutedText }]}>{date}</Text> : null}</View>
            </TouchableOpacity>
            {item.status !== 'PROCESSANDO' ? <TouchableOpacity accessibilityRole="button" onPress={() => confirmarExclusao(item)} style={styles.deleteButton}><Text style={[styles.deleteText, { color: colors.errorText }]}>Excluir aula</Text></TouchableOpacity> : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#a3a3a3',
    marginTop: 12,
  },
  list: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 20,
  },
  card: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    marginTop: 6,
    lineHeight: 20,
  },
  metaRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
  },
  errorBox: {
    backgroundColor: '#2a1717',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  errorText: {
    color: '#fecaca',
    lineHeight: 20,
  },
  retryText: {
    color: '#93c5fd',
    fontWeight: '700',
    marginTop: 10,
  },
  emptyBox: {
    borderRadius: 14,
    padding: 22,
  },
  emptyTitle: {
    fontWeight: '700',
    fontSize: 17,
  },
  emptyText: {
    marginTop: 6,
  },
  search: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 18, borderWidth: 1 },
  deleteButton: { alignSelf: 'flex-end', paddingTop: 12 },
  deleteText: { color: '#b42318', fontSize: 13, fontWeight: '600' },
});
