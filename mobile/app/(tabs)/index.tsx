import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <MaterialIcons color={colors.background} name="graphic-eq" size={28} />
          </View>
          <Text style={styles.brand}>ClassWatch</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>SEU CONTEÚDO, ORGANIZADO</Text>
          <Text style={styles.title}>Transforme aulas em material de estudo.</Text>
          <Text style={styles.subtitle}>
            Grave o áudio e receba uma transcrição revisada com os principais pontos da aula.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/lecture/new')}
            style={styles.primaryCard}>
            <View style={styles.primaryIcon}>
              <MaterialIcons color={colors.white} name="mic" size={28} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.primaryTitle}>Gravar nova aula</Text>
              <Text style={styles.primaryDescription}>Comece uma nova captura de áudio</Text>
            </View>
            <MaterialIcons color={colors.white} name="arrow-forward" size={24} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/history')}
            style={styles.secondaryCard}>
            <View style={styles.secondaryIcon}>
              <MaterialIcons color={colors.primary} name="auto-stories" size={26} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.secondaryTitle}>Biblioteca de aulas</Text>
              <Text style={styles.secondaryDescription}>Revise transcrições e resumos</Text>
            </View>
            <MaterialIcons color={colors.textMuted} name="chevron-right" size={26} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>GRAVE  •  TRANSCREVA  •  REVISE</Text>
          <View style={styles.footerLine} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, padding: spacing.lg },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  brand: { color: colors.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.4 },
  hero: { flex: 1, justifyContent: 'center', maxWidth: 560 },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.md,
  },
  actions: { gap: 12 },
  primaryCard: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.large,
    flexDirection: 'row',
    padding: spacing.md,
  },
  primaryIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  secondaryCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.large,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.md,
  },
  secondaryIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  actionCopy: { flex: 1, marginHorizontal: spacing.md },
  primaryTitle: { color: colors.white, fontSize: 17, fontWeight: '800' },
  primaryDescription: { color: 'rgba(255,255,255,0.76)', fontSize: 13, marginTop: 3 },
  secondaryTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  secondaryDescription: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  footer: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  footerLine: { backgroundColor: colors.border, flex: 1, height: 1 },
  footerText: { color: colors.textSubtle, fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
});
