import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useClassWatchTheme, type ThemePreference } from '@/services/theme';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

export default function SettingsScreen() {
  const { preference, colors, setPreference } = useClassWatchTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Aparência</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {OPTIONS.map((option, index) => {
          const selected = preference === option.value;
          return <TouchableOpacity key={option.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setPreference(option.value)} style={[styles.option, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <View style={styles.copy}><Text style={[styles.label, { color: colors.text }]}>{option.label}</Text></View>
            <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.mutedText }]}>{selected ? <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} /> : null}</View>
          </TouchableOpacity>;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16 },
  option: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 14 },
  copy: { flex: 1 },
  label: { fontSize: 16, fontWeight: '700' },
  radio: { width: 22, height: 22, borderWidth: 2, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { width: 12, height: 12, borderRadius: 6 },
});
