import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenMessage } from '@/components/screen-message';
import { StatusBadge } from '@/components/status-badge';
import { colors, radii, spacing } from '@/constants/theme';
import { getLecture } from '@/services/api';
import type { Lecture } from '@/types/lecture';

export default function LectureDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const lectureId = Number(params.id);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isInteger(lectureId) || lectureId < 1) {
      setError('Identificador de aula inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setLecture(await getLecture(lectureId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a aula.');
    } finally {
      setLoading(false);
    }
  }, [lectureId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !lecture) {
    return (
      <View style={styles.centered}>
        <ScreenMessage
          actionLabel="Tentar novamente"
          icon="error-outline"
          message={error ?? 'A aula não foi encontrada.'}
          onAction={() => void load()}
          title="Não foi possível abrir a aula"
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <StatusBadge status={lecture.status} />
        <Text style={styles.title}>{lecture.titulo}</Text>
        <Text style={styles.description}>{lecture.descricao || 'Sem descrição'}</Text>
        <View style={styles.metaRow}>
          <MaterialIcons color={colors.textSubtle} name="calendar-today" size={15} />
          <Text style={styles.metaText}>{formatDate(lecture.createdAt)}</Text>
        </View>
      </View>

      {lecture.status === 'ERRO' ? (
        <View style={styles.errorCard}>
          <MaterialIcons color={colors.danger} name="error-outline" size={22} />
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>O processamento falhou</Text>
            <Text style={styles.errorMessage}>
              {lecture.errorMessage ?? 'Não foi possível processar esta gravação.'}
            </Text>
          </View>
        </View>
      ) : null}

      {lecture.status === 'RECEBIDO' || lecture.status === 'PROCESSANDO' ? (
        <View style={styles.processingCard}>
          <ActivityIndicator color={colors.primary} />
          <View style={styles.processingCopy}>
            <Text style={styles.processingTitle}>Conteúdo em processamento</Text>
            <Text style={styles.processingMessage}>Volte ao histórico em alguns minutos para conferir o resultado.</Text>
          </View>
        </View>
      ) : null}

      <ContentSection
        content={lecture.resumo}
        empty="O resumo ainda não está disponível."
        icon="auto-awesome"
        title="Resumo da aula"
      />
      <ContentSection
        content={lecture.transcricao}
        empty="A transcrição ainda não está disponível."
        icon="notes"
        title="Transcrição revisada"
      />
    </ScrollView>
  );
}

function ContentSection({
  content,
  empty,
  icon,
  title,
}: {
  content: string | null;
  empty: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <MaterialIcons color={colors.primary} name={icon} size={19} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={[styles.sectionContent, !content && styles.emptyContent]}>{content || empty}</Text>
    </View>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  centered: { backgroundColor: colors.background, flex: 1 },
  content: { backgroundColor: colors.background, gap: spacing.md, padding: spacing.lg, paddingBottom: 48 },
  headerCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.large,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, marginTop: spacing.md },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.xs },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: spacing.md },
  metaText: { color: colors.textSubtle, fontSize: 12 },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.large,
    borderWidth: 1,
    padding: spacing.lg,
  },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: 11, marginBottom: spacing.md },
  sectionIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  sectionContent: { color: colors.textMuted, fontSize: 15, lineHeight: 24 },
  emptyContent: { color: colors.textSubtle, fontStyle: 'italic' },
  errorCard: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(251, 113, 133, 0.10)',
    borderColor: 'rgba(251, 113, 133, 0.30)',
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.md,
  },
  errorCopy: { flex: 1, marginLeft: spacing.sm },
  errorTitle: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  errorMessage: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  processingCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.medium,
    flexDirection: 'row',
    padding: spacing.md,
  },
  processingCopy: { flex: 1, marginLeft: spacing.md },
  processingTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  processingMessage: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 3 },
});
