import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '@/constants/theme';
import { LectureStatus, statusLabels } from '@/types/lecture';

const statusColors: Record<LectureStatus, string> = {
  RECEBIDO: colors.warning,
  PROCESSANDO: colors.accent,
  FINALIZADO: colors.success,
  ERRO: colors.danger,
};

export function StatusBadge({ status }: { status: LectureStatus }) {
  const color = statusColors[status];

  return (
    <View style={[styles.container, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{statusLabels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
