import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { deleteLecture, getLecture, retryLecture } from '@/services/api';
import { parseStudyMaterial, type StudyEntry } from '@/services/studyMaterial';
import { shareLectureSummaryPdf } from '@/services/shareLecturePdf';
import { useClassWatchTheme } from '@/services/theme';
import type { Lecture } from '@/types/lecture';

type MaterialTab = 'summary' | 'transcript';

const SUMMARY_SECTIONS: { key: 'main_ideas' | 'concepts' | 'relations' | 'examples' | 'questions'; title: string }[] = [
  { key: 'main_ideas', title: 'Ideias principais' },
  { key: 'concepts', title: 'Conceitos e definições' },
  { key: 'relations', title: 'Relações entre os conceitos' },
  { key: 'examples', title: 'Exemplos da aula' },
  { key: 'questions', title: 'Perguntas para revisão' },
];

function StudyEntries({ entries, questions = false }: { entries: StudyEntry[]; questions?: boolean }) {
  const { colors } = useClassWatchTheme();
  return <View style={styles.entryList}>{entries.map((entry, index) => (
    <View key={`${entry.title ?? ''}-${index}`} style={[styles.entry, { backgroundColor: colors.surface, borderColor: colors.border }, questions && { backgroundColor: colors.softPrimary }]}>
      {entry.title ? <Text style={[styles.entryTitle, { color: colors.text }]}>{entry.title}</Text> : null}
      <Text selectable style={[styles.entryText, { color: colors.secondaryText }]}>{entry.text}</Text>
    </View>
  ))}</View>;
}

export default function LectureDetails() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [sharingBusy, setSharingBusy] = useState(false);
  const [tab, setTab] = useState<MaterialTab>('summary');
  const { colors } = useClassWatchTheme();

  const carregarLecture = useCallback(async (initial = false) => {
    if (!Number.isInteger(id) || id <= 0) {
      setError('Identificador de aula inválido.'); setLoading(false); return;
    }
    if (initial) setLoading(true);
    try { setLecture(await getLecture(id)); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar a aula.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void carregarLecture(true); }, [carregarLecture]);
  useEffect(() => {
    if (lecture?.status !== 'PROCESSANDO') return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const updated = await getLecture(id);
        if (!active) return;
        setLecture(updated);
        if (updated.status === 'PROCESSANDO') timer = setTimeout(() => void poll(), 7000);
      } catch { if (active) timer = setTimeout(() => void poll(), 15000); }
    };
    timer = setTimeout(() => void poll(), 7000);
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [id, lecture?.status, lecture?.updatedAt]);

  const material = useMemo(() => parseStudyMaterial(lecture?.resumo), [lecture?.resumo]);
  const hasPrimaryStudySections = material.main_ideas.length > 0 || material.concepts.length > 0 || material.relations.length > 0;
  const transcriptLooksLikeLegacyLargeObjectReference = Boolean(
    lecture?.transcricao && /^[0-9]{1,10}$/.test(lecture.transcricao.trim())
      && Number(lecture.transcricao.trim()) > 0 && Number(lecture.transcricao.trim()) <= 4294967295,
  );
  const canRecoverLegacyTranscript = lecture?.status === 'FINALIZADO'
    && transcriptLooksLikeLegacyLargeObjectReference && !hasPrimaryStudySections;
  const canRetryIncompleteSummary = lecture?.status === 'FINALIZADO'
    && Boolean(lecture.transcricao && lecture.transcricao.length >= 300)
    && !hasPrimaryStudySections;
  const canShareSummary = Boolean(material.overview || SUMMARY_SECTIONS.some((section) => material[section.key].length > 0));

  async function reprocessar() {
    setActionBusy(true);
    try {
      const accepted = await retryLecture(id);
      setLecture({ ...accepted, transcricao: lecture?.transcricao ?? null, resumo: lecture?.resumo ?? null });
    } catch (err) { Alert.alert('Não foi possível reprocessar', err instanceof Error ? err.message : 'Tente novamente.'); }
    finally { setActionBusy(false); }
  }

  async function compartilharResumo() {
    if (!lecture || !canShareSummary) return;
    setSharingBusy(true);
    try {
      await shareLectureSummaryPdf(lecture.titulo, material, SUMMARY_SECTIONS);
    } catch (err) {
      Alert.alert(
        'Não foi possível compartilhar o PDF',
        err instanceof Error ? err.message : 'O arquivo não foi gerado. Tente novamente.',
      );
    } finally {
      setSharingBusy(false);
    }
  }

  function confirmarExclusao() {
    Alert.alert('Excluir aula?', 'A aula e o áudio enviado serão removidos permanentemente.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => void (async () => {
        setActionBusy(true);
        try { await deleteLecture(id); router.replace('/history'); }
        catch (err) { Alert.alert('Não foi possível excluir', err instanceof Error ? err.message : 'Tente novamente.'); }
        finally { setActionBusy(false); }
      })() },
    ]);
  }

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /><Text style={[styles.helper, { color: colors.secondaryText }]}>Carregando aula...</Text></View>;
  if (error || !lecture) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={[styles.errorText, { color: colors.errorText }]}>{error || 'Aula não encontrada.'}</Text><TouchableOpacity onPress={() => void carregarLecture(true)} style={styles.action}><Text style={styles.actionText}>Tentar novamente</Text></TouchableOpacity></View>;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{lecture.titulo}</Text>
      {lecture.descricao ? <Text style={[styles.description, { color: colors.secondaryText }]}>{lecture.descricao}</Text> : null}
      <Text style={[styles.meta, { color: colors.mutedText }]}>{lecture.createdAt ? new Date(lecture.createdAt).toLocaleDateString('pt-BR', { dateStyle: 'long' }) : ''}  ·  {lecture.status === 'FINALIZADO' ? 'Concluída' : lecture.status === 'ERRO' ? 'Com erro' : 'Processando'}</Text>

      {lecture.status === 'ERRO' ? <View style={[styles.errorBox, { backgroundColor: colors.errorSurface }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>O processamento não foi concluído</Text><Text style={[styles.errorText, { color: colors.errorText }]}>{lecture.erroProcessamento || 'Tente processar a aula novamente.'}</Text><TouchableOpacity disabled={actionBusy} onPress={() => void reprocessar()} style={[styles.action, { backgroundColor: colors.primary }]}><Text style={styles.actionText}>{actionBusy ? 'Aguarde...' : 'Tentar novamente'}</Text></TouchableOpacity></View> : null}
      {lecture.status === 'PROCESSANDO' ? <View style={[styles.processing, { backgroundColor: colors.softPrimary }]}><ActivityIndicator color={colors.primary} /><Text style={[styles.processingText, { color: colors.text }]}>Preparando o material de estudo.</Text></View> : null}

      <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: colors.border }]}>
        <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: tab === 'summary' }} onPress={() => setTab('summary')} style={[styles.tab, tab === 'summary' && styles.activeTab, tab === 'summary' && { backgroundColor: colors.surface }]}><Text style={[styles.tabText, { color: colors.secondaryText }, tab === 'summary' && { color: colors.primary } ]}>Resumo</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: tab === 'transcript' }} onPress={() => setTab('transcript')} style={[styles.tab, tab === 'transcript' && styles.activeTab, tab === 'transcript' && { backgroundColor: colors.surface }]}><Text style={[styles.tabText, { color: colors.secondaryText }, tab === 'transcript' && { color: colors.primary } ]}>Transcrição</Text></TouchableOpacity>
      </View>

      {tab === 'summary' ? (
        <View style={styles.material}>
          {material.overview ? <View style={[styles.overview, { backgroundColor: colors.softPrimary }]}><Text style={[styles.overviewLabel, { color: colors.primary }]}>VISÃO GERAL</Text><Text selectable style={[styles.content, { color: colors.text }]}>{material.overview}</Text></View> : null}
          {SUMMARY_SECTIONS.map((section) => {
            const entries = material[section.key];
            if (!entries.length) return null;
            return <View key={section.key} style={styles.section}><Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text><StudyEntries entries={entries} questions={section.key === 'questions'} /></View>;
          })}
          {lecture.status === 'FINALIZADO' && canShareSummary && !material.questions.length ? <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.text }]}>Perguntas para revisão</Text><Text style={[styles.content, { color: colors.secondaryText }]}>Não há perguntas de revisão disponíveis para este conteúdo.</Text></View> : null}
          {(!material.overview && !SUMMARY_SECTIONS.some((section) => material[section.key].length)) || canRetryIncompleteSummary || canRecoverLegacyTranscript ? <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>{lecture.status === 'ERRO' ? 'Resumo indisponível' : canRecoverLegacyTranscript ? 'Transcrição precisa ser recuperada' : canRetryIncompleteSummary ? 'Resumo incompleto' : lecture.status === 'FINALIZADO' ? 'Conteúdo insuficiente para resumo' : 'Resumo em preparação'}</Text><Text style={[styles.content, { color: colors.secondaryText }]}>{lecture.status === 'ERRO' ? 'A transcrição foi preservada. Tente gerar o resumo novamente.' : canRecoverLegacyTranscript ? 'Este registro contém apenas um identificador numérico e não o texto da aula. Tente recuperar a transcrição a partir do áudio original.' : canRetryIncompleteSummary ? 'A transcrição está disponível. Gere novamente as seções detalhadas do resumo.' : lecture.status === 'FINALIZADO' ? 'A transcrição não contém informações suficientes para gerar um resumo confiável.' : 'O resumo estará disponível quando o processamento terminar.'}</Text>{canRetryIncompleteSummary || canRecoverLegacyTranscript ? <TouchableOpacity disabled={actionBusy} onPress={() => void reprocessar()} style={[styles.action, { backgroundColor: colors.primary }]}><Text style={styles.actionText}>{actionBusy ? 'Aguarde...' : canRecoverLegacyTranscript ? 'Recuperar do áudio' : 'Gerar resumo novamente'}</Text></TouchableOpacity> : null}</View> : null}
        </View>
      ) : <View style={[styles.transcript, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text selectable style={[styles.content, { color: colors.text }]}>{lecture.transcricao || (lecture.status === 'FINALIZADO' ? 'Transcrição indisponível.' : 'A transcrição estará disponível quando o processamento terminar.')}</Text></View>}

      <View style={styles.actions}>
        <TouchableOpacity disabled={!canShareSummary || actionBusy || sharingBusy} onPress={() => void compartilharResumo()} style={[styles.secondaryAction, { backgroundColor: colors.border }]} accessibilityState={{ disabled: !canShareSummary || actionBusy || sharingBusy }}>
          {sharingBusy ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          <Text style={[styles.secondaryText, { color: colors.text }]}>{sharingBusy ? 'Gerando PDF...' : 'Compartilhar'}</Text>
        </TouchableOpacity>
        {lecture.status !== 'PROCESSANDO' ? <TouchableOpacity disabled={actionBusy} onPress={confirmarExclusao} style={[styles.deleteAction, { backgroundColor: colors.errorSurface }]}><Text style={[styles.deleteText, { color: colors.errorText }]}>Excluir</Text></TouchableOpacity> : null}
      </View>
      <TouchableOpacity onPress={() => void carregarLecture()} style={styles.refresh}><Text style={[styles.refreshText, { color: colors.primary }]}>Atualizar agora</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  helper: { marginTop: 12 },
  container: { flexGrow: 1, padding: 22, paddingBottom: 42 },
  title: { fontSize: 29, lineHeight: 36, fontWeight: '800', marginBottom: 8 },
  description: { lineHeight: 22, marginBottom: 10 },
  meta: { fontSize: 13, marginBottom: 20 },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 13, backgroundColor: '#e8ebf3', marginBottom: 18 },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#fff', shadowColor: '#172033', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  tabText: { color: '#657086', fontWeight: '600' },
  activeTabText: { color: '#243d91', fontWeight: '800' },
  material: { gap: 18 },
  overview: { backgroundColor: '#eaf0ff', padding: 18, borderRadius: 15 },
  overviewLabel: { color: '#315ce7', fontSize: 11, letterSpacing: 1, fontWeight: '800', marginBottom: 9 },
  section: { paddingTop: 3 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  entryList: { gap: 9 },
  entry: { borderRadius: 13, borderWidth: 1, padding: 15 },
  questionEntry: {},
  entryTitle: { fontSize: 15, fontWeight: '700', marginBottom: 5 },
  entryText: { lineHeight: 23, fontSize: 15 },
  content: { lineHeight: 25, fontSize: 15 },
  transcript: { padding: 18, borderRadius: 15, borderWidth: 1 },
  emptyCard: { backgroundColor: '#fff', padding: 18, borderRadius: 15, borderWidth: 1, borderColor: '#edf0f5', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  processing: { padding: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  processingText: { flex: 1, lineHeight: 21 },
  errorBox: { padding: 17, borderRadius: 14, marginBottom: 16 },
  errorText: { lineHeight: 21 },
  action: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 11, alignSelf: 'flex-start', marginTop: 14 },
  actionText: { color: '#ffffff', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  secondaryAction: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12 },
  secondaryText: { fontWeight: '700' },
  deleteAction: { alignItems: 'center', padding: 14, borderRadius: 12 },
  deleteText: { fontWeight: '700' },
  refresh: { alignSelf: 'center', padding: 16 },
  refreshText: { fontWeight: '600' },
});
