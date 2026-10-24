import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useClassWatchTheme } from '@/services/theme';
import type { Subject } from '@/types/lecture';

export function SubjectCard({ subject, onPress }: { subject: Subject; onPress: () => void }) {
  const { colors } = useClassWatchTheme();
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>{subject.nome}</Text>
        {!subject.ativa ? <Text style={[styles.archived, { color: colors.mutedText }]}>Arquivada</Text> : null}
      </View>
      <Text style={[styles.meta, { color: colors.secondaryText }]}>{subject.curso} · {subject.turma} · {subject.periodoLetivo}</Text>
      {subject.descricao ? <Text numberOfLines={2} style={[styles.description, { color: colors.mutedText }]}>{subject.descricao}</Text> : null}
      {subject.codigoIngresso ? <Text style={[styles.code, { color: colors.primary }]}>Código: {subject.codigoIngresso}</Text> : null}
      <Text style={[styles.teacher, { color: colors.mutedText }]}>{subject.professorNome}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 17, marginBottom: 12, gap: 7 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '800' },
  archived: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 13, fontWeight: '600' },
  description: { fontSize: 13, lineHeight: 19 },
  code: { fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
  teacher: { fontSize: 12 },
});
