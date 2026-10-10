import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { getLecture } from '@/services/api';
import type { Lecture } from '@/types/lecture';

export default function LectureDetails() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);

  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarLecture = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) {
      setError('Identificador de aula inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setLecture(await getLecture(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a aula.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void carregarLecture();
  }, [carregarLecture]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando aula...</Text>
      </View>
    );
  }

  if (error || !lecture) {
    return (
      <View style={styles.centerWithPadding}>
        <Text style={styles.errorText}>{error || 'Aula não encontrada.'}</Text>
        <TouchableOpacity onPress={() => void carregarLecture()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{lecture.titulo}</Text>

      {lecture.descricao ? <Text style={styles.description}>{lecture.descricao}</Text> : null}

      {lecture.status === 'ERRO' ? (
        <View style={styles.errorBox}>
          <Text style={styles.sectionTitle}>Falha no processamento</Text>
          <Text style={styles.errorText}>
            {lecture.erroProcessamento || 'Não foi possível processar esta aula.'}
          </Text>
        </View>
      ) : null}

      {lecture.status === 'PROCESSANDO' ? (
        <View style={styles.processingBox}>
          <ActivityIndicator />
          <Text style={styles.processingText}>Esta aula ainda está sendo processada.</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Resumo</Text>
        <Text style={styles.content}>{lecture.resumo || 'Resumo ainda não disponível.'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Transcrição</Text>
        <Text style={styles.content}>
          {lecture.transcricao || 'Transcrição ainda não disponível.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerWithPadding: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#a3a3a3',
    marginTop: 12,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#121212',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    color: '#a3a3a3',
    lineHeight: 21,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  content: {
    color: '#e5e5e5',
    lineHeight: 23,
  },
  processingBox: {
    backgroundColor: '#172033',
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  processingText: {
    color: '#bfdbfe',
    flex: 1,
  },
  errorBox: {
    backgroundColor: '#2a1717',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#fecaca',
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 18,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
