import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { addExistingLectureToSubject, archiveSubject, getAvailableSubjectLectures, getSubject, getSubjectLectures } from '@/services/api';
import { useAuth } from '@/services/auth';
import { useClassWatchTheme } from '@/services/theme';
import type { AvailableLectureSummary, LectureSummary, Subject } from '@/types/lecture';

export default function SubjectDetailsScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const { user } = useAuth();
  const { colors } = useClassWatchTheme();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [lectures, setLectures] = useState<LectureSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [availableLectures, setAvailableLectures] = useState<AvailableLectureSummary[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableError, setAvailableError] = useState<string | null>(null);
  const [addingLectureId, setAddingLectureId] = useState<number | null>(null);
  const isProfessor = user?.role === 'PROFESSOR' && subject?.professorId === user.id;

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) { setError('Identificador de matéria inválido.'); setLoading(false); return; }
    setLoading(true);
    try {
      const [details, items] = await Promise.all([getSubject(id), getSubjectLectures(id)]);
      setSubject(details); setLectures(items); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar a matéria.'); }
    finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function openLecturePicker() {
    setPickerVisible(true);
    setAvailableLoading(true);
    setAvailableError(null);
    try { setAvailableLectures(await getAvailableSubjectLectures(id)); }
    catch (err) { setAvailableError(err instanceof Error ? err.message : 'Não foi possível carregar suas aulas.'); }
    finally { setAvailableLoading(false); }
  }

  async function addLecture(lecture: AvailableLectureSummary) {
    if (addingLectureId !== null) return;
    setAddingLectureId(lecture.id);
    try {
      const added = await addExistingLectureToSubject(id, lecture.id);
      setLectures((current) => [added, ...current.filter((item) => item.id !== added.id)]);
      setAvailableLectures((current) => current.filter((item) => item.id !== lecture.id));
      Alert.alert('Aula adicionada', 'A aula agora está disponível nesta matéria.');
    } catch (err) {
      Alert.alert('Não foi possível adicionar a aula', err instanceof Error ? err.message : 'Tente novamente.');
    } finally { setAddingLectureId(null); }
  }

  function confirmAddLecture(lecture: AvailableLectureSummary) {
    if (!lecture.legacy) {
      void addLecture(lecture);
      return;
    }
    Alert.alert(
      'Vincular aula antiga?',
      'Esta aula não tem proprietário associado. Ao continuar, ela ficará vinculada à sua conta e será compartilhada com estudantes inscritos nesta matéria.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Vincular', onPress: () => void addLecture(lecture) },
      ],
    );
  }

  function archive() {
    Alert.alert('Arquivar matéria?', 'Estudantes não poderão ingressar enquanto ela estiver arquivada. As inscrições e aulas serão preservadas.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Arquivar', style: 'destructive', onPress: () => void (async () => {
        setBusy(true);
        try { setSubject(await archiveSubject(id)); }
        catch (err) { Alert.alert('Não foi possível arquivar', err instanceof Error ? err.message : 'Tente novamente.'); }
        finally { setBusy(false); }
      })() },
    ]);
  }

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  if (error || !subject) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={[styles.error, { color: colors.errorText }]}>{error || 'Matéria não encontrada.'}</Text><TouchableOpacity onPress={() => void load()}><Text style={{ color: colors.primary, marginTop: 12 }}>Tentar novamente</Text></TouchableOpacity></View>;

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
  <FlatList
    data={lectures}
    keyExtractor={(item) => String(item.id)}
    style={{ backgroundColor: colors.background }}
    contentContainerStyle={styles.list}
    onRefresh={() => void load()}
    refreshing={loading}
    ListHeaderComponent={<>
      <Text style={[styles.title, { color: colors.text }]}>{subject.nome}</Text>
      <Text style={[styles.meta, { color: colors.secondaryText }]}>{subject.curso} · {subject.turma} · {subject.periodoLetivo}</Text>
      {subject.descricao ? <Text style={[styles.description, { color: colors.secondaryText }]}>{subject.descricao}</Text> : null}
      <Text style={[styles.teacher, { color: colors.mutedText }]}>Professor: {subject.professorNome}</Text>
      {!subject.ativa ? <Text style={[styles.archived, { color: colors.mutedText }]}>Matéria arquivada</Text> : null}
      {subject.codigoIngresso && isProfessor ? <View style={[styles.codeCard, { backgroundColor: colors.softPrimary }]}><Text style={[styles.codeLabel, { color: colors.secondaryText }]}>CÓDIGO DE INGRESSO</Text><Text selectable style={[styles.code, { color: colors.primary }]}>{subject.codigoIngresso}</Text></View> : null}
      {isProfessor ? <View style={styles.actions}>
        {subject.ativa ? <TouchableOpacity onPress={() => router.push({ pathname: '/subjects/new', params: { id: String(subject.id) } })} style={[styles.action, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={{ color: colors.text, fontWeight: '700' }}>Editar</Text></TouchableOpacity> : null}
        {subject.ativa ? <TouchableOpacity disabled={busy} onPress={archive} style={[styles.action, { backgroundColor: colors.errorSurface, borderColor: colors.errorSurface }]}><Text style={{ color: colors.errorText, fontWeight: '700' }}>{busy ? 'Aguarde...' : 'Arquivar'}</Text></TouchableOpacity> : null}
        {subject.ativa ? <TouchableOpacity onPress={() => router.push({ pathname: '/lecture/new', params: { subjectId: String(subject.id), subjectName: subject.nome } })} style={[styles.action, { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Registrar aula</Text></TouchableOpacity> : null}
        {subject.ativa ? <TouchableOpacity onPress={() => void openLecturePicker()} style={[styles.action, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={{ color: colors.text, fontWeight: '700' }}>Adicionar aula existente</Text></TouchableOpacity> : null}
      </View> : null}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Aulas</Text>
    </>}
    ListEmptyComponent={<View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma aula nesta matéria</Text></View>}
    renderItem={({ item }) => <TouchableOpacity onPress={() => router.push({ pathname: '/lecture/[id]', params: { id: String(item.id) } })} style={[styles.lecture, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.lectureTitle, { color: colors.text }]}>{item.titulo}</Text>{item.descricao ? <Text numberOfLines={2} style={{ color: colors.secondaryText, marginTop: 5 }}>{item.descricao}</Text> : null}<Text style={[styles.lectureStatus, { color: item.status === 'ERRO' ? colors.errorText : colors.primary }]}>{item.status === 'FINALIZADO' ? 'Concluída' : item.status === 'ERRO' ? 'Com erro' : 'Processando'}</Text></TouchableOpacity>}
  />
  <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
    <View style={[styles.picker, { backgroundColor: colors.background }]}>
      <View style={styles.pickerHeader}>
        <Text style={[styles.pickerTitle, { color: colors.text }]}>Adicionar aula existente</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setPickerVisible(false)} style={[styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Fechar</Text>
        </TouchableOpacity>
      </View>
      {availableLoading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View> : availableError ? <View style={styles.center}>
        <Text style={[styles.error, { color: colors.errorText }]}>{availableError}</Text>
        <TouchableOpacity onPress={() => void openLecturePicker()}><Text style={{ color: colors.primary, marginTop: 12 }}>Tentar novamente</Text></TouchableOpacity>
      </View> : <FlatList
        data={availableLectures}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.pickerList}
        ListEmptyComponent={<View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma aula disponível</Text><Text style={{ color: colors.secondaryText, marginTop: 6 }}>Aulas da sua conta sem matéria aparecerão aqui.</Text></View>}
        renderItem={({ item }) => <View style={[styles.candidate, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.candidateText}>
            <Text style={[styles.lectureTitle, { color: colors.text }]}>{item.titulo}</Text>
            {item.descricao ? <Text numberOfLines={2} style={{ color: colors.secondaryText, marginTop: 5 }}>{item.descricao}</Text> : null}
            {item.legacy ? <Text style={[styles.legacyLabel, { color: colors.mutedText }]}>Aula antiga sem proprietário</Text> : null}
            <Text style={[styles.lectureStatus, { color: item.status === 'ERRO' ? colors.errorText : colors.primary }]}>{item.status === 'FINALIZADO' ? 'Concluída' : item.status === 'ERRO' ? 'Com erro' : 'Processando'}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" disabled={addingLectureId !== null} onPress={() => confirmAddLecture(item)} style={[styles.addButton, { backgroundColor: colors.primary, opacity: addingLectureId !== null ? 0.65 : 1 }]}>
            {addingLectureId === item.id ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Adicionar</Text>}
          </TouchableOpacity>
        </View>}
      />}
    </View>
  </Modal>
  </View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { textAlign: 'center' },
  list: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  title: { fontSize: 29, fontWeight: '800' },
  meta: { fontWeight: '700', marginTop: 8 },
  description: { lineHeight: 22, marginTop: 12 },
  teacher: { fontSize: 13, marginTop: 10 },
  archived: { fontWeight: '700', marginTop: 10 },
  codeCard: { borderRadius: 14, padding: 15, marginTop: 16 },
  codeLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  code: { fontSize: 23, fontWeight: '900', letterSpacing: 3, marginTop: 5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 18, marginBottom: 10 },
  action: { borderWidth: 1, borderRadius: 11, paddingVertical: 11, paddingHorizontal: 14 },
  sectionTitle: { fontSize: 19, fontWeight: '800', marginTop: 20, marginBottom: 12 },
  lecture: { borderWidth: 1, borderRadius: 14, padding: 15, marginBottom: 10 },
  lectureTitle: { fontSize: 16, fontWeight: '700' },
  lectureStatus: { fontSize: 12, fontWeight: '700', marginTop: 10 },
  empty: { padding: 18, borderRadius: 14, borderWidth: 1 },
  emptyTitle: { fontWeight: '700' },
  picker: { flex: 1, paddingTop: 24 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  pickerTitle: { fontSize: 21, fontWeight: '800', flex: 1, paddingRight: 12 },
  closeButton: { borderWidth: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  pickerList: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  candidate: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  candidateText: { flex: 1 },
  addButton: { minWidth: 86, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 12 },
  legacyLabel: { fontSize: 12, fontWeight: '700', marginTop: 6 },
});
