import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { createSubject, getSubject, updateSubject } from '@/services/api';
import { useAuth } from '@/services/auth';
import { useClassWatchTheme } from '@/services/theme';
import type { SubjectInput } from '@/types/lecture';

const EMPTY: SubjectInput = { nome: '', descricao: '', curso: '', turma: '', periodoLetivo: '' };

export default function SubjectFormScreen() {
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const subjectId = idParam ? Number(idParam) : null;
  const { user } = useAuth();
  const { colors } = useClassWatchTheme();
  const [form, setForm] = useState<SubjectInput>(EMPTY);
  const [loading, setLoading] = useState(Boolean(subjectId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;
    let active = true;
    void getSubject(subjectId).then((subject) => {
      if (active) setForm({ nome: subject.nome, descricao: subject.descricao, curso: subject.curso, turma: subject.turma, periodoLetivo: subject.periodoLetivo });
    }).catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Não foi possível carregar a matéria.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [subjectId]);

  function change(key: keyof SubjectInput, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  const valid = Boolean(form.nome.trim() && form.curso.trim() && form.turma.trim() && form.periodoLetivo.trim());

  async function save() {
    if (!valid || busy || user?.role !== 'PROFESSOR') return;
    setBusy(true); setError(null);
    try {
      const data = { ...form, nome: form.nome.trim(), descricao: form.descricao.trim(), curso: form.curso.trim(), turma: form.turma.trim(), periodoLetivo: form.periodoLetivo.trim() };
      const subject = subjectId ? await updateSubject(subjectId, data) : await createSubject(data);
      if (subjectId) router.replace({ pathname: '/subjects/[id]', params: { id: String(subject.id) } });
      else Alert.alert('Matéria criada', `Código de ingresso: ${subject.codigoIngresso}`, [{ text: 'Continuar', onPress: () => router.replace({ pathname: '/subjects/[id]', params: { id: String(subject.id) } }) }]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar a matéria.'); }
    finally { setBusy(false); }
  }

  if (user?.role !== 'PROFESSOR') return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.errorText }}>Somente professores podem administrar matérias.</Text></View>;
  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Text style={[styles.title, { color: colors.text }]}>{subjectId ? 'Editar matéria' : 'Criar matéria'}</Text>
    <Field label="Nome" value={form.nome} onChangeText={(value) => change('nome', value)} maxLength={120} />
    <Field label="Descrição" value={form.descricao} onChangeText={(value) => change('descricao', value)} maxLength={1000} multiline />
    <Field label="Curso" value={form.curso} onChangeText={(value) => change('curso', value)} maxLength={120} />
    <Field label="Turma" value={form.turma} onChangeText={(value) => change('turma', value)} maxLength={120} />
    <Field label="Período letivo" value={form.periodoLetivo} onChangeText={(value) => change('periodoLetivo', value)} maxLength={60} />
    {error ? <Text style={[styles.error, { color: colors.errorText }]}>{error}</Text> : null}
    <TouchableOpacity disabled={!valid || busy} onPress={() => void save()} style={[styles.submit, { backgroundColor: valid ? colors.primary : colors.mutedText }]}><Text style={styles.submitText}>{busy ? 'Salvando...' : subjectId ? 'Salvar alterações' : 'Criar matéria'}</Text></TouchableOpacity>
  </ScrollView>;
}

function Field({ label, multiline = false, ...input }: { label: string; multiline?: boolean; value: string; onChangeText: (value: string) => void; maxLength: number }) {
  const { colors } = useClassWatchTheme();
  return <View style={styles.field}><Text style={[styles.label, { color: colors.text }]}>{label}</Text><TextInput {...input} multiline={multiline} placeholder={label} placeholderTextColor={colors.mutedText} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }, multiline && styles.multiline]} /></View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { flexGrow: 1, padding: 22, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20 },
  field: { marginBottom: 15 },
  label: { fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  error: { lineHeight: 20, marginVertical: 8 },
  submit: { padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontWeight: '800' },
});
