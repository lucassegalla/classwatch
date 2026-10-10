import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { getLectures } from '@/services/api';
import type { Lecture, LectureStatus } from '@/types/lecture';

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
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarLectures = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      setLectures(await getLectures());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregarLectures();
    }, [carregarLectures]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando aulas...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={lectures}
      keyExtractor={(lecture) => lecture.id.toString()}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void carregarLectures(true)}
          tintColor="#ffffff"
        />
      }
      ListHeaderComponent={
        <>
          <Text style={styles.title}>Histórico</Text>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => void carregarLectures()}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      }
      ListEmptyComponent={
        !error ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Nenhuma aula ainda</Text>
            <Text style={styles.emptyText}>Grave uma aula para ela aparecer aqui.</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => {
        const date = formatDate(item.createdAt);

        return (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/lecture/[id]',
                params: { id: item.id.toString() },
              })
            }
            style={styles.card}
          >
            <Text style={styles.cardTitle}>{item.titulo}</Text>

            {item.descricao ? <Text style={styles.description}>{item.descricao}</Text> : null}

            <View style={styles.metaRow}>
              <Text style={styles.status}>{STATUS_LABEL[item.status]}</Text>
              {date ? <Text style={styles.date}>{date}</Text> : null}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#a3a3a3',
    marginTop: 12,
  },
  list: {
    flexGrow: 1,
    backgroundColor: '#121212',
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 18,
    borderRadius: 14,
    marginBottom: 14,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    color: '#a3a3a3',
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
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '600',
  },
  date: {
    color: '#737373',
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
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    padding: 22,
  },
  emptyTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
  },
  emptyText: {
    color: '#a3a3a3',
    marginTop: 6,
  },
});
